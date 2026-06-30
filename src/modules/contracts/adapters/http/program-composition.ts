/**
 * Composição de leitura do PROGRAMA na borda HTTP (CTR-NUMBER-PROGRAM; rota gorda — ADR-0032).
 *
 * Lê o programa pela `public-api` de programs (`ProgramReadPort`, ADR-0006/0014) a partir da
 * referência leve `programId` do contrato, e projeta o `snapshot` (nome/sigla/número). NUNCA toca
 * `prg_*` direto. Degradação graciosa: not-found, erro de IO e timeout colapsam em `snapshot: null`
 * (e port ausente — driver memory sem programs). A indisponibilidade de programs não derruba a leitura.
 *
 * `composeProgramBlocks` é BATCH — a coluna "Programa" do grid compõe com UMA chamada por página
 * (sem N+1).
 */

import type { ProgramReadPort, ProgramView } from '#src/modules/programs/public-api/index.ts';

const DEFAULT_TIMEOUT_MS = 2_000;

export type ProgramSnapshot = Readonly<{ name: string; sigla: string; programNumber: number }>;

/** Bloco `program` do contrato. `null` quando o contrato não referencia programa. */
export type ProgramBlock = Readonly<{ id: string; snapshot: ProgramSnapshot | null }> | null;

export type ComposeOptions = Readonly<{ timeoutMs?: number }>;

const toSnapshot = (v: ProgramView): ProgramSnapshot => ({
  name: v.name,
  sigla: v.sigla,
  programNumber: v.programNumber,
});

// Sentinela de timeout — resolve com `onTimeout` (colapsa no mesmo resultado da degradação).
const withTimeout = async <T>(p: Promise<T>, ms: number, onTimeout: T): Promise<T> => {
  let fire: (value: T) => void = () => undefined;
  const timeout = new Promise<T>((resolve) => {
    fire = resolve;
  });
  const timer = setTimeout(() => {
    fire(onTimeout);
  }, ms);
  try {
    return await Promise.race([p, timeout]);
  } finally {
    clearTimeout(timer);
  }
};

// Timeout colapsa no MESMO err do port (degradação graciosa: `!ok` → snapshot null).
const TIMEOUT_SENTINEL = { ok: false as const, error: 'program-read-unavailable' as const };

/**
 * Compõe o bloco `program` de UM contrato (detalhe). `programId` null → bloco `null`. Qualquer falha
 * (port ausente, not-found, IO, timeout) → `{ id, snapshot: null }` (degradação graciosa).
 */
export const composeProgramBlock = async (
  port: ProgramReadPort | null,
  programId: string | null,
  opts: ComposeOptions = {},
): Promise<ProgramBlock> => {
  if (programId === null) return null;
  if (port === null) return { id: programId, snapshot: null };

  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const r = await withTimeout(port.getProgramViews([programId]), timeoutMs, TIMEOUT_SENTINEL);
  if (!r.ok) return { id: programId, snapshot: null };
  const view = r.value.get(programId);
  return { id: programId, snapshot: view === undefined ? null : toSnapshot(view) };
};

/**
 * Compõe os snapshots de VÁRIOS programas (listagem) numa única chamada (`getProgramViews`).
 * Devolve `Map<programId, snapshot|null>`. ids `null` são ignorados; port ausente/erro → tudo `null`.
 */
export const composeProgramBlocks = async (
  port: ProgramReadPort | null,
  programIds: readonly (string | null)[],
  opts: ComposeOptions = {},
): Promise<ReadonlyMap<string, ProgramSnapshot | null>> => {
  const ids = [...new Set(programIds.filter((id): id is string => id !== null))];
  const out = new Map<string, ProgramSnapshot | null>();
  if (port === null || ids.length === 0) return out;

  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const r = await withTimeout(port.getProgramViews(ids), timeoutMs, TIMEOUT_SENTINEL);
  if (!r.ok) {
    for (const id of ids) out.set(id, null);
    return out;
  }
  for (const id of ids) {
    const view = r.value.get(id);
    out.set(id, view === undefined ? null : toSnapshot(view));
  }
  return out;
};

/**
 * Projeta o `Map` de snapshots (saída de `composeProgramBlocks`) no bloco `program` de UM
 * contrato. `programId` null → bloco null; programa não resolvido no map → `snapshot: null`.
 * Usado pela listagem para montar cada item a partir do batch (sem nova chamada ao port).
 */
export const programBlockFromSnapshots = (
  programId: string | null,
  snapshots: ReadonlyMap<string, ProgramSnapshot | null>,
): ProgramBlock =>
  programId === null ? null : { id: programId, snapshot: snapshots.get(programId) ?? null };
