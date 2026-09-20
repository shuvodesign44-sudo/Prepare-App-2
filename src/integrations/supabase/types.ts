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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      contest_participants: {
        Row: {
          accuracy: number
          answers: Json
          contest_id: string
          correct_count: number
          created_at: string
          display_name: string
          disqualified: boolean
          id: string
          joined_at: string
          question_order: number[]
          score: number
          submitted_at: string | null
          time_bonus: number
          updated_at: string
          user_id: string
          wrong_count: number
          xp: number
        }
        Insert: {
          accuracy?: number
          answers?: Json
          contest_id: string
          correct_count?: number
          created_at?: string
          display_name?: string
          disqualified?: boolean
          id?: string
          joined_at?: string
          question_order?: number[]
          score?: number
          submitted_at?: string | null
          time_bonus?: number
          updated_at?: string
          user_id: string
          wrong_count?: number
          xp?: number
        }
        Update: {
          accuracy?: number
          answers?: Json
          contest_id?: string
          correct_count?: number
          created_at?: string
          display_name?: string
          disqualified?: boolean
          id?: string
          joined_at?: string
          question_order?: number[]
          score?: number
          submitted_at?: string | null
          time_bonus?: number
          updated_at?: string
          user_id?: string
          wrong_count?: number
          xp?: number
        }
        Relationships: [
          {
            foreignKeyName: "contest_participants_contest_id_fkey"
            columns: ["contest_id"]
            isOneToOne: false
            referencedRelation: "contests"
            referencedColumns: ["id"]
          },
        ]
      }
      contests: {
        Row: {
          contest_type: string
          created_at: string
          created_by: string | null
          difficulty: string
          duration_seconds: number
          exam_category: string
          id: string
          is_private: boolean
          language: string
          negative_marking: number
          prize: string
          question_count: number
          questions: Json
          randomize_options: boolean
          randomize_questions: boolean
          room_code: string | null
          starts_at: string
          status: string
          subject: string
          time_bonus: boolean
          title: string
          updated_at: string
        }
        Insert: {
          contest_type?: string
          created_at?: string
          created_by?: string | null
          difficulty?: string
          duration_seconds?: number
          exam_category?: string
          id?: string
          is_private?: boolean
          language?: string
          negative_marking?: number
          prize?: string
          question_count?: number
          questions?: Json
          randomize_options?: boolean
          randomize_questions?: boolean
          room_code?: string | null
          starts_at?: string
          status?: string
          subject?: string
          time_bonus?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          contest_type?: string
          created_at?: string
          created_by?: string | null
          difficulty?: string
          duration_seconds?: number
          exam_category?: string
          id?: string
          is_private?: boolean
          language?: string
          negative_marking?: number
          prize?: string
          question_count?: number
          questions?: Json
          randomize_options?: boolean
          randomize_questions?: boolean
          room_code?: string | null
          starts_at?: string
          status?: string
          subject?: string
          time_bonus?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      cover_letters: {
        Row: {
          company: string
          content: string
          created_at: string
          id: string
          job_description: string
          position: string
          tone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company?: string
          content?: string
          created_at?: string
          id?: string
          job_description?: string
          position?: string
          tone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company?: string
          content?: string
          created_at?: string
          id?: string
          job_description?: string
          position?: string
          tone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_activity: {
        Row: {
          activity_date: string
          created_at: string
          id: string
          lessons_completed: number
          minutes: number
          user_id: string
          xp: number
        }
        Insert: {
          activity_date?: string
          created_at?: string
          id?: string
          lessons_completed?: number
          minutes?: number
          user_id: string
          xp?: number
        }
        Update: {
          activity_date?: string
          created_at?: string
          id?: string
          lessons_completed?: number
          minutes?: number
          user_id?: string
          xp?: number
        }
        Relationships: []
      }
      mcq_attempts: {
        Row: {
          answers: Json
          category: string
          completed: boolean
          created_at: string
          difficulty: string
          duration_seconds: number
          id: string
          language: string
          questions: Json
          score: number
          total: number
          updated_at: string
          user_id: string
          weak_topics: string[]
        }
        Insert: {
          answers?: Json
          category: string
          completed?: boolean
          created_at?: string
          difficulty?: string
          duration_seconds?: number
          id?: string
          language?: string
          questions?: Json
          score?: number
          total?: number
          updated_at?: string
          user_id: string
          weak_topics?: string[]
        }
        Update: {
          answers?: Json
          category?: string
          completed?: boolean
          created_at?: string
          difficulty?: string
          duration_seconds?: number
          id?: string
          language?: string
          questions?: Json
          score?: number
          total?: number
          updated_at?: string
          user_id?: string
          weak_topics?: string[]
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          kind: string
          link: string
          read_at: string | null
          title: string
          user_id: string | null
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          kind?: string
          link?: string
          read_at?: string | null
          title: string
          user_id?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          kind?: string
          link?: string
          read_at?: string | null
          title?: string
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          coins: number
          content_language: string
          created_at: string
          daily_minutes: number
          display_name: string | null
          exam_date: string | null
          goal: string | null
          id: string
          last_active_date: string | null
          level: string | null
          onboarded: boolean
          streak: number
          target_exam: string | null
          updated_at: string
          weekly_goal_minutes: number
          xp: number
        }
        Insert: {
          coins?: number
          content_language?: string
          created_at?: string
          daily_minutes?: number
          display_name?: string | null
          exam_date?: string | null
          goal?: string | null
          id: string
          last_active_date?: string | null
          level?: string | null
          onboarded?: boolean
          streak?: number
          target_exam?: string | null
          updated_at?: string
          weekly_goal_minutes?: number
          xp?: number
        }
        Update: {
          coins?: number
          content_language?: string
          created_at?: string
          daily_minutes?: number
          display_name?: string | null
          exam_date?: string | null
          goal?: string | null
          id?: string
          last_active_date?: string | null
          level?: string | null
          onboarded?: boolean
          streak?: number
          target_exam?: string | null
          updated_at?: string
          weekly_goal_minutes?: number
          xp?: number
        }
        Relationships: []
      }
      question_bookmarks: {
        Row: {
          created_at: string
          id: string
          payload: Json
          question_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          payload?: Json
          question_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          question_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_bookmarks_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          ai_explanation: string
          answer_index: number
          created_at: string
          created_by: string | null
          difficulty: string
          exam_category: string
          exam_year: number | null
          explanation: string
          id: string
          language: string
          options: string[]
          organization: string
          question_text: string
          reference_source: string
          solve_seconds: number
          source: string
          status: string
          subject: string
          tags: string[]
          topic: string
          updated_at: string
        }
        Insert: {
          ai_explanation?: string
          answer_index?: number
          created_at?: string
          created_by?: string | null
          difficulty?: string
          exam_category: string
          exam_year?: number | null
          explanation?: string
          id?: string
          language?: string
          options: string[]
          organization?: string
          question_text: string
          reference_source?: string
          solve_seconds?: number
          source?: string
          status?: string
          subject: string
          tags?: string[]
          topic?: string
          updated_at?: string
        }
        Update: {
          ai_explanation?: string
          answer_index?: number
          created_at?: string
          created_by?: string | null
          difficulty?: string
          exam_category?: string
          exam_year?: number | null
          explanation?: string
          id?: string
          language?: string
          options?: string[]
          organization?: string
          question_text?: string
          reference_source?: string
          solve_seconds?: number
          source?: string
          status?: string
          subject?: string
          tags?: string[]
          topic?: string
          updated_at?: string
        }
        Relationships: []
      }
      resumes: {
        Row: {
          completion: number
          content: Json
          created_at: string
          id: string
          template: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completion?: number
          content?: Json
          created_at?: string
          id?: string
          template?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completion?: number
          content?: Json
          created_at?: string
          id?: string
          template?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      study_plans: {
        Row: {
          created_at: string
          daily_tasks: Json
          exam: string
          id: string
          summary: string
          updated_at: string
          user_id: string
          weeks: Json
        }
        Insert: {
          created_at?: string
          daily_tasks?: Json
          exam: string
          id?: string
          summary?: string
          updated_at?: string
          user_id: string
          weeks?: Json
        }
        Update: {
          created_at?: string
          daily_tasks?: Json
          exam?: string
          id?: string
          summary?: string
          updated_at?: string
          user_id?: string
          weeks?: Json
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          code: string
          description: string
          earned_at: string
          id: string
          label: string
          tier: string
          user_id: string
        }
        Insert: {
          code: string
          description?: string
          earned_at?: string
          id?: string
          label: string
          tier?: string
          user_id: string
        }
        Update: {
          code?: string
          description?: string
          earned_at?: string
          id?: string
          label?: string
          tier?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      viva_sessions: {
        Row: {
          category: string
          completed: boolean
          created_at: string
          feedback: Json
          id: string
          overall_score: number | null
          scores: Json
          transcript: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          completed?: boolean
          created_at?: string
          feedback?: Json
          id?: string
          overall_score?: number | null
          scores?: Json
          transcript?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          completed?: boolean
          created_at?: string
          feedback?: Json
          id?: string
          overall_score?: number | null
          scores?: Json
          transcript?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      contest_board: {
        Args: { _contest_id: string }
        Returns: {
          accuracy: number
          correct_count: number
          display_name: string
          disqualified: boolean
          score: number
          submitted_at: string
          time_bonus: number
          user_id: string
        }[]
      }
      contest_participant_counts: {
        Args: { _contest_ids: string[] }
        Returns: {
          contest_id: string
          participants: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
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
