import { and, count, desc, eq, inArray, like, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import {
  insights,
  actionItems,
  decisions,
  ideas,
  questions,
  themes,
  quotes,
  highlights,
  lifelogs,
  tags,
  actionItemTags,
  knowledgeNuggets,
  memorableExchanges,
  sectionDiscoveries
} from '../db/schema.js';
import { extractStructuredData } from '../utils/structuredData.js';

export async function listInsights(userId: number, { skip = 0, limit = 100 }: { skip?: number; limit?: number } = {}) {
  const insightRows = await db
    .select()
    .from(insights)
    .where(eq(insights.userId, userId))
    .orderBy(desc(insights.date))
    .offset(skip)
    .limit(limit);

  const insightIds = insightRows.map((row) => row.id);
  if (insightIds.length === 0) {
    return [];
  }

  const [actionRows, decisionRows, ideaRows, questionRows, themeRows, quoteRows, highlightRows] = await Promise.all([
    db.select().from(actionItems).where(inArray(actionItems.insightId, insightIds)).orderBy(desc(actionItems.date)),
    db.select().from(decisions).where(inArray(decisions.insightId, insightIds)).orderBy(desc(decisions.date)),
    db.select().from(ideas).where(inArray(ideas.insightId, insightIds)).orderBy(desc(ideas.date)),
    db.select().from(questions).where(inArray(questions.insightId, insightIds)).orderBy(desc(questions.date)),
    db.select().from(themes).where(inArray(themes.insightId, insightIds)).orderBy(desc(themes.date)),
    db.select().from(quotes).where(inArray(quotes.insightId, insightIds)).orderBy(desc(quotes.date)),
    db.select().from(highlights).where(inArray(highlights.insightId, insightIds)).orderBy(desc(highlights.date))
  ]);

  const actionTags = await db
    .select()
    .from(actionItemTags)
    .leftJoin(tags, eq(actionItemTags.tagId, tags.id))
    .where(inArray(actionItemTags.actionItemId, actionRows.map((item) => item.id)));

  const tagMap = new Map<number, Array<{ id: number; name: string; color: string }>>();
  for (const row of actionTags) {
    if (!row.action_item_tags || !row.tags) continue;
    const list = tagMap.get(row.action_item_tags.actionItemId) ?? [];
    list.push({ id: row.tags.id, name: row.tags.name, color: row.tags.color });
    tagMap.set(row.action_item_tags.actionItemId, list);
  }

  const actionMap = new Map<number, typeof actionRows>();
  for (const item of actionRows) {
    if (!item.insightId) continue;
    const list = actionMap.get(item.insightId) ?? [];
    list.push({ ...item, tags: tagMap.get(item.id) ?? [] });
    actionMap.set(item.insightId, list);
  }

  const decisionMap = groupBy(decisionRows.filter((row) => row.insightId), (item) => item.insightId!);
  const ideaMap = groupBy(ideaRows.filter((row) => row.insightId), (item) => item.insightId!);
  const questionMap = groupBy(questionRows.filter((row) => row.insightId), (item) => item.insightId!);
  const themeMap = groupBy(themeRows.filter((row) => row.insightId), (item) => item.insightId!);
  const quoteMap = groupBy(quoteRows.filter((row) => row.insightId), (item) => item.insightId!);
  const highlightMap = groupBy(highlightRows.filter((row) => row.insightId), (item) => item.insightId!);

  return insightRows.map((row) => ({
    ...row,
    actionItems: (actionMap.get(row.id) ?? []).map((item) => ({
      ...item,
      tags: item.tags ?? []
    })),
    decisions: decisionMap.get(row.id) ?? [],
    ideas: ideaMap.get(row.id) ?? [],
    questions: questionMap.get(row.id) ?? [],
    themes: themeMap.get(row.id) ?? [],
    quotes: (quoteMap.get(row.id) ?? []).map(({ textContent, ...quote }) => ({ ...quote, text: textContent })),
    highlights: highlightMap.get(row.id) ?? []
  }));
}

function groupBy<T>(items: T[], keyFn: (item: T) => number) {
  const map = new Map<number, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    const list = map.get(key) ?? [];
    list.push(item);
    map.set(key, list);
  }
  return map;
}

