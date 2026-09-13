import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import type { ComponentProps, ReactNode } from "react";

import { Icon } from "@/components/Icon";
import { LogoFerragano } from "@/components/site/LogoFerragano";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useScrolled } from "@/hooks/use-scrolled";
import { whatsappLink } from "@/lib/site/contato";
import {
  IDIOMAS,
  IDIOMA_META,
  caminho,
  equivalentes,
  type Idioma,
  type PaginaKey,
} from "@/lib/site/i18n";
import { textos } from "@/lib/site/i18n-textos";

/**
 * Casca do site nos idiomas estrangeiros. Mesma identidade da casca em
 * português, com navegação, rodapé e CTA já traduzidos e um seletor de
 * idioma que aponta para a URL equivalente da mesma página.
 */

/** `Link` com destino em string: as rotas traduzidas vivem sob `/en/$` e `/es/$`. */
export function LinkI({
  to,
  ...rest
}: { to: string } & Omit<ComponentProps<typeof Link>, "to" | "params" | "search">) {
  return <Link to={to as never} {...(rest as object)} />;
}

export const MSG_WHATS: Record<Idioma, string> = {
  pt: "Olá! Quero agendar uma consultoria patrimonial com a Ferragano.",
  en: "Hello! I'd like to book a real estate consultation with Ferragano. I speak English.",
  es: "¡Hola! Quiero agendar una consultoría patrimonial con Ferragano. Hablo español.",
};

const LINKS: { pagina: PaginaKey; chave: keyof ReturnType<typeof textos>["nav"] }[] = [
  { pagina: "metodo", chave: "metodo" },
  { pagina: "lancamentos", chave: "lancamentos" },
  { pagina: "simulacao", chave: "simulacao" },
  { pagina: "blog", chave: "blog" },
  { pagina: "sobre", chave: "sobre" },
  { pagina: "manifesto", chave: "manifesto" },
  { pagina: "contato", chave: "contato" },
];

function SeletorIdioma({
  idioma,
  pagina,
  params,
}: {
  idioma: Idioma;
  pagina: PaginaKey;
  params?: Partial<Record<Idioma, string>>;
}) {
  const rotas = equivalentes(pagina, params);
  return (
    <nav aria-label={textos(idioma).chrome.idioma} className="flex items-center gap-1">
      {IDIOMAS.map((l) => {
        const atual = l === idioma;
        return (
          <LinkI
            key={l}
            to={rotas[l]}
            hrefLang={IDIOMA_META[l].hreflang}
            aria-current={atual ? "true" : undefined}
            className={`inline-flex h-9 min-w-9 items-center justify-center rounded-md px-2 text-xs font-medium transition-colors ${
              atual ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {IDIOMA_META[l].sigla}
          </LinkI>
        );
      })}
    </nav>
  );
}

export function LayoutIntl({
  idioma,
  pagina,
  params,
  children,
}: {
  idioma: Idioma;
  pagina: PaginaKey;
  params?: Partial<Record<Idioma, string>>;
  children: ReactNode;
}) {
  const t = textos(idioma);
  const scrolled = useScrolled(32);
  const [mobile, setMobile] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => setMobile(false), [path]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMobile(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header
        className={`fixed top-0 right-0 left-0 z-50 border-b transition-colors duration-300 ${
          scrolled || mobile
            ? "border-border bg-background/85 backdrop-blur-xl"
            : "border-border/60 bg-background/60 backdrop-blur-md"
        }`}
      >
        <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center gap-4 px-4 md:px-8">
          <LinkI to={caminho("home", idioma)} className="flex shrink-0 items-center gap-2">
            <LogoFerragano comSelo={false} />
          </LinkI>

          <nav aria-label={t.nav.home} className="ml-4 hidden items-center gap-1 lg:flex">
            {LINKS.map((item) => (
              <LinkI
                key={item.pagina}
                to={caminho(item.pagina, idioma)}
                className="inline-flex min-h-11 items-center rounded-md px-3 text-sm whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground"
                activeProps={{ className: "text-foreground font-medium" }}
              >
                {t.nav[item.chave]}
              </LinkI>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <div className="hidden md:block">
              <SeletorIdioma idioma={idioma} pagina={pagina} params={params} />
            </div>
            <ThemeToggle />
            <a
              href={whatsappLink(MSG_WHATS[idioma])}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden min-h-11 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-transform duration-200 hover:scale-[1.02] hover:bg-primary-hover sm:inline-flex"
            >
              <Icon name="insights" size={16} aria-hidden />
              {t.chrome.consultoria}
            </a>
            <button
              type="button"
              aria-label={mobile ? t.chrome.fecharMenu : t.chrome.abrirMenu}
              aria-expanded={mobile}
              onClick={() => setMobile((v) => !v)}
              className="inline-flex size-11 items-center justify-center rounded-md transition-colors hover:bg-accent lg:hidden"
            >
              <Icon name={mobile ? "close" : "menu"} size={22} aria-hidden />
            </button>
          </div>
        </div>

        {mobile && (
          <div className="menu-in max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-border bg-background px-4 py-4 lg:hidden">
            <nav className="grid gap-1">
              {LINKS.map((item) => (
                <LinkI
                  key={item.pagina}
                  to={caminho(item.pagina, idioma)}
                  className="flex min-h-12 items-center rounded-md px-3 text-base text-foreground transition-colors hover:bg-accent"
                >
                  {t.nav[item.chave]}
                </LinkI>
              ))}
            </nav>
            <div className="mt-4 border-t border-border pt-4">
              <SeletorIdioma idioma={idioma} pagina={pagina} params={params} />
            </div>
          </div>
        )}
      </header>

      <main key={path} className="page-enter flex-1 pt-16">
        {children}
      </main>

      <footer className="border-t border-border bg-card">
        <div className="mx-auto grid w-full max-w-[1200px] gap-8 px-4 py-10 md:grid-cols-[1.2fr_1fr] md:px-8">
          <div>
            <LogoFerragano comSelo={false} />
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">{t.chrome.rodapeLead}</p>
            <p className="mt-4 max-w-sm font-display text-base tracking-tight text-gold">
              “{t.chrome.rodapeFrase}”
            </p>
            <div className="mt-5">
              <SeletorIdioma idioma={idioma} pagina={pagina} params={params} />
            </div>
          </div>
          <nav className="grid grid-cols-2 gap-2 text-sm">
            {LINKS.map((item) => (
              <LinkI
                key={item.pagina}
                to={caminho(item.pagina, idioma)}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                {t.nav[item.chave]}
              </LinkI>
            ))}
            <LinkI
              to={caminho("carreiras", idioma)}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              {t.nav.carreiras}
            </LinkI>
          </nav>
        </div>
        <div className="border-t border-border px-4 py-4 text-center text-xs text-muted-foreground md:px-8">
          © {new Date().getFullYear()} Ferragano · {t.chrome.autoridade}
        </div>
      </footer>

      {/* Barra fixa de conversão no mobile. */}
      <div className="fixed bottom-0 left-0 z-40 grid w-full grid-cols-2 gap-2 border-t border-border bg-background/95 p-2 backdrop-blur-xl lg:hidden">
        <LinkI
          to={caminho("lancamentos", idioma)}
          className="inline-flex min-h-11 items-center justify-center rounded-md border border-border text-sm font-medium"
        >
          {t.chrome.verLancamentos}
        </LinkI>
        <a
          href={whatsappLink(MSG_WHATS[idioma])}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary text-sm font-medium text-primary-foreground"
        >
          {t.chrome.falarAgora}
        </a>
      </div>
      <div className="h-16 lg:hidden" aria-hidden />
    </div>
  );
}