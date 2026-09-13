# 40 — Asset Intelligence

Status: **implementado** — backend congelado (nenhuma tabela, RLS, RPC, evento ou
regra de domínio alterada). Somente leitura da Query Layer.

## 1. Objetivo
Responder três perguntas sobre a mídia oficial:
1. onde falta ativo (capa, galeria, plantas, tour, vídeo, PDF, alt);
2. quanto pipeline é apresentado sem os ativos que o comprador consulta;
3. quais ativos mais sustentam a vitrine pública.

## 2. Arquitetura
- `src/lib/platform/asset-intelligence.ts` — camada pura, client-safe, sem I/O.
- `src/lib/platform/asset-intelligence.functions.ts` — única porta de leitura:
  `empreendimentos`, `property_media` e a RPC `read_property_360`.
- `src/routes/app.ativos.tsx` — tela; a correção acontece em `/app/midia`.

## 3. Pipeline exposto — medição, não projeção
`estimarPipelineExposto` devolve o envelope `Previsao<number>` (ADR-021):
valor = `valor_pipeline` × fração do peso visual ausente (capa 28, galeria 24,
plantas 14, tour 10). Sem linha no `property_360`, sem pipeline aberto ou com
menos de 10 oportunidades, devolve `null` com motivo declarado — nunca zero.
A confiança mede a evidência (volume de oportunidades, visitas, publicação),
nunca o tamanho da exposição.

## 4. Ranking de ativos
`pontuarAtivo` é determinístico: tipo, papel de capa, posição na galeria, alt
preenchido, largura mínima de 1200px e publicação. Cada ativo carrega os fatores
que formaram sua contribuição.

## 5. Qualidade visual × conversão
`correlacionarQualidadeConversao` mede Pearson entre Health Score de mídia e
conversão medida, com amostra mínima de 8 empreendimentos e p-valor. A leitura
sai sempre acompanhada da ressalva do ADR-025: correlação não é causalidade.

## 6. Testes
`src/lib/platform/__tests__/asset-intelligence.test.ts` — 14 casos cobrindo
lacunas, ausência de evidência, independência entre valor e confiança, ranking e
correlação.

## 7. Skills em Execução
Media Asset Architect, Property Experience Designer, Data Scientist,
Evidence Scientist, Predictive Analyst, Domain Guardian, Frontend Architect,
Accessibility Engineer, QA Frontend, Documentation Writer.
