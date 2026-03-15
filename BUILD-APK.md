# Como gerar o APK do RDR Fan Site

O app Android é um "wrapper": abre o site no navegador embutido (WebView). O site precisa estar publicado (ex.: Vercel/Netlify).

## 📦 Tamanho do APK e Espaço Necessário

**Importante:** Para instalar, o Android precisa de **2-3x o tamanho do APK** em espaço livre.

| Tipo de APK | Tamanho | Espaço necessário |
|-------------|---------|-------------------|
| Debug (padrão) | ~25-35MB | ~75-100MB |
| Release (otimizado) | ~15-25MB | ~45-75MB |
| Release por arquitetura | ~10-15MB | ~30-45MB |

**Se você tem pouco espaço (ex.: 50MB):** Use o build **release por arquitetura** ou **GitHub Actions** (veja abaixo).

---

## ☁️ Opção 1: GitHub Actions (RECOMENDADO - sem usar seu disco)

O APK é gerado **na nuvem do GitHub**, sem ocupar espaço na sua máquina.

### Como usar:

1. **Faça push do código** para o GitHub:
   ```bash
   git add .
   git commit -m "Preparar build do APK"
   git push origin main
   ```

2. **O GitHub vai buildar automaticamente**:
   - Vá em `https://github.com/SEU-USUARIO/SEU-REPO/actions`
   - Clique no workflow "Build Android APK"
   - Aguarde concluir (~5-10 minutos)

3. **Baixe os APKs**:
   - Clique no workflow concluído
   - Em "Artifacts", baixe `apk-release` ou `apk-debug`
   - Extraia o arquivo ZIP

4. **APKs disponíveis**:
   - `app-arm64-v8a-release.apk` - dispositivos modernos (~10-15MB)
   - `app-armeabi-v7a-release.apk` - dispositivos antigos (~10-15MB)
   - `app-debug.apk` - versão de teste

### Rodar build manualmente:

No GitHub, vá em **Actions → Build Android APK → Run workflow**

---

## 💻 Opção 2: Gradle Local (requer JDK e espaço em disco)

### Requisitos mínimos

- **Node.js** (já usado no projeto)
- **JDK 17** ([download](https://www.oracle.com/java/technologies/downloads/))
- **~2GB livres** no disco (para cache do Gradle + build)

### 1. Instalar dependências e sincronizar

```bash
npm install
npm run cap:sync
```

### 2. Gerar APK Otimizado (menor tamanho)

```bash
cd android
./gradlew clean assembleRelease
```

Isso cria **dois APKs menores** (já configurado no projeto):
- `app-armeabi-v7a-release.apk` (~10-15MB) - celulares mais antigos
- `app-arm64-v8a-release.apk` (~10-15MB) - celulares modernos (maioria)

**Localização:** `android/app/build/outputs/apk/release/`

**Use o `arm64-v8a` para a maioria dos dispositivos modernos.**

---

## 📱 Publicar o APK para Download

### Opção A: Link externo (RECOMENDADO - sem ocupar espaço no repo)

1. **Suba o APK** para um serviço de hospedagem:
   - **Google Drive**: `https://drive.google.com/uc?export=download&id=SEU_ID`
   - **Supabase Storage**: crie bucket público `downloads`
   - **Dropbox**: use link direto
   - Outro host de arquivos

2. **Edite o `app-download-config.json`**:

```json
{
  "apkUrl": "https://seu-host.com/rdr-fan-site-app.apk"
}
```

3. **Faça deploy** do site (Vercel/Netlify)

Pronto! O link de download funcionará em `https://seu-site.com/app-download.html`

---

### Opção B: APK no repositório (Vercel/Netlify servem o arquivo)

1. Copie o APK gerado para a **raiz do projeto**
2. Renomeie para **`rdr-fan-site-app.apk`**
3. Commit e push:

```bash
git add rdr-fan-site-app.apk app-download-config.json
git commit -m "Adicionar APK para download"
git push origin main
```

4. Espere o deploy. O link `https://seu-site.vercel.app/rdr-fan-site-app.apk` funcionará.

---

## 🔧 Comandos úteis

| Ação | Comando |
|------|---------|
| Instalar deps | `npm install` |
| Sincronizar Android | `npm run cap:sync` |
| **GitHub Actions** | `git push` (build automático) |
| Limpar build | `cd android && ./gradlew clean` |
| Gerar APK release | `cd android && ./gradlew assembleRelease` |
| Gerar APK debug | `cd android && ./gradlew assembleDebug` |

---

## 📌 Resumo do fluxo completo (GitHub Actions)

```bash
# 1. Fazer alterações no código
# 2. Commit e push
git add .
git commit -m "Atualizações"
git push origin main

# 3. Aguardar build no GitHub Actions
# https://github.com/SEU-USUARIO/SEU-REPO/actions

# 4. Baixar os APKs dos artifacts

# 5. Subir APK para Google Drive / Supabase

# 6. Editar app-download-config.json com a URL do APK

# 7. Deploy do site
git add app-download-config.json
git commit -m "Atualizar link do APK"
git push
```

---

## ❓ Problemas comuns

### "Espaço insuficiente" na instalação

- O Android precisa de **2-3x o tamanho do APK** para instalar
- Use o APK **release por arquitetura** (arm64-v8a é o menor)
- Limpe cache de outros apps ou mova arquivos para SD/nuvem

### APK não baixa / dá 404

- Verifique se o arquivo existe no repositório (Opção B)
- Ou se a URL no `app-download-config.json` está correta (Opção A)

### Gradle não encontrado

- Instale o JDK 17
- O Gradle wrapper já está incluso na pasta `android/`
