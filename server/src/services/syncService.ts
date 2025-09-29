import { eq, sql, and, desc } from 'drizzle-orm';
import axios from 'axios';
import { DateTime } from 'luxon';
import { db } from '../db/client.js';
import { insights, syncMetadata, actionItems, decisions, ideas, questions, themes, quotes, highlights, lifelogs, knowledgeNuggets, memorableExchanges } from '../db/schema.js';
import { createLifeLog, updateLifeLog } from './dataService.js';
import { getUserConfig } from './authService.js';
import { extractStructuredData } from '../utils/structuredData.js';
import { processApprovedSections, checkForNewDiscoveries } from './discoveryService.js';

const LIMITLESS_BASE_URL = 'https://api.limitless.ai/v1';

interface LimitlessMessage {
  user?: { role?: string };
  text?: string;
}

interface LimitlessChat {
  id: string;
  createdAt: string;
  summary?: string;
  messages?: LimitlessMessage[];
}

interface LimitlessLifeLog {
  id: string;
  startTime?: string;
  endTime?: string;
  title?: string;
  summary?: string;
  contents?: unknown[];
  markdown?: string;
  segmentType?: string;
  date?: string;
}

async function fetchDailyInsights(apiKey: string, options: { start?: string; limit?: number } = {}): Promise<LimitlessChat[]> {
  const { start, limit = 200 } = options;
  const params: any = { limit, direction: 'desc' };
  
  if (start) {
    params.start = start;
  }

  const response = await axios.get(`${LIMITLESS_BASE_URL}/chats`, {
    headers: { 'X-API-Key': apiKey },
    params
  });

  const chats = response.data?.data?.chats ?? [];
  return chats.filter((chat: LimitlessChat) => chat.summary === 'Daily insights');
}

async function fetchLifeLogs(apiKey: string, options: { date?: string; start?: string; end?: string; limit?: number } = {}): Promise<LimitlessLifeLog[]> {
  const { date, start, end, limit = 100 } = options;
  const params: any = { limit };
  
  if (date) {
    params.date = date;
  } else if (start) {
    params.start = start;
    if (end) {
      params.end = end;
    }
  }

  const response = await axios.get(`${LIMITLESS_BASE_URL}/lifelogs`, {
    headers: { 'X-API-Key': apiKey },
    params
  });

  return response.data?.data?.lifelogs ?? [];
}

function determineSegmentType(title: string, summary: string): string {
  const combined = `${title} ${summary}`.toLowerCase();
  if (['meeting', 'call', 'zoom', 'conference'].some((keyword) => combined.includes(keyword))) {
    return 'meeting';
  }
  if (['conversation', 'chat', 'talk', 'discussion'].some((keyword) => combined.includes(keyword))) {
    return 'conversation';
  }
  if (['work', 'coding', 'development', 'project'].some((keyword) => combined.includes(keyword))) {
    return 'work';
  }
  if (['break', 'lunch', 'meal', 'coffee'].some((keyword) => combined.includes(keyword))) {
    return 'break';
  }
  return 'general';
}

function normalizeLifeLog(log: LimitlessLifeLog, fallbackDate: string) {
  const limitlessId = log.id;
  if (!limitlessId) {
    return null;
  }

  const startIso = log.startTime ?? null;
  const endIso = log.endTime ?? null;

  let startDateTime: DateTime | null = null;
  let endDateTime: DateTime | null = null;

  try {
    if (startIso) {
      startDateTime = DateTime.fromISO(startIso, { zone: 'utc' });
      if (!startDateTime.isValid) {
        startDateTime = null;
      }
    }
    if (endIso) {
      endDateTime = DateTime.fromISO(endIso, { zone: 'utc' });
      if (!endDateTime.isValid) {
        endDateTime = null;
      }
    }
  } catch (error) {
    startDateTime = null;
    endDateTime = null;
  }

  // Convert UTC timestamp to user's timezone to get the correct local date
  // For PT timezone, 2:54 AM UTC on Sept 25 should be Sept 24 PT
  const date = startDateTime?.setZone('America/Los_Angeles').toISODate() ?? log.date ?? fallbackDate;
  if (!date) {
    return null;
  }

  const title = log.title ?? '';
  let summary = '';
  if (typeof log.summary === 'string' && log.summary.trim().length > 0) {
    summary = log.summary.trim();
  } else if (Array.isArray(log.contents) && log.contents.length > 0) {
    summary = String(log.contents[0]).slice(0, 500);
  }

  const markdownContent = typeof log.markdown === 'string' ? log.markdown : '';
  const segmentType = log.segmentType ?? determineSegmentType(title, summary);

  return {
    limitlessId,
    date,
    title,
    summary,
    markdownContent,
    segmentType,
    startTime: startDateTime ? startDateTime.toJSDate() : null,
    endTime: endDateTime ? endDateTime.toJSDate() : null,
    lastSyncedAt: new Date()
  };
}

