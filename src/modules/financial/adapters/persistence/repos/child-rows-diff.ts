// Comparação de conjuntos de linhas-filhas do agregado Documento (#803).
//
// O `save` faz hard replace: apaga os filhos do documento e reinsere o lote. O `DELETE … WHERE
// document_id = ?` percorre um índice NÃO-único e, sob REPEATABLE READ, o InnoDB trava a FAIXA
// varrida — não as linhas. Como UUID v4 intercala documentos arbitrariamente na árvore, o gap
// travado pelo documento A é exatamente onde o INSERT do documento B quer entrar. Medido no
// laboratório em 21/08/2026, em `LATEST DETECTED DEADLOCK`:
//
//   index fin_retentions_document_id_idx
//   (1) WAITING: lock_mode X locks gap before rec insert intention waiting
//   (2) HOLDS:   lock_mode X locks gap before rec     ← sobre registro de OUTRO documento
//
// A eliminação tem dois passos. Este módulo é o primeiro: **se o conjunto não mudou, não emitir
// DELETE nem INSERT.** A transação não toca a tabela, e não há gap a disputar. Num PATCH de
// vencimento as retenções tipicamente não mudam, então é o caminho comum que deixa de colidir.
//
// De quebra, isto para de regenerar ids de filhos a cada save — o mesmo hábito que a
// `.claude/rules/adapters.md` registra ter custado vínculo órfão e pagamento em dobro no PR #794.

/** Separador que não ocorre nos valores, para a chave não colidir por concatenação ambígua. */
const SEP = ' ';

// Só o que tem representação textual inequívoca. `unknown` aqui seria armadilha: um objeto
// cairia em `String()` e viraria `[object Object]`, colapsando linhas DIFERENTES na mesma chave
// — e `sameRowSet` responderia "não mudou" para uma mudança real, deixando o banco desatualizado
// em silêncio. Quem impede isso é o tipo, não a disciplina de quem chama.
type Encodable = string | number | boolean | Date | null | undefined;

const encode = (value: Encodable): string => {
  // `null` e `undefined` colapsam no mesmo token de propósito — ver a nota de `payableKey`.
  if (value === null || value === undefined) return 'null';
  if (value instanceof Date) return `date:${String(value.getTime())}`;
  return String(value);
};

const joinKey = (parts: readonly Encodable[]): string => parts.map(encode).join(SEP);

/**
 * Chave de conteúdo de retenção ou imposto registrado — as duas têm a mesma forma.
 *
 * O `id` fica FORA de propósito: `mapRetentionsToRows` e `mapRegisteredTaxesToRows` geram
 * `id: newUuid()` a cada chamada, então dois saves do mesmo estado produzem ids diferentes com
 * conteúdo idêntico. Comparar por id faria toda gravação parecer mudança.
 */
export const taxLikeKey = (row: {
  readonly type: string;
  readonly base: number;
  readonly rateBps: number;
  readonly value: number;
}): string => joinKey([row.type, row.base, row.rateBps, row.value]);

/**
 * Chave de título. Aqui o `id` ENTRA: desde o PR #794 o título tem identidade estável, e é ela
 * que `fin_remittance_payables` referencia.
 *
 * `createdAt` fica fora: `mapPayablesToRows` o preenche com `new Date()` a cada chamada, então
 * incluí-lo faria todo save parecer mudança e anularia a comparação inteira.
 *
 * ⚠️ Os campos opcionais aceitam `undefined` E `null`, e os dois produzem a MESMA chave. A
 * assimetria vem das duas pontas: o tipo de INSERT do Drizzle marca `paidAt`, `paymentDetail` e
 * `retentionType` como opcionais, enquanto o SELECT sempre devolve `null`. Como ambos significam
 * "ausente", distingui-los faria todo documento com campo vazio parecer alterado a cada save.
 *
 * O `| undefined` é explícito, e não só o `?`, porque sob `exactOptionalPropertyTypes` deste
 * tsconfig `campo?: T` significa "pode estar AUSENTE", não "pode valer `undefined`" — e o tipo
 * de INSERT do Drizzle declara `T | null | undefined`.
 */
export const payableKey = (row: {
  readonly id: string;
  readonly kind: string;
  readonly retentionType?: string | null | undefined;
  readonly status: string;
  readonly value: number;
  readonly dueDate?: Date | null | undefined;
  readonly paymentMethod?: string | null | undefined;
  readonly paymentDetail?: string | null | undefined;
  readonly paidAt?: Date | null | undefined;
}): string =>
  joinKey([
    row.id,
    row.kind,
    row.retentionType ?? null,
    row.status,
    row.value,
    row.dueDate ?? null,
    row.paymentMethod ?? null,
    row.paymentDetail ?? null,
    row.paidAt ?? null,
  ]);

/**
 * Os dois conjuntos representam o mesmo estado?
 *
 * MULTICONJUNTO, não conjunto: duas retenções idênticas são dois títulos filhos, e tratá-las
 * como uma faria o segundo sumir em silêncio. A ordem é irrelevante — o `SELECT` não promete
 * ordem sem `ORDER BY`, e considerar reordenação como mudança emitiria o DELETE que este
 * módulo existe para evitar.
 */
export const sameRowSet = <A, B>(
  existing: readonly A[],
  incoming: readonly B[],
  key: (row: A | B) => string,
): boolean => {
  if (existing.length !== incoming.length) return false;

  const counts = new Map<string, number>();
  for (const row of existing) {
    const k = key(row);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  for (const row of incoming) {
    const k = key(row);
    const n = counts.get(k);
    if (n === undefined || n === 0) return false;
    counts.set(k, n - 1);
  }
  return true;
};
