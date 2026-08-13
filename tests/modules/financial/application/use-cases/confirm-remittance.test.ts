import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk, err } from '#src/shared/index.ts';
import { confirmRemittance } from '#src/modules/financial/application/use-cases/confirm-remittance.ts';
import { createInMemoryRemittanceRepository } from '#src/modules/financial/adapters/persistence/repos/remittance-repository.in-memory.ts';
import { createInMemoryVanStorage } from '#src/modules/financial/adapters/van/van-storage.in-memory.ts';
import { createVanStatusEnvelopeReader } from '#src/modules/financial/adapters/van/status-envelope.ts';
import * as CedenteAccountId from '#src/modules/financial/domain/cedente/cedente-account-id.ts';
import * as RemittanceId from '#src/modules/financial/domain/remittance/remittance-id.ts';
import { create as createRemittance } from '#src/modules/financial/domain/remittance/remittance.ts';
import type { RemittanceRepository } from '#src/modules/financial/application/ports/remittance-repository.ts';
import type { VanStoragePort } from '#src/modules/financial/application/ports/van-storage.ts';

const FILE = 'PAG_491939.11082026142605_000001.REM';
const OTHER = 'PAG_491939.11082026143012_000002.REM';
const EXECUTED_AT = '2026-08-11T14:31:07Z';

// O envelope que o AGENTE publica — chaves em PT-BR, como no contrato acordado com a infra.
const envelope = (
  over: Partial<{
    arquivo: string;
    situacao: string;
    detalhe: string;
    exitCode: number | null;
    executadoEm: string;
  }> = {},
): string =>
  JSON.stringify({
    arquivo: over.arquivo ?? FILE,
    executadoEm: over.executadoEm ?? EXECUTED_AT,
    situacao: over.situacao ?? 'transmitido',
    detalhe: over.detalhe ?? 'arquivo transmitido e movido para BACKUP',
    exitCode: over.exitCode === undefined ? 0 : over.exitCode,
    logTransferencia: ['linha crua do log'],
  });

const setup = async (over: Partial<{ files: readonly string[] }> = {}) => {
  const remittances = createInMemoryRemittanceRepository();
  const storage = createInMemoryVanStorage();

  const cedenteAccountId = CedenteAccountId.generate();

  for (const [i, fileName] of (over.files ?? [FILE]).entries()) {
    const remittance = createRemittance({
      id: RemittanceId.generate(),
      cedenteAccountId,
      nsa: i + 1,
      fileName,
      contentHash: `hash-${String(i)}`,
      documentIds: [`doc-${String(i)}-a`, `doc-${String(i)}-b`],
      generatedAt: '2026-08-11T14:26:05Z',
    });
    assert.ok(isOk(remittance));
    await remittances.save(remittance.value);
  }

  return {
    remittances,
    storage,
    deps: { storage, remittances, statusReader: createVanStatusEnvelopeReader() },
  };
};

const statusOf = async (remittances: RemittanceRepository, fileName: string) => {
  const found = await remittances.findByFileName(fileName);
  assert.ok(isOk(found) && found.value !== null, `remessa ${fileName} não encontrada`);
  return found.value;
};

