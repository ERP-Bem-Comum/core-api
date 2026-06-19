import type { EntryType } from './entry-type.ts';
import type { Movement, ReconciliationStatus, StatementTransaction } from './types.ts';

// Read-model do extrato por CONTA + PERÍODO (#139): linhas com saldo corrente (running balance),
// agrupadas por dia com subtotais, contadores e filtro. Função PURA — não falha (sem Result).

export type StatementFilter = 'all' | 'in' | 'out' | 'reconciled' | 'pending';

export type StatementViewLine = Readonly<{
  id: string;
  date: Date;
  movement: Movement;
  entryType: EntryType;
  payeeName: string;
  memo: string;
  valueCents: number; // absoluto; o sinal vem de `movement`
  runningBalanceCents: number; // saldo de abertura + Σ assinado até esta linha (cronológico)
  reconciliationStatus: ReconciliationStatus;
}>;

export type StatementViewDay = Readonly<{
  date: string; // YYYY-MM-DD (UTC)
  lines: readonly StatementViewLine[]; // já filtradas
  inCents: number; // Σ créditos do dia (sobre o dia completo)
  outCents: number; // Σ débitos do dia (sobre o dia completo)
  dayBalanceCents: number; // saldo corrente ao fim do dia
}>;

export type StatementCounters = Readonly<{
  all: number;
  in: number;
  out: number;
  reconciled: number;
  pending: number;
}>;

export type StatementView = Readonly<{
  openingBalanceCents: number;
  days: readonly StatementViewDay[];
  counters: StatementCounters;
  closingBalanceCents: number; // saldo de abertura + Σ de todas as transações do período
}>;

const signedCents = (t: StatementTransaction): number =>
  t.movement === 'Credit' ? t.valueCents : -t.valueCents;

// Conciliada = Reconciled OU ManualEntry (só Pending conta como pendente).
const isReconciled = (s: ReconciliationStatus): boolean => s !== 'Pending';

const dayKey = (d: Date): string => d.toISOString().slice(0, 10);

const matchesFilter = (line: StatementViewLine, filter: StatementFilter): boolean => {
  switch (filter) {
    case 'all':
      return true;
    case 'in':
      return line.movement === 'Credit';
    case 'out':
      return line.movement === 'Debit';
    case 'reconciled':
      return isReconciled(line.reconciliationStatus);
    case 'pending':
      return line.reconciliationStatus === 'Pending';
    default: {
      const _: never = filter;
      return _;
    }
  }
};

export const buildStatementView = (
  openingBalanceCents: number,
  transactions: readonly StatementTransaction[],
  filter: StatementFilter = 'all',
): StatementView => {
  // Cronológico (estável). O running balance é cumulativo e independe do filtro.
  const ordered = transactions.toSorted((a, b) => a.date.getTime() - b.date.getTime());

  const allLines: StatementViewLine[] = [];
  let balance = openingBalanceCents;
  for (const t of ordered) {
    balance += signedCents(t);
    allLines.push({
      id: String(t.id),
      date: t.date,
      movement: t.movement,
      entryType: t.entryType,
      payeeName: t.payeeName,
      memo: t.memo,
      valueCents: t.valueCents,
      runningBalanceCents: balance,
      reconciliationStatus: t.reconciliationStatus,
    });
  }

  const counters: StatementCounters = {
    all: allLines.length,
    in: allLines.filter((l) => l.movement === 'Credit').length,
    out: allLines.filter((l) => l.movement === 'Debit').length,
    reconciled: allLines.filter((l) => isReconciled(l.reconciliationStatus)).length,
    pending: allLines.filter((l) => l.reconciliationStatus === 'Pending').length,
  };

  // Agrupa por dia preservando a ordem cronológica. Subtotais sobre o dia COMPLETO (valores reais);
  // `lines` exibe só as que passam no filtro; dia sem linha após o filtro é omitido.
  const orderedDayKeys = [...new Set(allLines.map((l) => dayKey(l.date)))];
  const days: StatementViewDay[] = orderedDayKeys.flatMap((key) => {
    const dayLines = allLines.filter((l) => dayKey(l.date) === key);
    const shown = dayLines.filter((l) => matchesFilter(l, filter));
    if (shown.length === 0) return [];
    const inCents = dayLines
      .filter((l) => l.movement === 'Credit')
      .reduce((s, l) => s + l.valueCents, 0);
    const outCents = dayLines
      .filter((l) => l.movement === 'Debit')
      .reduce((s, l) => s + l.valueCents, 0);
    const lastOfDay = dayLines[dayLines.length - 1];
    return [
      {
        date: key,
        lines: shown,
        inCents,
        outCents,
        dayBalanceCents: lastOfDay?.runningBalanceCents ?? openingBalanceCents,
      },
    ];
  });

  return { openingBalanceCents, days, counters, closingBalanceCents: balance };
};
