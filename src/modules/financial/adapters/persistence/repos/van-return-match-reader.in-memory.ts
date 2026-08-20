import { type Result, ok } from '../../../../../shared/primitives/result.ts';
import type {
  RemittanceDocumentRef,
  VanReturnMatchError,
  VanReturnMatchReader,
} from '../../../application/ports/van-return-match-reader.ts';

// Fake do lookup de casamento do retorno (#690).
//
// Guarda por `yourNumber`, que é a chave que o banco devolve — e o `Map` reproduz a UNIQUE da
// tabela: semear duas vezes a mesma referência substitui, nunca duplica. Isso importa porque
// referência repetida tornaria o casamento ambíguo (o mesmo pagamento apontando para dois títulos),
// e um fake que a permitisse deixaria passar teste que o banco reprovaria.
export const createInMemoryVanReturnMatchReader = (
  seed: readonly RemittanceDocumentRef[] = [],
): VanReturnMatchReader & Readonly<{ add: (ref: RemittanceDocumentRef) => void }> => {
  const refs = new Map<string, RemittanceDocumentRef>(seed.map((r) => [r.yourNumber, r]));

  return {
    findByYourNumbers: async (
      yourNumbers,
    ): Promise<Result<readonly RemittanceDocumentRef[], VanReturnMatchError>> => {
      const found = yourNumbers
        .map((key) => refs.get(key))
        .filter((r): r is RemittanceDocumentRef => r !== undefined);

      return Promise.resolve(ok(found));
    },

    add: (ref) => {
      refs.set(ref.yourNumber, ref);
    },
  };
};
