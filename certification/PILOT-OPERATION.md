# 🚀 FASE 1 — Pilot Operation

**Status:** 🟢 READY FOR PILOT
**Versão congelada:** Ferragano One 1.1 RC1 (nenhuma mudança de schema, evento
ou ADR entra durante o piloto sem novo RC).

## Gates

| Gate | Escopo | Status |
| --- | --- | --- |
| P01 Pilot Workspace | workspace exclusivo, funil e permissões semeados | 🟡 operação · verificação em `/app/piloto` |
| P02 Usuários | 1 proprietário, 2–3 gerentes, 10 corretores, 1 assistente, 1 administrativo | 🟡 operação · verificação em `/app/piloto` |
| P03 Empreendimentos | só empreendimento real: construtora, torres, unidades, preços, materiais, FAQ, scripts | 🟡 operação · verificação em `/app/piloto` |
| P04 Migração | Import Wizard de pessoas, oportunidades, visitas e reservas (CSV) com mapeamento, validação e dedupe | ✅ pessoas / oportunidades / visitas / reservas |
| P05 Onboarding | Academy: primeiro acesso → trilha → checklist → certificado | ✅ |
| P06 Telemetria | `platform_telemetry` + `platform_metrics` + `/app/platform` | ✅ |
| P07 Feedback | botão permanente + `pilot_feedback` + triagem | ✅ |
| P08 Success Metrics | metas objetivas abaixo | ✅ definido |
| P09 Feature Flags | `module_flags` por workspace | ✅ |
| P10 Go/No-Go | revisão no dia 30 em `/app/gonogo`, veredito derivado da medição | ✅ |

## GATE P07 — Canal de feedback

## GATES P01–P03 — Verificação de prontidão

- Rota `/app/piloto` (admin): checklist derivado do workspace real, agrupado por gate.
- Camada pura `src/lib/platform/pilot.ts`: exigências do P01 (funil com etapas e
  padrão, ≥ 15 membros ativos), do P02 (1 proprietário, 2 gerentes, 10 corretores,
  1 assistente, 1 administrativo + onboarding concluído) e do P03 (empreendimento
  cadastrado, todo o estoque com preço, migração pelo Import Wizard), mais o estado
  esperado das flags do P09. `resumirProntidao` só libera com zero bloqueante aberto.
  10 testes unitários.
- Leitura `src/lib/platform/pilot.functions.ts`: valida `is_workspace_admin` e conta
  `pipelines`, `pipeline_stages`, `workspace_members`, `user_roles`, `empreendimentos`,
  `unidades`, `module_flags`, `academy_progress` e as importações auditadas em
  `audit_log` — tudo sob RLS, sem service role e sem número digitado à mão.

- Tabela `pilot_feedback`: tipo (bug, sugestão, dificuldade, ideia, elogio),
  mensagem, severidade, status de triagem, rota de origem e user agent.
- Leitura: o autor vê o próprio feedback; administrador do workspace vê todos.
- Escrita: apenas membro ativo, sempre no próprio nome (RLS).
- Triagem (`status`, `severidade`, `resposta`): apenas administrador.
- Query Layer: `src/lib/platform/feedback.functions.ts` (instrumentado).
- Superfície: `FeedbackButton` no shell, presente em toda tela de `/app`.
- Triagem: rota `/app/feedback` (admin), fila filtrável por status, ajuste de
  severidade, mudança de status e resposta ao autor (`resposta`,
  `respondido_por`, `respondido_em`). Sem acesso, a tela devolve "acesso restrito".

## GATE P04 — Import Wizard (pessoas, oportunidades, visitas e reservas)

- Rota `/app/importar` (admin), 4 passos: arquivo → mapeamento → validação → resultado,
  com seletor de entidade (pessoas, oportunidades, visitas ou reservas) no primeiro passo.
- Camada pura `src/lib/platform/import.ts`: parser de CSV (aspas, escape, `,`/`;`, BOM),
  mapeamento automático por sinônimo de cabeçalho, normalização de tipo/origem e
  validação de documento, e-mail e telefone. Para oportunidades: leitura de valor
  em formato brasileiro ou americano, normalização de etapa/temperatura/origem e
  fallback explícito (Novo/Morno) registrado como aviso. 24 testes unitários.
- Gravação `src/lib/platform/import.functions.ts` (instrumentado, sob RLS):
  escreve no modelo canônico `people` + `person_contacts` + `activities`,
  deduplica por documento e e-mail já existentes no workspace e audita
  `people.imported` com o resumo do lote. `importOpportunities` grava em
  `opportunities` + `activities`, resolvendo a pessoa por documento > e-mail > nome
  exato (`src/lib/platform/import.server.ts`); nome ambíguo ou pessoa inexistente
  vira falha da linha — o wizard nunca cria identidade nova aqui. Audita
  `opportunities.imported`.
