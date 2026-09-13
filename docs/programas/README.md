# FASE III — FERRAGANO OS

A Fase III não é organizada em sprints, e sim em **programas**: linhas de
trabalho de longa duração, com dono, critério de entrada e critério de saída.

Regra de abertura: **nenhum programa começa antes da Sprint ZERO — Hardening
estar certificada** (`docs/programas/sprint-zero-hardening.md`).

| # | Programa | Objetivo | Pré-requisito | Situação |
| --- | --- | --- | --- | --- |
| 00 | [Sprint ZERO — Hardening](./sprint-zero-hardening.md) | Zero feature. Produção confiável. | — | 🟡 em execução |
| 01 | Production Readiness | Preparar o produto para os primeiros clientes: onboarding, implantação, configuração, migração, documentação, treinamento, piloto. | Sprint ZERO | ⚪ planejado |
| 02 | Marketplace | Ecossistema de parceiros: construtoras, correspondentes bancários, despachantes, arquitetos, decoradores, seguradoras, mudança, cartórios, CRM partners. | Programa 01 + 05 | ⚪ planejado |
| 03 | AI Platform | Ecossistema de agentes (Comercial, Marketing, Financeiro, Produto, RH, BI, Compliance, Growth) sobre o **mesmo** Knowledge Layer. | Programa 01 | ⚪ planejado |
| 04 | Mobile | Aplicativo nativo, não PWA. | Programa 05 | ⚪ planejado |
| 05 | API Platform | Public API, SDK, webhooks, chaves e cotas. | Sprint ZERO | ⚪ planejado |
| 06 | White Label | Ferragano One → Construtora → Imobiliária → Parceiro, tudo parametrizado. | Programa 01 | ⚪ planejado |
| 07 | Multi IA | Roteamento por capacidade e custo entre múltiplos provedores. | Programa 03 | ⚪ planejado |
| 08 | Enterprise Cloud | Multiempresa, multifilial, multiidioma, multimoeda. | Programa 06 | ⚪ planejado |

## Destino

O objetivo final não é a plataforma: é o **Ecossistema Ferragano** — Academy,
Intelligence, Analytics, AI, Network, Capital, Ventures e Labs. Visão completa,
mapa do que já existe, ordem de dependência e proibições em
[`ecossistema-ferragano.md`](./ecossistema-ferragano.md). Os oito programas
desta fase são o caminho para lá, não um destino alternativo.

## Princípios da Fase III

1. **Produção manda no roadmap.** A próxima evolução é definida pelo uso real,
   não por analogia com concorrente.
2. **Um programa por vez em foco.** Programas paralelos só quando não
   compartilham bounded context.
3. **Todo programa abre com ADR de entrada e fecha com certificação.**
4. **Nada de novo contexto analítico na Fase III sem cliente pedindo.**
   A Fase II encerrou a expansão de inteligência.

## Regras específicas já definidas

- **Programa 03:** um agente é uma *persona de leitura* sobre o Knowledge
  Layer. Nenhum agente ganha acesso direto a tabela transacional, e nenhum
  agente afirma o que a evidência não sustenta (R06, R07, R09).
- **Programa 05:** API pública vive em `src/routes/api/public/*`, com
  verificação do chamador dentro do handler, sem PII no retorno.
- **Programa 06:** parametrização é dado, nunca fork de código.
- **Programa 07:** a escolha do provedor é registrada junto da resposta, para
  manter a auditabilidade da recomendação.