export async function getInsightByDate(userId: number, date: string) {
  const rows = await listInsights(userId, { skip: 0, limit: 200 });
  return rows.find((row) => row.date === date) ?? null;
}

export async function getInsightById(userId: number, id: number) {
  const rows = await listInsights(userId, { skip: 0, limit: 200 });
  return rows.find((row) => row.id === id) ?? null;
}

export async function createInsight(userId: number, { date, content }: { date: string; content: string }) {
  const inserted = await db.insert(insights).values({ userId, date, content }).returning({ id: insights.id });
  const insightId = inserted[0]?.id;
  if (!insightId) {
    throw new Error('Failed to create insight');
  }
  await refreshInsightStructure(userId, insightId, content, date);
  const insight = await getInsightById(userId, insightId);
  return insight;
}

export async function updateInsight(userId: number, id: number, { content }: { content?: string }) {
  if (!content) {
    return getInsightById(userId, id);
  }
  await db
    .update(insights)
    .set({ content, updatedAt: sql`datetime('now')` })
    .where(and(eq(insights.id, id), eq(insights.userId, userId)));
  const insight = await db
    .select()
    .from(insights)
    .where(and(eq(insights.id, id), eq(insights.userId, userId)))
    .limit(1);
  if (insight.length === 0) {
    return null;
  }
  await refreshInsightStructure(userId, id, content, insight[0].date);
  return getInsightById(userId, id);
}

async function refreshInsightStructure(userId: number, insightId: number, content: string, date: string) {
  const structured = extractStructuredData(content, date);

  await db.delete(actionItems).where(eq(actionItems.insightId, insightId));
  await db.delete(decisions).where(eq(decisions.insightId, insightId));
  await db.delete(ideas).where(eq(ideas.insightId, insightId));
  await db.delete(questions).where(eq(questions.insightId, insightId));
  await db.delete(themes).where(eq(themes.insightId, insightId));
  await db.delete(quotes).where(eq(quotes.insightId, insightId));
  await db.delete(highlights).where(eq(highlights.insightId, insightId));
  await db.delete(knowledgeNuggets).where(eq(knowledgeNuggets.insightId, insightId));
  await db.delete(memorableExchanges).where(eq(memorableExchanges.insightId, insightId));

  if (structured.actionItems.length > 0) {
    await db.insert(actionItems).values(structured.actionItems.map((item) => ({ userId, insightId, date, content: item, source: 'LIMITLESS' })));
  }

  if (structured.decisions.length > 0) {
    await db.insert(decisions).values(structured.decisions.map((item) => ({ userId, insightId, date, content: item })));
  }

  if (structured.ideas.length > 0) {
    await db.insert(ideas).values(structured.ideas.map((item) => ({ userId, insightId, date, content: item })));
  }

  if (structured.questions.length > 0) {
    await db.insert(questions).values(structured.questions.map((item) => ({ userId, insightId, date, content: item, resolved: false })));
  }

  if (structured.themes.length > 0) {
    await db.insert(themes).values(structured.themes.map((item) => ({ userId, insightId, date, title: item.title, description: item.description })));
  }

  if (structured.quotes.length > 0) {
    await db.insert(quotes).values(structured.quotes.map((item) => ({ userId, insightId, date, textContent: item.text, speaker: item.speaker })));
  }

  if (structured.highlights.length > 0) {
    await db.insert(highlights).values(structured.highlights.map((item) => ({ userId, insightId, date, content: item })));
  }

  if (structured.knowledgeNuggets.length > 0) {
    await db.insert(knowledgeNuggets).values(structured.knowledgeNuggets.map((item) => ({ userId, insightId, date, category: item.category, fact: item.fact, source: item.source })));
  }

  if (structured.memorableExchanges.length > 0) {
    await db.insert(memorableExchanges).values(structured.memorableExchanges.map((item) => ({ userId, insightId, date, dialogue: JSON.stringify(item.dialogue), context: item.context })));
  }
}

