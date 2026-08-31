import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { parseVanS3Env } from '#src/modules/financial/adapters/van/van-s3-config.ts';
import { decideVanStorage } from '#src/modules/financial/adapters/van/van-storage-decision.ts';

// Os erros NÃO são construídos à mão: passam pelo parser real, para que o teste amarre desfecho a
// erro que `parseVanS3Env` de fato produz. Erro inventado aqui provaria uma política sobre um
// estado que o código nunca alcança.
const complete = { VAN_S3_REGION: 'sa-east-1', VAN_S3_BUCKET: 'bucket-qualquer' };

const PRODUCTION = { NODE_ENV: 'production' };
const DEVELOPMENT = { NODE_ENV: 'development' };

const decide = (over: Readonly<Record<string, string>>, env: Readonly<Record<string, string>>) =>
  decideVanStorage(parseVanS3Env(over), env);

describe('decideVanStorage — configuração íntegra', () => {
  it('usa o bucket real, em qualquer ambiente', () => {
    for (const env of [PRODUCTION, DEVELOPMENT]) {
      const decision = decide(complete, env);
      assert.equal(decision.kind, 's3');
      assert.equal(decision.kind === 's3' && decision.config.bucket, 'bucket-qualquer');
    }
  });
});

// A assimetria em relação à guarda da #456, e a razão de esta suíte existir: para os 7 módulos de
// persistência, config ausente em produção derruba o boot. Aqui NÃO derruba — `specs.ts:353-357`
// registra que "a produção enquanto a VAN não sobe" é um ambiente legítimo sem `VAN_S3_*`, e a #860
// confirma que a homologação roda assim. O que muda é a mudez, não o desfecho.
describe('decideVanStorage — configuração AUSENTE nunca derruba o boot', () => {
  it('degrada para memória mesmo em produção', () => {
    const decision = decide({ VAN_S3_REGION: 'sa-east-1' }, PRODUCTION);
    assert.equal(decision.kind, 'memory');
  });

  it('degrada para memória fora de produção', () => {
    const decision = decide({ VAN_S3_REGION: 'sa-east-1' }, DEVELOPMENT);
    assert.equal(decision.kind, 'memory');
  });

  // O ponto inteiro da #798: o fallback continua existindo, mas deixa de ser mudo. Sem o nome do
  // campo o operador sabe que degradou e não sabe o que preencher.
  it('o aviso nomeia o campo que falta e a consequência', () => {
    const decision = decide({ VAN_S3_REGION: 'sa-east-1' }, PRODUCTION);
    assert.ok(decision.kind === 'memory');
    assert.match(decision.warning, /VAN_S3_BUCKET/);
    assert.match(decision.warning, /memoria/);
    assert.match(decision.warning, /NAO sobe para o bucket/);
  });
});

// Config presente, lida e RECUSADA é de outra natureza: o parser achou o defeito, nomeou o campo e
// devolveu `err` — e era esse diagnóstico que o ternário destruía.
describe('decideVanStorage — configuração RECUSADA', () => {
  it('derruba o boot em produção quando o booleano não é interpretável', () => {
    const decision = decide({ ...complete, VAN_S3_FORCE_PATH_STYLE: 'talvez' }, PRODUCTION);
    assert.ok(decision.kind === 'refuse');
    assert.match(decision.error, /VAN_S3_FORCE_PATH_STYLE/);
  });

  // O caminho que já falhava antes do PR #797 — prefixo com barra inicial. Entra pela mesma porta.
  it('derruba o boot em produção quando o prefixo tem barra inicial', () => {
    const decision = decide({ ...complete, VAN_S3_PREFIX_RETURNS: '/retorno' }, PRODUCTION);
    assert.ok(decision.kind === 'refuse');
    assert.match(decision.error, /VAN_S3_PREFIX_RETURNS/);
  });

  it('fora de produção degrada, mas com o valor recusado no aviso', () => {
    const decision = decide({ ...complete, VAN_S3_FORCE_PATH_STYLE: 'talvez' }, DEVELOPMENT);
    assert.ok(decision.kind === 'memory');
    assert.match(decision.warning, /VAN_S3_FORCE_PATH_STYLE/);
    assert.match(decision.warning, /talvez/);
  });
});

// CWE-532: a mensagem sai em stderr no boot, e o coletor de log tem audiência maior e retenção mais
// longa que o secret store. O XOR de credencial é a única variante que TOCA num campo sensível — e
// ela sai como `missing-env`, que carrega só o NOME. Este teste é a guarda dessa propriedade: se
// alguém fizer o parser devolver `raw` de credencial, ele fica vermelho.
describe('decideVanStorage — o diagnóstico nunca ecoa credencial', () => {
  it('o XOR de chave/secret nomeia o campo sem revelar o valor presente', () => {
    const decision = decide({ ...complete, VAN_S3_ACCESS_KEY_ID: 'AKIAEXEMPLO' }, PRODUCTION);
    assert.ok(decision.kind === 'memory');
    assert.match(decision.warning, /VAN_S3_SECRET_ACCESS_KEY/);
    assert.equal(decision.warning.includes('AKIAEXEMPLO'), false);
  });
});
