# Exhaustive Switch com `never` em TypeScript 6.0

> 📖 **Fonte canônica:** [`handbook/reference/typescript/Narrowing.md`](../../../../../handbook/reference/typescript/Narrowing.md) §exhaustiveness checking (busque "never" e "exhaustive"). O tipo `never` é o **bottom type** do TS — nenhum valor pode ser atribuído a `never`. Isso é a base do exhaustive checking.

---

## 1. Princípio

Quando você faz `switch` em um campo discriminador de uma union, o TypeScript estreita o tipo em cada `case`. Se você esgotou todos os casos, o tipo restante no `default` é `never`. Aproveitamos isso para **garantir, em compile-time, que todos os casos foram tratados**.

---

## 2. Padrão canônico

```ts
const calcularImpactoFinanceiro = (a: Aditivo): Moeda => {
  switch (a.tipo) {
    case 'Acrescimo':
      return a.valorImpacto;
    case 'Supressao':
      // valor negativo lógico — guardamos como positivo + tipo discrimina
      return a.valorImpacto;
    case 'Prazo':
    case 'Variado':
      return Moeda.zero();
    default: {
      const _exhaustive: never = a;
      throw new Error(`unreachable: ${JSON.stringify(_exhaustive)}`);
    }
  }
};
```

Pontos-chave:

- **`const _exhaustive: never = a;`** — se `a` ainda for algum tipo (caso novo não tratado), TS rejeita esta linha.
- **`throw new Error('unreachable: ...')`** — fallback runtime. **Esse throw é a única exceção à regra "sem throw no domínio"** porque ele é literalmente inalcançável em código bem tipado.
- **`{ }` em volta do default** — escopo do `const _exhaustive` não vaza.

---

## 3. Por que `default` e não `case never`

Não existe `case never:` válido em TS. O padrão é:

1. Tratar todos os casos conhecidos.
2. `default` recebe o "que sobrou".
3. Atribuir a `never` força o compilador a verificar que sobrou nada.

---

## 4. Exemplo: máquina de estados de Contrato

```ts
type StatusContrato = 'Vigente' | 'Encerrado' | 'Distratado';

const podeReceberAditivo = (status: StatusContrato): boolean => {
  switch (status) {
    case 'Vigente':
      return true;
    case 'Encerrado':
      return false;
    case 'Distratado':
      return false;
    default: {
      const _: never = status;
      throw new Error(`unreachable: ${_}`);
    }
  }
};
```

Se amanhã alguém adicionar `'EmRevisao'` ao `StatusContrato` e não atualizar este switch, **o `tsc --noEmit` quebra** apontando exatamente esta função.

---

## 5. Padrão "fallthrough explícito" para agrupar casos

```ts
switch (a.tipo) {
  case 'Acrescimo':
  case 'Supressao':
    // ambos têm valorImpacto
    return a.valorImpacto;
  case 'Prazo':
  case 'Variado':
    return Moeda.zero();
  default: {
    const _: never = a;
    throw new Error(`unreachable: ${JSON.stringify(_)}`);
  }
}
```

Casos agrupados compartilham o mesmo block. TS continua estreitando: dentro de `case 'Acrescimo': case 'Supressao':` o tipo é `Aditivo extends { tipo: 'Acrescimo' | 'Supressao' }` — `valorImpacto` está presente em ambos.

---

## 6. Helper `assertNever` reusável

Em vez de repetir `const _: never = x; throw ...` em todo switch, abstrair:

```ts
// src/shared/exhaustive.ts
export const assertNever = (x: never): never => {
  throw new Error(`unreachable: ${JSON.stringify(x)}`);
};

// Uso
switch (a.tipo) {
  case 'Acrescimo':
    return a.valorImpacto;
  case 'Supressao':
    return a.valorImpacto;
  case 'Prazo':
    return Moeda.zero();
  case 'Variado':
    return Moeda.zero();
  default:
    return assertNever(a);
}
```

> ⚠️ `assertNever` **throws**, contradizendo a regra "sem throw no domínio". Justificativa: o caminho é **inalcançável em código bem tipado**; se chegou lá é bug de tipos. Para domínio rigoroso, retornar uma `Result<never, 'unreachable'>` em vez de throw também é aceitável.

---

## 7. Exhaustive switch em Result

```ts
const handle = <T, E>(r: Result<T, E>) => {
  if (r.ok) {
    return r.value;
  } else {
    return r.error;
  }
  // Não precisa de exhaustive aqui — `if/else` já cobre `r.ok: true | false`
};
```

Quando o discriminador é booleano (Result), `if/else` simples basta. Switch + `never` é para unions com 3+ variantes.

---

## 8. Anti-padrões

| ❌ Errado                                          | ✅ Certo                                                    |
| :------------------------------------------------- | :---------------------------------------------------------- |
| `default: throw new Error('invalido')` sem `never` | `default: { const _: never = x; throw ... }`                |
| `default: return null` silencioso                  | Compilador deveria garantir exaustividade                   |
| `if/else if/else` em vez de switch para 4+ casos   | `switch` com `never` no default                             |
| `switch (a.tipo as string)` perdendo narrowing     | `switch (a.tipo)` puro                                      |
| Esquecer `break` em case sem return                | Sempre `return` ou `break` explícito                        |
| `default: console.warn('unknown')`                 | Não pode existir "unknown" em discriminated union exaustiva |

---

## 9. Glossário

| Termo                 | Definição                                                       |
| :-------------------- | :-------------------------------------------------------------- |
| Exhaustiveness check  | Garantia compile-time de que todos os casos foram tratados      |
| `never`               | Tipo bottom — não existe valor de tipo `never`                  |
| Bottom type           | Tipo sem valores; subtipo de todos os tipos                     |
| Control flow analysis | Análise do TS que estreita tipos por branch                     |
| `assertNever`         | Helper que recebe `never` e dispara erro (caminho inalcançável) |
