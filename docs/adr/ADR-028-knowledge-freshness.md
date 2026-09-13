# ADR-028 — Knowledge Freshness & Confidence

- Status: aceito
- Sprint: 26.1
- Contexto: Knowledge
- Módulo: `src/lib/platform/knowledge-quality.ts`

## Contexto

O Knowledge Graph (Sprint 26) responde de onde vem o conhecimento, mas não
respondia **quando** ele foi apurado nem **quanto** ele merece confiança.
Um nó com proveniência perfeita e 47 dias de idade era exibido igual a um nó
apurado há 1 hora. Isso permite decisão executiva sobre conhecimento vencido.

## Decisão

### 1. Todo nó de conhecimento tem idade explícita

`frescorNo` calcula a idade em horas a partir de `proveniencia.atualizadoEm` e
compara com o SLA do domínio do nó. Sem data, o resultado é `semaforo: "sem_dado"`
e `indice: null` — **nunca zero** (ADR-019: ausência não é valor).

### 2. Cada domínio tem orçamento próprio de frescor

| Domínio | SLA | Justificativa |
|---|---|---|
| Mercado | 24 h | indicadores externos diários (BCB) |
| Produto | 48 h | estoque e preço mudam por operação |
| Comportamento | 72 h | exige acumulação de interações |
| Decisão | 72 h | derivada, recalculada por evento |
| Resultado | 168 h | fechamento tem ciclo semanal |
| Relacionamento | 336 h | rede muda lentamente |
| Evidência | 720 h | série histórica só muda com novos períodos |

Semáforo: verde ≤ SLA, amarelo ≤ 2× SLA, vermelho acima.

### 3. Knowledge Confidence Score = 5 critérios ponderados

| Critério | Peso |
|---|---|
| Proveniência completa (fonte + camada + base) | 30 |
| Algoritmo e versão declarados | 20 |
| Rastro até fonte primária (`dominio`/`externo`) | 20 |
| Nó conectado ao grafo | 15 |
| Frescor dentro do SLA | 15 |

Nós derivados exigem algoritmo e rastro; nós de fonte primária ficam isentos
desses dois critérios (não se aplica ≠ reprovado). Quando nenhum critério é
avaliável, o score é `null`.

Os critérios não atendidos são **sempre expostos** (`naoAtendidos`), nunca
absorvidos silenciosamente no número.

### 4. Health Score ganha duas dimensões

`knowledgeHealthPlus` mantém o score original (integridade, proveniência,
cobertura, conectividade) e adiciona `scoreCompleto` = média de 6 dimensões,
incluindo frescor e confiança. Domínios em vermelho aparecem em
`dominiosVencidos` na interface.

## Consequências

- Conhecimento vencido é visível antes de virar decisão.
- Um score baixo é sempre explicável por critério, não opaco.
- O custo é a exigência de `atualizadoEm` fiel em toda proveniência.
