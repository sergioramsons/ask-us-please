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
      agent_availability: {
        Row: {
          id: string
          is_available: boolean
          max_tickets: number | null
          organization_id: string
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          id?: string
          is_available?: boolean
          max_tickets?: number | null
          organization_id: string
          updated_at?: string
          updated_by?: string | null
          user_id: string
        }
        Update: {
          id?: string
          is_available?: boolean
          max_tickets?: number | null
          organization_id?: string
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      agent_skills: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          skill_level: number | null
          skill_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          skill_level?: number | null
          skill_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          skill_level?: number | null
          skill_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      assignment_rules: {
        Row: {
          conditions: Json | null
          created_at: string
          department_id: string | null
          group_id: string | null
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
          group_id?: string | null
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
          group_id?: string | null
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
            foreignKeyName: "assignment_rules_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
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
      assignment_tracking: {
        Row: {
          assignment_method: string
          department_id: string | null
          group_id: string | null
          id: string
          last_assigned_user_id: string | null
          organization_id: string
          updated_at: string
        }
        Insert: {
          assignment_method?: string
          department_id?: string | null
          group_id?: string | null
          id?: string
          last_assigned_user_id?: string | null
          organization_id: string
          updated_at?: string
        }
        Update: {
          assignment_method?: string
          department_id?: string | null
          group_id?: string | null
          id?: string
          last_assigned_user_id?: string | null
          organization_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      auto_dialer_campaigns: {
        Row: {
          agent_extension: string | null
          completed_calls: number
          created_at: string
          current_index: number
          delay_seconds: number
          failed_calls: number
          id: string
          max_attempts: number
          name: string
          organization_id: string
          phone_numbers: string[]
          status: string
          successful_calls: number
          total_calls: number
          total_numbers: number
          updated_at: string
        }
        Insert: {
          agent_extension?: string | null
          completed_calls?: number
          created_at?: string
          current_index?: number
          delay_seconds?: number
          failed_calls?: number
          id?: string
          max_attempts?: number
          name: string
          organization_id: string
          phone_numbers?: string[]
          status?: string
          successful_calls?: number
          total_calls?: number
          total_numbers?: number
          updated_at?: string
        }
        Update: {
          agent_extension?: string | null
          completed_calls?: number
          created_at?: string
          current_index?: number
          delay_seconds?: number
          failed_calls?: number
          id?: string
          max_attempts?: number
          name?: string
          organization_id?: string
          phone_numbers?: string[]
          status?: string
          successful_calls?: number
          total_calls?: number
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
      companies: {
        Row: {
          address: string | null
          city: string | null
          country: string | null
          created_at: string
          email: string | null
          id: string
          industry: string | null
          name: string
          notes: string | null
          organization_id: string
          phone: string | null
          postal_code: string | null
          state: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          industry?: string | null
          name: string
          notes?: string | null
          organization_id: string
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          industry?: string | null
          name?: string
          notes?: string | null
          organization_id?: string
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      contacts: {
        Row: {
          address: string | null
          city: string | null
          company: string | null
          company_id: string | null
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
          company_id?: string | null
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
          company_id?: string | null
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
            foreignKeyName: "contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
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
      email_attachments: {
        Row: {
          content_type: string
          created_at: string
          email_id: string
          file_path: string | null
          filename: string
          id: string
          size_bytes: number
        }
        Insert: {
          content_type: string
          created_at?: string
          email_id: string
          file_path?: string | null
          filename: string
          id?: string
          size_bytes?: number
        }
        Update: {
          content_type?: string
          created_at?: string
          email_id?: string
          file_path?: string | null
          filename?: string
          id?: string
          size_bytes?: number
        }
        Relationships: []
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
      groups: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          manager_id: string | null
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          manager_id?: string | null
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          manager_id?: string | null
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: []
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
          recipient_email: string | null
          sender_email: string | null
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
          recipient_email?: string | null
          sender_email?: string | null
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
          recipient_email?: string | null
          sender_email?: string | null
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
          auto_assign_department: string | null
          auto_create_tickets: boolean
          auto_process: boolean
          check_interval: number
          check_interval_minutes: number
          created_at: string
          delete_after_process: boolean
          folder_name: string | null
          host: string
          id: string
          is_active: boolean
          last_check: string | null
          name: string
          organization_id: string
          password: string
          password_encrypted: boolean
          password_status: string | null
          port: number
          server_type: string
          updated_at: string
          use_ssl: boolean
          use_tls: boolean
          username: string
        }
        Insert: {
          auto_assign_department?: string | null
          auto_create_tickets?: boolean
          auto_process?: boolean
          check_interval?: number
          check_interval_minutes?: number
          created_at?: string
          delete_after_process?: boolean
          folder_name?: string | null
          host: string
          id?: string
          is_active?: boolean
          last_check?: string | null
          name: string
          organization_id: string
          password: string
          password_encrypted?: boolean
          password_status?: string | null
          port?: number
          server_type?: string
          updated_at?: string
          use_ssl?: boolean
          use_tls?: boolean
          username: string
        }
        Update: {
          auto_assign_department?: string | null
          auto_create_tickets?: boolean
          auto_process?: boolean
          check_interval?: number
          check_interval_minutes?: number
          created_at?: string
          delete_after_process?: boolean
          folder_name?: string | null
          host?: string
          id?: string
          is_active?: boolean
          last_check?: string | null
          name?: string
          organization_id?: string
          password?: string
          password_encrypted?: boolean
          password_status?: string | null
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
      organization_domains: {
        Row: {
          created_at: string
          domain: string
          id: string
          is_verified: boolean
          organization_id: string
          updated_at: string
          verification_token: string | null
        }
        Insert: {
          created_at?: string
          domain: string
          id?: string
          is_verified?: boolean
          organization_id: string
          updated_at?: string
          verification_token?: string | null
        }
        Update: {
          created_at?: string
          domain?: string
          id?: string
          is_verified?: boolean
          organization_id?: string
          updated_at?: string
          verification_token?: string | null
        }
        Relationships: []
      }
      organization_roles: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_admin_role: boolean | null
          is_default: boolean | null
          organization_id: string
          role_name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_admin_role?: boolean | null
          is_default?: boolean | null
          organization_id: string
          role_name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_admin_role?: boolean | null
          is_default?: boolean | null
          organization_id?: string
          role_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      organizations: {
        Row: {
          assignment_settings: Json | null
          created_at: string
          domain: string | null
          id: string
          max_users: number | null
          name: string
          settings: Json | null
          slug: string | null
          subdomain: string | null
          subscription_status: string | null
          updated_at: string
        }
        Insert: {
          assignment_settings?: Json | null
          created_at?: string
          domain?: string | null
          id?: string
          max_users?: number | null
          name: string
          settings?: Json | null
          slug?: string | null
          subdomain?: string | null
          subscription_status?: string | null
          updated_at?: string
        }
        Update: {
          assignment_settings?: Json | null
          created_at?: string
          domain?: string | null
          id?: string
          max_users?: number | null
          name?: string
          settings?: Json | null
          slug?: string | null
          subdomain?: string | null
          subscription_status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      permissions: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
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
      role_permissions: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          permission_id: string
          role_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          permission_id: string
          role_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "organization_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_comments: {
        Row: {
          contact_id: string | null
          content: string
          created_at: string
          email_id: string | null
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
          email_id?: string | null
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
          email_id?: string | null
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
            foreignKeyName: "ticket_comments_email_id_fkey"
            columns: ["email_id"]
            isOneToOne: false
            referencedRelation: "incoming_emails"
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
          cc_recipients: Json | null
          contact_id: string | null
          created_at: string
          created_by: string | null
          department_id: string | null
          description: string | null
          id: string
          organization_id: string | null
          priority: string
          required_skills: string[] | null
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
          cc_recipients?: Json | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          organization_id?: string | null
          priority?: string
          required_skills?: string[] | null
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
          cc_recipients?: Json | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          organization_id?: string | null
          priority?: string
          required_skills?: string[] | null
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
            foreignKeyName: "tickets_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
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
      user_groups: {
        Row: {
          created_at: string
          group_id: string
          id: string
          organization_id: string
          role_in_group: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          organization_id: string
          role_in_group?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          organization_id?: string
          role_in_group?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_groups_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
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
      incoming_mail_servers_secure: {
        Row: {
          auto_assign_department: string | null
          auto_create_tickets: boolean | null
          auto_process: boolean | null
          check_interval: number | null
          check_interval_minutes: number | null
          created_at: string | null
          delete_after_process: boolean | null
          folder_name: string | null
          host: string | null
          id: string | null
          is_active: boolean | null
          last_check: string | null
          name: string | null
          organization_id: string | null
          password: string | null
          password_encrypted: boolean | null
          password_status: string | null
          port: number | null
          server_type: string | null
          updated_at: string | null
          use_ssl: boolean | null
          use_tls: boolean | null
          username: string | null
        }
        Insert: {
          auto_assign_department?: string | null
          auto_create_tickets?: boolean | null
          auto_process?: boolean | null
          check_interval?: number | null
          check_interval_minutes?: number | null
          created_at?: string | null
          delete_after_process?: boolean | null
          folder_name?: string | null
          host?: string | null
          id?: string | null
          is_active?: boolean | null
          last_check?: string | null
          name?: string | null
          organization_id?: string | null
          password?: never
          password_encrypted?: boolean | null
          password_status?: string | null
          port?: number | null
          server_type?: string | null
          updated_at?: string | null
          use_ssl?: boolean | null
          use_tls?: boolean | null
          username?: string | null
        }
        Update: {
          auto_assign_department?: string | null
          auto_create_tickets?: boolean | null
          auto_process?: boolean | null
          check_interval?: number | null
          check_interval_minutes?: number | null
          created_at?: string | null
          delete_after_process?: boolean | null
          folder_name?: string | null
          host?: string | null
          id?: string | null
          is_active?: boolean | null
          last_check?: string | null
          name?: string | null
          organization_id?: string | null
          password?: never
          password_encrypted?: boolean | null
          password_status?: string | null
          port?: number | null
          server_type?: string | null
          updated_at?: string | null
          use_ssl?: boolean | null
          use_tls?: boolean | null
          username?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      auto_assign_ticket: {
        Args: { org_id: string; ticket_id_param: string }
        Returns: string
      }
      cleanup_mime_comment_content: {
        Args: Record<PropertyKey, never>
        Returns: {
          comment_id: string
          new_content: string
          old_content: string
        }[]
      }
      cleanup_mime_ticket_content: {
        Args: Record<PropertyKey, never>
        Returns: {
          new_content: string
          old_content: string
          ticket_id: string
        }[]
      }
      decrypt_server_password: {
        Args: { encrypted_password: string }
        Returns: string
      }
      delete_multiple_tickets: {
        Args: { ticket_ids: string[] }
        Returns: Json
      }
      delete_organization: {
        Args: { org_id: string }
        Returns: boolean
      }
      delete_ticket: {
        Args: { ticket_id_param: string }
        Returns: boolean
      }
      generate_ticket_number: {
        Args: { org_id: string }
        Returns: string
      }
      get_current_user_organization_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      is_organization_admin: {
        Args: { check_org_id: string; check_user_id: string }
        Returns: boolean
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
