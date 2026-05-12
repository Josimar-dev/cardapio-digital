# Deploy na Hostinger (hPanel - Node.js)

## 1. Upload dos Arquivos

1. Faça upload do arquivo `cardapio-digital-deploy.zip` via **File Manager** do hPanel
2. Extraia o conteúdo na pasta do seu domínio (ex: `public_html/`)
3. Ou extraia localmente e envie via FTP

## 2. Configurar Node.js no hPanel

1. No **hPanel** → **Advanced** → **Node.js**
2. Clique em **Create** (ou **Create project**)
3. Configure:
   - **Project path**: `public_html` (ou a pasta onde você extraiu os arquivos)
   - **Node.js version**: Selecione `18.x` ou `20.x`
   - **Application mode**: `Production`
   - **Entry point**: `backend/server.js`
   - **Environment variables**: (deixe vazio)
4. Clique em **Create**

## 3. Finalizar

- A Hostinger vai rodar `npm install` automaticamente e iniciar o app
- O app estará disponível no seu domínio

## Acesso Inicial

- **Usuário admin**: `admin`
- **Senha admin**: `admin123`
- URL: `http://seudominio.com/admin.html`

## Observações

- O app cria o banco SQLite automaticamente em `backend/cardapio.db`
- Planilhas de cadastro ficam em `planilhas/cadastros.xlsx`
- Para alterar senha, use o link "Esqueceu a senha?" no admin
