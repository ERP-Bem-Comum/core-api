import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';

/**
 * Correlation context — propaga um identificador de rastreamento por toda a
 * cadeia assíncrona de uma operação, sem passá-lo manualmente entre funções.
 *
 * Base: `node:async_hooks` `AsyncLocalStorage` (Stable). Primitive do shared
 * kernel — sem dependência externa, consumível por qualquer módulo. Usado hoje
 * pelo outbox worker para tornar os logs rastreáveis por iteração; preparado
 * para a Fase 2 (múltiplos módulos no mesmo processo, HTTP via Fastify).
 */

type CorrelationStore = Readonly<{ correlationId: string }>;

const storage = new AsyncLocalStorage<CorrelationStore>();

/** Roda `fn` num escopo de correlação com o id fornecido. Retorna o valor de `fn`. */
export const runWithCorrelation = <T>(correlationId: string, fn: () => T): T =>
  storage.run({ correlationId }, fn);

/** Roda `fn` num escopo de correlação com um UUID v4 recém-gerado. */
export const withNewCorrelation = <T>(fn: () => T): T =>
  storage.run({ correlationId: randomUUID() }, fn);

/** Id de correlação do escopo atual, ou `undefined` fora de qualquer escopo. */
export const currentCorrelationId = (): string | undefined => storage.getStore()?.correlationId;
