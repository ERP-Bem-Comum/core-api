# CTR-CI-HARDENING — endurecer o CI de qualidade

> **Size:** S · **Origem:** `.claude/.planning/EPIC-DEVOPS-FOUNDATION.md` §11 (D1), CA1.

## Escopo

Endurecer `.github/workflows/test-and-quality.yml`:
1. Bloco `permissions: contents: read` no topo (least-privilege).
2. Pin de **todas** as actions por **SHA** de 40 chars (comentário `# vX.Y.Z` ao lado).
3. `concurrency` com `cancel-in-progress: true` (PRs não empilham).
4. Job/step de `actionlint` validando os workflows.
5. Preservar a ordem dos gates: `typecheck → format:check → lint → audit → test`.

## Critérios de Aceite

- [ ] CA1 — `permissions: contents: read` presente antes de `jobs:`.
- [ ] CA2 — todo `uses:` de action remota pinado por SHA de 40 hex + comentário de versão.
- [ ] CA3 — `concurrency` com `cancel-in-progress: true`.
- [ ] CA4 — `actionlint` roda no CI (action pinada por SHA).
- [ ] CA5 — teste `tests/infra/ci-workflow-hardening.test.ts` verde.
- [ ] CA6 — gates W3 verdes localmente.

## Fora de escopo

- Integração no CI (D2), imagem (D3), deploy (D7).
