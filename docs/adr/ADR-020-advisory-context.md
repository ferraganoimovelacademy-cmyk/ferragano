# ADR-020 — Advisory: comunicação é um bounded context

**Status:** aceito · Sprint 22

## Contexto

Até a Sprint 21 a plataforma media (ADR-017), qualificava evidência (ADR-018) e
priorizava ação (ADR-019). Faltava a última milha: transformar isso em algo que
um gestor leia em 30 segundos e decida. A tentação era espalhar frases de
briefing pelos módulos de métrica — o que acopla medição a comunicação e faz
qualquer mudança de texto tocar o motor de cálculo.

## Decisão

1. **Advisory é bounded context próprio.** `src/lib/platform/advisory.ts` não
   calcula métrica nova: consome contratos já certificados
   (`advisor`, `automation-intelligence`, `decision-intelligence`,
   `recommendation`) e produz linguagem.
2. **Uma porta de leitura.** `advisory.functions.ts` (`getAdvisoryContext`) lê
   somente a Query Layer: Read Models 360 e as RPCs `automation_intelligence`,
   `list_recommendations`, `recommendation_quality`. Nenhuma tabela
   transacional. Degrada por camada: sem papel de administrador, o Advisor fala
   do funil em vez de falhar a tela.
3. **Toda afirmação carrega confiança.** `advisorConfidence` combina volume de
   funil, amostra de automação, confiança estatística das regras e precisão
   histórica do próprio motor. Sem evidência: `null` e nível `inicial` — nunca
   um número inventado.
4. **NLQ é determinística, não generativa.** `classificarPergunta` mapeia a
   pergunta para uma intenção conhecida e a resposta é montada com números
   medidos. Fora de escopo, o Advisor diz que não sabe. O LLM segue restrito ao
   briefing narrativo da Fase 2 (ADR-013), que continua intacto.
5. **Decision Timeline é o ciclo completo.** Gerada → vista → aceita →
   implementada → avaliada, com dias entre etapas, lida da memória da Sprint 21.
   Tempo médio só existe com implementação real.

## Consequências

- Mudar texto executivo não toca cálculo; mudar cálculo não reescreve texto.
- O Advisor passa a ser auditável: cada frase aponta o número que a originou.
- Zero tabela nova e zero custo de IA nas Gates 01–05.
- Limite aceito: a NLQ responde a um conjunto fechado de intenções. Ampliar
  cobertura é adicionar padrão + evidência, não trocar por prompt livre.

## Evolução planejada (registrada, não implementada)

- `advisory_briefings_lidos`: registrar leitura para medir se o briefing muda
  comportamento (hoje medimos apenas a recomendação).
- Janela semanal real por comparação semana × semana anterior, quando o rollup
  diário tiver 14 dias de série em produção.
