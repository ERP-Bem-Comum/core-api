import { randomUUID } from 'node:crypto';

import { type Result, ok, err } from '../../../../../shared/primitives/result.ts';
import type { ContractsModuleEvent } from '../../../application/ports/event-bus.ts';
import type { OutboxRow } from '../../../application/ports/outbox.ts';
import type { ctrOutbox } from '../schemas/mysql.ts';
import * as ContractId from '../../../domain/shared/contract-id.ts';
import * as AmendmentId from '../../../domain/shared/amendment-id.ts';
import * as DocumentId from '../../../domain/shared/document-id.ts';
import * as UserRef from '../../../../../shared/kernel/user-ref.ts';
import * as Money from '../../../../../shared/kernel/money.ts';
import * as Period from '../../../../../shared/kernel/period.ts';
import * as PlainDate from '../../../../../shared/kernel/plain-date.ts';
import {
  createBucketName,
  createStorageKey,
} from '../../../application/ports/document-storage.types.ts';

// ─── Row types ────────────────────────────────────────────────────────────────
//
// `OutboxRow` é o tipo canônico do CONSUMIDOR e vive no port
// (application/ports/outbox.ts) — reexportado aqui por compatibilidade dos
// importadores deste mapper. `OutboxInsert` segue inferido do schema (lado de
// escrita, interno ao adapter).

export type { OutboxRow };
export type OutboxInsert = typeof ctrOutbox.$inferInsert;

// CA4 guard (CTR-OUTBOX-CONSUMER-PORT): trava o drift schema↔port. Se uma coluna de
// `ctr_outbox` for adicionada, removida ou retipada, a linha inferida do schema
// (`$inferSelect`) deixa de ser estruturalmente equivalente ao `OutboxRow` do port
// e uma das asserções vira `false` — `AssertTrue<false>` quebra o typecheck.
type OutboxRowSchema = typeof ctrOutbox.$inferSelect;
type AssertTrue<T extends true> = T;
const _outboxRowDriftGuard: [
  AssertTrue<OutboxRowSchema extends OutboxRow ? true : false>,
  AssertTrue<OutboxRow extends OutboxRowSchema ? true : false>,
] = [true, true];

// ─── Schema version ───────────────────────────────────────────────────────────

/** Versão canônica do contrato do payload (D3 — wire format). */
export const OUTBOX_SCHEMA_VERSION = 1;

// ─── Tagged errors (Padrão D) ─────────────────────────────────────────────────

export type OutboxMapperInvalidPayload = Readonly<{
  tag: 'OutboxMapperInvalidPayload';
  reason: string;
}>;

export type OutboxMapperUnknownEventType = Readonly<{
  tag: 'OutboxMapperUnknownEventType';
  eventType: string;
}>;

export type OutboxMapperSchemaVersionMismatch = Readonly<{
  tag: 'OutboxMapperSchemaVersionMismatch';
  expected: number;
  actual: number;
}>;

export type OutboxMapperError =
  | OutboxMapperInvalidPayload
  | OutboxMapperUnknownEventType
  | OutboxMapperSchemaVersionMismatch;

// ─── Error constructors ───────────────────────────────────────────────────────

export const outboxMapperInvalidPayload = (reason: string): OutboxMapperInvalidPayload => ({
  tag: 'OutboxMapperInvalidPayload',
  reason,
});

export const outboxMapperUnknownEventType = (eventType: string): OutboxMapperUnknownEventType => ({
  tag: 'OutboxMapperUnknownEventType',
  eventType,
});

export const outboxMapperSchemaVersionMismatch = (
  expected: number,
  actual: number,
): OutboxMapperSchemaVersionMismatch => ({
  tag: 'OutboxMapperSchemaVersionMismatch',
  expected,
  actual,
});

// ─── Payload shapes (wire format v1) ─────────────────────────────────────────
// Cada interface é o formato JSON que vive em `ctr_outbox.payload`.
// UUIDs são strings raw; Money → { cents }; Period → { kind, start, end? } (ISO).

