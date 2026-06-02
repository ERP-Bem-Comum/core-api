import { type Result, ok, err } from '#src/shared/primitives/result.ts';

// Categoria alimentar. ADR-0031 §D2: códigos legados LITERAIS (database.dbml
// Enum food_category). Rótulo PT-BR no formatter da CLI, não aqui.

export type FoodCategory =
  | 'ONIVORO'
  | 'VEGANO'
  | 'VEGETARIANO'
  | 'PESCETARIANO'
  | 'OUTRO'
  | 'PREFIRO_NAO_RESPONDER';
export type FoodCategoryError = 'invalid-food-category';

const VALUES: ReadonlySet<string> = new Set<FoodCategory>([
  'ONIVORO',
  'VEGANO',
  'VEGETARIANO',
  'PESCETARIANO',
  'OUTRO',
  'PREFIRO_NAO_RESPONDER',
]);

export const parse = (raw: string): Result<FoodCategory, FoodCategoryError> =>
  VALUES.has(raw) ? ok(raw as FoodCategory) : err('invalid-food-category');
