/**
 * A decisão "isto é produção?" — em um lugar só, normalizada (#606).
 *
 * Quatro guards decidiam isso por igualdade estrita contra `'production'`, cada um repetindo a
 * mesma linha. `NODE_ENV=Production` num taskdef fazia três deles concluírem "não é produção" e
 * DEGRADAREM: driver caindo para memória, link de e-mail com default `localhost`, chave JWT
 * virando par efêmero. Todos com aviso, nenhum com erro. O quarto — a comparação invertida de
 * `shared/http/app.ts` — fazia o oposto e pior: EXPUNHA em produção a superfície que o próprio
 * comentário promete nunca expor ali.
 *
 * O critério de desempate vem do precedente que já existia do lado certo: `rbac-mode.ts` resolve
 * o valor desconhecido como `enforced`, o modo restritivo. Aqui vale o mesmo — entre reconhecer
 * produção a mais (restringe) e a menos (degrada em silêncio), o lado seguro é o restritivo. Por
 * isso `prod` conta, e por isso a comparação é sobre o valor normalizado inteiro: `preproduction`
 * e `production-like` são ambientes distintos, não produção, e casar por prefixo os capturaria.
 */

const PRODUCTION_ALIASES: ReadonlySet<string> = new Set(['production', 'prod']);

export const isProductionEnv = (env: Readonly<Record<string, string | undefined>>): boolean => {
  const raw = env['NODE_ENV'];
  return raw === undefined ? false : PRODUCTION_ALIASES.has(raw.trim().toLowerCase());
};
