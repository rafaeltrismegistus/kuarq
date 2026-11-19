# Segurança e privacidade

Vale ao mexer no app nativo, nas mensagens do host, em links, arquivos, HTML de usuário ou na CSP. Modelo de ameaça em [SECURITY](../../SECURITY.md).

- **Sem rede**: nada de CDN, fonte externa, telemetria, atualização automática ou host novo na CSP. O `check.mjs` falha se a CSP liberar `http`, `https` ou `*`.
- **Mensagens do host**: só de `https://toolkit.localhost`. Toda ação nova em `MainWindow.xaml.cs` valida tipo e tamanho do que recebe e devolve erro legível.
- **Links**: só `http`, `https`, `mailto` ou caminhos escolhidos pelo usuário. Nada de executar arquivo a partir de texto colado.
- **HTML de usuário**: notas, descrições e briefings passam pela sanitização do `rich-text.js` (lista de elementos e atributos permitidos). Atributos novos, como `data-note`, entram na lista com validação do valor.
- **Texto comum**: sempre por `escape()` antes de ir para `innerHTML`.
- **Sem segredos**: nenhuma chave, token ou caminho pessoal no código, em exemplos ou em capturas.
