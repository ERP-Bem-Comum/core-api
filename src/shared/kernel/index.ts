// Barrel do Shared Kernel — VOs genuinamente cross-BC (§3.H.4 DO H§36).
//
// Para consumo via namespace (Padrão D), importar diretamente do módulo:
//   import * as Money from '#src/shared/kernel/money.ts';
//   import * as Period from '#src/shared/kernel/period.ts';
//   import * as UserRef from '#src/shared/kernel/user-ref.ts';
//   import * as NonZeroMoney from '#src/shared/kernel/non-zero-money.ts';
//   import * as Cpf from '#src/shared/kernel/cpf.ts';
//   import * as Cnpj from '#src/shared/kernel/cnpj.ts';
//
// Para importar apenas tipos, este barrel é conveniente:
//   import type { Money, MoneyError } from '#src/shared/kernel/index.ts';

export type { Money, MoneyError } from './money.ts';
export type { Period, PeriodError } from './period.ts';
export type { UserRef, UserRefError } from './user-ref.ts';
export type { NonZeroMoney, NonZeroMoneyError } from './non-zero-money.ts';
export type { Cpf, CpfError } from './cpf.ts';
export type { Cnpj, CnpjError } from './cnpj.ts';
