# 37 — Site Institucional Premium (Sprint UI 02)

Status: **implementado** — backend congelado (nenhuma tabela, RLS, regra, evento ou
bounded context alterado nesta sprint).

## 1. Objetivo
Transformar o site em máquina de autoridade e conversão alinhada ao posicionamento
"especialista em lançamentos e construção de patrimônio".

## 2. Páginas e responsabilidade
| Rota | Papel |
|---|---|
| `/` | Vender confiança: hero patrimonial, credibilidade, método, comparativo, jornada, portfólio, mapa, insights, depoimentos, captação |
| `/metodo` | Sete etapas do Método Ferragano + comparativo + ciclo patrimonial |
| `/sobre` | Autoridade de Carlos Ferragano (especialista, empresário, mentor, patrimônio) |
| `/blog` e `/blog/$slug` | Conteúdo por categoria (Mercado, Investimento, Lançamentos, Financiamento, Patrimônio) |
| `/simulacao` | Calculadora patrimonial (projeção 100% client-side) |
| `/contato` | Agendamento de consultoria + captação |

## 3. Componentes (src/components/site)
`Bloco`/`Faixa`/`TituloSecao`, `CredibilidadeBar`, `MetodoTimeline`,
`ComparativoLancamento`, `JornadaPatrimonial`, `MapaZonaOeste`,
`FerraganoInsights`, `LinhaDoTempoMercado`, `CalculadoraPatrimonial`,
`CtaFinal`, `Depoimentos`, `HeroLanding`, `WhatsAppFab`.

## 4. Restrições de evidência
- `FerraganoInsights` e `LinhaDoTempoMercado` só exibem leitura pública de mercado,
  com natureza declarada (observação, tendência, contexto) e fonte visível — ADR-023/024.
- A calculadora é determinística, roda no navegador, não persiste nada e declara
  todas as premissas na própria tela — coerente com ADR-021 (previsão explicável).

## 5. SEO técnico
Title, description, OG, Twitter card, canonical e JSON-LD por rota
(`RealEstateAgent`, `HowTo`, `Person`, `Blog`, `Article`, `WebApplication`,
`ContactPage`). Sitemap inclui as rotas institucionais e cada artigo do blog.

## 6. Critérios de aceite
- [x] Zero erro de console nas sete rotas públicas
- [x] Responsivo sem overflow horizontal em 375px
- [x] Tokens semânticos apenas; nenhuma cor literal
- [x] CTAs apontando para consultoria (WhatsApp / `/contato`) e portfólio
- [x] 826 testes verdes, typecheck limpo
- [ ] Lighthouse ≥ 95 medido no ambiente publicado (rodar após publish)

## 7. Skills em Execução
Lead Product Designer, Brand Designer, Visual Designer, Motion Designer,
Interaction Designer, Frontend Architect, React Specialist, TanStack Specialist,
Tailwind Specialist, Accessibility Engineer, Performance Engineer, CRO Specialist,
Copy Strategist, Visual Storytelling Specialist, Mobile UX Specialist, QA Frontend,
Security Officer, Documentation Writer.
