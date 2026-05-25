/**
 * REGISTRY dos subcomandos da CLI do módulo Financial.
 *
 * Comandos reais entram via `FIN-CLI-APROVAR-TITULO` (primeiro) e sucessores
 * (`FIN-CLI-TRANSMITIR-TITULO`, `FIN-CLI-PROCESSAR-SAIDA-BANCARIA`,
 * `FIN-CLI-RUN-OUTBOX-WORKER`, etc.). Pattern espelha
 * `src/modules/contracts/cli/registry.ts`.
 */

import type { CliContext } from './context.ts';
import * as aprovarTitulo from './commands/aprovar-titulo.ts';
import * as mostrarTitulo from './commands/mostrar-titulo.ts';

export type SubCommand = Readonly<{
  descricao: string;
  help: string;
  run: (ctx: CliContext, argv: readonly string[]) => Promise<number>;
}>;

export const REGISTRY: Readonly<Record<string, SubCommand>> = {
  'aprovar-titulo': aprovarTitulo,
  'mostrar-titulo': mostrarTitulo,
};
