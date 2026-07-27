// Compositor PURO do rótulo do Plano Orçamentário (REP-3 · #446 Slice C).
//
// Um `bgp_budget_plans` não tem campo "nome": é `(programa, ano, versão maj.min)` + `scenarioName`
// opcional. A P.O. definiu o rótulo (autonomia do módulo — ADR-0006/0051; o reports só reflete),
// alinhado ao PADRÃO do sistema de apresentar programa pela SIGLA (como nos dropdowns):
//
//   label = scenarioName ?? `${programAbbreviation} — ${programName}`   (ex.: "PARC — Parceria pela Alfabetização")
//
// Fallbacks graciosos (catálogo indisponível / ref órfã) — NUNCA quebra: só o nome se faltar a sigla;
// `Plano ${year} v${maj}.${min}` se faltar o programa inteiro. `scenarioName`/sigla/nome vazios contam
// como ausentes. Só `string`/`number` na entrada e saída: formatação, não domínio (o read.ts OHS reflete
// PLAIN, sem importar `../domain/`).

export type PlanLabelInput = Readonly<{
  scenarioName: string | null;
  programAbbreviation: string | null;
  programName: string | null;
  year: number;
  versionMajor: number;
  versionMinor: number;
}>;

const present = (v: string | null): v is string => v !== null && v.length > 0;

export const composePlanLabel = (input: PlanLabelInput): string => {
  if (present(input.scenarioName)) return input.scenarioName;
  if (present(input.programAbbreviation) && present(input.programName)) {
    return `${input.programAbbreviation} — ${input.programName}`;
  }
  if (present(input.programName)) return input.programName;
  return `Plano ${input.year} v${input.versionMajor}.${input.versionMinor}`;
};
