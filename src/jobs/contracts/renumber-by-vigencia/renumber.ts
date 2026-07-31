// Backfill one-shot (issue #425 · ADR-0041) — renumera contratos cujo sufixo de ano
// diverge de `YEAR(original_period_start)` (criação = vigência inicial).
//
// O defeito: o import legado gravava `sequential_number` verbatim (`{XXXX}/{ano}`) e o
// legado republicava vigentes com o ano corrente (ex.: `/2026`). Este job corrige o dado
// já gravado. Adapter-level (toca `ctr_contracts` + `ctr_contract_seq` direto) — a política
// de derivação/resolução vem das funções PURAS de `domain/contract/sequential-number.ts`.
//
// Garantias:
//   • Ordem determinística (por `id` asc) — o resultado não depende da ordem de linha.
//   • Preserva a sequência `XXXX` trocando só o ano; se `XXXX/anoAlvo` colidir, reatribui
//     via `nextSequentialNumber(anoAlvo)`. NUNCA duplica (respeita UNIQUE(sequential_number)).
//   • Reconcilia `ctr_contract_seq` ao final: `lastSeq[ano] >= max(seq)` daquele ano — um
//     `nextSequentialNumber(ano)` futuro não colide com um número preservado.
//   • Idempotente: re-rodar após corrigido → 0 afetados (o ano já bate).
//   • Result na borda; nenhum `throw` vaza.

import { asc, eq, sql } from 'drizzle-orm';
import process from 'node:process';

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import type { MysqlHandle } from '#src/modules/contracts/adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleContractRepository } from '#src/modules/contracts/adapters/persistence/repos/contract-repository.drizzle.ts';
import {
  parseSequentialNumber,
  deriveNumberYear,
  resolveSequentialNumber,
} from '#src/modules/contracts/domain/contract/sequential-number.ts';

const TAG = '[renumber-by-vigencia] ';

// Projeção lida de ctr_contracts — só o necessário para a derivação/renumeração.
type ContractNumberRow = Readonly<{
  id: string;
  sequentialNumber: string;
  originalPeriodStart: Date;
}>;

export type RenumberError =
  | 'renumber-read-failed'
  | 'renumber-update-failed'
  | 'renumber-seq-unavailable'
  | 'renumber-reconcile-failed';

export type RenumberSummary = Readonly<{
  scanned: number; // linhas lidas de ctr_contracts
  affected: number; // preserved + reassigned
  preserved: number; // renumerados preservando a sequência (só troca de ano)
  reassigned: number; // renumerados via nextSequentialNumber (colisão)
  skippedMalformed: number; // sequential_number com formato inesperado (logado e pulado)
  reconciledYears: readonly number[]; // anos-alvo cujo contador foi reconciliado
}>;

/**
 * Reatribui via `nextSequentialNumber(year)`, saltando candidatos já ocupados. O contador
 * pode estar ATRÁS do maior `seq` preservado do ano (o preserve não sobe o contador), então
 * o primeiro `next` poderia colidir com um preservado — o laço avança até um número livre.
 * Termina: `next` é estritamente crescente e `taken` é finito.
 */
const reassign = async (
  repo: ReturnType<typeof createDrizzleContractRepository>,
  year: number,
  taken: ReadonlySet<string>,
): Promise<Result<string, RenumberError>> => {
  for (;;) {
    const next = await repo.nextSequentialNumber(year);
    if (!next.ok) {
      process.stderr.write(
        `${TAG}nextSequentialNumber(${year}) falhou: ${JSON.stringify(next.error)}\n`,
      );
      return err('renumber-seq-unavailable');
    }
    if (!taken.has(next.value)) return ok(next.value);
  }
};

