import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import { immutable } from '../../../../shared/primitives/immutable.ts';
import type { Payable } from './types.ts';

// Transições de conciliação do título (parte do ciclo de vida ativado pela feature 017).
// Só `Paid` concilia (R2); o desfazimento volta `Reconciled → Paid` (R7).

export const reconcile = (payable: Payable): Result<Payable, 'title-not-paid'> =>
  payable.status === 'Paid'
    ? ok(immutable<Payable>({ ...payable, status: 'Reconciled' }))
    : err('title-not-paid');

export const unreconcile = (payable: Payable): Result<Payable, 'title-not-reconciled'> =>
  payable.status === 'Reconciled'
    ? ok(immutable<Payable>({ ...payable, status: 'Paid' }))
    : err('title-not-reconciled');
