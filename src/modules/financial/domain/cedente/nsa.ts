import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import type { Brand } from '../../../../shared/primitives/brand.ts';

// Padrão D (module-as-namespace): `import * as Nsa from './nsa.ts'`.
//
// NSA = Número Sequencial do Arquivo de remessa, por conta-cedente. Nunca se repete e nunca
// retrocede: é como o banco distingue uma remessa nova de uma retransmissão.
//
// A FAIXA NÃO É ARBITRÁRIA. O campo tem seis dígitos no header de arquivo do CNAB 240 (posições
// 158-163, layout Multipag p. 14). Um NSA de 1.000.000 não cabe — e sem este teto no domínio o
// defeito só apareceria na serialização, com a remessa inteira já montada.

export type Nsa = Brand<number, 'Nsa'>;
export type NsaError = 'nsa-out-of-range';

export const MIN = 1;
export const MAX = 999_999;

const inRange = (raw: number): boolean => Number.isInteger(raw) && raw >= MIN && raw <= MAX;

export const rehydrate = (raw: number): Result<Nsa, NsaError> =>
  inRange(raw) ? ok(raw as Nsa) : err('nsa-out-of-range');
