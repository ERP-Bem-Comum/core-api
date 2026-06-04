# Ticket SUPPLIERS-HTTP-REGISTER: cadastro de Fornecedor (S2)

> Fatia **S2** do `EPIC-SUPPLIERS-HTTP-V1`. POST de escrita (writer pool). Espelha P2 de colaboradores.

## Contexto

S1 entregou as leituras. A S2 entrega `POST /api/v1/suppliers` (`registerSupplier`) → **201 + Location**
(decisão do épico v1). Supplier não tem complete-registration. Invariante de domínio: **ao menos um**
payment target (bankAccount OU pixKey) — ausência → 422.

## Escopo

- **`adapters/http/composition.ts`** — supplier **writer** repo (memory: `makeInMemorySupplierStore`; mysql:
  `createDrizzleSupplierStore(writerHandle)`); expõe `registerSupplier`.
- **`adapters/http/supplier-schemas.ts`** — `createSupplierBodySchema` (name, email, cnpj[14], corporateName,
  fantasyName, serviceCategory, bankAccount{bank,agency,accountNumber,checkDigit}|null, pixKey{keyType,key}|null).
- **`adapters/http/supplier-plugin.ts`** — `POST /suppliers` (201 + Location); helper `writeErrorStatus`/`sendWriteError`
  (409 cnpj-duplicate/already-*, 404 not-found, 400 invalid-id, 422 invariante, 503 repo).

## Fora de escopo

- deactivate/reactivate → S3; PUT update (gap de domínio) → S-EDIT.

## Critérios de aceite

- [ ] `POST /suppliers` sem token → 401; sem `supplier:write` → 403.
- [ ] body válido (com bankAccount ou pixKey) → **201** + `Location: /api/v1/suppliers/{uuid}`.
- [ ] CNPJ duplicado → **409**; shape inválido (cnpj≠14) → **400** (Zod); CNPJ 14-díg DV inválido → **422**.
- [ ] **sem payment target** (bankAccount null + pixKey null) → **422** (`supplier-payment-target-required`).
- [ ] `tsc` + `format:check` + `test` + `lint` verdes; zero regressão.

## Referências

- `register-supplier.ts`, `supplier/errors.ts` (SupplierError), `payment-target.ts`, `handbook/legacy_docs/openapi.yaml:2566` (CreateSupplier).
- Padrão: P2 de `EPIC-COLLABORATORS-HTTP-V1`. ADR-0026/0027/0033.
