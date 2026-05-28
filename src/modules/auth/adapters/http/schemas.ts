/**
 * Schemas Zod das rotas auth (ADR-0027) — fonte do contrato + do OpenAPI gerado.
 * Zod fica só nesta camada de borda; o domínio valida a invariante via smart constructors.
 */

import * as z from 'zod/v4';

export const registerBodySchema = z.object({
  email: z.string().meta({ description: 'E-mail do usuário', example: 'user@example.com' }),
  password: z.string().meta({ description: 'Senha em claro (validada pela policy do domínio)' }),
});

export const registerResponseSchema = z.object({
  userId: z.string(),
  email: z.string(),
});

export const loginBodySchema = z.object({
  email: z.string(),
  password: z.string(),
});

export const loginResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  userId: z.string(),
});

export const refreshBodySchema = z.object({
  refreshToken: z.string().meta({ description: 'Refresh token opaco emitido no login' }),
});

/** Response do refresh tem o mesmo shape do login (access + refresh rotacionado + userId). */
export const refreshResponseSchema = loginResponseSchema;

export const logoutBodySchema = z.object({
  refreshToken: z.string(),
});
