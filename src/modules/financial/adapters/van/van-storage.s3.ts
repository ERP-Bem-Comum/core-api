// Adapter S3 do bucket da VAN (ADR-0060/0061).
//
// Boundary de adapter: todo `try/catch` converte para `Result`; nenhuma exceção do SDK cruza para
// application (`.claude/rules/adapters.md`).
//
// SDK oficial da AWS, sem wrapper caseiro — mesma regra do ADR-0019. MinIO e S3 rodam o mesmo
// código, mudando só `forcePathStyle`, o que é o que permite provar este adapter contra MinIO no CI.
import process from 'node:process';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  type ListObjectsV2CommandInput,
  type ListObjectsV2CommandOutput,
} from '@aws-sdk/client-s3';

import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import type {
  VanObjectKey,
  VanStorageError,
  VanStoragePort,
} from '../../application/ports/van-storage.ts';
import type { VanS3Config } from './van-s3-config.ts';

const logStorage = (op: string, cause: unknown): void => {
  process.stderr.write(`[fin-van-storage] ${op} failed: ${String(cause)}\n`);
};

// Nome com barra viraria outro prefixo — inclusive um que o agente não varre. Recusar aqui é mais
// barato que descobrir depois que a remessa foi para um caminho que ninguém lê.
const isValidFileName = (fileName: string): boolean => fileName !== '' && !fileName.includes('/');

export const createS3VanStorage = (config: VanS3Config): VanStoragePort => {
  const client = new S3Client({
    region: config.region,
    ...(config.endpoint !== undefined ? { endpoint: config.endpoint } : {}),
    forcePathStyle: config.forcePathStyle,
    ...(config.credentials !== undefined ? { credentials: config.credentials } : {}),
  });

  const putText = async (
    prefix: string,
    fileName: string,
    content: string,
  ): Promise<Result<VanObjectKey, VanStorageError>> => {
    if (!isValidFileName(fileName)) return err('van-storage-invalid-file-name');

    const key = `${prefix}${fileName}`;
    try {
      await client.send(
        new PutObjectCommand({
          Bucket: config.bucket,
          Key: key,
          Body: content,
          ContentType: 'text/plain; charset=utf-8',
        }),
      );
      return ok(key);
    } catch (cause) {
      logStorage(`put ${key}`, cause);
      return err('van-storage-unavailable');
    }
  };

  const list = async (
    prefix: string,
  ): Promise<Result<readonly VanObjectKey[], VanStorageError>> => {
    try {
      const keys: VanObjectKey[] = [];
      let token: string | undefined = undefined;

      // Paginação explícita: `ListObjectsV2` devolve no máximo 1000 chaves por resposta, e uma
      // fila que cresceu por causa de incidente é justamente quando ninguém está olhando.
      do {
        // Input tipado à parte: com o spread condicional inline, o overload de `send` não resolve
        // e a resposta inteira degrada para `any` — o lint acusa, mas o risco real é o campo
        // digitado errado passar despercebido.
        const input: ListObjectsV2CommandInput = {
          Bucket: config.bucket,
          Prefix: prefix,
          ...(token !== undefined ? { ContinuationToken: token } : {}),
        };
        const res: ListObjectsV2CommandOutput = await client.send(new ListObjectsV2Command(input));
        for (const obj of res.Contents ?? []) {
          // A própria "pasta" aparece como objeto de tamanho zero em alguns provedores.
          if (obj.Key !== undefined && obj.Key !== prefix) keys.push(obj.Key);
        }
        token = res.IsTruncated === true ? res.NextContinuationToken : undefined;
      } while (token !== undefined);

      return ok(keys.sort());
    } catch (cause) {
      logStorage(`list ${prefix}`, cause);
      return err('van-storage-unavailable');
    }
  };

  return {
    putRemittance: async (fileName, content) =>
      putText(config.prefixes.outbound, fileName, content),
    putSandbox: async (fileName, content) => putText(config.prefixes.sandbox, fileName, content),
    listReturns: async () => list(config.prefixes.returns),
    listStatus: async () => list(config.prefixes.status),

    getText: async (key) => {
      try {
        const res = await client.send(new GetObjectCommand({ Bucket: config.bucket, Key: key }));
        const body = await res.Body?.transformToString('utf-8');
        return body === undefined ? err('van-storage-object-not-found') : ok(body);
      } catch (cause) {
        // Chave ausente é caso esperado (o status de uma remessa pode ainda não existir), não
        // indisponibilidade — e a diferença muda o que o chamador faz: esperar vs. alarmar.
        const name = (cause as Readonly<{ name?: string }>).name;
        if (name === 'NoSuchKey' || name === 'NotFound') return err('van-storage-object-not-found');
        logStorage(`get ${key}`, cause);
        return err('van-storage-unavailable');
      }
    },
  };
};
