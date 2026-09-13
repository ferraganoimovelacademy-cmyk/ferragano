import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";

import { Icon } from "@/components/Icon";
import { LogoFerragano } from "@/components/site/LogoFerragano";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Input } from "@/components/ui/input";
import { useScrolled } from "@/hooks/use-scrolled";
import { WHATSAPP_MSG_CONSULTORIA, whatsappLink } from "@/lib/site/contato";

type MenuItem = { to: string; label: string; desc: string; icon: string };

const MEGA: { titulo: string; itens: MenuItem[] }[] = [
  {
    titulo: "Como trabalhamos",
    itens: [
      {
        to: "/metodo",
        label: "Método Ferragano",
        desc: "As sete etapas do diagnóstico às chaves.",
        icon: "route",
      },
      {
        to: "/sobre",
        label: "Quem somos",
        desc: "Especialistas em lançamentos e patrimônio.",
        icon: "badge",
      },
      {
        to: "/academy",
        label: "Academy",
        desc: "Formação para investir com critério.",
        icon: "school",
      },
    ],
  },
  {
    titulo: "Oportunidades",
    itens: [
      {
        to: "/empreendimentos/cury",
        label: "Lançamentos Cury",
        desc: "Portal completo dos empreendimentos que comercializo.",
        icon: "domain",
      },
      {
        to: "/empreendimentos",
        label: "Lançamentos",
        desc: "Portfólio publicado, filtrável por perfil.",
        icon: "apartment",
      },
      {
        to: "/simulacao",
        label: "Calculadora patrimonial",
        desc: "Projeção de patrimônio em 10 anos.",
        icon: "calculate",
      },
    ],
  },
];

const DIRETO = [
  { to: "/empreendimentos/cury", label: "Cury Collection" },
  { to: "/carreiras", label: "Trabalhe conosco" },
  { to: "/blog", label: "Blog" },
  { to: "/contato", label: "Contato" },
] as const;

/** Busca global do site — leva ao portfólio já filtrado pelo termo. */
function BuscaGlobal({ onDone }: { onDone?: () => void }) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void navigate({ to: "/empreendimentos", search: q.trim() ? { q: q.trim() } : {} });
        onDone?.();
      }}
      role="search"
      className="relative"
    >
      <Icon
        name="search"
        size={16}
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar bairro, empreendimento…"
        aria-label="Buscar no site"
        className="h-10 w-full pl-9 md:w-56"
      />
    </form>
  );
}

/**
 * GATE 01 — Navegação premium.
 * Transparente sobre o hero, vidro ao rolar, mega menu, busca global e CTA fixo.
 */
