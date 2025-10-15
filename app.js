const displayEl = document.getElementById("display");
const keysEl = document.querySelector(".keys");
const historyListEl = document.getElementById("historyList");
const themeToggleBtn = document.getElementById("themeToggle");
const clearHistoryBtn = document.getElementById("clearHistory");
const roundToggleBtn = document.getElementById("roundToggle");

// ===== Estado =====
const state = {
  first: null,
  operator: null,
  second: null,
  overwrite: true,
  lastB: null,
  _lastOp: null,
  memory: 0,
};

const SETTINGS_KEY = "calc_settings_v1";
const THEME_KEY = "calc_theme";
const HISTORY_KEY = "calc_history_v1";
const HISTORY_MAX = 30;

// ===== Persistência =====
let settings = loadSettings();
let history = loadHistory();

function loadTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (!saved) return;
  document.documentElement.setAttribute("data-theme", saved);
  themeToggleBtn?.setAttribute("aria-pressed", saved === "light" ? "true" : "false");
}
function toggleTheme() {
  const html = document.documentElement;
  const next = html.getAttribute("data-theme") === "light" ? "dark" : "light";
  html.setAttribute("data-theme", next);
  localStorage.setItem(THEME_KEY, next);
  themeToggleBtn?.setAttribute("aria-pressed", next === "light" ? "true" : "false");
}

function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}
function saveHistory(list) {
  // 🔧 correção: quando estiver vazio, remove a chave do storage
  if (!list || list.length === 0) {
    localStorage.removeItem(HISTORY_KEY);
    return;
  }
  localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, HISTORY_MAX)));
}

function loadSettings() {
  try {
    const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
    return {
      roundBankers: !!s.roundBankers,
      precision: s.precision ?? 10,
    };
  } catch {
    return { roundBankers: false, precision: 10 };
  }
}
function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
function syncRoundToggle() {
  roundToggleBtn?.setAttribute("aria-pressed", settings.roundBankers ? "true" : "false");
}

// ===== Helpers numéricos =====
function toNumber(str) {
  if (str === "" || str === null) return 0;
  return Number(str.replace(",", "."));
}

function roundHalfToEven(x, places = 10) {
  const p = Math.pow(10, places);
  const n = x * p;
  const f = Math.floor(n);
  const frac = n - f;
  if (Math.abs(frac - 0.5) < Number.EPSILON) {
    return ((f % 2 === 0) ? f : (f + 1)) / p;
  }
  return Math.round(n) / p;
}

function roundTo(x, places = settings.precision) {
  if (!Number.isFinite(x)) return x;
  return settings.roundBankers
    ? roundHalfToEven(x, places)
    : Number(Math.round((x + Number.EPSILON) * Math.pow(10, places)) / Math.pow(10, places));
}

function format(num) {
  if (!Number.isFinite(num)) return "Erro";
  const maxLen = 14;
  let s = num.toString();
  if (!Number.isInteger(num)) {
    s = num.toFixed(10).replace(/\.?0+$/, "");
  }
  if (s.length > maxLen) {
    const exp = num.toExponential(8);
    return exp.length <= maxLen ? exp : exp.slice(0, maxLen);
  }
  return s;
}

function updateDisplayClasses(text) {
  displayEl.classList.toggle("is-long", text.length >= 11 && text.length < 16);
  displayEl.classList.toggle("is-very-long", text.length >= 16);
}

function currentEntry() {
  if (state.operator) {
    if (state.second == null) state.second = "0";
    return state.second;
  } else {
    if (state.first == null) return displayEl.textContent || "0";
    return format(state.first);
  }
}

function setEntry(str) {
  if (state.operator) state.second = str;
  else state.first = toNumber(str);
  displayEl.textContent = str;
  updateDisplayClasses(str);
}

function show(value) {
  const text = String(value);
  displayEl.textContent = text;
  updateDisplayClasses(text);
}

function clearAll() {
  state.first = null;
  state.operator = null;
  state.second = null;
  state.overwrite = true;
  state.lastB = null;
  state._lastOp = null;
  show("0");
}

function deleteLast() {
  let entry = currentEntry();
  if (state.overwrite) { setEntry("0"); state.overwrite = true; return; }
  if (entry === "Erro") { clearAll(); return; }
  if (entry.length <= 1 || (entry.startsWith("-") && entry.length === 2)) entry = "0";
  else entry = entry.slice(0, -1);
  setEntry(entry);
}

function appendDigit(d) {
  let entry = currentEntry();
  if (displayEl.textContent === "Erro") clearAll();
  if (state.overwrite) { entry = (d === "0") ? "0" : d; state.overwrite = false; }
  else { entry = (entry === "0") ? d : entry + d; }
  if (entry.length > 24) return;
  setEntry(entry);
}

function addDot() {
  let entry = currentEntry();
  if (displayEl.textContent === "Erro") clearAll();
  if (state.overwrite) { entry = "0."; state.overwrite = false; }
  else if (!entry.includes(".")) { entry += "."; }
  setEntry(entry);
}

