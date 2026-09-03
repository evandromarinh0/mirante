import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/**
 * O que o e2e cobre aqui é comportamento que teste unitário não alcança: a URL
 * ser de verdade a fonte de verdade, a lista sobreviver ao recarregar, o
 * gráfico existir antes do JavaScript, e a página não estourar 320px.
 *
 * Roda com o provider de fixture: sem rede, sem cota, e determinístico.
 */

const ROUTES = ['/', '/lista', '/sobre', '/ativo/PETR4', '/nao-existe'];

test.describe('acessibilidade', () => {
  for (const route of ROUTES) {
    test(`${route} não tem violação detectável pelo axe`, async ({ page }) => {
      await page.goto(route);
      const { violations } = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();
      expect(violations).toEqual([]);
    });
  }

  test('o aviso de não-afiliação aparece em toda página', async ({ page }) => {
    for (const route of ROUTES) {
      await page.goto(route);
      await expect(page.getByTestId('disclaimer')).toContainText('sem vínculo');
    }
  });
});

test.describe('a URL é a fonte de verdade', () => {
  test('filtrar por classe muda a tabela e sobrevive ao recarregar', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'FIIs' }).click();
    await expect(page).toHaveURL(/tipo=fiis/);

    const caption = page.locator('table caption').first();
    await expect(caption).toContainText('ativos');

    await page.reload();
    await expect(page).toHaveURL(/tipo=fiis/);
    await expect(page.getByRole('link', { name: 'FIIs' })).toHaveAttribute('aria-current', 'true');
  });

  test('ordenar por coluna marca aria-sort e entra na URL', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /ordenar por preço/ }).click();
    await expect(page).toHaveURL(/ordem=price/);

    const header = page.getByRole('columnheader', { name: /Preço/ });
    await expect(header).toHaveAttribute('aria-sort', 'descending');
  });

  test('buscar por código leva ao ativo certo', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Buscar por código ou nome').fill('HGLG11');
    await page.getByRole('button', { name: 'Buscar' }).click();

    await expect(page).toHaveURL(/busca=HGLG11/);
    await expect(page.getByRole('link', { name: 'HGLG11' })).toBeVisible();
  });

  test('busca sem resultado diz o motivo e oferece limpar', async ({ page }) => {
    await page.goto('/?busca=ZZZZ9');
    await expect(page.getByText('Nenhum ativo corresponde à busca.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Limpar busca e filtro' })).toBeVisible();
  });

  test('período do histórico vive na URL', async ({ page }) => {
    await page.goto('/ativo/PETR4');
    await page.getByRole('link', { name: '1 mês' }).click();
    await expect(page).toHaveURL(/periodo=1mo/);
    await expect(page.getByRole('img', { name: /Preço de PETR4, 1 mês/ })).toBeVisible();
  });
});

test.describe('lista de acompanhamento', () => {
  test('sobrevive ao recarregar e some ao ser removida', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Acompanhar HGLG11' }).click();

    await page.goto('/lista');
    await expect(page.getByRole('link', { name: 'HGLG11' })).toBeVisible();

    await page.reload();
    await expect(page.getByRole('link', { name: 'HGLG11' })).toBeVisible();

    await page.getByRole('button', { name: 'Acompanhar HGLG11' }).click();
    await page.goto('/lista');
    await expect(page.getByText('Sua lista está vazia.')).toBeVisible();
  });

  test('lista vazia explica o que fazer', async ({ page }) => {
    await page.goto('/lista');
    await expect(page.getByText('Sua lista está vazia.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Ver o mercado' })).toBeVisible();
  });

  test('link compartilhado reproduz a lista de outra pessoa', async ({ page }) => {
    await page.goto('/lista?ativos=MXRF11,KNRI11');
    await expect(page.getByRole('link', { name: 'MXRF11' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'KNRI11' })).toBeVisible();
  });
});

test.describe('gráfico', () => {
  test('aparece no primeiro HTML, antes de qualquer JavaScript', async ({ browser }) => {
    // Gráfico que só existe depois da hidratação é retângulo vazio no primeiro
    // paint. Sem JavaScript, a linha tem de estar lá.
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto('/ativo/PETR4');
    await expect(page.getByRole('img', { name: /Preço de PETR4/ })).toBeVisible();
    await expect(page.locator('svg path[stroke]').first()).toBeVisible();
    await context.close();
  });

  test('tem resumo textual com os números do período', async ({ page }) => {
    await page.goto('/ativo/PETR4');
    const label = await page
      .getByRole('img', { name: /Preço de PETR4/ })
      .getAttribute('aria-label');

    expect(label).toMatch(/3 meses/);
    expect(label).toMatch(/R\$/);
    expect(label).toMatch(/(alta|baixa) de/);
    expect(label).toMatch(/Mínima .*máxima/);
  });

  test('as setas do teclado andam ponto a ponto e anunciam o valor', async ({ page }) => {
    await page.goto('/ativo/PETR4');
    await page.getByRole('img', { name: /Preço de PETR4/ }).focus();

    const live = page.locator('[aria-live="polite"]');
    await expect(live).toContainText('R$');

    const atEnd = await live.textContent();
    await page.keyboard.press('ArrowLeft');
    await expect(live).not.toHaveText(atEnd ?? '');

    await page.keyboard.press('Home');
    const atStart = await live.textContent();
    await page.keyboard.press('End');
    await expect(live).not.toHaveText(atStart ?? '');
  });

  test('ver como tabela expõe a mesma série', async ({ page }) => {
    await page.goto('/ativo/PETR4');
    const table = page.getByRole('table').filter({ hasText: 'Fechamento' });

    await expect(table).toBeHidden();
    await page.getByText('Ver como tabela').click();
    await expect(table).toBeVisible();
  });

  test('declara que a escala não começa em zero', async ({ page }) => {
    await page.goto('/ativo/PETR4');
    await expect(page.getByText('Escala não começa em zero.')).toBeVisible();
  });
});

test.describe('responsividade', () => {
  test.use({ viewport: { width: 320, height: 640 } });

  for (const route of ['/', '/ativo/PETR4', '/lista?ativos=HGLG11']) {
    test(`${route} não rola na horizontal a 320px`, async ({ page }) => {
      await page.goto(route);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      );
      expect(overflow).toBe(false);
    });
  }

  test('a navegação inteira é alcançável em 320px', async ({ page }) => {
    await page.goto('/');
    const nav = page.getByRole('navigation', { name: 'Navegação principal' });
    for (const label of ['Mercado', 'Minha lista', 'Sobre']) {
      await expect(nav.getByRole('link', { name: label, exact: true })).toBeVisible();
    }
  });
});

test.describe('estado de dado', () => {
  test('toda tela de números diz de quando é o dado', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/Mercado (aberto|fechado)|Pré-abertura/).first()).toBeVisible();
  });

  test('dado que não é ao vivo se declara — a suíte roda em fixture', async ({ page }) => {
    for (const route of ['/', '/ativo/PETR4', '/lista?ativos=HGLG11']) {
      await page.goto(route);
      await expect(page.getByRole('note').filter({ hasText: 'Dado de exemplo' })).toBeVisible();
    }
  });

  test('ticker fora do universo cai em 404 desenhado, com caminho de volta', async ({ page }) => {
    await page.goto('/ativo/ZZZZ9');
    await expect(page.getByRole('heading', { name: 'Não encontramos esta página' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Buscar no mercado' })).toBeVisible();
  });
});
