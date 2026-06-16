[← Voltar para Inquiries](./README.md)

# Inquiry 0022 — `src/jobs/`/auto-expire: anti-pattern ou complexidade essencial?

- **Status:** Concluída
- **Data:** 2026-06-16
- **Gatilho:** Stakeholder (dev/P.O.) sentiu "um GIGANTE anti-pattern" no auto-expire e em `src/jobs/`, sem conseguir nomeá-lo. Pediu estudo completo com hipóteses em TODAS as dimensões (linguagem, lib, infra, processo, arquitetura).
- **Método:** Workflow multi-agente — **35 agentes**, 4 fases (Diagnóstico 5 lentes → Hipóteses 6 dimensões → Avaliação adversarial 1:1 → Síntese). Teoria canônica via `acdg-skills` (path), citada por `arquivo.md:linha`. Placar dos vereditos: **4 adopt-now · 8 adopt-conditionally · 1 defer · 10 reject**.

---

## Veredito central

**Não existe "anti-pattern GIGANTE".** O núcleo do auto-expire é complexidade **essencial** bem-isolada — Brooks: _"The complexity of software is an essential property, not an accidental one"_ (`no-silver-bullet--brooks.md:41`). O que o stakeholder **sente** é real, mas **mal-localizado**: é **OVER-PROCESS / cerimônia desproporcional ao risco** (complexidade _acidental_ de Brooks, `:25`), de **severidade BAIXA** — não um defeito de arquitetura.

Três evidências que refutam o "gigante":

1. **Ordem de nascimento (git):** a máquina de eventos (`worker`/`outbox`, `e03a146`, 2026-05-25) nasceu **3 semanas antes** do sweeper (`54dd841`, 2026-06-15). Ela **não foi construída para esta feature** — o sweep só se plugou nela (+~309 LOC, +1 query, +1 índice).
2. **Topologia não é distribuída:** os 3 processos (HTTP / outbox-worker / sweeper) = **1 deployável, mesmo MySQL, zero rede/IPC** — modular monolith literal (Newman, `building-microservices--sam-newman.md:441`). Os avisos de Newman contra a _"microservice tax"_ (`:703`) miram fronteiras **em rede**, ausentes aqui.
3. **Custo real foi baixo:** `CTR-AUTO-EXPIRE` = 4 waves em **87 min** (todas single-round GREEN/APPROVED); `CTR-SWEEPER-DBURL-FILE` = **~10 min**. E o backstop pagou: o W0 RED **capturou um bug real** (guarda D+1 invertida).

> O anti-pattern **não mora** no `sweeper`+`outbox`+índice+`Clock` (esses são essência). Mora na **maquinaria de processo em volta** e na **prosa aspiracional**.

---

## Diagnóstico: essencial vs. acidental (Brooks)

| Peça | Classe | Veredito |
| --- | --- | --- |
| Guarda D+1 (`Contract.expire`), cutoff BRT (`ClockSaoPaulo`) | **Essencial / Conformity** | Manter. O fuso é imposto pela realidade legal BR (`:50`), não inventado. Inlinar reintroduz o bug documentado em `clock-sao-paulo.ts:3-7`. |
| `findExpirable` + índice `ctr_contracts_expirable_idx` | **Essencial** | Manter. Predicado de negócio; índice evita full-scan. |
| Outbox p/ `ContractEnded{Expired}` (`save(contract,[event])` atômico) | **Essencial (herdado de ADR-0015)** | Manter. É 1 INSERT na mesma tx do UPDATE — não é dual-write. |
| Separação de processos (HTTP/worker/sweeper) | **Essencial** | Manter. Cadências incompatíveis (~ms vs 24h); isolamento de falha (Parnas, `criteria-for-modularization--parnas.md:28`). |
| ADR-0041 (158 linhas) p/ um job diário | **Acidental (timing/escopo)** | Severidade média. Conteúdo correto (é fundação de TODOS os jobs), mas decidiu multi-instância antes da 2ª instância existir. |
| Ticket de 4 waves p/ ler um secret (`CONTRACTS_DATABASE_URL_FILE`) | **Acidental (processo)** | Severidade média. A isenção "config vai direto" do AGENTS.md existe mas é **inerte**. |
| Prosa "HTTP/Redis/NATS/RabbitMQ" em `sweeper.ts:37-38` | **Acidental (speculative generality)** | Único cheiro real — mas é **comentário**, custo de remoção zero. |

---

## O que foi REFUTADO (a intuição do stakeholder morreu na refutação)

**Todas as 10 hipóteses radicais** (reescrever runtime/banco/arquitetura) **morreram** na avaliação adversarial:

