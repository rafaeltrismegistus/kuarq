# Plano — dividir `toolkit.js`

Estado: proposto, não iniciado.

## Problema

- `web/toolkit.js` (~3.200 linhas) mistura o estado do app (carregar, salvar, navegação) com o editor de mapas mentais.

Um arquivo grande assim é mais difícil de revisar e facilita alterações sem querer em partes não relacionadas.

## Proposta

1. Separar de `toolkit.js` um `maps.js` com os mapas mentais, mantendo o estado e o salvamento em `toolkit.js`.
2. Só mover código: sem mudar comportamento nem formato de dados.

## Riscos

- Os scripts são globais e dependem da ordem do `index.html`; funções usadas antes de definidas quebram.
- Variáveis compartilhadas no topo de `toolkit.js` (`workspace`, `activeMap`, `icon`) precisam continuar acessíveis.

## Validação

- `node scripts/check.mjs`.
- No app: abrir, editar e salvar um mapa mental; abrir, desfazer e apresentar.
- Claro e escuro; janela larga e estreita.
- Conferir que um `mapas.json` antigo abre igual.

## Como voltar atrás

Um commit só para a separação; reverter o commit restaura o anterior.
