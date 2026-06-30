/**
 * Pipeline metrics - agregacao estatistica de TicketSnapshot[].
 *
 * Ticket: CTR-PIPELINE-METRICS (W1).
 *
 * Funcoes puras: nao acessa filesystem, nao depende de tempo real.
 * ASCII puro (lecao do ticket #2 sobre Node 24 strip-types).
 */

import type { TicketSnapshot } from './dashboard.ts';
import type { PipelineState, TicketSize, WaveEntry } from './state-schema.ts';

const MS_PER_DAY = 86_400_000;

export type DurationStats = Readonly<{
  count: number;
  avgDays: number;
  minDays: number;
  maxDays: number;
  medianDays: number;
}>;

export type StatusBreakdown = Readonly<{
  open: number;
  inProgress: number;
  closedGreen: number;
  closedRejected: number;
  superseded: number;
  blocked: number;
}>;

export type SizeBreakdown = Readonly<Record<TicketSize, number>>;

export type W2RoundsStats = Readonly<{
  count: number;
  avg: number;
  round1Only: number;
  round2: number;
  round3: number;
}>;

export type AgentCount = Readonly<{ agent: string; count: number }>;

export type PipelineMetrics = Readonly<{
  total: number;
  byStatus: StatusBreakdown;
  bySize: SizeBreakdown;
  w2Rounds: W2RoundsStats;
  totalDuration: DurationStats;
  durationBySize: Readonly<Record<TicketSize, DurationStats>>;
  topAgents: readonly AgentCount[];
  rejectionRate: number;
}>;

const EMPTY_DURATION: DurationStats = {
  count: 0,
  avgDays: 0,
  minDays: 0,
  maxDays: 0,
  medianDays: 0,
};

const SIZES: readonly TicketSize[] = ['XS', 'S', 'M', 'L', 'XL'];

const computeDuration = (state: PipelineState): number | null => {
  if (state.closedAt === null) return null;
  const created = new Date(state.createdAt).getTime();
  const closed = new Date(state.closedAt).getTime();
  return Math.max(0, Math.floor((closed - created) / MS_PER_DAY));
};

const statsOf = (values: readonly number[]): DurationStats => {
  if (values.length === 0) return EMPTY_DURATION;
  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  const avg = sum / sorted.length;
  const min = sorted[0] ?? 0;
  const max = sorted[sorted.length - 1] ?? 0;
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 0
      ? ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2
      : (sorted[mid] ?? 0);
  return { count: sorted.length, avgDays: avg, minDays: min, maxDays: max, medianDays: median };
};

const byStatusOf = (snapshots: readonly TicketSnapshot[]): StatusBreakdown => {
  let open = 0;
  let inProgress = 0;
  let closedGreen = 0;
  let closedRejected = 0;
  let superseded = 0;
  let blocked = 0;
  for (const s of snapshots) {
    switch (s.state.status) {
      case 'open':
        open++;
        break;
      case 'in-progress':
        inProgress++;
        break;
      case 'closed-green':
        closedGreen++;
        break;
      case 'closed-rejected':
        closedRejected++;
        break;
      case 'superseded':
        superseded++;
        break;
      case 'blocked':
        blocked++;
        break;
    }
  }
  return { open, inProgress, closedGreen, closedRejected, superseded, blocked };
};

const bySizeOf = (snapshots: readonly TicketSnapshot[]): SizeBreakdown => {
  const counts: Record<TicketSize, number> = { XS: 0, S: 0, M: 0, L: 0, XL: 0 };
  for (const s of snapshots) counts[s.state.size]++;
  return counts;
};

const w2Of = (state: PipelineState): WaveEntry | undefined =>
  state.waves.find((w) => w.id === 'W2');

const w2RoundsOf = (snapshots: readonly TicketSnapshot[]): W2RoundsStats => {
  const doneRounds: number[] = [];
  let round1Only = 0;
  let round2 = 0;
  let round3 = 0;
  for (const s of snapshots) {
    const w2 = w2Of(s.state);
    if (w2?.status !== 'done') continue;
    doneRounds.push(w2.rounds);
    if (w2.rounds === 1) round1Only++;
    else if (w2.rounds === 2) round2++;
    else if (w2.rounds >= 3) round3++;
  }
  const count = doneRounds.length;
  const avg = count === 0 ? 0 : doneRounds.reduce((a, b) => a + b, 0) / count;
  return { count, avg, round1Only, round2, round3 };
};

const topAgentsOf = (
  snapshots: readonly TicketSnapshot[],
  maxEntries = 10,
): readonly AgentCount[] => {
  const counts = new Map<string, number>();
  for (const s of snapshots) {
    for (const w of s.state.waves) {
      if (w.agent === null) continue;
      counts.set(w.agent, (counts.get(w.agent) ?? 0) + 1);
    }
  }
  const entries: AgentCount[] = [];
  for (const [agent, count] of counts) entries.push({ agent, count });
  entries.sort((a, b) =>
    b.count - a.count !== 0 ? b.count - a.count : a.agent.localeCompare(b.agent),
  );
  return entries.slice(0, maxEntries);
};

