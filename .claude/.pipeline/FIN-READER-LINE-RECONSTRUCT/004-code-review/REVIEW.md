# W2 — Code Review (audit read-only) · FIN-READER-LINE-RECONSTRUCT (#388 2b)

**Skill:** `code-reviewer` (agente independente) · **Rounds:** 1 · **Veredito:** **APPROVED**

## Verificado (sólido)
- **Parsing de número:** invariante correto — os 2 operandos do `Td` (`tx ty`) são sempre os **últimos**
  números coletados antes do dispatch; operandos de `Tf`/`TL`/`cm`/`re`/`TJ` anteriores são sobrescritos.
  Dígitos em `(...)`/`<...>` são consumidos pelos branches de string. NaN-guard impede buffer degenerado.
- `Tm`/`T*` sempre `flushLine()` (não consultam `lastNum`) — branch correto.
- Normalização `-\s+`→`-` **só adiciona hífen** → não fabrica keyword de tipo → falso-positivo nulo. Só afeta `normalized`.
- Loop O(n) preservado (cursor sempre avança). Suíte **21/21** (Fatia 1 + 2a + 2b).

## Achados (todos Minor / follow-up — não bloqueiam)
| ID | Sev | Descrição | Destino |
| :--- | :--- | :--- | :--- |
| M1 | Minor | Coletor numérico não trata `-`/`+` como auto-delimitador (`0-18` sem espaço → `parseFloat`=0 → falso merge de linha). Fixtures e reais usam `0 -18` (com espaço); `detectType`/campos geralmente ainda casam. | issue (tokenização fiel) |
| M2 | Minor | Glue de hífen só no `normalized`, não no `text` de extração de campos (token hifenizado dentro de um valor de campo mantém espaço). | issue (layout tabular) |
| M3 | Nota | Espaço em `Td` horizontal pode partir valor monetário mid-dígito — **idêntico ao pré-2b** (não é regressão). | issue (layout tabular) |

## Escopo
Honesto: 2b entrega **classificação robusta** (via `normalized`) + campos **lineares**. Layout tabular dos
reais (DANFSe/NFSP) = follow-up. Comentários no código descrevem com precisão o efeito de cada mudança.
