# Como gerar o APK do RDR Fan Site

O app Android é um “wrapper”: abre o site no navegador embutido (WebView). O site precisa estar publicado (ex.: Netlify).

## 1. Definir a URL do site

Edite **`www/index.html`** e troque a URL pelo endereço do seu site:

```javascript
var SITE_URL = 'https://SEU-SITE.netlify.app';  // ex: https://rdr-fan-site.netlify.app
```

Salve o arquivo.

## 2. Instalar dependências e adicionar Android

No terminal, na pasta do projeto:

```bash
npm install
npm run cap:add
```

(Se `cap:add` der erro, rode: `npx cap add android`.)

## 3. Sincronizar e abrir no Android Studio

```bash
npm run cap:sync
npm run cap:open
```

Isso abre o projeto Android no **Android Studio**.

## 4. Gerar o APK no Android Studio

1. No Android Studio: **Build → Build Bundle(s) / APK(s) → Build APK(s)**.
2. Quando terminar, clique em **Locate** no aviso que aparecer.
3. O APK estará em algo como:  
   `android/app/build/outputs/apk/debug/app-debug.apk`

Para um APK **release** (assinado, para publicar):

- **Build → Generate Signed Bundle / APK** → escolha **APK** e crie/use um keystore.
- Siga o assistente; o APK release sairá em `android/app/build/outputs/apk/release/`.

## Requisitos

- **Node.js** (já usado no projeto)
- **Android Studio** ([download](https://developer.android.com/studio))
- **JDK 17** (geralmente já vem com o Android Studio)

## Resumo dos comandos

| Ação              | Comando            |
|-------------------|--------------------|
| Instalar deps     | `npm install`      |
| Adicionar Android | `npm run cap:add`  |
| Sincronizar      | `npm run cap:sync` |
| Abrir no Android Studio | `npm run cap:open` |
| Tudo de uma vez   | `npm run android:build` |

Depois de alterar **`www/index.html`** (por exemplo a URL), rode de novo **`npm run cap:sync`** antes de gerar o APK.

---

## Colocar o APK no site para download

O link do site (ex.: `https://rdr-fan-site-ibuu.vercel.app/rdr-fan-site-app.apk`) só funciona se o arquivo **existir no repositório**. Se der **404**, é porque o APK não foi commitado.

### Opção A: APK no repositório (Vercel/Netlify servem o arquivo)

1. Depois de gerar o APK no Android Studio, copie o arquivo para a **raiz do projeto** (mesma pasta do `index.html`).
2. Renomeie para **`rdr-fan-site-app.apk`** (ou use esse nome no `index.html`).
3. Adicione e faça commit + push:
   ```bash
   git add rdr-fan-site-app.apk
   git commit -m "Adicionar APK para download"
   git push origin main
   ```
4. Espere o Vercel/Netlify fazer o deploy. O link `https://seu-site.vercel.app/rdr-fan-site-app.apk` passará a funcionar.

### Opção B: APK em link externo (Google Drive, etc.)

Se não quiser colocar o APK no Git (arquivo grande ou preferir hospedar fora):

1. Envie o APK para Google Drive, Dropbox ou outro host.
2. Obtenha o **link direto de download** (no Drive: “Obter link” → “Qualquer pessoa com o link” → em “Copiar link”, use o link de download direto se disponível; ou use serviços que geram link direto).
3. No `index.html`, na seção **#app**, troque o `href` do botão para essa URL, por exemplo:
   ```html
   <a href="https://drive.google.com/uc?export=download&id=SEU_ID" download class="btn btn-primary" ...>
   ```
   (Substitua `SEU_ID` pelo ID do arquivo no Google Drive.)
