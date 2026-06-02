# CTR-HTTP-CONTRACT-DETAIL-CHILDREN-FILES — aditivos + documentos aninhados no GET de detalhe

> **Size:** M · **Origem:** [po-feedback/0001 §B Bucket B #2](../../../handbook/po-feedback/0001-gap-api-v2-contracts.md). Gap de **borda** (o domínio já tem; falta compor no DTO).

## Contexto

O `GET /contracts/{id}` hoje devolve só o agregado `Contract` (`contract-dto.ts:25-65`, `schemas.ts:37-52`) — **sem** os aditivos nem os documentos. O frontend v2 precisa de `amendments[]`/`children[]` e `files[]`/`documents[]` aninhados para renderizar a tela de detalhe (tabela de documentos, composição de valor, timeline). Aditivos e documentos **já existem no domínio** (`domain/amendment/`, `domain/document/`) e têm repos — só não são compostos no response de detalhe.

Este ticket é **do próprio módulo** `contracts` (não depende de Parceiros). A composição do **contratado** (Parceiros) é separada (ADR-0032 + `PARTNERS-CONTRACTOR-READ-PORT`).

## Escopo

- Use case de **leitura agregada** (`getContractDetail`) que carrega o `Contract` + seus `Amendment[]` + `ContractDocument[]` (via os repos existentes), sem tocar o domínio.
- Novo DTO de **detalhe** (`contractToDetailDto`) distinto do list-item: inclui `amendments[]` (kind, status, impactValue/newEndDate, amendmentNumber, datas, signedDocumentRef) e `documents[]` (categoria, fileName, mimeType, sizeBytes, version, status, uploadedAt).
- Schema Zod do detalhe + ligação na rota `GET /contracts/{id}`.

## Critérios de Aceite

- [ ] CA1 — `GET /contracts/{id}` retorna `amendments[]` com todos os aditivos do contrato (ordenados por `amendmentNumber`).
- [ ] CA2 — retorna `documents[]` do contrato (incluindo o estado: Active/Superseded/LogicallyDeleted, conforme política de exibição a definir em W0).
- [ ] CA3 — o **domínio e os use cases de escrita não mudam** (só leitura/DTO novo). ADR-0032: composição na borda.
- [ ] CA4 — schema Zod valida o response; OpenAPI atualizado (ADR-0027).
- [ ] CA5 — list-item (`GET /contracts`) **não** muda (continua enxuto); só o detalhe enriquece.
- [ ] CA6 — teste de integração HTTP (`fastify.inject`) do GET de detalhe com aditivos + documentos.

## Pipeline

W0 RED → W1 (use case de leitura + DTO + schema) → W2 → W3. Skills: `ports-and-adapters` + `fastify`/`drizzle-orm-expert`.
