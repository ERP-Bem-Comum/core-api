# W2 — Code Review (read-only) · AUTH-EMAIL-LINK-BASE-URLS

**Skill:** code-reviewer · **Data:** 2026-07-02 · **Round:** 1/3 · **Veredito: APPROVED ✅**

Escopo revisado (código apenas; `specs/` e `.claude/.pipeline/` ignorados):

1. `src/shared/http/email-link-base-urls.ts` (novo helper)
2. `src/server.ts` (wiring + exit 78)
3. `tests/shared/http/email-link-base-urls.test.ts` (W0)
4. `.env.example` + `handbook/infrastructure/03-secrets-catalog.md` §3.6 (docs, via `git diff --cached`)

---

## Verificações-alvo do request

| # | Verificação | Resultado |
| --- | --- | --- |
| (a) | Narrowing do `Result` após `process.exit(78)` | **OK.** `process.exit` é tipado `never` (@types/node); o bloco `if (!emailLinkUrls.ok) { …; process.exit(78) }` não faz fall-through, então o CFA estreita `emailLinkUrls` para `{ ok: true }` na linha 121 e `.value` é acessível sem `as`/`!`. Typecheck do diff limpo (W1) confirma. |
| (b) | `exactOptionalPropertyTypes` em `EmailLinkBaseUrls` | **OK.** Tipo `Readonly<Partial<Record<Field, string>>>`: cada campo é `string` quando presente (nunca `string \| undefined`). `urls[field] = value` só executa com `value` já validado como `string` — nunca grava `undefined`. No `server.ts`, o spread condicional `...(x !== undefined ? { x } : {})` respeita a semântica exact-optional ao repassar para as composições. |
| (c) | Teste cobre os CAs sem duplicar cobertura existente | **OK.** 8 casos cobrem CA1/CA3/CA4/CA5 + acúmulo de erros + CA2 (base com path/porta aceita como está). A concatenação `?token=` (`resetUrl`/`activationUrl`/`autocadastroUrl`) fica deliberadamente nos testes de use case pré-existentes (W0 §"Cobertura deliberadamente NÃO duplicada") — sem sobreposição. |
| (d) | Mensagens de erro trazem o nome da env (operabilidade) | **OK.** Ausência: `` `${name} nao configurada (obrigatoria em producao …)` ``; inválida: `` `${name} deve ser URL absoluta http(s), valor atual: "${value}"` ``. Ambas nomeiam a env; a de inválida ainda ecoa o valor recebido (base URL pública, não-secreta) — bom para diagnóstico de boot. |

---

## Conformidade transversal

| Regra | Situação |
| --- | --- |
| ADR-0006 (sem import de `domain/`/`application/` de outro módulo) | **OK.** Helper importa só `#src/shared/primitives/result.ts`. `server.ts` é composition root — importa apenas `public-api/*`, permitido. |
| errors-as-values (Result, sem throw vazando) | **OK.** Helper retorna `Result<EmailLinkBaseUrls, readonly string[]>`; o único `throw` (`new URL`) é capturado no `try/catch` de `isAbsoluteHttpUrl`. `process.exit(78)` é imperativo de composition root (não é domínio), consistente com o `process.exit(1)` já presente em `server.ts`. |
| Sintaxe TS (`import type`, extensões `.ts`, subpath `#src`) | **OK.** `import { err, ok, type Result }` (inline type), extensão `.ts` no specifier, subpath `#src/shared/...`. |
| Idioma (código EN; mensagens/comentários PT-ASCII) | **OK.** Identificadores EN; mensagens e comentários PT sem acentuação (ASCII puro), no estilo do worker `run.ts`. |
| Convenção de testing (`tests/**/*.test.ts`, mirror do `src/`, `#src/*`) | **OK.** `tests/shared/http/email-link-base-urls.test.ts` espelha `src/shared/http/email-link-base-urls.ts`; usa `node:test` + `node:assert`; `?? ''` defensivo contra `noUncheckedIndexedAccess`. |
| YAGNI / escopo (apenas as 3 base URLs) | **OK.** Nenhuma env/campo além do escopo; helper minimalista (allowlist de protocolo `http:`/`https:`, sem denylist). |
| CA1–CA6 do `000-request.md` | **Todos cobertos.** CA1/CA3/CA4/CA5 por teste; CA2 por teste (path/porta) + testes de use case; CA6 pelo diff de `.env.example` + catálogo §3.6. |

---

## Achados

### Blocker
Nenhum.

### Major
Nenhum.

### Minor

- **M1 — `src/shared/http/email-link-base-urls.ts:23-30` · whitespace circundante em URL válida é preservado, não rejeitado.**
  `new URL('  https://x.com  ')` faz trim de espaços à borda e parseia com sucesso → `isAbsoluteHttpUrl` retorna `true`; porém `urls[field] = value` armazena o **valor cru** (com os espaços). O use case de auth concatena por template (`create-user-by-admin.ts:182`: `` `${deps.activationBaseUrl}?token=…` ``), preservando o espaço embutido → link potencialmente quebrado. (O de partners, `issue-collaborator-invite.ts:64`, faz `new URL(base)` e normalizaria.) O escopo cita "rejeita … whitespace", e o caso whitespace-**only** (`'   '`) está corretamente coberto/rejeitado; este é o subcaso "espaço à borda de URL sob o resto válida". Baixa probabilidade em env var real.
  **Sugestão (não-bloqueante):** normalizar com `value.trim()` antes de validar/armazenar, ou rejeitar se `value !== value.trim()`. Fica a critério — não impede o merge.

