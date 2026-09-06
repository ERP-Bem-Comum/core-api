// Teste de integração: o CedenteAccountStore Drizzle+MySQL satisfaz o contrato do port, MAIS as
// garantias que só o backend real pode demonstrar.
//
// O contrato observável (`save` + `allocateNsa`) vive em `cedente-account-store.contract.ts` e é
// consumido aqui e pelo fake in-memory — é o que impede uma regra de valer para um adapter só.
//
// O que este arquivo acrescenta, e nenhum fake substitui:
//   1. ATOMICIDADE — duas transações concorrentes nunca recebem o mesmo NSA. Sem o `SELECT ... FOR
//      UPDATE`, ambas leem o mesmo valor, ambas gravam o mesmo incremento, e saem dois arquivos de
//      remessa com NSA idêntico — que o banco trata como RETRANSMISSÃO, não como remessa nova.
//   2. Colisão do upsert pela CHAVE NATURAL — `ON DUPLICATE KEY UPDATE` dispara em QUALQUER índice
//      único, não só na PK. O `Map` do fake decide "existe?" por id e nunca reproduz isso.
//
// GATE: só roda com `MYSQL_INTEGRATION=1` (ver `package.json §test:integration:financial`).

import { describe, it, before, beforeEach, after } from 'node:test';
import { strict as assert } from 'node:assert';
import process from 'node:process';
import { eq, like } from 'drizzle-orm';

import { openMysqlFinancial } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import type { FinancialMysqlHandle } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleCedenteAccountStore } from '#src/modules/financial/adapters/persistence/repos/cedente-account-store.drizzle.ts';
import {
  finCedenteAccounts,
  finConvenioNsa,
} from '#src/modules/financial/adapters/persistence/schemas/mysql.ts';
import * as CedenteAccountId from '#src/modules/financial/domain/cedente/cedente-account-id.ts';
import { create } from '#src/modules/financial/domain/cedente/cedente-account.ts';
import { mysqlTestConnectionString } from '#tests/support/mysql-conn.ts';
import {
  CONTRACT_AGENCY,
  CONTRACT_CONVENIO_PREFIX,
  cedenteAccountStoreContract,
} from './cedente-account-store.contract.ts';

// Chave natural distinta por conta: o UNIQUE da migration 0009 colide se dois casos reusarem
// 237/1234/567890/1. Agência própria deste arquivo — o contrato usa a sua (`CONTRACT_AGENCY`).
/**
 * Agência PRÓPRIA deste arquivo — o recorte que permite limpar na entrada sem tocar os irmãos, do
 * mesmo jeito que o contrato usa a `CONTRACT_AGENCY` para o espaço de chave dele.
 */
const OWN_AGENCY = '4321';

// ⚠️ Prefixo PRÓPRIO de convênio, distinto do que o contrato usa (#943). Desde que a sequência de
// NSA passou para `fin_convenio_nsa`, o convênio virou espaço de chave tanto quanto a agência: dois
// arquivos que o compartilhassem dividiriam o contador, e o que rodasse depois herdaria o número do
// outro. Limpo na entrada, como a agência.
const OWN_CONVENIO_PREFIX = '92';

let naturalKeySeq = 0;
const buildAccount = (over: Readonly<{ nextNsa?: number; convenio?: string }> = {}) => {
  naturalKeySeq += 1;
  const r = create({
    id: CedenteAccountId.generate(),
    bankCode: '237',
    agency: OWN_AGENCY,
    accountNumber: `9900${String(naturalKeySeq).padStart(2, '0')}`,
    accountDigit: '7',
    convenio: over.convenio ?? `${OWN_CONVENIO_PREFIX}${String(naturalKeySeq).padStart(4, '0')}`,
    document: '12345678000190',
    ...(over.nextNsa !== undefined ? { nextNsa: over.nextNsa } : {}),
  });
  if (!r.ok) throw new Error(`test setup: cedente (${r.error})`);
  return r.value;
};

