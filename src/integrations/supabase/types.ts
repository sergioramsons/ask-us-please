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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      call_daily_metrics: {
        Row: {
          answered: number
          metric_date: string
          missed: number
          total_calls: number
          updated_at: string
        }
        Insert: {
          answered?: number
          metric_date: string
          missed?: number
          total_calls?: number
          updated_at?: string
        }
        Update: {
          answered?: number
          metric_date?: string
          missed?: number
          total_calls?: number
          updated_at?: string
        }
        Relationships: []
      }
      call_log_resets: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          reset_at: string
          reset_type: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          reset_at?: string
          reset_type?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          reset_at?: string
          reset_type?: string
        }
        Relationships: []
      }
      call_seen: {
        Row: {
          active: boolean
          answered: boolean
          call_uid: string
          first_seen: string
          id: string
          last_seen: string
          last_status: string | null
          seen_date: string
        }
        Insert: {
          active?: boolean
          answered?: boolean
          call_uid: string
          first_seen?: string
          id?: string
          last_seen?: string
          last_status?: string | null
          seen_date: string
        }
        Update: {
          active?: boolean
          answered?: boolean
          call_uid?: string
          first_seen?: string
          id?: string
          last_seen?: string
          last_status?: string | null
          seen_date?: string
        }
        Relationships: []
      }
      callcent_queuecalls: {
        Row: {
          call_history_id: string
          count_dialed: number | null
          count_polls: number | null
          count_rejected: number | null
          created_at: string
          from_userpart: string
          id: string
          is_agent: boolean | null
          q_num: string
          time_end: string | null
          time_start: string
          ts_locating: unknown | null
          ts_polling: unknown | null
          ts_servicing: unknown | null
          ts_waiting: unknown | null
          updated_at: string
        }
        Insert: {
          call_history_id: string
          count_dialed?: number | null
          count_polls?: number | null
          count_rejected?: number | null
          created_at?: string
          from_userpart: string
          id?: string
          is_agent?: boolean | null
          q_num: string
          time_end?: string | null
          time_start: string
          ts_locating?: unknown | null
          ts_polling?: unknown | null
          ts_servicing?: unknown | null
          ts_waiting?: unknown | null
          updated_at?: string
        }
        Update: {
          call_history_id?: string
          count_dialed?: number | null
          count_polls?: number | null
          count_rejected?: number | null
          created_at?: string
          from_userpart?: string
          id?: string
          is_agent?: boolean | null
          q_num?: string
          time_end?: string | null
          time_start?: string
          ts_locating?: unknown | null
          ts_polling?: unknown | null
          ts_servicing?: unknown | null
          ts_waiting?: unknown | null
          updated_at?: string
        }
        Relationships: []
      }
      contacts: {
        Row: {
          company: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          organization_id: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          organization_id?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          organization_id?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_admins: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_admins_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          domain: string | null
          id: string
          name: string
          settings: Json | null
          subdomain: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          domain?: string | null
          id?: string
          name: string
          settings?: Json | null
          subdomain?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          domain?: string | null
          id?: string
          name?: string
          settings?: Json | null
          subdomain?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          organization_id: string | null
          role: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          organization_id?: string | null
          role?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          organization_id?: string | null
          role?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_comments: {
        Row: {
          contact_id: string | null
          content: string
          created_at: string
          id: string
          is_internal: boolean | null
          ticket_id: string
          user_id: string | null
          voice_comment: Json | null
        }
        Insert: {
          contact_id?: string | null
          content: string
          created_at?: string
          id?: string
          is_internal?: boolean | null
          ticket_id: string
          user_id?: string | null
          voice_comment?: Json | null
        }
        Update: {
          contact_id?: string | null
          content?: string
          created_at?: string
          id?: string
          is_internal?: boolean | null
          ticket_id?: string
          user_id?: string | null
          voice_comment?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_comments_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_comments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          assigned_to: string | null
          category: string | null
          contact_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          organization_id: string | null
          priority: string
          resolved_at: string | null
          status: string
          subject: string
          tags: string[] | null
          ticket_number: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          category?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          organization_id?: string | null
          priority?: string
          resolved_at?: string | null
          status?: string
          subject: string
          tags?: string[] | null
          ticket_number: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          category?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          organization_id?: string | null
          priority?: string
          resolved_at?: string | null
          status?: string
          subject?: string
          tags?: string[] | null
          ticket_number?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          organization_id: string | null
          permissions: Json | null
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id?: string | null
          permissions?: Json | null
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string | null
          permissions?: Json | null
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      callcent_aggregated_calls: {
        Row: {
          agg_queues: string | null
          call_history_id: string | null
          count_dialed: number | null
          count_polls: number | null
          count_rejected: number | null
          from_userpart: string | null
          is_agent: boolean | null
          polling_time: string | null
          time_end: string | null
          time_start: string | null
          total_time: string | null
          ts_locating_seconds: number | null
          ts_polling_seconds: number | null
          ts_servicing_seconds: number | null
          ts_waiting_seconds: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      delete_ticket: {
        Args: { ticket_id_param: string }
        Returns: boolean
      }
      generate_ticket_number: {
        Args: { org_id: string }
        Returns: string
      }
      resolve_organization_by_subdomain: {
        Args: { hostname: string }
        Returns: string
      }
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
