# Dados, compatibilidade e backup

Vale ao mudar o formato do `workspace`, um `validate`, o salvamento, os backups ou a instalação. Contrato completo em [Dados e backup](../../docs/DADOS-E-BACKUP.md).

## Compatibilidade

- Campos novos são opcionais. O `validate` de cada módulo aceita dados ausentes e o formato anterior.
- Formato antigo é convertido ao carregar, com um comentário dizendo de qual formato veio (ex.: projetos `paused`). Essas conversões não são "código velho": ficam enquanto puder existir um arquivo antigo.
- Um dado inválido nunca substitui um arquivo bom. Na dúvida, recuse e mostre a mensagem.
- Nomes antigos que fazem parte do contrato (`toolkit.localhost`, pasta `%LOCALAPPDATA%\Toolkit`, `mapas.json`) não mudam.

## Dados do usuário

- Nenhum dado do usuário é apagado sem cópia de segurança antes.
- Antes de instalar um build no computador do responsável: copie o `mapas.json` para `mapas.backup-antes-<assunto>-<data>.json`, feche o Kuarq e só então troque `desktop/app`.
- `mapas.json`, `.bak` e backups nunca vão para o repositório, issue, captura ou teste. Exemplos e testes usam dados fictícios.

## Tamanho

- Dinheiro em centavos inteiros; datas civis em `AAAA-MM-DD`, sem converter para UTC.
- Imagens entram reduzidas, como `data:` URL. O arquivo tem limite de 64 MB; avalie o crescimento antes de guardar algo pesado.
