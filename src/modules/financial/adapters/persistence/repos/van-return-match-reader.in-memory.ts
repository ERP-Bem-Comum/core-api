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
      // Chave repetida na PERGUNTA devolve uma resposta só. `IN ('A','A')` é teste de pertinência,
      // não junção: com a UNIQUE em `your_number`, o MySQL entrega uma linha por valor. Um fake que
      // devolvesse duas deixaria verde uma contagem que produção contradiz — e a divergência
      // apareceria como "o relatório diz 3 vínculos e o banco tem 2", longe daqui. Por isso a
      // pergunta vira um `Set`: pertinência é literalmente o que ele é.
      //
      // ⚠️ O laço percorre o ACERVO, não a pergunta — e isso é deliberado. A resposta sai na ordem
      // em que as referências foram semeadas, nunca na ordem em que foram pedidas, porque a ordem
      // NÃO é contrato do port e o adapter Drizzle não tem como honrá-la (sem `ORDER BY`, fatiando
      // em blocos de 500). Um fake que devolvesse na ordem pedida deixaria verde qualquer teste que
      // passasse a depender dela, até o dia em que o MySQL devolvesse outra.
      const wanted = new Set(yourNumbers);

      return Promise.resolve(ok([...refs.values()].filter((r) => wanted.has(r.yourNumber))));
    },

    add: (ref) => {
      refs.set(ref.yourNumber, ref);
    },
  };
};
