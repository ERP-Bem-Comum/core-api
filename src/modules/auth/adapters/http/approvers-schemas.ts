/**
 * Schema Zod da listagem de aprovadores (#148) — GET /api/v1/approvers.
 * Projeção lean `{ id, name }` (minimização de dados — o dropdown só consome id+name; não expõe
 * email/status/roles/hash). ASCII puro.
 */

import * as z from 'zod/v4';

export const approverItemSchema = z.object({
  id: z.uuid(),
  name: z.string().nullable(),
});

export const approversResponseSchema = z.object({
  items: z.array(approverItemSchema),
});

export type ApproversResponseDto = z.infer<typeof approversResponseSchema>;