type MoneyPayload = Readonly<{ cents: number }>;
type PeriodFixedPayload = Readonly<{ kind: 'Fixed'; start: string; end: string }>;
type PeriodIndefinitePayload = Readonly<{ kind: 'Indefinite'; start: string }>;
type PeriodPayload = PeriodFixedPayload | PeriodIndefinitePayload;

type ContractCreatedPayload = Readonly<{
  contractId: string;
  occurredAt: string;
}>;

// ADR-0023: mesmo shape de ContractCreated (contractId + occurredAt).
type ContractActivatedPayload = Readonly<{
  contractId: string;
  occurredAt: string;
}>;

// ADR-0039: cancelamento de rascunho — mesmo shape (contractId + occurredAt).
type ContractCancelledPayload = Readonly<{
  contractId: string;
  occurredAt: string;
}>;

type ContractStateUpdatedPayload = Readonly<{
  contractId: string;
  amendmentId: string;
  occurredAt: string;
  newCurrentValue: MoneyPayload;
  newCurrentPeriod: PeriodPayload;
}>;

type ContractEndedPayload = Readonly<{
  contractId: string;
  occurredAt: string;
  kind: 'Expired' | 'Terminated';
  // Motivo do distrato. Eventos v1 (pré-CTR-HTTP-DISTRATO-DOCUMENTO) não têm o campo;
  // a desserialização defaulta para null (retrocompat).
  terminationReason: string | null;
}>;

type AmendmentCreatedPayload = Readonly<{
  amendmentId: string;
  contractId: string;
  occurredAt: string;
}>;

type AmendmentDocumentAttachedPayload = Readonly<{
  amendmentId: string;
  signedDocumentRef: string;
  occurredAt: string;
}>;

type AmendmentHomologatedPayload = Readonly<{
  amendmentId: string;
  homologatedBy: string;
  occurredAt: string;
}>;

type ContractDocumentDeletedPayload = Readonly<{
  documentId: string;
  parentType: 'Contract' | 'Amendment';
  parentId: string;
  deletedBy: string;
  deletedReason: string;
  occurredAt: string;
}>;

type ContractDocumentSupersededPayload = Readonly<{
  documentId: string;
  parentType: 'Contract' | 'Amendment';
  parentId: string;
  supersededBy: string;
  supersededByDocumentId: string;
  occurredAt: string;
}>;

type ContractDocumentAttachedPayload = Readonly<{
  documentId: string;
  parentType: 'Contract' | 'Amendment';
  parentId: string;
  categoria: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  hashSha256: string;
  bucket: string;
  storageKey: string;
  signedElectronically: boolean;
  version: number;
  uploadedBy: string;
  retentionUntil: string | null;
  occurredAt: string;
}>;

// ─── Aggregate info extraction ────────────────────────────────────────────────

const extractAggregateInfo = (
  event: ContractsModuleEvent,
): { id: string; type: 'Contract' | 'Amendment' | 'Document' } => {
  switch (event.type) {
    case 'ContractCreated':
    case 'ContractActivated':
    case 'ContractCancelled':
    case 'ContractStateUpdated':
    case 'ContractEnded':
      return { id: event.contractId as unknown as string, type: 'Contract' };
    case 'AmendmentCreated':
    case 'AmendmentDocumentAttached':
    case 'AmendmentHomologated':
      return { id: event.amendmentId as unknown as string, type: 'Amendment' };
    case 'ContractDocumentAttached':
    case 'ContractDocumentDeleted':
    case 'ContractDocumentSuperseded':
      return { id: event.documentId as unknown as string, type: 'Document' };
  }
  // Exaustivo: TS garante em compile time (noFallthroughCasesInSwitch).
  // Omitimos default para que o compilador detecte tipos novos não cobertos.
};

// ─── Payload serializers ──────────────────────────────────────────────────────

const serializeMoney = (m: Money.Money): MoneyPayload => ({ cents: m.cents });

