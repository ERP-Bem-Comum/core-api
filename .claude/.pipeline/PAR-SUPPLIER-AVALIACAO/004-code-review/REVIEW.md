# 004 — W2 Review — PAR-SUPPLIER-AVALIACAO

**Veredito: APPROVED.**

- **Domínio puro**: VO `ServiceRating` segue o padrão `service-category` (Result, sem throw/class,
  conjunto fechado). Erro kebab EN. ADR-0020 respeitado (varchar + CHECK, não ENUM). ✅
- **Standard Type** corretamente aplicado (citação Vernon p.307 registrada em `006-traceability`). ✅
- **Opcionalidade**: avaliação `null` por construção; campos opcionais no input (não esconde regra —
  é genuinamente opcional). `?? null` nas bordas para `exactOptionalPropertyTypes`. ✅
- **Mapper** revalida o rating vindo do banco (row inválida → erro de mapper, não estado inválido). ✅
- **ETL**: legado sem avaliação → `null` explícito e comentado. ✅
- **Sem regressão**: 5 call-sites de teste preservados pela opcionalidade; ETL e teste do mapper
  ajustados. Suíte completa + integration verdes.

Observação (não-bloqueante): catálogo `GET /suppliers/service-ratings` exposto para o front popular o
select (CA2); valores ASCII (rótulo PT-BR acentuado fica no formatter).
