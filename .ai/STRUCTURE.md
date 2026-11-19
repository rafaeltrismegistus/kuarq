# Estrutura do Kuarq

| Caminho | Responsabilidade |
|---|---|
| `desktop/MainWindow.xaml.cs` | WebView2, host virtual, mensagens da interface (`load`, `save`, backups, links, arquivos, `ui-get`/`ui-set`, janela, `save-pdf`) |
| `desktop/WorkspaceStore.cs` | Leitura e escrita atômica do `mapas.json` |
| `desktop/BackupStore.cs` | Backups diários, manuais e de segurança |
| `desktop/App.xaml.cs` | Instância única |
| `web/index.html` | Estrutura das telas, CSP e ordem dos scripts |
| `web/toolkit.js` | Estado (`workspace`), salvamento, navegação e mapas mentais |
| `web/kit.js` | Registro de módulos, grupos do menu e componentes comuns (menus, painel, datas, imagens, toasts, dinheiro, `fold`, `escape`) |
| `web/ui.js` | Dropdown que substitui todo `<select>` nativo |
| `web/rich-text.js` | Editor rico, menu "/" e sanitização de HTML |
| `web/tabs.js` | Guias, barra de título e botões da janela |
| `web/palette.js` | Busca e comandos (Ctrl+K) |
| `web/today.js` | Tela Hoje |
| `web/workhome.js` / `tasks.js` / `projects.js` / `processes.js` / `journal.js` | Trabalho: visão geral, tarefas, projetos, processos e diário |
| `web/crm.js` | Networking: contatos, follow-up e aniversários |
| `web/notes.js` / `brain.js` / `dreams.js` / `links.js` | Toolkit: notas, Cérebro, sonhos e links |
| `web/nucleus.js` | Núcleo: finanças |
| `web/backups.js` | Tela de backups |
| `web/toolkit.css` | Tokens de cor e base; os demais `.css` são por área, e `mobile.css` vem por último |
| `scripts/check.mjs` / `scripts/build.ps1` | Verificação e compilação |
| `docs/` | Contratos para quem usa e contribui |
| `.ai/` | Diretrizes de engenharia, estado e planos |
| `.github/` | Modelos de issue e PR, CI e release |

## Gerado (não versionado)

`desktop/app/`, `desktop/bin/`, `desktop/obj/` e `dist/`. Nunca edite `desktop/app/` como fonte.

## Ordem dos scripts

Todos usam `defer`, na ordem do `index.html`. Módulos que usam `kit` em tempo de carga esperam o `DOMContentLoaded`. Não reordene por estética.
