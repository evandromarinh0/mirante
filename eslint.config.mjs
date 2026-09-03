import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypeScript from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier';
import jsxA11y from 'eslint-plugin-jsx-a11y';

const config = [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
    ],
  },
  ...nextCoreWebVitals,
  ...nextTypeScript,
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      ...jsxA11y.flatConfigs.strict.rules,
      // Contêiner rolável tem de receber foco (WCAG 2.1.1, regra
      // scrollable-region-focusable do axe), e é o que 'region' habilita aqui.
      'jsx-a11y/no-noninteractive-tabindex': [
        'error',
        { tags: [], roles: ['tabpanel', 'region'], allowExpressionValues: true },
      ],
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "Property[key.name='outline'][value.value='none'], Property[key.name='outline'][value.value='0']",
          message: 'Nunca remova o outline de foco. Use o token --color-ring.',
        },
      ],
    },
  },
  {
    // **A fronteira, verificada.** Só a pasta do adapter conhece a Brapi; e só a
    // camada de serviço fala com provider. Sem esta regra, o desacoplamento é
    // promessa de code review — com ela, o CI reprova quem furar.
    files: ['src/app/**', 'src/components/**', 'src/lib/hooks/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/market/providers/**', '**/brapi/**'],
              message:
                'Componente e página não conhecem provider. Use a camada de serviço em @/lib/services.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/components/**', 'src/lib/hooks/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/market/providers/**', '**/brapi/**'],
              message: 'Nenhum componente conhece a fonte de dados.',
            },
            {
              group: ['**/lib/services/**'],
              message:
                'Componente recebe dado por prop. Quem chama o serviço é a página (Server Component).',
            },
          ],
        },
      ],
    },
  },
  prettier,
];

export default config;
