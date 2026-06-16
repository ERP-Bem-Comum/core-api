# W2 — Code Review (FIN-LIST-DTO-LOCAL)

**Revisor**: agente `zod-expert` (read-only) · **Veredito**: ✅ **APPROVED** · **Round**: 1

## Resultado

| Dimensão | Status |
|----------|--------|
| Coerência das 3 camadas (domínio ↔ Drizzle ↔ in-memory ↔ schema) — nullability bate | OK |
| Schema de response (ADR-0027) — `grossValueCents` espelha `netValueCents`; sem rejeição de Draft com nulos | OK |
| Backward-compat (FR-009) — só adição; campos pré-existentes inalterados | OK |
| Mapper Drizzle — guard de corrupção do `grossValue` espelha `netValue`; cast de `paymentMethod` seguro (CHECK) | OK |
| `contractRef` = referência uuid (não o número) — coerente com Out of Scope | OK |
| Blockers / Majors | 0 / 0 |

## Minors (3)

- **#1 — aplicado**: `paymentMethod` no response era `z.string()` solto → trocado por `paymentMethodSchema.nullable()` (enum fechado; melhora o OpenAPI). Também `series` → `.max(20)` (espelha `varchar(20)`).
- **#3 — aplicado**: `contractRef` sem bound → `z.string().max(36).nullable()` (anti-DoS/bounds ADR-0027; conservador vs `z.uuid()` para não arriscar 500 em response com dado legado).
- **#2 — não aplicável (justificado)**: o caso "Draft com `grossValueCents`/`paymentMethod` null" **não é alcançável via API** — `grossValueCents` é obrigatório no `createDocumentBodySchema`, então um documento criado pela borda sempre tem bruto/forma. O `nullable` do schema é defensivo e já é coberto pela suíte de contrato in-memory (Draft). Não adiciono um teste HTTP de um estado inalcançável.

Typecheck verde; suíte HTTP financial 38/38. Segue para W3.
