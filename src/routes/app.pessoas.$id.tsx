import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Icon } from "@/components/Icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useSession } from "@/hooks/use-session";
import { useTrackScreen } from "@/hooks/use-telemetry";
import { EntityFiles } from "@/components/platform/EntityFiles";
import { EntityTags } from "@/components/platform/EntityTags";
import { EntityComments } from "@/components/platform/EntityComments";
import { DecisionPanel } from "@/components/platform/DecisionPanel";

import {
  addPersonContact,
  addRelationship,
  deletePersonContact,
  deleteRelationship,
  getPerson360,
  listPeople,
  registerActivity,
} from "@/lib/platform/pessoas.functions";
import { createOpportunity, moveOpportunityStage } from "@/lib/platform/oportunidades.functions";
import {
  ACTIVITY_TIPOS,
  CONTACT_CANAIS,
  RELATIONSHIP_TIPOS,
  activityIcons,
  activityLabels,
  contactCanalIcons,
  contactCanalLabels,
  personEstagioLabels,
  relationshipLabels,
  type ActivityTipo,
  type ContactCanal,
  type PersonEstagio,
  type RelationshipTipo,
} from "@/lib/platform/relacionamento";
import { LEAD_ESTAGIOS, estagioLabels, formatBRL } from "@/lib/platform/comercial";

