declare const brand: unique symbol;

export type Brand<T, Tag extends string> = T & { readonly [brand]: Tag };
