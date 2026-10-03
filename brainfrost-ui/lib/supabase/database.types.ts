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
      error_events: {
        Row: {
          error_id: string
          import_id: string | null
          message: string
          metadata: Json
          occurred_at: string
          provider: string | null
          scope: string
          stage: string
          user_id: string | null
        }
        Insert: {
          error_id: string
          import_id?: string | null
          message: string
          metadata?: Json
          occurred_at?: string
          provider?: string | null
          scope: string
          stage: string
          user_id?: string | null
        }
        Update: {
          error_id?: string
          import_id?: string | null
          message?: string
          metadata?: Json
          occurred_at?: string
          provider?: string | null
          scope?: string
          stage?: string
          user_id?: string | null
        }
        Relationships: []
      }
      managed_llm_usage: {
        Row: {
          period_start: string
          updated_at: string
          usage_count: number
          user_id: string
        }
        Insert: {
          period_start: string
          updated_at?: string
          usage_count?: number
          user_id?: string
        }
        Update: {
          period_start?: string
          updated_at?: string
          usage_count?: number
          user_id?: string
        }
        Relationships: []
      }
      managed_llm_quota_limits: {
        Row: {
          created_at: string
          granted_by: string | null
          monthly_limit: number
          reason: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_by?: string | null
          monthly_limit: number
          reason: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          granted_by?: string | null
          monthly_limit?: number
          reason?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      app_notifications: {
        Row: {
          created_at: string
          dedupe_key: string | null
          href: string | null
          id: string
          kind: string
          message: string
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dedupe_key?: string | null
          href?: string | null
          id?: string
          kind: string
          message: string
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          dedupe_key?: string | null
          href?: string | null
          id?: string
          kind?: string
          message?: string
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      oauth_connections: {
        Row: {
          access_token_cipher: string
          provider: string
          provider_account_id: string | null
          refresh_token_cipher: string | null
          scopes: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token_cipher: string
          provider: string
          provider_account_id?: string | null
          refresh_token_cipher?: string | null
          scopes?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token_cipher?: string
          provider?: string
          provider_account_id?: string | null
          refresh_token_cipher?: string | null
          scopes?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      product_events: {
        Row: {
          event_name: string
          id: number
          occurred_at: string
          path: string
          session_id: string
          user_id: string
        }
        Insert: {
          event_name: string
          id?: never
          occurred_at?: string
          path: string
          session_id: string
          user_id?: string
        }
        Update: {
          event_name?: string
          id?: never
          occurred_at?: string
          path?: string
          session_id?: string
          user_id?: string
        }
        Relationships: []
      }
      product_sessions: {
        Row: {
          active_seconds: number
          id: string
          last_path: string
          last_seen_at: string
          started_at: string
          user_id: string
        }
        Insert: {
          active_seconds?: number
          id: string
          last_path?: string
          last_seen_at?: string
          started_at?: string
          user_id?: string
        }
        Update: {
          active_seconds?: number
          id?: string
          last_path?: string
          last_seen_at?: string
          started_at?: string
          user_id?: string
        }
        Relationships: []
      }
      synthetic_checks: {
        Row: {
          check_name: string
          duration_ms: number
          error_id: string | null
          id: number
          occurred_at: string
          provider: string | null
          status: string
          suggestions_count: number | null
        }
        Insert: {
          check_name: string
          duration_ms: number
          error_id?: string | null
          id?: never
          occurred_at?: string
          provider?: string | null
          status: string
          suggestions_count?: number | null
        }
        Update: {
          check_name?: string
          duration_ms?: number
          error_id?: string | null
          id?: never
          occurred_at?: string
          provider?: string | null
          status?: string
          suggestions_count?: number | null
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
      chat_credentials: {
        Row: {
          api: string
          api_key_cipher: string
          dangerously_allow_browser: boolean
          extra_key_cipher: string | null
          headers: Json
          id: string
          label: string
          model: string
          provider_key: string
          updated_at: string
          url: string
          user_id: string
        }
        Insert: {
          api: string
          api_key_cipher: string
          dangerously_allow_browser?: boolean
          extra_key_cipher?: string | null
          headers?: Json
          id?: string
          label: string
          model: string
          provider_key: string
          updated_at?: string
          url: string
          user_id?: string
        }
        Update: {
          api?: string
          api_key_cipher?: string
          dangerously_allow_browser?: boolean
          extra_key_cipher?: string | null
          headers?: Json
          id?: string
          label?: string
          model?: string
          provider_key?: string
          updated_at?: string
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      pattern_suggestions: {
        Row: {
          accepted_note_id: string | null
          body: string
          category: string
          category_confidence: number | null
          category_reason: string | null
          concepts: string[]
          created_at: string
          evidence: string | null
          id: string
          import_id: string
          suggested_links: Json
          status: string
          title: string
          user_id: string
        }
        Insert: {
          accepted_note_id?: string | null
          body: string
          category: string
          category_confidence?: number | null
          category_reason?: string | null
          concepts?: string[]
          created_at?: string
          evidence?: string | null
          id?: string
          import_id: string
          suggested_links?: Json
          status?: string
          title: string
          user_id?: string
        }
        Update: {
          accepted_note_id?: string | null
          body?: string
          category?: string
          category_confidence?: number | null
          category_reason?: string | null
          concepts?: string[]
          created_at?: string
          evidence?: string | null
          id?: string
          import_id?: string
          suggested_links?: Json
          status?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          current_period_end: string | null
          price_id: string | null
          status: string
          stripe_customer_id: string
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          current_period_end?: string | null
          price_id?: string | null
          status: string
          stripe_customer_id: string
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          current_period_end?: string | null
          price_id?: string | null
          status?: string
          stripe_customer_id?: string
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pro_grants: {
        Row: {
          created_at: string
          expires_at: string | null
          granted_by: string | null
          reason: string
          revoked_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          granted_by?: string | null
          reason: string
          revoked_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          granted_by?: string | null
          reason?: string
          revoked_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscription_admin_events: {
        Row: {
          action: string
          admin_user_id: string | null
          created_at: string
          id: string
          new_expires_at: string | null
          previous_expires_at: string | null
          reason: string
          target_user_id: string
        }
        Insert: {
          action: string
          admin_user_id?: string | null
          created_at?: string
          id?: string
          new_expires_at?: string | null
          previous_expires_at?: string | null
          reason: string
          target_user_id: string
        }
        Update: {
          action?: string
          admin_user_id?: string | null
          created_at?: string
          id?: string
          new_expires_at?: string | null
          previous_expires_at?: string | null
          reason?: string
          target_user_id?: string
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
          concepts: string[]
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
          concepts?: string[]
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
          concepts?: string[]
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
    Functions: {
      consume_api_rate_limit: {
        Args: {
          p_bucket: string
          p_limit: number
          p_window_seconds: number
        }
        Returns: Array<{
          allowed: boolean
          remaining: number
          resets_at: string
        }>
      }
      consume_managed_llm_quota: {
        Args: Record<PropertyKey, never>
        Returns: Array<{
          allowed: boolean
          quota_limit: number
          resets_at: string
          used: number
        }>
      }
      record_product_activity: {
        Args: {
          p_active_seconds?: number
          p_page_view?: boolean
          p_path: string
          p_session_id: string
        }
        Returns: undefined
      }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}
