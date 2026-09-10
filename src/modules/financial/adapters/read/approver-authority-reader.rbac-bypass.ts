/**
 * Decorator de `ApproverAuthorityReader` para `AUTH_RBAC_MODE=bypass` (ADR-0052).
 *
 * Sob bypass, o `/me` anuncia o catálogo inteiro e o `authorize` das rotas é no-op: o sistema promete
 * que todo autenticado é super-usuário. A `approval-policy` do domínio, porém, lia `payable:approve`
 * do banco cru e recusava — o usuário tomava uma negativa que contradizia o que o `/me` acabara de
 * lhe dizer. Este decorator elimina a contradição no lado da policy: sob bypass, `canApprove` é
 * verdadeiro para qualquer usuário que exista no `auth`.
 *
 * Três limites deliberados:
 *
 *   - `null` continua `null`. Usuário inexistente no `auth` segue produzindo `approver-not-found`:
 *     bypass afrouxa PERMISSÃO, nunca a existência do sujeito.
 *   - `limit` NÃO é tocado. Quem tem papel com teto continua limitado por ele (#299/#609). ⚠️ Para
 *     quem NÃO tem papel aprovador o teto lido é `null` — e `null` é SEM TETO (`maxLimit` devolve
 *     `null` para conjunto vazio, `user-read.drizzle.ts:42`; `approval-policy.ts:28-31` aprova).
 *     Na prática, sob bypass todo autenticado aprova qualquer valor. É a consequência aceita da
 *     decisão, não um efeito colateral esquecido.
 *   - `list` passa intacto. Ele alimenta os CANDIDATOS da cascata (`escalate`), que continua sendo
 *     roteamento de negócio e não controle de acesso: escalar para quem não tem papel aprovador
 *     mudaria para quem o documento é encaminhado, não quem pode aprová-lo.
 *
 * Comportamento transversal é decorator, nunca código dentro do provedor — a mesma regra que mantém
 * `withRateLimit`/sandbox fora do `nodemailer.ts`. Embutir isto no `user-read.drizzle.ts` faria o
 * `auth` mentir sobre os próprios papéis para todo consumidor, inclusive a tela de gestão de acessos.
 */

import { ok } from '#src/shared/primitives/result.ts';
import type { ApproverAuthorityReader } from '../../application/ports/approver-authority-reader.ts';

export const withRbacBypass = (reader: ApproverAuthorityReader): ApproverAuthorityReader => ({
  get: async (userId) => {
    const authority = await reader.get(userId);
    if (!authority.ok) return authority;
    if (authority.value === null) return authority;
    return ok({ ...authority.value, canApprove: true });
  },
  list: reader.list,
});
