// Montagem das entradas de histórico (US4). Concentra os concerns de apresentação/persistência:
// label PT do campo (desnormalizado na linha — imutabilidade histórica), geração de id e o diff
// de domínio (`diffCollaborator`). O domínio permanece EN-puro.

import { randomUUID } from 'node:crypto';
import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import { diffCollaborator } from '#src/modules/partners/domain/collaborator/collaborator-history.ts';
import type {
  CollaboratorHistoryEntry,
  RecordHistoryInput,
} from '#src/modules/partners/application/ports/collaborator-history.ts';

// Campos auditados → label PT (CSV legado). Subconjunto dos editáveis via PUT + situação (US4 §2).
export const COLLABORATOR_FIELD_LABELS: Readonly<Record<string, string>> = {
  name: 'Nome',
  email: 'E-mail',
  cpf: 'CPF',
  role: 'Cargo',
  occupationArea: 'Área de Atuação',
  startOfContract: 'Início do Contrato',
  employmentRelationship: 'Vínculo',
  status: 'Situação',
  disableBy: 'Motivo de Desativação',
  // #126: novos campos rastreados (linhas adicionais no histórico).
  territory: 'Território',
  bankAccount: 'Dados bancários', // #1029: era 'Banco' — a linha traz banco/agência/conta-DV.
  pixKey: 'Chave PIX',
  // Preenchidos pelo PUT depois do cadastro completo (decisão da P.O., 19/10/2026).
  rg: 'RG',
  dateOfBirth: 'Data de Nascimento',
  race: 'Raça/Cor',
  // Spec 131: preenchido pelo PUT até completar (P.O., 23/10/2026).
  pwd: 'Pessoa com Deficiência',
};

const PWD_ANSWER_LABELS: Readonly<Record<string, string>> = {
  SIM: 'Sim',
  NAO: 'Não',
  PREFIRO_NAO_RESPONDER: 'Prefiro não responder',
};

const PWD_TYPE_LABELS: Readonly<Record<string, string>> = {
  FISICA: 'Deficiência Física',
  VISUAL: 'Deficiência Visual',
  AUDITIVA: 'Deficiência Auditiva',
  INTELECTUAL_MENTAL: 'Deficiência Intelectual ou Mental',
  TEA: 'Transtorno do Espectro Autista (TEA)',
  MULTIPLA: 'Deficiência Múltipla',
};

// `JSON.parse` lança; a borda converte na hora (erro como valor).
const parseJson = (raw: string): Result<unknown, 'not-json'> => {
  try {
    return ok(JSON.parse(raw) as unknown);
  } catch {
    return err('not-json');
  }
};

/**
 * PcD em PT para o CSV de histórico (P.O.: "antes → depois em português"). O domínio entrega o JSON
 * dos códigos; texto fora do formato esperado passa cru — histórico não pode perder a linha.
 * Ex.: `Sim — Deficiência Visual; Outra: baixa audição`.
 */
export const formatPwdPt = (raw: string | null): string | null => {
  if (raw === null) return null;
  const json = parseJson(raw);
  if (!json.ok) return raw;
  const parsed = json.value;
  if (typeof parsed !== 'object' || parsed === null || !('answer' in parsed)) return raw;
  const p = parsed as {
    answer: string;
    types?: readonly string[];
    otherDescription?: string | null;
  };
  const answer = PWD_ANSWER_LABELS[p.answer] ?? p.answer;
  const types = (p.types ?? []).map((t) =>
    t === 'OUTRA' ? `Outra: ${p.otherDescription ?? ''}`.trim() : (PWD_TYPE_LABELS[t] ?? t),
  );
  return types.length === 0 ? answer : `${answer} — ${types.join('; ')}`;
};

// Formatação PT por campo, quando o valor neutro do domínio não é legível como está.
const VALUE_FORMATTERS: Readonly<Record<string, (raw: string | null) => string | null>> = {
  pwd: formatPwdPt,
};

/** Diff por campo → entradas materializadas (id, label PT). Diff vazio → []. */
export const buildHistoryEntries = (
  input: RecordHistoryInput,
): readonly CollaboratorHistoryEntry[] =>
  diffCollaborator(input.before, input.after).flatMap((change) => {
    if (input.fields !== undefined && !input.fields.includes(change.fieldName)) return [];
    const fieldLabel = COLLABORATOR_FIELD_LABELS[change.fieldName];
    if (fieldLabel === undefined) return [];
    const format = VALUE_FORMATTERS[change.fieldName] ?? ((raw: string | null) => raw);
    return [
      {
        id: randomUUID(),
        collaboratorId: input.collaboratorId,
        eventType: input.eventType,
        fieldName: change.fieldName,
        fieldLabel,
        valueBefore: format(change.valueBefore),
        valueAfter: format(change.valueAfter),
        occurredAt: input.occurredAt,
        changedByUserId: input.changedBy?.userId ?? null,
        changedByName: input.changedBy?.userName ?? null,
      },
    ];
  });
