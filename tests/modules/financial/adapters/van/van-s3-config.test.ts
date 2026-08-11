import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
import { parseVanS3Env } from '#src/modules/financial/adapters/van/van-s3-config.ts';

const base = { VAN_S3_REGION: 'sa-east-1', VAN_S3_BUCKET: 'bucket-qualquer' };

const parsed = (over: Readonly<Record<string, string>> = {}) => {
  const r = parseVanS3Env({ ...base, ...over });
  assert.ok(isOk(r), `esperava ok, veio ${isErr(r) ? JSON.stringify(r.error) : '?'}`);
  return r.value;
};

describe('VAN_S3_* — configuração própria, separada do S3_* dos documentos', () => {
  it('exige região e bucket', () => {
    const semRegiao = parseVanS3Env({ VAN_S3_BUCKET: base.VAN_S3_BUCKET });
    assert.ok(isErr(semRegiao));
    assert.deepEqual(semRegiao.error, { tag: 'missing-env', field: 'VAN_S3_REGION' });

    const semBucket = parseVanS3Env({ VAN_S3_REGION: base.VAN_S3_REGION });
    assert.ok(isErr(semBucket));
    assert.deepEqual(semBucket.error, { tag: 'missing-env', field: 'VAN_S3_BUCKET' });
  });

  // Ausentes as duas chaves, a resolução cai no provider chain (IAM Role) — que é como a aplicação
  // roda em produção. Não é config faltando: é a config correta.
  it('sem credencial explícita, delega ao provider chain', () => {
    assert.equal(parsed().credentials, undefined);
  });

  it('aceita credencial estática quando as DUAS vêm juntas', () => {
    const cfg = parsed({ VAN_S3_ACCESS_KEY_ID: 'AK', VAN_S3_SECRET_ACCESS_KEY: 'SK' });
    assert.deepEqual(cfg.credentials, { accessKeyId: 'AK', secretAccessKey: 'SK' });
  });

  // Config pela metade é pior que config ausente: uma delas presente sugere intenção de credencial
  // estática que não vai funcionar, e o fallback silencioso para IAM esconderia o engano.
  it('recusa XOR de credencial', () => {
    assert.ok(isErr(parseVanS3Env({ ...base, VAN_S3_ACCESS_KEY_ID: 'AK' })));
    assert.ok(isErr(parseVanS3Env({ ...base, VAN_S3_SECRET_ACCESS_KEY: 'SK' })));
  });
});

describe('VAN_S3_* — prefixos', () => {
  it('traz os cinco do contrato mais o sandbox, por default', () => {
    assert.deepEqual(parsed().prefixes, {
      outbound: 'saida/',
      processed: 'processados/',
      failed: 'falhas/',
      returns: 'retorno/',
      status: 'status/',
      sandbox: 'sandbox/',
    });
  });

  // Sem a barra, `saida` + `X.REM` vira `saidaX.REM`: um objeto na RAIZ do bucket, que o agente
  // nunca varre. A remessa sumiria sem erro algum.
  it('acrescenta a barra final quando ela falta', () => {
    assert.equal(parsed({ VAN_S3_PREFIX_OUTBOUND: 'fila-saida' }).prefixes.outbound, 'fila-saida/');
  });

  it('preserva o prefixo que já vem com barra', () => {
    assert.equal(parsed({ VAN_S3_PREFIX_STATUS: 'st/' }).prefixes.status, 'st/');
  });

  it('recusa prefixo com barra inicial, que geraria chave inválida', () => {
    const r = parseVanS3Env({ ...base, VAN_S3_PREFIX_RETURNS: '/retorno' });
    assert.ok(isErr(r));
    assert.equal(r.error.tag, 'invalid-prefix');
  });
});

describe('VAN_S3_* — endpoint', () => {
  it('sem endpoint, assume AWS e path-style desligado', () => {
    const cfg = parsed();
    assert.equal(cfg.endpoint, undefined);
    assert.equal(cfg.forcePathStyle, false);
  });

  it('endpoint local liga path-style, que é o que MinIO exige', () => {
    assert.equal(parsed({ VAN_S3_ENDPOINT: 'http://localhost:9000' }).forcePathStyle, true);
  });

  it('endpoint remoto não liga path-style', () => {
    assert.equal(parsed({ VAN_S3_ENDPOINT: 'https://s3.exemplo.com' }).forcePathStyle, false);
  });
});
