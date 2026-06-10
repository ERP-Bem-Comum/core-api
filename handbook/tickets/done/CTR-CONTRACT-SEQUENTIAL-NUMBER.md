# Request — CTR-CONTRACT-SEQUENTIAL-NUMBER

> Handoff do **front (web-app v2)** para o **core-api**. Padrão `000-request.md`.
> Origem: número do contrato no grid/detalhe. Verificado em 2026-06-09.

## Título

Numeração sequencial **automática por ano** do contrato (backend gera, não o cliente)

## Size

S/M

## Contexto

Hoje o `POST /contracts` **exige** o campo `sequentialNumber` do cliente
(`create-contract.ts:24`, `schemas.ts:24`). Como o front não tem como saber o próximo número, o BFF
**inventa** um valor (padroniza `CT 0001/2026` / número aleatório). Resultado: o número exibido **não é
confiável** e todos aparecem como `CT`.

O desejado: o **backend gera** o número sequencial do contrato, **por ano**, no momento da criação —
análogo ao `program_number` do módulo `programs` (gerado `MAX+1` sob `FOR UPDATE`, ver
`specs/008-gestao-programas/research.md` D3).

## Estado atual (verificado)

- `contracts.sequential_number` já existe (coluna + `findBySequentialNumber` para unicidade R4).
- O valor é **fornecido pelo cliente** no create (não gerado pelo backend).

## Gap (o que falta)

- O backend passa a **gerar** o `sequentialNumber` por ano (ex.: `0001/2026`, `0002/2026`, reinicia no
  ano), em vez de exigi-lo no body. Geração transacional (`MAX(...)+1` por ano sob lock, espelha
  `program_number` D3). `sequentialNumber` sai do body do `POST /contracts` (ou vira opcional/ignorado).
- O contrato retorna o número gerado; o front passa a exibi-lo (remove a gambiarra `CT 0001/2026`).

## Relação com a classificação CT/OS

> O **prefixo/classificação CT vs OS** (contrato vs ordem de serviço) é o **G1 do
> `CTR-CONTRACT-METADATA-E-ADITIVOS`** (classificação como enum de domínio). Este ticket cobre só a
> **geração do número**; a classificação que define o prefixo vive no METADATA. Coordenar os dois.

## Critérios de Aceitação

1. `POST /contracts` **não exige** `sequentialNumber` no body; o backend gera por ano.
2. Números são únicos e crescentes por ano, sem corrida (geração transacional).
3. O contrato criado retorna o número gerado; detalhe/grid exibem o número real.

## Fora de Escopo

- Classificação CT/OS (→ `CTR-CONTRACT-METADATA-E-ADITIVOS` G1).
- Renumerar contratos legados.

## Notas

- Espelhar a decisão `program_number` (D3 da spec 008): `MAX+1` por ano sob `SELECT … FOR UPDATE`,
  `UNIQUE` como rede de segurança. Reusa o precedente já validado em `programs`.
