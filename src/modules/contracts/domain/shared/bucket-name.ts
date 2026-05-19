import { type Result, ok, err } from '../../../../shared/result.ts';
import type { Brand } from '../../../../shared/brand.ts';

// Regras canônicas — refletem literalmente a documentação AWS S3:
// https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucketnamingrules.html
// Toda regra extra ("porque sim") foi rejeitada na revisão.

export type BucketName = Brand<string, 'BucketName'>;

export type BucketNameError =
  | 'bucket-name-too-short'
  | 'bucket-name-too-long'
  | 'bucket-name-invalid-chars'
  | 'bucket-name-must-start-alphanumeric'
  | 'bucket-name-must-end-alphanumeric'
  | 'bucket-name-consecutive-dots'
  | 'bucket-name-ip-address-format'
  | 'bucket-name-reserved-prefix'
  | 'bucket-name-reserved-suffix';

const MIN_LEN = 3;
const MAX_LEN = 63;

// Apenas a-z, 0-9, ponto e hífen — conjunto fechado da AWS.
const ALLOWED_CHARS = /^[a-z0-9.-]+$/;
const ALPHANUMERIC = /^[a-z0-9]$/;
// IPv4 dotted-quad. AWS rejeita qualquer string com este shape, mesmo octetos inválidos.
const IPV4_SHAPE = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;

// Prefixos reservados pela AWS. `sthree-configurator` precede `sthree-` na lista
// para que a mensagem de erro seja consistente (qualquer um dos dois rejeita).
const RESERVED_PREFIXES: readonly string[] = ['xn--', 'sthree-configurator', 'sthree-'];
const RESERVED_SUFFIXES: readonly string[] = ['-s3alias', '--ol-s3'];

const startsWithAny = (s: string, list: readonly string[]): boolean =>
  list.some((p) => s.startsWith(p));

const endsWithAny = (s: string, list: readonly string[]): boolean =>
  list.some((p) => s.endsWith(p));

export const BucketName = {
  create: (raw: string): Result<BucketName, BucketNameError> => {
    if (raw.length < MIN_LEN) return err('bucket-name-too-short');
    if (raw.length > MAX_LEN) return err('bucket-name-too-long');
    if (!ALLOWED_CHARS.test(raw)) return err('bucket-name-invalid-chars');
    // `charAt(i)` retorna sempre string (vazia se fora do range) — evita
    // `noUncheckedIndexedAccess` exigindo asserção. Comprimento já validado.
    const first = raw.charAt(0);
    const last = raw.charAt(raw.length - 1);
    if (!ALPHANUMERIC.test(first)) return err('bucket-name-must-start-alphanumeric');
    if (!ALPHANUMERIC.test(last)) return err('bucket-name-must-end-alphanumeric');
    if (raw.includes('..')) return err('bucket-name-consecutive-dots');
    if (IPV4_SHAPE.test(raw)) return err('bucket-name-ip-address-format');
    if (startsWithAny(raw, RESERVED_PREFIXES)) return err('bucket-name-reserved-prefix');
    if (endsWithAny(raw, RESERVED_SUFFIXES)) return err('bucket-name-reserved-suffix');
    return ok(raw as BucketName);
  },
};
