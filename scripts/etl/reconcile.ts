/**
 * Reconciliação do ETL — contadores puros por entidade.
 *
 * Invariante: `read = migrated + quarantined + alreadyExists`. Funções puras
 * (retornam novo tally, nunca mutam) para compor no orquestrador (slice WRITER).
 */

export type EntityTally = Readonly<{
  read: number;
  migrated: number;
  quarantined: number;
  alreadyExists: number;
}>;

export const emptyTally = (): EntityTally => ({
  read: 0,
  migrated: 0,
  quarantined: 0,
  alreadyExists: 0,
});

export const countRead = (t: EntityTally): EntityTally => ({ ...t, read: t.read + 1 });
export const countMigrated = (t: EntityTally): EntityTally => ({ ...t, migrated: t.migrated + 1 });
export const countQuarantined = (t: EntityTally): EntityTally => ({
  ...t,
  quarantined: t.quarantined + 1,
});
export const countAlreadyExists = (t: EntityTally): EntityTally => ({
  ...t,
  alreadyExists: t.alreadyExists + 1,
});

export const isBalanced = (t: EntityTally): boolean =>
  t.read === t.migrated + t.quarantined + t.alreadyExists;
