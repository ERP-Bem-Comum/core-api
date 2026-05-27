import {
  readFileSync,
  writeFileSync,
  existsSync,
  renameSync,
  unlinkSync,
  openSync,
  closeSync,
  rmSync,
  statSync,
} from 'node:fs';
import { randomUUID } from 'node:crypto';
import { type Result, ok, err } from '../../../shared/primitives/result.ts';
import { isUuidV4 } from '../../../shared/utils/id.ts';
import * as PlainDate from '../../../shared/kernel/plain-date.ts';
import type { Contract, ContractStatus } from '../domain/contract/types.ts';
import type { Amendment, AmendmentStatus, AmendmentKind } from '../domain/amendment/types.ts';
import type { ContractDocument, DocumentCategory } from '../domain/document/types.ts';
import type { InMemoryContractRepositoryHandle } from '../adapters/persistence/repos/contract-repository.in-memory.ts';
import type { InMemoryAmendmentRepositoryHandle } from '../adapters/persistence/repos/amendment-repository.in-memory.ts';
import type { InMemoryDocumentRepositoryHandle } from '../adapters/persistence/repos/document-repository.in-memory.ts';

// Defeito #12: I/O síncrono lança; convertemos para Result na borda do adapter
// conforme regra do CLAUDE.md raiz.
//
// REGR #1 (2026-05-15): `state-entity-invalid` — toda entidade carregada do
// snapshot é revalidada pelos mesmos predicados dos smart constructors
// (UUID v4, status enum, cents>=0 inteiro, period coerente, etc.). Sem isso,
// atacante consegue injetar `status: 'PWNED'` ou `cents: -1000` simplesmente
// editando o arquivo JSON.
//
// REGR #3 (2026-05-15): `state-concurrent-lock` — dois processos gravando o
// mesmo arquivo simultaneamente perdiam dados (read-modify-write race). Agora
// adquirimos lock exclusivo via `openSync(lockPath, 'wx')` antes de ler/gravar
// e o liberamos no shutdown do driver memory. Quando o lock está ocupado,
// fazemos backoff polling por até ~1.5s antes de falhar com erro explícito.
export type StateError =
  | 'state-file-not-readable'
  | 'state-file-corrupted'
  | 'state-schema-invalid'
  | 'state-entity-invalid'
  | 'state-file-not-writable'
  | 'state-concurrent-lock';

const DATE_KEYS = new Set([
  'signedAt',
  'endedAt',
  'createdAt',
  'homologatedAt',
  'occurredAt',
  // `start`/`end`/`newEndDate` deixaram de ser Date — agora são PlainDate
  // ({year,month,day}), serializados como objeto. NÃO entram aqui (CTR-PERIOD-PLAIN-DATE).
  // CTR-AMENDMENT-DOCUMENT-LINK: ContractDocument carrega 2 campos Date.
  'uploadedAt',
  'retentionUntil',
  // CTR-USECASE-DELETE-DOCUMENT: campo audit de exclusao logica.
  'deletedAt',
  // CTR-USECASE-SUPERSEDE-DOCUMENT: campo audit de substituicao.
  'supersededAt',
]);

const reviver = (key: string, value: unknown): unknown => {
  if (DATE_KEYS.has(key) && typeof value === 'string') {
    return new Date(value);
  }
  return value;
};

type Snapshot = Readonly<{
  contracts: readonly Contract[];
  amendments: readonly Amendment[];
  documents?: readonly ContractDocument[];
}>;

const isSnapshot = (
  v: unknown,
): v is {
  contracts: readonly unknown[];
  amendments: readonly unknown[];
  documents?: readonly unknown[];
} => {
  if (typeof v !== 'object' || v === null) return false;
  const candidate = v as { contracts?: unknown; amendments?: unknown; documents?: unknown };
  if (!Array.isArray(candidate.contracts) || !Array.isArray(candidate.amendments)) return false;
  if (candidate.documents !== undefined && !Array.isArray(candidate.documents)) return false;
  return true;
};