export const Route = createFileRoute("/app/pessoas/$id")({
  head: () => ({
    meta: [
      { title: "Perfil da pessoa — Ferragano One" },
      {
        name: "description",
        content: "Visão 360: contatos, oportunidades, relacionamentos e histórico da pessoa.",
      },
      { property: "og:title", content: "Perfil da pessoa — Ferragano One" },
      { property: "og:description", content: "Visão 360 do relacionamento com a pessoa." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PessoaDetalhe,
});

function PessoaDetalhe() {
  useTrackScreen("people", "abrir_pessoa", { surface: "app.pessoas.detalhe" });
  const { id } = useParams({ from: "/app/pessoas/$id" });
  const { data: session } = useSession();
  const workspaceId = session?.workspace?.id;
  const queryClient = useQueryClient();
  const fetch360 = useServerFn(getPerson360);

  const { data, isPending, error } = useQuery({
    queryKey: ["person", workspaceId, id],
    queryFn: () => fetch360({ data: { workspaceId: workspaceId!, personId: id } }),
    enabled: Boolean(workspaceId),
  });

  const invalidar = () => queryClient.invalidateQueries({ queryKey: ["person", workspaceId, id] });

  if (isPending) return <Skeleton className="h-96 w-full rounded-xl" />;
  if (error || !data)
    return (
      <p className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
        Pessoa não encontrada.
      </p>
    );

  const { pessoa } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/app/pessoas" className="hover:text-foreground">
          Pessoas
        </Link>
        <Icon name="chevron_right" size={16} />
        <span className="text-foreground">{pessoa.nome}</span>
      </div>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">{pessoa.nome}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="secondary">
              {personEstagioLabels[pessoa.estagio_jornada as PersonEstagio]}
            </Badge>
            {pessoa.documento && <span>{pessoa.documento}</span>}
            <span>· Responsável: {pessoa.responsavelNome}</span>
          </div>
        </div>
        {workspaceId && (
          <div className="flex gap-2">
            <NovaInteracao workspaceId={workspaceId} personId={id} onDone={invalidar} />
            <NovaOportunidade workspaceId={workspaceId} personId={id} onDone={invalidar} />
          </div>
        )}
      </header>

      {workspaceId && <EntityTags workspaceId={workspaceId} entity="person" entityId={id} />}

      <Tabs defaultValue="visao">
        <TabsList>
          <TabsTrigger value="visao">Visão geral</TabsTrigger>
          <TabsTrigger value="decisao">Decisão</TabsTrigger>
          <TabsTrigger value="oportunidades">
            Oportunidades ({data.oportunidades.length})
          </TabsTrigger>
          <TabsTrigger value="rede">Rede ({data.relacionamentos.length})</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="decisao" className="mt-4">
          {workspaceId && <DecisionPanel workspaceId={workspaceId} personId={id} />}
        </TabsContent>

        <TabsContent value="visao" className="mt-4 grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            {workspaceId && (
              <>
                <EntityComments workspaceId={workspaceId} entity="person" entityId={id} />
                <EntityFiles workspaceId={workspaceId} entity="person" entityId={id} />
              </>
            )}
          </div>

          <aside className="space-y-4 rounded-xl border border-border p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Contatos
              </h2>
              {workspaceId && (
                <NovoContato workspaceId={workspaceId} personId={id} onDone={invalidar} />
              )}
            </div>
            {!data.contatos.length ? (
              <p className="text-sm text-muted-foreground">Nenhum contato cadastrado.</p>
            ) : (
              <ul className="space-y-2">
                {data.contatos.map((c) => (
                  <ContatoLinha
                    key={c.id}
                    contato={c}
                    workspaceId={workspaceId}
                    onDone={invalidar}
                  />
                ))}
              </ul>
            )}

            <Separator />

            <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Endereços
            </h2>
            {!data.enderecos.length ? (
              <p className="text-sm text-muted-foreground">Nenhum endereço cadastrado.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {data.enderecos.map((e) => (
                  <li key={e.id} className="text-muted-foreground">
                    {[e.logradouro, e.numero, e.bairro, e.cidade, e.uf].filter(Boolean).join(", ")}
                  </li>
                ))}
              </ul>
            )}

            <Separator />

            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Cadastro</dt>
                <dd>{new Date(pessoa.created_at).toLocaleDateString("pt-BR")}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Último contato</dt>
                <dd>
                  {pessoa.ultimo_contato_em
                    ? new Date(pessoa.ultimo_contato_em).toLocaleDateString("pt-BR")
                    : "—"}
                </dd>
              </div>
            </dl>
          </aside>
        </TabsContent>

        <TabsContent value="oportunidades" className="mt-4 space-y-3">
          {!data.oportunidades.length ? (
            <p className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
              Nenhuma oportunidade para esta pessoa.
            </p>
          ) : (
            data.oportunidades.map((o) => (
              <div
                key={o.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4"
              >
                <div className="min-w-0">
                  <p className="font-medium">
                    {o.titulo ?? o.empreendimentoNome ?? "Oportunidade"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatBRL(o.valor)} · {o.probabilidade}% de chance
                    {o.proxima_acao ? ` · próxima ação: ${o.proxima_acao}` : ""}
                  </p>
                </div>
                {workspaceId && (
                  <MoverEstagio
                    workspaceId={workspaceId}
                    opportunityId={o.id}
                    atual={o.estagio}
                    onDone={invalidar}
                  />
                )}
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="rede" className="mt-4 space-y-3">
          {workspaceId && (
            <NovoRelacionamento workspaceId={workspaceId} personId={id} onDone={invalidar} />
          )}
          {!data.relacionamentos.length ? (
            <p className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
              Nenhum relacionamento mapeado.
            </p>
          ) : (
            <ul className="divide-y divide-border rounded-xl border border-border">
              {data.relacionamentos.map((r) => (
                <li key={`${r.direcao}-${r.id}`} className="flex items-center gap-3 p-3">
                  <Icon name="hub" size={18} className="text-muted-foreground" />
                  <p className="flex-1 text-sm">
                    {r.direcao === "saida" ? (
                      <>
                        {relationshipLabels[r.tipo as RelationshipTipo]}{" "}
                        <Link
                          to="/app/pessoas/$id"
                          params={{ id: r.outraPessoaId }}
                          className="font-medium hover:text-primary hover:underline"
                        >
                          {r.outraPessoaNome}
                        </Link>
                      </>
                    ) : (
                      <>
                        <Link
                          to="/app/pessoas/$id"
                          params={{ id: r.outraPessoaId }}
                          className="font-medium hover:text-primary hover:underline"
                        >
                          {r.outraPessoaNome}
                        </Link>{" "}
                        {relationshipLabels[r.tipo as RelationshipTipo].toLowerCase()} esta pessoa
                      </>
                    )}
                  </p>
                  {workspaceId && r.direcao === "saida" && (
                    <RemoverRelacionamento
                      workspaceId={workspaceId}
                      relacionamentoId={r.id}
                      onDone={invalidar}
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="historico" className="mt-4">
          {!data.atividades.length ? (
            <p className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
              Nenhuma interação registrada.
            </p>
          ) : (
            <ol className="space-y-1">
              {data.atividades.map((a) => (
                <li
                  key={a.id}
                  className="flex items-start gap-3 rounded-lg px-3 py-2.5 hover:bg-muted/60"
                >
                  <Icon
                    name={activityIcons[a.tipo as ActivityTipo] ?? "bolt"}
                    size={18}
                    className="mt-0.5 text-muted-foreground"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">
                      <span className="font-medium">{a.titulo}</span>{" "}
                      <span className="text-muted-foreground">
                        · {activityLabels[a.tipo as ActivityTipo]} · {a.autorNome}
                      </span>
                    </p>
                    {a.descricao && <p className="text-xs text-muted-foreground">{a.descricao}</p>}
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {new Date(a.ocorreu_em).toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ContatoLinha({
  contato,
  workspaceId,
  onDone,
}: {
  contato: { id: string; canal: string; valor: string; rotulo: string | null; principal: boolean };
  workspaceId?: string;
  onDone: () => void;
}) {
  const remover = useServerFn(deletePersonContact);
  const mutation = useMutation({
    mutationFn: () => remover({ data: { workspaceId: workspaceId!, contatoId: contato.id } }),
    onSuccess: onDone,
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <li className="flex items-center gap-2 text-sm">
      <Icon
        name={contactCanalIcons[contato.canal as ContactCanal] ?? "link"}
        size={16}
        className="text-muted-foreground"
      />
      <span className="min-w-0 flex-1 truncate">{contato.valor}</span>
      {contato.principal && (
        <Badge variant="outline" className="text-[10px]">
          principal
        </Badge>
      )}
      <button
        type="button"
        aria-label={`Remover contato ${contato.valor}`}
        className="text-muted-foreground hover:text-destructive"
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending || !workspaceId}
      >
        <Icon name="close" size={16} />
      </button>
    </li>
  );
}

function NovoContato({
  workspaceId,
  personId,
  onDone,
}: {
  workspaceId: string;
  personId: string;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [canal, setCanal] = useState<ContactCanal>("telefone");
  const [valor, setValor] = useState("");
  const adicionar = useServerFn(addPersonContact);

  const mutation = useMutation({
    mutationFn: () => adicionar({ data: { workspaceId, personId, canal, valor } }),
    onSuccess: () => {
      setOpen(false);
      setValor("");
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" aria-label="Adicionar contato">
          <Icon name="add" size={16} />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo contato</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="c-canal">Canal</Label>
            <Select value={canal} onValueChange={(v) => setCanal(v as ContactCanal)}>
              <SelectTrigger id="c-canal">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONTACT_CANAIS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {contactCanalLabels[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="c-valor">Valor</Label>
            <Input id="c-valor" value={valor} onChange={(e) => setValor(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={() => {
              if (valor.trim().length < 3) return toast.error("Informe o contato.");
              mutation.mutate();
            }}
            disabled={mutation.isPending}
          >
            Adicionar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NovaInteracao({
  workspaceId,
  personId,
  onDone,
}: {
  workspaceId: string;
  personId: string;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [tipo, setTipo] = useState<ActivityTipo>("ligacao");
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const registrar = useServerFn(registerActivity);

  const mutation = useMutation({
    mutationFn: () => registrar({ data: { workspaceId, personId, tipo, titulo, descricao } }),
    onSuccess: () => {
      toast.success("Interação registrada.");
      setOpen(false);
      setTitulo("");
      setDescricao("");
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Icon name="add_comment" size={18} />
          Registrar interação
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar interação</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="a-tipo">Tipo</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as ActivityTipo)}>
              <SelectTrigger id="a-tipo">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACTIVITY_TIPOS.filter((t) => t !== "sistema").map((t) => (
                  <SelectItem key={t} value={t}>
                    {activityLabels[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="a-titulo">Resumo</Label>
            <Input id="a-titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="a-desc">Detalhe</Label>
            <Textarea
              id="a-desc"
              rows={3}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={() => {
              if (titulo.trim().length < 2) return toast.error("Descreva a interação.");
              mutation.mutate();
            }}
            disabled={mutation.isPending}
          >
            Registrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NovaOportunidade({
  workspaceId,
  personId,
  onDone,
}: {
  workspaceId: string;
  personId: string;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [valor, setValor] = useState("");
  const criar = useServerFn(createOpportunity);

  const mutation = useMutation({
    mutationFn: () =>
      criar({
        data: {
          workspaceId,
          personId,
          titulo,
          valor: valor ? Number(valor) : null,
        },
      }),
    onSuccess: () => {
      toast.success("Oportunidade criada.");
      setOpen(false);
      setTitulo("");
      setValor("");
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Icon name="trending_up" size={18} />
          Nova oportunidade
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova oportunidade</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="o-titulo">Título</Label>
            <Input
              id="o-titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Apartamento 2 dorm — Zona Sul"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="o-valor">Valor estimado</Label>
            <Input
              id="o-valor"
              type="number"
              min={0}
              value={valor}
              onChange={(e) => setValor(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            Criar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MoverEstagio({
  workspaceId,
  opportunityId,
  atual,
  onDone,
}: {
  workspaceId: string;
  opportunityId: string;
  atual: string;
  onDone: () => void;
}) {
  const mover = useServerFn(moveOpportunityStage);
  const mutation = useMutation({
    mutationFn: (estagio: string) =>
      mover({
        data: {
          workspaceId,
          opportunityId,
          estagio: estagio as (typeof LEAD_ESTAGIOS)[number],
          motivo: estagio === "perdido" ? "Movido manualmente" : "",
        },
      }),
    onSuccess: onDone,
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Select value={atual} onValueChange={(v) => mutation.mutate(v)}>
      <SelectTrigger className="w-44">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {LEAD_ESTAGIOS.map((e) => (
          <SelectItem key={e} value={e}>
            {estagioLabels[e]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function NovoRelacionamento({
  workspaceId,
  personId,
  onDone,
}: {
  workspaceId: string;
  personId: string;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [tipo, setTipo] = useState<RelationshipTipo>("indicou");
  const [alvo, setAlvo] = useState("");
  const fetchPeople = useServerFn(listPeople);
  const adicionar = useServerFn(addRelationship);

  const { data: pessoas } = useQuery({
    queryKey: ["people", workspaceId, "rede"],
    queryFn: () => fetchPeople({ data: { workspaceId, limite: 200 } }),
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: () =>
      adicionar({ data: { workspaceId, fromPersonId: personId, toPersonId: alvo, tipo } }),
    onSuccess: () => {
      setOpen(false);
      setAlvo("");
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Icon name="hub" size={16} />
          Ligar a outra pessoa
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo relacionamento</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="r-tipo">Tipo</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as RelationshipTipo)}>
              <SelectTrigger id="r-tipo">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RELATIONSHIP_TIPOS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {relationshipLabels[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="r-alvo">Pessoa</Label>
            <Select value={alvo} onValueChange={setAlvo}>
              <SelectTrigger id="r-alvo">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {(pessoas ?? [])
                  .filter((p) => p.id !== personId)
                  .map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={() => {
              if (!alvo) return toast.error("Selecione a pessoa.");
              mutation.mutate();
            }}
            disabled={mutation.isPending}
          >
            Ligar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RemoverRelacionamento({
  workspaceId,
  relacionamentoId,
  onDone,
}: {
  workspaceId: string;
  relacionamentoId: string;
  onDone: () => void;
}) {
  const remover = useServerFn(deleteRelationship);
  const mutation = useMutation({
    mutationFn: () => remover({ data: { workspaceId, relacionamentoId } }),
    onSuccess: onDone,
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <button
      type="button"
      aria-label="Remover relacionamento"
      className="text-muted-foreground hover:text-destructive"
      onClick={() => mutation.mutate()}
      disabled={mutation.isPending}
    >
      <Icon name="close" size={16} />
    </button>
  );
}
