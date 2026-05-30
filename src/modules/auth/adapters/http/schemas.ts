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

export const meResponseSchema = z.object({
  userId: z.string(),
});

// BE-REC-004: troca de senha autenticada. O userId vem do access JWT (requireAuth), nunca do body.
export const changePasswordBodySchema = z.object({
  currentPassword: z.string().meta({ description: 'Senha atual (re-autenticacao)' }),
  newPassword: z.string().meta({ description: 'Nova senha (validada pela policy do dominio)' }),
});

// BE-REC-003: solicitação de reset. Resposta sempre 202 (anti-enumeração), sem corpo.
export const forgotPasswordBodySchema = z.object({
  email: z.string().meta({ description: 'E-mail da conta para recuperação de senha' }),
});

// BE-REC-003: confirmação do reset com o token recebido por e-mail + nova senha.
export const resetPasswordBodySchema = z.object({
  token: z.string().meta({ description: 'Token de reset recebido por e-mail (one-time)' }),
  newPassword: z.string().meta({ description: 'Nova senha (validada pela policy do domínio)' }),
});
