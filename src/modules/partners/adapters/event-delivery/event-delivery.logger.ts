// Adapter default para EventDelivery (partners) — escreve JSONL em stdout e,
// opcionalmente, em arquivo. Replica `contracts/.../event-delivery.logger.ts`.
//
// Default antes de o consumer financial existir (US2 da #47). Auditoria em dev/staging.
// Erros de I/O no arquivo são silenciados (best-effort) — o log não pode bloquear o worker.

import { writeFile, appendFile } from 'node:fs/promises';
import process from 'node:process';

import { ok } from '#src/shared/primitives/result.ts';
import type { EventDelivery, ProcessedEvent } from '../../application/ports/event-delivery.ts';

type LogLine = Readonly<{
  eventId: string;
  eventType: string;
  schemaVersion: number;
  deliveredAt: string;
  payload: ProcessedEvent;
}>;

export const LoggerEventDelivery = (consumerId: string, logPath?: string): EventDelivery => ({
  consumerId,
  deliver: async (event: ProcessedEvent) => {
    const line: LogLine = {
      eventId: event.eventId,
      eventType: event.eventType,
      schemaVersion: event.schemaVersion,
      deliveredAt: new Date().toISOString(),
      payload: event,
    };

    const jsonl = JSON.stringify(line) + '\n';

    process.stdout.write(jsonl);

    if (logPath !== undefined) {
      try {
        await appendFile(logPath, jsonl, 'utf8');
      } catch {
        // I/O de log não pode derrubar a entrega — silenciamos a falha.
      }
    }

    return ok(undefined);
  },
});

/**
 * Cria (ou trunca) o arquivo de log antes de iniciar o worker.
 * Exposto para testes que precisam de um arquivo limpo.
 */
export const createLogFile = async (logPath: string): Promise<void> => {
  await writeFile(logPath, '', 'utf8');
};