- **Premature distribution** (colapsar job+worker+outbox) — **REFUTADO**: não há distribuição; colapsar no `setInterval` do outbox já foi rejeitado em `ADR-0041:136` (cadências incompatíveis, anti-Parnas). Seria **regressão** de isolamento.
- **Shell + SQL puro / MySQL EVENT** — **REJECT**: erra a borda D+1 (o SQL não conhece o fuso de negócio — `repository.ts:68-70` documenta porquê), **mata o evento** `ContractEnded` (viola `ADR-0015:51`), e `ADR-0020:103` proíbe lógica de negócio no SGBD. `simplicityDelta -8` (simplicidade local ilusória, sistema globalmente mais complexo).
- **Trocar runtime (Go/Rust/Bun/Deno/Lua/Zig)** — **REJECT**: re-expressa a complexidade essencial (D+1/fuso/outbox) num 2º runtime, **duplicando a fonte de verdade** (Brooks `:113` — _"such attacks make no change whatever"_); job é I/O-bound (runtime nativo não acelera o MySQL); nenhum gatilho de reabertura do `ADR-0002:77-84` foi acionado.
- **Over-modeling de domínio** — **REFUTADO**: auto-expire é transição de um agregado que já existia; o net-new é mínimo.

---

## Recomendações que sobreviveram (acionáveis, todas custo S e reversíveis)

### 1. `PROC-H1` — operacionalizar a isenção que **já existe** (maior alavanca)

Ligar o enum `TicketSize` (hoje gravado no `STATE.json` mas **inerte** — não gateia nada) a uma escada determinística no AGENTS.md:

- **XS** (config / secret-reader / 1-3 linhas) → direto, sem pipeline;
- **S** (sem nova invariante) → `W0(RED)` + `W3(gate)`, dispensa REPORT-W1/REVIEW-W2 formais;
- **M/L/XL** ou **qualquer toque em invariante de domínio** (Money/Period/guarda D+1/agregado/cross-módulo) → **4 waves obrigatórias**.

Ataca a causa-raiz mecânica do desconforto (a regra escrita não é aplicada). McConnell `managing-technical-debt--mcconnell.md:166` (a "terceira via": rápido **e** contido). **Guard-rail:** leitura de secret/credencial nunca pula revisão de segurança.

### 2. `#50` — entregar o cron (única peça **essencial** faltante)

Service `contracts-sweeper` no compose (`profiles:[jobs]`, mesma imagem via `command` override, `restart:no`, `depends_on: mysql healthy`) + secret + scheduler em ERP-INFRA às 00:05 BRT. É o que a issue #50 já rastreia. **Ressalva honesta:** em pré-lançamento/zero-usuários **não é urgente** — agendar para quando o 1º contrato `Fixed` real se aproximar do vencimento; até lá `POST /end {Expire}` manual cobre o caso atual (CT 0776/2026). Construir+blindar o motor antes de existir 1 caso vivo é WIP especulativo (`mcconnell.md:38`).

### 3. `LIB-H2` + `PROC-H3` — cosmético + critério

- Deletar a enumeração `HTTP/Redis/NATS/RabbitMQ` de `sweeper.ts:37-38` e referenciar ADR-0015/0041 (Fowler `refactoring--martin-fowler.md:2323`; AGENTS.md anti-padrão #2). É bug-fix trivial — **encostar no próximo toque do arquivo, não abrir ticket de 4 waves** (seria a ironia de criar cerimônia para combater cerimônia).
- Registrar no AGENTS.md o critério objetivo **"job merece ADR?"**: só quando cria/muda topologia/fronteira ou contradiz/estende um ADR aceito; instância de padrão já fixado vira **só ticket**.

---

## O que MANTER (não mexer — é essência)

1. Guarda D+1 + `ClockSaoPaulo` (Intl nativo, zero-dep). **Não** adicionar lib de data.
2. Outbox para `ContractEnded{Expired}` (atomicidade exigida por ADR-0015).
3. Separação de processos HTTP/worker/sweeper (isolamento de Parnas).
4. `findExpirable` + índice dedicado (predicado de negócio ≠ `listPaged` da UI).
5. Runtime Node 24 + TS único (ADR-0002) — não há gatilho de reabertura.
6. ADR-0041 como decisão de **fundação** (paga dividendo em cada job futuro; já defere BullMQ como YAGNI). **Não** reescrever nem aplicar "cap de linhas".

---

## Questões abertas (decisão da P.O.)

1. **#50 agora ou agendado?** Em pré-lançamento a feature está inerte, mas o UPDATE manual cobre o único caso atual. Timing é da P.O.
2. **Secret `_FILE` bloqueia o lançamento** ou roda com env direta (paridade com o worker irmão) até o #51 existir? `readJobConfig` já suporta ambos — registrar a decisão temporária na #50.
3. **Instituir o piso de rigor inegociável** (qualquer toque em Money/Period/guarda → mínimo W0 RED) como cláusula da escada de fast-track? Sobrevive só como o "else" de `PROC-H1`.
4. **1º consumidor cross-módulo de `ContractEnded`** (Financeiro Fase 2): o gatilho de reavaliação do transporte já está fixado em `ADR-0015:172` (>3 consumidores). Hoje há **zero** consumidor fora de `contracts/`.

---

## Conclusão

A cura é **processual e barata** (calibrar o processo por risco + entregar o cron quando o negócio pedir), **não arquitetural**. O design — `sweeper` puro, outbox, índice, Clock de negócio, runtime único — está **correto** e majoritariamente essencial. O desconforto é legítimo, mas a alavanca é pequena: **fechar a lacuna entre a regra de processo escrita e a aplicada**, e **aparar a prosa especulativa** (1 comentário).
