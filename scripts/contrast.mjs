/**
 * Auditoria de contraste dos tokens.
 *
 * Lê os valores reais de src/styles/tokens.css, rasteriza cada cor no canvas do
 * Chromium (o valor computado do CSS permanece em oklch, então ler style.color
 * não resolve) e verifica cada par texto/fundo contra o mínimo do WCAG.
 *
 * Complementa o axe: o axe só vê o que a página realmente renderiza, este
 * verifica todas as combinações que o design system permite.
 */
import { readFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const TOKENS_FILE = 'src/styles/tokens.css';
const BACKGROUNDS = ['--color-bg', '--color-bg-subtle', '--color-surface'];
const TEXT_ON_BG = [
  ['--color-text', 4.5],
  ['--color-text-secondary', 4.5],
  ['--color-text-muted', 4.5],
  ['--color-accent', 4.5],
  ['--color-positive', 4.5],
  ['--color-negative', 4.5],
  // Bordas, ícones e traço de gráfico são componentes de interface: mínimo 3:1.
  ['--color-border-strong', 3],
  ['--color-chart-ink', 3],
];

/** Extrai os tokens de cor de cada bloco de tema do arquivo. */
function readThemes() {
  const css = readFileSync(TOKENS_FILE, 'utf8');
  const light = {};
  const dark = {};

  const darkStart = css.indexOf("[data-theme='dark']");
  const hasDark = darkStart !== -1;
  const darkEnd = hasDark ? css.indexOf('}', darkStart) : -1;

  for (const match of css.matchAll(/(--color-[\w-]+):\s*(oklch\([^)]+\))/g)) {
    const [, name, value] = match;
    const target = hasDark && match.index > darkStart && match.index < darkEnd ? dark : light;
    target[name] = value;
  }

  // Tema sem tokens não entra no relatório: o Mirante tem um só.
  return hasDark ? { light, dark } : { light };
}

function luminance([r, g, b]) {
  const lin = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

function ratio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();
await page.setContent('<canvas id="c" width="1" height="1"></canvas>');

const toRgb = (color) =>
  page.evaluate((c) => {
    const ctx = document.getElementById('c').getContext('2d', { colorSpace: 'srgb' });
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = c;
    ctx.fillRect(0, 0, 1, 1);
    return Array.from(ctx.getImageData(0, 0, 1, 1).data).slice(0, 3);
  }, color);

const themes = readThemes();
let failures = 0;

for (const [themeName, tokens] of Object.entries(themes)) {
  console.log(`\n${themeName}`);

  for (const [fgToken, minimum] of TEXT_ON_BG) {
    if (!tokens[fgToken]) continue;
    const fg = await toRgb(tokens[fgToken]);

    const results = [];
    for (const bgToken of BACKGROUNDS) {
      if (!tokens[bgToken]) continue;
      results.push(ratio(fg, await toRgb(tokens[bgToken])));
    }

    const worst = Math.min(...results);
    const ok = worst >= minimum;
    if (!ok) failures += 1;

    console.log(
      `  ${ok ? 'ok  ' : 'FAIL'} ${fgToken.padEnd(24)} ${worst.toFixed(2)}:1 (min ${minimum})`,
    );
  }
}

await browser.close();

if (failures > 0) {
  console.error(`\n${failures} par(es) de tokens abaixo do mínimo WCAG.`);
  process.exit(1);
}
console.log('\nTodos os pares de tokens passam.');
