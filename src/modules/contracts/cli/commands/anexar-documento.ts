import type { CliContext } from '../context.ts';
import { parseFlags, validateAllowedFlags } from '../parse-flags.ts';
import { attachSignedDocument } from '../../application/use-cases/attach-signed-document.ts';
import { formatAmendment, formatErrorCode } from '../formatters/index.ts';
import { formatFlagError } from './_flag-errors.ts';

const ALLOWED = ['aditivo', 'documento', 'help', 'h'] as const;
export const allowedFlags: readonly string[] = ALLOWED;

export const descricao = 'Anexa um documento assinado a um Aditivo Pendente.';

export const help = `Uso: anexar-documento --aditivo <uuid> --documento <uuid>

Flags obrigatórias:
  --aditivo <uuid>     ID do aditivo
  --documento <uuid>   ID do documento assinado (UUID v4)`;

export const run = async (ctx: CliContext, argv: readonly string[]): Promise<number> => {
  const parsed = parseFlags(argv);
  if (!parsed.ok) {
    process.stderr.write(formatFlagError(parsed.error));
    return 64;
  }
  const allowed = validateAllowedFlags(parsed.value, ALLOWED);
  if (!allowed.ok) {
    process.stderr.write(formatFlagError(allowed.error));
    return 64;
  }
  const flags = parsed.value;

  for (const r of ['aditivo', 'documento']) {
    if (flags[r] === undefined || flags[r] === '') {
      process.stderr.write(`❌ Flag obrigatória ausente: --${r}\n\n${help}\n`);
      return 64;
    }
  }

  const useCase = attachSignedDocument({
    amendmentRepo: ctx.amendmentRepo,
    documentRepo: ctx.documentRepo,
  });

  const r = await useCase({
    amendmentId: flags['aditivo'] ?? '',
    signedDocumentRef: flags['documento'] ?? '',
  });

  if (!r.ok) {
    process.stderr.write(`❌ ${formatErrorCode(r.error)}\n`);
    return 1;
  }

  const persistResult = await ctx.persist();
  if (!persistResult.ok) {
    process.stderr.write(`❌ ${formatErrorCode(persistResult.error)}\n`);
    return 74; // EX_IOERR
  }
  process.stdout.write('✅ Documento assinado anexado.\n\n');
  process.stdout.write(`${formatAmendment(r.value.amendment)}\n`);
  return 0;
};
