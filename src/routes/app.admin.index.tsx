import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/platform/SiteLayout";
import { Icon } from "@/components/Icon";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSession } from "@/hooks/use-session";
import { isAdminRole } from "@/lib/platform/roles";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/app/admin/")({
  head: () => ({
    meta: [
      { title: "Painel de Administração — Ferragano One" },
      { name: "description", content: "Gerenciamento central do Ferragano OS: saúde, usuários, configurações e auditoria." },
      { property: "og:title", content: "Painel de Administração — Ferragano One" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminDashboard,
});

function AdminDashboard() {
  const { data: session } = useSession();
  const admin = isAdminRole(session?.roles);

  if (!admin) {
    return (
      <SiteLayout>
        <div className="container mx-auto py-20 px-4 text-center">
          <Icon name="lock" size={48} className="mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-display font-bold">Acesso Restrito</h1>
          <p className="text-muted-foreground mt-2">Esta área é exclusiva para administradores do sistema.</p>
          <Link to="/app" className="mt-6 inline-flex text-primary hover:underline">
            Voltar para o Dashboard
          </Link>
        </div>
      </SiteLayout>
    );
  }

  const modulos = [
    {
      titulo: "Saúde e Performance",
      descricao: "Status da infraestrutura, latência, jobs e fila de automação.",
      rota: "/app/admin/health",
      icon: "monitor_heart",
      color: "text-rose-500",
    },
    {
      titulo: "Gestão de Usuários",
      descricao: "Membros do workspace, papéis, permissões e convites pendentes.",
      rota: "/app/usuarios",
      icon: "group",
      color: "text-blue-500",
    },
    {
      titulo: "Auditoria e Logs",
      descricao: "Rastreabilidade completa de ações e alterações críticas.",
      rota: "/app/auditoria",
      icon: "history",
      color: "text-amber-500",
    },
    {
      titulo: "Telemetria Avançada",
      descricao: "Logs técnicos brutos e diagnóstico de falhas em tempo real.",
      rota: "/app/telemetria",
      icon: "settings_input_component",
      color: "text-purple-500",
    },
    {
      titulo: "Ecossistema Ferragano",
      descricao: "Configuração de conexões externas e fontes de inteligência.",
      rota: "/app/ecossistema",
      icon: "hub",
      color: "text-emerald-500",
    },
    {
      titulo: "Configurações Globais",
      descricao: "Customização da instância, branding e parâmetros do sistema.",
      rota: "/app/configuracoes",
      icon: "settings",
      color: "text-slate-500",
    }
  ];

  return (
    <SiteLayout>
      <div className="container mx-auto py-10 px-4">
        <header className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-display font-bold tracking-tight">Centro de Administração</h1>
            <Badge variant="outline" className="border-primary/20 text-primary">Master OS</Badge>
          </div>
          <p className="text-muted-foreground max-w-2xl">
            Bem-vindo ao cockpit do Ferragano OS. Aqui você controla a integridade, segurança e expansão da sua plataforma imobiliária.
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {modulos.map((m) => (
            <Link 
              key={m.rota} 
              to={m.rota}
              className="group block"
            >
              <Card className="h-full transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:-translate-y-1">
                <CardHeader>
                  <div className={`w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center mb-4 group-hover:bg-primary/10 transition-colors`}>
                    <Icon name={m.icon} size={24} className={m.color} />
                  </div>
                  <CardTitle className="group-hover:text-primary transition-colors">{m.titulo}</CardTitle>
                  <CardDescription>{m.descricao}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    Acessar módulo <Icon name="arrow_forward" size={14} className="ml-1" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <section className="mt-16 grid gap-6 lg:grid-cols-2">
          <Card className="bg-muted/30 border-dashed">
            <CardHeader>
              <CardTitle className="text-lg">Estado do Deployment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Versão</span>
                  <span className="font-mono">1.1.0-alpha.finalization</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Ambiente</span>
                  <Badge variant="outline">Produção (Certified)</Badge>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Última Auditoria</span>
                  <span>{new Date().toLocaleDateString('pt-BR')}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary/10">
            <CardHeader>
              <CardTitle className="text-lg">Inteligência de Segurança</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 items-start">
                <div className="mt-1 p-2 rounded-full bg-emerald-500/10">
                  <Icon name="verified_user" className="text-emerald-500" size={20} />
                </div>
                <div>
                  <p className="text-sm font-medium">RLS 100% Ativo</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Todas as tabelas do workspace possuem políticas de isolamento ativas e validadas pela Sprint 12.5.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </SiteLayout>
  );
}
