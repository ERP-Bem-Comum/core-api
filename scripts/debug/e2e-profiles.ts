/**
 * Gera `.tmp/e2e.env` com `CORE_API_E2E=1` e o `AUTH_SEED_JSON` dos 8 perfis que a suíte Hurl pede.
 *
 * Os perfis saem de `api-collections-hurl/_vars.env.example`, que nomeia os pares
 * `<perfil>Email`/`<perfil>Token`. As permissões saem do `auth_permission` do banco, agrupadas por
 * recurso — não inventadas: `reader` recebe todos os `:read`, cada operador recebe o conjunto do
 * seu módulo, e os dois perfis "pelados" recebem NENHUMA, porque é com eles que a suíte exercita
 * o 403.
 *
 * ⚠️ `CORE_API_E2E` tem de ser exatamente `'1'` — `parseE2eAuthSeed` compara com essa string, e
 * `true`/`yes` deixam o seed inerte sem erro algum. O `.env.example` gerado traz `false`, que é o
 * valor desligado e correto para o template; ligar é decisão de quem roda a suíte.
 */

import { writeFileSync } from 'node:fs';

const ALL = [
  'act:read',
  'act:write',
  'bank-account:read',
  'bank-account:write',
  'budget-plan:read',
  'budget-plan:write',
  'collaborator:read',
  'collaborator:read-sensitive',
  'collaborator:write',
  'contract:delete',
  'contract:mass-approve',
  'contract:read',
  'contract:write',
  'etl:mass-approver',
  'financier:read',
  'financier:write',
  'fiscal-document:cancel',
  'fiscal-document:read',
  'fiscal-document:write',
  'geography:read',
  'geography:write',
  'payable:approve',
  'program:deactivate',
  'program:read',
  'program:write',
  'reconciliation:close',
  'reconciliation:import',
  'reconciliation:read',
  'reconciliation:write',
  'reference:read',
  'remittance:generate',
  'remittance:read',
  'role:assign',
  'role:create',
  'role:read',
  'role:revoke',
  'role:update',
  'supplier:read',
  'supplier:write',
  'user:activate',
  'user:assign-role',
  'user:create',
  'user:deactivate',
  'user:list',
  'user:read',
  'user:register',
  'user:update',
] as const;

const of = (...prefixes: readonly string[]): readonly string[] =>
  ALL.filter((p) => prefixes.some((prefix) => p.startsWith(`${prefix}:`)));

const PASSWORD = 'E2eLocal!2026';

/** Perfil → permissões. A chave é o nome usado em `_vars.env` (`<perfil>Email`/`<perfil>Token`). */
const PROFILES: Readonly<Record<string, readonly string[]>> = {
  admin: ALL,
  // Dois perfis SEM permissão nenhuma: é com eles que a suíte exercita o 403 de rota autenticada.
  // São dois porque o `.bru` original tinha `bare` e `bareUser` separados, e os arquivos usam os
  // dois nomes — unificar faria metade dos requests continuar sem variável.
  bare: [],
  bareUser: [],
  partnersOperator: of('collaborator', 'supplier', 'financier', 'act', 'geography', 'bank-account'),
  contractsOperator: of('contract', 'fiscal-document'),
  programsOperator: of('program'),
  budgetPlansOperator: of('budget-plan'),
  reader: ALL.filter((p) => p.endsWith(':read')),
};

const email = (profile: string): string => `e2e-${profile.toLowerCase()}@local.test`;

const seed = {
  users: Object.entries(PROFILES).map(([profile, permissions]) => ({
    email: email(profile),
    password: PASSWORD,
    permissions,
  })),
};

// ⚠️ Valores entre ASPAS SIMPLES porque este arquivo é lido por `.` (source) do `sh`, não por
// `--env-file` do Node. A troca foi forçada por medição: o overmind injeta o `.env` como env de
// PROCESSO, e `--env-file` não sobrescreve env de processo — o `.env` gerado traz
// `AUTH_SEED_JSON=""`, então o JSON nunca chegava e o seed ficava inerte, sem erro. `source`
// sobrescreve. O JSON não contém aspas simples (e-mails e permissões não as usam), então envolver
// com `'` é seguro; com `"` o `sh` interpretaria as aspas duplas internas.
const lines = [
  "CORE_API_E2E='1'",
  `AUTH_SEED_JSON='${JSON.stringify(seed)}'`,
  `E2E_SEED_PASSWORD='${PASSWORD}'`,
  // Dois tetos, e são INDEPENDENTES — subir um não afeta o outro:
  //   · login: default 5/min, e `tokens-e2e.ts` faz 8 logins seguidos.
  //   · geral: default 100/janela, e a suíte dispara 185 requests em ~1 segundo. Com o limite de
  //     login já resolvido, o geral passou a ser o gargalo: 142 dos 347 requests do run anterior
  //     voltaram 429, a maioria em `GET /api/v1/users`.
  // Afrouxamento deliberado e LOCAL, em arquivo gitignored. Em produção os dois tetos protegem.
  "AUTH_LOGIN_RATE_LIMIT_MAX='500'",
  "RATE_LIMIT_MAX='100000'",
];

writeFileSync('.tmp/e2e.env', `${lines.join('\n')}\n`, { mode: 0o600 });

console.log('.tmp/e2e.env gravado');
for (const [profile, permissions] of Object.entries(PROFILES)) {
  console.log(
    `  ${profile.padEnd(20)} ${email(profile).padEnd(34)} ${permissions.length} permissões`,
  );
}