if (!process.env['MYSQL_INTEGRATION']) {
  process.stdout.write('[financial:nsa-allocation] MYSQL_INTEGRATION não definido — pulando.\n');
} else {
  const connectionString =
    process.env['FINANCIAL_DATABASE_URL'] ??
    process.env['CONTRACTS_DATABASE_URL'] ??
    mysqlTestConnectionString();

  describe('Alocação de NSA — Drizzle + MySQL (integração)', () => {
    let handle: FinancialMysqlHandle;

    before(async () => {
      // poolLimit > 1 é ESSENCIAL: com uma conexão só, as "concorrentes" seriam serializadas pelo
      // pool e o teste passaria mesmo sem lock nenhum — verde vazio.
      const r = await openMysqlFinancial({ connectionString, applyMigrations: true, poolLimit: 8 });
      if (!r.ok) throw new Error(`[financial:nsa-allocation] Falha ao conectar: ${r.error}`);
      handle = r.value;
    });

    // O contrato limpa o espaço de chave DELE (`CONTRACT_AGENCY`); os casos próprios deste arquivo
    // usam `OWN_AGENCY` e precisam do mesmo tratamento. `naturalKeySeq` reinicia a cada processo, e
    // sem esta limpeza a 2ª execução colide em `fin_cedente_accounts_natural_key_uq` — em silêncio,
    // porque o `save` é upsert (vira UPDATE da linha antiga e o id novo nunca entra).
    // ⚠️ A SEQUÊNCIA TAMBÉM É RESÍDUO, e não tem FK para a conta (#943): apagar `fin_cedente_accounts`
    // deixa a linha de `fin_convenio_nsa` viva, com o contador onde o run anterior o deixou. A
    // segunda execução contra o mesmo MySQL veria o NSA começar em 11 em vez de 1 — a falha que
    // `.claude/rules/testing.md` §"passar DUAS VEZES seguidas" existe para pegar, e que a inversão de
    // ordem NÃO pega (as duas ordens partem de banco limpo).
    beforeEach(async () => {
      await handle.db.delete(finCedenteAccounts).where(eq(finCedenteAccounts.agency, OWN_AGENCY));
      await handle.db
        .delete(finConvenioNsa)
        .where(like(finConvenioNsa.convenio, `${OWN_CONVENIO_PREFIX}%`));
    });

    after(async () => {
      await handle?.close();
    });

    cedenteAccountStoreContract('Drizzle + MySQL', () => ({
      store: createDrizzleCedenteAccountStore(handle),
      // Limpa na ENTRADA, pelo espaço de chave que o contrato escreve — não por PK, que não pegaria
      // resíduo de um run anterior inserido com OUTRO id na mesma chave natural
      // (`.claude/rules/testing.md` §"Contrato de isolamento"). A agência é o recorte, então os
      // arquivos irmãos de cedente (que usam outras) ficam intactos.
      reset: async () => {
        await handle.db
          .delete(finCedenteAccounts)
          .where(eq(finCedenteAccounts.agency, CONTRACT_AGENCY));
        // A sequência do convênio é o segundo espaço de chave do contrato (#943) — ver
        // `CONTRACT_CONVENIO_PREFIX`. Sem esta linha, o re-run herda o contador.
        await handle.db
          .delete(finConvenioNsa)
          .where(like(finConvenioNsa.convenio, `${CONTRACT_CONVENIO_PREFIX}%`));
      },
    }));

    // O caso que justifica o arquivo. O teste não controla timing: dispara N alocações em paralelo
    // sobre um pool com várias conexões e cobra que os N números sejam distintos. Sob lock correto
    // isso é determinístico; sem lock, colide.
    it('DEZ alocações concorrentes produzem dez números DISTINTOS', async () => {
      const store = createDrizzleCedenteAccountStore(handle);
      const account = buildAccount();
      assert.equal((await store.save(account)).ok, true);

      const results = await Promise.all(
        Array.from({ length: 10 }, async () => store.allocateNsa(account.id)),
      );

      const allocated = results.map((r) => {
        assert.ok(r.ok, `alocação falhou: ${r.ok ? '' : r.error}`);
        return r.value as number;
      });

      const distinct = new Set(allocated);
      assert.equal(distinct.size, 10, `NSA repetido entre concorrentes: ${allocated.join(',')}`);
      assert.deepEqual(
        [...allocated].sort((a, b) => a - b),
        [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      );

      // A sequência avançou para 11 — e a conferência é pela ALOCAÇÃO, não pela coluna da conta:
      // desde a #943 o contador vive em `fin_convenio_nsa`, e `fin_cedente_accounts.next_nsa` é
      // vestigial. Conferir a coluna antiga aqui passaria sem medir nada.
      const next = await store.allocateNsa(account.id);
      assert.ok(next.ok);
      assert.equal(next.value, 11);
    });

    /*
     * ⚠️ CA3 DA #943 — E ELE É A RAZÃO DE A CORREÇÃO PRECISAR DE MySQL REAL.
     *
     * O caso acima dispara dez alocações da MESMA conta; ele já passava antes da #943, porque o lock
     * era da linha da conta e as dez disputavam a mesma linha. O defeito estava em outro lugar: duas
     * contas DIFERENTES sob o mesmo convênio não disputavam nada — cada uma tinha o seu contador, e
     * ambas partiam de 1.
     *
     * Agora o `SELECT … FOR UPDATE` locka a linha do CONVÊNIO, então a serialização passa a existir
     * entre contas irmãs. Nenhum fake demonstra isso: a garantia é do InnoDB.
     *
     * ⚠️ `poolLimit: 8` (ver `before`) é o que dá sentido ao caso. Com uma conexão só, as
     * "concorrentes" seriam serializadas pelo pool e o teste passaria mesmo sem lock nenhum.
     */
    it('CA3: alocações concorrentes de contas DIFERENTES do mesmo convênio não repetem número', async () => {
      const store = createDrizzleCedenteAccountStore(handle);
      const convenio = `${OWN_CONVENIO_PREFIX}7788`;

      const accounts = await Promise.all(
        Array.from({ length: 6 }, async () => {
          const account = buildAccount({ convenio });
          assert.equal((await store.save(account)).ok, true);
          return account;
        }),
      );

      const results = await Promise.all(
        accounts.map(async (account) => store.allocateNsa(account.id)),
      );

      const allocated = results.map((r) => {
        assert.ok(r.ok, `alocação falhou: ${r.ok ? '' : r.error}`);
        return r.value as number;
      });

      assert.equal(
        new Set(allocated).size,
        accounts.length,
        `contas irmãs receberam o MESMO NSA: ${allocated.join(',')} — é o defeito da #943, e o banco lê retransmissão`,
      );
      assert.deepEqual(
        [...allocated].sort((a, b) => a - b),
        [1, 2, 3, 4, 5, 6],
        'a sequência do convênio tem de ser contínua entre as contas',
      );
    });

    // O outro lado do CA3, e ele impede a correção de virar um contador global: convênios distintos
    // não se serializam nem se gastam. O cliente TEM contas com convênios diferentes.
    it('CA2: contas de convênios distintos alocam em paralelo sem se gastar', async () => {
      const store = createDrizzleCedenteAccountStore(handle);

      const accounts = await Promise.all(
        Array.from({ length: 4 }, async (_unused, i) => {
          const account = buildAccount({ convenio: `${OWN_CONVENIO_PREFIX}66${String(i)}0` });
          assert.equal((await store.save(account)).ok, true);
          return account;
        }),
      );

      const results = await Promise.all(
        accounts.map(async (account) => store.allocateNsa(account.id)),
      );

      for (const r of results) {
        assert.ok(r.ok);
        assert.equal(r.value, 1, 'a série de um contrato consumiu a de outro');
      }
    });

    // O outro caminho de lost update — DETERMINÍSTICO, e por isso mais fácil de disparar que a
    // corrida: `ON DUPLICATE KEY UPDATE` colide também na UNIQUE de chave natural (FR-016), não só na
    // PK. `createCedenteAccount` faz check-then-insert (TOCTOU): duas criações da MESMA conta — duplo
    // clique, ETL em paralelo — passam ambas pelo `findByNaturalKey`, e o `save` da segunda vira
    // UPDATE da linha da primeira. Com `next_nsa` no `set`, um contador em 57 voltaria a 1 sem
    // concorrência de leitura nenhuma. Este caso é o guarda dessa porta, e só existe contra MySQL: o
    // fake in-memory decide "linha existe?" por id e nunca reproduz a colisão.
    it('save de conta NOVA com chave natural já existente não zera o contador da linha existente', async () => {
      const store = createDrizzleCedenteAccountStore(handle);
      // ⚠️ Agência e convênio DENTRO do espaço que o `beforeEach` limpa. Antes este caso usava
      // `4322`/`9999999`, fora dos dois recortes — a linha sobrevivia ao run e a segunda execução
      // partia de um contador desconhecido. O `accountNumber` é que distingue esta conta das de
      // `buildAccount` (`9900NN`), e ele basta para a chave natural não colidir.
      const naturalKey = {
        bankCode: '237',
        agency: OWN_AGENCY,
        accountNumber: '880011',
        accountDigit: '9',
        convenio: `${OWN_CONVENIO_PREFIX}0011`,
        document: '12345678000190',
      };

      const first = create({ id: CedenteAccountId.generate(), ...naturalKey });
      assert.ok(first.ok);
      assert.equal((await store.save(first.value)).ok, true);

      // A conta roda e a sequência do convênio avança.
      for (let i = 0; i < 3; i += 1) {
        assert.equal((await store.allocateNsa(first.value.id)).ok, true);
      }

      // Segunda criação da MESMA conta bancária, com id novo e `nextNsa` inicial (1).
      const second = create({ id: CedenteAccountId.generate(), ...naturalKey });
      assert.ok(second.ok);
      assert.equal((await store.save(second.value)).ok, true);

      // O id de B nunca é inserido: o upsert colidiu na chave natural e atualizou a linha de A.
      const foundB = await store.findById(second.value.id);
      assert.ok(foundB.ok);
      assert.equal(foundB.value, null);

      // ⚠️ E A SEQUÊNCIA NÃO RETROCEDEU. Desde a #943 a garantia é mais forte que antes: o contador
      // nem mora mais na linha que o upsert toca — está em `fin_convenio_nsa`, e `save` não tem
      // caminho até lá. Conferir isso pela ALOCAÇÃO, e não pela coluna vestigial da conta, é o que
      // mantém o caso medindo alguma coisa.
      const next = await store.allocateNsa(first.value.id);
      assert.ok(next.ok);
      assert.equal(next.value, 4, 'a recriação da conta zerou a sequência do convênio');
    });
  });
}
