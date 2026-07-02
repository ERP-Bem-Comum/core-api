/**
 * Entrypoint do ETL FINANCEIRO (ETL-FINANCIAL-WRITER) — wiring real.
 *
 * `runFinancialEtl({ dumpPath, connectionString, contractsDeparaPath, cedenteDocument, dryRun })`:
 *   1. `withLegacyMysql` sobe o legado efêmero; `readLegacyFinancialData()` lê
 *      accounts/payables/approvals (+collaborators/users p/ o join do aprovador — D11/F1);
 *   2. CEDENTES via use case `createCedenteAccount` (idempotente por chave natural);
 *   3. APROVADOR: `approvals.collaboratorId → email → users` → `authPort.provisionLegacyUser`
 *      (idempotente) = approvedBy;
 *   4. PAYABLES: idempotência por `fin_documents.legacy_id` (`buildFinancialEtlPort` —
 *      identifierCode NÃO é único: 37/52); planos do mapper → `saveDraft` (F3/F4) ou
 *      `saveDocument` (+`approveDocument` p/ APROVADO) com **ClockFixed POR DOCUMENTO nos
 *      DOIS use cases** (timeline DocumentSaved histórica + approvedAt histórico) →
 *      `markDocumentLegacyId`;
 *   5. reconciliação: balanço por entidade + SOMA LÍQUIDA migrada em cents (vs legado).
 *
 * 100% via domínio (zero SQL de escrita). `contractCategorizationReader` = stub ok(null)
 * (D9 — não herda categorização do contrato novo). Re-run parcial: doc Open com plano
 * approved → re-approve com a version REAL do findDocumentByLegacyId (nunca 0 hardcoded).
 *
 * ⚠️ Ressalvas do --dry-run (padrão dos writers): migrations DDL aplicadas ao abrir os
 * ports; destino não consultado — já-migrados reportam como migrated.
 *
 * ⚠️ ORDEM DAS ONDAS (dependência dura): cadastros → contratos → FINANCEIRO. Rodar o
 * financeiro antes dos cadastros faria o provisionLegacyUser criar o aprovador com
 * collaboratorRef null/CPF degradado — e o re-run de cadastros NÃO corrige (provision
 * é skip-never-update). O remap de suppliers/contratos também exige as ondas anteriores.
 */

import process from 'node:process';
import { mkdir, appendFile, writeFile, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import {
  installLastResortHandlers,
  processLastResortDeps,
} from '#src/shared/runtime/last-resort.ts';
import { ClockFixed } from '#src/shared/adapters/clock-fixed.ts';

import * as Email from '#src/modules/auth/domain/identity/email.ts';
import { buildAuthEtlPort, type BuildAuthEtlPortError } from '#src/modules/auth/public-api/etl.ts';
import {
  buildPartnersEtlPort,
  type BuildPartnersEtlPortError,
} from '#src/modules/partners/public-api/etl.ts';
import {
  buildFinancialEtlPort,
  type BuildFinancialEtlPortError,
} from '#src/modules/financial/public-api/etl.ts';
import {
  openMysqlFinancial,
  type FinancialMysqlHandle,
} from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleDocumentRepository } from '#src/modules/financial/adapters/persistence/repos/document-repository.drizzle.ts';
import { createDrizzleCedenteAccountStore } from '#src/modules/financial/adapters/persistence/repos/cedente-account-store.drizzle.ts';
import { saveDocument } from '#src/modules/financial/application/use-cases/save-document.ts';
import { saveDraft } from '#src/modules/financial/application/use-cases/save-draft.ts';
import { approveDocument } from '#src/modules/financial/application/use-cases/approve-document.ts';
import { createCedenteAccount } from '#src/modules/financial/application/use-cases/create-cedente-account.ts';
import type { ContractCategorizationReadPort } from '#src/modules/contracts/public-api/index.ts';

import { withLegacyMysql, type RestoreError } from '#scripts/etl/legacy/restore.ts';
import { readLegacyFinancialData } from '#scripts/etl/financial/reader.ts';
import {
  mapLegacyAccountRow,
  mapLegacyPayableRow,
  type PayableMapRefs,
} from '#scripts/etl/financial/mapper.ts';
import {
  toSummary,
  describeReason,
  type QuarantineReason,
} from '#scripts/etl/quarantine/reason.ts';