const serializePeriod = (p: Period.Period): PeriodPayload => {
  switch (p.kind) {
    case 'Fixed':
      return {
        kind: 'Fixed',
        start: PlainDate.toISOString(p.start),
        end: PlainDate.toISOString(p.end),
      };
    case 'Indefinite':
      return { kind: 'Indefinite', start: PlainDate.toISOString(p.start) };
  }
};

const serializeEvent = (event: ContractsModuleEvent): unknown => {
  switch (event.type) {
    case 'ContractCreated':
      return {
        contractId: event.contractId as unknown as string,
        occurredAt: event.occurredAt.toISOString(),
      } satisfies ContractCreatedPayload;

    case 'ContractActivated':
      return {
        contractId: event.contractId as unknown as string,
        occurredAt: event.occurredAt.toISOString(),
      } satisfies ContractActivatedPayload;

    case 'ContractCancelled':
      return {
        contractId: event.contractId as unknown as string,
        occurredAt: event.occurredAt.toISOString(),
      } satisfies ContractCancelledPayload;

    case 'ContractStateUpdated':
      return {
        contractId: event.contractId as unknown as string,
        amendmentId: event.amendmentId as unknown as string,
        occurredAt: event.occurredAt.toISOString(),
        newCurrentValue: serializeMoney(event.newCurrentValue),
        newCurrentPeriod: serializePeriod(event.newCurrentPeriod),
      } satisfies ContractStateUpdatedPayload;

    case 'ContractEnded':
      return {
        contractId: event.contractId as unknown as string,
        occurredAt: event.occurredAt.toISOString(),
        kind: event.kind,
        terminationReason: event.terminationReason,
      } satisfies ContractEndedPayload;

    case 'AmendmentCreated':
      return {
        amendmentId: event.amendmentId as unknown as string,
        contractId: event.contractId as unknown as string,
        occurredAt: event.occurredAt.toISOString(),
      } satisfies AmendmentCreatedPayload;

    case 'AmendmentDocumentAttached':
      return {
        amendmentId: event.amendmentId as unknown as string,
        signedDocumentRef: event.signedDocumentRef as unknown as string,
        occurredAt: event.occurredAt.toISOString(),
      } satisfies AmendmentDocumentAttachedPayload;

    case 'AmendmentHomologated':
      return {
        amendmentId: event.amendmentId as unknown as string,
        homologatedBy: event.homologatedBy as unknown as string,
        occurredAt: event.occurredAt.toISOString(),
      } satisfies AmendmentHomologatedPayload;

    case 'ContractDocumentAttached':
      return {
        documentId: event.documentId as unknown as string,
        parentType: event.parentType,
        parentId: event.parentId as unknown as string,
        categoria: event.categoria,
        fileName: event.fileName,
        mimeType: event.mimeType,
        sizeBytes: event.sizeBytes,
        hashSha256: event.hashSha256,
        bucket: event.bucket as unknown as string,
        storageKey: event.storageKey as unknown as string,
        signedElectronically: event.signedElectronically,
        version: event.version,
        uploadedBy: event.uploadedBy as unknown as string,
        retentionUntil: event.retentionUntil === null ? null : event.retentionUntil.toISOString(),
        occurredAt: event.occurredAt.toISOString(),
      } satisfies ContractDocumentAttachedPayload;

    case 'ContractDocumentDeleted':
      return {
        documentId: event.documentId as unknown as string,
        parentType: event.parentType,
        parentId: event.parentId as unknown as string,
        deletedBy: event.deletedBy as unknown as string,
        deletedReason: event.deletedReason,
        occurredAt: event.occurredAt.toISOString(),
      } satisfies ContractDocumentDeletedPayload;

    case 'ContractDocumentSuperseded':
      return {
        documentId: event.documentId as unknown as string,
        parentType: event.parentType,
        parentId: event.parentId as unknown as string,
        supersededBy: event.supersededBy as unknown as string,
        supersededByDocumentId: event.supersededByDocumentId as unknown as string,
        occurredAt: event.occurredAt.toISOString(),
      } satisfies ContractDocumentSupersededPayload;
  }
};

