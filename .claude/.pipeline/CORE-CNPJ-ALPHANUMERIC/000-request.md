# CORE-CNPJ-ALPHANUMERIC — Validação de CNPJ alfanumérico (Serpro/Receita 2026)

## Contexto

O VO `Cnpj` do kernel (`src/shared/kernel/cnpj.ts`) hoje só valida **CNPJ numérico**
(14 dígitos, módulo 11). A Receita Federal passa a emitir, a partir de 07/2026, o
**CNPJ alfanumérico**: as 12 primeiras posições (raiz + estabelecimento) podem conter
`0-9A-Z`; os 2 DVs continuam **numéricos**. O cálculo do checksum é o **mesmo módulo 11**,
com os **mesmos pesos**, trocando apenas a conversão do caractere para `valor = ASCII(c) − 48`
(`'0'..'9' → 0..9`, `'A'..'Z' → 17..42`). É **retrocompatível**: um CNPJ 100% numérico
valida idêntico ao de hoje.

> O checksum atual já usa `charCodeAt(i) - 48` (`cnpj.ts:32`) — o algoritmo de DV já é
> compatível. O que falta é normalização (uppercase, manter `A-Z`) e o formato.

## Escopo (decisões do Gabriel)

- **Estender o VO do kernel** `src/shared/kernel/cnpj.ts` (fonte única cross-BC — ADR-0031 §4).
  Afeta `supplier`, `financier`, `act` e o import legado de `contracts` — todos passam a
  aceitar alfanumérico, retrocompatível.
- **Branch própria** a partir de `dev` (`core-cnpj-alphanumeric`), PR independente do #94.

## Mudança

1. `normalize(raw)`: remove máscara (`.` `/` `-` espaços) e aplica `toUpperCase()`, **mantendo** `A-Z`
   (substitui `onlyDigits`, que apagava letras).
2. Formato: `^[0-9A-Z]{12}[0-9]{2}$` (12 alfanuméricos + 2 DVs numéricos).
3. Checksum: inalterado (`ASCII − 48` + módulo 11, pesos atuais).
4. Rejeição de "todos os 14 caracteres iguais" mantida (retrocompat: `00000000000000` etc.).
5. Valor brandado passa a poder conter letras maiúsculas (varchar já comporta; sem migration).
6. Atualizar docstring (remover referência stale a `financial/.../tax-id.ts`, inexistente).
7. ADR-0044 registrando a adoção + ajuste de CHANGELOG/README.

## Critérios de Aceite

- **CA1** `isValidCnpj('11222333000181')` e mascarado seguem `true` (retrocompat numérico).
- **CA2** `isValidCnpj('12ABC34501DE35')` (e mascarado `12.ABC.345/01DE-35`) → `true`.
- **CA3** `Cnpj.parse('12.abc.345/01de-35')` normaliza para `'12ABC34501DE35'` (uppercase, sem máscara).
- **CA4** DV alfanumérico incorreto (`12ABC34501DE34`) → `false` / `err('invalid-cnpj')`.
- **CA5** DV não-numérico (`12ABC34501DEAB`) → `false` (DVs devem ser dígitos).
- **CA6** `00000000000000` / `11111111111111` seguem `false` (degenerados).
- **CA7** Nenhuma regressão: suíte completa (`pnpm test`) verde.

## Fora de escopo

- Consumidor/read-model no `financial`; CHECK constraints de schema (não existem hoje);
  geração de CNPJ alfanumérico de teste como helper de produção.
