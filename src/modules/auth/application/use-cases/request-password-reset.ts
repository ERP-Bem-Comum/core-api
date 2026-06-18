/**
 * requestPasswordReset - use case do fluxo de recuperacao (BE-REC-003). Imperative Shell.
 *
 * Anti-enumeracao (OWASP WSTG): o resultado NAO revela se a conta existe - email malformado,
 * inexistente ou desabilitado retornam ok(undefined) sem enviar nada; a rota responde sempre 202.
 * Quando o usuario existe e esta ativo: invalida tokens de reset pendentes anteriores, emite um novo
 * (TTL curto, hash persistido / claro no link), monta a URL a partir de ORIGEM CONFIAVEL injetada
 * (config do servidor, nunca header Host - anti Host-Header-Injection) e envia pelo mailer. ASCII puro.
 */

import { type Result, ok } from '../../../../shared/primitives/result.ts';
import type { Clock } from '../../../../shared/ports/clock.ts';
import * as Email from '../../domain/identity/email.ts';
import * as User from '../../domain/identity/user/user.ts';
import * as ResetToken from '../../domain/session/password-reset-token.ts';
import * as ResetTokenId from '../../domain/session/password-reset-token-id.ts';
import type { UserReader, UserRepositoryError } from '../../domain/identity/user/repository.ts';
import type {
  PasswordResetTokenRepository,
  PasswordResetTokenRepositoryError,
} from '../../domain/session/password-reset-token-repository.ts';
import type { PasswordResetTokenMinter } from '../ports/password-reset-token-minter.ts';
import type {
  PasswordResetMailer,
  PasswordResetMailerError,
} from '../ports/password-reset-mailer.ts';
import { passwordResetRequestedMessage } from '../email-events.ts';

export type RequestPasswordResetCommand = Readonly<{ email: string }>;

export type RequestPasswordResetError =
  | UserRepositoryError
  | PasswordResetTokenRepositoryError
  | PasswordResetMailerError;

type Deps = Readonly<{
  userReader: UserReader;
  resetTokenRepo: PasswordResetTokenRepository;
  minter: PasswordResetTokenMinter;
  mailer: PasswordResetMailer;
  clock: Clock;
  resetTtlSeconds: number;
  /** Origem confiavel do link (config do servidor). NUNCA derivada do header Host da request. */
  resetBaseUrl: string;
}>;

export const requestPasswordReset =
  (deps: Deps) =>
  async (cmd: RequestPasswordResetCommand): Promise<Result<void, RequestPasswordResetError>> => {
    const email = Email.parse(cmd.email);
    if (!email.ok) return ok(undefined);

    const found = await deps.userReader.findByEmail(email.value);
    if (!found.ok) return found;
    if (found.value === null) return ok(undefined);

    const active = User.parseActive(found.value);
    if (!active.ok) return ok(undefined);
    const user = active.value;
    const now = deps.clock.now();

    // Invalida tokens de reset pendentes anteriores (evita multiplos links validos).
    const unused = await deps.resetTokenRepo.findUnusedByUserId(user.id);
    if (!unused.ok) return unused;
    for (const token of unused.value) {
      const consumed = ResetToken.consume(token, now);
      if (consumed.ok) {
        const saved = await deps.resetTokenRepo.save(consumed.value);
        if (!saved.ok) return saved;
      }
    }

    // Emite o novo token.
    const secret = deps.minter.mint();
    const issued = ResetToken.issue({
      id: ResetTokenId.generate(),
      userId: user.id,
      tokenHash: secret.tokenHash,
      requestedAt: now,
      expiresAt: new Date(now.getTime() + deps.resetTtlSeconds * 1000),
    });
    if (!issued.ok) return ok(undefined);

    const resetUrl = `${deps.resetBaseUrl}?token=${secret.token}`;

    // AUTH-DOMAIN-OUTBOX (ADR-0047): grava o reset-token E o evento PasswordResetRequested na
    // MESMA tx (atomicidade — ADR-0015). O evento so e montado aqui (conta existe/ativa),
    // preservando a anti-enumeracao dos early-returns acima. Payload autocontido (destinatario
    // + link de uso unico); sensivel, nunca logado.
    const event = passwordResetRequestedMessage({
      userId: String(user.id),
      email: cmd.email,
      resetUrl,
      occurredAt: now,
    });
    const saved = await deps.resetTokenRepo.saveWithEvents(issued.value, [event]);
    if (!saved.ok) return saved;

    // Dark-launch: o envio de e-mail atual CONTINUA (sem regressao). O consumidor do evento
    // (fatia 02) ainda nao existe; por ora o evento apenas acumula no outbox.
    return deps.mailer.sendResetLink({ email: cmd.email, resetUrl });
  };
