# Reboot como tentativa de recuperação

Em alguns cenários, reiniciar a instância pode ajudar a recuperar o acesso ou normalizar o funcionamento após falhas operacionais. O reboot força a reinicialização do sistema operacional da VM e a reexecução de serviços essenciais, podendo resolver problemas temporários causados por falhas de inicialização, travamentos ou estados inconsistentes.

> O reboot não garante a resolução de todos os problemas. Em alguns casos, pode não surtir efeito.

## Quando tentar um reboot

O reboot pode ser uma primeira tentativa válida nos seguintes cenários:

*   Falhas após operações como _resize_, _attach/detach_ de volumes ou alterações de configuração.
*   Serviços essenciais do sistema operacional não iniciaram corretamente.
*   Inconsistências momentâneas após instabilidades de infraestrutura.

Nesses casos, o reboot pode permitir que o sistema operacional reinicie corretamente e normalize os serviços.

## Impacto do reboot

Ao reiniciar a instância:

*   A aplicação ficará indisponível durante o processo.
*   O tempo de indisponibilidade depende do sistema operacional e da carga da VM.

Planeje o reboot considerando o impacto no ambiente produtivo.

## Próximos passos se o reboot não funcionar

Se o problema persistir após o reboot, outras ações de troubleshooting ou a abertura de um chamado podem ser necessárias.
