---
name: w0-red
description: >
  Wave W0 — escreve o teste que falha ANTES da implementação, e prova o RED pelo
  exit code. Recusa avançar se a falha não for pela razão certa. Invoque com
  /w0-red <o que deve passar a ser verdade>.
disable-model-invocation: true
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

Escreva o teste que falha antes de existir a implementação. **O RED não é afirmado —
é provado pelo exit code.**

## 1. Escreva o teste

Convenções em `.claude/rules/testing.md` (carrega ao tocar `tests/`). Em resumo: só
`tests/**/*.test.ts` é descoberto; o caminho espelha `src/`; importe via `#src/*`.

Escreva o **menor** teste que expressa o comportamento pedido. Um caso, uma asserção
central. Casos adicionais entram depois do primeiro ciclo.

## 2. Rode e capture a evidência

```bash
node --test --experimental-strip-types --no-warnings <caminho-do-teste> ; echo "exit=$?"
```

Cole a saída **literal**, incluindo o `exit=`. Sem isso não há W0.

## 3. Classifique a falha — este é o passo que a pipeline antiga não tinha

Falhar não basta. O teste tem de falhar **pela razão certa**:

| A saída diz | Significa | Veredito |
| --- | --- | --- |
| `Cannot find module` / `is not exported` / erro de tipo em símbolo ausente | a API ainda não existe | ✅ **RED legítimo** |
| `AssertionError` com valor concreto ≠ esperado | a API existe, o comportamento difere | ✅ **RED legítimo** (mudança de comportamento) |
| `SyntaxError`, parse error | o teste está mal escrito | ❌ conserte o teste e repita |
| `Cannot find module` de uma **dependência** (não do alvo) | import errado, path errado | ❌ conserte o import e repita |
| exit 0 | **não falhou** | ❌ o teste não testa nada — reescreva |

Se caiu em ❌, corrija e volte ao passo 2. **Não prossiga com falha de razão errada** —
um teste que quebra por import ruim passa a verde ao consertar o import, sem que
nenhuma linha de produção tenha sido escrita. Isso é falso RED, e foi o que os
`REPORT.md` de W0 nunca conseguiram distinguir.

## 4. Feche o W0

Reporte, em três linhas:

- **arquivo do teste** e o comportamento que ele exige
- **a saída literal** com o `exit=` diferente de zero
- **a categoria da falha** pela tabela acima

Não escreva `REPORT.md`. A saída do comando é a evidência; ela já está no turno.

## 5. Vá para o verde — no MESMO turno

**O W0 não fecha turno sozinho.** Escreva a implementação em seguida, aqui mesmo.

O Stop hook (`stop-quality-gate.sh`) roda o gate no fim do turno e devolve `exit 2`
em qualquer vermelho. Ele **não tem como distinguir** um RED deliberado de uma
regressão: só enxerga o exit code do `pnpm test`, e o sintoma dos dois é idêntico.
Um W0 que tenta encerrar o turno é bloqueado — até 8 vezes seguidas, cada bloqueio
pagando o gate completo — antes de o Claude Code liberar.

Isso não é defeito do hook. É a consequência de o RED ser um estado **transitório**:
ele existe para ser observado e superado dentro do mesmo turno, não para ser
persistido. A separação em waves é do raciocínio, não do turno.

⚠️ **Não troque o vermelho por `skip`, `todo` ou asserção frouxa para o turno fechar.**
Isso substitui um RED provado por um verde falso — a saída que a política de regressão
zero proíbe explicitamente. Se o verde não vier, as saídas são consertar a causa ou
escalar ao humano com causa-raiz.

Antes de dar a mudança por encerrada, `/w2-review` revisa o diff em contexto isolado.
