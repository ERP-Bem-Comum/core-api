# W0 — testes RED · AUTH-JWT-KEY-BOOT-GUARD (#515)

**Resultado: RED confirmado.** Nenhum arquivo de `src/` foi tocado.

## Arquivos criados

| Arquivo | Casos | Natureza |
| --- | --- | --- |
| `tests/modules/auth/adapters/http/jwt-key-config.test.ts` | 17 | Unidade pura — env injetado por parâmetro, sem rede, sem `process.env` mutado |
| `tests/infra/server-jwt-key-boot-guard.test.ts` | 2 | Contrato de boot — `spawn` real do `src/server.ts` |

## Evidência do RED

### Unidade — RED por inexistência da API (disciplina fail-first)

```
Error [ERR_MODULE_NOT_FOUND]:
  .../src/modules/auth/adapters/http/jwt-key-config.ts
ℹ tests 1 · pass 0 · fail 1
```

### Contrato de boot — RED por comportamento, e é a prova do defeito

```
ℹ tests 2 · pass 0 · fail 2

✖ CA1 — producao sem AUTH_JWT_*: encerra com 78, stderr nomeia a variavel, porta nao abre
  AssertionError: o processo nao encerrou sozinho — a porta abriu apesar da chave ausente
  actual: 'SIGKILL'

✖ CA3 — producao com chave malformada: encerra com 78, nao com 1 (falha generica)
  Fatal ao iniciar: TypeError: "pkcs8" must be PKCS#8 formatted string
  1 !== 78
```

**CA1** é a demonstração empírica da issue: com `NODE_ENV=production` e sem `AUTH_JWT_*`, o processo
**não encerra** — precisou de `SIGKILL` após 20 s, porque abriu a porta e passou a servir tráfego
assinando com uma chave que não existirá no próximo boot.

**CA3** mostra o segundo defeito: a exceção de `importPKCS8` escapa até `main().catch` e sai com
**exit 1**, indistinguível de "aplicação quebrada" para a plataforma de deploy.

## Cobertura dos critérios de aceite

| CA | Onde | Casos |
| --- | --- | --- |
| CA1 — prod sem chave → 78, nomeia variável, porta não abre | ambos | 3 |
| CA2 — par incompleto → falha nomeando a que falta | unidade | 3 |
| CA3 — chave malformada → 78 identificando a variável | ambos | 4 |
| CA4 — fora de produção → efêmero **com aviso** | unidade | 3 |
| CA5 — prod com as duas válidas → sobe sem mudança | unidade | 2 |
| CA6 — suíte atual não passa a exigir chave | garantido por design (ver abaixo) + W3 | — |

Casos além dos CAs, derivados dos moldes do repo:

- **Vazio == ausente** — relatório de `X=""` tem de ser idêntico ao de `X` não declarada
  (molde: `module-driver-config.test.ts` caso 9).
- **Acumulação** — as duas ausentes reportam 2 erros de uma vez; par incompleto reporta exatamente 1.
- **Malformada falha também fora de produção** — ausência degrada, valor inválido é engano do
  operador em qualquer ambiente; degradar ali esconderia o defeito até produção.
- **Invariante de credencial (CWE-532/CWE-117)** — 3 casos: o PEM privado não vaza (nem linha
  parcial), o valor inválido não é ecoado cru nem truncado, e `\n` no valor não forja linha extra
  no stderr. Molde: `module-driver-config.test.ts` casos 15-17, que nasceram de um erro real de W1.

## Decisões de desenho que os testes fixam

1. **`readAuthJwtKeys(env): Promise<Result<AuthJwtKeyConfig, readonly string[]>>`** — função pura com
   env por parâmetro. Quem encerra o processo é o `server.ts`, nunca o guard
   (precedente: `research.md:32` da spec 037).
2. **Canal separado de `warnings`** no valor de sucesso — CA4 exige aviso sem erro
   (molde: `ModuleDriverConfigs.warnings`).
3. **`keys` opcional no sucesso** — ausente significa "gerar par efêmero", preservando o caminho
   atual. É o que mantém o **CA6** verdadeiro: os 100 arquivos de teste que chamam
   `buildAuthHttpDeps({ driver: 'memory' })` sem `AUTH_JWT_*` continuam válidos.
4. **Nada de eco de valor** — ao contrário de `email-link-base-urls.ts`, que ecoa o valor cru (base
   URL não é segredo), aqui a mensagem cita **só o nome da variável**.

## Nota de custo

O caso CA1 leva ~20 s no estado RED porque espera o timeout do boot que não encerra. Após o W1 ele
deve encerrar em menos de 2 s — o custo é do RED, não da suíte final. O W3 confirma.

## Baseline de regressão

`pnpm test` antes do ticket: **4594 testes · 4574 pass · 0 fail · 20 skipped**.
Com estes dois arquivos, o alvo do W3 é **4613** (4594 + 19).
