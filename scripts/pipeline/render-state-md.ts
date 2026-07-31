/**
 * Renderer determinístico de STATE.md a partir de PipelineState.
 *
 * Ticket: CTR-PIPELINE-STATE-JSON (W1).
 *
 * Mantém compatibilidade com `inject-ticket-context.sh`: header
 * `# Estado do Ticket <ID>` + tabela de waves com colunas
 * `| W0 ... | W1 ... | W2 ... | W3 ...`.
 */

import type { PipelineState, WaveEntry, WaveOverride } from './state-schema.ts';

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

// Autorizações de override (PIPELINE-STATE-WAVE-OVERRIDE). Renderizadas em lista
// própria, fora da tabela de waves: o `reason` é texto livre do humano e pode
// conter `|`, que quebraria a tabela lida pelo `inject-ticket-context.sh`.
type OverriddenWave = Readonly<{ id: WaveEntry['id']; override: WaveOverride }>;

const overriddenWaves = (waves: readonly WaveEntry[]): readonly OverriddenWave[] =>
  waves.flatMap((w) =>
    w.override === undefined || w.override === null ? [] : [{ id: w.id, override: w.override }],
  );

const renderOverrideItem = ({ id, override }: OverriddenWave): string =>
  `- **${id}** · autorizado em ${override.authorizedAt} · rounds no override: ${override.roundsAtOverride} · motivo: ${override.reason}`;

export const renderStateMd = (state: PipelineState): string => {
  const overrides = overriddenWaves(state.waves);
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
    ...(overrides.length === 0
      ? []
      : ['## Overrides autorizados', '', ...overrides.map(renderOverrideItem), '']),
    ...(state.blockers.length === 0
      ? []
      : ['## Blockers', '', ...state.blockers.map((b) => `- ${b}`), '']),
  ];

  return lines.join('\n');
};
