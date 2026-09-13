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
      academy_progress: {
        Row: {
          concluido_em: string
          created_at: string
          id: string
          licao_key: string
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          concluido_em?: string
          created_at?: string
          id?: string
          licao_key: string
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          concluido_em?: string
          created_at?: string
          id?: string
          licao_key?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "academy_progress_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "executive_360"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "academy_progress_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      activities: {
        Row: {
          autor_id: string | null
          created_at: string
          descricao: string | null
          entity: string | null
          entity_id: string | null
          id: string
          metadata: Json
          ocorreu_em: string
          opportunity_id: string | null
          person_id: string | null
          tipo: Database["public"]["Enums"]["activity_tipo"]
          titulo: string
          workspace_id: string
        }
        Insert: {
          autor_id?: string | null
          created_at?: string
          descricao?: string | null
          entity?: string | null
          entity_id?: string | null
          id?: string
          metadata?: Json
          ocorreu_em?: string
          opportunity_id?: string | null
          person_id?: string | null
          tipo?: Database["public"]["Enums"]["activity_tipo"]
          titulo: string
          workspace_id: string
        }
        Update: {
          autor_id?: string | null
          created_at?: string
          descricao?: string | null
          entity?: string | null
          entity_id?: string | null
          id?: string
          metadata?: Json
          ocorreu_em?: string
          opportunity_id?: string | null
          person_id?: string | null
          tipo?: Database["public"]["Enums"]["activity_tipo"]
          titulo?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "customer_360"
            referencedColumns: ["person_id"]
          },
          {
            foreignKeyName: "activities_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "executive_360"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "activities_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_module_access: {
        Row: {
          created_at: string
          id: string
          module: string
          nivel: Database["public"]["Enums"]["permission_level"]
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          module: string
          nivel?: Database["public"]["Enums"]["permission_level"]
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          module?: string
          nivel?: Database["public"]["Enums"]["permission_level"]
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_module_access_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "executive_360"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "admin_module_access_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      advisor_acoes: {
        Row: {
          acao: string
          briefing_id: string
          created_at: string
          decidido_em: string | null
          decidido_por: string | null
          id: string
          observacao: string | null
          prioridade: string
          sinal: string | null
          status: string
          task_id: string | null
          titulo: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          acao: string
          briefing_id: string
          created_at?: string
          decidido_em?: string | null
          decidido_por?: string | null
          id?: string
          observacao?: string | null
          prioridade?: string
          sinal?: string | null
          status?: string
          task_id?: string | null
          titulo: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          acao?: string
          briefing_id?: string
          created_at?: string
          decidido_em?: string | null
          decidido_por?: string | null
          id?: string
          observacao?: string | null
          prioridade?: string
          sinal?: string | null
          status?: string
          task_id?: string | null
          titulo?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "advisor_acoes_briefing_id_fkey"
            columns: ["briefing_id"]
            isOneToOne: false
            referencedRelation: "advisor_briefings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advisor_acoes_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advisor_acoes_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "executive_360"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "advisor_acoes_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      advisor_briefings: {
        Row: {
          created_at: string
          criado_por: string
          id: string
          pergunta: string | null
          prioridade: string
          resumo: string | null
          riscos: Json
          sinais: Json
          workspace_id: string
        }
        Insert: {
          created_at?: string
          criado_por: string
          id?: string
          pergunta?: string | null
          prioridade?: string
          resumo?: string | null
          riscos?: Json
          sinais?: Json
          workspace_id: string
        }
        Update: {
          created_at?: string
          criado_por?: string
          id?: string
          pergunta?: string | null
          prioridade?: string
          resumo?: string | null
          riscos?: Json
          sinais?: Json
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "advisor_briefings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "executive_360"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "advisor_briefings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity: string
          entity_id: string | null
          id: string
          metadata: Json
          workspace_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity: string
          entity_id?: string | null
          id?: string
          metadata?: Json
          workspace_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity?: string
          entity_id?: string | null
          id?: string
          metadata?: Json
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "executive_360"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "audit_log_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_daily_metrics: {
        Row: {
          conversoes: number
          created_at: string
          descartados: number
          dia: string
          entregues: number
          execucoes: number
          falhou: number
          id: string
          latencia_media_segundos: number
          oportunidades_tocadas: number
          pendentes: number
          rule_id: string
          tempo_economizado_segundos: number
          tentativas_media: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          conversoes?: number
          created_at?: string
          descartados?: number
          dia: string
          entregues?: number
          execucoes?: number
          falhou?: number
          id?: string
          latencia_media_segundos?: number
          oportunidades_tocadas?: number
          pendentes?: number
          rule_id: string
          tempo_economizado_segundos?: number
          tentativas_media?: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          conversoes?: number
          created_at?: string
          descartados?: number
          dia?: string
          entregues?: number
          execucoes?: number
          falhou?: number
          id?: string
          latencia_media_segundos?: number
          oportunidades_tocadas?: number
          pendentes?: number
          rule_id?: string
          tempo_economizado_segundos?: number
          tentativas_media?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_daily_metrics_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "automation_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_daily_metrics_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "executive_360"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "automation_daily_metrics_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_rules: {
        Row: {
          acao: string
          ativa: boolean
          canal: string
          condicoes: Json
          config: Json
          created_at: string
          criado_por: string | null
          delay_segundos: number
          descricao: string | null
          event_type: string
          id: string
          nome: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          acao: string
          ativa?: boolean
          canal?: string
          condicoes?: Json
          config?: Json
          created_at?: string
          criado_por?: string | null
          delay_segundos?: number
          descricao?: string | null
          event_type: string
          id?: string
          nome: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          acao?: string
          ativa?: boolean
          canal?: string
          condicoes?: Json
          config?: Json
          created_at?: string
          criado_por?: string | null
          delay_segundos?: number
          descricao?: string | null
          event_type?: string
          id?: string
          nome?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_rules_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "executive_360"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "automation_rules_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          created_at: string
          criado_por: string | null
          documento: string | null
          email: string | null
          id: string
          lead_id: string | null
          nome: string
          observacao: string | null
          responsavel_id: string | null
          telefone: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          criado_por?: string | null
          documento?: string | null
          email?: string | null
          id?: string
          lead_id?: string | null
          nome: string
          observacao?: string | null
          responsavel_id?: string | null
          telefone?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          criado_por?: string | null
          documento?: string | null
          email?: string | null
          id?: string
          lead_id?: string | null
          nome?: string
          observacao?: string | null
          responsavel_id?: string | null
          telefone?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clientes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clientes_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "executive_360"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "clientes_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          autor_id: string
          corpo: string
          created_at: string
          editado_em: string | null
          entity: string
          entity_id: string
          id: string
          parent_id: string | null
          removido_em: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          autor_id: string
          corpo: string
          created_at?: string
          editado_em?: string | null
          entity: string
          entity_id: string
          id?: string
          parent_id?: string | null
          removido_em?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          autor_id?: string
          corpo?: string
          created_at?: string
          editado_em?: string | null
          entity?: string
          entity_id?: string
          id?: string
          parent_id?: string | null
          removido_em?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "executive_360"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "comments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      compromissos: {
        Row: {
          concluido_em: string | null
          created_at: string
          criado_por: string | null
          descricao: string | null
          entity: string | null
          entity_id: string | null
          fim_em: string | null
          id: string
          inicio_em: string
          lembrete_em: string | null
          responsavel_id: string | null
          status: Database["public"]["Enums"]["compromisso_status"]
          tipo: Database["public"]["Enums"]["compromisso_tipo"]
          titulo: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          concluido_em?: string | null
          created_at?: string
          criado_por?: string | null
          descricao?: string | null
          entity?: string | null
          entity_id?: string | null
          fim_em?: string | null
          id?: string
          inicio_em: string
          lembrete_em?: string | null
          responsavel_id?: string | null
          status?: Database["public"]["Enums"]["compromisso_status"]
          tipo?: Database["public"]["Enums"]["compromisso_tipo"]
          titulo: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          concluido_em?: string | null
          created_at?: string
          criado_por?: string | null
          descricao?: string | null
          entity?: string | null
          entity_id?: string | null
          fim_em?: string | null
          id?: string
          inicio_em?: string
          lembrete_em?: string | null
          responsavel_id?: string | null
          status?: Database["public"]["Enums"]["compromisso_status"]
          tipo?: Database["public"]["Enums"]["compromisso_tipo"]
          titulo?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "compromissos_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "executive_360"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "compromissos_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      decision_outcomes: {
        Row: {
          confianca: number | null
          created_at: string
          decidido_em: string | null
          decidido_por: string | null
          decisao: string
          id: string
          opportunity_id: string | null
          person_id: string | null
          recomendacao: string
          recomendacao_tipo: string
          resolvido_em: string | null
          resultado: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          confianca?: number | null
          created_at?: string
          decidido_em?: string | null
          decidido_por?: string | null
          decisao?: string
          id?: string
          opportunity_id?: string | null
          person_id?: string | null
          recomendacao: string
          recomendacao_tipo: string
          resolvido_em?: string | null
          resultado?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          confianca?: number | null
          created_at?: string
          decidido_em?: string | null
          decidido_por?: string | null
          decisao?: string
          id?: string
          opportunity_id?: string | null
          person_id?: string | null
          recomendacao?: string
          recomendacao_tipo?: string
          resolvido_em?: string | null
          resultado?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "decision_outcomes_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decision_outcomes_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "customer_360"
            referencedColumns: ["person_id"]
          },
          {
            foreignKeyName: "decision_outcomes_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decision_outcomes_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "executive_360"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "decision_outcomes_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      developers: {
        Row: {
          ativo: boolean
          cnpj: string | null
          contato_email: string | null
          contato_nome: string | null
          contato_telefone: string | null
          created_at: string
          criado_por: string | null
          id: string
          logo_url: string | null
          nome: string
          observacao: string | null
          site: string | null
          slug: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          ativo?: boolean
          cnpj?: string | null
          contato_email?: string | null
          contato_nome?: string | null
          contato_telefone?: string | null
          created_at?: string
          criado_por?: string | null
          id?: string
          logo_url?: string | null
          nome: string
          observacao?: string | null
          site?: string | null
          slug: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          ativo?: boolean
          cnpj?: string | null
          contato_email?: string | null
          contato_nome?: string | null
          contato_telefone?: string | null
          created_at?: string
          criado_por?: string | null
          id?: string
          logo_url?: string | null
          nome?: string
          observacao?: string | null
          site?: string | null
          slug?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "developers_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "executive_360"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "developers_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      domain_events: {
        Row: {
          actor_id: string | null
          aggregate: string
          aggregate_id: string | null
          causation_id: string | null
          correlation_id: string | null
          event_type: string
          event_version: number
          id: string
          occurred_at: string
          opportunity_id: string | null
          payload: Json
          person_id: string | null
          schema_version: number
          workspace_id: string
        }
        Insert: {
          actor_id?: string | null
          aggregate: string
          aggregate_id?: string | null
          causation_id?: string | null
          correlation_id?: string | null
          event_type: string
          event_version?: number
          id?: string
          occurred_at?: string
          opportunity_id?: string | null
          payload?: Json
          person_id?: string | null
          schema_version?: number
          workspace_id: string
        }
        Update: {
          actor_id?: string | null
          aggregate?: string
          aggregate_id?: string | null
          causation_id?: string | null
          correlation_id?: string | null
          event_type?: string
          event_version?: number
          id?: string
          occurred_at?: string
          opportunity_id?: string | null
          payload?: Json
          person_id?: string | null
          schema_version?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "domain_events_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "domain_events_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "customer_360"
            referencedColumns: ["person_id"]
          },
          {
            foreignKeyName: "domain_events_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "domain_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "executive_360"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "domain_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      empreendimentos: {
        Row: {
          bairro: string | null
          capa_url: string | null
          cidade: string | null
          construtora: string | null
          created_at: string
          criado_por: string | null
          descricao: string | null
          destaque: boolean
          developer_id: string | null
          entrega_prevista: string | null
          galeria: Json
          id: string
          nome: string
          preco_max: number | null
          preco_min: number | null
          publico: boolean
          responsavel_id: string | null
          segmento: Database["public"]["Enums"]["empreendimento_segmento"]
          slug: string
          status: Database["public"]["Enums"]["empreendimento_status"]
          uf: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          bairro?: string | null
          capa_url?: string | null
          cidade?: string | null
          construtora?: string | null
          created_at?: string
          criado_por?: string | null
          descricao?: string | null
          destaque?: boolean
          developer_id?: string | null
          entrega_prevista?: string | null
          galeria?: Json
          id?: string
          nome: string
          preco_max?: number | null
          preco_min?: number | null
          publico?: boolean
          responsavel_id?: string | null
          segmento?: Database["public"]["Enums"]["empreendimento_segmento"]
          slug: string
          status?: Database["public"]["Enums"]["empreendimento_status"]
          uf?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          bairro?: string | null
          capa_url?: string | null
          cidade?: string | null
          construtora?: string | null
          created_at?: string
          criado_por?: string | null
          descricao?: string | null
          destaque?: boolean
          developer_id?: string | null
          entrega_prevista?: string | null
          galeria?: Json
          id?: string
          nome?: string
          preco_max?: number | null
          preco_min?: number | null
          publico?: boolean
          responsavel_id?: string | null
          segmento?: Database["public"]["Enums"]["empreendimento_segmento"]
          slug?: string
          status?: Database["public"]["Enums"]["empreendimento_status"]
          uf?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "empreendimentos_developer_id_fkey"
            columns: ["developer_id"]
            isOneToOne: false
            referencedRelation: "developers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empreendimentos_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "executive_360"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "empreendimentos_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      equipes: {
        Row: {
          ativa: boolean
          cor: string
          created_at: string
          criado_por: string | null
          descricao: string | null
          gerente_id: string | null
          id: string
          nome: string
          parent_id: string | null
          slug: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          ativa?: boolean
          cor?: string
          created_at?: string
          criado_por?: string | null
          descricao?: string | null
          gerente_id?: string | null
          id?: string
          nome: string
          parent_id?: string | null
          slug: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          ativa?: boolean
          cor?: string
          created_at?: string
          criado_por?: string | null
          descricao?: string | null
          gerente_id?: string | null
          id?: string
          nome?: string
          parent_id?: string | null
          slug?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipes_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "equipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipes_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "executive_360"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "equipes_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      files: {
        Row: {
          bucket: string
          created_at: string
          entity: string
          entity_id: string | null
          enviado_por: string | null
          id: string
          mime_type: string | null
          nome: string
          path: string
          tamanho_bytes: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          bucket?: string
          created_at?: string
          entity: string
          entity_id?: string | null
          enviado_por?: string | null
          id?: string
          mime_type?: string | null
          nome: string
          path: string
          tamanho_bytes?: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          bucket?: string
          created_at?: string
          entity?: string
          entity_id?: string | null
          enviado_por?: string | null
          id?: string
          mime_type?: string | null
          nome?: string
          path?: string
          tamanho_bytes?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "files_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "executive_360"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "files_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_pages: {
        Row: {
          ativa: boolean
          campanha: string | null
          created_at: string
          criado_por: string | null
          cta_texto: string
          descricao: string | null
          empreendimento_id: string | null
          hero_url: string | null
          id: string
          slug: string
          subtitulo: string | null
          titulo: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          ativa?: boolean
          campanha?: string | null
          created_at?: string
          criado_por?: string | null
          cta_texto?: string
          descricao?: string | null
          empreendimento_id?: string | null
          hero_url?: string | null
          id?: string
          slug: string
          subtitulo?: string | null
          titulo: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          ativa?: boolean
          campanha?: string | null
          created_at?: string
          criado_por?: string | null
          cta_texto?: string
          descricao?: string | null
          empreendimento_id?: string | null
          hero_url?: string | null
          id?: string
          slug?: string
          subtitulo?: string | null
          titulo?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "landing_pages_empreendimento_id_fkey"
            columns: ["empreendimento_id"]
            isOneToOne: false
            referencedRelation: "empreendimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "landing_pages_empreendimento_id_fkey"
            columns: ["empreendimento_id"]
            isOneToOne: false
            referencedRelation: "property_360"
            referencedColumns: ["empreendimento_id"]
          },
          {
            foreignKeyName: "landing_pages_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "executive_360"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "landing_pages_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_eventos: {
        Row: {
          autor_id: string | null
          created_at: string
          descricao: string | null
          id: string
          lead_id: string
          metadata: Json
          tipo: string
          workspace_id: string
        }
        Insert: {
          autor_id?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          lead_id: string
          metadata?: Json
          tipo: string
          workspace_id: string
        }
        Update: {
          autor_id?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          lead_id?: string
          metadata?: Json
          tipo?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_eventos_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_eventos_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "executive_360"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "lead_eventos_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          created_at: string
          criado_por: string | null
          email: string | null
          empreendimento_id: string | null
          estagio: Database["public"]["Enums"]["lead_estagio"]
          id: string
          landing_page_id: string | null
          nome: string
          observacao: string | null
          origem: Database["public"]["Enums"]["lead_origem"]
          perdido_motivo: string | null
          responsavel_id: string | null
          score: number
          telefone: string | null
          temperatura: Database["public"]["Enums"]["lead_temperatura"]
          ultimo_contato_em: string | null
          updated_at: string
          valor_estimado: number | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          criado_por?: string | null
          email?: string | null
          empreendimento_id?: string | null
          estagio?: Database["public"]["Enums"]["lead_estagio"]
          id?: string
          landing_page_id?: string | null
          nome: string
          observacao?: string | null
          origem?: Database["public"]["Enums"]["lead_origem"]
          perdido_motivo?: string | null
          responsavel_id?: string | null
          score?: number
          telefone?: string | null
          temperatura?: Database["public"]["Enums"]["lead_temperatura"]
          ultimo_contato_em?: string | null
          updated_at?: string
          valor_estimado?: number | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          criado_por?: string | null
          email?: string | null
          empreendimento_id?: string | null
          estagio?: Database["public"]["Enums"]["lead_estagio"]
          id?: string
          landing_page_id?: string | null
          nome?: string
          observacao?: string | null
          origem?: Database["public"]["Enums"]["lead_origem"]
          perdido_motivo?: string | null
          responsavel_id?: string | null
          score?: number
          telefone?: string | null
          temperatura?: Database["public"]["Enums"]["lead_temperatura"]
          ultimo_contato_em?: string | null
          updated_at?: string
          valor_estimado?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_empreendimento_id_fkey"
            columns: ["empreendimento_id"]
            isOneToOne: false
            referencedRelation: "empreendimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_empreendimento_id_fkey"
            columns: ["empreendimento_id"]
            isOneToOne: false
            referencedRelation: "property_360"
            referencedColumns: ["empreendimento_id"]
          },
          {
            foreignKeyName: "leads_landing_page_id_fkey"
            columns: ["landing_page_id"]
            isOneToOne: false
            referencedRelation: "landing_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "executive_360"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "leads_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      market_indicator_series: {
        Row: {
          ativo: boolean
          codigo: string
          created_at: string
          descricao: string | null
          fonte_nome: string
          fonte_serie: string | null
          fonte_url: string | null
          id: string
          nome: string
          ordem: number
          periodicidade: string
          unidade: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          codigo: string
          created_at?: string
          descricao?: string | null
          fonte_nome: string
          fonte_serie?: string | null
          fonte_url?: string | null
          id?: string
          nome: string
          ordem?: number
          periodicidade: string
          unidade: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          codigo?: string
          created_at?: string
          descricao?: string | null
          fonte_nome?: string
          fonte_serie?: string | null
          fonte_url?: string | null
          id?: string
          nome?: string
          ordem?: number
          periodicidade?: string
          unidade?: string
          updated_at?: string
        }
        Relationships: []
      }
      market_indicator_values: {
        Row: {
          coletado_em: string
          created_at: string
          fonte_nome: string
          fonte_url: string | null
          id: string
          observacao: string | null
          referencia: string
          series_id: string
          valor: number
          versao: number
        }
        Insert: {
          coletado_em?: string
          created_at?: string
          fonte_nome: string
          fonte_url?: string | null
          id?: string
          observacao?: string | null
          referencia: string
          series_id: string
          valor: number
          versao?: number
        }
        Update: {
          coletado_em?: string
          created_at?: string
          fonte_nome?: string
          fonte_url?: string | null
          id?: string
          observacao?: string | null
          referencia?: string
          series_id?: string
          valor?: number
          versao?: number
        }
        Relationships: [
          {
            foreignKeyName: "market_indicator_values_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "market_indicator_series"
            referencedColumns: ["id"]
          },
        ]
      }
      market_region_snapshots: {
        Row: {
          absorcao_pct: number | null
          amostra: number | null
          coletado_em: string
          created_at: string
          created_by: string | null
          demanda_indice: number | null
          fonte_nome: string
          fonte_url: string | null
          id: string
          liquidez_indice: number | null
          metodologia: string | null
          oferta_unidades: number | null
          preco_medio_m2: number | null
          referencia: string
          region_id: string
          tempo_medio_venda_dias: number | null
          updated_at: string
          vacancia_pct: number | null
          versao: number
          workspace_id: string
        }
        Insert: {
          absorcao_pct?: number | null
          amostra?: number | null
          coletado_em?: string
          created_at?: string
          created_by?: string | null
          demanda_indice?: number | null
          fonte_nome: string
          fonte_url?: string | null
          id?: string
          liquidez_indice?: number | null
          metodologia?: string | null
          oferta_unidades?: number | null
          preco_medio_m2?: number | null
          referencia: string
          region_id: string
          tempo_medio_venda_dias?: number | null
          updated_at?: string
          vacancia_pct?: number | null
          versao?: number
          workspace_id: string
        }
        Update: {
          absorcao_pct?: number | null
          amostra?: number | null
          coletado_em?: string
          created_at?: string
          created_by?: string | null
          demanda_indice?: number | null
          fonte_nome?: string
          fonte_url?: string | null
          id?: string
          liquidez_indice?: number | null
          metodologia?: string | null
          oferta_unidades?: number | null
          preco_medio_m2?: number | null
          referencia?: string
          region_id?: string
          tempo_medio_venda_dias?: number | null
          updated_at?: string
          vacancia_pct?: number | null
          versao?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "market_region_snapshots_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "market_regions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_region_snapshots_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "executive_360"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "market_region_snapshots_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      market_regions: {
        Row: {
          cidade: string | null
          created_at: string
          created_by: string | null
          id: string
          nome: string
          observacao: string | null
          parent_id: string | null
          tipo: string
          uf: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          cidade?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          nome: string
          observacao?: string | null
          parent_id?: string | null
          tipo: string
          uf?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          cidade?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          nome?: string
          observacao?: string | null
          parent_id?: string | null
          tipo?: string
          uf?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "market_regions_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "market_regions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_regions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "executive_360"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "market_regions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      memory_campaigns: {
        Row: {
          canal: string | null
          created_at: string
          created_by: string | null
          estrategia: string
          fim: string | null
          id: string
          inicio: string | null
          investimento: number
          leads: number
          motivo_encerramento: string | null
          motivo_mudanca: string | null
          motivo_nascimento: string | null
          nome: string
          objetivo: string
          oportunidades: number
          publico: string | null
          receita: number
          responsavel_id: string | null
          responsavel_nome: string | null
          status: Database["public"]["Enums"]["memory_campaign_status"]
          tema: string | null
          updated_at: string
          vendas: number
          workspace_id: string
        }
        Insert: {
          canal?: string | null
          created_at?: string
          created_by?: string | null
          estrategia: string
          fim?: string | null
          id?: string
          inicio?: string | null
          investimento?: number
          leads?: number
          motivo_encerramento?: string | null
          motivo_mudanca?: string | null
          motivo_nascimento?: string | null
          nome: string
          objetivo: string
          oportunidades?: number
          publico?: string | null
          receita?: number
          responsavel_id?: string | null
          responsavel_nome?: string | null
          status?: Database["public"]["Enums"]["memory_campaign_status"]
          tema?: string | null
          updated_at?: string
          vendas?: number
          workspace_id: string
        }
        Update: {
          canal?: string | null
          created_at?: string
          created_by?: string | null
          estrategia?: string
          fim?: string | null
          id?: string
          inicio?: string | null
          investimento?: number
          leads?: number
          motivo_encerramento?: string | null
          motivo_mudanca?: string | null
          motivo_nascimento?: string | null
          nome?: string
          objetivo?: string
          oportunidades?: number
          publico?: string | null
          receita?: number
          responsavel_id?: string | null
          responsavel_nome?: string | null
          status?: Database["public"]["Enums"]["memory_campaign_status"]
          tema?: string | null
          updated_at?: string
          vendas?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memory_campaigns_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "executive_360"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "memory_campaigns_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      memory_decisions: {
        Row: {
          aprovado_em: string | null
          aprovado_por: string | null
          avaliacao: number | null
          avaliado_em: string | null
          categoria: Database["public"]["Enums"]["memory_categoria"]
          contexto: string
          created_at: string
          created_by: string | null
          evidencias: Json
          executado_em: string | null
          hipotese: string | null
          id: string
          impacto: string | null
          motivo: string
          participantes: string[]
          prazo: string | null
          responsavel_id: string | null
          responsavel_nome: string | null
          resultado: string | null
          resultado_valor: number | null
          revisado_em: string | null
          revisao: string | null
          rollback_plano: string | null
          status: Database["public"]["Enums"]["memory_decision_status"]
          tags: string[]
          tema: string | null
          titulo: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          avaliacao?: number | null
          avaliado_em?: string | null
          categoria?: Database["public"]["Enums"]["memory_categoria"]
          contexto: string
          created_at?: string
          created_by?: string | null
          evidencias?: Json
          executado_em?: string | null
          hipotese?: string | null
          id?: string
          impacto?: string | null
          motivo: string
          participantes?: string[]
          prazo?: string | null
          responsavel_id?: string | null
          responsavel_nome?: string | null
          resultado?: string | null
          resultado_valor?: number | null
          revisado_em?: string | null
          revisao?: string | null
          rollback_plano?: string | null
          status?: Database["public"]["Enums"]["memory_decision_status"]
          tags?: string[]
          tema?: string | null
          titulo: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          avaliacao?: number | null
          avaliado_em?: string | null
          categoria?: Database["public"]["Enums"]["memory_categoria"]
          contexto?: string
          created_at?: string
          created_by?: string | null
          evidencias?: Json
          executado_em?: string | null
          hipotese?: string | null
          id?: string
          impacto?: string | null
          motivo?: string
          participantes?: string[]
          prazo?: string | null
          responsavel_id?: string | null
          responsavel_nome?: string | null
          resultado?: string | null
          resultado_valor?: number | null
          revisado_em?: string | null
          revisao?: string | null
          rollback_plano?: string | null
          status?: Database["public"]["Enums"]["memory_decision_status"]
          tags?: string[]
          tema?: string | null
          titulo?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memory_decisions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "executive_360"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "memory_decisions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      memory_lessons: {
        Row: {
          campaign_id: string | null
          created_at: string
          created_by: string | null
          decision_id: string | null
          evidencias: Json
          id: string
          licao: string
          origem: string
          responsavel_id: string | null
          tema: string | null
          tipo: Database["public"]["Enums"]["memory_lesson_tipo"]
          titulo: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          created_by?: string | null
          decision_id?: string | null
          evidencias?: Json
          id?: string
          licao: string
          origem?: string
          responsavel_id?: string | null
          tema?: string | null
          tipo: Database["public"]["Enums"]["memory_lesson_tipo"]
          titulo: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          created_by?: string | null
          decision_id?: string | null
          evidencias?: Json
          id?: string
          licao?: string
          origem?: string
          responsavel_id?: string | null
          tema?: string | null
          tipo?: Database["public"]["Enums"]["memory_lesson_tipo"]
          titulo?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memory_lessons_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "memory_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memory_lessons_decision_id_fkey"
            columns: ["decision_id"]
            isOneToOne: false
            referencedRelation: "memory_decisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memory_lessons_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "executive_360"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "memory_lessons_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      memory_playbooks: {
        Row: {
          casos: number
          created_at: string
          created_by: string | null
          gerado_em: string
          id: string
          limitacoes: string[]
          passos: Json
          periodo_fim: string | null
          periodo_inicio: string | null
          taxa_sucesso: number | null
          tema: string
          titulo: string
          updated_at: string
          versao: number
          workspace_id: string
        }
        Insert: {
          casos?: number
          created_at?: string
          created_by?: string | null
          gerado_em?: string
          id?: string
          limitacoes?: string[]
          passos?: Json
          periodo_fim?: string | null
          periodo_inicio?: string | null
          taxa_sucesso?: number | null
          tema: string
          titulo: string
          updated_at?: string
          versao?: number
          workspace_id: string
        }
        Update: {
          casos?: number
          created_at?: string
          created_by?: string | null
          gerado_em?: string
          id?: string
          limitacoes?: string[]
          passos?: Json
          periodo_fim?: string | null
          periodo_inicio?: string | null
          taxa_sucesso?: number | null
          tema?: string
          titulo?: string
          updated_at?: string
          versao?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memory_playbooks_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "executive_360"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "memory_playbooks_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      module_flags: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          module: Database["public"]["Enums"]["module_key"]
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          module: Database["public"]["Enums"]["module_key"]
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          module?: Database["public"]["Enums"]["module_key"]
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_flags_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "executive_360"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "module_flags_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          entity: string | null
          entity_id: string | null
          id: string
          lida_em: string | null
          link: string | null
          mensagem: string | null
          tipo: string
          titulo: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          lida_em?: string | null
          link?: string | null
          mensagem?: string | null
          tipo?: string
          titulo: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          lida_em?: string | null
          link?: string | null
          mensagem?: string | null
          tipo?: string
          titulo?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "executive_360"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "notifications_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunities: {
        Row: {
          created_at: string
          criado_por: string | null
          empreendimento_id: string | null
          estagio: Database["public"]["Enums"]["lead_estagio"]
          fechado_em: string | null
          ganho_motivo: string | null
          id: string
          landing_page_id: string | null
          legacy_lead_id: string | null
          origem: Database["public"]["Enums"]["lead_origem"] | null
          perdido_motivo: string | null
          person_id: string
          pipeline_id: string | null
          probabilidade: number
          proxima_acao: string | null
          proxima_acao_em: string | null
          responsavel_id: string | null
          score: number
          stage_entrou_em: string
          stage_id: string | null
          temperatura: Database["public"]["Enums"]["lead_temperatura"]
          titulo: string | null
          unidade_id: string | null
          updated_at: string
          valor: number | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          criado_por?: string | null
          empreendimento_id?: string | null
          estagio?: Database["public"]["Enums"]["lead_estagio"]
          fechado_em?: string | null
          ganho_motivo?: string | null
          id?: string
          landing_page_id?: string | null
          legacy_lead_id?: string | null
          origem?: Database["public"]["Enums"]["lead_origem"] | null
          perdido_motivo?: string | null
          person_id: string
          pipeline_id?: string | null
          probabilidade?: number
          proxima_acao?: string | null
          proxima_acao_em?: string | null
          responsavel_id?: string | null
          score?: number
          stage_entrou_em?: string
          stage_id?: string | null
          temperatura?: Database["public"]["Enums"]["lead_temperatura"]
          titulo?: string | null
          unidade_id?: string | null
          updated_at?: string
          valor?: number | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          criado_por?: string | null
          empreendimento_id?: string | null
          estagio?: Database["public"]["Enums"]["lead_estagio"]
          fechado_em?: string | null
          ganho_motivo?: string | null
          id?: string
          landing_page_id?: string | null
          legacy_lead_id?: string | null
          origem?: Database["public"]["Enums"]["lead_origem"] | null
          perdido_motivo?: string | null
          person_id?: string
          pipeline_id?: string | null
          probabilidade?: number
          proxima_acao?: string | null
          proxima_acao_em?: string | null
          responsavel_id?: string | null
          score?: number
          stage_entrou_em?: string
          stage_id?: string | null
          temperatura?: Database["public"]["Enums"]["lead_temperatura"]
          titulo?: string | null
          unidade_id?: string | null
          updated_at?: string
          valor?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_empreendimento_id_fkey"
            columns: ["empreendimento_id"]
            isOneToOne: false
            referencedRelation: "empreendimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_empreendimento_id_fkey"
            columns: ["empreendimento_id"]
            isOneToOne: false
            referencedRelation: "property_360"
            referencedColumns: ["empreendimento_id"]
          },
          {
            foreignKeyName: "opportunities_landing_page_id_fkey"
            columns: ["landing_page_id"]
            isOneToOne: false
            referencedRelation: "landing_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "customer_360"
            referencedColumns: ["person_id"]
          },
          {
            foreignKeyName: "opportunities_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "executive_360"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "opportunities_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      org_knowledge_usage: {
        Row: {
          campaign_id: string | null
          contexto: string
          created_at: string
          created_by: string | null
          decision_id: string | null
          entidade: Database["public"]["Enums"]["org_entidade"]
          entidade_id: string
          id: string
          resultado: string | null
          usado_em: string
          usado_nome: string | null
          usado_por: string | null
          versao: number | null
          workspace_id: string
        }
        Insert: {
          campaign_id?: string | null
          contexto: string
          created_at?: string
          created_by?: string | null
          decision_id?: string | null
          entidade: Database["public"]["Enums"]["org_entidade"]
          entidade_id: string
          id?: string
          resultado?: string | null
          usado_em?: string
          usado_nome?: string | null
          usado_por?: string | null
          versao?: number | null
          workspace_id: string
        }
        Update: {
          campaign_id?: string | null
          contexto?: string
          created_at?: string
          created_by?: string | null
          decision_id?: string | null
          entidade?: Database["public"]["Enums"]["org_entidade"]
          entidade_id?: string
          id?: string
          resultado?: string | null
          usado_em?: string
          usado_nome?: string | null
          usado_por?: string | null
          versao?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_knowledge_usage_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "memory_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_knowledge_usage_decision_id_fkey"
            columns: ["decision_id"]
            isOneToOne: false
            referencedRelation: "memory_decisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_knowledge_usage_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "executive_360"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "org_knowledge_usage_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      org_knowledge_versions: {
        Row: {
          aprovado_nome: string | null
          aprovado_por: string
          created_at: string
          created_by: string | null
          entidade: Database["public"]["Enums"]["org_entidade"]
          entidade_id: string
          evidencias: Json
          id: string
          motivo: string
          mudanca: string
          substituida_em: string | null
          tema: string
          titulo: string
          updated_at: string
          versao: number
          vigente_em: string
          workspace_id: string
        }
        Insert: {
          aprovado_nome?: string | null
          aprovado_por: string
          created_at?: string
          created_by?: string | null
          entidade: Database["public"]["Enums"]["org_entidade"]
          entidade_id: string
          evidencias?: Json
          id?: string
          motivo: string
          mudanca: string
          substituida_em?: string | null
          tema: string
          titulo: string
          updated_at?: string
          versao: number
          vigente_em?: string
          workspace_id: string
        }
        Update: {
          aprovado_nome?: string | null
          aprovado_por?: string
          created_at?: string
          created_by?: string | null
          entidade?: Database["public"]["Enums"]["org_entidade"]
          entidade_id?: string
          evidencias?: Json
          id?: string
          motivo?: string
          mudanca?: string
          substituida_em?: string | null
          tema?: string
          titulo?: string
          updated_at?: string
          versao?: number
          vigente_em?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_knowledge_versions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "executive_360"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "org_knowledge_versions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      outbox_events: {
        Row: {
          canal: string
          created_at: string
          destino: string | null
          disponivel_em: string
          domain_event_id: string | null
          event_type: string
          id: string
          idempotency_key: string | null
          max_tentativas: number
          payload: Json
          processado_em: string | null
          rule_id: string | null
          status: Database["public"]["Enums"]["outbox_status"]
          tentativas: number
          ultimo_erro: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          canal?: string
          created_at?: string
          destino?: string | null
          disponivel_em?: string
          domain_event_id?: string | null
          event_type: string
          id?: string
          idempotency_key?: string | null
          max_tentativas?: number
          payload?: Json
          processado_em?: string | null
          rule_id?: string | null
          status?: Database["public"]["Enums"]["outbox_status"]
          tentativas?: number
          ultimo_erro?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          canal?: string
          created_at?: string
          destino?: string | null
          disponivel_em?: string
          domain_event_id?: string | null
          event_type?: string
          id?: string
          idempotency_key?: string | null
          max_tentativas?: number
          payload?: Json
          processado_em?: string | null
          rule_id?: string | null
          status?: Database["public"]["Enums"]["outbox_status"]
          tentativas?: number
          ultimo_erro?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "outbox_events_domain_event_id_fkey"
            columns: ["domain_event_id"]
            isOneToOne: false
            referencedRelation: "domain_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outbox_events_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "automation_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outbox_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "executive_360"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "outbox_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      people: {
        Row: {
          avatar_url: string | null
          created_at: string
          criado_por: string | null
          documento: string | null
          documento_norm: string | null
          estagio_jornada: Database["public"]["Enums"]["person_estagio"]
          id: string
          legacy_cliente_id: string | null
          legacy_lead_id: string | null
          merged_into: string | null
          nascimento: string | null
          nome: string
          nome_social: string | null
          observacao: string | null
          origem: Database["public"]["Enums"]["lead_origem"] | null
          responsavel_id: string | null
          tipo: Database["public"]["Enums"]["person_tipo"]
          ultimo_contato_em: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          criado_por?: string | null
          documento?: string | null
          documento_norm?: string | null
          estagio_jornada?: Database["public"]["Enums"]["person_estagio"]
          id?: string
          legacy_cliente_id?: string | null
          legacy_lead_id?: string | null
          merged_into?: string | null
          nascimento?: string | null
          nome: string
          nome_social?: string | null
          observacao?: string | null
          origem?: Database["public"]["Enums"]["lead_origem"] | null
          responsavel_id?: string | null
          tipo?: Database["public"]["Enums"]["person_tipo"]
          ultimo_contato_em?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          criado_por?: string | null
          documento?: string | null
          documento_norm?: string | null
          estagio_jornada?: Database["public"]["Enums"]["person_estagio"]
          id?: string
          legacy_cliente_id?: string | null
          legacy_lead_id?: string | null
          merged_into?: string | null
          nascimento?: string | null
          nome?: string
          nome_social?: string | null
          observacao?: string | null
          origem?: Database["public"]["Enums"]["lead_origem"] | null
          responsavel_id?: string | null
          tipo?: Database["public"]["Enums"]["person_tipo"]
          ultimo_contato_em?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "people_merged_into_fkey"
            columns: ["merged_into"]
            isOneToOne: false
            referencedRelation: "customer_360"
            referencedColumns: ["person_id"]
          },
          {
            foreignKeyName: "people_merged_into_fkey"
            columns: ["merged_into"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "executive_360"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "people_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      person_addresses: {
        Row: {
          bairro: string | null
          cep: string | null
          cidade: string | null
          complemento: string | null
          created_at: string
          id: string
          logradouro: string | null
          numero: string | null
          person_id: string
          principal: boolean
          tipo: Database["public"]["Enums"]["address_tipo"]
          uf: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          created_at?: string
          id?: string
          logradouro?: string | null
          numero?: string | null
          person_id: string
          principal?: boolean
          tipo?: Database["public"]["Enums"]["address_tipo"]
          uf?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          created_at?: string
          id?: string
          logradouro?: string | null
          numero?: string | null
          person_id?: string
          principal?: boolean
          tipo?: Database["public"]["Enums"]["address_tipo"]
          uf?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "person_addresses_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "customer_360"
            referencedColumns: ["person_id"]
          },
          {
            foreignKeyName: "person_addresses_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_addresses_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "executive_360"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "person_addresses_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      person_contacts: {
        Row: {
          canal: Database["public"]["Enums"]["contact_canal"]
          created_at: string
          id: string
          person_id: string
          principal: boolean
          rotulo: string | null
          updated_at: string
          valor: string
          valor_norm: string | null
          verificado: boolean
          workspace_id: string
        }
        Insert: {
          canal: Database["public"]["Enums"]["contact_canal"]
          created_at?: string
          id?: string
          person_id: string
          principal?: boolean
          rotulo?: string | null
          updated_at?: string
          valor: string
          valor_norm?: string | null
          verificado?: boolean
          workspace_id: string
        }
        Update: {
          canal?: Database["public"]["Enums"]["contact_canal"]
          created_at?: string
          id?: string
          person_id?: string
          principal?: boolean
          rotulo?: string | null
          updated_at?: string
          valor?: string
          valor_norm?: string | null
          verificado?: boolean
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "person_contacts_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "customer_360"
            referencedColumns: ["person_id"]
          },
          {
            foreignKeyName: "person_contacts_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_contacts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "executive_360"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "person_contacts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      person_qualifications: {
        Row: {
          area_min: number | null
          atualizado_por: string | null
          bairros_desejados: string[]
          banco_preferido: string | null
          cidade: string | null
          created_at: string
          dormitorios_min: number | null
          entrada_disponivel: number | null
          fgts_valor: number | null
          id: string
          observacao: string | null
          perfil: Database["public"]["Enums"]["perfil_compra"]
          person_id: string
          prazo_meses: number | null
          preco_teto: number | null
          primeiro_imovel: boolean
          renda_mensal: number | null
          restricao_credito: boolean
          uf: string | null
          updated_at: string
          usa_fgts: boolean
          vagas_min: number | null
          workspace_id: string
        }
        Insert: {
          area_min?: number | null
          atualizado_por?: string | null
          bairros_desejados?: string[]
          banco_preferido?: string | null
          cidade?: string | null
          created_at?: string
          dormitorios_min?: number | null
          entrada_disponivel?: number | null
          fgts_valor?: number | null
          id?: string
          observacao?: string | null
          perfil?: Database["public"]["Enums"]["perfil_compra"]
          person_id: string
          prazo_meses?: number | null
          preco_teto?: number | null
          primeiro_imovel?: boolean
          renda_mensal?: number | null
          restricao_credito?: boolean
          uf?: string | null
          updated_at?: string
          usa_fgts?: boolean
          vagas_min?: number | null
          workspace_id: string
        }
        Update: {
          area_min?: number | null
          atualizado_por?: string | null
          bairros_desejados?: string[]
          banco_preferido?: string | null
          cidade?: string | null
          created_at?: string
          dormitorios_min?: number | null
          entrada_disponivel?: number | null
          fgts_valor?: number | null
          id?: string
          observacao?: string | null
          perfil?: Database["public"]["Enums"]["perfil_compra"]
          person_id?: string
          prazo_meses?: number | null
          preco_teto?: number | null
          primeiro_imovel?: boolean
          renda_mensal?: number | null
          restricao_credito?: boolean
          uf?: string | null
          updated_at?: string
          usa_fgts?: boolean
          vagas_min?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "person_qualifications_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: true
            referencedRelation: "customer_360"
            referencedColumns: ["person_id"]
          },
          {
            foreignKeyName: "person_qualifications_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: true
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_qualifications_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "executive_360"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "person_qualifications_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      person_relationships: {
        Row: {
          created_at: string
          criado_por: string | null
          from_person_id: string
          id: string
          observacao: string | null
          tipo: Database["public"]["Enums"]["relationship_tipo"]
          to_person_id: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          criado_por?: string | null
          from_person_id: string
          id?: string
          observacao?: string | null
          tipo: Database["public"]["Enums"]["relationship_tipo"]
          to_person_id: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          criado_por?: string | null
          from_person_id?: string
          id?: string
          observacao?: string | null
          tipo?: Database["public"]["Enums"]["relationship_tipo"]
          to_person_id?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "person_relationships_from_person_id_fkey"
            columns: ["from_person_id"]
            isOneToOne: false
            referencedRelation: "customer_360"
            referencedColumns: ["person_id"]
          },
          {
            foreignKeyName: "person_relationships_from_person_id_fkey"
            columns: ["from_person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_relationships_to_person_id_fkey"
            columns: ["to_person_id"]
            isOneToOne: false
            referencedRelation: "customer_360"
            referencedColumns: ["person_id"]
          },
          {
            foreignKeyName: "person_relationships_to_person_id_fkey"
            columns: ["to_person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_relationships_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "executive_360"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "person_relationships_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      pilot_feedback: {
        Row: {
          created_at: string
          id: string
          mensagem: string
          respondido_em: string | null
          respondido_por: string | null
          resposta: string | null
          rota: string | null
          severidade: string
          status: string
          surface: string | null
          tipo: string
          updated_at: string
          user_agent: string | null
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mensagem: string
          respondido_em?: string | null
          respondido_por?: string | null
          resposta?: string | null
          rota?: string | null
          severidade?: string
          status?: string
          surface?: string | null
          tipo: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mensagem?: string
          respondido_em?: string | null
          respondido_por?: string | null
          resposta?: string | null
          rota?: string | null
          severidade?: string
          status?: string
          surface?: string | null
          tipo?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pilot_feedback_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "executive_360"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "pilot_feedback_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_stages: {
        Row: {
          automacoes: Json
          checklist: Json
          cor: string
          created_at: string
          criterios_saida: Json
          id: string
          nome: string
          ordem: number
          pipeline_id: string
          probabilidade: number
          sla_horas: number | null
          tipo: Database["public"]["Enums"]["stage_tipo"]
          updated_at: string
          workspace_id: string
        }
        Insert: {
          automacoes?: Json
          checklist?: Json
          cor?: string
          created_at?: string
          criterios_saida?: Json
          id?: string
          nome: string
          ordem?: number
          pipeline_id: string
          probabilidade?: number
          sla_horas?: number | null
          tipo?: Database["public"]["Enums"]["stage_tipo"]
          updated_at?: string
          workspace_id: string
        }
        Update: {
          automacoes?: Json
          checklist?: Json
          cor?: string
          created_at?: string
          criterios_saida?: Json
          id?: string
          nome?: string
          ordem?: number
          pipeline_id?: string
          probabilidade?: number
          sla_horas?: number | null
          tipo?: Database["public"]["Enums"]["stage_tipo"]
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_stages_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipeline_stages_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "executive_360"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "pipeline_stages_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      pipelines: {
        Row: {
          ativo: boolean
          created_at: string
          criado_por: string | null
          descricao: string | null
          id: string
          nome: string
          padrao: boolean
          slug: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          criado_por?: string | null
          descricao?: string | null
          id?: string
          nome: string
          padrao?: boolean
          slug: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          criado_por?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          padrao?: boolean
          slug?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pipelines_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "executive_360"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "pipelines_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_alerts: {
        Row: {
          chave: string
          created_at: string
          detalhe: string | null
          id: string
          limite: number | null
          metrica: string | null
          reconhecido_em: string | null
          reconhecido_por: string | null
          resolvido_em: string | null
          severidade: string
          status: string
          titulo: string
          updated_at: string
          valor: number | null
          workspace_id: string
        }
        Insert: {
          chave: string
          created_at?: string
          detalhe?: string | null
          id?: string
          limite?: number | null
          metrica?: string | null
          reconhecido_em?: string | null
          reconhecido_por?: string | null
          resolvido_em?: string | null
          severidade: string
          status?: string
          titulo: string
          updated_at?: string
          valor?: number | null
          workspace_id: string
        }
        Update: {
          chave?: string
          created_at?: string
          detalhe?: string | null
          id?: string
          limite?: number | null
          metrica?: string | null
          reconhecido_em?: string | null
          reconhecido_por?: string | null
          resolvido_em?: string | null
          severidade?: string
          status?: string
          titulo?: string
          updated_at?: string
          valor?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_alerts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "executive_360"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "platform_alerts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_job_runs: {
        Row: {
          detalhe: Json
          duracao_ms: number | null
          finished_at: string | null
          id: string
          job: string
          ok: boolean
          started_at: string
          workspace_id: string | null
        }
        Insert: {
          detalhe?: Json
          duracao_ms?: number | null
          finished_at?: string | null
          id?: string
          job: string
          ok?: boolean
          started_at?: string
          workspace_id?: string | null
        }
        Update: {
          detalhe?: Json
          duracao_ms?: number | null
          finished_at?: string | null
          id?: string
          job?: string
          ok?: boolean
          started_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_job_runs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "executive_360"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "platform_job_runs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_metrics: {
        Row: {
          captured_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          metric_name: string
          metric_type: string
          metric_value: number
          workspace_id: string
        }
        Insert: {
          captured_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metric_name: string
          metric_type: string
          metric_value: number
          workspace_id: string
        }
        Update: {
          captured_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metric_name?: string
          metric_type?: string
          metric_value?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_metrics_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "executive_360"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "platform_metrics_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_telemetry: {
        Row: {
          action: string
          domain: string
          duracao_ms: number | null
          entity_id: string | null
          entity_type: string | null
          erro: string | null
          id: string
          occurred_at: string
          ok: boolean
          session_id: string | null
          surface: string | null
          user_id: string | null
          workspace_id: string
        }
        Insert: {
          action: string
          domain: string
          duracao_ms?: number | null
          entity_id?: string | null
          entity_type?: string | null
          erro?: string | null
          id?: string
          occurred_at?: string
          ok?: boolean
          session_id?: string | null
          surface?: string | null
          user_id?: string | null
          workspace_id: string
        }
        Update: {
          action?: string
          domain?: string
          duracao_ms?: number | null
          entity_id?: string | null
          entity_type?: string | null
          erro?: string | null
          id?: string
          occurred_at?: string
          ok?: boolean
          session_id?: string | null
          surface?: string | null
          user_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_telemetry_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "executive_360"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "platform_telemetry_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          cargo: string | null
          created_at: string
          email: string | null
          id: string
          nome: string | null
          telefone: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          avatar_url?: string | null
          cargo?: string | null
          created_at?: string
          email?: string | null
          id: string
          nome?: string | null
          telefone?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          avatar_url?: string | null
          cargo?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome?: string | null
          telefone?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      property_knowledge: {
        Row: {
          corpo: string | null
          created_at: string
          criado_por: string | null
          empreendimento_id: string
          id: string
          metadata: Json
          ordem: number
          publico: boolean
          tipo: Database["public"]["Enums"]["knowledge_tipo"]
          titulo: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          corpo?: string | null
          created_at?: string
          criado_por?: string | null
          empreendimento_id: string
          id?: string
          metadata?: Json
          ordem?: number
          publico?: boolean
          tipo: Database["public"]["Enums"]["knowledge_tipo"]
          titulo: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          corpo?: string | null
          created_at?: string
          criado_por?: string | null
          empreendimento_id?: string
          id?: string
          metadata?: Json
          ordem?: number
          publico?: boolean
          tipo?: Database["public"]["Enums"]["knowledge_tipo"]
          titulo?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_knowledge_empreendimento_id_fkey"
            columns: ["empreendimento_id"]
            isOneToOne: false
            referencedRelation: "empreendimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_knowledge_empreendimento_id_fkey"
            columns: ["empreendimento_id"]
            isOneToOne: false
            referencedRelation: "property_360"
            referencedColumns: ["empreendimento_id"]
          },
          {
            foreignKeyName: "property_knowledge_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "executive_360"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "property_knowledge_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      property_media: {
        Row: {
          alt: string | null
          altura: number | null
          blur: string | null
          bucket: string | null
          bytes: number | null
          created_at: string
          criado_por: string | null
          empreendimento_id: string
          id: string
          largura: number | null
          legenda: string | null
          mime: string | null
          ordem: number
          path: string | null
          publico: boolean
          tipo: Database["public"]["Enums"]["media_tipo"]
          titulo: string
          titulo_seo: string | null
          unidade_id: string | null
          updated_at: string
          url: string
          verificado_em: string | null
          workspace_id: string
        }
        Insert: {
          alt?: string | null
          altura?: number | null
          blur?: string | null
          bucket?: string | null
          bytes?: number | null
          created_at?: string
          criado_por?: string | null
          empreendimento_id: string
          id?: string
          largura?: number | null
          legenda?: string | null
          mime?: string | null
          ordem?: number
          path?: string | null
          publico?: boolean
          tipo: Database["public"]["Enums"]["media_tipo"]
          titulo: string
          titulo_seo?: string | null
          unidade_id?: string | null
          updated_at?: string
          url: string
          verificado_em?: string | null
          workspace_id: string
        }
        Update: {
          alt?: string | null
          altura?: number | null
          blur?: string | null
          bucket?: string | null
          bytes?: number | null
          created_at?: string
          criado_por?: string | null
          empreendimento_id?: string
          id?: string
          largura?: number | null
          legenda?: string | null
          mime?: string | null
          ordem?: number
          path?: string | null
          publico?: boolean
          tipo?: Database["public"]["Enums"]["media_tipo"]
          titulo?: string
          titulo_seo?: string | null
          unidade_id?: string | null
          updated_at?: string
          url?: string
          verificado_em?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_media_empreendimento_id_fkey"
            columns: ["empreendimento_id"]
            isOneToOne: false
            referencedRelation: "empreendimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_media_empreendimento_id_fkey"
            columns: ["empreendimento_id"]
            isOneToOne: false
            referencedRelation: "property_360"
            referencedColumns: ["empreendimento_id"]
          },
          {
            foreignKeyName: "property_media_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_media_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "executive_360"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "property_media_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      proposals: {
        Row: {
          arquivo_path: string | null
          banco: string | null
          condicoes: string | null
          created_at: string
          criado_por: string | null
          empreendimento_id: string | null
          entrada: number | null
          enviada_em: string | null
          id: string
          opportunity_id: string
          person_id: string | null
          prazo_meses: number | null
          respondida_em: string | null
          responsavel_id: string | null
          status: Database["public"]["Enums"]["proposal_status"]
          unidade_id: string | null
          updated_at: string
          validade: string | null
          valor: number | null
          versao: number
          workspace_id: string
        }
        Insert: {
          arquivo_path?: string | null
          banco?: string | null
          condicoes?: string | null
          created_at?: string
          criado_por?: string | null
          empreendimento_id?: string | null
          entrada?: number | null
          enviada_em?: string | null
          id?: string
          opportunity_id: string
          person_id?: string | null
          prazo_meses?: number | null
          respondida_em?: string | null
          responsavel_id?: string | null
          status?: Database["public"]["Enums"]["proposal_status"]
          unidade_id?: string | null
          updated_at?: string
          validade?: string | null
          valor?: number | null
          versao?: number
          workspace_id: string
        }
        Update: {
          arquivo_path?: string | null
          banco?: string | null
          condicoes?: string | null
          created_at?: string
          criado_por?: string | null
          empreendimento_id?: string | null
          entrada?: number | null
          enviada_em?: string | null
          id?: string
          opportunity_id?: string
          person_id?: string | null
          prazo_meses?: number | null
          respondida_em?: string | null
          responsavel_id?: string | null
          status?: Database["public"]["Enums"]["proposal_status"]
          unidade_id?: string | null
          updated_at?: string
          validade?: string | null
          valor?: number | null
          versao?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposals_empreendimento_id_fkey"
            columns: ["empreendimento_id"]
            isOneToOne: false
            referencedRelation: "empreendimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_empreendimento_id_fkey"
            columns: ["empreendimento_id"]
            isOneToOne: false
            referencedRelation: "property_360"
            referencedColumns: ["empreendimento_id"]
          },
          {
            foreignKeyName: "proposals_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "customer_360"
            referencedColumns: ["person_id"]
          },
          {
            foreignKeyName: "proposals_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "executive_360"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "proposals_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      propostas: {
        Row: {
          cliente_id: string | null
          condicoes: string | null
          created_at: string
          criado_por: string | null
          empreendimento_id: string | null
          entrada: number | null
          id: string
          lead_id: string | null
          person_id: string | null
          responsavel_id: string | null
          status: Database["public"]["Enums"]["proposta_status"]
          unidade_id: string | null
          updated_at: string
          validade: string | null
          valor: number | null
          workspace_id: string
        }
        Insert: {
          cliente_id?: string | null
          condicoes?: string | null
          created_at?: string
          criado_por?: string | null
          empreendimento_id?: string | null
          entrada?: number | null
          id?: string
          lead_id?: string | null
          person_id?: string | null
          responsavel_id?: string | null
          status?: Database["public"]["Enums"]["proposta_status"]
          unidade_id?: string | null
          updated_at?: string
          validade?: string | null
          valor?: number | null
          workspace_id: string
        }
        Update: {
          cliente_id?: string | null
          condicoes?: string | null
          created_at?: string
          criado_por?: string | null
          empreendimento_id?: string | null
          entrada?: number | null
          id?: string
          lead_id?: string | null
          person_id?: string | null
          responsavel_id?: string | null
          status?: Database["public"]["Enums"]["proposta_status"]
          unidade_id?: string | null
          updated_at?: string
          validade?: string | null
          valor?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "propostas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propostas_empreendimento_id_fkey"
            columns: ["empreendimento_id"]
            isOneToOne: false
            referencedRelation: "empreendimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propostas_empreendimento_id_fkey"
            columns: ["empreendimento_id"]
            isOneToOne: false
            referencedRelation: "property_360"
            referencedColumns: ["empreendimento_id"]
          },
          {
            foreignKeyName: "propostas_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propostas_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "customer_360"
            referencedColumns: ["person_id"]
          },
          {
            foreignKeyName: "propostas_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propostas_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propostas_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "executive_360"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "propostas_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      public_form_hits: {
        Row: {
          bloqueado: boolean
          created_at: string
          fingerprint: string
          formulario: string
          id: string
          motivo: string | null
          rota: string | null
        }
        Insert: {
          bloqueado?: boolean
          created_at?: string
          fingerprint: string
          formulario: string
          id?: string
          motivo?: string | null
          rota?: string | null
        }
        Update: {
          bloqueado?: boolean
          created_at?: string
          fingerprint?: string
          formulario?: string
          id?: string
          motivo?: string | null
          rota?: string | null
        }
        Relationships: []
      }
      recommendation_history: {
        Row: {
          aceita_em: string | null
          avaliada_em: string | null
          chave: string
          closed_at: string | null
          confianca: number | null
          created_at: string
          decidido_por: string | null
          gerada_em: string
          id: string
          impacto: number
          implementada_em: string | null
          mensagem: string | null
          ocorrencias: number
          quadrante: string | null
          recommendation_type: string
          resultado: Database["public"]["Enums"]["recommendation_result"]
          rule_id: string | null
          rule_nome: string | null
          score: number
          score_na_avaliacao: number | null
          score_na_implementacao: number | null
          status: Database["public"]["Enums"]["recommendation_status"]
          updated_at: string
          urgencia: number
          vista_em: string | null
          workspace_id: string
        }
        Insert: {
          aceita_em?: string | null
          avaliada_em?: string | null
          chave: string
          closed_at?: string | null
          confianca?: number | null
          created_at?: string
          decidido_por?: string | null
          gerada_em?: string
          id?: string
          impacto?: number
          implementada_em?: string | null
          mensagem?: string | null
          ocorrencias?: number
          quadrante?: string | null
          recommendation_type: string
          resultado?: Database["public"]["Enums"]["recommendation_result"]
          rule_id?: string | null
          rule_nome?: string | null
          score?: number
          score_na_avaliacao?: number | null
          score_na_implementacao?: number | null
          status?: Database["public"]["Enums"]["recommendation_status"]
          updated_at?: string
          urgencia?: number
          vista_em?: string | null
          workspace_id: string
        }
        Update: {
          aceita_em?: string | null
          avaliada_em?: string | null
          chave?: string
          closed_at?: string | null
          confianca?: number | null
          created_at?: string
          decidido_por?: string | null
          gerada_em?: string
          id?: string
          impacto?: number
          implementada_em?: string | null
          mensagem?: string | null
          ocorrencias?: number
          quadrante?: string | null
          recommendation_type?: string
          resultado?: Database["public"]["Enums"]["recommendation_result"]
          rule_id?: string | null
          rule_nome?: string | null
          score?: number
          score_na_avaliacao?: number | null
          score_na_implementacao?: number | null
          status?: Database["public"]["Enums"]["recommendation_status"]
          updated_at?: string
          urgencia?: number
          vista_em?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_history_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "executive_360"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "recommendation_history_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      releases: {
        Row: {
          created_at: string
          criado_por: string | null
          descricao: string | null
          empreendimento_id: string
          entrega_prevista: string | null
          entrega_real: string | null
          id: string
          lancamento_em: string | null
          nome: string
          ordem: number
          status: Database["public"]["Enums"]["release_status"]
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          criado_por?: string | null
          descricao?: string | null
          empreendimento_id: string
          entrega_prevista?: string | null
          entrega_real?: string | null
          id?: string
          lancamento_em?: string | null
          nome: string
          ordem?: number
          status?: Database["public"]["Enums"]["release_status"]
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          criado_por?: string | null
          descricao?: string | null
          empreendimento_id?: string
          entrega_prevista?: string | null
          entrega_real?: string | null
          id?: string
          lancamento_em?: string | null
          nome?: string
          ordem?: number
          status?: Database["public"]["Enums"]["release_status"]
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "releases_empreendimento_id_fkey"
            columns: ["empreendimento_id"]
            isOneToOne: false
            referencedRelation: "empreendimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "releases_empreendimento_id_fkey"
            columns: ["empreendimento_id"]
            isOneToOne: false
            referencedRelation: "property_360"
            referencedColumns: ["empreendimento_id"]
          },
          {
            foreignKeyName: "releases_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "executive_360"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "releases_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      reservations: {
        Row: {
          cancelada_em: string | null
          cancelamento_motivo: string | null
          created_at: string
          criado_por: string | null
          expira_em: string
          id: string
          observacao: string | null
          opportunity_id: string
          person_id: string | null
          proposal_id: string | null
          status: Database["public"]["Enums"]["reservation_status"]
          unidade_id: string | null
          updated_at: string
          valor: number | null
          workspace_id: string
        }
        Insert: {
          cancelada_em?: string | null
          cancelamento_motivo?: string | null
          created_at?: string
          criado_por?: string | null
          expira_em: string
          id?: string
          observacao?: string | null
          opportunity_id: string
          person_id?: string | null
          proposal_id?: string | null
          status?: Database["public"]["Enums"]["reservation_status"]
          unidade_id?: string | null
          updated_at?: string
          valor?: number | null
          workspace_id: string
        }
        Update: {
          cancelada_em?: string | null
          cancelamento_motivo?: string | null
          created_at?: string
          criado_por?: string | null
          expira_em?: string
          id?: string
          observacao?: string | null
          opportunity_id?: string
          person_id?: string | null
          proposal_id?: string | null
          status?: Database["public"]["Enums"]["reservation_status"]
          unidade_id?: string | null
          updated_at?: string
          valor?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservations_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "customer_360"
            referencedColumns: ["person_id"]
          },
          {
            foreignKeyName: "reservations_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "executive_360"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "reservations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string
          id: string
          module: Database["public"]["Enums"]["module_key"]
          nivel: Database["public"]["Enums"]["permission_level"]
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          module: Database["public"]["Enums"]["module_key"]
          nivel?: Database["public"]["Enums"]["permission_level"]
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          module?: Database["public"]["Enums"]["module_key"]
          nivel?: Database["public"]["Enums"]["permission_level"]
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "executive_360"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "role_permissions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          assinado_em: string | null
          banco: string | null
          cancelado_em: string | null
          cancelamento_motivo: string | null
          comissao_percentual: number | null
          comissao_valor: number | null
          corretor_id: string | null
          created_at: string
          criado_por: string | null
          id: string
          opportunity_id: string
          person_id: string | null
          proposal_id: string | null
          reservation_id: string | null
          status: Database["public"]["Enums"]["sale_status"]
          unidade_id: string | null
          updated_at: string
          valor_final: number | null
          workspace_id: string
        }
        Insert: {
          assinado_em?: string | null
          banco?: string | null
          cancelado_em?: string | null
          cancelamento_motivo?: string | null
          comissao_percentual?: number | null
          comissao_valor?: number | null
          corretor_id?: string | null
          created_at?: string
          criado_por?: string | null
          id?: string
          opportunity_id: string
          person_id?: string | null
          proposal_id?: string | null
          reservation_id?: string | null
          status?: Database["public"]["Enums"]["sale_status"]
          unidade_id?: string | null
          updated_at?: string
          valor_final?: number | null
          workspace_id: string
        }
        Update: {
          assinado_em?: string | null
          banco?: string | null
          cancelado_em?: string | null
          cancelamento_motivo?: string | null
          comissao_percentual?: number | null
          comissao_valor?: number | null
          corretor_id?: string | null
          created_at?: string
          criado_por?: string | null
          id?: string
          opportunity_id?: string
          person_id?: string | null
          proposal_id?: string | null
          reservation_id?: string | null
          status?: Database["public"]["Enums"]["sale_status"]
          unidade_id?: string | null
          updated_at?: string
          valor_final?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "customer_360"
            referencedColumns: ["person_id"]
          },
          {
            foreignKeyName: "sales_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "executive_360"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "sales_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      taggings: {
        Row: {
          created_at: string
          criado_por: string | null
          entity: string
          entity_id: string
          id: string
          tag_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          criado_por?: string | null
          entity: string
          entity_id: string
          id?: string
          tag_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          criado_por?: string | null
          entity?: string
          entity_id?: string
          id?: string
          tag_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "taggings_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "taggings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "executive_360"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "taggings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          cor: string
          created_at: string
          criado_por: string | null
          escopo: string | null
          id: string
          nome: string
          slug: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          cor?: string
          created_at?: string
          criado_por?: string | null
          escopo?: string | null
          id?: string
          nome: string
          slug: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          cor?: string
          created_at?: string
          criado_por?: string | null
          escopo?: string | null
          id?: string
          nome?: string
          slug?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tags_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "executive_360"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "tags_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          concluida_em: string | null
          created_at: string
          criado_por: string | null
          descricao: string | null
          id: string
          opportunity_id: string | null
          origem: Database["public"]["Enums"]["task_origem"]
          person_id: string | null
          prioridade: Database["public"]["Enums"]["task_prioridade"]
          responsavel_id: string | null
          status: Database["public"]["Enums"]["task_status"]
          titulo: string
          updated_at: string
          vence_em: string | null
          workspace_id: string
        }
        Insert: {
          concluida_em?: string | null
          created_at?: string
          criado_por?: string | null
          descricao?: string | null
          id?: string
          opportunity_id?: string | null
          origem?: Database["public"]["Enums"]["task_origem"]
          person_id?: string | null
          prioridade?: Database["public"]["Enums"]["task_prioridade"]
          responsavel_id?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          titulo: string
          updated_at?: string
          vence_em?: string | null
          workspace_id: string
        }
        Update: {
          concluida_em?: string | null
          created_at?: string
          criado_por?: string | null
          descricao?: string | null
          id?: string
          opportunity_id?: string | null
          origem?: Database["public"]["Enums"]["task_origem"]
          person_id?: string | null
          prioridade?: Database["public"]["Enums"]["task_prioridade"]
          responsavel_id?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          titulo?: string
          updated_at?: string
          vence_em?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "customer_360"
            referencedColumns: ["person_id"]
          },
          {
            foreignKeyName: "tasks_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "executive_360"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "tasks_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      towers: {
        Row: {
          andares: number | null
          created_at: string
          criado_por: string | null
          empreendimento_id: string
          id: string
          nome: string
          observacao: string | null
          release_id: string | null
          unidades_por_andar: number | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          andares?: number | null
          created_at?: string
          criado_por?: string | null
          empreendimento_id: string
          id?: string
          nome: string
          observacao?: string | null
          release_id?: string | null
          unidades_por_andar?: number | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          andares?: number | null
          created_at?: string
          criado_por?: string | null
          empreendimento_id?: string
          id?: string
          nome?: string
          observacao?: string | null
          release_id?: string | null
          unidades_por_andar?: number | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "towers_empreendimento_id_fkey"
            columns: ["empreendimento_id"]
            isOneToOne: false
            referencedRelation: "empreendimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "towers_empreendimento_id_fkey"
            columns: ["empreendimento_id"]
            isOneToOne: false
            referencedRelation: "property_360"
            referencedColumns: ["empreendimento_id"]
          },
          {
            foreignKeyName: "towers_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "releases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "towers_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "executive_360"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "towers_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      unidades: {
        Row: {
          andar: number | null
          area_privativa: number | null
          area_total: number | null
          argumentos: Json
          campanha: string | null
          comissao_percentual: number | null
          created_at: string
          criado_por: string | null
          deposito: boolean
          dormitorios: number | null
          empreendimento_id: string
          final: string | null
          id: string
          identificador: string
          objecoes: Json
          perfil_ideal: string | null
          preco: number | null
          release_id: string | null
          score_liquidez: number
          status: Database["public"]["Enums"]["unidade_status"]
          suites: number | null
          tipologia: string | null
          tower_id: string | null
          updated_at: string
          vagas: number | null
          varanda: boolean
          workspace_id: string
        }
        Insert: {
          andar?: number | null
          area_privativa?: number | null
          area_total?: number | null
          argumentos?: Json
          campanha?: string | null
          comissao_percentual?: number | null
          created_at?: string
          criado_por?: string | null
          deposito?: boolean
          dormitorios?: number | null
          empreendimento_id: string
          final?: string | null
          id?: string
          identificador: string
          objecoes?: Json
          perfil_ideal?: string | null
          preco?: number | null
          release_id?: string | null
          score_liquidez?: number
          status?: Database["public"]["Enums"]["unidade_status"]
          suites?: number | null
          tipologia?: string | null
          tower_id?: string | null
          updated_at?: string
          vagas?: number | null
          varanda?: boolean
          workspace_id: string
        }
        Update: {
          andar?: number | null
          area_privativa?: number | null
          area_total?: number | null
          argumentos?: Json
          campanha?: string | null
          comissao_percentual?: number | null
          created_at?: string
          criado_por?: string | null
          deposito?: boolean
          dormitorios?: number | null
          empreendimento_id?: string
          final?: string | null
          id?: string
          identificador?: string
          objecoes?: Json
          perfil_ideal?: string | null
          preco?: number | null
          release_id?: string | null
          score_liquidez?: number
          status?: Database["public"]["Enums"]["unidade_status"]
          suites?: number | null
          tipologia?: string | null
          tower_id?: string | null
          updated_at?: string
          vagas?: number | null
          varanda?: boolean
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "unidades_empreendimento_id_fkey"
            columns: ["empreendimento_id"]
            isOneToOne: false
            referencedRelation: "empreendimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unidades_empreendimento_id_fkey"
            columns: ["empreendimento_id"]
            isOneToOne: false
            referencedRelation: "property_360"
            referencedColumns: ["empreendimento_id"]
          },
          {
            foreignKeyName: "unidades_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "releases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unidades_tower_id_fkey"
            columns: ["tower_id"]
            isOneToOne: false
            referencedRelation: "towers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unidades_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "executive_360"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "unidades_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      unit_price_history: {
        Row: {
          autor_id: string | null
          created_at: string
          id: string
          motivo: string | null
          preco: number
          preco_anterior: number | null
          unidade_id: string
          variacao_percentual: number | null
          workspace_id: string
        }
        Insert: {
          autor_id?: string | null
          created_at?: string
          id?: string
          motivo?: string | null
          preco: number
          preco_anterior?: number | null
          unidade_id: string
          variacao_percentual?: number | null
          workspace_id: string
        }
        Update: {
          autor_id?: string | null
          created_at?: string
          id?: string
          motivo?: string | null
          preco?: number
          preco_anterior?: number | null
          unidade_id?: string
          variacao_percentual?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "unit_price_history_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unit_price_history_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "executive_360"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "unit_price_history_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "executive_360"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "user_roles_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      visits: {
        Row: {
          acompanhantes: Json
          agendada_para: string
          compareceu: boolean | null
          corretor_id: string | null
          created_at: string
          criado_por: string | null
          empreendimento_id: string | null
          feedback: string | null
          fotos: Json
          id: string
          nota: number | null
          opportunity_id: string | null
          person_id: string | null
          status: Database["public"]["Enums"]["visit_status"]
          unidade_id: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          acompanhantes?: Json
          agendada_para: string
          compareceu?: boolean | null
          corretor_id?: string | null
          created_at?: string
          criado_por?: string | null
          empreendimento_id?: string | null
          feedback?: string | null
          fotos?: Json
          id?: string
          nota?: number | null
          opportunity_id?: string | null
          person_id?: string | null
          status?: Database["public"]["Enums"]["visit_status"]
          unidade_id?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          acompanhantes?: Json
          agendada_para?: string
          compareceu?: boolean | null
          corretor_id?: string | null
          created_at?: string
          criado_por?: string | null
          empreendimento_id?: string | null
          feedback?: string | null
          fotos?: Json
          id?: string
          nota?: number | null
          opportunity_id?: string | null
          person_id?: string | null
          status?: Database["public"]["Enums"]["visit_status"]
          unidade_id?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "visits_empreendimento_id_fkey"
            columns: ["empreendimento_id"]
            isOneToOne: false
            referencedRelation: "empreendimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_empreendimento_id_fkey"
            columns: ["empreendimento_id"]
            isOneToOne: false
            referencedRelation: "property_360"
            referencedColumns: ["empreendimento_id"]
          },
          {
            foreignKeyName: "visits_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "customer_360"
            referencedColumns: ["person_id"]
          },
          {
            foreignKeyName: "visits_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "executive_360"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "visits_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_invites: {
        Row: {
          aceito_em: string | null
          convidado_por: string | null
          created_at: string
          email: string
          expira_em: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          status: string
          token: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          aceito_em?: string | null
          convidado_por?: string | null
          created_at?: string
          email: string
          expira_em?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          token?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          aceito_em?: string | null
          convidado_por?: string | null
          created_at?: string
          email?: string
          expira_em?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          token?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_invites_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "executive_360"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "workspace_invites_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          ativo: boolean
          created_at: string
          equipe_id: string | null
          gestor_id: string | null
          id: string
          joined_at: string
          status: Database["public"]["Enums"]["member_status"]
          ultimo_acesso_em: string | null
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          equipe_id?: string | null
          gestor_id?: string | null
          id?: string
          joined_at?: string
          status?: Database["public"]["Enums"]["member_status"]
          ultimo_acesso_em?: string | null
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          equipe_id?: string | null
          gestor_id?: string | null
          id?: string
          joined_at?: string
          status?: Database["public"]["Enums"]["member_status"]
          ultimo_acesso_em?: string | null
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_equipe_id_fkey"
            columns: ["equipe_id"]
            isOneToOne: false
            referencedRelation: "equipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "executive_360"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_security: {
        Row: {
          created_at: string
          exigir_2fa_admin: boolean
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          exigir_2fa_admin?: boolean
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          exigir_2fa_admin?: boolean
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_security_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "executive_360"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "workspace_security_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          cnpj: string | null
          created_at: string
          criado_por: string | null
          email: string | null
          endereco_bairro: string | null
          endereco_cep: string | null
          endereco_cidade: string | null
          endereco_complemento: string | null
          endereco_logradouro: string | null
          endereco_numero: string | null
          endereco_uf: string | null
          horario_comercial: Json
          id: string
          inscricao_estadual: string | null
          logo_url: string | null
          moeda: string
          nome: string
          nome_fantasia: string | null
          plano: string
          razao_social: string | null
          recursos: Json
          site: string | null
          slug: string
          status: Database["public"]["Enums"]["workspace_status"]
          telefone: string | null
          timezone: string
          trial_expira_em: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          cnpj?: string | null
          created_at?: string
          criado_por?: string | null
          email?: string | null
          endereco_bairro?: string | null
          endereco_cep?: string | null
          endereco_cidade?: string | null
          endereco_complemento?: string | null
          endereco_logradouro?: string | null
          endereco_numero?: string | null
          endereco_uf?: string | null
          horario_comercial?: Json
          id?: string
          inscricao_estadual?: string | null
          logo_url?: string | null
          moeda?: string
          nome: string
          nome_fantasia?: string | null
          plano?: string
          razao_social?: string | null
          recursos?: Json
          site?: string | null
          slug: string
          status?: Database["public"]["Enums"]["workspace_status"]
          telefone?: string | null
          timezone?: string
          trial_expira_em?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          cnpj?: string | null
          created_at?: string
          criado_por?: string | null
          email?: string | null
          endereco_bairro?: string | null
          endereco_cep?: string | null
          endereco_cidade?: string | null
          endereco_complemento?: string | null
          endereco_logradouro?: string | null
          endereco_numero?: string | null
          endereco_uf?: string | null
          horario_comercial?: Json
          id?: string
          inscricao_estadual?: string | null
          logo_url?: string | null
          moeda?: string
          nome?: string
          nome_fantasia?: string | null
          plano?: string
          razao_social?: string | null
          recursos?: Json
          site?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["workspace_status"]
          telefone?: string | null
          timezone?: string
          trial_expira_em?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      customer_360: {
        Row: {
          atividades_total: number | null
          created_at: string | null
          dias_sem_contato: number | null
          documentos_total: number | null
          entrada_disponivel: number | null
          estagio_jornada: string | null
          nome: string | null
          oportunidades_abertas: number | null
          oportunidades_ganhas: number | null
          oportunidades_perdidas: number | null
          oportunidades_total: number | null
          origem: string | null
          perfil: string | null
          person_id: string | null
          preco_teto: number | null
          primeiro_imovel: boolean | null
          propostas_abertas: number | null
          propostas_aceitas: number | null
          propostas_total: number | null
          proxima_acao_em: string | null
          relacionamentos_total: number | null
          renda_mensal: number | null
          responsavel_id: string | null
          restricao_credito: boolean | null
          score: number | null
          tarefas_atrasadas: number | null
          tarefas_pendentes: number | null
          tem_qualificacao: boolean | null
          temperatura: string | null
          tipo: string | null
          ultima_interacao_em: string | null
          ultima_visita_em: string | null
          usa_fgts: boolean | null
          valor_ganho: number | null
          valor_pipeline: number | null
          visitas_realizadas: number | null
          visitas_total: number | null
          workspace_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "people_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "executive_360"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "people_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      executive_360: {
        Row: {
          clientes_total: number | null
          comissao_realizada: number | null
          conversao_percentual: number | null
          ganhas_mes: number | null
          ganhas_total: number | null
          novas_30d: number | null
          oportunidades_abertas: number | null
          oportunidades_total: number | null
          perdidas_total: number | null
          pessoas_30d: number | null
          pessoas_total: number | null
          pipeline_total: number | null
          receita_em_assinatura: number | null
          receita_prevista: number | null
          receita_realizada: number | null
          receita_realizada_mes: number | null
          tempo_medio_ciclo_dias: number | null
          ticket_medio: number | null
          unidades_disponiveis: number | null
          unidades_total: number | null
          valor_ganho: number | null
          valor_ganho_mes: number | null
          vendas_assinadas: number | null
          vendas_canceladas: number | null
          vgv_disponivel: number | null
          workspace_id: string | null
        }
        Relationships: []
      }
      marketing_360: {
        Row: {
          conversao_percentual: number | null
          ganhas_total: number | null
          landing_pages: number | null
          oportunidades_30d: number | null
          oportunidades_abertas: number | null
          oportunidades_total: number | null
          origem: string | null
          perdidas_total: number | null
          pessoas_30d: number | null
          pessoas_total: number | null
          tempo_medio_conversao_dias: number | null
          ticket_medio: number | null
          valor_ganho: number | null
          valor_pipeline: number | null
          workspace_id: string | null
        }
        Relationships: []
      }
      property_360: {
        Row: {
          cidade: string | null
          comissao_media: number | null
          conversao_percentual: number | null
          created_at: string | null
          empreendimento_id: string | null
          entrega_prevista: string | null
          estoque_meses: number | null
          giro_percentual: number | null
          nome: string | null
          nota_media: number | null
          oportunidades_abertas: number | null
          oportunidades_ganhas: number | null
          oportunidades_total: number | null
          perfil_predominante: string | null
          preco_medio: number | null
          receita_assinada: number | null
          reservas_30d: number | null
          reservas_ativas: number | null
          score_liquidez_medio: number | null
          segmento: string | null
          status: string | null
          uf: string | null
          unidades_bloqueadas: number | null
          unidades_disponiveis: number | null
          unidades_reservadas: number | null
          unidades_total: number | null
          unidades_vendidas: number | null
          valor_pipeline: number | null
          velocidade_mensal: number | null
          vendas_30d: number | null
          vendas_90d: number | null
          vendas_total: number | null
          visitas_30d: number | null
          visitas_realizadas: number | null
          visitas_total: number | null
          workspace_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "empreendimentos_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "executive_360"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "empreendimentos_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_360: {
        Row: {
          atividades_7d: number | null
          conversao_percentual: number | null
          dias_sem_atividade: number | null
          followup_perdido: number | null
          ganhas_30d: number | null
          ganhas_total: number | null
          oportunidades_abertas: number | null
          oportunidades_total: number | null
          perdidas_30d: number | null
          responsavel_id: string | null
          responsavel_nome: string | null
          sem_proxima_acao: number | null
          sla_estourado: number | null
          tarefas_atrasadas: number | null
          tarefas_pendentes: number | null
          tempo_medio_etapa_dias: number | null
          tempo_medio_ganho_dias: number | null
          ticket_medio: number | null
          ultima_atividade_em: string | null
          valor_ganho: number | null
          valor_pipeline: number | null
          valor_ponderado: number | null
          visitas_30d: number | null
          visitas_realizadas_30d: number | null
          workspace_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "executive_360"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "opportunities_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      ack_platform_alert: {
        Args: { _id: string; _resolver?: boolean }
        Returns: boolean
      }
      advance_recommendation: {
        Args: { _id: string; _resultado?: string; _status: string }
        Returns: boolean
      }
      automation_effectiveness: {
        Args: { _dias?: number; _workspace_id: string }
        Returns: {
          acao: string
          ativa: boolean
          canal: string
          descartados: number
          entregues: number
          event_type: string
          falhou: number
          latencia_media_segundos: number
          nome: string
          pendentes: number
          rule_id: string
          tentativas_media: number
          total: number
          ultima_execucao: string
          ultimo_erro: string
        }[]
      }
      automation_intelligence: {
        Args: { _dias?: number; _workspace_id: string }
        Returns: Json
      }
      automation_tempo_economizado: { Args: { _acao: string }; Returns: number }
      claim_outbox_batch: {
        Args: { _limit?: number }
        Returns: {
          canal: string
          created_at: string
          destino: string | null
          disponivel_em: string
          domain_event_id: string | null
          event_type: string
          id: string
          idempotency_key: string | null
          max_tentativas: number
          payload: Json
          processado_em: string | null
          rule_id: string | null
          status: Database["public"]["Enums"]["outbox_status"]
          tentativas: number
          ultimo_erro: string | null
          updated_at: string
          workspace_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "outbox_events"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      complete_outbox_event: {
        Args: {
          _descartar?: boolean
          _erro?: string
          _id: string
          _ok: boolean
        }
        Returns: undefined
      }
      decision_accuracy: {
        Args: { _janela_horas?: number; _workspace_id: string }
        Returns: Json
      }
      evaluate_platform_alerts: { Args: never; Returns: number }
      evaluate_recommendation: {
        Args: { _id: string; _score_atual: number }
        Returns: string
      }
      feature_adoption: {
        Args: { _janela_horas?: number; _workspace_id: string }
        Returns: Json
      }
      find_person_duplicates: {
        Args: {
          _documento?: string
          _email?: string
          _exclude?: string
          _nome?: string
          _telefone?: string
          _workspace_id: string
        }
        Returns: {
          confianca: number
          motivo: string
          nome: string
          person_id: string
        }[]
      }
      has_admin_access: {
        Args: {
          _min: Database["public"]["Enums"]["permission_level"]
          _module: string
          _user_id: string
          _workspace_id: string
        }
        Returns: boolean
      }
      has_permission: {
        Args: {
          _min: Database["public"]["Enums"]["permission_level"]
          _module: Database["public"]["Enums"]["module_key"]
          _user_id: string
          _workspace_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
          _workspace_id: string
        }
        Returns: boolean
      }
      is_workspace_admin: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
      }
      is_workspace_member: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
      }
      list_outbox_queue: {
        Args: { _limit?: number; _status?: string; _workspace_id: string }
        Returns: {
          canal: string
          created_at: string
          destino: string
          disponivel_em: string
          event_type: string
          id: string
          max_tentativas: number
          processado_em: string
          rule_id: string
          status: Database["public"]["Enums"]["outbox_status"]
          tentativas: number
          ultimo_erro: string
        }[]
      }
      list_platform_alerts: {
        Args: { _incluir_resolvidos?: boolean; _workspace_id: string }
        Returns: {
          chave: string
          created_at: string
          detalhe: string | null
          id: string
          limite: number | null
          metrica: string | null
          reconhecido_em: string | null
          reconhecido_por: string | null
          resolvido_em: string | null
          severidade: string
          status: string
          titulo: string
          updated_at: string
          valor: number | null
          workspace_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "platform_alerts"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      list_recommendations: {
        Args: {
          _incluir_arquivadas?: boolean
          _limit?: number
          _workspace_id: string
        }
        Returns: {
          aceita_em: string | null
          avaliada_em: string | null
          chave: string
          closed_at: string | null
          confianca: number | null
          created_at: string
          decidido_por: string | null
          gerada_em: string
          id: string
          impacto: number
          implementada_em: string | null
          mensagem: string | null
          ocorrencias: number
          quadrante: string | null
          recommendation_type: string
          resultado: Database["public"]["Enums"]["recommendation_result"]
          rule_id: string | null
          rule_nome: string | null
          score: number
          score_na_avaliacao: number | null
          score_na_implementacao: number | null
          status: Database["public"]["Enums"]["recommendation_status"]
          updated_at: string
          urgencia: number
          vista_em: string | null
          workspace_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "recommendation_history"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      log_job_run: {
        Args: {
          _detalhe?: Json
          _duracao_ms?: number
          _job: string
          _ok?: boolean
          _workspace_id?: string
        }
        Returns: undefined
      }
      platform_health: { Args: { _workspace_id: string }; Returns: Json }
      platform_metrics_summary: {
        Args: { _janela_horas?: number; _workspace_id: string }
        Returns: Json
      }
      public_form_rate_check: {
        Args: {
          _fingerprint: string
          _formulario: string
          _janela_minutos?: number
          _limite?: number
        }
        Returns: {
          excedido: boolean
          recentes: number
        }[]
      }
      read_customer_360: {
        Args: { _limit?: number; _person_id?: string; _workspace_id: string }
        Returns: {
          atividades_total: number | null
          created_at: string | null
          dias_sem_contato: number | null
          documentos_total: number | null
          entrada_disponivel: number | null
          estagio_jornada: string | null
          nome: string | null
          oportunidades_abertas: number | null
          oportunidades_ganhas: number | null
          oportunidades_perdidas: number | null
          oportunidades_total: number | null
          origem: string | null
          perfil: string | null
          person_id: string | null
          preco_teto: number | null
          primeiro_imovel: boolean | null
          propostas_abertas: number | null
          propostas_aceitas: number | null
          propostas_total: number | null
          proxima_acao_em: string | null
          relacionamentos_total: number | null
          renda_mensal: number | null
          responsavel_id: string | null
          restricao_credito: boolean | null
          score: number | null
          tarefas_atrasadas: number | null
          tarefas_pendentes: number | null
          tem_qualificacao: boolean | null
          temperatura: string | null
          tipo: string | null
          ultima_interacao_em: string | null
          ultima_visita_em: string | null
          usa_fgts: boolean | null
          valor_ganho: number | null
          valor_pipeline: number | null
          visitas_realizadas: number | null
          visitas_total: number | null
          workspace_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "customer_360"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      read_executive_360: {
        Args: { _workspace_id: string }
        Returns: {
          clientes_total: number | null
          comissao_realizada: number | null
          conversao_percentual: number | null
          ganhas_mes: number | null
          ganhas_total: number | null
          novas_30d: number | null
          oportunidades_abertas: number | null
          oportunidades_total: number | null
          perdidas_total: number | null
          pessoas_30d: number | null
          pessoas_total: number | null
          pipeline_total: number | null
          receita_em_assinatura: number | null
          receita_prevista: number | null
          receita_realizada: number | null
          receita_realizada_mes: number | null
          tempo_medio_ciclo_dias: number | null
          ticket_medio: number | null
          unidades_disponiveis: number | null
          unidades_total: number | null
          valor_ganho: number | null
          valor_ganho_mes: number | null
          vendas_assinadas: number | null
          vendas_canceladas: number | null
          vgv_disponivel: number | null
          workspace_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "executive_360"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      read_forecast_base: {
        Args: { _workspace_id: string }
        Returns: {
          ciclo_medio_dias: number
          criadas_90d: number
          dias_decorridos: number
          dias_no_mes: number
          ganhas_90d: number
          ganhas_mes: number
          oportunidades_abertas: number
          pipeline_total: number
          ticket_medio: number
          valor_ganho_mes: number
        }[]
      }
      read_marketing_360: {
        Args: { _workspace_id: string }
        Returns: {
          conversao_percentual: number | null
          ganhas_total: number | null
          landing_pages: number | null
          oportunidades_30d: number | null
          oportunidades_abertas: number | null
          oportunidades_total: number | null
          origem: string | null
          perdidas_total: number | null
          pessoas_30d: number | null
          pessoas_total: number | null
          tempo_medio_conversao_dias: number | null
          ticket_medio: number | null
          valor_ganho: number | null
          valor_pipeline: number | null
          workspace_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "marketing_360"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      read_opportunity_signals: {
        Args: { _limit?: number; _workspace_id: string }
        Returns: {
          dias_desde_criacao: number
          dias_na_etapa: number
          dias_sem_interacao: number
          empreendimento_id: string
          empreendimento_nome: string
          empreendimento_velocidade: number
          estagio: string
          interacoes_30d: number
          opportunity_id: string
          person_id: string
          person_nome: string
          propostas: number
          propostas_enviadas: number
          responsavel_id: string
          responsavel_nome: string
          sla_horas: number
          stage_amostra: number
          stage_conversao: number
          stage_nome: string
          stage_probabilidade: number
          tarefas_atrasadas: number
          tem_proxima_acao: boolean
          titulo: string
          valor: number
          visitas_realizadas: number
        }[]
      }
      read_person_behavior: {
        Args: { _limit?: number; _workspace_id: string }
        Returns: {
          ciclo_fechamento_dias: number
          criado_em: string
          desconto_medio_pct: number
          dia_semana_favorito: number
          dias_ate_primeira_proposta: number
          distratos: number
          estagio: string
          hora_favorita: number
          hora_favorita_amostra: number
          indicacoes_feitas: number
          int_email: number
          int_ligacao: number
          int_mensagem: number
          int_visita: number
          int_whatsapp: number
          interacoes_90d: number
          interacoes_total: number
          intervalo_medio_horas: number
          ltv: number
          motivos_perda: string[]
          nome: string
          oportunidades: number
          oportunidades_perdidas: number
          origem: string
          perfil: string
          person_id: string
          preco_teto: number
          primeira_interacao: string
          primeiro_imovel: boolean
          propostas: number
          propostas_aceitas: number
          propostas_enviadas: number
          propostas_recusadas: number
          responsavel_id: string
          responsavel_nome: string
          resposta_proposta_amostra: number
          resposta_proposta_horas: number
          restricao_credito: boolean
          rodadas_proposta_max: number
          ultima_interacao: string
          ultimo_contato_em: string
          vendas: number
          visitas_agendadas: number
          visitas_faltou: number
          visitas_realizadas: number
        }[]
      }
      read_property_360: {
        Args: { _empreendimento_id?: string; _workspace_id: string }
        Returns: {
          cidade: string | null
          comissao_media: number | null
          conversao_percentual: number | null
          created_at: string | null
          empreendimento_id: string | null
          entrega_prevista: string | null
          estoque_meses: number | null
          giro_percentual: number | null
          nome: string | null
          nota_media: number | null
          oportunidades_abertas: number | null
          oportunidades_ganhas: number | null
          oportunidades_total: number | null
          perfil_predominante: string | null
          preco_medio: number | null
          receita_assinada: number | null
          reservas_30d: number | null
          reservas_ativas: number | null
          score_liquidez_medio: number | null
          segmento: string | null
          status: string | null
          uf: string | null
          unidades_bloqueadas: number | null
          unidades_disponiveis: number | null
          unidades_reservadas: number | null
          unidades_total: number | null
          unidades_vendidas: number | null
          valor_pipeline: number | null
          velocidade_mensal: number | null
          vendas_30d: number | null
          vendas_90d: number | null
          vendas_total: number | null
          visitas_30d: number | null
          visitas_realizadas: number | null
          visitas_total: number | null
          workspace_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "property_360"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      read_sales_360: {
        Args: { _workspace_id: string }
        Returns: {
          atividades_7d: number | null
          conversao_percentual: number | null
          dias_sem_atividade: number | null
          followup_perdido: number | null
          ganhas_30d: number | null
          ganhas_total: number | null
          oportunidades_abertas: number | null
          oportunidades_total: number | null
          perdidas_30d: number | null
          responsavel_id: string | null
          responsavel_nome: string | null
          sem_proxima_acao: number | null
          sla_estourado: number | null
          tarefas_atrasadas: number | null
          tarefas_pendentes: number | null
          tempo_medio_etapa_dias: number | null
          tempo_medio_ganho_dias: number | null
          ticket_medio: number | null
          ultima_atividade_em: string | null
          valor_ganho: number | null
          valor_pipeline: number | null
          valor_ponderado: number | null
          visitas_30d: number | null
          visitas_realizadas_30d: number | null
          workspace_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "sales_360"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      recommendation_quality: {
        Args: { _dias?: number; _workspace_id: string }
        Returns: Json
      }
      record_decision_outcome: {
        Args: {
          _confianca?: number
          _decisao?: string
          _opportunity_id?: string
          _person_id?: string
          _recomendacao: string
          _recomendacao_tipo: string
          _workspace_id: string
        }
        Returns: string
      }
      record_platform_metric: {
        Args: {
          _entity_id?: string
          _entity_type?: string
          _metric_name: string
          _metric_type: string
          _metric_value: number
          _workspace_id: string
        }
        Returns: string
      }
      record_telemetry: {
        Args: {
          _action: string
          _domain: string
          _duracao_ms?: number
          _entity_id?: string
          _entity_type?: string
          _erro?: string
          _metric_name?: string
          _metric_type?: string
          _ok?: boolean
          _session_id?: string
          _surface?: string
          _workspace_id: string
        }
        Returns: string
      }
      refresh_person_estagio: {
        Args: { _person_id: string }
        Returns: undefined
      }
      refresh_read_models: { Args: never; Returns: undefined }
      retry_outbox_event: { Args: { _id: string }; Returns: boolean }
      rollup_automation_daily_metrics: {
        Args: { _dias?: number }
        Returns: number
      }
      seed_admin_module_access: {
        Args: { _workspace_id: string }
        Returns: undefined
      }
      seed_automation_rules: {
        Args: { _workspace_id: string }
        Returns: undefined
      }
      seed_default_pipeline: {
        Args: { _workspace_id: string }
        Returns: string
      }
      seed_role_permissions: {
        Args: { _workspace_id: string }
        Returns: undefined
      }
      shares_workspace: { Args: { _a: string; _b: string }; Returns: boolean }
      stage_kind: {
        Args: {
          _estagio: Database["public"]["Enums"]["lead_estagio"]
          _tipo: Database["public"]["Enums"]["stage_tipo"]
        }
        Returns: string
      }
      upsert_platform_alert: {
        Args: {
          _chave: string
          _detalhe?: string
          _limite?: number
          _metrica?: string
          _severidade: string
          _titulo: string
          _valor?: number
          _workspace_id: string
        }
        Returns: undefined
      }
      upsert_recommendation: {
        Args: {
          _chave: string
          _confianca?: number
          _impacto: number
          _mensagem?: string
          _quadrante: string
          _recommendation_type: string
          _rule_id?: string
          _rule_nome?: string
          _score: number
          _urgencia: number
          _workspace_id: string
        }
        Returns: string
      }
    }
    Enums: {
      activity_tipo:
        | "ligacao"
        | "mensagem"
        | "whatsapp"
        | "email"
        | "visita"
        | "documento"
        | "proposta"
        | "nota"
        | "sistema"
      address_tipo: "residencial" | "comercial" | "cobranca" | "outro"
      app_role:
        | "proprietario"
        | "administrador"
        | "diretor"
        | "gerente"
        | "corretor"
        | "marketing"
        | "financeiro"
        | "suporte"
        | "cliente"
      compromisso_status: "pendente" | "concluido" | "cancelado"
      compromisso_tipo:
        | "visita"
        | "ligacao"
        | "reuniao"
        | "followup"
        | "tarefa"
        | "outro"
      contact_canal: "email" | "telefone" | "whatsapp" | "instagram" | "outro"
      empreendimento_segmento: "mcmv" | "medio" | "alto" | "comercial"
      empreendimento_status:
        | "breve_lancamento"
        | "lancamento"
        | "em_obras"
        | "pronto"
        | "entregue"
      knowledge_tipo:
        | "faq"
        | "script"
        | "diferencial"
        | "objecao"
        | "concorrente"
        | "bairro"
        | "nota"
      lead_estagio:
        | "novo"
        | "contato"
        | "qualificado"
        | "visita"
        | "proposta"
        | "negociacao"
        | "fechado"
        | "perdido"
      lead_origem:
        | "instagram"
        | "facebook"
        | "google"
        | "indicacao"
        | "site"
        | "portal"
        | "whatsapp"
        | "evento"
        | "outro"
      lead_temperatura: "frio" | "morno" | "quente"
      media_tipo: "imagem" | "video" | "pdf" | "tour" | "planta" | "outro"
      member_status: "ativo" | "inativo" | "suspenso"
      memory_campaign_status:
        | "planejada"
        | "ativa"
        | "pausada"
        | "encerrada"
        | "cancelada"
      memory_categoria:
        | "decisao"
        | "campanha"
        | "reuniao"
        | "estrategia"
        | "mudanca"
      memory_decision_status:
        | "registrada"
        | "aprovada"
        | "executada"
        | "avaliada"
        | "revisada"
        | "descartada"
      memory_lesson_tipo:
        | "acerto"
        | "erro"
        | "risco"
        | "oportunidade"
        | "boa_pratica"
      module_key:
        | "crm"
        | "erp"
        | "academy"
        | "ia"
        | "analytics"
        | "financeiro"
        | "marketing"
        | "portal_cliente"
        | "intelligence_hub"
        | "knowledge"
      org_entidade: "playbook" | "licao" | "decisao" | "processo"
      outbox_status:
        | "pendente"
        | "processando"
        | "entregue"
        | "falhou"
        | "descartado"
      perfil_compra: "moradia" | "investimento" | "misto"
      permission_level: "nenhum" | "leitura" | "escrita" | "total"
      person_estagio:
        | "visitante"
        | "lead"
        | "oportunidade"
        | "cliente"
        | "proprietario"
        | "investidor"
        | "indicador"
      person_tipo: "fisica" | "juridica"
      proposal_status:
        | "rascunho"
        | "enviada"
        | "em_analise"
        | "aceita"
        | "recusada"
        | "expirada"
      proposta_status:
        | "rascunho"
        | "enviada"
        | "em_analise"
        | "aceita"
        | "recusada"
        | "expirada"
      recommendation_result: "indefinido" | "melhorou" | "neutro" | "piorou"
      recommendation_status:
        | "gerada"
        | "vista"
        | "aceita"
        | "implementada"
        | "descartada"
        | "arquivada"
      relationship_tipo:
        | "indicou"
        | "conjuge"
        | "familiar"
        | "socio"
        | "representante"
        | "outro"
      release_status:
        | "planejado"
        | "lancado"
        | "em_obras"
        | "entregue"
        | "encerrado"
      reservation_status: "ativa" | "expirada" | "convertida" | "cancelada"
      sale_status: "em_assinatura" | "assinada" | "cancelada" | "distratada"
      stage_tipo: "aberto" | "ganho" | "perdido"
      task_origem: "manual" | "automacao" | "sla" | "checklist" | "sistema"
      task_prioridade: "baixa" | "media" | "alta" | "urgente"
      task_status: "pendente" | "em_andamento" | "concluida" | "cancelada"
      unidade_status:
        | "disponivel"
        | "reservada"
        | "vendida"
        | "bloqueada"
        | "em_analise"
      visit_status: "agendada" | "realizada" | "nao_compareceu" | "cancelada"
      workspace_status: "trial" | "ativo" | "suspenso" | "arquivado"
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
  public: {
    Enums: {
      activity_tipo: [
        "ligacao",
        "mensagem",
        "whatsapp",
        "email",
        "visita",
        "documento",
        "proposta",
        "nota",
        "sistema",
      ],
      address_tipo: ["residencial", "comercial", "cobranca", "outro"],
      app_role: [
        "proprietario",
        "administrador",
        "diretor",
        "gerente",
        "corretor",
        "marketing",
        "financeiro",
        "suporte",
        "cliente",
      ],
      compromisso_status: ["pendente", "concluido", "cancelado"],
      compromisso_tipo: [
        "visita",
        "ligacao",
        "reuniao",
        "followup",
        "tarefa",
        "outro",
      ],
      contact_canal: ["email", "telefone", "whatsapp", "instagram", "outro"],
      empreendimento_segmento: ["mcmv", "medio", "alto", "comercial"],
      empreendimento_status: [
        "breve_lancamento",
        "lancamento",
        "em_obras",
        "pronto",
        "entregue",
      ],
      knowledge_tipo: [
        "faq",
        "script",
        "diferencial",
        "objecao",
        "concorrente",
        "bairro",
        "nota",
      ],
      lead_estagio: [
        "novo",
        "contato",
        "qualificado",
        "visita",
        "proposta",
        "negociacao",
        "fechado",
        "perdido",
      ],
      lead_origem: [
        "instagram",
        "facebook",
        "google",
        "indicacao",
        "site",
        "portal",
        "whatsapp",
        "evento",
        "outro",
      ],
      lead_temperatura: ["frio", "morno", "quente"],
      media_tipo: ["imagem", "video", "pdf", "tour", "planta", "outro"],
      member_status: ["ativo", "inativo", "suspenso"],
      memory_campaign_status: [
        "planejada",
        "ativa",
        "pausada",
        "encerrada",
        "cancelada",
      ],
      memory_categoria: [
        "decisao",
        "campanha",
        "reuniao",
        "estrategia",
        "mudanca",
      ],
      memory_decision_status: [
        "registrada",
        "aprovada",
        "executada",
        "avaliada",
        "revisada",
        "descartada",
      ],
      memory_lesson_tipo: [
        "acerto",
        "erro",
        "risco",
        "oportunidade",
        "boa_pratica",
      ],
      module_key: [
        "crm",
        "erp",
        "academy",
        "ia",
        "analytics",
        "financeiro",
        "marketing",
        "portal_cliente",
        "intelligence_hub",
        "knowledge",
      ],
      org_entidade: ["playbook", "licao", "decisao", "processo"],
      outbox_status: [
        "pendente",
        "processando",
        "entregue",
        "falhou",
        "descartado",
      ],
      perfil_compra: ["moradia", "investimento", "misto"],
      permission_level: ["nenhum", "leitura", "escrita", "total"],
      person_estagio: [
        "visitante",
        "lead",
        "oportunidade",
        "cliente",
        "proprietario",
        "investidor",
        "indicador",
      ],
      person_tipo: ["fisica", "juridica"],
      proposal_status: [
        "rascunho",
        "enviada",
        "em_analise",
        "aceita",
        "recusada",
        "expirada",
      ],
      proposta_status: [
        "rascunho",
        "enviada",
        "em_analise",
        "aceita",
        "recusada",
        "expirada",
      ],
      recommendation_result: ["indefinido", "melhorou", "neutro", "piorou"],
      recommendation_status: [
        "gerada",
        "vista",
        "aceita",
        "implementada",
        "descartada",
        "arquivada",
      ],
      relationship_tipo: [
        "indicou",
        "conjuge",
        "familiar",
        "socio",
        "representante",
        "outro",
      ],
      release_status: [
        "planejado",
        "lancado",
        "em_obras",
        "entregue",
        "encerrado",
      ],
      reservation_status: ["ativa", "expirada", "convertida", "cancelada"],
      sale_status: ["em_assinatura", "assinada", "cancelada", "distratada"],
      stage_tipo: ["aberto", "ganho", "perdido"],
      task_origem: ["manual", "automacao", "sla", "checklist", "sistema"],
      task_prioridade: ["baixa", "media", "alta", "urgente"],
      task_status: ["pendente", "em_andamento", "concluida", "cancelada"],
      unidade_status: [
        "disponivel",
        "reservada",
        "vendida",
        "bloqueada",
        "em_analise",
      ],
      visit_status: ["agendada", "realizada", "nao_compareceu", "cancelada"],
      workspace_status: ["trial", "ativo", "suspenso", "arquivado"],
    },
  },
} as const
