import {
  KERNEL_PUBLIC_MESSAGES,
  type ErrorCodeOf,
  type UseCaseErrorOf,
} from '#src/shared/http/public-message.ts';
import type { BudgetPlansHttpDeps } from './composition.ts';

/** União dos códigos de erro que o plugin HTTP do budget-plans devolve: os dos seus use cases. */
export type BudgetPlansErrorCode = ErrorCodeOf<UseCaseErrorOf<BudgetPlansHttpDeps>>;

/** Frase PT-BR de cada {@link BudgetPlansErrorCode}, exibida no `message` do envelope de erro. */
export const BUDGET_PLANS_PUBLIC_MESSAGES = {
  ...KERNEL_PUBLIC_MESSAGES,
  'budget-plan-id-invalid': 'Identificador de plano orçamentário inválido.',
  'budget-plan-ref-invalid':
    'Referência inválida: o valor informado não é um identificador válido.',
  'budget-id-invalid': 'Identificador de orçamento inválido.',
  'cost-center-id-invalid': 'Identificador de centro de custo inválido.',
  'category-id-invalid': 'Identificador de categoria inválido.',
  'subcategory-id-invalid': 'Identificador de subcategoria inválido.',
  'exercise-month-invalid': 'Mês de exercício inválido: informe um mês de 1 a 12.',
  'budget-plan-invalid-year': 'Ano do plano orçamentário inválido.',
  'budget-plan-duplicate-partner': 'A mesma rede não pode aparecer duas vezes no plano.',
  'budget-plan-already-exists': 'Já existe um plano orçamentário para este ano e programa.',
  'budget-plan-not-found': 'Plano orçamentário não encontrado.',
  'budget-plan-not-editable': 'Este plano está aprovado e não pode mais ser editado.',
  'budget-plan-has-children':
    'O plano tem calibração ou cenário vinculado. Exclua-os antes de excluir o plano.',
  'program-not-found': 'Programa não encontrado.',
  'program-not-active': 'O programa informado não está ativo.',
  'budget-plan-not-approved': 'Esta operação exige um plano aprovado.',
  'budget-plan-is-scenario': 'Esta operação não é permitida em um cenário.',
  'budget-plan-already-approved': 'Este plano já está aprovado.',
  'budget-plan-calibration-open':
    'Já existe uma calibração em aberto para este plano. Conclua-a antes de abrir outra.',
  'budget-plan-scenery-limit': 'O plano atingiu o limite de cenários.',
  'scenario-name-required': 'Informe o nome do cenário.',
  'budget-plan-import-same-year':
    'O ano de origem precisa ser diferente do ano do plano que está sendo criado.',
  'budget-plan-import-source-not-approved':
    'Não há plano aprovado deste programa no ano de origem para copiar.',
  'plan-not-approved-for-consolidation': 'Só é possível exportar um plano aprovado.',
  'cost-node-parent-not-found': 'O item superior informado não existe na árvore de custos.',
  'cost-node-name-required': 'Informe o nome do item.',
  'cost-node-invalid-direction': 'Direção inválida: use A PAGAR ou A RECEBER.',
  'cost-node-invalid-launch-type': 'Tipo de lançamento inválido para a subcategoria.',
  'cost-node-not-found': 'Item da árvore de custos não encontrado.',
  'cost-node-patch-empty': 'Informe ao menos um campo para alterar.',
  'calc-model-mismatch':
    'O modelo de cálculo não corresponde ao tipo de lançamento da subcategoria.',
  'budget-not-found': 'Orçamento não encontrado.',
  'subcategory-not-found': 'Subcategoria não encontrada.',
  'subcategory-not-in-budget-plan':
    'A subcategoria informada não pertence ao plano deste orçamento.',
  'budget-result-orphan-subcategory':
    'O plano de origem tem lançamento em subcategoria fora da sua árvore de custos. Nada foi copiado.',
  'budget-results-total-exceeds-safe-integer':
    'A soma dos lançamentos deste orçamento excede o limite monetário permitido.',
  'budget-result-sum-exceeds-safe-integer':
    'A soma dos lançamentos de um orçamento excede o limite monetário permitido.',
  'budget-plan-total-exceeds-safe-integer':
    'A soma dos lançamentos de um plano excede o limite monetário permitido.',
  'consolidated-total-exceeds-safe-integer':
    'A soma dos planos consolidados excede o limite monetário permitido.',
  'budget-plan-repo-unavailable': 'Erro ao consultar os planos orçamentários. Tente novamente.',
  'program-catalog-unavailable': 'Erro ao consultar o catálogo de programas. Tente novamente.',
  'partner-network-unavailable': 'Erro ao consultar as redes parceiras. Tente novamente.',
  'outbox-append-failed': 'Erro ao registrar a operação. Tente novamente.',
  'cost-structure-repo-unavailable': 'Erro ao consultar a árvore de custos. Tente novamente.',
  'budget-result-repo-unavailable': 'Erro ao consultar os lançamentos. Tente novamente.',
  'budget-result-corrupt': 'Um lançamento gravado está em formato inválido.',
  'subcategory-reader-unavailable': 'Erro ao consultar as subcategorias. Tente novamente.',
  'budget-reader-unavailable': 'Erro ao consultar os orçamentos. Tente novamente.',
  'plan-clone-write-unavailable':
    'Erro ao gravar a cópia do plano. Nada foi gravado — tente novamente.',
  'realized-by-plan-read-unavailable': 'Erro ao consultar o realizado do plano. Tente novamente.',
} as const satisfies Readonly<Record<BudgetPlansErrorCode, string>>;
