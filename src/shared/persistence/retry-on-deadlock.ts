// Repetição de transação vítima de deadlock (#803).
//
// Decorator no molde `with*` que a `.claude/rules/adapters.md` fixa para comportamento
// transversal: envolve a operação preservando a assinatura, em vez de espalhar `try/catch`
// dentro de cada repositório. Embutir a repetição no `save` de UM repositório faria o
// comportamento valer só para ele — e o próximo adapter a sofrer o mesmo deadlock não o teria.
//
// POR QUE ENVOLVER A TRANSAÇÃO INTEIRA, E NÃO A QUERY
//   Quando o InnoDB elege uma vítima, ele reverte a transação DELA por completo — todos os
//   statements, não só o que colidiu. Repetir a query isolada gravaria sobre um estado que
//   não existe mais. O que se repete é a unidade atômica: `db.transaction(...)` inteira.
//
// SOBRE O OPTIMISTIC LOCK NA SEGUNDA TENTATIVA
//   Repetir um `save` com o mesmo `expectedVersion` é seguro justamente porque a transação
//   revertida não incrementou versão nenhuma: o banco continua na versão que o chamador leu.
//   Se OUTRA transação tiver avançado a versão nesse meio-tempo, a repetição encontra
//   `affectedRows = 0` e devolve `document-version-conflict` — que é o desfecho correto, e
//   não um efeito colateral do retry.

import { setTimeout as sleep } from 'node:timers/promises';

import { isDeadlock } from './driver-error.ts';

export type DeadlockRetryPolicy = Readonly<{
  /** Total de execuções, incluindo a primeira. `1` desliga a repetição. */
  maxAttempts: number;
  /** Espera antes da repetição de número `attempt` (1 = antes da 2ª execução). */
  delayMsFor: (attempt: number) => number;
}>;

// Política padrão: 3 execuções no total, com espera LINEAR e DETERMINÍSTICA — 25ms antes da
// segunda, 50ms antes da terceira. Soma máxima de 75ms, folgada dentro do orçamento de um
// request HTTP mesmo somada ao retry que o front já faz por conta própria.
//
// ⚠️ A AUSÊNCIA DE JITTER É DELIBERADA, não esquecimento — decisão do tech lead em 21/08/2026.
// O trade-off, por escrito, para que ninguém o "conserte" sem saber o que troca:
//
//   • O que se perde: duas transações que colidiram no mesmo instante voltam no mesmo instante
//     e podem recolidir. Uma componente aleatória as dessincronizaria.
//   • O que se ganha: o comportamento é idêntico em toda execução — INCLUSIVE o modo de falha.
//     Um retry com `Math.random()` produz uma janela de espera diferente a cada rodada, e um
//     defeito que dependa de tempo aparece e some sem que nada tenha mudado. Determinismo aqui
//     é o que permite reproduzir a falha em vez de persegui-la.
//
// Acrescentar jitter depois é aditivo e não quebra os testes, que cobram PROPRIEDADES (≥2
// tentativas, ≤5, espera positiva, não-decrescente, soma ≤2s) e não estes números. Se um dia a
// recolisão sincronizada aparecer em medição — e não em suposição —, esta é a linha a mudar.
export const DEFAULT_DEADLOCK_RETRY: DeadlockRetryPolicy = {
  maxAttempts: 3,
  delayMsFor: (attempt) => 25 * attempt,
};

/**
 * Executa `operation`, repetindo-a enquanto ela falhar por deadlock (errno 1213).
 *
 * Só o deadlock é repetido. Lock-wait timeout (1205) NÃO é: ali nenhuma vítima foi eleita e
 * o lock segue com outra transação, então repetir apenas gasta outro `innodb_lock_wait_timeout`
 * antes da mesma falha. Qualquer outro erro sobe na primeira ocorrência, intacto — inclusive
 * violação de constraint, que é defeito de dado e não corrida.
 */
export const withDeadlockRetry = async <T>(
  operation: () => Promise<T>,
  policy: DeadlockRetryPolicy = DEFAULT_DEADLOCK_RETRY,
): Promise<T> => {
  let attempt = 1;

  for (;;) {
    try {
      return await operation();
    } catch (cause) {
      // O erro sobe intacto quando não é deadlock, ou quando não há mais tentativas: quem
      // depura precisa do erro do driver, não de um wrapper nosso por cima dele.
      if (!isDeadlock(cause) || attempt >= policy.maxAttempts) throw cause;

      const waitMs = policy.delayMsFor(attempt);
      if (waitMs > 0) await sleep(waitMs);
      attempt += 1;
    }
  }
};
