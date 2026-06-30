export type { Result } from './primitives/result.ts';
export { ok, err, isOk, isErr, mapErr, combine } from './primitives/result.ts';

export type { Brand, BrandOf } from './primitives/brand.ts';

export { immutable, deepImmutable } from './primitives/immutable.ts';

export { exhaustiveStringUnion } from './primitives/exhaustive.ts';

export { newUuid, isUuidV4 } from './utils/id.ts';
