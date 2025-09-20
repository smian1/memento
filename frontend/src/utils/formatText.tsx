import React from 'react';

/**
 * Parse inline markdown formatting and return React elements
 * Supports:
 * - Bold: **text**
 * - Italic: _text_
 */
export const parseInlineFormatting = (text: string): (string | React.ReactElement)[] => {
  // Handle null/undefined text
  if (!text) {
    return [text || ''];
  }

  const parts: (string | React.ReactElement)[] = [];
  let currentIndex = 0;
  let keyCounter = 0;

  // Combined regex to find both bold (**text**) and italic (_text_) patterns
  // Use non-greedy matching to handle multiple instances correctly
  const formattingRegex = /(\*\*(.*?)\*\*)|(_([^_]+)_)/g;
  let match;

  while ((match = formattingRegex.exec(text)) !== null) {
    // Add text before the formatted part
    if (match.index > currentIndex) {
      parts.push(text.substring(currentIndex, match.index));
    }

    if (match[1]) {
      // Bold pattern (**text**)
      parts.push(<strong key={keyCounter++}>{match[2]}</strong>);
    } else if (match[3]) {
      // Italic pattern (_text_)
      parts.push(<em key={keyCounter++} className="source-citation">{match[4]}</em>);
    }

    currentIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (currentIndex < text.length) {
    parts.push(text.substring(currentIndex));
  }

  return parts.length > 0 ? parts : [text];
};

/**
 * Format content with inline markdown parsing
 * Returns a React element or string depending on whether formatting was found
 */
export const formatInlineText = (text: string): React.ReactElement | string => {
  // Handle null/undefined text
  if (!text) {
    return text || '';
  }

  const parsed = parseInlineFormatting(text);

  // If no formatting was applied, return the original string
  if (parsed.length === 1 && typeof parsed[0] === 'string') {
    return text;
  }

  // Return a span containing the formatted parts
  return <span>{parsed}</span>;
};