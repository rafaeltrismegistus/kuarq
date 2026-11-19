# Contribuindo com o Kuarq

Obrigado pelo interesse! Este guia mostra como propor mudanças sem quebrar o que já funciona para quem usa o app no dia a dia.

## Antes de começar

- Leia a [arquitetura](docs/ARQUITETURA.md), o [guia dos módulos](docs/MODULOS.md) e as [diretrizes de engenharia](.ai/README.md).
- Para mudanças grandes, abra uma issue antes para alinhar a ideia.

## Ambiente

1. Windows 10 ou 11, [.NET SDK 10](https://dotnet.microsoft.com/download) e [Node.js 20+](https://nodejs.org).
2. `.\scripts\build.ps1` compila em `desktop\app`.
3. Para iterar na interface, edite `desktop\app\web` e aperte **F5** no app. Depois leve a mudança para `web/`, que é a fonte versionada.

## Fluxo

1. Crie uma branch a partir de `main`: `feat/resumo`, `fix/resumo`, `docs/resumo`, `refactor/resumo` ou `chore/resumo`.
2. Use commits convencionais com resumo em português, por exemplo `feat(tarefas): filtro por etiqueta`.
3. Rode `node scripts/check.mjs` e teste o fluxo no app, no tema claro e no escuro.
4. Abra o PR seguindo o modelo.

## Princípios

- **Local e privado**: nada de rede, telemetria, CDN ou fontes externas. A CSP do `index.html` não libera hosts.
- **Dados antigos sempre abrem**: novos campos são opcionais e o `validate` de cada módulo aceita dados ausentes. Mudança de formato precisa de migração ao carregar, nunca de perda silenciosa.
- **Visual consistente**: reaproveite os componentes do `kit` e as classes existentes. Não use `alert`, `confirm`, `prompt`, `<select>` ou datas nativas. Siga os tokens de cor e não crie estilos paralelos.
- **Edição no lugar**: criar e editar acontece em painel ou diálogo sobre o contexto, com "Desfazer" em exclusões.
- **Sem dados reais**: capturas, exemplos e testes usam apenas dados fictícios.
- **UTF-8 sem BOM** e finais de linha conforme `.editorconfig`.

## Versões

Siga [SemVer](https://semver.org/lang/pt-BR/). Atualize o `CHANGELOG.md` e o `<Version>` em `desktop/Kuarq.Desktop.csproj`. Publique a release com o pacote gerado por `.\scripts\build.ps1 -Zip`.
