// Compositor PURO do rótulo do Plano Orçamentário (REP-3 · #446 Slice C).
//
// Um `bgp_budget_plans` não tem campo "nome": é `(programa, ano, versão maj.min)` + `scenarioName`
// opcional. A P.O. definiu o rótulo (autonomia do módulo — ADR-0006/0051; o reports só reflete):
//
//   label = scenarioName ?? `Programa ${programName} ${year} v${versionMajor}.${versionMinor}`
//
// Se o nome do programa não resolver (catálogo indisponível / ref órfã), o fallback é gracioso —
// `Plano ${year} v${maj}.${min}` — NUNCA quebra. `scenarioName` vazio conta como ausente.
//
// Só `string`/`number` na entrada e na saída: é formatação, não domínio (o read.ts OHS reflete
// PLAIN, sem importar `../domain/`).

export type PlanLabelInput = Readonly<{
  scenarioName: string | null;
  programName: string | null;
  year: number;
  versionMajor: number;
  versionMinor: number;
}>;

export const composePlanLabel = (input: PlanLabelInput): string => {
  if (input.scenarioName !== null && input.scenarioName.length > 0) {
    return input.scenarioName;
  }
  const version = `v${input.versionMajor}.${input.versionMinor}`;
  if (input.programName !== null && input.programName.length > 0) {
    return `Programa ${input.programName} ${input.year} ${version}`;
  }
  return `Plano ${input.year} ${version}`;
};
