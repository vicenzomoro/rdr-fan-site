# 🏦 Guia de Configuração para Receber Doações

## ⚡ Configuração Rápida (5 minutos)

### Passo 1: Escolha SEU método de recebimento

Recomendamos começar com **PIX** (mais fácil e sem taxas):

---

## 📱 Método 1: PIX (RECOMENDADO)

### Como configurar:

1. **Abra o app do seu banco** (Nubank, Inter, Itaú, Bradesco, etc.)

2. **Vá em "Área PIX" ou "Chaves PIX"**

3. **Cadastre uma chave** (se não tiver):
   - CPF (mais comum)
   - E-mail
   - Telefone
   - Chave aleatória

4. **Copie sua chave PIX**

5. **No código do site:**
   - Abra `script.js`
   - Procure por `var PIX_KEY = 'seu-pix-aqui@exemplo.com';`
   - Substitua pela SUA chave:
   ```javascript
   var PIX_KEY = 'seu.cpf.000.000.000-00'; // ou seu e-mail, ou telefone
   ```

6. **Salve e faça deploy**

### Como funciona para o doador:
1. Clica em "PIX" na área de doações
2. Clica em "📋 Copiar Chave PIX"
3. Abre o banco dele
4. Cola a chave e faz o PIX
5. (Opcional) Registra no site para aparecer no mural

**✅ Vantagens:**
- Dinheiro na hora na sua conta
- Sem taxa (ou taxa mínima do seu banco)
- Fácil de usar

---

## 💳 Método 2: PayPal

### Como configurar:

