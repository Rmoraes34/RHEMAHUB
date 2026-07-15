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
      ai_settings: {
        Row: {
          anthropic_key: string | null
          default_provider: string
          gemini_key: string | null
          id: number
          notion_token: string | null
          openai_key: string | null
          updated_at: string
        }
        Insert: {
          anthropic_key?: string | null
          default_provider?: string
          gemini_key?: string | null
          id?: number
          notion_token?: string | null
          openai_key?: string | null
          updated_at?: string
        }
        Update: {
          anthropic_key?: string | null
          default_provider?: string
          gemini_key?: string | null
          id?: number
          notion_token?: string | null
          openai_key?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      app_links: {
        Row: {
          categoria: string | null
          created_at: string
          descricao: string | null
          id: string
          nome: string
          updated_at: string
          url: string
        }
        Insert: {
          categoria?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          updated_at?: string
          url: string
        }
        Update: {
          categoria?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      client_forms: {
        Row: {
          client_id: string
          created_at: string
          data_envio: string
          id: string
          nome: string | null
          resposta_url: string | null
          template_id: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          data_envio?: string
          id?: string
          nome?: string | null
          resposta_url?: string | null
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          data_envio?: string
          id?: string
          nome?: string | null
          resposta_url?: string | null
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_forms_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_forms_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "form_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      client_knowledge: {
        Row: {
          autor: string | null
          client_id: string
          created_at: string
          created_by: string | null
          data_registro: string
          id: string
          resumo: string
          tags: string[]
          updated_at: string
        }
        Insert: {
          autor?: string | null
          client_id: string
          created_at?: string
          created_by?: string | null
          data_registro?: string
          id?: string
          resumo: string
          tags?: string[]
          updated_at?: string
        }
        Update: {
          autor?: string | null
          client_id?: string
          created_at?: string
          created_by?: string | null
          data_registro?: string
          id?: string
          resumo?: string
          tags?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_knowledge_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_package_history: {
        Row: {
          client_id: string
          created_at: string
          data_mudanca: string
          id: string
          observacao: string | null
          pacote_anterior: string | null
          pacote_novo: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          data_mudanca?: string
          id?: string
          observacao?: string | null
          pacote_anterior?: string | null
          pacote_novo?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          data_mudanca?: string
          id?: string
          observacao?: string | null
          pacote_anterior?: string | null
          pacote_novo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_package_history_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_reports: {
        Row: {
          arquivo_url: string | null
          client_id: string
          created_at: string
          data_envio: string
          id: string
          periodo: string | null
          resumo: string | null
          titulo: string
          updated_at: string
        }
        Insert: {
          arquivo_url?: string | null
          client_id: string
          created_at?: string
          data_envio?: string
          id?: string
          periodo?: string | null
          resumo?: string | null
          titulo: string
          updated_at?: string
        }
        Update: {
          arquivo_url?: string | null
          client_id?: string
          created_at?: string
          data_envio?: string
          id?: string
          periodo?: string | null
          resumo?: string | null
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_reports_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_shortcuts: {
        Row: {
          client_id: string
          created_at: string
          id: string
          nome: string
          updated_at: string
          url: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          nome: string
          updated_at?: string
          url: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          nome?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_shortcuts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_socials: {
        Row: {
          client_id: string
          created_at: string
          id: string
          link: string | null
          login: string | null
          plataforma: string
          senha: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          link?: string | null
          login?: string | null
          plataforma: string
          senha?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          link?: string | null
          login?: string | null
          plataforma?: string
          senha?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_socials_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          ai_notes: string | null
          brand_fontes: Json
          brand_historia: string | null
          brand_logo_url: string | null
          brand_objetivo: string | null
          brand_paleta: string[]
          brand_publico: string | null
          brand_tom_voz: string | null
          brand_valores: string | null
          contato_responsavel: string | null
          cor: string | null
          created_at: string
          data_inicio: string | null
          deleted_at: string | null
          documento: string | null
          drive_url: string | null
          email: string | null
          endereco: string | null
          id: string
          logo_url: string | null
          nicho: string | null
          notion_url: string | null
          observacoes_internas: string | null
          pacote_atual: string | null
          porte: string | null
          razao_social: string
          status: string
          tags: string[]
          telefone: string | null
          tipo: string
          updated_at: string
        }
        Insert: {
          ai_notes?: string | null
          brand_fontes?: Json
          brand_historia?: string | null
          brand_logo_url?: string | null
          brand_objetivo?: string | null
          brand_paleta?: string[]
          brand_publico?: string | null
          brand_tom_voz?: string | null
          brand_valores?: string | null
          contato_responsavel?: string | null
          cor?: string | null
          created_at?: string
          data_inicio?: string | null
          deleted_at?: string | null
          documento?: string | null
          drive_url?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          logo_url?: string | null
          nicho?: string | null
          notion_url?: string | null
          observacoes_internas?: string | null
          pacote_atual?: string | null
          porte?: string | null
          razao_social: string
          status?: string
          tags?: string[]
          telefone?: string | null
          tipo?: string
          updated_at?: string
        }
        Update: {
          ai_notes?: string | null
          brand_fontes?: Json
          brand_historia?: string | null
          brand_logo_url?: string | null
          brand_objetivo?: string | null
          brand_paleta?: string[]
          brand_publico?: string | null
          brand_tom_voz?: string | null
          brand_valores?: string | null
          contato_responsavel?: string | null
          cor?: string | null
          created_at?: string
          data_inicio?: string | null
          deleted_at?: string | null
          documento?: string | null
          drive_url?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          logo_url?: string | null
          nicho?: string | null
          notion_url?: string | null
          observacoes_internas?: string | null
          pacote_atual?: string | null
          porte?: string | null
          razao_social?: string
          status?: string
          tags?: string[]
          telefone?: string | null
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      company_settings: {
        Row: {
          cnpj: string | null
          id: number
          info_fiscal: string | null
          logo_url: string | null
          meta_faturamento: number
          meta_fechamentos: number
          nome: string
          updated_at: string
        }
        Insert: {
          cnpj?: string | null
          id?: number
          info_fiscal?: string | null
          logo_url?: string | null
          meta_faturamento?: number
          meta_fechamentos?: number
          nome?: string
          updated_at?: string
        }
        Update: {
          cnpj?: string | null
          id?: number
          info_fiscal?: string | null
          logo_url?: string | null
          meta_faturamento?: number
          meta_fechamentos?: number
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      content_posts: {
        Row: {
          assignee_id: string | null
          atividade: string | null
          briefing: string | null
          categoria: string
          client_id: string
          contract_id: string | null
          created_at: string
          data_edicao: string | null
          data_entregue: string | null
          data_gravacao: string | null
          data_post: string
          data_publicacao: string | null
          editor_id: string | null
          entregue: boolean
          etapa_atual: string | null
          fase: string
          horario_publicacao: string | null
          id: string
          legenda: string | null
          objetivo: string | null
          pauta: string | null
          plataformas: string[] | null
          postador_id: string | null
          referencias: Json | null
          roteiro: string | null
          status: string
          status_edicao: string | null
          status_postagem: string | null
          status_producao: string | null
          task_id: string | null
          tema: string
          tipo: string
          titulo: string | null
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          atividade?: string | null
          briefing?: string | null
          categoria?: string
          client_id: string
          contract_id?: string | null
          created_at?: string
          data_edicao?: string | null
          data_entregue?: string | null
          data_gravacao?: string | null
          data_post: string
          data_publicacao?: string | null
          editor_id?: string | null
          entregue?: boolean
          etapa_atual?: string | null
          fase?: string
          horario_publicacao?: string | null
          id?: string
          legenda?: string | null
          objetivo?: string | null
          pauta?: string | null
          plataformas?: string[] | null
          postador_id?: string | null
          referencias?: Json | null
          roteiro?: string | null
          status?: string
          status_edicao?: string | null
          status_postagem?: string | null
          status_producao?: string | null
          task_id?: string | null
          tema: string
          tipo?: string
          titulo?: string | null
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          atividade?: string | null
          briefing?: string | null
          categoria?: string
          client_id?: string
          contract_id?: string | null
          created_at?: string
          data_edicao?: string | null
          data_entregue?: string | null
          data_gravacao?: string | null
          data_post?: string
          data_publicacao?: string | null
          editor_id?: string | null
          entregue?: boolean
          etapa_atual?: string | null
          fase?: string
          horario_publicacao?: string | null
          id?: string
          legenda?: string | null
          objetivo?: string | null
          pauta?: string | null
          plataformas?: string[] | null
          postador_id?: string | null
          referencias?: Json | null
          roteiro?: string | null
          status?: string
          status_edicao?: string | null
          status_postagem?: string | null
          status_producao?: string | null
          task_id?: string | null
          tema?: string
          tipo?: string
          titulo?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_posts_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_posts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_posts_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_posts_editor_id_fkey"
            columns: ["editor_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_posts_postador_id_fkey"
            columns: ["postador_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_posts_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_deliveries: {
        Row: {
          arquivo_url: string | null
          contract_id: string
          created_at: string
          data_entrega: string
          descricao: string | null
          id: string
          observacao: string | null
          quantidade: number
          tipo: string
        }
        Insert: {
          arquivo_url?: string | null
          contract_id: string
          created_at?: string
          data_entrega?: string
          descricao?: string | null
          id?: string
          observacao?: string | null
          quantidade?: number
          tipo?: string
        }
        Update: {
          arquivo_url?: string | null
          contract_id?: string
          created_at?: string
          data_entrega?: string
          descricao?: string | null
          id?: string
          observacao?: string | null
          quantidade?: number
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_deliveries_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          arquivo_url: string | null
          client_id: string | null
          created_at: string
          data_fim: string | null
          data_inicio: string | null
          descricao: string | null
          drive_url: string | null
          duracao_meses: number | null
          forma_pagamento: string | null
          id: string
          observacoes: string | null
          qtd_por_periodo: number | null
          recorrencia: string
          resumo_final: string | null
          service_package_id: string | null
          servico: string | null
          status: string
          tipo: string
          titulo: string
          updated_at: string
          valor: number
        }
        Insert: {
          arquivo_url?: string | null
          client_id?: string | null
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          descricao?: string | null
          drive_url?: string | null
          duracao_meses?: number | null
          forma_pagamento?: string | null
          id?: string
          observacoes?: string | null
          qtd_por_periodo?: number | null
          recorrencia?: string
          resumo_final?: string | null
          service_package_id?: string | null
          servico?: string | null
          status?: string
          tipo?: string
          titulo: string
          updated_at?: string
          valor?: number
        }
        Update: {
          arquivo_url?: string | null
          client_id?: string | null
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          descricao?: string | null
          drive_url?: string | null
          duracao_meses?: number | null
          forma_pagamento?: string | null
          id?: string
          observacoes?: string | null
          qtd_por_periodo?: number | null
          recorrencia?: string
          resumo_final?: string | null
          service_package_id?: string | null
          servico?: string | null
          status?: string
          tipo?: string
          titulo?: string
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "contracts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_service_package_id_fkey"
            columns: ["service_package_id"]
            isOneToOne: false
            referencedRelation: "service_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      deliverable_categories: {
        Row: {
          created_at: string
          id: string
          nome: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      deliverables: {
        Row: {
          categoria: string | null
          client_id: string
          created_at: string
          data_entrega: string | null
          data_prazo: string | null
          id: string
          periodicidade: string
          quantidade: number
          status: string
          titulo: string
          updated_at: string
        }
        Insert: {
          categoria?: string | null
          client_id: string
          created_at?: string
          data_entrega?: string | null
          data_prazo?: string | null
          id?: string
          periodicidade?: string
          quantidade?: number
          status?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          categoria?: string | null
          client_id?: string
          created_at?: string
          data_entrega?: string | null
          data_prazo?: string | null
          id?: string
          periodicidade?: string
          quantidade?: number
          status?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deliverables_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      deliverables_plan: {
        Row: {
          client_id: string
          contract_id: string | null
          created_at: string
          data_fim: string | null
          data_inicio: string | null
          dias_edicao: number[]
          dias_producao: number[]
          dias_publicacao: number[]
          equipe: Json
          id: string
          itens: Json
          mes_referencia: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          contract_id?: string | null
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          dias_edicao?: number[]
          dias_producao?: number[]
          dias_publicacao?: number[]
          equipe?: Json
          id?: string
          itens?: Json
          mes_referencia?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          contract_id?: string | null
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          dias_edicao?: number[]
          dias_producao?: number[]
          dias_publicacao?: number[]
          equipe?: Json
          id?: string
          itens?: Json
          mes_referencia?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deliverables_plan_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliverables_plan_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_settings: {
        Row: {
          categorias_extra: Json
          id: number
          pct_caixa: number
          pct_comissao: number
          pct_ferramentas: number
          pct_imposto: number
          updated_at: string
        }
        Insert: {
          categorias_extra?: Json
          id?: number
          pct_caixa?: number
          pct_comissao?: number
          pct_ferramentas?: number
          pct_imposto?: number
          updated_at?: string
        }
        Update: {
          categorias_extra?: Json
          id?: number
          pct_caixa?: number
          pct_comissao?: number
          pct_ferramentas?: number
          pct_imposto?: number
          updated_at?: string
        }
        Relationships: []
      }
      form_templates: {
        Row: {
          categoria: string | null
          created_at: string
          descricao: string | null
          id: string
          nome: string
          updated_at: string
          url: string | null
        }
        Insert: {
          categoria?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          categoria?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: []
      }
      funnel_stages: {
        Row: {
          created_at: string
          id: string
          is_lost: boolean
          is_won: boolean
          nome: string
          ordem: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_lost?: boolean
          is_won?: boolean
          nome: string
          ordem?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_lost?: boolean
          is_won?: boolean
          nome?: string
          ordem?: number
        }
        Relationships: []
      }
      lead_interactions: {
        Row: {
          conteudo: string
          created_at: string
          id: string
          lead_id: string
          tipo: string
        }
        Insert: {
          conteudo: string
          created_at?: string
          id?: string
          lead_id: string
          tipo?: string
        }
        Update: {
          conteudo?: string
          created_at?: string
          id?: string
          lead_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_interactions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          contato: string | null
          converted_client_id: string | null
          created_at: string
          deleted_at: string | null
          empresa: string | null
          id: string
          nome: string
          origem: string | null
          proposta_url: string | null
          responsavel: string | null
          stage_id: string | null
          tipo: string
          updated_at: string
          valor: number
          vendedor_id: string | null
        }
        Insert: {
          contato?: string | null
          converted_client_id?: string | null
          created_at?: string
          deleted_at?: string | null
          empresa?: string | null
          id?: string
          nome: string
          origem?: string | null
          proposta_url?: string | null
          responsavel?: string | null
          stage_id?: string | null
          tipo?: string
          updated_at?: string
          valor?: number
          vendedor_id?: string | null
        }
        Update: {
          contato?: string | null
          converted_client_id?: string | null
          created_at?: string
          deleted_at?: string | null
          empresa?: string | null
          id?: string
          nome?: string
          origem?: string | null
          proposta_url?: string | null
          responsavel?: string | null
          stage_id?: string | null
          tipo?: string
          updated_at?: string
          valor?: number
          vendedor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_converted_client_id_fkey"
            columns: ["converted_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "funnel_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      list_options: {
        Row: {
          created_at: string
          id: string
          label: string
          list_key: string
          ordem: number
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          list_key: string
          ordem?: number
          value: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          list_key?: string
          ordem?: number
          value?: string
        }
        Relationships: []
      }
      meetings: {
        Row: {
          client_id: string | null
          created_at: string
          criar_meet: boolean
          data_evento: string
          google_email: string | null
          google_event_id: string | null
          gravacao_url: string | null
          id: string
          meet_url: string | null
          notas: string | null
          notion_url: string | null
          participantes: string | null
          pauta: string | null
          tipo: string
          titulo: string
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          criar_meet?: boolean
          data_evento: string
          google_email?: string | null
          google_event_id?: string | null
          gravacao_url?: string | null
          id?: string
          meet_url?: string | null
          notas?: string | null
          notion_url?: string | null
          participantes?: string | null
          pauta?: string | null
          tipo?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          criar_meet?: boolean
          data_evento?: string
          google_email?: string | null
          google_event_id?: string | null
          gravacao_url?: string | null
          id?: string
          meet_url?: string | null
          notas?: string | null
          notion_url?: string | null
          participantes?: string | null
          pauta?: string | null
          tipo?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meetings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      nps_records: {
        Row: {
          client_id: string
          comentario: string | null
          created_at: string
          data_avaliacao: string
          id: string
          nota: number
        }
        Insert: {
          client_id: string
          comentario?: string | null
          created_at?: string
          data_avaliacao?: string
          id?: string
          nota: number
        }
        Update: {
          client_id?: string
          comentario?: string | null
          created_at?: string
          data_avaliacao?: string
          id?: string
          nota?: number
        }
        Relationships: [
          {
            foreignKeyName: "nps_records_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          client_id: string | null
          contract_id: string | null
          created_at: string
          data_pagamento: string | null
          data_vencimento: string | null
          descricao: string | null
          id: string
          pct_caixa: number
          pct_comissao: number
          pct_ferramentas: number
          pct_imposto: number
          responsavel_comissao: string | null
          split_extra: Json
          status: string
          updated_at: string
          valor: number
        }
        Insert: {
          client_id?: string | null
          contract_id?: string | null
          created_at?: string
          data_pagamento?: string | null
          data_vencimento?: string | null
          descricao?: string | null
          id?: string
          pct_caixa?: number
          pct_comissao?: number
          pct_ferramentas?: number
          pct_imposto?: number
          responsavel_comissao?: string | null
          split_extra?: Json
          status?: string
          updated_at?: string
          valor?: number
        }
        Update: {
          client_id?: string | null
          contract_id?: string | null
          created_at?: string
          data_pagamento?: string | null
          data_vencimento?: string | null
          descricao?: string | null
          id?: string
          pct_caixa?: number
          pct_comissao?: number
          pct_ferramentas?: number
          pct_imposto?: number
          responsavel_comissao?: string | null
          split_extra?: Json
          status?: string
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          id: string
          modulos: Json | null
          nome: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          id?: string
          modulos?: Json | null
          nome?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          id?: string
          modulos?: Json | null
          nome?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quotes: {
        Row: {
          client_id: string | null
          cliente_contato: string | null
          cliente_empresa: string | null
          cliente_nome: string | null
          created_at: string
          desconto: number
          id: string
          itens: Json
          lead_id: string | null
          observacoes: string | null
          status: string
          subtotal: number
          titulo: string
          total: number
          updated_at: string
          validade_dias: number
          versao: number
        }
        Insert: {
          client_id?: string | null
          cliente_contato?: string | null
          cliente_empresa?: string | null
          cliente_nome?: string | null
          created_at?: string
          desconto?: number
          id?: string
          itens?: Json
          lead_id?: string | null
          observacoes?: string | null
          status?: string
          subtotal?: number
          titulo: string
          total?: number
          updated_at?: string
          validade_dias?: number
          versao?: number
        }
        Update: {
          client_id?: string | null
          cliente_contato?: string | null
          cliente_empresa?: string | null
          cliente_nome?: string | null
          created_at?: string
          desconto?: number
          id?: string
          itens?: Json
          lead_id?: string | null
          observacoes?: string | null
          status?: string
          subtotal?: number
          titulo?: string
          total?: number
          updated_at?: string
          validade_dias?: number
          versao?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      service_packages: {
        Row: {
          ativo: boolean
          categoria: string
          contrato_minimo: string | null
          created_at: string
          descricao: string | null
          id: string
          nome: string
          tipo: string
          updated_at: string
          valor: number
        }
        Insert: {
          ativo?: boolean
          categoria?: string
          contrato_minimo?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          tipo?: string
          updated_at?: string
          valor?: number
        }
        Update: {
          ativo?: boolean
          categoria?: string
          contrato_minimo?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          tipo?: string
          updated_at?: string
          valor?: number
        }
        Relationships: []
      }
      task_comments: {
        Row: {
          autor_nome: string | null
          created_at: string
          id: string
          task_id: string
          texto: string
          user_id: string | null
        }
        Insert: {
          autor_nome?: string | null
          created_at?: string
          id?: string
          task_id: string
          texto: string
          user_id?: string | null
        }
        Update: {
          autor_nome?: string | null
          created_at?: string
          id?: string
          task_id?: string
          texto?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assignee_id: string | null
          categoria: string
          client_id: string | null
          content_post_id: string | null
          created_at: string
          data_prazo: string | null
          deleted_at: string | null
          descricao: string | null
          id: string
          natureza: string
          prioridade: string
          status: string
          titulo: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          categoria?: string
          client_id?: string | null
          content_post_id?: string | null
          created_at?: string
          data_prazo?: string | null
          deleted_at?: string | null
          descricao?: string | null
          id?: string
          natureza?: string
          prioridade?: string
          status?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          categoria?: string
          client_id?: string | null
          content_post_id?: string | null
          created_at?: string
          data_prazo?: string | null
          deleted_at?: string | null
          descricao?: string | null
          id?: string
          natureza?: string
          prioridade?: string
          status?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_content_post_id_fkey"
            columns: ["content_post_id"]
            isOneToOne: false
            referencedRelation: "content_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          ativo: boolean
          capacidade: string | null
          created_at: string
          email: string | null
          funcao: string | null
          id: string
          nome: string
          perfil: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          ativo?: boolean
          capacidade?: string | null
          created_at?: string
          email?: string | null
          funcao?: string | null
          id?: string
          nome: string
          perfil?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          ativo?: boolean
          capacidade?: string | null
          created_at?: string
          email?: string | null
          funcao?: string | null
          id?: string
          nome?: string
          perfil?: string
          updated_at?: string
          user_id?: string | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      ensure_task_for_post: {
        Args: { _post: Database["public"]["Tables"]["content_posts"]["Row"] }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      purge_trash: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "comercial" | "atendimento" | "financeiro"
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
      app_role: ["admin", "comercial", "atendimento", "financeiro"],
    },
  },
} as const
