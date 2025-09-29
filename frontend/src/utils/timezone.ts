/**
 * Timezone utilities for converting UTC timestamps to user's preferred timezone
 * 
 * This module provides consistent timezone handling across the entire frontend.
 * All timestamps from the backend are stored in UTC and converted to the user's
 * preferred timezone for display.
 * 
 * User timezone preference is stored in localStorage with Pacific as default.
 */

// Default timezone preference
const DEFAULT_TIMEZONE = 'America/Los_Angeles'; // Pacific Time
const TIMEZONE_STORAGE_KEY = 'limitless_user_timezone';

/**
 * Get the user's preferred timezone from localStorage or default to Pacific
 * @returns IANA timezone identifier
 */
export function getUserPreferredTimezone(): string {
  try {
    const storedTimezone = localStorage.getItem(TIMEZONE_STORAGE_KEY);
    if (storedTimezone) {
      return storedTimezone;
    }
    // Auto-set Pacific timezone as default on first use
    localStorage.setItem(TIMEZONE_STORAGE_KEY, DEFAULT_TIMEZONE);
    return DEFAULT_TIMEZONE;
  } catch (error) {
    console.warn('Could not access localStorage, using default timezone');
    return DEFAULT_TIMEZONE;
  }
}

/**
 * Set the user's preferred timezone in localStorage
 * @param timezone - IANA timezone identifier (e.g., 'America/Los_Angeles')
 */
export function setUserPreferredTimezone(timezone: string): void {
  try {
    localStorage.setItem(TIMEZONE_STORAGE_KEY, timezone);
  } catch (error) {
    console.warn('Could not save timezone preference to localStorage');
  }
}

/**
 * Convert a UTC timestamp to the user's preferred timezone
 * @param utcTimestamp - ISO 8601 UTC timestamp string (e.g., "2025-09-22T06:39:12+00:00")
 * @param options - Intl.DateTimeFormat options for formatting
 * @returns Formatted string in user's preferred timezone
 */
export function formatToLocalTime(
  utcTimestamp: string | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }
): string {
  if (!utcTimestamp) return '';
  
  try {
    
    // Handle timestamps that don't have timezone info (assume UTC)
    let date: Date;
    
    // Check for actual timezone indicators (not date separators)
    const hasTimezoneInfo = utcTimestamp.includes('Z') || 
                           /[+-]\d{2}:?\d{2}$/.test(utcTimestamp); // Regex for +XX:XX or -XX:XX at end
    
    if (!hasTimezoneInfo) {
      // Parse as UTC explicitly using Date.UTC
      
      // Parse the ISO string manually to ensure UTC interpretation
      const match = utcTimestamp.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{3}))?$/);
      if (match) {
        const [, year, month, day, hour, minute, second, ms] = match;
        date = new Date(Date.UTC(
          parseInt(year), 
          parseInt(month) - 1, // Month is 0-indexed
          parseInt(day), 
          parseInt(hour), 
          parseInt(minute), 
          parseInt(second),
          parseInt(ms || '0')
        ));
      } else {
        // Fallback: add Z and hope for the best
        date = new Date(utcTimestamp + 'Z');
      }
    } else {
      // Has timezone info, use directly
      date = new Date(utcTimestamp);
    }
    
    
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      console.warn('❌ Invalid timestamp:', utcTimestamp);
      return utcTimestamp;
    }
    
    // Get user's preferred timezone
    const userTimezone = getUserPreferredTimezone();
    
    // Format using user's preferred timezone
    const result = new Intl.DateTimeFormat('en-US', {
      ...options,
      timeZone: userTimezone
    }).format(date);
    
    
    return result;
  } catch (error) {
    console.warn('❌ Error formatting timestamp:', utcTimestamp, error);
    return utcTimestamp;
  }
}

/**
 * Convert a UTC timestamp to the user's local date
 * @param utcTimestamp - ISO 8601 UTC timestamp string
 * @returns Date string in user's preferred timezone (YYYY-MM-DD format)
 */
export function formatToLocalDate(utcTimestamp: string | null | undefined): string {
  if (!utcTimestamp) return '';
  
  try {
    const date = new Date(utcTimestamp);
    
    if (isNaN(date.getTime())) {
      console.warn('Invalid timestamp:', utcTimestamp);
      return utcTimestamp;
    }
    
    // Get user's preferred timezone
    const userTimezone = getUserPreferredTimezone();
    
    // Format to YYYY-MM-DD in user's preferred timezone
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: userTimezone
    }).format(date); // en-CA gives YYYY-MM-DD format
  } catch (error) {
    console.warn('Error formatting date:', utcTimestamp, error);
    return utcTimestamp;
  }
}

/**
 * Convert a UTC timestamp to full date and time in user's preferred timezone
 * @param utcTimestamp - ISO 8601 UTC timestamp string
 * @returns Formatted date and time string
 */
export function formatToLocalDateTime(
  utcTimestamp: string | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }
): string {
  return formatToLocalTime(utcTimestamp, options);
}

/**
 * Get relative time string (e.g., "5m ago", "2h ago")
 * @param utcTimestamp - ISO 8601 UTC timestamp string
 * @returns Relative time string
 */
export function formatRelativeTime(utcTimestamp: string | null | undefined): string {
  if (!utcTimestamp) return '';
  
  try {
    const date = new Date(utcTimestamp);
    const now = new Date();
    
    if (isNaN(date.getTime())) {
      console.warn('Invalid timestamp:', utcTimestamp);
      return utcTimestamp;
    }
    
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    // For older timestamps, show the actual date
    return formatToLocalDateTime(utcTimestamp, {
      month: 'short',
      day: 'numeric',
      year: diffDays > 365 ? 'numeric' : undefined
    });
  } catch (error) {
    console.warn('Error formatting relative time:', utcTimestamp, error);
    return utcTimestamp;
  }
}

/**
 * Get the browser's detected timezone (e.g., "America/Los_Angeles")
 * This is different from getUserPreferredTimezone() which uses localStorage
 * @returns IANA timezone identifier
 */
export function getBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (error) {
    console.warn('Could not detect browser timezone, defaulting to UTC');
    return 'UTC';
  }
}

/**
 * Format a date for display purposes (e.g., for date headers)
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns Formatted date string
 */
export function formatDisplayDate(dateString: string): string {
  if (!dateString) return '';
  
  try {
    // Parse the date string as local date (not UTC)
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    
    if (isNaN(date.getTime())) {
      console.warn('Invalid date string:', dateString);
      return dateString;
    }
    
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    
    // Check if it's today or yesterday
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    
    // Format as readable date
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
    }).format(date);
  } catch (error) {
    console.warn('Error formatting display date:', dateString, error);
    return dateString;
  }
}