async function ensureSyncMetadata(userId: number) {
  await db.insert(syncMetadata).values({ userId, lastSyncStatus: 'idle' }).onConflictDoNothing();
}

async function markSyncStatus(userId: number, status: string, details?: { 
  fetched?: number; 
  added?: number; 
  updated?: number; 
  error?: string;
  syncType?: 'insights' | 'lifelogs' | 'both';
  lifelogsFetched?: number;
  lifelogsAdded?: number;
  lifelogsUpdated?: number;
}) {
  await ensureSyncMetadata(userId);
  
  const updateData: any = {
    lastSyncStatus: status,
    lastSyncAt: sql`datetime('now')`,
    errorMessage: details?.error ?? null
  };

  // Update insights-specific fields
  if (!details?.syncType || details?.syncType === 'insights' || details?.syncType === 'both') {
    updateData.insightsFetched = details?.fetched ?? 0;
    updateData.insightsAdded = details?.added ?? 0;
    updateData.insightsUpdated = details?.updated ?? 0;
    if (status === 'success') {
      updateData.lastInsightsSyncAt = sql`datetime('now')`;
    }
  }

  // Update lifelogs-specific fields
  if (details?.syncType === 'lifelogs' || details?.syncType === 'both') {
    updateData.lifelogsFetched = details?.lifelogsFetched ?? 0;
    updateData.lifelogsAdded = details?.lifelogsAdded ?? 0;
    updateData.lifelogsUpdated = details?.lifelogsUpdated ?? 0;
    if (status === 'success') {
      updateData.lastLifelogsSyncAt = sql`datetime('now')`;
    }
  }

  await db
    .update(syncMetadata)
    .set(updateData)
    .where(eq(syncMetadata.userId, userId));
}

export async function runSyncForUser(userId: number, { force = false } = {}) {
  const config = await getUserConfig(userId);
  if (!config?.limitlessApiKey) {
    return { success: false, message: 'Missing API key', skipped: true };
  }

  try {
    await markSyncStatus(userId, 'in_progress', { syncType: 'insights' });
    
    // Get last insights sync time for incremental sync
    let startTime: string | undefined;
    if (!force) {
      const lastSyncRows = await db
        .select({ lastInsightsSyncAt: syncMetadata.lastInsightsSyncAt })
        .from(syncMetadata)
        .where(eq(syncMetadata.userId, userId))
        .limit(1);
      
      const lastSync = lastSyncRows[0];
      if (lastSync?.lastInsightsSyncAt) {
        // Start from last sync time, but go back 1 hour as buffer for timezone issues
        const lastSyncTime = DateTime.fromJSDate(lastSync.lastInsightsSyncAt).minus({ hours: 1 });
        startTime = lastSyncTime.toUTC().toISO() || undefined;
      }
    }
    
    const chats = await fetchDailyInsights(config.limitlessApiKey, { start: startTime });

    let fetched = 0;
    let added = 0;
    let updated = 0;

    for (const chat of chats) {
      if (!chat.createdAt) continue;
      const created = DateTime.fromISO(chat.createdAt, { zone: 'utc' });
      const contentDate = created.minus({ days: 1 }).toISODate();
      if (!contentDate) continue;

      const assistantMessage = chat.messages?.find((message) => message.user?.role === 'assistant');
      const content = assistantMessage?.text ?? '';
      if (!content) continue;

      fetched += 1;

      const existingInsight = await db
        .select()
        .from(insights)
        .where(
          and(
            eq(insights.userId, userId),
            eq(insights.date, contentDate)
          )
        )
        .limit(1);
      if (existingInsight.length === 0) {
        const inserted = await db.insert(insights).values({ userId, date: contentDate, content }).returning({ id: insights.id });
        const insightId = inserted[0]?.id;
        if (insightId) {
          await refreshStructuredData(userId, insightId, content, contentDate);
          added += 1;
        }
      } else {
        const record = existingInsight[0];
        if (record.content !== content) {
          await db
            .update(insights)
            .set({ content, updatedAt: sql`datetime('now')` })
            .where(eq(insights.id, record.id));
          await refreshStructuredData(userId, record.id, content, contentDate);
          updated += 1;
        }
      }
    }

    await markSyncStatus(userId, 'success', { fetched, added, updated, syncType: 'insights' });
    return { success: true, message: 'Sync completed', fetched, added, updated };
  } catch (error: any) {
    await markSyncStatus(userId, 'error', { error: error?.message ?? 'Unknown error' });
    return { success: false, message: error?.message ?? 'Unknown error', error: error?.message ?? 'Unknown error' };
  }
}

