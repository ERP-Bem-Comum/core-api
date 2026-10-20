/**
 * #1024 — número do contrato informável na criação (use cases `createContract` e
 * `createPendingContract`, repo em memória).
 *
 * Regra da P.O. (01/10): opcional; vazio segue o sequencial; qualquer ano; normalizado para
 * `NNNN/AAAA`; repetido → `contract-sequential-number-duplicated`. O gerador PULA os números
 * informados à mão, e um número de 2027 digitado não move o início de 2027 (`0001/2027`).
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { ok, err } from '#src/shared/primitives/result.ts';
import { ClockFixed } from '#src/shared/adapters/clock-fixed.ts';
import { InMemoryContractRepository } from '#src/modules/contracts/adapters/persistence/repos/contract-repository.in-memory.ts';
import { InMemoryOutbox } from '#src/modules/contracts/adapters/outbox/outbox.in-memory.ts';
import { createContract } from '#src/modules/contracts/application/use-cases/create-contract.ts';
import { createPendingContract } from '#src/modules/contracts/application/use-cases/create-pending-contract.ts';
import { MAX_GENERATED_NUMBER_ATTEMPTS } from '#src/modules/contracts/application/use-cases/sequential-number-input.ts';
import type { ContractRepository } from '#src/modules/contracts/domain/contract/repository.ts';
import {
  normalizeSequentialNumber,
  sequentialNumberSpellings,
} from '#src/modules/contracts/domain/contract/sequential-number.ts';

const setup = (year = '2026') => {
  const outbox = InMemoryOutbox();
  const contractRepo = InMemoryContractRepository(outbox.port);
  const clock = ClockFixed(new Date(`${year}-03-15`));
  return { deps: { contractRepo: contractRepo.repo, clock } };
};

const active = {
  title: 'Contrato vigente',
  objective: 'Objetivo',
  signedAt: '2024-03-15',
  originalValueCents: 10_000_000,
  originalPeriodStart: '2024-03-15',
  originalPeriodEnd: '2026-12-31',
  contractorType: 'supplier',
  contractorId: '55555555-5555-4555-8555-555555555555',
};

const pending = {
  title: 'Contrato pendente',
  objective: 'Objetivo',
  originalValueCents: 10_000_000,
  periodStart: '2026-03-15',
  periodEnd: '2026-12-31',
  contractorType: 'supplier',
  contractorId: '55555555-5555-4555-8555-555555555555',
};

const numberOf = (r: { ok: boolean; value?: { contract: { sequentialNumber: string } } }) =>
  r.ok ? r.value?.contract.sequentialNumber : undefined;

describe('normalizeSequentialNumber / sequentialNumberSpellings', () => {
  it('3 dígitos vira 4; 4 dígitos fica; formato inesperado volta intacto', () => {
    assert.equal(normalizeSequentialNumber('123/2024'), '0123/2024');
    assert.equal(normalizeSequentialNumber('0123/2024'), '0123/2024');
    assert.equal(normalizeSequentialNumber('ABC'), 'ABC');
    assert.equal(normalizeSequentialNumber('12/2024'), '12/2024');
  });

  it('abaixo de 1000 há duas grafias; a partir de 1000, uma', () => {
    assert.deepEqual(sequentialNumberSpellings(50, 2026), ['0050/2026', '050/2026']);
    assert.deepEqual(sequentialNumberSpellings(1234, 2026), ['1234/2026']);
  });
});

describe('#1024 — número informado na criação', () => {
  it('Active: "0123/2024" é gravado como veio (qualquer ano)', async () => {
    const { deps } = setup();
    const r = await createContract(deps)({ ...active, sequentialNumber: '0123/2024' });
    assert.equal(numberOf(r), '0123/2024');
  });

  it('Pending: "123/2024" é gravado como "0123/2024"', async () => {
    const { deps } = setup();
    const r = await createPendingContract(deps)({ ...pending, sequentialNumber: '123/2024' });
    assert.equal(numberOf(r), '0123/2024');
  });

  it('espaços em volta não contam; "" e só espaços geram o próximo do ano', async () => {
    const { deps } = setup();
    const padded = await createContract(deps)({ ...active, sequentialNumber: ' 0042/2020 ' });
    assert.equal(numberOf(padded), '0042/2020');
    const empty = await createPendingContract(deps)({ ...pending, sequentialNumber: '' });
    assert.equal(numberOf(empty), '0001/2026');
    const blank = await createPendingContract(deps)({ ...pending, sequentialNumber: '   ' });
    assert.equal(numberOf(blank), '0002/2026');
  });

  it('repetido → contract-sequential-number-duplicated, inclusive 123 × 0123', async () => {
    const { deps } = setup();
    assert.equal(
      numberOf(await createContract(deps)({ ...active, sequentialNumber: '0123/2024' })),
      '0123/2024',
    );
    const again = await createContract(deps)({ ...active, sequentialNumber: '0123/2024' });
    assert.deepEqual(again, err('contract-sequential-number-duplicated'));
    const short = await createPendingContract(deps)({ ...pending, sequentialNumber: '123/2024' });
    assert.deepEqual(short, err('contract-sequential-number-duplicated'));
  });

  for (const invalid of ['12/2024', 'ABC', '12345/2026']) {
    it(`formato inválido "${invalid}" → ContractSequentialNumberInvalidFormat`, async () => {
      const { deps } = setup();
      const r = await createContract(deps)({ ...active, sequentialNumber: invalid });
      assert.equal(r.ok, false);
      if (r.ok) return;
      assert.equal(
        typeof r.error === 'object' && 'tag' in r.error ? r.error.tag : r.error,
        'ContractSequentialNumberInvalidFormat',
      );
    });
  }
});

describe('#1024 — o gerador pula números informados à mão', () => {
  it('contador em 10 e "0011/2026" informado → o próximo gerado é 0012/2026, sem 409', async () => {
    const { deps } = setup('2026');
    for (let i = 1; i <= 10; i += 1) {
      const r = await createPendingContract(deps)(pending);
      assert.equal(numberOf(r), `${String(i).padStart(4, '0')}/2026`);
    }
    const manual = await createPendingContract(deps)({ ...pending, sequentialNumber: '0011/2026' });
    assert.equal(numberOf(manual), '0011/2026');
    const next = await createPendingContract(deps)(pending);
    assert.equal(numberOf(next), '0012/2026');
  });

  it('o 1º gerado em 2027 é 0001/2027, mesmo com números de 2027 informados mais à frente', async () => {
    const { deps } = setup('2027');
    const manual = await createContract(deps)({ ...active, sequentialNumber: '0300/2027' });
    assert.equal(numberOf(manual), '0300/2027');
    const first = await createPendingContract(deps)(pending);
    assert.equal(numberOf(first), '0001/2027');
  });

  it('informados em 0001 e 0002 de 2027 → o 1º gerado pula para 0003/2027', async () => {
    const { deps } = setup('2027');
    await createContract(deps)({ ...active, sequentialNumber: '0001/2027' });
    await createContract(deps)({ ...active, sequentialNumber: '002/2027' });
    const first = await createPendingContract(deps)(pending);
    assert.equal(numberOf(first), '0003/2027');
  });
});

describe('#1024 — corrida: dois POSTs com o mesmo número', () => {
  // A checagem prévia não vê o concorrente (os dois leem "não existe"); quem perde bate no
  // UNIQUE e o repositório devolve `contract-repo-conflict`. O use case responde o 409 de
  // número repetido — não o 503 de repositório indisponível.
  const blindRepo = (inner: ContractRepository): ContractRepository => ({
    ...inner,
    findBySequentialNumber: () => Promise.resolve(ok(null)),
  });

  it('Active: o perdedor recebe contract-sequential-number-duplicated', async () => {
    const { deps } = setup();
    const raced = { ...deps, contractRepo: blindRepo(deps.contractRepo) };
    const winner = await createContract(raced)({ ...active, sequentialNumber: '0777/2026' });
    assert.equal(numberOf(winner), '0777/2026');
    const loser = await createContract(raced)({ ...active, sequentialNumber: '0777/2026' });
    assert.deepEqual(loser, err('contract-sequential-number-duplicated'));
  });

  it('Pending: o perdedor recebe contract-sequential-number-duplicated', async () => {
    const { deps } = setup();
    const raced = { ...deps, contractRepo: blindRepo(deps.contractRepo) };
    await createPendingContract(raced)({ ...pending, sequentialNumber: '0778/2026' });
    const loser = await createPendingContract(raced)({ ...pending, sequentialNumber: '0778/2026' });
    assert.deepEqual(loser, err('contract-sequential-number-duplicated'));
  });
});

describe('#1071 (CA3) — número GERADO que colide é gerado de novo', () => {
  // A corrida do issue: o gerador entrega N; entre essa entrega e o `save`, outra criação com N
  // DIGITADO commita primeiro. Quem deixou o campo vazio não digitou nada — não pode levar 409.
  const racedByTypedNumber = (deps: ReturnType<typeof setup>['deps'], steals: number) => {
    let calls = 0;
    const contractRepo: ContractRepository = {
      ...deps.contractRepo,
      nextSequentialNumber: async (year) => {
        calls += 1;
        const r = await deps.contractRepo.nextSequentialNumber(year);
        if (r.ok && calls <= steals) {
          const thief = await createContract(deps)({ ...active, sequentialNumber: r.value });
          assert.equal(numberOf(thief), r.value, 'fixture: o concorrente deveria gravar N');
        }
        return r;
      },
    };
    return { deps: { ...deps, contractRepo }, calls: () => calls };
  };

  it('Pending: o 0001 gerado é tomado por um digitado → grava com 0002/2026', async () => {
    const { deps } = setup();
    const raced = racedByTypedNumber(deps, 1);
    const r = await createPendingContract(raced.deps)(pending);
    assert.equal(numberOf(r), '0002/2026');
    assert.equal(raced.calls(), 2);
  });

  it('Active: o 0001 gerado é tomado por um digitado → grava com 0002/2026', async () => {
    const { deps } = setup();
    const raced = racedByTypedNumber(deps, 1);
    const r = await createContract(raced.deps)(active);
    assert.equal(numberOf(r), '0002/2026');
  });

  it('tentativas esgotadas → erro nomeado de geração, não o 409 de número digitado', async () => {
    const { deps } = setup();
    const raced = racedByTypedNumber(deps, Number.POSITIVE_INFINITY);
    const r = await createPendingContract(raced.deps)(pending);
    assert.deepEqual(r, err('contract-sequential-number-generation-exhausted'));
    assert.equal(raced.calls(), MAX_GENERATED_NUMBER_ATTEMPTS);
    const exhaustedActive = racedByTypedNumber(setup().deps, Number.POSITIVE_INFINITY);
    const active2 = await createContract(exhaustedActive.deps)(active);
    assert.deepEqual(active2, err('contract-sequential-number-generation-exhausted'));
  });

  it('falha de repositório no save não é colisão: devolve o erro sem gerar de novo', async () => {
    const { deps } = setup();
    let calls = 0;
    const contractRepo: ContractRepository = {
      ...deps.contractRepo,
      nextSequentialNumber: (year) => {
        calls += 1;
        return deps.contractRepo.nextSequentialNumber(year);
      },
      save: () => Promise.resolve(err('contract-repo-unavailable')),
    };
    const r = await createPendingContract({ ...deps, contractRepo })(pending);
    assert.deepEqual(r, err('contract-repo-unavailable'));
    assert.equal(calls, 1);
  });

  it('número DIGITADO que colide no save continua 409, sem chamar o gerador', async () => {
    const { deps } = setup();
    let calls = 0;
    const contractRepo: ContractRepository = {
      ...deps.contractRepo,
      findBySequentialNumber: () => Promise.resolve(ok(null)),
      nextSequentialNumber: (year) => {
        calls += 1;
        return deps.contractRepo.nextSequentialNumber(year);
      },
      save: () => Promise.resolve(err('contract-repo-conflict')),
    };
    const r = await createContract({ ...deps, contractRepo })({
      ...active,
      sequentialNumber: '0042/2026',
    });
    assert.deepEqual(r, err('contract-sequential-number-duplicated'));
    assert.equal(calls, 0);
  });
});
