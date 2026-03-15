# 🤠 RDR Fan Site - Deploy na Vercel

## ✅ Configurações necessárias no Vercel Dashboard

### 1. Importe o repositório no Vercel
1. Acesse https://vercel.com
2. Clique em "Add New Project"
3. Importe seu repositório do GitHub

### 2. Adicione as Variáveis de Ambiente
No Vercel Dashboard, vá em **Settings > Environment Variables** e adicione:

```
SUPABASE_URL=https://sua-url-do-supabase.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua-chave-service-role-do-supabase
SUPABASE_ANON_KEY=sua-chave-anon-do-supabase
DEV_MASTER_KEY=sua-senha-mestra-aqui
GEN_API_KEY=sua-chave-do-google-gemini (opcional)
GEN_MODEL=gemini-1.5-flash (opcional)
```

### 3. Build Settings
- **Framework Preset**: Other
- **Build Command**: `npm install`
- **Output Directory**: (deixe em branco)
- **Install Command**: `npm install`

### 4. Deploy
Clique em "Deploy" e aguarde. O site estará online em alguns minutos!

---

## 📁 Estrutura do Projeto

```
rdr-fan-site-1/
├── api/
│   └── index.js          # Serverless functions (API)
├── index.html            # Página principal
├── admin.html            # Painel admin
├── script.js             # Frontend JS
├── style.css             # Estilos
├── vercel.json           # Configuração Vercel
└── package.json          # Dependências
```

---

## 🔄 Atualizar o Site

Sempre que você fizer push no GitHub:
```bash
git add .
git commit -m "sua mensagem"
git push
```

O Vercel fará deploy automático em segundos!

---

## 🛠️ Comandos Úteis

```bash
# Instalar dependências
npm install

# Rodar localmente
npm start

# Sync com Capacitor (Android)
npm run cap:sync

# Build APK
npm run android:build
```

---

## ⚠️ Problemas Comuns

### Erro 500 nas APIs
- Verifique se as variáveis de ambiente estão corretas no Vercel
- Confira se o Supabase está acessível

### Erro 404 nas páginas
- O `vercel.json` já está configurado para SPA
- Limpe o cache do navegador

### Upload de arquivos falhando
- Verifique se os buckets existem no Supabase Storage:
  - `mods`
  - `screenshots`
  - `covers`
  - `avatars`

---

## 📝 Notas

- O site usa **Supabase** como backend
- As funções serverless têm limite de **60 segundos** no Vercel
- Para uploads grandes, considere usar diretamente o Supabase Storage

**Dúvidas?** Consulte a docs: https://vercel.com/docs