export async function syncLifeLogsForUser(
  userId: number,
  {
    daysBack = 30,
    targetDate,
    force = false
  }: { daysBack?: number; targetDate?: string; force?: boolean } = {}
) {
  const config = await getUserConfig(userId);
  if (!config?.limitlessApiKey) {
    return { success: false, message: 'Missing API key', skipped: true };
  }

  const apiKey = config.limitlessApiKey;
  const timezone = config.timezone ?? 'UTC';
  
  let synced = 0;
  let updated = 0;
  let skipped = 0;
  let totalProcessed = 0;

  try {
    let lifelogEntries: any[] = [];
    
    if (targetDate) {
      // Sync specific date
      lifelogEntries = await fetchLifeLogs(apiKey, { date: targetDate });
    } else if (!force) {
      // Incremental sync - get data since last sync
      const lastSyncRows = await db
        .select({ lastLifelogsSyncAt: syncMetadata.lastLifelogsSyncAt })
        .from(syncMetadata)
        .where(eq(syncMetadata.userId, userId))
        .limit(1);
      
      const lastSync = lastSyncRows[0];
      if (lastSync?.lastLifelogsSyncAt) {
        // Start from last sync time, but go back 2 hours as buffer
        const lastSyncTime = DateTime.fromJSDate(lastSync.lastLifelogsSyncAt).minus({ hours: 2 });
        const startTime = lastSyncTime.toUTC().toISO();
        const endTime = DateTime.now().toUTC().toISO();
        
        if (startTime && endTime) {
          lifelogEntries = await fetchLifeLogs(apiKey, { start: startTime, end: endTime, limit: 1000 });
        } else {
          // Fallback to recent data if we can't get proper timestamps
          const today = DateTime.now().setZone(timezone).startOf('day');
          const yesterday = today.minus({ days: 1 }).toISODate();
          const todayStr = today.toISODate();
          
          if (yesterday && todayStr) {
            const [yesterdayEntries, todayEntries] = await Promise.all([
              fetchLifeLogs(apiKey, { date: yesterday }),
              fetchLifeLogs(apiKey, { date: todayStr })
            ]);
            lifelogEntries = [...yesterdayEntries, ...todayEntries];
          }
        }
      } else {
        // First sync - get recent data (last 3 days)
        const today = DateTime.now().setZone(timezone).startOf('day');
        const dates = [];
        for (let i = 0; i < 3; i++) {
          const date = today.minus({ days: i }).toISODate();
          if (date) dates.push(date);
        }
        
        const allEntries = await Promise.all(
          dates.map(date => fetchLifeLogs(apiKey, { date }))
        );
        lifelogEntries = allEntries.flat();
      }
    } else {
      // Force sync - get data for specified period
      const today = DateTime.now().setZone(timezone).startOf('day');
      const dates = [];
      
      // Add tomorrow for timezone boundary issues
      const tomorrow = today.plus({ days: 1 }).toISODate();
      if (tomorrow) dates.push(tomorrow);
      
      // Add historical dates
      for (let i = 0; i < daysBack; i++) {
        const date = today.minus({ days: i }).toISODate();
        if (date) dates.push(date);
      }
      
      const allEntries = await Promise.all(
        dates.map(dateStr => fetchLifeLogs(apiKey, { date: dateStr }))
      );
      lifelogEntries = allEntries.flat();
    }

    // Process all entries
    totalProcessed = lifelogEntries.length;

    for (const entry of lifelogEntries) {
        // Extract date from the entry itself or use current date
        const entryDate = entry.date || DateTime.now().toISODate() || '';
        const normalized = normalizeLifeLog(entry, entryDate);
        if (!normalized) {
          continue;
        }

        const existing = await db
          .select({
            id: lifelogs.id,
            title: lifelogs.title,
            summary: lifelogs.summary,
            markdownContent: lifelogs.markdownContent,
            segmentType: lifelogs.segmentType,
            startTime: lifelogs.startTime,
            endTime: lifelogs.endTime,
            date: lifelogs.date
          })
          .from(lifelogs)
          .where(and(eq(lifelogs.userId, userId), eq(lifelogs.limitlessId, normalized.limitlessId)))
          .limit(1);

      if (existing.length === 0) {
        await createLifeLog(userId, normalized);
        synced += 1;
      } else {
        const record = existing[0];
        const hasChanges =
          force ||
          record.title !== normalized.title ||
          record.summary !== normalized.summary ||
          record.markdownContent !== normalized.markdownContent ||
          record.segmentType !== normalized.segmentType ||
          (record.startTime?.valueOf() ?? 0) !== (normalized.startTime?.valueOf() ?? 0) ||
          (record.endTime?.valueOf() ?? 0) !== (normalized.endTime?.valueOf() ?? 0) ||
          record.date !== normalized.date;

        if (hasChanges) {
          await updateLifeLog(userId, record.id, normalized);
          updated += 1;
        } else {
          skipped += 1;
        }
      }
    }
    
    // Mark sync as successful
    await markSyncStatus(userId, 'success', { 
      syncType: 'lifelogs',
      lifelogsFetched: lifelogEntries.length,
      lifelogsAdded: synced,
      lifelogsUpdated: updated
    });
  } catch (error) {
    await markSyncStatus(userId, 'error', { 
      syncType: 'lifelogs',
      error: (error as Error)?.message ?? 'Unknown error'
    });
    return {
      success: false,
      message: `Failed to sync life logs: ${(error as Error)?.message ?? 'Unknown error'}`
    };
  }

  return {
    success: true,
    synced,
    updated,
    skipped,
    totalProcessed,
    message: `Life logs synced: ${synced} added, ${updated} updated, ${skipped} skipped`
  };
}

