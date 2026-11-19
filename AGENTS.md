# Instruções para agentes — Kuarq

As diretrizes ficam em [`.ai/`](.ai/README.md). Comece por lá: [contexto](.ai/CONTEXT.md), [estado atual](.ai/CURRENT.md), [mapa do código](.ai/STRUCTURE.md) e as [regras](.ai/README.md#leitura-por-escopo) que o seu escopo pede.

## Regras que valem sempre

- `web/` é a fonte da interface. `desktop/app/` é saída de compilação e não é versionada.
- Rode `node scripts/check.mjs` antes de concluir. Mudança em `desktop/` exige compilar com `.\scripts\build.ps1`.
- Dados antigos sempre abrem e nenhum dado do usuário é apagado sem cópia de segurança. Detalhes em [DADOS](.ai/rules/DADOS.md).
- Reaproveite o `kit`, os tokens e os estilos existentes; nada de controles nativos. Detalhes em [INTERFACE](.ai/rules/INTERFACE.md).
- Nada de rede: sem CDN, fontes externas, telemetria ou hosts na CSP.
- Remova o que a mudança deixou sem uso; não mantenha versões antigas no código.
- Use apenas dados fictícios em exemplos, capturas e testes. Nunca versione `mapas.json` ou backups.
- Commits convencionais em português. Agentes de IA não aparecem como autores ou coautores: sem trailers `Co-Authored-By`, sem assinaturas "Generated with" e sem links de sessão em commits, PRs, issues ou releases.
- Push, PR, merge, tag e release só com autorização explícita do responsável. O branch `local` não é enviado.
