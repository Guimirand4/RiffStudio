# RiffStudio 🎸

RiffStudio é um aplicativo desktop (macOS) para treino pessoal de guitarra. O app exibe partituras/tablaturas interativas e "escuta" o que você toca usando o microfone, avançando automaticamente a partitura ao detectar que a nota correta foi tocada.

## Funcionalidades (MVP)
- **Partituras Interativas:** Motor de renderização musical de alta qualidade usando [alphaTab](https://www.alphatab.net/).
- **Detecção de Pitch em Tempo Real:** Captura do áudio do microfone processado via Web Audio API (`AudioWorklet`) e o algoritmo McLeod Pitch Method (via biblioteca `pitchy`).
- **Autoscroll Inteligente:** O cursor avança apenas quando a nota (ou harmônico compatível) esperada é identificada com uma clareza aceitável.
- **Onset Detection:** Detecção de ataque (HFC) para garantir que notas repetidas exijam novas palhetadas.
- **Loop A-B:** Marcação de seções específicas da partitura para prática repetitiva intensiva.
- **Métricas de Performance:** Cálculo de Precisão (Acertos/Tentativas) e Timing Score (milissegundos de latência por nota).
- **Offline First:** Roda 100% offline no Mac, sem depender de CDNs após a instalação, processando o áudio localmente e respeitando a privacidade (sem dependência de servidores web).

## Tecnologias Usadas
- **Frontend:** React, TypeScript, Vite
- **Desktop App:** Tauri 2.0 (Rust)
- **Áudio:** Web Audio API, AudioWorklet (para processamento sem travar a UI)
- **Partitura:** alphaTab (modo local JS)
- **Design:** CSS Modules (Variáveis nativas para consistência visual em UI estilo *Dark Mode*)

## Como rodar localmente

### 1. Pré-requisitos
- Node.js (v18+)
- Rust (via `rustup`)

### 2. Instalação e Execução
```bash
# Instalar dependências Node
npm install

# Rodar o app localmente em modo desenvolvedor (Native App)
npm run tauri:dev
```

### 3. Build do instalador macOS (.dmg)
```bash
npm run tauri:build
```
O `.dmg` e o `.app` serão gerados na pasta `src-tauri/target/release/bundle/`.

## Músicas na Biblioteca Atual
- Smoke on the Water (Deep Purple)
- Seven Nation Army (The White Stripes)
- Come As You Are (Nirvana)
- Iron Man (Black Sabbath)
- Enter Sandman (Metallica)
- Back in Black (AC/DC)
- La Grange (ZZ Top)
- Paranoid (Black Sabbath)
