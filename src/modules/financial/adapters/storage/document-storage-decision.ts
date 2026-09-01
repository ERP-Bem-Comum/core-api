// Desfecho da configuração do storage do comprovante fiscal no boot da borda HTTP.
//
// `buildDocumentStorage` descartava o `err` de `parseAwsS3Env` e caía para in-memory sem sinal
// algum. Hoje isso não produz dano em PRODUÇÃO, e a razão é frágil: `buildContractsHttpDeps`
// (`server.ts:207`) chama o MESMO parser e faz `throw` incondicional, e roda ANTES de
// `buildFinancialHttpDeps` (`server.ts:260`). O boot já caiu antes de a linha daqui ser alcançada.
//
// Depender disso é o defeito. O comportamento correto não pode vir da ordem de composição de outro
// módulo: reordenar o `server.ts`, ou rodar `CONTRACTS_DRIVER=memory` com `FINANCIAL_DRIVER=mysql`
// (representável, e ninguém a barra), reabre o buraco em silêncio — a rota aceita o upload do
// comprovante e o perde no restart, com HTTP 200 nos dois casos.
//
// ⚠️ A política aqui é o OPOSTO da de `adapters/van/van-storage-decision.ts`, e as duas devem
// continuar diferentes. Lá, ausência nunca derruba o boot, porque `src/workers/runner/specs.ts`
// registra que "a produção enquanto a VAN não sobe" é um ambiente legítimo sem `VAN_S3_*`. Aqui não
// existe esse estado: o storage de documento já roda em produção, e o repositório já decidiu esta
// classe no #516 (`server.ts:133-136`) — ausente em produção derruba o boot "em vez de subir com
// store volátil, que aceitava o upload e perdia o arquivo no restart". Unificar as duas funções num
// helper parametrizado apagaria exatamente a diferença que importa.
//
// Sobre ecoar o valor recusado (CWE-532): das duas variantes de `AwsS3EnvError`, só
// `invalid-bucket` carrega `raw`, e ele é o nome do bucket (`s3-config-aws.ts:127`) — não é
// credencial. O XOR de chave/secret sai como `missing-env`, que carrega só o NOME do campo.
import { isProductionEnv } from '../../../../shared/runtime/node-env.ts';
import type { Result } from '../../../../shared/primitives/result.ts';
import type { S3StorageConfig, AwsS3EnvError } from '#src/modules/contracts/public-api/index.ts';

type Env = Readonly<Record<string, string | undefined>>;

export type DocumentStorageDecision =
  | Readonly<{ kind: 's3'; config: S3StorageConfig }>
  | Readonly<{ kind: 'memory'; warning: string }>
  | Readonly<{ kind: 'refuse'; error: string }>;

// Mensagens em PT sem acentuação, como o molde da guarda da #456: saem em stderr no boot, antes de
// qualquer garantia de encoding do coletor de log.
const describeField = (error: AwsS3EnvError): string =>
  error.tag === 'missing-env'
    ? `${error.field} nao configurada`
    : `S3_BUCKET com valor invalido "${error.raw}"`;

export const memoryWarning = (error: AwsS3EnvError): string =>
  `document-storage: ${describeField(error)} — usando memoria (o comprovante enviado e aceito e ` +
  `perdido no restart)`;

export const refusalError = (error: AwsS3EnvError): string =>
  `document-storage: ${describeField(error)} — obrigatoria em producao`;

/**
 * Política simétrica, ao contrário da da VAN: o que decide é o AMBIENTE, não a natureza do erro.
 *
 * | erro                            | fora de produção      | em produção        |
 * | ------------------------------- | --------------------- | ------------------ |
 * | `missing-env` / `invalid-bucket`| memória **com aviso** | **recusa o boot**  |
 *
 * Não há aqui o estado que torna a VAN especial — "configurado mais tarde" não é um modo de operar
 * o storage de documento. Em produção, portanto, as duas variantes são igualmente fatais; fora
 * dela, as duas degradam, mas nomeando o campo.
 *
 * Em produção isto NÃO muda o comportamento observável: `contracts` já derrubava o boot antes, pelo
 * mesmo parser. O que muda é a razão passar a ser local, explícita e independente de ordem.
 */
export const decideDocumentStorage = (
  parsed: Result<S3StorageConfig, AwsS3EnvError>,
  env: Env,
): DocumentStorageDecision => {
  if (parsed.ok) return { kind: 's3', config: parsed.value };
  return isProductionEnv(env)
    ? { kind: 'refuse', error: refusalError(parsed.error) }
    : { kind: 'memory', warning: memoryWarning(parsed.error) };
};