// Dump sintético (dados fake) — JAMAIS o de produção.
const DEFAULT_DUMP = 'tests/etl/fixtures/legacy-mini.sql';
const DEFAULT_CONTRACTS_DEPARA = '.tmp/etl-contracts/de-para.jsonl';
const OUT_DIR = '.tmp/etl-financial';
const SUMMARY_PATH = `${OUT_DIR}/quarantine.summary.jsonl`;
const DETAIL_PATH = `${OUT_DIR}/quarantine.detail.jsonl`;
const DEPARA_PATH = `${OUT_DIR}/de-para.jsonl`;

export type RunFinancialEtlOptions = Readonly<{
  dumpPath: string;
  connectionString: string;
  contractsDeparaPath: string;
  /** CNPJ/identificação do cedente (D6) — obrigatório no domínio; placeholder auditado no lab. */
  cedenteDocument: string;
  dryRun: boolean;
}>;

export type Tally = Readonly<{
  read: number;
  migrated: number;
  quarantined: number;
  alreadyExists: number;
}>;

export type FinancialEtlReport = Readonly<{
  accounts: Tally;
  payables: Tally;
  byKind: Readonly<{ open: number; approved: number; draft: number }>;
  migratedNetCents: number;
}>;

export type RunFinancialEtlError =
  | Readonly<{ kind: 'restore'; detail: RestoreError }>
  | Readonly<{ kind: 'auth-port'; detail: BuildAuthEtlPortError }>
  | Readonly<{ kind: 'partners-port'; detail: BuildPartnersEtlPortError }>
  | Readonly<{ kind: 'financial-port'; detail: BuildFinancialEtlPortError }>
  | Readonly<{ kind: 'financial-driver'; detail: string }>
  | Readonly<{ kind: 'contracts-depara'; detail: string }>;

type Sink = Readonly<{
  quarantine: (
    table: string,
    legacyId: unknown,
    reasons: readonly QuarantineReason[],
  ) => Promise<void>;
  depara: (record: Readonly<Record<string, unknown>>) => Promise<void>;
}>;

const makeSink = (): Sink => ({
  quarantine: async (table, legacyId, reasons): Promise<void> => {
    for (const reason of reasons) {
      const summary = JSON.stringify({
        legacyId,
        table,
        reason: toSummary(reason),
        describe: describeReason(reason),
      });
      const detail = JSON.stringify({ legacyId, table, reason });
      await appendFile(resolve(SUMMARY_PATH), `${summary}\n`, 'utf8');
      await appendFile(resolve(DETAIL_PATH), `${detail}\n`, 'utf8');
    }
  },
  depara: async (record): Promise<void> => {
    await appendFile(resolve(DEPARA_PATH), `${JSON.stringify(record)}\n`, 'utf8');
  },
});

// Erro de port: extrai SÓ o código kebab (contrato PII-free do reason.ts).
const portCode = (e: unknown): string => {
  if (typeof e === 'string') return e;
  if (typeof e === 'object' && e !== null && 'tag' in e) {
    const tag = (e as Readonly<{ tag: unknown }>).tag;
    if (typeof tag === 'string') return tag;
  }
  return 'unknown-port-error';
};

// D9: sem herança de categorização do contrato novo — o legado é a fonte, e a
// categorização legada (árvore antiga) aguarda decisão própria; fica no artefato.
const stubCategorizationReader: ContractCategorizationReadPort = {
  getCategorization: async () => Promise.resolve(ok(null)),
};

const loadContractsDepara = async (
  path: string,
): Promise<Result<ReadonlyMap<number, string>, string>> => {
  try {
    const raw = await readFile(resolve(path), 'utf8');
    const map = new Map<number, string>();
    for (const line of raw.split('\n')) {
      if (line.trim() === '') continue;
      const parsed = JSON.parse(line) as Readonly<Record<string, unknown>>;
      if (parsed['entity'] === 'contract') {
        const legacyId = parsed['legacyId'];
        const newId = parsed['newId'];
        if (typeof legacyId === 'number' && typeof newId === 'string') {
          map.set(legacyId, newId);
        }
      }
    }
    return ok(map);
  } catch (cause) {
    return err(`contracts-depara-unreadable: ${String(cause)}`);
  }
};

// ---------------------------------------------------------------------------
// runFinancialEtl
// ---------------------------------------------------------------------------

