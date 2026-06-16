/**
 * Schemas Zod da borda HTTP do módulo financial (ADR-0027 — Zod contract-first).
 *
 * Money trafega como string decimal de centavos (bigint não é JSON-safe). Input de
 * grossValueCents etc. é string que o use case converte via Money.fromCents(BigInt(...)).
 * `version` (optimistic lock) viaja como number inteiro.
 *
 * Rota /api/v2/financial/documents.
 */

import * as z from 'zod/v4';
import { DOCUMENT_EVENT_TYPES } from '../../domain/document/events.ts';

// ─── Shared ──────────────────────────────────────────────────────────────────

/**
 * Centavos serializados como string decimal de inteiro não-negativo.
 *
 * Bounds de segurança (ADR-0027 — validação na borda): `.max(16)` barra string longa antes do `Number()`
 * (DoS/amplificação) e o `refine` garante inteiro seguro — `Number("9".repeat(30))` === 1e30 passaria pelo regex
 * mas não é safe integer. MAX_SAFE_INTEGER (9007199254740991) tem 16 dígitos → margem suficiente p/ valor real.
 */
const centsStringSchema = z
  .string()
  .regex(/^\d+$/, 'deve ser string de dígitos representando centavos')
  .max(16, 'valor de centavos excede o limite seguro (máx. 16 dígitos)')
  .refine((s) => Number.isSafeInteger(Number(s)), 'valor de centavos não é um inteiro seguro');

const retentionTypeSchema = z.enum(['ISS', 'IRRF', 'INSS', 'CSRF']);
const registeredTaxTypeSchema = z.enum([
  'ICMS',
  'IPI',
  'PIS',
  'COFINS',
  'CBS',
  'IBS_Municipal',
  'IBS_Estadual',
]);

const retentionItemSchema = z.object({
  type: retentionTypeSchema,
  baseCents: centsStringSchema,
  rateBps: z.number().int().min(0).max(10000),
  valueCents: centsStringSchema,
});

const registeredTaxItemSchema = z.object({
  type: registeredTaxTypeSchema,
  baseCents: centsStringSchema,
  rateBps: z.number().int().min(0).max(10000),
  valueCents: centsStringSchema,
});

const documentTypeSchema = z.enum([
  'NFS-e',
  'DANFE',
  'RPA',
  'Fatura',
  'Boleto',
  'Recibo',
  'Imposto',
]);

const paymentMethodSchema = z.enum([
  'TED',
  'TransferenciaBancaria',
  'PIX',
  'Boleto',
  'CartaoCorporativo',
  'Cambio',
  'GuiaRecolhimento',
  'Outro',
]);

// ─── POST /documents (saveDocument) ─────────────────────────────────────────

/**
 * Body de criação de documento fiscal. `asDraft: false` (default) → Open com títulos;
 * `asDraft: true` → Draft (campos opcionais, sem geração de títulos).
 */
export const createDocumentBodySchema = z.object({
  type: documentTypeSchema,
  documentNumber: z.string().min(1).max(60),
  series: z.string().max(20).optional(),
  supplierRef: z.uuid(),
  contractRef: z.uuid().optional(),
  budgetPlanRef: z.uuid().optional(),
  categoryRef: z.uuid().optional(),
  programRef: z.uuid().optional(),
  paymentMethod: paymentMethodSchema,
  grossValueCents: centsStringSchema,
  sourceDiscountsCents: centsStringSchema.default('0'),
  discountsCents: centsStringSchema.default('0'),
  penaltyCents: centsStringSchema.default('0'),
  interestCents: centsStringSchema.default('0'),
  retentions: z.array(retentionItemSchema).default([]),
  registeredTaxes: z.array(registeredTaxItemSchema).default([]),
  dueDate: z.iso.date().optional(),
  description: z.string().max(500).optional(),
  asDraft: z.boolean().default(false),
});

export type CreateDocumentBody = z.infer<typeof createDocumentBodySchema>;

// ─── PATCH /documents/:id (adjustDocument) ──────────────────────────────────

/**
 * Body do ajuste de documento Open. `version` = optimistic lock. Campos são todos opcionais
 * (PATCH semântico), mas ao menos um deve ser informado além do `version`. O domínio recalcula
 * líquido e regenera filhos.
 */
export const adjustDocumentBodySchema = z
  .object({
    version: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
    grossValueCents: centsStringSchema.optional(),
    sourceDiscountsCents: centsStringSchema.optional(),
    discountsCents: centsStringSchema.optional(),
    penaltyCents: centsStringSchema.optional(),
    interestCents: centsStringSchema.optional(),
    retentions: z.array(retentionItemSchema).optional(),
    dueDate: z.iso.date().optional(),
    description: z.string().max(500).nullable().optional(),
  })
  .refine((b) => Object.keys(b).filter((k) => k !== 'version').length > 0, {
    message: 'pelo menos um campo além de version deve ser informado',
  });

export type AdjustDocumentBody = z.infer<typeof adjustDocumentBodySchema>;

