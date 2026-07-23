# W2 — SEMGREP-ADR-ENFORCER (#548) — REVIEW (round 1)

**Disciplina:** `code-reviewer` (read-only). **Veredito: APPROVED** (1 Major achado e corrigido no turno).

## Achados

### M1 (Major) — pin de versão inexistente/não-validado — CORRIGIDO

`pipx install semgrep==1.99.0` era um valor **chutado**. A versão que efetivamente validei as rules
foi a `1.171.0` (a que o `pipx run` baixou). Um pin numa versão não-validada arrisca o step falhar em
CI ou rodar num engine diferente do testado. **Corrigido** → `semgrep==1.171.0` (a versão sob a qual
o fixture deu 2 findings e o código real 0). Verificado o `latest` do PyPI = 1.171.0.

### m1 (minor, aceito) — precisão da rule `mysql-json-forbidden`

`pattern: json(...)` casa qualquer chamada bare a `json(`. Hoje: **0** no repo (947 arquivos). Um
`reply.json()` é member-call (AST diferente) — não casa. Risco de FP futuro num `json()` bare
não-Drizzle: baixo, e a `message` guiaria. Alternativa (escopar por `paths.include` de persistence)
foi **rejeitada**: quebraria a validação simples e o benefício não paga o acoplamento. Aceito.

### m2 (minor, nota) — `semgrep --test` não usado

O modo `--test` do semgrep tem bug de pareamento (IndexError). Trocado por `semgrep scan` +
asserção de contagem/linha — mais robusto e sob nosso controle. Sem impacto no gate (o CI roda
`scan`, não `--test`).

## Gate-integrity (a lição do #523 aplicada)

- Sem `continue-on-error` e sem `|| true` no job (asserido pelo W0 test) — gate **real**, não report-only.
- `--exclude .semgrep` tira as fixtures do scan (elas têm findings de propósito) — senão o gate se
  auto-reprovaria. Asserido pelo W0 test (CA1).
- Actions SHA-pinadas (ADR-0011), reusando o SHA de checkout já vetado no repo.

## Escopo/afrouxamento

Nenhuma rule foi afrouxada para passar. As diferidas (`no-npm`/`ts-extension`/`no-throw`) têm razão
documentada, não são drop silencioso. O gate cobre exatamente o que promete: 2 invariantes de ADR-0020.