export const runFinancialEtl = async (
  opts: Readonly<RunFinancialEtlOptions>,
): Promise<Result<FinancialEtlReport, RunFinancialEtlError>> => {
  await mkdir(resolve(OUT_DIR), { recursive: true });
  // Artefatos POR RUN (padrão dos writers): trunca — de-para é a fotografia do último run.
  for (const path of [SUMMARY_PATH, DETAIL_PATH, DEPARA_PATH]) {
    await writeFile(resolve(path), '', 'utf8');
  }
  const sink = makeSink();

  const deparaR = await loadContractsDepara(opts.contractsDeparaPath);
  if (!deparaR.ok) return err({ kind: 'contracts-depara', detail: deparaR.error });
  const contractRefByLegacyId = deparaR.value;

  const authR = await buildAuthEtlPort({ connectionString: opts.connectionString });
  if (!authR.ok) return err({ kind: 'auth-port', detail: authR.error });
  const authPort = authR.value;

  const partnersR = await buildPartnersEtlPort({ connectionString: opts.connectionString });
  if (!partnersR.ok) {
    await authPort.close();
    return err({ kind: 'partners-port', detail: partnersR.error });
  }
  const partnersPort = partnersR.value;

  const finPortR = await buildFinancialEtlPort({ connectionString: opts.connectionString });
  if (!finPortR.ok) {
    await partnersPort.close();
    await authPort.close();
    return err({ kind: 'financial-port', detail: finPortR.error });
  }
  const finPort = finPortR.value;

  const finHandleR = await openMysqlFinancial({
    connectionString: opts.connectionString,
    applyMigrations: false, // já aplicadas pelo buildFinancialEtlPort
  });
  if (!finHandleR.ok) {
    await finPort.close();
    await partnersPort.close();
    await authPort.close();
    return err({ kind: 'financial-driver', detail: finHandleR.error });
  }
  const finHandle: FinancialMysqlHandle = finHandleR.value;

  try {
    const restored = await withLegacyMysql(opts.dumpPath, async () => {
      const data = await readLegacyFinancialData();
      const documentRepo = createDrizzleDocumentRepository(finHandle);
      const cedenteStore = createDrizzleCedenteAccountStore(finHandle);

      // ── Cedentes (accounts) ────────────────────────────────────────────────
      let aMigrated = 0;
      let aQuarantined = 0;
      let aExisting = 0;
      const cedenteRefByLegacyId = new Map<number, string>();

      for (const failure of data.accounts.failures) {
        aQuarantined += 1;
        await sink.quarantine('accounts', failure.legacyId, failure.errors);
      }

      for (const row of data.accounts.rows) {
        const plan = mapLegacyAccountRow(row);
        if (!plan.ok) {
          aQuarantined += 1;
          await sink.quarantine('accounts', row.id, plan.error);
          continue;
        }
        if (opts.dryRun) {
          aMigrated += 1;
          cedenteRefByLegacyId.set(row.id, `dry-run-cedente-${String(row.id)}`);
          continue;
        }
        const created = await createCedenteAccount({ cedenteStore })({
          ...plan.value.input,
          document: opts.cedenteDocument,
        });
        if (created.ok) {
          aMigrated += 1;
          cedenteRefByLegacyId.set(row.id, String(created.value.id));
          await sink.depara({
            entity: 'cedente-account',
            legacyId: row.id,
            newId: String(created.value.id),
            nickname: plan.value.input.nickname,
          });
        } else if (created.error === 'cedente-account-duplicate') {
          // Idempotência por chave natural: resolve o id existente p/ o remap.
          const found = await cedenteStore.findByNaturalKey({
            bankCode: plan.value.input.bankCode,
            agency: plan.value.input.agency,
            accountNumber: plan.value.input.accountNumber,
            accountDigit: plan.value.input.accountDigit,
          });
          if (found.ok && found.value !== null) {
            aExisting += 1;
            cedenteRefByLegacyId.set(row.id, String(found.value.id));
            await sink.depara({
              entity: 'cedente-account',
              legacyId: row.id,
              newId: String(found.value.id),
              nickname: plan.value.input.nickname,
              alreadyExisted: true,
            });
          } else {
            aQuarantined += 1;
            await sink.quarantine('accounts', row.id, [
              { tag: 'PortError', field: 'cedente_lookup', portError: 'cedente-account-duplicate' },
            ]);
          }
        } else {
          aQuarantined += 1;
          await sink.quarantine('accounts', row.id, [
            { tag: 'PortError', field: 'cedente_save', portError: portCode(created.error) },
          ]);
        }
      }

      // ── Aprovador (D11/F1) — GENERALIZADO por payable (W2 issue 3) ─────────
      // approvals.userId é NULL em 100% do dump; identidade = collaboratorId → email → user.
      // E-mail ambíguo entre users → fail-closed (join deve ser determinístico — W2 issue 6).
      const approvedAtByPayableId = new Map<number, Date>();
      const approvalCollabByPayableId = new Map<number, number | null>();
      const approverByCollaboratorId = new Map<number, string>();

      const usersByEmail = new Map<string, (typeof data.users.rows)[number]>();
      const ambiguousEmails = new Set<string>();
      for (const u of data.users.rows) {
        const key = u.email.trim().toLowerCase();
        if (usersByEmail.has(key)) ambiguousEmails.add(key);
        else usersByEmail.set(key, u);
      }
      const collaboratorsById = new Map<number, (typeof data.collaborators.rows)[number]>();
      for (const c of data.collaborators.rows) collaboratorsById.set(c.id, c);

      for (const approval of data.approvals.rows) {
        if (approval.approved !== 1) continue;
        const prev = approvedAtByPayableId.get(approval.payableId);
        if (prev === undefined || approval.createdAt.getTime() > prev.getTime()) {
          approvedAtByPayableId.set(approval.payableId, approval.createdAt);
          approvalCollabByPayableId.set(approval.payableId, approval.collaboratorId);
        }
        if (approval.collaboratorId === null) continue;
        if (opts.dryRun || approverByCollaboratorId.has(approval.collaboratorId)) continue;

        const collaborator = collaboratorsById.get(approval.collaboratorId);
        if (collaborator === undefined) continue; // join falhou → payable quarentena adiante
        const emailKey = collaborator.email.trim().toLowerCase();
        if (ambiguousEmails.has(emailKey)) continue; // fail-closed: ambiguidade nunca resolve
        const user = usersByEmail.get(emailKey);
        if (user === undefined) continue;
        const emailR = Email.parse(user.email);
        if (!emailR.ok) continue;
        const provisioned = await authPort.provisionLegacyUser({
          legacyId: user.id,
          email: emailR.value,
          massApprove: user.massApprovalPermission === 1,
          name: user.name,
          cpf: user.cpf,
          telephone: user.telephone,
          collaboratorRef: null,
        });
        if (provisioned.ok) {
          approverByCollaboratorId.set(approval.collaboratorId, String(provisioned.value.userRef));
        }
      }

      // Aprovador POR PAYABLE (a approval vencedora define quem aprovou aquele título).
      const approverRefByPayableId = new Map<number, string>();
      for (const [payableId, collabId] of approvalCollabByPayableId) {
        if (collabId === null) continue;
        const ref = approverByCollaboratorId.get(collabId);
        if (ref !== undefined) approverRefByPayableId.set(payableId, ref);
      }

      // Extras do artefato (W2 issue 2): categorização legada + conferência de installments.
      const categorizationByPayableId = new Map<number, Readonly<Record<string, unknown>>>();
      for (const c of data.categorization.rows) {
        if (c.payableRelationalId !== null) {
          categorizationByPayableId.set(c.payableRelationalId, {
            legacyCostCenterId: c.costCenterId,
            legacyCategoryId: c.categoryId,
            legacySubCategoryId: c.subCategoryId,
            legacyProgramId: c.programId,
            legacyBudgetPlanId: c.budgetPlanId,
          });
        }
      }
      const installmentsByPayableId = new Map<number, { count: number; sumCents: number }>();
      for (const inst of data.installments.rows) {
        if (inst.payableId === null) continue;
        const agg = installmentsByPayableId.get(inst.payableId) ?? { count: 0, sumCents: 0 };
        agg.count += 1;
        agg.sumCents += Math.round(inst.value * 100);
        installmentsByPayableId.set(inst.payableId, agg);
      }
      const extrasFor = (payableId: number): Readonly<Record<string, unknown>> => ({
        legacyCategorization: categorizationByPayableId.get(payableId) ?? null,
        legacyInstallments: installmentsByPayableId.get(payableId) ?? null,
      });

      // ── Remap de fornecedores (porta pública do partners) ─────────────────
      const supplierRefByLegacyId = new Map<number, string>();
      const supplierLookupFailed = new Map<number, string>();
      const uniqueSupplierIds = new Set<number>();
      for (const row of data.payables.rows) {
        if (row.supplierId !== null) uniqueSupplierIds.add(row.supplierId);
      }
      for (const legacyId of uniqueSupplierIds) {
        const found = await partnersPort.suppliers.findByLegacyId(legacyId);
        if (!found.ok) supplierLookupFailed.set(legacyId, portCode(found.error));
        else if (found.value !== null) supplierRefByLegacyId.set(legacyId, String(found.value));
      }

      const refs: PayableMapRefs = {
        supplierRefByLegacyId,
        contractRefByLegacyId,
        cedenteRefByLegacyId,
        approvedAtByPayableId,
      };

      // ── Payables → Documentos ──────────────────────────────────────────────
      let pMigrated = 0;
      let pQuarantined = 0;
      let pExisting = 0;
      let kOpen = 0;
      let kApproved = 0;
      let kDraft = 0;
      let migratedNetCents = 0;

      for (const failure of data.payables.failures) {
        pQuarantined += 1;
        await sink.quarantine('payables', failure.legacyId, failure.errors);
      }

      for (const row of data.payables.rows) {
        // Infra ≠ dado: falha de PORT no remap → PortError, antes do mapper.
        if (row.supplierId !== null && supplierLookupFailed.has(row.supplierId)) {
          pQuarantined += 1;
          await sink.quarantine('payables', row.id, [
            {
              tag: 'PortError',
              field: 'supplier_lookup',
              portError: supplierLookupFailed.get(row.supplierId) ?? 'unknown-port-error',
            },
          ]);
          continue;
        }

        const plan = mapLegacyPayableRow(row, refs);
        if (!plan.ok) {
          pQuarantined += 1;
          await sink.quarantine('payables', row.id, plan.error);
          continue;
        }

        // Aprovador é pré-condição p/ planos approved (D11) — resolvido POR PAYABLE.
        const approvedByRef =
          plan.value.kind === 'approved' ? (approverRefByPayableId.get(row.id) ?? null) : null;
        if (plan.value.kind === 'approved' && !opts.dryRun && approvedByRef === null) {
          pQuarantined += 1;
          await sink.quarantine('payables', row.id, [
            { tag: 'PortError', field: 'approver_ref', portError: 'approver-join-unresolved' },
          ]);
          continue;
        }

        if (opts.dryRun) {
          pMigrated += 1;
          if (plan.value.kind === 'open') kOpen += 1;
          else if (plan.value.kind === 'approved') kApproved += 1;
          else kDraft += 1;
          continue;
        }

        // Idempotência por legacy_id (identifierCode NÃO é único — 37/52).
        const existing = await finPort.documents.findDocumentByLegacyId(row.id);
        if (!existing.ok) {
          pQuarantined += 1;
          await sink.quarantine('payables', row.id, [
            { tag: 'PortError', field: 'document_lookup', portError: portCode(existing.error) },
          ]);
          continue;
        }
        if (existing.value !== null) {
          // Re-run parcial: plano approved sobre doc Open → retoma o approve com a
          // version REAL (nunca 0 hardcoded).
          if (plan.value.kind === 'approved' && existing.value.status === 'Open') {
            const resumed = await approveDocument({
              repo: documentRepo,
              clock: ClockFixed(plan.value.approvedAt ?? row.updatedAt),
            })({
              documentId: existing.value.id,
              approvedBy: approvedByRef ?? '',
              expectedVersion: existing.value.version,
            });
            if (!resumed.ok) {
              pQuarantined += 1;
              await sink.quarantine('payables', row.id, [
                {
                  tag: 'PortError',
                  field: 'document_resume_approve',
                  portError: portCode(resumed.error),
                },
              ]);
              continue;
            }
          }
          pExisting += 1;
          // Divergência plano×destino (W2 issue 8b): ex. F4 corrigida na origem sobre doc
          // que ficou Draft num run anterior — sinalizada, nunca silenciosa.
          const expectedStatus =
            plan.value.kind === 'approved'
              ? 'Approved'
              : plan.value.kind === 'open'
                ? 'Open'
                : 'Draft';
          const statusAfter =
            plan.value.kind === 'approved' && existing.value.status === 'Open'
              ? 'Approved'
              : existing.value.status;
          await sink.depara({
            entity: 'document',
            legacyId: row.id,
            newId: existing.value.id,
            kind: plan.value.kind,
            alreadyExisted: true,
            statusDestino: statusAfter,
            statusDivergence: statusAfter !== expectedStatus,
            ...extrasFor(row.id),
            ...plan.value.artifact,
          });
          continue;
        }

        // Janela save→mark (W2 issue 1): run parcial pode ter deixado doc órfão
        // (legacy_id NULL). ADOTA (marca) em vez de criar — zero duplicata/outbox.
        const planNumber =
          plan.value.kind === 'draft'
            ? (plan.value.draft?.documentNumber ?? null)
            : (plan.value.doc?.documentNumber ?? null);
        const planSupplier =
          plan.value.kind === 'draft'
            ? (plan.value.draft?.supplierRef ?? null)
            : (plan.value.doc?.supplierRef ?? null);
        const planGross =
          plan.value.kind === 'draft'
            ? (plan.value.draft?.grossValueCents ?? null)
            : (plan.value.doc?.grossValueCents ?? null);
        // (drafts sem documentNumber pulam a adoção — janela teórica residual; inócua:
        // 52/52 payables do dump têm identifierCode.)
        if (planNumber !== null) {
          const orphan = await finPort.documents.findOrphanCandidate(
            planNumber,
            planSupplier,
            planGross,
          );
          if (!orphan.ok) {
            pQuarantined += 1;
            await sink.quarantine('payables', row.id, [
              { tag: 'PortError', field: 'orphan_lookup', portError: portCode(orphan.error) },
            ]);
            continue;
          }
          if (orphan.value !== null) {
            const adopted = await finPort.documents.markDocumentLegacyId(orphan.value.id, row.id);
            if (!adopted.ok) {
              pQuarantined += 1;
              await sink.quarantine('payables', row.id, [
                { tag: 'PortError', field: 'orphan_adopt', portError: portCode(adopted.error) },
              ]);
              continue;
            }
            // Convergência no MESMO run (W2 R2 sug.1): órfão Open com plano approved
            // recebe o resume-approve imediatamente (version real do órfão).
            let adoptedStatus = orphan.value.status;
            if (plan.value.kind === 'approved' && orphan.value.status === 'Open') {
              const resumed = await approveDocument({
                repo: documentRepo,
                clock: ClockFixed(plan.value.approvedAt ?? row.updatedAt),
              })({
                documentId: orphan.value.id,
                approvedBy: approvedByRef ?? '',
                expectedVersion: orphan.value.version,
              });
              if (resumed.ok) adoptedStatus = 'Approved';
            }
            const expectedAdopted =
              plan.value.kind === 'approved'
                ? 'Approved'
                : plan.value.kind === 'open'
                  ? 'Open'
                  : 'Draft';
            pExisting += 1;
            await sink.depara({
              entity: 'document',
              legacyId: row.id,
              newId: orphan.value.id,
              kind: plan.value.kind,
              adoptedOrphan: true,
              statusDestino: adoptedStatus,
              statusDivergence: adoptedStatus !== expectedAdopted,
              ...extrasFor(row.id),
              ...plan.value.artifact,
            });
            continue;
          }
        }

        // Nasce pelo domínio — Clock histórico POR DOCUMENTO nos DOIS use cases.
        // (IIFE devolve o documentId ou null; quarentena/contadores tratados dentro.)
        type BornOutcome =
          | Readonly<{ born: 'quarantined' }>
          | Readonly<{ born: 'draft' | 'open' | 'approved'; documentId: string }>;
        const outcome = await (async (): Promise<BornOutcome> => {
          if (plan.value.kind === 'draft') {
            const draft = plan.value.draft;
            const saved = await saveDraft({
              repo: documentRepo,
              clock: ClockFixed(plan.value.createdAtLegacy),
            })({
              documentNumber: draft?.documentNumber ?? null,
              type: draft?.type ?? null,
              supplierRef: draft?.supplierRef ?? null,
              paymentMethod: draft?.paymentMethod ?? null,
              grossValueCents: draft?.grossValueCents ?? null,
              dueDate: draft?.dueDate ?? null,
              contractRef: draft?.contractRef ?? null,
              contaDebitoRef: draft?.contaDebitoRef ?? null,
              competencia: draft?.competencia ?? null,
              paymentDetail: draft?.paymentDetail ?? null,
              description: draft?.description ?? null,
            });
            if (!saved.ok) {
              await sink.quarantine('payables', row.id, [
                { tag: 'PortError', field: 'save_draft', portError: portCode(saved.error) },
              ]);
              return { born: 'quarantined' };
            }
            return { born: 'draft', documentId: saved.value.documentId };
          }

          const doc = plan.value.doc;
          if (doc === null) {
            await sink.quarantine('payables', row.id, [
              { tag: 'PortError', field: 'plan_invariant', portError: 'doc-fields-missing' },
            ]);
            return { born: 'quarantined' };
          }
          const saved = await saveDocument({
            repo: documentRepo,
            clock: ClockFixed(plan.value.createdAtLegacy),
            contractCategorizationReader: stubCategorizationReader,
            cedenteAccountStore: cedenteStore,
          })({
            documentNumber: doc.documentNumber,
            type: doc.type,
            supplierRef: doc.supplierRef,
            paymentMethod: doc.paymentMethod,
            grossValueCents: doc.grossValueCents,
            dueDate: doc.dueDate,
            contractRef: doc.contractRef,
            contaDebitoRef: doc.contaDebitoRef,
            competencia: doc.competencia,
            paymentDetail: doc.paymentDetail,
            description: doc.description,
          });
          if (!saved.ok) {
            await sink.quarantine('payables', row.id, [
              { tag: 'PortError', field: 'save_document', portError: portCode(saved.error) },
            ]);
            return { born: 'quarantined' };
          }

          if (plan.value.kind === 'approved') {
            const approved = await approveDocument({
              repo: documentRepo,
              clock: ClockFixed(plan.value.approvedAt ?? row.updatedAt),
            })({
              documentId: saved.value.documentId,
              approvedBy: approvedByRef ?? '',
              expectedVersion: 0,
            });
            if (!approved.ok) {
              await sink.quarantine('payables', row.id, [
                {
                  tag: 'PortError',
                  field: 'approve_document',
                  portError: portCode(approved.error),
                },
              ]);
              return { born: 'quarantined' };
            }
            return { born: 'approved', documentId: saved.value.documentId };
          }
          return { born: 'open', documentId: saved.value.documentId };
        })();

        if (outcome.born === 'quarantined') {
          pQuarantined += 1;
          continue;
        }
        const documentId = outcome.documentId;

        const marked = await finPort.documents.markDocumentLegacyId(documentId, row.id);
        if (!marked.ok) {
          // Doc existe sem correlação — inconsistência CRÍTICA p/ re-run; reportar alto.
          pQuarantined += 1;
          await sink.quarantine('payables', row.id, [
            { tag: 'PortError', field: 'mark_legacy_id', portError: portCode(marked.error) },
          ]);
          continue;
        }

        // Contadores/soma só APÓS o mark (W2 issue 5): quarentena pós-mark não conta
        // em byKind nem na soma líquida — o relatório fica internamente consistente.
        pMigrated += 1;
        if (outcome.born === 'draft') {
          kDraft += 1;
        } else {
          if (outcome.born === 'approved') kApproved += 1;
          else kOpen += 1;
          migratedNetCents += Math.round(row.liquidValue * 100);
        }
        await sink.depara({
          entity: 'document',
          legacyId: row.id,
          newId: documentId,
          kind: plan.value.kind,
          draftReason: plan.value.draftReason,
          ...extrasFor(row.id),
          ...plan.value.artifact,
        });
      }

      // Aprovações ÓRFÃS (F2 — W2 issue 2a): registro de aprovação cujo payable NÃO está
      // APROVADO no legado (aprovado e revertido sem trilha). Preservadas no de-para.
      const legacyStatusById = new Map<number, string>();
      for (const r of data.payables.rows) legacyStatusById.set(r.id, r.payableStatus);
      for (const [payableId, at] of approvedAtByPayableId) {
        if (legacyStatusById.get(payableId) !== 'APROVADO') {
          await sink.depara({
            entity: 'orphan-approval',
            payableLegacyId: payableId,
            approvedAtLegacy: at.toISOString(),
            collaboratorId: approvalCollabByPayableId.get(payableId) ?? null,
          });
        }
      }

      // Falhas de decode das tabelas de artefato: reportadas (nunca silêncio), sem tally.
      for (const failure of data.categorization.failures) {
        await sink.quarantine('categorization', failure.legacyId, failure.errors);
      }
      for (const failure of data.installments.failures) {
        await sink.quarantine('installments', failure.legacyId, failure.errors);
      }

      const report: FinancialEtlReport = {
        accounts: {
          read: data.accounts.rows.length + data.accounts.failures.length,
          migrated: aMigrated,
          quarantined: aQuarantined,
          alreadyExists: aExisting,
        },
        payables: {
          read: data.payables.rows.length + data.payables.failures.length,
          migrated: pMigrated,
          quarantined: pQuarantined,
          alreadyExists: pExisting,
        },
        byKind: { open: kOpen, approved: kApproved, draft: kDraft },
        migratedNetCents,
      };
      return report;
    });

    if (!restored.ok) return err({ kind: 'restore', detail: restored.error });
    return ok(restored.value);
  } finally {
    await finHandle.close();
    await finPort.close();
    await partnersPort.close();
    await authPort.close();
  }
};

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const parseArgs = (argv: readonly string[]): RunFinancialEtlOptions => {
  let dumpPath = DEFAULT_DUMP;
  let contractsDeparaPath = DEFAULT_CONTRACTS_DEPARA;
  let dryRun = false;
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--dry-run') {
      dryRun = true;
    } else if (token === '--dump') {
      const next = argv[i + 1];
      if (next !== undefined) {
        dumpPath = next;
        i += 1;
      }
    } else if (token?.startsWith('--dump=') === true) {
      dumpPath = token.slice('--dump='.length);
    } else if (token === '--contracts-depara') {
      const next = argv[i + 1];
      if (next !== undefined) {
        contractsDeparaPath = next;
        i += 1;
      }
    } else if (token?.startsWith('--contracts-depara=') === true) {
      contractsDeparaPath = token.slice('--contracts-depara='.length);
    }
  }
  const connectionString =
    process.env['ETL_CORE_CONNECTION_STRING'] ??
    'mysql://root:rootpw-migration-test-only@127.0.0.1:3307/core';
  // D6: identificação do cedente não existe no legado — placeholder auditado no lab.
  const cedenteDocument = process.env['ETL_CEDENTE_DOCUMENT'] ?? 'PENDENTE-D6';
  return { dumpPath, connectionString, contractsDeparaPath, cedenteDocument, dryRun };
};

