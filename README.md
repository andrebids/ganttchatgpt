# SVAR React Gantt Demo

Um projeto de demonstração do componente SVAR React Gantt com tema escuro implementado.

## 🚀 Funcionalidades

- **SVAR React Gantt v2.3.2** - Componente Gantt moderno e responsivo
- **Tema Escuro WillowDark** - Interface escura oficial da SVAR UI
- **Frontend React** - Construído com Vite para desenvolvimento rápido
- **Backend Express** - API REST para gestão de dados do Gantt
- **CORS Configurado** - Comunicação entre frontend e backend
- **Dados de Exemplo** - Tasks, links e scales pré-configurados

## 📁 Estrutura do Projeto

```
gantt-demo/
├── src/
│   ├── components/
│   │   └── BasicInit.jsx      # Componente principal do Gantt
│   ├── data/
│   │   └── tasks.json         # Dados de exemplo
│   ├── App.jsx                # App principal com tema escuro
│   └── main.jsx               # Entry point com CSS import
├── server/
│   ├── data/
│   │   └── tasks.json         # Dados do servidor
│   └── server.js              # Servidor Express
├── package.json               # Dependências e scripts
└── start-gantt-demo.bat       # Script de inicialização
```

## 🛠️ Instalação e Execução

### Pré-requisitos
- Node.js (versão 18 ou superior)
- npm

### Instalação
```bash
npm install
```

### Execução
```bash
# Terminal 1 - Servidor Backend
npm run server

# Terminal 2 - Servidor Frontend
npm run dev
```

### Acesso
- **Frontend**: http://localhost:5174
- **Backend API**: http://localhost:3025/api/data

## 🎨 Tema Escuro

O projeto utiliza o tema oficial **WillowDark** da SVAR UI:

```jsx
// CSS Global importado
import "@svar-ui/react-gantt/all.css";

// Tema aplicado no componente
<div className="wx-willow-dark-theme">
  <Gantt {...props} />
</div>
```

### Características do Tema:
- Fundo escuro elegante
- Barras azuis e verdes com texto claro
- Grid e timescale em cinzento escuro
- Tooltips e seleção no tema dark

## 📊 Dados de Exemplo

O projeto inclui dados de exemplo com:
- **Tasks**: Tarefas com datas, duração e progresso
- **Links**: Dependências entre tarefas
- **Scales**: Configuração de timeline (mensal)

## 🔧 Tecnologias Utilizadas

- **React 19.2.0** - Framework frontend
- **Vite 7.1.12** - Build tool e dev server
- **Express 5.1.0** - Servidor backend
- **SVAR React Gantt 2.3.2** - Componente Gantt
- **Axios 1.13.0** - Cliente HTTP
- **CORS 2.8.5** - Middleware de CORS

## 📝 Scripts Disponíveis

```bash
npm run dev      # Inicia servidor de desenvolvimento
npm run server   # Inicia servidor backend
```

## 🤝 Contribuição

Este é um projeto de demonstração. Sinta-se livre para fazer fork e melhorar!

## 📄 Licença

Este projeto é para fins educacionais e de demonstração.
