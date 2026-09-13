# 02 — Constituição da marca

Status: **v1 — decisões fechadas do produto**. Itens de identidade comercial
(logotipo, aplicação de marca) permanecem abertos e estão listados na seção 10.

## 1. Objetivo
Fixar o que o Ferragano OS é, para quem é e como fala — para que produto,
interface e comunicação não divirjam à medida que módulos são adicionados.

## 2. Requisitos funcionais (o que a marca precisa sustentar)
- **Nome:** Ferragano OS. Não é um site, é o sistema operacional do negócio imobiliário.
- **Promessa:** uma plataforma onde captação, funil, portfólio, pessoas e
  inteligência vivem no mesmo lugar, com histórico e rastreabilidade.
- **Público:** incorporadoras e imobiliárias com equipe própria — diretoria
  (visão), gerência (operação), corretor (execução diária), marketing e financeiro.
- **Não é:** ferramenta de disparo em massa, catálogo de imóveis, nem CRM genérico
  adaptado ao mercado imobiliário.

## 3. Requisitos não funcionais (tom e postura)
- **Tom:** direto, técnico, sem euforia comercial. Frases curtas. Verbo no
  presente. Zero jargão de startup.
- **Idioma:** português do Brasil em toda a interface, inclusive nomes de tabelas
  e enums do domínio (`leads`, `empreendimentos`, `estagio`, `temperatura`).
- **Postura visual:** sobriedade primeiro — azul petróleo, branco gelo, grafite;
  dourado só como destaque. Referências: Stripe, Linear, Notion, Vercel, Apple.
- **Erro e vazio:** todo estado vazio explica o próximo passo; nenhuma mensagem
  culpa o usuário nem expõe detalhe técnico.

## 4. Modelo de dados (vocabulário canônico)
O vocabulário da marca é o vocabulário do banco — um termo, um significado,
um lugar de definição (`src/lib/platform/comercial.ts`, `navigation.ts`, `roles.ts`).

| Termo | Significado | Onde vive |
|---|---|---|
| Workspace | a empresa cliente; fronteira de todo dado | `workspaces` |
| Membro | pessoa ativa em um workspace | `workspace_members` |
| Papel | permissão dentro do workspace (9 papéis) | `user_roles` |
| Módulo | capacidade ligável do produto | `module_flags` |
| Lead | demanda identificada | `leads` |
| Empreendimento / Unidade | oferta e estoque | `empreendimentos`, `unidades` |
| Domínio | agrupamento de módulos por área do negócio | `navigation.ts` |

Termos proibidos por ambiguidade: "cliente" para lead não convertido,
"projeto" para empreendimento, "usuário" para membro de workspace.

## 5. Fluxos
Marca → produto: toda tela nova declara a qual domínio pertence, qual papel a
usa e qual termo canônico exibe. Termo novo entra primeiro neste capítulo,
depois no código.

## 6. Wireframes
Não se aplica. A expressão visual está no capítulo 03.

## 7. Critérios de aceite
- [x] Nome, promessa, público e não-público definidos
- [x] Vocabulário canônico alinhado ao schema
- [ ] Logotipo e aplicações
- [ ] Manual de escrita de microcopy (botões, confirmações, erros)

## 8. Testes
Revisão de nomenclatura a cada capítulo novo: nenhum termo do produto pode
existir com dois nomes entre interface, banco e documento.

## 9. Prompt Lovable
"Use o vocabulário canônico do capítulo 02. Tom direto, sem euforia. Se precisar
de um termo que não existe lá, proponha antes de usar."

## 10. Roadmap
Identidade visual aplicada (logo, favicon, OG), manual de microcopy,
posicionamento comercial e materiais públicos derivados deste capítulo.
