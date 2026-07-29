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
{"v":2,"run_at":"2026-06-17T00:05:00.000Z","emitter":"sweeper-vps-qa","last_seen":"2026-06-16T04:05:00.000Z","age_h":20,"status":"alive","merged":1,"threshold_days":2}
{"v":2,"run_at":"2026-06-20T00:05:00.000Z","emitter":"sweeper-vps-qa","last_seen":"2026-06-16T04:05:00.000Z","age_h":92,"status":"dead","merged":0,"threshold_days":2,"payload_fired":true}
{"v":2,"run_at":"2026-06-21T00:05:00.000Z","emitter":"sweeper-vps-qa","last_seen":null,"age_h":null,"status":"bootstrap","merged":0,"threshold_days":2}
```

| Campo | Tipo | Regra |
| --- | --- | --- |
| `v` | int | versão do registro — **`2` desde #368** (ver §3.1) |
| `run_at` | string | ISO-8601 UTC do run do Auditor |
| `last_seen` | string \| null | `max(ts)` entre `status.jsonl` (S3) e `history.jsonl` (repo) para o `emitter`. **`null`** quando o emissor nunca sinalizou |
| `age_h` | int \| null | `(run_at − last_seen)` em horas, truncado. **`null`** quando `last_seen` é `null` — nunca `0` |
| `status` | enum | `"alive"` \| `"dead"` \| `"bootstrap"` |
| `merged` | int | nº de linhas recuperadas do S3 para `history.jsonl` no self-heal |
| `threshold_days` | number | limite vigente do **emissor** (SLO — ADR-0042 D3), com `default_threshold_days` como fallback |
| `payload_fired` | bool? | presente e `true` quando o **canal mínimo** (issue do GitHub) foi entregue — o Discord é best-effort e não participa do dedup (§3.2) |

### 3.1 Versão `2` do registro (#368)

O formato mudou junto com a correção do falso-positivo do Auditor ([#368](https://github.com/ERP-Bem-Comum/core-api/issues/368)). Diferenças em relação ao `v:1`:

| | `v:1` | `v:2` |
| --- | --- | --- |
| `emitter` | gravado como `"*"` — não dizia **qual** emissor | id real do emissor, **uma linha por emissor** |
| `status` | `"alive"` \| `"DEAD"` | `"alive"` \| `"dead"` \| `"bootstrap"` — minúsculas, e o estado de bootstrap passa a existir |
| `last_seen` / `age_h` | `""` / `0` quando nunca houve ping | **`null`** nos dois — a ausência de sinal deixa de ser indistinguível de "0 hora de silêncio" |
| `threshold_days` | sempre o `default_threshold_days` | o do emissor, com o default como fallback |

**Bootstrap não é morte.** Sem `last_seen`, a condição de disparo do [ADR-0042](../architecture/adr/0042-deadman-switch-redundant.md) (*"se `now − last_seen > limite`"*) é **indefinida** — logo não é satisfeita, e o Auditor **não** dispara o payload. Era o `else status=DEAD` do workflow que produzia alertas `sem sinal há 0h (limite 3d)` a cada execução do cron.

**Leitura de registros v1:** consumidores devem comparar `status` de forma **case-insensitive** (`"DEAD"` ≡ `"dead"`) e ignorar linhas com `emitter: "*"`, que não identificam emissor. É o que `scripts/ci/deadman-audit.ts` faz ao derivar o dedup por transição.

**Toda execução do Auditor escreve uma linha** (mesmo `alive`, mesmo sem ping novo) e
**commita** — esse commit é o **keep-alive** que evita a suspensão de 60 dias dos workflows
agendados do GitHub.

### 3.2 `payload_fired` e dedup por canal mínimo (#368, round 4)

O payload de contingência tem dois canais (§6): a **issue do GitHub** (obrigatório — o
workflow o chama de *"payload mínimo"*, `permissions:` do `deadman-audit.yml`) e o **webhook
do Discord** (opcional, `DEADMAN_DISCORD_WEBHOOK`). `payload_fired` reflete **só o canal
mínimo**: é `true` quando `gh issue create` teve sucesso para aquela transição, e é a partir
dele — não da decisão de disparar — que a **próxima execução** deriva o dedup
(`deriveAlreadyAlerted`, `status==="dead" && payload_fired===true`).

O Discord é **best-effort e não participa do dedup.** Uma falha no `curl` do webhook fica
visível no run do Actions (o step falha no fim, via `/tmp/payload-failures`), mas **não** força
uma retentativa na próxima execução — é uma decisão **deliberada**, não uma omissão:
`gh issue create` **não é idempotente** (cada chamada cria uma issue nova, sem chave de
dedup). Se a falha do Discord também zerasse a marca de entrega, a próxima execução veria
`payload_fired` ausente e retentaria os **dois** canais, recriando uma issue **duplicada** para
a **mesma** morte — a classe exata do bug original deste ticket (#368: 14 issues idênticas
para o mesmo evento). Entre "Discord fica em silêncio uma vez" e "issue duplicada", a escolha
foi a primeira.

Consequência aceita: uma falha transitória do Discord no exato momento de uma transição
alive/bootstrap→dead **não tem retentativa automática** — só o sinal do run falhado no Actions.
Ver `Ainda abertos` (§6) para uma evolução possível (estado de entrega por canal).

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

### 5.1 Tolerância de relógio (skew) e idade nunca-negativa (#368, round 3)

Um `ts` no futuro (relógio do Emissor adiantado, ou dado corrompido/forjado) não pode produzir
`age_h` negativo — um negativo nunca cruza `threshold_days`, e silenciaria o alerta para
sempre. Duas defesas, aplicadas juntas em `scripts/ci/deadman-audit.ts`:

- **Tolerância de skew (`CLOCK_SKEW_TOLERANCE_HOURS = 2`).** Um `ts` mais de 2h no futuro em
  relação ao `now` do Auditor é tratado como corrompido/forjado e **descartado** — não participa
  do `max(ts)` do emissor. 2h é folgado o bastante para skew de relógio real entre Emissor e
  Auditor, e irrelevante frente a `threshold_days` (medido em **dias**). Um `ts` até 2h no
  futuro é aceito (skew legítimo).
- **Clamp em `0`.** Mesmo dentro da tolerância, `age_h = max(0, run_at − last_seen)` nunca é
  negativo — um pequeno adiantamento de relógio vira "idade zero", nunca uma idade negativa que
  mascararia o cálculo.

Se **todo** ping já registrado de um emissor cair fora da tolerância (só possível se ele nunca
teve um ping válido aceito), o emissor permanece em `bootstrap` — o mesmo estado e a mesma
régua do ADR-0042 (bootstrap não é morte), não um caso novo.

---

## 6. SLO e payload (#72)

- **SLO / `threshold_days`** (D3): versionado em **`deadman/emitters.json`** (`default_threshold_days` + override por emitter). Lido pelos dois Auditores. Para o `sweeper-vps-qa` (cron diário): `2` dias (1 de grace).
- **Payload de contingência** (quando `DEAD`): (1) **issue p1** de alerta + (2) **webhook Discord** (`DEADMAN_DISCORD_WEBHOOK`, opcional). Extensível — novos canais entram no mesmo ponto do Auditor.

### Ainda abertos
- Rotação da `key` do HMAC.
- Retenção/compactação dos objetos `status/` (append infinito no S3 → política de roll/arquivamento).
- Retry garantido do canal Discord (§3.2): hoje é best-effort, sem estado de entrega próprio —
  uma falha vira log/step vermelho, não retentativa automática. Uma evolução possível é um
  campo de entrega por canal (`issue_fired`/`discord_fired`) em vez de um único `payload_fired`.
