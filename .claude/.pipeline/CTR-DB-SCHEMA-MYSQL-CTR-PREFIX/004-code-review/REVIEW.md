# Code Review W2 — CTR-DB-SCHEMA-MYSQL-CTR-PREFIX — Round 1

**Veredito:** APPROVED
**Reviewer:** maestro:code-reviewer (output entregue como mensagem ao parent; persistido neste arquivo por mim a partir do retorno textual do agent)
**Data:** 2026-05-15
**Escopo:**
- `src/modules/contracts/adapters/persistence/schemas/mysql.ts`
- `tests/modules/contracts/adapters/persistence/schemas/mysql.test.ts`

---

## Issues encontradas

### 🔴 Critical

Nenhuma.

Análise crítica realizada (todas com veredito negativo, ou seja, sem issue):

| Checagem critical | Resultado |
| :--- | :--- |
| Convenção `ctr_*` violada em alguma tabela | Não — 3 tabelas com prefix correto (`mysql.ts:35,82,130`). |
| ENUM nativo / AUTO_INCREMENT / JSON / stored proc / tipo espacial / isolation level | Não — todos enums são `varchar+CHECK`, IDs são `varchar(36)`, sem `mode:'json'`, sem triggers. |
| Bicondicional F-L1 semanticamente errada | Não — tracei `expire()` (`contract.ts:92-96`) e `terminate()` (`contract.ts:114-118`): ambos setam `endedAt=at`; `create()` (`contract.ts:54-67`) seta `endedAt=null` com status='Active'. O bicondicional `(endedAt IS NOT NULL) = (status IN ('Expired','Terminated'))` cobre exatamente os 2 mundos válidos. |
| F-L2 lógica de 3 valores (NULL) traída pelo `<>` | Não — `status` é `NOT NULL` (`mysql.ts:50,94`), portanto `status <> 'Homologated'` nunca retorna `UNKNOWN`. A forma `(NOT P) OR Q` é correta em SQL trivalente quando P não pode ser NULL. |
| Índice especulativo (anti-padrão #3) | Não — todos os 3 índices têm padrão de query documentado (F-H2 FK, F-M2 status, F-M2 signed_at). |

### 🟡 Important

Nenhuma. As checagens "Important" do prompt foram todas verificadas:

- **Bicondicional `(A) = (B)` em MySQL 8.4 / STRICT_ALL_TABLES**: sintaxe válida — MySQL avalia `=` entre booleans como bicondicional (1/0). `STRICT_ALL_TABLES` afeta truncamento e zero-date, não semântica de operadores; CHECK funciona normalmente. Comentário inline em `mysql.ts:66-68` documenta a sintaxe.
- **Implicação F-L2 cobre todos caminhos**: `status` NOT NULL + CHECK enum garante 2 estados; `Homologated` ramo exige os 3 NOT NULL; `Pending` ramo curto-circuita no `<>`. Todos os caminhos cobertos.
- **Naming dos índices**: convenção `ctr_<table>_<col>_idx` aplicada consistentemente em `mysql.ts:76,77,125`. Sem colisão (cada combinação tabela+coluna é única). CHECKs seguem `ctr_<table>_<descrição>_chk` (`mysql.ts:56,60,63,70,102,105,111`).
- **Comentários explicam "por quê"**: `mysql.ts:11-21,54,65-68,74-75,107-109,122-124` — todos contextualizam decisão (audit findings, ADR, motivo do RHS bicondicional incluir 'Expired'). Alinhado com `CLAUDE.md` Global Rules.
- **Test cobre D1-D7 proporcionalmente**: CA-1 (D1) 3 testes, CA-2/3/4 (D3/D4/D5) 3 testes, CA-5 (D2) 5 testes, CA-6 (D6) 1 teste, CA-7 (D7) 1 teste = 13 testes funcionais + 1 estrutural = 14. Proporção razoável; D6/D7 são "checkmark de existência" — ver Suggestions.

### 🔵 Suggestions

- **mysql.test.ts:117-123 e 126-132 (CA-6/CA-7)**: validam apenas existência por nome, não a expressão SQL do CHECK. `getTableConfig` expõe `c.value` (objeto `SQL`) — poderia assertar substring chave (ex.: `'Expired'`, `'Terminated'`, `'<>'`, `'Homologated'`) para garantir que o rename futuro não esvazie a semântica. Não é bloqueante porque a expressão está fixa no schema e qualquer alteração quebraria o build da migration; ainda assim eleva o teste de "structural" para "behavioral light".
- **mysql.ts:54** comentário cita "ADR-0018 §'Features proibidas' baniu ENUM nativo" — ADR-0020 supersedes ADR-0018 e mantém a proibição em §"Lista normativa atualizada" por razão própria. Citar ADR-0020 (autoridade vigente) seria mais preciso.
- **Trade-off F-L1 não documentado**: alternativa `CHECK (status='Active' AND endedAt IS NULL) OR (status IN ('Expired','Terminated') AND endedAt IS NOT NULL)` é mais legível e equivale ao bicondicional. A escolha do `=` foi feita, mas o porquê ("compacto, MySQL-idiomático") poderia ser explicitado em uma linha de comentário ao lado de `mysql.ts:71`.
- **Falta CHECK em valores monetários `>= 0`**: `originalValueCents`/`currentValueCents` são `bigint` sem CHECK de não-negatividade. Hoje o domínio (`Money.fromCents`) valida; defesa em profundidade similar a F-L1 seria coerente. Fora do escopo deste ticket (não está no audit), mas registrar para `CTR-VO-STRING-LIMITS` ou futuro `CTR-DB-DOMAIN-INVARIANTS`.

---

## O que está bom

- **Trace de invariantes ancorado no domínio**: o RHS do F-L1 inclui `('Expired','Terminated')` porque `expire()` e `terminate()` populam `endedAt` — comentário em `mysql.ts:65-68` mostra essa rastreabilidade.
- **Defesa em profundidade conservadora**: CHECKs apenas para invariantes que o audit identificou (F-L1, F-L2). Não há CHECK "por convenção" — alinhado com o princípio condutor do ticket.
- **Nomes de índice/CHECK seguem prefix da tabela**: `SHOW CREATE TABLE ctr_amendments` ficará legível com todos os identificadores agrupados visualmente.
- **Comentário em `mysql.ts:122-124`** explica que MySQL/InnoDB cria FK index automaticamente, mas a declaração explícita é para visibilidade em `getTableConfig` — distinção exata entre "necessário" vs "intencional para teste".
- **Test helper `columnName` (test:47-54)** com type-guard explícito em vez de `as any` ou `String(...)` — coerente com CLAUDE.md global rule "No `any`".
- **Comentário no topo (`mysql.ts:1-21`)** declara o estado "schema definido mas driver não wired" — sinaliza para o leitor futuro do `CTR-DB-DRIVER-MYSQL` sem deixar dúvida sobre o status.
- **Nenhum índice especulativo**: ausência de índice composto `(status, signed_at)` é decisão consciente justificada em D4 do request.

---

## Próximo passo

**APPROVED → avança para W3 (ts-quality-checker)**.

Nenhuma issue crítica ou important encontrada. As 4 sugestões são marginais e podem ser endereçadas (a) no próprio commit como polimento opcional, (b) em ticket futuro (`CTR-DB-DOMAIN-INVARIANTS`), ou (c) descartadas com justificativa. Não bloqueiam W3.

---

## Tickets/follow-ups gerados por este review

- 🔵 **Suggestion #1** (assert substring de CHECK SQL): pode virar ticket de polish dos tests OU ser endereçado quando o `CTR-DB-MIGRATION-MYSQL` (#3) gerar a migration real — aí podemos validar o SQL gerado contra DB ao vivo (behavioral genuíno, supersedindo a sugestão).
- 🔵 **Suggestion #2** (mysql.ts:54 cita ADR-0018): consolidar no ticket `CTR-DOCS-UPDATE-FOR-ADR-0020` (#8 da sequência) — varredura geral de refs a ADR-0018 já está prevista lá.
- 🔵 **Suggestion #3** (trade-off F-L1): aplicar 1-linha de comentário durante o commit do W3 (polish trivial).
- 🔵 **Suggestion #4** (CHECK `value_cents >= 0`): ticket novo `CTR-DB-DOMAIN-INVARIANTS` — endereça defesa em profundidade adicional para invariantes monetários/estado.
