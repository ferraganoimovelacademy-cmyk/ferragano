# ADR-035 — Controle de acesso por persona (limites duros)

Status: aceito · Contexto: Ferragano AI / Ecossistema

## Decisão

O escopo de uma persona da Ferragano AI é um limite duro do produto, não uma
preferência de interface. O hub das oito verticais (`/app/ecossistema`) aplica
esse escopo com três regras, avaliadas nesta ordem em
`src/lib/platform/ecosystem.ts`:

1. **Nega por padrão.** Ação que não está no mapa da persona é recusada com o
   motivo "fora do limite duro de <persona>". Não existe permissão implícita.
2. **Papel.** Ação marcada `requerAdmin` exige papel administrativo.
3. **Governança da vertical.** A tela herda o bloqueio da vertical que a
   expõe. Quando a tela pertence a mais de uma vertical, só é bloqueada se
   **todas** estiverem bloqueadas — bloqueio de uma vertical não derruba tela
   compartilhada com vertical liberada.

## Consequências

- Toda decisão de acesso carrega motivo explícito, permitida ou negada.
- As verticais visíveis são derivadas das telas liberadas
  (`verticaisDaPersona`), nunca de uma lista paralela.
- Telas de governança (privacidade, contratos, compliance, liquidez) não
  pertencem a nenhuma persona: só operam sem persona ativa.
- Ampliar o alcance de uma persona exige editar o mapa `personas` e o teste
  correspondente — não há atalho pela UI.

## Referências

- `src/lib/platform/ecosystem.ts` — `podeOperar`, `avaliarAcessoPersona`, `verticaisDaPersona`
- `src/lib/platform/__tests__/ecosystem.test.ts` — bloco "controle de acesso por persona"
- ADR-034 — privacidade na agregação entre workspaces