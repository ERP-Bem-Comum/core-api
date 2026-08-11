import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
import { createInMemoryVanStorage } from '#src/modules/financial/adapters/van/van-storage.in-memory.ts';

// Contrato do port, sem rede. O adapter real é provado contra MinIO em
// `van-storage.s3.integration.test.ts` — este arquivo cobre o comportamento observável, aquele
// cobre que o SDK e o bucket concordam com ele.
describe('VanStorage (fake) — escrita', () => {
  it('a remessa vai para o prefixo de saída, e a chave devolvida diz onde caiu', async () => {
    const storage = createInMemoryVanStorage();
    const r = await storage.putRemittance('PAG_X.REM', 'conteudo');

    assert.ok(isOk(r));
    assert.equal(r.value, 'saida/PAG_X.REM');
  });

  // `sandbox/` é o único prefixo seguro para exercício — e só existe no bucket de homologação.
  it('o sandbox é outro prefixo, não outro nome no mesmo lugar', async () => {
    const storage = createInMemoryVanStorage();
    const r = await storage.putSandbox('PAG_X.REM', 'conteudo');

    assert.ok(isOk(r));
    assert.equal(r.value, 'sandbox/PAG_X.REM');
  });

  // Nome com barra viraria outro prefixo — possivelmente um que o agente não varre, e a remessa
  // sumiria sem erro.
  it('recusa nome com barra ou vazio, em vez de criar chave em prefixo alheio', async () => {
    const storage = createInMemoryVanStorage();

    for (const bad of ['', 'sub/PAG_X.REM']) {
      const r = await storage.putRemittance(bad, 'x');
      assert.ok(isErr(r));
      assert.equal(r.error, 'van-storage-invalid-file-name');
    }
  });
});

describe('VanStorage (fake) — leitura', () => {
  it('lista o que o agente depositou em retorno e status, separadamente', async () => {
    const storage = createInMemoryVanStorage();
    storage.seed('retorno/PAG_1.RET', 'ret');
    storage.seed('status/PAG_1.REM.json', '{}');
    storage.seed('saida/PAG_2.REM', 'rem');

    const returns = await storage.listReturns();
    const status = await storage.listStatus();

    assert.ok(isOk(returns) && isOk(status));
    assert.deepEqual(returns.value, ['retorno/PAG_1.RET']);
    assert.deepEqual(status.value, ['status/PAG_1.REM.json']);
  });

  it('devolve o conteúdo por chave', async () => {
    const storage = createInMemoryVanStorage();
    storage.seed('status/X.json', '{"situacao":"transmitido"}');

    const r = await storage.getText('status/X.json');
    assert.ok(isOk(r));
    assert.equal(r.value, '{"situacao":"transmitido"}');
  });

  // Chave ausente é caso ESPERADO — o status de uma remessa pode ainda não existir. Distinguir de
  // indisponibilidade muda o que o chamador faz: esperar o próximo ciclo vs. alarmar.
  it('chave ausente é not-found, não indisponibilidade', async () => {
    const storage = createInMemoryVanStorage();
    const r = await storage.getText('status/nao-existe.json');

    assert.ok(isErr(r));
    assert.equal(r.error, 'van-storage-object-not-found');
  });
});

describe('VanStorage (fake) — o que ele deliberadamente NÃO faz', () => {
  // Quem move objeto entre prefixos é o AGENTE, na instância. Simular isso aqui daria a impressão
  // falsa de que o ciclo fecha dentro do nosso processo — e esconderia que, sem o agente no ar, a
  // remessa fica parada em `saida/` para sempre.
  it('não move a remessa de saída para processados sozinho', async () => {
    const storage = createInMemoryVanStorage();
    await storage.putRemittance('PAG_X.REM', 'conteudo');

    const aindaNaSaida = await storage.getText('saida/PAG_X.REM');
    assert.ok(isOk(aindaNaSaida));

    const emProcessados = await storage.getText('processados/PAG_X.REM');
    assert.ok(isErr(emProcessados));
  });
});
