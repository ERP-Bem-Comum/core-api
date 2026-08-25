// Desembrulho do erro do driver MySQL por trás do wrapper do Drizzle (#803).
//
// `DrizzleQueryError` (drizzle-orm 0.45.2, `errors.js:10-20`) monta a mensagem como
// `Failed query: <sql>\nparams: <values>` e guarda o erro original do mysql2 em `.cause`.
// Formatar esse erro com `String(err)` entrega SÓ a mensagem: `Error.prototype.toString()`
// devolve `name: message` por contrato, e `cause` nunca entra. O `errno` do servidor morre ali.
//
// Isso não é perda de detalhe cosmético. `errno` é o único dado que separa dois desfechos que
// pedem correções OPOSTAS:
//
//   1213 ER_LOCK_DEADLOCK     — o InnoDB detectou um ciclo, escolheu uma vítima e a reverteu
//                               inteira. A outra transação seguiu. REPETIR é a resposta certa.
//   1205 ER_LOCK_WAIT_TIMEOUT — ninguém foi vítima de ciclo: esta transação esperou o limite
//                               (`innodb_lock_wait_timeout`, 50s por padrão) por um lock que
//                               outra segue segurando. Repetir só empilha espera.
//
// A profundidade do encadeamento é do pacote, não nossa: percorremos a cadeia de `cause` até
// achar quem carrega `errno`, em vez de fixar `.cause.errno` e quebrar numa atualização.

/** Campos que o mysql2 anexa ao erro. Todos opcionais: o driver nem sempre preenche todos. */
export type DriverErrorInfo = Readonly<{
  errno: number;
  code?: string;
  sqlState?: string;
  sqlMessage?: string;
}>;

/** `ER_LOCK_DEADLOCK` — transação escolhida como vítima e revertida pelo InnoDB. */
export const MYSQL_ERRNO_DEADLOCK = 1213;

/** `ER_LOCK_WAIT_TIMEOUT` — esperou `innodb_lock_wait_timeout` por um lock alheio. */
export const MYSQL_ERRNO_LOCK_WAIT_TIMEOUT = 1205;

/** `ER_DUP_ENTRY` — violação de UNIQUE ou PK. Defeito de dado, nunca corrida. */
export const MYSQL_ERRNO_DUP_ENTRY = 1062;

// Teto de profundidade: uma cadeia legítima tem 1 ou 2 níveis. O limite é rede de segurança
// contra cadeia patológica, e o `seen` cobre o ciclo — este código roda no caminho de ERRO,
// onde pendurar o processo é estritamente pior que o defeito original.
const MAX_CAUSE_DEPTH = 16;

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === 'object' && value !== null;

const readString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

/**
 * Percorre a cadeia de `cause` e devolve os campos do driver do primeiro elo que os carregue.
 * `null` quando nenhum elo é um erro de driver — inclusive para entrada que não é `Error`.
 *
 * ⚠️ `errno` NÃO é exclusivo do MySQL: `NodeJS.ErrnoException` também o tem, então um
 * `ECONNRESET` de socket casa aqui com `errno` **negativo** (`-54` no macOS). São dois espaços
 * numéricos distintos convivendo no mesmo campo. Para `isDeadlock`/`isLockWaitTimeout` isso é
 * inócuo — errno de Node é negativo e nunca colide com 1213/1205 —, mas quem classificar por
 * FAIXA de errno precisa desempatar antes, por exemplo exigindo `sqlState`, que só o servidor
 * MySQL preenche.
 */
export const readDriverError = (cause: unknown): DriverErrorInfo | null => {
  const seen = new WeakSet<object>();
  let current: unknown = cause;

  for (let depth = 0; depth < MAX_CAUSE_DEPTH; depth += 1) {
    if (!isRecord(current)) return null;
    if (seen.has(current)) return null;
    seen.add(current);

    const errno = current['errno'];
    if (typeof errno === 'number') {
      const code = readString(current['code']);
      const sqlState = readString(current['sqlState']);
      const sqlMessage = readString(current['sqlMessage']);
      return {
        errno,
        ...(code !== undefined ? { code } : {}),
        ...(sqlState !== undefined ? { sqlState } : {}),
        ...(sqlMessage !== undefined ? { sqlMessage } : {}),
      };
    }

    current = current['cause'];
  }

  return null;
};

/** Verdadeiro só para `ER_LOCK_DEADLOCK` (1213) — a única falha aqui que repetir resolve. */
export const isDeadlock = (cause: unknown): boolean =>
  readDriverError(cause)?.errno === MYSQL_ERRNO_DEADLOCK;

/** Verdadeiro só para `ER_LOCK_WAIT_TIMEOUT` (1205) — repetir NÃO resolve. */
export const isLockWaitTimeout = (cause: unknown): boolean =>
  readDriverError(cause)?.errno === MYSQL_ERRNO_LOCK_WAIT_TIMEOUT;

/**
 * Verdadeiro só para `ER_DUP_ENTRY` (1062) — conflito de chave, a distinguir de indisponibilidade.
 *
 * Compara `errno`, e não `code`, de propósito: `code` é string e some quando o erro atravessa
 * uma fronteira de serialização, enquanto `errno` é o número do protocolo. E a busca percorre a
 * cadeia de `cause` — testar `code` na profundidade 0 sobre um `DrizzleQueryError`, que não tem
 * esse campo, devolve `false` para TODA duplicata.
 */
export const isDuplicateEntry = (cause: unknown): boolean =>
  readDriverError(cause)?.errno === MYSQL_ERRNO_DUP_ENTRY;

/**
 * Linha de log que SOMA o diagnóstico do driver à mensagem original, em vez de substituí-la.
 * Sem driver na cadeia, degrada para a mensagem — nunca engole o erro.
 *
 * ⚠️ `sqlMessage` fica FORA de propósito, e a assimetria entre os campos é a razão:
 * `errno`, `code` e `sqlState` são literais fixos do protocolo — `1213`, `ER_LOCK_DEADLOCK`,
 * `40001` — e não dependem dos dados. `sqlMessage` carrega **conteúdo da linha**: em
 * `ER_DUP_ENTRY` o servidor devolve `Duplicate entry 'fulano@exemplo.com' for key
 * 'auth_user_email_idx'`. Como este helper é transversal e o próximo adapter a adotá-lo tem
 * índice único sobre e-mail, incluí-lo publicaria PII em log a partir de um módulo cujo
 * propósito é diagnóstico. Quem precisar dele que o leia de `readDriverError`, num ponto onde
 * a decisão de registrar o valor seja consciente e local.
 */
export const describeDriverError = (cause: unknown): string => {
  const base = String(cause);
  const info = readDriverError(cause);
  if (info === null) return base;

  const parts = [`errno=${String(info.errno)}`];
  if (info.code !== undefined) parts.push(`code=${info.code}`);
  if (info.sqlState !== undefined) parts.push(`sqlState=${info.sqlState}`);

  return `${base} [${parts.join(' ')}]`;
};
