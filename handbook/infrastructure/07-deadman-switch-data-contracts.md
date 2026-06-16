# 07 — Dead-man's switch: contratos de dados (JSONL)

> Fundação de dados do dead-man's switch redundante — ver decisão em
> [ADR-0042](../architecture/adr/0042-deadman-switch-redundant.md). SPIKE #66.

Três arquivos **JSONL** (uma linha = um objeto JSON; `\n` por registro), **append-only**.
JSONL é escolhido por: histórico imutável, append barato (sem reescrever o arquivo),
resiliência a corrupção parcial (uma linha quebrada não invalida o resto), e evolução de
schema por linha (campo `v`).

| Caminho | Onde | Escrito por | Conteúdo |
| --- | --- | --- | --- |
| `status/<emitter>/<seq>.jsonl` | Object Storage (S3/R2) | **Emissor** | sinais de vida — **1 objeto por ping** (ver §0) |
| `history.jsonl` | repositório (Git) | **GitHub Actions (ingestão)** | pings ingeridos (webhook + self-heal) — fallback |
| `audit.jsonl` | repositório (Git) | **GitHub Actions (Auditor)** | 1 registro por run do Auditor — decisão + keep-alive |

## 0. Por que 1-objeto-por-ping no Object Storage (decisão (a))

S3/R2 **não têm `append` nativo**. Em vez de read-modify-write do `status.jsonl` (race entre
pings + reescreve o objeto inteiro), cada ping é um **objeto imutável** sob o prefixo
`status/<emitter>/<seq>.jsonl` (1 linha JSON por objeto). Vantagens: **PUT puro idempotente**
(o mesmo `seq` sobrescreve com conteúdo idêntico — sem perda), sem coordenação, e o Auditor
**lista o prefixo** (`ListObjectsV2`) e ordena por `seq`. "`status.jsonl`" no resto deste doc
designa **o conjunto** desses objetos, não um arquivo único.

---

## 1. `status.jsonl` — ping do Emissor (S3/R2)

```jsonc
{"v":1,"ts":"2026-06-16T03:05:00.000Z","emitter":"sweeper-vps-qa","seq":4211,"kind":"ping","sig":"9f86d0…"}
{"v":1,"ts":"2026-06-16T04:05:00.000Z","emitter":"sweeper-vps-qa","seq":4212,"kind":"ping","sig":"a3c5…"}
```

| Campo | Tipo | Regra |
| --- | --- | --- |
| `v` | int | schema version da **linha** (começa em `1`) |
| `ts` | string | ISO-8601 UTC **com `Z`** — instante do ping (clock do Emissor; informativo) |
| `emitter` | string | id estável do emissor (`<sistema>-<ambiente>`); **kebab**, sem espaços |
| `seq` | int ≥ 0 | **monotônico crescente por `emitter`**, persistido entre reinícios — base de ordenação, dedup e detecção de gaps |
| `kind` | enum | `"ping"` (rotina) \| `"boot"` (1º sinal após reinício do emissor) |
| `sig` | string | HMAC-SHA256 (hex) da **linha canônica** (ver §4) — anti-spoof; obrigatório em prod |

**Ordenação** = por (`emitter`, `seq`), **não** por `ts` (o relógio do emissor pode driftar).
**`boot`** não reseta `seq` (monotonicidade é absoluta); só marca reinício para diagnóstico.

---

## 2. `history.jsonl` — ping ingerido (repo, via Actions)

```jsonc
{"v":1,"ts":"2026-06-16T03:05:00.000Z","emitter":"sweeper-vps-qa","seq":4211,"source":"webhook","ingested_at":"2026-06-16T03:05:02.114Z","sig":"9f86d0…"}
{"v":1,"ts":"2026-06-16T04:05:00.000Z","emitter":"sweeper-vps-qa","seq":4212,"source":"audit-merge","ingested_at":"2026-06-17T00:05:30.882Z","sig":"a3c5…"}
```

Mesmos campos do ping **+**:

| Campo | Tipo | Regra |
| --- | --- | --- |
| `source` | enum | `"webhook"` (chegou por `repository_dispatch`) \| `"audit-merge"` (o Auditor recuperou do S3 no self-heal) |
| `ingested_at` | string | ISO-8601 UTC de quando o Actions **registrou** (≠ `ts` do emissor) |

---

## 3. `audit.jsonl` — registro do Auditor (repo) + keep-alive

