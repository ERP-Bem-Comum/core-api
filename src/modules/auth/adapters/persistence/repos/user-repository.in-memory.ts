/**
 * Adapter InMemory de UserRepository + UserReader (modulo auth).
 *
 * Um unico `Map<UserId, User>` por tras dos dois ports (write/read) — em produção o split
 * vira pools writer/reader (ADR-0026); aqui ambos veem o mesmo store. Para testes e CLI.
 * `findByEmail` por varredura (e-mail ja normalizado no VO). ASCII puro.
 */

import { ok, err } from '../../../../../shared/primitives/result.ts';
import type { UserRepository, UserReader } from '../../../domain/identity/user/repository.ts';
import type { User } from '../../../domain/identity/user/types.ts';
import type { UserId } from '../../../domain/identity/user-id.ts';

export type InMemoryUserStore = Readonly<{
  repository: UserRepository;
  reader: UserReader;
  clear: () => void;
  /** Snapshot da coleção — para wiring do UserQuery in-memory sem expor o Map. */
  snapshot: () => readonly User[];
}>;

export const makeInMemoryUserStore = (): InMemoryUserStore => {
  const map = new Map<UserId, User>();

  const repository: UserRepository = {
    save: async (user) => {
      // CA6/CA7: espelha os dois UNIQUE de auth_user (auth_user_email_idx, auth_user_cpf_idx) —
      // duplicata com id diferente. Varre o map; email e cpf ja normalizados nos VOs.
      //
      // `cpf` null NAO colide: o InnoDB permite multiplos NULL num indice UNIQUE, e quem nasce
      // sem perfil (register/OIDC) tem cpf null. Comparar null === null daria uma colisao que o
      // banco nao tem — o fake recusaria o que a producao aceita (CA8).
      for (const existing of map.values()) {
        if (existing.id === user.id) continue;
        if (existing.email === user.email) return err('email-already-registered');
        if (user.cpf !== null && existing.cpf === user.cpf) {
          return err('cpf-already-registered');
        }
      }
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
    snapshot: () => [...map.values()],
  };
};
