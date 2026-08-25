// Modo de operação do RBAC na borda (ADR-0052). Função pura.
//
// ⚠️ FIXADO EM `bypass` — decisão do dono (Gabriel, 24/08/2026), com o risco assumido por escrito.
// TODO usuário autenticado é super-usuário, em TODO ambiente, INCLUSIVE produção. A env
// `AUTH_RBAC_MODE` deixou de ser consultada: não existe mais como religar o RBAC por configuração.
// Religar passa a exigir editar este arquivo e fazer novo deploy — é o custo que o compromisso da
// #634 (religar após o aceite da VAN) paga a partir daqui.
//
// O que isto substituiu, e que era fail-secure:
//   env['AUTH_RBAC_MODE'] === 'bypass' ? 'bypass' : 'enforced'
// Ali o default e o valor desconhecido caíam no lado SEGURO — um typo de env nunca abria a
// autorização. Agora não há lado seguro: a função devolve `bypass` incondicionalmente.

import type { RbacMode } from '../../domain/authorization/rbac-mode.ts';

export type { RbacMode };

export const resolveRbacMode = (_env: Readonly<Record<string, string | undefined>>): RbacMode =>
  'bypass';

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
