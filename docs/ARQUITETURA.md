# Arquitetura

O Kuarq tem duas partes: um **app nativo pequeno** e uma **interface web local**. Não há servidor, banco de dados ou dependência de rede.

```text
┌──────────────── Kuarq.exe (WPF, .NET 10) ────────────────┐
│ MainWindow   WebView2 → https://toolkit.localhost/        │
│              (pasta web/ mapeada como host virtual)       │
│ WorkspaceStore  lê e grava mapas.json (escrita atômica)   │
│ BackupStore     backups .json.gz diários/manuais/segurança│
└───────────────▲──────────────────────────┬───────────────┘
                │ postMessage {id, action} │ resposta {id, data}
┌───────────────┴──────────────────────────▼───────────────┐
│ web/  HTML + CSS + JavaScript sem build e sem dependências│
│ toolkit.js  estado (workspace), salvar, mapas mentais     │
│ kit.js      registro de módulos e componentes comuns      │
│ <módulo>.js uma área por arquivo (tasks, crm, dreams…)    │
└───────────────────────────────────────────────────────────┘
```

## App nativo (`desktop/`)

- `MainWindow.xaml.cs` cria o WebView2, mapeia `web/` para `https://toolkit.localhost` e recebe as mensagens da interface. As ações são `load`, `save`, `backup-list`, `backup-create`, `backup-read`, `backup-restore`, `backup-folder`, `open-link` (http, https, mailto ou caminho local), `pick-file`, `pick-folder`, `theme`, `ui-get` e `ui-set` (guias abertas, em `ui.json`), `save-pdf` e os comandos da janela (`minimize`, `maximize`, `close`, `app`, `drag`). Mensagens de outra origem são ignoradas.
- `WorkspaceStore.cs` grava em um arquivo temporário e troca de forma atômica, mantendo a versão anterior em `.bak`. O limite do arquivo é de 64 MB.
- `BackupStore.cs` guarda os backups compactados e faz a limpeza por tipo: 30 diários, 20 manuais e 10 de segurança.
- `App.xaml.cs` garante uma única instância.

## Interface (`web/`)

- **Estado**: um único objeto `workspace` (carregado com `load` e salvo com debounce via `save`). Cada módulo guarda a sua parte nele: `tasks`, `projects`, `contacts`, `notes`, `maps`, `dreams`, `nucleus` e assim por diante.
- **Módulos**: cada arquivo é uma IIFE que chama `kit.register(nome, título, { show, validate, command })`. O `validate` participa da validação feita ao abrir os dados e ao restaurar backups: um dado inválido nunca substitui um arquivo bom.
- **Componentes comuns (`kit`)**: menus, painel lateral (`kit.form`), campos de data e de imagem, Kanban (`kit.draggable`), toasts com "Desfazer", painéis, dinheiro em centavos e links rápidos. `ui.js` troca todo `<select>` nativo pelo dropdown do Kuarq.
- **Ordem dos scripts**: todos usam `defer`, na ordem do `index.html`. Um módulo que depende de `kit` em tempo de carga deve esperar o `DOMContentLoaded`.
- **CSP** (`index.html`): só `self` e imagens `data:`. Nada externo carrega.

## Criar um módulo

1. Crie `web/meu-modulo.js` com `kit.register("meu-modulo", "Título", module)`, inclua uma função `validate(data)` que aceite dados ausentes e salve com `kit.touch()`.
2. Adicione a `<section id="meu-modulo" data-module hidden>` e o `<script defer>` no `index.html`.
3. Para aparecer como aba de um grupo, inclua o módulo em `kit.groups` (`kit.js`). Para aparecer na busca, adicione-o em `palette.js`.
4. Reaproveite as classes e os tokens existentes (`crm-panel`, `tk-*`, `tp-*`, cores por `data-tone`). Não introduza um estilo novo onde já existe um.
5. Rode `node scripts/check.mjs` e teste no tema claro e no escuro.
