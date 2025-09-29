import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Types - using const assertion instead of enum for erasableSyntaxOnly compatibility
export const ActionItemSource = {
  LIMITLESS: "LIMITLESS",
  CUSTOM: "CUSTOM"
} as const;

export type ActionItemSource = typeof ActionItemSource[keyof typeof ActionItemSource];

// Types
export interface Tag {
  id: number;
  name: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface ActionItem {
  id: number;
  date: string;
  content: string;
  completed: boolean;
  completedAt?: string | null;
  source: ActionItemSource;
  insightId?: number | null;
  createdAt: string;
  updatedAt: string;
  tags: Tag[];
}

export interface Decision {
  id: number;
  date: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface Idea {
  id: number;
  date: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface Question {
  id: number;
  date: string;
  content: string;
  resolved: boolean;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Theme {
  id: number;
  date: string;
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface Quote {
  id: number;
  date: string;
  text: string;
  speaker: string;
  createdAt: string;
  updatedAt: string;
}

export interface Highlight {
  id: number;
  date: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface LifeLog {
  id: number;
  limitlessId: string;
  date: string;
  title?: string | null;
  summary?: string | null;
  markdownContent?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  segmentType?: string | null;
  createdAt: string;
  updatedAt: string;
  lastSyncedAt: string;
}

export interface SpeakerProfile {
  id: number;
  userId: number;
  speakerName: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  description?: string | null;
  colorHex: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSpeakerProfileData {
  speakerName: string;
  displayName?: string;
  avatarUrl?: string;
  description?: string;
  colorHex?: string;
  isActive?: boolean;
}

export interface KnowledgeNugget {
  id: number;
  userId: number;
  insightId?: number | null;
  date: string;
  category?: string | null;
  fact: string;
  source?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MemorableExchange {
  id: number;
  userId: number;
  insightId?: number | null;
  date: string;
  dialogue: Array<{ speaker?: string; text: string }>;
  context?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SectionDiscovery {
  id: number;
  sectionHeader: string;
  sectionPattern: string;
  subsectionPattern?: string | null;
  firstSeen: string;
  lastSeen: string;
  occurrenceCount: number;
  sampleContent?: string | null;
  extractionRules?: string | null;
  status: 'pending' | 'approved' | 'dismissed' | 'auto-approved';
  createdAt: string;
  updatedAt: string;
}

export interface UpdateSpeakerProfileData {
  displayName?: string;
  avatarUrl?: string;
  description?: string;
  colorHex?: string;
  isActive?: boolean;
}

export interface AutoDiscoverResult {
  discovered: string[];
  created: SpeakerProfile[];
}

export interface Insight {
  id: number;
  date: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  actionItems: ActionItem[];
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
  total_lifelogs: number;
  total_knowledge_nuggets: number;
  total_memorable_exchanges: number;
  pending_discoveries: number;
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
  lifelogs: LifeLog[];
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
    const urlParams: Record<string, unknown> = { ...params };
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

export const lifeLogsApi = {
  getAll: (params?: { skip?: number; limit?: number; date?: string }) =>
    api.get<LifeLog[]>('/lifelogs', { params }),
  getById: (id: number) => api.get<LifeLog>(`/lifelogs/${id}`),
  getByDate: (date: string) => api.get<LifeLog[]>(`/lifelogs/date/${date}`),
  getDates: () => api.get<string[]>('/lifelogs/dates/all'),
  create: (data: Omit<LifeLog, 'id' | 'createdAt' | 'updatedAt' | 'lastSyncedAt'>) =>
    api.post<LifeLog>('/lifelogs', data),
  update: (id: number, data: Partial<Omit<LifeLog, 'id' | 'limitlessId' | 'createdAt' | 'updatedAt' | 'lastSyncedAt'>>) =>
    api.put<LifeLog>(`/lifelogs/${id}`, data),
  delete: (id: number) => api.delete(`/lifelogs/${id}`),
};

export const syncApi = {
  getStatus: () => api.get<SyncStatus>('/sync/status'),
  runSync: (force = false) => api.post<SyncResult>('/sync/run', {}, { params: { force } }),
  syncAll: (params?: { force?: boolean; days_back?: number; incremental?: boolean }) =>
    api.post<{success: boolean; message: string; insights: unknown; lifelogs: unknown}>('/sync/all', {}, { params }),
};

export const speakersApi = {
  getAll: () => api.get<{ data: SpeakerProfile[] }>('/speakers'),
  getById: (speakerName: string) => api.get<{ data: SpeakerProfile }>(`/speakers/${encodeURIComponent(speakerName)}`),
  create: (data: CreateSpeakerProfileData) => api.post<{ data: SpeakerProfile }>('/speakers', data),
  update: (speakerName: string, data: UpdateSpeakerProfileData) =>
    api.put<{ data: SpeakerProfile }>(`/speakers/${encodeURIComponent(speakerName)}`, data),
  delete: (speakerName: string) => api.delete(`/speakers/${encodeURIComponent(speakerName)}`),
  autoDiscover: () => api.post<{ data: AutoDiscoverResult; message: string }>('/speakers/auto-discover'),
};

export const discoveryApi = {
  getStats: () => api.get<{ total_knowledge_nuggets: number; total_memorable_exchanges: number; pending_discoveries: number }>('/discovery/stats'),
  getPendingDiscoveries: () => api.get<SectionDiscovery[]>('/discovery/pending'),
  approveDiscovery: (id: number) => api.post<{ success: boolean; message: string }>(`/discovery/approve/${id}`),
  dismissDiscovery: (id: number) => api.post<{ success: boolean; message: string }>(`/discovery/dismiss/${id}`),
  checkForDiscoveries: () => api.post<{ success: boolean; message: string }>('/discovery/check'),
  getKnowledgeNuggets: (params?: { skip?: number; limit?: number }) => api.get<KnowledgeNugget[]>('/discovery/knowledge-nuggets', { params }),
  getMemorableExchanges: (params?: { skip?: number; limit?: number }) => api.get<MemorableExchange[]>('/discovery/memorable-exchanges', { params }),
};
