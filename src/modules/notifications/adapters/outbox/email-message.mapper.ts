// Mapper EmailMessage <-> payload do outbox (NOTIF-EMAIL-OUTBOX).
//
// `serializeEmailMessage`: EmailMessage -> string JSON gravada no `payload`.
// `rowToEmailMessage`: RowToProcessed<EmailMessage> — desserializa a row de volta em
//   EmailMessage reconstruindo branded types via parse. Qualquer falha (JSON inválido,
//   email malformado, sem destinatários) -> err: o worker genérico manda para a DLQ (CA6),
//   sem consumir tentativa nem chamar o sender.
//
// ADR-0020 (sem JSON nativo — serialização na aplicação). ADR-0006 (Result na borda).

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import type { RowToProcessed } from '#src/shared/outbox/index.ts';
import * as EmailAddress from '../../domain/email/address.ts';
import * as EmailSubject from '../../domain/email/subject.ts';
import type { EmailMessage } from '../../domain/email/types.ts';

type MapperError = Readonly<{ tag: string }>;

// Forma serializada (todos os branded viram string). Campos opcionais preservados.
type Wire = Readonly<{
  from: string;
  to: readonly string[];
  cc?: readonly string[];
  bcc?: readonly string[];
  subject: string;
  textBody: string;
  htmlBody?: string;
}>;

export const serializeEmailMessage = (message: EmailMessage): string => {
  const wire: Wire = {
    from: message.from,
    to: message.to.map((a) => a as string),
    ...(message.cc !== undefined ? { cc: message.cc.map((a) => a as string) } : {}),
    ...(message.bcc !== undefined ? { bcc: message.bcc.map((a) => a as string) } : {}),
    subject: message.subject,
    textBody: message.textBody,
    ...(message.htmlBody !== undefined ? { htmlBody: message.htmlBody } : {}),
  };
  return JSON.stringify(wire);
};

const parseAddresses = (
  raws: readonly string[],
): Result<readonly EmailAddress.EmailAddress[], MapperError> => {
  const out: EmailAddress.EmailAddress[] = [];
  for (const raw of raws) {
    const parsed = EmailAddress.parse(raw);
    if (!parsed.ok) return err({ tag: `invalid-address:${parsed.error}` });
    out.push(parsed.value);
  }
  return ok(out);
};

const isStringArray = (v: unknown): v is readonly string[] =>
  Array.isArray(v) && v.every((x) => typeof x === 'string');

// JSON.parse encapsulado em Result (sem `let` solto — init-declarations).
const parseJson = (raw: string): Result<unknown, MapperError> => {
  try {
    return ok(JSON.parse(raw));
  } catch {
    return err({ tag: 'payload-not-json' });
  }
};

// cc/bcc: undefined (ausente) ou lista parseada. Forma inválida → err com a tag dada.
const parseOptionalAddresses = (
  raw: unknown,
  tag: string,
): Result<readonly EmailAddress.EmailAddress[] | undefined, MapperError> => {
  if (raw === undefined) return ok(undefined);
  if (!isStringArray(raw)) return err({ tag });
  return parseAddresses(raw);
};

export const rowToEmailMessage: RowToProcessed<EmailMessage> = (row) => {
  const rawR = parseJson(row.payload);
  if (!rawR.ok) return rawR;
  const raw = rawR.value;
  if (typeof raw !== 'object' || raw === null) return err({ tag: 'payload-not-object' });
  const w = raw as Record<string, unknown>;

  if (typeof w['from'] !== 'string') return err({ tag: 'missing-from' });
  if (!isStringArray(w['to']) || w['to'].length === 0) return err({ tag: 'missing-recipients' });
  if (typeof w['subject'] !== 'string') return err({ tag: 'missing-subject' });
  if (typeof w['textBody'] !== 'string') return err({ tag: 'missing-text-body' });

  const from = EmailAddress.parse(w['from']);
  if (!from.ok) return err({ tag: `invalid-from:${from.error}` });

  const to = parseAddresses(w['to']);
  if (!to.ok) return to;

  const subject = EmailSubject.parse(w['subject']);
  if (!subject.ok) return err({ tag: `invalid-subject:${subject.error}` });

  // cc/bcc/htmlBody são opcionais — só reconstruídos se presentes e bem-formados.
  const cc = parseOptionalAddresses(w['cc'], 'invalid-cc');
  if (!cc.ok) return cc;
  const bcc = parseOptionalAddresses(w['bcc'], 'invalid-bcc');
  if (!bcc.ok) return bcc;

  const htmlBodyRaw = w['htmlBody'];
  if (htmlBodyRaw !== undefined && typeof htmlBodyRaw !== 'string') {
    return err({ tag: 'invalid-html-body' });
  }

  const message: EmailMessage = {
    from: from.value,
    to: to.value,
    subject: subject.value,
    textBody: w['textBody'],
    ...(cc.value !== undefined ? { cc: cc.value } : {}),
    ...(bcc.value !== undefined ? { bcc: bcc.value } : {}),
    ...(typeof htmlBodyRaw === 'string' ? { htmlBody: htmlBodyRaw } : {}),
  };
  return ok(message);
};
