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

Na pasta **raiz do projeto** (junto de `index.html`), coloque o APK com o nome **`rdr-fan-site-app.apk`**. O site já tem uma seção **“Instale o aplicativo”** (aba **App** no menu) que aponta para esse arquivo.

Se usar outro nome ou outro endereço, edite no `index.html` o link da seção `#app`:

```html
<a href="rdr-fan-site-app.apk" download class="btn btn-primary" ...>
```

Troque `rdr-fan-site-app.apk` pelo nome do seu arquivo ou por uma URL (ex.: link do Google Drive).
