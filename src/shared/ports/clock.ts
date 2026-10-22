import type { PlainDate } from '../kernel/plain-date.ts';

export type Clock = Readonly<{
  now: () => Date;
  /** Data-calendário de hoje no fuso da implementação: UTC em `ClockReal` e `ClockFixed`, `America/Sao_Paulo` em `ClockSaoPaulo`. */
  today: () => PlainDate;
}>;
