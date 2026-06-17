# W3 — Gate de Qualidade (GREEN) · PAR-COLLABORATOR-SELF-REGISTRATION (US5)

**Agente:** ts-quality-checker · **Outcome:** GREEN.

| Comando | Resultado |
|---------|-----------|
| `pnpm run typecheck` (`tsc --noEmit`) | ✅ OK |
| `pnpm run format:check` (`prettier --check .`) | ✅ OK |
| `pnpm run lint` (`eslint .`) | ✅ OK |
| `pnpm test` (`node --test`) | ✅ **2730 tests · 2712 pass · 0 fail · 18 skipped** (integração gated por `MYSQL_INTEGRATION`) |
| `pnpm run test:integration:partners` (Docker MySQL) | ✅ **42 pass · 0 fail** (inclui `DrizzleCollaboratorInviteTokenStore` + migration `0014`) |

Política de regressão zero satisfeita: nenhuma falha não-endereçada; os 18 skipped são suites de integração atrás de opt-in (não falhas).

## Resumo da entrega (US5 — autocadastro público do colaborador)
- Convite uso-único (TTL 7d) minteado por CSPRNG, persistido como hash; rotas públicas `GET/POST /api/v1/collaborators/autocadastro` (404 uniforme anti-enumeração, 400 cpf-mismatch sem queimar token); mint+e-mail no `POST /collaborators` (na rota, sem poluir import).
- Caminho memory + mysql (schema `par_invite_tokens`, migration `0014`, repo Drizzle com `markUsed` atômico, mailer próprio).
- W2 (web-security-backend) APPROVED após corrigir 2 Majors (TOCTOU double-complete; rate-limit nas rotas públicas) + 2 Minors.

## Débito rastreado (fora do escopo, p/ issue)
- m1 (W2): redact de `req.query.token` em `src/shared/http/app.ts` — o `*.token` atual NÃO cobre o path da query; mitigado por `LOG_LEVEL=warn` default.
