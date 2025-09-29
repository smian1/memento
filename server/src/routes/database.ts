import express from 'express';
import { db } from '../db/client.js';
import { sql } from 'drizzle-orm';
import { attachUser, requireAdmin } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Apply authentication middleware
router.use(attachUser);
router.use(requireAdmin);

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

// Get list of all tables with metadata
router.get('/tables', async (req, res) => {
  try {
    // Get table names from SQLite system tables
    const tablesResult = await db.all(sql`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `);

    console.log('Found tables:', tablesResult);

    const tables: TableInfo[] = [];

    for (const table of tablesResult) {
      const tableName = table.name;

      // Get row count
      const countResult = await db.get(sql.raw(`SELECT COUNT(*) as count FROM "${tableName}"`));
      const rowCount = countResult?.count || 0;

      // Get column information
      const columnsResult = await db.all(sql.raw(`PRAGMA table_info("${tableName}")`));
      const columns = columnsResult.map((col: any) => ({
        name: col.name,
        type: col.type,
        notNull: Boolean(col.notnull),
        defaultValue: col.dflt_value,
        primaryKey: Boolean(col.pk)
      }));

      tables.push({
        name: tableName,
        rowCount,
        columns
      });
    }

    res.json({ success: true, data: tables });
  } catch (error) {
    console.error('Error fetching tables:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch tables' });
  }
});

// Get data from a specific table
router.get('/tables/:tableName', async (req, res) => {
  try {
    const { tableName } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 50;
    const offset = (page - 1) * pageSize;

    // Validate table name exists and is safe
    const tableExists = await db.get(sql`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name = ${tableName}
    `);

    if (!tableExists) {
      return res.status(404).json({ success: false, error: 'Table not found' });
    }

    // Get total row count
    const countResult = await db.get(sql.raw(`SELECT COUNT(*) as count FROM "${tableName}"`));
    const totalRows = countResult?.count || 0;

    // Get column information
    const columnsResult = await db.all(sql.raw(`PRAGMA table_info("${tableName}")`));
    const columns = columnsResult.map((col: any) => ({
      name: col.name,
      type: col.type
    }));

    // Get paginated data
    const rows = await db.all(sql.raw(`
      SELECT * FROM "${tableName}"
      ORDER BY rowid
      LIMIT ${pageSize} OFFSET ${offset}
    `));

    const totalPages = Math.ceil(totalRows / pageSize);

    const response: TableData = {
      tableName,
      columns,
      rows,
      totalRows,
      page,
      pageSize,
      totalPages
    };

    res.json({ success: true, data: response });
  } catch (error) {
    console.error('Error fetching table data:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch table data' });
  }
});

export default router;