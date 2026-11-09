# Calculadora Gamezera

Programa do Windows (janela própria, sem navegador nem servidor) com duas funções:

- **Parcelas:** digita o valor à vista e mostra Pix, débito e crédito de 1x a 12x com a taxa da InfinitePay
  já repassada (você recebe o valor à vista cheio). Clicar numa linha copia o texto para mandar ao cliente.
- **Troca:** custo do seu item + volta do cliente (Pix, débito ou cartão em até 12x, repassando a taxa ou não)
  + por quanto vai vender o item que entrou (e gastos extras) → lucro total da troca.

Fórmula do parcelamento: `total = à vista ÷ (1 − taxa)`, com a parcela arredondada para cima no centavo.

## Taxas

Padrão: InfinitePay, faixa "Até R$ 20 mil/mês", recebimento em 1 dia útil (infinitepay.io/taxas, nov/2026).
Dá para editar na aba **Taxas** (Visa/Master e Elo/Amex separados); fica salvo no PC (pasta `.dados`).

## Abrir

Atalho **Calculadora Gamezera** na Área de Trabalho (roda `pythonw calculadora.pyw`, sem console).
A janela usa o WebView2 do Windows via **pywebview**, instalado em `.vendor/`
(`python -m pip install --target .vendor pywebview`). Erros vão para `erro.log`.
