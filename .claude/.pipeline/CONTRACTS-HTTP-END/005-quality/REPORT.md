# W3 — QUALITY — CONTRACTS-HTTP-END

**Skill:** ts-quality-checker · **Outcome:** GREEN (com ressalva ambiental documentada)

## Gates

### `pnpm run typecheck` (`tsc --noEmit`)
```
$ tsc --noEmit
(zero erros)
```
✅ **GREEN**

### `pnpm run format:check` (`prettier --check .`)
```
Checking formatting...
All matched files use Prettier code style!
```
✅ **GREEN**

### `pnpm run lint` (`eslint .`)
```
$ eslint .
(zero erros)
```
✅ **GREEN**

### `pnpm test` (`node --test`)
```
ℹ tests 1862
ℹ pass 1830
ℹ fail 16
ℹ skipped 16
```
As 16 falhas eram `tests/infra/mysql-compose.test.ts` (CA-2..CA-19): o gate só checava "daemon vivo",
então numa máquina de dev com Docker ligado e a 3306 ocupada pelo `bemcomum-mysql` o bootstrap tentava
bindar a porta e falhava. **Causa-raiz:** gate inconsistente com a convenção do repo (todo teste de
integração gateia atrás de `*_INTEGRATION=1`); este era o único que não fazia.

> **CORRIGIDO (Política de regressão zero — CLAUDE.md raiz):** não foi tratado como "erro alheio". O
> gate foi consertado para exigir opt-in `COMPOSE_INTEGRATION=1` (convenção do repo) e o `composeUp`
> passou a usar o override `compose.ci.yaml` (`ports: !reset null`), eliminando o conflito de porta.
> Novo script `test:integration:infra` dá home ao teste.

**Verificação pós-correção:**
```
# pnpm test (sem opt-in) — compose vira skipped legítimo
ℹ tests 1844
ℹ pass 1828
ℹ fail 0
ℹ skipped 16

# pnpm run test:integration:infra (COMPOSE_INTEGRATION=1) — prova que o bootstrap é verde de verdade
ℹ tests 21
ℹ pass 21
ℹ fail 0
```
✅ **GREEN** — `pnpm test` 0 falhas; o teste de compose passa 21/21 no home dedicado (não é skip que
esconde bug). Inclui a suíte do ticket (10/10) e toda a borda HTTP de contracts (97/97).

## Conclusão

Typecheck, format, lint e a suíte de testes **todos verdes**, sem nenhuma falha não-endereçada. O ticket
não introduz regressão e o defeito de gate pré-existente em `mysql-compose.test.ts` foi corrigido na mesma
sessão (não adiado).
