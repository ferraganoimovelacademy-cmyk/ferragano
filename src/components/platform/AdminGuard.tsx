import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Icon } from "@/components/Icon";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminAccess } from "@/hooks/use-admin-access";
import { adminModuleLabels, type AdminLevel, type AdminModule } from "@/lib/platform/admin-access";

type Props = {
  module: AdminModule;
  minimo?: AdminLevel;
  children: ReactNode;
};

/** Cobertura de interface para um módulo administrativo (RBAC + 2FA). */
export function AdminGuard({ module, minimo = "leitura", children }: Props) {
  const { isPending, pode, bloqueadoPorMfa } = useAdminAccess();

  if (isPending) return <Skeleton className="h-72 w-full" />;

  if (!pode(module, minimo)) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <Icon name="lock" size={28} className="mx-auto text-muted-foreground" />
        <h1 className="mt-3 font-display text-lg font-semibold">Acesso restrito</h1>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
          Seu papel não tem acesso a <strong>{adminModuleLabels[module]}</strong>. Um proprietário ou
          administrador pode liberar em Administração → Acessos.
        </p>
        <Button asChild variant="outline" className="mt-6">
          <Link to="/app">Voltar para o dashboard</Link>
        </Button>
      </div>
    );
  }

  if (bloqueadoPorMfa(module)) {
    return (
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-8 text-center">
        <Icon name="shield_lock" size={28} className="mx-auto text-amber-500" />
        <h1 className="mt-3 font-display text-lg font-semibold">
          Verificação em duas etapas obrigatória
        </h1>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
          Este workspace exige 2FA para acessar <strong>{adminModuleLabels[module]}</strong>. Cadastre
          seu aplicativo autenticador e entre novamente para liberar o acesso.
        </p>
        <Button asChild className="mt-6">
          <Link to="/app/configuracoes">Configurar 2FA</Link>
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
