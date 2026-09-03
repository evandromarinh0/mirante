/**
 * Gera os ativos estáticos de marca a partir dos tokens: o PNG de fallback do
 * ícone e o cartão de Open Graph.
 *
 * Roda à mão, e o resultado é versionado. Isso é decisão, não preguiça:
 *
 * - **Determinístico.** O mesmo comando produz o mesmo arquivo, e o build não
 *   depende de rede nem de fonte baixada em tempo de execução.
 * - **Sem `next/og`.** Ele exigiria o binário da fonte em `ArrayBuffer`, e o
 *   `next/font` baixa e renomeia com hash — sobraria versionar um `.ttf` de
 *   80 KB ou depender do Google Fonts no build. Um PNG de 40 KB versionado
 *   custa menos e não pode falhar em produção.
 * - **Sem captura de tela do produto**, que envelheceria a cada deploy.
 *
 *   npm run assets
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const OUT = 'src/app';

/** Os mesmos valores de src/styles/tokens.css. */
const TOKEN = {
  ground: '#fbf9f5',
  ink: '#181611',
  inkSoft: '#55554c',
  brass: '#705223',
  chartInk: '#46423b',
  rule: '#dfdcd7',
};

const MARK = `
  <g fill="none" stroke="${TOKEN.brass}" stroke-width="1.5" stroke-linecap="round">
    <path d="M1.5 16.5h21" />
    <path d="M9 16.5v-4.25h9.5" />
    <path d="M12.25 12.25V9.5" />
    <path d="M15.5 12.25V10.75" />
  </g>`;

/**
 * A linha do cartão é a série real de PETR4 em três meses, normalizada — não um
 * traço decorativo. Vem da fixture versionada, então o cartão mostra a forma de
 * um dado que existiu.
 */
async function seriesPath(width, height) {
  const { series } = JSON.parse(
    await import('node:fs/promises').then((fs) => fs.readFile('src/fixtures/series.json', 'utf8')),
  );
  const candles = series['PETR4:3mo'].candles;
  const closes = candles.map((candle) => candle.close);
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const span = max - min || 1;

  return closes
    .map((close, index) => {
      const x = (index / (closes.length - 1)) * width;
      const y = height - ((close - min) / span) * height;
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
}

const browser = await chromium.launch();
mkdirSync(OUT, { recursive: true });

// ---- Ícone de fallback: o Safari não garante favicon em SVG ----
{
  const page = await browser.newPage({ viewport: { width: 32, height: 32 } });
  await page.setContent(
    `<body style="margin:0;background:transparent">
       <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32">
         <g fill="none" stroke="${TOKEN.brass}" stroke-width="2" stroke-linecap="round">
           <path d="M1.5 16.5h21" />
           <path d="M9 16.5v-4.25h9.5" />
           <path d="M12.25 12.25V9.5" />
           <path d="M15.5 12.25V10.75" />
         </g>
       </svg>
     </body>`,
  );
  const png = await page.screenshot({ omitBackground: true });
  writeFileSync(`${OUT}/icon.png`, png);
  console.log(`  ${OUT}/icon.png · ${png.length} bytes`);
  await page.close();
}

// ---- Cartão de Open Graph: papel, wordmark, uma linha de série ----
{
  const width = 1200;
  const height = 630;
  const page = await browser.newPage({ viewport: { width, height } });
  const path = await seriesPath(width, 150);

  await page.setContent(
    `<!doctype html>
     <html lang="pt-BR">
       <head>
         <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500&family=IBM+Plex+Mono:wght@400&display=swap">
         <style>
           * { box-sizing: border-box; margin: 0; }
           body {
             width: ${width}px; height: ${height}px;
             background: ${TOKEN.ground};
             font-family: 'IBM Plex Sans', sans-serif;
             color: ${TOKEN.ink};
             padding: 84px 84px 0;
             display: flex; flex-direction: column;
             position: relative; overflow: hidden;
           }
           .brand { display: flex; align-items: center; gap: 18px; }
           .brand svg { width: 56px; height: 56px; }
           .brand span { font-size: 46px; font-weight: 500; letter-spacing: -0.02em; }
           h1 {
             margin-top: 40px; font-size: 62px; font-weight: 500;
             letter-spacing: -0.03em; line-height: 1.08; max-width: 20ch;
           }
           p {
             margin-top: 26px; font-size: 27px; color: ${TOKEN.inkSoft};
             max-width: 44ch; line-height: 1.45;
           }
           .stamp {
             /* Acima da régua: a faixa da série fica limpa. */
             position: absolute; left: 84px; bottom: 186px;
             font-family: 'IBM Plex Mono', monospace; font-size: 19px;
             letter-spacing: 0.1em; text-transform: uppercase; color: ${TOKEN.inkSoft};
           }
           .series { position: absolute; left: 0; right: 0; bottom: 0; height: 150px; }
           .rule { position: absolute; left: 0; right: 0; bottom: 150px; height: 1px; background: ${TOKEN.rule}; }
         </style>
       </head>
       <body>
         <div class="brand">
           <svg viewBox="0 0 24 24" fill="none">${MARK}</svg>
           <span>Mirante</span>
         </div>
         <h1>Um lugar de onde se olha o mercado</h1>
         <p>Ações e fundos imobiliários da B3, sem cadastro.</p>
         <div class="stamp">Projeto pessoal independente</div>
         <div class="rule"></div>
         <svg class="series" viewBox="0 0 ${width} 150" preserveAspectRatio="none" fill="none">
           <path d="${path}" stroke="${TOKEN.chartInk}" stroke-width="2" stroke-opacity="0.5" />
         </svg>
       </body>
     </html>`,
    { waitUntil: 'load' },
  );
  await page.waitForFunction(() => document.fonts.ready.then(() => true));

  const png = await page.screenshot();
  writeFileSync(`${OUT}/opengraph-image.png`, png);
  console.log(`  ${OUT}/opengraph-image.png · ${png.length} bytes`);
  await page.close();
}

await browser.close();
