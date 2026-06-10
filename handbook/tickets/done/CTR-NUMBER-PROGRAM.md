# Request — CTR-NUMBER-PROGRAM

> Handoff do **front (web-app v2)** para o **core-api**. Padrão `000-request.md`.
> Origem: grid de contratos (Tela 1) — coluna **Número** e coluna **Programa**. Verificado contra
> `core-api@dev` em 2026-06-09.

## Título
Numeração sequencial de contrato (CT/OS NNNN/AAAA) + persistência e retorno dos metadados
(programa, plano orçamentário, categorização, centro de custo, classificação CT/OS)

## Size
M

## Contexto
O grid de contratos exibe, por linha:
- **Número** no padrão **`CT 0001/2026`** (contrato) / **`OS 0001/2026`** (ordem de serviço): prefixo
  por classificação + **sequencial com 4 dígitos** + ano.
- **Programa** (sigla curta — ex.: `PMA`, `P-PAR`, `E-EPV`).

## Estado atual (verificado)
- **Número**: o core-api expõe `sequentialNumber` no formato **`"941/2026"`** (3 dígitos + ano). O valor
  **não é sequencial de verdade** — o BFF gera um número **aleatório** no create
  (`core-api-contracts.ts` → `create`: `${random 100-999}/${year}`) porque o backend exige o campo.
- **Classificação (CT vs OS)**: **não é persistida**. O detalhe (`GET /contracts/:id`) devolve apenas
  `['amendments','contractor','currentPeriod','currentValue','documents','email','endedAt','id',
  'objective','observations','originalPeriod','originalValue','sequentialNumber','signedAt','status',
  'telephone','title']` — **sem** `classification`.
- **Programa / plano orçamentário / categorização / centro de custo**: **não são persistidos nem
  retornados** (confirmado no detalhe acima — nenhum campo `program*`, `budgetPlan*`, `categor*`,
  `centro*`). O front envia `programId`, `budgetPlanId`, `categorizacao`, `centroDeCusto` no create, mas
  o backend ignora; na leitura, o grid mostra `—`.

## Mitigação atual no FRONT (sem backend)
- `formatContractNumber` (`src/modules/contracts/client/domain/format.ts`) passou a reconhecer o formato
  `"NNN/AAAA"` do backend e **padroniza** para `CT 0001/2026` (pad de 4 dígitos + prefixo). Como a
  classificação não vem do backend, **o prefixo é sempre `CT`** (o front assume `Contrato`).
- A coluna **Programa** fica centralizada porém exibindo `—` (sem dado de backend).

## Pedido ao backend
1. **Numeração sequencial real** por ano (e por tipo, se aplicável): o backend gera/garante o
   `sequentialNumber` sequencial (ex.: `0001/2026`, `0002/2026`, …) no create — o front **não** deve
   inventar número. Idealmente retornar já formatado ou com os campos para o front formatar.
2. **Persistir a classificação `CT`/`OS`** (contrato × ordem de serviço) e **devolvê-la** no list-item e
   no detalhe, para o prefixo do número refletir o tipo real.
3. **Persistir e retornar os metadados** do contrato no list-item e no detalhe:
   `programId`/`program` (id + nome/sigla), `budgetPlanId`/`budgetPlan`, `categorizacao`, `centroDeCusto`.
   Sem isso, as colunas **Programa** (e o detalhe) não têm como ser populadas.

## Impacto no front (hoje)
- Número exibido como `CT 0001/2026` mas **sem distinção CT/OS** (sempre CT) e a partir de um
  sequencial **aleatório** gerado no BFF.
- Coluna **Programa** = `—` (e demais metadados `—` no detalhe).
