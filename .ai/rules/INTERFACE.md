# Interface, componentes e temas

Vale ao criar ou alterar tela, componente, formulário, estilo ou tema.

## Visual único

- Cores só pelos tokens de `toolkit.css` (`--accent`, `--page`, `--panel`, `--line`, `--muted`…) e pelas cores de projeto do `kit`. Não crie cor de destaque, sombra ou estilo de cartão paralelo.
- Reaproveite as classes existentes: `crm-panel`, `tk-*`, `tp-*`, `task-*`, `button`, `icon-button`, `crm-search`, tons por `data-tone`.
- Ícones pelo `icon()` do app, em SVG local.
- Todo estado visível (hover, foco, ativo, desabilitado, vazio, erro) existe no claro e no escuro.

## Controles

- Proibidos: `alert`, `confirm`, `prompt`, `<select>` com popup nativo e `input[type=date]` nativo. Use `kit.menu`, o dropdown de `ui.js`, os campos de data do `kit` e os diálogos e toasts do app.
- Labels reais e nomes acessíveis; ícone sozinho tem `aria-label` e `title`. Estado não depende só de cor.
- Foco visível e navegação por teclado (Esc fecha o que está por cima).

## Fluxos

- Criar e editar em painel (`kit.form`) ou diálogo sobre a tela de origem, mantendo filtros e posição.
- Exclusão com "Desfazer" no toast.
- Salvar com `kit.touch()`; textos longos salvam com atraso após a última tecla, sem perder o que foi digitado.

## Telas estreitas

- Até 720 px vale `mobile.css`: menu embaixo, toques de pelo menos 40 px, gavetas em tela cheia. Regras novas para celular vão nele, com o prefixo `:root`.
- Nenhuma tela pode ter rolagem horizontal da página; tabelas largas rolam dentro do próprio cartão.

## Manutenção

- Evite listeners e timers duplicados ao reabrir telas; não renderize a tela inteira a cada tecla.
- Conteúdo do usuário entra no HTML só por `escape()` ou pela sanitização do `rich-text.js`.