function invertSign() {
  let entry = currentEntry();
  if (entry === "0" || entry === "Erro") return;
  entry = entry.startsWith("-") ? entry.slice(1) : "-" + entry;
  setEntry(entry);
}

function percent() {
  if (displayEl.textContent === "Erro") return;
  if (state.operator && state.second != null) {
    const a = state.first ?? toNumber(displayEl.textContent);
    const b = toNumber(state.second);
    const value = (a * b) / 100;
    state.second = format(roundTo(value));
    show(state.second);
  } else {
    const cur = toNumber(currentEntry());
    const value = cur / 100;
    setEntry(format(roundTo(value)));
  }
}

function compute(a, op, b) {
  let r;
  switch (op) {
    case "+": r = a + b; break;
    case "-": r = a - b; break;
    case "*": r = a * b; break;
    case "/": r = (b === 0 ? Infinity : a / b); break;
    default:  r = b;
  }
  return roundTo(r);
}

function chooseOperator(op) {
  if (displayEl.textContent === "Erro") clearAll();
  if (state.operator && state.second != null) {
    const a = state.first ?? 0;
    const b = toNumber(state.second);
    const result = compute(a, state.operator, b);
    state.first = result;
    state.second = null;
    state.lastB = b;
    show(format(result));
  } else if (state.first == null) {
    state.first = toNumber(displayEl.textContent);
  }
  state.operator = op;
  state.overwrite = true;
}

function equals() {
  if (state.operator == null && state.first != null && state.lastB != null && state._lastOp) {
    const a = state.first;
    const result = compute(a, state._lastOp, state.lastB);
    state.first = result;
    show(format(result));
    state.overwrite = true;
    addToHistory(`${format(a)} ${state._lastOp} ${format(state.lastB)}`, format(result));
    return;
  }
  if (state.operator == null) return;

  const a = state.first ?? toNumber(displayEl.textContent);
  const b = state.second != null ? toNumber(state.second) : (state.lastB ?? a);
  const result = compute(a, state.operator, b);
  const resText = format(result);
  show(resText);

  state._lastOp = state.operator;
  state.first = result;
  state.operator = null;
  state.second = null;
  state.lastB = b;
  state.overwrite = true;

  addToHistory(`${format(a)} ${state._lastOp} ${format(b)}`, resText);
}

// ===== Memória =====
function memoryClear() { state.memory = 0; }
function memoryRecall() {
  const m = format(roundTo(state.memory));
  if (state.operator) state.second = m; else state.first = toNumber(m);
  show(m);
  state.overwrite = true;
}
function memoryAdd() { state.memory = roundTo(state.memory + toNumber(currentEntry())); }
function memorySubtract() { state.memory = roundTo(state.memory - toNumber(currentEntry())); }

// ===== Histórico =====
function renderHistory() {
  if (!historyListEl) return;
  historyListEl.innerHTML = ""; // 🔧 limpa sempre a UI
  if (!history || history.length === 0) {
    // opcional: placeholder visual
    const p = document.createElement("p");
    p.className = "history-hint";
    p.textContent = "Histórico vazio.";
    historyListEl.appendChild(p);
    return;
  }
  for (const item of history) {
    const li = document.createElement("li");
    const exp = document.createElement("span");
    exp.className = "hist-exp";
    exp.textContent = item.expr;

    const res = document.createElement("span");
    res.className = "hist-res";
    res.textContent = item.result;

    li.appendChild(exp); li.appendChild(res);
    li.title = "Clique para reutilizar o resultado";
    li.addEventListener("click", () => {
      show(item.result);
      state.first = toNumber(item.result);
      state.operator = null;
      state.second = null;
      state.overwrite = true;
      navigator.clipboard?.writeText(item.result).catch(() => {});
    });
    historyListEl.prepend(li);
  }
}
function addToHistory(expr, result) {
  history.push({ expr, result });
  if (history.length > HISTORY_MAX) history = history.slice(-HISTORY_MAX);
  saveHistory(history);
  renderHistory();
}

// ===== Clique =====
keysEl.addEventListener("click", (e) => {
  const btn = e.target.closest("button.key");
  if (!btn) return;
  const digit = btn.getAttribute("data-digit");
  const action = btn.getAttribute("data-action");
  const op = btn.getAttribute("data-operator");

  if (digit) { appendDigit(digit); return; }
  if (action === "dot") { addDot(); return; }
  if (action === "clear") { clearAll(); return; }
  if (action === "delete") { deleteLast(); return; }
  if (action === "invert") { invertSign(); return; }
  if (action === "percent") { percent(); return; }
  if (action === "operator" && op) { chooseOperator(op); return; }
  if (action === "equals") { equals(); return; }

  // Memória
  if (action === "MC") { memoryClear(); return; }
  if (action === "MR") { memoryRecall(); return; }
  if (action === "Mplus") { memoryAdd(); return; }
  if (action === "Mminus") { memorySubtract(); return; }
});

