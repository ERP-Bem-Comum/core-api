# AUTH-USER-VO-TELEPHONE — Value Object `Telephone`

**Size:** S · **Spec:** `specs/005-gestao-usuarios/` (Foundational, task T005/T009) · **Branch:** `005-gestao-usuarios`

## Escopo

Criar o Value Object `Telephone` em `src/modules/auth/domain/identity/telephone.ts`, seguindo o padrão de
`cpf.ts`/`email.ts` (branded + smart constructor `parse` → `Result`, module-as-namespace, ASCII puro, sem
`throw`/classe). Armazena **somente dígitos**; valida forma BR. Máscara é da apresentação (FR-008).

Fora de escopo: persistência, agregado, formatação para exibição.

## Forma BR aceita

- **10 dígitos**: DDD (2) + número fixo (8).
- **11 dígitos**: DDD (2) + celular (9), com o primeiro dígito do número = `9`.
- **DDD** válido: 11–99 (não começa com 0).

## Critérios de aceite (viram `it()` no W0)

- **CA1**: celular válido com máscara `"(15)99713-3502"` → `ok("15997133502")`.
- **CA2**: celular válido sem máscara (11 dígitos, 3º = `9`) → `ok`.
- **CA3**: fixo válido (10 dígitos) → `ok`.
- **CA4**: vazio / só espaços / sem dígitos → `err('telephone-empty')`.
- **CA5**: quantidade de dígitos ≠ 10 e ≠ 11 → `err('telephone-invalid')`.
- **CA6**: DDD inválido (começa com 0, ex.: `"0999999999"`) → `err('telephone-invalid')`.
- **CA7**: celular (11 dígitos) sem o `9` inicial do número → `err('telephone-invalid')`.
- **CA8**: `parse` nunca lança — sempre `Result`.

## Contrato de tipos

```ts
export type Telephone = Brand<string, 'Telephone'>;
export type TelephoneError = 'telephone-empty' | 'telephone-invalid';
export const parse = (raw: string): Result<Telephone, TelephoneError> => { ... };
```
