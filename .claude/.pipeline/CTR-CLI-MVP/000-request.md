# Ticket CTR-CLI-MVP: CLI para P.O. validar regras de negócio

> Documentação PT, identificadores EN no código.

## Contexto

5 use cases prontos. Falta o **wrapper de terminal** que permite à P.O. exercitar todas as regras sem precisar de banco/HTTP/frontend. Skill canônica: [`application-cli-builder`](../../skills/application-cli-builder/SKILL.md).

## Escopo

```
src/modules/contracts/cli/
├── main.ts                    Entry point (parse argv + dispatch)
├── context.ts                 Monta InMemory adapters + ClockReal
├── state.ts                   Persistência opcional em JSON (load/save)
├── format.ts                  Format helpers: Money, Period, Date, Contract, Amendment, erros PT-BR
├── parse-flags.ts             Parser simples de --flag value
├── registry.ts                Subcomando → handler + descrição
└── commands/
    ├── criar-contrato.ts
    ├── listar-contratos.ts
    ├── mostrar-contrato.ts
    ├── criar-aditivo.ts
    ├── anexar-documento.ts
    └── homologar-aditivo.ts

tests/modules/contracts/cli/
├── format.test.ts             Testes das funções puras de formatação
└── parse-flags.test.ts        Testes do parser
```

## Decisões

| # | Decisão | Justificativa |
| :-- | :--- | :--- |
| D1 | **Persistência default** em `./cli-state.json` (cwd). Flag `--no-state` para ephemeral. | P.O. precisa de sessões sequenciais (criar → aditivo → homologar). Default persistente é mais ergonômico. |
| D2 | Serialização via `JSON.stringify` + reviver de `Date` no `JSON.parse` | MVP — `Date` é único tipo "rico" que precisa reidratação. Branded types são string/number/object em runtime, transparentes. |
| D3 | Subcomandos em PT-BR (`criar-contrato`, `homologar-aditivo`) | Voltado para humano (P.O.). Padrão de naming: imperativo + objeto. |
| D4 | Flags long-form em PT-BR (`--titulo`, `--valor-centavos`, `--aditivo`) | Mesma razão. Curtas (`-h`) só pra help. |
| D5 | Saída em PT-BR (mensagens, erros, formatos) via dicionário em `format.ts` | Skill `application-cli-builder` §6 padrão. |
| D6 | **Sem dependência externa** para parser de args | YAGNI — parser próprio em ~50 linhas faz o necessário. |
| D7 | Exit codes seguem skill `cli-guidelines.md`: `0` ok, `1` erro de regra, `64` erro de uso | UNIX standard. |
| D8 | Testes cobrem `format.ts` e `parse-flags.ts` (funções puras). Integração da CLI fica validada pela passagem ponta-a-ponta dos use cases já testados. | Pragmático para MVP — testar via subprocess `spawn` adiciona complexidade desproporcional para Fase 1. |

## Critérios de aceite

### Fluxo end-to-end

A sequência abaixo deve funcionar usando `--state ./demo.json`:

```bash
$ contratos-cli criar-contrato --numero 001/2026 --titulo "Bem Comum" \
    --objetivo "Equipamentos" --assinado-em 2026-01-01 \
    --valor-centavos 10000000 --inicio 2026-01-01 --fim 2026-12-31 \
    --state ./demo.json
✅ Contrato criado.
  ID: 7f3a...
  Número: 001/2026
  Valor vigente: R$ 100.000,00
  Vigência: 01/01/2026 a 31/12/2026
  Status: Ativo

$ contratos-cli criar-aditivo --contrato 7f3a... \
    --numero "AD 01-001/2026" --descricao "Ampliação" \
    --tipo Addition --valor-centavos 500000 \
    --state ./demo.json
✅ Aditivo criado em status Pendente.
  ID: a1b2...

$ contratos-cli anexar-documento --aditivo a1b2... \
    --documento $(uuidgen | tr 'A-Z' 'a-z') \
    --state ./demo.json
✅ Documento assinado anexado.

$ contratos-cli homologar-aditivo --aditivo a1b2... \
    --contrato 7f3a... --usuario $(uuidgen | tr 'A-Z' 'a-z') \
    --state ./demo.json
✅ Aditivo homologado.
  Novo valor vigente: R$ 105.000,00
  Status do contrato: Ativo

$ contratos-cli mostrar-contrato --id 7f3a... --state ./demo.json
Contrato 001/2026
  ID: 7f3a...
  Status: Ativo
  Valor original: R$ 100.000,00
  Valor vigente: R$ 105.000,00
  Vigência original: 01/01/2026 a 31/12/2026
  Vigência vigente: 01/01/2026 a 31/12/2026
  Aditivos homologados: 1

$ contratos-cli listar-contratos --state ./demo.json
1 contrato(s):
  - 001/2026 [Ativo] R$ 105.000,00
```

### Erros traduzidos para humano

- `'amendment-not-active'` → "Contrato já está encerrado — não aceita aditivos."
- `'amendment-without-signed-document'` → "Aditivo precisa ter documento assinado anexado para ser homologado."
- `'money-negative-value'` → "Valor monetário não pode ser negativo."
- `'period-end-before-start'` → "A data fim é anterior à data início."
- ... (dicionário completo em `format.ts`)

### Exit codes

- `0` — sucesso
- `1` — erro de regra de negócio ou validação
- `64` — má utilização (flag inválida, subcomando desconhecido, args faltando)

### Output

- Sucesso vai pra `stdout`. Erros vão pra `stderr`. Skill `cli-guidelines.md` §P3.
- `--help` ou `-h` em qualquer subcomando imprime usage.
- Sem subcomando → imprime lista de subcomandos disponíveis.

### Tests

- `format.ts` — todos os helpers testados (Money, Period, Date, Status, error dictionary).
- `parse-flags.ts` — parser tested com `--flag value`, `--flag=value`, flags ausentes, flags duplicadas.

## Fora de escopo

- Modo interativo (REPL) — Fase 2.
- Autocompletion shell — Fase 2.
- Cores — opcional, só se for trivial via ANSI escape.
- Internacionalização — só PT-BR no MVP.
- Confirmação para ações destrutivas — não há ações destrutivas neste CLI ainda.
