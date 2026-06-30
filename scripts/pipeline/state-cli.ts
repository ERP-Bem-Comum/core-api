/**
 * CLI `pnpm run pipeline:state` — comandos init/wave-start/wave-finish/wave-round/close/render.
 *
 * Ticket: CTR-PIPELINE-STATE-JSON (W1).
 *
 * Exit codes:
 *   0 — sucesso
 *   1 — erro inesperado (I/O, arg parsing)
 *   2 — violação de invariante do pipeline (wave fora de ordem, round > 3, close com waves pending)
 *
 * Estado dos tickets: `<cwd>/.claude/.pipeline/<ticket>/STATE.json`.
 */

import * as fsp from 'node:fs/promises';
import { join } from 'node:path';

import { renderStateMd } from './render-state-md.ts';
import { readState, writeState } from './state-io.ts';
import {
  PIPELINE_STATE_SCHEMA_VERSION,
  WAVE_IDS,
  type PipelineState,
  type TicketSize,
  type WaveEntry,
  type WaveId,
  type WaveOutcome,
} from './state-schema.ts';

const MAX_ROUNDS = 3;
const TICKET_SIZES: readonly TicketSize[] = ['XS', 'S', 'M', 'L', 'XL'];
const WAVE_OUTCOMES: readonly WaveOutcome[] = ['RED', 'GREEN', 'APPROVED', 'REJECTED', 'ALL-GREEN'];

function exitFail(code: number, msg: string): never {
  process.stderr.write(`${msg}\n`);
  process.exit(code);
}

const ticketDirOf = (cwd: string, ticket: string): string =>
  join(cwd, '.claude', '.pipeline', ticket);

const indexOfWave = (wave: WaveId): number => WAVE_IDS.indexOf(wave);

const isWaveId = (s: string): s is WaveId => (WAVE_IDS as readonly string[]).includes(s);

type Flags = ReadonlyMap<string, string>;

const parseFlags = (args: readonly string[]): Flags => {
  const out = new Map<string, string>();
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a?.startsWith('--') === true) {
      const key = a.slice(2);
      const next = args[i + 1];
      if (next !== undefined && !next.startsWith('--')) {
        out.set(key, next);
        i++;
      } else {
        out.set(key, '');
      }
    }
  }
  return out;
};

const requireFlag = (flags: Flags, name: string): string => {
  const v = flags.get(name);
  if (v === undefined || v === '') {
    return exitFail(1, `flag obrigatória ausente: --${name}`);
  }
  return v;
};

const writeStateAndMd = async (ticketDir: string, state: PipelineState): Promise<void> => {
  const w = await writeState(ticketDir, state);
  if (!w.ok) {
    exitFail(1, `writeState falhou: ${JSON.stringify(w.error)}`);
  }
  await fsp.writeFile(join(ticketDir, 'STATE.md'), renderStateMd(state), 'utf8');
};

const loadState = async (ticketDir: string): Promise<PipelineState> => {
  const r = await readState(ticketDir);
  if (!r.ok) {
    return exitFail(1, `readState falhou: ${JSON.stringify(r.error)}`);
  }
  return r.value;
};

const cmdInit = async (cwd: string, ticket: string, flags: Flags): Promise<void> => {
  const size = requireFlag(flags, 'size');
  if (!(TICKET_SIZES as readonly string[]).includes(size)) {
    exitFail(1, `--size inválido: ${size} (use XS|S|M|L|XL)`);
  }
  const dir = ticketDirOf(cwd, ticket);
  await fsp.mkdir(dir, { recursive: true });
  const now = new Date().toISOString();
  const state: PipelineState = {
    schemaVersion: PIPELINE_STATE_SCHEMA_VERSION,
    ticket,
    size: size as TicketSize,
    createdAt: now,
    closedAt: null,
    currentWave: null,
    status: 'open',
    waves: WAVE_IDS.map<WaveEntry>((id) => ({
      id,
      status: 'pending',
      agent: null,
      startedAt: null,
      finishedAt: null,
      rounds: 1,
      reportPath: null,
      outcome: null,
    })),
    blockers: [],
    lastEvent: 'init',
  };
  await writeStateAndMd(dir, state);
  process.stdout.write(`init ok: ${ticket}\n`);
};

const cmdWaveStart = async (
  cwd: string,
  ticket: string,
  wave: WaveId,
  flags: Flags,
): Promise<void> => {
  const agent = requireFlag(flags, 'agent');
  const dir = ticketDirOf(cwd, ticket);
  const state = await loadState(dir);

  const idx = indexOfWave(wave);
  if (idx > 0) {
    const prev = state.waves[idx - 1];
    if (prev?.status !== 'done') {
      exitFail(
        2,
        `wave anterior (${WAVE_IDS[idx - 1] ?? '?'}) não está done — não é possível iniciar ${wave}`,
      );
    }
  }

  const target = state.waves[idx];
  if (target?.status === 'done') {
    exitFail(2, `wave ${wave} já está done — não é possível reiniciar`);
  }

  const now = new Date().toISOString();
  const newWaves: readonly WaveEntry[] = state.waves.map((w) =>
    w.id === wave ? { ...w, status: 'in-progress', agent, startedAt: now } : w,
  );
  const newState: PipelineState = {
    ...state,
    waves: newWaves,
    currentWave: wave,
    status: 'in-progress',
    lastEvent: `${wave} started (${agent})`,
  };
  await writeStateAndMd(dir, newState);
  process.stdout.write(`${wave} started\n`);
};

