import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { type Result, ok, isErr } from '#src/shared/index.ts';
import type {
  ParseError,
  ParsedStatement,
} from '#src/modules/financial/application/ports/bank-statement-parser.ts';
import type { BankStatementParser } from '#src/modules/financial/application/ports/bank-statement-parser.ts';
// W0 RED: use-case e repo in-memory ainda não existem.
import { importBankStatement } from '#src/modules/financial/application/use-cases/import-bank-statement.ts';
import { createInMemoryBankStatementRepository } from '#src/modules/financial/adapters/persistence/repos/bank-statement-repository.in-memory.ts';
import * as CedenteAccountId from '#src/modules/financial/domain/cedente/cedente-account-id.ts';
import { create as createCedente } from '#src/modules/financial/domain/cedente/cedente-account.ts';

const WHEN = new Date('2024-05-19T09:00:00.000Z');
const clock = { now: (): Date => WHEN };

interface Captured {
  events: unknown[];
}
const fakeOutbox = (captured: Captured) => ({
  append: (events: readonly unknown[]): Promise<Result<void, 'outbox-append-failed'>> => {
    captured.events.push(...events);
    return Promise.resolve(ok(undefined));
  },
});

// Parser fake que devolve um ParsedStatement com N transações de FITID nativo 'f0'..'fN-1'.
const parserWith = (fitids: readonly string[]): BankStatementParser => {
  const statement: ParsedStatement = {
    periodStart: new Date('2024-05-01T00:00:00.000Z'),
    periodEnd: new Date('2024-05-31T00:00:00.000Z'),
    openingBalanceCents: 0,
    closingBalanceCents: 50000,
    transactions: fitids.map((fitid, i) => ({
      fitid,
      date: new Date('2024-05-18T00:00:00.000Z'),
      movement: 'Debit' as const,
      entryType: 'TED',
      payeeName: 'FORNECEDOR X',
      memo: 'pagamento',
      valueCents: 1000 + i,
      balanceAfterCents: 50000,
    })),
  };
  return { parse: (): Result<ParsedStatement, ParseError> => ok(statement) };
};

// Período sempre aberto (guard R18 do #125 é no-op no escopo do #120).
const openPeriods = {
  isClosed: (): Promise<Result<boolean, 'reconciliation-period-store-failure'>> =>
    Promise.resolve(ok(false)),
};

// Conta-cedente ativa existente — o guard de integridade (#160) exige que `debitAccountRef`
// referencie um cedente real. Stub `findById` devolve essa conta (existe e está ativa).
const activeAccount = (() => {
  const r = createCedente({
    id: CedenteAccountId.generate(),
    bankCode: '237',
    agency: '1234',
    accountNumber: '567890',
    accountDigit: '1',
    convenio: '9999999',
    document: '12345678000190',
  });
  if (!r.ok) throw new Error('setup: cedente');
  return r.value;
})();

const deps = (parser: BankStatementParser, captured: Captured) => ({
  parser,
  repo: createInMemoryBankStatementRepository(),
  periods: openPeriods,
  cedenteStore: {
    findById: (): Promise<Result<typeof activeAccount, never>> =>
      Promise.resolve(ok(activeAccount)),
  },
  clock,
  outbox: fakeOutbox(captured),
});

const input = {
  debitAccountRef: String(activeAccount.id),
  format: 'OFX' as const,
  content: '<OFX/>',
};

// Critérios em .claude/.pipeline/FIN-RECON-STATEMENT-PERSIST-HTTP/000-request.md (CA1–CA4).
describe('financial/application/use-cases/import-bank-statement', () => {
  it('CA1: 10 transações distintas → imported=10, discarded=0, evento BankStatementImported', async () => {
    const captured: Captured = { events: [] };
    const fitids = Array.from({ length: 10 }, (_, i) => `f${i}`);
    const r = await importBankStatement(deps(parserWith(fitids), captured))(input);
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value.imported, 10);
      assert.equal(r.value.discardedDuplicates, 0);
    }
    assert.equal(captured.events.length, 1);
  });

  it('CA2: reimportação parcial → dedup pela repo (knownFitids)', async () => {
    const captured: Captured = { events: [] };
    const d = deps(parserWith(['f0', 'f1', 'f2', 'f3', 'f4']), captured);
    await importBankStatement(d)(input); // 1ª: salva f0..f4

    // 2ª importação (mesma repo) com f0..f9 → f0..f4 já conhecidos.
    const second = await importBankStatement({
      ...d,
      parser: parserWith(Array.from({ length: 10 }, (_, i) => `f${i}`)),
    })(input);
    assert.equal(second.ok, true);
    if (second.ok) {
      assert.equal(second.value.imported, 5);
      assert.equal(second.value.discardedDuplicates, 5);
    }
  });

  it('CA3: parser malformado → use-case repassa err', async () => {
    const captured: Captured = { events: [] };
    const failing: BankStatementParser = {
      parse: (): Result<ParsedStatement, ParseError> => ({
        ok: false,
        error: 'malformed-statement',
      }),
    };
    const r = await importBankStatement(deps(failing, captured))(input);
    assert.equal(isErr(r), true);
  });

  it('CA4: FITID null (CSV) → use-case sintetiza (dedup continua funcionando)', async () => {
    const captured: Captured = { events: [] };
    const csvLike = parserWith(['x']);
    // sobrescreve para fitid null (simula CSV sem FITID nativo)
    const nullFitidParser: BankStatementParser = {
      parse: () => {
        const r = csvLike.parse('CSV', '');
        if (!r.ok) return r;
        const tx0 = r.value.transactions[0];
        const txs = tx0 === undefined ? [] : [{ ...tx0, fitid: null }];
        return ok({ ...r.value, transactions: txs });
      },
    };
    const r = await importBankStatement(deps(nullFitidParser, captured))(input);
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.value.imported, 1);
  });

  // #160: integridade por identidade (Vernon p.460) — guard, não FK cross-aggregate.
  it('conta-cedente inexistente → account-not-found, sem parsear/persistir', async () => {
    const captured: Captured = { events: [] };
    const fail = (label: string): never => {
      throw new Error(`não deve ser chamado quando a conta não existe: ${label}`);
    };
    const d = {
      parser: { parse: () => fail('parser.parse') },
      repo: { has: () => fail('repo.has'), save: () => fail('repo.save') },
      periods: openPeriods,
      cedenteStore: {
        findById: (): Promise<Result<null, never>> => Promise.resolve(ok(null)),
      },
      clock,
      outbox: fakeOutbox(captured),
    };
    const r = await importBankStatement(d as never)({
      debitAccountRef: String(CedenteAccountId.generate()),
      format: 'OFX',
      content: '<OFX/>',
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'account-not-found');
    assert.equal(captured.events.length, 0);
  });
});
