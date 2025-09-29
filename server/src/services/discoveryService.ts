import { eq, sql, desc } from 'drizzle-orm';
import { db } from '../db/client.js';
import { insights, sectionDiscoveries, discoveredContent, knowledgeNuggets, memorableExchanges } from '../db/schema.js';

interface SectionPattern {
  headerRegex: RegExp;
  subsectionRegex?: RegExp;
  contentExtractor: (content: string, date: string) => any[];
  minOccurrences: number;
  minDays: number;
  autoApproveThreshold: number; // % of insights (0.8 = 80%)
}

interface DiscoveredSection {
  header: string;
  pattern: string;
  subsectionPattern?: string;
  sampleContent: any[];
  extractionRules: any;
}

const DISCOVERY_PATTERNS: SectionPattern[] = [
  {
    headerRegex: /^## ([A-Z][^#\n]+?)(?:\s*[🔥💡📌💬🧠✍️🚩])?$/gm,
    contentExtractor: extractGenericBulletItems,
    minOccurrences: 3,
    minDays: 2,
    autoApproveThreshold: 0.8
  }
];

function extractGenericBulletItems(content: string, date: string): any[] {
  const items: any[] = [];
  const bulletPattern = /^\s*[\*\-]\s+(.+?)(?=^\s*[\*\-]\s+|\s*$)/gms;
  let match;

  while ((match = bulletPattern.exec(content)) !== null) {
    const raw = match[1];
    const clean = collapseWhitespace(stripBold(raw));
    if (clean && clean.length > 10) {
      items.push({
        content: clean,
        rawContent: raw,
        date
      });
    }
  }

  return items;
}

function extractKnowledgeNuggets(content: string, date: string): any[] {
  const results: any[] = [];

  // Look for Knowledge Nuggets section
  const sectionPattern = /## Knowledge Nuggets.*?(?=\n## [A-Z]|\Z)/gis;
  const sectionMatch = sectionPattern.exec(content);

  if (sectionMatch) {
    const sectionContent = sectionMatch[0];

    // Extract bullet points with categories and sources
    const bulletPattern = /\*\s+\*\*([^:]*?):\*\*\s+(.+?)(?=\*\s+\*\*|\n\s*$)/gms;
    let bulletMatch;

    while ((bulletMatch = bulletPattern.exec(sectionContent)) !== null) {
      const category = bulletMatch[1].trim();
      const factText = bulletMatch[2].trim();

      // Extract source from _Source: ... pattern
      const sourceMatch = factText.match(/_Source: ([^_]+)_?$/);
      const fact = sourceMatch ? factText.replace(/_Source: [^_]+_?$/, '').trim() : factText;
      const source = sourceMatch ? sourceMatch[1].trim() : null;

      results.push({
        category,
        fact,
        source,
        date
      });
    }
  }

  return results;
}

function extractMemorableExchanges(content: string, date: string): any[] {
  const results: any[] = [];

  // Look for Memorable Exchanges section
  const sectionPattern = /## Memorable Exchanges 💬[\s\S]*?(?=\n## |\Z)/g;
  const sectionMatch = sectionPattern.exec(content);

  if (sectionMatch) {
    const sectionContent = sectionMatch[0];

    // Get all lines and process line by line
    const lines = sectionContent.split('\n');

    let currentDialogue: { text: string }[] = [];
    let context = '';
    let inQuoteBlock = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.startsWith('> "') || (line.startsWith('>') && !line.includes('_—'))) {
        // This is a dialogue line
        inQuoteBlock = true;
        const quoteText = line.substring(1).trim();
        const cleanText = quoteText.replace(/^[">\s]*|["<\s]*$/g, '');
        if (cleanText) {
          currentDialogue.push({ text: cleanText });
        }
      } else if (line.startsWith('> _') && (line.includes('—') || line.includes('–') || line.includes('-'))) {
        // This is an attribution line - end of current exchange (handle Unicode em-dash)
        context = line.substring(1).trim();

        if (currentDialogue.length > 0) {
          results.push({
            dialogue: currentDialogue,
            context,
            date
          });
        }

        // Reset for next exchange
        currentDialogue = [];
        context = '';
        inQuoteBlock = false;
      }
    }
  }

  return results;
}

