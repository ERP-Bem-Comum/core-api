# Branded Types em TypeScript 6.0

> 📖 **Fonte canônica:** [`handbook/reference/typescript/Object Types.md`](../../../../../handbook/reference/typescript/Object%20Types.md) + [`handbook/reference/typescript/Type Manipulation/Mapped Types.md`](../../../../../handbook/reference/typescript/Type%20Manipulation/Mapped%20Types.md). **Antes de inventar uma variante de branded type, leia esses arquivos.**

---

## 1. O problema

TypeScript usa **tipagem estrutural**: dois tipos com o mesmo shape são intercambiáveis. Isso é ruim quando o domínio precisa distinguir valores com o mesmo shape mas semântica diferente:

```ts
// Estruturalmente equivalentes — TS aceita silenciosamente
function transferir(de: string /* CNPJ */, para: string /* CPF */, valor: number) {}
transferir('11.111.111/0001-11', '999.999.999-99', 100); // ✅
transferir('999.999.999-99', '11.111.111/0001-11', 100); // ❌ trocados, TS não pega
```

**Branded types** resolvem isso adicionando uma "marca" inalcançável que distingue tipos estruturalmente iguais.

---

## 2. Implementação canônica do projeto

```ts
// src/shared/brand.ts
declare const brand: unique symbol;

export type Brand<T, Tag extends string> = T & { readonly [brand]: Tag };
```

Pontos-chave:

- **`unique symbol`** garante que ninguém de fora consiga produzir essa propriedade.
- **`declare const`** existe só no nível de tipos — não vira código em runtime.
- **`Tag extends string`** força a marca a ser literal, permitindo `Brand<string, 'CPF'>` ≠ `Brand<string, 'CNPJ'>`.

---

## 3. Uso no domínio

### IDs

```ts
import type { Brand } from '../../../../shared/brand.ts';

export type ContratoId = Brand<string, 'ContratoId'>;
export type AditivoId = Brand<string, 'AditivoId'>;
export type DocumentoId = Brand<string, 'DocumentoId'>;
```

### Valores validados

```ts
export type CNPJ = Brand<string, 'CNPJ'>;
export type CPF = Brand<string, 'CPF'>;
export type Email = Brand<string, 'Email'>;
```

### Objetos validados (com shape interno)

```ts
export type Moeda = Brand<{ readonly centavos: number }, 'Moeda'>;
export type Periodo = Brand<{ readonly inicio: Date; readonly fim: Date }, 'Periodo'>;
```

---

## 4. Sempre acompanhar de Smart Constructor

A única forma de produzir um branded type é via **smart constructor** que valida e retorna `Result`. Casts diretos são proibidos fora do smart constructor.

```ts
import { type Result, ok, err } from '../../../../shared/result.ts';
import type { Brand } from '../../../../shared/brand.ts';

export type CNPJ = Brand<string, 'CNPJ'>;

export type CNPJError = 'cnpj-vazio' | 'cnpj-tamanho-invalido' | 'cnpj-digitos-verificadores';

const CNPJ_REGEX = /^\d{14}$/;

export const CNPJ = (raw: string): Result<CNPJ, CNPJError> => {
  const limpo = raw.replace(/\D/g, '');
  if (limpo.length === 0) return err('cnpj-vazio');
  if (limpo.length !== 14) return err('cnpj-tamanho-invalido');
  if (!CNPJ_REGEX.test(limpo)) return err('cnpj-tamanho-invalido');
  if (!digitosVerificadoresOk(limpo)) return err('cnpj-digitos-verificadores');
  return ok(limpo as CNPJ);
};
```

> **Cast `as CNPJ` só aqui dentro do smart constructor**, após validação. Em qualquer outro lugar, `as` é code smell.

---

## 5. Por que isso é importante para regra de negócio

Considere um aditivo do tipo `Acrescimo`:

```ts
type Aditivo =
  | { readonly tipo: 'Acrescimo'; readonly valorImpacto: Moeda /* ... */ }
  | { readonly tipo: 'Supressao'; readonly valorImpacto: Moeda /* ... */ };
```

Sem branded `Moeda`, alguém poderia passar `valorImpacto: -100` para um `Acrescimo`. Com o branded type + smart constructor `Moeda.fromCentavos` que rejeita negativos, **a regra é representada no tipo**, não num `if` perdido.

---

## 6. Limites

- **Branded types existem só em compile-time.** Em runtime são o tipo base. Você não pode `typeof moeda === 'Moeda'` — use `'centavos' in moeda` ou check estrutural.
- **Casts errados produzem código quebrado em runtime.** Por isso a regra "cast só no smart constructor".
- **JSON.parse perde a marca.** Ao deserializar (na borda do adapter), passe pelo smart constructor novamente.

---

## 7. Glossário rápido

| Termo              | Definição                                                        |
| :----------------- | :--------------------------------------------------------------- |
| Tipagem estrutural | TypeScript considera tipos equivalentes se o shape é igual       |
| Brand / Tag        | "Marca" sintética que diferencia tipos estruturalmente iguais    |
| `unique symbol`    | Símbolo nominal único, irreplicável fora do módulo que o declara |
| Smart constructor  | Função que valida entrada e retorna `Result<Branded, Error>`     |
| Cast (`as`)        | Coerção de tipo — perigoso fora do smart constructor             |

---

## 8. Anti-padrões

| ❌ Errado                          | ✅ Certo                                                |
| :--------------------------------- | :------------------------------------------------------ |
| `cnpj: string` no domínio          | `cnpj: CNPJ` (branded)                                  |
| `valor as CNPJ` em qualquer lugar  | `CNPJ(valor)` (smart ctor)                              |
| `interface CNPJ { value: string }` | `type CNPJ = Brand<string, 'CNPJ'>`                     |
| Validar CNPJ dentro do use case    | Validar no smart constructor, use case já recebe `CNPJ` |
| `extends Error` para `CNPJError`   | `type CNPJError = 'cnpj-vazio' \| ...`                  |

---

## 9. Quando NÃO usar branded type

- **Valores transitórios sem regra** (linhas de teste, payloads recém-deserializados antes da validação).
- **DTOs de entrada/saída do adapter** — DTO usa string/number, conversão para branded acontece na borda.
- **Tipos puramente internos a uma função** — não exporta, não atravessa fronteira de módulo.
