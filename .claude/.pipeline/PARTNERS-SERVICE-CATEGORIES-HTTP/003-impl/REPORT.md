# W1 — Impl · PARTNERS-SERVICE-CATEGORIES-HTTP (🟡 GREEN funcional)
- domain/supplier/service-category.ts: + listServiceCategories() (read-only do CATEGORIES set, 39).
- supplier-schemas.ts: + serviceCategoriesSchema (z.array(z.string())).
- supplier-plugin.ts: GET /suppliers/service-categories (supplier:read).
Testes: domínio (3) + rota (3) = 6 pass / 0 fail.
