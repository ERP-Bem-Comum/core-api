/**
 * Schemas Zod das rotas contracts (ADR-0027) — fonte do contrato + do OpenAPI gerado.
 * Zod fica só nesta camada de borda; o domínio valida invariantes via smart constructors.
 *
 * O item de resposta é uma união discriminada por `status` (espelha o agregado
 * `Contract`): `Pending` carrega só os campos de cadastro; `Active`/`Expired`/
 * `Terminated` adicionam os campos do estado efetivo; os terminais adicionam `endedAt`.
 * Campos internos do agregado (ex.: `homologatedAmendmentIds`) NÃO entram no DTO.
 */

import * as z from 'zod/v4';

const moneySchema = z.object({
  cents: z.number().int().nonnegative().meta({ description: 'Valor em centavos (inteiro)' }),
});

const periodSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('Fixed'), start: z.string(), end: z.string() }),
  z.object({ kind: z.literal('Indefinite'), start: z.string() }),
]);

const registrationShape = {
  id: z.string(),
  sequentialNumber: z.string(),
  title: z.string(),
  objective: z.string(),
  originalValue: moneySchema,
  originalPeriod: periodSchema,
};

const effectiveShape = {
  signedAt: z.string().meta({ description: 'Data/hora de assinatura (ISO 8601)' }),
  currentValue: moneySchema,
  currentPeriod: periodSchema,
};

export const contractListItemSchema = z.discriminatedUnion('status', [
  z.object({ ...registrationShape, status: z.literal('Pending') }),
  z.object({ ...registrationShape, ...effectiveShape, status: z.literal('Active') }),
  z.object({
    ...registrationShape,
    ...effectiveShape,
    status: z.literal('Expired'),
    endedAt: z.string(),
  }),
  z.object({
    ...registrationShape,
    ...effectiveShape,
    status: z.literal('Terminated'),
    endedAt: z.string(),
  }),
]);

export const contractListSchema = z.array(contractListItemSchema);

/** Detalhe de um contrato (`GET /contracts/:id`). Mesmo shape do item de lista. */
export const contractDetailSchema = contractListItemSchema;

export type ContractListItemDto = z.infer<typeof contractListItemSchema>;

/** Param de rota `:id` — UUID do contrato. Falha de formato → 400 (Zod, antes do domínio). */
export const contractIdParamSchema = z.object({
  id: z.uuid().meta({ description: 'UUID do contrato' }),
});

/**
 * Entrada da timeline (read-model, ADR-0022). `kind` é o discriminador EN do evento
 * de origem; o rótulo PT-BR é responsabilidade do formatter, fora da borda HTTP.
 * `actor`/`subjectAmendmentId` são best-effort (nem todo marco os carrega).
 */
export const timelineEntrySchema = z.object({
  eventId: z.string(),
  contractId: z.string(),
  kind: z.string().meta({ description: 'Tipo do evento de origem (discriminador EN)' }),
  occurredAt: z.string().meta({ description: 'Data/hora do marco (ISO 8601)' }),
  actor: z.string().nullable(),
  subjectAmendmentId: z.string().nullable(),
});

export const timelineSchema = z.array(timelineEntrySchema);

export type TimelineEntryDto = z.infer<typeof timelineEntrySchema>;

// ─── C2: bodies/params/respostas de escrita ─────────────────────────────────
//
// `signedAt`/datas usam `z.string()` solto de propósito: a validação de data é do
// domínio (smart constructor) — data malformada vira 422 (invariante), não 400 (Zod).
// Valor em centavos também não trava sinal no Zod; `Money` rejeita → 422.

const contractWriteShape = {
  sequentialNumber: z.string(),
  title: z.string(),
  objective: z.string(),
  originalValueCents: z.number().int(),
  periodStart: z.string(),
  periodEnd: z.string().nullable(),
};

/** Body `POST /contracts` — discrimina cadastro (`Pending`) vs cadastro+assinatura (`Active`). */
export const createContractBodySchema = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('Pending'), ...contractWriteShape }),
  z.object({ mode: z.literal('Active'), ...contractWriteShape, signedAt: z.string() }),
]);

/** Body `POST /contracts/:id/activate`. */
export const activateContractBodySchema = z.object({ signedAt: z.string() });

const amendmentWriteShape = {
  amendmentNumber: z.string(),
  description: z.string(),
};

/** Body `POST /contracts/:id/amendments` — discrimina pelo `kind` do aditivo. */
export const createAmendmentBodySchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('Addition'),
    ...amendmentWriteShape,
    impactValueCents: z.number().int(),
  }),
  z.object({
    kind: z.literal('Suppression'),
    ...amendmentWriteShape,
    impactValueCents: z.number().int(),
  }),
  z.object({ kind: z.literal('TermChange'), ...amendmentWriteShape, newEndDate: z.string() }),
  z.object({ kind: z.literal('Misc'), ...amendmentWriteShape }),
]);

/** Body `POST /contracts/:id/amendments/:amendmentId/homologate`. */
export const homologateBodySchema = z.object({ homologatedBy: z.string() });

/** Params da rota de homologação — contrato + aditivo (ambos UUID). */
export const amendmentParamSchema = z.object({
  id: z.uuid().meta({ description: 'UUID do contrato' }),
  amendmentId: z.uuid().meta({ description: 'UUID do aditivo' }),
});

