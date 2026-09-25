export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: { PostgrestVersion: "14.5" }
  public: {
    Tables: {
      categories: {
        Row: { created_at: string; description: string | null; id: string; label: string }
        Insert: { created_at?: string; description?: string | null; id: string; label: string }
        Update: { created_at?: string; description?: string | null; id?: string; label?: string }
        Relationships: []
      }
      imports: {
        Row: {
          created_at: string
          error: string | null
          file_count: number
          finished_at: string | null
          id: string
          label: string
          provider_used: string | null
          raw_text: string | null
          source: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          file_count?: number
          finished_at?: string | null
          id?: string
          label: string
          provider_used?: string | null
          raw_text?: string | null
          source: string
          status?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          error?: string | null
          file_count?: number
          finished_at?: string | null
          id?: string
          label?: string
          provider_used?: string | null
          raw_text?: string | null
          source?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      llm_credentials: {
        Row: {
          api_key_cipher: string
          deep_analysis: boolean
          id: string
          provider: string
          updated_at: string
          user_id: string
        }
        Insert: {
          api_key_cipher: string
          deep_analysis?: boolean
          id?: string
          provider: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          api_key_cipher?: string
          deep_analysis?: boolean
          id?: string
          provider?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pattern_suggestions: {
        Row: {
          accepted_note_id: string | null
          body: string
          category: string
          created_at: string
          evidence: string | null
          id: string
          import_id: string
          status: string
          title: string
          user_id: string
        }
        Insert: {
          accepted_note_id?: string | null
          body: string
          category: string
          created_at?: string
          evidence?: string | null
          id?: string
          import_id: string
          status?: string
          title: string
          user_id?: string
        }
        Update: {
          accepted_note_id?: string | null
          body?: string
          category?: string
          created_at?: string
          evidence?: string | null
          id?: string
          import_id?: string
          status?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      vault_links: {
        Row: { from_note_id: string; to_slug: string }
        Insert: { from_note_id: string; to_slug: string }
        Update: { from_note_id?: string; to_slug?: string }
        Relationships: []
      }
      vault_notes: {
        Row: {
          body: string
          category: string
          created_at: string
          id: string
          layer: string
          slug: string
          tags: string[]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          category: string
          created_at?: string
          id?: string
          layer?: string
          slug: string
          tags?: string[]
          title: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          body?: string
          category?: string
          created_at?: string
          id?: string
          layer?: string
          slug?: string
          tags?: string[]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}
