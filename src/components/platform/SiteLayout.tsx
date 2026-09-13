import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { LogoFerragano } from "@/components/site/LogoFerragano";
import { MobileCtaBar } from "@/components/site/MobileCtaBar";
import { ScrollProgress } from "@/components/site/ScrollProgress";
import { APP_VERSION, publicNav } from "@/lib/platform/navigation";
import { FRASE_RODAPE } from "@/lib/site/manifesto";

/**
 * Casca do site público. `heroTransparente` liga o header translúcido
 * sobre heros escuros (GATE 01) — as demais rotas ganham o espaçamento do header fixo.
 */
export function SiteLayout({
  children,
  heroTransparente = false,
}: {
  children?: ReactNode;
  heroTransparente?: boolean;
}) {
  /* Gate 05 — transição de página: remontagem por rota dispara a entrada suave. */
  const rota = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <ScrollProgress />
      <SiteHeader overHero={heroTransparente} />

      <main key={rota} className={`page-enter flex-1 ${heroTransparente ? "" : "pt-16"}`}>
        {children ?? <Outlet />}
      </main>

      <footer className="border-t border-border bg-card pb-20 lg:pb-0">
        <div className="mx-auto w-full max-w-[1200px] px-4 py-16 md:px-8">
          <div className="grid gap-12 md:grid-cols-[1.5fr_1fr_1fr]">
            <div>
              <LogoFerragano comSelo={false} />
              <p className="mt-6 max-w-sm text-base text-muted-foreground">
                Especialista em lançamentos Cury e consultoria em construção patrimonial. 
                Mais de R$ 73 milhões em VGV comercializado.
              </p>
              <div className="mt-8 flex gap-4">
                {/* Placeholder para ícones sociais se necessário */}
                <div className="flex h-10 items-center gap-4 text-muted-foreground">
                  <span className="text-xs tracking-widest uppercase">Social</span>
                  <div className="h-px w-8 bg-border" />
                  <a href="#" className="hover:text-gold transition-colors">Instagram</a>
                  <a href="#" className="hover:text-gold transition-colors">LinkedIn</a>
                  <a href="#" className="hover:text-gold transition-colors">YouTube</a>
                </div>
              </div>
            </div>
            
            <nav className="space-y-4">
              <p className="font-display text-sm font-semibold tracking-wider uppercase text-foreground">Explorar</p>
              <ul className="space-y-3 text-sm">
                {publicNav.slice(0, 4).map((item) => (
                  <li key={item.to}>
                    <Link to={item.to} className="text-muted-foreground transition-colors hover:text-gold">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <nav className="space-y-4">
              <p className="font-display text-sm font-semibold tracking-wider uppercase text-foreground">Plataforma</p>
              <ul className="space-y-3 text-sm">
                {publicNav.slice(4).map((item) => (
                  <li key={item.to}>
                    <Link to={item.to} className="text-muted-foreground transition-colors hover:text-gold">
                      {item.label}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link to="/app" className="inline-flex items-center gap-2 font-medium text-gold hover:underline">
                    Acesso Restrito
                    <span className="h-1.5 w-1.5 rounded-full bg-gold animate-pulse" />
                  </Link>
                </li>
              </ul>
            </nav>
          </div>

          <div className="mt-20 border-t border-border pt-8 flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} Ferragano One · Todos os direitos reservados.
            </p>
            <div className="flex gap-6 text-xs text-muted-foreground">
              <a href="#" className="hover:text-foreground">Privacidade</a>
              <a href="#" className="hover:text-foreground">Termos</a>
              <span className="font-mono text-[10px] opacity-50">{APP_VERSION}</span>
            </div>
          </div>
        </div>
      </footer>
      <MobileCtaBar />
    </div>
  );
}
