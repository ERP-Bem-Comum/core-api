export type Result<T, E> = Readonly<{ ok: true; value: T }> | Readonly<{ ok: false; error: E }>;

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });

export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });

export const isOk = <T, E>(r: Result<T, E>): r is Readonly<{ ok: true; value: T }> => r.ok;

export const isErr = <T, E>(r: Result<T, E>): r is Readonly<{ ok: false; error: E }> => !r.ok;

export const mapErr = <T, E, F>(r: Result<T, E>, f: (e: E) => F): Result<T, F> =>
  r.ok ? r : err(f(r.error));

export const combine = <T extends readonly unknown[], E>(results: {
  readonly [K in keyof T]: Result<T[K], E>;
}): Result<T, readonly E[]> => {
  const values: unknown[] = [];
  const errors: E[] = [];
  for (const r of results) {
    if (r.ok) values.push(r.value);
    else errors.push(r.error);
  }
  return errors.length > 0 ? err(errors as readonly E[]) : ok(values as unknown as T);
};
