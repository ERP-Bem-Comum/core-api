# Code Review — Ticket CTR-CONTRACT-REGISTRATION-METADATA — Round 1

**Veredito:** APPROVED

**Reviewer:** code-reviewer
**Data:** 2026-06-02
**Escopo revisado:** `domain/contract/{classification,contract-model,category,cost-center,types,errors,contract}.ts`; `application/use-cases/{contract-input-parse,create-contract,create-pending-contract,import-contracts}.ts`; `adapters/persistence/{schemas/mysql.ts,mappers/contract.mapper.ts,migrations/mysql/0008_true_anita_blake.sql,meta/0008_snapshot.json}`; `adapters/http/{schemas,contract-dto,plugin}.ts`; `cli/commands/criar-contrato.ts`; suítes de teste tocadas.

---

## Verificações dirigidas (do pedido W2)

1. **Isolamento ADR-0014/0006** ✅ — `classification`/`contractModel`/`category`/`costCenter` são VOs **próprios** de `domain/contract/`. Zero import de outro módulo; zero `SELECT` em tabela alheia. Os metadados são atributos intrínsecos do contrato (ADR-0032:42), não dado composto.
2. **R1 no lugar certo** ✅ — `validateServiceOrderCap` vive em `domain/contract/contract.ts` (não na borda). Erro é tagged (`ContractServiceOrderExceedsCap`, payload `cap`/`attempted`). `Money.greaterThan` garante "no teto passa, acima falha" (CA3). `SERVICE_ORDER_CAP` construído via smart constructor com fallback `ZERO` — **sem `throw`** no domínio.
3. **Idioma** ✅ — literais EN no domínio e na API (`classification`/`category`/`Evaluation`…). Rótulo PT (`Avaliação`/`categorizacao`) fica para o BFF (ADR-0032 §vocabulário). Nenhum PT vazou para o core.
4. **CA1 compile-time** ✅ — os 5 campos entram em `ContractRegistration` + `Create*Input`; `category`/`costCenter`/`observations` são `T | null` (não optional), logo omiti-los é erro de compilação — mais forte que "opcional".
5. **Backfill da migration** ✅ (com prova) — `0008` faz `ADD nullable → UPDATE → MODIFY NOT NULL`, seguro em base com dados (evita `ER_NO_DEFAULT_FOR_FIELD`) e no-op em base vazia. **Sem drift**: `pnpm run db:generate` retorna "No schema changes" e `0008_snapshot.json` reflete `notNull` correto, apesar do `.sql` ter sido editado à mão.
6. **Padrões do projeto** ✅ — tagged errors Padrão D; VOs `parse → Result` (padrão `occupation-area`); persistência `varchar`+CHECK, sem `ENUM` nativo (ADR-0020); CHECK de `category`/`costCenter` nuláveis correto (`NULL IN (...)` = NULL, aceito).

---

## Issues encontradas

### 🔴 Crítica (bloqueia approval)

Nenhuma.

### 🟡 Importante (não-bloqueia, registrar)

#### Issue 1 — `application/use-cases/import-contracts.ts:68` + `cli/commands/criar-contrato.ts:88,99`

**Categoria:** risco de dados.
**Problema:** import legado e CLI forçam `classification: 'Contract'` em **todos** os contratos. Uma Ordem de Serviço legada importada como `Contract` (a) é mal-classificada e (b) **contorna silenciosamente o teto R1** — uma OS de valor alto entra sem disparar `ContractServiceOrderExceedsCap`, justamente porque foi rotulada `Contract`.
**Esperado:** já registrado como follow-up no REPORT do W1. Aceitável para fechar o ticket (o canal primário é HTTP, onde o cliente informa a classificação real), mas o follow-up deve **bloquear** a importação massiva real até o parser CSV ganhar a coluna. Recomendo abrir o ticket de follow-up antes de qualquer import de produção.

### 🔵 Sugestão (estilo / robustez)

