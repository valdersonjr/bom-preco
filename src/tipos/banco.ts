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
    PostgrestVersion: "14.15"
  }
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
      compra: {
        Row: {
          concluida_em: string
          id: string
          mercado_id: string | null
          usuario_id: string
        }
        Insert: {
          concluida_em?: string
          id?: string
          mercado_id?: string | null
          usuario_id: string
        }
        Update: {
          concluida_em?: string
          id?: string
          mercado_id?: string | null
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "compra_mercado_id_fkey"
            columns: ["mercado_id"]
            isOneToOne: false
            referencedRelation: "mercado"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compra_mercado_id_fkey"
            columns: ["mercado_id"]
            isOneToOne: false
            referencedRelation: "mercado_confianca"
            referencedColumns: ["mercado_id"]
          },
          {
            foreignKeyName: "compra_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "perfil"
            referencedColumns: ["id"]
          },
        ]
      }
      confirmacao: {
        Row: {
          autoconfirmacao: boolean
          confirmado_em: string
          dia: string
          id: string
          registro_id: string
          usuario_id: string | null
        }
        Insert: {
          autoconfirmacao?: boolean
          confirmado_em?: string
          dia?: string
          id?: string
          registro_id: string
          usuario_id?: string | null
        }
        Update: {
          autoconfirmacao?: boolean
          confirmado_em?: string
          dia?: string
          id?: string
          registro_id?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "confirmacao_registro_id_fkey"
            columns: ["registro_id"]
            isOneToOne: false
            referencedRelation: "meus_registros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "confirmacao_registro_id_fkey"
            columns: ["registro_id"]
            isOneToOne: false
            referencedRelation: "preco_publico"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "confirmacao_registro_id_fkey"
            columns: ["registro_id"]
            isOneToOne: false
            referencedRelation: "registro_preco"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "confirmacao_registro_id_fkey"
            columns: ["registro_id"]
            isOneToOne: false
            referencedRelation: "registro_vigente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "confirmacao_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "perfil"
            referencedColumns: ["id"]
          },
        ]
      }
      evento: {
        Row: {
          id: string
          ocorrido_em: string
          produto_id: string | null
          termo: string | null
          tipo: string
          usuario_id: string | null
        }
        Insert: {
          id?: string
          ocorrido_em?: string
          produto_id?: string | null
          termo?: string | null
          tipo: string
          usuario_id?: string | null
        }
        Update: {
          id?: string
          ocorrido_em?: string
          produto_id?: string | null
          termo?: string | null
          tipo?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "evento_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evento_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "perfil"
            referencedColumns: ["id"]
          },
        ]
      }
      item_compra: {
        Row: {
          compra_id: string
          id: string
          produto_id: string | null
          quantidade: number
          termo: string | null
        }
        Insert: {
          compra_id: string
          id?: string
          produto_id?: string | null
          quantidade: number
          termo?: string | null
        }
        Update: {
          compra_id?: string
          id?: string
          produto_id?: string | null
          quantidade?: number
          termo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "item_compra_compra_id_fkey"
            columns: ["compra_id"]
            isOneToOne: false
            referencedRelation: "compra"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_compra_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produto"
            referencedColumns: ["id"]
          },
        ]
      }
      item_lista: {
        Row: {
          criado_em: string
          excluidos: string[]
          id: string
          lista_id: string
          pego_em: string | null
          produto_id: string | null
          quantidade: number
          termo: string | null
        }
        Insert: {
          criado_em?: string
          excluidos?: string[]
          id?: string
          lista_id: string
          pego_em?: string | null
          produto_id?: string | null
          quantidade?: number
          termo?: string | null
        }
        Update: {
          criado_em?: string
          excluidos?: string[]
          id?: string
          lista_id?: string
          pego_em?: string | null
          produto_id?: string | null
          quantidade?: number
          termo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "item_lista_lista_id_fkey"
            columns: ["lista_id"]
            isOneToOne: false
            referencedRelation: "lista"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_lista_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produto"
            referencedColumns: ["id"]
          },
        ]
      }
      lista: {
        Row: {
          criado_em: string
          excluida_em: string | null
          id: string
          nome: string
          usuario_id: string
        }
        Insert: {
          criado_em?: string
          excluida_em?: string | null
          id?: string
          nome: string
          usuario_id: string
        }
        Update: {
          criado_em?: string
          excluida_em?: string | null
          id?: string
          nome?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lista_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "perfil"
            referencedColumns: ["id"]
          },
        ]
      }
      mercado: {
        Row: {
          ativado_em: string | null
          ativado_por: string | null
          cidade: string
          endereco: string
          id: string
          latitude: number | null
          local_marcado_em: string | null
          local_marcado_por: string | null
          localizacao: unknown
          longitude: number | null
          nome: string
          osm_id: string | null
          rede_id: string | null
        }
        Insert: {
          ativado_em?: string | null
          ativado_por?: string | null
          cidade: string
          endereco: string
          id?: string
          latitude?: number | null
          local_marcado_em?: string | null
          local_marcado_por?: string | null
          localizacao?: unknown
          longitude?: number | null
          nome: string
          osm_id?: string | null
          rede_id?: string | null
        }
        Update: {
          ativado_em?: string | null
          ativado_por?: string | null
          cidade?: string
          endereco?: string
          id?: string
          latitude?: number | null
          local_marcado_em?: string | null
          local_marcado_por?: string | null
          localizacao?: unknown
          longitude?: number | null
          nome?: string
          osm_id?: string | null
          rede_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mercado_ativado_por_fkey"
            columns: ["ativado_por"]
            isOneToOne: false
            referencedRelation: "perfil"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mercado_local_marcado_por_fkey"
            columns: ["local_marcado_por"]
            isOneToOne: false
            referencedRelation: "perfil"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mercado_rede_id_fkey"
            columns: ["rede_id"]
            isOneToOne: false
            referencedRelation: "rede"
            referencedColumns: ["id"]
          },
        ]
      }
      mercado_candidato: {
        Row: {
          cidade: string
          endereco: string
          latitude: number
          longitude: number
          nome: string
          osm_id: string
          tipo: string
        }
        Insert: {
          cidade: string
          endereco?: string
          latitude: number
          longitude: number
          nome: string
          osm_id: string
          tipo: string
        }
        Update: {
          cidade?: string
          endereco?: string
          latitude?: number
          longitude?: number
          nome?: string
          osm_id?: string
          tipo?: string
        }
        Relationships: []
      }
      perfil: {
        Row: {
          anonimo: boolean
          apelido: string
          criado_em: string
          id: string
          mantenedor: boolean
        }
        Insert: {
          anonimo?: boolean
          apelido: string
          criado_em?: string
          id: string
          mantenedor?: boolean
        }
        Update: {
          anonimo?: boolean
          apelido?: string
          criado_em?: string
          id?: string
          mantenedor?: boolean
        }
        Relationships: []
      }
      produto: {
        Row: {
          criado_em: string
          dimensao: string | null
          gtin: string | null
          id: string
          marca: string | null
          nome: string
          nome_busca: string | null
          origem: string
          quantidade: number
          quantidade_base: number | null
          unidade_medida: string
        }
        Insert: {
          criado_em?: string
          dimensao?: string | null
          gtin?: string | null
          id?: string
          marca?: string | null
          nome: string
          nome_busca?: string | null
          origem: string
          quantidade: number
          quantidade_base?: number | null
          unidade_medida: string
        }
        Update: {
          criado_em?: string
          dimensao?: string | null
          gtin?: string | null
          id?: string
          marca?: string | null
          nome?: string
          nome_busca?: string | null
          origem?: string
          quantidade?: number
          quantidade_base?: number | null
          unidade_medida?: string
        }
        Relationships: []
      }
      rede: {
        Row: {
          id: string
          nome: string
        }
        Insert: {
          id?: string
          nome: string
        }
        Update: {
          id?: string
          nome?: string
        }
        Relationships: []
      }
      registro_preco: {
        Row: {
          condicao: string | null
          criado_em: string
          id: string
          local_conferido: boolean
          mercado_id: string
          observado_em: string
          produto_id: string
          tipo: string
          usuario_id: string | null
          valor: number
        }
        Insert: {
          condicao?: string | null
          criado_em?: string
          id: string
          local_conferido?: boolean
          mercado_id: string
          observado_em: string
          produto_id: string
          tipo?: string
          usuario_id?: string | null
          valor: number
        }
        Update: {
          condicao?: string | null
          criado_em?: string
          id?: string
          local_conferido?: boolean
          mercado_id?: string
          observado_em?: string
          produto_id?: string
          tipo?: string
          usuario_id?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "registro_preco_mercado_id_fkey"
            columns: ["mercado_id"]
            isOneToOne: false
            referencedRelation: "mercado"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registro_preco_mercado_id_fkey"
            columns: ["mercado_id"]
            isOneToOne: false
            referencedRelation: "mercado_confianca"
            referencedColumns: ["mercado_id"]
          },
          {
            foreignKeyName: "registro_preco_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registro_preco_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "perfil"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      cidade_atendida: {
        Row: {
          candidatos: number | null
          cidade: string | null
          latitude: number | null
          longitude: number | null
        }
        Relationships: []
      }
      mercado_confianca: {
        Row: {
          mercado_id: string | null
          situacao: string | null
        }
        Relationships: []
      }
      meus_registros: {
        Row: {
          id: string | null
          local_conferido: boolean | null
          mercado_id: string | null
          observado_em: string | null
          produto_id: string | null
          tipo: string | null
          valor: number | null
        }
        Insert: {
          id?: string | null
          local_conferido?: boolean | null
          mercado_id?: string | null
          observado_em?: string | null
          produto_id?: string | null
          tipo?: string | null
          valor?: number | null
        }
        Update: {
          id?: string | null
          local_conferido?: boolean | null
          mercado_id?: string | null
          observado_em?: string | null
          produto_id?: string | null
          tipo?: string | null
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "registro_preco_mercado_id_fkey"
            columns: ["mercado_id"]
            isOneToOne: false
            referencedRelation: "mercado"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registro_preco_mercado_id_fkey"
            columns: ["mercado_id"]
            isOneToOne: false
            referencedRelation: "mercado_confianca"
            referencedColumns: ["mercado_id"]
          },
          {
            foreignKeyName: "registro_preco_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produto"
            referencedColumns: ["id"]
          },
        ]
      }
      preco_publico: {
        Row: {
          autoconfirmacoes: number | null
          condicao: string | null
          confirmacoes_terceiros: number | null
          id: string | null
          local_conferido: boolean | null
          mercado_id: string | null
          observado_em: string | null
          produto_id: string | null
          tipo: string | null
          valor: number | null
          visto_em: string | null
        }
        Relationships: [
          {
            foreignKeyName: "registro_preco_mercado_id_fkey"
            columns: ["mercado_id"]
            isOneToOne: false
            referencedRelation: "mercado"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registro_preco_mercado_id_fkey"
            columns: ["mercado_id"]
            isOneToOne: false
            referencedRelation: "mercado_confianca"
            referencedColumns: ["mercado_id"]
          },
          {
            foreignKeyName: "registro_preco_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produto"
            referencedColumns: ["id"]
          },
        ]
      }
      registro_vigente: {
        Row: {
          condicao: string | null
          criado_em: string | null
          id: string | null
          local_conferido: boolean | null
          mercado_id: string | null
          observado_em: string | null
          produto_id: string | null
          tipo: string | null
          usuario_id: string | null
          valor: number | null
        }
        Relationships: [
          {
            foreignKeyName: "registro_preco_mercado_id_fkey"
            columns: ["mercado_id"]
            isOneToOne: false
            referencedRelation: "mercado"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registro_preco_mercado_id_fkey"
            columns: ["mercado_id"]
            isOneToOne: false
            referencedRelation: "mercado_confianca"
            referencedColumns: ["mercado_id"]
          },
          {
            foreignKeyName: "registro_preco_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registro_preco_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "perfil"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      ativar_mercado: { Args: { p_osm_id: string }; Returns: string }
      concluir_compra: {
        Args: { p_lista: string; p_mercado?: string }
        Returns: string
      }
      confianca_do_usuario: { Args: { p_usuario: string }; Returns: number }
      e_mantenedor: { Args: never; Returns: boolean }
      marcar_local_do_mercado: {
        Args: { p_latitude: number; p_longitude: number; p_mercado: string }
        Returns: undefined
      }
      precos_por_termo: {
        Args: { p_desde: string; p_termos: string[] }
        Returns: {
          dimensao: string
          gtin: string
          marca: string
          mercado_id: string
          nome: string
          observado_em: string
          produto_id: string
          quantidade: number
          quantidade_base: number
          termo: string
          unidade_medida: string
          valor: number
          visto_em: string
        }[]
      }
      sem_acento: { Args: { t: string }; Returns: string }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
    Enums: {},
  },
} as const
