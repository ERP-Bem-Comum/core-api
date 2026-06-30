import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import { sha256Hex } from '../../../../shared/utils/hash.ts';
import type { Brand } from '../../../../shared/primitives/brand.ts';

// VO da chave anti-duplicidade do extrato (FITID). Padrão module-as-namespace:
//   `import * as Fitid from './fitid.ts'`.
// OFX traz FITID nativo; CSV sem FITID usa `synthesize` (sha256 determinístico — D-FITID).

export type Fitid = Brand<string, 'Fitid'>;
export type FitidError = 'invalid-fitid';

const MAX_LENGTH = 64;

const validate = (raw: string): Result<Fitid, FitidError> =>
  raw.length > 0 && raw.length <= MAX_LENGTH ? ok(raw as Fitid) : err('invalid-fitid');

export const fromNative = (raw: string): Result<Fitid, FitidError> => validate(raw);

export const rehydrate = (raw: string): Result<Fitid, FitidError> => validate(raw);

export type SynthesizeInput = Readonly<{
  debitAccountRef: string;
  dateIso: string;
  valueCents: number;
  memo: string;
  seq: number;
}>;

// Chave sintética determinística para CSV sem FITID nativo. sha256 hex tem 64 chars (≤ MAX_LENGTH),
// é sempre válida e reproduz a mesma `Fitid` para a mesma entrada (descarte silencioso na reimportação).
export const synthesize = (input: SynthesizeInput): Fitid => {
  const material = [
    input.debitAccountRef,
    input.dateIso,
    String(input.valueCents),
    input.memo,
    String(input.seq),
  ].join('|');
  return sha256Hex(material) as Fitid;
};
