# Guia de Boas Práticas: Importação de Imagens Customizadas

## Introdução

Uma imagem de cloud funciona como "um modelo de sistema operacional usado para criar múltiplas instâncias de máquina virtual." Diferentemente de instalações tradicionais, ela deve ser generalizada e se adaptar automaticamente na primeira inicialização através de ferramentas como cloud-init.

Este guia apresenta as recomendações da Magalu Cloud para manter imagens "seguras, enxutas e reutilizáveis", evitando problemas de desempenho, segurança e manutenção.

## Boas Práticas de Criação de Imagens

**Mantenha a Imagem Enxuta**
- Inclua apenas o sistema operacional e pacotes essenciais
- Evite softwares desnecessários como middlewares ou bancos de dados locais
- Armazene dados persistentes em volumes adicionais
- Limpe arquivos temporários, caches e logs antes de finalizar

**Segurança e Conformidade**
- Nunca inclua credenciais, chaves privadas ou certificados na imagem
- Avalie desativar firewalls e antivírus que possam bloquear drivers de virtualização

**Automatize a Criação**
- Utilize ferramentas como Packer para padronizar a geração
- Defina templates de configuração versionados em repositórios Git
- Use pipelines CI/CD para gerar novas imagens com atualizações de segurança

## Boas Práticas de Importação de Imagens

**Generalização**
- Execute `virt-sysprep` para remover dados herdados do provedor anterior

**Organização e Nomeação**
- Use nomes descritivos e únicos (ex.: `ubuntu-22.04-lts-v1`)
- Siga as regras de nomenclatura da documentação principal

**Compatibilidade com Flavors**
- Certifique-se de que requisitos mínimos (vCPU, RAM e disco) sejam compatíveis com tipos de máquina disponíveis
- Evite configurar recursos acima do necessário

## Conclusão

Seguir estas práticas garante que imagens customizadas sejam mais seguras, leves e compatíveis com a Magalu Cloud.
