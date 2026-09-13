# 16 — Decision Engine

Status: **implementado (v1)** — Sprint 08.

## 1. Objetivo

Transformar People + Sales + Property em **decisão**. O corretor abre uma
pessoa e o sistema responde: o que ela pode comprar, quanto vale a
oportunidade e qual é a próxima ação. Nada é caixa-preta: toda saída carrega
o motivo.

Princípio novo desta sprint: **Write Model ≠ Read Model**. Escrita continua em
People, Sales e Property. O Decision Engine é leitura derivada — não cria
entidade de negócio.

## 2. Requisitos funcionais

- **Recommendation Engine** — lista ranqueada de unidades para a pessoa.
- **Opportunity Score** — score 0-100 calculado, nunca digitado.
- **Next Best Action** — até 3 ações sugeridas por oportunidade, priorizadas.
- **Unit Match** — índice de aderência por unidade.
- **Explainability** — motivo com peso em toda recomendação e todo score.
- **Rules Engine antes da IA** — regras duras bloqueiam antes de qualquer
  ranqueamento; a IA (sprints futuras) consulta o motor, nunca decide sozinha.

## 3. Requisitos não funcionais

- Cálculo determinístico e puro em `src/lib/platform/decision.ts` (client-safe,
  testável sem banco).
- Leitura sob RLS do usuário em `decision.functions.ts`. Nenhum service role.
- Nenhuma tabela de métrica: score e recomendação são derivados a cada leitura.

## 4. Modelo de dados

Uma única tabela nova, e ela é **entrada humana**, não resultado:

`person_qualifications` (1 por pessoa) — renda mensal, entrada disponível, uso
e valor de FGTS, perfil (`moradia`/`investimento`/`misto`), bairros desejados,
cidade/UF, dormitórios/vagas/área mínimos, teto de preço, prazo, banco
preferido, restrição de crédito, primeiro imóvel, observação.

Leituras: `people`, `opportunities`, `activities`, `visits`, `proposals`,
`files`, `unidades`, `empreendimentos`.

### Definições canônicas

- **Parcela máxima** = renda × 0,30.
- **Capacidade estimada** = entrada + FGTS + (parcela máxima × prazo, padrão 360).
- **Teto aplicado** = menor entre teto informado e capacidade estimada.
- **Elegível MCMV** = primeiro imóvel, sem restrição, renda ≤ R$ 8.000 e
  unidade ≤ R$ 350.000.
- **Aderência** = 40 de base + orçamento (30) + dormitórios/vagas (20) +
  localização (15) + perfil (15) + programa/campanha (10), limitado a 100.
- **Opportunity Score** = 20 de base + frequência de contato + recência +
  visitas + proposta + resposta + documentos + qualificação, limitado a 100;
  `perdido` teto 10, `fechado` = 100.

## 5. Regras duras (bloqueio, não penalidade)

1. Unidade fora do status `disponivel` nunca aparece.
2. Unidade sem preço nunca aparece.
3. Preço acima do teto aplicado é descartado.
4. Abaixo do mínimo de dormitórios, vagas ou área é descartado.

Toda unidade descartada aparece na tela com o motivo — o corretor vê o que o
sistema recusou e por quê.

## 6. Fluxos e interface

`/app/pessoas/$id` ganhou a aba **Decisão**: qualificação (com capacidade
calculada), próxima melhor ação por oportunidade com os fatores do score, e a
lista de unidades ranqueada com motivos, alertas e selo MCMV. O score
calculado só entra na oportunidade quando o corretor aplica.

## 7. Critérios de aceite

- [x] Nenhuma tabela de score/recomendação criada.
- [x] Toda recomendação exibe motivo com peso.
- [x] Unidade indisponível ou acima da capacidade nunca é recomendada.
- [x] Score derivado dos sinais, não digitado.
- [x] Pessoa sem qualificação mostra estado explicativo, não lista vazia.

## 8. Testes

1. Pessoa sem qualificação → aba Decisão pede qualificação e não recomenda.
2. Renda R$ 5.000 sem entrada → unidades acima da capacidade vão para descarte.
3. Marcar restrição de crédito → selo MCMV desaparece e alerta aparece.
4. Registrar visita realizada → score sobe e a ação passa a "Enviar proposta".
5. Pessoa do workspace A não enxerga unidade do workspace B.

## 9. Prompt Lovable

> Decision Engine é leitura derivada. Proibido: tabela de score/recomendação,
> cálculo no cliente, service role, recomendar unidade indisponível ou acima da
> capacidade, número sem explicação. Permitido: regra pura em `decision.ts` e
> agregação sob RLS em `decision.functions.ts`.

## 10. Roadmap

Sprint 09 (Automation Engine) liga o outbox: a Next Best Action vira tarefa
automática. Sprint 10 (Intelligence Hub) materializa Customer 360, Property 360
e Sales 360 sobre este mesmo motor. A IA entra depois, consultando as regras.
