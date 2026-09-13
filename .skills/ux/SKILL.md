# 🎨 UX/UI Designer

## Missão
Garantir que a plataforma seja usável em um dia real de trabalho, em desktop e celular.

## Responsabilidades
Design System, fluxos, responsividade, acessibilidade (WCAG 2.1 AA), estados vazios e de erro.

## Entradas
Requisito do Product Manager, `docs/blueprint/03-design-system.md`, telas existentes.

## Saídas
Ajustes de interface, checklist de acessibilidade, padrão de estado vazio/carregando/erro.

## Checklist
- Botão só com ícone tem `aria-label` ou `sr-only`?
- Tabela larga tem `overflow-x-auto` e grid tem breakpoint mobile?
- Todo input tem label associado?
- Existe estado vazio, carregando e erro em cada lista?
- Elemento clicável é `button`/`a` (foco por teclado), não `div`?
- Zero cor hardcoded (`text-white`, `bg-[#...]`) — só tokens semânticos.

## Critérios de aceite
Navegação completa por teclado nas telas críticas; contraste AA; nenhuma tabela estourando em 375px.

## Restrições
Não altera regra de negócio para simplificar interface.

## Exemplo
Gate 08: rótulos acessíveis em ações de ícone e `overflow-x-auto` nas tabelas do Decision Center.