/**
 * Schemas Zod das rotas de Colaboradores (ADR-0027) — fonte do contrato + do OpenAPI.
 * Zod fica só nesta camada de borda; o domínio valida invariantes via smart constructors.
 *
 * Lista (P1b): query paginada + multifiltro (subconjunto do legado) e envelope
 * `{ items, meta }` espelhando `PaginatedCollaborators` (openapi.yaml:2500); item = detalhe.
 */

import * as z from 'zod/v4';

const LIST_LIMIT_MAX = 100;
const LIST_LIMIT_DEFAULT = 5; // default do legado (PaginatedEnvelope.Limit).

// Querystring entrega array (param repetido) ou string (1 valor); normaliza p/ array.
const toArray = (v: unknown): unknown => (v === undefined ? undefined : Array.isArray(v) ? v : [v]);

/**
 * Query do GET /api/v1/collaborators (subconjunto legado — P1b). `status` = RegistrationStatus;
 * `active` (0|1) é o soft-delete. Demais filtros legados (age, breeds, …) entram na P1c.
 */
export const collaboratorListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(LIST_LIMIT_MAX).default(LIST_LIMIT_DEFAULT),
  order: z.enum(['ASC', 'DESC']).default('ASC'),
  search: z.string().min(1).optional(),
  active: z.coerce.number().int().min(0).max(1).optional(),
  status: z.preprocess(toArray, z.array(z.enum(['PreRegistration', 'Complete'])).optional()),
  occupationAreas: z.preprocess(toArray, z.array(z.enum(['PARC', 'DDI', 'DCE', 'EPV'])).optional()),
  employmentRelationships: z.preprocess(toArray, z.array(z.enum(['CLT', 'PJ'])).optional()),
  // P1c — paridade legado (age adiado).
  genderIdentities: z.preprocess(
    toArray,
    z
      .array(
        z.enum([
          'PREFIRO_NAO_RESPONDER',
          'HOMEM_CIS',
          'HOMEM_TRANS',
          'MULHER_CIS',
          'MULHER_TRANS',
          'TRAVESTI',
          'NAO_BINARIO',
          'OUTRO',
        ]),
      )
      .optional(),
  ),
  breeds: z.preprocess(
    toArray,
    z
      .array(z.enum(['AMARELO', 'BRANCO', 'PARDO', 'INDIGENA', 'PRETO', 'PREFIRO_NAO_RESPONDER']))
      .optional(),
  ),
  educations: z.preprocess(
    toArray,
    z
      .array(
        z.enum([
          'EDUCACAO_INFANTIL',
          'ENSINO_FUNDAMENTAL',
          'ENSINO_MEDIO',
          'ENSINO_SUPERIOR',
          'POS_GRADUACAO',
          'MESTRADO',
          'DOUTORADO',
        ]),
      )
      .optional(),
  ),
  disableBy: z.preprocess(
    toArray,
    z
      .array(
        z.enum([
          'DESLIGAMENTO_ABC',
          'FALECIMENTO',
          'TEMPO_CONTRATO_FINALIZADO',
          'SOLICITACAO_RESCISAO_CONTRATUAL',
          'LEGACY_MIGRATION',
        ]),
      )
      .optional(),
  ),
  roles: z.preprocess(toArray, z.array(z.string()).optional()),
  yearOfContract: z.coerce.number().int().min(1900).max(2200).optional(),
});

export type CollaboratorListQuery = z.infer<typeof collaboratorListQuerySchema>;

/** Param `:id` — UUID do colaborador (core-api). Formato inválido → 400 (Zod, antes do domínio). */
export const collaboratorIdParamSchema = z.object({
  id: z.uuid().meta({ description: 'UUID do colaborador (core-api)' }),
});

/**
 * Detalhe do colaborador — espelha o schema `Collaborator` do legado
 * (handbook/legacy_docs/openapi.yaml:2435). `id` é o UUID do core; `legacyId` é o int
 * antigo (decisão do dono). `status` carrega o `registrationStatus`; `active` é o soft-delete
 * (booleano separado). Datas em ISO 8601.
 */
