import { type Result, ok } from '../../../../shared/primitives/result.ts';
import type {
  QuarantinedObject,
  VanReturnQuarantineError,
  VanReturnQuarantineStore,
} from '../ports/van-return-quarantine-store.ts';

export type ListVanReturnQuarantineDeps = Readonly<{ quarantine: VanReturnQuarantineStore }>;

export type ListVanReturnQuarantineInput = Readonly<{ includeReleased: boolean }>;

export type ListVanReturnQuarantineOutput = Readonly<{
  items: readonly QuarantinedObject[];
  total: number;
}>;

/**
 * A CONSULTA da quarentena (#753) — o que fecha o "consultável" da DoD.
 *
 * Fino de propósito: a decisão de o que entra na quarentena é da varredura; aqui só se lê. O que
 * justifica o use case em vez de a rota falar com o port é a regra do DEFAULT — `includeReleased`
 * ausente significa "o que está preso agora", que é a pergunta operacional. Deixar esse default na
 * borda o espalharia por cada consumidor, e um deles acabaria devolvendo o histórico inteiro.
 *
 * Sem paginação, e isso é decisão, não esquecimento: a fila de presos é pequena por construção
 * (objeto sem envelope é transitório desde o van-agent PR #14) e, se um dia deixar de ser, o número
 * grande É a informação — paginar uma anomalia que cresceu a esconderia atrás de um `page=1`.
 */
export const listVanReturnQuarantine =
  (deps: ListVanReturnQuarantineDeps) =>
  async (
    input: ListVanReturnQuarantineInput,
  ): Promise<Result<ListVanReturnQuarantineOutput, VanReturnQuarantineError>> => {
    const found = await deps.quarantine.list({ includeReleased: input.includeReleased });
    if (!found.ok) return found;
    return ok({ items: found.value, total: found.value.length });
  };
