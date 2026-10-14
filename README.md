# Tem em Casa?

Lista de compras e despensa doméstica, com Catatau, autenticação Firebase, comandos de voz e visual adaptado a celular e computador.

Site existente: https://tememcasa-listas.netlify.app/

## Originais preservados

Este repositório público guarda os arquivos originais e a configuração de publicação. A cópia inicial preservou os bytes dos arquivos de desenvolvimento e da entrega local de 14/10/2026. A conferência de integridade está em source-manifest.json. Os arquivos originais do computador não foram alterados.

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

O arquivo `netlify.toml` prepara a integração com o projeto existente `tememcasa-listas`. A conexão do repositório e a ativação da publicação automática são configuradas no painel do Netlify, usando a branch `main`.

- Edite os fontes em `work/` (template, estilos e módulos JavaScript). O HTML em `outputs/` é gerado pela montagem.
- Comando de build: `node work/build.cjs && node work/package-netlify.cjs`.
- Pasta publicada: `work/netlify-deploy`, com somente os oito arquivos públicos necessários, incluindo os ícones.
- Node.js 22; a montagem não instala dependências.

Depois de conectar o GitHub e ativar a publicação no Netlify, cada alteração enviada para `main` dispara a montagem e atualização do site. A publicação exige créditos disponíveis na conta. Uma publicação bloqueada mantém a versão anterior no ar. Não publique a pasta inteira do repositório.

A configuração Firebase Web presente no aplicativo é a configuração cliente já utilizada pelo site. O repositório não contém senhas, tokens administrativos, contas de serviço, exportações de contas ou dados do banco. O acesso aos dados continua dependendo da autenticação e das regras do Firebase.
