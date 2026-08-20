import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import { confirmTransmitted, markFailed } from '../../domain/remittance/remittance.ts';
import type { RemittanceRepository } from '../ports/remittance-repository.ts';
import type { VanStatusReader } from '../ports/van-status-reader.ts';
import type { VanStoragePort } from '../ports/van-storage.ts';

export type ConfirmRemittanceDeps = Readonly<{
  storage: VanStoragePort;
  statusReader: VanStatusReader;
  remittances: RemittanceRepository;
}>;

// Cada balde é um desfecho com ação operacional distinta — por isso não se fundem. `unreadable`
// (envelope corrompido) pede investigação do agente; `unmatched` (status de arquivo que não é nosso)
// é normal num bucket compartilhado; `conflicted` é status tardio contra remessa já resolvida.
//
// Os baldes contam o DESFECHO que a varredura observou, não o delta desta rodada: o agente não
// apaga nada, então o mesmo objeto de status é relido a cada passagem e uma remessa já confirmada
// volta a aparecer em `confirmed`. É a leitura honesta do que está no bucket.
export type ConfirmRemittanceOutput = Readonly<{
  confirmed: readonly string[];
  failed: readonly string[];
  ignored: readonly string[];
  unmatched: readonly string[];
  unreadable: readonly string[];
  conflicted: readonly string[];
  /**
   * Chaves que a varredura leu e não conseguiu persistir (#782).
   *
   * Carrega a CHAVE, não o nome do arquivo: é a chave que identifica o objeto no bucket, e é por ela
   * que se investiga. Carrega o erro junto porque, sem ele, o diagnóstico vira adivinhação — o
   * sintoma anterior era uma linha a cada 5 minutos dizendo que "a varredura falhou", sem dizer onde.
   */
  persistFailed: readonly VanStatusPersistFailure[];
}>;

export type VanStatusPersistFailure = Readonly<{ key: string; error: string }>;

/**
 * O ÚNICO erro que aborta a varredura — e a restrição é a correção (#782).
 *
 * `van-status-unavailable` significa "não consegui listar o prefixo": não há o que percorrer, e
 * insistir por chave não faria sentido. Falha ao persistir UMA chave é outra categoria e não sobe
 * mais para cá; vai para `persistFailed` e a varredura continua. A distinção precisa sobreviver a
 * qualquer refatoração: fundir as duas devolve o bloqueio que esta issue removeu.
 */
export type ConfirmRemittanceError = 'van-status-unavailable';

// Fecha a janela aberta pela geração: a remessa nasce `Queued` e só sai daí quando o `status/` do
// agente diz o que aconteceu (ADR-0060/0061). É a ÚNICA leitura que resolve uma remessa.
//
// Varredura idempotente por desenho. Roda quantas vezes for preciso: o agente não apaga objeto de
// status, e as transições do agregado preservam o primeiro desfecho.
export const confirmRemittance =
  (deps: ConfirmRemittanceDeps) =>
  async (): Promise<Result<ConfirmRemittanceOutput, ConfirmRemittanceError>> => {
    const keys = await deps.storage.listStatus();
    if (!keys.ok) return err('van-status-unavailable');

    const confirmed: string[] = [];
    const failed: string[] = [];
    const ignored: string[] = [];
    const unmatched: string[] = [];
    const unreadable: string[] = [];
    const conflicted: string[] = [];
    const persistFailed: VanStatusPersistFailure[] = [];

    for (const key of keys.value) {
      const content = await deps.storage.getText(key);
      // Um envelope ilegível não aborta a varredura: dezenas de outras remessas dependem dela, e
      // deixá-las `Queued` por causa de um JSON corrompido seria a falha mais cara das duas.
      if (!content.ok) {
        unreadable.push(key);
        continue;
      }

      const status = deps.statusReader.parse(key, content.value);
      if (!status.ok) {
        unreadable.push(key);
        continue;
      }

      // `reception` fala do RETORNO (issue #690), não de remessa: nenhuma remessa muda de estado
      // porque um arquivo chegou do banco.
      //
      // `duplicate` não é evidência de nada sobre a transmissão. Significa que o agente reconheceu
      // um nome já processado e NÃO acionou o STCPCLT nesta execução — não confirma, porque nada
      // saiu agora, e não falha, porque o envio original pode ter saído antes. Tratá-lo como falha
      // marcaria para descarte uma remessa que o banco possivelmente recebeu.
      if (status.value.kind !== 'remittance') {
        ignored.push(key);
        continue;
      }

      // Isolado por chave, como o envelope ilegível logo acima (#782). O comentário de lá já dizia a
      // regra — "dezenas de outras remessas dependem dela" — e a persistência era a única ramificação
      // que não a seguia: um `return` daqui abandonava o laço, e como o `listStatus` devolve em
      // ordem, TODA remessa cuja chave viesse depois nunca seria confirmada. O conjunto crescia a
      // cada envio novo.
      const found = await deps.remittances.findByFileName(status.value.fileName);
      if (!found.ok) {
        persistFailed.push({ key, error: found.error });
        continue;
      }
      if (found.value === null) {
        unmatched.push(status.value.fileName);
        continue;
      }

      // `situation` manda, e `exitCode` não entra na decisão: o veredito do agente vem de evidência
      // física (o arquivo sair da pasta de saída e aparecer em BACKUP), que é mais forte que código
      // de retorno.
      //
      // Tudo que não é `transmitido` — inclusive `revisao` — vira `Failed`, e isso é seguro por
      // construção: `Failed` NÃO libera os documentos. É o balde do "precisa de decisão humana",
      // e só o descarte explícito, com motivo, devolve os documentos à fila.
      const transmitted = deps.statusReader.wasTransmitted(status.value);
      const decided = transmitted
        ? confirmTransmitted(found.value, status.value.executedAt, status.value.detail)
        : markFailed(found.value, status.value.executedAt, status.value.detail);

      // Status tardio contra remessa já resolvida (um `falha` chegando depois de um `transmitido`,
      // ou qualquer coisa sobre uma remessa descartada). O agregado recusa o rebaixamento; aqui só
      // se registra que houve o conflito.
      if (!decided.ok) {
        conflicted.push(status.value.fileName);
        continue;
      }

      // As transições devolvem o MESMO objeto e NENHUM evento quando o desfecho já era esse.
      // Comparar por referência evita reescrever, a cada varredura, toda remessa já resolvida — o
      // agente nunca apaga o status, então sem isto a escrita cresceria sem teto, e o outbox junto.
      if (decided.value.remittance !== found.value) {
        const saved = await deps.remittances.save(decided.value.remittance, decided.value.events);
        // Mesma isolação do `findByFileName` acima, e o caso mais caro dos dois: é aqui que um
        // `detalhe` acima do teto da coluna derrubava a varredura inteira (#781 + #782).
        if (!saved.ok) {
          persistFailed.push({ key, error: saved.error });
          continue;
        }
      }

      (transmitted ? confirmed : failed).push(status.value.fileName);
    }

    return ok({ confirmed, failed, ignored, unmatched, unreadable, conflicted, persistFailed });
  };