export async function reprocessAllInsights(userId: number) {
  const allInsights = await db
    .select({ id: insights.id, date: insights.date, content: insights.content })
    .from(insights)
    .where(eq(insights.userId, userId));

  let processed = 0;
  for (const insight of allInsights) {
    await refreshInsightStructure(userId, insight.id, insight.content, insight.date);
    processed++;
  }

  return { processed, total: allInsights.length };
}

export async function reprocessInsightByDate(userId: number, date: string) {
  const insight = await db
    .select({ id: insights.id, date: insights.date, content: insights.content })
    .from(insights)
    .where(and(eq(insights.userId, userId), eq(insights.date, date)))
    .limit(1);

  if (insight.length === 0) {
    return null;
  }

  await refreshInsightStructure(userId, insight[0].id, insight[0].content, insight[0].date);
  return { processed: 1, date };
}

export async function reprocessInsightsByDateRange(userId: number, startDate: string, endDate: string) {
  const rangeInsights = await db
    .select({ id: insights.id, date: insights.date, content: insights.content })
    .from(insights)
    .where(
      and(
        eq(insights.userId, userId),
        sql`${insights.date} >= ${startDate}`,
        sql`${insights.date} <= ${endDate}`
      )
    );

  let processed = 0;
  for (const insight of rangeInsights) {
    await refreshInsightStructure(userId, insight.id, insight.content, insight.date);
    processed++;
  }

  return { processed, total: rangeInsights.length, startDate, endDate };
}

export async function listActionItems(userId: number, {
  skip = 0,
  limit = 100,
  completed,
  source,
  tagIds
}: {
  skip?: number;
  limit?: number;
  completed?: boolean;
  source?: string;
  tagIds?: number[];
} = {}) {
  let condition = eq(actionItems.userId, userId);

  if (typeof completed === 'boolean') {
    condition = and(condition, eq(actionItems.completed, completed));
  }

  if (source) {
    condition = and(condition, eq(actionItems.source, source));
  }

  let results = await db
    .select()
    .from(actionItems)
    .where(condition)
    .orderBy(desc(actionItems.date))
    .offset(skip)
    .limit(limit);

  if (tagIds && tagIds.length > 0) {
    const itemIds = results.map((item) => item.id);
    if (itemIds.length === 0) {
      return [];
    }
    const tagged = await db
      .select({ actionItemId: actionItemTags.actionItemId })
      .from(actionItemTags)
      .where(and(eq(actionItemTags.userId, userId), inArray(actionItemTags.tagId, tagIds), inArray(actionItemTags.actionItemId, itemIds)));
    const allowedIds = new Set(tagged.map((row) => row.actionItemId));
    results = results.filter((item) => allowedIds.has(item.id));
  }

  const tagRows = await db
    .select()
    .from(actionItemTags)
    .leftJoin(tags, eq(actionItemTags.tagId, tags.id))
    .where(and(eq(actionItemTags.userId, userId), inArray(actionItemTags.actionItemId, results.map((item) => item.id))));

  const tagMap = new Map<number, Array<{ id: number; name: string; color: string }>>();
  for (const row of tagRows) {
    if (!row.tags) continue;
    const list = tagMap.get(row.action_item_tags.actionItemId) ?? [];
    list.push({ id: row.tags.id, name: row.tags.name, color: row.tags.color });
    tagMap.set(row.action_item_tags.actionItemId, list);
  }

  return results.map((item) => ({ ...item, tags: tagMap.get(item.id) ?? [] }));
}

export async function createActionItem(
  userId: number,
  data: { content: string; date: string; source?: string; tagIds?: number[]; insightId?: number | null }
) {
  const inserted = await db
    .insert(actionItems)
    .values({
      userId,
      date: data.date,
      content: data.content,
      completed: false,
      insightId: data.insightId ?? null,
      source: data.source ?? 'CUSTOM'
    })
    .returning({ id: actionItems.id });
  const actionItemId = inserted[0]?.id;
  if (!actionItemId) {
    throw new Error('Failed to create action item');
  }

  if (data.tagIds?.length) {
    await db
      .insert(actionItemTags)
      .values(data.tagIds.map((tagId) => ({ actionItemId, tagId, userId })))
      .onConflictDoNothing();
  }

  return getActionItemById(userId, actionItemId);
}

