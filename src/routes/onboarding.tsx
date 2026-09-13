import { useState } from "react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { bootstrapWorkspace } from "@/lib/platform/workspace.functions";
import { sessionQueryKey } from "@/hooks/use-session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Icon } from "@/components/Icon";
import { toast } from "sonner";

export const Route = createFileRoute("/onboarding")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/auth", search: { redirect: location.href } });
    }
  },
  head: () => ({
    meta: [
      { title: "Criar workspace — Ferragano OS" },
      {
        name: "description",
        content: "Configure o workspace inicial da sua operação no Ferragano OS.",
      },
      { property: "og:title", content: "Criar workspace — Ferragano OS" },
      { property: "og:description", content: "Bootstrap do workspace no Ferragano OS." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OnboardingPage,
});

function OnboardingPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const bootstrap = useServerFn(bootstrapWorkspace);
  const [nome, setNome] = useState("Ferragano");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      await bootstrap({ data: { nome } });
      await queryClient.invalidateQueries({ queryKey: sessionQueryKey });
      navigate({ to: "/app", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível criar o workspace.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-12">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-sm">
        <h1 className="font-display text-xl font-semibold tracking-tight">Criar workspace</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Você será o proprietário. O workspace começa em período de teste por 14 dias, com o módulo
          CRM ligado e os demais desligados.
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="ws-nome">Nome da empresa</Label>
            <Input
              id="ws-nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
              minLength={2}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Icon name="progress_activity" size={18} className="animate-spin" />}
            Criar workspace
          </Button>
        </form>
      </div>
    </div>
  );
}
