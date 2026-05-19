[← Voltar para Arquitetura](./README.md)

# ⚙️ Decisões de Runtime

> **Status:** vigente | **Última revisão:** 2026-04-27

---

## 1. Decisão Atual

**Manter Node.js (versão 20 LTS) em todos os serviços** durante a fase de migração.

> Decisão raiz: [ADR-0002](./adr/0002-keep-nodejs-runtime.md).

---

## 2. Justificativa

| Razão | Detalhe |
| :--- | :--- |
| Continuidade com legado | NestJS já é Node — reduz superfície de risco e curva de aprendizado |
| Ecossistema bancário | Libs de CNAB 240, OFX, parsers Bradesco são predominantemente Node |
| Pool de talento | Mais fácil contratar / onboardar |
| Uma batalha de cada vez | Mudança de paradigma + arquitetura + runtime simultânea = projeto morto |
| Operação | Time de infra opera UM runtime, não dois |

---

## 3. Por Que NÃO Trocar Agora

### ❌ Deno
- Possível gap em libs bancárias justamente no primeiro BC.
- Risco operacional duplicado (dois runtimes em prod).
- Ganho marginal não justifica o custo durante migração.

### ❌ Bun
- Mesmas razões do Deno.
- Percepção de menor maturidade em produção financeira crítica.

### ❌ Heterogeneidade (Deno no BFF, Node no core)
- Sem ganho operacional concreto.
- Custo de manutenção dupla sem retorno proporcional.

---

## 4. Estilo de Código Compatível com Migração Futura

Embora rodando em Node, o `core-api` adota estilo **runtime-agnóstico** quando possível:

- ✅ Web Standards onde o ecossistema permite (`fetch`, `Request`, `Response`, `URL`, Web Crypto).
- ✅ Domínio puro sem `class`/`this`, com `Result<T,E>` e ports/adapters.
- ✅ Capabilities específicas do runtime (env, fs, signals, server bootstrap) **isoladas em adapters**.

**Consequência:** uma migração futura para Deno/Bun seria troca de adapter, não reescrita do domínio.

### Exemplos do estilo "agnóstico"

| Em vez de | Use |
| :--- | :--- |
| `import * as fs from 'node:fs/promises'` no domínio | Port `FileReader` injetado, com adapter Node |
| `process.env.X` espalhado | Port `EnvReader` injetado |
| `node-fetch` | `fetch` global (Node 20+) |
| `crypto.randomBytes` (callback) | `crypto.randomUUID()` (Web Crypto) |
| `new Buffer(x)` | `Uint8Array` ou `TextEncoder` |

---

## 5. Versão e Gestão

| Item | Valor |
| :--- | :--- |
| Versão alvo | Node 20 LTS |
| Lock de versão | `.nvmrc` em cada repositório |
| Gerenciador de pacotes | Preferência por `pnpm` em projetos novos |
| Manager de versão | Volta / nvm / fnm (a critério do dev) |

> Re-avaliar para Node 22 LTS quando estiver próximo do EOL do 20 (abril/2026 — alinha com fim da fase 1 de migração).

---

## 6. Quando Re-avaliar Esta Decisão

A decisão deve ser revisitada (gerando ADR novo) se:

1. Bradesco/OFX/CNAB tiverem suporte equivalente em Deno/Bun.
2. Time tiver experiência operacional consolidada com runtime alternativo.
3. Surgir requisito específico que Node não atenda bem (ex: edge compute, performance extrema).
4. Comunidade Node introduzir incompatibilidade que justifique mudança.

> Re-avaliação **gera ADR novo** que `supersedes` o ADR-0002 se aprovado. ADR-0002 não é editado.

---

## 7. Referências

- [ADR-0002](./adr/0002-keep-nodejs-runtime.md) — decisão raiz.
- [02-system-topology.md](./02-system-topology.md) — onde os serviços rodam.
