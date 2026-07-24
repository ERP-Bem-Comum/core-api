# W1 — SEMGREP-ADR-ENFORCER (#548) — GREEN

**Resultado:** node:test 6/6 GREEN + validação comportamental do Semgrep.

## Arquivos

- `.semgrep/rules.yml` — 2 rules ADR-0020 (`mysql-enum-forbidden`, `mysql-json-forbidden`).
- `.semgrep/tests/schema.drizzle-mysql.ts` — fixture anotada (`ruleid:`/`ok:`).
- `.github/workflows/semgrep.yml` — job SHA-pinado (checkout `df4cb1c…` = o mesmo do repo),
  `pipx install semgrep==1.171.0`, `semgrep scan --config .semgrep/rules.yml --error --metrics off
  --exclude .semgrep .` (finding = exit≠0; sem `continue-on-error`/`|| true`).
- `.prettierignore` += `.semgrep/tests/`; `eslint.config.js` ignores += `.semgrep/**` (fixtures têm
  violações de ADR intencionais e ficam fora de todo tsconfig — senão o projectService type-aware
  falharia nelas).

## Validação comportamental (semgrep scan, não `--test`)

O `semgrep --test` tem bug de pareamento nome-de-arquivo (IndexError quando rule-file e fixture não
têm basename igual). Validei por `semgrep scan` direto, mais robusto:

- **No fixture:** exatamente 2 findings — `mysql-enum-forbidden` (L9, `mysqlEnum(`) + `mysql-json-forbidden`
  (L11, `json(`); **nada** no `varchar` (L14). Precisão confirmada.
- **No código real:** `Ran 2 rules on 947 files: 0 findings` (exit 0) — o gate **não falha no dia 1**
  (nenhum falso-positivo repo-wide).

## Por que 2 rules (não as 4 do #548)

Ver `002-tests/REPORT.md`: `no-npm` falso-positiva no próprio `block-npm.sh` (já coberto pelo hook +
ADR-0012); `nodenext-ts-extension` já é barrado pelo tsc (TS2835); `no-throw-exhaustive` é impreciso.
As 2 rules de ADR-0020 são a classe de drift que nem tsc, nem ESLint, nem hook pegam.
