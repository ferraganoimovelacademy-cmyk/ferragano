# 41 — Sprint UI 07 · Luxury Experience

Status: **em execução** — Gates 01 e 05 entregues.
Backend: 🔒 congelado (nenhuma tabela, RLS, evento ou regra alterada).

## GATE 01 — Luxury Home (entregue)
`src/components/site/HeroLanding.tsx` passa a ser um palco em tela cheia
(`min-h-[100svh]`):
- 4 camadas de parallax já existentes (mídia com Ken-Burns, véu de contraste,
  halo dourado, poeira de luz) — **sem vídeo**: o material oficial não existe,
  então o movimento vem do Ken-Burns sobre a foto oficial.
- marca Ferragano + linha de autoridade acima da headline;
- retrato de Carlos Ferragano em cartão de vidro (`glass-pane` + `cine-frame`),
  com legenda de atendimento pessoal;
- três saídas de conversão na dobra: consultoria, coleção Cury e WhatsApp;
- indicador "role para explorar" ancorado no rodapé do palco;
- busca inteligente movida para a faixa de vidro imediatamente após a dobra,
  junto dos três indicadores de operação.

## GATE 05 — Luxury Motion (entregue)
- `src/components/site/ScrollProgress.tsx`: fio dourado de progresso de leitura,
  fixo no topo, `aria-hidden`, medido por `requestAnimationFrame`.
- `src/components/site/CarregandoElegante.tsx`: loader de rota com marca e anel
  dourado. Registrado no router como `defaultPendingComponent`
  (`defaultPendingMs: 300`, `defaultPendingMinMs: 400`) — só aparece quando a
  navegação realmente demora.
- Transição de página: `SiteLayout` remonta o `<main>` por `pathname` com o
  utilitário `page-enter`.
- Novos utilitários em `src/styles.css`: `page-enter`, `gold-orbit`,
  `gold-breath`. Todos desligados sob `prefers-reduced-motion`.

Glass, depth, blur, hover, reveal e press já vinham dos utilitários
`glass-pane`, `cine-frame`, `reveal-blur`, `hover-lift` e `press`.

## Validação
- `tsgo --noEmit` limpo.
- Playwright em 1280px e 390px: sem overflow horizontal, sem erro de console.

## Pendências da sprint
Gates 02 (Cury Collection), 03 (Storytelling), 04 (Ferragano Signature),
06 (Customer Journey), 07 (Trust Layer) e 08 (Lighthouse Platinum).
Vídeo real do hero depende do material oficial de gravação.

## Skills em Execução
Lead Product Designer, Frontend Architect, React/TanStack Specialist,
Mobile UX Specialist, Motion Designer, Real Estate Experience Designer,
CRO Specialist, Accessibility Engineer, Frontend QA, Documentation Writer.
