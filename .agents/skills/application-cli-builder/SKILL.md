---
name: application-cli-builder
description: >
  Constrói uma CLI Node.js para a P.O. validar regras de negócio do domínio antes
  de gastar tempo em adapters reais (DB, HTTP). A CLI usa adapters InMemory por
  padrão, expõe use cases como comandos, e formata Result<T, E> de modo humano.
---

# Application CLI Builder

## Persona

Você é o **construtor da CLI de validação de regras** do módulo Contratos. Sua função: **dar à P.O. uma forma de exercitar todas as regras de negócio modeladas** — criar Contrato, registrar Aditivo, tentar homologar sem documento (deve falhar), encerrar, distratar — **antes de subir banco e UI**.

> **Fronteira:** edita `src/modules/<modulo>/cli/`. Consome `application/` (use cases), nunca toca `domain/` direto ou `adapters/` reais.

---

## Source of Truth

- 10 pilares de CLI: [`./references/cli-guidelines.md`](./references/cli-guidelines.md) (adaptado do `cli-craftsman` ACDG).
- TypeScript moderno: sempre [`handbook/reference/typescript/`](../../../../handbook/reference/typescript/).

---

## 📚 Referências específicas deste projeto

| Tópico                                                                                                       | Onde olhar                                                                                                                                                                                                                         |
| :----------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Regras transversais (idioma, exit codes, formatação de Result)                                               | [`../../../CLAUDE.md`](../../../CLAUDE.md)                                                                                                                                                                                         |
| Flag `--driver` (`memory` \| `mysql`) — topologia da CLI                                                     | [`ADR-0020`](../../../handbook/architecture/adr/0020-mysql-only-supersedes-dual-dialect.md) (supersedes ADR-0018) + [`06-persistence-strategy.md` §4.1](../../../handbook/architecture/06-persistence-strategy.md)                 |
| `--state` (snapshot/restore JSON)                                                                            | `src/modules/contracts/cli/state.ts` + ticket `CTR-CLI-MVP/`                                                                                                                                                                       |
| Subcomando upload de documento (planejado, depende de S3/MinIO)                                              | [`ADR-0019`](../../../handbook/architecture/adr/0019-document-storage-s3-with-minio-dev.md) (ticket `CTR-CLI-UPLOAD` futuro)                                                                                                       |
| Node 24 — `--experimental-strip-types`, `node:test`, ESM/NodeNext, sysexits.h, `process.stdout/stderr.write` | [`handbook/reference/nodejs/`](../../../handbook/reference/nodejs/)                                                                                                                                                                |
| Tickets já executados (exemplos vivos completos)                                                             | `.claude/.pipeline/CTR-CLI-MVP/`, `CTR-CLI-DRIVER-FLAG/`, `CTR-CLI-E2E-TESTS/`                                                                                                                                                     |
| Código de produção que materializa este padrão (ler antes de adicionar novo subcomando)                      | `src/modules/contracts/cli/{main,registry,context,state,parse-flags,parse-driver-flags}.ts`, `src/modules/contracts/cli/commands/`, `src/modules/contracts/cli/drivers/{memory,mysql}.ts`, `src/modules/contracts/cli/formatters/` |
| Exit codes vigentes                                                                                          | `cli/main.ts`: `EXIT_USAGE=64`, `EXIT_SOFTWARE=70`, `EXIT_IOERR=74` (sysexits.h). Use também: `0` sucesso, `1` erro de regra.                                                                                                      |

---

## Princípio operacional

> A CLI **não precisa de banco, HTTP ou UI** para funcionar. Roda contra **adapters InMemory** e expõe **todos os use cases como subcomandos**. A P.O. usa o terminal para ver regras funcionando em segundos.

---

## Estrutura

```
src/modules/contratos/cli/
├── main.ts                       # entry point — `node --experimental-strip-types main.ts <subcommand>`
├── context.ts                    # constrói o contexto (deps com InMemory adapters)
├── commands/
│   ├── criar-contrato.ts         # subcomando — invoca use case criarContrato
│   ├── registrar-aditivo.ts
│   ├── anexar-documento.ts
│   ├── homologar-aditivo.ts
│   ├── encerrar-contrato.ts
│   ├── distratar-contrato.ts
│   ├── listar-contratos.ts
│   └── show-contrato.ts
├── format.ts                     # formata Result, Moeda, Periodo para humano
└── registry.ts                   # mapa de subcomando → handler
```

---

## Padrão do entry-point (`main.ts`)

