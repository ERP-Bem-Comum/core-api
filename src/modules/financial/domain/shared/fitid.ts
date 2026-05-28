/**
 * FITID — Financial Institution Transaction ID (anti-duplicidade de transação bancária).
 *
 * Identificador único de transação fornecido pelo banco em arquivos de extrato
 * (OFX, CNAB de retorno, exports XLSX/PDF). É a chave de unicidade que impede
 * que uma mesma transação seja importada/liquidada duas vezes.
 *
 * **Fonte normativa (handbook):**
 * - `handbook/domain/04-titulos-liquidacao-context.md:57` — R4 (Anti-Duplicidade FITID):
 *   "O sistema deve recusar a importação de qualquer transação de extrato (OFX,
 *   XLSX, PDF) cujo FITID já tenha sido processado anteriormente."
 * - `handbook/domain/05-integracao-bancaria-context.md:49` — R1 (Proteção de
 *   Duplicidade): "Nenhuma transação com o mesmo FITID pode ser processada
 *   duas vezes, independente do arquivo de origem."
 *
 * **Limite de comprimento:** OFX 2.x §11.4.2 (`<FITID>` element) fixa o máximo
 * em 255 caracteres alfanuméricos. Como bancos brasileiros geralmente emitem
 * FITIDs bem menores (hash hexadecimal, sequencial numérico), 255 é teto
 * confortável.
 *
 * **Charset permissivo (D5 do 000-request):** OFX define `<FITID>` como
 * string opaca. Bancos brasileiros variam:
 *   - Bradesco: sequencial numérico
 *   - Itaú: hash hexadecimal
 *   - Alguns gateways: base64 com `+`, `/`, `=`
 * Validar charset arriscaria rejeitar FITID legítimo. Apenas comprimento e
 * vazio são checados.
 *
 * Padrão D (entrevista 0001 §B DO§8): module-as-namespace.
 * Consumir com `import * as FITID from '#src/modules/financial/domain/shared/fitid.ts'`.
 */

import type { Brand } from '#src/shared/primitives/brand.ts';
import { type Result, ok, err } from '#src/shared/primitives/result.ts';

export type FITID = Brand<string, 'FITID'>;

export type FITIDError = 'fitid-empty' | 'fitid-too-long';

// OFX 2.x §11.4.2 — `<FITID>` element max length.
const MAX_LENGTH = 255;

export const fromString = (raw: string): Result<FITID, FITIDError> => {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return err('fitid-empty');
  if (trimmed.length > MAX_LENGTH) return err('fitid-too-long');
  return ok(trimmed as FITID);
};

export const equals = (a: FITID, b: FITID): boolean => a === b;
