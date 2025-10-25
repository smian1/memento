import { z } from 'zod';

const structuredDataSchema = z.object({
  actionItems: z.array(z.string()),
  decisions: z.array(z.string()),
  ideas: z.array(z.string()),
  questions: z.array(z.string()),
  themes: z.array(z.object({ title: z.string(), description: z.string() })),
  quotes: z.array(z.object({ text: z.string(), speaker: z.string() })),
  highlights: z.array(z.string()),
  knowledgeNuggets: z.array(z.object({ category: z.string().optional(), fact: z.string(), source: z.string().optional() })),
  memorableExchanges: z.array(z.object({ dialogue: z.array(z.object({ text: z.string() })), context: z.string().optional() }))
});

export type StructuredData = z.infer<typeof structuredDataSchema>;

export function extractStructuredData(content: string, date: string): StructuredData {
  const actionItems: string[] = [];
  const decisions: string[] = [];
  const ideas: string[] = [];
  const questions: string[] = [];
  const themes: { title: string; description: string }[] = [];
  const quotes: { text: string; speaker: string }[] = [];
  const highlights: string[] = [];
  const knowledgeNuggets: { category?: string; fact: string; source?: string }[] = [];
  const memorableExchanges: { dialogue: { text: string }[]; context?: string }[] = [];

  function extractSectionItems(sectionHeader: string, subsectionHeader?: string): string[] {
    const items: string[] = [];
    let pattern: RegExp;

    // Match section headers with optional emojis and whitespace before the text
    if (subsectionHeader) {
      pattern = new RegExp(`##\\s+[^\\n]*${escapeRegex(sectionHeader)}.*?###\\s+[^\\n]*${escapeRegex(subsectionHeader)}(.*?)(?=###|##|#|$)`, 'gis');
    } else {
      pattern = new RegExp(`##\\s+[^\\n]*${escapeRegex(sectionHeader)}(.*?)(?=##|#|$)`, 'gis');
    }

    const match = pattern.exec(content);
    if (match?.[1]) {
      const sectionContent = match[1];
      const bulletPattern = /^\s*[\*\-]\s+(.+?)(?=^\s*[\*\-]\s+|\s*$)/gms;
      let bulletMatch = bulletPattern.exec(sectionContent);
      while (bulletMatch) {
        const raw = bulletMatch[1];
        const clean = collapseWhitespace(stripBold(raw));
        if (clean && clean.length > 10) {
          items.push(clean);
        }
        bulletMatch = bulletPattern.exec(sectionContent);
      }
    }

    if (items.length === 0) {
      const mainPattern = new RegExp(`##\\s+[^\\n]*${escapeRegex(sectionHeader)}[^\\n]*\\n(.*?)(?=\\n## [A-Z]|\\Z)`, 'gis');
      const mainMatch = mainPattern.exec(content);
      if (mainMatch?.[1]) {
        const h3Pattern = /###\s+###\s+([^\n]+)\n(.*?)(?=\n###\s+###|\n###(?!\s+###)|\n##|\Z)/gms;
        let h3Match = h3Pattern.exec(mainMatch[1]);
        while (h3Match) {
          const title = collapseWhitespace(stripBold(h3Match[1]));
          const description = collapseWhitespace(stripBold(h3Match[2]));
          const combined = description ? `${title}: ${description}` : title;
          if (combined && combined.length > 10) {
            items.push(combined);
          }
          h3Match = h3Pattern.exec(mainMatch[1]);
        }
      }
    }

    return items;
  }

  function extractQuotes(): { text: string; speaker: string }[] {
    const results: { text: string; speaker: string }[] = [];

    // Pattern 1: "Quote that stands out:" format with attribution
    const pattern1 = />\s*\*\*Quote that stands out:\*\*\s*\n?\s*>\s*"([^"]+)"\s*(?:—\s*([^.\n]+))?/g;
    let match1 = pattern1.exec(content);
    while (match1) {
      results.push({ text: match1[1].trim(), speaker: match1[2]?.trim() || 'Unknown' });
      match1 = pattern1.exec(content);
    }

    // Pattern 2: Standard blockquote with attribution (Memorable Exchanges)
    const pattern2 = />\s*"([^"]+)"\s*(?:\.\.\.\s*"([^"]+)")?\s*—\s*([^.\n]+)/g;
    let match2 = pattern2.exec(content);
    while (match2) {
      const text = match2[2] ? `${match2[1]}... ${match2[2]}` : match2[1];
      results.push({ text: text.trim(), speaker: match2[3].trim() });
      match2 = pattern2.exec(content);
    }

    // Pattern 3: Simple blockquote without attribution
    const pattern3 = />\s*"([^"]+)"\s*$/gm;
    let match3 = pattern3.exec(content);
    while (match3) {
      // Only add if not already captured by other patterns
      const alreadyCaptured = results.some(q => match3 && q.text.includes(match3[1].trim()));
      if (!alreadyCaptured && match3) {
        results.push({ text: match3[1].trim(), speaker: 'Unknown' });
      }
      match3 = pattern3.exec(content);
    }

    return results;
  }

  function extractRecurringThemes(): { title: string; description: string }[] {
    const results: { title: string; description: string }[] = [];

    // Match patterns like:
    // ### Recurring Theme Noticed
    // -   **Title:** Description
    const themePattern = /### [^#\n]*Recurring Theme[^#\n]*\n(.*?)(?=###|##|#|$)/gis;
    let match = themePattern.exec(content);

    while (match) {
      const sectionContent = match[1];
      // Extract bullet items with bold titles, but skip "Quote that stands out"
      const bulletPattern = /^\s*[-*]\s+\*\*([^:*]+):\*\*\s*(.+?)(?=^\s*[-*]\s+\*\*|$)/gms;
      let bulletMatch = bulletPattern.exec(sectionContent);

      while (bulletMatch) {
        const title = collapseWhitespace(bulletMatch[1]);
        // Skip if this is a "Quote that stands out" item
        if (title.toLowerCase().includes('quote that stands out')) {
          bulletMatch = bulletPattern.exec(sectionContent);
          continue;
        }
        const description = collapseWhitespace(stripQuotes(bulletMatch[2]));
        results.push({
          title,
          description: description.length > 500 ? `${description.slice(0, 500)}...` : description
        });
        bulletMatch = bulletPattern.exec(sectionContent);
      }

      match = themePattern.exec(content);
    }

    return results;
  }

  function extractKnowledgeNuggets(): { category?: string; fact: string; source?: string }[] {
    const results: { category?: string; fact: string; source?: string }[] = [];

    // Look for Knowledge Nuggets section
    const sectionPattern = /##\s+[^#\n]*Knowledge Nuggets.*?(?=\n##|\Z)/gis;
    const sectionMatch = sectionPattern.exec(content);

    if (sectionMatch) {
      const sectionContent = sectionMatch[0];

      // Extract bullet points with categories and sources
      const bulletPattern = /\*\s+\*\*([^:]*?):\*\*\s+(.+?)(?=\n\s*\*\s+\*\*|\n\n|\Z)/gms;
      let bulletMatch = bulletPattern.exec(sectionContent);

      while (bulletMatch) {
        const category = bulletMatch[1].trim();
        const factText = bulletMatch[2].trim();

        // Extract source from _Source: ... pattern
        const sourceMatch = factText.match(/_Source:\s*([^_\n]+)_?$/);
        const fact = sourceMatch ? factText.replace(/_Source:\s*[^_\n]+_?$/, '').trim() : factText;
        const source = sourceMatch ? sourceMatch[1].trim() : undefined;

        results.push({
          category: category || undefined,
          fact,
          source
        });

        bulletMatch = bulletPattern.exec(sectionContent);
      }
    }

    return results;
  }

  function extractMemorableExchanges(): { dialogue: { text: string }[]; context?: string }[] {
    const results: { dialogue: { text: string }[]; context?: string }[] = [];

    // Look for Memorable Exchanges section
    const sectionPattern = /##\s+[^#\n]*Memorable Exchanges[\s\S]*?(?=\n##|\Z)/gi;
    const sectionMatch = sectionPattern.exec(content);

    if (sectionMatch) {
      const sectionContent = sectionMatch[0];

      // Get all lines and process line by line
      const lines = sectionContent.split('\n');

      let currentDialogue: { text: string }[] = [];
      let context = '';

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        if (line.startsWith('> "') || (line.startsWith('>') && !line.includes('_—') && !line.includes('_–'))) {
          // This is a dialogue line
          const quoteText = line.substring(1).trim();
          const cleanText = quoteText.replace(/^[">\s]*|["<\s]*$/g, '');
          if (cleanText) {
            currentDialogue.push({ text: cleanText });
          }
        } else if (line.startsWith('> _') && (line.includes('—') || line.includes('–') || line.includes('-'))) {
          // This is an attribution line - end of current exchange
          context = line.substring(1).trim();

          if (currentDialogue.length > 0) {
            results.push({
              dialogue: currentDialogue,
              context: context || undefined
            });
          }

          // Reset for next exchange
          currentDialogue = [];
          context = '';
        }
      }
    }

    return results;
  }

  function extractTopHighlights(): string[] {
    const results: string[] = [];
    // Match both ### Top Highlights (header) and **Top Highlights** (bold)
    const highlightPattern = /(?:###\s*Top Highlights|\*\*Top Highlights\*\*)\s*\n(.*?)(?=\n##)/gis;
    const match = highlightPattern.exec(content);
    if (match?.[1]) {
      // Extract bullets - each line starting with * followed by space
      const lines = match[1].split('\n');
      for (const line of lines) {
        const bulletMatch = line.match(/^\s*\*\s+(.+)$/);
        if (bulletMatch) {
          const clean = collapseWhitespace(stripBold(bulletMatch[1]));
          if (clean && clean.length > 10) {
            results.push(clean);
          }
        }
      }
    }
    return results;
  }

  function escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function stripBold(value: string): string {
    return value.replace(/\*\*(.*?)\*\*/g, '$1');
  }

  function stripQuotes(value: string): string {
    return value.replace(/>\s*\*\*Quote.*?\*\*.*$/gms, '').trim();
  }

  function collapseWhitespace(value: string): string {
    return value.replace(/\s+/g, ' ').trim();
  }

  // Capture new triple hash action items if present
  if (content.includes('Key Follow-Ups')) {
    const followUpPattern = /##\s+[^#\n]*Key Follow-Ups.*?(?=\n## |\Z)/gms;
    const followMatch = followUpPattern.exec(content);
    if (followMatch) {
      const section = followMatch[0];
      const triplePattern = /^### ### (.+?)\n(.*?)(?=\n### ###|\n## |\n### [^#]|\Z)/gms;
      let tripleMatch = triplePattern.exec(section);
      while (tripleMatch) {
        const title = collapseWhitespace(stripBold(tripleMatch[1]));
        const description = collapseWhitespace(stripBold(tripleMatch[2].split('\n')[0] ?? ''));
        const combined = description ? `${title}: ${description}` : title;
        if (combined && combined.length > 10) {
          actionItems.push(combined);
        }
        tripleMatch = triplePattern.exec(section);
      }
    }
  }

  actionItems.push(...extractSectionItems('Key Follow-Ups', 'For You to Action'));
  actionItems.push(...extractSectionItems('Key Follow-Ups', 'Household To-Dos'));
  if (actionItems.length === 0) {
    actionItems.push(...extractSectionItems('Commitment Tracker', 'Promises from You'));
  }

  decisions.push(...extractSectionItems('Decision Log', 'Decisions Made'));
  if (decisions.length === 0) {
    decisions.push(...extractSectionItems('Strategic Decisions Made'));
  }
  
  ideas.push(...extractSectionItems('Idea Sandbox', 'Seeds of an Idea'));
  if (ideas.length === 0) {
    ideas.push(...extractSectionItems('Ideas to Explore'));
  }
  questions.push(...extractSectionItems('Open Questions to Resolve'));
  questions.push(...extractSectionItems('Unresolved Questions'));

  const quoteResults = extractQuotes();
  quotes.push(...quoteResults);

  const themeResults = extractRecurringThemes();
  themes.push(...themeResults);

  const highlightResults = extractTopHighlights();
  highlights.push(...highlightResults);

  const nuggetResults = extractKnowledgeNuggets();
  knowledgeNuggets.push(...nuggetResults);

  const exchangeResults = extractMemorableExchanges();
  memorableExchanges.push(...exchangeResults);

  const parsed = structuredDataSchema.parse({
    actionItems,
    decisions,
    ideas,
    questions,
    themes,
    quotes,
    highlights,
    knowledgeNuggets,
    memorableExchanges
  });

  return parsed;
}
