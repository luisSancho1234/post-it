# Post-it para a área de trabalho

Notas adesivas para Windows e macOS, feitas com Electron.

## Recursos

- Quantas notas quiser, cada uma em sua própria janela
- 7 cores, tamanho de letra ajustável
- Botão — minimiza a nota: sobra só o cabeçalho com o começo do texto e o botão ▢ para maximizar
- Botão 📌 para manter a nota sempre por cima das outras janelas
- Posição, tamanho, cor e texto salvos automaticamente
- Ícone na bandeja do sistema (clique com o botão direito):
  Nova nota, Mostrar todas, Esconder todas, **Iniciar com o sistema**, Sair
- Fechar uma nota só acontece pelo ✕ (apaga). Para esconder, use "Esconder todas" na bandeja.

## Como gerar o instalador

1. Instale o Node.js (versão LTS): https://nodejs.org
2. Abra o terminal na pasta do projeto e rode:

```
npm install
npm start            # testar o app
npm run dist:win     # gera o instalador do Windows
```

3. O instalador fica em `dist/` (algo como `Post-it Setup 1.0.0.exe`).
   Execute-o para instalar; ele cria atalhos na área de trabalho e no menu Iniciar.

### macOS

O instalador do Mac (.dmg) só pode ser gerado em um Mac:

```
npm install
npm run dist:mac
```

## Iniciar com o Windows

Depois de instalado, clique com o botão direito no ícone do Post-it na bandeja
(perto do relógio) e marque **Iniciar com o sistema**.

## Observações

- O Windows pode mostrar o aviso "SmartScreen" ao instalar, porque o instalador
  não é assinado digitalmente. Clique em "Mais informações" → "Executar assim mesmo".
- No Mac, a primeira abertura de um app não assinado exige clique direito → Abrir.
- Os dados ficam em `%APPDATA%\postit-desktop\notes.json` (Windows) e
  `~/Library/Application Support/postit-desktop/notes.json` (Mac).