describe('confirmRemittance — o que resolve uma remessa', () => {
  it('confirma a remessa quando o agente diz que transmitiu', async () => {
    const s = await setup();
    s.storage.seed(`status/${FILE}.json`, envelope());

    const r = await confirmRemittance(s.deps)();

    assert.ok(isOk(r), `esperava ok, veio ${isErr(r) ? r.error : '?'}`);
    assert.deepEqual(r.value.confirmed, [FILE]);
    assert.deepEqual(r.value.failed, []);

    const remittance = await statusOf(s.remittances, FILE);
    assert.equal(remittance.status, 'Transmitted');
    assert.equal(remittance.settledAt, EXECUTED_AT);
    assert.equal(remittance.detail, 'arquivo transmitido e movido para BACKUP');
  });

  it('marca falha quando o agente reporta falha', async () => {
    const s = await setup();
    s.storage.seed(
      `status/${FILE}.json`,
      envelope({ situacao: 'falha', detalhe: 'conexão recusada pelo STCPCLT', exitCode: 1 }),
    );

    const r = await confirmRemittance(s.deps)();

    assert.ok(isOk(r));
    assert.deepEqual(r.value.failed, [FILE]);
    assert.equal((await statusOf(s.remittances, FILE)).status, 'Failed');
  });

  // `revisao` não é "deu certo": vai para o balde que exige decisão humana. E `Failed` NÃO libera os
  // documentos — só o descarte explícito faz isso.
  it('trata `revisao` como falha, sem liberar os documentos', async () => {
    const s = await setup();
    s.storage.seed(`status/${FILE}.json`, envelope({ situacao: 'revisao' }));

    const r = await confirmRemittance(s.deps)();
    assert.ok(isOk(r));
    assert.deepEqual(r.value.failed, [FILE]);

    const remittance = await statusOf(s.remittances, FILE);
    assert.equal(remittance.status, 'Failed');

    const held = await s.remittances.findHeldDocumentIds(remittance.documentIds);
    assert.ok(isOk(held));
    assert.deepEqual(held.value, [...remittance.documentIds].sort(), 'Failed segue prendendo');
  });

  // O veredito vem de evidência física (arquivo em BACKUP), não de código de retorno.
  it('confirma mesmo com `exitCode` nulo — quem decide é a situação', async () => {
    const s = await setup();
    s.storage.seed(`status/${FILE}.json`, envelope({ exitCode: null }));

    const r = await confirmRemittance(s.deps)();
    assert.ok(isOk(r));
    assert.deepEqual(r.value.confirmed, [FILE]);
  });
});

describe('confirmRemittance — o que ele se recusa a concluir', () => {
  // Duplicado significa "reconheci o nome e NÃO acionei o STCPCLT". Não confirma, porque nada saiu
  // nesta execução; não falha, porque o envio original pode ter saído antes.
  it('ignora status de duplicado, deixando a remessa como estava', async () => {
    const s = await setup();
    s.storage.seed(
      `status/${FILE}.duplicado-20260811T1431.json`,
      envelope({ situacao: 'transmitido', detalhe: 'nome já processado; STCPCLT não executado' }),
    );

    const r = await confirmRemittance(s.deps)();

    assert.ok(isOk(r));
    assert.deepEqual(r.value.confirmed, [], 'duplicado não confirma');
    assert.deepEqual(r.value.failed, [], 'duplicado também não falha');
    assert.equal(r.value.ignored.length, 1);
    assert.equal((await statusOf(s.remittances, FILE)).status, 'Queued');
  });

  it('ignora envelope de recepção — fala do retorno, não da remessa', async () => {
    const s = await setup();
    s.storage.seed(
      'status/recepcao-20260811T1431.json',
      envelope({ situacao: 'recepcao', arquivo: 'PAG_491939.RET' }),
    );

    const r = await confirmRemittance(s.deps)();

    assert.ok(isOk(r));
    assert.equal(r.value.ignored.length, 1);
    assert.equal((await statusOf(s.remittances, FILE)).status, 'Queued');
  });

  it('reporta status cujo arquivo não é uma remessa nossa', async () => {
    const s = await setup();
    s.storage.seed(
      'status/PAG_999999.01012026000000_000009.REM.json',
      envelope({ arquivo: 'PAG_999999.01012026000000_000009.REM' }),
    );

    const r = await confirmRemittance(s.deps)();

    assert.ok(isOk(r));
    assert.deepEqual(r.value.unmatched, ['PAG_999999.01012026000000_000009.REM']);
    assert.deepEqual(r.value.confirmed, []);
  });
});

