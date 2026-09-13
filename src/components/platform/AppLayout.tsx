import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { Icon } from "@/components/Icon";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationBell } from "@/components/platform/NotificationBell";
import { GlobalSearch } from "@/components/platform/GlobalSearch";
import { FeedbackButton } from "@/components/platform/FeedbackButton";
import { APP_VERSION, appNav } from "@/lib/platform/navigation";
import { isModuleEnabled } from "@/lib/platform/feature-flags";
import { isAdminRole } from "@/lib/platform/roles";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { useTelemetry, useTrackLogin, useWebVitals } from "@/hooks/use-telemetry";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

function UserMenu() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data } = useSession();
  const { track } = useTelemetry();

  const nome = data?.profile?.nome ?? data?.profile?.email ?? "Conta";
  const iniciais = nome.slice(0, 2).toUpperCase();

  async function signOut() {
    // Registrado antes de limpar a sessão: depois do signOut não há bearer.
    track({ domain: "platform", action: "logout", surface: "app.shell" });
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="ml-1 grid h-8 w-8 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
        aria-label="Conta"
      >
        {iniciais}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate">
          {nome}
          {data?.roles?.length ? (
            <span className="block text-xs font-normal text-muted-foreground capitalize">
              {data.roles.join(", ")}
            </span>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate({ to: "/app/configuracoes" })}>
          <Icon name="settings" size={16} />
          Configurações
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void signOut()}>
          <Icon name="logout" size={16} />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SidebarNav({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: session } = useSession();
  const dbFlags = session?.flags;
  const admin = isAdminRole(session?.roles);

  return (
    <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3">
      {appNav.map((item) => {
        if (item.adminOnly && !admin) return null;
        const moduleOn = item.module
          ? (dbFlags?.[item.module] ?? isModuleEnabled(item.module))
          : true;
        const enabled = Boolean(item.to) && moduleOn;
        const active =
          item.to === "/app" ? pathname === "/app" : pathname.startsWith(item.to ?? "§");
        const base = cn(
          "group flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
          collapsed && "justify-center px-0",
        );

        if (!enabled) {
          return (
            <span
              key={item.label}
              title={`${item.label} — em breve`}
              className={cn(base, "cursor-not-allowed text-sidebar-foreground/35")}
            >
              <Icon name={item.icon} size={20} />
              {!collapsed && (
                <>
                  <span className="flex-1 truncate">{item.label}</span>
                  <span className="rounded-sm border border-sidebar-border px-1.5 py-0.5 text-[10px] tracking-wide uppercase">
                    Em breve
                  </span>
                </>
              )}
            </span>
          );
        }

        return (
          <Link
            key={item.label}
            to={item.to!}
            onClick={onNavigate}
            className={cn(
              base,
              active
                ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
            )}
          >
            <Icon name={item.icon} size={20} fill={active} />
            {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppLayout({ children }: { children?: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: session } = useSession();
  const workspaceNome = session?.workspace?.nome ?? "Workspace";

  // SPRINT 12 — jornada e Web Vitals medidos uma única vez, no shell.
  useWebVitals();
  useTrackLogin();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card/90 px-4 backdrop-blur">
        <button
          onClick={() => setMobileOpen(true)}
          className="rounded-md p-2 text-muted-foreground hover:bg-accent md:hidden"
          aria-label="Abrir menu"
        >
          <Icon name="menu" size={20} />
        </button>
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="hidden rounded-md p-2 text-muted-foreground hover:bg-accent md:block"
          aria-label="Recolher menu lateral"
        >
          <Icon name={collapsed ? "menu_open" : "menu"} size={20} />
        </button>
        <Link to="/app" className="flex items-center gap-2">
          <span className="font-display text-base font-semibold tracking-tight">Ferragano</span>
          <span className="rounded-sm bg-primary-soft px-1.5 py-0.5 text-[10px] font-semibold tracking-widest text-primary-soft-foreground uppercase">
            One
          </span>
        </Link>
        <div className="ml-auto flex items-center gap-1">
          <GlobalSearch workspaceId={session?.workspace?.id} />
          {session?.workspace?.id && <NotificationBell workspaceId={session.workspace.id} />}

          <ThemeToggle />
          <UserMenu />
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar desktop */}
        <aside
          className={cn(
            "sticky top-14 hidden h-[calc(100vh-3.5rem)] shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] md:flex",
            collapsed ? "w-16" : "w-60",
          )}
        >
          <SidebarNav collapsed={collapsed} />
          <div className="border-t border-sidebar-border p-3 text-[11px] text-sidebar-foreground/40">
            {collapsed ? APP_VERSION : `${workspaceNome} · ${APP_VERSION}`}
          </div>
        </aside>

        {/* Sidebar mobile */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div
              className="absolute inset-0 bg-foreground/40"
              onClick={() => setMobileOpen(false)}
            />
            <aside className="absolute inset-y-0 left-0 flex w-64 flex-col bg-sidebar">
              <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-4 text-sidebar-foreground">
                <span className="font-display font-semibold">Ferragano One</span>
                <button onClick={() => setMobileOpen(false)} aria-label="Fechar menu">
                  <Icon name="close" size={20} />
                </button>
              </div>
              <SidebarNav collapsed={false} onNavigate={() => setMobileOpen(false)} />
            </aside>
          </div>
        )}

        {/* Workspace */}
        <main className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-[1440px] px-4 py-6 md:px-8 md:py-8">
            {children ?? <Outlet />}
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="flex items-center justify-between border-t border-border bg-card px-4 py-3 text-xs text-muted-foreground md:px-8">
        <span>Ferragano One — plataforma interna</span>
        <span className="font-mono">{APP_VERSION}</span>
      </footer>

      {/* FASE 1 — GATE P07: canal de feedback sempre acessível no piloto. */}
      <FeedbackButton workspaceId={session?.workspace?.id} />
    </div>
  );
}
