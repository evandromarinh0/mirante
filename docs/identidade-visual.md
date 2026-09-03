# Mirante — identidade visual

Especificação da identidade do Mirante. A decisão está registrada no
repositório do portfólio, em `docs/decisions/0005`; este documento migrou para
cá com o projeto, e é a fonte de `src/styles/tokens.css`.

**Status:** aprovado e implementado no tema claro. Os valores do tema escuro
seguem especificados e medidos, mas fora do `tokens.css` enquanto não houver
seletor de tema.

---

## 0. A regra

**Instrumento de observação, não painel de operação.** Um mirante é elevação,
horizonte e vista clara: sobe-se, olha-se longe, entende-se onde as coisas
estão. Não se opera de um mirante.

Toda escolha abaixo é derivada disso, e é assim que se resolve dúvida futura:
se um elemento sugere agir sobre o mercado — urgência, alerta, ganho, botão
grande de ação — ele está errado por conceito, antes de ser questão de gosto.

---

## 1. Tradução do conceito

| Conceito             | Consequência visual                                                        |
| -------------------- | -------------------------------------------------------------------------- |
| Elevação             | Hierarquia por posição e régua, não por sombra e cartão flutuante          |
| Horizonte            | Linhas horizontais finas organizam a página; nada de moldura fechada       |
| Vista clara          | Fundo de papel, tinta escura, croma baixo. Cor é informação, não decoração |
| Luneta, instrumento  | Acento de latão dessaturado; metal envelhecido, não metálico brilhante     |
| Observar, não operar | Sem CTA de ação, sem urgência, sem cor de alerta na interface              |

---

## 2. Cor

Herda a estrutura de tokens do portfólio (OKLCH, dois temas, papel neutro
quente) e troca o acento. **Nomes de token idênticos aos do portfólio** — o que
muda é o valor, então componente migrado entre os dois projetos não precisa de
renomeação.

### Tema claro

```css
:root {
  --color-bg: oklch(98.2% 0.006 80);
  --color-bg-subtle: oklch(96% 0.008 80);
  --color-surface: oklch(99.6% 0.003 80);
  --color-border: oklch(89.5% 0.008 80);
  --color-border-strong: oklch(60% 0.01 80);

  --color-text: oklch(20% 0.01 80);
  --color-text-secondary: oklch(44% 0.01 80);
  --color-text-muted: oklch(52% 0.008 80);

  /* Latão: acento de interface. Não entra em célula de dado. */
  --color-accent: oklch(46% 0.075 75);
  --color-accent-hover: oklch(40% 0.078 75);
  --color-accent-subtle: oklch(94% 0.03 78);
  --color-on-accent: oklch(99% 0.004 80);
  --color-ring: oklch(46% 0.075 75);

  /* Semântica de mercado: reservada. Não entra em elemento de interface. */
  --color-positive: oklch(48% 0.1 155);
  --color-negative: oklch(50% 0.15 25);

  /* Gráfico. A tinta da série única não é verde nem vermelha: direção se lê
     no rótulo, não na cor da linha. */
  --color-chart-ink: oklch(38% 0.012 80);
  --color-chart-grid: oklch(92.5% 0.007 80);
  --color-chart-1: oklch(46% 0.075 75);
  --color-chart-2: oklch(45% 0.1 250);
  --color-chart-3: oklch(48% 0.11 330);
  --color-chart-4: oklch(46% 0.07 195);
}
```

### Tema escuro — especificado, não implementado no V1

A spec técnica §4 deixa o seletor de tema fora do V1: o produto nasce com **um
tema só, bem resolvido**, e esse tema é o claro — papel e tinta é a leitura do
conceito, e é o que serve a quem abre a tabela durante o pregão.

Os valores abaixo ficam medidos e registrados de qualquer forma, para que ligar
o tema depois seja configuração e não redesenho. Enquanto o seletor não
existir, este bloco não entra no `tokens.css` — token sem uso é código morto.

