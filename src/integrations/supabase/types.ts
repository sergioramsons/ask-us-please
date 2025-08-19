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
      assignment_rules: {
        Row: {
          conditions: Json | null
          created_at: string
          department_id: string | null
          id: string
          is_active: boolean
          organization_id: string
          priority_order: number
          rule_type: string
          updated_at: string
        }
        Insert: {
          conditions?: Json | null
          created_at?: string
          department_id?: string | null
          id?: string
          is_active?: boolean
          organization_id: string
          priority_order?: number
          rule_type: string
          updated_at?: string
        }
        Update: {
          conditions?: Json | null
          created_at?: string
          department_id?: string | null
          id?: string
          is_active?: boolean
          organization_id?: string
          priority_order?: number
          rule_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignment_rules_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      auto_dialer_campaigns: {
        Row: {
          agent_extension: string | null
          completed_calls: number
          created_at: string
          delay_seconds: number
          failed_calls: number
          id: string
          max_attempts: number
          name: string
          organization_id: string
          phone_numbers: string[]
          status: string
          successful_calls: number
          total_numbers: number
          updated_at: string
        }
        Insert: {
          agent_extension?: string | null
          completed_calls?: number
          created_at?: string
          delay_seconds?: number
          failed_calls?: number
          id?: string
          max_attempts?: number
          name: string
          organization_id: string
          phone_numbers?: string[]
          status?: string
          successful_calls?: number
          total_numbers?: number
          updated_at?: string
        }
        Update: {
          agent_extension?: string | null
          completed_calls?: number
          created_at?: string
          delay_seconds?: number
          failed_calls?: number
          id?: string
          max_attempts?: number
          name?: string
          organization_id?: string
          phone_numbers?: string[]
          status?: string
          successful_calls?: number
          total_numbers?: number
          updated_at?: string
        }
        Relationships: []
      }
      auto_dialer_results: {
        Row: {
          attempt_number: number
          campaign_id: string
          completed_at: string | null
          created_at: string
          dialed_at: string | null
          id: string
          phone_number: string
          result_data: Json | null
          status: string
        }
        Insert: {
          attempt_number?: number
          campaign_id: string
          completed_at?: string | null
          created_at?: string
          dialed_at?: string | null
          id?: string
          phone_number: string
          result_data?: Json | null
          status?: string
        }
        Update: {
          attempt_number?: number
          campaign_id?: string
          completed_at?: string | null
          created_at?: string
          dialed_at?: string | null
          id?: string
          phone_number?: string
          result_data?: Json | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_auto_dialer_results_campaign"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "auto_dialer_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
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
          address: string | null
          city: string | null
          company: string | null
          country: string | null
          created_at: string
          created_by: string | null
          email: string | null
          first_name: string | null
          id: string
          job_title: string | null
          last_name: string | null
          name: string
          notes: string | null
          organization_id: string | null
          phone: string | null
          postal_code: string | null
          state: string | null
          status: string
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          company?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          job_title?: string | null
          last_name?: string | null
          name: string
          notes?: string | null
          organization_id?: string | null
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          status?: string
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          company?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          job_title?: string | null
          last_name?: string | null
          name?: string
          notes?: string | null
          organization_id?: string | null
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          status?: string
          tags?: string[] | null
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
      departments: {
        Row: {
          created_at: string
          description: string | null
          id: string
          manager_id: string | null
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          manager_id?: string | null
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          manager_id?: string | null
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      email_servers: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          organization_id: string
          password_encrypted: boolean
          reply_to: string | null
          sender_email: string
          sender_name: string
          smtp_host: string
          smtp_password: string
          smtp_port: number
          smtp_username: string
          updated_at: string
          use_tls: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          password_encrypted?: boolean
          reply_to?: string | null
          sender_email: string
          sender_name: string
          smtp_host: string
          smtp_password: string
          smtp_port?: number
          smtp_username: string
          updated_at?: string
          use_tls?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          password_encrypted?: boolean
          reply_to?: string | null
          sender_email?: string
          sender_name?: string
          smtp_host?: string
          smtp_password?: string
          smtp_port?: number
          smtp_username?: string
          updated_at?: string
          use_tls?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "email_servers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          body_html: string
          body_text: string | null
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          organization_id: string
          subject: string
          template_type: string
          updated_at: string
          variables: Json | null
        }
        Insert: {
          body_html: string
          body_text?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          subject: string
          template_type: string
          updated_at?: string
          variables?: Json | null
        }
        Update: {
          body_html?: string
          body_text?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          subject?: string
          template_type?: string
          updated_at?: string
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "email_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      incoming_emails: {
        Row: {
          attachments: Json | null
          body_html: string | null
          body_text: string | null
          created_at: string
          email_server_id: string | null
          from_email: string
          from_name: string | null
          headers: Json | null
          id: string
          message_id: string
          organization_id: string
          processed: boolean
          processed_at: string | null
          processing_error: string | null
          raw_email: string | null
          received_at: string
          subject: string
          ticket_id: string | null
          to_email: string
        }
        Insert: {
          attachments?: Json | null
          body_html?: string | null
          body_text?: string | null
          created_at?: string
          email_server_id?: string | null
          from_email: string
          from_name?: string | null
          headers?: Json | null
          id?: string
          message_id: string
          organization_id: string
          processed?: boolean
          processed_at?: string | null
          processing_error?: string | null
          raw_email?: string | null
          received_at: string
          subject: string
          ticket_id?: string | null
          to_email: string
        }
        Update: {
          attachments?: Json | null
          body_html?: string | null
          body_text?: string | null
          created_at?: string
          email_server_id?: string | null
          from_email?: string
          from_name?: string | null
          headers?: Json | null
          id?: string
          message_id?: string
          organization_id?: string
          processed?: boolean
          processed_at?: string | null
          processing_error?: string | null
          raw_email?: string | null
          received_at?: string
          subject?: string
          ticket_id?: string | null
          to_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "incoming_emails_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incoming_emails_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      incoming_mail_servers: {
        Row: {
          check_interval_minutes: number
          created_at: string
          host: string
          id: string
          is_active: boolean
          last_check: string | null
          name: string
          organization_id: string
          password: string
          password_encrypted: boolean
          port: number
          server_type: string
          updated_at: string
          use_ssl: boolean
          use_tls: boolean
          username: string
        }
        Insert: {
          check_interval_minutes?: number
          created_at?: string
          host: string
          id?: string
          is_active?: boolean
          last_check?: string | null
          name: string
          organization_id: string
          password: string
          password_encrypted?: boolean
          port?: number
          server_type?: string
          updated_at?: string
          use_ssl?: boolean
          use_tls?: boolean
          username: string
        }
        Update: {
          check_interval_minutes?: number
          created_at?: string
          host?: string
          id?: string
          is_active?: boolean
          last_check?: string | null
          name?: string
          organization_id?: string
          password?: string
          password_encrypted?: boolean
          port?: number
          server_type?: string
          updated_at?: string
          use_ssl?: boolean
          use_tls?: boolean
          username?: string
        }
        Relationships: []
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
          department_id: string | null
          display_name: string | null
          email: string | null
          id: string
          organization_id: string | null
          role: string | null
          signature: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          department_id?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          organization_id?: string | null
          role?: string | null
          signature?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          department_id?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          organization_id?: string | null
          role?: string | null
          signature?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
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
      email_servers_secure: {
        Row: {
          created_at: string | null
          id: string | null
          is_active: boolean | null
          name: string | null
          organization_id: string | null
          password_encrypted: boolean | null
          password_status: string | null
          reply_to: string | null
          sender_email: string | null
          sender_name: string | null
          smtp_host: string | null
          smtp_password: string | null
          smtp_port: number | null
          smtp_username: string | null
          updated_at: string | null
          use_tls: boolean | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          is_active?: boolean | null
          name?: string | null
          organization_id?: string | null
          password_encrypted?: boolean | null
          password_status?: never
          reply_to?: string | null
          sender_email?: string | null
          sender_name?: string | null
          smtp_host?: string | null
          smtp_password?: never
          smtp_port?: number | null
          smtp_username?: string | null
          updated_at?: string | null
          use_tls?: boolean | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          is_active?: boolean | null
          name?: string | null
          organization_id?: string | null
          password_encrypted?: boolean | null
          password_status?: never
          reply_to?: string | null
          sender_email?: string | null
          sender_name?: string | null
          smtp_host?: string | null
          smtp_password?: never
          smtp_port?: number | null
          smtp_username?: string | null
          updated_at?: string | null
          use_tls?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "email_servers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
      migrate_email_server_passwords: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          migration_status: string
          organization_id: string
        }[]
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