const amendmentDtoShape = {
  id: z.string(),
  contractId: z.string(),
  amendmentNumber: z.string(),
  description: z.string(),
  status: z.string(),
  createdAt: z.string().meta({ description: 'Data/hora de criação (ISO 8601)' }),
};

/** Resposta de `POST /contracts/:id/amendments` — aditivo recém-criado (Pending). */
export const amendmentSchema = z.discriminatedUnion('kind', [
  z.object({
    ...amendmentDtoShape,
    kind: z.literal('Addition'),
    impactValueCents: z.number().int(),
  }),
  z.object({
    ...amendmentDtoShape,
    kind: z.literal('Suppression'),
    impactValueCents: z.number().int(),
  }),
  z.object({ ...amendmentDtoShape, kind: z.literal('TermChange'), newEndDate: z.string() }),
  z.object({ ...amendmentDtoShape, kind: z.literal('Misc') }),
]);

export type AmendmentDto = z.infer<typeof amendmentSchema>;

// ─── C3: documentos (upload raw octet-stream + supersede) ───────────────────
//
// O corpo do upload é binário (`application/octet-stream` via addContentTypeParser),
// FORA do type-provider Zod (D1). Os metadados viajam na QUERY STRING e são validados
// aqui. `mimeType` é allowlist; `fileName` rejeita separadores de path antes do VO.

const DOCUMENT_CATEGORIES = [
  'signed_contract',
  'signed_amendment',
  'opinion',
  'certificate',
  'justification',
  'technical_attachment',
  'publication',
  'other',
] as const;

/** Allowlist de mimeType aceito no upload (estende conforme o domínio exigir). */
const UPLOAD_MIME_ALLOWLIST = ['application/pdf'] as const;

/** Query de `POST …/documents` (E1/E2) — metadados do upload. */
export const uploadDocumentQuerySchema = z.object({
  categoria: z.enum(DOCUMENT_CATEGORIES),
  fileName: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[^/\\:*?"<>|]+$/, 'fileName contém caractere inválido'),
  mimeType: z.enum(UPLOAD_MIME_ALLOWLIST),
  // Query chega como string; mapeia 'true'/'false' → boolean (z.coerce.boolean trataria
  // 'false' como true — por isso o enum+transform explícito).
  signedElectronically: z.enum(['true', 'false']).transform((s) => s === 'true'),
});

/** Body de `POST …/documents/:documentId/supersede` (E3). */
export const supersedeDocumentBodySchema = z.object({
  supersededByDocumentId: z.uuid().meta({ description: 'UUID do documento substituto' }),
});

/** Params da rota de supersede — contrato + documento. */
export const documentParamSchema = z.object({
  id: z.uuid().meta({ description: 'UUID do contrato' }),
  documentId: z.uuid().meta({ description: 'UUID do documento' }),
});

/** Resposta das rotas de documento — serialização do agregado `ContractDocument`. */
export const documentSchema = z.object({
  id: z.string(),
  parentType: z.enum(['Contract', 'Amendment']),
  parentId: z.string(),
  categoria: z.string(),
  fileName: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number().int().nonnegative(),
  hashSha256: z.string(),
  bucket: z.string(),
  storageKey: z.string(),
  version: z.number().int(),
  status: z.string(),
  uploadedAt: z.string().meta({ description: 'Data/hora do upload (ISO 8601)' }),
});

export type DocumentDto = z.infer<typeof documentSchema>;

/**
 * `requestBody` das rotas de upload (E1/E2) — documenta o corpo binário no OpenAPI sem
 * reativar a validação Zod do corpo: o content-type `application/octet-stream` (≠
 * `application/json`) faz o validator pular o body, que segue opaco (`Buffer` via
 * `addContentTypeParser`, D1 do C3). É um `ZodOpenApiRequestBodyObject`, não um schema de validação.
 */
// Factory (não constante): cada rota recebe uma instância de schema independente — o
// zod-openapi esvazia o schema na 2ª rota se a referência for compartilhada.
//
// Declarar `content` ATIVA a validação Zod do corpo (exceção à regra "só application/json").
// O corpo em runtime é `Buffer` (addContentTypeParser, D1) — `z.instanceof(Buffer)` valida sem
// rejeitar; o `.meta({ type:'string', format:'binary' })` força o OpenAPI a documentar binário.
export const octetStreamUploadBody = (): {
  content: Record<string, { schema: z.ZodType }>;
} => ({
  content: {
    'application/octet-stream': {
      schema: z
        .instanceof(Buffer)
        .meta({ type: 'string', format: 'binary', description: 'Bytes do documento' }),
    },
  },
});

/**
 * Response `text/csv` do export (C4) — documenta o OpenAPI sem forçar serialização JSON. Factory
 * (instância nova por uso) pela mesma razão do corpo binário: evita reuso de referência no zod-openapi.
 */
export const csvResponse = (): { content: Record<string, { schema: z.ZodType }> } => ({
  content: {
    'text/csv': {
      schema: z.string().meta({ description: 'Listagem de contratos em CSV (RFC 4180)' }),
    },
  },
});