```css
[data-theme='dark'] {
  --color-bg: oklch(16.5% 0.006 80);
  --color-bg-subtle: oklch(19.5% 0.007 80);
  --color-surface: oklch(21.5% 0.008 80);
  --color-border: oklch(27.5% 0.009 80);
  --color-border-strong: oklch(55% 0.01 80);

  --color-text: oklch(94% 0.005 80);
  --color-text-secondary: oklch(72% 0.008 80);
  --color-text-muted: oklch(61% 0.008 80);

  --color-accent: oklch(78% 0.09 80);
  --color-accent-hover: oklch(85% 0.075 80);
  --color-accent-subtle: oklch(26% 0.035 80);
  --color-on-accent: oklch(16.5% 0.006 80);
  --color-ring: oklch(78% 0.09 80);

  --color-positive: oklch(74% 0.12 155);
  --color-negative: oklch(70% 0.14 25);

  --color-chart-ink: oklch(86% 0.008 80);
  --color-chart-grid: oklch(25.5% 0.008 80);
  --color-chart-1: oklch(78% 0.09 80);
  --color-chart-2: oklch(72% 0.1 250);
  --color-chart-3: oklch(74% 0.11 330);
  --color-chart-4: oklch(74% 0.07 195);
}
```

### As três regras de uso, que importam mais que os valores

1. **Território.** Acento vive na cromia de interface: cabeçalho, link, foco,
   botão, aba ativa, coluna ordenada. `positive` e `negative` vivem em valor de
   variação. Nenhum dos dois cruza. É o que impede o produto de virar o mesmo
   dashboard de todos, em que tudo é verde e vermelho.
2. **Cor nunca sozinha.** Alta e baixa levam sinal (`+` / `−`) e seta junto do
   número, sempre. Cor sozinha falha em daltonismo, falha impressa, falha em
   captura em escala de cinza — e é obrigação do WCAG 1.4.1.
3. **Croma baixo é a assinatura.** Nenhum token passa de 0.15 de croma. Neon é
   o que faz dashboard financeiro parecer cassino.

### Medição

Pior caso contra `bg`, `bg-subtle` e `surface`, mesma matemática de
`scripts/contrast.mjs`:

| Token            | Claro | Escuro | Mínimo | Papel                    |
| ---------------- | ----- | ------ | ------ | ------------------------ |
| `text`           | 16.08 | 14.74  | 4.5    | Texto                    |
| `text-secondary` | 6.92  | 7.07   | 4.5    | Texto                    |
| `text-muted`     | 4.93  | 4.65   | 4.5    | Texto                    |
| `accent`         | 6.40  | 8.69   | 4.5    | Link e texto sobre fundo |
| `accent-hover`   | 8.27  | 11.05  | 4.5    | Link em hover            |
| `positive`       | 5.52  | 7.99   | 4.5    | Número                   |
| `negative`       | 5.76  | 6.18   | 4.5    | Número                   |
| `border-strong`  | 3.50  | 3.62   | 3      | Limite de controle       |
| `chart-ink`      | 8.88  | 11.44  | 3      | Linha do gráfico         |
| `chart-2`        | 6.59  | 7.10   | 3      | Série de comparação      |
| `chart-3`        | 6.19  | 7.24   | 3      | Série de comparação      |
| `chart-4`        | 6.13  | 7.83   | 3      | Série de comparação      |

`chart-grid` fica em 1.11 e é deliberadamente decorativo: régua de grade não
carrega informação — rótulo de eixo carrega, e rótulo usa `text-muted`.

**`chart-1` a `chart-4` são reserva, não V1.** O V1 tem uma série por gráfico,
desenhada em `chart-ink`; comparação de múltiplos ativos está fora do escopo
(spec técnica §4). As quatro cores ficam especificadas aqui porque paleta
categórica escolhida às pressas é como se produz gráfico ilegível — mas só
entram no `tokens.css` no dia em que houver mais de uma série.

