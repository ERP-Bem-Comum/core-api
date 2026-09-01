import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { parseAwsS3Env } from '#src/modules/contracts/public-api/index.ts';
import { decideDocumentStorage } from '#src/modules/financial/adapters/storage/document-storage-decision.ts';

// Os erros passam pelo parser real, e não são construídos à mão: erro inventado provaria uma
// política sobre um estado que o código nunca alcança.
const complete = { S3_REGION: 'br-ne1', S3_BUCKET: 'bucket-qualquer' };

const PRODUCTION = { NODE_ENV: 'production' };
const DEVELOPMENT = { NODE_ENV: 'development' };

const decide = (over: Readonly<Record<string, string>>, env: Readonly<Record<string, string>>) =>
  decideDocumentStorage(parseAwsS3Env(over), env);

describe('decideDocumentStorage — configuração íntegra', () => {
  it('usa o bucket real, em qualquer ambiente', () => {
    for (const env of [PRODUCTION, DEVELOPMENT]) {
      const decision = decide(complete, env);
      assert.equal(decision.kind, 's3');
    }
  });
});

// A política do #516 (`server.ts:133-136`): storage de arquivo do usuário ausente em produção
// derruba o boot, "em vez de subir com store volátil, que aceitava o upload e perdia o arquivo no
// restart". Aqui vale igual — não existe "o storage de documento ainda não subiu".
describe('decideDocumentStorage — em produção, configuração incompleta derruba o boot', () => {
  it('recusa quando falta o bucket', () => {
    const decision = decide({ S3_REGION: 'br-ne1' }, PRODUCTION);
    assert.ok(decision.kind === 'refuse');
    assert.match(decision.error, /S3_BUCKET/);
  });

  it('recusa quando o nome do bucket é inválido', () => {
    const decision = decide({ ...complete, S3_BUCKET: 'A' }, PRODUCTION);
    assert.ok(decision.kind === 'refuse');
    assert.match(decision.error, /S3_BUCKET/);
  });

  it('recusa o XOR de credencial', () => {
    const decision = decide({ ...complete, S3_ACCESS_KEY_ID: 'AKIAEXEMPLO' }, PRODUCTION);
    assert.ok(decision.kind === 'refuse');
    assert.match(decision.error, /S3_SECRET_ACCESS_KEY/);
  });
});

describe('decideDocumentStorage — fora de produção degrada, mas nunca calada', () => {
  it('avisa nomeando o campo e a consequência', () => {
    const decision = decide({ S3_REGION: 'br-ne1' }, DEVELOPMENT);
    assert.ok(decision.kind === 'memory');
    assert.match(decision.warning, /S3_BUCKET/);
    assert.match(decision.warning, /perdido no restart/);
  });

  it('o bucket inválido também degrada, com o valor recusado no aviso', () => {
    const decision = decide({ ...complete, S3_BUCKET: 'A' }, DEVELOPMENT);
    assert.ok(decision.kind === 'memory');
    assert.match(decision.warning, /"A"/);
  });
});

// CWE-532: a mensagem sai em stderr no boot. Das duas variantes de `AwsS3EnvError`, só
// `invalid-bucket` carrega `raw` — e ele é o nome do bucket, não credencial. O XOR sai como
// `missing-env`, que carrega só o NOME. Este teste é a guarda dessa propriedade.
describe('decideDocumentStorage — o diagnóstico nunca ecoa credencial', () => {
  it('o XOR nomeia o campo que falta sem revelar a chave presente', () => {
    const decision = decide({ ...complete, S3_ACCESS_KEY_ID: 'AKIAEXEMPLO' }, PRODUCTION);
    assert.ok(decision.kind === 'refuse');
    assert.equal(decision.error.includes('AKIAEXEMPLO'), false);
  });
});

// NOTA — o teste que falta, e por que ele não está aqui: a assimetria entre esta política e a do
// storage da VAN é deliberada (ausência derruba aqui, degrada lá), e unificar as duas num helper
// parametrizado é a refatoração que parece óbvia e apagaria a diferença. O teste que fixaria isso
// precisa importar `decideVanStorage`, que ainda vive só na branch da #798. Ele entra quando as
// duas estiverem na `dev` — e o lugar dele é `tests/cleanup/`, porque a propriedade é do
// repositório, não deste arquivo.
