/**
 * PUBLIC API do modulo auth — contrato dos eventos de e-mail transacional (ADR-0047 / NOTIF-EMAIL-EVENT-CONSUMER).
 *
 * Outros modulos (ex.: notifications) consomem APENAS daqui (ADR-0006): recebem a OutboxRow lida
 * do `auth_outbox` e a decodificam para o evento de dominio de e-mail (`AuthEmailEvent`). Payload
 * AUTOCONTIDO (destinatario, link/token de uso unico, nome) — o consumidor monta o e-mail sem
 * conhecer o dominio do auth.
 *
 * Espelha `contracts/public-api/events.ts`: schema_version=1, decoder versionado, erros trataveis
 * (sem throw). Adicionar variante NUNCA quebra v1; remover/renomear exige bump para v2.
 *
 * SEGURANCA (ADR-0047 §5): o payload carrega link/token (sensivel). Quem decodifica NAO loga o link.
 * ASCII puro.
 */

import { type Result, ok, err } from '#src/shared/primitives/result.ts';

// ─── Schema version ──────────────────────────────────────────────────────────

/** Schema version corrente do wire format do auth_outbox. Bump em breaking changes. */
export const AUTH_EMAIL_SCHEMA_VERSION = 1 as const;

// ─── Event union estavel ──────────────────────────────────────────────────────

/** Reset de senha solicitado — o consumidor envia o e-mail com o link de reset. */
export type PasswordResetRequestedEvent = Readonly<{
  type: 'PasswordResetRequested';
  email: string;
  resetUrl: string;
  occurredAt: Date;
}>;

/** Usuario convidado por admin — o consumidor envia o e-mail de ativacao/primeiro acesso. */
export type UserInvitedEvent = Readonly<{
  type: 'UserInvited';
  email: string;
  activationUrl: string;
  recipientName: string;
  occurredAt: Date;
}>;

/** Union estavel dos eventos de e-mail transacional do auth (contrato v1). */
export type AuthEmailEvent = PasswordResetRequestedEvent | UserInvitedEvent;

// ─── Tagged errors (Padrao D) ──────────────────────────────────────────────────

export type AuthEmailDecoderInvalidShape = Readonly<{
  tag: 'AuthEmailDecoderInvalidShape';
  reason: string;
}>;
export type AuthEmailDecoderSchemaVersionMismatch = Readonly<{
  tag: 'AuthEmailDecoderSchemaVersionMismatch';
  expected: number;
  actual: number;
}>;
export type AuthEmailDecoderUnknownEventType = Readonly<{
  tag: 'AuthEmailDecoderUnknownEventType';
  eventType: string;
}>;

export type AuthEmailDecoderError =
  | AuthEmailDecoderInvalidShape
  | AuthEmailDecoderSchemaVersionMismatch
  | AuthEmailDecoderUnknownEventType;

const invalidShape = (reason: string): AuthEmailDecoderInvalidShape => ({
  tag: 'AuthEmailDecoderInvalidShape',
  reason,
});
const schemaVersionMismatch = (
  expected: number,
  actual: number,
): AuthEmailDecoderSchemaVersionMismatch => ({
  tag: 'AuthEmailDecoderSchemaVersionMismatch',
  expected,
  actual,
});
const unknownEventType = (eventType: string): AuthEmailDecoderUnknownEventType => ({
  tag: 'AuthEmailDecoderUnknownEventType',
  eventType,
});

// ─── Row (visao do consumidor) ──────────────────────────────────────────────────

/** Subconjunto da OutboxRow necessario para decodificar (o worker passa a row do auth_outbox). */
export type AuthEmailOutboxRow = Readonly<{
  eventType: string;
  schemaVersion: number;
  payload: string;
  occurredAt: Date;
}>;

// ─── helpers ────────────────────────────────────────────────────────────────────

const parseJson = (raw: string): Result<unknown, AuthEmailDecoderError> => {
  try {
    return ok(JSON.parse(raw));
  } catch {
    return err(invalidShape('payload-not-json'));
  }
};

const parseJsonObject = (raw: string): Result<Record<string, unknown>, AuthEmailDecoderError> => {
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
): Result<string, AuthEmailDecoderError> => {
  const v = p[field];
  if (typeof v !== 'string' || v.length === 0) {
    return err(invalidShape(`missing-or-invalid-field:${field}`));
  }
  return ok(v);
};

// ─── Decoder versionado v1 ────────────────────────────────────────────────────
//
// Recebe a OutboxRow (lida do `auth_outbox`) e reidrata o `AuthEmailEvent`. Falha (sem throw) com:
//   - SchemaVersionMismatch: row.schemaVersion != AUTH_EMAIL_SCHEMA_VERSION
//   - UnknownEventType: eventType fora do contrato v1
//   - InvalidShape: payload corrupto / campo obrigatorio faltando

export const decodeAuthEmailEventV1 = (
  row: Readonly<AuthEmailOutboxRow>,
): Result<AuthEmailEvent, AuthEmailDecoderError> => {
  if (row.schemaVersion !== AUTH_EMAIL_SCHEMA_VERSION) {
    return err(schemaVersionMismatch(AUTH_EMAIL_SCHEMA_VERSION, row.schemaVersion));
  }

  const parsedR = parseJsonObject(row.payload);
  if (!parsedR.ok) return parsedR;
  const p = parsedR.value;

  switch (row.eventType) {
    case 'PasswordResetRequested': {
      const email = requireString(p, 'email');
      if (!email.ok) return email;
      const resetUrl = requireString(p, 'resetUrl');
      if (!resetUrl.ok) return resetUrl;
      return ok({
        type: 'PasswordResetRequested',
        email: email.value,
        resetUrl: resetUrl.value,
        occurredAt: row.occurredAt,
      });
    }
    case 'UserInvited': {
      const email = requireString(p, 'email');
      if (!email.ok) return email;
      const activationUrl = requireString(p, 'activationUrl');
      if (!activationUrl.ok) return activationUrl;
      const recipientName = requireString(p, 'recipientName');
      if (!recipientName.ok) return recipientName;
      return ok({
        type: 'UserInvited',
        email: email.value,
        activationUrl: activationUrl.value,
        recipientName: recipientName.value,
        occurredAt: row.occurredAt,
      });
    }
    default:
      return err(unknownEventType(row.eventType));
  }
};
