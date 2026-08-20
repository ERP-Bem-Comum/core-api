// Download do arquivo que FOI ao banco — o objeto do bucket, nunca uma regeração.
//
// ⚠️ Nenhum dado real de cadastro: convênio `000000` (reservado pelo gate de máscara) e UUIDs
// sintéticos.
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isOk, isErr, err } from '#src/shared/index.ts';
import { downloadRemittanceFile } from '#src/modules/financial/application/use-cases/download-remittance-file.ts';
import { createInMemoryRemittanceRepository } from '#src/modules/financial/adapters/persistence/repos/remittance-repository.in-memory.ts';
import { createInMemoryVanStorage } from '#src/modules/financial/adapters/van/van-storage.in-memory.ts';
import * as CedenteAccountId from '#src/modules/financial/domain/cedente/cedente-account-id.ts';
import * as RemittanceId from '#src/modules/financial/domain/remittance/remittance-id.ts';
import { create as createRemittance } from '#src/modules/financial/domain/remittance/remittance.ts';

const FILE = 'PAG_000000.11082026142605_000001.REM';
const CONTENT = '0'.repeat(240) + '\r\n' + '1'.repeat(240);

// Hash de mentirinha, mas DETERMINÍSTICO e sensível ao conteúdo — é o que a conferência exige. Usar
// o `sha256Hex` real aqui não provaria nada a mais e amarraria o teste ao algoritmo.
const fakeHash = (content: string): string => `h:${String(content.length)}:${content.slice(0, 8)}`;

const setup = async (over: Partial<{ content: string; hash: string }> = {}) => {
  const remittances = createInMemoryRemittanceRepository();
  const storage = createInMemoryVanStorage();

  const id = RemittanceId.generate();
  const remittance = createRemittance({
    id,
    cedenteAccountId: CedenteAccountId.generate(),
    nsa: 1,
    fileName: FILE,
    contentHash: over.hash ?? fakeHash(over.content ?? CONTENT),
    documents: [{ documentId: 'doc-a', yourNumber: '000001000001' }],
    generatedAt: '2026-08-11T14:26:05Z',
  });
  assert.ok(isOk(remittance));
  await remittances.save(remittance.value);

  return {
    id: String(id),
    storage,
    remittances,
    run: downloadRemittanceFile({ remittances, storage, hashContent: fakeHash }),
  };
};

describe('downloadRemittanceFile — acha o objeto onde o AGENTE o deixou', () => {
  it('encontra em `saida/`, antes de o agente mover', async () => {
    const s = await setup();
    s.storage.seed(`saida/${FILE}`, CONTENT);

    const r = await s.run(s.id);

    assert.ok(isOk(r));
    assert.equal(r.value.fileName, FILE);
    assert.equal(r.value.key, `saida/${FILE}`);
    assert.equal(new TextDecoder().decode(r.value.bytes), CONTENT);
  });

  // O caso NORMAL depois de um envio bem-sucedido — e é exatamente o que uma chave persistida na
  // emissão erraria, porque ela apontaria para `saida/`, de onde o objeto já saiu.
  it('encontra em `processados/` depois de o agente mover', async () => {
    const s = await setup();
    s.storage.seed(`processados/${FILE}`, CONTENT);

    const r = await s.run(s.id);

    assert.ok(isOk(r));
    assert.equal(r.value.key, `processados/${FILE}`);
  });

  // `falhas/` não é erro de download: o arquivo está lá e é justamente o que alguém quer conferir.
  // A chave devolvida é o que conta a história.
  it('encontra em `falhas/`, e a chave diz que o envio não completou', async () => {
    const s = await setup();
    s.storage.seed(`falhas/${FILE}`, CONTENT);

    const r = await s.run(s.id);

    assert.ok(isOk(r));
    assert.equal(r.value.key, `falhas/${FILE}`);
  });

  // Exercício tem o mesmo nome de envio real. Servir o de sandbox seria indistinguível para quem
  // baixa — e a pessoa concluiria que o banco recebeu um arquivo que nunca saiu daqui.
  it('NÃO procura em `sandbox/` — exercício não é evidência', async () => {
    const s = await setup();
    s.storage.seed(`sandbox/${FILE}`, CONTENT);

    const r = await s.run(s.id);

    assert.ok(isErr(r));
    assert.equal(r.error, 'remittance-file-not-found');
  });
});

