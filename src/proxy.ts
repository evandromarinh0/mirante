import { NextResponse, type NextRequest } from 'next/server';

/**
 * CSP com nonce por requisição.
 *
 * Fica em `proxy.ts`: no Next 16 a convenção `middleware` está deprecada.
 *
 * Não dá para servir esta política de `next.config.ts`: o App Router entrega
 * conteúdo em streaming e usa **script inline** para encaixar cada trecho no
 * lugar. Uma CSP estática com `script-src 'self'` bloqueia esse script, e o
 * efeito é traiçoeiro — o HTML chega completo, mas o que veio depois do shell
 * fica preso em um `<div hidden>` e a página nunca hidrata. Foi exatamente o que
 * o e2e pegou: 404 sem título visível e botão de acompanhar eternamente
 * desabilitado.
 *
 * Com o nonce no cabeçalho da requisição, o Next assina os próprios scripts, e
 * `strict-dynamic` autoriza os chunks que eles carregam — sem `unsafe-inline`.
 */

function buildCsp(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    // next/font injeta estilo inline; não há como assiná-lo por nonce.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    // O cliente nunca fala com a fonte de mercado: a leitura é no servidor.
    "connect-src 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "object-src 'none'",
    'upgrade-insecure-requests',
  ].join('; ');
}

export default function proxy(request: NextRequest) {
  const nonce = crypto.randomUUID();
  const csp = buildCsp(nonce);

  const headers = new Headers(request.headers);
  headers.set('x-nonce', nonce);
  // O Next lê esta política da requisição para aplicar o nonce nos scripts.
  headers.set('Content-Security-Policy', csp);

  const response = NextResponse.next({ request: { headers } });
  response.headers.set('Content-Security-Policy', csp);
  return response;
}

export const config = {
  // Ativo estático e imagem não precisam de política com nonce.
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
