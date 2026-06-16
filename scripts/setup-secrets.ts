#!/usr/bin/env -S node --experimental-strip-types --no-warnings
// scripts/setup-secrets.ts
//
// Gera os 3 arquivos de secret consumidos pelo compose MySQL. Veja design
// detalhado em scripts/setup-secrets.design.txt.
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
const PROJECT_ROOT = resolve(HERE, '..');
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

  // Gera contracts_database_url.txt — connection string composta a partir de
  // mysql_app_password.txt (já escrito acima). O host `mysql` é o nome do
  // serviço no compose; em produção o ERP-INFRA injeta a URL real via secret.
  const contractsDbUrlFile = resolve(SECRETS_DIR, 'contracts_database_url.txt');
  if ((await fileExists(contractsDbUrlFile)) && !parsed.force) {
    stderr.write('  ↷ contracts_database_url.txt já existe (use --force para regenerar)\n');
  } else {
    const appPwdFile = resolve(SECRETS_DIR, 'mysql_app_password.txt');
    try {
      const { readFile } = await import('node:fs/promises');
      const appPwd = (await readFile(appPwdFile, 'utf8')).trim();
      const connectionUrl = `mysql://core_app:${appPwd}@mysql:3306/core`;
      // 0600 (só dono): contém a URL completa COM a senha do DB. Os secrets de senha bruta
      // usam 0644 por restrição do initdb (gosu/uid 999 — ver writeSecret); essa restrição
      // NÃO se aplica aqui (único consumidor é o container via /run/secrets, montado 0444).
      await writeAtomic(contractsDbUrlFile, connectionUrl, 0o600);
      stderr.write('  ✓ contracts_database_url.txt criado (chmod 0600)\n');
    } catch (e: unknown) {
      stderr.write(
        `Erro ao gerar contracts_database_url.txt: ${e instanceof Error ? e.message : String(e)}\n`,
      );
      return EXIT_IOERR;
    }
  }

  stderr.write('\n→ Pronto. Próximo: docker compose up -d mysql\n');
  stderr.write('→ NUNCA commitar /secrets/*.txt. Já está no .gitignore.\n');
  return EXIT_OK;
};

exit(await main());
