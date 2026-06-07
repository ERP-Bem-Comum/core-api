# W2 — Code Review · AUTH-USECASE-SET-PHOTO

**Agente:** code-reviewer · **Round:** 1 · **Veredito:** APPROVED

## Checklist

- **Isolamento de módulo (ADR-0006)**: port `ProfilePhotoStorage` próprio do auth; não importa
  `DocumentStorage` de contracts. ✅
- **Application pura**: factory `(deps) => (cmd) => Promise<Result>`; importa port + domínio; sem infra. ✅
- **Validação tipo/tamanho (FR-012)** na application; MIME allowlist + limite de 5 MiB. ✅
- **Ordem segura**: `upload` precede `save` (agregado nunca referencia objeto inexistente); evento após save. ✅
- **Reuso**: `User.setPhoto` + `ProfilePhotoRef.parse` (Foundational), sem reescrita de domínio. ✅
- **Adapter in-memory** idempotente; `eslint-disable` de `prefer-readonly-parameter-types` no `Uint8Array`
  segue o padrão documentado do `DocumentStorage`. ✅

## Observações

- Magic bytes (defesa em profundidade) ficam na borda HTTP (ticket `AUTH-HTTP-PHOTO`).
- Key determinística `users/<id>`: uma foto por usuário, troca sobrescreve, remove apaga.

Sem issues bloqueantes.
