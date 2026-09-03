import type { Result, ProviderId } from './result';
import type { HistoryRange, Instrument, Series } from './types';

/**
 * A fronteira do produto com o mundo.
 *
 * **Duas operações, e isso é decisão, não omissão.** A spec original previa
 * `getQuotes(symbols[])` e `getQuote(symbol)`; a Etapa 0 mostrou que a fonte
 * aceita um ativo por requisição, e que a listagem do universo já devolve
 * preço, variação e volume de todos os ativos de graça. Então:
 *
 * - lote de cotações não existe na fonte, e não precisa existir aqui: a tela
 *   de lista filtra o universo;
 * - cotação individual seria redundante com a listagem, e custaria cota.
 *
 * Ver docs/decisions/0001 e 0002.
 */
export interface MarketDataProvider {
  readonly id: ProviderId;

  /** Universo de ações e FIIs, com preço e variação do dia. */
  listUniverse(): Promise<Result<readonly Instrument[]>>;

  /** Série histórica de um ativo. É a única operação que consome cota. */
  getHistory(symbol: string, range: HistoryRange): Promise<Result<Series>>;
}

/**
 * Ticker validado antes de sair da aplicação: impede que parâmetro de URL vire
 * caminho arbitrário na chamada externa ou envenene a chave de cache.
 *
 * **Formato derivado do dado real**, não suposto. Classificados os 1.120 ativos
 * do universo por forma, um ticker da B3 é:
 *
 *     raiz de 4 caracteres, começando por letra, podendo conter dígito
 *     + 1 ou 2 dígitos de classe
 *
 * A versão anterior exigia quatro **letras** na raiz, e por isso rejeitava
 * `B3SA3` — a ação da própria B3 —, além de `B1003` e `P2NB34`. Os três estavam
 * listados na tabela e davam 404 ao serem abertos.
 *
 * O que segue rejeitado, e é intencional enquanto a decisão não vier: os 406
 * tickers com sufixo de mercado fracionário (`F`, `B`, `BF`), e `BRAX`, que a
 * fonte devolve sem dígito de classe.
 */
const SYMBOL_PATTERN = /^[A-Z][A-Z0-9]{3}\d{1,2}$/;

export function isValidSymbol(value: string): boolean {
  return SYMBOL_PATTERN.test(value);
}

export function normalizeSymbol(value: string): string {
  return value.trim().toUpperCase();
}
