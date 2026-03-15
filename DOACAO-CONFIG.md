# 🎁 Configuração da Área de Doações

## Visão Geral

A área de doações permite que os fãs apoiem financeiramente o site. O sistema inclui:

- **Seleção de valores** pré-definidos (R$ 5, R$ 10, R$ 20, R$ 50, R$ 100) ou valor personalizado
- **Múltiplos métodos** de pagamento (PIX, PayPal, PicPay)
- **Mural de apoiadores** com rankings baseados no valor doado
- **Registro opcional** da doação para aparecer no mural

---

## 📋 Configuração Necessária

### 1. Banco de Dados (Supabase)

Execute o seguinte comando no **SQL Editor** do Supabase:

```sql
-- Cria a tabela de doações
CREATE TABLE IF NOT EXISTS public.donations (
  id BIGSERIAL PRIMARY KEY,
  donor_name TEXT NOT NULL,
  donor_email TEXT,
  amount DECIMAL(10,2) NOT NULL,
  payment_method TEXT NOT NULL,
  message TEXT,
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_donations_created ON public.donations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_donations_public ON public.donations(is_public) WHERE is_public = true;

-- Ativar RLS
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

-- Policy para service_role
CREATE POLICY "Service role full access donations"
ON public.donations FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
```

---

### 2. Configurar Suas Chaves de Pagamento

No arquivo `script.js`, procure por estas variáveis e substitua pelos seus dados reais:

```javascript
var PIX_KEY = 'seu-pix-aqui@exemplo.com';  // Sua chave PIX (CPF, e-mail, telefone)
var PAYPAL_LINK = 'https://paypal.me/seuusuario';  // Seu link PayPal
var PICPAY_LINK = 'https://pay.picpay.com/seuusuario';  // Seu link PicPay
```

**Onde encontrar:**

- **PIX:** Use qualquer chave cadastrada no seu banco
- **PayPal:** Acesse `paypal.me` e crie seu link personalizado
- **PicPay:** Acesse o app PicPay > Seu perfil > Link de pagamento

---

### 3. (Opcional) Arquivo de Configuração Separado

Se preferir não editar o `script.js`, crie um arquivo `donation-config.json`:

```json
{
  "pix_key": "seu-pix-aqui@exemplo.com",
  "paypal_link": "https://paypal.me/seuusuario",
  "picpay_link": "https://pay.picpay.com/seuusuario"
}
```

---

## 🎨 Funcionalidades

### Badges de Apoiador

Os doadores recebem badges baseados no valor:

| Valor | Badge | Classe CSS |
|-------|-------|------------|
| R$ 5 - R$ 19 | `Apoiador` | `supporter` |
| R$ 20 - R$ 49 | `Parceiro` | `hero` |
| R$ 50 - R$ 99 | `Herói` | `hero` |
| R$ 100+ | `Lendário` | `legendary` |

### Notificações

Ao registrar uma doação, o doador recebe:
- Uma notificação no sistema de notificações do site
- Um toast de confirmação
- Aparecimento automático no mural de apoiadores

---

## 🔒 Privacidade

- O campo `is_public` controla se a doação aparece no mural
- O e-mail do doador é armazenado mas **nunca exibido publicamente**
- Apenas `donor_name` e `amount` são mostrados no mural

---

## 📊 API Endpoints

### Registrar Doação
```
POST /api/donations
Content-Type: application/json

{
  "donor_name": "John Marston",
  "donor_email": "john@example.com",
  "amount": 50,
  "payment_method": "pix",
  "is_public": true
}
```

### Listar Doadores (público)
```
GET /api/donations?limit=20
```

### Total Arrecadado
```
GET /api/donations/total
```

---

## 🎯 Dicas de Implementação

1. **Valide os pagamentos:** O sistema registra a intenção de doação, mas você precisa confirmar o recebimento manualmente no seu banco/app

2. **Modere o mural:** Acesse o painel admin para remover doações inadequadas (futuramente)

3. **Transparência:** Considere adicionar uma seção mostrando como as doações são usadas (hospedagem, melhorias, etc.)

4. **Teste antes:** Faça doações de teste com valores baixos para verificar o fluxo completo

---

## 🐛 Solução de Problemas

### Doações não aparecem no mural
- Verifique se `is_public` está como `true`
- Confira se a API `/api/donations` está retornando dados
- Inspecione o console do navegador por erros

### Erro ao registrar doação
- Verifique se a tabela `donations` foi criada no Supabase
- Confirme se a policy de RLS está configurada
- Verifique os logs do servidor (Netlify/Vercel)

### Chave PIX não aparece
- Edite o `script.js` e adicione sua chave real
- Limpe o cache do navegador após alterar

---

## 📝 Exemplo de Uso

1. Usuário acessa `#doacoes`
2. Seleciona valor (ex: R$ 20)
3. Escolhe método (ex: PIX)
4. Clica em "Copiar Chave PIX" e faz o pagamento
5. Preenche nome e e-mail (opcional)
6. Clica em "Confirmar Doação"
7. Doação é registrada e aparece no mural

---

## 💡 Melhorias Futuras

- [ ] Integração automática com API do PIX
- [ ] Webhook do PayPal para confirmação automática
- [ ] Ranking mensal de doadores
- [ ] Metas de arrecadação
- [ ] Recompensas para doadores frequentes
- [ ] Exportar relatórios para contabilidade

---

**Dúvidas?** Consulte a documentação do Supabase ou entre em contato com o administrador do sistema.
