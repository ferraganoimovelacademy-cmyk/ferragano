# ECOSSISTEMA FERRAGANO — O OBJETIVO

Documento de destino. Registra a visão completa e, para cada vertical, o que já
existe hoje na plataforma, o que falta e qual é a natureza do negócio. Serve
para uma decisão só: impedir que a plataforma seja construída em direção
errada.

**Regra de leitura:** este documento não autoriza implementação. A Fase III
(`./README.md`) e a Sprint ZERO (`./sprint-zero-hardening.md`) continuam sendo
o caminho. Aqui está o *para onde*, não o *agora*.

---

## Visão

Ferragano One é o **produto**. O Ecossistema Ferragano é a **empresa**.

```text
                        ┌─────────────────────────┐
                        │      FERRAGANO ONE      │
                        │  (o sistema operacional)│
                        └────────────┬────────────┘
                                     │
   ┌──────────┬──────────┬───────────┼───────────┬──────────┬──────────┐
   ▼          ▼          ▼           ▼           ▼          ▼          ▼
 Academy  Intelligence Analytics    AI        Network    Capital   Ventures
                                                                      │
                                                                    Labs
```

Três camadas de natureza distinta — e é essa distinção que precisa ser
preservada:

| Camada | Verticais | Natureza |
| --- | --- | --- |
| **Produto** | Intelligence, Analytics, AI, Academy | software; nascem dentro do One |
| **Rede** | Network, Capital | plataforma de terceiros; exigem contrato, compliance e liquidez |
| **Empresa** | Ventures, Labs | investimento e pesquisa; não são software |

Confundir camadas é o erro fatal aqui: tratar Capital como "mais um módulo"
coloca risco regulatório dentro do CRM; tratar Academy como empresa separada
desperdiça a telemetria de adoção que já existe.

---

## As oito verticais

### 🎓 Ferragano Academy — capacitação
**Já existe:** `academy.ts`, `academy.functions.ts`, `academy_progress`, rotas
`/academy` e `/app/academy`, trilhas por papel e progresso registrado.
**Falta:** certificação, conteúdo por parceiro, trilha comercial pública.
**Papel no ecossistema:** porta de entrada. É o que faz o cliente conseguir
operar sozinho — pré-requisito do Programa 01, não vertical independente ainda.

### 🧠 Ferragano Intelligence — inteligência de mercado
**Já existe:** contexto `Market` completo (indicadores BCB, regiões,
snapshots), `market-context.ts`, `market-analytics.ts` (correlação),
`evidence.ts` (evidência causal e drift).
**Falta:** dado de mercado agregado entre workspaces — e isso exige decisão
explícita de privacidade antes de qualquer linha de código.
**Regra herdada:** R05 e R06 do Manifesto. Dado externo não se mistura ao
interno; correlação não vira causa. Um produto de inteligência de mercado que
viole isso é opinião vendida como dado.

### 📊 Ferragano Analytics — analítico como produto
**Já existe:** read models `*_360`, Query Layer (`insights.functions.ts`),
`platform_metrics`, telemetria, Health Score, Control Center.
**Falta:** self-service (o usuário montar a própria pergunta) e exportação
governada.
**Distinção necessária:** Analytics responde *o que aconteceu*; Intelligence
responde *o que o mercado está fazendo*; AI responde *o que fazer*. Sem essa
separação, as três viram o mesmo dashboard com três nomes.

### 🤖 Ferragano AI — ecossistema de agentes
**Já existe:** Advisor/Advisory, Recommendation Engine, Predictive, Knowledge
Layer, Enterprise Memory — ou seja, **a base de conhecimento já está pronta**.
**Falta:** as personas (Comercial, Marketing, Financeiro, Produto, RH, BI,
Compliance, Growth) e o roteamento multi-provedor.
**Regra:** todo agente é persona de leitura sobre o mesmo Knowledge Layer.
Nenhum agente acessa tabela transacional; nenhum agente afirma o que a
evidência não sustenta (R06, R07, R09). É isso que separa um ecossistema de
agentes de oito chatbots com prompts diferentes.

### 🌐 Ferragano Network — ecossistema de parceiros
**Já existe:** `developers`, `workspaces`, RBAC por módulo, `landing_pages`.
**Falta:** cadastro de parceiro, catálogo, roteamento de demanda, reputação,
contrato e repasse.
**Pré-requisito duro:** API Platform (Programa 05). Rede sem API é planilha.

### 💰 Ferragano Capital — crédito e financiamento
**Já existe:** `person_qualifications` (perfil de compra, teto de preço,
restrição de crédito), `proposals`, `sales`.
**Falta:** integração com correspondentes, simulação, esteira de crédito.
**Alerta que eu faço agora:** esta é a única vertical com risco regulatório
(LGPD sobre dado financeiro, e possivelmente regra de correspondente bancário).
Ela **não** pode entrar antes do gate H12 da Sprint ZERO estar fechado. Não é
questão técnica.

### 🚀 Ferragano Ventures — investimento
**Não é software.** Nada a construir na plataforma além de, eventualmente,
consumir Intelligence e Analytics para tese de investimento.
**Risco a evitar:** puxar requisito de Ventures para dentro do One. O One não
é sistema de gestão de portfólio.

### 🔬 Ferragano Labs — pesquisa
**Já existe na prática:** `feature-flags.ts` e a disciplina de ADRs são
exatamente o mecanismo de laboratório — experimentar sem contaminar produção.
**Falta:** formalizar o ciclo experimento → medição → ADR → adoção ou descarte.
**Papel:** Labs é onde ideia nova mora **antes** de virar programa. É o
antídoto contra o que quase aconteceu: criar feature direto no produto.

---

## Ordem que eu defenderia

Não é a ordem da lista. É a ordem da dependência:

```text
Sprint ZERO  →  Academy + Production Readiness  →  API Platform
                                                       ▼
                              AI (agentes)  →  Analytics self-service
                                                       ▼
                                 Network  →  Intelligence agregada
                                                       ▼
                                      Capital (após LGPD)
                                                       ▼
                                    Ventures / Labs (empresa)
```

Racional: nada vira ecossistema sem API; nada vira negócio sem cliente
operando; e Capital nunca antes de LGPD.

---

## O que este documento proíbe

1. Criar vertical nova como pasta em `src/` antes de existir cliente pagando
   pela anterior.
2. Fundir Analytics, Intelligence e AI na mesma tela.
3. Colocar Capital em produção sem base legal e retenção definidas.
4. Tratar Ventures e Labs como software.
5. Abrir qualquer vertical com a Sprint ZERO em aberto.

Se o ecossistema for construído nessa ordem, cada vertical nasce em cima de
uma plataforma que já aguenta produção. Fora dessa ordem, o ecossistema vira
oito produtos meio prontos.

## Atualização — hub, personas e privacidade

- Hub único: `/app/ecossistema` (status, dependências e próximos passos por camada).
- Camada pura: `src/lib/platform/ecosystem.ts`.
- Privacidade de agregação entre workspaces: [ADR-034](../adr/ADR-034-privacidade-agregacao-cross-workspace.md).
- Modelos Network e Capital: [network-capital-modelos.md](./network-capital-modelos.md).
- Personas da Ferragano AI: Curador de Conhecimento, Conselheiro Executivo, Estrategista de
  Recomendação e Guardião da Memória — cada uma com tela, entrada, saída e limites.
- Onboarding por vertical: perguntas com evidência exigida; pergunta sem evidência não conta.
