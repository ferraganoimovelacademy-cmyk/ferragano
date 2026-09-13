# ADR-027 — Knowledge Provenance

**Status:** aceito (Sprint 26)
**Contexto:** Sprints 18–25 produziram inteligência em camadas (Market
Analytics, Evidence Engine, Behavior, Predictive, Recommendation, Advisor).
Sem uma camada de organização, a explicação de uma recomendação dependia de
ler código.

## Decisão

Todo conhecimento produzido pelo Ferragano One possui proveniência completa:

| Campo | Significado |
|---|---|
| fonte | Read Model, RPC ou série externa de onde o dado veio |
| camada | `dominio` · `mercado` · `analitico` · `decisao` · `resultado` |
| base | `dado_interno` · `dado_externo` · `regra_negocio` · `evidencia_historica` |
| algoritmo | função que derivou o nó (obrigatório em nó derivado) |
| versaoAlgoritmo | versão do Knowledge (`VERSAO_ALGORITMO`) |
| adr | ADR que governa a produção daquele conhecimento |
| atualizadoEm | data da última atualização |

Consequências operacionais:

1. **Zero duplicação.** Um nó é uma referência `tipo:id`; nenhuma entidade de
   negócio é copiada para o grafo.
2. **Zero acesso direto a tabelas de domínio.** O Knowledge lê apenas a Query
   Layer (`read_*_360`, `read_opportunity_signals`, `list_recommendations`) e o
   catálogo do Market Intelligence.
3. **Nenhuma resposta sem árvore.** Uma recomendação sem cadeia até dado
   primário é reportada como `proveniencia_invalida` /
   `recomendacao_sem_evidencia`, e a interface declara o rastro incompleto em
   vez de exibi-la como explicada.
4. **Nada é resumido.** A explicabilidade do Advisor renderiza todos os níveis
   da árvore, inclusive ciclos (marcados como interrompidos).
5. **Relação fora da ontologia é descartada.** A ontologia (`ONTOLOGIA`) é a
   única fonte de arestas válidas.
6. **Ausência de dado não é zero.** Grafo vazio tem `score: null` (ADR-019).
7. **Nenhuma relação inferida.** Localização de empreendimento em bairro só é
   afirmada quando cidade e UF coincidem; caso contrário a relação não existe.

## Alternativas descartadas

- Tabelas próprias de grafo (duplicação de dados e segundo ponto de verdade).
- Grafo materializado por trigger nos domínios (acoplamento entre bounded
  contexts).
- Explicação resumida por LLM (perda de auditabilidade; contraria ADR-021 e
  ADR-026).

## Limitação declarada

`equipe` e `construtora` fazem parte da ontologia mas ainda não têm coluna nos
Read Models atuais. Enquanto isso, aparecem em `tiposAusentes` no Knowledge
Health Score — a lacuna é exibida, não escondida.
