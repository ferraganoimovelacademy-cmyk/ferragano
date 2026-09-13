import { Link } from "@tanstack/react-router";
import { Icon } from "@/components/Icon";
import { Badge } from "@/components/ui/badge";
import { useParallax } from "@/hooks/use-parallax";
import { useReveal } from "@/hooks/use-reveal";
import { empStatusLabels, formatBRL } from "@/lib/platform/comercial";
import { anoEntrega, ehMcmv, type CuryEmpreendimento } from "@/lib/site/cury";
import { whatsappLink } from "@/lib/site/contato";
import { MARCA } from "@/lib/site/posicionamento";
import { propsImagem } from "@/lib/site/imagem";
import type { Assinatura } from "@/lib/site/signature";

/**
 * GATE 03 — Hero fullscreen do empreendimento.
 * Vídeo quando existir, imagem premium como fallback, placeholder elegante
 * enquanto não há material licenciado. Título gigante, selos e dados de decisão.
 */
export function HeroEmpreendimento({
  e,
  video,
  assinatura,
}: {
  e: CuryEmpreendimento & { galeria: string[] };
  video?: string | null;
  assinatura: Assinatura;
}) {
  const midia = useParallax<HTMLDivElement>(0.06);
  const bloco = useReveal<HTMLDivElement>(120);
  const capa = e.capa_url ?? e.galeria[0] ?? null;
  const local = [e.bairro, e.cidade, e.uf].filter(Boolean).join(", ");

  const temMidia = Boolean(video ?? capa);

  return (
    <section className="relative isolate flex min-h-[78svh] items-end overflow-hidden border-b border-border">
      <div ref={midia} className="absolute inset-[-12%] -z-20">
        {video ? (
          <video
            src={video}
            poster={capa ?? undefined}
            autoPlay
            muted
            loop
            playsInline
            className="size-full object-cover"
          />
        ) : capa ? (
          <img
            {...propsImagem(capa, { sizes: "100vw", prioridade: true })}
            alt={`${e.nome} em ${local || "São Paulo"}`}
            className="size-full object-cover"
            style={{ animation: "ken-burns 26s ease-in-out infinite alternate" }}
          />
        ) : (
          <div className="cine-bg size-full bg-[radial-gradient(circle_at_25%_20%,var(--primary-soft),transparent_60%),radial-gradient(circle_at_80%_70%,var(--accent),transparent_55%),linear-gradient(160deg,var(--muted),var(--card))]" />
        )}
      </div>

      <div
        className={`absolute inset-0 -z-10 bg-gradient-to-t ${
          temMidia
            ? "from-background via-background/80 to-background/30"
            : "from-background via-background/70 to-transparent"
        }`}
        aria-hidden="true"
      />
      <div className="light-motes absolute inset-0 -z-10" aria-hidden="true" />

      <div className="mx-auto w-full max-w-[1200px] px-4 pt-28 pb-12 md:px-8 md:pt-32 md:pb-16">
        <nav aria-label="Trilha" className="flex items-center gap-1 text-xs text-muted-foreground">
          <Link to="/empreendimentos/cury" className="hover:text-foreground">
            Portfólio Cury
          </Link>
          <Icon name="chevron_right" size={14} />
          <span className="text-foreground">{e.nome}</span>
        </nav>

        <div ref={bloco.ref} {...bloco.props} className="reveal-blur mt-6 max-w-4xl">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="bg-card/70 backdrop-blur">
              Construtora Cury
            </Badge>
            {assinatura.selo === "recomendado" && (
              <Badge variant="gold">
                <Icon name="star" size={14} className="mr-1 align-[-2px]" />
                {MARCA} Recomenda
              </Badge>
            )}
            <Badge variant="outline" className="bg-card/70 backdrop-blur">
              {empStatusLabels[e.status]}
            </Badge>
            {ehMcmv(e) && (
              <Badge variant="outline" className="bg-card/70 backdrop-blur">
                MCMV
              </Badge>
            )}
          </div>

          <h1 className="mt-5 font-display text-4xl leading-[1.02] font-semibold tracking-tight sm:text-6xl lg:text-8xl">
            {e.nome}
          </h1>
          <p className="mt-4 flex items-center gap-1.5 text-base text-muted-foreground md:text-lg">
            <Icon name="location_on" size={20} />
            {local || "Localização confirmada no atendimento"}
          </p>

          {!temMidia && (
            <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-dashed border-border bg-card/70 px-4 py-2 text-xs text-muted-foreground backdrop-blur">
              <Icon name="photo_camera" size={14} />
              Vídeo e fotos oficiais entram aqui após liberação da construtora.
            </p>
          )}

          <dl className="mt-10 grid max-w-2xl grid-cols-2 gap-6 sm:grid-cols-4">
            <Dado rotulo="A partir de" valor={formatBRL(e.preco_min)} />
            <Dado
              rotulo="Tipologias"
              valor={e.dormitorios.length ? `${e.dormitorios.join(" e ")} dorm.` : "A confirmar"}
            />
            <Dado rotulo="Metragem" valor={e.area_min ? `${e.area_min.toFixed(0)} m²+` : "A confirmar"} />
            <Dado rotulo="Entrega" valor={anoEntrega(e.entrega_prevista)} />
          </dl>

          <div className="mt-10 flex flex-wrap gap-3">
            <a
              href={whatsappLink(`Olá! Quero agendar uma visita ao empreendimento ${e.nome}.`)}
              target="_blank"
              rel="noopener noreferrer"
              className="press inline-flex h-13 items-center gap-2 rounded-full bg-primary px-8 text-sm font-medium text-primary-foreground transition-all hover:-translate-y-1 hover:shadow-lg"
            >
              <Icon name="event" size={18} />
              Agendar Visita
            </a>
            <a
              href="#galeria"
              className="press inline-flex h-13 items-center gap-2 rounded-full border border-border bg-card/80 px-8 text-sm font-medium backdrop-blur transition-all hover:-translate-y-1 hover:bg-card"
            >
              <Icon name="photo_library" size={18} />
              Ver Galeria
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function Dado({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div>
      <dt className="t-caps text-muted-foreground">{rotulo}</dt>
      <dd className="mt-1.5 font-display text-lg font-semibold tracking-tight md:text-xl">{valor}</dd>
    </div>
  );
}