const DOCUMENT_CATEGORIES: ReadonlySet<DocumentCategory> = new Set([
  'signed_contract',
  'signed_amendment',
  'opinion',
  'certificate',
  'justification',
  'technical_attachment',
  'publication',
  'other',
]);

const SHA256_LOWER_HEX = /^[0-9a-f]{64}$/;

const isValidDateInstance = (d: unknown): d is Date =>
  d instanceof Date && !Number.isNaN(d.getTime());

const isValidContractDocument = (raw: unknown): raw is ContractDocument => {
  if (typeof raw !== 'object' || raw === null) return false;
  const d = raw as Record<string, unknown>;
  if (typeof d['id'] !== 'string' || !isUuidV4(d['id'])) return false;
  if (d['parentType'] !== 'Contract' && d['parentType'] !== 'Amendment') return false;
  if (typeof d['parentId'] !== 'string' || !isUuidV4(d['parentId'])) return false;
  if (
    typeof d['categoria'] !== 'string' ||
    !DOCUMENT_CATEGORIES.has(d['categoria'] as DocumentCategory)
  )
    return false;
  if (typeof d['fileName'] !== 'string' || d['fileName'].length === 0) return false;
  if (typeof d['mimeType'] !== 'string' || d['mimeType'].length === 0) return false;
  if (typeof d['sizeBytes'] !== 'number' || !Number.isInteger(d['sizeBytes']) || d['sizeBytes'] < 0)
    return false;
  if (typeof d['hashSha256'] !== 'string' || !SHA256_LOWER_HEX.test(d['hashSha256'])) return false;
  if (typeof d['bucket'] !== 'string') return false;
  if (typeof d['storageKey'] !== 'string') return false;
  if (typeof d['signedElectronically'] !== 'boolean') return false;
  if (typeof d['version'] !== 'number' || !Number.isInteger(d['version']) || d['version'] < 1)
    return false;
  if (!isValidDateInstance(d['uploadedAt'])) return false;
  if (typeof d['uploadedBy'] !== 'string' || !isUuidV4(d['uploadedBy'])) return false;
  if (d['retentionUntil'] !== null && !isValidDateInstance(d['retentionUntil'])) return false;
  // CTR-USECASE-DELETE-DOCUMENT: status='Active' OR 'LogicallyDeleted' (com 3 campos audit).
  if (d['status'] === 'Active') {
    return true;
  }
  if (d['status'] === 'LogicallyDeleted') {
    if (!isValidDateInstance(d['deletedAt'])) return false;
    if (typeof d['deletedBy'] !== 'string' || !isUuidV4(d['deletedBy'])) return false;
    if (typeof d['deletedReason'] !== 'string' || d['deletedReason'].length === 0) return false;
    return true;
  }
  if (d['status'] === 'Superseded') {
    if (!isValidDateInstance(d['supersededAt'])) return false;
    if (typeof d['supersededBy'] !== 'string' || !isUuidV4(d['supersededBy'])) return false;
    if (typeof d['supersededByDocumentId'] !== 'string' || !isUuidV4(d['supersededByDocumentId']))
      return false;
    return true;
  }
  return false;
};

// =============================================================================
// REGR #1 — revalidação das entidades carregadas do snapshot.
// =============================================================================

const CONTRACT_STATUSES: ReadonlySet<ContractStatus> = new Set([
  'Pending',
  'Active',
  'Expired',
  'Terminated',
]);
const AMENDMENT_STATUSES: ReadonlySet<AmendmentStatus> = new Set(['Pending', 'Homologated']);
const AMENDMENT_KINDS: ReadonlySet<AmendmentKind> = new Set([
  'Addition',
  'Suppression',
  'TermChange',
  'Misc',
]);

const isValidMoneyShape = (raw: unknown): boolean => {
  if (typeof raw !== 'object' || raw === null) return false;
  const cents = (raw as { cents?: unknown }).cents;
  return (
    typeof cents === 'number' &&
    Number.isInteger(cents) &&
    cents >= 0 &&
    cents <= Number.MAX_SAFE_INTEGER
  );
};

