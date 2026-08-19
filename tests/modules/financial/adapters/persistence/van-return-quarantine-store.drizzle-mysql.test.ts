// Teste de integração: VanReturnQuarantineStore (Drizzle + MySQL real).
//
// Prova o que o fake não pode, porque o fake é justamente onde essas propriedades são fáceis:
//
//   - que o ODKU deixa `first_seen_at` INTACTO — a idade da anomalia é o que separa incidente de
//     agora de fila parada há semanas, e um `set` distraído a reescreveria a cada ciclo;
//   - que reobservar REABRE (`released_at` volta a NULL) no SQL, não só na intenção;
//   - que o CHECK da migration 0047 recusa motivo fora da união — a união literal do TypeScript não
//     alcança quem escrever na tabela por fora;
//   - que `object_key` compara em collation BINÁRIA: chave de S3 é case-sensitive, e `unicode_ci`
//     faria dois objetos distintos colidirem na PK;
//   - que o instante faz round-trip fiel ISO → coluna → ISO.
//
// GATE: só roda com `MYSQL_INTEGRATION=1`.

import { describe, it, before, beforeEach, after } from 'node:test';
import { strict as assert } from 'node:assert';
import process from 'node:process';
import { sql } from 'drizzle-orm';

import { openMysqlFinancial } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import type { FinancialMysqlHandle } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleVanReturnQuarantineStore } from '#src/modules/financial/adapters/persistence/repos/van-return-quarantine-store.drizzle.ts';
import { finVanReturnQuarantine } from '#src/modules/financial/adapters/persistence/schemas/mysql.ts';
import { mysqlTestConnectionString } from '#tests/support/mysql-conn.ts';

const KEY = 'retorno/PAG_000000.20260819110000_0001.RET';
const HASH_A = 'a'.repeat(64);
const HASH_B = 'b'.repeat(64);
const T1 = '2026-08-19T12:05:00.000Z';
const T2 = '2026-08-19T12:10:00.000Z';

if (!process.env['MYSQL_INTEGRATION']) {
  process.stdout.write('[financial:van-quarantine] MYSQL_INTEGRATION não definido — pulando.\n');
} else {
  const connectionString =
    process.env['FINANCIAL_DATABASE_URL'] ??
    process.env['CONTRACTS_DATABASE_URL'] ??
    mysqlTestConnectionString();

  describe('VanReturnQuarantineStore — Drizzle + MySQL (integração)', () => {
    let handle: FinancialMysqlHandle;

    before(async () => {
      const r = await openMysqlFinancial({ connectionString, applyMigrations: true, poolLimit: 4 });
      if (!r.ok) throw new Error(`[financial:van-quarantine] Falha ao conectar: ${r.error}`);
      handle = r.value;
    });

    // Limpeza na ENTRADA e por TABELA (.claude/rules/testing.md): a PK é chave natural vinda de
    // fora, então resíduo de execução anterior colide sem levantar erro — vira UPDATE silencioso.
    beforeEach(async () => {
      await handle.db.delete(finVanReturnQuarantine);
    });

    after(async () => {
      await handle?.close();
    });

    it('reobservar preserva `first_seen_at` e move `last_seen_at`', async () => {
      const store = createDrizzleVanReturnQuarantineStore(handle);

      await store.record([
        { key: KEY, reason: 'missing-provenance', observedSha256: HASH_A, seenAt: T1 },
      ]);
      await store.record([
        { key: KEY, reason: 'missing-provenance', observedSha256: HASH_A, seenAt: T2 },
      ]);

      const preso = await store.list();
      assert.ok(preso.ok);
      assert.equal(preso.value.length, 1, 'uma linha por chave, não uma por passagem');
      assert.equal(preso.value[0]?.firstSeenAt, T1, '`first_seen_at` fica FORA do set do ODKU');
      assert.equal(preso.value[0]?.lastSeenAt, T2);
    });

    it('liberar tira da consulta padrão sem apagar — e preserva o instante da 1ª liberação', async () => {
      const store = createDrizzleVanReturnQuarantineStore(handle);
      await store.record([
        { key: KEY, reason: 'missing-provenance', observedSha256: HASH_A, seenAt: T1 },
      ]);

      await store.release([KEY], T1);
      await store.release([KEY], T2); // 2ª liberação não pode reescrever a 1ª

      const preso = await store.list();
      assert.ok(preso.ok);
      assert.deepEqual(preso.value, [], 'a consulta padrão responde "o que está preso agora"');

      const tudo = await store.list({ includeReleased: true });
      assert.ok(tudo.ok);
      assert.equal(tudo.value.length, 1);
      assert.equal(tudo.value[0]?.releasedAt, T1, 'o WHERE tem `released_at IS NULL`');
    });

    it('reobservar REABRE a linha liberada', async () => {
      const store = createDrizzleVanReturnQuarantineStore(handle);
      await store.record([
        { key: KEY, reason: 'missing-provenance', observedSha256: HASH_A, seenAt: T1 },
      ]);
      await store.release([KEY], T1);

      await store.record([
        {
          key: KEY,
          reason: 'hash-mismatch',
          observedSha256: HASH_A,
          expectedSha256: HASH_B,
          seenAt: T2,
        },
      ]);

      const preso = await store.list();
      assert.ok(preso.ok);
      assert.equal(preso.value.length, 1, 'proveniência que regride volta à consulta padrão');
      assert.equal(preso.value[0]?.reason, 'hash-mismatch');
      assert.equal(preso.value[0]?.expectedSha256, HASH_B);
      assert.equal(preso.value[0]?.releasedAt, undefined);
      assert.equal(preso.value[0]?.firstSeenAt, T1, 'reabrir não é recomeçar');
    });

    // A união literal do TypeScript não alcança quem escreve na tabela por fora — ETL, correção
    // manual, versão futura do produtor. O CHECK é o que sobra.
    it('o CHECK da migration recusa motivo fora da união', async () => {
      await assert.rejects(
        handle.db.execute(
          sql`insert into fin_van_return_quarantine
                (object_key, reason, observed_sha256, first_seen_at, last_seen_at)
              values (${KEY}, 'motivo-inventado', ${HASH_A}, ${'2026-08-19 12:05:00.000'}, ${'2026-08-19 12:05:00.000'})`,
        ),
      );
    });

    // Chave de S3 é case-sensitive. Com `utf8mb4_unicode_ci` os dois objetos abaixo colidiriam na
    // PK e o segundo viraria UPDATE do primeiro — perda silenciosa de evidência.
    it('`object_key` compara em collation binária: caixa distingue objetos', async () => {
      const store = createDrizzleVanReturnQuarantineStore(handle);
      const minuscula = 'retorno/pag_000000.20260819110000_0001.ret';

      await store.record([
        { key: KEY, reason: 'missing-provenance', observedSha256: HASH_A, seenAt: T1 },
        { key: minuscula, reason: 'missing-provenance', observedSha256: HASH_B, seenAt: T1 },
      ]);

      const preso = await store.list();
      assert.ok(preso.ok);
      assert.equal(preso.value.length, 2, 'duas chaves, dois objetos');
    });
  });
}
