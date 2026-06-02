import { type Result, ok, err } from '../../../../shared/primitives/result.ts';

// Categoria do contrato (ADR-0032: atributo do próprio contrato → agregado).
// Enum autocontido — NÃO é vínculo ao módulo Orçamentário. Códigos literais EN;
// rótulo PT-BR (Avaliação/Operacional/Processo) no formatter da CLI/DTO.

export type Category = 'Evaluation' | 'Operational' | 'Process';
export type CategoryError = 'invalid-category';

const VALUES: ReadonlySet<string> = new Set<Category>(['Evaluation', 'Operational', 'Process']);

export const parse = (raw: string): Result<Category, CategoryError> =>
  VALUES.has(raw) ? ok(raw as Category) : err('invalid-category');
