# Estado do Kuarq

Atualizado em: 19/11/2026.

## Base

| Estado | Referência |
|---|---|
| Versão publicada | `2.0.0` (19/11/2026), branch `main`. |
| Desenvolvimento | Branch `local`, só no computador. **Não enviar** (sem push, PR ou merge) sem autorização explícita do responsável. |
| App instalado | `desktop/app`, compilado a partir do branch `local`. |

## Novidades da 2.0.0

- Guias como num navegador (Ctrl+T, Ctrl+W, Ctrl+Tab), barra de título própria e botões da janela.
- Cérebro: grafo das notas ligado pelos links "/ → Link para nota".
- Notas: link para nota e salvamento 3 s após a última tecla.
- Visão mobile (telas até 720 px) e botão de visão app (janela de 430 px).

## Próximas ações

1. Dividir `toolkit.js` (estado + mapas mentais), com plano em `plans/`.
2. Atualizar `CHANGELOG.md` antes de publicar uma nova versão.
3. Trocar as cópias locais de `escape` em `crm.js` e `today.js` pela do `kit`, como já foi feito com `fold`.

## Versões antigas

Em 19/11/2026, as cópias antigas (`Quark/`, `ToolKit 2/`, `Toolkit.zip`) e os builds velhos (`dist/`, `desktop/bin/`) foram movidos, sem apagar, para `Documentos\ChatGPT\Kuarq - versões antigas\`, fora do repositório. `dist/` e `desktop/bin/` são recriados pela compilação quando preciso.

## Limites conhecidos

- Não há testes automatizados de interface; a verificação visual é manual (claro, escuro, largo e estreito).
