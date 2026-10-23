/**
 * Pessoa com Deficiência (PcD) do colaborador — spec 131 do web-app (P.O., 23/10/2026), no texto do
 * cliente:
 *
 *   Pergunta 1 (obrigatória no autocadastro): Sim · Não · Prefiro não responder.
 *   Pergunta 2 (só com "Sim", várias): Física · Visual · Auditiva · Intelectual ou Mental · TEA ·
 *   Múltipla · Outra (com texto).
 *
 * Substitui o par `isPwd` (boolean) + `pwdDescription` (texto "Qual?"). Códigos em PT, como os demais
 * enums do colaborador (ADR-0031 §D2), opacos para o domínio.
 *
 * "Sim" sem tipo e "Outra" sem texto são REPRESENTÁVEIS: é como chega o dado anterior a esta mudança
 * (o "Sim" antigo não tinha tipo). Esse estado é INCOMPLETO, e incompleto fica aberto para
 * preenchimento; completo trava (`resolvePwdFill`). O que se GRAVA a partir de agora, porém, tem de
 * chegar completo (`parsePwd`).
 */

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import { blankToNull } from './personal-data.ts';

export type PwdAnswer = 'SIM' | 'NAO' | 'PREFIRO_NAO_RESPONDER';

export type PwdType =
  | 'FISICA'
  | 'VISUAL'
  | 'AUDITIVA'
  | 'INTELECTUAL_MENTAL'
  | 'TEA'
  | 'MULTIPLA'
  | 'OUTRA';

/** Ordem do formulário do cliente — também a ordem canônica de gravação e de comparação. */
export const PWD_TYPES: readonly PwdType[] = [
  'FISICA',
  'VISUAL',
  'AUDITIVA',
  'INTELECTUAL_MENTAL',
  'TEA',
  'MULTIPLA',
  'OUTRA',
];

const PWD_ANSWERS: ReadonlySet<string> = new Set<PwdAnswer>([
  'SIM',
  'NAO',
  'PREFIRO_NAO_RESPONDER',
]);
const PWD_TYPE_SET: ReadonlySet<string> = new Set<string>(PWD_TYPES);

/** Contrato de produto do texto de "Outra" — o mesmo da "Outra identidade de gênero" (#1054). */
export const PWD_OTHER_DESCRIPTION_MAX_LENGTH = 120;

export type Pwd =
  | Readonly<{ answer: 'NAO' | 'PREFIRO_NAO_RESPONDER' }>
  | Readonly<{ answer: 'SIM'; types: readonly PwdType[]; otherDescription: string | null }>;

export type PwdInput = Readonly<{
  answer: string;
  types?: readonly string[] | null | undefined;
  otherDescription?: string | null | undefined;
}>;

export type PwdError =
  | 'invalid-pwd-answer'
  | 'invalid-pwd-type'
  // Tipos e texto só existem com "Sim".
  | 'collaborator-pwd-details-require-yes'
  // "Sim" pede ao menos um tipo; "Outra" pede o texto.
  | 'collaborator-pwd-type-required'
  | 'collaborator-pwd-other-description-required'
  // Texto sem "Outra" marcada.
  | 'collaborator-pwd-description-requires-other'
  | 'collaborator-pwd-other-description-too-long';

const canonicalTypes = (types: readonly PwdType[]): readonly PwdType[] =>
  PWD_TYPES.filter((t) => types.includes(t));

/**
 * Valida uma resposta NOVA. Sai sempre completa: "Sim" com ao menos um tipo e, com "Outra", com o
 * texto. Tipos repetidos são absorvidos e reordenados na ordem do formulário.
 */
export const parsePwd = (input: PwdInput): Result<Pwd, PwdError> => {
  if (!PWD_ANSWERS.has(input.answer)) return err('invalid-pwd-answer');
  const answer = input.answer as PwdAnswer;
  const rawTypes = input.types ?? [];
  const otherDescription = blankToNull(input.otherDescription);

  if (answer !== 'SIM') {
    if (rawTypes.length > 0 || otherDescription !== null) {
      return err('collaborator-pwd-details-require-yes');
    }
    return ok({ answer });
  }

  if (rawTypes.some((t) => !PWD_TYPE_SET.has(t))) return err('invalid-pwd-type');
  const types = canonicalTypes(rawTypes as readonly PwdType[]);
  if (types.length === 0) return err('collaborator-pwd-type-required');

  const hasOther = types.includes('OUTRA');
  if (otherDescription !== null && !hasOther)
    return err('collaborator-pwd-description-requires-other');
  if (hasOther && otherDescription === null)
    return err('collaborator-pwd-other-description-required');
  if (otherDescription !== null && otherDescription.length > PWD_OTHER_DESCRIPTION_MAX_LENGTH) {
    return err('collaborator-pwd-other-description-too-long');
  }

  return ok({ answer, types, otherDescription });
};

