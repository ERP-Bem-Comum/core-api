import { type Result, ok, err } from '../primitives/result.ts';
import { isUuidV4 } from '../utils/id.ts';
import type { Brand } from '../primitives/brand.ts';

// Padrão D (entrevista 0001 §B DO§8): module-as-namespace.
// Consumir com `import * as UserRef from '#src/shared/kernel/user-ref.ts'`.
//
// Shared Kernel (§3.H.4 DO H§36): VO genuinamente cross-BC.
// UserRef representa identidade externa (módulo Identity/Usuários) — qualquer
// módulo que precisa registrar autoria de evento usa este VO.
//
// NÃO expõe `generate` — apenas `rehydrate` para validar strings que cruzam
// a borda (o ID de usuário vem do Identity Provider, não é gerado aqui).

export type UserRef = Brand<string, 'UserRef'>;
export type UserRefError = 'user-ref-invalid';

export const rehydrate = (raw: string): Result<UserRef, UserRefError> =>
  isUuidV4(raw) ? ok(raw as UserRef) : err('user-ref-invalid');