const isValidPlainDateShape = (raw: unknown): raw is PlainDate.PlainDate => {
  if (typeof raw !== 'object' || raw === null) return false;
  const d = raw as { year?: unknown; month?: unknown; day?: unknown };
  return (
    typeof d.year === 'number' &&
    typeof d.month === 'number' &&
    d.month >= 1 &&
    d.month <= 12 &&
    typeof d.day === 'number' &&
    d.day >= 1 &&
    d.day <= 31
  );
};

const isValidPeriodShape = (raw: unknown): boolean => {
  if (typeof raw !== 'object' || raw === null) return false;
  const kind = (raw as { kind?: unknown }).kind;
  if (kind === 'Fixed') {
    const { start, end } = raw as { start?: unknown; end?: unknown };
    if (!isValidPlainDateShape(start) || !isValidPlainDateShape(end)) return false;
    return PlainDate.compare(end, start) >= 0;
  }
  if (kind === 'Indefinite') {
    const { start } = raw as { start?: unknown };
    return isValidPlainDateShape(start);
  }
  return false;
};

const isValidContract = (raw: unknown): raw is Contract => {
  if (typeof raw !== 'object' || raw === null) return false;
  const c = raw as Record<string, unknown>;

  // Cadastro — comum a todos os estados (inclusive Pending).
  if (typeof c['id'] !== 'string' || !isUuidV4(c['id'])) return false;
  if (typeof c['sequentialNumber'] !== 'string') return false;
  if (typeof c['title'] !== 'string') return false;
  if (typeof c['objective'] !== 'string') return false;
  if (!isValidMoneyShape(c['originalValue'])) return false;
  if (!isValidPeriodShape(c['originalPeriod'])) return false;
  if (typeof c['status'] !== 'string' || !CONTRACT_STATUSES.has(c['status'] as ContractStatus)) {
    return false;
  }
  const status = c['status'] as ContractStatus;

  // ADR-0023: `Pending` não tem assinatura/vigência efetiva nem aditivos.
  if (status === 'Pending') {
    return (
      c['signedAt'] === undefined &&
      c['currentValue'] === undefined &&
      c['currentPeriod'] === undefined &&
      (c['endedAt'] === undefined || c['endedAt'] === null)
    );
  }

  // Estados efetivos — exigem assinatura + vigência + lista de aditivos.
  if (!isValidDateInstance(c['signedAt'])) return false;
  if (!isValidMoneyShape(c['currentValue'])) return false;
  if (!isValidPeriodShape(c['currentPeriod'])) return false;
  if (!Array.isArray(c['homologatedAmendmentIds'])) return false;
  for (const id of c['homologatedAmendmentIds'] as readonly unknown[]) {
    if (typeof id !== 'string' || !isUuidV4(id)) return false;
  }
  // CTR-DOMAIN-STATE-MACHINE-CONTRACT — `endedAt` AUSENTE em Active, obrigatório
  // (Date) em Expired/Terminated (DO C§29). Aceita `null` p/ compat com files antigos.
  const endedAt = c['endedAt'];
  if (status === 'Active') {
    if (endedAt !== undefined && endedAt !== null) return false;
  } else {
    if (!isValidDateInstance(endedAt)) return false;
  }
  return true;
};

