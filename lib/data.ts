export interface Streamer {
  id: string
  name: string
  avatar: string
  twitchChannel: string
}

export interface VOD {
  id: string
  streamerId: string
  twitchVideoId: string
  title: string
  date: string
  game: string
}

export interface Ghost {
  id: string
  vodId: string
  streamerId: string
  username: string
  timestamp: string
  date: string
}

// Mock data

export const streamers: Streamer[] = [
  {
    id: "s1",
    name: "xQc",
    avatar: "/placeholder.svg?height=40&width=40",
    twitchChannel: "xqc",
  },
  {
    id: "s2",
    name: "Shroud",
    avatar: "/placeholder.svg?height=40&width=40",
    twitchChannel: "shroud",
  },
  {
    id: "s3",
    name: "Ninja",
    avatar: "/placeholder.svg?height=40&width=40",
    twitchChannel: "ninja",
  },
]

export const vods: VOD[] = [
  {
    id: "v1",
    streamerId: "s1",
    twitchVideoId: "2345678901",
    title: "Late Night Bazaar Grind",
    date: "2024-01-15",
    game: "The Bazaar",
  },
  {
    id: "v2",
    streamerId: "s1",
    twitchVideoId: "2345678902",
    title: "Ranked Climb Day 5",
    date: "2024-01-10",
    game: "The Bazaar",
  },
  {
    id: "v3",
    streamerId: "s2",
    twitchVideoId: "2345678903",
    title: "First Time Bazaar",
    date: "2024-01-12",
    game: "The Bazaar",
  },
  {
    id: "v4",
    streamerId: "s2",
    twitchVideoId: "2345678904",
    title: "Bazaar Ranked Tryhard",
    date: "2024-01-08",
    game: "The Bazaar",
  },
  {
    id: "v5",
    streamerId: "s3",
    twitchVideoId: "2345678905",
    title: "Bazaar with Viewers",
    date: "2024-01-05",
    game: "The Bazaar",
  },
]

export const ghosts: Ghost[] = [
  {
    id: "g1",
    vodId: "v1",
    streamerId: "s1",
    username: "player123",
    timestamp: "1h23m45s",
    date: "2024-01-15",
  },
  {
    id: "g2",
    vodId: "v1",
    streamerId: "s1",
    username: "shadowfox",
    timestamp: "2h05m10s",
    date: "2024-01-15",
  },
  {
    id: "g3",
    vodId: "v2",
    streamerId: "s1",
    username: "player123",
    timestamp: "0h45m30s",
    date: "2024-01-10",
  },
  {
    id: "g4",
    vodId: "v3",
    streamerId: "s2",
    username: "stormrider",
    timestamp: "1h10m00s",
    date: "2024-01-12",
  },
  {
    id: "g5",
    vodId: "v3",
    streamerId: "s2",
    username: "player123",
    timestamp: "2h30m15s",
    date: "2024-01-12",
  },
  {
    id: "g6",
    vodId: "v4",
    streamerId: "s2",
    username: "nightowl",
    timestamp: "0h55m20s",
    date: "2024-01-08",
  },
  {
    id: "g7",
    vodId: "v5",
    streamerId: "s3",
    username: "player123",
    timestamp: "1h40m00s",
    date: "2024-01-05",
  },
  {
    id: "g8",
    vodId: "v5",
    streamerId: "s3",
    username: "blazeking",
    timestamp: "3h12m45s",
    date: "2024-01-05",
  },
]

// Helper lookups

export function getStreamer(id: string): Streamer | undefined {
  return streamers.find((s) => s.id === id)
}

export function getVod(id: string): VOD | undefined {
  return vods.find((v) => v.id === id)
}

export function getVodsForStreamer(streamerId: string): VOD[] {
  return vods.filter((v) => v.streamerId === streamerId)
}

export function getGhostsForVod(vodId: string): Ghost[] {
  return ghosts.filter((g) => g.vodId === vodId)
}

export function getGhostsForStreamer(streamerId: string): Ghost[] {
  return ghosts.filter((g) => g.streamerId === streamerId)
}
