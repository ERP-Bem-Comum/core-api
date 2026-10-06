/**
 * Schemas Zod das rotas de Fornecedores (ADR-0027). Zod só na borda. Espelha o schema
 * `Supplier`/`PaginatedSuppliers` do legado (handbook/legacy_docs/openapi.yaml:2549).
 *
 * S1 (reads): query da lista (search/active/categories) + detalhe + envelope paginado + id param.
 * `serviceCategory`/`categories` como `z.string()` (39 categorias legadas; o domínio valida o valor).
 */

import * as z from 'zod/v4';

import { uuidV4 } from '#src/shared/http/uuid-schema.ts';
import * as SupplierDocument from '#src/modules/partners/domain/supplier/supplier-document.ts';

const LIST_LIMIT_MAX = 100;
const LIST_LIMIT_DEFAULT = 5;

const toArray = (v: unknown): unknown => (v === undefined ? undefined : Array.isArray(v) ? v : [v]);

/** Query do GET /api/v1/suppliers (subconjunto legado: search, active, categories). */
export const supplierListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(LIST_LIMIT_MAX).default(LIST_LIMIT_DEFAULT),
  order: z.enum(['ASC', 'DESC']).default('ASC'),
  search: z.string().min(1).optional(),
  active: z.coerce.number().int().min(0).max(1).optional(),
  categories: z.preprocess(toArray, z.array(z.string()).optional()),
});

export type SupplierListQuery = z.infer<typeof supplierListQuerySchema>;

/** Query do GET /api/v1/suppliers/export — filtros sem paginação (exporta tudo que casa). */
export const supplierExportQuerySchema = z.object({
  search: z.string().min(1).optional(),
  active: z.coerce.number().int().min(0).max(1).optional(),
  categories: z.preprocess(toArray, z.array(z.string()).optional()),
});

export type SupplierExportQuery = z.infer<typeof supplierExportQuerySchema>;

/** Resposta do GET /api/v1/suppliers/service-categories — catálogo canônico (códigos legados). */
export const serviceCategoriesSchema = z
  .array(z.string())
  .meta({ description: 'Categorias de serviço canônicas (códigos legados, FR-017)' });

/** Resposta do GET /api/v1/suppliers/service-ratings — catálogo de níveis de avaliação. */
export const serviceRatingsSchema = z
  .array(z.string())
  .meta({ description: 'Níveis de avaliação canônicos (RUIM/REGULAR/BOM/OTIMO)' });

/** Param `:id` — UUID do fornecedor (core-api). Formato inválido → 400. */
export const supplierIdParamSchema = z.object({
  id: uuidV4().meta({ description: 'UUID do fornecedor (core-api)' }),
});

const bankAccountSchema = z.object({
  bank: z.string(),
  agency: z.string(),
  accountNumber: z.string(),
  checkDigit: z.string(),
});

const pixKeySchema = z.object({
  keyType: z.enum(['cpf', 'cnpj', 'email', 'phone', 'random-key']),
  key: z.string(),
});

/**
 * Detalhe — espelha o schema `Supplier` legado. `id` UUID do core; `legacyId` int antigo.
 *
 * Fornecedor pessoa física (#1022): `document` + `personType` são os campos novos (aditivos).
 * `cnpj` segue na resposta como alias DEPRECATED de `document` por um ciclo, para o front atual
 * não quebrar enquanto migra. Na PF, `corporateName`/`fantasyName` vêm `null` — o campo não
 * existe para pessoa física, e `null` é como o JSON diz "ausente" (nunca sentinela).
 */
export const supplierDetailSchema = z.object({
  id: uuidV4(),
  legacyId: z.number().int().nullable(),
  name: z.string(),
  email: z.string(),
  document: z.string().meta({
    description:
      'CPF (11 caracteres numéricos, PF) ou CNPJ (14 caracteres alfanuméricos, PJ — ADR-0044), sem máscara',
  }),
  personType: z.enum(['PF', 'PJ']).meta({
    description: 'Tipo de pessoa, derivado do documento (não é gravado): CPF → PF, CNPJ → PJ',
  }),
  cnpj: z.string().meta({
    deprecated: true,
    description: 'DEPRECATED — alias de `document` por um ciclo (#1022). Usar `document`.',
  }),
  corporateName: z.string().nullable().meta({ description: 'Razão social — `null` na PF' }),
  fantasyName: z.string().nullable().meta({ description: 'Nome fantasia — `null` na PF' }),
  serviceCategory: z.string(),
  bankAccount: bankAccountSchema.nullable(),
  pixKey: pixKeySchema.nullable(),
  serviceRating: z.string().nullable(),
  ratingComment: z.string().nullable(),
  active: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  contractCount: z
    .number()
    .int()
    .nonnegative()
    .meta({ description: 'Contratos ativos da contraparte (read-model par_contract_count_view)' }),
});

export type SupplierDetailDto = z.infer<typeof supplierDetailSchema>;

/** Meta de paginação legada (openapi.yaml:2331). */
export const supplierPaginationMetaSchema = z.object({
  itemCount: z.number().int().nonnegative(),
  totalItems: z.number().int().nonnegative(),
  itemsPerPage: z.number().int(),
  totalPages: z.number().int().nonnegative(),
  currentPage: z.number().int(),
});

/** Response paginado do GET /api/v1/suppliers — item = detalhe (inclui contractCount). */
export const supplierPaginatedSchema = z.object({
  items: z.array(supplierDetailSchema),
  meta: supplierPaginationMetaSchema,
});

