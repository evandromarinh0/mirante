/**
 * Identidade do site. A URL vem do ambiente porque não há domínio ainda
 * (portfólio, docs/decisions/0009): trocar depois é virar a variável.
 */
export const site = {
  name: 'Mirante',
  tagline: 'Um lugar de onde se olha o mercado brasileiro',
  description:
    'Acompanhe ações e fundos imobiliários da B3 sem cadastro: veja o mercado do dia, o histórico de um ativo e monte uma lista para acompanhar.',
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
  locale: 'pt_BR',
  indexable: process.env.SITE_INDEXABLE === 'true',
  /** Obrigatório em toda página, no README e no card do portfólio. */
  disclaimer:
    'Projeto pessoal independente, sem vínculo com qualquer empresa. Dados de API pública, com atraso. Nada aqui é recomendação de investimento.',
} as const;
