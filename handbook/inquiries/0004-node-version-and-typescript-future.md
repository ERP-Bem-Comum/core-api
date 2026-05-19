# Inquiry-0004: Versão Node.js e estratégia TypeScript 7.0

- **Status:** Decided
- **Opened:** 2026-04-28
- **Closed/Decided:** 2026-04-28
- **Opened by:** Gabriel Aderaldo
- **Asked to:** Pesquisa em fontes oficiais (nodejs.org, typescriptlang.org, devblogs.microsoft.com)
- **Impact:** [ADR-0009](../architecture/adr/0009-node-24-typescript-6-with-7-roadmap.md) (supersedes parte do ADR-0002)

---

## 1. Contexto

ADR-0002 (de 2026-04-27) estabeleceu "Node.js 20 LTS" como runtime. Mas:

- Node 20 entrou em **maintenance em outubro/2025** e EOL em **abril/2026** (este mês).
- Node 24 LTS ("Krypton") foi lançado em **15/abril/2026** — versão LTS atual.
- Node 25 é Current (ímpar), não LTS, com breaking changes em test runner.
- TypeScript 7.0 Beta foi anunciado em **21/abril/2026** com compilador reescrito em Go (Project Corsa), 10× mais rápido.

Necessidade: atualizar a versão de runtime e definir estratégia de migração TS 6 → 7.

---

## 2. Pergunta(s) feita(s)

> "Qual versão Node.js usar agora? Como preparar pra TypeScript 7.0 que tá vindo?"

Sub-perguntas:
- Node 24 LTS ou 25 Current?
- TypeScript 6.0 estável ou 7.0 Beta?
- Como minimizar custo de migração futura?

---

## 3. Respostas / Investigação

### 2026-04-28 — Pesquisa nas fontes oficiais

**Node.js v24.15.0 ("Krypton") — released 2026-04-15:**
- Active LTS até outubro/2026, Maintenance até abril/2028.
- `require(esm)` estável (facilita libs ESM-only).
- Module compile cache estável.
- Raw key formats em crypto, fs `throwIfNoEntry`, http2 `http1Options`.
- npm 11.12.1, V8 atualizado, SQLite 3.51.3+ (RC).

**Node.js v25.9.0 — released 2026-04-01:**
- Current, não LTS.
- Features: `using` scopes para AsyncLocalStorage, TurboSHAKE/KangarooTwelve em Web Crypto.
- Breaking change em test runner (`MockModuleOptions` consolidada).
- Deprecations: `module.register()` (DEP0205), CryptoKey em `node:crypto`.

**TypeScript 7.0 Beta — anunciado 2026-04-21:**
- Compilador reescrito em Go (Project Corsa).
- ~10× mais rápido que 6.0.
- "Structurally identical to 6.0" — comportamento de tipo idêntico.
- Instalação: `npm install -D @typescript/native-preview@beta`.
- CLI: `tsgo` em vez de `tsc`.
- Adotantes early: Bloomberg, Canva, Figma, Google, Notion, Slack, Vercel.

---

## 4. Análise interna

### Alternativas Node

| Versão | Status | Veredito |
| :--- | :--- | :--- |
| Node 20 LTS | EOL abr/2026 | ❌ Sair imediatamente |
| Node 22 LTS | Active LTS até out/2026 | 🟡 Curto horizonte |
| Node 24 LTS | Active LTS até out/2026, maintenance até abr/2028 | ✅ **Escolhida** |
| Node 25 Current | Não LTS, ímpar | ❌ Nunca em prod financeira |

### Alternativas TypeScript

| Versão | Status | Veredito |
| :--- | :--- | :--- |
| TS 6.0 estável | Última JS-based, lançada mar/2026 | ✅ **Adotar agora** |
| TS 7.0 Beta | Beta de 21/abr/2026 | 🟡 Em CI paralelo (`tsgo`) |

### Estratégia híbrida

Codificar com TS 6.0 estável + manter `tsgo` em CI desde o dia 1 valida compatibilidade e prepara migração futura sem reescrita.

O legado já tem `@typescript/native-preview ^7.0.0-dev.20260329.1` instalado — alguém da equipe já está testando.

---

## 5. Decisão final

1. **Runtime:** Node 24 LTS em todos os serviços novos.
2. **TypeScript:** 6.0 estável agora; `tsgo` em CI como verificação paralela.
3. **Plano migração TS 7.0:** quando estabilizar (Q3/Q4 2026), avaliar e migrar. Como port é estrutural, deve ser troca de comando + ajustes mínimos.
4. **Estilo de código:** Web Standards-first onde possível (`fetch`, Web Crypto, `URL`, etc.) — facilita futura agnosticidade de runtime.

---

## 6. Saídas

- [x] [ADR-0009](../architecture/adr/0009-node-24-typescript-6-with-7-roadmap.md) criado, supersedes seção de versão do ADR-0002.
- [x] Lista de libs proibidas + libs nativas preferidas documentadas.
- [ ] `architecture/05-runtime-decisions.md` atualizado.
- [ ] Quando TS 7.0 estabilizar, criar inquiry de migração.

---

## 7. Referências

- [Node.js v24.15.0 Release Notes](https://nodejs.org/pt-br/blog/release/v24.15.0)
- [Node.js v25.9.0 Release Notes](https://nodejs.org/pt-br/blog/release/v25.9.0)
- [Announcing TypeScript 7.0 Beta — Microsoft DevBlogs](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0-beta/)
- [TypeScript 7.0 Beta — Visual Studio Magazine](https://visualstudiomagazine.com/articles/2026/04/21/typescript-7-0-beta-arrives-on-go-based-foundation-with-10x-speed-claim.aspx)