function stripBold(value: string): string {
  return value.replace(/\*\*(.*?)\*\*/g, '$1');
}

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export async function discoverNewSections(userId?: number): Promise<DiscoveredSection[]> {
  // Get recent insights (last 30 days)
  const recentInsights = await db
    .select({ id: insights.id, date: insights.date, content: insights.content })
    .from(insights)
    .where(userId ? eq(insights.userId, userId) : sql`1=1`)
    .orderBy(desc(insights.date))
    .limit(30);

  const discoveries: Map<string, DiscoveredSection> = new Map();

  for (const insight of recentInsights) {
    // Find all section headers
    const headerPattern = /^##\s+([^#\n]+?)(?:\s*[🔥💡📌💬🧠✍️🚩])?$/gm;
    let match;

    while ((match = headerPattern.exec(insight.content)) !== null) {
      const header = match[1].trim();
      const fullHeader = match[0];

      // Check if this section already exists in our known parsed sections
      const knownSections = [
        'Daily Narrative & Highlights',
        'Key Follow-Ups',
        'Red Flags & Recurring Loops',
        'Memorable Exchanges',
        'Knowledge Nuggets',
        'Idea Sandbox',
        'Decision Log'
      ];

      if (!knownSections.some(known => header.includes(known))) {
        continue;
      }

      // Extract section content
      const sectionStart = insight.content.indexOf(fullHeader);
      const nextSectionMatch = insight.content.slice(sectionStart + fullHeader.length).match(/\n##\s+[A-Z]/);
      const sectionEnd = nextSectionMatch
        ? sectionStart + fullHeader.length + nextSectionMatch.index
        : insight.content.length;

      const sectionContent = insight.content.slice(sectionStart, sectionEnd);

      // For now, focus on Knowledge Nuggets and Memorable Exchanges
      if (header.includes('Knowledge Nuggets')) {
        const extracted = extractKnowledgeNuggets(sectionContent, insight.date);
        if (extracted.length > 0) {
          const key = 'Knowledge Nuggets';
          if (!discoveries.has(key)) {
            discoveries.set(key, {
              header: key,
              pattern: '## Knowledge Nuggets',
              subsectionPattern: '### ### Things You Learned',
              sampleContent: [],
              extractionRules: { type: 'knowledge_nuggets' }
            });
          }
          discoveries.get(key)!.sampleContent.push(...extracted.slice(0, 2)); // Limit samples
        }
      }

      if (header.includes('Memorable Exchanges')) {
        const extracted = extractMemorableExchanges(sectionContent, insight.date);
        if (extracted.length > 0) {
          const key = 'Memorable Exchanges';
          if (!discoveries.has(key)) {
            discoveries.set(key, {
              header: key,
              pattern: '## Memorable Exchanges',
              subsectionPattern: '### ### A Few Standout Moments',
              sampleContent: [],
              extractionRules: { type: 'memorable_exchanges' }
            });
          }
          discoveries.get(key)!.sampleContent.push(...extracted.slice(0, 2)); // Limit samples
        }
      }
    }
  }

  return Array.from(discoveries.values());
}

export async function checkForNewDiscoveries(userId: number): Promise<void> {
  const discoveries = await discoverNewSections(userId);

  for (const discovery of discoveries) {
    // Check if we already have this discovery
    const existing = await db
      .select()
      .from(sectionDiscoveries)
      .where(eq(sectionDiscoveries.sectionHeader, discovery.header))
      .limit(1);

    if (existing.length === 0) {
      // New discovery - record it
      await db.insert(sectionDiscoveries).values({
        sectionHeader: discovery.header,
        sectionPattern: discovery.pattern,
        subsectionPattern: discovery.subsectionPattern,
        firstSeen: new Date().toISOString().split('T')[0],
        lastSeen: new Date().toISOString().split('T')[0],
        occurrenceCount: discovery.sampleContent.length,
        sampleContent: JSON.stringify(discovery.sampleContent.slice(0, 3)), // Store first 3 samples
        extractionRules: JSON.stringify(discovery.extractionRules),
        status: 'pending'
      });
    } else {
      // Update existing discovery
      const record = existing[0];
      await db
        .update(sectionDiscoveries)
        .set({
          lastSeen: new Date().toISOString().split('T')[0],
          occurrenceCount: record.occurrenceCount + discovery.sampleContent.length,
          updatedAt: sql`datetime('now')`
        })
        .where(eq(sectionDiscoveries.id, record.id));
    }
  }
}

export async function approveDiscovery(discoveryId: number): Promise<void> {
  await db
    .update(sectionDiscoveries)
    .set({
      status: 'approved',
      updatedAt: sql`datetime('now')`
    })
    .where(eq(sectionDiscoveries.id, discoveryId));
}

export async function dismissDiscovery(discoveryId: number): Promise<void> {
  await db
    .update(sectionDiscoveries)
    .set({
      status: 'dismissed',
      updatedAt: sql`datetime('now')`
    })
    .where(eq(sectionDiscoveries.id, discoveryId));
}

export async function getPendingDiscoveries(): Promise<any[]> {
  return await db
    .select()
    .from(sectionDiscoveries)
    .where(eq(sectionDiscoveries.status, 'pending'))
    .orderBy(desc(sectionDiscoveries.occurrenceCount));
}

export async function processApprovedSections(userId: number, insightId: number, content: string, date: string): Promise<void> {
  const approvedSections = await db
    .select()
    .from(sectionDiscoveries)
    .where(eq(sectionDiscoveries.status, 'approved'));

  for (const section of approvedSections) {
    const rules = JSON.parse(section.extractionRules || '{}');

    if (rules.type === 'knowledge_nuggets') {
      const extracted = extractKnowledgeNuggets(content, date);
      for (const item of extracted) {
        await db.insert(knowledgeNuggets).values({
          userId,
          insightId,
          date,
          category: item.category,
          fact: item.fact,
          source: item.source
        });
      }
    }

    if (rules.type === 'memorable_exchanges') {
      const extracted = extractMemorableExchanges(content, date);
      for (const item of extracted) {
        await db.insert(memorableExchanges).values({
          userId,
          insightId,
          date,
          dialogue: JSON.stringify(item.dialogue),
          context: item.context
        });
      }
    }
  }
}