export type SupplierPaginatedDto = z.infer<typeof supplierPaginatedSchema>;

// ─── S2 — escrita ────────────────────────────────────────────────────────────

const bankAccountInputSchema = z.object({
  bank: z.string(),
  agency: z.string(),
  accountNumber: z.string(),
  checkDigit: z.string(),
});

const pixKeyInputSchema = z.object({
  keyType: z.string(),
  key: z.string(),
});

// Shape do documento na borda: 11 (CPF) ou 14 (CNPJ) caracteres alfanuméricos — SEM máscara. O
// alfanumérico não é enfeite: só com o tamanho, um CPF mascarado (`123.456.789-09`, 14 caracteres)
// passava como se fosse CNPJ sem máscara, enquanto um CNPJ mascarado (18) caía em 400 — máscara
// aceita para um documento e recusada para o outro. O DV e a escolha CPF × CNPJ são do domínio
// (`SupplierDocument.parse` → 422 `invalid-supplier-document`).
const supplierDocumentInputSchema = z
  .string()
  .refine(
    (v) =>
      /^[0-9A-Za-z]+$/.test(v) &&
      (v.length === SupplierDocument.CPF_LENGTH || v.length === SupplierDocument.CNPJ_LENGTH),
    { message: 'documento deve ter 11 (CPF) ou 14 (CNPJ) caracteres alfanuméricos, sem máscara' },
  );

/**
 * Body do POST /suppliers. Espelha `CreateSupplier` legado. A invariante "ao menos um
 * payment target" é do domínio (ausência de ambos → 422), não do Zod. `serviceCategory`
 * e `pixKey.keyType` como string (validados no domínio).
 *
 * Fornecedor pessoa física (#1022): `document` aceita CPF ou CNPJ. `cnpj` continua aceito como
 * alias DEPRECATED por um ciclo, para o backend subir antes do front sem quebrar a tela atual —
 * exige-se um dos dois, e iguais se vierem ambos. `corporateName`/`fantasyName` deixam de ser
 * obrigatórios no shape: quem decide é o documento, no domínio (PF preenchido → 422; PJ sem → 422).
 */
export const createSupplierBodySchema = z
  .object({
    name: z.string().min(1),
    email: z.string().min(1),
    document: supplierDocumentInputSchema.optional().meta({
      description:
        'CPF (11 caracteres numéricos) ou CNPJ (14 caracteres alfanuméricos), sem máscara',
    }),
    cnpj: supplierDocumentInputSchema.optional().meta({
      deprecated: true,
      description: 'DEPRECATED — alias de `document` por um ciclo (#1022). Usar `document`.',
    }),
    corporateName: z.string().nullable().default(null),
    fantasyName: z.string().nullable().default(null),
    serviceCategory: z.string().min(1),
    bankAccount: bankAccountInputSchema.nullable().default(null),
    pixKey: pixKeyInputSchema.nullable().default(null),
    // Avaliação opcional. Domínio é autoridade do conjunto (rating inválido → 422).
    serviceRating: z.string().nullable().default(null),
    ratingComment: z.string().nullable().default(null),
  })
  .superRefine((body, ctx) => {
    if (body.document === undefined && body.cnpj === undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['document'],
        message: 'informe `document` (ou o alias deprecated `cnpj`)',
      });
    } else if (
      body.document !== undefined &&
      body.cnpj !== undefined &&
      body.document !== body.cnpj
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['cnpj'],
        message: '`cnpj` é alias de `document`: os dois, se vierem, precisam ser iguais',
      });
    }
  })
  // Resolve o alias: daqui para dentro só existe `document`. O `?? ''` é inalcançável (o
  // superRefine acima exige um dos dois) e, se um dia não for, o domínio o recusa com 422.
  .transform(({ cnpj, document, ...rest }) => ({ ...rest, document: document ?? cnpj ?? '' }));

export type CreateSupplierBody = z.infer<typeof createSupplierBodySchema>;

/** Body do PUT /suppliers/:id — substituição total (= create). Espelha `UpdateSupplier` legado. */
export const updateSupplierBodySchema = createSupplierBodySchema;

export type UpdateSupplierBody = z.infer<typeof updateSupplierBodySchema>;

// ─── #356 — resolução em lote (BFF batch-by-id, ADR-0049 §3 / #350) ───────────

/**
 * Body do POST /partners/suppliers:batch. Teto 200 refs/chamada (< 500 do batch de
 * escrita — deliberado, anti-DoS). Fundamento: OWASP AI Exchange, l.3735.
 */
export const suppliersBatchBodySchema = z.object({
  refs: z.array(uuidV4()).min(1).max(200),
});

export type SuppliersBatchBody = z.infer<typeof suppliersBatchBodySchema>;

/**
 * Item da resposta do batch — identidade MÍNIMA (nome/CNPJ/categoria). NUNCA inclui
 * `bankAccount`/`pixKey` (minimização, CA5 do #356) — o schema de resposta é a
 * segunda linha de defesa: o serializer Zod descarta qualquer campo fora daqui.
 */
const supplierBatchItemSchema = z.object({
  ref: uuidV4(),
  name: z.string(),
  taxId: z.string(),
  serviceCategory: z.string(),
});

/** Resposta do POST /partners/suppliers:batch — `items` sem ordem garantida + `missing` (refs sem registro). */
export const suppliersBatchResponseSchema = z.object({
  items: z.array(supplierBatchItemSchema),
  missing: z.array(uuidV4()),
});

export type SuppliersBatchResponseDto = z.infer<typeof suppliersBatchResponseSchema>;
