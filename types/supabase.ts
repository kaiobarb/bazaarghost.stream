export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      cataloger_runs: {
        Row: {
          chunks_created: number | null
          completed_at: string | null
          errors: Json | null
          id: string
          metadata: Json | null
          run_type: string | null
          started_at: string | null
          status: string | null
          streamers_discovered: number | null
          streamers_updated: number | null
          vods_discovered: number | null
        }
        Insert: {
          chunks_created?: number | null
          completed_at?: string | null
          errors?: Json | null
          id?: string
          metadata?: Json | null
          run_type?: string | null
          started_at?: string | null
          status?: string | null
          streamers_discovered?: number | null
          streamers_updated?: number | null
          vods_discovered?: number | null
        }
        Update: {
          chunks_created?: number | null
          completed_at?: string | null
          errors?: Json | null
          id?: string
          metadata?: Json | null
          run_type?: string | null
          started_at?: string | null
          status?: string | null
          streamers_discovered?: number | null
          streamers_updated?: number | null
          vods_discovered?: number | null
        }
        Relationships: []
      }
      chunks: {
        Row: {
          attempt_count: number | null
          chunk_index: number
          completed_at: string | null
          created_at: string | null
          detections_count: number | null
          end_seconds: number
          frames_processed: number | null
          id: string
          last_error: string | null
          lease_expires_at: string | null
          priority: number | null
          processing_duration_ms: number | null
          quality: string | null
          queued_at: string | null
          scheduled_for: string | null
          source: Database["public"]["Enums"]["chunk_source"] | null
          start_seconds: number
          started_at: string | null
          status: Database["public"]["Enums"]["processing_status"] | null
          updated_at: string | null
          vod_id: number | null
        }
        Insert: {
          attempt_count?: number | null
          chunk_index: number
          completed_at?: string | null
          created_at?: string | null
          detections_count?: number | null
          end_seconds: number
          frames_processed?: number | null
          id?: string
          last_error?: string | null
          lease_expires_at?: string | null
          priority?: number | null
          processing_duration_ms?: number | null
          quality?: string | null
          queued_at?: string | null
          scheduled_for?: string | null
          source?: Database["public"]["Enums"]["chunk_source"] | null
          start_seconds: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["processing_status"] | null
          updated_at?: string | null
          vod_id?: number | null
        }
        Update: {
          attempt_count?: number | null
          chunk_index?: number
          completed_at?: string | null
          created_at?: string | null
          detections_count?: number | null
          end_seconds?: number
          frames_processed?: number | null
          id?: string
          last_error?: string | null
          lease_expires_at?: string | null
          priority?: number | null
          processing_duration_ms?: number | null
          quality?: string | null
          queued_at?: string | null
          scheduled_for?: string | null
          source?: Database["public"]["Enums"]["chunk_source"] | null
          start_seconds?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["processing_status"] | null
          updated_at?: string | null
          vod_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "chunks_vod_id_fkey"
            columns: ["vod_id"]
            isOneToOne: false
            referencedRelation: "detection_search"
            referencedColumns: ["vod_id"]
          },
          {
            foreignKeyName: "chunks_vod_id_fkey"
            columns: ["vod_id"]
            isOneToOne: false
            referencedRelation: "detection_search_debug"
            referencedColumns: ["vod_id"]
          },
          {
            foreignKeyName: "chunks_vod_id_fkey"
            columns: ["vod_id"]
            isOneToOne: false
            referencedRelation: "vod_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chunks_vod_id_fkey"
            columns: ["vod_id"]
            isOneToOne: false
            referencedRelation: "vods"
            referencedColumns: ["id"]
          },
        ]
      }
      detections: {
        Row: {
          chunk_id: string | null
          confidence: number | null
          created_at: string | null
          frame_time_seconds: number
          id: string
          no_right_edge: boolean | null
          rank: string | null
          storage_path: string | null
          truncated: boolean | null
          username: string
          vod_id: number | null
        }
        Insert: {
          chunk_id?: string | null
          confidence?: number | null
          created_at?: string | null
          frame_time_seconds: number
          id?: string
          no_right_edge?: boolean | null
          rank?: string | null
          storage_path?: string | null
          truncated?: boolean | null
          username: string
          vod_id?: number | null
        }
        Update: {
          chunk_id?: string | null
          confidence?: number | null
          created_at?: string | null
          frame_time_seconds?: number
          id?: string
          no_right_edge?: boolean | null
          rank?: string | null
          storage_path?: string | null
          truncated?: boolean | null
          username?: string
          vod_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "detections_chunk_id_fkey"
            columns: ["chunk_id"]
            isOneToOne: false
            referencedRelation: "chunks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "detections_vod_id_fkey"
            columns: ["vod_id"]
            isOneToOne: false
            referencedRelation: "detection_search"
            referencedColumns: ["vod_id"]
          },
          {
            foreignKeyName: "detections_vod_id_fkey"
            columns: ["vod_id"]
            isOneToOne: false
            referencedRelation: "detection_search_debug"
            referencedColumns: ["vod_id"]
          },
          {
            foreignKeyName: "detections_vod_id_fkey"
            columns: ["vod_id"]
            isOneToOne: false
            referencedRelation: "vod_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "detections_vod_id_fkey"
            columns: ["vod_id"]
            isOneToOne: false
            referencedRelation: "vods"
            referencedColumns: ["id"]
          },
        ]
      }
      processing_config: {
        Row: {
          created_at: string | null
          description: string | null
          key: string
          updated_at: string | null
          value: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          key: string
          updated_at?: string | null
          value: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          key?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      sfot_profiles: {
        Row: {
          created_at: string | null
          crop_region: number[]
          custom_edge: number | null
          from_date: string | null
          id: number
          opaque_edge: boolean | null
          profile_name: string
          scale: number | null
          to_date: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          crop_region: number[]
          custom_edge?: number | null
          from_date?: string | null
          id?: never
          opaque_edge?: boolean | null
          profile_name: string
          scale?: number | null
          to_date?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          crop_region?: number[]
          custom_edge?: number | null
          from_date?: string | null
          id?: never
          opaque_edge?: boolean | null
          profile_name?: string
          scale?: number | null
          to_date?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      streamers: {
        Row: {
          created_at: string | null
          display_name: string | null
          has_vods: boolean | null
          id: number
          login: string
          num_bazaar_vods: number | null
          num_vods: number | null
          oldest_vod: string | null
          processing_enabled: boolean | null
          profile_image_url: string | null
          sfot_profile_id: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_name?: string | null
          has_vods?: boolean | null
          id: number
          login: string
          num_bazaar_vods?: number | null
          num_vods?: number | null
          oldest_vod?: string | null
          processing_enabled?: boolean | null
          profile_image_url?: string | null
          sfot_profile_id?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_name?: string | null
          has_vods?: boolean | null
          id?: number
          login?: string
          num_bazaar_vods?: number | null
          num_vods?: number | null
          oldest_vod?: string | null
          processing_enabled?: boolean | null
          profile_image_url?: string | null
          sfot_profile_id?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "streamers_sfot_profile_id_fkey"
            columns: ["sfot_profile_id"]
            isOneToOne: false
            referencedRelation: "sfot_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vods: {
        Row: {
          availability: Database["public"]["Enums"]["vod_availability"] | null
          bazaar_chapters: number[] | null
          created_at: string | null
          duration_seconds: number | null
          id: number
          last_availability_check: string | null
          published_at: string | null
          ready_for_processing: boolean | null
          source: string
          source_id: string
          status: Database["public"]["Enums"]["vod_status"] | null
          streamer_id: number | null
          title: string | null
          unavailable_since: string | null
          updated_at: string | null
        }
        Insert: {
          availability?: Database["public"]["Enums"]["vod_availability"] | null
          bazaar_chapters?: number[] | null
          created_at?: string | null
          duration_seconds?: number | null
          id?: never
          last_availability_check?: string | null
          published_at?: string | null
          ready_for_processing?: boolean | null
          source?: string
          source_id: string
          status?: Database["public"]["Enums"]["vod_status"] | null
          streamer_id?: number | null
          title?: string | null
          unavailable_since?: string | null
          updated_at?: string | null
        }
        Update: {
          availability?: Database["public"]["Enums"]["vod_availability"] | null
          bazaar_chapters?: number[] | null
          created_at?: string | null
          duration_seconds?: number | null
          id?: never
          last_availability_check?: string | null
          published_at?: string | null
          ready_for_processing?: boolean | null
          source?: string
          source_id?: string
          status?: Database["public"]["Enums"]["vod_status"] | null
          streamer_id?: number | null
          title?: string | null
          unavailable_since?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vods_streamer_id_fkey"
            columns: ["streamer_id"]
            isOneToOne: false
            referencedRelation: "detection_search"
            referencedColumns: ["streamer_id"]
          },
          {
            foreignKeyName: "vods_streamer_id_fkey"
            columns: ["streamer_id"]
            isOneToOne: false
            referencedRelation: "detection_search_debug"
            referencedColumns: ["streamer_id"]
          },
          {
            foreignKeyName: "vods_streamer_id_fkey"
            columns: ["streamer_id"]
            isOneToOne: false
            referencedRelation: "streamer_detection_stats"
            referencedColumns: ["streamer_id"]
          },
          {
            foreignKeyName: "vods_streamer_id_fkey"
            columns: ["streamer_id"]
            isOneToOne: false
            referencedRelation: "streamers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vods_streamer_id_fkey"
            columns: ["streamer_id"]
            isOneToOne: false
            referencedRelation: "streamers_with_detections"
            referencedColumns: ["streamer_id"]
          },
        ]
      }
    }
    Views: {
      detection_search: {
        Row: {
          actual_timestamp: string | null
          confidence: number | null
          detection_created_at: string | null
          detection_id: string | null
          frame_time_seconds: number | null
          no_right_edge: boolean | null
          rank: string | null
          storage_path: string | null
          streamer_avatar: string | null
          streamer_display_name: string | null
          streamer_id: number | null
          streamer_login: string | null
          username: string | null
          vod_availability:
            | Database["public"]["Enums"]["vod_availability"]
            | null
          vod_duration_seconds: number | null
          vod_id: number | null
          vod_published_at: string | null
          vod_source_id: string | null
          vod_title: string | null
          vod_url: string | null
        }
        Relationships: []
      }
      detection_search_debug: {
        Row: {
          actual_timestamp: string | null
          confidence: number | null
          detection_created_at: string | null
          detection_id: string | null
          frame_time_seconds: number | null
          no_right_edge: boolean | null
          rank: string | null
          storage_path: string | null
          streamer_avatar: string | null
          streamer_display_name: string | null
          streamer_id: number | null
          streamer_login: string | null
          username: string | null
          vod_availability:
            | Database["public"]["Enums"]["vod_availability"]
            | null
          vod_duration_seconds: number | null
          vod_id: number | null
          vod_published_at: string | null
          vod_source_id: string | null
          vod_title: string | null
          vod_url: string | null
        }
        Relationships: []
      }
      streamer_detection_stats: {
        Row: {
          avg_confidence: number | null
          avg_detections_per_vod: number | null
          display_name: string | null
          login: string | null
          no_right_edge_detections: number | null
          streamer_id: number | null
          total_detections: number | null
          total_vods: number | null
          vods_completed: number | null
          vods_failed: number | null
          vods_partial: number | null
          vods_pending: number | null
          vods_processing: number | null
        }
        Relationships: []
      }
      streamers_with_detections: {
        Row: {
          detection_count: number | null
          latest_detection_timestamp: string | null
          processing_enabled: boolean | null
          streamer_avatar: string | null
          streamer_display_name: string | null
          streamer_id: number | null
          streamer_login: string | null
          vod_count: number | null
        }
        Relationships: []
      }
      vod_stats: {
        Row: {
          availability: Database["public"]["Enums"]["vod_availability"] | null
          avg_confidence: number | null
          bazaar_chapters: number[] | null
          chunks: number | null
          created_at: string | null
          duration_seconds: number | null
          id: number | null
          last_availability_check: string | null
          published_at: string | null
          quality: string | null
          ready_for_processing: boolean | null
          source: string | null
          source_id: string | null
          status: Database["public"]["Enums"]["vod_status"] | null
          streamer: string | null
          title: string | null
          total_detections: number | null
          unavailable_since: string | null
          updated_at: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      auto_queue_next_vod: { Args: never; Returns: undefined }
      create_bazaar_aware_chunks: {
        Args: { p_min_chunk_duration?: number; p_vod_id: number }
        Returns: number
      }
      create_missing_chunks_for_vod: {
        Args: {
          p_min_gap_seconds?: number
          p_target_chunk_seconds?: number
          p_vod_id: number
        }
        Returns: number
      }
      cron_insert_new_streamers: { Args: never; Returns: undefined }
      cron_update_streamer_vods: { Args: never; Returns: undefined }
      force_process_vod: {
        Args: {
          p_min_gap_seconds?: number
          p_source_id?: string
          p_target_chunk_seconds?: number
          p_vod_id?: number
        }
        Returns: Json
      }
      fuzzy_search_detections: {
        Args: {
          date_range_filter?: string
          result_limit?: number
          search_query?: string
          similarity_threshold?: number
          streamer_id_filter?: number
        }
        Returns: {
          actual_timestamp: string
          confidence: number
          detection_id: string
          frame_time_seconds: number
          rank: string
          similarity_score: number
          streamer_avatar: string
          streamer_display_name: string
          streamer_id: number
          streamer_login: string
          username: string
          vod_id: number
          vod_source_id: string
          vod_url: string
        }[]
      }
      fuzzy_search_detections_debug: {
        Args: {
          date_range_filter?: string
          result_limit?: number
          search_query?: string
          similarity_threshold?: number
          streamer_id_filter?: number
        }
        Returns: {
          actual_timestamp: string
          confidence: number
          detection_id: string
          frame_time_seconds: number
          rank: string
          similarity_score: number
          streamer_avatar: string
          streamer_display_name: string
          streamer_id: number
          streamer_login: string
          username: string
          vod_id: number
          vod_source_id: string
          vod_url: string
        }[]
      }
      fuzzy_search_detections_test: {
        Args: {
          date_range_filter?: string
          result_limit?: number
          result_offset?: number
          search_query?: string
          similarity_threshold?: number
          streamer_id_filter?: number
        }
        Returns: {
          actual_timestamp: string
          confidence: number
          detection_id: string
          frame_time_seconds: number
          rank: string
          similarity_score: number
          streamer_avatar: string
          streamer_display_name: string
          streamer_id: number
          streamer_login: string
          total_count: number
          username: string
          vod_id: number
          vod_source_id: string
          vod_url: string
        }[]
      }
      get_global_stats: { Args: never; Returns: Json }
      get_pending_chunks_for_vod: {
        Args: { p_source_id?: string; p_vod_id?: number }
        Returns: {
          attempt_count: number
          chunk_id: string
          chunk_index: number
          end_seconds: number
          source_id: string
          start_seconds: number
          status: Database["public"]["Enums"]["processing_status"]
          vod_id: number
        }[]
      }
      get_pending_vods_count: {
        Args: never
        Returns: {
          ready_vods: number
          total_pending_chunks: number
          total_vods: number
        }[]
      }
      get_top_streamers_with_recent_detections: {
        Args: { detections_per_streamer?: number; top_count?: number }
        Returns: {
          actual_timestamp: string
          confidence: number
          detection_id: string
          detection_row_num: number
          frame_time_seconds: number
          rank: string
          streamer_avatar: string
          streamer_display_name: string
          streamer_id: number
          streamer_login: string
          total_detections: number
          total_vods: number
          username: string
          vod_id: number
          vod_source_id: string
          vod_url: string
        }[]
      }
      process_pending_vods: {
        Args: { max_vods?: number }
        Returns: {
          pending_chunks: number
          request_id: number
          source_id: string
          vod_id: number
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      simulate_chunk_plan_for_vod: {
        Args: {
          p_min_gap_seconds?: number
          p_target_chunk_seconds?: number
          p_vod_id: number
        }
        Returns: {
          gap_end: number
          gap_start: number
          proposed_chunk_end: number
          proposed_chunk_start: number
          proposed_duration: number
          segment_end: number
          segment_start: number
        }[]
      }
      update_chunk_status: {
        Args: { p_chunk_id: string; p_error_message?: string; p_status: string }
        Returns: Json
      }
    }
    Enums: {
      chunk_source: "vod" | "live"
      processing_status:
        | "pending"
        | "queued"
        | "processing"
        | "completed"
        | "failed"
        | "archived"
      vod_availability: "available" | "checking" | "unavailable" | "expired"
      vod_status: "pending" | "processing" | "completed" | "failed" | "partial"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      chunk_source: ["vod", "live"],
      processing_status: [
        "pending",
        "queued",
        "processing",
        "completed",
        "failed",
        "archived",
      ],
      vod_availability: ["available", "checking", "unavailable", "expired"],
      vod_status: ["pending", "processing", "completed", "failed", "partial"],
    },
  },
} as const