```ts
#!/usr/bin/env node
// src/modules/contratos/cli/main.ts
import { criarContexto } from './context.ts';
import { COMMANDS } from './registry.ts';

const [, , subcomando, ...argv] = process.argv;

const usage = (): never => {
  process.stderr.write('Uso: contratos-cli <subcomando> [args]\n\n');
  process.stderr.write('Subcomandos disponíveis:\n');
  for (const [nome, cmd] of Object.entries(COMMANDS)) {
    process.stderr.write(`  ${nome.padEnd(24)} ${cmd.descricao}\n`);
  }
  process.exit(64); // EX_USAGE
};

if (!subcomando || subcomando === '-h' || subcomando === '--help') usage();

const cmd = COMMANDS[subcomando];
if (!cmd) {
  process.stderr.write(`Subcomando desconhecido: ${subcomando}\n`);
  usage();
}

const ctx = criarContexto();
const code = await cmd.run(ctx, argv);
process.exit(code);
```

Pontos-chave:

- **Shebang** `#!/usr/bin/env node` para invocação direta após `chmod +x`.
- **`process.exit(64)` para usage error** — segue sysexits.h ([`cli-guidelines.md`](./references/cli-guidelines.md) §P2).
- **Stdout para output formal, stderr para help e erros** ([`cli-guidelines.md`](./references/cli-guidelines.md) §P3).

---

## Contexto (`context.ts`)

```ts
// src/modules/contratos/cli/context.ts
import { ContratoRepositoryInMemory } from '../adapters/contrato-repository.in-memory.ts';
import { AditivoRepositoryInMemory } from '../adapters/aditivo-repository.in-memory.ts';
import { EventBusInMemory } from '../adapters/event-bus.in-memory.ts';
import { StorageInMemory } from '../adapters/storage.in-memory.ts';
import { ClockReal } from '../../../shared/adapters/clock-real.ts';

export type CliContext = Readonly<{
  contratoRepo: ContratoRepository;
  aditivoRepo: AditivoRepository;
  eventBus: EventBus;
  storage: DocumentoStorage;
  clock: Clock;
}>;

export const criarContexto = (): CliContext => ({
  contratoRepo: ContratoRepositoryInMemory(),
  aditivoRepo: AditivoRepositoryInMemory(),
  eventBus: EventBusInMemory(),
  storage: StorageInMemory(),
  clock: ClockReal(),
});
```

> Todos os adapters são **InMemory**. Persistência só existe enquanto o processo roda — perfeito para a P.O. fazer experimentos.

Variantes possíveis:

- **Snapshot/restore** — flag `--state path/to/state.json` para a P.O. retomar de onde parou.
- **`ClockFake`** — flag `--agora 2026-12-31T12:00Z` para simular "passar do tempo".

---

## Padrão de subcomando

```ts
// src/modules/contratos/cli/commands/criar-contrato.ts
import { criarContrato } from '../../application/use-cases/criar-contrato.ts';
import { formatarResultado } from '../format.ts';
import type { CliContext } from '../context.ts';

export const descricao = 'Cria um novo Contrato Mãe';

export const run = async (ctx: CliContext, argv: readonly string[]): Promise<number> => {
  const flags = parseFlags(argv);
  if ('error' in flags) {
    process.stderr.write(`Erro de uso: ${flags.error}\n`);
    return 64; // EX_USAGE
  }

  const useCase = criarContrato(ctx);
  const r = await useCase({
    numeroSequencial: flags.numero,
    titulo: flags.titulo,
    objeto: flags.objeto,
    valorOriginalCentavos: flags.valorCentavos,
    inicioVigencia: flags.inicio,
    fimVigencia: flags.fim,
  });

  process.stdout.write(formatarResultado(r));
  return r.ok ? 0 : 1;
};

type FlagsOk = Readonly<{
  numero: string;
  titulo: string;
  objeto: string;
  valorCentavos: number;
  inicio: string;
  fim: string;
}>;

type FlagsErr = Readonly<{ error: string }>;

const parseFlags = (argv: readonly string[]): FlagsOk | FlagsErr => {
  // ... parse simples; em produção considerar `args` package, mas evitar dep extra na fase 1
  return { error: 'placeholder' };
};
```

---

## Formatação de Result (`format.ts`)

