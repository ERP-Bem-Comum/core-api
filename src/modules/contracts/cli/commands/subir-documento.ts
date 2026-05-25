/**
 * subir-documento — comando CLI minimo para registrar um documento no agregado
 * ContractDocument. NAO faz upload de bytes para storage real — apenas cria o
 * agregado + persiste no repo + emite evento via outbox.
 *
 * Ticket: CTR-AMENDMENT-DOCUMENT-LINK (W1 — fix BDD E2E).
 *
 * Composition root completo (com DocumentStorage real wirado) entrega em
 * ticket futuro `CTR-CLI-UPLOAD-FULL`. Por enquanto, este comando aceita um
 * `--doc-id` opcional (default gerado) e popula campos minimos para satisfazer
 * o agregado.
 *
 * ASCII puro.
 */

import process from 'node:process';
import { randomUUID } from 'node:crypto';

import type { CliContext } from '../context.ts';
import { parseFlags, validateAllowedFlags } from '../parse-flags.ts';
import { formatErrorCode } from '../formatters/index.ts';
import { formatFlagError } from './_flag-errors.ts';
import * as Document from '../../domain/document/document.ts';
import * as DocumentId from '../../domain/shared/document-id.ts';
import * as ContractId from '../../domain/shared/contract-id.ts';
import * as AmendmentId from '../../domain/shared/amendment-id.ts';
import * as UserRef from '../../../../shared/kernel/user-ref.ts';
import {
  createBucketName,
  createStorageKey,
} from '../../application/ports/document-storage.types.ts';

const ALLOWED = ['parent-id', 'parent-tipo', 'doc-id', 'user-id', 'help', 'h'] as const;

export const descricao =
  'Registra um documento minimo no agregado (sem upload de bytes — usado para fechar fluxo de anexacao em dev/E2E).';

export const help = `Uso: subir-documento --parent-id <uuid> --parent-tipo <Contract|Amendment> [--doc-id <uuid>] [--user-id <uuid>]

Flags obrigatorias:
  --parent-id <uuid>      ID do Contract ou Amendment ao qual o doc se vincula
  --parent-tipo <kind>    Contract | Amendment

Flags opcionais:
  --doc-id <uuid>         Forca o DocumentId (default = randomUUID)
  --user-id <uuid>        UserRef de quem fez upload (default = randomUUID)`;

export const run = async (ctx: CliContext, argv: readonly string[]): Promise<number> => {
  const parsed = parseFlags(argv);
  if (!parsed.ok) {
    process.stderr.write(formatFlagError(parsed.error));
    return 64;
  }
  const allowed = validateAllowedFlags(parsed.value, ALLOWED);
  if (!allowed.ok) {
    process.stderr.write(formatFlagError(allowed.error));
    return 64;
  }
  const flags = parsed.value;

  for (const r of ['parent-id', 'parent-tipo']) {
    if (flags[r] === undefined || flags[r] === '') {
      process.stderr.write(`Flag obrigatoria ausente: --${r}\n\n${help}\n`);
      return 64;
    }
  }

  const parentTipoRaw = flags['parent-tipo'] ?? '';
  if (parentTipoRaw !== 'Contract' && parentTipoRaw !== 'Amendment') {
    process.stderr.write(
      `--parent-tipo deve ser Contract ou Amendment; obtido: ${parentTipoRaw}\n`,
    );
    return 64;
  }
  const parentTipo = parentTipoRaw;

  const parentIdRaw = flags['parent-id'] ?? '';
  const parentIdR =
    parentTipo === 'Contract'
      ? ContractId.rehydrate(parentIdRaw)
      : AmendmentId.rehydrate(parentIdRaw);
  if (!parentIdR.ok) {
    process.stderr.write(`${formatErrorCode(parentIdR.error)}\n`);
    return 1;
  }

  const docIdRaw = flags['doc-id'] ?? randomUUID();
  const docIdR = DocumentId.rehydrate(docIdRaw);
  if (!docIdR.ok) {
    process.stderr.write(`${formatErrorCode(docIdR.error)}\n`);
    return 1;
  }

  const userIdRaw = flags['user-id'] ?? randomUUID();
  const userR = UserRef.rehydrate(userIdRaw);
  if (!userR.ok) {
    process.stderr.write(`${formatErrorCode(userR.error)}\n`);
    return 1;
  }

  const bucketR = createBucketName('contracts-documents');
  const keyR = createStorageKey(`contracts/cli/${docIdR.value}/placeholder.txt`);
  if (!bucketR.ok || !keyR.ok) {
    process.stderr.write('Erro interno: fixtures invalidos\n');
    return 70;
  }

  const docR = Document.create({
    id: docIdR.value,
    parentType: parentTipo,
    parentId: parentIdR.value,
    categoria: 'other',
    fileName: 'placeholder.txt',
    mimeType: 'application/octet-stream',
    sizeBytes: 0,
    hashSha256: '0'.repeat(64),
    bucket: bucketR.value,
    storageKey: keyR.value,
    signedElectronically: false,
    version: 1,
    uploadedAt: ctx.clock.now(),
    uploadedBy: userR.value,
    retentionUntil: null,
  });
  if (!docR.ok) {
    process.stderr.write(`${formatErrorCode(docR.error)}\n`);
    return 1;
  }

  const saveR = await ctx.documentRepo.save(docR.value.document, [docR.value.event]);
  if (!saveR.ok) {
    process.stderr.write(`${formatErrorCode(saveR.error)}\n`);
    return 74;
  }

  const persistResult = await ctx.persist();
  if (!persistResult.ok) {
    process.stderr.write(`${formatErrorCode(persistResult.error)}\n`);
    return 74;
  }

  process.stdout.write(`Documento registrado.\nID: ${String(docR.value.document.id)}\n`);
  return 0;
};
