// Modo de operação do RBAC (ADR-0052). O TIPO vive no domínio porque atravessa borda E application
// (os use cases de auto-gestão de RBAC fazem authorize embutido — DD-USER-07). O parsing de env
// (`resolveRbacMode`) fica no adapter da borda.
export type RbacMode = 'enforced' | 'bypass';