const formatReport = (report: Readonly<FinancialEtlReport>): string => {
  const line = (name: string, t: Tally): string =>
    `  ${name}: read=${String(t.read)} migrated=${String(t.migrated)} ` +
    `quarantined=${String(t.quarantined)} alreadyExists=${String(t.alreadyExists)}`;
  return [
    'ETL Financeiro — reconciliacao:',
    line('accounts', report.accounts),
    line('payables', report.payables),
    `  por estado: open=${String(report.byKind.open)} approved=${String(report.byKind.approved)} draft=${String(report.byKind.draft)}`,
    `  soma liquida migrada (Open/Approved): ${String(report.migratedNetCents)} cents`,
  ].join('\n');
};

const lastResortShutdown = async (): Promise<void> => {
  await Promise.resolve();
};

const main = async (): Promise<number> => {
  const [, , ...argv] = process.argv;
  const opts = parseArgs(argv);

  const result = await runFinancialEtl(opts);
  if (!result.ok) {
    process.stderr.write(`ETL financeiro falhou: ${JSON.stringify(result.error)}\n`);
    return 1;
  }
  process.stdout.write(`${formatReport(result.value)}\n`);
  if (opts.dryRun) {
    process.stdout.write(
      '  (dry-run: nada de dados persistido; migrations DDL aplicadas ao abrir os ports; ' +
        'destino nao consultado — ja-migrados aparecem como migrated)\n',
    );
  }
  return 0;
};

if (process.argv[1] !== undefined && resolve(process.argv[1]) === import.meta.filename) {
  installLastResortHandlers(lastResortShutdown, processLastResortDeps());
  process.on('SIGTERM', () => {
    process.exit(143);
  });
  main().then(
    (code) => {
      process.exit(code);
    },
    (cause: unknown) => {
      process.stderr.write(`Erro inesperado: ${String(cause)}\n`);
      process.exit(1);
    },
  );
}
