import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

// Get environment variables with validation
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Create a single supabase client for interacting with your database
// The anon key is safe to use in a browser context with RLS enabled
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false, // No auth needed for public search
  }
})

// Helper types for easier usage
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type Enums<T extends keyof Database['public']['Enums']> =
  Database['public']['Enums'][T]

// Specific types for search functionality
export type Detection = Tables<'detections'>
export type VOD = Tables<'vods'>
export type Streamer = Tables<'streamers'>

// Type for the detection_search view
export interface DetectionSearchView {
  detection_id: string
  username: string
  frame_time_seconds: number
  confidence: number | null
  rank: string | null
  storage_path: string | null
  no_right_edge: boolean | null
  detection_created_at: string
  vod_id: number
  vod_source_id: string
  vod_title: string | null
  vod_published_at: string | null
  vod_duration_seconds: number | null
  vod_availability: string
  actual_timestamp: string
  streamer_id: number
  streamer_login: string
  streamer_display_name: string | null
  streamer_avatar: string | null
  vod_url: string | null
}

// Legacy type for backward compatibility (if needed)
export interface SearchResultData {
  id: string
  username: string
  frame_time_seconds: number
  confidence: number | null
  rank: string | null
  vods: {
    source_id: string
    published_at: string | null
    title: string | null
    streamers: {
      login: string
      display_name: string | null
      profile_image_url: string | null
    } | null
  } | null
}