# Inquiry-0011: Imutabilidade real de `Uint8Array` em TS 6 — TC39 watchlist

- **Status:** Watch (sem decisão pendente; revisitar quando a watchlist mover)
- **Opened:** 2026-05-22
- **Opened by:** Gabriel Aderaldo (durante `CTR-STORAGE-INMEMORY` W1)
- **Asked to:** Pesquisa em proposals TC39 + análise interna + audit pelo agente `nodejs-runtime-expert`
- **Impact:** Nenhum imediato. Critério explícito de revisita registrado abaixo.

---

## 1. Contexto

Durante a implementação do adapter `createInMemoryDocumentStorage` (`CTR-STORAGE-INMEMORY` W1), o helper privado `sha256hex(bytes: Uint8Array): string` disparou o lint `@typescript-eslint/prefer-readonly-parameter-types`. A mesma situação já tinha sido encontrada e documentada no port `DocumentStorage` (`src/modules/contracts/application/ports/document-storage.ts:31-36`), com a decisão de manter `eslint-disable-next-line` + defensive copy nos adapters.

A pergunta levantada foi: **existe alternativa idiomática para `Uint8Array` imutável em TS 6 + Node 24, ou alguma proposal TC39 que resolva isso no futuro próximo?**

---

## 2. Pergunta(s) feita(s)

> "Tem como tornar `Uint8Array` realmente imutável (tipo + runtime) sem custar perf, sem mentir no tipo, e sem quebrar interop com SDKs nativos (`createHash`, AWS SDK S3)?"

Sub-perguntas:

- `Object.freeze(uint8array)` funciona?
- Criar `ImmutableBytes` como branded type / wrapper resolveria?
- `Readonly<Uint8Array>` impede `arr[0] = x`?
- Composites + Records & Tuples TC39 cobrem esse caso?
- Immutable ArrayBuffer (Mark Miller) cobre?

---

## 3. Investigação

### 3.1 `Object.freeze(uint8array)` — não funciona

ECMAScript spec exige que integer-indexed properties de TypedArrays sejam `configurable: true, writable: true`. `Object.freeze` tenta marcar como non-configurable e **lança `TypeError`** em strict mode (ESM é strict por default).

```js
Object.freeze(new Uint8Array([1,2,3]));
// TypeError: Cannot freeze array buffer views with elements
```

Conclusão: `immutable()` do projeto (que é `Object.freeze` por trás) **não pode** ser aplicado a `Uint8Array` em runtime.

### 3.2 `Readonly<Uint8Array>` — não impede mutação

`Readonly<T>` em TS 6 mapeia `{ readonly [P in keyof T]: T[P] }`. Para `Uint8Array`, isso marca métodos como readonly, mas `[index: number]: number` escapa — `arr[0] = 99` e `arr.set(0, 99)` continuam passando o type checker.

Documentado literalmente em `document-storage.ts:33-34`:

> "`Uint8Array` não tem variant `readonly` nativo no TypeScript 6, e `Readonly<Uint8Array>` não impede `.set(0, x)`."

### 3.3 Branded types / wrappers

Tentativas internas exploradas durante o W1:

| Opção | Falha |
| :--- | :--- |
| `Brand<Uint8Array, 'ImmutableBytes'>` | Nominal; não impede mutação real. Fronteira com AWS SDK precisa de `Uint8Array` cru → cast anula o branding. |
| `Readonly<{ raw: Uint8Array }>` | `Object.freeze` shallow; `wrapper.raw[0] = 99` ainda passa. |
| `Omit<Uint8Array, 'set' \| 'fill' \| ...> & { readonly [index: number]: number }` | TS 6 não enforça `readonly` para index signatures de built-ins. É a "anotação mentirosa" que o port rejeita conscientemente. Manutenção: cada nova versão Node/TS pode adicionar métodos mutadores. |
| `Proxy` com trap `set` que lança | Quebra fast path V8 de TypedArrays (~10× perf). `createHash().update(proxy)` pode falhar (backing store interno). Viola "API nativa antes de trick" do `nodejs-runtime-expert`. |

Conclusão: **não existe "Uint8Array imutável honesto em TS 6"**. É limitação combinada de JavaScript spec + sistema de tipos TS 6.

### 3.4 TC39 Composites — resolve **parte** do problema

