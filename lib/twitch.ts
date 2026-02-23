// Server-only Twitch Helix API utilities

const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID!;
const TWITCH_ACCESS_TOKEN = process.env.TWITCH_ACCESS_TOKEN!;

const HELIX_BASE = "https://api.twitch.tv/helix";

function helixHeaders() {
  return {
    "Client-Id": TWITCH_CLIENT_ID,
    Authorization: `Bearer ${TWITCH_ACCESS_TOKEN}`,
  };
}

// --- Types ---

export interface TwitchUser {
  id: string;
  login: string;
  display_name: string;
  profile_image_url: string;
}

export interface TwitchVod {
  id: string;
  user_id: string;
  user_login: string;
  user_name: string;
  title: string;
  description: string;
  created_at: string;
  published_at: string;
  url: string;
  thumbnail_url: string;
  viewable: string;
  view_count: number;
  language: string;
  type: string;
  duration: string; // e.g. "3h21m10s"
  stream_id: string | null;
}

interface HelixResponse<T> {
  data: T[];
  pagination?: { cursor?: string };
}

// --- API functions ---

/**
 * Resolve a Twitch login name to a user object (includes numeric user_id).
 */
export async function getTwitchUser(login: string): Promise<TwitchUser | null> {
  const res = await fetch(
    `${HELIX_BASE}/users?login=${encodeURIComponent(login)}`,
    { headers: helixHeaders(), next: { revalidate: 36000 } }
  );

  if (!res.ok) {
    console.error("Twitch users API error:", res.status, await res.text());
    return null;
  }

  const json: HelixResponse<TwitchUser> = await res.json();
  return json.data[0] ?? null;
}

/**
 * Fetch VODs (past broadcasts / archives) for a Twitch user.
 * Returns up to 100 most recent VODs.
 */
export async function getTwitchVods(userId: string): Promise<TwitchVod[]> {
  const params = new URLSearchParams({
    user_id: userId,
    type: "archive",
    first: "100",
  });

  const res = await fetch(`${HELIX_BASE}/videos?${params}`, {
    headers: helixHeaders(),
    next: { revalidate: 36000 }, // revalidate every 10 hours
  });

  if (!res.ok) {
    console.error("Twitch videos API error:", res.status, await res.text());
    return [];
  }

  const json: HelixResponse<TwitchVod> = await res.json();
  return json.data;
}

/**
 * Check if a user is currently live and return their stream ID.
 * Returns null if offline. Uses a short revalidation (60s) since live status is time-sensitive.
 */
export async function getLiveStreamId(userId: string): Promise<string | null> {
  const res = await fetch(
    `${HELIX_BASE}/streams?user_id=${encodeURIComponent(userId)}`,
    { headers: helixHeaders(), next: { revalidate: 60 } }
  );

  if (!res.ok) return null;

  const json: HelixResponse<{ id: string }> = await res.json();
  return json.data[0]?.id ?? null;
}

/**
 * Parse a Twitch duration string like "3h21m10s" into total seconds.
 */
export function parseTwitchDuration(duration: string): number {
  let total = 0;
  const hours = duration.match(/(\d+)h/);
  const minutes = duration.match(/(\d+)m/);
  const seconds = duration.match(/(\d+)s/);
  if (hours) total += parseInt(hours[1], 10) * 3600;
  if (minutes) total += parseInt(minutes[1], 10) * 60;
  if (seconds) total += parseInt(seconds[1], 10);
  return total;
}