/**
 * Completo = respondido de vez: "Não", "Prefiro não responder", ou "Sim" com tipo e — havendo
 * "Outra" — com o texto. Vazio ou incompleto fica ABERTO (P.O., 23/10).
 */
export const isComplete = (pwd: Pwd | null): boolean => {
  if (pwd === null) return false;
  if (pwd.answer !== 'SIM') return true;
  if (pwd.types.length === 0) return false;
  return !pwd.types.includes('OUTRA') || pwd.otherDescription !== null;
};

const same = (a: Pwd, b: Pwd): boolean => {
  if (a.answer !== b.answer) return false;
  if (a.answer !== 'SIM' || b.answer !== 'SIM') return true;
  return (
    a.otherDescription === b.otherDescription &&
    a.types.length === b.types.length &&
    a.types.every((t, i) => b.types[i] === t)
  );
};

/**
 * "Preenche até completar" (P.O., 23/10/2026) — a variação PcD do "preenche uma vez" da spec 124:
 *   - ausente/`null`              → MANTÉM o gravado;
 *   - gravado vazio ou incompleto → valida e GRAVA o recebido (que chega completo);
 *   - gravado completo, igual     → mantém (o formulário reenvia o que leu);
 *   - gravado completo, diferente → RECUSA (`collaborator-personal-data-immutable`).
 */
export const resolvePwdFill = (
  current: Pwd | null,
  input: PwdInput | null | undefined,
): Result<Pwd | null, PwdError | 'collaborator-personal-data-immutable'> => {
  if (input === undefined || input === null) return ok(current);
  const next = parsePwd(input);
  if (!next.ok) return next;
  if (!isComplete(current)) return ok(next.value);
  return current !== null && same(current, next.value)
    ? ok(current)
    : err('collaborator-personal-data-immutable');
};

// ─── Persistência (ADR-0020: sem ENUM nativo nem JSON — tipos como CSV, como `children_ages`) ────

export type PwdColumns = Readonly<{
  pwdAnswer: string | null;
  pwdTypes: string | null;
  pwdDescription: string | null;
}>;

export const toColumns = (pwd: Pwd | null): PwdColumns => {
  if (pwd === null) return { pwdAnswer: null, pwdTypes: null, pwdDescription: null };
  if (pwd.answer !== 'SIM') return { pwdAnswer: pwd.answer, pwdTypes: null, pwdDescription: null };
  return {
    pwdAnswer: 'SIM',
    pwdTypes: pwd.types.length === 0 ? null : pwd.types.join(','),
    pwdDescription: pwd.otherDescription,
  };
};

/**
 * Reidrata SEM exigir completude — o dado anterior à mudança é "Sim" sem tipo. Código desconhecido
 * é corrupção (erro); texto com resposta ≠ "Sim" é descartado só na leitura do agregado, nunca do
 * banco (a migration não produz esse caso).
 */
export const fromColumns = (
  cols: PwdColumns,
): Result<Pwd | null, 'invalid-pwd-answer' | 'invalid-pwd-type'> => {
  if (cols.pwdAnswer === null) return ok(null);
  if (!PWD_ANSWERS.has(cols.pwdAnswer)) return err('invalid-pwd-answer');
  const answer = cols.pwdAnswer as PwdAnswer;
  if (answer !== 'SIM') return ok({ answer });
  const raw = cols.pwdTypes === null || cols.pwdTypes.trim() === '' ? [] : cols.pwdTypes.split(',');
  const trimmed = raw.map((t) => t.trim());
  if (trimmed.some((t) => !PWD_TYPE_SET.has(t))) return err('invalid-pwd-type');
  return ok({
    answer,
    types: canonicalTypes(trimmed as readonly PwdType[]),
    otherDescription: blankToNull(cols.pwdDescription),
  });
};
