# W2 (Code Review, read-only) — CONTRACTS-HTTP-COMPOSITION-RW (C0)

> Skill: `code-reviewer` · Round: 1 · Veredito: **APPROVED**

## Escopo auditado

`schemas.ts`, `contract-dto.ts`, `composition.ts`, `plugin.ts`, `public-api/http.ts`, diff de `server.ts` + os 2 testes.

## Checklist de conformidade

| Regra / ADR | Verificação | Status |
| :-- | :-- | :-- |
| ADR-0006 (cross-módulo só via public-api) | contracts consome `auth/public-api/http.ts` (`makeRequireAuth`) **só no `server.ts`** (composition root); o plugin recebe `requireAuth` **injetado** — não importa auth. | ✓ |
| ADR-0006 (public-api é o ponto externo) | `contracts/public-api/http.ts` reexporta plugin+builder+tipos; separado do barrel `index.ts` (eventos) p/ não arrastar Fastify. | ✓ |
| ADR-0026 (RW split) | dois handles (writer/reader); `readerUrl` ausente/igual → reusa writer; `listContracts`→`contractReaderRepo`; `shutdown` fecha os pools distintos. Roteamento explícito. | ✓ |
| ADR-0027 (Zod borda + OpenAPI) | Zod só em `adapters/http/schemas.ts`; response schema na rota; path no `/docs/json`. | ✓ |
| Domínio/application sem framework | nenhum arquivo de domain/application tocado; sem import de Fastify/Zod fora da borda. | ✓ |
| TS moderno (`verbatimModuleSyntax`, `.ts`, `#src/*`) | `import type` em todos os type-only; extensões `.ts`; `#src/*` no kernel/shared. | ✓ |
| Result na borda | handler usa `sendResult`; repo já retorna `Result`; sem `Error` vazando p/ application. | ✓ |
| Switch exaustivo (domain rule) | `contractToListItem` cobre os 4 `status` sem `default: throw`; fim inalcançável. | ✓ |
| Sem `any`/`class`/`this` | nenhum presente. Erros internos EN kebab-case (`contract-repo-unavailable`). | ✓ |
| `noUnusedLocals` | `writerRepo` deliberadamente não instanciado (só writer *handle*) — sem dead code. | ✓ |
| Consistência de padrão | espelha `auth/adapters/http/{composition,plugin}.ts` (factory + use cases injetados). | ✓ |

## Observações não-bloqueantes (p/ C1/C2)

1. **`plugin.ts:7`** — o header ainda diz "Encapsula `/contracts`"; após remover o sub-prefixo o path vem das URLs completas. O comentário do `register` (l. 52-55) já esclarece. Cosmético.
2. **`req.userId` sem `decorateRequest` no escopo contracts** — `requireAuth` seta `req.userId`; funciona (CA2 verde) e o tipo é global (`declare module 'fastify'` no auth-hook). Quando o C2 introduzir `authorize` (que **lê** `req.userId`), avaliar `decorateRequest('userId','')` no escopo de contracts para pré-alocação/consistência com o auth.
3. **`distinctReader` por igualdade de string** — `readerUrl !== writerUrl` trata strings diferentes como pools distintos (correto p/ réplica). Single-node reusa por igualdade exata ou ausência. Documentado no C5 (E2E) para validar o split físico.

## Conclusão

Nenhum issue bloqueante. Implementação mínima, fiel à SPEC (desvios §6 justificados no W1 REPORT) e aos ADRs. **APPROVED** → W3.
