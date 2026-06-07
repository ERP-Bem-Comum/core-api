# AUTH-USER-VO-CPF — Value Object `Cpf`

**Size:** S · **Spec:** `specs/005-gestao-usuarios/` (Foundational, task T004/T008) · **Branch:** `005-gestao-usuarios`

## Escopo

Criar o Value Object `Cpf` no módulo `auth` (`src/modules/auth/domain/identity/cpf.ts`), seguindo o
padrão de `email.ts` (branded type + smart constructor `parse` → `Result`, module-as-namespace, ASCII puro,
sem `throw`/classe). Armazena **somente dígitos** (11), validando dígitos verificadores. Formatação/máscara
é responsabilidade da apresentação (FR-008 da spec).

Fora de escopo: persistência, agregado `User`, formatação para exibição.

## Critérios de aceite (viram `it()` no W0)

- **CA1**: CPF válido — com ou sem máscara — retorna `ok` normalizado para 11 dígitos (ex.: `"529.982.247-25"` → `"52998224725"`).
- **CA2**: vazio / só espaços / sem dígitos → `err('cpf-empty')`.
- **CA3**: quantidade de dígitos ≠ 11 (após normalizar) → `err('cpf-invalid-length')`.
- **CA4**: dígitos verificadores inválidos → `err('cpf-invalid-checksum')`.
- **CA5**: sequência de dígitos repetidos (ex.: `"11111111111"`) → `err('cpf-invalid-checksum')`.
- **CA6**: `parse` nunca lança — sempre retorna `Result` (sem `throw`, sem classe, sem `any`).

## Contrato de tipos

```ts
export type Cpf = Brand<string, 'Cpf'>;
export type CpfError = 'cpf-empty' | 'cpf-invalid-length' | 'cpf-invalid-checksum';
export const parse = (raw: string): Result<Cpf, CpfError> => { ... };
```

## Notas

- Erros em EN kebab-case (regra de idioma). Comentários ASCII (Node 24 strip-types).
- Módulo isolado (ADR-0006): não importar utilidades cross-módulo; lógica de CPF própria.
