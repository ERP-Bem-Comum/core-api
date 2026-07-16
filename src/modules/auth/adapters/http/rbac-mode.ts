// Modo de operação do RBAC na borda (ADR-0052). Função pura, fail-secure.
//
// `bypass` liga SÓ com a palavra exata. Ausente, 'enforced' ou qualquer outro valor → 'enforced':
// um typo de env (ou um `=1`/`=true` copiado de outro lugar) NUNCA abre a autorização. É o oposto do
// fallback silencioso que os #456/#462/#474 combatem — aqui o default e o desconhecido são o SEGURO.

import type { RbacMode } from '../../domain/authorization/rbac-mode.ts';

export type { RbacMode };

export const resolveRbacMode = (env: Readonly<Record<string, string | undefined>>): RbacMode =>
  env['AUTH_RBAC_MODE'] === 'bypass' ? 'bypass' : 'enforced';

// Banner de boot do modo bypass (ADR-0052 §Guardas — não-silencioso). Extraído para ser testável:
// um refactor que apague o `stderr.write` no server.ts não pode passar sem um teste vermelho.
export const rbacBypassBanner = (nodeEnv: string): string =>
  '\n' +
  '################################################################\n' +
  '#  ⚠️  AUTORIZAÇÃO RBAC DESLIGADA (AUTH_RBAC_MODE=bypass)       #\n' +
  '#  TODO USUÁRIO AUTENTICADO É SUPER-USUÁRIO.                    #\n' +
  `#  NODE_ENV=${nodeEnv.padEnd(50)}#\n` +
  '#  A autenticação segue ativa; só a permissão por rota caiu.   #\n' +
  '#  Reversível: remova a env ou use AUTH_RBAC_MODE=enforced.     #\n' +
  '################################################################\n\n';
