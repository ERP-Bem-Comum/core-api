# Result<T, E> Pattern em TypeScript 6.0

> 📖 **Fonte canônica:** [`handbook/reference/typescript/Narrowing.md`](../../../../../handbook/reference/typescript/Narrowing.md) (discriminated unions narrowing) + [`handbook/reference/typescript/Type Manipulation/Generics.md`](../../../../../handbook/reference/typescript/Type%20Manipulation/Generics.md) (parâmetros de tipo). O padrão `Result` é **idiomático em TS moderno** mas não está no handbook como tópico próprio — construímos sobre Generics + Discriminated Unions.

---

## 1. Princípio

> No domínio, **`throw` é proibido**. Toda operação que pode falhar retorna `Result<T, E>`. Erros são **valores**, não exceções.

Vantagens:

1. **Compilador força o consumidor a tratar erros** — não dá pra "esquecer" um caso.
2. **Erros tipados** — `E` é uma string literal union do contexto, não `Error` opaco.
3. **Composição funcional** — `map`, `flatMap`, `combine` permitem encadear sem try/catch.
4. **Limite claro** — `throw` só existe em adapters; conversão para `Result` acontece na borda.

---

## 2. Tipo canônico

```ts
// src/shared/result.ts
export type Result<T, E> =
  | Readonly<{ ok: true;  value: T }>
  | Readonly<{ ok: false; error: E }>;

export const ok = <T>(value: T): Result<T, never> =>
  ({ ok: true, value });

export const err = <E>(error: E): Result<never, E> =>
  ({ ok: false, error });

export const isOk = <T, E>(r: Result<T, E>): r is Readonly<{ ok: true; value: T }> =>
  r.ok;

export const isErr = <T, E>(r: Result<T, E>): r is Readonly<{ ok: false; error: E }> =>
  !r.ok;
```

Pontos-chave:

- **Discriminated union** com `ok: boolean` como discriminador.
- **`Readonly<>`** em ambas as variantes — Result é imutável.
- **`ok` e `err` retornam `Result<T, never>` ou `Result<never, E>`** — TS infere o lado faltante automaticamente quando o `Result` é atribuído.
- **Type guards `isOk` / `isErr`** com type predicates (`is`) para narrowing manual.

---

## 3. Uso típico em smart constructor

```ts
// src/modules/contratos/domain/shared/moeda.ts
import { type Result, ok, err } from '../../../../shared/result.ts';

export type Moeda = Brand<{ readonly centavos: number }, 'Moeda'>;

export type MoedaError =
  | 'moeda-valor-nao-inteiro'
  | 'moeda-valor-negativo';

export const Moeda = {
  fromCentavos: (centavos: number): Result<Moeda, MoedaError> => {
    if (!Number.isInteger(centavos)) return err('moeda-valor-nao-inteiro');
    if (centavos < 0) return err('moeda-valor-negativo');
    return ok({ centavos } as Moeda);
  },
};

// Uso
const r = Moeda.fromCentavos(15050);
if (isOk(r)) {
  // r.value é Moeda aqui
  console.log(r.value.centavos);
} else {
  // r.error é 'moeda-valor-nao-inteiro' | 'moeda-valor-negativo'
  console.error(r.error);
}
```

---

## 4. Combinators essenciais

### `map` — transforma valor mantendo erro

```ts
export const map = <T, U, E>(r: Result<T, E>, f: (t: T) => U): Result<U, E> =>
  r.ok ? ok(f(r.value)) : r;

// Exemplo
const valorReais = map(Moeda.fromCentavos(15050), m => m.centavos / 100);
```

### `flatMap` (alias: `andThen`) — encadeia operações que retornam Result

```ts
export const flatMap = <T, U, E>(
  r: Result<T, E>,
  f: (t: T) => Result<U, E>,
): Result<U, E> => (r.ok ? f(r.value) : r);

// Exemplo
const r = flatMap(
  Moeda.fromCentavos(100),
  m => Moeda.subtrair(m, Moeda.fromCentavos(200)._unsafeOk),
);
```

### `mapError` — transforma erro mantendo valor

```ts
export const mapError = <T, E, F>(r: Result<T, E>, f: (e: E) => F): Result<T, F> =>
  r.ok ? r : err(f(r.error));
```

### `combine` — agrega vários `Result` em um array

