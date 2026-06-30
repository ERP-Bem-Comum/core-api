# 000 — Request CTR-SHARED-REORG-PRIMITIVES

> **Reorganização estrutural de `src/shared/`. Size XS.**
> Move 4 arquivos da raiz `src/shared/` para subpastas semânticas (`primitives/` e `utils/`). Mantém `index.ts` barrel com a mesma API pública. Refactor puro: zero mudança comportamental, zero novo símbolo, zero remoção.

## Justificativa

`src/shared/` antes desse ticket tinha 5 arquivos soltos na raiz misturados com 4 pastas:

```
src/shared/
├── brand.ts          ← solto
├── id.ts             ← solto
├── immutable.ts      ← solto
├── index.ts          ← barrel
├── result.ts         ← solto
├── adapters/
├── kernel/
├── ports/
└── utils/
```

Pedido do P.O. literal: "pode só organizar a pasta `src/shared/`? Pois tem um monte de arquivo solto e tals". Pré-condição para próximas evoluções (CTR-SHARED-IMMUTABLE Frente A continuação, novos VOs em `kernel/`, possível `result-async.ts`).

Critério de agrupamento: arquivos cuja semântica é **fundação funcional** (citados juntos em `handbook/interviews/0001-functional-ddd-domain-refresh.md` §Bloco B) ficam em `primitives/`. Wrapper de `node:crypto` é utility — vai com `date.ts` / `string.ts` em `utils/`.

## Renomeações

### Source (4 movimentos)

| De | Para |
| :--- | :--- |
| `src/shared/brand.ts` | `src/shared/primitives/brand.ts` |
| `src/shared/result.ts` | `src/shared/primitives/result.ts` |
| `src/shared/immutable.ts` | `src/shared/primitives/immutable.ts` |
| `src/shared/id.ts` | `src/shared/utils/id.ts` |

### Barrel (1 arquivo modificado)

| Arquivo | Mudança |
| :--- | :--- |
| `src/shared/index.ts` | Re-exports atualizados para apontar `./primitives/{brand,result,immutable}.ts` e `./utils/id.ts`. **API pública inalterada** (mesmos símbolos com mesmos tipos). |

### Imports a atualizar

Espalhados pelo repo. Inicialmente subestimei a contagem: o grep inicial só varreu `#src/shared/...` (subpath imports declarados em `package.json#imports`), o que deu **6 ocorrências**. Mas o codebase também usa **imports relativos** (`../../../shared/result.ts` etc) — após sweep completo: **~80 ocorrências em ~50 arquivos** distribuídos em `src/modules/contracts/`, `src/modules/notifications/`, `scripts/pipeline/`, `tests/`, `src/shared/kernel/`.

Quebrou inclusive o próprio `scripts/pipeline/state-cli.ts` (script que gerencia esse próprio pipeline), descoberto quando o W1 deste ticket tentou rodar `pnpm run pipeline:state init`. Lição registrada em [§ Lessons learned](#lessons-learned).

## Critérios de aceitação

- **CA1** — 4 arquivos movidos conforme tabela acima.
- **CA2** — Barrel `src/shared/index.ts` continua exportando `Result`, `ok`, `err`, `isOk`, `isErr`, `mapErr`, `combine`, `Brand`, `BrandOf`, `immutable`, `deepImmutable`, `newUuid`, `isUuidV4` — mesma assinatura, mesmos tipos.
- **CA3** — **TODOS** os imports atualizados, cobrindo: subpath imports (`#src/shared/...`), imports relativos longos (`../../../shared/...`), imports relativos curtos (`../result.ts` dentro de `src/shared/kernel/`), e dynamic imports (`await import(...)`).
- **CA4** — Suite de testes do `tests/shared/{brand,immutable,result}.test.ts` segue 55/55 GREEN.
- **CA5** — `pnpm run typecheck` reporta apenas erros pré-existentes do `CTR-STORAGE-S3-ADAPTER` em W0 RED esperado (`@aws-sdk/client-s3` não instalado, `document-storage.s3.ts` ainda não criado). Zero erro novo introduzido por este ticket.
- **CA6** — `scripts/pipeline/state-cli.ts` (e `state-io.ts`, `state-schema.ts`) voltam a executar.
- **CA7** — Format check OK (PostToolUse hook do Prettier rodou em arquivos editados durante W1).

## Estado das demais pipelines no momento do refactor

- **CTR-ADAPTERS-RENAME-PORT-PREFIX** — closed-green em 2026-05-22T12:27:56Z. Sem conflito com este ticket (mexia em `src/modules/contracts/adapters/`, não em `src/shared/`).
- **CTR-STORAGE-S3-ADAPTER** — in-progress W0 done (RED). Seus testes RED não foram afetados pelo refactor (importam de `#src/modules/contracts/adapters/storage/...`, não de `src/shared/...` diretamente).
- **CTR-ADAPTERS-CLEANUP-EVENT-BUS** — closed-green em 2026-05-22T12:13:52Z. Histórico já fechado.

## Lessons learned

1. **Grep de cobertura precisa varrer TODOS os estilos de import simultaneamente.** A regex inicial `from ['"]#src/shared/(brand|result|id|immutable)\.ts['"]` só capturou subpath imports e perdeu (a) imports relativos longos (`../../../shared/result.ts`), (b) imports relativos curtos dentro de `src/shared/kernel/` (`../result.ts`), e (c) dynamic imports (`await import('#src/shared/result.ts')`). Resultado: subestimei o impacto em **6 imports** quando na verdade eram **~80**. Quebrou `scripts/pipeline/` (que não estava nos paths varridos).

   **Padrão correto para refactor de mover arquivo:**
   ```bash
   # Captura TODOS os estilos
   grep -rnE "(shared/(brand|result|id|immutable))" . \
     --include="*.ts" --include="*.tsx" --include="*.js" --include="*.mjs" --include="*.cjs" \
     --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist
   ```
   Depois sed em batch: `s#/shared/result\.ts#/shared/primitives/result.ts#g` etc. Funciona porque a substring `/shared/X.ts` é única (não bate em `domain/shared/ids.ts` que tem outro nome final).

2. **Refactor estrutural mesmo sem mudança comportamental merece ticket formal.** Initial assessment foi "trivial, pode ir direto" baseado em ~10 paths. Realidade: ~80 paths + arquivo do próprio toolchain do pipeline quebrado. Este ticket retroativo registra o evento.

3. **Validar typecheck completo antes de declarar GREEN.** No W1 declarei "55/55 ✅" baseado apenas em `tests/shared/*.test.ts`. Faltou rodar `pnpm run typecheck` completo, que teria mostrado os 80 imports quebrados imediatamente.
