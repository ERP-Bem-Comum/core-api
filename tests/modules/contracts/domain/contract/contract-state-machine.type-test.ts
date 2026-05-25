/**
 * CTR-DOMAIN-STATE-MACHINE-CONTRACT — W0 RED — Testes de tipo (CA1)
 *
 * Arquivo analisado APENAS pelo `tsc --noEmit`. Não é executado por `node:test`.
 *
 * Estado W0 (RED):
 *   Os imports de `ActiveContract`, `ExpiredContract`, `TerminatedContract`
 *   FALHAM em compilação porque esses tipos não existem em `types.ts` ainda.
 *   Isso é o sinal RED de CA1 para o `tsc --noEmit`.
 *
 * Estado W1 (GREEN):
 *   Após W1 introduzir os tipos refinados, os imports passam a compilar.
 *   O bloco [ENABLE-IN-W1] abaixo deve ser descomentado para ativar os
 *   guardas de regressão CA3 (transições rejeitam não-Active em compile-time).
 *
 * Origem: handbook/interviews/0001-functional-ddd-domain-refresh.md
 *   - DO D§20: tipos refinados por estado, transições totais.
 *   - DO D§21: `parseActive` (Parse, don't validate).
 *   - DO C§29: `endedAt` ausente em Active, obrigatório em Expired/Terminated.
 *   - DON'T D§19: `assertActive` removido.
 */

// ─── CA1: imports de tipos refinados (RED em W0, GREEN em W1) ────────────────
//
// `tsc --noEmit` reporta erro aqui até W1 introduzir os exports:
//
//   Module '"#src/modules/contracts/domain/contract/types.ts"'
//   has no exported member 'ActiveContract'. (TS2305)
//
// Em W1, os imports abaixo passam e as asserções de shape no bloco
// [ENABLE-IN-W1] ficam ativas.

import type {
  ActiveContract,
  ExpiredContract,
  TerminatedContract,
} from '#src/modules/contracts/domain/contract/types.ts';

// Declarações para evitar "unused import" do tsc (apenas referência de tipo).
declare function _useTypes(_a: ActiveContract, _b: ExpiredContract, _c: TerminatedContract): void;
void _useTypes;

// ─── [ENABLE-IN-W1] ──────────────────────────────────────────────────────────
//
// Após W1: descomente o bloco abaixo para ativar guardas de regressão CA3.
// Os `@ts-expect-error` aqui NÃO têm [REMOVE-IN-W1] — devem permanecer
// como guardas permanentes: passar Expired/Terminated onde ActiveContract
// é esperado deve continuar sendo erro de tipo mesmo após W3.
//
/*
import { Contract as ContractNS } from '#src/modules/contracts/domain/contract/contract.ts';
import type { ContractAdjustment } from '#src/modules/contracts/domain/contract/types.ts';

const D = (iso: string): Date => new Date(iso);

// CA1-shape-a: ActiveContract não tem campo `endedAt` (DO C§29)
// Se `endedAt` existir em ActiveContract, esta linha seria erro ("unknown property").
// Em W1, ActiveContract = ContractCore & { status: 'Active' } — sem endedAt.
declare const active: ActiveContract;
// @ts-expect-error [CA1-shape-a] endedAt não existe em ActiveContract
void active.endedAt;

// CA1-shape-b: ExpiredContract tem `endedAt: Date` obrigatório
declare const expired: ExpiredContract;
const _expiredDate: Date = expired.endedAt; // deve compilar sem erro
void _expiredDate;

// CA1-shape-c: TerminatedContract tem `endedAt: Date` obrigatório
declare const terminated: TerminatedContract;
const _terminatedDate: Date = terminated.endedAt; // deve compilar sem erro
void _terminatedDate;

// CA3-a: expire(active: ActiveContract, at) — Expired não é atribuível a ActiveContract
// @ts-expect-error [CA3-a] expire rejeita ExpiredContract em compile-time
ContractNS.expire(expired, D('2027-01-01'));

// CA3-b: terminate(active: ActiveContract, at) — Terminated não é atribuível a ActiveContract
// @ts-expect-error [CA3-b] terminate rejeita TerminatedContract em compile-time
ContractNS.terminate(terminated, D('2026-06-15'));

// CA3-c: applyHomologatedAdjustment(active: ActiveContract, ...) — Expired não é Active
declare const adj: ContractAdjustment;
// @ts-expect-error [CA3-c] applyHomologatedAdjustment rejeita ExpiredContract em compile-time
ContractNS.applyHomologatedAdjustment(expired, adj, D('2027-02-01'));
*/
