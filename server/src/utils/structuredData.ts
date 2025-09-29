import { z } from 'zod';

const structuredDataSchema = z.object({
  actionItems: z.array(z.string()),
  decisions: z.array(z.string()),
  ideas: z.array(z.string()),
  questions: z.array(z.string()),
  themes: z.array(z.object({ title: z.string(), description: z.string() })),
  quotes: z.array(z.object({ text: z.string(), speaker: z.string() })),
  highlights: z.array(z.string())
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

  function extractSectionItems(sectionHeader: string, subsectionHeader?: string): string[] {
    const items: string[] = [];
    let pattern: RegExp;

    if (subsectionHeader) {
      pattern = new RegExp(`##\\s+${escapeRegex(sectionHeader)}.*?###\\s+${escapeRegex(subsectionHeader)}(.*?)(?=###|##|#|$)`, 'gis');
    } else {
      pattern = new RegExp(`##\\s+${escapeRegex(sectionHeader)}(.*?)(?=##|#|$)`, 'gis');
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
      const mainPattern = new RegExp(`##\\s+${escapeRegex(sectionHeader)}[^\\n]*\\n(.*?)(?=\\n## [A-Z]|\\Z)`, 'gis');
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
    const patterns = [
      />\s*\*\*Quote that stands out:\*\*\s*"([^"]+)"\s*—\s*([^.\n]+)/g,
      />\s*"([^"]+)"\s*\n>\s*—\s*([^.\n]+)/g
    ];

    for (const pattern of patterns) {
      let match = pattern.exec(content);
      while (match) {
        results.push({ text: match[1].trim(), speaker: match[2].trim() });
        match = pattern.exec(content);
      }
    }

    return results;
  }

  function extractRecurringThemes(): { title: string; description: string }[] {
    const results: { title: string; description: string }[] = [];
    const themePattern = /### Recurring Theme Noticed:?([^\n]*)\n(.*?)(?=###|##|#|$)/gms;
    let match = themePattern.exec(content);
    while (match) {
      const title = collapseWhitespace(stripBold(match[1]));
      const description = collapseWhitespace(stripQuotes(match[2]));
      results.push({
        title,
        description: description.length > 500 ? `${description.slice(0, 500)}...` : description
      });
      match = themePattern.exec(content);
    }
    return results;
  }

  function extractTopHighlights(): string[] {
    const results: string[] = [];
    const highlightPattern = /\*\*Top Highlights\*\*(.*?)(?=\n## [A-Z]|\Z)/gms;
    const match = highlightPattern.exec(content);
    if (match?.[1]) {
      const bulletPattern = /^\s*\*\s+(.+?)(?=\n\s*\*|\n\s*$)/gms;
      let bulletMatch = bulletPattern.exec(match[1]);
      while (bulletMatch) {
        const clean = collapseWhitespace(stripBold(bulletMatch[1]));
        if (clean && clean.length > 10) {
          results.push(clean);
        }
        bulletMatch = bulletPattern.exec(match[1]);
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
    const followUpPattern = /## Key Follow-Ups.*?(?=\n## |\Z)/gms;
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

  const parsed = structuredDataSchema.parse({
    actionItems,
    decisions,
    ideas,
    questions,
    themes,
    quotes,
    highlights
  });

  return parsed;
}
