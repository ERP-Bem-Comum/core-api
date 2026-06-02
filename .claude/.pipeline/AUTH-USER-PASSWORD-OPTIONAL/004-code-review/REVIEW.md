# W2 (REVIEW read-only) — AUTH-USER-PASSWORD-OPTIONAL

**Skill:** code-reviewer · **Wave:** W2 · **Round:** 1 · **Data:** 2026-06-02 · **Modo:** read-only (nenhum arquivo de `src/` ou `tests/` editado).

## Veredito: **APPROVED** ✅

Round 1. Zero issues bloqueantes. A correção da Opção A (`passwordHash: PasswordHash | null`) está implementada de forma simétrica, fail-closed por tipo, e o guard anti-timing tem paridade com todos os ramos de erro genérico do `authenticateUser`. Três observações não-bloqueantes (informativas) ao final.

## Gate do round (prova literal)

```
$ pnpm run lint
$ eslint .
Done in 197ms using pnpm v11.5.0
```

→ `pnpm run lint` (typescript-eslint strict + stylistic + type-checked) **zero erros**. Typecheck/format/test já provados verdes no REPORT da W1 (1945 / 1929 pass / 0 fail / 16 skipped); re-confirmados por inspeção do diff.

---

## Auditoria por eixo

### 1. Anti-timing (CRÍTICO) — ✅ paridade confirmada

`authenticate-user.ts` tem **3 ramos** que retornam `err('invalid-credentials')` sem rodar o verify real da senha. Os três rodam o **dummy verify** contra `deps.dummyPasswordHash` antes de responder:

| Ramo | Linha | Dummy verify? |
| :-- | :-- | :-- |
| Usuário não encontrado (`found.value === null`) | `authenticate-user.ts:95` | ✅ `await deps.passwordHasher.verify(password.value, deps.dummyPasswordHash)` |
| Conta em cooldown (`AccountLockout.isLocked`) | `authenticate-user.ts:105` | ✅ idem |
| **Usuário federado (`passwordHash === null`)** | `authenticate-user.ts:114` | ✅ idem (ramo novo deste ticket) |
| Senha errada (verify real falso) | `authenticate-user.ts:118-124` | ✅ verify **real** (1×) |

Paridade total: todo caminho que chega a ter um `User` resolvido roda **exatamente 1** `verify` antes de responder, seja dummy ou real. CA3 prova isso contando `verifyCalls === 1` (`federated-user-no-password.test.ts:102`).

**Ordem dos guards (auditada):** o guard OIDC (L113) vem **depois** do guard de lockout (L104). Consequência correta: um user federado em cooldown retorna no L106 (1 dummy verify); um user federado sem cooldown retorna no L114 (1 dummy verify). Ambos os caminhos: 1 verify + erro genérico. Sem janela de timing diferencial entre "federado" e "senha errada". ✅

### 2. Anti-enumeration — ✅

Nenhum dos ramos novos distingue, no erro retornado, "conta federada" de "senha errada" de "conta inexistente": todos respondem o literal genérico `'invalid-credentials'` (`authenticate-user.ts:115`). Nenhum literal novo foi adicionado à union `AuthenticateUserError` (`authenticate-user.ts:42-50`) — reuso do genérico existente (DD-LOGIN-01). Não há `console.*`/log que revele o estado federado em nenhum dos arquivos auditados. ✅

### 3. Mapper simétrico — ✅ inversos exatos, sem `?? ''`

- **Leitura** (`user.mapper.ts:151-156`): `passwordHash` inicia `null`; só roda `PasswordHash.fromString` quando `userRow.passwordHash !== null`. O `?? ''` do bug original foi **removido**. `NULL → null` byte-a-byte; hash não-nulo ainda rejeita vazio (`err('password-hash-empty')`) como defesa contra DB corrompido (CA2 cobre).
- **Escrita** (`user.mapper.ts:224-225`): `user.passwordHash === null ? null : (user.passwordHash as unknown as string)`. `null → NULL`.
- **Round-trip:** `null → NULL → null` e `hash → hash → hash` preservam. CA1 prova a leitura; CA5 (gated `MYSQL_INTEGRATION=1`) prova o round-trip end-to-end — pendente de Docker (registrado na W1, não bloqueia W2). ✅

O cast `as unknown as string` na escrita (L225) está em adapter (camada autorizada a castar branded→primitivo na borda de persistência), coerente com os demais campos (`id`/`email` em L229-230). ✅

### 4. Domínio (`| null`, narrowing, sem `throw`/`class`/`any`, imutabilidade) — ✅

