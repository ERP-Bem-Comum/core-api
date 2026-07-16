# AUTH-RBAC-BYPASS-FLAG — escopo (ADR-0052)

> `AUTH_RBAC_MODE=bypass` — todo usuário autenticado vira super-usuário (autorização por permissão
> desligada), mantendo a autenticação. Size **S**. Decisão do dono (2026-07-16), registrada no
> **ADR-0052**. **Ligável em produção** — por isso os guardas anti-silêncio são parte do escopo.

## Problema / decisão

O RBAC do core-api é fail-closed e tem um **ponto único**: `authorize` (preHandler) e `hasPermission`
(checagem em handler), ambos produzidos por `buildAuthHttpDeps` e injetados em todos os módulos. O
dono decidiu operar com **todo logado = super-usuário**: a rota exige só *"está logado"*, não *"tem a
permissão X"*. Contexto: o RBAC vem cobrando custo operacional (403 mudo — #462/#466) desproporcional
ao valor no estágio atual.

## Escopo

1. **Resolver de config** — `resolveRbacMode(env): 'enforced' | 'bypass'`. Puro. `AUTH_RBAC_MODE`:
   `'bypass'` → bypass; ausente/`'enforced'`/**qualquer outro valor** → `enforced` (**fail-secure**:
   typo NUNCA abre o sistema).
2. **`AuthCompositionConfig`** ganha `rbacMode?: 'enforced' | 'bypass'` (default `enforced`).
3. **`buildAuthHttpDeps`** aplica: em `bypass`, `authorize(name)` retorna um preHandler **no-op**
   (passa direto) e `hasPermission` retorna sempre `true`. Em `enforced`, comportamento atual.
   `requireAuth` **não é tocado** em nenhum modo.
4. **`server.ts`** — lê `AUTH_RBAC_MODE`, popula a config, e **quando bypass, imprime o banner
   gritante no boot** (stderr) com o `NODE_ENV`.

## Critérios de aceite

- [ ] **CA1** — **Dado** `AUTH_RBAC_MODE` ausente, **Quando** `resolveRbacMode`, **Então**
      `'enforced'` (default seguro).
- [ ] **CA2** — **Dado** `AUTH_RBAC_MODE=bypass`, **Então** `'bypass'`.
- [ ] **CA3** — **Dado** um valor inválido (`'1'`, `'true'`, `'off'`, lixo), **Então** `'enforced'`
      (fail-secure — typo não abre).
- [ ] **CA4** — **Dado** `bypass` e um usuário logado **SEM** a permissão exigida, **Quando** acessa
      uma rota protegida, **Então** **passa** (200/2xx), não 403.
- [ ] **CA5** — **Dado** `enforced` (default) e o mesmo usuário sem a permissão, **Então** **403**
      (o comportamento atual não regride).
- [ ] **CA6** — **Dado** qualquer modo, **Quando** a requisição **não tem** `Bearer` válido,
      **Então** **401** — a autenticação é intacta ao bypass.
- [ ] **CA7** — **Dado** `bypass`, **Quando** `hasPermission` é consultado (autorização condicional
      em handler), **Então** `true` — senão campos vitais (partners) continuariam barrando.
- [ ] **CA8** — **Dado** `bypass` no boot, **Então** o `server.ts` emite o banner de aviso em stderr
      (não silencioso — ADR-0052 §Guardas).

## Fora de escopo

- Remover o RBAC do código (a flag preserva o default `enforced` — ADR-0052 §Alternativas).
- Auditoria/log por requisição do estado bypass (o banner de boot basta; YAGNI).
- Front.

## Invariantes

- Domínio de auth **intacto** — o bypass é só na composição da borda; `authorize`/`Role.hasPermission`
  não mudam (o RBAC continua correto, só não é chamado no modo bypass).
- Fail-secure: valor de env desconhecido → `enforced`. NUNCA o inverso.
- `requireAuth` nunca é afetado.
- Erros EN kebab-case; docs PT.
- Regressão zero: baseline **4163** testes, 0 falhas — os testes de RBAC existentes (403) devem
  continuar verdes (rodam em `enforced`, o default).

## Waves

| Wave | Agente/Skill | Saída |
| :--- | :--- | :--- |
| **W0** | `tdd-strategist` | `002-tests/REPORT.md` — RED |
| **W1** | `fastify-server-expert` (borda/hooks) | `003-impl/REPORT.md` |
| **W2** | `security-backend-expert` | `004-code-review/REVIEW.md` — máx 3 rounds |
| **W3** | `ts-quality-checker` | `005-quality/REPORT.md` |
