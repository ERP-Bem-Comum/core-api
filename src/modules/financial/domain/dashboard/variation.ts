// #237 (DASH-F6) — motor de variação do Dashboard (Camada 1). Domínio PURO: sem class, sem throw,
// sem relógio (a referência de período é INPUT — Functional Core). FIEL ao legado: M-1 vs M-2 (P.O.).
//
// Divisão por zero é tratada como UNIÃO DISCRIMINADA (errors-as-values), não exceção: a formatação
// humana ("0%" / "+" / "−12,5%") é responsabilidade da borda (widget), não do domínio.

// Diferença ASSINADA em centavos (`current − previous`) — pode ser negativa (≠ Money, não-negativo).
export type Variation = Readonly<{ absoluteCents: number }>;

// Variação percentual. `no-change` (ambos 0 → borda "0%"); `new` (previous 0, current > 0 →
// crescimento infinito → borda "+"); `value` (percentual finito, com sinal).
export type Percentage =
  | Readonly<{ kind: 'value'; percent: number }>
  | Readonly<{ kind: 'no-change' }>
  | Readonly<{ kind: 'new' }>;

export const calculateVariation = (currentCents: number, previousCents: number): Variation => ({
  absoluteCents: currentCents - previousCents,
});

export const calculatePercentage = (currentCents: number, previousCents: number): Percentage => {
  if (previousCents === 0) {
    return currentCents === 0 ? { kind: 'no-change' } : { kind: 'new' };
  }
  return { kind: 'value', percent: ((currentCents - previousCents) / previousCents) * 100 };
};

// Janela de período half-open `[start, end)` (UTC — sem ambiguidade de fuso). `end` é o 1º dia do
// mês seguinte (exclusivo), conveniente para `dueDate >= start AND dueDate < end`.
export type PeriodWindow = Readonly<{ start: Date; end: Date }>;

// Mês-calendário `monthsAgo` antes da referência. `Date.UTC` resolve rollover de ano (mês negativo
// → ano anterior; > 11 → próximo).
export const monthWindow = (reference: Date, monthsAgo: number): PeriodWindow => {
  const year = reference.getUTCFullYear();
  const month = reference.getUTCMonth() - monthsAgo;
  return {
    start: new Date(Date.UTC(year, month, 1)),
    end: new Date(Date.UTC(year, month + 1, 1)),
  };
};

// M-1 (mês anterior) vs M-2 (dois meses antes) — a comparação fiel ao legado.
export const comparisonWindows = (
  reference: Date,
): Readonly<{ m1: PeriodWindow; m2: PeriodWindow }> => ({
  m1: monthWindow(reference, 1),
  m2: monthWindow(reference, 2),
});
