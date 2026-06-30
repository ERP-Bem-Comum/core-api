# Versionamento

## O que é o Versionamento?

O versionamento é uma funcionalidade oferecida por sistemas de armazenamento de objetos, como o Magalu Cloud, que permite manter múltiplas versões de um mesmo objeto dentro de um bucket. Isso significa que, ao habilitar o versionamento, você pode recuperar, restaurar ou excluir versões anteriores de arquivos, garantindo uma trilha de auditoria completa e prevenindo perdas acidentais de dados.

No Magalu Cloud, o versionamento é inspirado no funcionamento do Amazon S3, oferecendo um mecanismo robusto de controle sobre a evolução de objetos dentro de um bucket.

## Objetivo Principal

O principal objetivo do versionamento é fornecer uma camada extra de proteção e controle para os dados armazenados, permitindo:

- **Recuperação de dados perdidos ou sobrescritos**: caso um arquivo seja acidentalmente sobrescrito ou deletado, versões anteriores ainda estarão disponíveis para restauração.

- **Auditoria e histórico**: facilita a auditoria ao manter um registro completo de todas as alterações realizadas nos objetos.

## Funcionamento do Versionamento

Ao habilitar o versionamento em um bucket, o comportamento das operações de gravação e exclusão de objetos muda significativamente:

- **Gravação de um novo objeto**: quando um objeto é carregado com o mesmo nome de um já existente, em vez de substituir o arquivo anterior, uma nova versão é criada. O objeto antigo é mantido no bucket como uma versão anterior.

- **Exclusão de um objeto**: ao excluir um objeto com versionamento habilitado, o objeto não é removido permanentemente, mas sim uma "marcação de exclusão" (delete marker) é criada. Versões anteriores do objeto ainda podem ser acessadas até que sejam permanentemente excluídas.

Essas características tornam o versionamento ideal para cenários onde a integridade e recuperação dos dados são cruciais.

## Cenários de Uso

- **Recuperação de versões anteriores**: ideal para ambientes onde alterações frequentes nos dados são realizadas, permitindo o retorno a versões anteriores caso erros ocorram.

- **Proteção contra exclusão acidental**: mesmo se um objeto for deletado, ele poderá ser restaurado a partir de suas versões anteriores.

## Estrutura do Versionamento

Ao habilitar o versionamento, cada novo carregamento ou alteração em um objeto cria uma nova versão identificada por um VersionId. A estrutura de um bucket com versionamento ativo contém os seguintes componentes:

- **VersionId**: cada versão de um objeto recebe um ID único.

- **Delete Marker**: uma flag que marca quando um objeto foi excluído, mas mantém as versões anteriores acessíveis.

- **Object Name**: o nome comum que identifica o objeto, independentemente da versão.

## Operações de Versionamento

1. **Carregar um novo objeto**: Quando o versionamento está habilitado, um objeto carregado com o mesmo nome de um já existente resulta na criação de uma nova versão, enquanto a versão anterior continua disponível.

2. **Recuperar uma versão específica**: Para recuperar uma versão específica de um objeto, basta fornecer o VersionId desejado durante a solicitação.

3. **Excluir uma versão específica**: Você pode excluir uma versão individualmente ao especificar o VersionId durante a solicitação de exclusão. Isso oferece um controle granular sobre o que pode ser removido ou mantido.

4. **Desabilitar o versionamento**: Desabilitar o versionamento não apaga as versões anteriores. Ele simplesmente impede que novas versões sejam criadas a partir desse ponto.

## Gerenciamento de Versionamento no Magalu Cloud

O versionamento no Magalu Cloud pode ser habilitado ou desabilitado a qualquer momento via Magalu Cloud CLI, permitindo a automação de processos e operações programáticas.

Confira na documentação como habilitar o versionamento e gerenciar versões de objetos usando a CLI, seguindo as melhores práticas de proteção e governança de dados.
