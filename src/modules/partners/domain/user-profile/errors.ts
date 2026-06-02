// Erros do agregado `UserProfile` — string union kebab EN.

export type UserProfileError =
  | 'user-profile-name-required'
  | 'user-profile-telephone-required'
  | 'invalid-cpf';
