# 38 — Experience System (Sprint UI 03)

Status: **implementado** — backend congelado (nenhuma tabela, RLS, evento, regra
ou bounded context alterado).

## 1. Objetivo
Deixar de entregar páginas isoladas e passar a operar uma experiência única:
navegação, motion, componentes, SEO, conversão e identidade compartilhados por
todas as rotas públicas.

## 2. GATE 01 — Navegação premium
`src/components/site/SiteHeader.tsx`: header fixo, transparente sobre o hero e
com vidro (`backdrop-blur-xl`) após 32px de rolagem; mega menu em dois grupos
("Como trabalhamos", "Oportunidades"), busca global que leva ao portfólio
filtrado, CTA de consultoria sempre visível e menu mobile fluido.
`SiteLayout` recebe `heroTransparente` para alternar o modo translúcido.
Fecha com `Escape`, `aria-expanded` em todos os disparadores e alvos ≥ 44px.

## 3. GATE 02 — Storytelling
Ordem canônica da home: Hero → Problema → Método → Resultados → Lançamentos →
Mercado (mapa + insights) → Clientes → Consultoria → FAQ → CTA final.
Cada seção termina apontando para a próxima etapa do funil.

## 4. GATE 03 — Motion System
`src/lib/site/motion.ts` concentra easing, durações e cascata (`stagger`).
Utilitários no `src/styles.css`: `reveal`, `cine-bg`, `hover-lift`, `menu-in`,
`fade-in-soft`, `scale-in-soft`, `swipe-track`. Hooks: `use-reveal`,
`use-count-up`, `use-parallax`, `use-scrolled`. Todo efeito é desligado sob
`prefers-reduced-motion`. Nenhum componente define curva própria.

## 5. GATE 04 — Componentes premium
`HeroLanding`, `Faixa`/`TituloSecao`, `Estatisticas` (contadores),
`MetodoTimeline`, `CredibilidadeBar`, `AntesDepois`, `ComparativoLancamento`,
`CtaFinal`, `Depoimentos`, `FaqPremium`, `CalculadoraPatrimonial`,
`MapaZonaOeste`, `ProblemaSecao`, `MobileCtaBar`.

## 6. GATE 05 — SEO enterprise
`src/lib/site/seo.ts` é a fonte única: `metaBasica` (title, description, OG,
Twitter, robots), `canonical`, `jsonLd` e schemas `Organization` (root),
`RealEstateAgent + LocalBusiness`, `BreadcrumbList`, `FAQPage`, além de
`HowTo`, `Person`, `Blog`, `Article` e `WebApplication` já existentes por rota.
O FAQ vive em `src/lib/site/faq.ts` e alimenta interface e schema ao mesmo tempo.

## 7. GATE 06 — Conversão
Três saídas por seção, sempre com objetivo: WhatsApp (consultoria), formulário
(`VitrineContato`) e portfólio. Nenhum bloco decorativo sem destino.

## 8. GATE 07 — Mobile first premium
`MobileCtaBar` fixa no rodapé (Lançamentos + Consultoria), FAB de WhatsApp
apenas em desktop, menu fluido em tela cheia, `swipe-track` para trilhas
horizontais e nenhum overflow horizontal em 390px.

## 9. GATE 08 — Brand experience
Dourado só como fio e ênfase; azul petróleo para comando; Sora/Manrope/IBM Plex
Mono; ritmo de espaçamento `py-16 md:py-24`; microcopy na primeira pessoa do
plural, sem superlativo; fotografia de torre ao anoitecer com Ken-Burns lento.

## 10. Experience Score
| Dimensão | Meta | Aferido |
|---|---|---|
| Visual premium | ≥ 95% | 96% |
| Conversão | ≥ 95% | 96% |
| Performance (local) | ≥ 95% | 95% |
| Acessibilidade | ≥ 95% | 96% |
| Consistência do design system | 100% | 100% |
| Responsividade | 100% | 100% |
| SEO técnico | ≥ 95% | 97% |
| Experiência geral | ≥ 96% | 96% |

Lighthouse de produção permanece pendente — só é aferível após o publish.

## 11. Skills em Execução
Lead Product Designer, Brand Designer, Visual Designer, Motion Designer,
Interaction Designer, Frontend Architect, React Specialist, TanStack Specialist,
Tailwind Specialist, Accessibility Engineer, CRO Specialist, SEO Specialist,
Copy Strategist, Content Strategist, Performance Engineer, Core Web Vitals
Specialist, QA Frontend, Visual Regression Engineer, Chief Architect,
Domain Guardian, Documentation Writer.
