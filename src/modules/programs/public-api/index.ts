// Barrel da public-api do módulo programs (ADR-0006). Único ponto de import externo ao módulo.
// HTTP plugin e eventos seguem nos seus arquivos; aqui consolida-se o read port cross-módulo.

export {
  buildProgramsReadPort,
  type ProgramsReadPort,
  type BuildProgramsReadPortOptions,
  type BuildProgramsReadPortError,
  type ProgramReadPort,
  type ProgramReadError,
  type ProgramView,
} from './read.ts';