const isValidAmendment = (raw: unknown): raw is Amendment => {
  if (typeof raw !== 'object' || raw === null) return false;
  const a = raw as Record<string, unknown>;

  if (typeof a['id'] !== 'string' || !isUuidV4(a['id'])) return false;
  if (typeof a['contractId'] !== 'string' || !isUuidV4(a['contractId'])) return false;
  if (typeof a['amendmentNumber'] !== 'string') return false;
  if (typeof a['description'] !== 'string') return false;
  if (!isValidDateInstance(a['createdAt'])) return false;
  if (typeof a['status'] !== 'string' || !AMENDMENT_STATUSES.has(a['status'] as AmendmentStatus)) {
    return false;
  }
  if (typeof a['kind'] !== 'string' || !AMENDMENT_KINDS.has(a['kind'] as AmendmentKind)) {
    return false;
  }
  if (a['kind'] === 'Addition' || a['kind'] === 'Suppression') {
    if (!isValidMoneyShape(a['impactValue'])) return false;
  }
  if (a['kind'] === 'TermChange') {
    if (!isValidPlainDateShape(a['newEndDate'])) return false;
  }
  // CTR-DOMAIN-STATE-MACHINE-AMENDMENT — validação de consistência por status.
  // Pending: homologatedAt e homologatedBy devem ser null (shape impossível rejeitado).
  // Homologated: signedDocumentRef, homologatedAt e homologatedBy devem estar presentes.
  const status = a['status'] as AmendmentStatus;
  const signedDocRef = a['signedDocumentRef'];
  const homologatedAt = a['homologatedAt'];
  const homologatedBy = a['homologatedBy'];

  if (status === 'Pending') {
    // signedDocumentRef pode ser null (PendingWithoutDocument) ou UUID válido (PendingWithDocument)
    if (signedDocRef !== null) {
      if (typeof signedDocRef !== 'string' || !isUuidV4(signedDocRef)) return false;
    }
    // Pending NUNCA pode ter campos terminais preenchidos
    if (homologatedAt !== null) return false;
    if (homologatedBy !== null) return false;
  } else {
    // Homologated: todos os 3 campos terminais obrigatórios
    if (typeof signedDocRef !== 'string' || !isUuidV4(signedDocRef)) return false;
    if (!isValidDateInstance(homologatedAt)) return false;
    if (typeof homologatedBy !== 'string' || !isUuidV4(homologatedBy)) return false;
  }
  return true;
};

// =============================================================================
// REGR #3 — lock file para read-modify-write seguro.
// =============================================================================

const LOCK_RETRY_DELAY_MS = 30;
const LOCK_RETRY_MAX = 50; // ~1.5s total — suficiente para uma operação local.

const lockPathFor = (statePath: string): string => `${statePath}.lock`;

// Adquire lock exclusivo via `openSync('wx')`. Retry com backoff curto
// para tolerar contenção de até 1 processo por ~1.5s.
const acquireLock = (statePath: string): Result<string, 'state-concurrent-lock'> => {
  const lockPath = lockPathFor(statePath);
  for (let attempt = 0; attempt < LOCK_RETRY_MAX; attempt++) {
    try {
      const fd = openSync(lockPath, 'wx');
      closeSync(fd);
      return ok(lockPath);
    } catch (cause) {
      // EEXIST = lock ocupado. Outros erros (permissão, FS read-only) também
      // viram concurrent-lock — fallback seguro, sem leak da exceção.
      const code = (cause as { code?: string }).code;
      if (code !== 'EEXIST') {
        return err('state-concurrent-lock');
      }
      // Backoff síncrono curto. Como a CLI é síncrona ponta-a-ponta no driver
      // memory, busy-wait com Atomics.wait não é viável; usamos sleep via
      // `Atomics.wait` em um SharedArrayBuffer dummy para esperar sem CPU.
      // Fallback simples para garantir compat: loop de tempo.
      const target = Date.now() + LOCK_RETRY_DELAY_MS;
      while (Date.now() < target) {
        // busy-wait curto; aceitável para uma CLI de validação P.O.
      }
    }
  }
  return err('state-concurrent-lock');
};

const releaseLock = (lockPath: string): void => {
  try {
    rmSync(lockPath, { force: true });
  } catch {
    // Falha ao liberar é não-fatal; lock será removido na próxima execução
    // (na pior hipótese após detecção via `acquireLock` retry).
  }
};

// =============================================================================
// loadState / saveState
// =============================================================================

