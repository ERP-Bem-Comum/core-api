/**
 * PUBLIC API do modulo partners — contrato do evento de e-mail transacional CollaboratorInvited
 * (PARTNERS-INVITE-DOMAIN-EVENT / ADR-0047).
 *
 * Outros modulos (ex.: notifications) consomem APENAS daqui (ADR-0006): recebem a OutboxRow lida
 * do `par_email_outbox` e a decodificam para o evento de dominio de e-mail (`PartnersEmailEvent`).
 * Payload AUTOCONTIDO (destinatario, link de autocadastro com token de uso unico, nome) — o
 * consumidor monta o e-mail sem conhecer o dominio do partners.
 *
 * Espelha `auth/public-api/email-events.ts`: schema_version=1, decoder versionado, erros trataveis
 * (sem throw). Adicionar variante NUNCA quebra v1; remover/renomear exige bump para v2.
 *
 * SEGURANCA (ADR-0047 §5): o payload carrega link/token (sensivel). Quem decodifica NAO loga o link.
 * ASCII puro.
 */

import { type Result, ok, err } from '#src/shared/primitives/result.ts';

// ─── Schema version ──────────────────────────────────────────────────────────

/** Schema version corrente do wire format do par_email_outbox. Bump em breaking changes. */
export const PARTNERS_EMAIL_SCHEMA_VERSION = 1 as const;

// ─── Event union estavel ──────────────────────────────────────────────────────

/** Colaborador convidado — o consumidor envia o e-mail de autocadastro com o link. */
export type CollaboratorInvitedEvent = Readonly<{
  type: 'CollaboratorInvited';
  email: string;
  autocadastroUrl: string;
  recipientName: string;
  occurredAt: Date;
}>;

/** Union estavel dos eventos de e-mail transacional do partners (contrato v1). */
export type PartnersEmailEvent = CollaboratorInvitedEvent;

// ─── Tagged errors (Padrao D) ──────────────────────────────────────────────────

export type PartnersEmailDecoderInvalidShape = Readonly<{
  tag: 'PartnersEmailDecoderInvalidShape';
  reason: string;
}>;
export type PartnersEmailDecoderSchemaVersionMismatch = Readonly<{
  tag: 'PartnersEmailDecoderSchemaVersionMismatch';
  expected: number;
  actual: number;
}>;
export type PartnersEmailDecoderUnknownEventType = Readonly<{
  tag: 'PartnersEmailDecoderUnknownEventType';
  eventType: string;
}>;

export type PartnersEmailDecoderError =
  | PartnersEmailDecoderInvalidShape
  | PartnersEmailDecoderSchemaVersionMismatch
  | PartnersEmailDecoderUnknownEventType;

const invalidShape = (reason: string): PartnersEmailDecoderInvalidShape => ({
  tag: 'PartnersEmailDecoderInvalidShape',
  reason,
});
const schemaVersionMismatch = (
  expected: number,
  actual: number,
): PartnersEmailDecoderSchemaVersionMismatch => ({
  tag: 'PartnersEmailDecoderSchemaVersionMismatch',
  expected,
  actual,
});
const unknownEventType = (eventType: string): PartnersEmailDecoderUnknownEventType => ({
  tag: 'PartnersEmailDecoderUnknownEventType',
  eventType,
});

// ─── Row (visao do consumidor) ──────────────────────────────────────────────────

/** Subconjunto da OutboxRow necessario para decodificar (o worker passa a row do par_email_outbox). */
export type PartnersEmailOutboxRow = Readonly<{
  eventType: string;
  schemaVersion: number;
  payload: string;
  occurredAt: Date;
}>;

// ─── helpers ────────────────────────────────────────────────────────────────────

const parseJson = (raw: string): Result<unknown, PartnersEmailDecoderError> => {
  try {
    return ok(JSON.parse(raw));
  } catch {
    return err(invalidShape('payload-not-json'));
  }
};

const parseJsonObject = (
  raw: string,
): Result<Record<string, unknown>, PartnersEmailDecoderError> => {
  const parsed = parseJson(raw);
  if (!parsed.ok) return parsed;
  if (typeof parsed.value !== 'object' || parsed.value === null) {
    return err(invalidShape('payload-not-an-object'));
  }
  return ok(parsed.value as Record<string, unknown>);
};

const requireString = (
  p: Readonly<Record<string, unknown>>,
  field: string,
): Result<string, PartnersEmailDecoderError> => {
  const v = p[field];
  if (typeof v !== 'string' || v.length === 0) {
    return err(invalidShape(`missing-or-invalid-field:${field}`));
  }
  return ok(v);
};

// ─── Decoder versionado v1 ────────────────────────────────────────────────────
//
// Recebe a OutboxRow (lida do `par_email_outbox`) e reidrata o `PartnersEmailEvent`. Falha (sem
// throw) com SchemaVersionMismatch / UnknownEventType / InvalidShape.

export const decodePartnersEmailEventV1 = (
  row: Readonly<PartnersEmailOutboxRow>,
): Result<PartnersEmailEvent, PartnersEmailDecoderError> => {
  if (row.schemaVersion !== PARTNERS_EMAIL_SCHEMA_VERSION) {
    return err(schemaVersionMismatch(PARTNERS_EMAIL_SCHEMA_VERSION, row.schemaVersion));
  }

  const parsedR = parseJsonObject(row.payload);
  if (!parsedR.ok) return parsedR;
  const p = parsedR.value;

  switch (row.eventType) {
    case 'CollaboratorInvited': {
      const email = requireString(p, 'email');
      if (!email.ok) return email;
      const autocadastroUrl = requireString(p, 'autocadastroUrl');
      if (!autocadastroUrl.ok) return autocadastroUrl;
      const recipientName = requireString(p, 'recipientName');
      if (!recipientName.ok) return recipientName;
      return ok({
        type: 'CollaboratorInvited',
        email: email.value,
        autocadastroUrl: autocadastroUrl.value,
        recipientName: recipientName.value,
        occurredAt: row.occurredAt,
      });
    }
    default:
      return err(unknownEventType(row.eventType));
  }
};
