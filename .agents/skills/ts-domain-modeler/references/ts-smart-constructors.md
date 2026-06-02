# Smart Constructors em TypeScript 6.0

> 📖 **Fonte canônica:** [`handbook/reference/typescript/More on Functions.md`](../../../../../handbook/reference/typescript/More%20on%20Functions.md) (function signatures) + [`handbook/reference/typescript/Type Manipulation/Generics.md`](../../../../../handbook/reference/typescript/Type%20Manipulation/Generics.md) (parâmetros de tipo). O padrão "smart constructor" não é nativo do TS — combinamos branded types + Result + funções puras.

---

## 1. O que é

Um **smart constructor** é uma função que:

1. Recebe entrada bruta (string, number, plain object).
2. **Valida** segundo as regras do domínio.
3. Retorna `Result<Branded, Error>` — **sucesso** com tipo branded ou **falha** com erro tipado.
4. É a **única forma** de produzir o tipo branded — casts diretos são proibidos fora dela.

---

## 2. Estrutura padrão

```ts
import { type Result, ok, err } from '../../../../shared/result.ts';
import type { Brand } from '../../../../shared/brand.ts';

// 1. Tipo branded
export type CNPJ = Brand<string, 'CNPJ'>;

// 2. Erros possíveis (string literal union)
export type CNPJError =
  | 'cnpj-vazio'
  | 'cnpj-tamanho-invalido'
  | 'cnpj-formato-invalido'
  | 'cnpj-digitos-verificadores';

// 3. Função smart constructor — mesmo nome do tipo (CamelCase para tipo, mesmo identificador é OK)
export const CNPJ = (raw: string): Result<CNPJ, CNPJError> => {
  const limpo = raw.trim().replace(/\D/g, '');

  if (limpo.length === 0) return err('cnpj-vazio');
  if (limpo.length !== 14) return err('cnpj-tamanho-invalido');
  if (!/^\d{14}$/.test(limpo)) return err('cnpj-formato-invalido');
  if (!digitosVerificadoresOk(limpo)) return err('cnpj-digitos-verificadores');

  return ok(limpo as CNPJ); // cast só aqui, após validação
};

const digitosVerificadoresOk = (cnpj: string): boolean => {
  // ... cálculo dos DVs do CNPJ ...
  return true; // simplificado
};
```

Pontos-chave:

- **Mesmo identificador para tipo e função** é idiomático em TS — não conflita (tipo vs. valor moram em namespaces separados).
- **`as CNPJ` só aqui**, depois da validação. Em qualquer outro lugar, é code smell.
- **Erros como string literal union**, não classes.

---

## 3. Smart constructor para Value Object composto

```ts
// src/modules/contratos/domain/shared/periodo.ts
import { type Result, ok, err } from '../../../../shared/result.ts';
import type { Brand } from '../../../../shared/brand.ts';

export type Periodo = Brand<{ readonly inicio: Date; readonly fim: Date }, 'Periodo'>;

export type PeriodoError =
  | 'periodo-data-invalida'
  | 'periodo-fim-antes-inicio'
  | 'periodo-duracao-excessiva';

const UM_ANO_MS = 365 * 24 * 60 * 60 * 1000;
const DURACAO_MAXIMA_MS = 100 * UM_ANO_MS;

export const Periodo = {
  criar: (inicio: Date, fim: Date): Result<Periodo, PeriodoError> => {
    if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime())) {
      return err('periodo-data-invalida');
    }
    if (fim.getTime() < inicio.getTime()) {
      return err('periodo-fim-antes-inicio');
    }
    if (fim.getTime() - inicio.getTime() > DURACAO_MAXIMA_MS) {
      return err('periodo-duracao-excessiva');
    }
    return ok({ inicio, fim } as Periodo);
  },

  estende: (p: Periodo, novaFim: Date): Result<Periodo, PeriodoError> =>
    Periodo.criar(p.inicio, novaFim),

  contem: (p: Periodo, instante: Date): boolean =>
    instante.getTime() >= p.inicio.getTime() && instante.getTime() <= p.fim.getTime(),
};
```

Padrão "namespace de funções": `Periodo.criar`, `Periodo.estende`, `Periodo.contem` — em vez de várias funções soltas no escopo do módulo.

---

## 4. Smart constructor para agregado

