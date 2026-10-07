/**
 * Port `UserNameReader` (#1029) — nome do usuário autenticado que executou uma alteração, para o
 * histórico do colaborador gravar o autor (id + nome no momento da ação).
 *
 * Degrada para `null` (usuário inexistente, nome vazio, auth indisponível): a falta do NOME não
 * derruba a edição, porque o `userId` já identifica o autor de forma autoritativa.
 */

export type UserNameReader = Readonly<{
  getUserName: (userId: string) => Promise<string | null>;
}>;