const cmdWaveFinish = async (
  cwd: string,
  ticket: string,
  wave: WaveId,
  flags: Flags,
): Promise<void> => {
  const outcome = requireFlag(flags, 'outcome');
  if (!(WAVE_OUTCOMES as readonly string[]).includes(outcome)) {
    exitFail(1, `--outcome inválido: ${outcome} (use RED|GREEN|APPROVED|REJECTED|ALL-GREEN)`);
  }
  const report = requireFlag(flags, 'report');
  const dir = ticketDirOf(cwd, ticket);
  const state = await loadState(dir);

  const idx = indexOfWave(wave);
  const target = state.waves[idx];
  if (target?.status !== 'in-progress') {
    exitFail(
      2,
      `wave ${wave} não está in-progress (status atual: ${target?.status ?? 'desconhecido'})`,
    );
  }

  const now = new Date().toISOString();
  const newWaves: readonly WaveEntry[] = state.waves.map((w) =>
    w.id === wave
      ? {
          ...w,
          status: 'done',
          finishedAt: now,
          outcome: outcome as WaveOutcome,
          reportPath: report,
        }
      : w,
  );
  const nextIdx = idx + 1;
  const nextWave: WaveId | null = nextIdx < WAVE_IDS.length ? (WAVE_IDS[nextIdx] ?? null) : null;
  const newState: PipelineState = {
    ...state,
    waves: newWaves,
    currentWave: nextWave,
    lastEvent: `${wave} finished (${outcome})`,
  };
  await writeStateAndMd(dir, newState);
  process.stdout.write(`${wave} finished (${outcome})\n`);
};

const cmdWaveRound = async (cwd: string, ticket: string, wave: WaveId): Promise<void> => {
  const dir = ticketDirOf(cwd, ticket);
  const state = await loadState(dir);

  const idx = indexOfWave(wave);
  const target = state.waves[idx];
  if (target === undefined) {
    exitFail(1, `wave ${wave} não existe no STATE.json`);
  }
  if (target.rounds >= MAX_ROUNDS) {
    exitFail(2, `wave ${wave} atingiu max rounds (${MAX_ROUNDS}); escalar ao humano`);
  }

  const newRounds = target.rounds + 1;
  const newWaves: readonly WaveEntry[] = state.waves.map((w) =>
    w.id === wave ? { ...w, rounds: newRounds } : w,
  );
  const newState: PipelineState = {
    ...state,
    waves: newWaves,
    lastEvent: `${wave} round ${newRounds}`,
  };
  await writeStateAndMd(dir, newState);
  process.stdout.write(`${wave} round ${newRounds}\n`);
};

const cmdWaveReopen = async (
  cwd: string,
  ticket: string,
  wave: WaveId,
  flags: Flags,
): Promise<void> => {
  const dir = ticketDirOf(cwd, ticket);
  const state = await loadState(dir);

  const idx = indexOfWave(wave);
  const target = state.waves[idx];
  if (target === undefined) {
    exitFail(1, `wave ${wave} não existe no STATE.json`);
  }
  if (target.status !== 'done') {
    exitFail(
      2,
      `wave ${wave} não está done (status atual: ${target.status}) — só waves done+REJECTED podem ser reabertas`,
    );
  }
  if (target.outcome !== 'REJECTED') {
    exitFail(
      2,
      `wave ${wave} tem outcome ${target.outcome ?? 'nenhum'} — só REJECTED pode ser reaberto`,
    );
  }
  if (target.rounds >= MAX_ROUNDS) {
    exitFail(2, `wave ${wave} atingiu max rounds (${MAX_ROUNDS}); escalar ao humano`);
  }
  const laterNonPending = state.waves.slice(idx + 1).find((w) => w.status !== 'pending');
  if (laterNonPending !== undefined) {
    exitFail(
      2,
      `wave posterior ${laterNonPending.id} não está pending (status: ${laterNonPending.status}) — não é possível reabrir ${wave}`,
    );
  }

  const agentFlag = flags.get('agent');
  const now = new Date().toISOString();
  const newRounds = target.rounds + 1;
  const newWaves: readonly WaveEntry[] = state.waves.map((w) =>
    w.id === wave
      ? {
          ...w,
          status: 'in-progress',
          outcome: null,
          finishedAt: null,
          startedAt: now,
          rounds: newRounds,
          agent: agentFlag !== undefined && agentFlag !== '' ? agentFlag : w.agent,
        }
      : w,
  );
  const newState: PipelineState = {
    ...state,
    waves: newWaves,
    currentWave: wave,
    status: 'in-progress',
    lastEvent: `${wave} reopened (round ${newRounds})`,
  };
  await writeStateAndMd(dir, newState);
  process.stdout.write(`${wave} reopened (round ${newRounds})\n`);
};

