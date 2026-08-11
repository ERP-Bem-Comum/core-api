// Teste de integração: adapter S3 do bucket da VAN, contra MinIO.
//
// O fake prova o CONTRATO; este arquivo prova que o SDK e um bucket real concordam com ele — que a
// chave montada é a chave gravada, que a listagem por prefixo não vaza objeto de prefixo vizinho, e
// que chave ausente vira `not-found` e não indisponibilidade.
//
// MinIO e S3 rodam o mesmo código, mudando só `forcePathStyle` (ADR-0019) — é isso que torna esta
// prova possível sem bucket de verdade.
//
// GATE: só roda com `STORAGE_INTEGRATION=1` (ver `scripts/ci/test-integration.ts §storage`).

import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import { randomUUID } from 'node:crypto';
import process from 'node:process';

import {
  S3Client,
  CreateBucketCommand,
  DeleteBucketCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from '@aws-sdk/client-s3';

import { isErr, isOk } from '#src/shared/index.ts';
import { createS3VanStorage } from '#src/modules/financial/adapters/van/van-storage.s3.ts';
import { parseVanS3Env } from '#src/modules/financial/adapters/van/van-s3-config.ts';

const ENDPOINT = 'http://localhost:9000';
const REGION = 'us-east-1';
const ACCESS_KEY = process.env['MINIO_ROOT_USER'] ?? 'dev-access-key';
const SECRET_KEY = process.env['MINIO_ROOT_PASSWORD'] ?? 'dev-secret-key-min-8-chars';

if (!process.env['STORAGE_INTEGRATION']) {
  process.stdout.write('[financial:van-storage] STORAGE_INTEGRATION não definido — pulando.\n');
} else {
  const bucket = `van-test-${randomUUID().slice(0, 8)}`;

  const config = (() => {
    const r = parseVanS3Env({
      VAN_S3_REGION: REGION,
      VAN_S3_BUCKET: bucket,
      VAN_S3_ENDPOINT: ENDPOINT,
      VAN_S3_ACCESS_KEY_ID: ACCESS_KEY,
      VAN_S3_SECRET_ACCESS_KEY: SECRET_KEY,
    });
    if (!r.ok) throw new Error(`[van-storage] config inválida: ${JSON.stringify(r.error)}`);
    return r.value;
  })();

  const raw = new S3Client({
    endpoint: ENDPOINT,
    region: REGION,
    forcePathStyle: true,
    credentials: { accessKeyId: ACCESS_KEY, secretAccessKey: SECRET_KEY },
  });

  describe('VanStorage — S3 real (MinIO)', () => {
    before(async () => {
      await raw.send(new CreateBucketCommand({ Bucket: bucket }));
    });

    after(async () => {
      const listed = await raw.send(new ListObjectsV2Command({ Bucket: bucket }));
      const keys = (listed.Contents ?? []).flatMap((o) =>
        o.Key !== undefined ? [{ Key: o.Key }] : [],
      );
      if (keys.length > 0) {
        await raw.send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: keys } }));
      }
      await raw.send(new DeleteBucketCommand({ Bucket: bucket }));
    });

    it('grava a remessa sob o prefixo de saída e devolve a chave real', async () => {
      const storage = createS3VanStorage(config);
      const r = await storage.putRemittance('PAG_INT_1.REM', 'conteudo-remessa');

      assert.ok(isOk(r));
      assert.equal(r.value, 'saida/PAG_INT_1.REM');

      const back = await storage.getText(r.value);
      assert.ok(isOk(back));
      assert.equal(back.value, 'conteudo-remessa');
    });

    it('o sandbox cai em outro prefixo, e não aparece na listagem de retorno', async () => {
      const storage = createS3VanStorage(config);
      const put = await storage.putSandbox('PAG_INT_2.REM', 'ensaio');
      assert.ok(isOk(put) && put.value === 'sandbox/PAG_INT_2.REM');

      const returns = await storage.listReturns();
      assert.ok(isOk(returns));
      assert.ok(!returns.value.includes('sandbox/PAG_INT_2.REM'));
    });

    it('lista por prefixo sem vazar objeto de prefixo vizinho', async () => {
      const storage = createS3VanStorage(config);
      // Simula o que o AGENTE depositaria: nós não escrevemos nesses prefixos em produção.
      await raw
        .send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: [] } }))
        .catch(() => undefined);

      const seeded = createS3VanStorage({
        ...config,
        prefixes: { ...config.prefixes, sandbox: 'retorno/' },
      });
      await seeded.putSandbox('PAG_INT_3.RET', 'retorno-do-banco');

      const statusSeeder = createS3VanStorage({
        ...config,
        prefixes: { ...config.prefixes, sandbox: 'status/' },
      });
      await statusSeeder.putSandbox('PAG_INT_3.REM.json', '{"situacao":"transmitido"}');

      const returns = await storage.listReturns();
      const status = await storage.listStatus();

      assert.ok(isOk(returns) && isOk(status));
      assert.ok(returns.value.includes('retorno/PAG_INT_3.RET'));
      assert.ok(status.value.includes('status/PAG_INT_3.REM.json'));
      assert.ok(!returns.value.some((k) => k.startsWith('status/')));
      assert.ok(!status.value.some((k) => k.startsWith('retorno/')));
    });

    // Chave ausente é caso esperado — o status de uma remessa pode ainda não existir. Confundir com
    // indisponibilidade faria o chamador alarmar quando devia apenas esperar o próximo ciclo.
    it('chave ausente vira not-found, não indisponibilidade', async () => {
      const storage = createS3VanStorage(config);
      const r = await storage.getText('status/nunca-existiu.json');

      assert.ok(isErr(r));
      assert.equal(r.error, 'van-storage-object-not-found');
    });

    it('recusa nome com barra antes de tocar a rede', async () => {
      const storage = createS3VanStorage(config);
      const r = await storage.putRemittance('sub/PAG_X.REM', 'x');

      assert.ok(isErr(r));
      assert.equal(r.error, 'van-storage-invalid-file-name');
    });
  });
}
