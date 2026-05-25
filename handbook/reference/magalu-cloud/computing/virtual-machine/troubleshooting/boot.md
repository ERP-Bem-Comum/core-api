# Problemas de inicialização / boot

## Descrição

Problemas que ocorrem **após a VM ser criada**, durante o processo de inicialização do sistema operacional.

## Sintomas

*   VM em `running`, mas inacessível
*   Falhas em cloud-init
*   Falhas de montagem de disco
*   OOM (Out of Memory)
*   Problemas de rede durante o boot

## O que fazer:

*   **Reinicializar a VM (reboot) - somente quando estiver em `running`:** Se a VM já está em `running` mas apresenta falhas de inicialização, o reboot pode ajudar a recuperar o processo de boot pois:
    *   Permite que o cloud-init seja executado novamente
    *   Pode corrigir inconsistências momentâneas durante o boot
    *   Pode resolver falhas de montagem, serviços travados ou OOM leve

    > O reboot só deve ser realizado quando a instância estiver em `running`. Em estados de erro de criação, a VM não foi provisionada e o reboot não é uma operação válida.

*   **Consulte os logs de inicialização (init-logs)** para identificar falhas do cloud-init, erros de montagem de disco, processos que não iniciaram, dentre outros.

*   Se o problema persistir, **acione o suporte**, incluindo:
    *   ID da VM
    *   Horário aproximado do incidente
    *   `error.slug` e `error.message`, caso apareçam na resposta da API/CLI
    *   Descrição dos sintomas observados
    *   Quais ações já foram tentadas (ex.: reboot)
