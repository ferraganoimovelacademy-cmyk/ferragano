# ADR-031 — Enterprise Knowledge Memory

- **Status:** aceito
- **Sprint:** 28 — Enterprise Memory
- **Contexto novo:** `Enterprise Memory` (independente)
- **Skill responsável:** #36 🧠 Enterprise Memory Architect

## Contexto

As Sprints 1–27 construíram um Sistema Operacional de Inteligência Comercial:
dados de domínio → Knowledge Orchestrator → Intelligence Fabric → Advisor. Toda
essa cadeia é volátil em termos organizacionais: sabe o estado atual e sabe
explicar o cálculo, mas não preserva por que a empresa decidiu o que decidiu,
quem aprovou, o que se esperava e o que de fato aconteceu.

Memória de IA (contexto de prompt) não é memória corporativa. Contexto se perde;
patrimônio intelectual não pode se perder.

## Decisão

Criar o bounded context **Enterprise Memory**, independente do Advisor e do CRM.
Ele apenas recebe registros e devolve memória auditável:

```text
Domínios -> Knowledge Orchestrator -> Intelligence Fabric -> Advisor -> Enterprise Memory -> Executive OS
```

A Enterprise Memory alimenta o Advisor de volta (reuso de conhecimento), mas não
depende dele para existir: nenhuma tabela `memory_*` referencia `advisor_*`,
`recommendation_*` ou tabelas transacionais do CRM.

### Registros

| Tabela | Guarda |
| --- | --- |
| `memory_decisions` | decisões, reuniões, estratégias e mudanças de pipeline com ciclo de vida completo |
| `memory_campaigns` | histórico de campanhas: por que nasceu, por que mudou, por que terminou |
| `memory_lessons` | lições aprendidas com evidência obrigatória |
| `memory_playbooks` | playbooks gerados do próprio histórico, versionados por tema |

### Ciclo de vida da decisão

```text
registrada -> aprovada -> executada -> avaliada -> revisada
```

Sem pulo de etapa. Aprovação exige `aprovado_por`. Avaliação exige resultado
observado. Ambos validados por trigger no banco, não apenas na aplicação.

## Princípios (invioláveis)

1. **Nenhuma decisão sem contexto.** `contexto` e `motivo` são obrigatórios; a
   trigger `memory_decisions_validate` rejeita registro vazio.
2. **Nenhuma lição sem evidência.** `memory_lessons_validate` rejeita lição com
   `evidencias` vazio ou sem vínculo a decisão/campanha.
3. **Nenhuma estratégia sem histórico.** Playbook exige mínimo de 5 casos
   comparáveis do próprio workspace; abaixo disso o sistema devolve o motivo da
   recusa, não um playbook fraco.
4. **Nenhuma recomendação sem proveniência.** Toda resposta de reuso declara
   base utilizada, quantidade de casos, período e limitações da comparação.
5. **Nenhuma memória sem responsável.** Responsável e quem aprovou são campos de
   primeira classe.
6. **Retenção e versionamento por política.** Playbooks são versionados por
   `(workspace, tema, versao)`; nada é sobrescrito.
7. **Exclusão é ato de governança.** Apagar memória exige papel de
   proprietário/administrador e é auditável.

## Consequências

- **Decision DNA é descritivo, nunca prescritivo.** O sistema informa "hipótese
  registrada aparece em 4 de 6 casos e a avaliação média foi 3 pontos maior";
  jamais "registre hipótese para ter sucesso". Correlação ≠ causação continua
  valendo (ADR-026).
- **Amostra pequena é exibida, não escondida.** Menos de 3 casos comparáveis vira
  limitação declarada na própria resposta.
- **O que não foi registrado não é estimado.** ROI sem investimento, conversão sem
  leads e tempo de decisão sem data de aprovação voltam como lacuna, não como
  zero disfarçado.
- **Reuso genérico:** a combinação Knowledge + Fabric + Enterprise Memory é
  agnóstica de setor. Trocando os domínios de negócio, a infraestrutura de
  inteligência, rastreabilidade e memória permanece.

## Alternativas rejeitadas

- **Guardar memória dentro do Advisor.** Rejeitada: misturaria coordenação de
  processamento com preservação de conhecimento — bounded contexts distintos.
- **Derivar lições por LLM sobre texto livre.** Rejeitada: lição sem evidência
  rastreável viola o princípio 2 e a auditabilidade construída desde a
  Sprint 25.3.
- **Guardar apenas métricas de campanha.** Rejeitada: métrica sem narrativa não
  explica por que a campanha nasceu, mudou ou terminou.