```ts
// src/modules/contratos/domain/contrato/contrato.ts
import { type Result, ok, err, combine, isErr } from '../../../../shared/result.ts';

export type ContratoError = 'contrato-numero-invalido' | MoedaError | PeriodoError;

type CriarContratoInput = Readonly<{
  numeroSequencial: string;
  titulo: string;
  objeto: string;
  valorOriginalCentavos: number;
  inicioVigencia: Date;
  fimVigencia: Date;
  agora: Date;
}>;

export const Contrato = {
  criar: (input: CriarContratoInput): Result<Contrato, ContratoError> => {
    const partes = combine([
      validarNumeroSequencial(input.numeroSequencial),
      Moeda.fromCentavos(input.valorOriginalCentavos),
      Periodo.criar(input.inicioVigencia, input.fimVigencia),
    ] as const);
    if (isErr(partes)) return partes;

    const [numero, valor, vigencia] = partes.value;

    return ok({
      id: ContratoId.gerar(),
      numeroSequencial: numero,
      titulo: input.titulo,
      objeto: input.objeto,
      status: 'Vigente' as const,
      valorOriginal: valor,
      vigenciaOriginal: vigencia,
      valorVigente: valor,
      vigenciaVigente: vigencia,
      aditivosHomologados: [] as const,
      criadoEm: input.agora,
    } satisfies Contrato);
  },
};
```

Pontos:

- **`combine`** agrega múltiplas validações; primeiro erro curtocircuita.
- **`satisfies Contrato`** valida shape sem reduzir tipo (preserva literais como `'Vigente' as const`).
- **`agora` injetado como parâmetro** — não chama `new Date()` dentro do domínio. Ver [`ports-and-adapters/SKILL.md`](../../ports-and-adapters/SKILL.md) sobre Clock port.

---

## 5. Smart constructor com `gerar` (novo ID)

```ts
// src/modules/contratos/domain/shared/ids.ts
import { newUuid } from '../../../../shared/id.ts';
import { type Result, ok, err } from '../../../../shared/result.ts';
import { isUuidV4 } from '../../../../shared/id.ts';
import type { Brand } from '../../../../shared/brand.ts';

export type ContratoId = Brand<string, 'ContratoId'>;

export type ContratoIdError = 'contrato-id-invalido';

export const ContratoId = {
  gerar: (): ContratoId => newUuid() as ContratoId,

  reidratar: (raw: string): Result<ContratoId, ContratoIdError> =>
    isUuidV4(raw) ? ok(raw as ContratoId) : err('contrato-id-invalido'),
};
```

- **`gerar`** cria novo — usado em `criar` do agregado.
- **`reidratar`** valida UUID vindo de fora (adapter, CLI) — usado quando o ID já existe em banco.

---

## 6. Composição: smart constructor encadeado

```ts
const result = combine([
  CNPJ(input.cnpjEmitente),
  CPF(input.cpfRecebedor),
  Moeda.fromCentavos(input.valorCentavos),
] as const);

if (isErr(result)) {
  // result.error é CNPJError | CPFError | MoedaError — union tipada
  return result;
}

const [cnpj, cpf, moeda] = result.value;
// agora os 3 estão validados e branded
```

Para 5+ validações, considere extrair uma função `validarInputDeAditivo(input): Result<...>` para evitar tuples gigantes.

---

## 7. Anti-padrões

| ❌ Errado                                        | ✅ Certo                                                    |
| :----------------------------------------------- | :---------------------------------------------------------- |
| `new CNPJ(raw)` (não pode — não tem class)       | `CNPJ(raw): Result<CNPJ, CNPJError>`                        |
| `raw as CNPJ` em qualquer lugar                  | Cast só dentro do smart constructor                         |
| `validateCNPJ(raw): boolean` separado de criação | Validação + criação juntas no smart constructor             |
| Smart constructor que lança exceção              | Sempre retorna `Result`                                     |
| Smart constructor síncrono que faz I/O           | Smart constructor é puro — I/O fica no adapter              |
| `CNPJ.create()` em vez de `CNPJ(raw)`            | Nome curto + idiomático (TS aceita tipo + função homônimos) |
| Esquecer `as const` em literais                  | `'Vigente' as const` preserva tipo literal                  |

---

## 8. Por que não usar `class` com validação no constructor

```ts
// ❌ Padrão OO clássico
class CNPJ {
  constructor(private readonly raw: string) {
    if (raw.length !== 14) throw new Error('invalid');
  }
}
```

Problemas:

1. **`throw`** quebra a regra "erros como valores".
2. **`class`** quebra a regra "sem class no domínio".
3. **`new CNPJ('...')`** acopla ao constructor — impossível composer com `Result.combine`.
4. **Não pode falhar de forma tipada** — `throw` é `any`.

Smart constructor resolve os 4 problemas de uma vez.

---

## 9. Glossário

| Termo                              | Definição                                                   |
| :--------------------------------- | :---------------------------------------------------------- |
| Smart constructor                  | Função que valida e retorna `Result<Branded, Error>`        |
| Branded type                       | Tipo nominal sintético (ver `ts-branded-types.md`)          |
| Composição via `combine`           | Agregar múltiplos `Result` em um                            |
| Early return                       | `if (isErr(r)) return r;` para evitar nesting               |
| `satisfies`                        | Operador TS 4.9+ que valida shape sem alargar tipo          |
| Identificador homônimo tipo+função | Padrão idiomático em TS: `type X = ...` + `const X = (...)` |
