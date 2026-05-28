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

export type ContractListItemDto = z.infer<typeof contractListItemSchema>;
