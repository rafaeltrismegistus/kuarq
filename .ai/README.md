# Diretrizes — Kuarq

Entrada: [AGENTS](../AGENTS.md). Cada assunto tem um único lugar; os outros arquivos apontam para ele em vez de repetir.

| Assunto | Fonte |
|---|---|
| O que não muda (produto, stack, decisões) | [CONTEXT](CONTEXT.md) |
| Estado atual, limites e próximas ações | [CURRENT](CURRENT.md) |
| Mapa do código | [STRUCTURE](STRUCTURE.md) |
| Qualidade, testes e Git | [QUALIDADE](rules/QUALIDADE.md) |
| Interface, componentes e temas | [INTERFACE](rules/INTERFACE.md) |
| Dados, compatibilidade e backup | [DADOS](rules/DADOS.md) |
| Segurança e privacidade | [SEGURANCA](rules/SEGURANCA.md) |
| Evidência de cada entrega | [Modelo de validação](templates/VALIDACAO.md) |
| Planos de mudanças grandes | [plans/](plans/) |
| Contratos implementados | [Arquitetura](../docs/ARQUITETURA.md), [Dados e backup](../docs/DADOS-E-BACKUP.md), [Módulos](../docs/MODULOS.md) |
| Fluxo de contribuição | [CONTRIBUTING](../CONTRIBUTING.md) |

## Leitura por escopo

1. Sempre: AGENTS, CONTEXT, CURRENT e QUALIDADE.
2. Tela, componente, estilo ou tema: INTERFACE.
3. Formato de dados, `validate`, backup ou instalação: DADOS.
4. App nativo, mensagens do host, links, HTML de usuário ou CSP: SEGURANCA.
5. Mudança ampla ou arriscada: escreva um plano em `plans/AAAA-MM-DD-assunto.md` antes de editar.

Não é preciso ler todos os módulos nem todas as regras para um ajuste pequeno. Leia o que o escopo pede.

## Onde registrar o quê

- `CONTEXT.md`: verdades duradouras. Muda raramente.
- `CURRENT.md`: foco, branch, versão instalada e pendências. Atualize ao terminar uma entrega relevante.
- `STRUCTURE.md`: responsabilidade de cada arquivo. Atualize ao criar, remover ou dividir arquivos.
- `docs/`: contrato implementado, para quem usa ou contribui.
- `rules/`: critérios de engenharia.
- `plans/`: riscos, sequência e validação de mudanças grandes. Depois de concluído, o plano fica como histórico.

O Git guarda o diff; não copie código nem documentação inteira para cá.
