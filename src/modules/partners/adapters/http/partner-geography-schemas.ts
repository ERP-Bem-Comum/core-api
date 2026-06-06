/**
 * Schemas Zod das rotas de parceria territorial (US-002 — ADR-0001 da feature).
 * Rotas: GET/POST/DELETE partner-states e partner-municipalities.
 */

import * as z from 'zod/v4';

// ─── Partner States ───────────────────────────────────────────────────────────

/** Param `:uf` — 2 chars maiúsculos. Validação do catálogo ocorre no use case. */
export const ufParamSchema = z.object({
  uf: z.string().min(1).max(2).toUpperCase().meta({ description: 'Sigla UF (2 chars)' }),
});

export type UfParam = z.infer<typeof ufParamSchema>;

/** DTO de resposta de um estado parceiro. */
export const partnerStateDtoSchema = z.object({
  uf: z.string().meta({ description: 'Sigla da UF' }),
  isPartner: z.boolean().meta({ description: 'true = UF marcada como parceira' }),
});

export type PartnerStateDto = z.infer<typeof partnerStateDtoSchema>;

/** Resposta do GET /partner-states — 27 UFs. */
export const partnerStatesListSchema = z.array(partnerStateDtoSchema);

// ─── Partner Municipalities ───────────────────────────────────────────────────

/** Query do GET /partner-municipalities?uf= */
export const partnerMunicipalitiesQuerySchema = z.object({
  uf: z
    .string()
    .min(1)
    .max(2)
    .toUpperCase()
    .meta({ description: 'Sigla UF para filtrar catálogo' }),
});

export type PartnerMunicipalitiesQuery = z.infer<typeof partnerMunicipalitiesQuerySchema>;

/** Param `:ibgeCode` — 7 dígitos. Validação do catálogo ocorre no use case. */
export const ibgeCodeParamSchema = z.object({
  ibgeCode: z
    .string()
    .length(7)
    .regex(/^\d{7}$/)
    .meta({ description: 'Código IBGE do município (7 dígitos)' }),
});

export type IbgeCodeParam = z.infer<typeof ibgeCodeParamSchema>;

/** DTO de resposta de um município parceiro. */
export const partnerMunicipalityDtoSchema = z.object({
  ibgeCode: z.string().meta({ description: 'Código IBGE (7 dígitos)' }),
  uf: z.string().meta({ description: 'Sigla da UF' }),
  name: z.string().meta({ description: 'Nome do município' }),
  isPartner: z.boolean().meta({ description: 'true = município marcado como parceiro' }),
});

export type PartnerMunicipalityDto = z.infer<typeof partnerMunicipalityDtoSchema>;

/** Resposta do GET /partner-municipalities */
export const partnerMunicipalitiesListSchema = z.array(partnerMunicipalityDtoSchema);
