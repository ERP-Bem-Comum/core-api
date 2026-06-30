# Erros de capacity

## Descrição

"Esse tipo de erro indica que, no momento, não foi possível atender à solicitação devido à indisponibilidade temporária de recursos" na região escolhida.

O problema pode ocorrer durante criação ou redimensionamento de instâncias, sendo particularmente comum em máquinas que requerem recursos específicos como instâncias DP ou GPU.

## Sintomas

*   Falha ao criar e/ou redimensionar instâncias
*   A API retorna `error.slug` e `error.message` relacionados a capacity (exemplos: `creating_error_capacity`, `retyping_error_capacity`)

## O que fazer

*   **Tente novamente mais tarde** — A capacidade pode ser liberada automaticamente quando outras VMs forem encerradas.

*   **Experimente outro tipo de máquina** — Por exemplo, uma VM sem GPU ou DP.

*   **Escolha outra zona de disponibilidade (AZ)** — Se o produto estiver disponível em múltiplas AZs.

*   **Entre em contato com o suporte** — Informando:
    *   ID da VM
    *   `error.slug`
    *   `error.message`
    *   Horário aproximado
