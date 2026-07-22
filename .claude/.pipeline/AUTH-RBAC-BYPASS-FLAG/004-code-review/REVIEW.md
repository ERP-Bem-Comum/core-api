# W2 — Code review de SEGURANÇA (ADR-0052)

> Agente: `security-backend-expert` (read-only, independente) · **Round 1 de 3** · Veredito inicial: **REJEITADO** (1 Major) → corrigido → **APROVADO**.

## Sem Blocker

O revisor **provou empiricamente** (script `fastify.inject` descartável) o comportamento. Verificou e
aprovou: fail-secure do resolver (9 variações de typo → `enforced`), cobertura dos dois hooks
(`authorize`+`hasPermission`), autenticação intacta (`requireAuth` não tocado, 401 no bypass),
validação de nome de permissão preservada no bypass, e que **nenhum worker/job** aplica RBAC (o
bypass é só na borda HTTP — ADR-0024). `SUM`/`GROUP BY` não se aplica aqui; ADR-0020 irrelevante.

## Major M1 — o "ponto único" era falso (erro meu no desenho)

Eu declarei ponto de estrangulamento único. **Errado:** 4 use cases do próprio auth fazem `authorize`
**embutido** (DD-USER-07), fora do wrapper — `assignRole`, `revokeRole`, e a alçada de aprovação em
`createUserByAdmin`/`updateUserProfile`. Continuavam **fail-closed no bypass**.

O revisor mostrou a ironia: se o bypass for ligado por causa do **#462** (ninguém tem permissão), a
**gestão de papéis fica travada** — justamente a rota para se auto-recuperar. Um lockout
chicken-and-egg que sobrevive à flag feita para evitá-lo. Falha para o lado seguro (não vaza), mas
contradiz o texto do ADR.

**Decisão do dono (perguntado, com o trade-off na mesa): bypass TOTAL.** A alternativa (gestão sempre
protegida) evitaria escalação persistida, mas deixaria o lockout. O dono escolheu consistência +
capacidade de recuperação, ciente de que uma role admin atribuída durante o bypass **sobrevive ao
desligar** (documentado no ADR-0052 §Consequências).

**Fix (code):** o tipo `RbacMode` desceu para o domínio (`domain/authorization/rbac-mode.ts`) — ele
agora atravessa application, não podia viver em `adapters/`. Helper `application/authorize-actor.ts`
centraliza *"bypass → ok; senão authorize"*. Os 4 use cases recebem `rbacMode` e usam o helper.

**Uma proteção NÃO cede ao bypass:** o `cannot-self-lockout` do `revokeRole` protege o **estado
persistido** (não deixar o sistema sem gestor quando o enforced voltar), não a autorização do ator —
é integridade, não permissão. Fica em qualquer modo, com comentário.

Prova: `assign-role.test.ts` — ator **sem** `user:assign-role` atribui a role em `bypass` (ok), toma
403 em `enforced`. O mesmo par que o revisor rodou à mão, agora travado.

## Minor M2 — banner sem teste → corrigido

O banner de boot (o único sinal do CA8) vivia inline no `server.ts`, sem teste — um refactor poderia
apagá-lo em silêncio, a exata condição que o ADR quer evitar. Extraído para `rbacBypassBanner(nodeEnv)`
(testável) + teste que trava o conteúdo (`RBAC DESLIGADA`, `SUPER-USUÁRIO`, `NODE_ENV`, a reversão).

## Minor M3 — visibilidade em runtime → aceito (YAGNI)

O bypass só é visível no stderr do boot; em ECS ninguém olha no dia a dia. O revisor concordou que o
ADR aceita isso conscientemente e sugeriu, **se um dia for revisitado**, expor `rbacMode` num endpoint
**interno** (nunca no `/health` público — não anunciar a atacante que o RBAC caiu). Registrado, não
implementado.

## Re-verificação

`typecheck` ✓ · `lint` ✓ · `format:check` ✓ · `pnpm test` → **4181 testes, fail 0** (baseline 4163
+ 18). Banner conferido no boot real (`AUTH_RBAC_MODE=bypass NODE_ENV=production`).

## Veredito final: **APROVADO** — round 1
