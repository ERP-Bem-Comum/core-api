// Desfecho da configuração do bucket da VAN no boot da borda HTTP (issue #798).
//
// O ternário que existia em `adapters/http/composition.ts` colapsava dois estados que pedem ações
// opostas — "a VAN não foi configurada" e "a VAN foi configurada errado" — no mesmo desfecho mudo.
// O parser encontrava o defeito, nomeava o campo, devolvia `err`, e a composição jogava o
// diagnóstico fora: a API subia, respondia 201, e o que ia para `saida/` não existia.
//
// A decisão fica AQUI, pura, e não no `composition.ts`, pelo mesmo motivo que a guarda da #456
// separa `readModuleDriverConfigs` do `server.ts`: quem decide não escreve em stderr nem lê
// `process.env` por conta própria, e por isso pode ser testada por igualdade, sem processo.
//
// ⚠️ A política aqui NÃO é a da #456 aplicada ao pé da letra, e a diferença é deliberada — ver o
// comentário de `decideVanStorage`.
//
// Sobre ecoar o valor recusado (CWE-532): das três variantes de `VanS3ConfigError`, só
// `invalid-prefix` e `invalid-env` carregam `raw`, e os únicos campos que as produzem hoje são
// `VAN_S3_PREFIX_*` e `VAN_S3_FORCE_PATH_STYLE` (`van-s3-config.ts:82,95`) — nenhum é credencial.
// O XOR de chave/secret sai como `missing-env`, que carrega só o NOME do campo. Se uma variante
// nova passar a devolver `raw` de campo sensível, este eco precisa de guarda de forma, como o
// `echoableDriverValue` da guarda da #456.
import { isProductionEnv } from '../../../../shared/runtime/node-env.ts';
import type { Result } from '../../../../shared/primitives/result.ts';
import type { VanS3Config, VanS3ConfigError } from './van-s3-config.ts';

type Env = Readonly<Record<string, string | undefined>>;

/**
 * Os três desfechos possíveis. `memory` sempre carrega aviso: diferente dos 7 módulos da #456, a
 * VAN não tem variável de driver — não existe "memória DECLARADA" aqui, então toda degradação é
 * implícita, e degradação implícita muda não é distinguível de defeito.
 */
export type VanStorageDecision =
  | Readonly<{ kind: 's3'; config: VanS3Config }>
  | Readonly<{ kind: 'memory'; warning: string }>
  | Readonly<{ kind: 'refuse'; error: string }>;

// Mensagens em PT sem acentuação, como o molde da guarda da #456: saem em stderr no boot, antes de
// qualquer garantia de encoding do coletor de log.
const describeField = (error: VanS3ConfigError): string =>
  error.tag === 'missing-env'
    ? `${error.field} nao configurada`
    : `${error.field} com valor invalido "${error.raw}"`;

const CONSEQUENCE = 'a remessa gerada NAO sobe para o bucket e some no restart';

export const memoryWarning = (error: VanS3ConfigError): string =>
  `van-storage: ${describeField(error)} — usando memoria (${CONSEQUENCE})`;

export const refusalError = (error: VanS3ConfigError): string =>
  `van-storage: ${describeField(error)} — configuracao presente e recusada, obrigatoria correcao ` +
  `em producao`;

/**
 * A política NÃO é a da #456 copiada, e a assimetria é o ponto desta função.
 *
 * A #456 diz "em producao configuracao ausente/invalida derruba o boot; fora de producao degrada
 * para memoria com um aviso" (`module-driver-config.ts:7-9`). Ela está certa para os 7 módulos de
 * persistência, e é a régua que a #798 invoca. Copiada inteira aqui, porém, ela derrubaria a borda
 * HTTP de produção no próximo deploy — porque `src/workers/runner/specs.ts:353-357` registra que
 * um ambiente sem `VAN_S3_*` inclui "a produção enquanto a VAN não sobe", e a #860 confirma que é
 * assim que a homologação roda hoje. Ausência de VAN é estado NORMAL, não defeito; foi por isso
 * que o worker da VAN ganhou grupo próprio em vez de entrar em `projections`.
 *
 * Daí a discriminação ser pela NATUREZA do erro primeiro, e só depois pelo ambiente:
 *
 * | erro                          | fora de produção      | em produção           |
 * | ----------------------------- | --------------------- | --------------------- |
 * | `missing-env`                 | memória **com aviso** | memória **com aviso** |
 * | `invalid-env`/`invalid-prefix`| memória **com aviso** | **recusa o boot**     |
 *
 * `missing-env` nunca é fatal: é a VAN que ainda não subiu, e o ambiente não muda esse fato. O que
 * muda em relação a antes é que ela deixa de ser MUDA — o aviso nomeia o campo e diz o que se perde.
 *
 * `invalid-*` é o oposto: configuração presente, lida e recusada pelo parser. Não é a VAN que não
 * subiu — é alguém que a configurou e errou, e o diagnóstico existiu antes de ser descartado. Em
 * produção isso derruba o boot, porque a alternativa é uma remessa que responde 201 e não vai a
 * lugar nenhum. Fora de produção degrada, mas com o valor recusado no aviso, para o operador
 * consertar antes de promover.
 */
export const decideVanStorage = (
  parsed: Result<VanS3Config, VanS3ConfigError>,
  env: Env,
): VanStorageDecision => {
  if (parsed.ok) return { kind: 's3', config: parsed.value };
  const error = parsed.error;
  if (error.tag === 'missing-env') return { kind: 'memory', warning: memoryWarning(error) };
  return isProductionEnv(env)
    ? { kind: 'refuse', error: refusalError(error) }
    : { kind: 'memory', warning: memoryWarning(error) };
};
