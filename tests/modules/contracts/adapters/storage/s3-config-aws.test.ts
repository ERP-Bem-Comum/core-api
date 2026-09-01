/**
 * Tests para awsS3Config + parseAwsS3Env (incluindo suporte a IAM Role — issue #244).
 *
 * Ticket: CTR-STORAGE-S3-ADAPTER / IAM-ROLE-S3.
 *
 * Cobre CA-T15..T22 (originais) + T23..T25 (IAM Role):
 *   T15 - parseAwsS3Env com env valido retorna ok(S3StorageConfig) defaults inferidos
 *   T16 - S3_ENDPOINT contendo 'localhost' infere forcePathStyle=true
 *   T17 - S3_FORCE_PATH_STYLE='true' override explicito
 *   T18 - S3_REGION ausente retorna err missing-env field S3_REGION
 *   T19 - S3_BUCKET ausente retorna err missing-env field S3_BUCKET
 *   T20 - S3_ACCESS_KEY_ID ausente retorna err missing-env field S3_ACCESS_KEY_ID
 *   T21 - S3_BUCKET invalido (UPPERCASE) retorna err invalid-bucket
 *   T22 - awsS3Config(input) direto (sem env) com endpoint customizado
 *   T23 - ambos ausentes (IAM Role) -> config sem accessKeyId/secretAccessKey
 *   T24 - apenas accessKeyId presente (XOR) -> err missing-env secretAccessKey
 *   T25 - apenas secretAccessKey presente (XOR) -> err missing-env accessKeyId
 *
 * ASCII puro.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import {
  awsS3Config,
  parseAwsS3Env,
  describeAwsS3EnvError,
} from '#src/modules/contracts/adapters/storage/s3-config-aws.ts';
import { createBucketName } from '#src/modules/contracts/application/ports/document-storage.types.ts';

const fromOk = <T>(r: { ok: true; value: T } | { ok: false; error: unknown }, label: string): T => {
  if (!r.ok) throw new Error(`fixture ${label} invalida: ${JSON.stringify(r.error)}`);
  return r.value;
};

const baseEnv = (): NodeJS.ProcessEnv => ({
  S3_REGION: 'us-east-1',
  S3_BUCKET: 'contracts-documents',
  S3_ACCESS_KEY_ID: 'AKIA-FAKE',
  S3_SECRET_ACCESS_KEY: 'sekret-fake',
});

describe('parseAwsS3Env', () => {
  it('CA-T15: env valido completo retorna ok com defaults inferidos', () => {
    // Act
    const r = parseAwsS3Env(baseEnv());

    // Assert
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value.endpoint, 'https://s3.us-east-1.amazonaws.com');
      assert.equal(r.value.region, 'us-east-1');
      assert.equal(String(r.value.bucket), 'contracts-documents');
      assert.equal(r.value.accessKeyId, 'AKIA-FAKE');
      assert.equal(r.value.secretAccessKey, 'sekret-fake');
      assert.equal(r.value.forcePathStyle, false, 'AWS real default = false (virtual-hosted)');
    }
  });

  it('CA-T16: S3_ENDPOINT localhost infere forcePathStyle=true', () => {
    // Arrange
    const env = baseEnv();
    env['S3_ENDPOINT'] = 'http://localhost:9000';

    // Act
    const r = parseAwsS3Env(env);

    // Assert
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value.endpoint, 'http://localhost:9000');
      assert.equal(r.value.forcePathStyle, true, 'localhost endpoint -> forcePathStyle=true');
    }
  });

  it('CA-T17: S3_FORCE_PATH_STYLE=true override explicito', () => {
    // Arrange — sem endpoint customizado, mas force=true explicito
    const env = baseEnv();
    env['S3_FORCE_PATH_STYLE'] = 'true';

    // Act
    const r = parseAwsS3Env(env);

    // Assert
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value.forcePathStyle, true);
    }
  });

  it('CA-T18: S3_REGION ausente retorna err missing-env', () => {
    // Arrange
    const env = baseEnv();
    delete env['S3_REGION'];

    // Act
    const r = parseAwsS3Env(env);

    // Assert
    assert.equal(r.ok, false);
    if (!r.ok && r.error.tag === 'missing-env') {
      assert.equal(r.error.field, 'S3_REGION');
    } else {
      assert.fail(`esperado missing-env S3_REGION; obtido: ${JSON.stringify(r)}`);
    }
  });

  it('CA-T19: S3_BUCKET ausente retorna err missing-env', () => {
    // Arrange
    const env = baseEnv();
    delete env['S3_BUCKET'];

    // Act
    const r = parseAwsS3Env(env);

    // Assert
    assert.equal(r.ok, false);
    if (!r.ok && r.error.tag === 'missing-env') {
      assert.equal(r.error.field, 'S3_BUCKET');
    } else {
      assert.fail(`esperado missing-env S3_BUCKET; obtido: ${JSON.stringify(r)}`);
    }
  });

  it('CA-T20: S3_ACCESS_KEY_ID ausente retorna err missing-env', () => {
    // Arrange
    const env = baseEnv();
    delete env['S3_ACCESS_KEY_ID'];

    // Act
    const r = parseAwsS3Env(env);

    // Assert
    assert.equal(r.ok, false);
    if (!r.ok && r.error.tag === 'missing-env') {
      assert.equal(r.error.field, 'S3_ACCESS_KEY_ID');
    } else {
      assert.fail(`esperado missing-env S3_ACCESS_KEY_ID; obtido: ${JSON.stringify(r)}`);
    }
  });

  it('CA-T21: S3_BUCKET invalido retorna err invalid-bucket', () => {
    // Arrange — bucket com uppercase viola regra AWS
    const env = baseEnv();
    env['S3_BUCKET'] = 'UPPERCASE-INVALID';

    // Act
    const r = parseAwsS3Env(env);

    // Assert
    assert.equal(r.ok, false);
    if (!r.ok && r.error.tag === 'invalid-bucket') {
      assert.equal(r.error.raw, 'UPPERCASE-INVALID');
      // r.error.error vem do createBucketName — string literal union
      assert.ok(typeof r.error.error === 'string');
    } else {
      assert.fail(`esperado invalid-bucket; obtido: ${JSON.stringify(r)}`);
    }
  });
});

describe('awsS3Config', () => {
  it('CA-T22: awsS3Config direto com endpoint customizado', () => {
    // Arrange
    const bucket = fromOk(createBucketName('contracts-documents'), 'bucket');

    // Act
    const config = awsS3Config({
      region: 'us-east-1',
      bucket,
      accessKeyId: 'AKIA-FAKE',
      secretAccessKey: 'sekret-fake',
      endpoint: 'http://localhost:9000',
    });

    // Assert
    assert.equal(config.endpoint, 'http://localhost:9000');
    assert.equal(config.region, 'us-east-1');
    assert.equal(config.bucket, bucket);
    assert.equal(config.forcePathStyle, true, 'localhost -> forcePathStyle inferido true');
  });
});

describe('parseAwsS3Env — IAM Role (issue #244)', () => {
  it('CA-T23: ambos ausentes -> ok sem credenciais (provider chain)', () => {
    // Arrange — prod-AWS-ECS: sem S3_ACCESS_KEY_ID nem S3_SECRET_ACCESS_KEY
    const env: NodeJS.ProcessEnv = {
      S3_REGION: 'us-east-1',
      S3_BUCKET: 'contracts-documents',
    };

    // Act
    const r = parseAwsS3Env(env);

    // Assert
    assert.equal(r.ok, true, `esperado ok; obtido: ${JSON.stringify(r)}`);
    if (r.ok) {
      assert.equal(r.value.accessKeyId, undefined, 'sem credencial estatica em prod IAM Role');
      assert.equal(r.value.secretAccessKey, undefined, 'sem credencial estatica em prod IAM Role');
    }
  });

  it('CA-T24: apenas S3_ACCESS_KEY_ID presente (XOR) -> err missing-env S3_SECRET_ACCESS_KEY', () => {
    // Arrange — config pela metade (erro de configuracao, nao IAM Role)
    const env: NodeJS.ProcessEnv = {
      S3_REGION: 'us-east-1',
      S3_BUCKET: 'contracts-documents',
      S3_ACCESS_KEY_ID: 'AKIA-FAKE',
      // S3_SECRET_ACCESS_KEY ausente intencionalmente
    };

    // Act
    const r = parseAwsS3Env(env);

    // Assert
    assert.equal(r.ok, false);
    if (!r.ok && r.error.tag === 'missing-env') {
      assert.equal(
        r.error.field,
        'S3_SECRET_ACCESS_KEY',
        'XOR: access key sem secret e erro de config',
      );
    } else {
      assert.fail(`esperado missing-env S3_SECRET_ACCESS_KEY; obtido: ${JSON.stringify(r)}`);
    }
  });

  it('CA-T25: apenas S3_SECRET_ACCESS_KEY presente (XOR) -> err missing-env S3_ACCESS_KEY_ID', () => {
    // Arrange — config pela metade (erro de configuracao, nao IAM Role)
    const env: NodeJS.ProcessEnv = {
      S3_REGION: 'us-east-1',
      S3_BUCKET: 'contracts-documents',
      // S3_ACCESS_KEY_ID ausente intencionalmente
      S3_SECRET_ACCESS_KEY: 'sekret-fake',
    };

    // Act
    const r = parseAwsS3Env(env);

    // Assert
    assert.equal(r.ok, false);
    if (!r.ok && r.error.tag === 'missing-env') {
      assert.equal(
        r.error.field,
        'S3_ACCESS_KEY_ID',
        'XOR: secret sem access key e erro de config',
      );
    } else {
      assert.fail(`esperado missing-env S3_ACCESS_KEY_ID; obtido: ${JSON.stringify(r)}`);
    }
  });
});

// O erro derruba o boot em TODO ambiente, e esta mensagem e a ultima coisa que quem opera ve antes
// disso. Ela e o diagnostico inteiro: sem o nome do campo, o operador sabe que nao subiu e nao sabe
// o que preencher. Os dois consumidores (contracts e financial) usam esta mesma funcao.
describe('describeAwsS3EnvError — o diagnostico do fail-fast', () => {
  const describeOf = (env: NodeJS.ProcessEnv): string => {
    const r = parseAwsS3Env(env);
    if (r.ok) {
      assert.fail(`esperado err; obtido ok: ${JSON.stringify(r)}`);
    }
    return describeAwsS3EnvError(r.error);
  };

  it('nomeia o campo ausente e diz que ele vale em todo ambiente', () => {
    const message = describeOf({ S3_REGION: 'us-east-1' });
    assert.match(message, /S3_BUCKET/);
    assert.match(message, /todo ambiente/);
  });

  it('nomeia o bucket recusado e a razao da recusa', () => {
    const message = describeOf({ S3_REGION: 'us-east-1', S3_BUCKET: 'UPPERCASE-INVALID' });
    assert.match(message, /S3_BUCKET/);
    assert.match(message, /UPPERCASE-INVALID/);
  });

  // CWE-532: a mensagem sai em stderr no boot, e o coletor de log tem audiencia maior e retencao
  // mais longa que o secret store. O XOR de credencial e a unica variante que toca campo sensivel —
  // e sai como `missing-env`, que carrega so o NOME. Este teste e a guarda dessa propriedade: se
  // alguma variante passar a devolver `raw` de credencial, ele fica vermelho.
  it('nunca ecoa credencial — o XOR nomeia o campo sem revelar o valor presente', () => {
    const message = describeOf({
      S3_REGION: 'us-east-1',
      S3_BUCKET: 'contracts-documents',
      S3_ACCESS_KEY_ID: 'AKIA-FAKE-SENTINELA',
    });
    assert.match(message, /S3_SECRET_ACCESS_KEY/);
    assert.equal(message.includes('AKIA-FAKE-SENTINELA'), false);
  });
});
