# W1 — Round 3 (correções do W2 round 2) · DEADMAN-AUDIT-FALSE-FIRED

> **Issue:** [#368](https://github.com/ERP-Bem-Comum/core-api/issues/368) · **Branch:** `fix/368-deadman-audit-false-fired`
> **Entrada:** `004-code-review/REVIEW-round2.md` (REJECTED — N1..N4 Blocker, N5/N6 🟡, N7..N13 🔵)
> **Outcome:** **GREEN** ✅ — 31/31 no ticket, suíte completa `pass 4567 · fail 0`

Fail-first mantido: 10 `it()` novos provados RED (`pass 21 · fail 10`) antes de tocar na implementação.

## Blockers

### N1 + N2 — `ts` corrompido nunca mais derruba nem silencia

Ambos vinham da mesma raiz: `ts` entrava sem validação e a ordenação lexicográfica escolhia o pior valor possível.

- **`isIsoUtc`** — regex ISO-8601 **estrito com `Z` obrigatório** + `Date.parse` não-`NaN`. O `Z` não é purismo: sem ele o valor é lido como hora **local**, e o auditor do Actions (UTC) divergiria do 2º auditor do ERP-INFRA (ADR-0042 D2) sobre o mesmo dado.
- **`lastSeenFromPings` descarta linha inválida** em vez de lançar — mesma política do `parseLine` para JSON corrompido. Agora a ordenação lexicográfica é **legítima**, porque todo valor aceito tem exatamente o mesmo formato (a pré-condição saiu do comentário e virou código).
- **`notAfter`** — pings acima de `now + 2h` são descartados. A tolerância existe para não punir skew real de relógio.
- **`hoursBetween` clampa em 0** — idade negativa violaria o contrato (`age_h` é idade) e nunca cruzaria o limiar.

**Prova, com os mesmos insumos do REVIEW:**

| Cenário | Antes | Agora |
| --- | --- | --- |
| `ts: "nao-e-data"` junto de um ping válido | `Error` + `exit 1` (mata o keep-alive, **para sempre**, por ser append-only) | `dead`, `lastSeen` do ping válido, `ageHours 120`, `exit 0` |
| `ts: "2099-01-01"` junto de um ping válido | `alive`, `ageHours -634914` (morte mascarada) | `dead`, `ageHours 120`, dispara |
| só `ts` inválido | `Error` + `exit 1` | `bootstrap` — honesto, sem crash |
| skew de 30 min à frente | idade negativa | `ageHours 0`, `alive` |

### N3 — dedup pela ENTREGA, não pela decisão

O ponto mais importante do round, e regressão do fix que eu mesmo fiz no round 1.

- **`deriveAlreadyAlerted`** passa a exigir `status === 'dead' && payload_fired === true`. É o que o contrato §3 sempre disse: *"presente e `true` apenas quando o payload foi disparado"*.
- **No workflow**, a variável `delivered` começa `true` quando há disparo e vira `false` se `gh issue create` **ou** o `curl` falharem. É ela que alimenta `--argjson f`, não mais `$fires` (a decisão).

**Prova:**

| `audit.jsonl` | Antes | Agora |
| --- | --- | --- |
| `{"status":"dead"}` (alerta falhou) | `firesPayload false` — **retentativa suprimida, morte perdida** | `firesPayload true` — retenta |
| `{"status":"dead","payload_fired":true}` | `false` | `false` — dedup legítimo preservado |

### N4 — `setup-node` pinado

`actions/setup-node@48b55a0… # v6.4.0` com `node-version: '24'`, antes do step de decisão — mesmo SHA dos outros quatro workflows.

**Junto:** `actions/checkout@v4` (solto) passou a `@df4cb1c… # v6.0.3`. Era a única action não-pinada do repo e viola ADR-0011; como eu estava adicionando um `uses:` novo no mesmo arquivo, deixar um pinado e outro não seria incoerente. **Decisão consciente de tocar 1 linha fora do escopo original** — registro aqui para o W2 contestar se discordar.

Dois `it()` cobrem: ordem (`setup-node` antes do `node …`) e **SHA-pin de todas as actions** do arquivo.

## 🟡

- **N5** — `readOrEmpty` só engole `ENOENT`; qualquer outro erro propaga. Provado: um diretório no lugar do arquivo agora falha com `EISDIR` em vez de virar `''` e **resetar o dedup**.
- **N6** — `id` duplicado em `emitters.json` lança no parse. Dois ids iguais gerariam duas issues para a mesma morte — no ticket que nasceu de 14 issues idênticas.

## 🔵 aplicadas

- **N9** — `lastSeenFromPings` acumula em `Map` (era objeto puro, onde um emissor `__proto__` era engolido pelo setter de `Object.prototype` e ficava eterno em bootstrap). Alinha com `deriveAlreadyAlerted`.
- **N10** — `hoursBetween` separa as mensagens: `last_seen inválido:` × `now inválido:`. Antes mandava o operador investigar o arquivo errado.
- **N13** — stderr do `curl` desviado para arquivo; a mensagem nativa pode conter o host do webhook, e a máscara do Actions só redige ocorrência exata do secret.
- **Comentário pinando `item: unknown`** no `.map` do parse — o especialista provou que é a única barreira contra `any` ali, e que nem `tsc` nem `no-unsafe-argument` reclamariam se alguém a removesse por parecer redundante.

## 🔵 não aplicadas — decisão explícita

- **N7 (discriminated union em `EmitterVerdict`)** — não feita. O refactor foi provado gratuito pelo especialista, mas mexe no tipo que os 31 testes e o `jq` consomem, no **último round antes de escalar**. Trocar risco de regressão por elegância aqui é mau negócio. **Recomendo ticket de follow-up** — o ganho (tornar impossível `{status:'dead', lastSeen:null}`) é real e estrutural.
- **N8 (derivar a lista de status de um `as const`)** — mesma razão, mesmo follow-up.
- **N11 (`JSON.parse` cru em `parseEmitterConfig`)** — o `SyntaxError` já falha alto e o arquivo é versionado no repo; a mensagem menos bonita não muda comportamento.
- **N12 (teste do entrypoint CLI)** — o W2 round 2 já decidiu que não bloqueia. O CLI foi exercitado em mais 6 cenários neste round.

## Gates

| Gate | Resultado |
| --- | --- |
| `tests/scripts/deadman-audit.test.ts` | **31/31** (era 19; +12) |
| `pnpm test` | **`pass 4567 · fail 0 · skipped 19 · todo 5`** |
| `pnpm run typecheck` · `format:check` · `eslint` | verdes |
| `act --list` | YAML válido |
| N1/N2/N3/N5 contra o CLI real | tabelas acima |

## Ainda aberto — fora de escopo (ADR-0040)

**Verificação de assinatura HMAC (`sig`)** segue ausente. O contrato §5 exige (*"Sem `sig` válido → o Auditor ignora a linha"*) e o ADR-0042 (`:55`) já reconhece como item aberto. As correções deste round tornam `ts` forjado **inofensivo** (descartado em vez de fatal), mas não autenticam a origem do ping — um atacante com escrita no S3 ainda pode **falsificar vida** e manter o auditor calado. **Recomendo issue dedicada com prioridade elevada**; o achado da auditoria de segurança dá o material.

Também seguem: `for k in $keys` não-quotado (`:41-50`) e `seq` não validado no self-heal (`:57-66`) — mesma classe, um step antes, fora do trecho reescrito.
