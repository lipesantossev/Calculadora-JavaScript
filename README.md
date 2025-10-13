Calculadora JS

Uma calculadora de bolso moderna feita com HTML + CSS + JavaScript (sem frameworks). Suporta mouse e teclado, histórico de cálculos, memória (M+, M−, MR, MC), tema claro/escuro e arredondamento bancário (half-to-even) opcional.

📸 Demo

Abra o arquivo index.html no navegador ou publique no GitHub Pages (instruções abaixo).

✨ Funcionalidades

Teclado completo: 0–9, + - * /, Enter/=, Backspace (DEL), Delete/Esc (AC), %, . ,.

Feedback visual nos botões ao digitar pelo teclado.

Histórico persistente (localStorage), itens clicáveis para reutilizar resultados (copiados para a área de transferência quando possível).

Memória: M+, M−, MR, MC (com atalhos de teclado).

Tema claro/escuro persistente.

Arredondamento bancário opcional para reduzir viés em séries de cálculos.

Mini-testes embutidos (atalho Shift + T) para validar operações críticas.

⌨️ Atalhos de teclado

Dígitos: 0–9

Operadores: + - * /

Decimal: . ou ,

Porcentagem: %

Igual: Enter ou =

Apagar último: Backspace

Limpar tudo (AC): Delete ou Esc

Memória: R = MR, C = MC, P = M+, M = M−

Testes rápidos: Shift + T

🧠 Memória (M+, M−, MR, MC)

M+: soma o valor atual à memória.

M−: subtrai o valor atual da memória.

MR: recorda o valor da memória no visor (também prepara para continuar o cálculo).

MC: zera a memória.

% — Regra de porcentagem

Isolado: 50 % → 0.5 (divide por 100).

Contexto com operador: A op B% interpreta B% de A. Exemplos:

200 + 10 % = → 220 (10% de 200 é 20; 200+20)

200 − 10 % = → 180

200 × 10 % = → 20

200 ÷ 10 % = → 200 ÷ 0.1 = 2000

⚖️ Arredondamento

Padrão: arredondamento comum (half-up) com pequena correção de ponto flutuante.

Opcional: arredondamento bancário (half-to-even) — ativa/desativa pelo botão ⚖️ Arred. bancário. Útil para reduzir viés em séries longas: 2.5 → 2, 3.5 → 4 quando arredondado a inteiros.

Precisão interna padrão: 10 casas para resultados intermediários.

Observação: operações exibidas no visor já vêm com o arredondamento aplicado através de format(...) para manter legibilidade.
