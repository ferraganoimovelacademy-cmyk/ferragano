import type { ModuleKey } from "./feature-flags";

/**
 * GATE 03 — Domain Driven Design.
 * O sistema é organizado por DOMÍNIOS de negócio, não por páginas.
 */
export type DomainKey =
  | "comercial"
  | "imobiliario"
  | "financeiro"
  | "marketing"
  | "pessoas"
  | "ia"
  | "plataforma";

export const domains: Record<DomainKey, { label: string; entities: string[] }> = {
  comercial: {
    label: "Comercial",
    entities: ["Pessoas", "Oportunidades", "Funis", "Propostas"],
  },
  imobiliario: {
    label: "Imobiliário",
    entities: ["Empreendimentos", "Construtoras", "Unidades", "Plantas"],
  },
  financeiro: { label: "Financeiro", entities: ["Comissões", "Receitas", "Despesas", "Fluxo"] },
  marketing: { label: "Marketing", entities: ["Landing", "Campanhas", "Conteúdo", "SEO"] },
  pessoas: { label: "Pessoas", entities: ["Corretores", "Gerentes", "Usuários", "Permissões"] },
  ia: { label: "IA", entities: ["Agentes", "Prompts", "Knowledge Base", "Logs"] },
  plataforma: {
    label: "Plataforma",
    entities: ["Workspaces", "Feature Flags", "Audit Trail", "Observabilidade"],
  },
};

export type AppNavItem = {
  to?: string;
  label: string;
  icon: string;
  domain: DomainKey;
  module?: ModuleKey;
  /** Visível apenas para proprietário/administrador. */
  adminOnly?: boolean;
};

