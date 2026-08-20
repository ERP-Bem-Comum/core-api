import { createHash } from 'node:crypto';

import type { Clock } from '../../../../shared/ports/clock.ts';
import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import type {
  QuarantineObservation,
  VanReturnQuarantineStore,
} from '../ports/van-return-quarantine-store.ts';
import type { VanStatus, VanStatusReader } from '../ports/van-status-reader.ts';
import type { VanStoragePort } from '../ports/van-storage.ts';
import {
  triageVanReturns,
  type ReturnObject,
  type QuarantinedReturn,
  type VanReturnTriage,
} from '../van-return-triage.ts';

export type ScanVanReturnsDeps = Readonly<{
  storage: VanStoragePort;
  statusReader: VanStatusReader;
  quarantine: VanReturnQuarantineStore;
  clock: Clock;
}>;

// Os baldes da triagem mais o que só a leitura conhece. `processable` sai como chave, e não como o
// par com a proveniência, porque esta fatia decide o que ENTRA — quem interpreta o conteúdo é a
// #690, e devolver o envelope aqui convidaria a processar antes de existir parser.
export type ScanVanReturnsOutput = Readonly<{
  processable: readonly string[];
  quarantined: readonly QuarantinedReturn[];
  missingObjects: readonly string[];
  unlogged: readonly string[];
  /** Listado no prefixo e ilegível na hora de ler. Não é quarentena: não houve o que triar. */
  unreadable: readonly string[];
}>;

export type ScanVanReturnsError =
  | 'van-returns-unavailable'
  | 'van-status-unavailable'
  | 'van-quarantine-persist-failed';

// Nome distinto do `sha256Hex` de `shared/utils/hash.ts` de propósito: aquele hasheia STRING como
// UTF-8, e usá-lo aqui reintroduziria exatamente a corrupção que `getBytes` existe para evitar.
// `utils/` não é a fronteira com `node:` (rule `shared-runtime`), então não há o que centralizar.
// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
const sha256OfBytes = (bytes: Uint8Array): string =>
  createHash('sha256').update(bytes).digest('hex');

type QuarantineWrites = Readonly<{
  record: readonly QuarantineObservation[];
  release: readonly string[];
}>;

/**
 * A política de ESCRITA da varredura — o que a triagem manda gravar e o que manda soltar.
 *
 * Vive separada do I/O de propósito: é a única parte com decisão dentro, e função pura é o que
 * permite exercitá-la sem bucket. O resto do use case é encanamento.
 */
const planQuarantineWrites = (
  triage: VanReturnTriage,
  observed: ReadonlyMap<string, string>,
  at: string,
): QuarantineWrites => {
  const record = triage.quarantined.map(
    (q): QuarantineObservation => ({
      key: q.key,
      reason: q.reason,
      // A chave veio do mesmo lote que o mapa: ausência aqui seria defeito de programação, não
      // estado possível do bucket. `??` mantém o tipo honesto sem inventar um erro que não existe.
      observedSha256: observed.get(q.key) ?? '',
      ...(q.expectedSha256 !== undefined ? { expectedSha256: q.expectedSha256 } : {}),
      seenAt: at,
    }),
  );

  // LIBERA-SE POR APROVAÇÃO, E SÓ POR ELA.
  //
  // Aprovação é o único desfecho em que se sabe POSITIVAMENTE que a suspeita se resolveu: o objeto
  // está lá, tem envelope, e o hash bate. Chave que nunca esteve presa é no-op no store.
  //
  // ⚠️ A alternativa examinada e recusada foi liberar também o que sumiu do bucket. Ela cura menos
  // do que parece e arrisca mais:
  //
  //   - `missingObjects` NÃO cobre o caso que motivaria a mudança. Ele deriva do índice de
  //     proveniência, isto é, de chaves reivindicadas por ENVELOPE. O objeto quarentenado por
  //     `missing-provenance` — o caso mais comum, a caixa é do convênio — não tem envelope algum, e
  //     por isso não aparece ali quando some.
  //   - Cobrir o caso de verdade exigiria liberar por AUSÊNCIA na listagem. Ausência em massa é
  //     exatamente o que uma falha de configuração produz: prefixo renomeado, credencial trocada,
  //     bucket errado — `listReturns` volta curta, sem erro e sem código de saída, e a varredura
  //     esvaziaria a quarentena inteira. É o raciocínio do CA5 espelhado: lá, quarentenar por um
  //     glob mal configurado represaria 100% dos pagamentos; aqui, liberar por listagem incompleta
  //     apagaria 100% das suspeitas.
  //   - E o prêmio é pequeno, porque o agente NÃO APAGA nada de `retorno/` (requisito da #690).
  //     Objeto não some sozinho; quando some, é intervenção manual ou incidente — e nesse caso
  //     mantê-lo na fila, com o `lastSeenAt` congelado à vista, é o desfecho desejado.
  //
  // `unlogged` também fica fora, e a razão ficou mais forte depois do van-agent PR #14: falha de
  // publicação passou a ser registrada antes da tentativa e republicada no ciclo seguinte. Objeto
  // sem envelope é transitório por contrato — se sobrevive a vários ciclos, é anomalia, e anomalia
  // não se solta.
  //
  // ⚠️ TRAVA PARA QUEM VIER DEPOIS: no dia em que existir um SEGUNDO caminho de release, o motivo
  // do release entra JUNTO, na mesma mudança — nunca depois. Com um caminho só não há o que
  // desambiguar e o histórico nasce inequívoco; com dois, um campo único acharia "resolveu-se" e
  // "não há mais o que observar", que pedem ações opostas. É o defeito do `correlacionado`, que o
  // van-agent já pagou uma vez (PR #12) e este arquivo documenta em `unloggedCyclePolicy`.
  const release = triage.processable.map((p) => p.key);

  return { record, release };
};

