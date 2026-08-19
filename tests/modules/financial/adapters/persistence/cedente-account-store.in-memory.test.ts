// O adapter in-memory do CedenteAccountStore satisfaz o contrato do port.
//
// Todos os casos vivem em `cedente-account-store.contract.ts`, consumido também pelo adapter
// Drizzle+MySQL. Duplicar caso aqui reabre a porta que o contrato fechou: uma regra passar a valer
// para UM adapter só é como o `nextNsa` voltou a ser reescrito no `save` sem a suíte notar.
//
// A ATOMICIDADE não se prova aqui — só contra MySQL, em `nsa-allocation.drizzle-mysql.test.ts`.
// Este arquivo mostra que o fake CONCORDA com o contrato; aquele mostra que o lock funciona.

import { createInMemoryCedenteAccountStore } from '#src/modules/financial/adapters/persistence/repos/cedente-account-store.in-memory.ts';
import { cedenteAccountStoreContract } from './cedente-account-store.contract.ts';

cedenteAccountStoreContract('in-memory', () => ({
  store: createInMemoryCedenteAccountStore(),
  // `make()` já devolve um store novo por caso: não há espaço de chave compartilhado a limpar.
  reset: () => Promise.resolve(),
}));
