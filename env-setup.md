# Configuração de Variáveis de Ambiente

## Instruções

Crie os seguintes ficheiros na raiz do projeto:

### `.env.development`
```
VITE_API_URL=/api
```

### `.env.production`
```
VITE_API_URL=/api
```

**Nota**: Usamos URL relativa (`/api`) em vez de absoluta para que funcione tanto com HTTP quanto HTTPS. O servidor Express serve tanto o frontend quanto o backend na mesma origem.

## Como Criar

Execute os seguintes comandos na raiz do projeto:

```bash
# Windows (PowerShell)
echo "VITE_API_URL=/api" > .env.development
echo "VITE_API_URL=/api" > .env.production

# Linux/Mac
echo "VITE_API_URL=/api" > .env.development
echo "VITE_API_URL=/api" > .env.production
```

Ou crie manualmente os ficheiros com o conteúdo acima.