/**
 * A VARREDURA do prefixo de retorno (#753).
 *
 * Lê o que está no bucket, confere a proveniência contra os envelopes de recepção e grava a
 * quarentena. NÃO interpreta o conteúdo do arquivo — isso é a #690, e depende do layout de retorno,
 * que ninguém abriu ainda. Separar as duas é o que impede o erro que a #690 nomeia: um parser que
 * trata referência desconhecida como fatal falha o lote inteiro no primeiro dia de produção.
 *
 * Idempotente por desenho, como a irmã `confirmRemittance`: o agente não apaga nada, então o mesmo
 * objeto é relido a cada ciclo. Os baldes contam o que a passagem OBSERVOU, não o delta.
 */
export const scanVanReturns =
  (deps: ScanVanReturnsDeps) =>
  async (): Promise<Result<ScanVanReturnsOutput, ScanVanReturnsError>> => {
    const returnKeys = await deps.storage.listReturns();
    if (!returnKeys.ok) return err('van-returns-unavailable');

    const statusKeys = await deps.storage.listStatus();
    // Sem os envelopes, TODO objeto cairia em `missing-provenance` e a quarentena engoliria a fila
    // inteira por indisponibilidade do storage. Falhar a varredura é o desfecho honesto: nada se
    // sabe sobre proveniência agora, e o próximo ciclo tenta de novo.
    if (!statusKeys.ok) return err('van-status-unavailable');

    const objects: ReturnObject[] = [];
    const unreadable: string[] = [];
    const observed = new Map<string, string>();

    for (const key of returnKeys.value) {
      // BYTES, não texto: o SHA-256 do envelope é sobre o conteúdo como o banco o escreveu, e o
      // arquivo de retorno não é UTF-8. Ver o aviso no port do storage.
      const bytes = await deps.storage.getBytes(key);
      // Um objeto ilegível não aborta a varredura — os outros do lote dependem dela, e a leitura
      // pode falhar por indisponibilidade momentânea do bucket, não por defeito do arquivo.
      if (!bytes.ok) {
        unreadable.push(key);
        continue;
      }
      const sha256 = sha256OfBytes(bytes.value);
      observed.set(key, sha256);
      objects.push({ key, sha256 });
    }

    const receptions: VanStatus[] = [];
    for (const key of statusKeys.value) {
      const content = await deps.storage.getText(key);
      if (!content.ok) continue;
      const parsed = deps.statusReader.parse(key, content.value);
      // Envelope ilegível é reportado por `confirmRemittance`, que varre o MESMO prefixo e já tem o
      // balde `unreadable` para ele. Repetir a observação aqui daria dois alarmes para um defeito.
      // O efeito sobre esta varredura é o correto por construção: sem envelope legível não há prova
      // de origem, e o objeto cai em `missing-provenance`.
      if (!parsed.ok) continue;
      if (parsed.value.kind === 'reception') receptions.push(parsed.value);
    }

    const triage = triageVanReturns(objects, receptions);
    const writes = planQuarantineWrites(triage, observed, deps.clock.now().toISOString());

    const recorded = await deps.quarantine.record(writes.record);
    if (!recorded.ok) return err('van-quarantine-persist-failed');

    if (writes.release.length > 0) {
      const released = await deps.quarantine.release(
        writes.release,
        deps.clock.now().toISOString(),
      );
      if (!released.ok) return err('van-quarantine-persist-failed');
    }

    return ok({
      processable: triage.processable.map((p) => p.key),
      quarantined: triage.quarantined,
      missingObjects: triage.missingObjects,
      unlogged: triage.unlogged,
      unreadable,
    });
  };
