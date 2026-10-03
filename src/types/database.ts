export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          created_at: string
          description: string
          icon_key: string
          id: string
          is_active: boolean
          is_hidden: boolean
          name: string
          rarity: Database["public"]["Enums"]["achievement_rarity"]
          reward_title_id: string | null
          rule_config: Json
          rule_type: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          icon_key: string
          id?: string
          is_active?: boolean
          is_hidden?: boolean
          name: string
          rarity?: Database["public"]["Enums"]["achievement_rarity"]
          reward_title_id?: string | null
          rule_config?: Json
          rule_type: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          icon_key?: string
          id?: string
          is_active?: boolean
          is_hidden?: boolean
          name?: string
          rarity?: Database["public"]["Enums"]["achievement_rarity"]
          reward_title_id?: string | null
          rule_config?: Json
          rule_type?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "achievements_reward_title_id_fkey"
            columns: ["reward_title_id"]
            isOneToOne: false
            referencedRelation: "titles"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_logs: {
        Row: {
          attribute_id: string
          category_id: string
          client_request_id: string
          created_at: string
          duration_minutes: number | null
          id: string
          note: string | null
          occurred_at: string
          private_reflection: string | null
          reversed_at: string | null
          source: Database["public"]["Enums"]["xp_source"]
          status: Database["public"]["Enums"]["activity_status"]
          template_id: string | null
          template_name_snapshot: string
          updated_at: string
          user_id: string
          xp_tier_snapshot: Database["public"]["Enums"]["xp_tier"]
          xp_value_snapshot: number
        }
        Insert: {
          attribute_id: string
          category_id: string
          client_request_id: string
          created_at?: string
          duration_minutes?: number | null
          id?: string
          note?: string | null
          occurred_at?: string
          private_reflection?: string | null
          reversed_at?: string | null
          source: Database["public"]["Enums"]["xp_source"]
          status?: Database["public"]["Enums"]["activity_status"]
          template_id?: string | null
          template_name_snapshot: string
          updated_at?: string
          user_id: string
          xp_tier_snapshot: Database["public"]["Enums"]["xp_tier"]
          xp_value_snapshot: number
        }
        Update: {
          attribute_id?: string
          category_id?: string
          client_request_id?: string
          created_at?: string
          duration_minutes?: number | null
          id?: string
          note?: string | null
          occurred_at?: string
          private_reflection?: string | null
          reversed_at?: string | null
          source?: Database["public"]["Enums"]["xp_source"]
          status?: Database["public"]["Enums"]["activity_status"]
          template_id?: string | null
          template_name_snapshot?: string
          updated_at?: string
          user_id?: string
          xp_tier_snapshot?: Database["public"]["Enums"]["xp_tier"]
          xp_value_snapshot?: number
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_attribute_id_fkey"
            columns: ["attribute_id"]
            isOneToOne: false
            referencedRelation: "attributes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "activity_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_templates: {
        Row: {
          attribute_id: string
          category_id: string
          created_at: string
          default_duration_minutes: number | null
          description: string | null
          icon_key: string
          id: string
          is_archived: boolean
          name: string
          owner_user_id: string | null
          updated_at: string
          xp_tier: Database["public"]["Enums"]["xp_tier"]
          xp_value: number
        }
        Insert: {
          attribute_id: string
          category_id: string
          created_at?: string
          default_duration_minutes?: number | null
          description?: string | null
          icon_key: string
          id?: string
          is_archived?: boolean
          name: string
          owner_user_id?: string | null
          updated_at?: string
          xp_tier: Database["public"]["Enums"]["xp_tier"]
          xp_value: number
        }
        Update: {
          attribute_id?: string
          category_id?: string
          created_at?: string
          default_duration_minutes?: number | null
          description?: string | null
          icon_key?: string
          id?: string
          is_archived?: boolean
          name?: string
          owner_user_id?: string | null
          updated_at?: string
          xp_tier?: Database["public"]["Enums"]["xp_tier"]
          xp_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "activity_templates_attribute_id_fkey"
            columns: ["attribute_id"]
            isOneToOne: false
            referencedRelation: "attributes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_templates_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_templates_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      attributes: {
        Row: {
          category_id: string
          created_at: string
          description: string
          icon_key: string
          id: string
          is_active: boolean
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          description: string
          icon_key: string
          id?: string
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          description?: string
          icon_key?: string
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attributes_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          color_token: string
          created_at: string
          description: string
          icon_key: string
          id: string
          is_active: boolean
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          color_token: string
          created_at?: string
          description: string
          icon_key: string
          id?: string
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          color_token?: string
          created_at?: string
          description?: string
          icon_key?: string
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      level_thresholds: {
        Row: {
          created_at: string
          cumulative_xp: number
          level: number
          required_for_next_level: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          cumulative_xp: number
          level: number
          required_for_next_level: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          cumulative_xp?: number
          level?: number
          required_for_next_level?: number
          updated_at?: string
        }
        Relationships: []
      }
      profile_progress: {
        Row: {
          achievement_count: number
          activity_count: number
          current_level: number
          distinct_active_days: number
          total_xp: number
          updated_at: string
          user_id: string
        }
        Insert: {
          achievement_count?: number
          activity_count?: number
          current_level?: number
          distinct_active_days?: number
          total_xp?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          achievement_count?: number
          activity_count?: number
          current_level?: number
          distinct_active_days?: number
          total_xp?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          emblem_key: string
          equipped_title_id: string | null
          handle: string
          haptics_enabled: boolean
          id: string
          onboarding_completed: boolean
          reduced_motion: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name: string
          emblem_key?: string
          equipped_title_id?: string | null
          handle: string
          haptics_enabled?: boolean
          id: string
          onboarding_completed?: boolean
          reduced_motion?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          emblem_key?: string
          equipped_title_id?: string | null
          handle?: string
          haptics_enabled?: boolean
          id?: string
          onboarding_completed?: boolean
          reduced_motion?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_equipped_title_id_fkey"
            columns: ["equipped_title_id"]
            isOneToOne: false
            referencedRelation: "titles"
            referencedColumns: ["id"]
          },
        ]
      }
      titles: {
        Row: {
          created_at: string
          description: string
          icon_key: string | null
          id: string
          is_active: boolean
          name: string
          rarity: Database["public"]["Enums"]["achievement_rarity"]
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          icon_key?: string | null
          id?: string
          is_active?: boolean
          name: string
          rarity?: Database["public"]["Enums"]["achievement_rarity"]
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          icon_key?: string | null
          id?: string
          is_active?: boolean
          name?: string
          rarity?: Database["public"]["Enums"]["achievement_rarity"]
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_id: string
          trigger_activity_log_id: string | null
          unlocked_at: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          trigger_activity_log_id?: string | null
          unlocked_at?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          trigger_activity_log_id?: string | null
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_achievements_trigger_activity_log_id_fkey"
            columns: ["trigger_activity_log_id"]
            isOneToOne: false
            referencedRelation: "activity_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_attributes: {
        Row: {
          attribute_id: string
          created_at: string
          current_level: number
          total_xp: number
          updated_at: string
          user_id: string
        }
        Insert: {
          attribute_id: string
          created_at?: string
          current_level?: number
          total_xp?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          attribute_id?: string
          created_at?: string
          current_level?: number
          total_xp?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_attributes_attribute_id_fkey"
            columns: ["attribute_id"]
            isOneToOne: false
            referencedRelation: "attributes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_attributes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_categories: {
        Row: {
          category_id: string
          created_at: string
          current_level: number
          is_selected: boolean
          sort_order: number
          total_xp: number
          updated_at: string
          user_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          current_level?: number
          is_selected?: boolean
          sort_order?: number
          total_xp?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          current_level?: number
          is_selected?: boolean
          sort_order?: number
          total_xp?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_categories_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_template_preferences: {
        Row: {
          created_at: string
          is_favorite: boolean
          last_used_at: string | null
          template_id: string
          updated_at: string
          use_count: number
          user_id: string
        }
        Insert: {
          created_at?: string
          is_favorite?: boolean
          last_used_at?: string | null
          template_id: string
          updated_at?: string
          use_count?: number
          user_id: string
        }
        Update: {
          created_at?: string
          is_favorite?: boolean
          last_used_at?: string | null
          template_id?: string
          updated_at?: string
          use_count?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_template_preferences_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "activity_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_template_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_titles: {
        Row: {
          source_achievement_id: string | null
          title_id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          source_achievement_id?: string | null
          title_id: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          source_achievement_id?: string | null
          title_id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_titles_source_achievement_id_fkey"
            columns: ["source_achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_titles_title_id_fkey"
            columns: ["title_id"]
            isOneToOne: false
            referencedRelation: "titles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_titles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      xp_ledger: {
        Row: {
          activity_log_id: string
          amount: number
          attribute_id: string
          category_id: string
          created_at: string
          event_type: Database["public"]["Enums"]["xp_event_type"]
          id: string
          metadata: Json
          source: Database["public"]["Enums"]["xp_source"]
          user_id: string
        }
        Insert: {
          activity_log_id: string
          amount: number
          attribute_id: string
          category_id: string
          created_at?: string
          event_type: Database["public"]["Enums"]["xp_event_type"]
          id?: string
          metadata?: Json
          source: Database["public"]["Enums"]["xp_source"]
          user_id: string
        }
        Update: {
          activity_log_id?: string
          amount?: number
          attribute_id?: string
          category_id?: string
          created_at?: string
          event_type?: Database["public"]["Enums"]["xp_event_type"]
          id?: string
          metadata?: Json
          source?: Database["public"]["Enums"]["xp_source"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "xp_ledger_activity_log_id_fkey"
            columns: ["activity_log_id"]
            isOneToOne: false
            referencedRelation: "activity_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "xp_ledger_attribute_id_fkey"
            columns: ["attribute_id"]
            isOneToOne: false
            referencedRelation: "attributes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "xp_ledger_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "xp_ledger_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      complete_onboarding: {
        Args: {
          p_category_ids: string[]
          p_display_name: string
          p_emblem_key: string
          p_handle: string
          p_template_ids?: string[]
        }
        Returns: string
      }
      equip_title: { Args: { p_title_id: string }; Returns: undefined }
      evaluate_achievement_rule: {
        Args: {
          p_character_level: number
          p_distinct_active_days: number
          p_profile_total_xp: number
          p_rule_config: Json
          p_rule_type: string
          p_template_attribute_id: string
          p_template_category_id: string
          p_template_category_slug: string
          p_template_xp_tier: Database["public"]["Enums"]["xp_tier"]
          p_total_activity_count: number
          p_user_id: string
        }
        Returns: boolean
      }
      level_from_total_xp: { Args: { p_total_xp: number }; Returns: number }
      log_activity: {
        Args: {
          p_client_request_id?: string
          p_duration_minutes?: number
          p_note?: string
          p_occurred_at?: string
          p_private_reflection?: string
          p_template_id: string
        }
        Returns: Json
      }
      reverse_activity: { Args: { p_activity_id: string }; Returns: Json }
      xp_for_tier: {
        Args: { p_tier: Database["public"]["Enums"]["xp_tier"] }
        Returns: number
      }
      xp_required_for_next_level: { Args: { p_level: number }; Returns: number }
    }
    Enums: {
      achievement_rarity: "common" | "rare" | "epic" | "legendary"
      activity_status: "active" | "reversed"
      xp_event_type:
        | "activity_award"
        | "activity_reversal"
        | "migration_adjustment"
      xp_source:
        | "system_template"
        | "custom_template"
        | "reversal"
        | "manual_adjustment"
      xp_tier: "quick" | "focused" | "challenging" | "milestone" | "major"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      achievement_rarity: ["common", "rare", "epic", "legendary"],
      activity_status: ["active", "reversed"],
      xp_event_type: [
        "activity_award",
        "activity_reversal",
        "migration_adjustment",
      ],
      xp_source: [
        "system_template",
        "custom_template",
        "reversal",
        "manual_adjustment",
      ],
      xp_tier: ["quick", "focused", "challenging", "milestone", "major"],
    },
  },
} as const

