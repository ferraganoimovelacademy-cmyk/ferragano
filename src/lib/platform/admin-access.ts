/**
 * RBAC da área administrativa (/app/admin e módulos sensíveis).
 *
 * Diferente de `role_permissions` (módulos de negócio), a matriz
 * administrativa vive em `admin_module_access` e é sempre checada no
 * servidor. A interface só decide o que mostrar.
 */
export const ADMIN_MODULES = [
  "admin_saude",
  "admin_usuarios",
  "admin_permissoes",
  "admin_auditoria",
  "admin_telemetria",
  "admin_ecossistema",
  "admin_configuracoes",
  "admin_importar",
  "admin_seguranca",
] as const;

export type AdminModule = (typeof ADMIN_MODULES)[number];

export const ADMIN_LEVELS = ["nenhum", "leitura", "escrita", "total"] as const;
export type AdminLevel = (typeof ADMIN_LEVELS)[number];

export const adminModuleLabels: Record<AdminModule, string> = {
  admin_saude: "Saúde e performance",
  admin_usuarios: "Gestão de usuários",
  admin_permissoes: "Permissões de módulos",
  admin_auditoria: "Auditoria e logs",
  admin_telemetria: "Telemetria avançada",
  admin_ecossistema: "Ecossistema",
  admin_configuracoes: "Configurações globais",
  admin_importar: "Importação de dados",
  admin_seguranca: "Segurança e 2FA",
};

export const adminLevelLabels: Record<AdminLevel, string> = {
  nenhum: "Nenhum",
  leitura: "Leitura",
  escrita: "Escrita",
  total: "Total",
};

/**
 * Módulos sensíveis: exigem 2FA quando a política estiver ativa.
 * `admin_seguranca` fica fora de propósito — é onde o 2FA é cadastrado.
 */
export const ADMIN_SENSITIVE_MODULES: readonly AdminModule[] = [
  "admin_usuarios",
  "admin_permissoes",
  "admin_auditoria",
  "admin_configuracoes",
  "admin_importar",
];

export function atendeNivel(atual: string | undefined | null, minimo: AdminLevel): boolean {
  const a = ADMIN_LEVELS.indexOf((atual ?? "nenhum") as AdminLevel);
  const b = ADMIN_LEVELS.indexOf(minimo);
  return a > 0 && a >= b;
}
