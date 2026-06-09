import { type Result, ok, err } from '#src/shared/primitives/result.ts';

// Avaliação de serviço do fornecedor — Standard Type (Vernon, IDDD p.307): conjunto
// fechado de valores DESCRITIVOS, não código opaco. Smart constructor rejeita valor fora
// do conjunto (impede estado inválido — o argumento "doolars" de Vernon). O rótulo humano
// PT-BR (com acento) vive no dicionário do formatter, não aqui (ASCII, precaução strip-types).
// Ordem canônica: do pior ao melhor.

export type ServiceRating = 'RUIM' | 'REGULAR' | 'BOM' | 'OTIMO';

export type ServiceRatingError = 'invalid-service-rating';

const RATINGS: readonly ServiceRating[] = ['RUIM', 'REGULAR', 'BOM', 'OTIMO'];

const RATING_SET: ReadonlySet<string> = new Set<ServiceRating>(RATINGS);

export const parse = (raw: string): Result<ServiceRating, ServiceRatingError> => {
  const normalized = raw.trim().toUpperCase();
  return RATING_SET.has(normalized)
    ? ok(normalized as ServiceRating)
    : err('invalid-service-rating');
};

/** Catálogo canônico (read-only), do pior ao melhor. */
export const listServiceRatings = (): readonly ServiceRating[] => RATINGS;
