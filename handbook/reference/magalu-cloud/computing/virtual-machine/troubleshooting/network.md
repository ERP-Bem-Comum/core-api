# Erros de network

## Descrição

"Erros de network ocorrem quando há falha na criação dos componentes de rede necessários para provisionar a VM, como portas, interfaces ou endereçamento IP."

Esses problemas surgem antes da instância ser completamente criada, impedindo que a VM seja provisionada ou inicie normalmente.

## Sintomas

- Falha ao criar a porta (port) de rede da VM
- Falha ao anexar interface de rede

## O que fazer

Se você estiver usando rede customizada, verifique:

- Se a VPC selecionada existe e está ativa
- Se a subnet possui espaço de IP disponível
- Se a subnet está na mesma região/zone escolhida
- Se tudo estiver correto, abra um ticket com o suporte incluindo:
  - ID da VM
  - `error.slug`
  - `error.message`
  - Horário aproximado do erro