export const loadState = (
  path: string,
  contractRepo: InMemoryContractRepositoryHandle,
  amendmentRepo: InMemoryAmendmentRepositoryHandle,
  documentRepo: InMemoryDocumentRepositoryHandle,
): Result<void, StateError> => {
  if (!existsSync(path)) return ok(undefined);

  // Borda I/O: distingue diretório (ENOTREAD) de arquivo regular.
  try {
    const stat = statSync(path);
    if (!stat.isFile()) return err('state-file-not-readable');
  } catch {
    return err('state-file-not-readable');
  }

  const readResult = ((): Result<string, StateError> => {
    try {
      return ok(readFileSync(path, 'utf-8'));
    } catch {
      return err('state-file-not-readable');
    }
  })();
  if (!readResult.ok) return readResult;
  if (readResult.value.trim() === '') return ok(undefined);

  const parseResult = ((): Result<unknown, StateError> => {
    try {
      return ok(JSON.parse(readResult.value, reviver));
    } catch {
      return err('state-file-corrupted');
    }
  })();
  if (!parseResult.ok) return parseResult;
  const parsed = parseResult.value;

  if (!isSnapshot(parsed)) return err('state-schema-invalid');

  // REGR #1: revalida cada entidade ANTES de injetar no repo. Se qualquer
  // contrato/aditivo está com schema corrompido (status inválido, UUID quebrado,
  // cents negativo), abortamos sem mutar o estado.
  for (const raw of parsed.contracts) {
    if (!isValidContract(raw)) return err('state-entity-invalid');
  }
  for (const raw of parsed.amendments) {
    if (!isValidAmendment(raw)) return err('state-entity-invalid');
  }
  const documentsRaw = parsed.documents ?? [];
  for (const raw of documentsRaw) {
    if (!isValidContractDocument(raw)) return err('state-entity-invalid');
  }

  // Validação completa — agora podemos popular os repos.
  // Restauração de estado: sem eventos — os eventos já foram emitidos quando
  // os agregados foram criados originalmente. Passamos [] para satisfazer a
  // nova assinatura save(aggregate, events).
  for (const c of parsed.contracts as readonly Contract[]) {
    void contractRepo.repo.save(c, []);
  }
  for (const a of parsed.amendments as readonly Amendment[]) {
    void amendmentRepo.repo.save(a, []);
  }
  for (const d of documentsRaw as readonly ContractDocument[]) {
    void documentRepo.repo.save(d, []);
  }
  return ok(undefined);
};

// REGR #3: saveState atômico via `${path}.tmp.<uuid>` + rename.
// `rename` é atômico no mesmo FS (POSIX rename(2)). Se o processo crasha entre
// write e rename, o arquivo original permanece intacto.
export const saveState = (
  path: string,
  contractRepo: InMemoryContractRepositoryHandle,
  amendmentRepo: InMemoryAmendmentRepositoryHandle,
  documentRepo: InMemoryDocumentRepositoryHandle,
): Result<void, StateError> => {
  const snapshot: Snapshot = {
    contracts: contractRepo.store(),
    amendments: amendmentRepo.store(),
    documents: documentRepo.store(),
  };
  const tmpPath = `${path}.tmp.${randomUUID()}`;
  try {
    writeFileSync(tmpPath, JSON.stringify(snapshot, null, 2), 'utf-8');
  } catch {
    return err('state-file-not-writable');
  }
  try {
    renameSync(tmpPath, path);
    return ok(undefined);
  } catch {
    // Cleanup do tmp para não vazar arquivos órfãos.
    try {
      unlinkSync(tmpPath);
    } catch {
      // Best-effort cleanup.
    }
    return err('state-file-not-writable');
  }
};

// Public lock helpers — usados pelo driver memory para guardar o ciclo
// read-modify-write. Exportados para que `drivers/memory.ts` componha o
// lifecycle (acquire em build, release em shutdown).
export const acquireStateLock = (statePath: string): Result<string, 'state-concurrent-lock'> =>
  acquireLock(statePath);

export const releaseStateLock = (lockPath: string): void => {
  releaseLock(lockPath);
};