```jsonc
{"v":1,"run_at":"2026-06-17T00:05:00.000Z","emitter":"sweeper-vps-qa","last_seen":"2026-06-16T04:05:00.000Z","age_h":20.0,"status":"alive","merged":1,"threshold_days":3}
{"v":1,"run_at":"2026-06-20T00:05:00.000Z","emitter":"sweeper-vps-qa","last_seen":"2026-06-16T04:05:00.000Z","age_h":92.0,"status":"DEAD","merged":0,"threshold_days":3,"payload_fired":true}
```

| Campo | Tipo | Regra |
| --- | --- | --- |
| `run_at` | string | ISO-8601 UTC do run do Auditor |
| `last_seen` | string | `max(ts)` entre `status.jsonl` (S3) e `history.jsonl` (repo) para o `emitter` |
| `age_h` | number | `(run_at − last_seen)` em horas |
| `status` | enum | `"alive"` \| `"DEAD"` |
| `merged` | int | nº de linhas recuperadas do S3 para `history.jsonl` no self-heal |
| `threshold_days` | number | limite vigente (SLO — ADR-0042 D3) |
| `payload_fired` | bool? | presente e `true` apenas quando o payload de contingência foi disparado |

**Toda execução do Auditor escreve uma linha** (mesmo `alive`, mesmo sem ping novo) e
**commita** — esse commit é o **keep-alive** que evita a suspensão de 60 dias dos workflows
agendados do GitHub.

---

## 4. Regras transversais

- **Append-only.** Nunca editar/remover linha. Correção = nova linha com `seq` maior (ou um registro `audit` explicando).
- **Idempotência / dedup.** Chave única = (`emitter`, `seq`). O mesmo ping pode chegar pelo S3 **e** pelo webhook — o consumidor deduplica por essa chave. Reprocessar é no-op.
- **Detecção de gaps.** Buraco em `seq` (ex.: …4211, 4213) = ping(s) perdido(s) — não necessariamente "morto", mas observável e alertável como degradação.
- **Versionamento por linha.** `v` permite evoluir o schema sem migração: leitores toleram `v` conhecido; `v` desconhecido → log + skip seguro (forward-compat).
- **Integridade (`sig`).** `sig = HMAC-SHA256(key, canonical(line))`, onde `canonical` = JSON com chaves **ordenadas** e **sem** o próprio `sig`. A `key` é segredo compartilhado Emissor↔Auditor (GitHub Secret + secret do host do emissor). Sem `sig` válido → o Auditor **ignora** a linha (anti-spoof: ninguém forja "vida" nem injeta ping falso).

---

## 5. Algoritmo de decisão (Auditor)

```
para cada emitter:
  remote_last = max(ts) sob status/<emitter>/* no S3   # ListObjectsV2(prefix) + read
  local_last  = max(ts) de history.jsonl no repo
  last_seen   = max(remote_last, local_last)         # robusto a falha de uma fonte
  age         = now - last_seen
  # self-heal: linhas em status.jsonl ausentes em history.jsonl (por (emitter,seq)) → append + commit
  merge_missing(status.jsonl → history.jsonl)
  se age > threshold_days:  status = DEAD; disparar payload de contingência
  senão:                    status = alive
  escrever audit.jsonl + commit (keep-alive)
```

O `last_seen = max(remoto, local)` é o ponto que torna a **detecção** robusta: basta **uma**
das duas fontes ter registrado o ping para o sistema ser considerado vivo. O 2º auditor
independente (ADR-0042 D2, em ERP-INFRA) roda o **mesmo** algoritmo sobre as **mesmas**
fontes — removendo o SPOF do Actions na decisão.

---

## 6. SLO e payload (#72)

- **SLO / `threshold_days`** (D3): versionado em **`deadman/emitters.json`** (`default_threshold_days` + override por emitter). Lido pelos dois Auditores. Para o `sweeper-vps-qa` (cron diário): `2` dias (1 de grace).
- **Payload de contingência** (quando `DEAD`): (1) **issue p1** de alerta + (2) **webhook Discord** (`DEADMAN_DISCORD_WEBHOOK`, opcional). Extensível — novos canais entram no mesmo ponto do Auditor.

### Ainda abertos
- Rotação da `key` do HMAC.
- Retenção/compactação dos objetos `status/` (append infinito no S3 → política de roll/arquivamento).
