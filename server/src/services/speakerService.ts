import { eq, and, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { speakerProfiles, lifelogs } from '../db/schema.js';

export interface SpeakerProfile {
  id: number;
  userId: number;
  speakerName: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  description?: string | null;
  colorHex: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSpeakerProfileData {
  speakerName: string;
  displayName?: string;
  avatarUrl?: string;
  description?: string;
  colorHex?: string;
  isActive?: boolean;
}

export interface UpdateSpeakerProfileData {
  displayName?: string;
  avatarUrl?: string;
  description?: string;
  colorHex?: string;
  isActive?: boolean;
}

// Default colors for auto-generated speaker profiles
const DEFAULT_COLORS = [
  '#10b981', // Green (for You)
  '#f59e0b', // Orange
  '#8b5cf6', // Purple
  '#ef4444', // Red
  '#06b6d4', // Cyan
  '#84cc16', // Lime
  '#f97316', // Orange
  '#ec4899', // Pink
  '#6366f1', // Indigo
  '#14b8a6', // Teal
];

export async function getSpeakerProfiles(userId: number): Promise<SpeakerProfile[]> {
  const profiles = await db
    .select()
    .from(speakerProfiles)
    .where(eq(speakerProfiles.userId, userId))
    .orderBy(speakerProfiles.speakerName);
  
  return profiles;
}

export async function getSpeakerProfile(userId: number, speakerName: string): Promise<SpeakerProfile | null> {
  const profiles = await db
    .select()
    .from(speakerProfiles)
    .where(
      and(
        eq(speakerProfiles.userId, userId),
        eq(speakerProfiles.speakerName, speakerName)
      )
    )
    .limit(1);
  
  return profiles[0] ?? null;
}

export async function createSpeakerProfile(
  userId: number,
  data: CreateSpeakerProfileData
): Promise<SpeakerProfile> {
  // Generate a default color if not provided
  let colorHex = data.colorHex;
  if (!colorHex) {
    const existingProfiles = await getSpeakerProfiles(userId);
    const colorIndex = existingProfiles.length % DEFAULT_COLORS.length;
    colorHex = DEFAULT_COLORS[colorIndex];
  }

  const insertData = {
    userId,
    speakerName: data.speakerName,
    displayName: data.displayName || null,
    avatarUrl: data.avatarUrl || null,
    description: data.description || null,
    colorHex: colorHex!,
    isActive: data.isActive ?? true,
  };

  const inserted = await db
    .insert(speakerProfiles)
    .values(insertData)
    .returning();

  return inserted[0];
}

export async function updateSpeakerProfile(
  userId: number,
  speakerName: string,
  data: UpdateSpeakerProfileData
): Promise<SpeakerProfile | null> {
  const updateData: any = {
    updatedAt: sql`datetime('now')`,
  };

  if (data.displayName !== undefined) updateData.displayName = data.displayName;
  if (data.avatarUrl !== undefined) updateData.avatarUrl = data.avatarUrl;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.colorHex !== undefined) updateData.colorHex = data.colorHex;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  const updated = await db
    .update(speakerProfiles)
    .set(updateData)
    .where(
      and(
        eq(speakerProfiles.userId, userId),
        eq(speakerProfiles.speakerName, speakerName)
      )
    )
    .returning();

  return updated[0] ?? null;
}

export async function deleteSpeakerProfile(userId: number, speakerName: string): Promise<boolean> {
  const result = await db
    .delete(speakerProfiles)
    .where(
      and(
        eq(speakerProfiles.userId, userId),
        eq(speakerProfiles.speakerName, speakerName)
      )
    );

  return result.changes > 0;
}

export async function getOrCreateSpeakerProfile(
  userId: number,
  speakerName: string
): Promise<SpeakerProfile> {
  // Try to get existing profile
  let profile = await getSpeakerProfile(userId, speakerName);
  
  if (!profile) {
    // Create new profile with defaults
    profile = await createSpeakerProfile(userId, {
      speakerName,
      displayName: speakerName === 'You' ? 'You' : speakerName,
    });
  }
  
  return profile;
}

export async function autoDiscoverSpeakers(userId: number): Promise<{
  discovered: string[];
  created: SpeakerProfile[];
}> {
  // For now, let's implement a simpler version that parses markdown content
  // In a future iteration, we can make this more sophisticated
  
  const recentLifelogs = await db
    .select({ markdownContent: lifelogs.markdownContent })
    .from(lifelogs)
    .where(eq(lifelogs.userId, userId))
    .limit(100);

  const speakerNames = new Set<string>();
  
  // Parse markdown content to extract speaker names
  for (const lifelog of recentLifelogs) {
    if (!lifelog.markdownContent) continue;
    
    // Look for patterns like "- SpeakerName (timestamp): message"
    const speakerMatches = lifelog.markdownContent.match(/^- ([^(]+) \(/gm);
    if (speakerMatches) {
      for (const match of speakerMatches) {
        const speakerName = match.replace(/^- /, '').replace(/ \($/, '').trim();
        if (speakerName && speakerName.length > 0) {
          speakerNames.add(speakerName);
        }
      }
    }
  }

  const discoveredSpeakers = Array.from(speakerNames);
  const created: SpeakerProfile[] = [];
  
  for (const speakerName of discoveredSpeakers) {
    const existing = await getSpeakerProfile(userId, speakerName);
    if (!existing) {
      const profile = await createSpeakerProfile(userId, { speakerName });
      created.push(profile);
    }
  }

  return {
    discovered: discoveredSpeakers,
    created
  };
}

// Helper function to get speaker profiles as a map for quick lookup
export async function getSpeakerProfilesMap(userId: number): Promise<Map<string, SpeakerProfile>> {
  const profiles = await getSpeakerProfiles(userId);
  const map = new Map<string, SpeakerProfile>();
  
  for (const profile of profiles) {
    map.set(profile.speakerName, profile);
  }
  
  return map;
}
