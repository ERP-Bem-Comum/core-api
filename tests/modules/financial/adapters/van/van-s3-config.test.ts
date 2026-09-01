import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
import {
  parseVanS3Env,
  describeVanS3ConfigError,
} from '#src/modules/financial/adapters/van/van-s3-config.ts';

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

// A heurística do endpoint acerta os dois extremos — AWS e localhost — e erra tudo que fica no meio:
// hostname de serviço Docker, endpoint de VPC, IP de rede interna. Nesses casos ela devolve `false`,
// o SDK monta `<bucket>.<host>` e a resolução de nome falha. Quem opera precisa poder dizer o que a
// heurística não tem como saber. O adapter de documentos já faz isso (`s3-config-aws.ts:152-155`).
describe('VAN_S3_FORCE_PATH_STYLE — a env sobrescreve a heurística', () => {
  it('liga path-style num endpoint que a heurística não reconhece', () => {
    const cfg = parsed({
      VAN_S3_ENDPOINT: 'http://minio:9000',
      VAN_S3_FORCE_PATH_STYLE: 'true',
    });
    assert.equal(cfg.forcePathStyle, true);
  });

  it('ausente, preserva exatamente o comportamento de hoje', () => {
    assert.equal(parsed({ VAN_S3_ENDPOINT: 'http://minio:9000' }).forcePathStyle, false);
  });

  // A sobrescrita vale nos DOIS sentidos. Só ligar deixaria de fora quem roda um S3 real atrás de um
  // proxy em localhost — e obrigaria a mexer em código para desligar o que a regex ligou sozinha.
  it('desliga path-style mesmo em endpoint local', () => {
    const cfg = parsed({
      VAN_S3_ENDPOINT: 'http://localhost:9000',
      VAN_S3_FORCE_PATH_STYLE: 'false',
    });
    assert.equal(cfg.forcePathStyle, false);
  });

  it('sem endpoint e sem a env, produção AWS segue com path-style desligado', () => {
    assert.equal(parsed().forcePathStyle, false);
  });

  // Cair no default seria adivinhar a intenção de quem escreveu a variável — e o preço do palpite
  // errado é um worker falando com o host errado, achando que obedeceu. Num adapter que deposita
  // arquivo de pagamento, recusar subir é mais barato que subir torto.
  it('recusa valor ininterpretável em vez de cair no default', () => {
    const r = parseVanS3Env({
      ...base,
      VAN_S3_ENDPOINT: 'http://minio:9000',
      VAN_S3_FORCE_PATH_STYLE: 'talvez',
    });
    assert.ok(isErr(r), 'esperava err para valor ininterpretável');
    assert.equal(r.error.tag, 'invalid-env');
    assert.equal(r.error.field, 'VAN_S3_FORCE_PATH_STYLE');
  });

  // Caixa e espaço em volta são ruído de transporte, não intenção: o YAML do compose preserva o
  // espaço, e ninguém digita um de propósito.
  it('lê a grafia sem se importar com caixa nem espaço em volta', () => {
    assert.equal(parsed({ VAN_S3_FORCE_PATH_STYLE: '  TRUE  ' }).forcePathStyle, true);
    assert.equal(
      parsed({ VAN_S3_ENDPOINT: 'http://localhost:9000', VAN_S3_FORCE_PATH_STYLE: 'False' })
        .forcePathStyle,
      false,
    );
  });

  // Sinônimo é a mesma intenção escrita de outro jeito — e cada um aceito obriga o próximo leitor a
  // descobrir por leitura de código quais valem. Duas grafias exatas cabem na cabeça sem consulta.
  it('recusa sinônimo de booleano, por mais óbvio que pareça', () => {
    for (const raw of ['1', '0', 'yes', 'no', 'on', 'off', 'sim']) {
      const r = parseVanS3Env({ ...base, VAN_S3_FORCE_PATH_STYLE: raw });
      assert.ok(isErr(r), `esperava err para ${raw}`);
      assert.equal(r.error.tag, 'invalid-env');
    }
  });
});

// O erro derruba o boot (#798), e esta mensagem é a última coisa que quem opera vê antes disso. Ela
// é o diagnóstico inteiro: sem o nome do campo, o operador sabe que não subiu e não sabe o que
// preencher — que era exatamente o que o fallback mudo produzia, só que sem derrubar.
describe('describeVanS3ConfigError — o diagnóstico do fail-fast', () => {
  const describe_ = (over: Readonly<Record<string, string>>) => {
    const r = parseVanS3Env(over);
    assert.ok(isErr(r), 'esperava err');
    return describeVanS3ConfigError(r.error);
  };

  it('nomeia o campo ausente e diz que ele vale em todo ambiente', () => {
    const message = describe_({ VAN_S3_REGION: 'sa-east-1' });
    assert.match(message, /VAN_S3_BUCKET/);
    assert.match(message, /todo ambiente/);
  });

  it('nomeia o campo e o valor recusado quando a env é ininterpretável', () => {
    const message = describe_({ ...base, VAN_S3_FORCE_PATH_STYLE: 'talvez' });
    assert.match(message, /VAN_S3_FORCE_PATH_STYLE/);
    assert.match(message, /"talvez"/);
  });

  it('nomeia o prefixo recusado', () => {
    const message = describe_({ ...base, VAN_S3_PREFIX_RETURNS: '/retorno' });
    assert.match(message, /VAN_S3_PREFIX_RETURNS/);
  });

  // CWE-532: a mensagem sai em stderr no boot, e o coletor de log tem audiência maior e retenção
  // mais longa que o secret store. O XOR de credencial é a única variante que toca campo sensível —
  // e sai como `missing-env`, que carrega só o NOME. Este teste é a guarda dessa propriedade: se
  // alguma variante passar a devolver `raw` de credencial, ele fica vermelho.
  it('nunca ecoa credencial — o XOR nomeia o campo sem revelar o valor presente', () => {
    const message = describe_({ ...base, VAN_S3_ACCESS_KEY_ID: 'AKIAEXEMPLO' });
    assert.match(message, /VAN_S3_SECRET_ACCESS_KEY/);
    assert.equal(message.includes('AKIAEXEMPLO'), false);
  });
});
