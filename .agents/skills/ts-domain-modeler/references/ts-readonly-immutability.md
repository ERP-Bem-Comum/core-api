# Readonly & Imutabilidade em TypeScript 6.0

> 📖 **Fonte canônica:** [`handbook/reference/typescript/Object Types.md`](../../../../../handbook/reference/typescript/Object%20Types.md) §readonly Properties + [`handbook/reference/typescript/Type Manipulation/Mapped Types.md`](../../../../../handbook/reference/typescript/Type%20Manipulation/Mapped%20Types.md) §mapping modifiers (linhas 56-68 — `CreateMutable`).

---

## 1. Princípio

> No `domain/`, **toda entidade é `Readonly<>`** e **todo array é `readonly T[]`**. Mudança de estado acontece por **cópia** com spread, nunca por mutação.

Motivos:

1. **Eventos de domínio precisam de snapshots imutáveis.** O `ocorridoEm: Date` de um evento `ContratoMaeCriado` não pode mudar depois.
2. **Concorrência** — múltiplos use cases lendo o mesmo agregado precisam de garantia de que ninguém muta o estado por baixo.
3. **Time travel / audit log** — para reconstruir estado em um ponto do passado, cada transição precisa ser uma nova instância.
4. **TypeScript não impede mutação em runtime, mas o compilador rejeita atribuição.** Isso pega 95% dos bugs em compile-time.

---

## 2. Três níveis de imutabilidade

### Nível 1 — `readonly` em campo

```ts
type Moeda = {
  readonly centavos: number; // não pode reassinar
};

const m: Moeda = { centavos: 100 };
m.centavos = 200; // ❌ TS2540
```

### Nível 2 — `Readonly<T>` no tipo todo

```ts
type ContratoBruto = {
  id: ContratoId;
  status: StatusContrato;
  valorOriginal: Moeda;
};

type Contrato = Readonly<ContratoBruto>;
// equivalente a:
// type Contrato = {
//   readonly id: ContratoId;
//   readonly status: StatusContrato;
//   readonly valorOriginal: Moeda;
// };
```

> **Recomendação:** declare diretamente com `readonly` em cada campo, ou use `Readonly<>` no alias. Não misture.

### Nível 3 — `readonly T[]` para arrays

```ts
type Contrato = Readonly<{
  id: ContratoId;
  aditivosHomologados: readonly AditivoId[]; // pode ler, não pode push/splice
}>;
```

⚠️ `Readonly<T>` **não** torna arrays internos `readonly`. Tem que declarar `readonly T[]` explicitamente:

```ts
type Bruto = { aditivos: AditivoId[] };
type Imutavel = Readonly<Bruto>;
// type Imutavel = { readonly aditivos: AditivoId[] }  ← aditivos[] AINDA é mutável!
```

Use:

```ts
type Imutavel = Readonly<{ aditivos: readonly AditivoId[] }>;
```

---

## 3. Mudança de estado por cópia

```ts
// errors.ts
export type ContratoError = 'contrato-ja-encerrado' | /* ... */;

// contrato.ts
export const encerrar = (
  contrato: Contrato,
  agora: Date,
): Result<Contrato, ContratoError> => {
  if (contrato.status === 'Encerrado' || contrato.status === 'Distratado') {
    return err('contrato-ja-encerrado');
  }
  return ok({
    ...contrato,
    status: 'Encerrado' as const,
    encerradoEm: agora,
  });
};
```

Observações:

- **`...contrato`** copia todos os campos.
- **`status: 'Encerrado' as const`** força tipo literal (preserva discriminated union).
- **Retorna `Result`**, não muta o argumento.
- **Não tem `this`**, nem `class.encerrar()`.

---

## 4. Operações imutáveis em arrays

| Mutável (proibido em domínio) | Imutável (correto)                  |
| :---------------------------- | :---------------------------------- |
| `arr.push(x)`                 | `[...arr, x]`                       |
| `arr.unshift(x)`              | `[x, ...arr]`                       |
| `arr.pop()`                   | `arr.slice(0, -1)`                  |
| `arr.splice(i, 1)`            | `arr.filter((_, idx) => idx !== i)` |
| `arr.sort(fn)`                | `arr.toSorted(fn)` (Node 20+)       |
| `arr.reverse()`               | `arr.toReverse()` (Node 20+)        |
| `arr[i] = x`                  | `arr.with(i, x)` (Node 20+)         |

> `toSorted`, `toReverse`, `with` são parte do **TC39 Change Array by Copy** — disponíveis a partir de Node 20. Versões anteriores: spread + sort em variável local copiada.

---

## 5. Imutabilidade em Dates

`Date` é mutável (`d.setHours(...)`) — mas as funções **não-set** (`getTime`, `toISOString`) são puras. Política no projeto:

- **Trate `Date` como imutável**: nunca chame `set*` em `Date` vindo de entidade de domínio.
- Para criar nova data baseada em outra, prefira `new Date(d.getTime() + delta)`.
- Considere usar **`Temporal`** (proposal estável no Node 24+) se a complexidade de timezone for crítica.

---

## 6. `as const` para literais

```ts
// ❌ TS infere `status: string`
const novo = { ...contrato, status: 'Encerrado' };

// ✅ TS infere `status: 'Encerrado'`
const novo = { ...contrato, status: 'Encerrado' as const };
```

Sem `as const`, a tipagem de discriminated union pode degradar para `string`, quebrando o exhaustive check em quem consome.

---

## 7. `DeepReadonly` (cuidado)

TypeScript não tem `DeepReadonly` nativo, mas pode-se derivar com Mapped Types recursivos:

```ts
type DeepReadonly<T> = {
  readonly [K in keyof T]: T[K] extends object ? DeepReadonly<T[K]> : T[K];
};
```

**Use com moderação.** Geralmente é melhor declarar `readonly` campo a campo. `DeepReadonly` aplicado em VOs complexos pode confundir mensagens de erro do TS.

---

## 8. Anti-padrões

| ❌ Errado                                          | ✅ Certo                                        |
| :------------------------------------------------- | :---------------------------------------------- |
| `contrato.status = 'Encerrado'`                    | `{ ...contrato, status: 'Encerrado' as const }` |
| `aditivos.push(novo)`                              | `[...aditivos, novo]`                           |
| `let contrato = ...; if (x) contrato.status = ...` | `const proximo = encerrar(contrato, agora)`     |
| `interface X { aditivos: Y[] }` em domínio         | `type X = Readonly<{ aditivos: readonly Y[] }>` |
| Reaproveitar a mesma instância em vários use cases | Cada operação devolve uma nova versão           |
| `as Mutable<Contrato>` para "destravar"            | Sinal de modelagem errada — repensar o caso     |

---

## 9. Performance

- **Spread em objetos pequenos é negligível** (< 50 campos). Em entidades reais o ganho de clareza compensa qualquer custo.
- **Spread em arrays grandes** (10k+ elementos) pode pesar. Em domínio raramente acontece — agregados têm dezenas, não milhares.
- **`structuredClone`** está disponível em Node 17+ para deep copy. Use só na borda do adapter, não no domínio.
