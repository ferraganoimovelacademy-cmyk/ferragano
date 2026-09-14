import { createFileRoute, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppLayout } from "@/components/platform/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { Icon } from "@/components/Icon";

export const Route = createFileRoute("/app")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/auth", search: { redirect: location.href } });
    }
    return { user: data.user };
  },
  component: AppRoute,
});

function AppRoute() {
  const navigate = useNavigate();
  const { data, isPending, isError, error, refetch, isFetching } = useSession();

  useEffect(() => {
    if (!isPending && data && !data.workspace) {
      navigate({ to: "/onboarding", replace: true });
    }
  }, [isPending, data, navigate]);

  // Erro de leitura da sessão nunca é tratado como "sem workspace": mostra o
  // erro, permite tentar de novo e não redireciona para o onboarding.
  if (isError) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-6">
        <div role="alert" aria-live="assertive" className="panel max-w-md p-6 text-center">
          <Icon name="error" size={28} className="text-destructive" />
          <h1 className="mt-3 text-lg font-semibold">Não foi possível carregar sua sessão</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {(error as Error)?.message ?? "Erro inesperado ao validar seu acesso."}
          </p>
          <button
            type="button"
            className="mt-4 inline-flex items-center rounded-md border border-border px-3 py-2 text-sm disabled:opacity-60"
            onClick={() => void refetch()}
            disabled={isFetching}
          >
            {isFetching ? "Tentando novamente…" : "Tentar novamente"}
          </button>
        </div>
      </div>
    );
  }

  if (isPending || (data && !data.workspace)) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="grid min-h-screen place-items-center bg-background"
      >
        <Icon name="progress_activity" size={28} className="animate-spin text-muted-foreground" />
        <span className="sr-only">Carregando sua sessão…</span>
      </div>
    );
  }

  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}
