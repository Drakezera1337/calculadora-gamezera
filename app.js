// Calculadora Gamezera: parcelamento com taxas InfinitePay e cálculo de troca com volta.

// Taxas InfinitePay, faixa "Até R$ 20 mil/mês" (entrada), recebimento em 1 dia útil.
// Índice 0 = débito, 1..12 = crédito em Nx. Fonte: infinitepay.io/taxas (nov/2026).
const TAXAS_PADRAO = {
  visa: [1.37, 3.15, 5.39, 6.12, 6.85, 7.57, 8.28, 8.99, 9.69, 10.38, 11.06, 11.74, 12.40],
  elo:  [2.58, 4.91, 6.47, 7.20, 7.92, 8.63, 9.33, 10.03, 10.72, 11.41, 12.08, 12.75, 13.41],
};
const CHAVE = 'gamezera-calc-v1';

// No PC o programa abre o index.html direto do disco (file://); no celular é o app instalado (https).
const NO_PC = location.protocol === 'file:';
if (!NO_PC) document.documentElement.classList.add('cel');

const $ = (s) => document.querySelector(s);
const brl = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const pct = (v) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';

function lerEstado() {
  try { return JSON.parse(localStorage.getItem(CHAVE)) || {}; } catch { return {}; }
}
function salvar() {
  try { localStorage.setItem(CHAVE, JSON.stringify(estado)); } catch {}
}
const estado = Object.assign({ taxas: structuredClone(TAXAS_PADRAO), bandeira: 'visa', aba: 'parcelas' }, lerEstado());
if (!estado.taxas?.visa || estado.taxas.visa.length !== 13) estado.taxas = structuredClone(TAXAS_PADRAO);

// "1.234,56", "1234.56", "1234,5" -> número
function num(txt) {
  let s = String(txt || '').replace(/[^\d.,-]/g, '');
  if (!s) return 0;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else if ((s.match(/\./g) || []).length > 1 || /\.\d{3}$/.test(s)) s = s.replace(/\./g, '');
  const n = parseFloat(s);
  return isFinite(n) ? n : 0;
}
const cent = (v) => Math.round(v * 100) / 100;
const subirCent = (v) => Math.ceil(cent(v * 100) ) / 100; // arredonda para cima no centavo

// Quanto cobrar para receber `liquido` limpo com a taxa t%: parcela arredondada para cima.
function cobrar(liquido, t, n) {
  const bruto = liquido / (1 - t / 100);
  const parcela = subirCent(bruto / n);
  return { parcela, total: cent(parcela * n) };
}

function toast(msg) {
  const el = $('#toast');
  el.textContent = msg; el.hidden = false;
  clearTimeout(toast.t); toast.t = setTimeout(() => (el.hidden = true), 1600);
}
function copiar(txt) {
  (navigator.clipboard?.writeText(txt) || Promise.reject()).then(() => toast('Copiado!'), () => toast(txt));
}

// ---------- Abas ----------
function abrirAba(aba) {
  estado.aba = aba; salvar();
  document.querySelectorAll('.tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === aba));
  document.querySelectorAll('.tab').forEach((s) => (s.hidden = s.id !== 'tab-' + aba));
}
document.querySelectorAll('.tabs button').forEach((b) => b.addEventListener('click', () => abrirAba(b.dataset.tab)));

function seg(el, onChange) {
  el.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
    estado.bandeira = b.dataset.b; salvar();
    document.querySelectorAll('.seg').forEach((s) => s.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x.dataset.b === estado.bandeira)));
    onChange();
  }));
}

