# Phase 1 — Quickstart: validar o refactor `004-http-facade-controllers`

> Como provar, **por ticket**, que o objeto-fachada não mudou comportamento. Pré-requisito do W0 (baseline) e critério
> do W3 (gate). Substitua `<modulo>` por `auth` | `contracts` | `partners` | `programs`.

## 0. Baseline de caracterização (W0 — antes de tocar `src/`)

Rode a suíte de rotas do módulo e **anote a contagem** (vira a baseline do SC-004):

```bash
pnpm test -- tests/modules/<modulo>/adapters/http/
```

Deve estar **verde**. Sem rede verde, não refatora (R3 / Fowler).

## 1. Refatorar (W1) — um módulo por ticket

Para cada plugin do módulo: handlers inline → `makeXController(deps, hooks)` **dentro** da closure `async (scope) => {}`;
cada `scope.route({ ..., handler: controller.<membro> })`. Helpers locais não-handler ficam fora da fachada.

## 2. Gate de zero-comportamento (W3)

```bash
pnpm run typecheck && pnpm run format:check && pnpm run lint && pnpm test
```

Tudo verde · contagem de testes **≥ baseline** · **sem alteração de asserção**.

## 3. Provar SC-001 (zero inline) e SC-002 (zero `class`/`this`) no módulo

```bash
# SC-002 — zero class/this na borda do módulo (heurística; esperado: sem saída)
grep -rnE '\b(class|this)\b' src/modules/<modulo>/adapters/http/ || echo "OK: zero class/this"

# SC-001 — nenhum handler inline remanescente (handler aponta p/ controller.<membro>, não arrow inline)
grep -rn 'handler: async (' src/modules/<modulo>/adapters/http/ || echo "OK: nenhum handler inline"
```

## 4. E2E de contrato (opcional — Bruno, ADR-0034)

As coleções `.bru` que exercem a borda do módulo devem passar **sem alteração** (smoke de contrato preservado).

## Definition of Done (por ticket)

- [ ] W0: suíte do módulo verde + contagem congelada.
- [ ] W1: todos os plugins do módulo convertidos a `makeXController`; helpers preservados fora.
- [ ] W2: review aprova — invariantes de contrato (ver `contracts/README.md`) intactos; sem `class`/`this`; fachada dentro da closure.
- [ ] W3: `typecheck`+`format:check`+`lint`+`test` verdes; testes ≥ baseline; sem alteração de asserção (exceto teste acoplado a detalhe interno, contado/justificado).
