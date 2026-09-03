import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * A indexação é uma variável de ambiente, e virar essa variável tem consequência
 * que não aparece na hora: o sitemap anuncia mais de mil páginas de detalhe, e
 * cada uma custa cota da fonte. Recortar o sitemap é trabalho de outra etapa —
 * até lá, o que precisa estar garantido é que **nada indexa por acidente**.
 *
 * Estes testes travam o contrato: só a string exata `'true'` libera, e a
 * ausência da variável nunca libera. Cada caso abaixo é um jeito plausível de
 * alguém preencher o campo no painel de deploy achando que desligou.
 */

afterEach(() => {
  vi.resetModules();
  delete process.env.SITE_INDEXABLE;
});

async function loadSite(value?: string) {
  vi.resetModules();
  if (value === undefined) delete process.env.SITE_INDEXABLE;
  else process.env.SITE_INDEXABLE = value;
  return (await import('@/lib/site')).site;
}

describe('SITE_INDEXABLE é seguro por padrão', () => {
  it('sem a variável, o site não é indexável', async () => {
    expect((await loadSite(undefined)).indexable).toBe(false);
  });

  it.each(['', 'false', 'FALSE', 'no', '0', 'TRUE', 'True', ' true', '1', 'yes'])(
    'o valor %o não libera indexação',
    async (value) => {
      expect((await loadSite(value)).indexable).toBe(false);
    },
  );

  it('só a string exata "true" libera', async () => {
    expect((await loadSite('true')).indexable).toBe(true);
  });
});

describe('robots segue o mesmo interruptor', () => {
  it('bloqueia tudo quando não é indexável, e não anuncia sitemap', async () => {
    await loadSite('false');
    const robots = (await import('@/app/robots')).default();

    expect(robots.rules).toEqual([{ userAgent: '*', disallow: '/' }]);
    expect(robots.sitemap).toBeUndefined();
  });

  it('libera e anuncia o sitemap só quando indexável', async () => {
    await loadSite('true');
    const robots = (await import('@/app/robots')).default();

    expect(robots.rules).toEqual([{ userAgent: '*', allow: '/' }]);
    expect(robots.sitemap).toContain('/sitemap.xml');
  });
});
