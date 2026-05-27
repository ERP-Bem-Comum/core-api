import type { CliContext } from './context.ts';
import * as criarContrato from './commands/criar-contrato.ts';
import * as listarContratos from './commands/listar-contratos.ts';
import * as mostrarContrato from './commands/mostrar-contrato.ts';
import * as criarAditivo from './commands/criar-aditivo.ts';
import * as anexarDocumento from './commands/anexar-documento.ts';
import * as subirDocumento from './commands/subir-documento.ts';
import * as excluirDocumento from './commands/excluir-documento.ts';
import * as substituirDocumento from './commands/substituir-documento.ts';
import * as homologarAditivo from './commands/homologar-aditivo.ts';
import * as encerrarContrato from './commands/encerrar-contrato.ts';
import * as importarContratos from './commands/importar-contratos.ts';
import * as runOutboxWorker from './commands/run-outbox-worker.ts';

export type SubCommand = Readonly<{
  descricao: string;
  help: string;
  // Allowlist de flags do subcomando — exposta para o `main` validar flags
  // desconhecidas ANTES de carregar o state (CTR-CLI-VALIDATE-FLAGS-BEFORE-STATE).
  allowedFlags: readonly string[];
  run: (ctx: CliContext, argv: readonly string[]) => Promise<number>;
}>;

export const REGISTRY: Readonly<Record<string, SubCommand>> = {
  'criar-contrato': criarContrato,
  'listar-contratos': listarContratos,
  'mostrar-contrato': mostrarContrato,
  'criar-aditivo': criarAditivo,
  'anexar-documento': anexarDocumento,
  'subir-documento': subirDocumento,
  'excluir-documento': excluirDocumento,
  'substituir-documento': substituirDocumento,
  'homologar-aditivo': homologarAditivo,
  'encerrar-contrato': encerrarContrato,
  'importar-contratos': importarContratos,
  'run-outbox-worker': runOutboxWorker,
};