Quando entrarem: as quatro são quase isoluminantes entre si (razão ~1.05 no
claro). Isso é intencional, para que nenhuma série domine visualmente, e é
exatamente o motivo de **série se distinguir por traço e rótulo direto, nunca
por cor**: contínuo, tracejado longo, pontilhado, tracejado curto, com o rótulo
na ponta da linha em vez de legenda separada.

---

## 3. Tipografia

**IBM Plex Sans + IBM Plex Mono**, self-hosted por `next/font`. Sem serifa: a
serifa editorial é a voz do portfólio, e o Mirante é ferramenta de leitura de
números.

Plex foi desenhado para contexto técnico, tem figuras tabulares reais e zero
cortado no mono — o que resolve dois problemas de tabela de cotação sem
gambiarra de CSS.

| Papel                                   | Fonte     | Detalhe                                     |
| --------------------------------------- | --------- | ------------------------------------------- |
| Texto de interface, títulos             | Plex Sans | `--tracking-tight` a partir de `--text-2xl` |
| Todo valor numérico                     | Plex Sans | `font-variant-numeric: tabular-nums`        |
| Ticker, carimbo de hora, rótulo de eixo | Plex Mono | Caixa alta, `--tracking-wide`, `--text-2xs` |
| Código no case study                    | Plex Mono | —                                           |

Regras:

- **`tabular-nums` em todo número, sem exceção.** Dígito que dança a cada
  revalidação é falha de ofício em produto financeiro.
- Ticker é sempre mono e sempre caixa alta: fica identificável como código, não
  como palavra.
- Escala herdada do portfólio, com o topo cortado: `--text-display` não existe
  no Mirante. O maior tipo da tela é o preço no detalhe do ativo, em
  `--text-3xl`. Número gigante sem contexto é anti-padrão declarado.
- Nada de versalete falso, nada de peso 800. Pesos: 400, 500 e 600.

---

## 4. Densidade e layout

Densidade é a qualidade percebida de uma ferramenta. Tokens próprios, porque o
portfólio é editorial e respirado — aqui é o contrário.

```css
:root {
  --row-height: 2.375rem; /* linha de tabela; 2.75rem em ponteiro grosso */
  --cell-padding-x: 0.75rem;
  --rule-width: 1px;
  --gutter: clamp(1rem, 3vw, 2rem); /* portfólio: até 3rem */
  --space-section: clamp(2rem, 5vw, 3.5rem); /* portfólio: até 8rem */
  --width-container: 84rem; /* portfólio: 72rem — tabela quer largura */
}
```

- **Réguas horizontais, não cartões.** A tabela é separada por linha de 1px em
  `--color-border`: sem zebra, sem borda vertical, sem sombra. Zebra compete com
  a cor do dado.
- **Elevação quase inexistente.** `--shadow-sm` sobrevive apenas em popover e
  tooltip, que precisam se separar do fundo. Nada mais tem sombra.
- **Raio pequeno**: `--radius-sm` em controle, `--radius-md` no máximo. Nada de
  pílula.
- **Alinhamento numérico**: número à direita, texto à esquerda, cabeçalho
  alinhado com a própria coluna. Regra chata, e imediatamente perceptível
  quando ausente.
- Alvo de toque mínimo de 44px onde o ponteiro é grosso, o que é o motivo de
  `--row-height` ter variante: densidade não pode custar acessibilidade.

---

## 5. Marca

**Wordmark:** `Mirante` em Plex Sans 500, `--tracking-tight`, caixa mista. Sem
sufixo, sem ".app", sem slogan colado.

**Símbolo:** um traço de horizonte com uma plataforma elevada em voadiço à
direita — a silhueta de um mirante reduzida ao mínimo. Desenhado em caixa
24×24, traço de 1.5px, `currentColor`, sem preenchimento e sem contorno de
caixa. Em 16px (favicon) a plataforma vira um único degrau: horizonte mais
elevação, nada mais.

O símbolo nunca aparece dentro de um quadrado colorido, e nunca em gradiente.