export async function updateActionItem(userId: number, id: number, data: { content?: string; completed?: boolean }) {
  const updates: any = {};
  if (typeof data.content === 'string') {
    updates.content = data.content;
  }
  if (typeof data.completed === 'boolean') {
    updates.completed = data.completed;
    updates.completedAt = data.completed ? sql`datetime('now')` : null;
  }

  if (Object.keys(updates).length === 0) {
    return getActionItemById(userId, id);
  }

  await db.update(actionItems).set(updates).where(and(eq(actionItems.id, id), eq(actionItems.userId, userId)));
  return getActionItemById(userId, id);
}

export async function deleteActionItem(userId: number, id: number) {
  await db.delete(actionItemTags).where(and(eq(actionItemTags.actionItemId, id), eq(actionItemTags.userId, userId)));
  const result = await db.delete(actionItems).where(and(eq(actionItems.id, id), eq(actionItems.userId, userId)));
  return (result.changes ?? 0) > 0;
}

export async function getActionItemById(userId: number, id: number) {
  const row = await db.select().from(actionItems).where(and(eq(actionItems.id, id), eq(actionItems.userId, userId))).limit(1);
  if (row.length === 0) {
    return null;
  }

  const tagsForItem = await db
    .select()
    .from(actionItemTags)
    .leftJoin(tags, eq(actionItemTags.tagId, tags.id))
    .where(and(eq(actionItemTags.userId, userId), eq(actionItemTags.actionItemId, id)));

  const formattedTags = tagsForItem.filter((record) => record.tags).map((record) => ({
    id: record.tags!.id,
    name: record.tags!.name,
    color: record.tags!.color
  }));

  return { ...row[0], tags: formattedTags };
}

