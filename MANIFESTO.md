# FERRAGANO ONE — MANIFESTO

> Ferragano One — Sistema Operacional de Inteligência para Negócios Imobiliários.

Este documento é o coração do projeto. Ele explica a filosofia, os princípios,
a arquitetura e as regras imutáveis. Quando um documento técnico divergir do
Manifesto, o Manifesto vence. Quando uma feature exigir violar uma regra
imutável, a feature é recusada.

Versão 1.0 — encerramento da Fase II (Sprints 01–30), abertura da Fase III.

---

## 1. O que estamos construindo

Não é um CRM para corretores. Não é um ERP imobiliário.

É um sistema operacional: uma plataforma que integra **operação**,
**conhecimento**, **memória organizacional** e **inteligência executiva** em uma
arquitetura única, onde cada decisão tomada pela empresa vira patrimônio
intelectual reutilizável.

Um CRM registra o que aconteceu. Um ERP controla o que foi transacionado.
O Ferragano One responde três perguntas que nenhum dos dois responde:
**o que está acontecendo agora**, **por que sabemos disso** e
**o que fazer a respeito**.

---

## 2. Filosofia

**2.1 Evidência acima de opinião.** Todo número exibido tem origem
rastreável, janela declarada e amostra conhecida. Um painel bonito sem
proveniência é dívida, não valor.

**2.2 Lacuna é resposta.** Quando não há dado suficiente, o sistema diz
"não sei" e explica o que falta. Nunca estima para preencher tela.

**2.3 Determinismo primeiro, IA depois.** Regra explícita antes de modelo.
A IA comunica, prioriza e narra — ela não decide sozinha o que é verdade.

**2.4 Explicabilidade não é feature, é requisito.** Se uma recomendação não
pode ser aberta até a evidência de origem, ela não deve existir.

**2.5 O sistema aprende sobre si mesmo.** Tudo que importa é medido:
execução, adoção, acurácia, custo, frescor do conhecimento.

**2.6 Conhecimento não se sobrescreve.** Ele evolui em versões, com
justificativa e responsável.

**2.7 Escopo é disciplina.** Um pedido, uma mudança. Refatoração não
solicitada é risco disfarçado de zelo.

---

## 3. Regras imutáveis

Estas onze regras não são negociáveis. Alterar qualquer uma exige nova ADR
que revogue explicitamente a anterior.

| # | Regra | Origem |
| --- | --- | --- |
| R01 | Toda tabela pública tem RLS habilitada, `GRANT` explícito e isolamento por `workspace_id`. | ADR-005 |
| R02 | Papéis vivem em `user_roles`, nunca em `profiles`. Verificação sempre server-side. | ADR-005 |
| R03 | Nenhuma tela consulta tabela transacional: leitura passa pela Query Layer / read models. | ADR-004 |
| R04 | Efeito colateral externo passa pelo Outbox, com idempotência e retentativa. | ADR-003 |
| R05 | Dado externo nunca se mistura ao dado interno; a fonte acompanha o dado. | ADR-023 |
| R06 | Correlação nunca é apresentada como causa. | ADR-026 |
| R07 | Toda previsão carrega base, janela, amostra e limitação. | ADR-021 |
| R08 | Comportamento é medido, nunca inferido de estereótipo. | ADR-022 |
| R09 | Todo conhecimento tem proveniência; sem proveniência ele não entra no grafo. | ADR-027 |
| R10 | Decisão sem contexto e sem raciocínio é rejeitada no banco; lição sem evidência também. | ADR-031 |
| R11 | Observação, tendência e simulação são naturezas distintas e sempre rotuladas. | ADR-033 |

---

## 4. Arquitetura em uma página

```text
Write Model  →  Domain Events  →  Outbox  →  Read Models
                                               ▼
                        Decision Engine → Recommendation Engine
                                               ▼
        Knowledge Layer → Orchestrator → Intelligence Fabric
                                               ▼
              Advisor / Advisory  →  Enterprise Memory
                                               ▼
                     Organizational Intelligence
                                               ▼
                 Executive OS (Executive Digital Twin)
```

Cada camada acrescenta capacidade sem assumir a responsabilidade da anterior.
Padrão estrutural de todo contexto: módulo puro calcula, `*.server.ts` agrega,
`*.functions.ts` é a porta única, a rota apenas apresenta.

Detalhamento em `docs/REFERENCIA-PLATAFORMA.md` e `docs/blueprint/`.

---

## 5. Por que cada decisão foi tomada

- **Read models separados do write model (ADR-004):** painéis executivos e
  operação transacional têm requisitos de latência e consistência opostos.
- **Outbox em vez de chamada direta (ADR-003):** integração externa falha;
  o negócio não pode falhar junto.
- **Rule engine antes de IA (ADR-007):** regra explícita é auditável, barata
  e reproduzível; modelo é nenhuma das três.
- **Proveniência de conhecimento (ADR-027):** sem origem, inteligência é
  opinião com interface bonita.
- **Memória corporativa com validação no banco (ADR-031):** se a qualidade do
  registro depender de disciplina humana, ela degrada em semanas.
- **Versionamento de conhecimento (ADR-032):** o valor está na evolução,
  não no estado atual.
- **Naturezas distintas no Twin (ADR-033):** confundir simulação com fato é
  a forma mais rápida de destruir a confiança de um executivo.

---

## 6. Fases

| Fase | Escopo | Situação |
| --- | --- | --- |
| I | CRM/ERP imobiliário, domínios de negócio | Concluída |
| II | Inteligência: decisão, mercado, conhecimento, memória, Executive OS | Concluída (Sprints 01–30) |
| III | Ferragano OS: produto em produção, ecossistema e escala | Aberta — ver `docs/programas/README.md` |

A Fase III não é medida em features entregues. É medida em clientes reais
operando diariamente.

O destino de longo prazo — as oito verticais do Ecossistema Ferragano
(Academy, Intelligence, Analytics, AI, Network, Capital, Ventures, Labs) —
está registrado em [`docs/programas/ecossistema-ferragano.md`](./docs/programas/ecossistema-ferragano.md),
com a ordem de dependência e as proibições que preservam a arquitetura.

---

## 7. O que recusamos

- Feature sem dono, sem métrica de adoção e sem forma de desligar.
- Número na tela sem origem.
- IA respondendo o que a regra determinística já responde melhor.
- Multi-tenant sem teste de isolamento.
- Entrega sem teste, sem documentação e sem ADR quando a decisão é estrutural.
