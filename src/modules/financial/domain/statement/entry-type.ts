import { type Result, ok, err } from '../../../../shared/primitives/result.ts';

// VO do tipo de lançamento do extrato. Padrão module-as-namespace: `import * as EntryType from './entry-type.ts'`.
// Conjunto FECHADO = spec 017 `data-model.md:37`/`:122` (10 valores). Siglas BR preservam a caixa (`:96`).
// `normalize`: valor BRUTO do banco (OFX `TRNTYPE` / CSV `tipo`) → canônico, fallback 'Other' (ingestão).
// `rehydrate`: rejeita valor fora do union vindo do banco (domínio rejeita estado inválido — adapters.md).

export type EntryType =
  | 'PIX'
  | 'TED'
  | 'DOC'
  | 'Fee'
  | 'Boleto'
  | 'DARF'
  | 'Investment'
  | 'Redemption'
  | 'Transfer'
  | 'Other';

export type EntryTypeError = 'invalid-entry-type';

export const VALUES: readonly EntryType[] = [
  'PIX',
  'TED',
  'DOC',
  'Fee',
  'Boleto',
  'DARF',
  'Investment',
  'Redemption',
  'Transfer',
  'Other',
];

const VALUE_SET: ReadonlySet<string> = new Set<string>(VALUES);

// Sinônimos do banco (chave já uppercased, sem acento) → canônico. Desconhecido cai em 'Other'.
const SYNONYMS: Readonly<Record<string, EntryType>> = {
  PIX: 'PIX',
  TED: 'TED',
  DOC: 'DOC',
  FEE: 'Fee',
  SRVCHG: 'Fee',
  TARIFA: 'Fee',
  BOLETO: 'Boleto',
  DARF: 'DARF',
  XFER: 'Transfer',
  TRANSFER: 'Transfer',
  TRANSFERENCIA: 'Transfer',
  INVEST: 'Investment',
  INVESTMENT: 'Investment',
  APLICACAO: 'Investment',
  RESGATE: 'Redemption',
  REDEMPTION: 'Redemption',
};

export const normalize = (raw: string): EntryType => {
  const key = raw.trim().toUpperCase();
  if (key.length === 0) return 'Other';
  return SYNONYMS[key] ?? 'Other';
};

export const rehydrate = (raw: string): Result<EntryType, EntryTypeError> =>
  VALUE_SET.has(raw) ? ok(raw as EntryType) : err('invalid-entry-type');
