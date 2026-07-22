#!/usr/bin/env -S node --experimental-strip-types --no-warnings
// scripts/setup/secrets.ts
//
// Gera os 3 arquivos de secret consumidos pelo compose MySQL. Veja design
// detalhado em scripts/setup/secrets.design.txt.
//
// Substitui setup-secrets.sh (bash) — Node + TS é mais legível, tipado e
// resolve I-3 do W2 review (TTY-aware automático sem precisar de flag).
//
// Aplica skill `nodejs-fs-scripter`:
//   - node:fs/promises como API canônica
//   - writeAtomic (tmp + rename) para escritas em arquivos sensíveis
//   - stdout reservado para dados consumíveis; progresso/erros vão pra stderr
//   - exit codes sysexits.h (0/64/74)
//   - sem `any`, sem `throw` fora do main(), sem dep externa

import { randomBytes, randomUUID } from 'node:crypto';
import { access, chmod, mkdir, rename, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { resolve } from 'node:path';
import { argv, exit, stderr, stdin, stdout } from 'node:process';
import { fileURLToPath } from 'node:url';

// ─── Paths ────────────────────────────────────────────────────────────────
const HERE = fileURLToPath(new URL('.', import.meta.url));
// scripts/setup/ → sobe 2 níveis até a raiz do projeto.
const PROJECT_ROOT = resolve(HERE, '..', '..');
const SECRETS_DIR = resolve(PROJECT_ROOT, 'secrets');

// ─── Exit codes (sysexits.h) ──────────────────────────────────────────────
const EXIT_OK = 0;
const EXIT_USAGE = 64;
const EXIT_IOERR = 74;

// ─── Tipos ────────────────────────────────────────────────────────────────
type Mode = 'prompt' | 'random' | 'auto';
type EffectiveMode = 'prompt' | 'random';

type Args = Readonly<{ mode: Mode; force: boolean; help: boolean }>;
type ParseError = Readonly<{ error: string }>;
type ParsedArgs = Args | ParseError;

type WriteResult =
  | Readonly<{ ok: true; action: 'created' | 'skipped' }>
  | Readonly<{ ok: false; error: string }>;

type SecretSpec = Readonly<{ name: string; label: string }>;

// ─── Configuração de secrets ──────────────────────────────────────────────
const SECRETS_TO_GENERATE: readonly SecretSpec[] = [
  { name: 'mysql_root_password', label: 'root MySQL' },
  { name: 'mysql_app_password', label: 'core_app (escritor único de core.*)' },
  { name: 'mysql_readonly_password', label: 'readonly_bi (SELECT em core.*)' },
  // MinIO exige: user >= 3 chars, password >= 8 chars. randomBytes(32).hex = 64
  // chars — satisfaz ambos os requisitos. Modo 0644 (mesmo padrão dos secrets
  // MySQL): o MinIO roda como root no container, portanto 0644 funciona; a
  // consistência com os outros secrets facilita auditoria de permissões.
  { name: 'minio_root_user', label: 'MinIO root user (access key)' },
  { name: 'minio_root_password', label: 'MinIO root password (secret key)' },
  // SMTP do worker `email-dispatch`. Em dev é placeholder (mailpit ignora auth); em
  // produção o ERP-INFRA injeta a credencial SMTP do Amazon SES via Secrets Manager.
  { name: 'smtp_pass', label: 'SMTP password (SES em prod; placeholder em dev/mailpit)' },
];

// Connection-string secrets — um por módulo com persistência MySQL. Todos apontam
// para o MESMO database `core` (ADR-0014: isolamento por prefixo de tabela, não por
// database). Ficam nominalmente separados para permitir divergência futura (extração
// de serviço, ADR-0006) e para que cada serviço do compose monte só o secret que
// precisa. O host `mysql` é o nome do serviço no compose; em produção o ERP-INFRA
// injeta a URL real via Secrets Manager. `contracts_database_url` é também consumido
// pelo job one-shot `contracts-sweeper` (compose profile `jobs`).
const DATABASE_URL_SECRETS: readonly string[] = [
  'contracts_database_url',
  'auth_database_url',
  'programs_database_url',
  'partners_database_url',
  'financial_database_url',
  // #374 — o `http` monta este secret e exporta BUDGET_PLANS_DATABASE_URL. Sem ele o módulo
  // budget-plans degrada para in-memory EM SILÊNCIO e o dado some no restart. `reports` não
  // aparece aqui de propósito: é read-only e reusa as URLs dos módulos-fonte (server.ts:247-249).
  'budget_plans_database_url',
  // Consumido pelo job one-shot `migrate` (compose profile `jobs`) — aplica as
  // migrations dos 6 módulos antes de http/workers. Mesma URL (DB único `core`).
  'migrate_database_url',
];

const USAGE = `Uso: pnpm secrets:setup [--random] [--force] [--help]

  --random    Gera senhas aleatórias (32 bytes hex). Sem prompt.
  --force     Sobrescreve arquivos existentes (default: skip).
  --help, -h  Mostra esta ajuda.

Sem flags, detecta TTY automaticamente:
  - Com TTY (terminal interativo): prompt silent para cada senha
  - Sem TTY (CI, stdin redirected): cai para --random com aviso em stderr
`;

// ─── Helpers ──────────────────────────────────────────────────────────────
const isParseError = (p: ParsedArgs): p is ParseError => 'error' in p;

const parseArgs = (raw: readonly string[]): ParsedArgs => {
  let mode: Mode = 'auto';
  let force = false;
  let help = false;
  for (const arg of raw) {
    if (arg === '--random') mode = 'random';
    else if (arg === '--force') force = true;
    else if (arg === '--help' || arg === '-h') help = true;
    else return { error: `Flag desconhecida: ${arg}` };
  }
  return { mode, force, help };
};

const randomPassword = (): string => randomBytes(32).toString('hex');

const fileExists = async (path: string): Promise<boolean> => {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
};

/**
 * Escrita atômica: grava em arquivo temporário com o modo desejado, depois
 * `rename()` (atômico no mesmo filesystem). Garante que readers nunca veem
 * conteúdo parcial nem o arquivo sem o `chmod` aplicado.
 *
 * Padrão da skill `nodejs-fs-scripter` §"Atomic write".
 */
const writeAtomic = async (path: string, data: string, mode: number): Promise<void> => {
  const tmp = `${path}.${randomUUID()}.tmp`;
  await writeFile(tmp, data, { mode });
  // chmod explícito é defesa em profundidade (alguns FS ignoram `mode` do writeFile)
  await chmod(tmp, mode);
  await rename(tmp, path);
};

/**
 * Prompt silencioso via raw mode + listener de stdin. Sem hack
 * `_writeToOutput`. Suporta Enter (resolve), Ctrl+C (reject), Backspace
 * (pop) e demais chars vão pro buffer SEM eco.
 *
 * Restaura `setRawMode` ao estado anterior em qualquer caminho de saída
 * (resolve, reject) — defesa para casos em que o caller já estava em raw.
 */
const promptSilent = async (label: string): Promise<string> =>
  new Promise<string>((resolveOuter, rejectOuter) => {
    stderr.write(`Senha para ${label}: `);

    const wasRaw = stdin.isRaw;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    let buffer = '';

    // Function declarations (não arrow) — eslint permite hoisting (`functions: false`)
    // e cleanup precisa referenciar onData (e vice-versa via remoção do listener).
    function cleanup(): void {
      stdin.removeListener('data', onData);
      stdin.setRawMode(wasRaw);
      stdin.pause();
    }

    function onData(chunk: string): void {
      for (const char of chunk) {
        const code = char.charCodeAt(0);
        if (code === 0x0d || code === 0x0a) {
          // CR ou LF — Enter
          stderr.write('\n');
          cleanup();
          resolveOuter(buffer);
          return;
        }
        if (code === 0x03) {
          // Ctrl+C
          stderr.write('\n');
          cleanup();
          rejectOuter(new Error('input cancelled by user (Ctrl+C)'));
          return;
        }
        if (code === 0x7f || code === 0x08) {
          // Backspace / BS
          if (buffer.length > 0) buffer = buffer.slice(0, -1);
          continue;
        }
        // char comum — NÃO ecoa, vai pro buffer
        buffer += char;
      }
    }

    stdin.on('data', onData);
  });

const resolveEffectiveMode = (requested: Mode): EffectiveMode => {
  if (requested === 'prompt' || requested === 'random') return requested;
  // auto: detecta TTY (resolve I-3 do W2 review). `isTTY` é `true | undefined`
  // em @types/node — truthy check é semanticamente correto e lint-clean.
  if (stdin.isTTY) return 'prompt';
  stderr.write('  ℹ stdin não-TTY detectado — usando --random automaticamente\n');
  return 'random';
};

type PasswordResult =
  | Readonly<{ ok: true; password: string }>
  | Readonly<{ ok: false; error: string }>;

/**
 * Encapsula a obtenção da senha (random ou prompt) num único Result. Permite
 * que `writeSecret` use `const` em vez de `let password` (init-declarations).
 */
const tryGetPassword = async (
  label: string,
  effectiveMode: EffectiveMode,
): Promise<PasswordResult> => {
  try {
    const password = effectiveMode === 'random' ? randomPassword() : await promptSilent(label);
    return { ok: true, password };
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
};

const writeSecret = async (
  spec: SecretSpec,
  args: Args,
  effectiveMode: EffectiveMode,
): Promise<WriteResult> => {
  const file = resolve(SECRETS_DIR, `${spec.name}.txt`);

  if ((await fileExists(file)) && !args.force) {
    stderr.write(`  ↷ ${spec.name}.txt já existe (use --force para regenerar)\n`);
    return { ok: true, action: 'skipped' };
  }

  const pwResult = await tryGetPassword(spec.label, effectiveMode);
  if (!pwResult.ok) return { ok: false, error: pwResult.error };

  try {
    // 0644 (não 0600): o compose monta `secrets.file:` como bind-mount
    // preservando uid/gid/mode do host. O initdb script `01-databases-and-users.sh`
    // roda como o user `mysql` (uid 999), depois do step-down `gosu` do entrypoint,
    // e faz `cat /run/secrets/mysql_readonly_password`. Com 0600 owned pelo uid do
    // host, esse `cat` falha (Permission denied) e `readonly_bi` nunca é criado.
    // `core_app` escapa por ser lido pelo entrypoint AINDA como root, antes do gosu.
    // 0644 dá o read-bit para `others` (sem write) — alinhado ao modo 0444 dos
    // secrets do Docker Swarm e a CA-16 (sem world/group write).
    await writeAtomic(file, pwResult.password, 0o644);
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }

  stderr.write(`  ✓ ${spec.name}.txt criado (chmod 0644)\n`);
  return { ok: true, action: 'created' };
};

/**
 * Grava um connection-string secret (`<module>_database_url.txt`). Difere de
 * `writeSecret` em dois pontos: o valor é a URL pronta (não uma senha gerada) e o
 * modo é 0600 (só dono). A restrição de 0644 dos secrets de senha vem do initdb do
 * MySQL (lido pelo uid 999 via gosu — ver `writeSecret`); aqui o único consumidor é
 * o container via `/run/secrets`, montado 0444 pelo Compose, então 0600 no host basta.
 */
const writeDatabaseUrlSecret = async (
  name: string,
  connectionUrl: string,
  force: boolean,
): Promise<WriteResult> => {
  const file = resolve(SECRETS_DIR, `${name}.txt`);

  if ((await fileExists(file)) && !force) {
    stderr.write(`  ↷ ${name}.txt já existe (use --force para regenerar)\n`);
    return { ok: true, action: 'skipped' };
  }

  try {
    await writeAtomic(file, connectionUrl, 0o600);
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }

  stderr.write(`  ✓ ${name}.txt criado (chmod 0600)\n`);
  return { ok: true, action: 'created' };
};

type ConnectionUrlResult =
  | Readonly<{ ok: true; url: string }>
  | Readonly<{ ok: false; error: string }>;

/**
 * Compõe a connection string a partir de `mysql_app_password.txt` (já gravado).
 * Mesma URL para todos os módulos: database único `core` (ADR-0014), escritor
 * `core_app`, host `mysql` (nome do serviço no compose). Encapsulada num Result
 * para o caller usar `const` (init-declarations).
 */
const tryComposeConnectionUrl = async (): Promise<ConnectionUrlResult> => {
  const appPwdFile = resolve(SECRETS_DIR, 'mysql_app_password.txt');
  try {
    const { readFile } = await import('node:fs/promises');
    const appPwd = (await readFile(appPwdFile, 'utf8')).trim();
    return { ok: true, url: `mysql://core_app:${appPwd}@mysql:3306/core` };
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
};

// ─── Main ─────────────────────────────────────────────────────────────────
const main = async (): Promise<number> => {
  const parsed = parseArgs(argv.slice(2));

  if (isParseError(parsed)) {
    stderr.write(`Erro: ${parsed.error}\n\n${USAGE}`);
    return EXIT_USAGE;
  }

  if (parsed.help) {
    // --help vai pra stdout (permite `pnpm secrets:setup --help | less`)
    stdout.write(USAGE);
    return EXIT_OK;
  }

  try {
    await mkdir(SECRETS_DIR, { recursive: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    stderr.write(`Erro ao criar ${SECRETS_DIR}: ${msg}\n`);
    return EXIT_IOERR;
  }

  const effectiveMode = resolveEffectiveMode(parsed.mode);

  stderr.write(`→ Gerando secrets em ${SECRETS_DIR}/\n`);

  for (const spec of SECRETS_TO_GENERATE) {
    const result = await writeSecret(spec, parsed, effectiveMode);
    if (!result.ok) {
      stderr.write(`Erro ao gravar ${spec.name}: ${result.error}\n`);
      return EXIT_IOERR;
    }
  }

  // Connection-string secrets (um por módulo) — compostas a partir de
  // mysql_app_password.txt (já escrito acima). Mesma URL para todos: o database é
  // único (`core`, ADR-0014) e o escritor é `core_app`.
  const urlResult = await tryComposeConnectionUrl();
  if (!urlResult.ok) {
    stderr.write(`Erro ao compor as connection strings: ${urlResult.error}\n`);
    return EXIT_IOERR;
  }
  const connectionUrl = urlResult.url;

  for (const name of DATABASE_URL_SECRETS) {
    const result = await writeDatabaseUrlSecret(name, connectionUrl, parsed.force);
    if (!result.ok) {
      stderr.write(`Erro ao gravar ${name}: ${result.error}\n`);
      return EXIT_IOERR;
    }
  }

  stderr.write('\n→ Pronto. Próximo: docker compose up -d mysql\n');
  stderr.write('→ NUNCA commitar /secrets/*.txt. Já está no .gitignore.\n');
  return EXIT_OK;
};

exit(await main());
