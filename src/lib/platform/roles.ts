/** Papéis com poder administrativo sobre o workspace. */
export const ADMIN_ROLES = ["proprietario", "administrador"] as const;

export function isAdminRole(roles: readonly string[] | undefined | null): boolean {
  return (roles ?? []).some((role) => (ADMIN_ROLES as readonly string[]).includes(role));
}

export const roleLabels: Record<string, string> = {
  proprietario: "Proprietário",
  administrador: "Administrador",
  diretor: "Diretor",
  gerente: "Gerente",
  corretor: "Corretor",
  marketing: "Marketing",
  financeiro: "Financeiro",
  suporte: "Suporte",
  cliente: "Cliente",
};
