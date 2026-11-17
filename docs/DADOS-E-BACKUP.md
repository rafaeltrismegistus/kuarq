# Dados e backup

## Onde ficam

| Item | Caminho |
| --- | --- |
| Dados | `%LOCALAPPDATA%\Kuarq\mapas.json` |
| Versão anterior | `%LOCALAPPDATA%\Kuarq\mapas.json.bak` |
| Backups | `Documentos\Kuarq - Backups\` |

Instalações anteriores à troca de nome usam `%LOCALAPPDATA%\Toolkit`. O Kuarq detecta essa pasta e continua usando-a, sem migração manual.

Para usar outra pasta (por exemplo, uma pasta sincronizada por você), defina a variável de ambiente `KUARQ_DATA_DIRECTORY` com um caminho completo. Nesse caso, os backups ficam em `<pasta>\backups`.

## Formato

Um JSON (`version: 1`) com uma lista por módulo. Datas usam `AAAA-MM-DD`, valores em dinheiro são inteiros em **centavos** e imagens são `data:` URLs (webp, png ou jpeg) já reduzidas pelo app. O arquivo tem limite de 64 MB.

## Backups

- **Diário**: criado ao abrir o app e ao salvar, um por dia. Ficam os últimos 30.
- **Manual**: pelo botão **Backups** no rodapé do menu. Ficam até 20.
- **Segurança**: criado automaticamente antes de cada restauração. Ficam até 10.

Para **restaurar**, abra **Backups**, escolha a versão e confirme. O estado atual vira um backup de segurança antes. O backup só é aplicado se passar pela validação de todos os módulos.

## Recuperação manual

Com o Kuarq **fechado**:
1. Faça uma cópia do `mapas.json` atual.
2. Copie o `mapas.json.bak` (ou descompacte um `.json.gz` dos backups) para `mapas.json`.
3. Abra o Kuarq.

## Ao reportar problemas

Nunca anexe seu `mapas.json` ou backups em issues: eles contêm seus dados pessoais. Reproduza o problema com dados fictícios.
