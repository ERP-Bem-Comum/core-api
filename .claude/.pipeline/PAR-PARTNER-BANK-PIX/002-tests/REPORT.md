# W0 — Testes RED · PAR-PARTNER-BANK-PIX (US1 da feature 015)

**Agente:** tdd-strategist · **Outcome esperado:** RED (API inexistente)

## Escopo

Banco/PIX (`bankAccount`/`pixKey`, opcionais) em **Financier** e **Collaborator**; promoção do VO `payment-target` para `domain/shared/`; validação de `agency` (4 dígitos + DV opcional) → `invalid-bank-agency` (borda 422 `bank-agency-invalid`), harmonizada com Supplier/Act.

## Citação canônica (Princípio IX — fonte: fallback local `acdg/skills_base/shared-references/ddd/ddd--evans-livro-azul.md:1144-1145`)

> "When you care only about the attributes of an element of the model, classify it as a VALUE OBJECT. Make it express the meaning of the attributes it conveys and give it related functionality. Treat the VALUE OBJECT as immutable. Don't give it any identity and avoid the design complexities necessary to maintain ENTITIES.
> The attributes that make up a VALUE OBJECT should form a conceptual whole. For example, street, city, and postal code shouldn't be separate attributes of a Person object. They are part of a single, whole address, which makes a simpler Person, and a more coherent VALUE OBJECT."
> — Evans, *Domain-Driven Design* (livro azul), §Value Objects.

**Aplicação:** `BankAccount { bank, agency, accountNumber, checkDigit }` e `PixKey { keyType, key }` são *conceptual wholes* imutáveis sem identidade → VOs. Por serem usados por 4 agregados (Supplier, Act, Financier, Collaborator), pertencem a `domain/shared/` (não a `domain/supplier/`), evitando que 3 agregados dependam do agregado Supplier.

## Testes RED (devem FALHAR por inexistência da API)

| Teste | Arquivo | Falha esperada |
|-------|---------|----------------|
| Domínio: regex de agency | `tests/modules/partners/domain/shared/payment-target-agency.test.ts` | módulo `domain/shared/payment-target.ts` inexistente + erro `invalid-bank-agency` inexistente |
| Borda: Financier banco/PIX | `tests/modules/partners/adapters/http/financiers-bank-pix.routes.test.ts` | schema/DTO sem `bankAccount`/`pixKey`; agency inválida não rejeitada |
| Borda: Collaborator banco/PIX | `tests/modules/partners/adapters/http/collaborators-bank-pix.routes.test.ts` | schema/DTO do collaborator sem `bankAccount`/`pixKey` |
| Persistência: round-trip | `tests/modules/partners/adapters/persistence/financier-bank-pix.mapper.test.ts` | colunas/serialização inexistentes |

## CAs cobertos (US1)

CA1 (POST financier banco/PIX → 201 + GET retorna) · CA2 (POST collaborator idem) · CA3 (agency inválida → 422 `bank-agency-invalid`) · CA4 (keyType inválido → 422) · CA5 (PUT persiste) · CA6 (ambos opcionais).