export const collaboratorDetailSchema = z.object({
  id: z.uuid(),
  legacyId: z.number().int().nullable(),
  name: z.string(),
  email: z.string(),
  cpf: z.string(),
  rg: z.string().nullable(),
  occupationArea: z.string(),
  role: z.string(),
  startOfContract: z.string(),
  dateOfBirth: z.string().nullable(),
  employmentRelationship: z.string(),
  genderIdentity: z.string().nullable(),
  race: z.string().nullable(),
  education: z.string().nullable(),
  foodCategory: z.string().nullable(),
  foodCategoryDescription: z.string().nullable(),
  disableBy: z.string().nullable(),
  status: z.enum(['PreRegistration', 'Complete']),
  biography: z.string().nullable(),
  completeAddress: z.string().nullable(),
  allergies: z.string().nullable(),
  telephone: z.string().nullable(),
  emergencyContactName: z.string().nullable(),
  emergencyContactTelephone: z.string().nullable(),
  experienceInThePublicSector: z.boolean().nullable(),
  active: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type CollaboratorDetailDto = z.infer<typeof collaboratorDetailSchema>;

/** Meta de paginação legada (nestjs-typeorm-paginate — openapi.yaml:2331). */
export const collaboratorPaginationMetaSchema = z.object({
  itemCount: z.number().int().nonnegative().meta({ description: 'Itens na página atual' }),
  totalItems: z.number().int().nonnegative().meta({ description: 'Total na base (pós-filtro)' }),
  itemsPerPage: z.number().int().meta({ description: '= limit' }),
  totalPages: z.number().int().nonnegative(),
  currentPage: z.number().int().meta({ description: '1-indexed' }),
});

/** Response paginado do GET /api/v1/collaborators — item = detalhe completo (legado). */
export const collaboratorPaginatedSchema = z.object({
  items: z.array(collaboratorDetailSchema),
  meta: collaboratorPaginationMetaSchema,
});

export type CollaboratorPaginatedDto = z.infer<typeof collaboratorPaginatedSchema>;

// ─── P2 — escrita ────────────────────────────────────────────────────────────

/** Body do POST /collaborators (pré-cadastro). Espelha `CreateCollaborator` legado. */
export const createCollaboratorBodySchema = z.object({
  name: z.string().min(1),
  email: z.string().min(1),
  cpf: z.string().length(11).meta({ description: 'CPF — 11 dígitos (DV validado no domínio)' }),
  occupationArea: z.enum(['PARC', 'DDI', 'DCE', 'EPV']),
  role: z.string().min(1),
  startOfContract: z.coerce.date().meta({ description: 'Início do contrato (ISO date)' }),
  employmentRelationship: z.enum(['CLT', 'PJ']),
});

export type CreateCollaboratorBody = z.infer<typeof createCollaboratorBodySchema>;

/**
 * Body do PATCH /:id/complete-registration. Campos pessoais — todos nullable, default null
 * (ausente = não informado). Enums validados no domínio (string aqui). Espelha
 * `CompleteRegistrationCollaborator` legado.
 */
export const completeRegistrationBodySchema = z.object({
  rg: z.string().nullable().default(null),
  dateOfBirth: z.coerce.date().nullable().default(null),
  genderIdentity: z.string().nullable().default(null),
  race: z.string().nullable().default(null),
  education: z.string().nullable().default(null),
  foodCategory: z.string().nullable().default(null),
  foodCategoryDescription: z.string().nullable().default(null),
  completeAddress: z.string().nullable().default(null),
  telephone: z.string().nullable().default(null),
  emergencyContactName: z.string().nullable().default(null),
  emergencyContactTelephone: z.string().nullable().default(null),
  allergies: z.string().nullable().default(null),
  biography: z.string().nullable().default(null),
  experienceInThePublicSector: z.boolean().nullable().default(null),
});

export type CompleteRegistrationBody = z.infer<typeof completeRegistrationBodySchema>;

/**
 * Body do POST /:id/deactivate (P3). `disableBy` = motivo de RH. `LEGACY_MIGRATION` é
 * marcador de proveniência de ETL — fora da borda humana (valor inválido → 400).
 */
export const deactivateCollaboratorBodySchema = z.object({
  disableBy: z.enum([
    'DESLIGAMENTO_ABC',
    'FALECIMENTO',
    'TEMPO_CONTRATO_FINALIZADO',
    'SOLICITACAO_RESCISAO_CONTRATUAL',
  ]),
});

export type DeactivateCollaboratorBody = z.infer<typeof deactivateCollaboratorBodySchema>;
