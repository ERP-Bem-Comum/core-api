/**
 * Schemas Zod das rotas de Colaboradores (ADR-0027) — fonte do contrato + do OpenAPI.
 * Zod fica só nesta camada de borda; o domínio valida invariantes via smart constructors.
 *
 * Lista (P1b): query paginada + multifiltro (subconjunto do legado) e envelope
 * `{ items, meta }` espelhando `PaginatedCollaborators` (openapi.yaml:2500); item = detalhe.
 */

import * as z from 'zod/v4';

import { uuidV4 } from '#src/shared/http/uuid-schema.ts';
import {
  RG_MAX_LENGTH,
  GENDER_IDENTITY_DESCRIPTION_MAX_LENGTH,
} from '../../domain/collaborator/personal-data.ts';
import { PWD_OTHER_DESCRIPTION_MAX_LENGTH } from '../../domain/collaborator/pwd.ts';

const LIST_LIMIT_MAX = 100;
const LIST_LIMIT_DEFAULT = 5; // default do legado (PaginatedEnvelope.Limit).

// Querystring entrega array (param repetido) ou string (1 valor); normaliza p/ array.
const toArray = (v: unknown): unknown => (v === undefined ? undefined : Array.isArray(v) ? v : [v]);

/**
 * Query do GET /api/v1/collaborators (subconjunto legado — P1b). `status` = RegistrationStatus;
 * `active` (0|1) é o soft-delete.
 *
 * FR-012 (épico partners-http-gaps): os filtros `programa` e `idade` são DESCARTADOS (fora de
 * escopo) — `programa` não é conceito do BC do colaborador; `idade` é derivável de `birthDate` no
 * client. O contrato NÃO os anuncia; chaves desconhecidas são removidas (strip) por este `z.object`.
 * Guarda: `tests/modules/partners/adapters/http/collaborator-list-filters-contract.test.ts`.
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
          'QUEER',
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
  id: uuidV4().meta({ description: 'UUID do colaborador (core-api)' }),
});

/** Query do GET /collaborators/:id/export — US4: por ora só `type=history` (CSV de alterações). */
export const collaboratorHistoryExportQuerySchema = z.object({
  type: z.literal('history').meta({ description: 'Tipo de export (alterações = history)' }),
});

/**
 * Query do GET /collaborators/export (#126): filtros da lista + `?type=history` opcional.
 * Sem `type` → CSV da lista (US-002). `type=history` → CSV combinado do histórico do filtro.
 */
export const collaboratorExportQuerySchema = collaboratorListQuerySchema.extend({
  type: z
    .literal('history')
    .optional()
    .meta({ description: 'history → export do histórico do filtro' }),
});

export type CollaboratorExportQuery = z.infer<typeof collaboratorExportQuerySchema>;

/**
 * Detalhe do colaborador — espelha o schema `Collaborator` do legado
 * (handbook/legacy_docs/openapi.yaml:2435). `id` é o UUID do core; `legacyId` é o int
 * antigo (decisão do dono). `status` carrega o `registrationStatus`; `active` é o soft-delete
 * (booleano separado). Datas em ISO 8601.
 */
// Payment target (US1 feature 015) — espelha o molde de Supplier/Act. `agency` valida no domínio.
// `.max` = tamanho da coluna em `par_collaborators` (#1029): acima dele o UPDATE estoura no MySQL
// estrito e o cliente recebia 503 por um erro de validação; agora é 400 na borda.
const bankAccountSchema = z.object({
  bank: z.string().max(50),
  agency: z.string().max(20),
  accountNumber: z.string().max(30),
  checkDigit: z.string().max(5),
});

const pixKeySchema = z.object({
  keyType: z.enum(['cpf', 'cnpj', 'email', 'phone', 'random-key']),
  key: z.string().max(255),
});

// Território (US3) — uf validada no domínio (catálogo geography); municipality texto livre.
const territorySchema = z.object({
  uf: z.string().nullable(),
  municipality: z.string().nullable(),
});

