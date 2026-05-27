# AUTH-VO-EMAIL — VO `Email` do módulo `auth`

## Origem

Série [ADR-0024](../../../handbook/architecture/adr/0024-identity-and-rbac-auth-module.md) (módulo `auth`),
primeiro ticket da Fase D (domínio puro). Backlog: [`.claude/.planning/AUTH-MODULE-TICKETS.md`](../../.planning/AUTH-MODULE-TICKETS.md).
`Email` é VO base do agregado `User` (D5) e identifica unicamente o usuário (`auth_user.email`).

## Estado atual

- Não existe módulo `auth` em `src/modules/`. Este é o primeiro arquivo de domínio.
- Infra de domínio reutilizável já existe: `shared/result.ts` (`ok`/`err`/`mapErr`/`combine`),
  `shared/brand.ts` (brand via `unique symbol`). Reusar — não recriar.

## Critérios de aceitação

- **CA1 (válido):** `Email(raw)` com endereço bem-formado → `ok(Email)` **normalizado** (trim + lowercase).
- **CA2 (vazio):** string vazia ou só espaços → `err('email-empty')`.
- **CA3 (formato):** sem `@`, sem domínio, espaços internos, múltiplos `@` → `err('email-invalid-format')`.
- **CA4 (tamanho):** acima de 254 caracteres (RFC 5321) → `err('email-too-long')`.
- **CA5 (branded):** `Email` não é atribuível a partir de `string` crua sem passar pelo smart constructor;
  valor interno acessível só via desbrand explícito. Sem `class`, sem `throw`, sem `new Error`.

## Fora de escopo

- **Unicidade** (`email-already-registered`) — é regra de repositório/use case (A2), não do VO.
- Persistência, schema `auth_*` (Fase P).
- Normalização Unicode/IDN avançada (punycode) — validação pragmática agora; refinar se requisito surgir.
- Verificação de entregabilidade (MX/SMTP) — não é responsabilidade do domínio.

## Notas

- **Skill:** `ts-domain-modeler`. Domínio 100% sync, puro, sem framework.
- **Idioma:** código EN; erros internos kebab EN (`'email-empty'` etc.).
- **Path sugerido:** `src/modules/auth/domain/identity/email.ts` (+ `errors.ts` do agregado via free functions,
  Padrão D). Confirmar layout no W0 com a SKILL.
- **Pipeline W0→W3:** W0 RED em `tests/modules/auth/domain/identity/email.test.ts` (`node:test`) antes de tocar `src/`.
- Espelhar o estilo de VOs existentes do módulo `contracts` (`satisfies RawShape as BrandedVO`, `import type`).
