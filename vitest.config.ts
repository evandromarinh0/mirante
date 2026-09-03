import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  // Resolve os aliases de tsconfig.json nativamente (dispensa vite-tsconfig-paths).
  resolve: { tsconfigPaths: true },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    // O contrato bate na API real: fica fora do padrão, do verify e do CI.
    // Roda com `npm run test:contract`.
    include: ['src/**/*.test.{ts,tsx}', 'tests/unit/**/*.test.{ts,tsx}'],
  },
});
