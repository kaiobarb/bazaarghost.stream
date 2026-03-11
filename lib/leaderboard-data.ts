// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single entry on the Bazaar leaderboard. */
export interface LeaderboardEntry {
  AccountId: string;
  Username: string;
  Position: number;
  Rating: number;
}

/** Season metadata from the Bazaar API. */
export interface Season {
  id: number;
  name: string;
  title: string;
  start: string;
}

/** All leaderboard data keyed by season ID. */
export type LeaderboardBySeason = Record<number, LeaderboardEntry[]>;

/** Shape of the `/api/Leaderboards` response. */
interface LeaderboardResponse {
  seasonId: number;
  totalEntries: number;
  entries: LeaderboardEntry[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BAZAAR_API_BASE = "https://www.playthebazaar.com/api";

const BAZAAR_HEADERS: HeadersInit = {
  "x-clientflavor": "Web",
  "x-platform": "Tempo",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build request headers including the bearer token.
 * Throws at build/request time if the env var is missing.
 */
function authedHeaders(): HeadersInit {
  const token = process.env.BAZAAR_API_TOKEN;
  if (!token) {
    console.warn("BAZAAR_API_TOKEN environment variable is not set");
    return BAZAAR_HEADERS;
  }
  return { ...BAZAAR_HEADERS, authorization: `Bearer ${token}` };
}

// ---------------------------------------------------------------------------
// Data fetchers (server-only)
// ---------------------------------------------------------------------------

/**
 * Fetch all seasons from the Bazaar API.
 *
 * Filters out seasons with a start date in the far future (placeholder
 * seasons) and sorts descending by id so the most recent season is first.
 */
export async function fetchSeasons(): Promise<Season[]> {
  const res = await fetch(`${BAZAAR_API_BASE}/Seasons`, {
    headers: authedHeaders(),
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    console.error(`Bazaar Seasons API returned ${res.status}`);
    return [];
  }

  const raw: Season[] = await res.json();

  // Filter out placeholder seasons (start date > 1 year from now)
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() + 1);

  return raw
    .filter((s) => new Date(s.start) < cutoff)
    .sort((a, b) => b.id - a.id);
}

/**
 * Fetch leaderboard entries for a specific season.
 *
 * @param seasonId - The numeric season ID from the Bazaar API.
 * @returns The entries array, or an empty array on failure.
 */
export async function fetchLeaderboard(
  seasonId: number
): Promise<LeaderboardEntry[]> {
  // Opt out of Next.js fetch cache — leaderboard responses can exceed
  // the 2 MB data-cache limit. Page-level ISR handles revalidation.
  const res = await fetch(
    `${BAZAAR_API_BASE}/Leaderboards?seasonId=${seasonId}`,
    {
      headers: authedHeaders(),
      cache: "no-store",
    }
  );

  if (!res.ok) {
    console.error(
      `Bazaar Leaderboards API returned ${res.status} for season ${seasonId}`
    );
    return [];
  }

  const data: LeaderboardResponse = await res.json();
  return data.entries;
}

/**
 * Fetch leaderboard data for all seasons in parallel.
 *
 * @param seasons - The season list (as returned by {@link fetchSeasons}).
 * @returns A record mapping each season ID to its entries.
 */
export async function fetchAllLeaderboards(
  seasons: Season[]
): Promise<LeaderboardBySeason> {
  const results = await Promise.all(
    seasons.map(async (s) => ({
      id: s.id,
      entries: await fetchLeaderboard(s.id),
    }))
  );

  const bySeason: LeaderboardBySeason = {};
  for (const { id, entries } of results) {
    bySeason[id] = entries;
  }
  return bySeason;
}
