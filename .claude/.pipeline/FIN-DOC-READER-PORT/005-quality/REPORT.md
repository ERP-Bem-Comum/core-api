# W3 — GREEN — FIN-DOC-READER-PORT

Gate final de qualidade (skill `ts-quality-checker`). Os 4 gates rodados no **projeto inteiro** (política de regressão zero), após o W1 round 2 + W2 APPROVED round 2.

> **Nota:** o lint só rodou nesta wave (os rounds anteriores rodaram apenas typecheck). Expôs 5 erros **no próprio código do document-reader** — tratados aqui como regressão a corrigir agora (não "alheios"):
> - `prefer-readonly-parameter-types` no port + cascade (`bytes: Uint8Array` não tem variant readonly no TS 6) → `eslint-disable-next-line` com comentário, **seguindo o precedente de `contracts/.../document-storage.ts:47-52`**.
> - `require-await` em 3 fakes de `cascade.test.ts` (ligado em `tests/**`, ao contrário de `adapters/**`) → fakes trocados de `async () => ok(x)` para `() => Promise.resolve(ok(x))`.
> - `format:check`: 3 `specs/034-fin-documento-reader/*.md` → `prettier --write`.

## Gates (saída literal)

### 1/4 `pnpm run typecheck` — `tsc --noEmit`
```
EXIT_CODE=0   (zero diagnóstico)
```

### 2/4 `pnpm run format:check` — `prettier --check .`
```
All matched files use Prettier code style!
```

### 3/4 `pnpm run lint` — `eslint .`
```
0 errors, 0 warnings
```

### 4/4 `pnpm test` — `node --test` (suíte completa)
```
ℹ tests 3590
ℹ suites 1043
ℹ pass 3572
ℹ fail 0
ℹ skipped 18   (integração MySQL atrás de MYSQL_INTEGRATION — gate correto, não vermelho)
ℹ todo 0
ℹ duration_ms 96201
```

## Resultado

**Todos os 4 gates verdes.** Fatia 1 do motor de leitura (port + types minimizados + errors + mock + cascade skeleton) entregue, aderente a ADR-0050 (bytes/anti-SSRF), ADR-0023/0039 (EN no código), ADR-0018 (Money VO), sem duplicação de conceito de domínio. DoD satisfeita — desbloqueia `FIN-DOC-READER-NATIVE` e `FIN-DOC-READER-XML`.
