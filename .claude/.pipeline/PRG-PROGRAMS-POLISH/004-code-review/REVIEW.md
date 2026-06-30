# 004 — W2 Review (read-only) — PRG-PROGRAMS-POLISH

> Veredito: **APPROVED**. Round 1.

## Conformidade com a rule `api-collections.md` (ADR-0038)

- **Invariante #1 (executar de verdade)**: a coleção foi rodada via `bru run`
  (`pnpm run test:integration:all`) contra servidor + MySQL real e passou (PRINCIPAL rc=0,
  0 falhas no `main.json`). Não é cobertura ilusória. ✅
- **Invariante #2 (sintaxe)**: nenhum `.bru` começa com `#` (varredura ok); o `docs: |`
  multilinha inválido no `folder.bru` foi corrigido para `docs:` de uma linha (sintaxe
  suportada). Bodies alinhados ao schema Zod real (`schemas.ts`). ✅
- **Invariante #3 (auth/ordem)**: um único login do operador em `0-auth/08-…`
  (`programsOperatorToken`), reusado; `bareUserToken` reusado para os 403; encadeamento por
  `seq` + `setVar` (id/version capturados no create). Rodado num único `bru run` (token
  persiste). ✅
- **Invariante #4 (expected-fail isolado)**: nada de expected-fail introduzido; `8-programs`
  entra na suíte PRINCIPAL (deve passar), não em `z-pending-fixes`. ✅

## Cobertura

Ciclo de vida completo + erros: 401/403, 201+Location+corpo, 200 detalhe/lista, PUT 200 +
version-conflict 409, deactivate/reactivate 200 + guarda 409, sigla duplicada 409, nome/sigla
inválidos 422, logo 401/403/415. 40 asserções `PRG` verdes.

## Observações (não-bloqueantes)

1. **Logo 200 fora da coleção** — decisão consciente e documentada em `folder.bru`/REPORT: o
   upload binário fica nos testes `fastify.inject` (já verdes). Aceitável.
2. **Remap MinIO 9100** — necessário só localmente (conflito com Authentik do dev na 9000); o
   runner já parametriza `MINIO_API_PORT`, então o CI default (9000) não é afetado.

## Escopo respeitado

Nenhuma mudança em `src/modules/programs/**`. Sem regressão funcional; a borda observada bate
com o contrato `programs-http.md`.