// ─── Forward: DomainEvent → OutboxInsert ─────────────────────────────────────

/**
 * Converte um evento de domínio em um registro para INSERT no `ctr_outbox`.
 *
 * Gera o `eventId` via `node:crypto.randomUUID()` por padrão.
 * Aceita `idGenerator` opcional para determinismo em testes.
 *
 * Money → cents (number); Period → 3 campos ISO; Dates → ISO 8601; UUIDs → string raw.
 */
export const eventToOutboxInsert = (
  event: ContractsModuleEvent,
  now: Date,
  idGenerator: () => string = randomUUID,
): OutboxInsert => {
  const aggregateInfo = extractAggregateInfo(event);
  const payload = serializeEvent(event);

  return {
    eventId: idGenerator(),
    aggregateId: aggregateInfo.id,
    aggregateType: aggregateInfo.type,
    eventType: event.type,
    schemaVersion: OUTBOX_SCHEMA_VERSION,
    occurredAt: event.occurredAt,
    enqueuedAt: now,
    processedAt: null,
    attempts: 0,
    payload: JSON.stringify(payload),
  };
};

// ─── JSON parse helper ────────────────────────────────────────────────────────

const parseJSON = (raw: string): Result<unknown, string> => {
  try {
    return ok(JSON.parse(raw) as unknown);
  } catch (e) {
    return err(e instanceof Error ? e.message : String(e));
  }
};

// ─── Payload deserializers ────────────────────────────────────────────────────

const deserializePeriod = (p: unknown): Result<Period.Period, string> => {
  if (typeof p !== 'object' || p === null) return err('period-not-an-object');
  const obj = p as Record<string, unknown>;
  if (typeof obj['kind'] !== 'string') return err('period-missing-kind');
  if (typeof obj['start'] !== 'string') return err('period-missing-start');

  const start = PlainDate.from(obj['start']);
  if (!start.ok) return err(`period-invalid-start: ${start.error}`);

  if (obj['kind'] === 'Fixed') {
    if (typeof obj['end'] !== 'string') return err('period-fixed-missing-end');
    const end = PlainDate.from(obj['end']);
    if (!end.ok) return err(`period-invalid-end: ${end.error}`);
    const r = Period.create(start.value, end.value);
    if (!r.ok) return err(r.error);
    return ok(r.value);
  }

  if (obj['kind'] === 'Indefinite') {
    return ok(Period.createIndefinite(start.value));
  }

  return err(`period-unknown-kind: ${obj['kind'] as string}`);
};

const deserializeMoney = (m: unknown): Result<Money.Money, string> => {
  if (typeof m !== 'object' || m === null) return err('money-not-an-object');
  const obj = m as Record<string, unknown>;
  if (typeof obj['cents'] !== 'number') return err('money-missing-cents');
  const r = Money.fromCents(obj['cents']);
  if (!r.ok) return err(r.error);
  return ok(r.value);
};

// ─── Backward: OutboxRow → ContractsModuleEvent ───────────────────────────────

