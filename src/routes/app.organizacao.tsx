import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Icon } from "@/components/Icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TimelinePanel } from "@/components/platform/TimelinePanel";
import { useSession } from "@/hooks/use-session";
import { isAdminRole } from "@/lib/platform/roles";
import { DIAS, getOrganizacao, updateOrganizacao } from "@/lib/platform/organizacao.functions";

export const Route = createFileRoute("/app/organizacao")({
  head: () => ({
    meta: [
      { title: "Organização — Ferragano One" },
      {
        name: "description",
        content:
          "Dados cadastrais, identidade visual, endereço e configuração regional da empresa.",
      },
      { property: "og:title", content: "Organização — Ferragano One" },
      {
        property: "og:description",
        content: "Gestão dos dados da empresa no Ferragano One.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OrganizacaoPage,
});

type Expediente = Record<string, { ativo: boolean; inicio: string; fim: string }>;

const campo = (v: string | null | undefined) => v ?? "";

function OrganizacaoPage() {
  const { data: session } = useSession();
  const workspaceId = session?.workspace?.id;
  const admin = isAdminRole(session?.roles);
  const queryClient = useQueryClient();

  const carregar = useServerFn(getOrganizacao);
  const salvar = useServerFn(updateOrganizacao);

  const { data, isPending } = useQuery({
    queryKey: ["organizacao", workspaceId],
    queryFn: () => carregar({ data: { workspaceId: workspaceId! } }),
    enabled: Boolean(workspaceId),
  });

  const ws = data?.workspace;
  const [form, setForm] = useState<Record<string, string>>({});
  const [expediente, setExpediente] = useState<Expediente>({});

  useEffect(() => {
    if (!ws) return;
    setForm({
      nome: campo(ws.nome),
      nome_fantasia: campo(ws.nome_fantasia),
      razao_social: campo(ws.razao_social),
      cnpj: campo(ws.cnpj),
      inscricao_estadual: campo(ws.inscricao_estadual),
      logo_url: campo(ws.logo_url),
      email: campo(ws.email),
      site: campo(ws.site),
      telefone: campo(ws.telefone),
      whatsapp: campo(ws.whatsapp),
      endereco_cep: campo(ws.endereco_cep),
      endereco_logradouro: campo(ws.endereco_logradouro),
      endereco_numero: campo(ws.endereco_numero),
      endereco_complemento: campo(ws.endereco_complemento),
      endereco_bairro: campo(ws.endereco_bairro),
      endereco_cidade: campo(ws.endereco_cidade),
      endereco_uf: campo(ws.endereco_uf),
      timezone: campo(ws.timezone),
      moeda: campo(ws.moeda),
    });
    setExpediente((ws.horario_comercial ?? {}) as Expediente);
  }, [ws]);

  const mutation = useMutation({
    mutationFn: () =>
      salvar({
        data: {
          workspaceId: workspaceId!,
          nome: form.nome,
          nome_fantasia: form.nome_fantasia,
          razao_social: form.razao_social,
          cnpj: form.cnpj,
          inscricao_estadual: form.inscricao_estadual,
          logo_url: form.logo_url,
          email: form.email,
          site: form.site,
          telefone: form.telefone,
          whatsapp: form.whatsapp,
          endereco_cep: form.endereco_cep,
          endereco_logradouro: form.endereco_logradouro,
          endereco_numero: form.endereco_numero,
          endereco_complemento: form.endereco_complemento,
          endereco_bairro: form.endereco_bairro,
          endereco_cidade: form.endereco_cidade,
          endereco_uf: form.endereco_uf.toUpperCase(),
          timezone: form.timezone || undefined,
          moeda: (form.moeda || "BRL").toUpperCase(),
          horario_comercial: expediente,
        },
      }),
    onSuccess: () => {
      toast.success("Organização atualizada.");
      queryClient.invalidateQueries({ queryKey: ["organizacao"] });
      queryClient.invalidateQueries({ queryKey: ["session"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  if (isPending) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Organização</h1>
          <p className="text-muted-foreground text-sm">
            Dados cadastrais, contato, endereço e configuração regional da empresa.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {workspaceId && (
            <TimelinePanel
              workspaceId={workspaceId}
              entity="workspaces"
              entityId={workspaceId}
              titulo="Histórico da organização"
            />
          )}
          {admin && (
            <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
              <Icon name="save" size={18} />
              Salvar
            </Button>
          )}
        </div>
      </header>

      {!admin && (
        <p className="border-border text-muted-foreground rounded-md border border-dashed p-3 text-sm">
          Somente proprietário e administrador podem editar estes dados.
        </p>
      )}

      <Tabs defaultValue="identidade">
        <TabsList>
          <TabsTrigger value="identidade">Identidade</TabsTrigger>
          <TabsTrigger value="contato">Contato e endereço</TabsTrigger>
          <TabsTrigger value="regional">Regional</TabsTrigger>
          <TabsTrigger value="plano">Plano</TabsTrigger>
        </TabsList>

        <TabsContent value="identidade" className="mt-4">
          <Card>
            <CardContent className="grid gap-4 pt-6 sm:grid-cols-2">
              <div className="flex items-center gap-4 sm:col-span-2">
                <div className="border-border bg-muted grid h-16 w-16 place-items-center overflow-hidden rounded-md border">
                  {form.logo_url ? (
                    <img
                      src={form.logo_url}
                      alt="Logo da empresa"
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <Icon name="business" size={24} className="text-muted-foreground" />
                  )}
                </div>
                <div className="grid flex-1 gap-1.5">
                  <Label htmlFor="logo">URL do logo</Label>
                  <Input
                    id="logo"
                    value={form.logo_url ?? ""}
                    onChange={set("logo_url")}
                    disabled={!admin}
                  />
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="nome">Nome do workspace</Label>
                <Input id="nome" value={form.nome ?? ""} onChange={set("nome")} disabled={!admin} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="fantasia">Nome fantasia</Label>
                <Input
                  id="fantasia"
                  value={form.nome_fantasia ?? ""}
                  onChange={set("nome_fantasia")}
                  disabled={!admin}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="razao">Razão social</Label>
                <Input
                  id="razao"
                  value={form.razao_social ?? ""}
                  onChange={set("razao_social")}
                  disabled={!admin}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="cnpj">CNPJ</Label>
                <Input id="cnpj" value={form.cnpj ?? ""} onChange={set("cnpj")} disabled={!admin} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="ie">Inscrição estadual</Label>
                <Input
                  id="ie"
                  value={form.inscricao_estadual ?? ""}
                  onChange={set("inscricao_estadual")}
                  disabled={!admin}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contato" className="mt-4">
          <Card>
            <CardContent className="grid gap-4 pt-6 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  value={form.email ?? ""}
                  onChange={set("email")}
                  disabled={!admin}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="site">Site</Label>
                <Input id="site" value={form.site ?? ""} onChange={set("site")} disabled={!admin} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="tel">Telefone</Label>
                <Input
                  id="tel"
                  value={form.telefone ?? ""}
                  onChange={set("telefone")}
                  disabled={!admin}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="zap">WhatsApp</Label>
                <Input
                  id="zap"
                  value={form.whatsapp ?? ""}
                  onChange={set("whatsapp")}
                  disabled={!admin}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="cep">CEP</Label>
                <Input
                  id="cep"
                  value={form.endereco_cep ?? ""}
                  onChange={set("endereco_cep")}
                  disabled={!admin}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="log">Logradouro</Label>
                <Input
                  id="log"
                  value={form.endereco_logradouro ?? ""}
                  onChange={set("endereco_logradouro")}
                  disabled={!admin}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="num">Número</Label>
                <Input
                  id="num"
                  value={form.endereco_numero ?? ""}
                  onChange={set("endereco_numero")}
                  disabled={!admin}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="compl">Complemento</Label>
                <Input
                  id="compl"
                  value={form.endereco_complemento ?? ""}
                  onChange={set("endereco_complemento")}
                  disabled={!admin}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="bairro">Bairro</Label>
                <Input
                  id="bairro"
                  value={form.endereco_bairro ?? ""}
                  onChange={set("endereco_bairro")}
                  disabled={!admin}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="cidade">Cidade</Label>
                <Input
                  id="cidade"
                  value={form.endereco_cidade ?? ""}
                  onChange={set("endereco_cidade")}
                  disabled={!admin}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="uf">UF</Label>
                <Input
                  id="uf"
                  maxLength={2}
                  value={form.endereco_uf ?? ""}
                  onChange={set("endereco_uf")}
                  disabled={!admin}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="regional" className="mt-4 space-y-4">
          <Card>
            <CardContent className="grid gap-4 pt-6 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="tz">Fuso horário</Label>
                <Input
                  id="tz"
                  value={form.timezone ?? ""}
                  onChange={set("timezone")}
                  disabled={!admin}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="moeda">Moeda</Label>
                <Input
                  id="moeda"
                  maxLength={3}
                  value={form.moeda ?? ""}
                  onChange={set("moeda")}
                  disabled={!admin}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Horário comercial</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {DIAS.map(([key, label]) => {
                const dia = expediente[key] ?? { ativo: false, inicio: "09:00", fim: "18:00" };
                return (
                  <div key={key} className="flex flex-wrap items-center gap-3">
                    <Switch
                      checked={dia.ativo}
                      disabled={!admin}
                      onCheckedChange={(v) =>
                        setExpediente((e) => ({ ...e, [key]: { ...dia, ativo: v } }))
                      }
                    />
                    <span className="w-24 text-sm">{label}</span>
                    <Input
                      type="time"
                      className="w-32"
                      value={dia.inicio}
                      disabled={!admin || !dia.ativo}
                      onChange={(e) =>
                        setExpediente((s) => ({ ...s, [key]: { ...dia, inicio: e.target.value } }))
                      }
                    />
                    <span className="text-muted-foreground text-sm">até</span>
                    <Input
                      type="time"
                      className="w-32"
                      value={dia.fim}
                      disabled={!admin || !dia.ativo}
                      onChange={(e) =>
                        setExpediente((s) => ({ ...s, [key]: { ...dia, fim: e.target.value } }))
                      }
                    />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plano" className="mt-4">
          <Card>
            <CardContent className="grid gap-4 pt-6 sm:grid-cols-3">
              <div>
                <p className="text-muted-foreground text-xs uppercase">Plano</p>
                <p className="text-lg font-semibold capitalize">{ws?.plano ?? "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs uppercase">Situação</p>
                <p className="text-lg font-semibold capitalize">{ws?.status ?? "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs uppercase">Trial expira em</p>
                <p className="text-lg font-semibold">
                  {ws?.trial_expira_em
                    ? new Date(ws.trial_expira_em).toLocaleDateString("pt-BR")
                    : "—"}
                </p>
              </div>
              <p className="text-muted-foreground sm:col-span-3 text-sm">
                Módulos habilitados são configurados em Permissões.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
