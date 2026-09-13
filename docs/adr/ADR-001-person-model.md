# ADR-001 — People como entidade canônica

## Contexto

O domínio comercial original modelava `leads` e `clientes` como tabelas
independentes. Na prática, uma pessoa começa como lead, negocia, compra,
indica outra pessoa e pode voltar a negociar um segundo imóvel — sempre a
mesma pessoa física ou jurídica. Duas tabelas obrigavam a duplicar cadastro
na conversão de lead para cliente, perdiam histórico na duplicação e não
davam conta de papéis simultâneos (a mesma pessoa pode ser cliente de uma
unidade e indicadora de outra ao mesmo tempo).

## Decisão

`people` é a única tabela de identidade de pessoa física ou jurídica no
sistema. Contatos, endereços e qualificação de crédito são tabelas satélite
(`person_contacts`, `person_addresses`, `person_qualifications`), cada uma
com FK para `people` e RLS própria por `workspace_id`. O estado comercial
(lead, oportunidade, cliente, investidor, indicador) é `people.estagio_jornada`,
**derivado** de `opportunities` por trigger (`opportunities_sync_estagio` →
`refresh_person_estagio`), nunca digitado — exceto os estados que não nascem
de pipeline (proprietário, investidor, indicador).

Duplicidade é resolvida na entrada: `documento_norm` e `person_contacts.valor_norm`
guardam a forma canônica de CPF/CNPJ/e-mail/telefone, e `find_person_duplicates`
pontua candidatos antes da gravação. Unificação de dois cadastros repontua os
satélites para a pessoa mantida e marca a absorvida com `merged_into` — nunca
apaga linha.

`leads` e `clientes` como tabelas de entidade próprias ficam deprecadas em
favor de `people` + `opportunities`. As telas legadas (`/app/clientes`) ainda
não foram aposentadas — ver capítulo 13, seção de pendências.

## Alternativas descartadas

- **Manter `leads` e `clientes` separados com sincronização por trigger**:
  descartado porque duplica a fonte de verdade e qualquer falha de trigger
  gera divergência silenciosa entre CRM e relatório.
- **Campo de estágio editável manualmente em todos os casos**: descartado
  porque o corretor esquecer de mover o estágio é o erro mais comum do CRM
  antigo; derivar de `opportunities` remove essa classe de erro para o fluxo
  padrão de venda.

## Consequências

- Toda tela que hoje lê `clientes` (ex.: `/app/clientes`) opera sobre um
  modelo que o resto do sistema já não usa; é dívida explícita, não decisão
  nova.
- Qualificação de crédito (`person_qualifications`) é insumo humano, não
  cálculo — o Decision Engine (ADR-007) lê esses dados, não os produz.
- Captação pública (landing pages) ainda não grava direto em `people`
  (pendência do roadmap, capítulo 11).

## Status

Aceito — 2026-07-31.

## Referências

- `docs/blueprint/13-relationship-model.md`
- Tabelas: `people`, `person_contacts`, `person_addresses`, `person_relationships`,
  `person_qualifications`, `opportunities`, `activities`
- `src/routes/app.clientes.tsx` (tela legada, pendente de aposentadoria)
