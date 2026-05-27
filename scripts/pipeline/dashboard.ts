/**
 * Dashboard agregador - le todos `STATE.json` em `.claude/.pipeline/star/`,
 * filtra/sumariza, e renderiza Markdown ou JSON.
 *
 * Ticket: CTR-PIPELINE-DASHBOARD (W1).
 *
 * Principio: `daysOpen` e SEMPRE recomputado no render usando
 * `state.createdAt` + `opts.now` (injetado). O field no `TicketSnapshot`
 * e placeholder no carregamento (= 0); render e a source-of-truth.
 */

import * as fsp from 'node:fs/promises';
import { join } from 'node:path';

import { readState } from './state-io.ts';
import type { PipelineState } from './state-schema.ts';

export type TicketSnapshot = Readonly<{
  state: PipelineState;
  ticketDir: string;
  daysOpen: number;
  w2Rounds: number;
}>;

export type LoadError = Readonly<{
  ticketDir: string;
  reason: string;
}>;

export type LoadResult = Readonly<{
  snapshots: readonly TicketSnapshot[];
  errors: readonly LoadError[];
  legacyCount: number;
}>;

export type DashboardFilter = 'all' | 'open' | 'closed' | 'blocked';

export type RenderOptions = Readonly<{
  filter: DashboardFilter;
  now: Date;
}>;

const MS_PER_DAY = 86_400_000;

const computeDaysOpen = (createdAt: string, now: Date): number => {
  const created = new Date(createdAt).getTime();
  return Math.max(0, Math.floor((now.getTime() - created) / MS_PER_DAY));
};

const w2RoundsOf = (state: PipelineState): number => {
  const w2 = state.waves.find((w) => w.id === 'W2');
  return w2?.rounds ?? 1;
};

const filterMatches = (state: PipelineState, filter: DashboardFilter): boolean => {
  switch (filter) {
    case 'all':
      return true;
    case 'open':
      return state.status === 'open' || state.status === 'in-progress';
    case 'closed':
      return (
        state.status === 'closed-green' ||
        state.status === 'closed-rejected' ||
        state.status === 'superseded'
      );
    case 'blocked':
      return state.status === 'blocked';
  }
};

export const loadAllStates = async (pipelineRoot: string): Promise<LoadResult> => {
  const entries = await fsp.readdir(pipelineRoot, { withFileTypes: true });
  const dirs = entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();

  const snapshots: TicketSnapshot[] = [];
  const errors: LoadError[] = [];
  let legacyCount = 0;

  for (const name of dirs) {
    const ticketDir = join(pipelineRoot, name);
    const statePath = join(ticketDir, 'STATE.json');

    let exists = false;
    try {
      const stat = await fsp.stat(statePath);
      exists = stat.isFile();
    } catch {
      // missing or stat error -> legacy
    }

    if (!exists) {
      legacyCount++;
      continue;
    }

    const r = await readState(ticketDir);
    if (!r.ok) {
      errors.push({ ticketDir, reason: JSON.stringify(r.error) });
      continue;
    }

    snapshots.push({
      state: r.value,
      ticketDir,
      daysOpen: 0,
      w2Rounds: w2RoundsOf(r.value),
    });
  }

  return { snapshots, errors, legacyCount };
};

const enrichSnapshot = (snapshot: TicketSnapshot, now: Date): TicketSnapshot => ({
  ...snapshot,
  daysOpen: computeDaysOpen(snapshot.state.createdAt, now),
});

type Summary = Readonly<{
  total: number;
  open: number;
  closed: number;
  superseded: number;
  blocked: number;
}>;

const summarize = (snapshots: readonly TicketSnapshot[]): Summary => {
  let open = 0;
  let closed = 0;
  let superseded = 0;
  let blocked = 0;
  for (const s of snapshots) {
    if (s.state.status === 'open' || s.state.status === 'in-progress') open++;
    else if (s.state.status === 'closed-green' || s.state.status === 'closed-rejected') closed++;
    else if (s.state.status === 'superseded') superseded++;
    else blocked++;
  }
  return { total: snapshots.length, open, closed, superseded, blocked };
};

const outcomeOf = (state: PipelineState): string => {
  const w3 = state.waves.find((w) => w.id === 'W3');
  return w3?.outcome ?? '-';
};

export const renderDashboardTable = (
  snapshots: readonly TicketSnapshot[],
  opts: RenderOptions,
): string => {
  const enriched = snapshots.map((s) => enrichSnapshot(s, opts.now));
  const filtered = enriched.filter((s) => filterMatches(s.state, opts.filter));
  const summary = summarize(filtered);

  const lines: readonly string[] = [
    '# Pipeline Dashboard',
    '',
    `${summary.total} tickets | ${summary.open} open | ${summary.closed} closed | ${summary.superseded} superseded | ${summary.blocked} blocked`,
    '',
    '| Ticket | Size | Status | Wave atual | Days open | W2 rounds | Outcome |',
    '| :--- | :---: | :--- | :---: | ---: | ---: | :--- |',
    ...filtered.map(
      (s) =>
        `| ${s.state.ticket} | ${s.state.size} | ${s.state.status} | ${s.state.currentWave ?? '-'} | ${s.daysOpen} | ${s.w2Rounds} | ${outcomeOf(s.state)} |`,
    ),
    '',
  ];

  return lines.join('\n');
};

export const renderDashboardJson = (
  snapshots: readonly TicketSnapshot[],
  opts: RenderOptions,
): string => {
  const enriched = snapshots.map((s) => enrichSnapshot(s, opts.now));
  const filtered = enriched.filter((s) => filterMatches(s.state, opts.filter));
  const summary = summarize(filtered);

  const tickets = filtered.map((s) => ({
    ticket: s.state.ticket,
    size: s.state.size,
    status: s.state.status,
    currentWave: s.state.currentWave,
    daysOpen: s.daysOpen,
    w2Rounds: s.w2Rounds,
    outcome: outcomeOf(s.state) === '-' ? null : outcomeOf(s.state),
  }));

  return `${JSON.stringify({ summary, tickets }, null, 2)}\n`;
};
