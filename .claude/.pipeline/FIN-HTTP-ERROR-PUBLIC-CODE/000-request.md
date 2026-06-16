# FIN-HTTP-ERROR-PUBLIC-CODE — request

> Ticket da feature `011-financial-hardening` (US1, P1). Origem: GitHub issue **#52** (segurança, OWASP API8:2023 — Security Misconfiguration).

## Problema

Erros 4xx do módulo financial ecoam o slug interno de domínio (kebab-case) como `code` **e** `message` no body (`plugin.ts:105-107` → `toErrorEnvelope(error, error, …)`), revelando o mecanismo interno (concorrência versão-baseada, máquina de estados). 5xx já oculta.

## Escopo

- Mascarar 4xx do **financial**: `code` público (`conflict`/`not-found`/`bad-request`/`unprocessable`) + `message` PT-BR; slug interno só no log.
- Cobrir também o caminho do `DELETE` (hoje via `sendResult` compartilhado) — migrando-o para o `sendDomainError` local (NÃO alterar `src/shared/http/reply.ts`, que é cross-módulo — ADR-0014).
- Corrigir 2 bugs de mapeamento: `partner-ref-invalid` (hoje 422 → deve **400**), `timeline-document-not-found` (hoje 422 → deve **404**); remover slug morto `invalid-supplier-ref`.
- **NÃO** alterar outros módulos (auth/contracts/partners têm problema análogo — issue própria).

## Critérios de aceite (testáveis)

- **CA1**: PATCH com `version` defasada → 409 `code:"conflict"`, `message` PT-BR, slug não aparece no body.
- **CA2**: approve sobre documento já aprovado (`invalid-state-transition`) → 409 `conflict`, sem slug.
- **CA3**: GET de documento inexistente → 404 `not-found`, sem slug.
- **CA4**: POST sem `dueDate` (não-draft) → 422 `unprocessable`, sem slug.
- **CA5**: 5xx mantém `code:"internal"` (sem regressão).
- **CA6** (bug): `writeErrorStatus('partner-ref-invalid')` = 400; `writeErrorStatus('timeline-document-not-found')` = 404.

## Definition of Done

- W0 RED → W1 GREEN; W2 com citação OWASP API8 (§IX); W3 verde; contagem de testes ≥ baseline.

## Size

**M** — `plugin.ts` + novo `error-mapping.ts` + migração do DELETE; inventário de ~20 slugs.
