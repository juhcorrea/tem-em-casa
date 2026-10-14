# Tem em Casa?

Lista de compras e despensa doméstica, com Catatau, autenticação Firebase, comandos de voz e visual adaptado a celular e computador.

Site existente: https://tememcasa-listas.netlify.app/

## Originais preservados

Este repositório privado guarda cópias exatas dos arquivos de desenvolvimento e da entrega local de 14/10/2026. A conferência de integridade está em source-manifest.json. Os arquivos originais do computador não foram alterados.

- work/: fontes HTML, CSS, JavaScript, logo, imagens, scripts de montagem e verificações.
- outputs/: HTML final e arquivos de entrega, incluindo ícones para a Tela de Início.
- work/firestore.rules: regras de acesso do Firestore.

## Usar e desenvolver

Requer Node.js. A montagem principal usa apenas módulos nativos:

```sh
node work/build.cjs
node work/preview-server.cjs
```

Abra http://127.0.0.1:4176/?demo=1 para explorar dados de exemplo sem acessar a conta real. Para gerar novos ícones após alterar o logo, instale sharp no ambiente de desenvolvimento e execute node work/generate-icons.cjs antes de montar novamente. Os ícones atuais já estão incluídos.

Verificações existentes: node work/engine-test.cjs, node work/auth-ui-test.cjs, node work/voice-test.cjs. O diretório work/auth-rules-qa contém os testes anteriores para o emulador Firebase, com dependências e caminhos de ambiente documentados no próprio script.

## Publicação

Guardar o código no GitHub não altera o site já publicado e não configura deploy automático. Para uma publicação futura, node work/package-netlify.cjs prepara somente os oito arquivos públicos necessários. Não publique a pasta inteira do repositório.

A configuração Firebase Web presente no aplicativo é a configuração cliente já utilizada pelo site. O repositório não contém senhas, tokens administrativos, contas de serviço, exportações de contas ou dados do banco. O acesso aos dados continua dependendo da autenticação e das regras do Firebase.
