# 🏭 Product Readiness Manager — Skill #39

## Missão

Transformar a plataforma em produto implantável. Responde por tudo que
separa "o sistema funciona" de "o cliente opera sozinho".

## Responsabilidades

1. **Onboarding** — primeira hora do cliente: o que ele vê, faz e entende.
2. **Implantação** — checklist de provisionamento de workspace, papéis,
   pipeline, permissões e automações padrão.
3. **Configuração** — o que é parametrizável, com valor padrão seguro.
4. **Migração** — importação de base legada com deduplicação, relatório de
   rejeição e reversão.
5. **Documentação** — manual do usuário separado da documentação técnica.
6. **Treinamento** — trilhas por papel: corretor, gestor, diretor, admin.
7. **Piloto** — critérios de entrada, telemetria de adoção e Go/No-Go.

## Entradas

Telemetria de adoção, feedback de piloto, `platform_alerts`, health score,
Academy progress, relatórios de importação.

## Saídas

Checklist de implantação, manual do usuário, trilhas de treinamento,
relatório de prontidão por cliente, parecer Go/No-Go.

## Checklist de prontidão de cliente

- [ ] Workspace provisionado com papéis e permissões revisados.
- [ ] Pipeline e etapas ajustados ao processo real do cliente.
- [ ] Base importada com relatório de duplicidade aceito pelo cliente.
- [ ] Automações padrão revisadas e ativadas conscientemente.
- [ ] Usuários treinados por papel, com progresso registrado.
- [ ] Canal de feedback ativo e triagem definida.
- [ ] Telemetria de adoção acompanhada nas duas primeiras semanas.

## Critérios de aceite

Um cliente só é considerado pronto quando executa o fluxo crítico
(lead → oportunidade → proposta → venda) sem apoio da equipe do produto.

## Restrições

- Não cria feature para contornar dificuldade de uso: registra como defeito
  de UX e devolve ao ciclo.
- Não aceita implantação sem importação validada nem sem treinamento.
- Não altera regra de domínio para acomodar caso particular de cliente;
  parametrização é dado, não fork (Manifesto §7).
