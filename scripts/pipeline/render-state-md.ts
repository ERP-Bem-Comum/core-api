/**
 * Renderer determinístico de STATE.md a partir de PipelineState.
 *
 * Ticket: CTR-PIPELINE-STATE-JSON (W1).
 *
 * Mantém compatibilidade com `inject-ticket-context.sh`: header
 * `# Estado do Ticket <ID>` + tabela de waves com colunas
 * `| W0 ... | W1 ... | W2 ... | W3 ...`.
 */

import type { PipelineState, WaveEntry } from './state-schema.ts';

const statusLabel = (status: WaveEntry['status']): string => {
  switch (status) {
    case 'done':
      return 'done';
    case 'in-progress':
      return 'in-progress';
    case 'pending':
      return 'pending';
    case 'failed':
      return 'failed';
  }
};

const renderWaveRow = (w: WaveEntry): string => {
  const agent = w.agent ?? '—';
  const report = w.reportPath ?? '—';
  const updated = w.finishedAt ?? w.startedAt ?? '—';
  const outcome = w.outcome === null ? '' : ` (${w.outcome})`;
  const rounds = w.rounds > 1 ? ` [rounds=${w.rounds}]` : '';
  return `| ${w.id} | ${statusLabel(w.status)}${outcome}${rounds} | ${agent} | ${report} | ${updated} |`;
};

export const renderStateMd = (state: PipelineState): string => {
  const lines: readonly string[] = [
    `# Estado do Ticket ${state.ticket}`,
    '',
    `> **Size:** ${state.size} · **Status:** ${state.status} · **Created:** ${state.createdAt}${
      state.closedAt === null ? '' : ` · **Closed:** ${state.closedAt}`
    }${state.supersededBy === undefined ? '' : ` · **Superseded by:** ${state.supersededBy}`}`,
    '',
    '| Wave | Status | Skill | REPORT | Última atualização |',
    '| :--- | :--- | :--- | :--- | :--- |',
    ...state.waves.map(renderWaveRow),
    '',
    '## Último evento',
    '',
    state.lastEvent,
    '',
    ...(state.blockers.length === 0
      ? []
      : ['## Blockers', '', ...state.blockers.map((b) => `- ${b}`), '']),
  ];

  return lines.join('\n');
};