```ts
// src/modules/contratos/cli/format.ts
import type { Result } from '../../../shared/result.ts';

export const formatarResultado = <T, E>(r: Result<T, E>): string => {
  if (r.ok) {
    return `✅ Sucesso\n${formatarValor(r.value)}\n`;
  }
  return `❌ Erro: ${formatarErro(r.error)}\n`;
};

const formatarValor = (v: unknown): string => {
  if (typeof v === 'object' && v !== null && 'centavos' in v) {
    return `R$ ${((v as { centavos: number }).centavos / 100).toFixed(2)}`;
  }
  return JSON.stringify(v, null, 2);
};

const formatarErro = (e: unknown): string => {
  if (typeof e === 'string') {
    return mensagemHumana(e);
  }
  return JSON.stringify(e);
};

const mensagemHumana = (codigo: string): string => {
  const dicionario: Record<string, string> = {
    'contrato-encerrado': 'Contrato já está encerrado — não aceita aditivos.',
    'aditivo-sem-documento-assinado':
      'Aditivo precisa ter documento assinado anexado para ser homologado.',
    'moeda-valor-negativo': 'Valor monetário não pode ser negativo.',
    'periodo-fim-antes-inicio': 'A data de fim de vigência é anterior à de início.',
    // ... preencher conforme erros surgem
  };
  return dicionario[codigo] ?? `(código: ${codigo})`;
};
```

> Mensagens em **PT-BR** porque a P.O. é quem lê. Códigos de erro internos ficam em parênteses para o dev.

---

## Fluxo típico de uso pela P.O.

```bash
# Cria um contrato
$ contratos-cli criar-contrato \
    --numero 001/2026 \
    --titulo "Cooperativa Bem Comum" \
    --objeto "Aquisição de equipamentos" \
    --valor-centavos 10000000 \
    --inicio 2026-01-01 \
    --fim 2026-12-31
✅ Sucesso
Contrato 001/2026 criado. ID: 7f3a...

# Tenta registrar aditivo num contrato encerrado (deve falhar)
$ contratos-cli encerrar-contrato --id 7f3a...
✅ Sucesso

$ contratos-cli registrar-aditivo --contrato-id 7f3a... --tipo Acrescimo --valor 50000
❌ Erro: Contrato já está encerrado — não aceita aditivos.

# Lista contratos vigentes
$ contratos-cli listar-contratos --status Vigente
(vazio)

# Verifica auditoria
$ contratos-cli show-contrato --id 7f3a... --com-eventos
{...timeline completo...}
```

---

## Boas práticas

### Saída

- **Mensagens à P.O. em PT-BR**, códigos técnicos entre parênteses.
- **Stdout** para output que vai ser consumido (JSON ou texto formatado).
- **Stderr** para help, prompts, progresso, erros.
- **Exit code 0** para sucesso, 1 para erro de regra, 64 para má utilização.

### Argumentos

- **Flags longas** (`--contrato-id`) preferíveis para a P.O. (legível).
- **Flags curtas** (`-c`) só onde uso é frequente.
- **`--help`** em todo subcomando, gerado automaticamente do registry.

### Estado

- Por padrão, estado é em memória — some quando processo termina.
- **`--state arquivo.json`** flag opcional para persistir/restaurar entre sessões. Útil quando a P.O. quer construir cenário em vários passos.

---

## Workflow para criar CLI de um BC

1. **Ler os use cases existentes** em `application/use-cases/`.
2. **Inventariar** os comandos e queries que cobrem o ciclo de vida.
3. **Criar handlers** em `cli/commands/<nome>.ts`.
4. **Registrar** em `cli/registry.ts`.
5. **Adicionar** ao `format.ts` qualquer tipo novo que precise de formatação humana.
6. **Documentar exemplos** em `cli/README.md` (PT-BR) com fluxos típicos.
7. **Pedir à P.O.** para tentar quebrar — toda regra que rolar errado vira teste novo no domínio.

---

## Anti-padrões

| ❌ Errado                                                      | ✅ Certo                                               |
| :------------------------------------------------------------- | :----------------------------------------------------- |
| CLI conectando a MySQL real                                    | InMemory por padrão; SQL é problema do adapter         |
| Mensagens de erro em código (`moeda-valor-negativo`) cruamente | Mensagem humana PT-BR via dicionário                   |
| `console.log` espalhado                                        | `process.stdout.write` / `process.stderr.write` claros |
| Exit code sempre 0                                             | Sucesso 0, erro 1, usage 64                            |
| Sem `--help`                                                   | Toda CLI tem help; subcomando sem flag mostra help     |
| Argumentos posicionais ambíguos                                | Flags nomeadas (`--contrato-id ...`)                   |
| Stdout colorido sempre                                         | Stderr pode ter cor (TTY check), stdout neutro         |

---

## Como esta skill se relaciona com outras

```
ts-domain-modeler            (modela tipos e regras)
        ▼
ports-and-adapters           (use cases + InMemory adapters)
        ▼
application-cli-builder      ◄── você está aqui (expõe via CLI à P.O.)
```

---

## Changelog

- **2026-05-14:** Criação. Inspirada no `cli-craftsman` do ACDG/frontend.
