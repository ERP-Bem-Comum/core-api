# Discriminated Unions em TypeScript 6.0

> 📖 **Fonte canônica:** [`handbook/reference/typescript/Narrowing.md`](../../../../../handbook/reference/typescript/Narrowing.md) — §control flow analysis, §discriminated unions, §exhaustiveness checking. **Antes de modelar um caso variante, abrir esse arquivo.**

---

## 1. O que é

Discriminated union = union de tipos que compartilham **um campo discriminador** com valor literal único. TypeScript usa o campo para **estreitar** (narrow) o tipo em cada branch.

Sinônimos: tagged union, algebraic data type (ADT), sum type.

---

## 2. Padrão canônico no projeto

```ts
type Aditivo =
  | {
      readonly tipo: 'Acrescimo';
      readonly id: AditivoId;
      readonly valorImpacto: Moeda;
      readonly descricao: string;
    }
  | {
      readonly tipo: 'Supressao';
      readonly id: AditivoId;
      readonly valorImpacto: Moeda;
      readonly descricao: string;
    }
  | {
      readonly tipo: 'Prazo';
      readonly id: AditivoId;
      readonly novaDataFim: Date;
      readonly descricao: string;
    }
  | {
      readonly tipo: 'Variado';
      readonly id: AditivoId;
      readonly descricao: string;
    };
```

Características obrigatórias:

- Campo discriminador chama-se **`tipo`** (PT-BR para entidades de domínio) ou **`type`** (EN para commands/events de sistema).
- Cada variante é um `Readonly<...>` puro.
- O campo discriminador é **literal string** (`'Acrescimo'`, não `string`).
- **Campos diferentes por variante** representam regras de negócio: `Prazo` exige `novaDataFim`; `Variado` não pode ter `valorImpacto`. **Optional fields são proibidos** quando a regra é variante-dependente.

---

## 3. Narrowing automático

```ts
const calcularImpactoValor = (a: Aditivo): Moeda => {
  switch (a.tipo) {
    case 'Acrescimo':
      // TS sabe que aqui `a.valorImpacto` existe
      return a.valorImpacto;
    case 'Supressao':
      return a.valorImpacto;
    case 'Prazo':
    case 'Variado':
      // TS sabe que aqui `valorImpacto` não existe
      return Moeda.zero();
    default: {
      const _exhaustive: never = a;
      throw new Error(`unreachable: ${JSON.stringify(_exhaustive)}`);
    }
  }
};
```

O `default` com `never` garante **exhaustiveness checking**: se um caso for adicionado à union e não tratado, **o `tsc` rejeita** a atribuição a `never`. Ver [`ts-exhaustive-switch.md`](./ts-exhaustive-switch.md).

---

## 4. Convenções de nomenclatura

| Contexto | Discriminator | Linguagem | Exemplo |
| :--- | :--- | :--- | :--- |
| Entidades de domínio | `tipo` | PT-BR | `'Acrescimo' \| 'Supressao' \| 'Prazo' \| 'Variado'` |
| Eventos de domínio | `type` | EN | `'ContratoMaeCriado' \| 'AditivoHomologado'` |
| Commands de application | `type` | EN | `'RegistrarAditivo' \| 'HomologarAditivo'` |
| Erros | (string literal union, sem objeto) | PT-BR | `'contrato-encerrado' \| 'aditivo-sem-documento'` |

> **Motivação:** entidades são PT-BR porque dialogam com P.O.; eventos/commands são EN porque viram nome de arquivo, tipo de canal, e padrão técnico.

---

## 5. Discriminated union para eventos de domínio

```ts
// src/modules/contratos/domain/contrato/eventos.ts
export type ContratoEvento =
  | {
      readonly type: 'ContratoMaeCriado';
      readonly contratoId: ContratoId;
      readonly numeroSequencial: string;
      readonly valorOriginal: Moeda;
      readonly vigenciaOriginal: Periodo;
      readonly ocorridoEm: Date;
    }
  | {
      readonly type: 'EstadoContratualAtualizado';
      readonly contratoId: ContratoId;
      readonly valorVigente: Moeda;
      readonly vigenciaVigente: Periodo;
      readonly ocorridoEm: Date;
    }
  | {
      readonly type: 'ContratoEncerrado';
      readonly contratoId: ContratoId;
      readonly motivo: 'fim-vigencia' | 'distrato';
      readonly ocorridoEm: Date;
    };
```

Todo evento carrega `ocorridoEm: Date` (injetado pelo Clock port). Mais detalhes em [`ports-and-adapters/SKILL.md`](../../ports-and-adapters/SKILL.md).

---

## 6. Discriminated union vs. enum

| | Enum (`enum`) | Discriminated union |
| :--- | :--- | :--- |
| Carrega dados por variante | ❌ não | ✅ sim |
| Exhaustiveness em switch | ❌ só com `as const` | ✅ sim, via `never` |
| Suporta payloads diferentes | ❌ | ✅ |
| Runtime overhead | depende do `const enum` | zero |

> **Regra:** se a variante carrega dados, use discriminated union. Enum só para conjunto fechado sem payload (e mesmo assim, `as const` é preferível).

---

## 7. Discriminated union para Result

Result<T, E> também é uma discriminated union:

```ts
export type Result<T, E> =
  | Readonly<{ ok: true;  value: T }>
  | Readonly<{ ok: false; error: E }>;
```

Discriminator é `ok: boolean`. Ver [`ts-result-pattern.md`](./ts-result-pattern.md).

---

## 8. Anti-padrões

| ❌ Errado | ✅ Certo |
| :--- | :--- |
| `tipo: string` | `tipo: 'Acrescimo' \| 'Supressao' \| 'Prazo' \| 'Variado'` |
| `valorImpacto?: Moeda` opcional em todas as variantes | Campo diferente por variante — `valorImpacto` só em `Acrescimo`/`Supressao` |
| `if (a.tipo === 'Acrescimo') ... else ...` espalhado | `switch (a.tipo) { ... }` exhaustivo |
| `default: throw 'invalido'` sem `never` | `default: { const _: never = a; throw ... }` |
| Variante sem `readonly` nos campos | Sempre `readonly` em domínio |
| `data: any` para "qualquer payload" | Variante explícita com shape conhecido |

---

## 9. Glossário

| Termo | Definição |
| :--- | :--- |
| Discriminator | Campo literal compartilhado que distingue variantes |
| Narrowing | Estreitar o tipo dentro de um branch via type guard |
| Exhaustiveness | Garantia compile-time de que todos os casos foram tratados |
| `never` | Tipo bottom; nenhuma operação produz `never` |
| Tagged union | Sinônimo de discriminated union |
| Sum type | Nome de ADT em linguagens FP |