export function SiteHeader({ overHero = false }: { overHero?: boolean }) {
  const scrolled = useScrolled(32);
  const [aberto, setAberto] = useState<string | null>(null);
  const [mobile, setMobile] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });
  const fecharTimer = useRef<number | null>(null);

  useEffect(() => {
    setAberto(null);
    setMobile(false);
  }, [path]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setAberto(null);
        setMobile(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const transparente = overHero && !scrolled && !aberto;
  const textoBase = transparente
    ? "text-inverse-on-surface/80 hover:text-inverse-on-surface"
    : "text-muted-foreground hover:text-foreground";

  function agendarFechar() {
    fecharTimer.current = window.setTimeout(() => setAberto(null), 140);
  }
  function cancelarFechar() {
    if (fecharTimer.current) window.clearTimeout(fecharTimer.current);
  }

  return (
    <header
      className={`fixed top-0 right-0 left-0 z-50 transition-colors duration-300 ${
        transparente
          ? "border-b border-transparent bg-transparent"
          : "border-b border-border bg-background/80 backdrop-blur-xl"
      }`}
    >
      <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center gap-4 px-4 md:px-8">
        <Link to="/" className="flex shrink-0 items-center gap-2" aria-label="Ferragano — início">
          <LogoFerragano tom={transparente ? "claro" : "escuro"} />
        </Link>

        <nav aria-label="Navegação principal" className="ml-4 hidden items-center gap-1 lg:flex">
          {MEGA.map((grupo) => (
            <div
              key={grupo.titulo}
              className="relative"
              onMouseEnter={() => {
                cancelarFechar();
                setAberto(grupo.titulo);
              }}
              onMouseLeave={agendarFechar}
            >
              <button
                type="button"
                aria-expanded={aberto === grupo.titulo}
                onClick={() => setAberto(aberto === grupo.titulo ? null : grupo.titulo)}
                className={`inline-flex min-h-11 items-center gap-1 rounded-md px-3 text-sm whitespace-nowrap transition-colors ${textoBase}`}
              >
                {grupo.titulo}
                <Icon
                  name="expand_more"
                  size={16}
                  aria-hidden
                  className={`transition-transform duration-200 ${
                    aberto === grupo.titulo ? "rotate-180" : ""
                  }`}
                />
              </button>
              {aberto === grupo.titulo && (
                <div className="menu-in absolute top-full left-0 w-[420px] pt-2">
                  <div className="rounded-xl border border-border bg-popover p-2 shadow-e4">
                    {grupo.itens.map((item) => (
                      <Link
                        key={item.to}
                        to={item.to}
                        className="flex items-start gap-3 rounded-lg p-3 transition-colors hover:bg-accent"
                      >
                        <Icon name={item.icon} size={20} aria-hidden className="mt-0.5 text-gold" />
                        <span>
                          <span className="block text-sm font-medium">{item.label}</span>
                          <span className="block text-xs text-muted-foreground">{item.desc}</span>
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
          {DIRETO.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`inline-flex min-h-11 items-center rounded-md px-3 text-sm whitespace-nowrap transition-colors ${textoBase}`}
              activeProps={{
                className: transparente
                  ? "text-inverse-on-surface font-medium"
                  : "text-foreground font-medium",
              }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <div className="hidden xl:block">
            <BuscaGlobal />
          </div>
          <ThemeToggle />
          <a
            href={whatsappLink(WHATSAPP_MSG_CONSULTORIA)}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden min-h-11 items-center gap-2 rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground transition-transform duration-200 hover:scale-[1.02] hover:bg-primary-hover sm:inline-flex"
          >
            <Icon name="event" size={16} aria-hidden />
            Consultoria
          </a>
          <button
            type="button"
            aria-label={mobile ? "Fechar menu" : "Abrir menu"}
            aria-expanded={mobile}
            onClick={() => setMobile((v) => !v)}
            className={`inline-flex size-11 items-center justify-center rounded-md transition-colors lg:hidden ${
              transparente
                ? "text-inverse-on-surface hover:bg-inverse-on-surface/10"
                : "hover:bg-accent"
            }`}
          >
            <Icon name={mobile ? "close" : "menu"} size={22} aria-hidden />
          </button>
        </div>
      </div>

      {mobile && (
        <div className="menu-in max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-border bg-background px-4 pt-4 pb-8 lg:hidden">
          <BuscaGlobal onDone={() => setMobile(false)} />
          {MEGA.map((grupo) => (
            <div key={grupo.titulo} className="mt-6">
              <p className="t-caps text-gold">{grupo.titulo}</p>
              <div className="mt-2 grid gap-1">
                {grupo.itens.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="flex min-h-11 items-center gap-3 rounded-lg px-2 text-sm transition-colors hover:bg-accent"
                  >
                    <Icon name={item.icon} size={18} aria-hidden className="text-gold" />
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
          <div className="mt-6 grid gap-1">
            {DIRETO.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="flex min-h-11 items-center rounded-lg px-2 text-sm transition-colors hover:bg-accent"
              >
                {item.label}
              </Link>
            ))}
            <Link
              to="/app"
              className="flex min-h-11 items-center rounded-lg px-2 text-sm text-muted-foreground transition-colors hover:bg-accent"
            >
              Entrar na plataforma
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
