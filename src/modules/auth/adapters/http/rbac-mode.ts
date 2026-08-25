// Modo de operação do RBAC na borda (ADR-0052). Função pura, e FAIL-SECURE.
//
// O default e o valor desconhecido caem no lado SEGURO: só a literal exata `bypass` desliga a
// autorização. Um typo de env — `BYPASS`, `true`, `1`, ` bypass` — resolve para `enforced` e nunca
// abre a autorização por acidente. É o que `rbac-mode.test.ts` prova em 11 casos (CA1/CA2/CA3).
//
// ⚠️ ESTA FUNÇÃO NÃO É O LUGAR DE FIXAR O MODO. Ela já foi, por um dia: para destravar a
// homologação, `resolveRbacMode` passou a devolver `'bypass'` incondicionalmente. O efeito colateral
// não estava no financeiro — estava aqui: os 11 casos acima passaram a falhar, porque a propriedade
// que eles protegem é justamente a que o hardcode apagou. Uma decisão operacional ("ligue o bypass
// agora") virou uma mudança de propriedade de segurança ("não existe mais lado seguro").
//
// Onde a decisão operacional mora é no composition root (`src/server.ts`), que é onde se escolhe
// COMO o sistema roda — enquanto esta função continua respondendo o que a configuração DIZ.

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