describe('downloadRemittanceFile — a conferência que torna o arquivo evidência', () => {
  it('recusa quando o hash não confere — nada é entregue', async () => {
    const s = await setup();
    s.storage.seed(`saida/${FILE}`, 'OUTRO CONTEÚDO QUALQUER');

    const r = await s.run(s.id);

    assert.ok(isErr(r));
    assert.equal(
      r.error,
      'remittance-file-corrupted',
      'servir assim mesmo entregaria evidência falsa numa conferência de pagamento',
    );
  });

  // A garantia é sobre o conteúdo, não sobre o nome: um objeto com o nome certo e bytes de outra
  // remessa é exatamente o caso que o nome sozinho não pega.
  it('um byte a mais já reprova', async () => {
    const s = await setup();
    s.storage.seed(`saida/${FILE}`, CONTENT + ' ');

    const r = await s.run(s.id);

    assert.ok(isErr(r));
    assert.equal(r.error, 'remittance-file-corrupted');
  });
});

describe('downloadRemittanceFile — o que ele recusa antes de tocar o bucket', () => {
  it('id malformado é 400, não consulta ao banco com lixo', async () => {
    const s = await setup();

    const r = await s.run('não-é-uuid');

    assert.ok(isErr(r));
    assert.equal(r.error, 'remittance-id-invalid');
  });

  it('remessa inexistente é `remittance-not-found`', async () => {
    const s = await setup();

    const r = await s.run(String(RemittanceId.generate()));

    assert.ok(isErr(r));
    assert.equal(r.error, 'remittance-not-found');
  });

  // Remessa existe, objeto não está em nenhum prefixo conhecido. Não é defeito nosso — pode ser de
  // antes deste bucket — e por isso é 404, não 503.
  it('objeto ausente em todos os prefixos é `remittance-file-not-found`', async () => {
    const s = await setup();

    const r = await s.run(s.id);

    assert.ok(isErr(r));
    assert.equal(r.error, 'remittance-file-not-found');
  });
});

// #785 — "arquivo antigo" e "o agente mudou de prefixo" saíam pela MESMA porta, e as ações são
// opostas: no primeiro não há nada a fazer, no segundo a fronteira mudou e alguém precisa olhar. A
// pergunta que expôs isto veio do van-agent: *"alguém consegue distinguir?"*.
describe('downloadRemittanceFile — distingue expurgo normal de fronteira quebrada', () => {
  it('prefixo desconhecido no bucket vira erro PRÓPRIO, não "não encontrado"', async () => {
    const s = await setup();
    // O agente passou a depositar noutro lugar. O objeto existe; o contrato é que mudou.
    s.storage.seed(`enviados/${FILE}`, CONTENT);

    const r = await s.run(s.id);

    assert.ok(isErr(r));
    assert.equal(
      r.error,
      'remittance-file-prefix-drift',
      'sem isto, o dia em que o ciclo mudar parece expurgo normal',
    );
  });

  // A guarda contra consertar demais: ao ganhar o caso novo, o antigo não pode ser absorvido por
  // ele. Se os dois voltarem a responder a mesma coisa, o defeito da #785 volta invertido.
  it('bucket sem prefixo estranho continua respondendo `remittance-file-not-found`', async () => {
    const s = await setup();
    // Objetos existem, todos em prefixo do contrato — só não há o arquivo desta remessa.
    s.storage.seed(`processados/OUTRA.REM`, CONTENT);
    s.storage.seed(`status/OUTRA.REM.json`, '{}');

    const r = await s.run(s.id);

    assert.ok(isErr(r));
    assert.equal(r.error, 'remittance-file-not-found');
  });

  // `sandbox/` é prefixo do contrato: não é procurado para servir o arquivo (exercício não é
  // evidência), mas a presença dele NÃO é divergência de fronteira.
  it('objeto em `sandbox/` não é achado nem acusado como prefixo estranho', async () => {
    const s = await setup();
    s.storage.seed(`sandbox/${FILE}`, CONTENT);

    const r = await s.run(s.id);

    assert.ok(isErr(r));
    assert.equal(r.error, 'remittance-file-not-found');
  });

  it('o caminho feliz não é afetado pela detecção', async () => {
    const s = await setup();
    s.storage.seed(`saida/${FILE}`, CONTENT);
    s.storage.seed(`enviados/${FILE}`, 'ISCA — não deve ser lida');

    const r = await s.run(s.id);

    assert.ok(r.ok, 'achou no prefixo do contrato: a detecção nem roda');
    assert.equal(r.value.key, `saida/${FILE}`);
  });

  // Inferir divergência a partir de erro de rede inventaria um incidente de fronteira — e mandaria
  // alguém investigar o agente por causa de um bucket momentaneamente fora do ar.
  it('bucket indisponível NUNCA vira "prefixo mudou"', async () => {
    const s = await setup();
    const storage = {
      ...s.storage,
      findRemittance: async () => Promise.resolve(err('van-storage-unavailable' as const)),
    };

    const r = await downloadRemittanceFile({
      remittances: s.remittances,
      storage,
      hashContent: fakeHash,
    })(s.id);

    assert.ok(isErr(r));
    assert.equal(r.error, 'van-storage-unavailable');
  });
});