[`proposal-composites`](https://github.com/tc39/proposal-composites) (Stage 1 em 2026-05; substituiu Records & Tuples cancelados pelo TC39).

Resolveria:

- VOs planos imutáveis com **structural equality automática** (`Composite.equal(a, b)`)
- Chave de `Map` por valor (não reference)
- `StorageRef`, `Money`, `Period`, eventos de domínio — todos virariam composites

**NÃO resolveria `Uint8Array`** porque:

- Composites cobrem objetos plain + primitivos + outros composites
- TypedArrays **não são primitivos** — backing store em `ArrayBuffer` mutável por design
- Mesmo congelando o objeto `Uint8Array` em si, `arr.buffer` é o `ArrayBuffer` mutável escapando

### 3.5 TC39 Immutable ArrayBuffer — alvo direto

[`proposal-immutable-arraybuffer`](https://github.com/tc39/proposal-immutable-arraybuffer) (Mark Miller — Stage 1 em 2026-05).

Adicionaria:

- `ArrayBuffer.prototype.sliceToImmutable(): ArrayBuffer` — backing store realmente imutável
- `Uint8Array` sobre `ImmutableArrayBuffer` lança `TypeError` em qualquer mutação

**Composites + Immutable ArrayBuffer juntos** → ponta a ponta:

```ts
// hipotético, ~2-4 anos otimista
const bytes: ImmutableUint8Array = Uint8Array.from(input).buffer.sliceToImmutable();
const ref = Composite({ bucket, key, bytes });
```

### 3.6 Audit pelo `nodejs-runtime-expert`

Pergunta isolada feita ao agente especialista durante o W1 sobre o helper específico `sha256hex`. Veredito: **APPROVED como está**. Citação literal do agente:

> `hash.update(data[, inputEncoding])` aceita `data` como `string | Buffer | TypedArray | DataView` — citando `Crypto.md` linha 2050. `Uint8Array` é uma `TypedArray`. O parâmetro está semanticamente correto.
>
> A regra acerta o tipo errado; o comportamento já está protegido pela defensive copy feita em `upload` antes de chamar `sha256hex(copy)`. O `eslint-disable-next-line` é cosmético e correto, documenta a limitação conhecida do type system, espelha o padrão já estabelecido no port.

---

## 4. Estado da arte hoje no projeto

| Componente | Estratégia |
| :--- | :--- |
| Port `DocumentStorage.upload` | Aceita `Uint8Array` cru + `eslint-disable` comentado explicando trade-off |
| Adapter `createInMemoryDocumentStorage` | Defensive copy ENTRADA (`Uint8Array.from(input.bytes)`) antes de armazenar |
| Adapter `createInMemoryDocumentStorage` | Defensive copy SAÍDA (`Uint8Array.from(blob.bytes)`) antes de retornar |
| Tests CA-T9 / CA-T10 | Validam que mutação pelo caller (pré ou pós) NÃO corrompe o storage |
| Helper privado `sha256hex` | `eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types` consistente com o port |

Defensive copy é proteção **real em runtime** — independe de tipos. Custa O(n) por boundary mas é aceitável para o volume de documentos contratuais (KBs a MBs, não GBs).

---

## 5. Decisão

**Manter `eslint-disable` + defensive copy como padrão do projeto** para `Uint8Array`. Não introduzir tipo customizado próprio.

Razões:

1. Toda alternativa explorada falha por motivo técnico concreto (§3.3) ou viola princípio de design (proxy quebra interop, "anotação mentirosa" foi rejeitada pelo port).
2. Custo de criar tipo próprio seria alto e ganho seria **zero real** — mutação continua possível em runtime.
3. Fronteira com AWS SDK S3 (ticket #2 `CTR-STORAGE-S3-ADAPTER`) e Magalu Cloud (ticket #3) **vai precisar de `Uint8Array` cru** pra alimentar `PutObjectCommand.Body`. Todo wrapper teria que desempacotar na borda.

---

## 6. Critério de revisita

Reabrir esta inquiry quando **ambas** as condições abaixo forem verdade:

1. [`proposal-immutable-arraybuffer`](https://github.com/tc39/proposal-immutable-arraybuffer) atingir **Stage 3** no TC39
2. V8 (ou Node 26+) shipar `ArrayBuffer.prototype.sliceToImmutable` sob flag `--harmony` ou estável

Quando isso acontecer:

- Verificar se `@aws-sdk/client-s3` aceita `ImmutableUint8Array` em `PutObjectCommand.Body` (espera-se que sim — é subtype de `Uint8Array`).
- Avaliar refator do port `DocumentStorage` aceitando `ImmutableUint8Array` ao invés de `Uint8Array`.
- Avaliar uso conjunto com `proposal-composites` (se também avançar) para `StorageRef` e demais VOs.

Critério de **bônus** (não-bloqueante):

- TypeScript ganhar `ReadonlyUint8Array` nativo no `lib.es*.d.ts` (sem necessidade de proposal — TS team pode adicionar separadamente).

---

## 7. Referências

- TC39 Composites: https://github.com/tc39/proposal-composites
- TC39 Immutable ArrayBuffer: https://github.com/tc39/proposal-immutable-arraybuffer
- ECMAScript spec — TypedArray exotic objects: https://tc39.es/ecma262/#sec-typedarray-objects (não-mutável em proposal stage 1)
- `handbook/reference/nodejs/Crypto.md` — `hash.update()` aceita TypedArray
- Port `src/modules/contracts/application/ports/document-storage.ts:31-36` — trade-off documentado in-code
- Adapter `src/modules/contracts/adapters/storage/in-memory.ts` (ticket `CTR-STORAGE-INMEMORY` W1) — primeira aplicação do padrão na camada de adapter
- `.claude/.pipeline/CTR-STORAGE-INMEMORY/003-impl/REPORT.md` — implementação W1 + audit pelo `nodejs-runtime-expert`