export async function syncLifeLogsForDate(userId: number, date: string) {
  return syncLifeLogsForUser(userId, { targetDate: date, force: true });
}

async function refreshStructuredData(userId: number, insightId: number, content: string, date: string) {
  const structured = extractStructuredData(content, date);

  // Clean existing structured data
  await db.delete(actionItems).where(eq(actionItems.insightId, insightId));
  await db.delete(decisions).where(eq(decisions.insightId, insightId));
  await db.delete(ideas).where(eq(ideas.insightId, insightId));
  await db.delete(questions).where(eq(questions.insightId, insightId));
  await db.delete(themes).where(eq(themes.insightId, insightId));
  await db.delete(quotes).where(eq(quotes.insightId, insightId));
  await db.delete(highlights).where(eq(highlights.insightId, insightId));

  // Clean discovery-based data
  await db.delete(knowledgeNuggets).where(eq(knowledgeNuggets.insightId, insightId));
  await db.delete(memorableExchanges).where(eq(memorableExchanges.insightId, insightId));

  if (structured.actionItems.length > 0) {
    await db.insert(actionItems).values(structured.actionItems.map((item) => ({
      userId,
      insightId,
      date,
      content: item,
      source: 'LIMITLESS'
    })));
  }

  if (structured.decisions.length > 0) {
    await db.insert(decisions).values(structured.decisions.map((item) => ({
      userId,
      insightId,
      date,
      content: item
    })));
  }

  if (structured.ideas.length > 0) {
    await db.insert(ideas).values(structured.ideas.map((item) => ({
      userId,
      insightId,
      date,
      content: item
    })));
  }

  if (structured.questions.length > 0) {
    await db.insert(questions).values(structured.questions.map((item) => ({
      userId,
      insightId,
      date,
      content: item,
      resolved: false
    })));
  }

  if (structured.themes.length > 0) {
    await db.insert(themes).values(structured.themes.map((item) => ({
      userId,
      insightId,
      date,
      title: item.title,
      description: item.description
    })));
  }

  if (structured.quotes.length > 0) {
    await db.insert(quotes).values(structured.quotes.map((item) => ({
      userId,
      insightId,
      date,
      textContent: item.text,
      speaker: item.speaker
    })));
  }

  if (structured.highlights.length > 0) {
    await db.insert(highlights).values(structured.highlights.map((item) => ({
      userId,
      insightId,
      date,
      content: item
    })));
  }

  // Process approved discovery sections
  await processApprovedSections(userId, insightId, content, date);

  // Check for new discoveries (only occasionally to avoid performance impact)
  if (Math.random() < 0.1) { // 10% chance to run discovery check
    await checkForNewDiscoveries(userId);
  }
}