function buildSimpleList<T extends { date: string }>(rows: T[]) {
  return rows.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export async function listDecisions(userId: number, { skip = 0, limit = 100 } = {}) {
  const rows = await db
    .select()
    .from(decisions)
    .where(eq(decisions.userId, userId))
    .orderBy(desc(decisions.date))
    .offset(skip)
    .limit(limit);
  return buildSimpleList(rows);
}

export async function updateDecision(userId: number, id: number, data: { content?: string }) {
  if (!data.content) {
    const row = await db.select().from(decisions).where(and(eq(decisions.id, id), eq(decisions.userId, userId))).limit(1);
    return row[0] ?? null;
  }
  await db.update(decisions).set({ content: data.content, updatedAt: sql`datetime('now')` }).where(and(eq(decisions.id, id), eq(decisions.userId, userId)));
  const row = await db.select().from(decisions).where(and(eq(decisions.id, id), eq(decisions.userId, userId))).limit(1);
  return row[0] ?? null;
}

export async function listIdeas(userId: number, { skip = 0, limit = 100 } = {}) {
  const rows = await db
    .select()
    .from(ideas)
    .where(eq(ideas.userId, userId))
    .orderBy(desc(ideas.date))
    .offset(skip)
    .limit(limit);
  return buildSimpleList(rows);
}

export async function updateIdea(userId: number, id: number, data: { content?: string }) {
  if (!data.content) {
    const row = await db.select().from(ideas).where(and(eq(ideas.id, id), eq(ideas.userId, userId))).limit(1);
    return row[0] ?? null;
  }
  await db.update(ideas).set({ content: data.content, updatedAt: sql`datetime('now')` }).where(and(eq(ideas.id, id), eq(ideas.userId, userId)));
  const row = await db.select().from(ideas).where(and(eq(ideas.id, id), eq(ideas.userId, userId))).limit(1);
  return row[0] ?? null;
}

export async function listQuestions(userId: number, { skip = 0, limit = 100, resolved }: { skip?: number; limit?: number; resolved?: boolean } = {}) {
  let condition = eq(questions.userId, userId);
  if (typeof resolved === 'boolean') {
    condition = and(condition, eq(questions.resolved, resolved));
  }
  const rows = await db
    .select()
    .from(questions)
    .where(condition)
    .orderBy(desc(questions.date))
    .offset(skip)
    .limit(limit);
  return buildSimpleList(rows);
}

export async function updateQuestion(userId: number, id: number, data: { content?: string; resolved?: boolean }) {
  const updates: any = {};
  if (typeof data.content === 'string') {
    updates.content = data.content;
  }
  if (typeof data.resolved === 'boolean') {
    updates.resolved = data.resolved;
    updates.resolvedAt = data.resolved ? sql`datetime('now')` : null;
  }
  if (Object.keys(updates).length === 0) {
    const row = await db.select().from(questions).where(and(eq(questions.id, id), eq(questions.userId, userId))).limit(1);
    return row[0] ?? null;
  }
  await db.update(questions).set(updates).where(and(eq(questions.id, id), eq(questions.userId, userId)));
  const row = await db.select().from(questions).where(and(eq(questions.id, id), eq(questions.userId, userId))).limit(1);
  return row[0] ?? null;
}

export async function listThemes(userId: number, { skip = 0, limit = 100 } = {}) {
  const rows = await db
    .select()
    .from(themes)
    .where(eq(themes.userId, userId))
    .orderBy(desc(themes.date))
    .offset(skip)
    .limit(limit);
  return buildSimpleList(rows);
}

export async function updateTheme(userId: number, id: number, data: { title?: string; description?: string }) {
  const updates: any = {};
  if (typeof data.title === 'string') updates.title = data.title;
  if (typeof data.description === 'string') updates.description = data.description;
  if (Object.keys(updates).length === 0) {
    const row = await db.select().from(themes).where(and(eq(themes.id, id), eq(themes.userId, userId))).limit(1);
    return row[0] ?? null;
  }
  await db.update(themes).set(updates).where(and(eq(themes.id, id), eq(themes.userId, userId)));
  const row = await db.select().from(themes).where(and(eq(themes.id, id), eq(themes.userId, userId))).limit(1);
  return row[0] ?? null;
}

export async function listQuotes(userId: number, { skip = 0, limit = 100 } = {}) {
  const rows = await db
    .select()
    .from(quotes)
    .where(eq(quotes.userId, userId))
    .orderBy(desc(quotes.date))
    .offset(skip)
    .limit(limit);
  return buildSimpleList(rows).map(({ textContent, ...quote }) => ({ ...quote, text: textContent }));
}

export async function updateQuote(userId: number, id: number, data: { text?: string; speaker?: string }) {
  const updates: any = {};
  if (typeof data.text === 'string') updates.textContent = data.text;
  if (typeof data.speaker === 'string') updates.speaker = data.speaker;
  if (Object.keys(updates).length === 0) {
    const row = await db.select().from(quotes).where(and(eq(quotes.id, id), eq(quotes.userId, userId))).limit(1);
    return row[0] ? { ...row[0], text: row[0].textContent } : null;
  }
  await db.update(quotes).set(updates).where(and(eq(quotes.id, id), eq(quotes.userId, userId)));
  const row = await db.select().from(quotes).where(and(eq(quotes.id, id), eq(quotes.userId, userId))).limit(1);
  return row[0] ? { ...row[0], text: row[0].textContent } : null;
}

export async function listHighlights(userId: number, { skip = 0, limit = 100 } = {}) {
  const rows = await db
    .select()
    .from(highlights)
    .where(eq(highlights.userId, userId))
    .orderBy(desc(highlights.date))
    .offset(skip)
    .limit(limit);
  return buildSimpleList(rows);
}

export async function updateHighlight(userId: number, id: number, data: { content?: string }) {
  if (!data.content) {
    const row = await db.select().from(highlights).where(and(eq(highlights.id, id), eq(highlights.userId, userId))).limit(1);
    return row[0] ?? null;
  }
  await db.update(highlights).set({ content: data.content, updatedAt: sql`datetime('now')` }).where(and(eq(highlights.id, id), eq(highlights.userId, userId)));
  const row = await db.select().from(highlights).where(and(eq(highlights.id, id), eq(highlights.userId, userId))).limit(1);
  return row[0] ?? null;
}

export async function listTags(userId: number, { skip = 0, limit = 100 }: { skip?: number; limit?: number } = {}) {
  return db
    .select()
    .from(tags)
    .where(eq(tags.userId, userId))
    .orderBy(desc(tags.createdAt))
    .offset(skip)
    .limit(limit);
}

export async function createTag(userId: number, data: { name: string; color?: string }) {
  const inserted = await db
    .insert(tags)
    .values({ userId, name: data.name, color: data.color ?? '#667eea' })
    .returning({ id: tags.id });
  const tagId = inserted[0]?.id;
  if (!tagId) {
    throw new Error('Failed to create tag');
  }
  const row = await db.select().from(tags).where(and(eq(tags.id, tagId), eq(tags.userId, userId))).limit(1);
  return row[0] ?? null;
}

export async function updateTag(userId: number, id: number, data: { name?: string; color?: string }) {
  const updates: any = {};
  if (data.name) updates.name = data.name;
  if (data.color) updates.color = data.color;
  if (Object.keys(updates).length === 0) {
    return getTagById(userId, id);
  }
  await db.update(tags).set(updates).where(and(eq(tags.id, id), eq(tags.userId, userId)));
  return getTagById(userId, id);
}

export async function deleteTag(userId: number, id: number) {
  await db.delete(actionItemTags).where(and(eq(actionItemTags.tagId, id), eq(actionItemTags.userId, userId)));
  const result = await db.delete(tags).where(and(eq(tags.id, id), eq(tags.userId, userId)));
  return (result.changes ?? 0) > 0;
}

export async function getTagById(userId: number, id: number) {
  const row = await db.select().from(tags).where(and(eq(tags.id, id), eq(tags.userId, userId))).limit(1);
  return row[0] ?? null;
}

export async function setActionItemTags(userId: number, actionItemId: number, tagIds: number[]) {
  await db.delete(actionItemTags).where(and(eq(actionItemTags.actionItemId, actionItemId), eq(actionItemTags.userId, userId)));
  if (tagIds.length > 0) {
    await db
      .insert(actionItemTags)
      .values(tagIds.map((tagId) => ({ userId, actionItemId, tagId })))
      .onConflictDoNothing();
  }
  return getActionItemById(userId, actionItemId);
}

export async function removeActionItemTag(userId: number, actionItemId: number, tagId: number) {
  await db
    .delete(actionItemTags)
    .where(and(eq(actionItemTags.userId, userId), eq(actionItemTags.actionItemId, actionItemId), eq(actionItemTags.tagId, tagId)));
  return getActionItemById(userId, actionItemId);
}

export async function listActionItemsForTag(userId: number, tagId: number, { skip = 0, limit = 100 } = {}) {
  const actionIds = await db
    .select({ actionItemId: actionItemTags.actionItemId })
    .from(actionItemTags)
    .where(and(eq(actionItemTags.userId, userId), eq(actionItemTags.tagId, tagId)))
    .offset(skip)
    .limit(limit);

  const ids = actionIds.map((row) => row.actionItemId);
  if (ids.length === 0) {
    return [];
  }

  const actions = await listActionItems(userId, { skip, limit, tagIds: [tagId] });
  return actions;
}

export async function getDashboardStats(userId: number) {
  const [totalInsights] = await db.select({ count: count() }).from(insights).where(eq(insights.userId, userId));
  
  // Use raw SQL for action items count due to issue with drizzle count() function
  const [rawTotalActionItems] = await db.all(sql`SELECT COUNT(*) as count FROM action_items WHERE user_id = ${userId}`);
  const [rawCompletedActionItems] = await db.all(sql`SELECT COUNT(*) as count FROM action_items WHERE user_id = ${userId} AND completed = 1`);
  
  const totalActionItems = { count: rawTotalActionItems.count };
  const completedActionItems = { count: rawCompletedActionItems.count };


  const tableCounts = await Promise.all([
    db.select({ count: count() }).from(decisions).where(eq(decisions.userId, userId)),
    db.select({ count: count() }).from(ideas).where(eq(ideas.userId, userId)),
    db.select({ count: count() }).from(questions).where(eq(questions.userId, userId)),
    db
      .select({ count: count() })
      .from(questions)
      .where(and(eq(questions.userId, userId), eq(questions.resolved, true))),
    db.select({ count: count() }).from(themes).where(eq(themes.userId, userId)),
    db.select({ count: count() }).from(quotes).where(eq(quotes.userId, userId)),
    db.select({ count: count() }).from(highlights).where(eq(highlights.userId, userId)),
    db.select({ count: count() }).from(lifelogs).where(eq(lifelogs.userId, userId)),
    db.select({ count: count() }).from(knowledgeNuggets).where(eq(knowledgeNuggets.userId, userId)),
    db.select({ count: count() }).from(memorableExchanges).where(eq(memorableExchanges.userId, userId)),
    db.select({ count: count() }).from(sectionDiscoveries).where(eq(sectionDiscoveries.status, 'pending'))
  ]);

  return {
    total_insights: totalInsights.count ?? 0,
    total_action_items: totalActionItems.count ?? 0,
    completed_action_items: completedActionItems.count ?? 0,
    total_decisions: tableCounts[0].count ?? 0,
    total_ideas: tableCounts[1].count ?? 0,
    total_questions: tableCounts[2].count ?? 0,
    resolved_questions: tableCounts[3].count ?? 0,
    total_themes: tableCounts[4].count ?? 0,
    total_quotes: tableCounts[5].count ?? 0,
    total_highlights: tableCounts[6].count ?? 0,
    total_lifelogs: tableCounts[7].count ?? 0,
    total_knowledge_nuggets: tableCounts[8].count ?? 0,
    total_memorable_exchanges: tableCounts[9].count ?? 0,
    pending_discoveries: tableCounts[10].count ?? 0
  };
}

export async function getConsolidatedData(userId: number) {
  const [actions, decisionsList, ideasList, questionsList, themesList, quotesList, highlightsList] = await Promise.all([
    listActionItems(userId),
    db.select().from(decisions).where(eq(decisions.userId, userId)).orderBy(desc(decisions.date)),
    db.select().from(ideas).where(eq(ideas.userId, userId)).orderBy(desc(ideas.date)),
    db.select().from(questions).where(eq(questions.userId, userId)).orderBy(desc(questions.date)),
    db.select().from(themes).where(eq(themes.userId, userId)).orderBy(desc(themes.date)),
    db.select().from(quotes).where(eq(quotes.userId, userId)).orderBy(desc(quotes.date)),
    db.select().from(highlights).where(eq(highlights.userId, userId)).orderBy(desc(highlights.date))
  ]);

  return {
    action_items: actions,
    decisions: decisionsList,
    ideas: ideasList,
    questions: questionsList,
    themes: themesList,
    quotes: quotesList.map(({ textContent, ...quote }) => ({ ...quote, text: textContent })),
    highlights: highlightsList
  };
}

export async function searchData(userId: number, query: string, limit = 100) {
  const wildcard = `%${query}%`;

  const [insightResults, actionResults, decisionResults, ideaResults, questionResults, themeResults, quoteResults, highlightResults, lifelogRows] =
    await Promise.all([
      db.select().from(insights).where(and(eq(insights.userId, userId), like(insights.content, wildcard))).limit(limit),
      db.select().from(actionItems).where(and(eq(actionItems.userId, userId), like(actionItems.content, wildcard))).limit(limit),
      db.select().from(decisions).where(and(eq(decisions.userId, userId), like(decisions.content, wildcard))).limit(limit),
      db.select().from(ideas).where(and(eq(ideas.userId, userId), like(ideas.content, wildcard))).limit(limit),
      db.select().from(questions).where(and(eq(questions.userId, userId), like(questions.content, wildcard))).limit(limit),
      db.select().from(themes).where(and(eq(themes.userId, userId), like(themes.title, wildcard))).limit(limit),
      db.select().from(quotes).where(and(eq(quotes.userId, userId), like(quotes.textContent, wildcard))).limit(limit),
      db.select().from(highlights).where(and(eq(highlights.userId, userId), like(highlights.content, wildcard))).limit(limit),
      db.select().from(lifelogs).where(eq(lifelogs.userId, userId)).limit(limit * 3)
    ]);

  const lifelogResults = lifelogRows
    .filter((log) => {
      const haystack = `${log.title ?? ''} ${log.summary ?? ''} ${log.markdownContent ?? ''}`.toLowerCase();
      return haystack.includes(query.toLowerCase());
    })
    .slice(0, limit);

  return {
    insights: insightResults,
    action_items: actionResults,
    decisions: decisionResults,
    ideas: ideaResults,
    questions: questionResults,
    themes: themeResults,
    quotes: quoteResults.map(({ textContent, ...quote }) => ({ ...quote, text: textContent })),
    highlights: highlightResults,
    lifelogs: lifelogResults
  };
}

export async function listLifeLogs(userId: number, { skip = 0, limit = 100, date }: { skip?: number; limit?: number; date?: string } = {}) {
  let condition = eq(lifelogs.userId, userId);
  if (date) {
    condition = and(condition, eq(lifelogs.date, date));
  }

  const result = await db
    .select()
    .from(lifelogs)
    .where(condition)
    .orderBy(desc(lifelogs.date))
    .offset(skip)
    .limit(limit);
  return result;
}

const toDateOrNull = (value?: string | Date | null) => {
  if (!value) return null;
  return value instanceof Date ? value : new Date(value);
};

export async function createLifeLog(userId: number, data: {
  limitlessId: string;
  date: string;
  title?: string;
  summary?: string;
  markdownContent?: string;
  startTime?: string | Date | null;
  endTime?: string | Date | null;
  segmentType?: string;
  lastSyncedAt?: Date;
}) {
  const inserted = await db
    .insert(lifelogs)
    .values({
      userId,
      limitlessId: data.limitlessId,
      date: data.date,
      title: data.title,
      summary: data.summary,
      markdownContent: data.markdownContent,
      startTime: toDateOrNull(data.startTime),
      endTime: toDateOrNull(data.endTime),
      segmentType: data.segmentType,
      lastSyncedAt: data.lastSyncedAt ?? new Date()
    })
    .returning({ id: lifelogs.id });

  const lifelogId = inserted[0]?.id;
  if (!lifelogId) {
    throw new Error('Failed to create lifelog');
  }

  return getLifeLogById(userId, lifelogId);
}

export async function updateLifeLog(userId: number, id: number, data: {
  date?: string;
  title?: string | null;
  summary?: string | null;
  markdownContent?: string | null;
  startTime?: string | Date | null;
  endTime?: string | Date | null;
  segmentType?: string | null;
  lastSyncedAt?: Date;
}) {
  const updates: any = {};
  if (data.date) updates.date = data.date;
  if (data.title !== undefined) updates.title = data.title;
  if (data.summary !== undefined) updates.summary = data.summary;
  if (data.markdownContent !== undefined) updates.markdownContent = data.markdownContent;
  if (data.segmentType !== undefined) updates.segmentType = data.segmentType;
  if (data.startTime !== undefined) updates.startTime = toDateOrNull(data.startTime);
  if (data.endTime !== undefined) updates.endTime = toDateOrNull(data.endTime);
  if (data.lastSyncedAt !== undefined) updates.lastSyncedAt = data.lastSyncedAt;

  if (Object.keys(updates).length === 0) {
    return getLifeLogById(userId, id);
  }

  await db.update(lifelogs).set(updates).where(and(eq(lifelogs.id, id), eq(lifelogs.userId, userId)));
  return getLifeLogById(userId, id);
}

export async function deleteLifeLog(userId: number, id: number) {
  const result = await db.delete(lifelogs).where(and(eq(lifelogs.id, id), eq(lifelogs.userId, userId)));
  return (result.changes ?? 0) > 0;
}

export async function getLifeLogById(userId: number, id: number) {
  const row = await db.select().from(lifelogs).where(and(eq(lifelogs.id, id), eq(lifelogs.userId, userId))).limit(1);
  return row[0] ?? null;
}

export async function listLifeLogDates(userId: number) {
  const rows = await db.select({ date: lifelogs.date }).from(lifelogs).where(eq(lifelogs.userId, userId)).groupBy(lifelogs.date).orderBy(desc(lifelogs.date));
  return rows.map((row) => row.date);
}
