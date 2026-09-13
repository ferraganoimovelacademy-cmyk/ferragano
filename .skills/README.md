# Ferragano One — Time de Agentes (Skills)

39 especialistas. Cada um tem missão, responsabilidades, entradas, saídas,
checklist, critérios de aceite, restrições e exemplos no respectivo `SKILL.md`.

## Diretório

| # | Skill | Pasta |
|---|-------|-------|
| 1 | 🧠 Chief Architect | `architect` |
| 2 | 📊 Product Manager | `product` |
| 3 | 🗄 Database Architect | `database` |
| 4 | 🎨 UX/UI Designer | `ux` |
| 5 | 🏢 Sales Specialist | `sales` |
| 6 | 🏙 Property Specialist | `property` |
| 7 | ⚙️ Automation Engineer | `automation` |
| 8 | 📈 Analytics Engineer | `analytics` |
| 9 | 🤖 AI Strategist | `ai` |
| 10 | 📢 Marketing Strategist | `marketing` |
| 11 | 📊 Business Intelligence | `bi` |
| 12 | 🔒 Security Officer | `security` |
| 13 | 🧪 QA Engineer | `qa` |
| 14 | 📚 Documentation Writer | `documentation` |
| 15 | 🛡 Domain Guardian | `domain-guardian` |
| 16 | 🚀 DevOps Engineer | `devops` |
| 17 | 🎯 Customer Success | `customer-success` |
| 18 | 📈 Platform Observability | `observability` |
| 19 | 📊 Data Scientist | `data-scientist` |
| 20 | 🏅 Release Manager | `release-manager` |
| 21 | 🎓 Pilot Manager | `pilot-manager` |
| 22 | 🤖 Automation Analyst | `automation-analyst` |
| 23 | 📈 Decision Scientist | `decision-scientist` |
| 24 | 🧠 Recommendation Strategist | `recommendation-strategist` |
| 25 | 🧭 Executive Advisor | `executive-advisor` |
| 26 | 🔮 Predictive Analyst | `predictive-analyst` |
| 27 | 🧬 Behavior Scientist | `behavior-scientist` |
| 28 | 🏢 Market Analyst | `market-analyst` |
| 29 | 💹 Economic Analyst | `economic-analyst` |
| 30 | 📍 Urban Intelligence | `urban-intelligence` |
| 31 | 📉 Correlation Scientist | `correlation-scientist` |
| 32 | 📊 Evidence Scientist | `evidence-scientist` |
| 33 | 🕸 Knowledge Architect | `knowledge-architect` |
| 34 | 🧩 Knowledge Orchestrator | `knowledge-orchestrator` |
| 35 | 🧠 Intelligence Fabric Architect | `intelligence-fabric` |
| 36 | 🧠 Enterprise Memory Architect | `enterprise-memory` |
| 37 | 🏛 Organizational Intelligence Architect | `organizational-intelligence` |
| 38 | 🪞 Executive Digital Twin Architect | `executive-twin` |
| 39 | 🏭 Product Readiness Manager | `product-readiness` |

## Fluxo de decisão (obrigatório)

1. Product Manager propõe.
2. Chief Architect valida o desenho técnico.
3. Domain Guardian verifica aderência ao domínio e às ADRs.
4. Security Officer revisa riscos.
5. Só então a implementação começa.

Nenhum agente decide arquitetura isoladamente. Decisão relevante = ADR em `docs/adr/`.

## Padrão de relatório de sprint

Todo relatório usa o modelo de `docs/templates/relatorio-sprint.md`, com as
seções fixas **STATUS**, **GATES**, **SKILLS EM EXECUÇÃO**, **PENDÊNCIAS** e
**SAÚDE DA PLATAFORMA**.

A partir do Alpha, o campo **STATUS** usa os níveis de certificação do
ADR-009: 🟢 CERTIFIED, 🟡 CERTIFIED WITH WARNINGS, 🟠 RELEASE BLOCKED,
🔴 REJECTED.