// Pessoa com Deficiência (spec 131). Códigos do domínio; o rótulo PT é do front.
const PWD_ANSWERS = ['SIM', 'NAO', 'PREFIRO_NAO_RESPONDER'] as const;
const PWD_TYPE_CODES = [
  'FISICA',
  'VISUAL',
  'AUDITIVA',
  'INTELECTUAL_MENTAL',
  'TEA',
  'MULTIPLA',
  'OUTRA',
] as const;

/** Resposta gravada. `types` vazio fora do "Sim"; "Sim" sem tipo = dado anterior, incompleto. */
const pwdDetailSchema = z.object({
  answer: z.enum(PWD_ANSWERS),
  types: z.array(z.enum(PWD_TYPE_CODES)),
  otherDescription: z.string().nullable(),
});

/**
 * Resposta enviada. Chega COMPLETA (domínio, 422): "Sim" pede ao menos um tipo, "Outra" pede o texto,
 * e tipos/texto só existem com "Sim". O teto do texto é o do domínio (fonte única, ADR-0027).
 */
const pwdInputSchema = z.object({
  answer: z.enum(PWD_ANSWERS),
  types: z.array(z.enum(PWD_TYPE_CODES)).max(PWD_TYPE_CODES.length).default([]),
  otherDescription: z
    .string()
    .trim()
    .max(PWD_OTHER_DESCRIPTION_MAX_LENGTH)
    .nullable()
    .default(null),
});

