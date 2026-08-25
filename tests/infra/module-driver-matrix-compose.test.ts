/**
 * COMPOSE-DRIVER-MATRIX-GUARD — trava mecânica da matriz de drivers do `compose.yaml`.
 *
 * O `compose.yaml` (raiz) é a fonte de verdade que gera os taskdefs de PRODUÇÃO (deploy = push na
 * main). O guard de boot do #456 (`readModuleDriverConfigs`, `src/server.ts:124`) faz o boot FALHAR
 * (exit 78) se um `<MODULO>_DRIVER` estiver ausente/inválido em produção — foi o que os incidentes
 * #374 (budget-plans) e #444 (reports) sofreram como degradação SILENCIOSA para `memory` (HTTP 200
 * com lista vazia).
 *
 * Hoje a completude da matriz do compose depende de auditoria manual: se alguém remover
 * `BUDGET_PLANS_DRIVER: mysql` do serviço `http`, NENHUM teste acusa — só um boot real em produção
 * (o exit 78 do #456). Este teste fecha essa lacuna UM NÍVEL ACIMA (na config do deploy): assere,
 * módulo a módulo, que o serviço `http` declara `<MODULO>_DRIVER: mysql` + o export do secret + o
 * secret no serviço + o secret top-level, e que a cascata de `reports` (server.ts:268) tem as 4
 * fontes exportadas.
 *
 * Estilo: asserção de ESTRUTURA sobre o TEXTO do compose (molde de `integration-matrix-workflow.
 * test.ts`) — `readFileSync` + regex, ZERO dependência (ADR-0011), SEM `docker compose config`.
 * Roda em `pnpm test` puro, sempre (não depende de Docker no PATH — é justamente o ponto: a trava
 * não pode ser skipada por ambiente).
 *
 * A tabela abaixo é REPLICADA de `MODULE_SPECS`/`REPORTS_SOURCE_SPECS` do guard de propósito: o teste
 * trava o ACOPLAMENTO compose↔guard, não confia cegamente no código de produção.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const compose = readFileSync(
  fileURLToPath(new URL('../../compose.yaml', import.meta.url)),
  'utf-8',
);

// Bloco do serviço `http:` (indentado 2 espaços) até o próximo serviço de mesma indentação.
const httpMatch = /^ {2}http:\n([\s\S]*?)(?=\n {2}[a-z][\w-]*:\n)/m.exec(compose);
const httpBlock = httpMatch?.[1] ?? '';

// Guard universal: se o bloco `http` não for localizado (compose reestruturado), todo `it()` falha
// AQUI com mensagem clara — nunca passa silenciosamente por não achar nada.
const httpPresent = (): void => {
  assert.ok(
    httpBlock.length > 0,
    'serviço `http` ausente ou compose.yaml reestruturado — bloco não localizado pela regex',
  );
};

const MODULES_WITH_OWN_URL = [
  { driverVar: 'AUTH_DRIVER', urlVar: 'AUTH_DATABASE_URL', secret: 'auth_database_url' },
  {
    driverVar: 'PROGRAMS_DRIVER',
    urlVar: 'PROGRAMS_DATABASE_URL',
    secret: 'programs_database_url',
  },
  {
    driverVar: 'CONTRACTS_DRIVER',
    urlVar: 'CONTRACTS_DATABASE_URL',
    secret: 'contracts_database_url',
  },
  {
    driverVar: 'PARTNERS_DRIVER',
    urlVar: 'PARTNERS_DATABASE_URL',
    secret: 'partners_database_url',
  },
  {
    driverVar: 'FINANCIAL_DRIVER',
    urlVar: 'FINANCIAL_DATABASE_URL',
    secret: 'financial_database_url',
  },
  {
    driverVar: 'BUDGET_PLANS_DRIVER',
    urlVar: 'BUDGET_PLANS_DATABASE_URL',
    secret: 'budget_plans_database_url',
  },
] as const;

// Reports é read-only (sem writer/URL própria): consome a cascata `REPORTS_* ?? *` (server.ts:268).
const REPORTS_CASCADE_SOURCE_VARS = [
  'PARTNERS_DATABASE_URL',
  'FINANCIAL_DATABASE_URL',
  'CONTRACTS_DATABASE_URL',
  'BUDGET_PLANS_DATABASE_URL',
] as const;

const esc = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

describe('compose.yaml — matriz de drivers do serviço http (guard do #456, um nível acima)', () => {
  for (const m of MODULES_WITH_OWN_URL) {
    it(`http declara ${m.driverVar}: mysql`, () => {
      httpPresent();
      assert.match(
        httpBlock,
        new RegExp(`^\\s*${esc(m.driverVar)}:\\s*mysql\\s*$`, 'm'),
        `\`${m.driverVar}: mysql\` ausente no serviço http — módulo degradaria p/ memory em prod (#374/#444)`,
      );
    });

    it(`http exporta ${m.urlVar} via secret ${m.secret}`, () => {
      httpPresent();
      assert.match(
        httpBlock,
        new RegExp(`export ${esc(m.urlVar)}="\\$\\(cat /run/secrets/${esc(m.secret)}\\)"`),
        `export de \`${m.urlVar}\` a partir de /run/secrets/${m.secret} ausente`,
      );
    });

    it(`http lista o secret ${m.secret} + declara top-level com file`, () => {
      httpPresent();
      assert.match(
        httpBlock,
        new RegExp(`\\n\\s*-\\s*${esc(m.secret)}\\s*\\n`),
        `secret \`${m.secret}\` não listado no bloco secrets: do serviço http`,
      );
      assert.match(
        compose,
        new RegExp(`${esc(m.secret)}:\\s*\\n\\s*file:\\s*\\./secrets/${esc(m.secret)}\\.txt`),
        `secret top-level \`${m.secret}\` (file: ./secrets/${m.secret}.txt) ausente`,
      );
    });
  }

  it('http declara REPORTS_DRIVER: mysql', () => {
    httpPresent();
    assert.match(
      httpBlock,
      /^\s*REPORTS_DRIVER:\s*mysql\s*$/m,
      '`REPORTS_DRIVER: mysql` ausente — os 3 relatórios subiriam vazios em prod (#444)',
    );
  });

  it('reports não exige URL/secret própria — só REPORTS_DRIVER (documenta a cascata)', () => {
    httpPresent();
    assert.doesNotMatch(
      httpBlock,
      /REPORTS_DATABASE_URL:|reports_database_url/,
      'reports usa a cascata REPORTS_* ?? * (server.ts:268) — não deve ter URL/secret própria',
    );
  });

  for (const sourceVar of REPORTS_CASCADE_SOURCE_VARS) {
    it(`cascata de reports: fonte ${sourceVar} está exportada no serviço http`, () => {
      httpPresent();
      assert.match(
        httpBlock,
        new RegExp(`export ${esc(sourceVar)}=`),
        `fonte \`${sourceVar}\` da cascata de reports ausente — remover isso quebraria reports em silêncio`,
      );
    });
  }
});
