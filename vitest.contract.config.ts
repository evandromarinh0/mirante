import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

/**
 * Configuração só do teste de contrato, que bate na API real.
 *
 * Ele mora fora do `include` padrão para ficar fora do `verify` e do CI:
 * depende de rede, de credencial e de terceiro, e consome cota. Reprovar um
 * pull request por instabilidade da Brapi transformaria um aviso útil em ruído.
 *
 *   BRAPI_TOKEN=... npm run test:contract
 */
export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/contract/**/*.test.ts'],
  },
});
