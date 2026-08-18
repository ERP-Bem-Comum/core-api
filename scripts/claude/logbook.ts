/**
 * Diário de bordo das sessões do Claude Code — leitor.
 *
 * O hook `.claude/hooks/logbook.sh` grava uma linha JSON por evento de operação da sessão
 * (SessionStart, SessionEnd, PreCompact, PostCompact, Stop). Este script transforma isso na
 * pergunta que interessa quando há instabilidade: **quais sessões morreram, e a que horas?**
 *
 * O sinal é uma AUSÊNCIA. Sessão que cai não emite `SessionEnd` — ela para. Uma sessão sem
 * `session_end` cujo último evento ficou para trás no tempo morreu ali; esse timestamp é o que se
 * cruza com status.claude.com ou com o horário de um incidente. Foi assim que se descobriu, em
 * 18/08/2026, que a queda daquele dia era um 529 do provedor 11 minutos após o início de um
 * incidente aberto — e não um problema desta máquina.
 *
 * Uso:
 *   node --experimental-strip-types scripts/claude/logbook.ts            # todas as sessões
 *   node --experimental-strip-types scripts/claude/logbook.ts --dead     # só as que não fecharam
 *   node --experimental-strip-types scripts/claude/logbook.ts <arquivo>  # outro diário
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';

export interface LogEntry {
  readonly ts: string;
  readonly session: string;
  readonly event: string;
  readonly source?: string;
  readonly version?: string;
  readonly branch?: string;
  readonly head?: string;
}

export interface SessionSummary {
  readonly session: string;
  readonly start: string;
  readonly last: string;
  /** `false` = não emitiu SessionEnd. É o sinal de queda. */
  readonly closed: boolean;
  readonly turns: number;
  readonly compactions: number;
  readonly branch: string;
  readonly version: string;
}

/** Ignora linha corrompida em vez de abortar: diário truncado por rotação ainda tem valor. */
const parse = (lines: readonly string[]): LogEntry[] => {
  const out: LogEntry[] = [];
  for (const line of lines) {
    if (line.trim() === '') continue;
    try {
      const parsed: unknown = JSON.parse(line);
      const e = parsed as Partial<LogEntry>;
      if (
        typeof e.session === 'string' &&
        typeof e.event === 'string' &&
        typeof e.ts === 'string'
      ) {
        out.push(e as LogEntry);
      }
    } catch {
      continue;
    }
  }
  return out;
};

export const summarize = (lines: readonly string[]): SessionSummary[] => {
  const bySession = new Map<string, LogEntry[]>();
  for (const e of parse(lines)) {
    const bucket = bySession.get(e.session);
    if (bucket !== undefined) bucket.push(e);
    else bySession.set(e.session, [e]);
  }

  const summaries: SessionSummary[] = [];
  for (const [session, events] of bySession) {
    const first = events[0];
    const last = events[events.length - 1];
    if (first === undefined || last === undefined) continue;
    summaries.push({
      session,
      start: first.ts,
      last: last.ts,
      closed: events.some((e) => e.event === 'SessionEnd'),
      turns: events.filter((e) => e.event === 'Stop').length,
      compactions: events.filter((e) => e.event === 'PreCompact' || e.event === 'PostCompact')
        .length,
      branch: events.find((e) => e.branch !== undefined)?.branch ?? '—',
      version: events.find((e) => e.version !== undefined)?.version ?? '—',
    });
  }
  return summaries.sort((a, b) => b.start.localeCompare(a.start));
};

const hhmm = (iso: string): string => iso.slice(5, 16).replace('T', ' ');

const duration = (from: string, to: string): string => {
  const ms = Date.parse(to) - Date.parse(from);
  if (Number.isNaN(ms) || ms < 0) return '—';
  const min = Math.round(ms / 60_000);
  return min < 60
    ? `${String(min)}min`
    : `${String(Math.floor(min / 60))}h${String(min % 60).padStart(2, '0')}`;
};

export const render = (sessions: readonly SessionSummary[], onlyDead = false): string => {
  const rows = onlyDead ? sessions.filter((s) => !s.closed) : sessions;
  if (rows.length === 0) {
    return onlyDead
      ? 'Nenhuma sessão sem fim registrada — nada caiu segundo o diário.'
      : 'Diário vazio: o hook logbook.sh ainda não registrou evento algum.';
  }

  const lines = rows.map((s) => {
    const marca = s.closed ? '  ok ' : '  ⚠️  ';
    const fim = s.closed ? hhmm(s.last) : `${hhmm(s.last)}  SEM FIM`;
    return [
      marca,
      s.session.slice(0, 8),
      `${hhmm(s.start)} → ${fim}`,
      `(${duration(s.start, s.last)})`,
      `${String(s.turns)} turnos`,
      `${String(s.compactions)} compactações`,
      s.branch,
    ].join('  ');
  });

  const mortas = rows.filter((s) => !s.closed).length;
  const cabecalho = onlyDead
    ? `SESSÕES SEM FIM — ${String(rows.length)}`
    : `DIÁRIO DE BORDO — ${String(rows.length)} sessões, ${String(mortas)} sem fim`;

  const rodape =
    mortas > 0
      ? '\nSessão SEM FIM não emitiu SessionEnd — caiu. O horário do último evento é a hora do\nóbito: cruze com status.claude.com e com ~/.claude/projects/**.jsonl (grep "API Error").'
      : '';

  return `${cabecalho}\n\n${lines.join('\n')}\n${rodape}`;
};

const isMain =
  process.argv[1] !== undefined && import.meta.filename === path.resolve(process.argv[1]);

if (isMain) {
  const args = process.argv.slice(2);
  const onlyDead = args.includes('--dead');
  const file = args.find((a) => !a.startsWith('--')) ?? '.claude/.session-logbook.log';
  let content = '';
  try {
    content = readFileSync(file, 'utf8');
  } catch {
    process.stdout.write(
      `Diário não encontrado em ${file}.\nEle nasce no primeiro SessionStart depois de o hook logbook.sh estar registrado.\n`,
    );
    process.exit(0);
  }
  process.stdout.write(`${render(summarize(content.split('\n')), onlyDead)}\n`);
}