- Limites: 2.000 linhas por importação, lotes de 200 por chamada, arquivo ≤ 5 MB.
- Nada de service role: a importação respeita o isolamento de workspace.
- `importVisits` grava em `visits` + `activities`: data em formato brasileiro ou ISO,
  situação normalizada (compareceu/faltou), nota 0–10 e empreendimento resolvido pelo
  nome exato no workspace (nome ambíguo ou inexistente vira falha da linha).
  Audita `visits.imported`.
- `importReservations` grava em `reservations` + `activities`: exige pessoa e unidade do
  workspace (unidade resolvida pelo identificador dentro do empreendimento informado; sem
  empreendimento, identificador repetido vira falha da linha) e usa a oportunidade aberta
  mais recente da pessoa, porque `reservations.opportunity_id` é obrigatório. Reserva ativa
  marca a unidade como `reservada`; unidade já reservada entra como duplicada e unidade
  vendida como falha. Validade aceita formato brasileiro ou ISO. Audita
  `reservations.imported`. 5 testes unitários adicionais (29 no total do módulo).
- Gate P04 fechado: as quatro entidades da migração estão cobertas.

## GATE P05 — Onboarding Academy

- Rota `/app/academy` (todo membro do workspace), item de sidebar sob a flag `academy`.
- Camada pura `src/lib/platform/academy.ts`: trilha oficial com 4 módulos e 13 lições
  (primeiro acesso, pessoas, rotina comercial, decisão assistida), duração estimada,
  link de prática por lição, cálculo de progresso por módulo, próxima lição e regra do
  certificado (todas as lições obrigatórias). 12 testes unitários.
- Persistência `academy_progress` (uma linha por lição concluída) sob RLS: cada usuário
  só lê e escreve o próprio progresso; administradores do workspace leem o progresso da
  equipe para acompanhar a adoção. Nada de service role.
- Server functions instrumentadas em `src/lib/platform/academy.functions.ts`:
  `listarProgressoAcademy`, `marcarLicaoAcademy` (aceita apenas chaves da trilha oficial,
  desmarcar remove a linha) e `listarProgressoEquipe`.
- Certificado é derivado, não armazenado: nome, lições, minutos e código estável por
  usuário — não há estado duplicado para sair de sincronia com a trilha.

## GATE P08 — Metas do piloto (30 dias)


| Dimensão | Indicador | Meta |
| --- | --- | --- |
| Operação | usuários ativos por semana | ≥ 90% |
| Operação | oportunidades atualizadas | ≥ 80% |
| Operação | erros críticos | ≤ 5% |
| Comercial | tempo médio de resposta | reduzir |
| Comercial | conversão entre etapas | aumentar |
| Comercial | oportunidades esquecidas | reduzir |
| Produto | adoção da busca global | medida |
| Produto | uso do Decision Center | medido |
| Produto | uso das automações | medido |

Fonte de cada número: `platform_telemetry` e `platform_metrics` via
`/app/platform`. Nenhuma meta é declarada atingida sem medição.

## GATE P09 — Flags do piloto

| Módulo | Piloto |
| --- | --- |
| CRM / Decision Center | ON |
| Ferragano Advisor | OFF |
| Recommendation Engine | OFF |
| Portal do Cliente | OFF |

## Bloqueadores do ambiente definitivo

1. Ensaio completo de restauração (backup → restore → integridade) com tempo
   real comparado ao RPO/RTO de `certification/DISASTER-RECOVERY.md`.
2. E2E autenticado A→B com usuários reais (`E2E_A_*`, `E2E_B_*`) em ambiente
   publicado.
3. RC1 publicado e versão congelada durante o piloto.

## GATE P10 — Go/No-Go

Avaliar estabilidade, adoção, desempenho, satisfação e impacto comercial.
**GO** → versão 1.1. **HOLD** → correções e novo piloto. Dono: Pilot Manager
(#21), com veto do Release Manager (#20).

- Rota `/app/gonogo` (admin): 12 critérios das quatro dimensões (operação,
  comercial, produto, satisfação), cada um com meta declarada, valor medido e
  situação (atingida / perto / abaixo / sem medição).
- Camada pura `src/lib/platform/gonogo.ts`: metas do GATE P08 viram critérios
  determinísticos e `resumirGoNogo` deriva o veredito — sem cobertura de 80%
  dos critérios o resultado é MEDIÇÃO INSUFICIENTE, bloqueante em falha ou sem
  medição força HOLD, e GO só sai com zero critério abaixo da meta.
  9 testes unitários.
- Agregador `src/lib/platform/gonogo.functions.ts`: valida
  `is_workspace_admin` e lê apenas `platform_metrics_summary`,
  `feature_adoption`, `decision_accuracy`, `opportunities`, `pilot_feedback`,
  `academy_progress` e `workspace_members` sob RLS. Nada de service role.
- Critérios bloqueantes: usuários ativos na semana, oportunidades atualizadas,
  taxa de erro e feedback crítico em aberto.