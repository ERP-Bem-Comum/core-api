/**
 * Hooks de autenticação/autorização HTTP do módulo auth (ADR-0024/0025).
 *
 * `makeRequireAuth(verifyAccessToken)` — preHandler: valida `Authorization: Bearer <jwt>` (defense-in-depth
 * sobre o BFF, ADR-0005); 401 uniforme se ausente/inválido; decora `request.userId`.
 * `makeAuthorize(userReader)(permission)` — preHandler: carrega o ActiveUser e aplica `authorize` (RBAC,
 * DD-USER-02); 403 se forbidden. Exposto para rotas protegidas por permissão (uso a partir das próximas levas).
 */

import type { FastifyReply, FastifyRequest, preHandlerAsyncHookHandler } from 'fastify';

import { currentCorrelationId } from '#src/shared/observability/correlation.ts';
import { toErrorEnvelope } from '#src/shared/http/errors.ts';

import type { TokenIssuer } from '../../application/ports/token-issuer.ts';
import type { UserReader } from '../../domain/identity/user/repository.ts';
import {
  type Permission,
  parse as parsePermission,
} from '../../domain/authorization/permission.ts';
import { authorize } from '../../domain/authorization/authorize.ts';
import * as UserId from '../../domain/identity/user-id.ts';
import * as User from '../../domain/identity/user/user.ts';

declare module 'fastify' {
  interface FastifyRequest {
    /** userId autenticado, populado por `requireAuth`. Vazio antes do preHandler. */
    userId: string;
  }
}

const reqId = (req: FastifyRequest): string => currentCorrelationId() ?? req.id;

const sendUnauthorized = (req: FastifyRequest, reply: FastifyReply): FastifyReply =>
  reply.code(401).send(toErrorEnvelope('unauthorized', 'Authentication required', reqId(req)));

const sendForbidden = (req: FastifyRequest, reply: FastifyReply): FastifyReply =>
  reply.code(403).send(toErrorEnvelope('forbidden', 'Forbidden', reqId(req)));

export const makeRequireAuth =
  (verifyAccessToken: TokenIssuer['verifyAccessToken']): preHandlerAsyncHookHandler =>
  async (req, reply) => {
    const header = req.headers.authorization;
    if (typeof header !== 'string' || !header.startsWith('Bearer ')) {
      return sendUnauthorized(req, reply);
    }
    const result = await verifyAccessToken(header.slice('Bearer '.length).trim());
    if (!result.ok) {
      return sendUnauthorized(req, reply);
    }
    req.userId = result.value.userId;
    return undefined;
  };

export const makeAuthorize =
  (userReader: UserReader) =>
  (required: Permission): preHandlerAsyncHookHandler =>
  async (req, reply) => {
    const idR = UserId.rehydrate(req.userId);
    if (!idR.ok) return sendUnauthorized(req, reply);

    const found = await userReader.findById(idR.value);
    if (!found.ok || found.value === null) return sendUnauthorized(req, reply);

    const active = User.parseActive(found.value);
    if (!active.ok) return sendForbidden(req, reply);

    if (!authorize(active.value, required).ok) return sendForbidden(req, reply);
    return undefined;
  };

/**
 * Checagem CONSULTÁVEL de permissão (não-preHandler): retorna boolean em vez de 401/403.
 * Para autorização condicional DENTRO do handler (ex.: editar campo vital exige permissão
 * elevada só quando o campo muda). Usa `req.userId` (populado por `requireAuth`). Qualquer
 * falha (sem userId, user inexistente/inativo, permissão inválida) → `false` (nega por padrão).
 */
export const makeHasPermission =
  (userReader: UserReader) =>
  async (req: FastifyRequest, permissionName: string): Promise<boolean> => {
    const required = parsePermission(permissionName);
    if (!required.ok) return false;

    const idR = UserId.rehydrate(req.userId);
    if (!idR.ok) return false;

    const found = await userReader.findById(idR.value);
    if (!found.ok || found.value === null) return false;

    const active = User.parseActive(found.value);
    if (!active.ok) return false;

    return authorize(active.value, required.value).ok;
  };