export const collaboratorDetailSchema = z.object({
  id: uuidV4(),
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
  genderIdentityDescription: z.string().nullable(),
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
  sex: z.string().nullable(),
  maritalStatus: z.string().nullable(),
  hasChildren: z.boolean().nullable(),
  childrenCount: z.number().int().nullable(),
  childrenAges: z.array(z.number().int()).nullable(),
  pwd: pwdDetailSchema.nullable(),
  isOnLeave: z.boolean().nullable(),
  leaveDuration: z.string().nullable(),
  leaveRenewable: z.boolean().nullable(),
  leaveRenewalDuration: z.string().nullable(),
  publicSectorExperienceDuration: z.string().nullable(),
  bankAccount: bankAccountSchema.nullable(),
  pixKey: pixKeySchema.nullable(),
  territory: territorySchema.nullable(),
  active: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  contractCount: z
    .number()
    .int()
    .nonnegative()
    .meta({ description: 'Contratos ativos da contraparte (read-model par_contract_count_view)' }),
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

/** Response paginado do GET /api/v1/collaborators — item = detalhe (inclui contractCount). */
export const collaboratorPaginatedSchema = z.object({
  items: z.array(collaboratorDetailSchema),
  meta: collaboratorPaginationMetaSchema,
});

export type CollaboratorPaginatedDto = z.infer<typeof collaboratorPaginatedSchema>;

// ─── P2 — escrita ────────────────────────────────────────────────────────────

// #1072: os limites de RG e da descrição de gênero vêm do domínio — fonte única. A validação nas duas
// camadas é deliberada (ADR-0027): a borda dá o 400 cedo, o domínio cobre quem não passa por aqui
// (ETL). O NÚMERO é um só, para que as duas nunca discordem.

/**
 * Nascimento como DIA CIVIL (#1072). Aceita `YYYY-MM-DD` ou data-hora ISO (com `Z`, offset ou sem
 * fuso) e guarda o dia ESCRITO — `1990-05-10T22:00:00-03:00` é 10/05, não 11/05 em UTC. Sai como
 * `Date` à meia-noite UTC desse dia. Branco vira `null` (= mantém, contrato do #1070).
 *
 * Substitui o `z.coerce.date()`, que convertia o instante para UTC (trocando o dia), aceitava
 * `0` (1970-01-01), texto livre e calendário impossível (`2026-02-30` virava 02/03). Uma data errada
 * gravada fica TRAVADA pelo "preenche uma vez", por isso a borda é mais estrita aqui. Data futura e
 * ano fora da faixa do DATETIME são invariantes do domínio (422).
 */
const civilDateSchema = z
  .union([z.iso.date(), z.iso.datetime({ offset: true, local: true }), z.literal('')])
  .transform((raw): Date | null => {
    if (raw === '') return null;
    // `setUTCFullYear`, não `Date.UTC`: este mapeia os anos 0–99 para 1900–1999 (`0050` viraria
    // 1950 e passaria como data válida). O domínio recusa o ano abaixo do piso do DATETIME.
    const midnight = new Date(0);
    midnight.setUTCFullYear(
      Number(raw.slice(0, 4)),
      Number(raw.slice(5, 7)) - 1,
      Number(raw.slice(8, 10)),
    );
    return midnight;
  });

/**
 * Body do POST /collaborators (pré-cadastro). Espelha `CreateCollaborator` legado + payment
 * target (US1). `bankAccount`/`pixKey` OPCIONAIS (omitidos → null); `agency` validada no domínio.
 */
export const createCollaboratorBodySchema = z.object({
  name: z.string().min(1),
  email: z.string().min(1),
  cpf: z.string().length(11).meta({ description: 'CPF — 11 dígitos (DV validado no domínio)' }),
  occupationArea: z.enum(['PARC', 'DDI', 'DCE', 'EPV']),
  role: z.string().min(1),
  startOfContract: z.coerce.date().meta({ description: 'Início do contrato (ISO date)' }),
  employmentRelationship: z.enum(['CLT', 'PJ']),
  bankAccount: bankAccountSchema.nullable().default(null),
  pixKey: pixKeySchema.nullable().default(null),
  territory: territorySchema.nullable().default(null),
});

export type CreateCollaboratorBody = z.infer<typeof createCollaboratorBodySchema>;

/**
 * Body do PUT /collaborators/:id — substituição total dos cadastrais. Pessoais não entram aqui,
 * exceto RG/nascimento/raça (preenche-uma-vez, abaixo).
 * Banco/PIX (#1029) e território (#1053) entram com semântica PRÓPRIA: ausente ou `null` MANTÉM o
 * gravado; objeto valida e substitui.
 *
 * ⚠️ Sem `.default(null)` e sem `null` = remover, ao contrário do create e do PUT do Fornecedor. O
 * front em produção envia `bankAccount: null, pixKey: null` em TODO PUT de colaborador (antes eram
 * descartados pelo `omit`); dar a esse `null` o sentido de "remover" apagaria os dados bancários a
 * cada edição cadastral. Não "alinhar" com o Fornecedor sem antes mudar todos os clientes.
 *
 * #1053: território pode ser SUBSTITUÍDO, nunca APAGADO. Ausente ou `null` mantém; objeto com ao
 * menos um campo preenchido valida (UF por sigla IBGE no domínio) e substitui — substituição parcial
 * permitida; zerar UF e município de quem já tem território é recusado no domínio com
 * `collaborator-territory-removal-forbidden` (422).
 *
 * RG, nascimento e raça são preenchidos UMA vez (decisão da P.O., 19/10/2026): ausente ou `null`
 * mantém; com o campo vazio no gravado, grava; igual ao gravado mantém; diferente do gravado é
 * recusado com `collaborator-personal-data-immutable` (409).
 */
export const updateCollaboratorBodySchema = createCollaboratorBodySchema
  .omit({ bankAccount: true, pixKey: true, territory: true })
  .extend({
    bankAccount: bankAccountSchema
      .nullable()
      .optional()
      .meta({ description: 'Ausente ou null mantém os dados gravados; objeto substitui' }),
    pixKey: pixKeySchema
      .nullable()
      .optional()
      .meta({ description: 'Ausente ou null mantém a chave gravada; objeto substitui' }),
    territory: territorySchema.nullable().optional().meta({
      description:
        'Ausente ou null mantém o território gravado; objeto com ao menos um campo preenchido substitui (parcial permitido); zerar os dois de quem já tem território é recusado (422)',
    }),
    rg: z.string().trim().max(RG_MAX_LENGTH).nullable().optional().meta({
      description:
        'Até 20 caracteres. Ausente, null ou branco mantém; preenche se vazio; trocar o RG gravado é recusado (409)',
    }),
    dateOfBirth: civilDateSchema.nullable().optional().meta({
      description:
        'Dia civil: YYYY-MM-DD ou data-hora ISO (vale o dia escrito, não o UTC). Ausente, null ou "" mantém; preenche se vazio; trocar a data gravada é recusado (409); data futura → 422',
    }),
    race: z.string().nullable().optional().meta({
      description:
        'Ausente ou null mantém; preenche se vazio (enum validado no domínio); trocar a raça gravada é recusado (409)',
    }),
    pwd: pwdInputSchema.nullable().optional().meta({
      description:
        'Pessoa com Deficiência. Ausente ou null mantém; com o gravado vazio ou incompleto, grava a resposta (que precisa vir completa, 422); trocar uma resposta completa é recusado (409)',
    }),
  });

export type UpdateCollaboratorBody = z.infer<typeof updateCollaboratorBodySchema>;

/**
 * Body do PATCH /:id/complete-registration. Campos pessoais — todos nullable, default null
 * (ausente = não informado). Enums validados no domínio (string aqui). Espelha
 * `CompleteRegistrationCollaborator` legado.
 */
export const completeRegistrationBodySchema = z.object({
  // #1072: RG, nascimento e raça seguem o "preenche uma vez" também aqui — `null` (inclusive o
  // default de campo ausente) MANTÉM o que o PUT já gravou; valor diferente do gravado → 409.
  rg: z.string().trim().max(RG_MAX_LENGTH).nullable().default(null),
  dateOfBirth: civilDateSchema.nullable().default(null),
  genderIdentity: z.string().nullable().default(null),
  // #1054: texto livre de "Outra identidade de gênero". O teto (120) é contrato de produto, abaixo da
  // coluna (255); a coerência com genderIdentity = OUTRO é invariante de domínio (422). autocadastro
  // herda via extend.
  genderIdentityDescription: z
    .string()
    .trim()
    .max(GENDER_IDENTITY_DESCRIPTION_MAX_LENGTH)
    .nullable()
    .default(null),
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
  // Perfil completo (US2). sex/maritalStatus como string (enum validado no domínio).
  sex: z.string().nullable().default(null),
  maritalStatus: z.string().nullable().default(null),
  hasChildren: z.boolean().nullable().default(null),
  childrenCount: z.number().int().nonnegative().nullable().default(null),
  childrenAges: z.array(z.number().int().nonnegative()).nullable().default(null),
  // Spec 131: `null` (inclusive o default de campo ausente) mantém o que o PUT já gravou.
  pwd: pwdInputSchema.nullable().default(null),
  isOnLeave: z.boolean().nullable().default(null),
  leaveDuration: z.string().nullable().default(null),
  leaveRenewable: z.boolean().nullable().default(null),
  leaveRenewalDuration: z.string().nullable().default(null),
  publicSectorExperienceDuration: z.string().nullable().default(null),
});

export type CompleteRegistrationBody = z.infer<typeof completeRegistrationBodySchema>;

/**
 * Autocadastro público (US5). GET usa o token opaco na query; POST estende o
 * complete-registration com `token` + `cpfPrefix` (revalidação leve de identidade — os 3
 * primeiros dígitos do CPF, validados no domínio).
 */
export const autocadastroQuerySchema = z.object({
  token: z.string().min(1),
});

export const autocadastroBodySchema = completeRegistrationBodySchema.extend({
  // Spec 131 (P.O., 23/10/2026): no autocadastro a pergunta "Você é PcD?" é OBRIGATÓRIA. Só aqui —
  // o RH completa o cadastro sem ela.
  pwd: pwdInputSchema,
  token: z.string().min(1),
  // bound de input (W2/m2): o domínio exige 3 dígitos; o máximo absorve máscara legível.
  cpfPrefix: z.string().min(1).max(14),
});

/** Preview de pré-cadastro (GET autocadastro) — só os 3 campos públicos; CPF mascarado (W2/m3). */
export const autocadastroPreviewSchema = z.object({
  collaboratorId: z.string(),
  name: z.string(),
  cpfMasked: z.string(),
});

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