// ===== Teclado + testes =====
function keyToAction(ev) {
  const k = ev.key;
  if (/^[0-9]$/.test(k)) return { type: "digit", value: k };
  if (k === "." || k === ",") return { type: "dot" };
  if (k === "+") return { type: "op", value: "+" };
  if (k === "-") return { type: "op", value: "-" };
  if (k === "*" || k.toLowerCase() === "x") return { type: "op", value: "*" };
  if (k === "/") return { type: "op", value: "/" };
  if (k === "%") return { type: "percent" };
  if (k === "Enter" || k === "=") return { type: "equals" };
  if (k === "Backspace") return { type: "delete" };
  if (k === "Delete" || k === "Escape") return { type: "clear" };
  if (k.toLowerCase() === "r") return { type: "MR" };
  if (k.toLowerCase() === "c") return { type: "MC" };
  if (k.toLowerCase() === "p") return { type: "Mplus" };
  if (k.toLowerCase() === "m") return { type: "Mminus" };
  if ((k === "T" || k === "t") && ev.shiftKey) return { type: "tests" };
  return null;
}
function findButtonForAction(map) {
  if (!map) return null;
  switch (map.type) {
    case "digit":   return keysEl.querySelector(`button[data-digit="${map.value}"]`);
    case "dot":     return keysEl.querySelector(`button[data-action="dot"]`);
    case "op":      return keysEl.querySelector(`button[data-action="operator"][data-operator="${map.value}"]`);
    case "percent": return keysEl.querySelector(`button[data-action="percent"]`);
    case "equals":  return keysEl.querySelector(`button[data-action="equals"]`);
    case "delete":  return keysEl.querySelector(`button[data-action="delete"]`);
    case "clear":   return keysEl.querySelector(`button[data-action="clear"]`);
    case "MR":      return keysEl.querySelector(`button[data-action="MR"]`);
    case "MC":      return keysEl.querySelector(`button[data-action="MC"]`);
    case "Mplus":   return keysEl.querySelector(`button[data-action="Mplus"]`);
    case "Mminus":  return keysEl.querySelector(`button[data-action="Mminus"]`);
    default:        return null;
  }
}
function pressVisual(el) {
  if (!el) return;
  el.classList.add("kb-press");
  setTimeout(() => el.classList.remove("kb-press"), 120);
}
window.addEventListener("keydown", (ev) => {
  const tag = document.activeElement?.tagName?.toLowerCase();
  if (tag === "input" || tag === "textarea") return;
  const map = keyToAction(ev);
  if (!map) return;
  ev.preventDefault();
  if (map.type !== "tests") pressVisual(findButtonForAction(map));
  switch (map.type) {
    case "digit": appendDigit(map.value); break;
    case "dot": addDot(); break;
    case "op": chooseOperator(map.value); break;
    case "percent": percent(); break;
    case "equals": equals(); break;
    case "delete": deleteLast(); break;
    case "clear": clearAll(); break;
    case "MR": memoryRecall(); break;
    case "MC": memoryClear(); break;
    case "Mplus": memoryAdd(); break;
    case "Mminus": memorySubtract(); break;
    case "tests": runSelfTests(); break;
  }
});

// ===== Tema + Arredondamento =====
themeToggleBtn?.addEventListener("click", toggleTheme);
roundToggleBtn?.addEventListener("click", () => {
  settings.roundBankers = !settings.roundBankers;
  saveSettings();
  syncRoundToggle();
});

// ===== Mini-testes =====
function assertEq(desc, got, exp) {
  const ok = (Number.isNaN(exp) && Number.isNaN(got)) ? true : Object.is(got, exp);
  console[ok ? "log" : "error"](`${ok ? "✅" : "❌"} ${desc}: ${got} ${ok ? "==" : "!="} ${exp}`);
  return ok;
}
function runSelfTests() {
  console.group("Teste rápido da Calculadora (corrigida)");
  let pass = true;
  pass &= assertEq("1 + 2", compute(1,"+",2), roundTo(3));
  pass &= assertEq("5 - 8", compute(5,"-",8), roundTo(-3));
  pass &= assertEq("7 * 6", compute(7,"*",6), roundTo(42));
  pass &= assertEq("9 / 3", compute(9,"/",3), roundTo(3));
  pass &= assertEq("Divisão por zero => Infinity", compute(5,"/",0), Infinity);

  const saved = { ...state };
  clearAll(); show("0");
  state.first = 200; state.operator = "+"; state.second = "10";
  percent(); equals();
  pass &= assertEq("200 + 10% = 220", toNumber(displayEl.textContent), 220);

  clearAll();
  state.first = 2; state.operator = "+"; state.second = "3";
  equals(); equals();
  pass &= assertEq("2 + 3; = = -> 8", toNumber(displayEl.textContent), 8);

  console[pass ? "log" : "error"](pass ? "Todos os testes passaram." : "Alguns testes falharam.");
  Object.assign(state, saved);
  console.groupEnd();
}

// ===== Inicialização =====
loadTheme();
renderHistory();
syncRoundToggle();
show("0");
state.overwrite = true;

// ===== Handler corrigido para limpar histórico =====
clearHistoryBtn?.addEventListener("click", () => {
  history = [];                 // zera array em memória
  saveHistory(history);         // 🔧 agora remove a chave do storage quando vazio
  renderHistory();              // refaz a UI (lista vazia)
});