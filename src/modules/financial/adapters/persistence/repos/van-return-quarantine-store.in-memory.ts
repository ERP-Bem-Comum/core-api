import { type Result, ok } from '../../../../../shared/primitives/result.ts';
import type {
  QuarantinedObject,
  VanReturnQuarantineError,
  VanReturnQuarantineStore,
} from '../../../application/ports/van-return-quarantine-store.ts';

// Fake da quarentena de retorno (#753). Guarda por CHAVE do objeto, que é a identidade canônica —
// o nome do arquivo é atribuído pelo banco e pode ganhar sufixo desempatador em colisão.
//
// Reproduz as duas propriedades das quais os testes dependem, e que o adapter real terá de honrar:
//
//   1. `firstSeenAt` é gravado UMA vez. Reobservar move `lastSeenAt` e nada mais — é a idade da
//      anomalia, e reescrevê-la faria toda quarentena parecer recém-aberta a cada ciclo.
//   2. Reobservar REABRE. Um objeto que voltou a reprovar deixa de constar como liberado, senão a
//      consulta esconderia justamente o caso em que a proveniência regrediu.
export const createInMemoryVanReturnQuarantine = (): VanReturnQuarantineStore => {
  const rows = new Map<string, QuarantinedObject>();

  return {
    record: async (observations): Promise<Result<void, VanReturnQuarantineError>> => {
      for (const o of observations) {
        const existing = rows.get(o.key);
        rows.set(o.key, {
          key: o.key,
          reason: o.reason,
          observedSha256: o.observedSha256,
          ...(o.expectedSha256 !== undefined ? { expectedSha256: o.expectedSha256 } : {}),
          firstSeenAt: existing?.firstSeenAt ?? o.seenAt,
          lastSeenAt: o.seenAt,
        });
      }
      return Promise.resolve(ok(undefined));
    },

    release: async (keys, at): Promise<Result<void, VanReturnQuarantineError>> => {
      for (const key of keys) {
        const existing = rows.get(key);
        // Chave desconhecida é no-op: a varredura libera o que passou, e a maioria nunca esteve
        // presa. Tratar como erro faria o caso normal parecer anomalia.
        if (existing === undefined) continue;
        rows.set(key, { ...existing, releasedAt: at });
      }
      return Promise.resolve(ok(undefined));
    },

    list: async (filter): Promise<Result<readonly QuarantinedObject[], VanReturnQuarantineError>> =>
      Promise.resolve(
        ok(
          [...rows.values()]
            .filter((r) => filter?.includeReleased === true || r.releasedAt === undefined)
            .sort((a, b) => a.key.localeCompare(b.key)),
        ),
      ),
  };
};