```ts
export const combine = <T extends readonly unknown[], E>(
  results: { readonly [K in keyof T]: Result<T[K], E> },
): Result<T, E> => {
  const values = [] as unknown[];
  for (const r of results) {
    if (!r.ok) return r;
    values.push(r.value);
  }
  return ok(values as unknown as T);
};

// Exemplo — validar 3 campos de entrada de uma vez
const r = combine([
  CNPJ(input.cnpj),
  Moeda.fromCentavos(input.valor),
  Periodo.criar(input.inicio, input.fim),
] as const);
// r.value é tuple [CNPJ, Moeda, Periodo] se todos OK; primeiro erro caso contrário
```

---

## 5. Padrão de uso em use case

```ts
import { type Result, ok, err, isErr, combine } from '../../../shared/result.ts';

type RegistrarAditivoCommand = Readonly<{
  contratoId: string;
  tipo: 'Acrescimo' | 'Supressao' | 'Prazo' | 'Variado';
  valorImpactoCentavos?: number;
  novaDataFim?: string;
  descricao: string;
}>;

type RegistrarAditivoError =
  | 'contrato-nao-encontrado'
  | 'contrato-encerrado'
  | MoedaError
  | CNPJError;

export const registrarAditivo =
  (deps: Readonly<{ contratoRepo: ContratoRepository; clock: Clock }>) =>
  async (cmd: RegistrarAditivoCommand): Promise<Result<AditivoRegistrado, RegistrarAditivoError>> => {
    const id = ContratoId(cmd.contratoId);
    if (isErr(id)) return id;

    const contrato = await deps.contratoRepo.findById(id.value);
    if (contrato === null) return err('contrato-nao-encontrado');

    if (contrato.status !== 'Vigente') return err('contrato-encerrado');

    // ... resto da composição
  };
```

Note: **`if (isErr(...)) return r;`** é o padrão "early return" preferido. Evita pirâmide de `if (r.ok) { ... }`.

---

## 6. Conversão na borda (adapter → domínio)

```ts
// src/modules/contratos/adapters/contrato-repository.mysql.ts
import { type Result, ok, err } from '../../../shared/result.ts';

export const findById = async (id: ContratoId): Promise<Result<Contrato | null, 'db-unavailable'>> => {
  try {
    const row = await db.query('SELECT ... WHERE id = ?', [id]);
    return ok(row === undefined ? null : mapRowToContrato(row));
  } catch (e) {
    // throw NÃO atravessa para o domínio
    return err('db-unavailable');
  }
};
```

> **`throw` é OK aqui no adapter**, mas é **convertido para `Result` antes de devolver para application/domain**.

---

## 7. Anti-padrões

| ❌ Errado | ✅ Certo |
| :--- | :--- |
| `throw new Error('cnpj inválido')` no domínio | `return err('cnpj-invalido')` |
| `catch (e) { return null }` perdendo o erro | `return err('motivo-especifico')` |
| `Result<T>` (sem E) | `Result<T, E>` — sempre tipar erro |
| `E = Error` | `E = 'erro-1' \| 'erro-2'` (string literal union) |
| `result.value` sem checar `result.ok` | `if (isOk(r)) { r.value }` ou narrowing |
| `if (r.ok === true)` redundante | `if (r.ok)` |
| `r as Result<T, never>` | Sem cast — use `ok()` que já infere |

---

## 8. `unwrap` — uso restrito

```ts
export const unwrap = <T, E>(r: Result<T, E>): T => {
  if (!r.ok) throw new Error(`unwrap on err: ${JSON.stringify(r.error)}`);
  return r.value;
};
```

> ⚠️ **`unwrap` deve ser usado APENAS em testes** ou em scripts onde a falha é fatal e o autor garante (por construção do teste) que o Result é `Ok`. **Nunca em código de produção do domínio ou application.**

---

## 9. Não confunda Result com Option/Maybe

- **`Result<T, E>`** = sucesso (`T`) **ou** falha tipada (`E`)
- **`Option<T>` / `Maybe<T>`** = valor existe (`Some(T)`) **ou** não existe (`None`)

Em TS, `Option` é geralmente expresso como `T | null` ou `T | undefined`. Não criamos `Option<T>` próprio.

Para uma "busca que pode não achar": **`findById(id): Promise<Result<Contrato | null, DbError>>`** — `null` é parte do valor de sucesso (não achei), `DbError` é falha real.

---

## 10. Glossário

| Termo | Definição |
| :--- | :--- |
| Result | Discriminated union `Ok<T>` ou `Err<E>` |
| Smart constructor | Função que retorna `Result<Branded, Error>` |
| Early return | Padrão `if (isErr(r)) return r;` para evitar nesting |
| Combinator | `map`, `flatMap`, `combine`, `mapError` |
| Unwrap | Extrair valor cru de Result — só em testes |
