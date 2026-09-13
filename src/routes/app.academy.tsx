import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Icon } from "@/components/Icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { useSession } from "@/hooks/use-session";
import { isAdminRole } from "@/lib/platform/roles";
import {
  ACADEMY_TRILHA,
  calcularProgresso,
  duracaoTotal,
  montarCertificado,
} from "@/lib/platform/academy";
import {
  listarProgressoAcademy,
  listarProgressoEquipe,
  marcarLicaoAcademy,
} from "@/lib/platform/academy.functions";

export const Route = createFileRoute("/app/academy")({
  head: () => ({
    meta: [
      { title: "Academy · Ferragano OS" },
      {
        name: "description",
        content:
          "Trilha de onboarding do corretor: primeiro acesso, pessoas, rotina comercial e decisão assistida.",
      },
      { property: "og:title", content: "Academy · Ferragano OS" },
      {
        property: "og:description",
        content: "Formação guiada do piloto com checklist e certificado de conclusão.",
      },
    ],
  }),
  component: AcademyPage,
});

function AcademyPage() {
  const { data: session } = useSession();
  const workspaceId = session?.workspace?.id;
  const userId = session?.profile?.id ?? "";
  const nome = session?.profile?.nome ?? session?.profile?.email ?? "Corretor";
  const admin = isAdminRole(session?.roles);
  const queryClient = useQueryClient();

  const fetchProgresso = useServerFn(listarProgressoAcademy);
  const fetchEquipe = useServerFn(listarProgressoEquipe);
  const marcar = useServerFn(marcarLicaoAcademy);

  // Cache isolado por workspace **e** usuário: o serviço filtra por
  // context.userId, então a chave precisa refletir as duas dimensões.
  const progressoKey = ["academy-progresso", workspaceId, userId] as const;
  const equipeKey = ["academy-equipe", workspaceId] as const;
  const pronto = Boolean(workspaceId) && Boolean(userId);

  const progressoQuery = useQuery({
    queryKey: progressoKey,
    queryFn: () => fetchProgresso({ data: { workspaceId: workspaceId! } }),
    enabled: pronto,
  });

  const equipeQuery = useQuery({
    queryKey: equipeKey,
    queryFn: () => fetchEquipe({ data: { workspaceId: workspaceId! } }),
    enabled: pronto && admin,
  });

  const concluidas = useMemo(
    () => (progressoQuery.data?.items ?? []).map((i) => i.licao_key),
    [progressoQuery.data],
  );
  const progresso = useMemo(() => calcularProgresso(concluidas), [concluidas]);
  const certificado = useMemo(
    () => montarCertificado(userId, nome, concluidas),
    [userId, nome, concluidas],
  );

  const mutation = useMutation({
    mutationFn: (vars: { licaoKey: string; concluida: boolean }) =>
      marcar({ data: { workspaceId: workspaceId!, ...vars } }),
    onSuccess: (_res, vars) => {
      // Mutation individual afeta somente o progresso do próprio usuário.
      queryClient.invalidateQueries({ queryKey: progressoKey });
      toast.success(vars.concluida ? "Lição concluída." : "Lição reaberta.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const progressoErro = progressoQuery.isError;
  // Erro nunca é tratado como lista vazia: dados só valem quando a leitura deu certo.
  const progressoOk = progressoQuery.isSuccess;
  const ocupado = mutation.isPending || (progressoQuery.isFetching && !progressoQuery.isLoading);
  const travado = !progressoOk || ocupado;

  if (!workspaceId) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <Icon name="school" size={28} className="mx-auto text-muted-foreground" />
        <h1 className="mt-3 font-display text-lg font-semibold">Academy</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Entre em um workspace para começar a trilha de onboarding.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Onboarding do piloto
        </p>
        <h1 className="font-display text-2xl font-semibold">Ferragano Academy</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          {ACADEMY_TRILHA.length} módulos, {progresso.total} lições e cerca de {duracaoTotal()}{" "}
          minutos. Conclua as lições obrigatórias para liberar o certificado.
        </p>
      </header>

      <section className="rounded-lg border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">Seu progresso</p>
            <p className="font-display text-xl font-semibold">
              {progresso.concluidas} de {progresso.total} lições · {progresso.percentual}%
            </p>
          </div>
          {progresso.proximaLicao ? (
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Próxima lição</p>
              <p className="text-sm font-medium">{progresso.proximaLicao.titulo}</p>
            </div>
          ) : (
            <Badge>Trilha completa</Badge>
          )}
        </div>
        <Progress value={progresso.percentual} className="mt-4" />
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {progresso.modulos.map((modulo) => (
            <div key={modulo.key} className="rounded-md border border-border/60 p-3">
              <p className="text-xs text-muted-foreground">{modulo.titulo}</p>
              <p className="text-sm font-semibold">
                {modulo.concluidas}/{modulo.total}
                {modulo.completo ? " ✓" : ""}
              </p>
            </div>
          ))}
        </div>
      </section>

      <div role="status" aria-live="polite" className="min-h-5 text-sm text-muted-foreground">
        {progressoQuery.isLoading
          ? "Carregando sua trilha…"
          : mutation.isPending
            ? "Salvando sua lição…"
            : progressoQuery.isFetching
              ? "Atualizando seu progresso…"
              : ""}
      </div>

      {progressoErro ? (
        <div
          role="alert"
          aria-live="assertive"
          className="rounded-lg border border-destructive/40 bg-destructive/5 p-4"
        >
          <p className="text-sm font-medium">Não foi possível carregar seu progresso.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Suas lições não foram perdidas — apenas não conseguimos ler agora.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            disabled={progressoQuery.isFetching}
            onClick={() => void progressoQuery.refetch()}
          >
            Tentar novamente
          </Button>
        </div>
      ) : null}

      <div className="space-y-5">
        {ACADEMY_TRILHA.map((modulo) => (
          <section key={modulo.key} className="rounded-lg border border-border bg-card">
            <div className="flex items-start gap-3 border-b border-border p-4">
              <Icon name={modulo.icon} size={20} className="mt-0.5 text-muted-foreground" />
              <div>
                <h2 className="font-display text-base font-semibold">{modulo.titulo}</h2>
                <p className="text-sm text-muted-foreground">{modulo.objetivo}</p>
              </div>
            </div>
            <ul className="divide-y divide-border">
              {modulo.licoes.map((licao) => {
                const feita = concluidas.includes(licao.key);
                const inputId = `licao-${licao.key}`;
                return (
                  <li key={licao.key} className="flex items-start gap-3 p-4">
                    <Checkbox
                      id={inputId}
                      checked={feita}
                      disabled={travado}
                      onCheckedChange={(checked) =>
                        mutation.mutate({ licaoKey: licao.key, concluida: checked === true })
                      }
                      aria-label={`Marcar a lição ${licao.titulo} como concluída`}
                    />
                    <div className="min-w-0 flex-1">
                      <label
                        htmlFor={inputId}
                        className="cursor-pointer text-sm font-medium leading-tight"
                      >
                        {licao.titulo}
                      </label>
                      <p className="mt-1 text-sm text-muted-foreground">{licao.resumo}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{licao.duracao} min</Badge>
                        {licao.obrigatoria ? <Badge variant="secondary">Obrigatória</Badge> : null}
                        {licao.pratica ? (
                          <Button asChild variant="ghost" size="sm">
                            <Link to={licao.pratica}>Praticar agora</Link>
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      <section className="rounded-lg border border-border bg-card p-5">
        <h2 className="font-display text-base font-semibold">Certificado</h2>
        {certificado ? (
          <div className="mt-3 rounded-md border border-primary/40 bg-primary/5 p-4">
            <p className="text-sm text-muted-foreground">Certificado de conclusão</p>
            <p className="mt-1 font-display text-lg font-semibold">{certificado.nome}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {certificado.licoes} lições · {certificado.minutos} minutos · emitido em{" "}
              {new Date(certificado.emitidoEm).toLocaleDateString("pt-BR")}
            </p>
            <p className="mt-2 text-xs uppercase tracking-wide text-muted-foreground">
              Código {certificado.codigo}
            </p>
          </div>
        ) : progressoOk ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Faltam {progresso.obrigatoriasPendentes.length} lições obrigatórias para liberar o
            certificado.
          </p>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            O certificado só pode ser avaliado depois de carregar seu progresso.
          </p>
        )}
      </section>

      {admin ? (
        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="font-display text-base font-semibold">Progresso da equipe</h2>
          {equipeQuery.isLoading ? (
            <p role="status" aria-live="polite" className="mt-2 text-sm text-muted-foreground">
              Carregando o progresso da equipe…
            </p>
          ) : equipeQuery.isError ? (
            <div role="alert" aria-live="assertive" className="mt-3">
              <p className="text-sm font-medium">
                Não foi possível carregar o progresso da equipe.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                disabled={equipeQuery.isFetching}
                onClick={() => void equipeQuery.refetch()}
              >
                Tentar novamente
              </Button>
            </div>
          ) : equipeQuery.data?.items?.length ? (
            <ul className="mt-3 space-y-2">
              {equipeQuery.data.items.map((membro) => {
                const p = calcularProgresso(membro.licoes);
                return (
                  <li
                    key={membro.userId}
                    className="flex items-center justify-between gap-3 rounded-md border border-border/60 p-3"
                  >
                    <span className="truncate text-sm font-medium">{membro.nome}</span>
                    <span className="text-sm text-muted-foreground">
                      {p.concluidas}/{p.total} · {p.percentual}%
                      {p.certificado ? " · certificado" : ""}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              Ninguém iniciou a trilha neste workspace ainda.
            </p>
          )}
        </section>
      ) : null}
    </div>
  );
}
