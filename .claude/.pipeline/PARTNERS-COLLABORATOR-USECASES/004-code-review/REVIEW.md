# W2 — REVIEW · PARTNERS-COLLABORATOR-USECASES

**Skill:** code-reviewer · **Round:** 1 · **Veredito:** ✅ APPROVED

## Escopo auditado (read-only)

- `domain/collaborator/repository.ts`
- `adapters/persistence/repos/collaborator-repository.in-memory.ts`
- `application/use-cases/{register,complete-collaborator-registration,deactivate,reactivate,list,find}-*.ts`
- `tests/modules/partners/application/collaborator-usecases.test.ts`

## Aderência às regras

**`.claude/rules/application.md`**
- ✅ Use cases são factory functions `(deps) => (cmd) => Promise<Result<O,E>>`.
- ✅ Sequência canônica: validar (`register`/`rehydrate`/`parse`) → fetch (`findById`/`findByCpf`) →
  domain (`Collaborator.*`) → persist (`save`) → retorna evento só após `save` ok.
- ✅ Nenhum import de `adapters/` na application (só tipos de port).
- ✅ Decisão de estado de negócio vive no domínio (guards `already-complete`/`already-active`/`disableBy`
  vêm de `Collaborator.*`, não dos use cases).

**`.claude/rules/adapters.md`**
- ✅ InMemory retorna `Result` (nunca lança); `save` recusa duplicata via `err(...)`.
- ✅ Sem `throw` cruzando a borda.

**`.claude/rules/domain.md`** (port)
- ✅ Port é `type Readonly<{...}>` de funções; erros string-union kebab EN; sem `class`/`interface`.

**Idioma / TS (CLAUDE.md)**
- ✅ Código EN; erros kebab EN (`register-collaborator-cpf-duplicate`, etc.).
- ✅ `import type` para tipos; extensão `.ts`; subpath `#src/*`.
- ✅ `Readonly<>` em comandos/outputs; sem `any`.

## Observações (não-bloqueantes)

1. **Ordem CPF→email no `register`**: determinística e espelhada no InMemory (mesma ordem na varredura).
   Num registro que viole ambas, o erro de CPF prevalece. Consistente entre use case e adapter. OK.
2. **`startOfContract: Date` no comando**: a borda HTTP/CLI converte `string → Date`. Coerente com a
   fronteira application (recebe tipos já parseados quando o parsing não é regra de domínio). OK.
3. **Erros `*-invalid-id`** declarados por simetria com supplier mesmo sem teste dedicado — superfície
   de erro espelha o precedente; sem código morto (o branch existe). Aceitável.
4. **`findByEmail(email: string)`** — email não é VO (validado inline no domínio). O use case passa o
   email **já normalizado** (`registered.value.collaborator.email`), evitando falso-negativo de
   duplicidade por espaçamento. Correto.

## Conclusão

Implementação mínima, fiel ao template supplier/financier, sem scope creep. **APPROVED** — segue para W3.
