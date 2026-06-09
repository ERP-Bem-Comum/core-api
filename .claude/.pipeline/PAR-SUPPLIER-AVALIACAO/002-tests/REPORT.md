# 002 — W0 (RED) — PAR-SUPPLIER-AVALIACAO

Testes que falham por inexistência da feature (avaliação de fornecedor):

- `tests/modules/partners/domain/supplier/service-rating.test.ts` — VO `ServiceRating` (parse normaliza/valida/catálogo). RED: `service-rating.ts` não existe (MODULE_NOT_FOUND).
- `tests/modules/partners/domain/supplier/supplier-rating.test.ts` — `Supplier.register/edit/rehydrate` com `serviceRating`/`ratingComment` (opcional, normalização, rejeição de inválido). RED: agregado sem os campos.
- `tests/modules/partners/adapters/http/suppliers-rating.routes.test.ts` — catálogo `GET /suppliers/service-ratings`, detail expõe os campos, POST inválido → 422. RED: rota/campos inexistentes.

Confirmado RED.
