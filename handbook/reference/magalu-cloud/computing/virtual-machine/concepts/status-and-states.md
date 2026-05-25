# Status e States de uma instância

## Diferença entre Status e States

### Status de uma instância

Status refere-se à condição operacional atual da VM, representando a saúde, disponibilidade e outras métricas de desempenho que indicam se a VM está funcionando corretamente ou enfrentando problemas. O Status ajuda a determinar se a VM está pronta para uso, se requer atenção, ou se está passando por manutenção.

### States de uma instância

States representam o ciclo de vida operacional da VM. Isso indica o estado em que a VM se encontra dentro do seu ciclo de vida, desde a criação até a exclusão. O State reflete as ações que estão sendo executadas na VM, como inicialização, parada, suspensão, reinicialização ou encerramento.

## Lista de Status e States disponíveis

### Status

Os Status das instâncias ofertadas na Magalu Cloud são:

* **Criando (Provisioning/Creating):** A VM está sendo criada e os recursos necessários estão sendo alocados.

* **Ligando (Starting):** A VM está em processo para ligar.

* **Desligando (Stopping):** A VM está em processo de desligamento.

* **Suspendendo (Suspending):** O processo de suspensão foi iniciado, onde a VM é colocada em um estado de suspensão, preservando seu estado atual na memória, mas parando a execução.

* **Rebooting:** A VM está sendo reiniciada, o que implica em uma parada temporária e uma nova inicialização.

* **Redimensionando (Resizing/Retyping):** O processo de alteração do tipo de instância que fará com que a instância tenha tamanho diferente está em andamento.

* **Pendente (Pending):** A VM está sendo iniciada ou uma ação está sendo processada.

* **Excluindo (Deleting):** A VM está sendo excluída.

### States

Os States descrevem o ciclo de vida da VM, que inclui:

* **Ligado (Running):** A VM foi provisionada e está ativa, pronta para uso.

* **Desligado (Stopped):** A VM está parada, seja por uma ação do usuário ou devido a um evento do sistema.

* **Suspended (Suspenso):** A VM foi suspensa temporariamente, mantendo seu estado em memória, mas não executando nenhuma operação.

* **Error (Erro):** A VM encontrou um problema e requer intervenção.