const rejectionRateOf = (snapshots: readonly TicketSnapshot[]): number => {
  let doneW2 = 0;
  let rejected = 0;
  for (const s of snapshots) {
    const w2 = w2Of(s.state);
    if (w2?.status !== 'done') continue;
    doneW2++;
    if (w2.rounds > 1) rejected++;
  }
  return doneW2 === 0 ? 0 : rejected / doneW2;
};

export const computeMetrics = (snapshots: readonly TicketSnapshot[]): PipelineMetrics => {
  const total = snapshots.length;

  const closedDurations: number[] = [];
  const closedDurationsBySize: Record<TicketSize, number[]> = {
    XS: [],
    S: [],
    M: [],
    L: [],
    XL: [],
  };
  for (const s of snapshots) {
    if (s.state.status !== 'closed-green') continue;
    const d = computeDuration(s.state);
    if (d === null) continue;
    closedDurations.push(d);
    closedDurationsBySize[s.state.size].push(d);
  }

  const durationBySize: Record<TicketSize, DurationStats> = {
    XS: statsOf(closedDurationsBySize.XS),
    S: statsOf(closedDurationsBySize.S),
    M: statsOf(closedDurationsBySize.M),
    L: statsOf(closedDurationsBySize.L),
    XL: statsOf(closedDurationsBySize.XL),
  };

  return {
    total,
    byStatus: byStatusOf(snapshots),
    bySize: bySizeOf(snapshots),
    w2Rounds: w2RoundsOf(snapshots),
    totalDuration: statsOf(closedDurations),
    durationBySize,
    topAgents: topAgentsOf(snapshots),
    rejectionRate: rejectionRateOf(snapshots),
  };
};

// ----------------------------------------------------------------------------
// Renderers
// ----------------------------------------------------------------------------

const formatNum = (n: number, decimals = 1): string => {
  if (n === Math.floor(n)) return String(n);
  return n.toFixed(decimals);
};

const formatPercent = (n: number): string => `${(n * 100).toFixed(1)}%`;

const formatCell = (
  stats: DurationStats,
  key: 'avgDays' | 'minDays' | 'maxDays' | 'medianDays',
): string => (stats.count === 0 ? '-' : formatNum(stats[key]));

export const renderMetricsMd = (m: PipelineMetrics): string => {
  const lines: string[] = [];
  lines.push('# Pipeline Metrics');
  lines.push('');
  lines.push(`Total: ${m.total} tickets`);
  lines.push('');
  lines.push('## Status');
  lines.push('');
  lines.push('| Status | Count |');
  lines.push('| :--- | ---: |');
  lines.push(`| open | ${m.byStatus.open} |`);
  lines.push(`| in-progress | ${m.byStatus.inProgress} |`);
  lines.push(`| closed-green | ${m.byStatus.closedGreen} |`);
  lines.push(`| closed-rejected | ${m.byStatus.closedRejected} |`);
  lines.push(`| superseded | ${m.byStatus.superseded} |`);
  lines.push(`| blocked | ${m.byStatus.blocked} |`);
  lines.push('');
  lines.push('## Size');
  lines.push('');
  lines.push('| XS | S | M | L | XL |');
  lines.push('| ---: | ---: | ---: | ---: | ---: |');
  lines.push(`| ${m.bySize.XS} | ${m.bySize.S} | ${m.bySize.M} | ${m.bySize.L} | ${m.bySize.XL} |`);
  lines.push('');
  lines.push('## W2 rounds');
  lines.push('');
  lines.push(`- Tickets com W2 done: ${m.w2Rounds.count}`);
  lines.push(`- Round medio: ${formatNum(m.w2Rounds.avg)}`);
  lines.push(
    `- Round 1 only: ${m.w2Rounds.round1Only} | Round 2: ${m.w2Rounds.round2} | Round 3: ${m.w2Rounds.round3}`,
  );
  lines.push(`- Taxa de rejection (rounds > 1): ${formatPercent(m.rejectionRate)}`);
  lines.push('');
  lines.push('## Duracao total (W0 -> close, em dias) - so closed-green');
  lines.push('');
  lines.push('| Metrica | Todos | XS | S | M | L | XL |');
  lines.push('| :--- | ---: | ---: | ---: | ---: | ---: | ---: |');
  for (const key of ['count', 'avgDays', 'minDays', 'maxDays', 'medianDays'] as const) {
    const label = key === 'count' ? 'count' : key.replace('Days', '');
    const all = key === 'count' ? String(m.totalDuration.count) : formatCell(m.totalDuration, key);
    const cells = SIZES.map((sz) =>
      key === 'count' ? String(m.durationBySize[sz].count) : formatCell(m.durationBySize[sz], key),
    );
    lines.push(`| ${label} | ${all} | ${cells.join(' | ')} |`);
  }
  lines.push('');
  lines.push('## Top agents (por contagem de waves executadas)');
  lines.push('');
  if (m.topAgents.length === 0) {
    lines.push('_Nenhum agente registrado._');
  } else {
    lines.push('| Agent | Count |');
    lines.push('| :--- | ---: |');
    for (const { agent, count } of m.topAgents) lines.push(`| ${agent} | ${count} |`);
  }
  lines.push('');
  return lines.join('\n');
};

export const renderMetricsJson = (m: PipelineMetrics): string => `${JSON.stringify(m, null, 2)}\n`;