1. **Crie conta no PayPal:**
   - Acesse [paypal.com.br](https://www.paypal.com.br)
   - Clique em "Abrir conta"
   - Escolha "Conta Pessoal" (grátis) ou "Conta Empresarial"

2. **Ative recebimento de pagamentos:**
   - Vá em "Configurações" > "Pagamentos"
   - Ative "Receber pagamentos de qualquer pessoa"

3. **Pegue seu link PayPal.me:**
   - Acesse [paypal.me](https://www.paypal.me)
   - Crie seu link personalizado: `paypal.me/seunome`

4. **OU crie botão de doação:**
   - Vá em [PayPal Buttons](https://www.paypal.com/br/buttons)
   - Escolha "Doação"
   - Configure valores (fixo ou aberto)
   - Copie o link gerado

5. **No código do site:**
   ```javascript
   var PAYPAL_LINK = 'https://paypal.me/seunome'; // ou link do botão
   ```

### Taxas do PayPal:
- Recebimento nacional: **3,99% + R$ 0,60**
- Cartão de crédito: **5,99% + R$ 0,60**

---

## 💚 Método 3: PicPay

### Como configurar:

1. **Baixe o app PicPay** (Android/iOS)

2. **Crie sua conta:**
   - Cadastre CPF, e-mail e senha
   - Valide seu CPF

3. **Ative "Peça com PicPay":**
   - No app, vá em "Perfil"
   - Clique em "Seu Link"
   - Ative "Receber pagamentos"

4. **Copie seu link:**
   - Aparecerá: `pay.picpay.com/seunome`

5. **No código do site:**
   ```javascript
   var PICPAY_LINK = 'https://pay.picpay.com/seunome';
   ```

### Taxas do PicPay:
- Recebimento com cartão: **3,99%**
- Recebimento com saldo: **Grátis**

---

## 🏦 Método 4: Mercado Pago (MAIS COMPLETO)

### Como configurar:

1. **Crie conta:**
   - Acesse [mercadopago.com.br](https://www.mercadopago.com.br)
   - Clique em "Crie sua conta"
   - Preencha CPF, e-mail e senha

2. **Valide seu cadastro:**
   - Envie foto do RG/CNH
   - Aguarde aprovação (1-2 dias úteis)

3. **Crie link de pagamento:**
   - Vá em "Link de pagamento" no menu
   - Clique em "Criar novo link"
   - Título: "Doação RDR Fan Site"
   - Valor: Deixe em branco (para doador escolher)
   - Clique em "Criar link"

4. **Copie o link gerado:**
   - Será algo como: `https://mpago.la/2xYzAbc`

5. **No código do site:**
   ```javascript
   var MERCADO_PAGO_LINK = 'https://mpago.la/2xYzAbc';
   ```

### Taxas do Mercado Pago:
- PIX: **Grátis**
- Saldo Mercado Pago: **Grátis**
- Cartão de crédito: **4,99% a 11,99%** (depende da parcela)
- Boleto: **R$ 2,00**

---

## 🔧 Configurando no Código

Abra o arquivo `script.js` e procure esta seção (linha ~450):

```javascript
// =====================================================
// ⚠️ CONFIGURE SUAS CHAVES DE PAGAMENTO AQUI ⚠️
// =====================================================

// CHAVE PIX (CPF, e-mail, telefone ou aleatória)
var PIX_KEY = 'seu.cpf.000.000.000-00'; // <-- COLOQUE SUA CHAVE

// LINKS DE PAGAMENTO (deixe vazio "" se não tiver)
var PAYPAL_LINK = 'https://paypal.me/seunome'; // ou '' se não tiver
var PICPAY_LINK = 'https://pay.picpay.com/seunome'; // ou '' se não tiver
var MERCADO_PAGO_LINK = 'https://mpago.la/2xYzAbc'; // ou '' se não tiver

// =====================================================
```

### Exemplo de configuração SOMENTE PIX:
```javascript
var PIX_KEY = 'joao.silva.000.000.000-00';
var PAYPAL_LINK = '';
var PICPAY_LINK = '';
var MERCADO_PAGO_LINK = '';
```

### Exemplo com MÚLTIPLOS métodos:
```javascript
var PIX_KEY = 'joao.silva.000.000.000-00';
var PAYPAL_LINK = 'https://paypal.me/joaosilva';
var PICPAY_LINK = 'https://pay.picpay.com/joaosilva';
var MERCADO_PAGO_LINK = 'https://mpago.la/2xYzAbc';
```

---

## 📊 Comparação de Taxas

| Método | Taxa PIX | Taxa Cartão | Tempo Recebimento |
|--------|----------|-------------|-------------------|
| **PIX Direto** | Grátis | N/A | Imediato |
| **Mercado Pago** | Grátis | 4,99% - 11,99% | Imediato (PIX) |
| **PicPay** | Grátis | 3,99% | Imediato |
| **PayPal** | N/A | 5,99% + R$ 0,60 | 1-3 dias |

---

## ✅ Checklist de Configuração

- [ ] Escolhi pelo menos 1 método de pagamento
- [ ] Criei conta no serviço escolhido
- [ ] Validei meu cadastro (se necessário)
- [ ] Copiei minha chave/link de pagamento
- [ ] Atualizei o `script.js` com meus dados
- [ ] Testei em ambiente de desenvolvimento
- [ ] Fiz deploy para produção
- [ ] Testei o fluxo completo (como doador)

---

## 🚀 Como Receber o Dinheiro

### Fluxo completo:

1. **Doador acessa o site** → `#doacoes`
2. **Escolhe valor** (ex: R$ 20)
3. **Escolhe método** (ex: PIX)
4. **Clica em "Copiar Chave PIX"**
5. **Abre o banco dele** e faz o PIX
6. **Dinheiro cai na SUA conta** na hora!
7. **(Opcional)** Doador preenche nome e clica "Confirmar Doação"
8. **Doador aparece no mural** de apoiadores

### Importante:
- O site **NÃO processa** pagamentos automaticamente
- O doador faz o pagamento **diretamente na sua conta**
- O registro no site é **separado** do pagamento real
- Você pode verificar no seu banco se o pagamento caiu

---

## 🔒 Segurança

- ✅ Sua chave PIX é **pública** por natureza (qualquer um pode enviar)
- ✅ Links do PayPal/Mercado Pago são **seguros**
- ✅ O site só mostra seu nome/link, **não acessa sua conta**
- ✅ Dados dos doadores ficam **salvos no banco** (Supabase)
- ⚠️ **Nunca** compartilhe senha do banco ou token de segurança

---

## 💡 Dicas

1. **Comece com PIX:** É o mais fácil e sem taxas
2. **Adicione Mercado Pago depois:** Para quem quer pagar com cartão
3. **Monitore doações:** Verifique seu banco regularmente
4. **Agradeça doadores:** Mande mensagem ou crie benefícios
5. **Seja transparente:** Mostre como usa o dinheiro

---

## ❓ Perguntas Frequentes

### "Preciso de CNPJ?"
Não! Para doações, pode usar CPF mesmo.

### "Vou pagar imposto?"
Depende do valor. Consulte um contador se receber valores altos.

### "Posso receber em dólar?"
Sim! PayPal e Mercado Pago aceitam pagamentos internacionais.

### "E se o doador não pagar?"
O registro no site é separado. Ele pode registrar sem pagar. Você vê no mural mas não recebe.

### "Como sei se alguém doou?"
Verifique seu banco/app ou ative notificações do PIX.

---

## 📞 Suporte

Dúvidas sobre configuração? Consulte:
- **PIX:** Seu banco
- **PayPal:** [Central de Ajuda PayPal](https://www.paypal.com/br/smarthelp/)
- **PicPay:** [Ajuda PicPay](https://ajuda.picpay.com/)
- **Mercado Pago:** [Central de Ajuda](https://www.mercadopago.com.br/ajuda)

---

**Pronto!** Agora é só configurar e começar a receber doações! 🎉
