import React, { useState, useEffect } from 'react';
import { HiDatabase, HiRefresh, HiChevronLeft, HiChevronRight, HiEye, HiX } from 'react-icons/hi';
import { api } from '../api/client';
import '../styles/components/database.css';

interface TableInfo {
  name: string;
  rowCount: number;
  columns: Array<{
    name: string;
    type: string;
    notNull: boolean;
    defaultValue: string | null;
    primaryKey: boolean;
  }>;
}

interface TableData {
  tableName: string;
  columns: Array<{
    name: string;
    type: string;
  }>;
  rows: any[];
  totalRows: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface JsonViewerProps {
  value: any;
  onClose: () => void;
}

const JsonViewer: React.FC<JsonViewerProps> = ({ value, onClose }) => {
  let displayValue: string;
  try {
    displayValue = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  } catch {
    displayValue = String(value);
  }

  return (
    <div className="json-viewer-overlay" onClick={onClose}>
      <div className="json-viewer-modal" onClick={(e) => e.stopPropagation()}>
        <div className="json-viewer-header">
          <h3>Data Viewer</h3>
          <button onClick={onClose} className="close-button">
            <HiX size={16} />
          </button>
        </div>
        <pre className="json-viewer-content">{displayValue}</pre>
      </div>
    </div>
  );
};

export const DatabaseView: React.FC = () => {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [tableData, setTableData] = useState<TableData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [jsonViewer, setJsonViewer] = useState<{ visible: boolean; value: any }>({
    visible: false,
    value: null
  });

  const loadTables = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/database/tables');
      if (response.data.success) {
        setTables(response.data.data);
        if (response.data.data.length > 0 && !selectedTable) {
          setSelectedTable(response.data.data[0].name);
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load tables');
    } finally {
      setLoading(false);
    }
  };

  const loadTableData = async (tableName: string, page: number = 1) => {
    if (!tableName) return;

    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/database/tables/${tableName}?page=${page}&pageSize=50`);
      if (response.data.success) {
        setTableData(response.data.data);
        setCurrentPage(page);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load table data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTables();
  }, []);

  useEffect(() => {
    if (selectedTable) {
      loadTableData(selectedTable, 1);
      setCurrentPage(1);
    }
  }, [selectedTable]);

  const handleTableChange = (tableName: string) => {
    setSelectedTable(tableName);
    setTableData(null);
  };

  const handlePageChange = (page: number) => {
    if (selectedTable && page >= 1 && page <= (tableData?.totalPages || 1)) {
      loadTableData(selectedTable, page);
    }
  };

  const formatCellValue = (value: any, columnType: string) => {
    if (value === null || value === undefined) {
      return <span className="null-value">NULL</span>;
    }

    if (typeof value === 'object') {
      return (
        <div className="complex-value">
          <button
            className="view-json-button"
            onClick={() => setJsonViewer({ visible: true, value })}
          >
            <HiEye size={14} />
            View JSON
          </button>
        </div>
      );
    }

    const stringValue = String(value);
    if (stringValue.length > 100) {
      return (
        <div className="long-text">
          <span>{stringValue.substring(0, 100)}...</span>
          <button
            className="view-full-button"
            onClick={() => setJsonViewer({ visible: true, value: stringValue })}
          >
            <HiEye size={14} />
            View Full
          </button>
        </div>
      );
    }

    return stringValue;
  };

  const selectedTableInfo = tables.find(t => t.name === selectedTable);

  return (
    <div className="database-view">
      <div className="database-view-header">
        <div className="database-view-title">
          <HiDatabase size={20} />
          <h2>Database Inspector</h2>
        </div>
        <button onClick={loadTables} disabled={loading} className="refresh-button">
          <HiRefresh size={16} className={loading ? 'spinning' : ''} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="error-message">{error}</div>
      )}

      <div className="database-view-controls">
        <div className="table-selector">
          <label htmlFor="table-select">Select Table:</label>
          <select
            id="table-select"
            value={selectedTable}
            onChange={(e) => handleTableChange(e.target.value)}
            disabled={loading}
          >
            <option value="">Choose a table...</option>
            {tables.map(table => (
              <option key={table.name} value={table.name}>
                {table.name} ({table.rowCount} rows)
              </option>
            ))}
          </select>
        </div>

        {selectedTableInfo && (
          <div className="table-info">
            <span className="table-stats">
              {selectedTableInfo.rowCount} total rows • {selectedTableInfo.columns.length} columns
            </span>
          </div>
        )}
      </div>

      {tableData && (
        <div className="table-data-container">
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  {tableData.columns.map(column => (
                    <th key={column.name} className="column-header">
                      <div className="column-info">
                        <span className="column-name">{column.name}</span>
                        <span className="column-type">{column.type}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableData.rows.map((row, index) => (
                  <tr key={index}>
                    {tableData.columns.map(column => (
                      <td key={column.name} className="data-cell">
                        {formatCellValue(row[column.name], column.type)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {tableData.totalPages > 1 && (
            <div className="pagination">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1 || loading}
                className="pagination-button"
              >
                <HiChevronLeft size={16} />
                Previous
              </button>

              <span className="pagination-info">
                Page {currentPage} of {tableData.totalPages}
                ({tableData.totalRows} total rows)
              </span>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === tableData.totalPages || loading}
                className="pagination-button"
              >
                Next
                <HiChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      )}

      {jsonViewer.visible && (
        <JsonViewer
          value={jsonViewer.value}
          onClose={() => setJsonViewer({ visible: false, value: null })}
        />
      )}
    </div>
  );
};