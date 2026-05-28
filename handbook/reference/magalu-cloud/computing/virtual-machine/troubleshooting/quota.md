# Erros de quota ou limite de recursos

## Descrição

"Erros de quota indicam que você atingiu algum limite de recursos configurado internamente pela Magalu Cloud." Esses limites são estabelecidos quando a conta é criada, e quando excedidos, a criação de máquinas virtuais é bloqueada com retorno de erro da API.

## Sintomas

Os principais indicadores desse problema incluem:

- Impossibilidade de criar instâncias
- Retorno de API com `error.slug` e `error.message` relacionados a limites de recursos (exemplos: `create_error_quota`, `create_error_quota_vcpu`, `create_error_quota_instance`)

## O que fazer

Para resolver essa situação, recomenda-se:

**Solicitar aumento de quota através do suporte técnico**, fornecendo as seguintes informações:

- Identificador do tenant
- Tipo de recurso necessário (vCPU, RAM, disco, instância, IP, etc.)
- Justificativa para o aumento
- O valor de `error.slug` recebido
- A mensagem de erro (`error.message`)
- Horário aproximado da ocorrência
