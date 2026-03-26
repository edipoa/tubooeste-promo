# Tubo Oeste — Sistema de Promoções
## Instalação no Netbook (Alpine Linux)

### 1. Instalar Node.js

```sh
apk add nodejs npm
```

### 2. Copiar o projeto para o netbook

Transfira a pasta `tubooeste-promo` para o netbook (pendrive, scp, etc.).

### 3. Instalar dependências

```sh
cd tubooeste-promo
npm install
```

> O pacote `sqlite3` pode precisar de ferramentas de compilação no Alpine:
> ```sh
> apk add python3 make g++
> npm install
> ```

### 4. Iniciar o sistema

```sh
npm start
```

O sistema estará disponível em:
- **Admin (celular/computador):** `http://IP_DO_NETBOOK:3000/admin`
- **Display (TV via HDMI):** `http://localhost:3000/display`

Para descobrir o IP do netbook na rede:
```sh
ip addr show | grep inet
```

### 5. Abrir a tela da TV em fullscreen

1. Abra o navegador do netbook
2. Acesse `http://localhost:3000/display`
3. Pressione **F11** para tela cheia

### 6. Iniciar automaticamente com o sistema (opcional)

Crie o arquivo `/etc/local.d/tubooeste-promo.start`:

```sh
#!/bin/sh
cd /caminho/para/tubooeste-promo
node server.js &
```

```sh
chmod +x /etc/local.d/tubooeste-promo.start
rc-update add local default
```

---

## Uso

### Cadastrar promoção
1. Acesse `/admin` no celular ou computador
2. Toque em **+ Nova Promoção**
3. Preencha título, preço (opcional) e data de validade
4. Adicione uma imagem (opcional)
5. Salvar

**Dica:** Para criar um **banner de texto**, deixe a imagem e os preços em branco.

### Reativar promoção expirada
1. Na seção "Expiradas", toque no ícone de reativar (↺)
2. Escolha a nova data de validade
3. Confirmar

### A TV atualiza automaticamente
O display verifica novas promoções a cada 30 segundos.
