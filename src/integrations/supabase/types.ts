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
          current_tickets: number | null
          department_id: string | null
          id: string
          is_available: boolean | null
          max_tickets: number | null
          organization_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          current_tickets?: number | null
          department_id?: string | null
          id?: string
          is_available?: boolean | null
          max_tickets?: number | null
          organization_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          current_tickets?: number | null
          department_id?: string | null
          id?: string
          is_available?: boolean | null
          max_tickets?: number | null
          organization_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_availability_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_availability_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_agent_availability_department_id"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_agent_availability_organization_id"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      assignment_rules: {
        Row: {
          created_at: string | null
          department_id: string | null
          id: string
          is_active: boolean | null
          organization_id: string | null
          priority_order: number | null
          rule_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          department_id?: string | null
          id?: string
          is_active?: boolean | null
          organization_id?: string | null
          priority_order?: number | null
          rule_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          department_id?: string | null
          id?: string
          is_active?: boolean | null
          organization_id?: string | null
          priority_order?: number | null
          rule_type?: string
          updated_at?: string | null
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
          agent_extension: string
          completed_at: string | null
          created_at: string
          created_by: string
          current_index: number
          delay_seconds: number
          failed_calls: number
          id: string
          name: string
          organization_id: string
          phone_numbers: string[]
          started_at: string | null
          status: string
          successful_calls: number
          total_calls: number
          updated_at: string
        }
        Insert: {
          agent_extension: string
          completed_at?: string | null
          created_at?: string
          created_by: string
          current_index?: number
          delay_seconds?: number
          failed_calls?: number
          id?: string
          name: string
          organization_id: string
          phone_numbers: string[]
          started_at?: string | null
          status?: string
          successful_calls?: number
          total_calls?: number
          updated_at?: string
        }
        Update: {
          agent_extension?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string
          current_index?: number
          delay_seconds?: number
          failed_calls?: number
          id?: string
          name?: string
          organization_id?: string
          phone_numbers?: string[]
          started_at?: string | null
          status?: string
          successful_calls?: number
          total_calls?: number
          updated_at?: string
        }
        Relationships: []
      }
      auto_dialer_results: {
        Row: {
          agent_extension: string | null
          call_duration: number | null
          call_id: string | null
          campaign_id: string
          connected_at: string | null
          created_at: string
          dialed_at: string
          disconnected_at: string | null
          error_message: string | null
          id: string
          phone_number: string
          status: string
        }
        Insert: {
          agent_extension?: string | null
          call_duration?: number | null
          call_id?: string | null
          campaign_id: string
          connected_at?: string | null
          created_at?: string
          dialed_at?: string
          disconnected_at?: string | null
          error_message?: string | null
          id?: string
          phone_number: string
          status: string
        }
        Update: {
          agent_extension?: string | null
          call_duration?: number | null
          call_id?: string | null
          campaign_id?: string
          connected_at?: string | null
          created_at?: string
          dialed_at?: string
          disconnected_at?: string | null
          error_message?: string | null
          id?: string
          phone_number?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "auto_dialer_results_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "auto_dialer_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          address: string | null
          city: string | null
          company: string | null
          country: string | null
          created_at: string
          created_by: string | null
          email: string
          first_name: string
          id: string
          job_title: string | null
          last_name: string
          notes: string | null
          organization_id: string | null
          phone: string | null
          postal_code: string | null
          state: string | null
          status: string | null
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
          email: string
          first_name: string
          id?: string
          job_title?: string | null
          last_name: string
          notes?: string | null
          organization_id?: string | null
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          status?: string | null
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
          email?: string
          first_name?: string
          id?: string
          job_title?: string | null
          last_name?: string
          notes?: string | null
          organization_id?: string | null
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          status?: string | null
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
          organization_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          manager_id?: string | null
          name: string
          organization_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          manager_id?: string | null
          name?: string
          organization_id?: string | null
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
          content_type: string | null
          created_at: string
          email_id: string
          file_path: string | null
          filename: string
          id: string
          size_bytes: number | null
        }
        Insert: {
          content_type?: string | null
          created_at?: string
          email_id: string
          file_path?: string | null
          filename: string
          id?: string
          size_bytes?: number | null
        }
        Update: {
          content_type?: string | null
          created_at?: string
          email_id?: string
          file_path?: string | null
          filename?: string
          id?: string
          size_bytes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "email_attachments_email_id_fkey"
            columns: ["email_id"]
            isOneToOne: false
            referencedRelation: "incoming_emails"
            referencedColumns: ["id"]
          },
        ]
      }
      email_server_audit: {
        Row: {
          action: string
          details: Json | null
          id: string
          ip_address: unknown | null
          performed_at: string | null
          performed_by: string | null
          server_id: string | null
        }
        Insert: {
          action: string
          details?: Json | null
          id?: string
          ip_address?: unknown | null
          performed_at?: string | null
          performed_by?: string | null
          server_id?: string | null
        }
        Update: {
          action?: string
          details?: Json | null
          id?: string
          ip_address?: unknown | null
          performed_at?: string | null
          performed_by?: string | null
          server_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_server_audit_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "email_servers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_server_audit_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "email_servers_secure"
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
          organization_id: string | null
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
          organization_id?: string | null
          password_encrypted?: boolean
          reply_to?: string | null
          sender_email: string
          sender_name?: string
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
          organization_id?: string | null
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
      incoming_emails: {
        Row: {
          body_html: string | null
          body_text: string | null
          created_at: string
          id: string
          message_id: string
          processed: boolean
          received_at: string
          recipient_email: string
          sender_email: string
          sender_name: string | null
          subject: string
          ticket_id: string | null
          updated_at: string
        }
        Insert: {
          body_html?: string | null
          body_text?: string | null
          created_at?: string
          id?: string
          message_id: string
          processed?: boolean
          received_at?: string
          recipient_email: string
          sender_email: string
          sender_name?: string | null
          subject: string
          ticket_id?: string | null
          updated_at?: string
        }
        Update: {
          body_html?: string | null
          body_text?: string | null
          created_at?: string
          id?: string
          message_id?: string
          processed?: boolean
          received_at?: string
          recipient_email?: string
          sender_email?: string
          sender_name?: string | null
          subject?: string
          ticket_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      incoming_mail_servers: {
        Row: {
          auto_assign_department: string | null
          auto_create_tickets: boolean
          auto_process: boolean
          check_interval: number
          created_at: string
          delete_after_process: boolean
          folder_name: string | null
          host: string
          id: string
          is_active: boolean
          last_check: string | null
          name: string
          organization_id: string | null
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
          created_at?: string
          delete_after_process?: boolean
          folder_name?: string | null
          host: string
          id?: string
          is_active?: boolean
          last_check?: string | null
          name: string
          organization_id?: string | null
          password: string
          password_encrypted?: boolean
          password_status?: string | null
          port?: number
          server_type: string
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
          created_at?: string
          delete_after_process?: boolean
          folder_name?: string | null
          host?: string
          id?: string
          is_active?: boolean
          last_check?: string | null
          name?: string
          organization_id?: string | null
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
        Relationships: [
          {
            foreignKeyName: "incoming_mail_servers_auto_assign_department_fkey"
            columns: ["auto_assign_department"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incoming_mail_servers_organization_id_fkey"
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
          role?: string
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
          dns_records: Json | null
          domain: string
          domain_type: string | null
          id: string
          is_primary: boolean
          is_verified: boolean
          organization_id: string
          subdomain_pattern: string | null
          updated_at: string
          wildcard_domain: string | null
        }
        Insert: {
          created_at?: string
          dns_records?: Json | null
          domain: string
          domain_type?: string | null
          id?: string
          is_primary?: boolean
          is_verified?: boolean
          organization_id: string
          subdomain_pattern?: string | null
          updated_at?: string
          wildcard_domain?: string | null
        }
        Update: {
          created_at?: string
          dns_records?: Json | null
          domain?: string
          domain_type?: string | null
          id?: string
          is_primary?: boolean
          is_verified?: boolean
          organization_id?: string
          subdomain_pattern?: string | null
          updated_at?: string
          wildcard_domain?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_domains_organization_id_fkey"
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
          logo_url: string | null
          max_tickets: number | null
          max_users: number | null
          name: string
          settings: Json | null
          slug: string
          subscription_status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          domain?: string | null
          id?: string
          logo_url?: string | null
          max_tickets?: number | null
          max_users?: number | null
          name: string
          settings?: Json | null
          slug: string
          subscription_status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          domain?: string | null
          id?: string
          logo_url?: string | null
          max_tickets?: number | null
          max_users?: number | null
          name?: string
          settings?: Json | null
          slug?: string
          subscription_status?: string | null
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
          content: string
          created_at: string
          created_by: string | null
          email_id: string | null
          id: string
          is_internal: boolean
          ticket_id: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          email_id?: string | null
          id?: string
          is_internal?: boolean
          ticket_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          email_id?: string | null
          id?: string
          is_internal?: boolean
          ticket_id?: string
          updated_at?: string
        }
        Relationships: [
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
          assigned_at: string | null
          assigned_to: string | null
          auto_assigned: boolean | null
          contact_id: string | null
          created_at: string
          created_by: string | null
          department_id: string | null
          description: string | null
          first_response_at: string | null
          id: string
          last_activity_at: string | null
          organization_id: string | null
          priority: string
          resolved_at: string | null
          status: string
          subject: string
          ticket_number: string
          transfer_reason: string | null
          transferred_from: string | null
          updated_at: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_to?: string | null
          auto_assigned?: boolean | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          first_response_at?: string | null
          id?: string
          last_activity_at?: string | null
          organization_id?: string | null
          priority?: string
          resolved_at?: string | null
          status?: string
          subject: string
          ticket_number: string
          transfer_reason?: string | null
          transferred_from?: string | null
          updated_at?: string
        }
        Update: {
          assigned_at?: string | null
          assigned_to?: string | null
          auto_assigned?: boolean | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          first_response_at?: string | null
          id?: string
          last_activity_at?: string | null
          organization_id?: string | null
          priority?: string
          resolved_at?: string | null
          status?: string
          subject?: string
          ticket_number?: string
          transfer_reason?: string | null
          transferred_from?: string | null
          updated_at?: string
        }
        Relationships: [
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
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      email_servers_secure: {
        Row: {
          created_at: string | null
          id: string | null
          is_active: boolean | null
          name: string | null
          password_encrypted: boolean | null
          password_status: string | null
          reply_to: string | null
          sender_email: string | null
          sender_name: string | null
          smtp_host: string | null
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
          password_encrypted?: boolean | null
          password_status?: never
          reply_to?: string | null
          sender_email?: string | null
          sender_name?: string | null
          smtp_host?: string | null
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
          password_encrypted?: boolean | null
          password_status?: never
          reply_to?: string | null
          sender_email?: string | null
          sender_name?: string | null
          smtp_host?: string | null
          smtp_port?: number | null
          smtp_username?: string | null
          updated_at?: string | null
          use_tls?: boolean | null
        }
        Relationships: []
      }
      incoming_mail_servers_secure: {
        Row: {
          auto_assign_department: string | null
          auto_create_tickets: boolean | null
          auto_process: boolean | null
          check_interval: number | null
          created_at: string | null
          delete_after_process: boolean | null
          folder_name: string | null
          host: string | null
          id: string | null
          is_active: boolean | null
          last_check: string | null
          name: string | null
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
          created_at?: string | null
          delete_after_process?: boolean | null
          folder_name?: string | null
          host?: string | null
          id?: string | null
          is_active?: boolean | null
          last_check?: string | null
          name?: string | null
          password_encrypted?: boolean | null
          password_status?: never
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
          created_at?: string | null
          delete_after_process?: boolean | null
          folder_name?: string | null
          host?: string | null
          id?: string | null
          is_active?: boolean | null
          last_check?: string | null
          name?: string | null
          password_encrypted?: boolean | null
          password_status?: never
          port?: number | null
          server_type?: string | null
          updated_at?: string | null
          use_ssl?: boolean | null
          use_tls?: boolean | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incoming_mail_servers_auto_assign_department_fkey"
            columns: ["auto_assign_department"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      auto_assign_ticket: {
        Args: { ticket_id: string }
        Returns: string
      }
      current_user_has_role: {
        Args: { _role: Database["public"]["Enums"]["app_role"] }
        Returns: boolean
      }
      decrypt_server_password: {
        Args: { encrypted_password: string }
        Returns: string
      }
      delete_ticket: {
        Args: { p_ticket_id: string }
        Returns: boolean
      }
      encrypt_server_password: {
        Args: { plain_password: string }
        Returns: string
      }
      generate_ticket_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_current_user_roles: {
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["Enums"]["app_role"][]
      }
      get_user_department: {
        Args: { user_id: string }
        Returns: string
      }
      get_user_organization: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_organization_admin: {
        Args: { org_id?: string }
        Returns: boolean
      }
      is_password_encrypted: {
        Args: { server_id: string }
        Returns: boolean
      }
      is_super_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      make_super_admin: {
        Args: { user_email: string }
        Returns: undefined
      }
      migrate_email_server_passwords: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      password_appears_encrypted: {
        Args: { password_text: string }
        Returns: boolean
      }
      resolve_organization_by_subdomain: {
        Args: { hostname: string }
        Returns: string
      }
      transfer_ticket: {
        Args: {
          new_agent_id: string
          ticket_id: string
          transfer_reason?: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
