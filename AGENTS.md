# Instruções para agentes — Kuarq

Leia o [README](README.md), a [arquitetura](docs/ARQUITETURA.md) e o [CONTRIBUTING](CONTRIBUTING.md) antes de mudar código.

## Regras

- `web/` é a fonte da interface. `desktop/app/` é saída de compilação e não é versionada.
- Rode `node scripts/check.mjs` antes de concluir. Mudança em `desktop/` exige compilar com `.\scripts\build.ps1`.
- Preserve a compatibilidade dos dados: campos novos são opcionais, o `validate` aceita dados antigos e nenhum dado do usuário é apagado sem cópia de segurança.
- Interface: reaproveite os componentes do `kit` e os estilos existentes. Sem `select`, data, `alert` ou `confirm` nativos e sem cores ou estilos paralelos.
- Nada de rede: não adicione CDN, fontes externas, telemetria nem hosts na CSP.
- Use apenas dados fictícios em exemplos, capturas e testes. Nunca versione `mapas.json` ou backups.
- Commits convencionais em português. Agentes de IA não aparecem como autores ou coautores: sem trailers `Co-Authored-By`, sem assinaturas "Generated with" e sem links de sessão em commits, PRs, issues ou releases.
- Push, PR, merge, tag e release só com autorização explícita do responsável.
