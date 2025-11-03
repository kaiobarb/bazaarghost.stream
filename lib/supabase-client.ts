import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

// Get environment variables with validation
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

// Create a single supabase client for interacting with your database
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false, // No auth needed for public search
  },
});

// Re-export types from the generated file
export type { Database } from "@/types/supabase";
export type { Tables, TablesInsert, TablesUpdate, Enums } from "@/types/supabase";