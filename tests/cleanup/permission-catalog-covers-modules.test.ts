import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { execFileSync } from 'node:child_process';

import * as PermissionCatalog from '#src/modules/auth/domain/authorization/permission-catalog.ts';
import * as Permission from '#src/modules/auth/domain/authorization/permission.ts';
import { BUDGET_PLAN_PERMISSION } from '#src/modules/budget-plans/public-api/permissions.ts';
import { CONTRACT_PERMISSION } from '#src/modules/contracts/public-api/permissions.ts';
import { FINANCIAL_PERMISSION } from '#src/modules/financial/public-api/permissions.ts';
import {
  ACT_PERMISSION,
  COLLABORATOR_PERMISSION,
  FINANCIER_PERMISSION,
  GEOGRAPHY_PERMISSION,
  SUPPLIER_PERMISSION,
} from '#src/modules/partners/public-api/permissions.ts';
import { PROGRAM_PERMISSION } from '#src/modules/programs/public-api/permissions.ts';

/**
 * PERMISSION-CATALOG-COVERS-MODULES — permissão que a rota exige e o seed não entrega.
 *
 * Existem DOIS registros de permissão, e eles precisam concordar: o catálogo por módulo
 * (`<mod>/public-api/permissions.ts`), que as rotas usam em `authorize(...)`, e o
 * `PermissionCatalog` do `auth`, que é o conjunto semeado pelo job de sync (#462) e contra o qual
 * `Role.setPermissions` valida.
 *
 * ⚠️ Quando divergem, a falha é MUDA. A rota exige permissão que nunca foi semeada — o agregado
 * `Role` descarta o que está fora do catálogo, o admin não a recebe, e o operador toma 403 sem que
 * nada tenha quebrado no deploy. O job de sync termina com SUCESSO: ele sincroniza o catálogo do
 * `auth`, e é justamente lá que a permissão não está. Foi a mecânica da #403.
 *
 * Por isso o gate é estático e roda no CI: a divergência precisa custar vermelho antes do deploy,
 * que é o único momento em que ela ainda é barata. Verificação de boot chegaria tarde — em
 * produção, a descoberta já é o 403.
 */

// Comparar os CATÁLOGOS, não varrer o fonte por `authorize(...)`: a varredura textual não resolve
// `FINANCIAL_PERMISSION.write` para a string que ele contém, e confundiria uso com menção — erro
// que já se repetiu aqui. Estes são os próprios objetos que as rotas consomem.
const MODULE_CATALOGS: Readonly<Record<string, readonly Readonly<Record<string, string>>[]>> = {
  'budget-plans': [BUDGET_PLAN_PERMISSION],
  contracts: [CONTRACT_PERMISSION],
  financial: [FINANCIAL_PERMISSION],
  partners: [
    ACT_PERMISSION,
    COLLABORATOR_PERMISSION,
    FINANCIER_PERMISSION,
    GEOGRAPHY_PERMISSION,
    SUPPLIER_PERMISSION,
  ],
  programs: [PROGRAM_PERMISSION],
};

const declaredIn = (module: string): readonly string[] =>
  (MODULE_CATALOGS[module] ?? []).flatMap((catalog) => Object.values(catalog));

// Pergunta ao git, não ao disco: o gate precisa responder igual aqui e no runner.
const modulesDeclaringPermissions = (): readonly string[] => {
  const out = execFileSync('git', ['ls-files', 'src/modules/*/public-api/permissions.ts'], {
    encoding: 'utf8',
  });
  return out
    .split('\n')
    .filter((line) => line !== '')
    .map((path) => path.split('/')[2] ?? '')
    .filter((name) => name !== '');
};

describe('PERMISSION-CATALOG-COVERS-MODULES — o que a rota exige, o seed entrega', () => {
  it('toda permissão declarada por um módulo está no catálogo do auth', () => {
    const missing: string[] = [];

    for (const module of Object.keys(MODULE_CATALOGS)) {
      for (const raw of declaredIn(module)) {
        const parsed = Permission.parse(raw);
        // Não parsear é a mesma falha, e pior: o catálogo do auth DESCARTA em silêncio o que não
        // parseia, então um typo desapareceria dos dois lados.
        if (!parsed.ok || !PermissionCatalog.isInCatalog(parsed.value)) {
          missing.push(`${module}: ${raw}`);
        }
      }
    }

    assert.deepEqual(
      missing,
      [],
      'permissão declarada por módulo e ausente do PermissionCatalog do auth — a rota exigiria ' +
        `o que o seed não entrega, e o 403 só apareceria em produção:\n${missing.join('\n')}`,
    );
  });

  // A propriedade, não a contagem: módulo novo que declare permissão tem de entrar neste gate.
  // Fixar "são cinco" quebraria na próxima adição legítima e viraria ruído.
  it('todo módulo que declara permissão está coberto pela varredura', () => {
    const uncovered = modulesDeclaringPermissions().filter(
      (module) => !(module in MODULE_CATALOGS),
    );

    assert.deepEqual(
      uncovered,
      [],
      `módulo com public-api/permissions.ts fora de MODULE_CATALOGS: ${uncovered.join(', ')}`,
    );
  });

  it('cada módulo coberto declara ao menos uma permissão (guarda contra catálogo esvaziado)', () => {
    for (const module of Object.keys(MODULE_CATALOGS)) {
      assert.ok(declaredIn(module).length > 0, `${module} não declarou permissão alguma`);
    }
  });

  it('o pertencimento ao catálogo sabe dizer não', () => {
    const absurd = Permission.parse('nao-existe:jamais');
    assert.ok(absurd.ok, 'a permissão de controle precisa ser sintaticamente válida');
    assert.equal(PermissionCatalog.isInCatalog(absurd.value), false);
  });
});
