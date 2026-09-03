# Mirante

A public, no-signup tool for watching Brazilian stocks and REITs (FIIs) on the
B3 exchange: see how the market closed, open one asset to understand how it
behaved, and keep a short list of what matters — stored in your browser and
shareable by link.

**Independent personal project. No affiliation with any company.** Data comes
from a public API and is delayed. Nothing here is investment advice.

The product interface is in Portuguese, because its users are Brazilian. This
README and the case study are in English, and so is all the code. That split is
a recorded decision, not an accident.

> The name sets the scope. A _mirante_ is a lookout — a place you observe from.
> You don't trade, hold, or get advice from a lookout.

## Stack

| Layer      | Choice                                              |
| ---------- | --------------------------------------------------- |
| Framework  | Next.js 16 (App Router, React Server Components)    |
| Language   | TypeScript, strict plus `noUncheckedIndexedAccess`  |
| Styling    | Tailwind CSS v4 over CSS custom properties          |
| Validation | Zod at the network boundary                         |
| Charts     | Hand-written SVG (planned) — no charting library    |
| Testing    | Vitest + Testing Library · Playwright + axe-core    |
| Quality    | ESLint (`next` + `jsx-a11y` strict) · Prettier · CI |

## Architecture: one direction only

```
UI (pages, components)
  ↓  reads through
service layer            src/lib/services/market-service.ts
  ↓  talks to
MarketDataProvider       src/lib/market/provider.ts
  ↓  implemented by
brapi | fixture | snapshot   src/lib/market/providers/
```

Three rules hold this together, and **ESLint enforces all three** — a boundary
that only exists in a code review is not a boundary:

1. No page or component may import a provider. Data reaches the UI through the
   service layer, and reaches components as props.
2. No component may import the service layer either. Server Components fetch;
   components render what they are given.
3. Nothing outside `src/lib/market/providers/` knows the vendor exists. Vendor
   field names die in the mappers: `Instrument`, `Quote` and `Candle` are ours.

The payoff is concrete. Swapping the data source is a config change, tests and
previews run without network or API quota, and the API failing in production
degrades to a versioned snapshot instead of an error screen.

### Expected failure is a value, not an exception

```ts
type Result<T> =
  | { ok: true; data: T; origin: DataOrigin }
  | {
      ok: false;
      reason: 'unavailable' | 'rate-limited' | 'quota-exhausted' | 'not-found' | 'invalid-symbol';
    };
```

Only bugs throw. Every screen receives either data with provenance, or a reason
it knows how to draw. `DataOrigin` carries which provider answered, when, and
whether it is fallback — that is what makes the state catalogue possible.

### Two methods, and that is the decision

`MarketDataProvider` exposes `listUniverse()` and `getHistory()`. It has no
batch-quote and no single-quote method, because measuring the API showed the
free tier accepts one asset per request while the universe listing returns
price, change and volume for every asset at no quota cost. So the market table,
the watchlist and the price on the detail page all come from one free call, and
the only quota-consuming operation is the historical series. See
`docs/decisions/0001`.

## Commands

```bash
npm run dev            # dev server
npm run verify         # typecheck + lint + format + unit tests + contrast audit
npm run test:e2e       # Playwright + axe, desktop and mobile
npm run build
npm run budget         # fails if first-load JS exceeds the budget
npm run token-scan     # fails if a credential reached the client bundle
npm run snapshot       # re-capture the versioned universe snapshot (needs a token)
```

`npm run test:e2e` needs browsers: `npm run test:e2e:install`.

## Configuration

Copy `.env.example` to `.env.local`.

| Variable               | Meaning                                                         |
| ---------------------- | --------------------------------------------------------------- |
| `BRAPI_TOKEN`          | Server-only. Never `NEXT_PUBLIC_`, never committed.             |
| `MARKET_PROVIDER`      | `brapi` \| `fixture` \| `snapshot`. Defaults by token presence. |
| `NEXT_PUBLIC_SITE_URL` | Absolute URLs for metadata, canonical, OG and sitemap.          |
| `SITE_INDEXABLE`       | Only `true` allows indexing. Off until there is a domain.       |

Without a token the app runs on `fixture` — real data captured once, so
development and CI need neither network nor quota.

## Security

The threat model is small and worth stating: no users, no personal data, no
writes. What needs protecting is the token and the integrity of what renders.

- **The browser never talks to the data source.** No proxy route, no client
  fetch. Reads happen in Server Components, which is also why quota depends on
  revalidation frequency rather than visitor count.
- **CSP with a per-request nonce** (`src/middleware.ts`), no `unsafe-inline` for
  scripts, no third-party script, font or analytics.
- **Every ticker is validated** against `^[A-Z]{4}\d{1,2}$` before leaving the
  app, so a URL parameter cannot become an arbitrary upstream path or poison a
  cache key.
- **Every response is parsed by Zod** before becoming a domain type.
- `npm run token-scan` greps the built client output for credentials.

## Accessibility

Verified, not promised: axe runs on every route in CI, desktop and mobile, plus
a manual keyboard and screen-reader pass before release.

- Real `<table>` with `<caption>`, `scope` and `aria-sort` on the sorted column.
- Sorting and filtering are links and a `GET` form, so they work with
  JavaScript disabled and produce a shareable URL.
- **Colour never carries meaning alone**: every change shows a sign and an arrow
  next to the value.
- Scrollable regions are keyboard reachable; every number uses `tabular-nums`.
- The historical series ships as a table first — it is the text alternative the
  chart will need anyway, so accessibility is not a retrofit.

## What the free tier does not provide

Measured, not guessed: history is capped at three months, dividends are a paid
feature, and one asset per request. As a consequence a REIT here shows no
dividend yield and no P/BV — the two numbers a REIT investor looks for first.
The product says so on `/sobre` instead of estimating numbers the source never
gave. See `docs/decisions/0002`.
