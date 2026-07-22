/**
 * withRateLimit - decorator de EmailSender (ADR-0010 "Decorators opcionais"). Ticket NOTIF-EMAIL-RATE-LIMIT (#133).
 *
 * Anti-flood por destinatario: sliding window IN-MEMORY (single-instance; Valkey deferido - ADR-0030).
 * Se qualquer destinatario (to+cc+bcc) ja atingiu `maxPerWindow` dentro de `windowMs`, o envio e RECUSADO
 * com `err({ tag: 'rate-limited' })` SEM delegar ao sender subjacente (descarte anti-flood). O consumidor
 * (email-event-delivery) mapeia `rate-limited` para descarte processado (nao retry/DLQ). Anti-enumeracao:
 * o rate-limit e assincrono (worker/sender), nao muda a resposta ao usuario no request.
 *
 * BOUND (CWE-770/400): o Map e limitado a `maxKeys` chaves — ao lotar, poda os expirados e evita a chave
 * mais antiga (FIFO), como a LRU bounded do @fastify/rate-limit (ADR-0030 nao licencia memoria ilimitada).
 *
 * `now` (epoch ms) e injetado para testabilidade da janela. ASCII puro.
 */

import { err } from '../../../../shared/primitives/result.ts';
import type { EmailSender } from '../../application/ports/email-sender.ts';
import type { EmailMessage } from '../../domain/email/types.ts';

export type RateLimitPolicy = Readonly<{
  windowMs: number;
  maxPerWindow: number;
  maxKeys?: number; // teto de destinatarios rastreados (default 100k) — anti resource-exhaustion.
}>;

const DEFAULT_MAX_KEYS = 100_000;

// Normalizacao MINIMA da chave: trim + lowercase (e-mail e case-insensitive no envelope). NAO tratamos
// sub-addressing (+tag) nem dot-Gmail: e por-provedor e agressivo demais canonicalizar de forma generica
// (juntaria enderecos legitimamente distintos). Decisao consciente (#133 M1) — nao efeito colateral.
const keyOf = (address: string): string => address.trim().toLowerCase();

// to + cc + bcc, deduplicado: cada caixa conta 1x por mensagem (fecha bypass por cc/bcc e `to` repetido).
const recipientsOf = (message: EmailMessage): readonly string[] => {
  const all = [...message.to, ...(message.cc ?? []), ...(message.bcc ?? [])].map((a) => keyOf(a));
  return [...new Set(all)];
};

export const withRateLimit = (
  sender: EmailSender,
  policy: RateLimitPolicy,
  now: () => number,
): EmailSender => {
  const maxKeys = policy.maxKeys ?? DEFAULT_MAX_KEYS;
  // destinatario (normalizado) -> timestamps (ms) dos envios ainda dentro da janela.
  const hits = new Map<string, number[]>();

  const fresh = (times: readonly number[], t: number): number[] =>
    times.filter((ts) => t - ts < policy.windowMs);

  // remove as chaves cujos timestamps ja expiraram por completo — impede crescimento monotonico.
  const sweepExpired = (t: number): void => {
    for (const [k, v] of hits) if (fresh(v, t).length === 0) hits.delete(k);
  };

  return {
    send: async (message) => {
      const t = now();
      const recipients = recipientsOf(message);

      // 1) verifica ANTES de registrar: se qualquer destinatario ja estourou, recusa o envio inteiro.
      for (const r of recipients) {
        if (fresh(hits.get(r) ?? [], t).length >= policy.maxPerWindow) {
          return err({ tag: 'rate-limited', reason: 'recipient over per-window limit' });
        }
      }

      // 2) dentro do limite: registra o timestamp de cada destinatario (poda os expirados) e delega.
      for (const r of recipients) {
        if (!hits.has(r) && hits.size >= maxKeys) {
          sweepExpired(t);
          while (hits.size >= maxKeys) {
            const oldest = hits.keys().next().value;
            if (oldest === undefined) break;
            hits.delete(oldest); // evicta o mais antigo (insertion order) — bound duro do Map.
          }
        }
        const kept = fresh(hits.get(r) ?? [], t);
        kept.push(t);
        hits.set(r, kept);
      }
      return sender.send(message);
    },
  };
};

/** Estado da config de rate-limit a partir do ambiente (SEMPRE ligado; `invalid` faz o boot falhar). */
export type RateLimitConfig =
  | Readonly<{ kind: 'on'; policy: RateLimitPolicy }>
  | Readonly<{ kind: 'invalid'; reason: string }>;

// Defaults SECURE-BY-DEFAULT (#133): 10 e-mails por destinatario por hora — folgado para uso legitimo
// (reset/convite), corta flood. Por-destinatario, nao global.
const DEFAULT_MAX_PER_WINDOW = 10;
const DEFAULT_WINDOW_MS = 3_600_000; // 1h

// LIGADO por padrao: EMAIL_RATE_LIMIT_MAX/_WINDOW_MS ausentes usam os defaults (nao desliga).
// O deploy so AJUSTA o numero. Valor presente-porem-invalido (0/negativo/nao-inteiro) => `invalid` =>
// boot falha alto (fail-loud, #133 M3, CWE-636). Nao ha opt-out por env (anti-abuso sempre ativo).
export const rateLimitConfigFromEnv = (
  env: Readonly<Record<string, string | undefined>>,
): RateLimitConfig => {
  const maxRaw = env['EMAIL_RATE_LIMIT_MAX'];
  const maxPerWindow =
    maxRaw !== undefined && maxRaw.trim().length > 0 ? Number(maxRaw) : DEFAULT_MAX_PER_WINDOW;
  if (!Number.isInteger(maxPerWindow) || maxPerWindow <= 0) {
    return { kind: 'invalid', reason: `EMAIL_RATE_LIMIT_MAX invalido: ${String(maxRaw)}` };
  }
  const windowRaw = env['EMAIL_RATE_LIMIT_WINDOW_MS'];
  const windowMs =
    windowRaw !== undefined && windowRaw.trim().length > 0 ? Number(windowRaw) : DEFAULT_WINDOW_MS;
  if (!Number.isInteger(windowMs) || windowMs <= 0) {
    return { kind: 'invalid', reason: `EMAIL_RATE_LIMIT_WINDOW_MS invalido: ${String(windowRaw)}` };
  }
  return { kind: 'on', policy: { windowMs, maxPerWindow } };
};
