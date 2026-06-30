// Flat config — typescript-eslint v8 + ESLint 10
// Docs: https://typescript-eslint.io/getting-started

import eslint from '@eslint/js';
import prettierConfig from 'eslint-config-prettier/flat';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'coverage/**',
      '*.config.js',
      'cli-state.json',
      // tests/reports/ contém scripts ad-hoc de investigação (probes, dumps),
      // não código de produção/teste.
      'tests/reports/**',
      // tools/bugs-scripts/ — scripts de diagnóstico black-box descartáveis
      // (já gitignored); não entram em nenhum tsconfig (projectService falha).
      'tools/bugs-scripts/**',
      // specs/ guarda artefatos spec-kit (SDD). Os contracts/*.ts são esboços
      // de ports para documentar design — não entram em nenhum tsconfig.
      'specs/**',
      // Worktrees de sessões paralelas do Claude Code são cópias completas de
      // src/ e tests/ de outras branches. O .gitignore já as exclui, mas o flat
      // config do ESLint NÃO lê .gitignore — sem isto o projectService type-aware
      // ingere ~1748 .ts extras e estoura o heap do V8 (OOM no `pnpm run lint`).
      '.claude/**',
      '.agents/**',
      // Worktrees de épico criados na raiz (`epic/<branch>`, convenção do dev):
      // mesmo caso dos worktrees do Claude — cópia completa de src/ e tests/ de
      // outra branch. Sem esta exclusão o projectService ingere os .ts extras e
      // estoura o heap (OOM no lint), além de lintar código de outra branch.
      'epic/**',
    ],
  },

  // Base — JS recommended
  eslint.configs.recommended,

  // TypeScript — strict + type-aware
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // ===========================================================
      // Regras invariantes do projeto (CLAUDE.md raiz)
      // ===========================================================
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ClassDeclaration',
          message:
            'Classes são proibidas no projeto — use `type Readonly<{}>` + funções standalone.',
        },
        {
          selector: 'ClassExpression',
          message:
            'Classes são proibidas no projeto — use `type Readonly<{}>` + funções standalone.',
        },
      ],

      // Libs proibidas — ADR-0011 §4 (supply-chain hardening).
      'no-restricted-imports': 'off',
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'axios',
              message:
                'Proibida (ADR-0011 §4): supply chain compromise em mar/2026. Use `fetch` global.',
            },
            {
              name: 'request',
              message: 'Proibida (ADR-0011 §4): deprecated desde 2020. Use `fetch` global.',
            },
            {
              name: 'moment',
              message: 'Proibida (ADR-0011 §4): manutenção mínima. Use `Intl` ou `date-fns`.',
            },
            {
              name: 'crypto-js',
              message: 'Proibida (ADR-0011 §4): inativo. Use Web Crypto nativo (`crypto.subtle`).',
            },
          ],
          patterns: [
            {
              group: ['lodash', 'lodash/*'],
              message: 'Proibida (ADR-0011 §4): surface area enorme. O runtime nativo cobre.',
            },
          ],
        },
      ],

      'prefer-const': 'error',
      'no-var': 'error',
      '@typescript-eslint/no-explicit-any': 'error',

      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],

      '@typescript-eslint/no-unnecessary-type-assertion': 'off',
      '@typescript-eslint/dot-notation': 'off',

      '@typescript-eslint/restrict-template-expressions': [
        'error',
        {
          allowNumber: true,
          allowBoolean: true,
          allowNullish: false,
          allowAny: false,
        },
      ],

      'no-param-reassign': ['error', { props: false }],
      '@typescript-eslint/explicit-module-boundary-types': 'off',

      // ===========================================================
      // 🟢 Recomendadas — alinham com regras invariantes
      // ===========================================================
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/strict-boolean-expressions': [
        'error',
        {
          allowString: false,
          allowNumber: false,
          allowNullableObject: false,
          allowNullableBoolean: false,
          allowNullableString: false,
          allowNullableNumber: false,
          allowAny: false,
        },
      ],
      '@typescript-eslint/consistent-type-exports': [
        'error',
        { fixMixedExportsWithInlineTypeSpecifier: true },
      ],
      '@typescript-eslint/no-import-type-side-effects': 'error',
      '@typescript-eslint/method-signature-style': ['error', 'property'],
      '@typescript-eslint/promise-function-async': 'error',
      '@typescript-eslint/strict-void-return': 'error',
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
          allowHigherOrderFunctions: true,
        },
      ],

      // ===========================================================
      // 🟡 Opcionais ativadas (decisão do user)
      // ===========================================================
      // Estas regras têm versões ESLint base + typescript-eslint. Desabilitar base.
      'no-shadow': 'off',
      '@typescript-eslint/no-shadow': 'error',

      'no-use-before-define': 'off',
      '@typescript-eslint/no-use-before-define': [
        'error',
        {
          functions: false, // permite hoisting comum de declarações
          classes: true,
          variables: true,
          enums: true,
          typedefs: false, // tipos são hoisted; permitir uso antes da declaração
          ignoreTypeReferences: true,
        },
      ],

      'no-loop-func': 'off',
      '@typescript-eslint/no-loop-func': 'error',

      'default-param-last': 'off',
      '@typescript-eslint/default-param-last': 'error',

      'init-declarations': 'off',
      '@typescript-eslint/init-declarations': ['error', 'always'],

      // no-redeclare: `type X` + `const X` é declaration merging válido em TS
      // (pattern central do projeto: Money/Period/ContractId etc). Desabilitado.
      'no-redeclare': 'off',
      '@typescript-eslint/no-redeclare': 'off',

      'max-params': 'off',
      '@typescript-eslint/max-params': ['error', { max: 4 }],

      '@typescript-eslint/require-array-sort-compare': ['error', { ignoreStringArrays: true }],

      '@typescript-eslint/no-useless-empty-export': 'error',

      '@typescript-eslint/member-ordering': 'error',

      // Brand types e Date não casam bem com Readonly completo.
      // Mantemos ativado com flags conservadoras; se gerar muito ruído,
      // baixar para 'warn'.
      '@typescript-eslint/prefer-readonly-parameter-types': [
        'error',
        {
          checkParameterProperties: false,
          ignoreInferredTypes: true,
          treatMethodsAsReadonly: true,
        },
      ],

      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'default',
          format: ['camelCase'],
          leadingUnderscore: 'allow',
          trailingUnderscore: 'forbid',
        },
        {
          selector: 'variable',
          format: ['camelCase', 'UPPER_CASE', 'PascalCase'],
          leadingUnderscore: 'allow',
        },
        {
          selector: 'function',
          format: ['camelCase', 'PascalCase'],
        },
        {
          selector: 'parameter',
          format: ['camelCase'],
          leadingUnderscore: 'allow',
        },
        {
          selector: 'typeLike',
          format: ['PascalCase'],
        },
        {
          selector: 'typeProperty',
          format: ['camelCase'],
          leadingUnderscore: 'allow',
          filter: { regex: '[- ]', match: false },
        },
        {
          selector: 'objectLiteralProperty',
          format: null, // dicionário pode ter qualquer formato (kebab-case PT)
        },
        {
          selector: 'enumMember',
          format: ['PascalCase'],
        },
        {
          selector: 'import',
          format: ['camelCase', 'PascalCase'],
        },
      ],

      // ===========================================================
      // Unused vars (preferimos a versão typescript-eslint)
      // ===========================================================
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },

  // -----------------------------------------------------------
  // Adapters — async sem await é design legítimo (InMemory)
  // -----------------------------------------------------------
  {
    files: ['src/modules/*/adapters/**/*.ts', 'src/shared/adapters/**/*.ts'],
    rules: {
      '@typescript-eslint/require-await': 'off',
    },
  },

  // -----------------------------------------------------------
  // Borda HTTP — adapter Fastify (ADR-0025): tipos externos mutáveis
  // (FastifyRequest/FastifyReply) e handlers que retornam reply.send()
  // (promise) sem await. Mesmas folgas dos demais adapters.
  // ADR-0028: shell transversal em src/shared/http; HTTP de feature em
  // src/modules/<m>/adapters/http.
  // -----------------------------------------------------------
  {
    files: ['src/shared/http/**/*.ts', 'src/modules/*/adapters/http/**/*.ts'],
    rules: {
      '@typescript-eslint/prefer-readonly-parameter-types': 'off',
      '@typescript-eslint/promise-function-async': 'off',
      '@typescript-eslint/require-await': 'off',
    },
  },

  // -----------------------------------------------------------
  // Testes — node:test design + narrowing depois de cast
  // -----------------------------------------------------------
  {
    files: ['tests/**/*.ts'],
    rules: {
      '@typescript-eslint/no-floating-promises': 'off',
      // Handlers/fixtures inline podem retornar promise sem async.
      '@typescript-eslint/promise-function-async': 'off',
      '@typescript-eslint/no-unnecessary-condition': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
      // Testes podem ter parâmetros não-readonly em fixtures
      '@typescript-eslint/prefer-readonly-parameter-types': 'off',
      // Testes podem ter funções inline sem return type explícito
      '@typescript-eslint/explicit-function-return-type': 'off',
      // Testes podem ter > 4 params em fixtures construtoras
      '@typescript-eslint/max-params': 'off',
      // Naming em testes pode usar 'c', 'r', 'a' como aliases
      '@typescript-eslint/naming-convention': 'off',
      // strict-boolean-expressions em assert.equal pode reclamar de Date|null
      '@typescript-eslint/strict-boolean-expressions': 'off',
      // init-declarations: testes podem ter let sem init em alguns helpers
      '@typescript-eslint/init-declarations': 'off',
    },
  },

  // -----------------------------------------------------------
  // Prettier — DESLIGA regras de estilo que conflitam com o formatter.
  // Deve ser o ÚLTIMO config (sobrescreve tudo).
  // -----------------------------------------------------------
  prettierConfig,
);