const cmdClose = async (cwd: string, ticket: string): Promise<void> => {
  const dir = ticketDirOf(cwd, ticket);
  const state = await loadState(dir);

  const pending = state.waves.filter((w) => w.status !== 'done');
  if (pending.length > 0) {
    exitFail(2, `ticket tem waves não-done: ${pending.map((w) => w.id).join(', ')}`);
  }

  const newState: PipelineState = {
    ...state,
    status: 'closed-green',
    closedAt: new Date().toISOString(),
    currentWave: null,
    lastEvent: 'closed-green',
  };
  await writeStateAndMd(dir, newState);
  process.stdout.write(`closed-green: ${ticket}\n`);
};

// Estados que NÃO podem virar superseded: sucesso definitivo (`closed-green`)
// e idempotência (`superseded`). `closed-rejected` permanece reclassificável —
// um ticket abandonado/rejeitado pode depois revelar-se duplicata de outro.
const SUPERSEDE_BLOCKED_STATUSES: readonly PipelineState['status'][] = [
  'closed-green',
  'superseded',
];

const cmdSupersede = async (cwd: string, ticket: string, flags: Flags): Promise<void> => {
  const winner = requireFlag(flags, 'by');
  if (winner === ticket) {
    exitFail(2, `--by não pode ser o próprio ticket (${ticket}) — auto-referência inválida`);
  }
  const dir = ticketDirOf(cwd, ticket);
  const state = await loadState(dir);

  if (SUPERSEDE_BLOCKED_STATUSES.includes(state.status)) {
    exitFail(2, `ticket em estado ${state.status} não pode ser superseded`);
  }

  const winnerState = await readState(ticketDirOf(cwd, winner));
  if (!winnerState.ok) {
    exitFail(2, `ticket vencedor --by ${winner} não encontrado`);
  }

  const newState: PipelineState = {
    ...state,
    status: 'superseded',
    closedAt: new Date().toISOString(),
    currentWave: null,
    supersededBy: winner,
    lastEvent: `superseded by ${winner}`,
  };
  await writeStateAndMd(dir, newState);
  process.stdout.write(`superseded: ${ticket} (by ${winner})\n`);
};

const cmdRender = async (cwd: string, ticket: string): Promise<void> => {
  const dir = ticketDirOf(cwd, ticket);
  const state = await loadState(dir);
  await fsp.writeFile(join(dir, 'STATE.md'), renderStateMd(state), 'utf8');
  process.stdout.write(`rendered: ${ticket}\n`);
};

const main = async (): Promise<void> => {
  const argv = process.argv.slice(2);
  const subcommand = argv[0];
  const ticket = argv[1];
  const rest = argv.slice(2);
  const cwd = process.cwd();

  if (subcommand === undefined) {
    process.stderr.write(
      'uso: pipeline:state <init|wave-start|wave-finish|wave-round|wave-reopen|close|supersede|render> <ticket> [args]\n',
    );
    process.exit(1);
  }
  if (ticket === undefined) {
    process.stderr.write('ticket obrigatório\n');
    process.exit(1);
  }

  if (subcommand === 'init') {
    await cmdInit(cwd, ticket, parseFlags(rest));
    return;
  }
  if (subcommand === 'close') {
    await cmdClose(cwd, ticket);
    return;
  }
  if (subcommand === 'supersede') {
    await cmdSupersede(cwd, ticket, parseFlags(rest));
    return;
  }
  if (subcommand === 'render') {
    await cmdRender(cwd, ticket);
    return;
  }

  const maybeWave = rest[0];
  const restFlags = rest.slice(1);
  if (maybeWave === undefined || !isWaveId(maybeWave)) {
    process.stderr.write(`wave id obrigatória (W0|W1|W2|W3) para ${subcommand}\n`);
    process.exit(1);
  }
  const flags = parseFlags(restFlags);

  switch (subcommand) {
    case 'wave-start':
      await cmdWaveStart(cwd, ticket, maybeWave, flags);
      return;
    case 'wave-finish':
      await cmdWaveFinish(cwd, ticket, maybeWave, flags);
      return;
    case 'wave-round':
      await cmdWaveRound(cwd, ticket, maybeWave);
      return;
    case 'wave-reopen':
      await cmdWaveReopen(cwd, ticket, maybeWave, flags);
      return;
    default:
      process.stderr.write(`subcomando desconhecido: ${subcommand}\n`);
      process.exit(1);
  }
};

main().catch((e: unknown) => {
  process.stderr.write(`erro inesperado: ${(e as Error).message}\n`);
  process.exit(1);
});
