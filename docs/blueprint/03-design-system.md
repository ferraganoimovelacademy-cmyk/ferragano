# 03 — Design System

Status: **v1 implementado** — `src/styles.css` (fonte única) e vitrine em `/design-system`.

## 1. Objetivo
Uma única fonte de verdade visual para toda a plataforma. Nenhum valor de cor,
sombra, raio ou tipografia vive fora de `src/styles.css`; componentes consomem
apenas tokens semânticos.

## 2. Requisitos funcionais
- Tema claro e escuro nativos, alternáveis (`ThemeToggle`) e sem flash no carregamento.
- Escala tipográfica fechada (display, títulos, corpo, mono/numérico).
- Variantes de componente cobrindo os estados do produto: neutro, comando, destaque, sucesso, alerta, erro.
- Vitrine navegável em `/design-system` para validação visual antes de qualquer tela nova.

## 3. Requisitos não funcionais
- Tailwind v4 via `@theme` — sem `tailwind.config.js`.
- Cores em `oklch` para manter contraste perceptual entre os dois temas.
- Proibido `text-white`, `bg-black` ou `bg-[#...]` em componentes.
- Contraste mínimo AA para texto e elementos interativos.

## 4. Modelo de dados (tokens)

| Grupo | Tokens | Uso |
|---|---|---|
| Base | `background`, `foreground` | fundo e texto da página |
| Superfícies | `surface-lowest` → `surface-highest` | 5 níveis de elevação de fundo |
| Comando | `primary`, `primary-hover`, `primary-soft` | azul petróleo: ação principal |
| Estrutura | `secondary`, `muted`, `accent`, `border`, `border-strong` | grafite: apoio e linhas |
| Destaque | `gold`, `gold-container`, `gold-dim` | dourado: só ênfase pontual, nunca área grande |
| Estados | `destructive`, `success`, `warning`, `info` | feedback |
| Dados | `chart-1..5` | gráficos |
| Shell | `sidebar*` | navegação da área logada |
| Elevação | `elevation-1..4` | sombras discretas |

Tipografia: **Sora** (display/títulos), **Manrope** (corpo), **IBM Plex Mono**
(números e códigos, com `tabular-nums`). Escala: 40 / 30 / 22 / 17 (títulos),
17 / 15 / 13 (corpo), 13 / 10.5 (mono e etiquetas).

Raios: `xs 4px`, `sm 6px`, `md 8px` (padrão), `lg 12px`, `xl 16px`, `2xl 20px`.

## 5. Fluxos
Nova necessidade visual → existe token? usa. Não existe → cria o token em
`styles.css`, publica na vitrine e só então usa no componente. Componente novo
que repete estilo de outro é sinal de variante faltando, não de CSS novo.

## 6. Wireframes
`/design-system`: paleta (claro/escuro), tipografia, botões, badges,
formulários, tabelas, cards e estados vazios/erro/carregando.

## 7. Critérios de aceite
- [x] Tokens claro e escuro completos
- [x] Vitrine `/design-system` cobrindo os componentes base
- [x] `ThemeToggle` sem flash de tema
- [ ] Auditoria automática impedindo cor literal em `src/components`
- [ ] Tokens de espaçamento e grid formalizados

## 8. Testes
Verificação visual da vitrine nos dois temas a cada mudança de token.
Pendente: teste de contraste automatizado nos pares texto/fundo.

## 9. Prompt Lovable
"Use apenas tokens semânticos de `src/styles.css`. Se faltar um token, crie-o lá
e mostre em `/design-system` antes de usar na tela."

## 10. Roadmap
Tokens de densidade (compacto para tabelas operacionais), tema de alto contraste,
export dos tokens para uso em e-mails transacionais e materiais de marketing.
