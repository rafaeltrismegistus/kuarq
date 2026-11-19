# Changelog

Todas as mudanças relevantes do Kuarq. O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o versionamento segue [SemVer](https://semver.org/lang/pt-BR/).

## [2.0.0] - 2026-11-19

### Novidades
- **Guias** como num navegador: várias telas abertas, com Ctrl+T, Ctrl+W, Ctrl+Tab, Ctrl+1…9, Ctrl+Shift+T e Ctrl+clique. As guias são lembradas entre sessões.
- **Barra de título própria**, com guias, busca centralizada e botões da janela no topo.
- **Cérebro**: grafo interativo das notas, ligado pelos links entre elas.
- **Notas**: link para outra nota pelo `/` e salvamento automático 3 s após a última tecla.
- **Visão app**: botão ao lado de minimizar que deixa a janela estreita e sempre à frente; volta ao tamanho anterior ao sair.
- **Visão mobile** em telas de até 720 px.

### Mudanças
- O status de salvamento só aparece quando falha.
- Busca sem acento unificada no `kit`.

## [1.0.0] - 2026-11-17

Primeira versão pública.

### Módulos
- **Hoje**: painel do dia com tarefas, follow-ups, aniversários, contas, diário e itens recentes.
- **Trabalho**: tarefas (lista, Kanban e calendário, subtarefas, checklist, comentários, notas e mapas vinculados), projetos com etapas, marcos, metas, logo e links rápidos, processos e diário.
- **Networking**: contatos em lista ou Kanban, favoritos, foto, follow-up por contato com frequência própria, histórico de conversas, links rápidos e calendário de aniversários.
- **Toolkit**: notas com editor rico e modelos, mapas mentais com setas, desenho livre e cards com imagem, e quadro dos sonhos em galeria, lista e Kanban.
- **Núcleo**: contas, cartões, investimentos, transações, contas a pagar e compras em Kanban, com modo discreto.

### Plataforma
- Busca e comandos com **Ctrl+K** e prefixos (`>`, `@`, `#`, `/`).
- Dados 100% locais em JSON, com backups diários, manuais e de segurança.
- Nova instalação começa vazia. A pasta de dados é `%LOCALAPPDATA%\Kuarq`, e instalações antigas em `Toolkit` continuam funcionando.
- O limite do arquivo de dados subiu para 64 MB para acomodar imagens.

[2.0.0]: https://github.com/rafaeltrismegistus/kuarq/releases/tag/v2.0.0
[1.0.0]: https://github.com/rafaeltrismegistus/kuarq/releases/tag/v1.0.0