// ─── POST /documents/:id/approve · /undo-approval ───────────────────────────

/** Body das ações approve / undo-approval — só o optimistic lock. */
export const approveBodySchema = z.object({
  version: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
});

export type ApproveBody = z.infer<typeof approveBodySchema>;

// ─── Params ──────────────────────────────────────────────────────────────────

export const documentIdParamSchema = z.object({
  id: z.uuid().meta({ description: 'UUID do documento fiscal' }),
});

// ─── GET /documents (lista paginada) ─────────────────────────────────────────

export const listDocumentsQuerySchema = z.object({
  status: z.enum(['Draft', 'Open', 'Approved']).optional(),
  supplierRef: z.uuid().optional(),
  type: documentTypeSchema.optional(),
  dueFrom: z.iso.date().optional(),
  dueTo: z.iso.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListDocumentsQuery = z.infer<typeof listDocumentsQuerySchema>;

// ─── Responses ───────────────────────────────────────────────────────────────

const payableResponseSchema = z.object({
  id: z.uuid(),
  kind: z.enum(['Parent', 'Child']),
  retentionType: retentionTypeSchema.nullable(),
  valueCents: centsStringSchema,
  status: z.string(),
});

/** Resposta de criação/escrita (POST/PATCH/approve/undo-approval) — documento + títulos. */
export const documentResponseSchema = z.object({
  id: z.uuid(),
  status: z.string(),
  documentNumber: z.string().nullable(),
  type: z.string().nullable(),
  supplierRef: z.string().nullable(),
  paymentMethod: z.string().nullable(),
  grossValueCents: centsStringSchema.nullable(),
  netValueCents: centsStringSchema.nullable(),
  dueDate: z.string().nullable(),
  description: z.string().nullable(),
  payables: z.array(payableResponseSchema),
  version: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).meta({
    description:
      'Versão atual do documento (optimistic lock) — reenvie no próximo PATCH/approve/undo-approval',
  }),
});

export type DocumentResponseDto = z.infer<typeof documentResponseSchema>;

/** Item resumido na listagem. */
export const documentSummarySchema = z.object({
  id: z.uuid(),
  status: z.string(),
  documentNumber: z.string().nullable(),
  type: z.string().nullable(),
  supplierRef: z.string().nullable(),
  netValueCents: centsStringSchema.nullable(),
  dueDate: z.string().nullable(),
  version: z
    .number()
    .int()
    .min(0)
    .max(Number.MAX_SAFE_INTEGER)
    .meta({ description: 'Versão atual (optimistic lock) para ações inline' }),
});

export type DocumentSummaryDto = z.infer<typeof documentSummarySchema>;

/** Response do GET /documents — lista paginada. */
export const documentListResponseSchema = z.object({
  items: z.array(documentSummarySchema),
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
});

export type DocumentListResponseDto = z.infer<typeof documentListResponseSchema>;

// ─── GET /documents/:id/timeline ─────────────────────────────────────────────

// Valores válidos de `DocumentEvent['type']` — fonte única exaustiva importada do domínio
// (`domain/document/events.ts`). A garantia é "no extra AND no missing": adicionar um membro
// à union sem listá-lo lá QUEBRA `pnpm run typecheck` (não falha em runtime na validação do
// response de GET /timeline).

/** Uma entrada da trilha por-campo (Time Travel). */
export const timelineEntrySchema = z.object({
  eventType: z.enum([...DOCUMENT_EVENT_TYPES]).meta({
    description: 'Tipo do evento de domínio que originou esta entrada na trilha',
  }),
  target: z.object({
    kind: z.enum(['Document', 'Payable']).meta({
      description: 'Entidade afetada pelo evento — documento principal ou título filho',
    }),
    id: z.uuid().meta({
      description: 'UUID da entidade afetada (Document.id ou Payable.id)',
    }),
  }),
  occurredAt: z.iso.datetime().meta({
    description: 'Instante UTC em que o evento ocorreu (ISO-8601 com offset)',
  }),
  actor: z.uuid().nullable().meta({
    description: 'UUID do usuário responsável pela ação; nulo em ações automáticas do sistema',
  }),
  changes: z
    .array(
      z.object({
        field: z.string().max(60).meta({
          description: 'Nome do campo de domínio alterado (espelha varchar(60) no storage)',
        }),
        before: z.string().max(65535).nullable().meta({
          description: 'Valor anterior serializado; null se o campo não existia (limite TEXT)',
        }),
        after: z.string().max(65535).nullable().meta({
          description: 'Valor novo serializado; null se o campo foi removido (limite TEXT)',
        }),
      }),
    )
    .meta({
      description:
        'Lista de campos alterados com o valor anterior e o novo valor serializados como string',
    }),
});

/** Response do GET /documents/:id/timeline. */
export const documentTimelineResponseSchema = z.object({
  entries: z.array(timelineEntrySchema),
});

export type DocumentTimelineResponseDto = z.infer<typeof documentTimelineResponseSchema>;
