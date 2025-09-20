import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Enums
export enum ActionItemSource {
  LIMITLESS = "LIMITLESS",
  CUSTOM = "CUSTOM"
}

// Types
export interface Tag {
  id: number;
  name: string;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface ActionItem {
  id: number;
  date: string;
  content: string;
  completed: boolean;
  completed_at?: string;
  source: ActionItemSource;
  insight_id?: number;
  created_at: string;
  edited_at: string;
  tags: Tag[];
}

export interface Decision {
  id: number;
  date: string;
  content: string;
  created_at: string;
  edited_at: string;
}

export interface Idea {
  id: number;
  date: string;
  content: string;
  created_at: string;
  edited_at: string;
}

export interface Question {
  id: number;
  date: string;
  content: string;
  resolved: boolean;
  resolved_at?: string;
  created_at: string;
  edited_at: string;
}

export interface Theme {
  id: number;
  date: string;
  title: string;
  description: string;
  created_at: string;
  edited_at: string;
}

export interface Quote {
  id: number;
  date: string;
  text: string;
  speaker: string;
  created_at: string;
  edited_at: string;
}

export interface Highlight {
  id: number;
  date: string;
  content: string;
  created_at: string;
  edited_at: string;
}

export interface Insight {
  id: number;
  date: string;
  content: string;
  created_at: string;
  updated_at: string;
  action_items: ActionItem[];
  decisions: Decision[];
  ideas: Idea[];
  questions: Question[];
  themes: Theme[];
  quotes: Quote[];
  highlights: Highlight[];
}

export interface DashboardStats {
  total_insights: number;
  total_action_items: number;
  completed_action_items: number;
  total_decisions: number;
  total_ideas: number;
  total_questions: number;
  resolved_questions: number;
  total_themes: number;
  total_quotes: number;
  total_highlights: number;
}

export interface ConsolidatedData {
  action_items: ActionItem[];
  decisions: Decision[];
  ideas: Idea[];
  questions: Question[];
  themes: Theme[];
  quotes: Quote[];
  highlights: Highlight[];
}

export interface SearchResults {
  action_items: ActionItem[];
  decisions: Decision[];
  ideas: Idea[];
  questions: Question[];
  themes: Theme[];
  quotes: Quote[];
  highlights: Highlight[];
  insights: Insight[];
}

export interface SyncStatus {
  should_sync: boolean;
  reason: string;
  last_sync?: {
    timestamp: string;
    timestamp_pacific: string;
    status: string;
    insights_added: number;
    insights_updated: number;
    insights_fetched: number;
    error_message?: string;
  };
  in_progress: boolean;
}

export interface SyncResult {
  success: boolean;
  message: string;
  skipped?: boolean;
  in_progress?: boolean;
  error?: boolean;
  details?: {
    new_insights: number;
    updated_insights: number;
    fetched_insights: number;
  };
}

// API functions
export const insightsApi = {
  getAll: () => api.get<Insight[]>('/insights'),
  getById: (id: number) => api.get<Insight>(`/insights/${id}`),
  getByDate: (date: string) => api.get<Insight>(`/insights/date/${date}`),
  create: (data: { date: string; content: string }) => api.post<Insight>('/insights', data),
  update: (id: number, data: { content?: string }) => api.put<Insight>(`/insights/${id}`, data),
};

export const actionItemsApi = {
  getAll: (params?: {
    completed?: boolean;
    source?: ActionItemSource;
    tag_ids?: number[];
    skip?: number;
    limit?: number
  }) => {
    const urlParams: any = { ...params };
    if (params?.tag_ids && params.tag_ids.length > 0) {
      urlParams.tag_ids = params.tag_ids.join(',');
    }
    return api.get<ActionItem[]>('/action-items', { params: urlParams });
  },
  getById: (id: number) => api.get<ActionItem>(`/action-items/${id}`),
  create: (data: { content: string; date: string; source?: ActionItemSource; tag_ids?: number[] }) =>
    api.post<ActionItem>('/action-items', data),
  update: (id: number, data: { content?: string; completed?: boolean }) =>
    api.put<ActionItem>(`/action-items/${id}`, data),
  delete: (id: number) => api.delete(`/action-items/${id}`),
  // Tag operations
  getTags: (id: number) => api.get<Tag[]>(`/action-items/${id}/tags`),
  addTags: (id: number, tag_ids: number[]) =>
    api.post(`/action-items/${id}/tags`, { tag_ids }),
  removeTag: (id: number, tag_id: number) =>
    api.delete(`/action-items/${id}/tags/${tag_id}`),
};

export const decisionsApi = {
  getAll: (params?: { skip?: number; limit?: number }) =>
    api.get<Decision[]>('/decisions', { params }),
  getById: (id: number) => api.get<Decision>(`/decisions/${id}`),
  update: (id: number, data: { content?: string }) =>
    api.put<Decision>(`/decisions/${id}`, data),
};

export const ideasApi = {
  getAll: (params?: { skip?: number; limit?: number }) =>
    api.get<Idea[]>('/ideas', { params }),
  getById: (id: number) => api.get<Idea>(`/ideas/${id}`),
  update: (id: number, data: { content?: string }) =>
    api.put<Idea>(`/ideas/${id}`, data),
};

export const questionsApi = {
  getAll: (params?: { resolved?: boolean; skip?: number; limit?: number }) =>
    api.get<Question[]>('/questions', { params }),
  getById: (id: number) => api.get<Question>(`/questions/${id}`),
  update: (id: number, data: { content?: string; resolved?: boolean }) =>
    api.put<Question>(`/questions/${id}`, data),
};

export const themesApi = {
  getAll: (params?: { skip?: number; limit?: number }) =>
    api.get<Theme[]>('/themes', { params }),
  getById: (id: number) => api.get<Theme>(`/themes/${id}`),
  update: (id: number, data: { title?: string; description?: string }) =>
    api.put<Theme>(`/themes/${id}`, data),
};

export const quotesApi = {
  getAll: (params?: { skip?: number; limit?: number }) =>
    api.get<Quote[]>('/quotes', { params }),
  getById: (id: number) => api.get<Quote>(`/quotes/${id}`),
  update: (id: number, data: { text?: string; speaker?: string }) =>
    api.put<Quote>(`/quotes/${id}`, data),
};

export const highlightsApi = {
  getAll: (params?: { skip?: number; limit?: number }) =>
    api.get<Highlight[]>('/highlights', { params }),
  getById: (id: number) => api.get<Highlight>(`/highlights/${id}`),
  update: (id: number, data: { content?: string }) =>
    api.put<Highlight>(`/highlights/${id}`, data),
};

export const tagsApi = {
  getAll: (params?: { skip?: number; limit?: number }) =>
    api.get<Tag[]>('/tags', { params }),
  getById: (id: number) => api.get<Tag>(`/tags/${id}`),
  create: (data: { name: string; color?: string }) => api.post<Tag>('/tags', data),
  update: (id: number, data: { name?: string; color?: string }) =>
    api.put<Tag>(`/tags/${id}`, data),
  delete: (id: number) => api.delete(`/tags/${id}`),
  getActionItems: (id: number, params?: { skip?: number; limit?: number }) =>
    api.get<ActionItem[]>(`/tags/${id}/action-items`, { params }),
};

export const generalApi = {
  getStats: () => api.get<DashboardStats>('/stats'),
  getConsolidated: () => api.get<ConsolidatedData>('/consolidated'),
  search: (query: string, limit = 100) =>
    api.get<SearchResults>('/search', { params: { q: query, limit } }),
  health: () => api.get('/health'),
};

export const syncApi = {
  getStatus: () => api.get<SyncStatus>('/sync/status'),
  runSync: (force = false) => api.post<SyncResult>('/sync/run', {}, { params: { force } }),
};