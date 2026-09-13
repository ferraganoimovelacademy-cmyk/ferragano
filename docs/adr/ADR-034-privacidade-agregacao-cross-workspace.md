# ADR-034 — Privacidade na agregação entre workspaces (Ferragano Intelligence)

Status: aceito
Contexto: Ferragano Intelligence precisa comparar o desempenho de um workspace com o mercado.
Isso exige agregar dados de vários workspaces — algo proibido pelo Manifesto sem framework de
privacidade aprovado.

## Decisão

Toda consulta agregada entre workspaces é **reprovada por padrão** e só é liberada quando os sete
critérios de aceite abaixo são atendidos simultaneamente. A validação é código, não checklist
humano: `validarAgregacaoCrossWorkspace` em `src/lib/platform/ecosystem.ts`.

## Critérios de aceite

| ID | Critério | Regra |
|----|----------|-------|
| P01 | k-anonimato de workspaces | mínimo de 5 workspaces distintos no resultado |
| P02 | Consentimento | todos os workspaces incluídos consentiram explicitamente |
| P03 | Granularidade | somente resultado agregado; linha individual nunca sai |
| P04 | Campos | nenhum campo identificável, incluindo `workspace_id` e qualquer `*_id` de entidade |
| P05 | Célula mínima | nenhuma célula publicada com menos de 5 registros |
| P06 | Supressão | célula abaixo do mínimo é suprimida, nunca exibida |
| P07 | Procedência | origem do dado declarada (ADR-023 / ADR-027) |

Reprovação em qualquer critério bloqueia a publicação e devolve o motivo com o ID.

## Teste de não-corte de dados

Supressão não pode virar perda silenciosa. `verificarNaoCorte` exige que
`total publicado + total suprimido = total de origem`. Diferença é falha de integridade, não
arredondamento. O relatório sempre informa quanto foi suprimido e por quê.

## Consequências

- Ferragano Intelligence permanece **bloqueada** até o gate H12 (LGPD) ser encerrado, mesmo com a
  validação implementada: privacidade técnica não substitui base legal.
- Benchmark com poucos participantes simplesmente não existe — lacuna é resposta.
- Compartilhar oportunidade na Network exige consentimento do cliente, e cai sob este ADR.

## Cobertura de testes

`src/lib/platform/__tests__/ecosystem.test.ts` — critérios individuais, campo identificável,
granularidade por linha, célula pequena, supressão desligada, procedência ausente e não-corte.