**Cartão de OG:** fundo `--color-bg`, wordmark, uma linha de descrição em
`--color-text-secondary`, e uma linha de série atravessando o terço inferior em
`--color-chart-ink`. Sem captura de tela do produto — captura envelhece a cada
deploy.

---

## 6. Gráfico

O estilo é parte da identidade, não detalhe de implementação:

- Traço de 1.5px, junção arredondada, sem sombra, sem gradiente.
- **Sem preenchimento de área na comparação** — quatro áreas sobrepostas viram
  sopa. Na série única, área opcional em `--color-chart-ink` a 6% de opacidade,
  só para dar peso ao traço.
- Grade horizontal apenas, em `--color-chart-grid`, no máximo cinco linhas. Sem
  grade vertical.
- Crosshair de 1px tracejado em `--color-border-strong`, com o valor lido em
  mono junto do eixo.
- Ponto marcado só no hover ou no foco — nunca um marcador por observação.
- Escala de preço não começa forçada em zero, e o eixo diz isso.

---

## 7. Movimento

- Duração máxima de 200ms. `--ease-out` na entrada, sem bounce.
- **Dado que muda nunca anima posição.** Revalidação troca o número e pisca
  discretamente o carimbo "atualizado há X"; o número em si não desliza, não
  conta e não escurece. Número animado em tabela financeira parece bug.
- Gráfico não tem animação de desenho na primeira pintura. Ela custa 400ms de
  atenção e comunica "apresentação", não "instrumento".
- `prefers-reduced-motion: reduce` remove toda transição não essencial, o que
  neste produto é praticamente todas.

---

## 8. Iconografia

Conjunto próprio e mínimo: ordenar, buscar, limpar filtro, adicionar à lista,
seta de variação, aviso de fallback. Traço de 1.5px, caixa 20×20,
`currentColor`, sem preenchimento — coerente com o símbolo.

Ícone nunca é o único portador de significado: sempre par com texto ou
`aria-label`. Sem biblioteca de ícones: seis a oito SVG inline custam menos que
qualquer pacote e não trazem 300 ícones que não usamos.

---

## 9. Proibido, por nome

Azul-marinho de fintech · glassmorphism · verde neon · gradiente roxo · hero com
candlestick decorativo · moeda ou cofre em 3D · número gigante sem contexto ·
foguete, seta "to the moon", emoji de dinheiro · confete · contador animado ·
zebra em tabela · cartão com sombra dentro de cartão com sombra · ilustração
isométrica de pessoa investindo · gráfico de fundo puramente decorativo.

A lista existe porque proibição vaga ("sem cara de fintech") não sobrevive ao
momento da implementação.

---

## 10. Como se distingue do portfólio

| Dimensão    | Portfólio                   | Mirante                           |
| ----------- | --------------------------- | --------------------------------- |
| Acento      | Petróleo/teal (hue 205)     | Latão (hue 75–80)                 |
| Tipografia  | Inter + Source Serif + Mono | Plex Sans + Plex Mono, sem serifa |
| Densidade   | Editorial, respirada        | Instrumento, apertada             |
| Contêiner   | 72rem                       | 84rem                             |
| Maior tipo  | `--text-display`            | `--text-3xl`                      |
| Cor de dado | Herdada, quase não usada    | Reservada e central               |

Abertos lado a lado, ninguém confunde os dois — que é o requisito, porque o
Mirante precisa ler como produto independente e não como página do portfólio.

---

## 11. Verificação

O Mirante herda os portões do portfólio, e dois deles cobrem esta página:

- `npm run contrast` — audita todas as combinações que o sistema permite, não
  só as que a página renderiza, e cobre os dois temas mesmo com um só no ar.
  Alterou token de cor, roda.
- axe em todas as rotas, no tema publicado, desktop e mobile.
- Passe manual: captura da visão de mercado em escala de cinza. Se alta e baixa
  deixarem de ser distinguíveis, a regra 2 da seção 2 foi violada em algum
  lugar.
