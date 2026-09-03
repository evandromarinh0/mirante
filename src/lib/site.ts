/**
 * Identidade do site. A URL vem do ambiente porque não há domínio ainda
 * (portfólio, docs/decisions/0009): trocar depois é virar a variável.
 *
 * `SITE_URL` **não** leva o prefixo NEXT_PUBLIC_, e isso é decisão: ela só é
 * lida em metadata, robots e sitemap, que rodam no servidor. Com o prefixo, o
 * valor seria inlinado no bundle do cliente — que nunca precisa dele — e trocar
 * de domínio exigiria rebuild em vez de reiniciar. Compartilhar link é assunto
 * do navegador, e ali quem responde é `window.location.origin`.
 */
export const site = {
  name: 'Mirante',
  tagline: 'Um lugar de onde se olha o mercado brasileiro',
  description:
    'Acompanhe ações e fundos imobiliários da B3 sem cadastro: veja o mercado do dia, o histórico de um ativo e monte uma lista para acompanhar.',
  url: process.env.SITE_URL ?? 'http://localhost:3000',
  locale: 'pt_BR',
  indexable: process.env.SITE_INDEXABLE === 'true',
  /** Obrigatório em toda página, no README e no card do portfólio. */
  disclaimer:
    'Projeto pessoal independente, sem vínculo com qualquer empresa. Dados de API pública, com atraso. Nada aqui é recomendação de investimento.',
} as const;
