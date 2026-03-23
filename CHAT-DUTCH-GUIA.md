# 🤠 Chat com Dutch Van Der Linde - Guia de Configuração

## Visão Geral

O site agora conta com um **chat com IA** que simula o **Dutch Van Der Linde**, o carismático líder da gangue Van Der Linde de Red Dead Redemption 2.

O Dutch está pronto para responder dúvidas sobre o jogo, dar dicas de mods, e conversar com os fãs do site - tudo mantendo a personalidade icônica do personagem.

---

## 📋 Pré-requisitos

Para que o chat funcione, você precisa de uma **chave de API do Google Gemini**.

### Como Obter Sua Chave de API

1. Acesse [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Faça login com sua conta Google
3. Clique em **"Get API Key"** ou **"Create API Key"**
4. Copie a chave gerada

> **Nota:** O Google Gemini oferece um plano gratuito com limites generosos para testes e uso pessoal.

---

## ⚙️ Configuração

### 1. Configure o Arquivo `.env`

Crie ou edite o arquivo `.env` na raiz do projeto:

```bash
# Inteligência Artificial (Opcional - Para o Chat do Dutch)
GEN_API_KEY=sua-chave-do-google-gemini-aqui
GEN_MODEL=gemini-1.5-flash
```

Substitua `sua-chave-do-google-gemini-aqui` pela chave que você obteve.

### 2. Reinicie o Servidor

Após configurar a variável de ambiente, reinicie o servidor:

```bash
npm start
```

Ou se estiver usando nodemon:

```bash
nodemon server.js
```

---

## 🎭 Personalidade do Dutch

O Dutch foi programado com as seguintes características:

- **Eloquente e persuasivo** - Discurso quase revolucionário
- **Fala sobre liberdade e lealdade** - Sempre menciona o bando
- **Expressões características** - "Parceiro", "meu amigo", "tenha fé", "eu tenho um plano"
- **Melancólico** - Reflete sobre as mudanças no Oeste
- **Protetor** - Com os membros do bando
- **Filosófico** - Cita frases sobre redenção, honra e sobrevivência

### Exemplos de Frases do Dutch:

> "Tenha fé, parceiro. Eu tenho um plano."

> "O mundo pode mudar, mas nós não mudamos."

> "A lealdade é tudo, meu amigo. Sem ela, somos apenas animais."

> "Redenção... todos buscamos, mas poucos encontram."

---

## 💬 Como Usar

1. **Abra o site** no navegador
2. **Clique no botão** "Fale com Dutch" no canto inferior direito
3. **Digite sua dúvida** sobre o jogo, mods, dicas, etc.
4. **Aguarde a resposta** do Dutch (geralmente 2-5 segundos)

### Exemplos de Perguntas:

- "Como consigo o melhor cavalo do jogo?"
- "Onde encontro a arma lendária X?"
- "Qual mod de arma você recomenda?"
- "Como funciona o sistema de honra?"
- "Quais são as melhores missões secundárias?"

---

## 🎨 Personalização

### Mudar o Modelo de IA

No arquivo `.env`, você pode alterar o modelo:

```bash
GEN_MODEL=gemini-1.5-pro  # Modelo mais poderoso (pago)
GEN_MODEL=gemini-1.5-flash  # Modelo rápido e econômico (grátis)
```

### Mudar a Personalidade

Edite a constante `DUTCH_SYSTEM` no arquivo `server.js` para ajustar a personalidade do Dutch.

---

## 🛠️ Solução de Problemas

### "Chat temporariamente indisponível"

**Causa:** A chave de API não está configurada.

**Solução:** Verifique se o arquivo `.env` está configurado corretamente.

### "O telégrafo falhou"

**Causa:** Erro de conexão ou limite de API excedido.

**Solução:** 
- Verifique sua conexão com a internet
- Aguarde alguns minutos se atingiu o limite de requisições
- Verifique se a chave de API é válida

### "Muitas mensagens. Espere um pouco, parceiro."

**Causa:** Limite de requisições da API atingido.

**Solução:** Aguarde alguns minutos antes de enviar nova mensagem.

---

## 📊 Limites da API

O plano gratuito do Google Gemini permite:

- **15 requisições por minuto** (RPM)
- **1 milhão de tokens por minuto** (TPM)
- **1500 requisições por dia** (RPD)

Para a maioria dos usuários, esses limites são suficientes.

---

## 🔒 Segurança

- A chave de API fica **apenas no servidor** (nunca no frontend)
- As mensagens dos usuários são sanitizadas antes de enviar para a API
- O chat tem limite de 500 caracteres por mensagem

---

## 📝 Exemplo de Uso

```
Usuário: "Como consigo dinheiro rápido no RDR2?"

Dutch: "Parceiro, a vida no Oeste não é fácil. Mas tenho algumas ideias... 
Caçe animais e venda as peles em Valentine ou Saint Denis. Assalte trens com 
o bando. E lembre-se: às vezes, os melhores tesouros estão nas missões secundárias. 
Tenha fé no plano!"
```

---

## 🎯 Dicas para Melhor Experiência

1. **Seja específico** nas perguntas sobre o jogo
2. **Use o chat para dúvidas** sobre mecânicas, mods, dicas
3. **Aproveite a imersão** - o Dutch responde no personagem!
4. **Não abuse** - respeite os limites da API

---

## 📞 Suporte

Se tiver problemas ou sugestões para melhorar o chat:

1. Verifique os logs do servidor
2. Teste a chave de API diretamente no [Google AI Studio](https://aistudio.google.com/)
3. Consulte a documentação do [Google Gemini](https://ai.google.dev/)

---

**"Tenha fé, parceiro. Juntos, vamos fazer deste site o melhor acampamento do Oeste!"** 🤠

— Dutch Van Der Linde
