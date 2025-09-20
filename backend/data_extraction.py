"""Data Extraction Utilities

This module contains functions for extracting structured data from
daily insights markdown content. It parses various sections like
action items, decisions, ideas, quotes, etc.

Author: Limitless Insights Project
"""

import re
from typing import Dict, List, Any


def extract_structured_data(content: str, date: str) -> Dict[str, Any]:
    """Extract structured data from daily insights content.

    Parses markdown content and extracts various types of structured data
    including action items, decisions, ideas, questions, themes, quotes,
    and highlights.

    Args:
        content: The markdown content to parse
        date: The date string (YYYY-MM-DD format)

    Returns:
        Dictionary containing extracted data organized by type:
        - action_items: List of action item strings
        - decisions: List of decision strings
        - ideas: List of idea strings
        - unresolved_questions: List of question strings
        - quotes: List of quote dictionaries with 'text' and 'speaker'
        - recurring_themes: List of theme dictionaries with 'title' and 'description'
        - top_highlights: List of highlight strings
    """

    def extract_section_items(content: str, section_header: str, subsection_header: str = None) -> List[str]:
        """Extract items from a specific section.

        Args:
            content: The markdown content to search
            section_header: The main section header to find
            subsection_header: Optional subsection header for more specific targeting

        Returns:
            List of extracted item strings
        """
        items = []

        # Create pattern for section - account for emojis and flexible spacing
        if subsection_header:
            pattern = rf"##\s+{re.escape(section_header)}.*?###\s+{re.escape(subsection_header)}(.*?)(?=###|##|#|$)"
        else:
            pattern = rf"##\s+{re.escape(section_header)}(.*?)(?=##|#|$)"

        match = re.search(pattern, content, re.DOTALL | re.IGNORECASE)
        if match:
            section_content = match.group(1)
            # Extract bullet points - look for lines starting with * or -
            bullet_items = re.findall(r'^\s*[\*\-]\s+(.+?)(?=\n\s*[\*\-]|\n\s*$|\n\s*[^\*\-])', section_content, re.MULTILINE | re.DOTALL)
            for item in bullet_items:
                # Clean up the item text - keep source citations
                clean_item = re.sub(r'\n+', ' ', item).strip()
                # Remove markdown formatting but keep italic source citations
                clean_item = re.sub(r'\*\*(.*?)\*\*', r'\1', clean_item)
                if clean_item and len(clean_item) > 10:  # Filter out very short items
                    items.append(clean_item)

        # If no items found through subsection/bullet approach, try new H3 header format
        if not items:
            # Look for the main section first - capture everything until next ## section
            main_section_pattern = rf"##\s+{re.escape(section_header)}[^\n]*\n(.*?)(?=\n## [A-Z]|\Z)"
            main_match = re.search(main_section_pattern, content, re.DOTALL | re.IGNORECASE)
            if main_match:
                main_section_content = main_match.group(1)
                # Extract H3 headers and their content - handle both single ### and ### ### patterns
                h3_pattern = r'###\s+###\s+([^\n]+)\n(.*?)(?=\n###\s+###|\n###(?!\s+###)|\n##|\Z)'
                h3_matches = re.findall(h3_pattern, main_section_content, re.DOTALL)
                for title, description in h3_matches:
                    # Combine title and description into a single item
                    # Clean up the description
                    clean_desc = re.sub(r'\n+', ' ', description).strip()
                    # Remove markdown formatting but keep source citations
                    clean_desc = re.sub(r'\*\*(.*?)\*\*', r'\1', clean_desc)
                    # Combine title and description
                    combined_item = f"{title.strip()}: {clean_desc}" if clean_desc else title.strip()
                    if combined_item and len(combined_item) > 10:
                        items.append(combined_item)

        return items

    def extract_quotes(content: str) -> List[Dict[str, str]]:
        """Extract memorable quotes from content.

        Args:
            content: The markdown content to search

        Returns:
            List of quote dictionaries with 'text' and 'speaker' keys
        """
        quotes = []

        # Look for quotes in the format: > "text" \n > — speaker
        quote_pattern = r'>\s*\*\*Quote that stands out:\*\*\s*"([^"]+)"\s*—\s*([^.\n]+)'
        matches = re.findall(quote_pattern, content, re.MULTILINE)
        for quote_text, speaker in matches:
            quotes.append({
                'text': quote_text.strip(),
                'speaker': speaker.strip()
            })

        # Also look for simple quotes in memorable exchanges
        simple_quote_pattern = r'>\s*"([^"]+)"\s*\n>\s*—\s*([^.\n]+)'
        matches2 = re.findall(simple_quote_pattern, content, re.MULTILINE)
        for quote_text, speaker in matches2:
            quotes.append({
                'text': quote_text.strip(),
                'speaker': speaker.strip()
            })
        return quotes

    def extract_recurring_themes(content: str) -> List[Dict[str, str]]:
        """Extract recurring themes with their descriptions.

        Args:
            content: The markdown content to search

        Returns:
            List of theme dictionaries with 'title' and 'description' keys
        """
        themes = []

        # Look for "Recurring Theme Noticed" sections
        theme_pattern = r'### Recurring Theme Noticed:?([^\n]*)\n(.*?)(?=###|##|#|$)'
        matches = re.findall(theme_pattern, content, re.DOTALL)
        for title, description in matches:
            clean_desc = re.sub(r'>\s*\*\*Quote.*?\*\*.*', '', description, flags=re.DOTALL).strip()
            themes.append({
                'title': title.strip(),
                'description': clean_desc[:500] + '...' if len(clean_desc) > 500 else clean_desc
            })
        return themes

    def extract_top_highlights(content: str) -> List[str]:
        """Extract top highlights from the daily narrative section.

        Args:
            content: The markdown content to search

        Returns:
            List of highlight strings
        """
        highlights = []

        # Look for "Top Highlights" section in the Daily Narrative
        highlight_pattern = r'\*\*Top Highlights\*\*(.*?)(?=\n## [A-Z]|\Z)'
        match = re.search(highlight_pattern, content, re.DOTALL)
        if match:
            highlights_content = match.group(1)
            # Extract bullet points
            bullet_items = re.findall(r'^\s*\*\s+(.+?)(?=\n\s*\*|\n\s*$)', highlights_content, re.MULTILINE | re.DOTALL)
            for item in bullet_items:
                # Clean up the item text
                clean_item = re.sub(r'\n+', ' ', item).strip()
                # Remove markdown formatting but keep emojis
                clean_item = re.sub(r'\*\*(.*?)\*\*', r'\1', clean_item)
                if clean_item and len(clean_item) > 10:
                    highlights.append(clean_item)
        return highlights

    # Extract different types of data - try multiple header variations
    action_items = []
    # Try "Key Follow-Ups" first, then "Commitment Tracker" for action items
    action_items.extend(extract_section_items(content, "Key Follow-Ups", "For You to Action"))
    if not action_items:  # If no items found, try Commitment Tracker
        action_items.extend(extract_section_items(content, "Commitment Tracker", "Promises from You"))
    
    # Also extract triple-hash action items from Key Follow-Ups section (newer format: ### ### Item Name)
    # This handles the Sep 19th format where Key Follow-Ups has triple-hash items directly
    triple_hash_pattern = r'^### ### (.+?)\n(.*?)(?=\n### ###|\n## |\n### [^#]|\Z)'
    if "Key Follow-Ups" in content and not action_items:  # Only if we haven't found action items yet
        followup_section_match = re.search(r'## Key Follow-Ups.*?(?=\n## |\Z)', content, re.DOTALL)
        if followup_section_match:
            followup_content = followup_section_match.group(0)
            # Check if this section has subsections (like "### For You to Action") or direct triple-hash items
            has_subsections = re.search(r'\n### [^#]', followup_content)
            
            if has_subsections:
                # Format with subsections - only get items before subsections to avoid duplicates
                before_subsections = re.split(r'\n### [^#]', followup_content)[0]
                triple_hash_matches = re.findall(triple_hash_pattern, before_subsections, re.MULTILINE | re.DOTALL)
            else:
                # Format without subsections (Sep 19th style) - get all triple-hash items in the section
                triple_hash_matches = re.findall(triple_hash_pattern, followup_content, re.MULTILINE | re.DOTALL)
            
            for title, description in triple_hash_matches:
                # Combine title and first line of description for action item
                desc_first_line = description.strip().split('\n')[0] if description.strip() else ""
                if desc_first_line:
                    action_items.append(f"{title.strip()}: {desc_first_line.strip()}")
                else:
                    action_items.append(title.strip())

    decisions = extract_section_items(content, "Decision Log", "Decisions Made")
    # Also extract triple-hash decisions (newer format) - only if no standard decisions found
    if "Decision Log" in content and not decisions:
        decision_section_match = re.search(r'## Decision Log.*?(?=\n## |\Z)', content, re.DOTALL)
        if decision_section_match:
            decision_content = decision_section_match.group(0)
            # Check if this section has subsections or direct triple-hash items
            has_subsections = re.search(r'\n### [^#]', decision_content)
            
            if has_subsections:
                # Format with subsections - only get items before subsections
                before_subsections = re.split(r'\n### [^#]', decision_content)[0]
                triple_decisions = re.findall(triple_hash_pattern, before_subsections, re.MULTILINE | re.DOTALL)
            else:
                # Format without subsections (Sep 19th style) - get all triple-hash items
                triple_decisions = re.findall(triple_hash_pattern, decision_content, re.MULTILINE | re.DOTALL)
            
            for title, description in triple_decisions:
                desc_first_line = description.strip().split('\n')[0] if description.strip() else ""
                if desc_first_line:
                    decisions.append(f"{title.strip()}: {desc_first_line.strip()}")
                else:
                    decisions.append(title.strip())

    ideas = extract_section_items(content, "Idea Sandbox", "Seeds of an Idea")
    # Also extract triple-hash ideas (newer format) - only if no standard ideas found
    if "Idea Sandbox" in content and not ideas:
        idea_section_match = re.search(r'## Idea Sandbox.*?(?=\n## |\Z)', content, re.DOTALL)
        if idea_section_match:
            idea_content = idea_section_match.group(0)
            # Check if this section has subsections or direct triple-hash items
            has_subsections = re.search(r'\n### [^#]', idea_content)
            
            if has_subsections:
                # Format with subsections - only get items before subsections
                before_subsections = re.split(r'\n### [^#]', idea_content)[0]
                triple_ideas = re.findall(triple_hash_pattern, before_subsections, re.MULTILINE | re.DOTALL)
            else:
                # Format without subsections (Sep 19th style) - get all triple-hash items
                triple_ideas = re.findall(triple_hash_pattern, idea_content, re.MULTILINE | re.DOTALL)
            
            for title, description in triple_ideas:
                desc_first_line = description.strip().split('\n')[0] if description.strip() else ""
                if desc_first_line:
                    ideas.append(f"{title.strip()}: {desc_first_line.strip()}")
                else:
                    ideas.append(title.strip())
    unresolved_questions = extract_section_items(content, "Key Follow-Ups", "Unresolved Questions")

    top_highlights = extract_top_highlights(content)
    quotes = extract_quotes(content)
    themes = extract_recurring_themes(content)

    return {
        'action_items': action_items,
        'decisions': decisions,
        'ideas': ideas,
        'unresolved_questions': unresolved_questions,
        'quotes': quotes,
        'recurring_themes': themes,
        'top_highlights': top_highlights
    }