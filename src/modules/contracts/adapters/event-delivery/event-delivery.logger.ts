import { writeFile, appendFile } from 'node:fs/promises';
import process from 'node:process';

import { ok } from '../../../../shared/primitives/result.ts';
import type { EventDelivery, ProcessedEvent } from '../../application/ports/event-delivery.ts';

// ─── JSONL line shape ─────────────────────────────────────────────────────────

type LogLine = Readonly<{
  eventId: string;
  eventType: string;
  schemaVersion: number;
  deliveredAt: string;
  payload: ProcessedEvent;
}>;

// ─── LoggerEventDelivery ──────────────────────────────────────────────────────

/**
 * Adapter default para EventDelivery — escreve JSONL em stdout e,
 * opcionalmente, em arquivo.
 *
 * Formato de cada linha:
 * ```json
 * { "eventId": "...", "eventType": "...", "schemaVersion": 1, "deliveredAt": "ISO", "payload": { ... } }
 * ```
 *
 * Casos de uso:
 * - Default antes de módulos consumidores existirem (decisão D5 do plano Outbox).
 * - Auditoria em dev/staging: `pnpm run cli:contracts -- ... 2>&1 | grep eventType`.
 *
 * Erros de I/O no arquivo são silenciados (best-effort) — o evento não pode
 * bloquear o worker por falha de log em disco. O stdout é sempre tentado.
 *
 * Sempre retorna `ok(undefined)` — o logger não rejeita eventos.
 */
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

    // Stdout — best-effort, não bloqueia em caso de backpressure raro.
    process.stdout.write(jsonl);

    // Arquivo opcional — append; cria se não existir.
    if (logPath !== undefined) {
      try {
        await appendFile(logPath, jsonl, 'utf8');
      } catch {
        // I/O de log não pode derrubar a entrega — silenciamos a falha.
        // Em produção, o worker deve monitorar o disco via métricas externas.
      }
    }

    return ok(undefined);
  },
});

// ─── createLogFile helper (opcional) ─────────────────────────────────────────

/**
 * Cria (ou trunca) o arquivo de log antes de iniciar o worker.
 * Exposto para uso em testes que precisam de um arquivo limpo.
 */
export const createLogFile = async (logPath: string): Promise<void> => {
  await writeFile(logPath, '', 'utf8');
};
