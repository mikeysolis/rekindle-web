export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      connection_invites: {
        Row: {
          accepted_at: string | null
          connection_id: string | null
          created_at: string
          created_by_user_id: string
          expires_at: string | null
          id: string
          invite_code: string | null
          invite_token_hash: string
          invited_user_id: string | null
          inviter_person_id: string | null
          revoked_at: string | null
          status: string
        }
        Insert: {
          accepted_at?: string | null
          connection_id?: string | null
          created_at?: string
          created_by_user_id: string
          expires_at?: string | null
          id?: string
          invite_code?: string | null
          invite_token_hash: string
          invited_user_id?: string | null
          inviter_person_id?: string | null
          revoked_at?: string | null
          status?: string
        }
        Update: {
          accepted_at?: string | null
          connection_id?: string | null
          created_at?: string
          created_by_user_id?: string
          expires_at?: string | null
          id?: string
          invite_code?: string | null
          invite_token_hash?: string
          invited_user_id?: string | null
          inviter_person_id?: string | null
          revoked_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "connection_invites_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connection_invites_inviter_person_id_fkey"
            columns: ["inviter_person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connection_invites_inviter_person_id_fkey"
            columns: ["inviter_person_id"]
            isOneToOne: false
            referencedRelation: "v_person_nudge_summary"
            referencedColumns: ["person_id"]
          },
        ]
      }
      connection_members: {
        Row: {
          connection_id: string
          created_at: string
          id: string
          person_id: string | null
          user_id: string
        }
        Insert: {
          connection_id: string
          created_at?: string
          id?: string
          person_id?: string | null
          user_id: string
        }
        Update: {
          connection_id?: string
          created_at?: string
          id?: string
          person_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "connection_members_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connection_members_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connection_members_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "v_person_nudge_summary"
            referencedColumns: ["person_id"]
          },
        ]
      }
      connection_wishes: {
        Row: {
          archived_at: string | null
          connection_id: string
          created_at: string
          created_by_user_id: string
          custom_request_id: string | null
          id: string
          idea_id: string | null
          note: string | null
          pinned: boolean
          target_user_id: string
          wish_category_id: string
        }
        Insert: {
          archived_at?: string | null
          connection_id: string
          created_at?: string
          created_by_user_id: string
          custom_request_id?: string | null
          id?: string
          idea_id?: string | null
          note?: string | null
          pinned?: boolean
          target_user_id: string
          wish_category_id?: string
        }
        Update: {
          archived_at?: string | null
          connection_id?: string
          created_at?: string
          created_by_user_id?: string
          custom_request_id?: string | null
          id?: string
          idea_id?: string | null
          note?: string | null
          pinned?: boolean
          target_user_id?: string
          wish_category_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "connection_wishes_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connection_wishes_custom_request_id_fkey"
            columns: ["custom_request_id"]
            isOneToOne: false
            referencedRelation: "custom_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connection_wishes_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "ideas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connection_wishes_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "v_idea_flat_traits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_connection_wishes__wish_category_id__wish_categories"
            columns: ["wish_category_id"]
            isOneToOne: false
            referencedRelation: "v_wish_categories_localized"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_connection_wishes__wish_category_id__wish_categories"
            columns: ["wish_category_id"]
            isOneToOne: false
            referencedRelation: "wish_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      connections: {
        Row: {
          created_at: string
          id: string
        }
        Insert: {
          created_at?: string
          id?: string
        }
        Update: {
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      custom_requests: {
        Row: {
          admin_notes: string | null
          approved_idea_id: string | null
          created_at: string
          created_by_user_id: string
          description: string | null
          id: string
          rejected_at: string | null
          status: string
          submitted_at: string | null
          target_user_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          approved_idea_id?: string | null
          created_at?: string
          created_by_user_id: string
          description?: string | null
          id?: string
          rejected_at?: string | null
          status?: string
          submitted_at?: string | null
          target_user_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          approved_idea_id?: string | null
          created_at?: string
          created_by_user_id?: string
          description?: string | null
          id?: string
          rejected_at?: string | null
          status?: string
          submitted_at?: string | null
          target_user_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_requests_approved_idea_id_fkey"
            columns: ["approved_idea_id"]
            isOneToOne: false
            referencedRelation: "ideas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_requests_approved_idea_id_fkey"
            columns: ["approved_idea_id"]
            isOneToOne: false
            referencedRelation: "v_idea_flat_traits"
            referencedColumns: ["id"]
          },
        ]
      }
      idea_traits: {
        Row: {
          created_at: string
          id: string
          idea_id: string
          trait_option_id: string
          trait_select_mode: string
          trait_type_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          idea_id: string
          trait_option_id: string
          trait_select_mode: string
          trait_type_id: string
        }
        Update: {
          created_at?: string
          id?: string
          idea_id?: string
          trait_option_id?: string
          trait_select_mode?: string
          trait_type_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "idea_traits_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "ideas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "idea_traits_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "v_idea_flat_traits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "idea_traits_trait_option_id_fkey"
            columns: ["trait_option_id"]
            isOneToOne: false
            referencedRelation: "trait_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "idea_traits_trait_option_id_fkey"
            columns: ["trait_option_id"]
            isOneToOne: false
            referencedRelation: "v_trait_options_localized"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "idea_traits_trait_type_id_fkey"
            columns: ["trait_type_id"]
            isOneToOne: false
            referencedRelation: "trait_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "idea_traits_trait_type_id_fkey"
            columns: ["trait_type_id"]
            isOneToOne: false
            referencedRelation: "v_trait_types_localized"
            referencedColumns: ["id"]
          },
        ]
      }
      ideas: {
        Row: {
          created_at: string
          created_by_user_id: string | null
          default_cadence_tag_id: string | null
          description: string | null
          effort_id: string | null
          id: string
          image_url: string | null
          is_deleted: boolean
          is_global: boolean
          max_minutes: number | null
          min_minutes: number | null
          reason_snippet: string | null
          search_tsv: unknown
          slug: string
          title: string
        }
        Insert: {
          created_at?: string
          created_by_user_id?: string | null
          default_cadence_tag_id?: string | null
          description?: string | null
          effort_id?: string | null
          id?: string
          image_url?: string | null
          is_deleted?: boolean
          is_global?: boolean
          max_minutes?: number | null
          min_minutes?: number | null
          reason_snippet?: string | null
          search_tsv?: unknown
          slug: string
          title: string
        }
        Update: {
          created_at?: string
          created_by_user_id?: string | null
          default_cadence_tag_id?: string | null
          description?: string | null
          effort_id?: string | null
          id?: string
          image_url?: string | null
          is_deleted?: boolean
          is_global?: boolean
          max_minutes?: number | null
          min_minutes?: number | null
          reason_snippet?: string | null
          search_tsv?: unknown
          slug?: string
          title?: string
        }
        Relationships: []
      }
      ideas_translations: {
        Row: {
          description: string | null
          id: string
          idea_id: string
          locale: string
          reason_snippet: string | null
          search_tsv: unknown
          title: string
        }
        Insert: {
          description?: string | null
          id?: string
          idea_id: string
          locale: string
          reason_snippet?: string | null
          search_tsv?: unknown
          title: string
        }
        Update: {
          description?: string | null
          id?: string
          idea_id?: string
          locale?: string
          reason_snippet?: string | null
          search_tsv?: unknown
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "ideas_translations_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "ideas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ideas_translations_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "v_idea_flat_traits"
            referencedColumns: ["id"]
          },
        ]
      }
      inbox_items: {
        Row: {
          actor_user_id: string | null
          aggregation_key: string | null
          archived_at: string | null
          body: string | null
          connection_id: string | null
          created_at: string
          dedupe_key: string | null
          id: string
          payload: Json
          person_id: string | null
          plan_id: string | null
          read_at: string | null
          resolved_at: string | null
          title: string | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          actor_user_id?: string | null
          aggregation_key?: string | null
          archived_at?: string | null
          body?: string | null
          connection_id?: string | null
          created_at?: string
          dedupe_key?: string | null
          id?: string
          payload?: Json
          person_id?: string | null
          plan_id?: string | null
          read_at?: string | null
          resolved_at?: string | null
          title?: string | null
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          actor_user_id?: string | null
          aggregation_key?: string | null
          archived_at?: string | null
          body?: string | null
          connection_id?: string | null
          created_at?: string
          dedupe_key?: string | null
          id?: string
          payload?: Json
          person_id?: string | null
          plan_id?: string | null
          read_at?: string | null
          resolved_at?: string | null
          title?: string | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inbox_items_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbox_items_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbox_items_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "v_person_nudge_summary"
            referencedColumns: ["person_id"]
          },
          {
            foreignKeyName: "inbox_items_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbox_items_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbox_items_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "v_plans_with_completion_count"
            referencedColumns: ["id"]
          },
        ]
      }
      issue_reports: {
        Row: {
          app_version: string | null
          build: string | null
          contact_email: string | null
          created_at: string
          details: string | null
          device: string | null
          environment: string | null
          error_id: string | null
          id: string
          log_levels: string[] | null
          log_path: string | null
          log_scopes: string[] | null
          log_size_bytes: number | null
          os_version: string | null
          platform: string | null
          session_id: string | null
          status: string
          summary: string
          user_id: string
        }
        Insert: {
          app_version?: string | null
          build?: string | null
          contact_email?: string | null
          created_at?: string
          details?: string | null
          device?: string | null
          environment?: string | null
          error_id?: string | null
          id?: string
          log_levels?: string[] | null
          log_path?: string | null
          log_scopes?: string[] | null
          log_size_bytes?: number | null
          os_version?: string | null
          platform?: string | null
          session_id?: string | null
          status?: string
          summary: string
          user_id: string
        }
        Update: {
          app_version?: string | null
          build?: string | null
          contact_email?: string | null
          created_at?: string
          details?: string | null
          device?: string | null
          environment?: string | null
          error_id?: string | null
          id?: string
          log_levels?: string[] | null
          log_path?: string | null
          log_scopes?: string[] | null
          log_size_bytes?: number | null
          os_version?: string | null
          platform?: string | null
          session_id?: string | null
          status?: string
          summary?: string
          user_id?: string
        }
        Relationships: []
      }
      people: {
        Row: {
          archived_at: string | null
          birthday: string | null
          check_in_cadence_tag_id: string | null
          created_at: string
          id: string
          is_favorite: boolean
          is_self: boolean
          last_completed_at: string | null
          name: string
          nickname: string | null
          notes: string | null
          nudge_surface_cadence_tag_id: string | null
          person_gender_id: string | null
          person_type_id: string
          photo_url: string | null
          sort_order: number | null
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          birthday?: string | null
          check_in_cadence_tag_id?: string | null
          created_at?: string
          id?: string
          is_favorite?: boolean
          is_self?: boolean
          last_completed_at?: string | null
          name: string
          nickname?: string | null
          notes?: string | null
          nudge_surface_cadence_tag_id?: string | null
          person_gender_id?: string | null
          person_type_id: string
          photo_url?: string | null
          sort_order?: number | null
          user_id: string
        }
        Update: {
          archived_at?: string | null
          birthday?: string | null
          check_in_cadence_tag_id?: string | null
          created_at?: string
          id?: string
          is_favorite?: boolean
          is_self?: boolean
          last_completed_at?: string | null
          name?: string
          nickname?: string | null
          notes?: string | null
          nudge_surface_cadence_tag_id?: string | null
          person_gender_id?: string | null
          person_type_id?: string
          photo_url?: string | null
          sort_order?: number | null
          user_id?: string
        }
        Relationships: []
      }
      person_trait_attributes: {
        Row: {
          created_at: string
          id: string
          person_id: string
          trait_option_id: string
          trait_select_mode: string
          trait_type_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          person_id: string
          trait_option_id: string
          trait_select_mode: string
          trait_type_id: string
        }
        Update: {
          created_at?: string
          id?: string
          person_id?: string
          trait_option_id?: string
          trait_select_mode?: string
          trait_type_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "person_trait_attributes_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_trait_attributes_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "v_person_nudge_summary"
            referencedColumns: ["person_id"]
          },
          {
            foreignKeyName: "person_trait_attributes_trait_option_id_fkey"
            columns: ["trait_option_id"]
            isOneToOne: false
            referencedRelation: "trait_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_trait_attributes_trait_option_id_fkey"
            columns: ["trait_option_id"]
            isOneToOne: false
            referencedRelation: "v_trait_options_localized"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_trait_attributes_trait_type_id_fkey"
            columns: ["trait_type_id"]
            isOneToOne: false
            referencedRelation: "trait_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_trait_attributes_trait_type_id_fkey"
            columns: ["trait_type_id"]
            isOneToOne: false
            referencedRelation: "v_trait_types_localized"
            referencedColumns: ["id"]
          },
        ]
      }
      person_trait_preferences: {
        Row: {
          created_at: string
          id: string
          person_id: string
          polarity: string
          strength: number
          trait_option_id: string
          trait_select_mode: string
          trait_type_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          person_id: string
          polarity: string
          strength?: number
          trait_option_id: string
          trait_select_mode: string
          trait_type_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          person_id?: string
          polarity?: string
          strength?: number
          trait_option_id?: string
          trait_select_mode?: string
          trait_type_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "person_trait_preferences_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_trait_preferences_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "v_person_nudge_summary"
            referencedColumns: ["person_id"]
          },
          {
            foreignKeyName: "person_trait_preferences_trait_option_id_fkey"
            columns: ["trait_option_id"]
            isOneToOne: false
            referencedRelation: "trait_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_trait_preferences_trait_option_id_fkey"
            columns: ["trait_option_id"]
            isOneToOne: false
            referencedRelation: "v_trait_options_localized"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_trait_preferences_trait_type_id_fkey"
            columns: ["trait_type_id"]
            isOneToOne: false
            referencedRelation: "trait_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_trait_preferences_trait_type_id_fkey"
            columns: ["trait_type_id"]
            isOneToOne: false
            referencedRelation: "v_trait_types_localized"
            referencedColumns: ["id"]
          },
        ]
      }
      person_trait_profile: {
        Row: {
          created_at: string
          event_count: number
          id: string
          last_event_at: string
          person_id: string
          source_counts: Json | null
          trait_option_id: string
          updated_at: string
          weight: number
        }
        Insert: {
          created_at?: string
          event_count?: number
          id?: string
          last_event_at?: string
          person_id: string
          source_counts?: Json | null
          trait_option_id: string
          updated_at?: string
          weight?: number
        }
        Update: {
          created_at?: string
          event_count?: number
          id?: string
          last_event_at?: string
          person_id?: string
          source_counts?: Json | null
          trait_option_id?: string
          updated_at?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "person_trait_profile_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_trait_profile_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "v_person_nudge_summary"
            referencedColumns: ["person_id"]
          },
          {
            foreignKeyName: "person_trait_profile_trait_option_id_fkey"
            columns: ["trait_option_id"]
            isOneToOne: false
            referencedRelation: "trait_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_trait_profile_trait_option_id_fkey"
            columns: ["trait_option_id"]
            isOneToOne: false
            referencedRelation: "v_trait_options_localized"
            referencedColumns: ["id"]
          },
        ]
      }
      person_wishes: {
        Row: {
          archived_at: string | null
          created_at: string
          custom_request_id: string | null
          id: string
          idea_id: string | null
          note: string | null
          person_id: string
          pinned: boolean
          wish_category_id: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          custom_request_id?: string | null
          id?: string
          idea_id?: string | null
          note?: string | null
          person_id: string
          pinned?: boolean
          wish_category_id?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          custom_request_id?: string | null
          id?: string
          idea_id?: string | null
          note?: string | null
          person_id?: string
          pinned?: boolean
          wish_category_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_person_wishes__wish_category_id__wish_categories"
            columns: ["wish_category_id"]
            isOneToOne: false
            referencedRelation: "v_wish_categories_localized"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_person_wishes__wish_category_id__wish_categories"
            columns: ["wish_category_id"]
            isOneToOne: false
            referencedRelation: "wish_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_wishes_custom_request_id_fkey"
            columns: ["custom_request_id"]
            isOneToOne: false
            referencedRelation: "custom_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_wishes_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "ideas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_wishes_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "v_idea_flat_traits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_wishes_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_wishes_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "v_person_nudge_summary"
            referencedColumns: ["person_id"]
          },
        ]
      }
      plan_completions: {
        Row: {
          completed_at: string
          due_date: string | null
          id: string
          notes: string | null
          plan_id: string
        }
        Insert: {
          completed_at?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          plan_id: string
        }
        Update: {
          completed_at?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_completions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_completions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_completions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "v_plans_with_completion_count"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          archived_at: string | null
          cadence_days: number | null
          cadence_tag_id: string | null
          created_at: string
          custom_request_id: string | null
          id: string
          idea_id: string | null
          last_sent_at: string | null
          next_due_date: string | null
          note: string | null
          origin_connection_wish_id: string | null
          origin_person_wish_id: string | null
          person_id: string
          pinned: boolean
          start_date: string
          status: string
          timezone: string | null
        }
        Insert: {
          archived_at?: string | null
          cadence_days?: number | null
          cadence_tag_id?: string | null
          created_at?: string
          custom_request_id?: string | null
          id?: string
          idea_id?: string | null
          last_sent_at?: string | null
          next_due_date?: string | null
          note?: string | null
          origin_connection_wish_id?: string | null
          origin_person_wish_id?: string | null
          person_id: string
          pinned?: boolean
          start_date?: string
          status?: string
          timezone?: string | null
        }
        Update: {
          archived_at?: string | null
          cadence_days?: number | null
          cadence_tag_id?: string | null
          created_at?: string
          custom_request_id?: string | null
          id?: string
          idea_id?: string | null
          last_sent_at?: string | null
          next_due_date?: string | null
          note?: string | null
          origin_connection_wish_id?: string | null
          origin_person_wish_id?: string | null
          person_id?: string
          pinned?: boolean
          start_date?: string
          status?: string
          timezone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_plans__origin_connection_wish_id__connection_wishes"
            columns: ["origin_connection_wish_id"]
            isOneToOne: false
            referencedRelation: "connection_wishes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_plans__origin_person_wish_id__person_wishes"
            columns: ["origin_person_wish_id"]
            isOneToOne: false
            referencedRelation: "person_wishes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plans_custom_request_id_fkey"
            columns: ["custom_request_id"]
            isOneToOne: false
            referencedRelation: "custom_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plans_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "ideas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plans_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "v_idea_flat_traits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plans_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plans_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "v_person_nudge_summary"
            referencedColumns: ["person_id"]
          },
        ]
      }
      reminders: {
        Row: {
          body: string | null
          created_at: string
          day_of_month: number | null
          days_of_week: number[] | null
          enabled: boolean
          frequency: string | null
          id: string
          is_primary: boolean
          next_fire_at: string | null
          paused_until: string | null
          person_id: string
          plan_id: string | null
          schedule_source: string
          schedule_type: string
          scope: string
          start_at: string | null
          time_of_day: string | null
          timezone: string | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          day_of_month?: number | null
          days_of_week?: number[] | null
          enabled?: boolean
          frequency?: string | null
          id?: string
          is_primary?: boolean
          next_fire_at?: string | null
          paused_until?: string | null
          person_id: string
          plan_id?: string | null
          schedule_source?: string
          schedule_type: string
          scope: string
          start_at?: string | null
          time_of_day?: string | null
          timezone?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          day_of_month?: number | null
          days_of_week?: number[] | null
          enabled?: boolean
          frequency?: string | null
          id?: string
          is_primary?: boolean
          next_fire_at?: string | null
          paused_until?: string | null
          person_id?: string
          plan_id?: string | null
          schedule_source?: string
          schedule_type?: string
          scope?: string
          start_at?: string | null
          time_of_day?: string | null
          timezone?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminders_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminders_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "v_person_nudge_summary"
            referencedColumns: ["person_id"]
          },
          {
            foreignKeyName: "reminders_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminders_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminders_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "v_plans_with_completion_count"
            referencedColumns: ["id"]
          },
        ]
      }
      trait_bindings: {
        Row: {
          context: string
          created_at: string
          default_boost_weight: number | null
          id: string
          is_filterable: boolean
          is_quick_filter: boolean
          is_required: boolean
          is_visible: boolean
          min_required: number | null
          quick_filter_order: number | null
          select_mode: string
          tier: number | null
          trait_type_id: string
          ui_group_slug: string | null
          ui_hint: string | null
          updated_at: string
        }
        Insert: {
          context: string
          created_at?: string
          default_boost_weight?: number | null
          id?: string
          is_filterable?: boolean
          is_quick_filter?: boolean
          is_required?: boolean
          is_visible?: boolean
          min_required?: number | null
          quick_filter_order?: number | null
          select_mode: string
          tier?: number | null
          trait_type_id: string
          ui_group_slug?: string | null
          ui_hint?: string | null
          updated_at?: string
        }
        Update: {
          context?: string
          created_at?: string
          default_boost_weight?: number | null
          id?: string
          is_filterable?: boolean
          is_quick_filter?: boolean
          is_required?: boolean
          is_visible?: boolean
          min_required?: number | null
          quick_filter_order?: number | null
          select_mode?: string
          tier?: number | null
          trait_type_id?: string
          ui_group_slug?: string | null
          ui_hint?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trait_bindings_trait_type_id_fkey"
            columns: ["trait_type_id"]
            isOneToOne: false
            referencedRelation: "trait_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trait_bindings_trait_type_id_fkey"
            columns: ["trait_type_id"]
            isOneToOne: false
            referencedRelation: "v_trait_types_localized"
            referencedColumns: ["id"]
          },
        ]
      }
      trait_options: {
        Row: {
          created_at: string
          deprecated_at: string | null
          description: string | null
          id: string
          is_deprecated: boolean
          label: string
          meta: Json | null
          short_label: string | null
          slug: string
          sort_order: number
          trait_type_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deprecated_at?: string | null
          description?: string | null
          id?: string
          is_deprecated?: boolean
          label: string
          meta?: Json | null
          short_label?: string | null
          slug: string
          sort_order?: number
          trait_type_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deprecated_at?: string | null
          description?: string | null
          id?: string
          is_deprecated?: boolean
          label?: string
          meta?: Json | null
          short_label?: string | null
          slug?: string
          sort_order?: number
          trait_type_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trait_options_trait_type_id_fkey"
            columns: ["trait_type_id"]
            isOneToOne: false
            referencedRelation: "trait_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trait_options_trait_type_id_fkey"
            columns: ["trait_type_id"]
            isOneToOne: false
            referencedRelation: "v_trait_types_localized"
            referencedColumns: ["id"]
          },
        ]
      }
      trait_options_translations: {
        Row: {
          description: string | null
          id: string
          label: string
          locale: string
          short_label: string | null
          trait_option_id: string
        }
        Insert: {
          description?: string | null
          id?: string
          label: string
          locale: string
          short_label?: string | null
          trait_option_id: string
        }
        Update: {
          description?: string | null
          id?: string
          label?: string
          locale?: string
          short_label?: string | null
          trait_option_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trait_options_translations_trait_option_id_fkey"
            columns: ["trait_option_id"]
            isOneToOne: false
            referencedRelation: "trait_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trait_options_translations_trait_option_id_fkey"
            columns: ["trait_option_id"]
            isOneToOne: false
            referencedRelation: "v_trait_options_localized"
            referencedColumns: ["id"]
          },
        ]
      }
      trait_types: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      trait_types_translations: {
        Row: {
          description: string | null
          id: string
          locale: string
          name: string
          trait_type_id: string
        }
        Insert: {
          description?: string | null
          id?: string
          locale: string
          name: string
          trait_type_id: string
        }
        Update: {
          description?: string | null
          id?: string
          locale?: string
          name?: string
          trait_type_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trait_types_translations_trait_type_id_fkey"
            columns: ["trait_type_id"]
            isOneToOne: false
            referencedRelation: "trait_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trait_types_translations_trait_type_id_fkey"
            columns: ["trait_type_id"]
            isOneToOne: false
            referencedRelation: "v_trait_types_localized"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          deleted_at: string | null
          first_name: string | null
          id: string
          last_known_email: string | null
          last_name: string | null
          nickname: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          deleted_at?: string | null
          first_name?: string | null
          id: string
          last_known_email?: string | null
          last_name?: string | null
          nickname?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          deleted_at?: string | null
          first_name?: string | null
          id?: string
          last_known_email?: string | null
          last_name?: string | null
          nickname?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          created_at: string
          preferred_language: string | null
          reminders_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          preferred_language?: string | null
          reminders_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          preferred_language?: string | null
          reminders_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_trait_defaults: {
        Row: {
          created_at: string
          id: string
          polarity: string
          strength: number
          trait_option_id: string
          trait_select_mode: string
          trait_type_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          polarity: string
          strength?: number
          trait_option_id: string
          trait_select_mode: string
          trait_type_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          polarity?: string
          strength?: number
          trait_option_id?: string
          trait_select_mode?: string
          trait_type_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_trait_defaults_trait_option_id_fkey"
            columns: ["trait_option_id"]
            isOneToOne: false
            referencedRelation: "trait_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_trait_defaults_trait_option_id_fkey"
            columns: ["trait_option_id"]
            isOneToOne: false
            referencedRelation: "v_trait_options_localized"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_trait_defaults_trait_type_id_fkey"
            columns: ["trait_type_id"]
            isOneToOne: false
            referencedRelation: "trait_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_trait_defaults_trait_type_id_fkey"
            columns: ["trait_type_id"]
            isOneToOne: false
            referencedRelation: "v_trait_types_localized"
            referencedColumns: ["id"]
          },
        ]
      }
      wish_categories: {
        Row: {
          icon_key: string | null
          id: string
          is_active: boolean
          is_practical: boolean
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          icon_key?: string | null
          id?: string
          is_active?: boolean
          is_practical?: boolean
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          icon_key?: string | null
          id?: string
          is_active?: boolean
          is_practical?: boolean
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      wish_categories_translations: {
        Row: {
          id: string
          locale: string
          name: string
          wish_category_id: string
        }
        Insert: {
          id?: string
          locale: string
          name: string
          wish_category_id: string
        }
        Update: {
          id?: string
          locale?: string
          name?: string
          wish_category_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wish_categories_translations_wish_category_id_fkey"
            columns: ["wish_category_id"]
            isOneToOne: false
            referencedRelation: "v_wish_categories_localized"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wish_categories_translations_wish_category_id_fkey"
            columns: ["wish_category_id"]
            isOneToOne: false
            referencedRelation: "wish_categories"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      plans_active: {
        Row: {
          archived_at: string | null
          cadence_days: number | null
          cadence_tag_id: string | null
          created_at: string | null
          custom_request_id: string | null
          id: string | null
          idea_id: string | null
          last_sent_at: string | null
          next_due_date: string | null
          note: string | null
          origin_connection_wish_id: string | null
          person_id: string | null
          pinned: boolean | null
          start_date: string | null
          status: string | null
          timezone: string | null
        }
        Insert: {
          archived_at?: string | null
          cadence_days?: number | null
          cadence_tag_id?: string | null
          created_at?: string | null
          custom_request_id?: string | null
          id?: string | null
          idea_id?: string | null
          last_sent_at?: string | null
          next_due_date?: string | null
          note?: string | null
          origin_connection_wish_id?: string | null
          person_id?: string | null
          pinned?: boolean | null
          start_date?: string | null
          status?: string | null
          timezone?: string | null
        }
        Update: {
          archived_at?: string | null
          cadence_days?: number | null
          cadence_tag_id?: string | null
          created_at?: string | null
          custom_request_id?: string | null
          id?: string | null
          idea_id?: string | null
          last_sent_at?: string | null
          next_due_date?: string | null
          note?: string | null
          origin_connection_wish_id?: string | null
          person_id?: string | null
          pinned?: boolean | null
          start_date?: string | null
          status?: string | null
          timezone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_plans__origin_connection_wish_id__connection_wishes"
            columns: ["origin_connection_wish_id"]
            isOneToOne: false
            referencedRelation: "connection_wishes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plans_custom_request_id_fkey"
            columns: ["custom_request_id"]
            isOneToOne: false
            referencedRelation: "custom_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plans_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "ideas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plans_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "v_idea_flat_traits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plans_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plans_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "v_person_nudge_summary"
            referencedColumns: ["person_id"]
          },
        ]
      }
      v_idea_flat_traits: {
        Row: {
          created_at: string | null
          description: string | null
          id: string | null
          image_url: string | null
          max_minutes: number | null
          min_minutes: number | null
          reason_snippet: string | null
          search_tsv_base: unknown
          search_tsv_localized: unknown
          slug: string | null
          title: string | null
          trait_map: Json | null
          trait_option_ids: string[] | null
        }
        Relationships: []
      }
      v_inbox_unread_counts: {
        Row: {
          unread_count: number | null
          user_id: string | null
        }
        Relationships: []
      }
      v_person_nudge_summary: {
        Row: {
          due_today_count: number | null
          due_today_first_custom_request_id: string | null
          due_today_first_idea_id: string | null
          due_today_first_plan_id: string | null
          due_today_first_title: string | null
          overdue_count: number | null
          overdue_first_custom_request_id: string | null
          overdue_first_idea_id: string | null
          overdue_first_plan_id: string | null
          overdue_first_title: string | null
          person_id: string | null
          upcoming_next_custom_request_id: string | null
          upcoming_next_due_date: string | null
          upcoming_next_idea_id: string | null
          upcoming_next_plan_id: string | null
          upcoming_next_title: string | null
        }
        Relationships: []
      }
      v_person_trait_attributes_localized: {
        Row: {
          created_at: string | null
          id: string | null
          person_id: string | null
          trait_option_description: string | null
          trait_option_id: string | null
          trait_option_label: string | null
          trait_option_short_label: string | null
          trait_option_slug: string | null
          trait_type_id: string | null
          trait_type_slug: string | null
        }
        Relationships: [
          {
            foreignKeyName: "person_trait_attributes_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_trait_attributes_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "v_person_nudge_summary"
            referencedColumns: ["person_id"]
          },
          {
            foreignKeyName: "person_trait_attributes_trait_option_id_fkey"
            columns: ["trait_option_id"]
            isOneToOne: false
            referencedRelation: "trait_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_trait_attributes_trait_option_id_fkey"
            columns: ["trait_option_id"]
            isOneToOne: false
            referencedRelation: "v_trait_options_localized"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_trait_attributes_trait_type_id_fkey"
            columns: ["trait_type_id"]
            isOneToOne: false
            referencedRelation: "trait_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_trait_attributes_trait_type_id_fkey"
            columns: ["trait_type_id"]
            isOneToOne: false
            referencedRelation: "v_trait_types_localized"
            referencedColumns: ["id"]
          },
        ]
      }
      v_person_trait_preferences_localized: {
        Row: {
          created_at: string | null
          id: string | null
          person_id: string | null
          polarity: string | null
          strength: number | null
          trait_option_description: string | null
          trait_option_id: string | null
          trait_option_label: string | null
          trait_option_short_label: string | null
          trait_option_slug: string | null
          trait_type_id: string | null
          trait_type_slug: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "person_trait_preferences_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_trait_preferences_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "v_person_nudge_summary"
            referencedColumns: ["person_id"]
          },
          {
            foreignKeyName: "person_trait_preferences_trait_option_id_fkey"
            columns: ["trait_option_id"]
            isOneToOne: false
            referencedRelation: "trait_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_trait_preferences_trait_option_id_fkey"
            columns: ["trait_option_id"]
            isOneToOne: false
            referencedRelation: "v_trait_options_localized"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_trait_preferences_trait_type_id_fkey"
            columns: ["trait_type_id"]
            isOneToOne: false
            referencedRelation: "trait_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_trait_preferences_trait_type_id_fkey"
            columns: ["trait_type_id"]
            isOneToOne: false
            referencedRelation: "v_trait_types_localized"
            referencedColumns: ["id"]
          },
        ]
      }
      v_plans_with_completion_count: {
        Row: {
          archived_at: string | null
          cadence_days: number | null
          cadence_tag_id: string | null
          completion_count: number | null
          created_at: string | null
          custom_request: Json | null
          custom_request_id: string | null
          id: string | null
          idea: Json | null
          idea_id: string | null
          last_sent_at: string | null
          next_due_date: string | null
          note: string | null
          person_id: string | null
          pinned: boolean | null
          start_date: string | null
          status: string | null
          timezone: string | null
          title: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plans_custom_request_id_fkey"
            columns: ["custom_request_id"]
            isOneToOne: false
            referencedRelation: "custom_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plans_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "ideas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plans_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "v_idea_flat_traits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plans_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plans_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "v_person_nudge_summary"
            referencedColumns: ["person_id"]
          },
        ]
      }
      v_trait_bindings_localized: {
        Row: {
          context: string | null
          created_at: string | null
          default_boost_weight: number | null
          id: string | null
          is_filterable: boolean | null
          is_quick_filter: boolean | null
          is_required: boolean | null
          is_visible: boolean | null
          min_required: number | null
          quick_filter_order: number | null
          select_mode: string | null
          tier: number | null
          trait_type_description: string | null
          trait_type_id: string | null
          trait_type_name: string | null
          trait_type_slug: string | null
          ui_group_slug: string | null
          ui_hint: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trait_bindings_trait_type_id_fkey"
            columns: ["trait_type_id"]
            isOneToOne: false
            referencedRelation: "trait_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trait_bindings_trait_type_id_fkey"
            columns: ["trait_type_id"]
            isOneToOne: false
            referencedRelation: "v_trait_types_localized"
            referencedColumns: ["id"]
          },
        ]
      }
      v_trait_options_localized: {
        Row: {
          created_at: string | null
          deprecated_at: string | null
          description: string | null
          id: string | null
          is_deprecated: boolean | null
          label: string | null
          meta: Json | null
          short_label: string | null
          slug: string | null
          sort_order: number | null
          trait_type_id: string | null
          trait_type_slug: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trait_options_trait_type_id_fkey"
            columns: ["trait_type_id"]
            isOneToOne: false
            referencedRelation: "trait_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trait_options_trait_type_id_fkey"
            columns: ["trait_type_id"]
            isOneToOne: false
            referencedRelation: "v_trait_types_localized"
            referencedColumns: ["id"]
          },
        ]
      }
      v_trait_types_localized: {
        Row: {
          created_at: string | null
          description: string | null
          id: string | null
          name: string | null
          slug: string | null
          updated_at: string | null
        }
        Relationships: []
      }
      v_wish_categories_localized: {
        Row: {
          icon_key: string | null
          id: string | null
          is_active: boolean | null
          is_practical: boolean | null
          name: string | null
          slug: string | null
          sort_order: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      apply_person_trait_profile_delta: {
        Args: {
          p_event_at?: string
          p_event_count_delta: number
          p_idea_id: string
          p_person_id: string
          p_source_key: string
          p_weight_delta: number
        }
        Returns: undefined
      }
      create_connection_invite: {
        Args: { p_expires_in?: string; p_inviter_person_id?: string }
        Returns: {
          expires_at: string
          invite_id: string
          invite_token: string
        }[]
      }
      ensure_self_person: { Args: never; Returns: string }
      get_person_trait_preferences_snapshot: {
        Args: { p_person_id: string }
        Returns: {
          goal_option_ids: string[]
          person_id: string
          time_bucket_option_id: string
        }[]
      }
      inbox_emit_item: {
        Args: {
          p_actor_user_id: string
          p_aggregation_key?: string
          p_body?: string
          p_connection_id?: string
          p_dedupe_key?: string
          p_payload?: Json
          p_person_id?: string
          p_plan_id?: string
          p_title?: string
          p_type: string
          p_user_id: string
        }
        Returns: {
          created: boolean
          item_id: string
          updated: boolean
        }[]
      }
      inbox_mark_read: { Args: { p_item_id: string }; Returns: boolean }
      inbox_resolve: { Args: { p_item_id: string }; Returns: boolean }
      is_connection_member: {
        Args: { p_connection_id: string; p_user_id?: string }
        Returns: boolean
      }
      list_person_nudge_summary: {
        Args: { p_as_of_date?: string; p_person_ids: string[] }
        Returns: {
          due_today_count: number
          due_today_first_custom_request_id: string
          due_today_first_idea_id: string
          due_today_first_plan_id: string
          due_today_first_title: string
          overdue_count: number
          overdue_first_custom_request_id: string
          overdue_first_idea_id: string
          overdue_first_plan_id: string
          overdue_first_title: string
          person_id: string
          upcoming_next_custom_request_id: string
          upcoming_next_due_date: string
          upcoming_next_idea_id: string
          upcoming_next_plan_id: string
          upcoming_next_title: string
        }[]
      }
      preview_connection_invite: {
        Args: { p_invite_token: string }
        Returns: {
          already_linked: boolean
          expires_at: string
          inviter_avatar_url: string
          inviter_display_name: string
          inviter_user_id: string
          status: string
        }[]
      }
      rebuild_person_trait_profile: {
        Args: { p_person_id: string }
        Returns: number
      }
      redeem_connection_invite: {
        Args: { p_invite_token: string; p_recipient_person_id: string }
        Returns: {
          connection_id: string
          invited_user_id: string
          inviter_user_id: string
          status: string
        }[]
      }
      resolve_cadence_days: {
        Args: { cadence_days: number; cadence_tag_id: string }
        Returns: number
      }
      revoke_connection_invite: {
        Args: { p_invite_id: string }
        Returns: boolean
      }
      save_person_with_extras:
        | {
            Args: { p_person: Json; p_preferences?: Json; p_reminder?: Json }
            Returns: {
              created: boolean
              person_id: string
              preferences_written: number
              reminder_id: string
            }[]
          }
        | {
            Args: {
              p_attributes: Json
              p_person: Json
              p_preferences: Json
              p_reminder: Json
            }
            Returns: {
              created: boolean
              person_id: string
              preferences_written: number
              reminder_id: string
            }[]
          }
      search_ideas_v2: {
        Args: {
          debug?: boolean
          exclude_map?: Json
          filter_map?: Json
          for_person_id?: string
          limit_count?: number
          offset_count?: number
          text_q?: string
        }
        Returns: {
          created_at: string
          debug_learned: number
          debug_penalties: number
          debug_person_fit: number
          debug_preferences: number
          debug_text: number
          debug_user_defaults: number
          description: string
          id: string
          image_url: string
          max_minutes: number
          min_minutes: number
          reason_snippet: string
          score: number
          slug: string
          title: string
          top_matched_traits: Json
          trait_map: Json
        }[]
      }
      set_person_trait_preferences_snapshot: {
        Args: {
          p_goal_option_ids?: string[]
          p_person_id: string
          p_time_bucket_option_id?: string
        }
        Returns: undefined
      }
      update_plan_schedule: {
        Args: {
          p_cadence_tag_id: string
          p_manual_next_due_date: string
          p_next_due_mode: string
          p_note: string
          p_pinned: boolean
          p_plan_id: string
          p_start_date: string
        }
        Returns: {
          archived_at: string
          cadence_days: number
          cadence_tag_id: string
          created_at: string
          custom_request_id: string
          id: string
          idea_id: string
          last_sent_at: string
          next_due_date: string
          note: string
          origin_connection_wish_id: string
          origin_person_wish_id: string
          person_id: string
          pinned: boolean
          start_date: string
          status: string
          timezone: string
        }[]
      }
      user_locale: { Args: never; Returns: string }
      wish_category_id: { Args: { p_slug: string }; Returns: string }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const

