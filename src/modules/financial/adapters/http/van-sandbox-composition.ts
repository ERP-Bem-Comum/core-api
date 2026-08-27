// Composição da rota de exercício da VAN — storage PRÓPRIO, deliberadamente separado do `VAN_S3_*`
// que o módulo usa.
//
// ⚠️ A RAZÃO DA SEPARAÇÃO, e ela não é estética. `VAN_S3_*` aponta para o bucket por onde o dinheiro
// sai: é dele que `buildVanStorage()` monta o storage do módulo, e é `saida/`, naquele bucket, que
// `POST /financial/remittances` usa para enfileirar pagamento no banco (ADR-0060). O exercício pode
// — e em geral deve — apontar para outro bucket, ou outra conta.
//
// Com conjuntos separados, mudar o destino do arquivo de teste nunca é uma edição no bloco que
// decide para onde vai o pagamento, e configurar o exercício errado não alcança o caminho do
// dinheiro. É o mesmo raciocínio que o `van-s3-config.ts` já aplica ao separar `VAN_S3_*` do
// singleton `S3_*` — e ele registra a consequência de errar: "um erro de configuração aqui deposita
// arquivo de pagamento no lugar errado".
//
// A segunda tranca é o `Deps` do use case, que recebe `putSandbox` e nada mais: mesmo apontado para
// o bucket de produção, este caminho não tem como gravar em `saida/`.
import process from 'node:process';

import { createS3VanStorage } from '../van/van-storage.s3.ts';
import type { VanS3Config } from '../van/van-s3-config.ts';
import { createBradescoMultipagTranslator } from '../cnab/bradesco-multipag-translator.ts';
import { uploadSandboxRemittance } from '../../application/use-cases/upload-sandbox-remittance.ts';
import { readVanSandboxAuth } from './van-sandbox-auth.ts';
import { vanSandboxPlugin } from './van-sandbox-plugin.ts';

type Env = Readonly<Record<string, string | undefined>>;

const DEFAULT_SANDBOX_PREFIX = 'sandbox/';
const LOCAL_HOST = /localhost|127\.0\.0\.1|0\.0\.0\.0/u;

const present = (v: string | undefined): v is string => v !== undefined && v.length > 0;

const warn = (reason: string): void => {
  process.stderr.write(`[fin-van-sandbox] rota de exercicio NAO registrada: ${reason}.\n`);
};

// Os prefixos do ciclo real entram com os defaults do contrato porque o TIPO os exige — e nenhum
// deles é alcançável a partir daqui: o use case recebe `putSandbox` e mais nada.
const buildConfig = (env: Env, sandboxPrefix: string): VanS3Config | undefined => {
  const region = env['VAN_SANDBOX_S3_REGION'];
  const bucket = env['VAN_SANDBOX_S3_BUCKET'];

  if (!present(region) || !present(bucket)) {
    warn(
      `defina VAN_SANDBOX_S3_REGION e VAN_SANDBOX_S3_BUCKET (${!present(region) ? 'REGION' : 'BUCKET'} ausente)`,
    );
    return undefined;
  }

  const accessKeyId = env['VAN_SANDBOX_S3_ACCESS_KEY_ID'];
  const secretAccessKey = env['VAN_SANDBOX_S3_SECRET_ACCESS_KEY'];

  // XOR é erro de configuração, nunca "sem credencial" — mesma invariante do `van-s3-config.ts`.
  // Ausentes as duas é caminho legítimo: provider chain (IAM Role da task no ECS).
  if (present(accessKeyId) !== present(secretAccessKey)) {
    warn('credencial pela metade — defina as DUAS chaves, ou NENHUMA para usar o IAM Role da task');
    return undefined;
  }

  const endpoint = env['VAN_SANDBOX_S3_ENDPOINT'];
  const forcePathStyleRaw = env['VAN_SANDBOX_S3_FORCE_PATH_STYLE'];

  return {
    bucket,
    region,
    ...(present(endpoint) ? { endpoint } : {}),
    forcePathStyle: present(forcePathStyleRaw)
      ? forcePathStyleRaw.trim().toLowerCase() === 'true'
      : present(endpoint) && LOCAL_HOST.test(endpoint),
    ...(present(accessKeyId) && present(secretAccessKey)
      ? { credentials: { accessKeyId, secretAccessKey } }
      : {}),
    prefixes: {
      outbound: 'saida/',
      processed: 'processados/',
      failed: 'falhas/',
      returns: 'retorno/',
      status: 'status/',
      sandbox: sandboxPrefix,
    },
  };
};

/**
 * `undefined` = a rota não deve existir neste processo.
 *
 * Duas condições independentes, e as duas avisam ao recusar: token presente e forte
 * (`van-sandbox-auth.ts`), e storage configurado. Nenhuma delas derruba o boot — a rota é
 * acessório, e um typo na env não pode custar a API inteira.
 */
export const buildVanSandboxPlugin = (
  env: Env,
): ReturnType<typeof vanSandboxPlugin> | undefined => {
  const auth = readVanSandboxAuth(env);
  if (auth === undefined) return undefined;

  const prefixRaw = env['VAN_SANDBOX_S3_PREFIX'];
  // Sem a barra final, `sandbox` + `PAG_x.REM` vira um objeto na RAIZ do bucket — o mesmo defeito
  // que o `normalizePrefix` do `van-s3-config.ts` existe para impedir.
  const sandboxPrefix = present(prefixRaw)
    ? prefixRaw.endsWith('/')
      ? prefixRaw
      : `${prefixRaw}/`
    : DEFAULT_SANDBOX_PREFIX;

  const config = buildConfig(env, sandboxPrefix);
  if (config === undefined) return undefined;

  const storage = createS3VanStorage(config);

  return vanSandboxPlugin({
    auth,
    uploadSandboxRemittance: uploadSandboxRemittance({
      translator: createBradescoMultipagTranslator(),
      // Só esta função atravessa. O resto do port fica aqui.
      putSandbox: storage.putSandbox,
      now: () => new Date(),
    }),
  });
};
