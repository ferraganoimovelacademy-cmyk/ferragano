import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { ArrowRight, Building2, Plus, Search } from "lucide-react";

import { ThemeToggle } from "@/components/ThemeToggle";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/design-system")({
  head: () => ({
    meta: [
      { title: "Design System — Ferragano OS" },
      {
        name: "description",
        content:
          "Fundação visual do Ferragano OS: tokens de cor, tipografia, espaçamento e biblioteca de componentes.",
      },
      { property: "og:title", content: "Design System — Ferragano OS" },
      {
        property: "og:description",
        content: "Tokens, tipografia e componentes reutilizáveis da plataforma Ferragano OS.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DesignSystemPage,
});

const palettes: { group: string; items: { name: string; className: string; note?: string }[] }[] = [
  {
    group: "Base",
    items: [
      { name: "background", className: "bg-background" },
      { name: "foreground", className: "bg-foreground" },
      { name: "card", className: "bg-card" },
      { name: "muted", className: "bg-muted" },
      { name: "muted-foreground", className: "bg-muted-foreground" },
    ],
  },
  {
    group: "Superfícies",
    items: [
      { name: "surface-lowest", className: "bg-surface-lowest" },
      { name: "surface-low", className: "bg-surface-low" },
      { name: "surface", className: "bg-surface" },
      { name: "surface-high", className: "bg-surface-high" },
      { name: "surface-highest", className: "bg-surface-highest" },
    ],
  },
  {
    group: "Azul petróleo",
    items: [
      { name: "primary", className: "bg-primary" },
      { name: "primary-hover", className: "bg-primary-hover" },
      { name: "primary-soft", className: "bg-primary-soft" },
      { name: "sidebar", className: "bg-sidebar" },
      { name: "ring", className: "bg-ring" },
    ],
  },
  {
    group: "Dourado (só destaque)",
    items: [
      { name: "gold", className: "bg-gold", note: "fios, ícones, KPI" },
      { name: "gold-dim", className: "bg-gold-dim" },
      { name: "gold-container", className: "bg-gold-container" },
    ],
  },
  {
    group: "Estados",
    items: [
      { name: "success", className: "bg-success" },
      { name: "warning", className: "bg-warning" },
      { name: "destructive", className: "bg-destructive" },
      { name: "info", className: "bg-info" },
      { name: "border", className: "bg-border" },
    ],
  },
];

const typeScale = [
  { cls: "t-display", label: "Display / 40–56" },
  { cls: "t-h1", label: "H1 / 30–36" },
  { cls: "t-h2", label: "H2 / 22" },
  { cls: "t-h3", label: "H3 / 17" },
  { cls: "t-body-lg", label: "Body LG / 17" },
  { cls: "t-body", label: "Body / 15" },
  { cls: "t-body-sm", label: "Body SM / 13" },
  { cls: "t-data", label: "Data mono / 13" },
  { cls: "t-caps", label: "Caps mono / 10.5" },
];

function Section({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-border pt-10">
      <div className="mb-6 max-w-2xl">
        <h2 className="t-h2 text-foreground">{title}</h2>
        <p className="t-body-sm mt-1 text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  );
}

function DesignSystemPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-margin-mobile py-4 md:px-margin-desktop">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid size-9 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground">
              <Building2 className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="t-h3 truncate text-foreground">Ferragano OS</p>
              <p className="t-caps text-gold">Design System v1</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-12 px-margin-mobile py-10 md:px-margin-desktop">
        <div className="max-w-2xl">
          <h1 className="t-display text-foreground">Fundação visual</h1>
          <p className="t-body-lg mt-3 text-muted-foreground">
            Azul petróleo como cor de comando, branco gelo e grafite como estrutura, dourado apenas
            para destaque. Todo valor vive em{" "}
            <code className="t-data text-gold">src/styles.css</code> — componentes só consomem
            tokens.
          </p>
        </div>

        <Section
          id="cores"
          title="Cores"
          description="Tokens semânticos em oklch, com par claro e escuro. Nenhuma cor literal em componentes."
        >
          <div className="space-y-6">
            {palettes.map((p) => (
              <div key={p.group}>
                <p className="t-caps mb-3 text-muted-foreground">{p.group}</p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                  {p.items.map((c) => (
                    <div key={c.name} className="panel overflow-hidden">
                      <div className={`h-16 w-full ${c.className}`} />
                      <div className="p-3">
                        <p className="t-data truncate text-foreground">{c.name}</p>
                        {c.note && <p className="t-body-sm text-muted-foreground">{c.note}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section
          id="tipografia"
          title="Tipografia"
          description="Sora para títulos, Manrope para texto, IBM Plex Mono para dados e rótulos."
        >
          <div className="panel divide-y divide-border">
            {typeScale.map((t) => (
              <div
                key={t.cls}
                className="grid grid-cols-[minmax(0,1fr)] gap-1 p-4 sm:grid-cols-[160px_minmax(0,1fr)] sm:items-baseline sm:gap-6"
              >
                <span className="t-caps text-muted-foreground">{t.label}</span>
                <span className={`${t.cls} text-foreground`}>Patrimônio construído com método</span>
              </div>
            ))}
          </div>
        </Section>

        <Section
          id="botoes"
          title="Botões"
          description="Uma ação primária por tela. Dourado reservado a conversão; destructive só para perda de dados."
        >
          <div className="panel space-y-6 p-6">
            <div className="flex flex-wrap items-center gap-3">
              <Button>Ação primária</Button>
              <Button variant="outline">Secundária</Button>
              <Button variant="ghost">Terciária</Button>
              <Button variant="gold">Destaque</Button>
              <Button variant="destructive">Excluir</Button>
              <Button variant="soft">Suave</Button>
              <Button variant="link">Saiba mais</Button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="sm">Pequeno</Button>
              <Button size="default">Padrão</Button>
              <Button size="lg">
                Grande <ArrowRight />
              </Button>
              <Button size="icon" variant="outline" aria-label="Novo">
                <Plus />
              </Button>
              <Button disabled>Desabilitado</Button>
            </div>
          </div>
        </Section>

        <Section
          id="formularios"
          title="Formulários"
          description="Rótulo sempre visível, foco com anel de 2px no token ring."
        >
          <div className="panel grid gap-6 p-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ds-nome">Nome do cliente</Label>
              <Input id="ds-nome" placeholder="Fernanda Alves" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ds-busca">Busca</Label>
              <div className="relative">
                <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="ds-busca" className="pl-9" placeholder="Buscar empreendimento" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ds-estagio">Estágio do funil</Label>
              <Select>
                <SelectTrigger id="ds-estagio">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="novo">Novo lead</SelectItem>
                  <SelectItem value="qualificado">Qualificado</SelectItem>
                  <SelectItem value="visita">Visita agendada</SelectItem>
                  <SelectItem value="proposta">Proposta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ds-obs">Observações</Label>
              <Textarea id="ds-obs" placeholder="Contexto da negociação" />
            </div>
            <div className="flex items-center gap-3">
              <Checkbox id="ds-check" />
              <Label htmlFor="ds-check">Aceita contato por WhatsApp</Label>
            </div>
            <div className="flex items-center gap-3">
              <Switch id="ds-switch" />
              <Label htmlFor="ds-switch">Distribuição automática de leads</Label>
            </div>
          </div>
        </Section>

        <Section
          id="dados"
          title="Dados e status"
          description="Números em mono tabular. Badge comunica estado, nunca decoração."
        >
          <div className="space-y-6">
            <div className="flex flex-wrap gap-2">
              <Badge>Padrão</Badge>
              <Badge variant="soft">Em análise</Badge>
              <Badge variant="gold">Prioridade</Badge>
              <Badge variant="success">Ganho</Badge>
              <Badge variant="warning">Atrasado</Badge>
              <Badge variant="destructive">Perdido</Badge>
              <Badge variant="outline">Arquivado</Badge>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { label: "VGV do mês", value: "R$ 12,4 M", delta: "+18%" },
                { label: "Leads ativos", value: "284", delta: "+6%" },
                { label: "Taxa de conversão", value: "7,9%", delta: "-1,2%" },
              ].map((kpi) => (
                <Card key={kpi.label}>
                  <CardHeader className="pb-2">
                    <CardDescription className="t-caps">{kpi.label}</CardDescription>
                    <CardTitle className="t-h1 text-foreground">{kpi.value}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <span className="t-data text-gold">{kpi.delta} vs. mês anterior</span>
                    <Progress className="mt-3" value={68} />
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="panel overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Corretor</TableHead>
                    <TableHead>Empreendimento</TableHead>
                    <TableHead>Estágio</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    ["Marcos Vieira", "Alameda Cury", "Proposta", "R$ 3.420.000"],
                    ["Aline Prado", "Reserva Alphaville", "Visita", "R$ 5.900.000"],
                    ["Rafael Sena", "Garden House", "Qualificado", "R$ 1.850.000"],
                  ].map((row) => (
                    <TableRow key={row[0]}>
                      <TableCell className="flex items-center gap-3">
                        <Avatar className="size-7">
                          <AvatarFallback className="t-caps">
                            {row[0].slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate">{row[0]}</span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{row[1]}</TableCell>
                      <TableCell>
                        <Badge variant="soft">{row[2]}</Badge>
                      </TableCell>
                      <TableCell className="t-data text-right">{row[3]}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </Section>

        <Section
          id="overlays"
          title="Navegação e overlays"
          description="Abas para alternar contexto; modal só para decisão que bloqueia o fluxo."
        >
          <div className="space-y-6">
            <Tabs defaultValue="resumo">
              <TabsList>
                <TabsTrigger value="resumo">Resumo</TabsTrigger>
                <TabsTrigger value="atividades">Atividades</TabsTrigger>
                <TabsTrigger value="documentos">Documentos</TabsTrigger>
              </TabsList>
              <TabsContent value="resumo" className="panel mt-4 p-6">
                <p className="t-body text-muted-foreground">Painel de resumo do negócio.</p>
              </TabsContent>
              <TabsContent value="atividades" className="panel mt-4 p-6">
                <p className="t-body text-muted-foreground">Linha do tempo de interações.</p>
              </TabsContent>
              <TabsContent value="documentos" className="panel mt-4 p-6">
                <p className="t-body text-muted-foreground">Contratos e propostas.</p>
              </TabsContent>
            </Tabs>

            <div className="flex flex-wrap gap-3">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline">Abrir modal</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Encerrar negociação</DialogTitle>
                    <DialogDescription>
                      A oportunidade sai do funil ativo e vai para o histórico.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="ghost">Cancelar</Button>
                    <Button variant="destructive">Encerrar</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Button variant="ghost" onClick={() => toast.success("Lead atribuído ao corretor.")}>
                Disparar toast
              </Button>
            </div>

            <Alert>
              <AlertTitle>Integração pendente</AlertTitle>
              <AlertDescription>Conecte o banco de dados para ativar CRM e ERP.</AlertDescription>
            </Alert>
          </div>
        </Section>

        <Section
          id="estados"
          title="Estados de carregamento e vazio"
          description="Toda lista precisa de estado vazio e de skeleton — nunca tela em branco."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="panel space-y-3 p-6">
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-24 w-full" />
            </div>
            <div className="panel flex flex-col items-center justify-center gap-3 p-10 text-center">
              <div className="grid size-11 place-items-center rounded-lg bg-primary-soft text-primary-soft-foreground">
                <Building2 className="size-5" />
              </div>
              <p className="t-h3 text-foreground">Nenhum empreendimento</p>
              <p className="t-body-sm max-w-xs text-muted-foreground">
                Cadastre o primeiro lançamento para começar a distribuir leads.
              </p>
              <Button size="sm">
                <Plus /> Novo empreendimento
              </Button>
            </div>
          </div>
        </Section>

        <Section
          id="layout"
          title="Espaçamento e grid"
          description="Base de 4px, margem 16px no mobile e 48px no desktop, grid de 12 colunas com gutter de 24px."
        >
          <div className="panel space-y-4 p-6">
            <div className="flex flex-wrap items-end gap-3">
              {[4, 8, 12, 16, 24, 32, 48, 64].map((s) => (
                <div key={s} className="text-center">
                  <div className="bg-primary" style={{ width: s, height: s }} />
                  <span className="t-caps mt-2 block text-muted-foreground">{s}</span>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-12 gap-2">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="h-10 rounded-xs bg-primary-soft" />
              ))}
            </div>
          </div>
        </Section>
      </main>
    </div>
  );
}
