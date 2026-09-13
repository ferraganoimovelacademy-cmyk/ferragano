# 25 — Automation Effectiveness (Sprint 18)

## Problema

O Automation Engine (Sprint 09) e o Watchdog do Advisor (Sprint 17) enfileiram
efeitos, mas até aqui a plataforma só media a **fila** (quantos pendentes,
quantos falharam). Não havia resposta para a pergunta que interessa à operação:
**cada regra está produzindo efeito?**

Uma regra ativa que nunca disparou é um problema de configuração, não de
infraestrutura — e ficava invisível.

## Solução

Medição por regra, derivada da fila (`outbox_events` × `automation_rules`),
sem nenhuma tabela nova.

### Banco

`public.automation_effectiveness(_workspace_id uuid, _dias int default 30)`
— `security definer`, valida `is_workspace_admin(auth.uid(), _workspace_id)`
dentro da própria consulta e devolve por regra:

| Campo | Significado |
| --- | --- |
| `total` | efeitos enfileirados na janela |
| `entregues` / `falhou` / `descartados` | desfecho final |
| `pendentes` | ainda em `pendente` ou `processando` |
| `tentativas_media` | esforço médio do worker |
| `latencia_media_segundos` | `processado_em - created_at` |
| `ultima_execucao` | último `processado_em` |
| `ultimo_erro` | erro mais recente da regra |

`EXECUTE` revogado de `public`/`anon`; concedido a `authenticated` e
`service_role`.

### Contratos puros (`src/lib/platform/automation.ts`)

- `taxaEntrega` — `entregues / (entregues + falhou + descartados)`.
  **Descarte conta como não entregue**: o efeito foi desejado e não aconteceu
  (ex.: canal sem provedor conectado). Pendentes ficam fora: não são desfecho.
  Sem desfecho, a taxa é `null` — nunca 0% presumido.
- `statusDaRegra` — `inativa` → `sem_dados` → `critico` (falha definitiva ou
  entrega < 80%) → `atencao` (entrega < 95% ou fila > 20) → `ok`.
- `resumoEfetividade` — agregado do cabeçalho, incluindo
  `regrasSilenciosas` (ativa e sem execução na janela).

### Leitura

`getAutomationEffectiveness` (`automation.functions.ts`) é a única porta:
`requireSupabaseAuth` + RPC. Sem acesso direto à fila pela API.

### UI

Aba **Automação** no Control Center (`/app/platform`), usando o mesmo seletor
de janela das outras abas (horas convertidas em dias). Tabela com `caption`
em `sr-only` e badge de situação por regra.

## Testes

`src/lib/platform/__tests__/automation-effectiveness.test.ts` — 9 casos
cobrindo taxa nula, precedência de `inativa`, regra silenciosa, falha
definitiva, atenção por descarte e por fila, e o agregado.

## Fora de escopo

- Alerta automático para regra silenciosa (candidato a Sprint 19, via
  `platform_alerts`).
- Atribuição de resultado de negócio ao efeito (fecha o loop com o Advisor).
