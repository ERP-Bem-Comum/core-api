// Sentinela de conflito de versão (optimistic lock), compartilhada pelos adapters Drizzle que
// escrevem em `fin_documents`.
//
// Por que uma sentinela e não um `Result`: o CAS acontece DENTRO de `db.transaction`, e a única
// forma de abortar a transação é lançar. O `throw` precisa então sobreviver até o `catch` do
// adapter carregando a informação de que foi conflito SEMÂNTICO (a versão divergiu) e não falha de
// infraestrutura — as duas viram `Error`, e colapsá-las devolveria 500 onde o certo é 409.
//
// Vive aqui, e não dentro de um dos repositórios, desde que o segundo caminho de escrita apareceu
// (M2/#893: a reclassificação escreve `fin_documents` pelo `ReconciliationRepository.confirm`, para
// caber na transação única que a RN-M2-06 exige). Duplicar o símbolo faria cada arquivo reconhecer
// só a própria sentinela — e o dia em que um chamasse o outro, o conflito viraria 500 em silêncio.
//
// Símbolo em vez de `class`: `no-restricted-syntax` proíbe `class` neste projeto.
const VERSION_CONFLICT_SYMBOL = Symbol('version-conflict');

export type VersionConflictSentinel = Error & Readonly<{ [VERSION_CONFLICT_SYMBOL]: true }>;

export const makeVersionConflict = (
  entityId: string,
  expectedVersion: number,
): VersionConflictSentinel => {
  const e = new Error(
    `version-conflict:${entityId}:expected:${expectedVersion}`,
  ) as VersionConflictSentinel;
  (e as unknown as Record<symbol, boolean>)[VERSION_CONFLICT_SYMBOL] = true;
  return e;
};

export const isVersionConflict = (cause: unknown): cause is VersionConflictSentinel =>
  cause instanceof Error &&
  (cause as unknown as Record<symbol, unknown>)[VERSION_CONFLICT_SYMBOL] === true;
