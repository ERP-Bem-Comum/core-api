// VO de versão do plano. O legado usa float (1.0, 1.1, 2.0) com semântica
// major = calibração / minor = cenário; aqui decompomos em inteiros para não
// herdar aritmética de ponto flutuante. Incrementos entram nas Fatias 3-4.
// Padrao D: consumir com `import * as PlanVersion from './version.ts'`.

export type PlanVersion = Readonly<{ major: number; minor: number }>;

export const initial = (): PlanVersion => ({ major: 1, minor: 0 });

export const format = (v: PlanVersion): string => `${String(v.major)}.${String(v.minor)}`;