export const renumberContractsByVigencia = async (
  handle: MysqlHandle, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
): Promise<Result<RenumberSummary, RenumberError>> => {
  const { db, schema } = handle;
  const repo = createDrizzleContractRepository(handle);

  // 1. Lê todos em ordem determinística (por id asc) — o resultado independe da ordem de linha.
  const rowsR = await (async (): Promise<Result<readonly ContractNumberRow[], RenumberError>> => {
    try {
      return ok(
        await db
          .select({
            id: schema.contracts.id,
            sequentialNumber: schema.contracts.sequentialNumber,
            originalPeriodStart: schema.contracts.originalPeriodStart,
          })
          .from(schema.contracts)
          .orderBy(asc(schema.contracts.id)),
      );
    } catch (cause) {
      process.stderr.write(`${TAG}leitura de ctr_contracts falhou: ${String(cause)}\n`);
      return err('renumber-read-failed');
    }
  })();
  if (!rowsR.ok) return rowsR;
  const rows = rowsR.value;

  // Conjunto vivo de números ocupados — reflete as mutações já aplicadas nesta execução,
  // de modo que a resolução de colisão veja tanto os não-tocados quanto os já renumerados.
  const taken = new Set<string>(rows.map((r) => r.sequentialNumber));

  let scanned = 0;
  let preserved = 0;
  let reassigned = 0;
  let skippedMalformed = 0;
  const touchedYears = new Set<number>();

  for (const row of rows) {
    scanned += 1;

    const parsed = parseSequentialNumber(row.sequentialNumber);
    if (parsed === null) {
      process.stderr.write(
        `${TAG}pulando ${row.id}: sequential_number inesperado ${JSON.stringify(row.sequentialNumber)}\n`,
      );
      skippedMalformed += 1;
      continue;
    }

    const targetYear = deriveNumberYear(row.originalPeriodStart);
    // Já correto (ano bate) → não toca. Base da idempotência.
    if (parsed.year === targetYear) continue;

    const resolution = resolveSequentialNumber(parsed.seq, targetYear, (c) => taken.has(c));

    // `preserve` usa o número direto; `reassign` obtém um livre via nextSequentialNumber.
    const pickedR: Result<string, RenumberError> =
      resolution.kind === 'preserve'
        ? ok(resolution.sequentialNumber)
        : await reassign(repo, targetYear, taken);
    if (!pickedR.ok) return err(pickedR.error);
    const newNumber = pickedR.value;
    if (resolution.kind === 'preserve') preserved += 1;
    else reassigned += 1;

    try {
      await db
        .update(schema.contracts)
        .set({ sequentialNumber: newNumber })
        .where(eq(schema.contracts.id, row.id));
    } catch (cause) {
      process.stderr.write(`${TAG}UPDATE de ${row.id} falhou: ${String(cause)}\n`);
      return err('renumber-update-failed');
    }

    // Rastro old→new + atualização do conjunto vivo.
    process.stdout.write(`${TAG}${row.id}: ${row.sequentialNumber} → ${newNumber}\n`);
    taken.delete(row.sequentialNumber);
    taken.add(newNumber);
    touchedYears.add(targetYear);
  }

  // 4. Reconcilia `ctr_contract_seq` para cada ano-alvo tocado: lastSeq[ano] = max(atual, max seq
  //    de TODOS os números daquele ano em ctr_contracts). Impede que um número preservado ACIMA do
  //    contador force um `nextSequentialNumber(ano)` futuro a colidir. O `taken` já reflete o estado
  //    final da tabela (todas as mutações aplicadas acima).
  const maxSeqByYear = new Map<number, number>();
  for (const num of taken) {
    const p = parseSequentialNumber(num);
    if (p === null) continue;
    const cur = maxSeqByYear.get(p.year) ?? 0;
    if (p.seq > cur) maxSeqByYear.set(p.year, p.seq);
  }

  for (const year of touchedYears) {
    const maxSeq = maxSeqByYear.get(year) ?? 0;
    try {
      // ON DUPLICATE KEY UPDATE é dirigível à PK `year` (única UNIQUE da tabela) — ADR-0020 permite.
      // GREATEST garante que nunca REBAIXAMOS um contador já à frente (ex.: números gerados no ano).
      await db
        .insert(schema.ctrContractSeq)
        .values({ year, lastSeq: maxSeq })
        .onDuplicateKeyUpdate({
          set: { lastSeq: sql`GREATEST(${schema.ctrContractSeq.lastSeq}, ${maxSeq})` },
        });
    } catch (cause) {
      process.stderr.write(
        `${TAG}reconciliação de ctr_contract_seq(${year}) falhou: ${String(cause)}\n`,
      );
      return err('renumber-reconcile-failed');
    }
  }

  return ok({
    scanned,
    affected: preserved + reassigned,
    preserved,
    reassigned,
    skippedMalformed,
    reconciledYears: [...touchedYears].sort((a, b) => a - b),
  });
};