describe('confirmRemittance — resiliência da varredura', () => {
  // A falha mais cara seria deixar dezenas de remessas `Queued` por causa de um JSON corrompido.
  it('um envelope ilegível não impede a confirmação dos demais', async () => {
    const s = await setup({ files: [FILE, OTHER] });
    s.storage.seed('status/quebrado.json', '{ isto não é json');
    s.storage.seed(`status/${OTHER}.json`, envelope({ arquivo: OTHER }));

    const r = await confirmRemittance(s.deps)();

    assert.ok(isOk(r));
    assert.deepEqual(r.value.unreadable, ['status/quebrado.json']);
    assert.deepEqual(r.value.confirmed, [OTHER]);
    assert.equal((await statusOf(s.remittances, OTHER)).status, 'Transmitted');
  });

  it('falha da listagem aborta — sem lista não há varredura', async () => {
    const s = await setup();
    const storage: VanStoragePort = {
      ...s.storage,
      listStatus: async () => Promise.resolve(err('van-storage-unavailable')),
    };

    const r = await confirmRemittance({ ...s.deps, storage })();

    assert.ok(isErr(r));
    assert.equal(r.error, 'van-status-unavailable');
  });

  it('falha de persistência aborta — a varredura será repetida', async () => {
    const s = await setup();
    s.storage.seed(`status/${FILE}.json`, envelope());
    const remittances: RemittanceRepository = {
      ...s.remittances,
      save: async () => Promise.resolve(err('remittance-repository-unavailable')),
    };

    const r = await confirmRemittance({ ...s.deps, remittances })();

    assert.ok(isErr(r));
    assert.equal(r.error, 'remittance-persist-failed');
  });
});

describe('confirmRemittance — idempotência', () => {
  // O agente não apaga objeto de status: o mesmo envelope é relido a cada passagem.
  it('reprocessar o mesmo status preserva o primeiro desfecho', async () => {
    const s = await setup();
    s.storage.seed(`status/${FILE}.json`, envelope());

    const first = await confirmRemittance(s.deps)();
    const second = await confirmRemittance(s.deps)();

    assert.ok(isOk(first) && isOk(second));
    assert.deepEqual(second.value.confirmed, [FILE]);

    const remittance = await statusOf(s.remittances, FILE);
    assert.equal(remittance.status, 'Transmitted');
    assert.equal(remittance.settledAt, EXECUTED_AT, 'settledAt não é reescrito');
  });

  // Sem isto, toda varredura reescreveria todas as remessas já resolvidas — para sempre.
  it('não reescreve remessa cujo desfecho já era esse', async () => {
    const s = await setup();
    s.storage.seed(`status/${FILE}.json`, envelope());

    let saves = 0;
    const counting: RemittanceRepository = {
      ...s.remittances,
      save: async (remittance) => {
        saves += 1;
        return s.remittances.save(remittance);
      },
    };
    const deps = { ...s.deps, remittances: counting };

    await confirmRemittance(deps)();
    assert.equal(saves, 1, 'a primeira passagem grava');

    await confirmRemittance(deps)();
    assert.equal(saves, 1, 'a segunda não tem o que gravar');
  });

  // A ordem de chegada dos objetos de status não é garantida, e o desfecho positivo é o mais caro
  // de perder: uma remessa confirmada não é rebaixada por leitura tardia.
  it('não rebaixa remessa confirmada quando chega uma falha tardia', async () => {
    const s = await setup();
    s.storage.seed(`status/${FILE}.json`, envelope());

    const first = await confirmRemittance(s.deps)();
    assert.ok(isOk(first));

    s.storage.seed(`status/${FILE}.json`, envelope({ situacao: 'falha' }));
    const second = await confirmRemittance(s.deps)();

    assert.ok(isOk(second));
    assert.deepEqual(second.value.conflicted, [FILE]);
    assert.equal((await statusOf(s.remittances, FILE)).status, 'Transmitted');
  });
});

describe('confirmRemittance — bucket vazio', () => {
  it('varredura sem status não muda nada', async () => {
    const s = await setup();

    const r = await confirmRemittance(s.deps)();

    assert.ok(isOk(r));
    assert.deepEqual(r.value, {
      confirmed: [],
      failed: [],
      ignored: [],
      unmatched: [],
      unreadable: [],
      conflicted: [],
    });
    assert.equal((await statusOf(s.remittances, FILE)).status, 'Queued');
  });
});
