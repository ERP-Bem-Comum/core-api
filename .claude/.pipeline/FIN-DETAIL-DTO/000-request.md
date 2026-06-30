# FIN-DETAIL-DTO — enriquecer o GET /documents/:id (drawer de Detalhe)

**Feature:** [025-fin-go-live-1-nucleo](../../../specs/025-fin-go-live-1-nucleo/) · **US5** · **Size:** S (recortado)
**🎯 Goal:** fechar o gap acionável da issue **[#95](https://github.com/ERP-Bem-Comum/core-api/issues/95)** no backend.

## Reconhecimento → recorte

Dos campos faltantes da #95, após reconhecimento:

| Campo | Estado | Decisão |
| --- | --- | --- |
| `series` no detalhe | falta (já no domínio + listagem) | **ESTE TICKET** (S) |
| rótulos de categorização (categoria/centro de custo/programa) | refs expostos; nomes não | **follow-up** — o front resolve `ref→nome` via os selects que já carrega (`list()`); server-side só se a P.O. exigir |
| arquivo do documento (PDF/link) | inexistente | **follow-up** — depende da feature 018 (upload) |
| dados bancários do favorecido | inexistente | **follow-up** — cross-módulo (Parceiros) |

## 📋 Definition of Done

- [ ] `series` (string|null) exposta no `documentResponseSchema` e no `documentToDto` (draft + open).
- [ ] `GET /documents/:id` retorna a `series` do documento.
- [ ] gate W3 verde.
- [ ] follow-ups (rótulos server-side / arquivo / dados bancários) registrados ao fechar; **#95 fecha o gap de `series`** (reabrir/abrir issue própria para os demais se a P.O. exigir).

## Escopo técnico

- `documentResponseSchema` += `series` (`schemas.ts`); `documentToDto` (draft + open) += `series` (`dto.ts`). `DocumentCore.series` já existe.