export async function getSyncStatusForUser(userId: number) {
  const config = await getUserConfig(userId);
  const timezone = config?.timezone ?? 'America/Los_Angeles';
  const now = DateTime.now().setZone(timezone);
  const syncWindowStart = now.startOf('day').set({ hour: 7 });

  const lastSyncRows = await db
    .select()
    .from(syncMetadata)
    .where(eq(syncMetadata.userId, userId))
    .orderBy(desc(syncMetadata.lastSyncAt))
    .limit(1);

  const lastSync = lastSyncRows[0] ?? null;

  let shouldSync = false;
  let reason = 'No sync needed';

  if (!lastSync) {
    shouldSync = now >= syncWindowStart;
    reason = shouldSync ? 'First sync pending for today' : `Waiting until ${syncWindowStart.toFormat('h:mm a z')}`;
  } else {
    const lastSyncTime = DateTime.fromJSDate(lastSync.lastSyncAt).setZone('utc').toLocal();

    if (lastSync.lastSyncStatus === 'in_progress') {
      shouldSync = false;
      reason = 'Sync already in progress';
    } else if (now < syncWindowStart) {
      shouldSync = false;
      reason = `Waiting until ${syncWindowStart.toFormat('h:mm a z')}`;
    } else if (lastSyncTime < syncWindowStart || lastSync.lastSyncStatus !== 'success') {
      shouldSync = true;
      reason = lastSync.lastSyncStatus === 'success'
        ? 'No sync performed yet today'
        : 'Last sync reported an error';
    } else {
      shouldSync = false;
      reason = `Already synced today at ${lastSyncTime.setZone(timezone).toFormat('h:mm a z')}`;
    }
  }

  return {
    should_sync: shouldSync,
    reason,
    in_progress: lastSync?.lastSyncStatus === 'in_progress',
    last_sync: lastSync
      ? {
          timestamp: DateTime.fromJSDate(lastSync.lastSyncAt).setZone('utc').toISO(),
          timestamp_local: DateTime.fromJSDate(lastSync.lastSyncAt).setZone('utc').setZone(timezone).toISO(),
          timestamp_pacific: DateTime.fromJSDate(lastSync.lastSyncAt).setZone('utc')
            .setZone('America/Los_Angeles')
            .toFormat('yyyy-LL-dd hh:mm a ZZZZ'),
          status: lastSync.lastSyncStatus,
          insights_added: lastSync.insightsAdded,
          insights_updated: lastSync.insightsUpdated,
          insights_fetched: lastSync.insightsFetched,
          error_message: lastSync.errorMessage ?? null
        }
      : null
  };
}