/** GATE 01 — Sidebar preparada para crescer. Itens sem rota nascem desabilitados. */
export const appNav: AppNavItem[] = [
  { to: "/app", label: "Dashboard", icon: "space_dashboard", domain: "plataforma" },
  { to: "/app/admin", label: "Administração", icon: "admin_panel_settings", domain: "plataforma", adminOnly: true },
  { to: "/app/pessoas", label: "Pessoas", icon: "contacts", domain: "comercial" },
  {
    to: "/app/importar",
    label: "Importar dados",
    icon: "upload_file",
    domain: "comercial",
    adminOnly: true,
  },
  { to: "/app/oportunidades", label: "Oportunidades", icon: "trending_up", domain: "comercial" },
  {
    to: "/app/funis",
    label: "Funis de venda",
    icon: "account_tree",
    domain: "comercial",
    adminOnly: true,
  },
  { to: "/app/agenda", label: "Agenda", icon: "calendar_month", domain: "comercial" },
  { to: "/app/clientes", label: "Clientes", icon: "groups", domain: "comercial" },
  { to: "/app/corretores", label: "Corretores", icon: "badge", domain: "pessoas" },
  { to: "/app/usuarios", label: "Usuários", icon: "manage_accounts", domain: "pessoas" },
  { to: "/app/equipes", label: "Equipes", icon: "diversity_3", domain: "pessoas" },
  {
    to: "/app/empreendimentos",
    label: "Empreendimentos",
    icon: "apartment",
    domain: "imobiliario",
  },
  { to: "/app/construtoras", label: "Construtoras", icon: "corporate_fare", domain: "imobiliario" },
  { to: "/app/midia", label: "Biblioteca de mídia", icon: "perm_media", domain: "imobiliario" },
  {
    to: "/app/ativos",
    label: "Asset Intelligence",
    icon: "photo_library",
    domain: "imobiliario",
  },

  { to: "/app/landing", label: "Landing pages", icon: "web", domain: "marketing" },
  { to: "/app/conteudos", label: "Conteúdos", icon: "article", domain: "marketing" },
  { to: "/app/campanhas", label: "Campanhas", icon: "campaign", domain: "marketing" },
  { to: "/app/relatorios", label: "Relatórios", icon: "monitoring", domain: "plataforma" },
  { to: "/app/decisoes", label: "Decision Center", icon: "insights", domain: "plataforma" },
  {
    to: "/app/automacoes",
    label: "Automações",
    icon: "bolt",
    domain: "plataforma",
  },
  { to: "/app/academy", label: "Academy", icon: "school", domain: "pessoas", module: "academy" },
  { to: "/app/financeiro", label: "Financeiro", icon: "payments", domain: "financeiro", module: "financeiro" },
  { to: "/app/analytics", label: "Analytics", icon: "insights", domain: "plataforma", module: "analytics" },
  { to: "/app/ia", label: "IA", icon: "smart_toy", domain: "ia", module: "ia" },
  {
    to: "/app/organizacao",
    label: "Organização",
    icon: "business",
    domain: "plataforma",
    adminOnly: true,
  },
  {
    to: "/app/permissoes",
    label: "Permissões",
    icon: "admin_panel_settings",
    domain: "plataforma",
    adminOnly: true,
  },
  {
    to: "/app/auditoria",
    label: "Auditoria",
    icon: "history",
    domain: "plataforma",
    adminOnly: true,
  },
  {
    to: "/app/feedback",
    label: "Feedback do piloto",
    icon: "forum",
    domain: "plataforma",
    adminOnly: true,
  },
  {
    to: "/app/advisor",
    label: "Ferragano Advisor",
    icon: "auto_awesome",
    domain: "plataforma",
    adminOnly: true,
  },
  {
    to: "/app/knowledge",
    label: "Knowledge Explorer",
    icon: "hub",
    domain: "plataforma",
  },
  {
    to: "/app/ecossistema",
    label: "Ecossistema",
    icon: "widgets",
    domain: "plataforma",
    adminOnly: true,
  },
  {
    to: "/app/fabric",
    label: "Intelligence Fabric",
    icon: "memory",
    domain: "plataforma",
    adminOnly: true,
  },
  {
    to: "/app/orquestracao",
    label: "Knowledge Orchestrator",
    icon: "account_tree",
    domain: "plataforma",
    adminOnly: true,
  },
  {
    to: "/app/radar",
    label: "Executive Radar",
    icon: "radar",
    domain: "plataforma",
  },
  {
    to: "/app/executive",
    label: "Executive OS",
    icon: "screenshot_monitor",
    domain: "plataforma",
    adminOnly: true,
  },
  {
    to: "/app/comportamento",
    label: "Comportamento",
    icon: "psychology",
    domain: "comercial",
  },
  {
    to: "/app/mercado",
    label: "Radar de mercado",
    icon: "public",
    domain: "imobiliario",
  },
  {
    to: "/app/piloto",
    label: "Prontidão do piloto",
    icon: "rocket_launch",
    domain: "plataforma",
    adminOnly: true,
  },
  {
    to: "/app/gonogo",
    label: "Revisão Go/No-Go",
    icon: "fact_check",
    domain: "plataforma",
    adminOnly: true,
  },
  {
    to: "/app/admin/health",
    label: "Saúde da plataforma",
    icon: "monitor_heart",
    domain: "plataforma",
    adminOnly: true,
  },
  {
    to: "/app/platform",
    label: "Control Center",
    icon: "monitoring",
    domain: "plataforma",
    adminOnly: true,
  },
  {
    to: "/app/memoria",
    label: "Memória corporativa",
    icon: "inventory_2",
    domain: "plataforma",
  },
  {
    to: "/app/institucional",
    label: "Conhecimento institucional",
    icon: "account_balance",
    domain: "plataforma",
  },
  { to: "/app/configuracoes", label: "Configurações", icon: "settings", domain: "plataforma" },
];

/** GATE 02 — Rotas públicas. */
export const publicNav = [
  { to: "/", label: "Início" },
  { to: "/sobre", label: "Sobre" },
  { to: "/manifesto", label: "Manifesto" },
  { to: "/metodo", label: "Método Ferragano" },
  { to: "/empreendimentos", label: "Empreendimentos" },
  { to: "/blog", label: "Blog" },
  { to: "/academy", label: "Academy" },
  { to: "/simulacao", label: "Simulação" },
  { to: "/carreiras", label: "Trabalhe Conosco" },
  { to: "/contato", label: "Contato" },
] as const;

export const APP_VERSION = "v1.1";
