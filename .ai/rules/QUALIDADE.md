# Qualidade, testes e Git

Vale para toda feature e correção. Em ajustes só de documentação, rode as verificações afetadas e diga o que ficou de fora.

## Antes de editar

- Entenda o pedido, o resultado esperado e quais telas ou dados são afetados. Reproduza o defeito quando houver um.
- Confira o branch (`git branch --show-current`) e o `git status`. Não descarte nem sobrescreva alterações que não são suas.
- Mudança ampla, de formato de dados ou de arquitetura: plano em `.ai/plans/` com riscos, passos, validação e como voltar atrás.

## Ao implementar

- Resolva o fluxo inteiro dentro do escopo, inclusive erro, vazio e desfazer.
- Reaproveite o que existe (`kit`, classes, tokens). Abstraia só repetição real; não crie camada para necessidade hipotética.
- Remova o que a mudança deixou sem uso: funções, estilos, arquivos e cópias. Nada de "versão antiga" comentada ou duplicada no código; o Git guarda o histórico.
- Não deixe dívida nova conhecida: erro engolido, verificação desligada, cópia divergente de uma função comum ou TODO crítico.
- Achou um defeito antigo relacionado? Corrija se for pequeno. Se for grande, registre em `CURRENT.md` e proponha à parte.

## Pronto quando

1. `node scripts/check.mjs` passa.
2. Mudança em `desktop/` compila com `.\scripts\build.ps1`.
3. O fluxo foi visto funcionando no app ou no navegador: tema claro e escuro, janela larga e estreita (até 720 px) quando houver interface.
4. Dados antigos continuam abrindo (veja [DADOS](DADOS.md)).
5. A entrega diz o que foi testado e o que não foi, no formato do [modelo de validação](../templates/VALIDACAO.md).

CI verde não substitui o item 3.

## Git

- Commits convencionais com resumo em português: `feat(tarefas): …`, `fix(notas): …`, `docs(ai): …`, `refactor(kit): …`.
- Um commit por mudança coerente; não misture refatoração ampla com feature.
- Agentes de IA não aparecem como autores ou coautores: sem `Co-Authored-By`, sem "Generated with" e sem links de sessão.
- Push, PR, merge, tag e release só com autorização explícita do responsável. O branch `local` não é enviado.
