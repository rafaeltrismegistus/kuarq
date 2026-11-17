# Segurança

## Modelo

O Kuarq é um app local, de um único usuário. Ele não abre portas, não faz requisições de rede e não tem contas. Os dados ficam no perfil do Windows do usuário, protegidos pelas permissões do próprio sistema, e **não são criptografados** pelo app. Quem tem acesso à sua conta do Windows tem acesso aos dados. Use a criptografia de disco do Windows (BitLocker) se precisar de mais proteção.

Defesas da interface:
- **CSP restritiva**: só recursos do próprio app e imagens `data:`. Scripts e estilos inline e hosts externos ficam bloqueados.
- **Mensagens validadas**: o app nativo só atende mensagens vindas de `https://toolkit.localhost` e valida tamanho e formato antes de gravar.
- **Links** abrem no navegador padrão apenas para `http`, `https`, `mailto` ou caminhos locais escolhidos pelo usuário.
- **HTML de notas e descrições** passa por uma sanitização com lista de elementos e atributos permitidos antes de ser exibido.

## Reportar uma vulnerabilidade

Não abra uma issue pública. Use **Security → Report a vulnerability** no GitHub (aviso privado) com a descrição, os passos para reproduzir e a versão afetada. A resposta inicial deve chegar em até 7 dias.
