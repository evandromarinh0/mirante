/**
 * Guarda de orçamento de bundle.
 *
 * Sobe o servidor de produção, pede cada rota e soma o gzip dos scripts que o
 * HTML manda o navegador baixar. Medir servindo, e não lendo manifesto, é
 * obrigatório aqui: as telas do Mirante dependem de `searchParams`, então não
 * existe HTML estático para inspecionar — e o Turbopack não gera
 * `app-build-manifest.json`.
 *
 * O teto é maior que o do portfólio (150 KB) por causa da interatividade da
 * tabela e da lista, e ainda assim é apertado — que é o motivo de não entrar
 * biblioteca de gráfico.
 */
import { createServer } from 'node:net';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const PORT = 3210;
const BUDGETS = {
  '/': 175,
  '/lista?ativos=HGLG11': 175,
  '/ativo/PETR4': 175,
};

const SCRIPT_TAG = /<script\b[^>]*src="([^"]+)"[^>]*>/g;

/**
 * A porta tem de estar livre antes de subir.
 *
 * Sem esta checagem, um servidor antigo ainda escutando responde no lugar do
 * nosso, servindo HTML de um build cujos chunks já não existem em disco — e o
 * orçamento passava anunciando 0,0 KB. Portão que passa medindo nada é pior que
 * portão nenhum.
 */
async function assertPortFree() {
  await new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once('error', (error) =>
      reject(
        new Error(
          `porta ${PORT} ocupada (${error.code}). Provavelmente um "next start" órfão de uma execução anterior — encerre-o antes de medir.`,
        ),
      ),
    );
    probe.once('listening', () => probe.close(resolve));
    probe.listen(PORT, '127.0.0.1');
  });
}

await assertPortFree();

const server = spawn('npx', ['next', 'start', '-p', String(PORT)], {
  env: { ...process.env, MARKET_PROVIDER: 'fixture' },
  stdio: 'ignore',
  shell: process.platform === 'win32',
});

/**
 * `kill()` no Windows encerra o `cmd.exe` e deixa o Node filho escutando. Era a
 * origem dos servidores órfãos: cada execução deixava um para trás.
 */
function stopServer() {
  if (process.platform === 'win32' && server.pid) {
    spawnSync('taskkill', ['/pid', String(server.pid), '/T', '/F'], { stdio: 'ignore' });
    return;
  }
  server.kill();
}

async function waitForServer(timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/sobre`);
      if (res.ok) return;
    } catch {
      // ainda subindo
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error('o servidor de produção não respondeu');
}

function gzipKb(sources) {
  let bytes = 0;
  for (const src of new Set(sources)) {
    if (!src.startsWith('/_next/')) continue;
    const file = `.next${src.replace('/_next', '').split('?')[0]}`;
    if (!existsSync(file)) continue;
    bytes += gzipSync(readFileSync(file)).length;
  }
  return bytes / 1024;
}

let failed = false;

try {
  await waitForServer();

  for (const [route, budget] of Object.entries(BUDGETS)) {
    const res = await fetch(`http://127.0.0.1:${PORT}${route}`);
    const html = await res.text();
    const sources = [...html.matchAll(SCRIPT_TAG)]
      .filter(([tag]) => !/noModule/i.test(tag))
      .map(([, src]) => src);

    if (sources.length === 0) {
      console.error(
        `FALHA ${route} — nenhum script no HTML. O servidor respondeu o que era esperado?`,
      );
      failed = true;
      continue;
    }

    const kb = gzipKb(sources);

    if (kb === 0) {
      console.error(
        `FALHA ${route} — ${sources.length} scripts no HTML e nenhum encontrado em .next. Build desatualizado ou servidor de outra origem.`,
      );
      failed = true;
      continue;
    }

    const over = kb > budget;
    if (over) failed = true;
    console.log(
      `${over ? 'FALHA' : 'ok   '} ${route.padEnd(24)} ${kb.toFixed(1)} KB gzip / ${budget} KB`,
    );
  }
} finally {
  stopServer();
}

process.exit(failed ? 1 : 0);
