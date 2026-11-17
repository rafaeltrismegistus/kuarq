// Verificações do Kuarq sem dependências: rode com `node scripts/check.mjs`.
// 1. Sintaxe de todo JavaScript da interface.
// 2. Todo arquivo referenciado no index.html existe.
// 3. A política de segurança (CSP) não libera nenhum host externo.
// 4. Arquivos de texto em UTF-8 sem BOM.
// 5. Nenhum dado pessoal (arquivo de dados do app) dentro do repositório.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const web = join(root, "web");
const ignored = new Set([".git", "node_modules", "app", "bin", "obj", "dist", "publish"]);
const failures = [];
const fail = (message) => failures.push(message);

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    if (ignored.has(name)) return [];
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}
const files = walk(root);
const rel = (path) => relative(root, path).replaceAll("\\", "/");

for (const file of files.filter((path) => path.endsWith(".js") || path.endsWith(".mjs"))) {
  try {
    execFileSync(process.execPath, ["--check", file], { stdio: "pipe" });
  } catch (error) {
    fail(`Sintaxe inválida em ${rel(file)}:\n${error.stderr?.toString().trim()}`);
  }
}

const index = readFileSync(join(web, "index.html"), "utf8");
for (const [, path] of index.matchAll(/(?:src|href)="([^"#:]+?\.(?:js|css|svg|ico|png|webp))"/g)) {
  if (!existsSync(join(web, path))) fail(`index.html referencia um arquivo inexistente: web/${path}`);
}

const csp = /http-equiv="Content-Security-Policy"\s+content="([^"]+)"/.exec(index)?.[1];
if (!csp) fail("index.html não tem Content-Security-Policy.");
else if (/https?:|\*/.test(csp)) fail(`A CSP libera hosts externos: ${csp}`);

for (const file of files.filter((path) => /\.(js|mjs|css|html|md|cs|xaml|csproj|yml|json)$/.test(path))) {
  const bytes = readFileSync(file);
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) fail(`Arquivo com BOM: ${rel(file)}`);
}

for (const file of files) {
  if (/(^|[\\/])mapas\.json(\.bak)?$|kuarq-\d{4}-\d{2}-\d{2}\.json\.gz$/.test(file)) fail(`Arquivo de dados pessoais no repositório: ${rel(file)}`);
}

if (failures.length) {
  console.error(`✗ ${failures.length} problema(s):\n\n${failures.join("\n\n")}`);
  process.exit(1);
}
console.log(`✓ Kuarq verificado: ${files.filter((path) => path.endsWith(".js")).length} scripts, referências, CSP, codificação e ausência de dados pessoais.`);
