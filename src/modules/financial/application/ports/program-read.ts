import type { Result } from '../../../../shared/primitives/result.ts';

// Port de LEITURA dos programas para o select (020 · US3). Projeção PRÓPRIA do financeiro `{id,name}`
// — satisfeito por consumo cross-módulo de `programs/public-api` (ADR-0006) ou por stub in-memory.
// Programa NÃO é dado local do financeiro (referência externa, sem tabela/agregado aqui).

export type ProgramView = Readonly<{ id: string; name: string }>;

export type ProgramReadError = 'program-read-unavailable';

export type ProgramReadPort = Readonly<{
  // Lista (projeção). Lista vazia → ok([]). Falha de infra → err (sem vazar Error).
  list: () => Promise<Result<readonly ProgramView[], ProgramReadError>>;
}>;
