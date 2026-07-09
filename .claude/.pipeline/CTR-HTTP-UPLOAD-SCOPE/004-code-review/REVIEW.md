# CTR-HTTP-UPLOAD-SCOPE — W2 (audit read-only)

**Agente:** security-backend-expert (skill `web-security-backend`)
**Veredito:** APPROVED (round 1/3)

> Wave despachada ao `security-backend-expert` (independente do W1). Sessão principal
> fiscalizou o veredito: confere com o mapa estrutural (sub-scope 533-663; E4/E5 no pai) e a
> auditoria é empírica (CA2/CA8 + suíte completa).

## Escopo auditado

`src/modules/contracts/adapters/http/plugin.ts` — isolamento do parser
`application/octet-stream` (bodyLimit 20 MiB) + as 3 rotas de upload (E1/E2/E3) num
sub-scope `uploadScope`, espelhando o fix já aplicado no financial (`FIN-DOC-INGEST-HTTP`,
achado M1). Follow-up direto: `.claude/.pipeline/CTR-HTTP-UPLOAD-SCOPE/000-request.md`.

## Checklist de auditoria

1. **CWE-770 resolvido:** ✅. Único `addContentTypeParser` ativo do módulo contracts vive
   dentro do `scope.register(async (uploadScope: typeof scope) => {...})`
   (`plugin.ts:533-663`). E4 (`DELETE .../documents/:documentId`, `plugin.ts:670`) e E5
   (`GET .../documents/:documentId/content`, `plugin.ts:720`) ficam no `scope` pai, sem
   parser — herdam só o `bodyLimit` global de 1 MiB (`src/shared/http/app.ts:101`). Nenhum
   outro `addContentTypeParser` global reintroduz o problema (verificado em
   `src/shared/http/app.ts` e nos plugins irmãos — cada módulo isola o seu).
2. **Sem regressão de authn/authz/ownership:** ✅. `preHandler: [requireAuth,
   authorize(contract:write)]` inalterado nas 3 rotas do sub-scope (diff confirma corpo dos
   handlers idêntico, só re-indentado). Ownership de E2 (`amendment-contract-mismatch`) e E3
   (`document-contract-mismatch`) intactos. `scope.register` não cria via alternativa que
   pule os hooks — nenhum `fastify-plugin`/`fp()` envolve o sub-scope.
3. **Encapsulation Fastify correta:** ✅. Ausência de `fp()` confirma novo contexto filho
   genuíno (não há bypass da encapsulação nativa). Empiricamente comprovado: `CA8` (rota
   não-upload rejeita corpo > 1 MiB, limite global intacto) e `CA2` (rota não-upload deixa de
   vazar o parser de 20 MiB, 413/415 em vez de 401) ambos verdes.
4. **Idioma/ADR:** ✅. `uploadScope` em EN, consistente com `ingestScope` do financial.
   Comentários em PT (convenção do projeto). Nenhum erro interno novo; kebab-case EN
   pré-existente mantido.
5. **Superfície de erro:** ✅. 413/415 caem no branch `fastifyStatusCode < 500` do error
   handler central (`src/shared/http/errors.ts:66-74`) → envelope genérico
   `{ code: 'request-error', message: 'Request could not be processed' }`, sem stack/detalhe
   interno. Pré-existente, não alterado por este ticket.

## Achados

Nenhum 🔴 Blocker. Nenhum 🟠 Major.

- 🔵 **Info-1** — Padrão idêntico ao fix do financial (`ingestScope` vs `uploadScope`),
  reforça consistência entre módulos. Sem ação necessária.
- 🔵 **Info-2** — Mapeamento de erro 413/415 para envelope genérico já cobria este caso antes
  do ticket; confirmado, não regressivo.

## Verificação executada

- `grep -rn "addContentTypeParser\|bodyLimit" src/` — parser confinado, sem vazamento.
- Teste do ticket (`contracts-upload-scope.routes.test.ts`): `tests 3 · pass 3 · fail 0`.
- Regressão (`contracts-docs-hardening` + `contracts-document-delete` +
  `contracts-documents`): `tests 35 · pass 35 · fail 0`.
- `pnpm run typecheck`: exit 0.
- `pnpm test` (suíte completa): `tests 3724 · pass 3706 · fail 0 · skipped 18` (skips =
  integração MySQL opt-in, não relacionados).
- `prettier --check` + `eslint` no diff: limpos.

## Recomendação

Prosseguir para **W3** (gate de qualidade final). Sem fixes pendentes.
