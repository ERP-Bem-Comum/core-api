/**
 * CI-RUNNER-NON-DESTRUCTIVE — Wave W0 (RED). Parte A da #500.
 *
 * O runner de integração (`scripts/ci/test-integration.ts`) hoje DESTRÓI o ambiente de dev local:
 *   1. `docker compose down -v` roda no projeto default `core-api-dev` → apaga o volume `mysql-data`
 *      do banco de dev.
 *   2. `writeTestSecrets`/`removeTestSecrets` sobrescrevem e apagam `secrets/*.txt` (os do dev).
 *
 * Esta suite (fs-puro + inspeção de args — SEM Docker, roda em `pnpm test` puro) trava o contrato da
 * correção. RED por inexistência da API: os módulos `#scripts/ci/compose-project.ts` e
 * `#scripts/ci/secrets-vault.ts` que o W1 deve criar ainda não existem, então o `import` abaixo falha
 * e a suite inteira fica vermelha até o W1 fechar o GREEN.
 *
 * Assinatura que o W1 implementa (ver 002-tests/REPORT.md §"Assinatura para o W1"):
 *   scripts/ci/compose-project.ts
 *     export const TEST_COMPOSE_PROJECT = 'core-api-test';
 *     export const composeUpArgs = (services: readonly string[]): readonly string[];
 *     export const composeDownArgs = (): readonly string[];
 *   scripts/ci/secrets-vault.ts
 *     export type SecretBackup = ...;  // handle opaco
 *     export const backupAndWriteTestSecrets = (
 *       baseDir: string,
 *       testSecrets: Readonly<Record<string, string>>,  // filename (sem dir) → conteúdo
 *     ): SecretBackup;
 *     export const restoreSecrets = (backup: SecretBackup): void;
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// RED: estes módulos ainda não existem (o W1 os cria). O import falha → toda a suite fica vermelha.
import {
  composeUpArgs,
  composeDownArgs,
  TEST_COMPOSE_PROJECT,
} from '#scripts/ci/compose-project.ts';
import { backupAndWriteTestSecrets, restoreSecrets } from '#scripts/ci/secrets-vault.ts';

const ORCHESTRATOR = readFileSync(
  fileURLToPath(new URL('../../scripts/ci/test-integration.ts', import.meta.url)),
  'utf-8',
);

const tmp = (): string => mkdtempSync(join(tmpdir(), 'ci-runner-secrets-'));

// ─── Frente 1 — backup/restore de secrets (fs-puro, a mais forte) ──────────────────────────────
describe('CI-RUNNER-NON-DESTRUCTIVE — Frente 1: backup/restore de secrets', () => {
  it('CA2: um secret de dev existente sobrevive ao ciclo write→restore byte-a-byte', () => {
    // Arrange — o dev tem um secret com conteúdo "X" (com newline, pra provar byte-a-byte).
    const dir = tmp();
    try {
      const file = join(dir, 'mysql_root_password.txt');
      const devContent = 'dev-root-secret-XYZ\n';
      writeFileSync(file, devContent);

      // Act — o runner faz backup e escreve o valor de teste...
      const backup = backupAndWriteTestSecrets(dir, {
        'mysql_root_password.txt': 'rootpw-migration-test-only',
      });

      // Assert (durante) — o arquivo tem o valor de TESTE.
      assert.equal(readFileSync(file, 'utf-8'), 'rootpw-migration-test-only');

      // Act — ...e no finally restaura.
      restoreSecrets(backup);

      // Assert (depois) — volta ao conteúdo de DEV, byte-a-byte (não o de teste, não apagado).
      assert.equal(readFileSync(file, 'utf-8'), devContent);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('CA3: um secret que NÃO existia nasce com o valor de teste e é removido no fim', () => {
    // Arrange — dev sem esse secret.
    const dir = tmp();
    try {
      const file = join(dir, 'mysql_app_password.txt');
      assert.equal(existsSync(file), false, 'pré-condição: o secret não deveria existir');

      // Act — backup+write.
      const backup = backupAndWriteTestSecrets(dir, {
        'mysql_app_password.txt': 'apppw-migration-test-only',
      });

      // Assert (durante) — nasce com o valor de teste.
      assert.equal(readFileSync(file, 'utf-8'), 'apppw-migration-test-only');

      // Act — restore.
      restoreSecrets(backup);

      // Assert (depois) — removido (comportamento de hoje para quem não tinha secrets).
      assert.equal(existsSync(file), false, 'o secret de teste deveria ter sido removido no fim');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('CA2/CA3: ciclo com múltiplos secrets (um preexistente, um novo) na mesma chamada', () => {
    const dir = tmp();
    try {
      const rootFile = join(dir, 'mysql_root_password.txt');
      const roFile = join(dir, 'mysql_readonly_password.txt');
      const devRoot = 'dev-root\n';
      writeFileSync(rootFile, devRoot); // preexistente
      // roFile: inexistente

      const backup = backupAndWriteTestSecrets(dir, {
        'mysql_root_password.txt': 'rootpw-migration-test-only',
        'mysql_readonly_password.txt': 'ropw-migration-test-only',
      });
      assert.equal(readFileSync(rootFile, 'utf-8'), 'rootpw-migration-test-only');
      assert.equal(readFileSync(roFile, 'utf-8'), 'ropw-migration-test-only');

      restoreSecrets(backup);
      assert.equal(readFileSync(rootFile, 'utf-8'), devRoot, 'preexistente volta byte-a-byte');
      assert.equal(existsSync(roFile), false, 'o novo é removido');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('CA-perm: o secret de teste é escrito com modo 0o644 (seed readonly_bi lê como uid mysql)', () => {
    // Preserva a invariante de CTR-INFRA-INTEGRATION-SECRET-PERMS: 0o644, nunca 0o600.
    const dir = tmp();
    try {
      const backup = backupAndWriteTestSecrets(dir, {
        'mysql_readonly_password.txt': 'ropw-migration-test-only',
      });
      const mode = statSync(join(dir, 'mysql_readonly_password.txt')).mode & 0o777;
      assert.equal(mode, 0o644, `esperado 0o644, foi 0o${mode.toString(8)}`);
      restoreSecrets(backup);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

// ─── Frente 2 — projeto Docker isolado (estrutural, roda no puro) ──────────────────────────────
describe('CI-RUNNER-NON-DESTRUCTIVE — Frente 2: projeto Docker isolado', () => {
  it('CA1: o projeto de teste é `core-api-test` (nunca o default `core-api-dev`)', () => {
    assert.equal(TEST_COMPOSE_PROJECT, 'core-api-test');
  });

  it('CA1: composeUpArgs monta `-p core-api-test` ANTES do subcomando `up`', () => {
    const args = composeUpArgs(['mysql']);
    const pIdx = args.indexOf('-p');
    assert.notEqual(pIdx, -1, 'faltou -p no comando de up');
    assert.equal(args[pIdx + 1], TEST_COMPOSE_PROJECT, '-p deve ser seguido de core-api-test');
    const upIdx = args.indexOf('up');
    assert.notEqual(upIdx, -1, 'faltou o subcomando up');
    assert.ok(pIdx < upIdx, '-p <projeto> tem que vir ANTES de `up` (senão o docker ignora)');
    assert.ok(args.includes('--wait'), 'up deve manter --wait');
    assert.ok(args.includes('mysql'), 'up deve subir os serviços pedidos');
  });

  it('CA5: composeDownArgs monta `-p core-api-test` ANTES de `down` e mantém `-v`', () => {
    const args = composeDownArgs();
    const pIdx = args.indexOf('-p');
    assert.notEqual(pIdx, -1, 'faltou -p no comando de down (down -v cairia no projeto default!)');
    assert.equal(args[pIdx + 1], TEST_COMPOSE_PROJECT, '-p deve ser seguido de core-api-test');
    const downIdx = args.indexOf('down');
    assert.notEqual(downIdx, -1, 'faltou o subcomando down');
    assert.ok(pIdx < downIdx, '-p <projeto> tem que vir ANTES de `down`');
    assert.ok(args.includes('-v'), 'down deve manter -v (remove só o volume do projeto de teste)');
  });
});

// ─── Wiring do runner (estrutural) — trava a integração no `main()`/finally ────────────────────
describe('CI-RUNNER-NON-DESTRUCTIVE — wiring do runner (estrutural)', () => {
  it('CA1/CA5: o runner monta os comandos via composeUpArgs/composeDownArgs (projeto isolado nos DOIS)', () => {
    assert.match(ORCHESTRATOR, /composeUpArgs/, 'o up deve usar composeUpArgs (projeto isolado)');
    assert.match(
      ORCHESTRATOR,
      /composeDownArgs/,
      'o down deve usar composeDownArgs (projeto isolado)',
    );
  });

  it('CA2/CA3: o runner faz backup/restore de secrets e restaura no finally', () => {
    assert.match(
      ORCHESTRATOR,
      /backupAndWriteTestSecrets/,
      'o runner deve fazer backup dos secrets',
    );
    assert.match(ORCHESTRATOR, /restoreSecrets/, 'o runner deve restaurar os secrets');
    assert.match(
      ORCHESTRATOR,
      /finally/,
      'a restauração deve estar num finally (mesmo se o teste falhar)',
    );
  });
});
