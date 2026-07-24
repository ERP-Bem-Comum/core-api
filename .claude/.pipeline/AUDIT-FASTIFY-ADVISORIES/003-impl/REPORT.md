# W1 — AUDIT-FASTIFY-ADVISORIES (#573) — GREEN

Overrides em `pnpm-workspace.yaml` (molde dos overrides esbuild/fast-uri/brace-expansion já lá):

```yaml
find-my-way: '^9.7.0'        # fastify pede ^9.0.0; não existe 9.6.1, o patch está em 9.7.0 (dentro do major 9)
'@fastify/static': '^10.1.2' # fix 10.1.1+; NENHUM swagger-ui declara static ^10 (todos ^9.1.2) → força o major 10
```

Resolvido: `find-my-way@9.7.0`, `@fastify/static@10.1.2`.

**Validação:**

- `pnpm audit --prod --audit-level=high` → **No known vulnerabilities found** (exit 0).
- `swagger-guard.test.ts` (3/3) — a app boota com swagger-ui + static@10; `/docs/json` 200 em dev.
- `docs-static-serving.test.ts` (novo) — `GET /docs` (UI servida pelo static@10) → 200/302. Major 10 compatível.
- Suíte completa: 4441 testes, 0 fail.

**Por que override e não upgrade do swagger-ui:** nem o `@fastify/swagger-ui` latest (6.1.0) declara static ^10 —
todos pedem `^9.1.2`. Forçar o major 10 é o único caminho; a API `register(root/prefix)` que o swagger-ui
usa é estável entre 9 e 10 (validado pelos 2 testes de /docs). Se um dia o swagger-ui adotar static ^10,
o override vira redundante (não prejudica).
