/**
 * Adapter InMemory de UserRepository + UserReader (modulo auth).
 *
 * Um unico `Map<UserId, User>` por tras dos dois ports (write/read) — em produção o split
 * vira pools writer/reader (ADR-0026); aqui ambos veem o mesmo store. Para testes e CLI.
 * `findByEmail` por varredura (e-mail ja normalizado no VO). ASCII puro.
 */

import { ok } from '../../../../../shared/primitives/result.ts';
import type { UserRepository, UserReader } from '../../../domain/identity/user/repository.ts';
import type { User } from '../../../domain/identity/user/types.ts';
import type { UserId } from '../../../domain/identity/user-id.ts';

export type InMemoryUserStore = Readonly<{
  repository: UserRepository;
  reader: UserReader;
  clear: () => void;
}>;

export const makeInMemoryUserStore = (): InMemoryUserStore => {
  const map = new Map<UserId, User>();

  const repository: UserRepository = {
    save: async (user) => {
      map.set(user.id, user);
      return ok(undefined);
    },
  };

  const reader: UserReader = {
    findById: async (id) => ok(map.get(id) ?? null),
    findByEmail: async (email) => ok([...map.values()].find((u) => u.email === email) ?? null),
  };

  return {
    repository,
    reader,
    clear: () => {
      map.clear();
    },
  };
};
