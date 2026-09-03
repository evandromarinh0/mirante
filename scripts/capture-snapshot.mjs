/**
 * Captura o snapshot versionado do universo e as séries de fixture.
 *
 * O snapshot é o que sustenta o requisito de nunca mostrar tela de erro: quando
 * a fonte cai ou a cota acaba, é ele que aparece, rotulado como fallback.
 *
 * Roda à mão, com BRAPI_TOKEN no ambiente. Não entra no CI: o CI usa o que
 * está versionado, justamente para não depender de terceiro nem gastar cota.
 *
 *   BRAPI_TOKEN=... npm run snapshot
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const TOKEN = process.env.BRAPI_TOKEN?.trim();
if (!TOKEN) {
  console.error('BRAPI_TOKEN ausente. Nada foi escrito.');
  process.exit(1);
}

const BASE = 'https://brapi.dev/api';
const PAGE_SIZE = 500;

/** Tickers da fixture: mistura de ações líquidas e FIIs de perfis diferentes. */
const FIXTURE_SYMBOLS = ['PETR4', 'VALE3', 'ITUB4', 'HGLG11', 'MXRF11', 'KNRI11'];
const FIXTURE_RANGES = [
  ['3mo', '1d'],
  ['1mo', '1d'],
];

async function get(path) {
  const res = await fetch(`${BASE}${path}`, { headers: { Authorization: `Bearer ${TOKEN}` } });
  const body = await res.json().catch(() => null);
  if (res.status !== 200) {
    throw new Error(`${path} → ${res.status} ${JSON.stringify(body).slice(0, 200)}`);
  }
  return body;
}

function absoluteChange(close, pct) {
  const denominator = 100 + pct;
  return denominator === 0 ? 0 : (close * pct) / denominator;
}

function toInstrument(item) {
  const kind = item.type === 'stock' ? 'stock' : item.subType === 'fii' ? 'reit' : null;
  if (!kind || item.close == null) return null;
  const changePercent = item.change ?? 0;
  return {
    symbol: item.stock,
    name: (item.name ?? '').trim() || item.stock,
    kind,
    price: item.close,
    change: Number(absoluteChange(item.close, changePercent).toFixed(4)),
    changePercent,
    volume: item.volume ?? 0,
    sector: (item.sector ?? '').trim() || null,
  };
}

async function listType(type) {
  const out = [];
  for (let page = 1; page <= 5; page++) {
    const body = await get(`/quote/list?type=${type}&limit=${PAGE_SIZE}&page=${page}`);
    for (const item of body.stocks ?? []) {
      const instrument = toInstrument(item);
      if (instrument) out.push(instrument);
    }
    if (body.hasNextPage !== true) break;
  }
  return out;
}

function write(relativePath, data) {
  const target = join(process.cwd(), relativePath);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  console.log(`  ${relativePath} · ${JSON.stringify(data).length} bytes`);
}

console.log('universo…');
const instruments = [...(await listType('stock')), ...(await listType('fund'))].sort((a, b) =>
  a.symbol.localeCompare(b.symbol),
);
const capturedAt = new Date().toISOString();
write('src/data/universe-snapshot.json', { capturedAt, instruments });

console.log('séries…');
const series = {};
for (const symbol of FIXTURE_SYMBOLS) {
  for (const [range, interval] of FIXTURE_RANGES) {
    const body = await get(`/quote/${symbol}?range=${range}&interval=${interval}`);
    const raw = body.results?.[0]?.historicalDataPrice ?? [];
    series[`${symbol}:${range}`] = {
      symbol,
      range,
      candles: raw
        .filter((c) => c.close != null && c.open != null && c.high != null && c.low != null)
        .map((c) => ({
          date: new Date(c.date * 1000).toISOString(),
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
          volume: c.volume ?? 0,
        })),
    };
  }
}
write('src/fixtures/series.json', { capturedAt, series });

const fixtureUniverse = instruments.filter((i) => FIXTURE_SYMBOLS.includes(i.symbol));
// 60 de preenchimento: a fixture precisa passar de uma página de 50 para que
// a paginação seja exercitada pelo e2e.
const filler = instruments.filter((i) => !FIXTURE_SYMBOLS.includes(i.symbol)).slice(0, 60);
write('src/fixtures/universe.json', {
  capturedAt,
  instruments: [...fixtureUniverse, ...filler].sort((a, b) => a.symbol.localeCompare(b.symbol)),
});

console.log(`\n${instruments.length} ativos no snapshot.`);