// ---------- Parcelas ----------
function renderTabela() {
  const v = num($('#avista').value);
  const tx = estado.taxas[estado.bandeira];
  const el = $('#tabela');
  if (v <= 0) { el.innerHTML = '<div class="empty">Digite o valor à vista para ver as parcelas.</div>'; return; }
  const linhas = [];
  linhas.push({ n: 'Pix', sub: 'sem taxa', parcela: v, total: v, t: 0, pix: true, copia: `Pix: ${brl(v)}` });
  const d = cobrar(v, tx[0], 1);
  linhas.push({ n: 'Déb', sub: pct(tx[0]), parcela: d.parcela, total: d.total, t: tx[0], copia: `Débito: ${brl(d.total)}` });
  for (let n = 1; n <= 12; n++) {
    const c = cobrar(v, tx[n], n);
    linhas.push({ n: n + 'x', sub: pct(tx[n]), nx: n, parcela: c.parcela, total: c.total, t: tx[n],
      copia: n === 1 ? `Crédito à vista: ${brl(c.total)}` : `${n}x de ${brl(c.parcela)} (total ${brl(c.total)})` });
  }
  el.innerHTML = linhas.map((l, i) => `
    <div class="row${l.pix ? ' pix' : ''}" data-i="${i}">
      <div class="n">${l.n}<small>${l.sub}</small></div>
      <div class="parc">${l.nx > 1 ? `<small>${l.nx}x </small>` : ''}${brl(l.parcela)}</div>
      <div class="tot">total<b>${brl(l.total)}</b></div>
    </div>`).join('');
  el.querySelectorAll('.row').forEach((r) => r.addEventListener('click', () => copiar(linhas[r.dataset.i].copia)));
}
$('#avista').addEventListener('input', renderTabela);
seg($('#bandeira'), () => { renderTabela(); renderEditor(); renderTroca(); });

// ---------- Troca ----------
const formas = [['pix', 'Pix / dinheiro'], ['deb', 'Débito']];
for (let n = 1; n <= 12; n++) formas.push([String(n), n === 1 ? 'Crédito à vista' : `Crédito ${n}x`]);
$('#t-forma').innerHTML = formas.map(([v, t]) => `<option value="${v}">${t}</option>`).join('');

const camposTroca = ['t-custo', 't-volta', 't-forma', 't-repassa', 't-revenda', 't-extra'];
(estado.troca && camposTroca.forEach((id) => {
  const el = $('#' + id), val = estado.troca[id];
  if (val === undefined) return;
  if (el.type === 'checkbox') el.checked = val; else el.value = val;
}));

