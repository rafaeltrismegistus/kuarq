# Contexto — Kuarq

O Kuarq é um sistema pessoal para Windows: tarefas, projetos, processos, diário, networking (CRM), notas, mapas mentais, Cérebro (grafo das notas), quadro dos sonhos e finanças (Núcleo). Um usuário, um computador, sem conta.

O nome anterior era Quark (e, antes, Toolkit). Por isso o host virtual é `toolkit.localhost` e instalações antigas guardam dados em `%LOCALAPPDATA%\Toolkit`. Esses nomes ficam como estão por compatibilidade.

## Stack

- **App nativo** (`desktop/`): WPF em .NET 10 com WebView2. Abre `web/` como `https://toolkit.localhost/`, grava os dados e os backups, controla a janela.
- **Interface** (`web/`): HTML, CSS e JavaScript puros, sem build, sem dependências e sem framework. Cada módulo é uma IIFE registrada no `kit`.
- **Dados**: um único `mapas.json` (escrita atômica e `.bak`) e backups `.json.gz`. Preferências da interface (guias abertas) em `ui.json`.
- **Verificação**: `node scripts/check.mjs` (sintaxe, referências, CSP, UTF-8, ausência de dados pessoais).

## Decisões

- **Local e privado**: nada de rede, CDN, fontes externas, telemetria ou hosts na CSP.
- **Dados antigos sempre abrem**: campos novos são opcionais; formatos antigos são convertidos ao carregar, nunca descartados.
- **Visual único**: tokens de `toolkit.css`, componentes do `kit` e classes existentes. Destaque cinza-roxeado (`#514169`) no claro e off-white (`#faf9f5`) no escuro.
- **Edição no lugar**: criar e editar em painel ou diálogo sobre a tela de origem, com "Desfazer" em exclusões.
- **Simplicidade**: sem bundler, sem TypeScript, sem biblioteca para resolver um caso isolado.
- **Versão web futura**: planejada em Vercel com banco Neon (Postgres). Nunca Supabase. Até lá, nenhuma camada de servidor no código.
