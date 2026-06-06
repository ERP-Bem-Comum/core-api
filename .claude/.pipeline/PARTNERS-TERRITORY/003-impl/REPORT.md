# W1 — Impl · PARTNERS-TERRITORY (🟡→🟢) — implementado por subagente, validado pelo orquestrador

9 componentes (domínio PartnerState/PartnerMunicipality soft-delete; port; 4 use-cases; schema par_states/par_municipalities + migration 0005; repos in-memory+drizzle; plugin partner-geography; GEOGRAPHY_PERMISSION; wiring composition/server/public-api). Testes: domínio + rota + repo in-memory + integração mysql (opt-in). Território isolado: 36 pass.
