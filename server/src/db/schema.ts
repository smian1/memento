import { sqliteTable, integer, text, primaryKey } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  isAdmin: integer('is_admin', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`)
});

export const userConfigs = sqliteTable('user_configs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  timezone: text('timezone').notNull().default('UTC'),
  limitlessApiKey: text('limitless_api_key').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`)
});

export const systemSettings = sqliteTable('system_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`)
});

export const insights = sqliteTable('insights', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  date: text('date').notNull(),
  content: text('content').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`)
}, (table) => ({
  userDateIdx: primaryKey({ columns: [table.userId, table.date] })
}));

export const actionItems = sqliteTable('action_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  insightId: integer('insight_id').references(() => insights.id, { onDelete: 'cascade' }),
  date: text('date').notNull(),
  content: text('content').notNull(),
  completed: integer('completed', { mode: 'boolean' }).notNull().default(false),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  source: text('source').notNull().default('LIMITLESS'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`)
});

export const decisions = sqliteTable('decisions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  insightId: integer('insight_id').references(() => insights.id, { onDelete: 'cascade' }),
  date: text('date').notNull(),
  content: text('content').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`)
});

export const ideas = sqliteTable('ideas', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  insightId: integer('insight_id').references(() => insights.id, { onDelete: 'cascade' }),
  date: text('date').notNull(),
  content: text('content').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`)
});

export const questions = sqliteTable('questions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  insightId: integer('insight_id').references(() => insights.id, { onDelete: 'cascade' }),
  date: text('date').notNull(),
  content: text('content').notNull(),
  resolved: integer('resolved', { mode: 'boolean' }).notNull().default(false),
  resolvedAt: integer('resolved_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`)
});

export const themes = sqliteTable('themes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  insightId: integer('insight_id').references(() => insights.id, { onDelete: 'cascade' }),
  date: text('date').notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`)
});

export const quotes = sqliteTable('quotes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  insightId: integer('insight_id').references(() => insights.id, { onDelete: 'cascade' }),
  date: text('date').notNull(),
  textContent: text('text').notNull(),
  speaker: text('speaker').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`)
});

export const highlights = sqliteTable('highlights', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  insightId: integer('insight_id').references(() => insights.id, { onDelete: 'cascade' }),
  date: text('date').notNull(),
  content: text('content').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`)
});

export const lifelogs = sqliteTable('lifelogs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  limitlessId: text('limitless_id').notNull().unique(),
  date: text('date').notNull(),
  title: text('title'),
  summary: text('summary'),
  markdownContent: text('markdown_content'),
  startTime: integer('start_time', { mode: 'timestamp' }),
  endTime: integer('end_time', { mode: 'timestamp' }),
  segmentType: text('segment_type'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  lastSyncedAt: integer('last_synced_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`)
});

export const tags = sqliteTable('tags', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull().unique(),
  color: text('color').notNull().default('#667eea'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`)
});

export const actionItemTags = sqliteTable('action_item_tags', {
  actionItemId: integer('action_item_id').notNull().references(() => actionItems.id, { onDelete: 'cascade' }),
  tagId: integer('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' })
}, (table) => ({
  pk: primaryKey({ columns: [table.actionItemId, table.tagId] })
}));

export const syncMetadata = sqliteTable('sync_metadata', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  lastSyncAt: integer('last_sync_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  lastInsightsSyncAt: integer('last_insights_sync_at', { mode: 'timestamp' }),
  lastLifelogsSyncAt: integer('last_lifelogs_sync_at', { mode: 'timestamp' }),
  lastSyncStatus: text('last_sync_status').notNull().default('idle'),
  insightsFetched: integer('insights_fetched').notNull().default(0),
  insightsUpdated: integer('insights_updated').notNull().default(0),
  insightsAdded: integer('insights_added').notNull().default(0),
  lifelogsFetched: integer('lifelogs_fetched').notNull().default(0),
  lifelogsUpdated: integer('lifelogs_updated').notNull().default(0),
  lifelogsAdded: integer('lifelogs_added').notNull().default(0),
  errorMessage: text('error_message'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`)
});

export const speakerProfiles = sqliteTable('speaker_profiles', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  speakerName: text('speaker_name').notNull(),
  displayName: text('display_name'),
  avatarUrl: text('avatar_url'),
  description: text('description'),
  colorHex: text('color_hex').notNull().default('#64748b'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`)
}, (table) => ({
  userSpeakerIdx: primaryKey({ columns: [table.userId, table.speakerName] })
}));

export const sectionDiscoveries = sqliteTable('section_discoveries', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sectionHeader: text('section_header').notNull(),
  sectionPattern: text('section_pattern').notNull(),
  subsectionPattern: text('subsection_pattern'),
  firstSeen: text('first_seen').notNull(),
  lastSeen: text('last_seen').notNull(),
  occurrenceCount: integer('occurrence_count').notNull().default(1),
  sampleContent: text('sample_content', { mode: 'json' }),
  extractionRules: text('extraction_rules', { mode: 'json' }),
  status: text('status').notNull().default('pending'), // pending, approved, dismissed, auto-approved
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`)
});

export const discoveredContent = sqliteTable('discovered_content', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  discoveryId: integer('discovery_id').notNull().references(() => sectionDiscoveries.id, { onDelete: 'cascade' }),
  insightId: integer('insight_id').notNull().references(() => insights.id, { onDelete: 'cascade' }),
  content: text('content', { mode: 'json' }).notNull(),
  extractedAt: integer('extracted_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`)
});

export const knowledgeNuggets = sqliteTable('knowledge_nuggets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  insightId: integer('insight_id').references(() => insights.id, { onDelete: 'cascade' }),
  date: text('date').notNull(),
  category: text('category'), // 'Geography', 'AI', 'Technical', etc.
  fact: text('fact').notNull(),
  source: text('source'), // 'Car ride conversation', 'Meeting', etc.
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`)
});

export const memorableExchanges = sqliteTable('memorable_exchanges', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  insightId: integer('insight_id').references(() => insights.id, { onDelete: 'cascade' }),
  date: text('date').notNull(),
  dialogue: text('dialogue').notNull(), // JSON string - will parse manually
  context: text('context'), // Attribution/context line
  createdAt: text('created_at').notNull().default(sql`datetime('now')`),
  updatedAt: text('updated_at').notNull().default(sql`datetime('now')`)
});