function renderTroca() {
  estado.troca = {};
  camposTroca.forEach((id) => { const el = $('#' + id); estado.troca[id] = el.type === 'checkbox' ? el.checked : el.value; });
  salvar();

  const custo = num($('#t-custo').value);
  const volta = num($('#t-volta').value);
  const revenda = num($('#t-revenda').value);
  const extra = num($('#t-extra').value);
  const forma = $('#t-forma').value;
  const repassa = $('#t-repassa').checked;
  const tx = estado.taxas[estado.bandeira];

  // Taxa da volta no cartão
  let taxa = 0, nParc = 1;
  if (forma === 'deb') taxa = tx[0];
  else if (forma !== 'pix') { nParc = +forma; taxa = tx[nParc]; }

  let recebe = volta, info = '';
  const cartao = $('#t-cartao');
  if (taxa > 0 && volta > 0) {
    if (repassa) {
      const c = cobrar(volta, taxa, nParc);
      recebe = volta;
      info = `Passe no cartão: <b>${nParc > 1 ? `${nParc}x de ${brl(c.parcela)} = ` : ''}${brl(c.total)}</b><br>Taxa ${pct(taxa)} paga pelo cliente — você recebe ${brl(volta)} limpo.`;
    } else {
      recebe = cent(volta * (1 - taxa / 100));
      info = `Passe no cartão: <b>${brl(volta)}</b>${nParc > 1 ? ` (${nParc}x de ${brl(cent(volta / nParc))})` : ''}<br>Taxa ${pct(taxa)} por sua conta — você recebe ${brl(recebe)}.`;
    }
    cartao.innerHTML = info; cartao.hidden = false;
  } else cartao.hidden = true;

  const el = $('#t-result');
  if (!custo && !volta && !revenda) {
    el.innerHTML = '<div class="empty">Preencha o custo do seu item, a volta e por quanto vai vender o item que entrou.</div>';
    return;
  }
  const taxaPerdida = cent(volta - recebe);
  const lucro = cent(recebe + revenda - custo - extra);
  const investido = custo + extra;
  const margem = investido > 0 ? (lucro / investido) * 100 : 0;
  // Quanto o item que entrou "me custou" de fato
  const custoEntrada = cent(custo - recebe);

  el.innerHTML = `
    <div class="lucro">Lucro total da troca</div>
    <div class="valor ${lucro >= 0 ? 'pos' : 'neg'}">${brl(lucro)}</div>
    <div class="sub">${investido > 0 ? `${pct(margem)} sobre o que você investiu · ` : ''}item que entrou te custa ${brl(Math.max(custoEntrada, 0))}${custoEntrada < 0 ? ` (e ainda sobra ${brl(-custoEntrada)} no bolso)` : ''}</div>
    <table>
      <tr><td>Volta recebida</td><td class="mais">+ ${brl(volta)}</td></tr>
      ${taxaPerdida > 0 ? `<tr><td>Taxa do cartão</td><td class="menos">− ${brl(taxaPerdida)}</td></tr>` : ''}
      <tr><td>Venda do item que entrou</td><td class="mais">+ ${brl(revenda)}</td></tr>
      <tr><td>Custo do meu item</td><td class="menos">− ${brl(custo)}</td></tr>
      ${extra > 0 ? `<tr><td>Gastos extras</td><td class="menos">− ${brl(extra)}</td></tr>` : ''}
      <tr class="total"><td>Lucro</td><td class="${lucro >= 0 ? 'mais' : 'menos'}">${brl(lucro)}</td></tr>
    </table>`;
}
camposTroca.forEach((id) => $('#' + id).addEventListener(id === 't-forma' || id === 't-repassa' ? 'change' : 'input', renderTroca));
$('#t-limpar').addEventListener('click', () => {
  ['t-custo', 't-volta', 't-revenda', 't-extra'].forEach((id) => ($('#' + id).value = ''));
  $('#t-forma').value = 'pix'; $('#t-repassa').checked = true;
  renderTroca();
});

// ---------- Editor de taxas ----------
function renderEditor() {
  const tx = estado.taxas[estado.bandeira];
  const nomes = ['Débito', 'Crédito à vista'];
  for (let n = 2; n <= 12; n++) nomes.push(`Crédito ${n}x`);
  $('#editor').innerHTML = nomes.map((nome, i) => `
    <div class="taxa-row"><label for="tx${i}">${nome}</label>
      <div class="pct"><input id="tx${i}" data-i="${i}" inputmode="decimal" value="${String(tx[i]).replace('.', ',')}"><span>%</span></div></div>`).join('');
  $('#editor').querySelectorAll('input').forEach((inp) => inp.addEventListener('input', () => {
    const v = num(inp.value);
    if (v >= 0 && v < 100) { estado.taxas[estado.bandeira][+inp.dataset.i] = v; salvar(); renderTabela(); renderTroca(); }
  }));
}
seg($('#bandeira-taxas'), () => { renderTabela(); renderEditor(); renderTroca(); });
$('#restaurar').addEventListener('click', () => {
  if (!confirm('Voltar todas as taxas para o padrão InfinitePay (até R$ 20 mil)?')) return;
  estado.taxas = structuredClone(TAXAS_PADRAO); salvar();
  renderEditor(); renderTabela(); renderTroca(); toast('Taxas restauradas');
});

// ---------- Início ----------
document.querySelectorAll('.seg').forEach((s) => s.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x.dataset.b === estado.bandeira)));
abrirAba(estado.aba || 'parcelas');
renderTabela(); renderTroca(); renderEditor();

if (NO_PC) $('#avista').focus();
else if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