### Nits (informativos, sem ação exigida)

- Path de `process.exit(78)` no `server.ts:117-120` não é coberto por teste unitário (composition root imperativo). Verificado por inspeção nesta wave (W0 §"Cobertura deliberadamente NÃO duplicada" delega explicitamente ao W2); comportamento correto: itera erros → stderr com prefixo `server:` → exit `EX_CONFIG` (78), mesma convenção do worker `email-dispatch/run.ts`.
- `.env.example` usa `⚠️` e acento (`OBRIGATÓRIAS`) nas linhas novas — consistente com o estilo já existente do arquivo (linha `# ⚠️ E2E ONLY — NUNCA em prod`). Não é violação da regra PT-ASCII (essa vale para mensagens de erro/strings internas, não para doc `.env.example`).

---

## Veredito

**APPROVED** — implementação mínima, aderente ao escopo e às regras transversais; todos os CAs cobertos e as 4 verificações-alvo (a–d) confirmadas. O único achado (M1) é uma hardening opcional de baixa probabilidade, fora dos CAs testados — **não bloqueia** o avanço para W3.

**Próximo passo:** W3 (ts-quality-checker) — `typecheck` + `format:check` + `lint` + `test`. Lembrete da nota de baseline (`000-request.md` §"Nota de baseline"): o typecheck global só fecha verde após rebase sobre o commit da migração ETL do Gabriel; o diff **deste** ticket já está limpo isoladamente.

---

## Round 2

**Skill:** `code-reviewer` (W2, read-only, via contratos-orchestrator) · **Motivo do round:** o round 1 aprovou o diff mas DEIXOU PASSAR violação da regra invariante de idioma (AGENTS.md §Idioma: identificadores de código em EN) — o diff usava `autocadastroBaseUrl` + env `PARTNERS_AUTOCADASTRO_BASE_URL` (PT), propagados do campo legado do partners. O humano flagrou → W1-fix (`typescript-language-expert`) renomeou para `selfRegistrationBaseUrl` / `PARTNERS_SELF_REGISTRATION_BASE_URL`. Registro de processo: o `state-cli` não permite `wave-reopen` de wave APPROVED (só REJECTED), então este round vive neste addendum; o gate mecânico final é o W3.

### Método aplicado (correção do viés do round 1)

Cada identificador NOVO do diff auditado isoladamente contra a regra de idioma, **sem** usar "consistência com o vizinho/legado" como critério — foi esse viés que deixou o PT passar no round 1. Legado PT (`autocadastro*` no partners) é violação rastreada (**issue #333**), não padrão a seguir. Strings de VALOR (URLs de exemplo, prosa PT-ASCII de comentário/docstring, descrições de `.env.example`/handbook) permitidas e excluídas da auditoria de identificadores.

### 1. Auditoria de idioma (identificadores novos do diff)

| Identificador novo | Arquivo | Veredito |
| --- | --- | --- |
| `readEmailLinkBaseUrls`, `EmailLinkBaseUrls`, `Field`, `FIELDS`, `isAbsoluteHttpUrl`, `isProduction` | `email-link-base-urls.ts` | ✅ EN |
| Campos `resetBaseUrl`, `activationBaseUrl`, `selfRegistrationBaseUrl` | helper / `server.ts` | ✅ EN |
| Envs `AUTH_ACTIVATION_BASE_URL`, `PARTNERS_SELF_REGISTRATION_BASE_URL` | código/docs/teste | ✅ EN |
| Locais `emailLinkUrls`, `errors`, `urls`, `message`, `value`, `name` | helper / `server.ts` | ✅ EN |
| Nomes de arquivo `email-link-base-urls(.test).ts` | — | ✅ EN |

Nenhum identificador PT novo restou. Strings de valor PT toleradas: path `/autocadastro` em fixture (valor de URL), docstring do helper (prosa), descrições PT em `.env.example`/§3.6.

### 2. Mapeamento provisório do `server.ts` (#333)

Único uso remanescente de `autocadastroBaseUrl` no diff = par de spreads comentados `// campo legado PT do partners — rename rastreado na issue #333` (`server.ts:179` mysql, `:186` memory), mapeando para o campo legado `composition.ts:139` — type-safe, ponte legítima até a #333; não endossa o nome PT.

### 3. Não-regressão e coerência

- Teste alvo: **8/8 pass** pós-rename; asserts batem com as envs novas.
- Docs coerentes: env nova idêntica entre `.env.example`, catálogo §3.6 e `FIELDS` do código.
- `grep AUTOCADASTRO_BASE_URL` em src/tests/handbook/.env.example: nenhuma referência à env antiga sobrevive.
- Demais `autocadastro*` do repo são pré-existentes do partners, fora do diff — escopo da #333.

### Achados do round 2

- **Blocker / Major:** nenhum — a violação de idioma foi corrigida integralmente.
- **Minor (não-bloqueante):** o spread `autocadastroBaseUrl:` duplica nas branches `mysql`/`memory`; a duplicação desaparece quando a #333 renomear o campo na composição.

**Veredito round 2: APPROVED ✅**
