# W2 — Code review (#454 gap 3)

> Agente: `code-reviewer` (read-only, independente) · **Round 1 de 3** · Veredito: **APROVADO** (condicionado a registrar 3 achados como issue — feito: **#469**, **#470**).

## Sem Blocker

O revisor **refutou com evidência** as três hipóteses mais graves que o briefing levantou — vale
registrar porque cada uma seria Blocker se procedesse:

1. **"O efetivo pode ser persistido"** — impossível por construção. `withInheritedActive` tem **um**
   importador em todo o `src/`: o DTO. O retorno vira `CostStructureTreeDto`, que **não é**
   `CostStructure` e nem estruturalmente entra em `save`/`mutate`. Os dois caminhos de escrita
   partem sempre da linha crua (`mutate` → `costStructureFromRows`; `clone` → `findByBudgetPlanId`).
2. **"Escrita parcial se o rename falhar depois do active"** — não há. A sequência roda dentro do
   callback do `mutate`, e o repo retorna antes do `writeTree` (`if (!applied.ok) return applied;`).
   O commit nesse caminho é vazio.
3. **"Colisão de rota"** — não existe. `POST .../cost-centers` e `PATCH .../cost-centers/:nodeId`
   diferem em método **e** aridade; o Fastify lançaria `FST_ERR_DUPLICATED_ROUTE` no boot, e os 26
   testes de borda sobem o app.

**Migration sem risco:** `ADD COLUMN` no fim da tabela em 8.4 resolve para `ALGORITHM=INSTANT` sem
hint — o erro 1845 conhecido do projeto é de *widening* de VARCHAR, caso diferente. `boolean` =
TINYINT(1) **não** está na lista de proibidos do ADR-0020 (aberta e citada); precedente:
`par_partners.active`. ADR-0014 respeitado.

## Achados e desfecho

| Sev | Achado | Desfecho |
| :--- | :--- | :--- |
| **Major 1** | A borda só expõe o efetivo → o switch do front não distingue herança de intenção | **Issue #469** |
| Minor 2 | Export/CSV ignora `active` | **Issue #470** |
| Minor 3 | `add-budget-result` aceita subcategoria inativa | **Issue #470** |
| Minor 4 | `cost-node-not-found` só provado no nível cost-center | **CORRIGIDO** |
| Minor 5 | `cost-node-patch-empty` fora do schema → OpenAPI não diz que `{}` é inválido | **Aceito** |
| Minor 6 | `{ ok: true, value }` à mão | **CORRIGIDO** |
| Minor 7 | 3 ramos do switch são a mesma cópia | **Aceito** |
| Minor 8 | "intenção ≠ efetivo" comentado em 6 lugares | **Aceito** |
| Minor 9 | teste `é função` tautológico | **Aceito** (padrão do repo) |

### Major 1 — o ticket destrava o switch, e o switch tem um caso que não fecha

Centro inativo → categoria de intenção `true` chega como `active: false` (herança, correto). O
usuário mexe no switch → `PATCH { active: true }` → **200** → a árvore devolve `false` de novo. **O
switch volta sozinho, sem erro.** Nenhum passo está errado; falta vocabulário na resposta
(`activeSelf`). É consequência direta de D2 — decisão de produto tomada — e não quebra nenhum dos 8
CAs. **#469**, com a ressalva de que a árvore hoje **esconde** o ramo inativo, então talvez nem
apareça na tela atual.

### Minor 4 — corrigido: era buraco real por ~10 linhas

Só `renameCostCenter` testava not-found; `patchCategory`/`patchSubcategory` e os 3 `setActive*`
nunca eram exercitados com id ausente. Trocar o guard de existência do subcategory por algo que
nunca devolva `null` faria `renameSubcategory` de id inexistente virar **200 mudo** — e nenhum teste
cairia. Agora os 6 caminhos são cobertos.

### Minors aceitos, com razão

- **5** — `{}` → 400 vem do use case, `name: ''` → 400 vem do Zod: dois mecanismos, mesmo status. Um
  `.refine()` juntaria a regra ao contrato (ADR-0027). Não corrigido: mudaria o schema publicado e o
  comportamento já está travado por teste. Vale numa revisão do contrato.
- **7** — os 3 ramos repetem 12 linhas. Unificar esbarra nos **branded ids distintos por nível** —
  custaria mais tipo do que economiza texto. O revisor concordou que é observação.
- **8** — o invariante aparece em 6 pontos (o W1 justificou 3). São 6 lugares para desatualizar
  juntos; por outro lado, é o "porquê" nos exatos pontos onde alguém quebraria a regra. Mantido.

## Verificação independente

O revisor rodou por conta própria: `typecheck` ✓ · `format:check` ✓ · `lint` ✓ ·
`tests/modules/budget-plans/**` → **321/321, fail 0**; os 3 arquivos novos → 26/26.

Sobre o **CA8** (pergunta direta do briefing): *"prova mesmo que o replace-all preserva ids?"* —
**sim**. O teste vai pelo `mutate` real → `writeTree` → `DELETE` em `bgp_cost_centers` (CASCADE
derruba o resto) → reinsert, e só então afirma que o id da subcategoria é o mesmo e que a linha de
`bgp_budget_results` sobreviveu. O risco era o reinsert usar id novo (como o `clone` faz).

## Re-verificação após as correções

`typecheck` ✓ · `lint` ✓ · `format:check` ✓ · domínio 16/16.

## Veredito final: **APROVADO** — round 1
