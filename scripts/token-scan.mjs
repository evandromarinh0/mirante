/**
 * Varredura de credencial nos artefatos do cliente.
 *
 * Cobre o erro real: o token vazar por serialização de props de Server
 * Component, ou por alguém renomear a variável com prefixo NEXT_PUBLIC_. Os
 * dois passam por revisão sem serem notados; um grep no build não.
 *
 * Roda no CI depois do build. Sem BRAPI_TOKEN no ambiente, procura só o padrão.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOTS = ['.next/static', '.next/server/app'];
const token = process.env.BRAPI_TOKEN?.trim();

/** Chave da Brapi: 22 caracteres alfanuméricos. */
const SHAPE = /\bBRAPI_TOKEN\s*[:=]\s*['"][A-Za-z0-9]{16,}['"]/;
const PUBLIC_PREFIX = /NEXT_PUBLIC_[A-Z_]*(TOKEN|KEY|SECRET)/;

function* walk(dir) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const entry of entries) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) yield* walk(path);
    else yield path;
  }
}

let found = 0;
let scanned = 0;

for (const root of ROOTS) {
  for (const file of walk(root)) {
    if (!/\.(js|mjs|json|html|txt|rsc)$/.test(file)) continue;
    scanned++;
    const content = readFileSync(file, 'utf8');

    if (token && content.includes(token)) {
      console.error(`CREDENCIAL NO BUILD: ${file}`);
      found++;
      continue;
    }
    if (SHAPE.test(content) || PUBLIC_PREFIX.test(content)) {
      console.error(`padrão de credencial em ${file}`);
      found++;
    }
  }
}

console.log(
  `${found === 0 ? 'ok   ' : 'FALHA'} ${scanned} arquivos varridos${token ? ' (token do ambiente incluído na busca)' : ' (sem token no ambiente: só o padrão)'}`,
);
process.exit(found === 0 ? 0 : 1);