const deserializeEvent = (
  eventType: string,
  payload: unknown,
  occurredAt: Date,
): Result<ContractsModuleEvent, OutboxMapperError> => {
  if (typeof payload !== 'object' || payload === null) {
    return err(outboxMapperInvalidPayload('payload-not-an-object'));
  }
  const p = payload as Record<string, unknown>;

  switch (eventType) {
    case 'ContractCreated': {
      if (typeof p['contractId'] !== 'string') {
        return err(outboxMapperInvalidPayload('ContractCreated-missing-contractId'));
      }
      const r = ContractId.rehydrate(p['contractId']);
      if (!r.ok) return err(outboxMapperInvalidPayload(`ContractCreated-contractId: ${r.error}`));
      return ok({ type: 'ContractCreated', contractId: r.value, occurredAt });
    }

    case 'ContractActivated': {
      if (typeof p['contractId'] !== 'string') {
        return err(outboxMapperInvalidPayload('ContractActivated-missing-contractId'));
      }
      const r = ContractId.rehydrate(p['contractId']);
      if (!r.ok) return err(outboxMapperInvalidPayload(`ContractActivated-contractId: ${r.error}`));
      return ok({ type: 'ContractActivated', contractId: r.value, occurredAt });
    }

    case 'ContractCancelled': {
      if (typeof p['contractId'] !== 'string') {
        return err(outboxMapperInvalidPayload('ContractCancelled-missing-contractId'));
      }
      const r = ContractId.rehydrate(p['contractId']);
      if (!r.ok) return err(outboxMapperInvalidPayload(`ContractCancelled-contractId: ${r.error}`));
      return ok({ type: 'ContractCancelled', contractId: r.value, occurredAt });
    }

    case 'ContractStateUpdated': {
      if (typeof p['contractId'] !== 'string') {
        return err(outboxMapperInvalidPayload('ContractStateUpdated-missing-contractId'));
      }
      if (typeof p['amendmentId'] !== 'string') {
        return err(outboxMapperInvalidPayload('ContractStateUpdated-missing-amendmentId'));
      }
      const contractIdR = ContractId.rehydrate(p['contractId']);
      if (!contractIdR.ok) {
        return err(
          outboxMapperInvalidPayload(`ContractStateUpdated-contractId: ${contractIdR.error}`),
        );
      }
      const amendmentIdR = AmendmentId.rehydrate(p['amendmentId']);
      if (!amendmentIdR.ok) {
        return err(
          outboxMapperInvalidPayload(`ContractStateUpdated-amendmentId: ${amendmentIdR.error}`),
        );
      }
      const moneyR = deserializeMoney(p['newCurrentValue']);
      if (!moneyR.ok) {
        return err(outboxMapperInvalidPayload(`ContractStateUpdated-money: ${moneyR.error}`));
      }
      const periodR = deserializePeriod(p['newCurrentPeriod']);
      if (!periodR.ok) {
        return err(outboxMapperInvalidPayload(`ContractStateUpdated-period: ${periodR.error}`));
      }
      return ok({
        type: 'ContractStateUpdated',
        contractId: contractIdR.value,
        amendmentId: amendmentIdR.value,
        occurredAt,
        newCurrentValue: moneyR.value,
        newCurrentPeriod: periodR.value,
      });
    }

    case 'ContractEnded': {
      if (typeof p['contractId'] !== 'string') {
        return err(outboxMapperInvalidPayload('ContractEnded-missing-contractId'));
      }
      if (p['kind'] !== 'Expired' && p['kind'] !== 'Terminated') {
        return err(outboxMapperInvalidPayload(`ContractEnded-invalid-kind: ${String(p['kind'])}`));
      }
      const r = ContractId.rehydrate(p['contractId']);
      if (!r.ok) return err(outboxMapperInvalidPayload(`ContractEnded-contractId: ${r.error}`));
      // Retrocompat: payload v1 sem `terminationReason` → null.
      const terminationReason =
        typeof p['terminationReason'] === 'string' ? p['terminationReason'] : null;
      return ok({
        type: 'ContractEnded',
        contractId: r.value,
        occurredAt,
        kind: p['kind'],
        terminationReason,
      });
    }

    case 'AmendmentCreated': {
      if (typeof p['amendmentId'] !== 'string') {
        return err(outboxMapperInvalidPayload('AmendmentCreated-missing-amendmentId'));
      }
      if (typeof p['contractId'] !== 'string') {
        return err(outboxMapperInvalidPayload('AmendmentCreated-missing-contractId'));
      }
      const amendR = AmendmentId.rehydrate(p['amendmentId']);
      if (!amendR.ok) {
        return err(outboxMapperInvalidPayload(`AmendmentCreated-amendmentId: ${amendR.error}`));
      }
      const contractR = ContractId.rehydrate(p['contractId']);
      if (!contractR.ok) {
        return err(outboxMapperInvalidPayload(`AmendmentCreated-contractId: ${contractR.error}`));
      }
      return ok({
        type: 'AmendmentCreated',
        amendmentId: amendR.value,
        contractId: contractR.value,
        occurredAt,
      });
    }

    case 'AmendmentDocumentAttached': {
      if (typeof p['amendmentId'] !== 'string') {
        return err(outboxMapperInvalidPayload('AmendmentDocumentAttached-missing-amendmentId'));
      }
      if (typeof p['signedDocumentRef'] !== 'string') {
        return err(
          outboxMapperInvalidPayload('AmendmentDocumentAttached-missing-signedDocumentRef'),
        );
      }
      const amendR = AmendmentId.rehydrate(p['amendmentId']);
      if (!amendR.ok) {
        return err(
          outboxMapperInvalidPayload(`AmendmentDocumentAttached-amendmentId: ${amendR.error}`),
        );
      }
      const docR = DocumentId.rehydrate(p['signedDocumentRef']);
      if (!docR.ok) {
        return err(
          outboxMapperInvalidPayload(`AmendmentDocumentAttached-documentId: ${docR.error}`),
        );
      }
      return ok({
        type: 'AmendmentDocumentAttached',
        amendmentId: amendR.value,
        signedDocumentRef: docR.value,
        occurredAt,
      });
    }

    case 'AmendmentHomologated': {
      if (typeof p['amendmentId'] !== 'string') {
        return err(outboxMapperInvalidPayload('AmendmentHomologated-missing-amendmentId'));
      }
      if (typeof p['homologatedBy'] !== 'string') {
        return err(outboxMapperInvalidPayload('AmendmentHomologated-missing-homologatedBy'));
      }
      const amendR = AmendmentId.rehydrate(p['amendmentId']);
      if (!amendR.ok) {
        return err(outboxMapperInvalidPayload(`AmendmentHomologated-amendmentId: ${amendR.error}`));
      }
      const userR = UserRef.rehydrate(p['homologatedBy']);
      if (!userR.ok) {
        return err(outboxMapperInvalidPayload(`AmendmentHomologated-userRef: ${userR.error}`));
      }
      return ok({
        type: 'AmendmentHomologated',
        amendmentId: amendR.value,
        homologatedBy: userR.value,
        occurredAt,
      });
    }

    case 'ContractDocumentAttached': {
      // Required string fields
      const required = [
        'documentId',
        'parentType',
        'parentId',
        'categoria',
        'fileName',
        'mimeType',
        'hashSha256',
        'bucket',
        'storageKey',
        'uploadedBy',
      ] as const;
      for (const field of required) {
        if (typeof p[field] !== 'string') {
          return err(outboxMapperInvalidPayload(`ContractDocumentAttached-missing-${field}`));
        }
      }
      if (typeof p['sizeBytes'] !== 'number') {
        return err(outboxMapperInvalidPayload('ContractDocumentAttached-missing-sizeBytes'));
      }
      if (typeof p['version'] !== 'number') {
        return err(outboxMapperInvalidPayload('ContractDocumentAttached-missing-version'));
      }
      if (typeof p['signedElectronically'] !== 'boolean') {
        return err(
          outboxMapperInvalidPayload('ContractDocumentAttached-missing-signedElectronically'),
        );
      }
      const parentTypeRaw = p['parentType'] as string;
      if (parentTypeRaw !== 'Contract' && parentTypeRaw !== 'Amendment') {
        return err(
          outboxMapperInvalidPayload(
            `ContractDocumentAttached-invalid-parentType: ${parentTypeRaw}`,
          ),
        );
      }
      const docR = DocumentId.rehydrate(p['documentId'] as string);
      if (!docR.ok) {
        return err(
          outboxMapperInvalidPayload(`ContractDocumentAttached-documentId: ${docR.error}`),
        );
      }
      const parentR =
        parentTypeRaw === 'Contract'
          ? ContractId.rehydrate(p['parentId'] as string)
          : AmendmentId.rehydrate(p['parentId'] as string);
      if (!parentR.ok) {
        return err(
          outboxMapperInvalidPayload(`ContractDocumentAttached-parentId: ${parentR.error}`),
        );
      }
      const bucketR = createBucketName(p['bucket'] as string);
      if (!bucketR.ok) {
        return err(outboxMapperInvalidPayload(`ContractDocumentAttached-bucket: ${bucketR.error}`));
      }
      const keyR = createStorageKey(p['storageKey'] as string);
      if (!keyR.ok) {
        return err(
          outboxMapperInvalidPayload(`ContractDocumentAttached-storageKey: ${keyR.error}`),
        );
      }
      const userR = UserRef.rehydrate(p['uploadedBy'] as string);
      if (!userR.ok) {
        return err(
          outboxMapperInvalidPayload(`ContractDocumentAttached-uploadedBy: ${userR.error}`),
        );
      }
      const retentionRaw = p['retentionUntil'];
      let retentionUntil: Date | null = null;
      if (retentionRaw !== null && retentionRaw !== undefined) {
        if (typeof retentionRaw !== 'string') {
          return err(outboxMapperInvalidPayload('ContractDocumentAttached-invalid-retentionUntil'));
        }
        const d = new Date(retentionRaw);
        if (isNaN(d.getTime())) {
          return err(
            outboxMapperInvalidPayload('ContractDocumentAttached-invalid-retentionUntil-date'),
          );
        }
        retentionUntil = d;
      }
      const categoriaRaw = p['categoria'] as string;
      const validCategorias: ReadonlySet<string> = new Set([
        'signed_contract',
        'signed_amendment',
        'opinion',
        'certificate',
        'justification',
        'technical_attachment',
        'publication',
        'other',
      ]);
      if (!validCategorias.has(categoriaRaw)) {
        return err(
          outboxMapperInvalidPayload(`ContractDocumentAttached-invalid-categoria: ${categoriaRaw}`),
        );
      }
      return ok({
        type: 'ContractDocumentAttached',
        documentId: docR.value,
        parentType: parentTypeRaw,
        parentId: parentR.value,
        categoria: categoriaRaw as Parameters<typeof ok>[0] extends infer _ ? never : never,
        fileName: p['fileName'] as string,
        mimeType: p['mimeType'] as string,
        sizeBytes: p['sizeBytes'],
        hashSha256: p['hashSha256'] as string,
        bucket: bucketR.value,
        storageKey: keyR.value,
        signedElectronically: p['signedElectronically'],
        version: p['version'],
        uploadedBy: userR.value,
        retentionUntil,
        occurredAt,
      } as ContractsModuleEvent);
    }

    case 'ContractDocumentDeleted': {
      const required = [
        'documentId',
        'parentType',
        'parentId',
        'deletedBy',
        'deletedReason',
      ] as const;
      for (const field of required) {
        if (typeof p[field] !== 'string') {
          return err(outboxMapperInvalidPayload(`ContractDocumentDeleted-missing-${field}`));
        }
      }
      const parentTypeRaw = p['parentType'] as string;
      if (parentTypeRaw !== 'Contract' && parentTypeRaw !== 'Amendment') {
        return err(
          outboxMapperInvalidPayload(
            `ContractDocumentDeleted-invalid-parentType: ${parentTypeRaw}`,
          ),
        );
      }
      const docR = DocumentId.rehydrate(p['documentId'] as string);
      if (!docR.ok) {
        return err(outboxMapperInvalidPayload(`ContractDocumentDeleted-documentId: ${docR.error}`));
      }
      const parentR =
        parentTypeRaw === 'Contract'
          ? ContractId.rehydrate(p['parentId'] as string)
          : AmendmentId.rehydrate(p['parentId'] as string);
      if (!parentR.ok) {
        return err(
          outboxMapperInvalidPayload(`ContractDocumentDeleted-parentId: ${parentR.error}`),
        );
      }
      const userR = UserRef.rehydrate(p['deletedBy'] as string);
      if (!userR.ok) {
        return err(outboxMapperInvalidPayload(`ContractDocumentDeleted-deletedBy: ${userR.error}`));
      }
      return ok({
        type: 'ContractDocumentDeleted',
        documentId: docR.value,
        parentType: parentTypeRaw,
        parentId: parentR.value,
        deletedBy: userR.value,
        deletedReason: p['deletedReason'] as string,
        occurredAt,
      } as ContractsModuleEvent);
    }

    case 'ContractDocumentSuperseded': {
      const required = [
        'documentId',
        'parentType',
        'parentId',
        'supersededBy',
        'supersededByDocumentId',
      ] as const;
      for (const field of required) {
        if (typeof p[field] !== 'string') {
          return err(outboxMapperInvalidPayload(`ContractDocumentSuperseded-missing-${field}`));
        }
      }
      const parentTypeRaw = p['parentType'] as string;
      if (parentTypeRaw !== 'Contract' && parentTypeRaw !== 'Amendment') {
        return err(
          outboxMapperInvalidPayload(
            `ContractDocumentSuperseded-invalid-parentType: ${parentTypeRaw}`,
          ),
        );
      }
      const docR = DocumentId.rehydrate(p['documentId'] as string);
      if (!docR.ok) {
        return err(
          outboxMapperInvalidPayload(`ContractDocumentSuperseded-documentId: ${docR.error}`),
        );
      }
      const newDocR = DocumentId.rehydrate(p['supersededByDocumentId'] as string);
      if (!newDocR.ok) {
        return err(
          outboxMapperInvalidPayload(
            `ContractDocumentSuperseded-supersededByDocumentId: ${newDocR.error}`,
          ),
        );
      }
      const parentR =
        parentTypeRaw === 'Contract'
          ? ContractId.rehydrate(p['parentId'] as string)
          : AmendmentId.rehydrate(p['parentId'] as string);
      if (!parentR.ok) {
        return err(
          outboxMapperInvalidPayload(`ContractDocumentSuperseded-parentId: ${parentR.error}`),
        );
      }
      const userR = UserRef.rehydrate(p['supersededBy'] as string);
      if (!userR.ok) {
        return err(
          outboxMapperInvalidPayload(`ContractDocumentSuperseded-supersededBy: ${userR.error}`),
        );
      }
      return ok({
        type: 'ContractDocumentSuperseded',
        documentId: docR.value,
        parentType: parentTypeRaw,
        parentId: parentR.value,
        supersededBy: userR.value,
        supersededByDocumentId: newDocR.value,
        occurredAt,
      } as ContractsModuleEvent);
    }

    default:
      return err(outboxMapperUnknownEventType(eventType));
  }
};

/**
 * Converte um registro do `ctr_outbox` de volta para um evento de domínio.
 *
 * Falha com tagged error se:
 * - `schemaVersion` não é o esperado (`OutboxMapperSchemaVersionMismatch`)
 * - `payload` não é JSON válido (`OutboxMapperInvalidPayload`)
 * - `eventType` não é reconhecido (`OutboxMapperUnknownEventType`)
 * - Qualquer campo do payload falha na validação via smart constructor (`OutboxMapperInvalidPayload`)
 */
export const outboxRowToEvent = (
  row: Readonly<OutboxRow>,
): Result<ContractsModuleEvent, OutboxMapperError> => {
  if (row.schemaVersion !== OUTBOX_SCHEMA_VERSION) {
    return err(outboxMapperSchemaVersionMismatch(OUTBOX_SCHEMA_VERSION, row.schemaVersion));
  }

  const parsedResult = parseJSON(row.payload);
  if (!parsedResult.ok) {
    return err(outboxMapperInvalidPayload(`json-parse-error: ${parsedResult.error}`));
  }

  return deserializeEvent(row.eventType, parsedResult.value, row.occurredAt);
};