- **`adapters/http/schemas.ts` (body `contractWriteShape`):** `classification`/`contractModel` usam `z.string()` (validação no domínio → 422), coerente com `contractorType`. Efeito colateral: o **OpenAPI do request** não enumera os valores válidos (só o response, via `z.enum`). Trade-off consciente; se quiser request auto-documentado, `z.enum([...])` no body daria 400 mais cedo — mas mudaria o contrato de erro (400 vs 422). Registrar a decisão.
- **`observations`:** texto livre sem limite no Zod/domínio vs coluna `varchar(1000)`. **Consistente** com `title` (varchar 255) e `objective` (varchar 1000), que também não validam tamanho no domínio — não é regressão deste ticket. Idealmente a borda HTTP validaria `.max(1000)` para falhar com 400 claro em vez de erro de INSERT/truncamento. Vale para os três campos, em ticket de hardening.
- **Magic number `999_999`:** o teto aparece em `contract.ts` e nos testes. Extrair uma constante exportada (ex.: `SERVICE_ORDER_CAP_CENTS`) evitaria divergência futura.
- **`contract.mapper.ts` (`row.category ?? ''`):** o `?? ''` é defensivo inalcançável (o parse de `category` só roda quando `row.category !== null`). Inofensivo; pode simplificar para `row.category`.

---

## O que está bom

- **Backfill provado sem drift** — a edição manual do `.sql` preserva a consistência com o snapshot do drizzle-kit (raro de acertar; bem feito).
- **R1 modelada como invariante de domínio** com payload de evidência (D§23), não validação de borda — exatamente onde a ADR-0032 pede.
- **Isolamento limpo** — metadados como enums próprios mantêm o agregado autossuficiente; nenhuma fronteira de módulo cruzada.
- **Helper `parseRegistrationMetadata` compartilhado** elimina duplicação entre os dois use cases + import (DRY legítimo, validação única).
- **Cobertura HTTP forte** — CA5 cobre round-trip, R1→422 e enum inválido→422; suíte total 2009/2009 verde.
- **Idioma disciplinado** — EN no core, tradução PT delegada ao BFF.

---

## Próximo passo

**APPROVED** → pipeline-maestro avança para **W3** (gate `typecheck` + `format:check` + `lint` + `test` + **integração gated `MYSQL_INTEGRATION=1`** para CA8).

---

## Adendo — Round 1.1: issues endereçadas (2026-06-02, decisão Gabriel)

Após o APPROVED, o dono optou por corrigir as issues **antes** de fechar (em vez de adiá-las). Aplicado e re-validado (typecheck 0; suíte **2027 testes, 2010 pass, 0 fail**):

- **🟡 Issue 1 (import/CLI forçavam `Contract` → contornava R1) — RESOLVIDA.**
  - `import-contracts`: `ImportContractRow` ganhou `classificacao?`/`modelo?`; `import-parser` lê as colunas `classificacao`/`modelo` (opcionais); `toCreateCommand` usa o valor da linha com fallback `Contract`/`Service`. Uma OS no CSV agora **dispara R1** em vez de ser mascarada.
  - CLI `criar-contrato`: flags `--classificacao`/`--modelo` (opcionais, default `Contract`/`Service`); valor inválido → 422 no domínio.
  - **Teste novo** (`import-contracts.test.ts`): OS acima do teto **falha** com `ContractServiceOrderExceedsCap`; OS no teto é criada. Prova o fechamento do gap.
- **🔵 `observations` sem limite — RESOLVIDA:** `z.string().max(1000)` no body (casa com `varchar(1000)`; estouro → 400 claro).
- **🔵 magic number `999_999` — RESOLVIDA:** extraído `SERVICE_ORDER_CAP_CENTS` exportado de `contract.ts`; teste importa a constante.
- **🔵 `?? ''` no mapper — MANTIDO:** é exigência do type-checker (no ramo de erro, `row.category` é `string | null`); removê-lo quebra o typecheck. Inofensivo; documentado.
- **🔵 body `z.string()` — MANTIDO por design:** preserva o contrato de erro 422 (domínio) consistente com `contractorType`; trade-off consciente.

Resíduo: `category`/`costCenter`/`observations` na CLI/import seguem default (não afetam R1 nem segurança) — UX rica desses três é follow-up de baixa prioridade.
