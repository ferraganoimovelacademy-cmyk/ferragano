# Network & Capital — modelos e fluxos essenciais

Protótipo de domínio para acelerar a Sprint ZERO quando os gates permitirem. Nada aqui cria
tabela: são modelos e validações puras em `src/lib/platform/ecosystem.ts`, prontos para virar
migração quando o compliance e o gate H12 (LGPD) forem encerrados.

## Ferragano Network

### Contrato de parceria (`ContratoParceria`)
Campos: partes, escopo de dados (`nenhum | agregado | oportunidade_compartilhada`), comissão,
vigência, assinatura e cláusula de rescisão.

Bloqueios (`validarContratoParceria`):
- sem responsável pela assinatura
- partes idênticas
- comissão fora da faixa 0–100%
- rescisão não declarada
- vigência final anterior ao início
- escopo de dados não declarado

Observações que exigem registro: contrato sem prazo (revisar anualmente) e compartilhamento de
oportunidade (exige consentimento do cliente, ADR-034).

### Compliance do parceiro (`CompliancePartner`)
Habilitação obrigatória: CNPJ validado, CRECI validado, zero documento pendente, zero sanção.
Sem revisão registrada é observação, não bloqueio.

### Fluxo
1. Cadastro do parceiro → 2. Compliance → 3. Contrato assinado com escopo de dado →
4. Ativação na rede → 5. Revisão anual (compliance vence).

Parceiro só entra na rede quando compliance **e** contrato estão aptos.

## Ferragano Capital

### Posição de liquidez (`PosicaoLiquidez`)
Bloqueios (`avaliarLiquidez`):
- antecipação acima de 70% da carteira
- inadimplência acima de 5%
- concentração do maior sacado acima de 25%
- carteira sem valor (não há base para avaliar)

Observação: prazo médio acima de 180 dias.

### Fluxo
1. Carteira elegível (venda assinada) → 2. Compliance do cedente → 3. Avaliação de liquidez →
4. Decisão registrada em Enterprise Memory → 5. Trilha de auditoria da operação.

### Bloqueio atual
Capital permanece bloqueada: depende do gate H12 (LGPD) e do compliance da Network. Nenhuma
operação financeira é habilitada antes disso.

## Onboarding
As perguntas de prontidão de Network e Capital estão em `onboardingVerticais` e aparecem em
`/app/ecossistema`, aba Onboarding, com evidência exigida por pergunta.