- `types.ts:21` — `passwordHash: PasswordHash | null` dentro de `UserCore = Readonly<{...}>`. **`| null` (não `?`)** — honra `exactOptionalPropertyTypes` (a ausência é um estado de primeira classe, não uma propriedade omissível). ✅
- `RegisterInput.passwordHash` (`user.ts:34`) permanece **`PasswordHash` não-null** — registro local sempre tem credencial. Correto: não relaxar o que não precisa. ✅
- `changePassword(user, newHash: PasswordHash, ...)` (`user.ts:78-90`) recebe hash **não-null** — o resultado de uma troca é sempre credencial local. Correto. ✅
- Narrowing exaustivo: os 3 use cases fazem `if (...passwordHash === null) return err(...)` **antes** de passar o hash a `verify`, estreitando `PasswordHash | null → PasswordHash` para o compilador. Sem `!`, sem `as`. ✅
- Sem `throw`/`class`/`this`/`any` introduzidos. Imutabilidade preservada (`Readonly<>` em `UserCore`; mapper monta objetos literais imutáveis). ✅

### 5. PasswordHash nunca vaza — ✅

`PasswordHash` é branded opaco (`password-hash.ts:17`). Nenhum dos arquivos auditados loga, serializa em mensagem de erro, ou expõe o valor. Os erros são string-literals genéricos; os tagged errors do mapper carregam apenas `reason: string` (`'password-hash-empty'`), nunca o hash. ✅

### 6. Semântica de reset para user OIDC (`confirm-password-reset.ts`) — ✅ decisão sólida

`confirm-password-reset.ts:94`: `if (active.value.passwordHash === null) return err('reset-token-invalid')`. A decisão é **não permitir** que um reset crie credencial local para conta federada, respondendo o erro genérico de token inválido (não revela que a conta é OIDC). Avaliação:

- **Coerente** com DD-USER-OIDC ("um reset não pode criar credencial local para conta federada") e com anti-enumeration (mesmo erro de token expirado/inexistente).
- **Trade-off aceitável:** o token de reset já foi validado (`consume` ainda não rodou no ponto do guard? — **sim rodou**, L81-82). Aqui há um detalhe a observar (ver Obs. 3) mas não compromete segurança nem a decisão.

A semântica está correta para o escopo: federação real é fora de escopo; garante-se que OIDC **nunca** ganha senha local por reset. ✅

### 7. DD-USER-OIDC registrado e coerente — ✅

`handbook/domain/auth/design-decisions.md:318-341` (seção dedicada) + `:375` (histórico). Cobre: Opção A escolhida; mapeamento `NULL ↔ null` byte-a-byte (corrige o `?? ''`); dummy verify no `authenticate`; erro genérico no `changePassword`/`confirmPasswordReset`; Opções B/C rejeitadas com justificativa. Coerente com o código implementado. ✅

### 8. Lint estrito / idioma / `import type` / extensão `.ts` — ✅

- `pnpm run lint` zero erros (gate acima).
- Idioma: erros internos em **EN kebab-case** (`'invalid-credentials'`, `'reset-token-invalid'`, `'password-hash-empty'`). Comentários/docs em PT. ✅
- `import type` para imports de tipo puro (`types.ts:13-16`, `authenticate-user.ts:28-38`, etc.). ✅
- Extensão `.ts` em todos os imports relativos. ✅

---

## Observações não-bloqueantes (informativas — não exigem ação neste ticket)

1. **Ramos de parse mal-formado sem dummy verify (pré-existente, fora de escopo).** `authenticate-user.ts:83` (email mal-formado) e `:86` (senha mal-formada) retornam `'invalid-credentials'` **sem** dummy verify. Isso é anterior a este ticket (DD-LOGIN-01) e é uma classe de timing distinta: o curto-circuito ocorre **antes de qualquer lookup**, logo não distingue contas existentes de inexistentes nem federadas de locais — não é o side-channel que o ticket endereça. Mencionado apenas para registro; não é regressão e não cabe corrigir aqui.

2. **CA5 (round-trip NULL) ainda não exercitado.** O teste `user-federated-roundtrip.drizzle.test.ts` é gated por `MYSQL_INTEGRATION=1` e skipa com Docker OFF (W0/W1). A simetria leitura↔escrita do mapper está provada por inspeção (eixo 3) e por CA1 (leitura). Recomenda-se rodar `pnpm run test:integration:auth` com Docker ON antes de fechar o ticket (W3), conforme `[[project-test-integration-auth-gap]]` — não bloqueia o veredito de W2 (read-only).

3. **`confirm-password-reset.ts`: ordem `consume` antes do guard OIDC.** O `ResetToken.consume` (L81-82) roda **antes** do guard `passwordHash === null` (L94). Para um user federado com um token de reset válido, o `consume` produz o token consumido em memória, mas o guard retorna `'reset-token-invalid'` em L94 **sem** persistir o `consumed.value` (o `save` do token só ocorre em L104, após o guard). Resultado: o token **não** é queimado para conta federada — o que é até benigno (o reset nunca poderia ter efeito numa conta OIDC). Não há vazamento nem inconsistência de estado persistido. Apenas registro de que a ordem é segura por acidente feliz; se no futuro a federação real entrar, revisitar se o token deve ser invalidado nesse ramo.

---

## Próximo passo

**Checkpoint humano** (parada solicitada em W2). Após aprovação, W3 (QUALITY, skill `ts-quality-checker`): `pnpm run typecheck && pnpm run format:check && pnpm test && pnpm run lint`, idealmente com Docker ON para exercitar CA5 via `pnpm run test:integration:auth`.
