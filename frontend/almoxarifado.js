let estoqueGlobal = [];
let filtroAtivo = "todos";
let editandoId = null;
let usuario = {};
let toastTimer;

try {
  usuario = JSON.parse(localStorage.getItem("hospital_user") || "{}");
} catch (error) {
  console.error("Dados locais de sessão inválidos:", error);
}

if (!["admin", "administrador"].includes(String(usuario.tipo || "").toLowerCase())) {
  localStorage.removeItem("hospital_user");
  location.href = "index.html";
}

if (usuario.usuario) {
  document.getElementById("nomeUsuario").textContent = `📦 ${usuario.usuario}`;
}

async function requestJson(url, options) {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      localStorage.removeItem("hospital_user");
      location.href = "index.html";
    }
    throw new Error(data.erro || "Falha na solicitação.");
  }
  return data;
}

function showToast(message, type = "success") {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.className = `toast toast-${type} show`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.className = "toast";
  }, 4000);
}

function setTab(tab) {
  const isNew = tab === "novo";
  document.getElementById("painelNovo").hidden = !isNew;
  document.getElementById("painelRepor").hidden = isNew;
  document.getElementById("tabNovo").classList.toggle("active", isNew);
  document.getElementById("tabRepor").classList.toggle("active", !isNew);
  if (!isNew) preencherSelectRepor();
}

async function carregarEstoque() {
  try {
    const data = await requestJson("/estoque");
    if (!Array.isArray(data)) throw new Error("Resposta inválida ao consultar o estoque.");
    estoqueGlobal = data;
    atualizarStats(data);
    renderizarFiltros(data);
    filtrarTabela();
    verificarAlertas(data);
    preencherSelectRepor();
  } catch (error) {
    showToast(error.message || "Erro ao carregar estoque.", "error");
  }
}

function atualizarStats(data) {
  document.getElementById("statItens").textContent = data.length;
  document.getElementById("statOk").textContent =
    data.filter(item => item.quantidade > 10).length;
  document.getElementById("statBaixo").textContent =
    data.filter(item => item.quantidade > 0 && item.quantidade <= 10).length;
  document.getElementById("statZerando").textContent =
    data.filter(item => item.quantidade === 0).length;
}

function verificarAlertas(data) {
  const low = data.filter(item => item.quantidade > 0 && item.quantidade <= 10);
  const empty = data.filter(item => item.quantidade === 0);
  const alert = document.getElementById("alertaEstoque");
  const messages = [];
  if (empty.length) {
    messages.push(`${empty.length} medicamento(s) zerado(s): ${empty.map(item => item.nome).join(", ")}`);
  }
  if (low.length) messages.push(`${low.length} medicamento(s) com estoque baixo`);
  document.getElementById("alertaTexto").textContent =
    messages.length ? `${messages.join(" | ")} — repor com urgência.` : "";
  alert.hidden = messages.length === 0;
}

function renderizarFiltros(data) {
  const container = document.getElementById("filterChips");
  container.replaceChildren();
  const categories = [...new Set(data.map(item => item.categoria).filter(Boolean))].sort();
  const filters = ["todos", ...categories];
  if (!filters.includes(filtroAtivo)) filtroAtivo = "todos";

  filters.forEach(category => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = `chip${filtroAtivo === category ? " active" : ""}`;
    chip.textContent = category === "todos" ? "Todos" : category;
    chip.addEventListener("click", () => {
      filtroAtivo = category;
      renderizarFiltros(estoqueGlobal);
      filtrarTabela();
    });
    container.appendChild(chip);
  });
}

function setFiltro(category) {
  filtroAtivo = category;
  renderizarFiltros(estoqueGlobal);
  filtrarTabela();
}

function filtrarTabela() {
  const search = document.getElementById("buscarMed").value.trim().toLocaleLowerCase("pt-BR");
  const filtered = estoqueGlobal.filter(item => {
    const matchesCategory = filtroAtivo === "todos" || item.categoria === filtroAtivo;
    const matchesSearch = item.nome.toLocaleLowerCase("pt-BR").includes(search) ||
      String(item.categoria || "").toLocaleLowerCase("pt-BR").includes(search);
    return matchesCategory && matchesSearch;
  });
  renderizarTabela(filtered);
}

function getStockClass(quantity) {
  if (quantity === 0) return "stock-empty";
  if (quantity <= 5) return "stock-critical";
  if (quantity <= 10) return "stock-low";
  return "stock-normal";
}

function getStockIcon(quantity) {
  if (quantity === 0) return "🚫";
  if (quantity <= 5) return "🔴";
  if (quantity <= 10) return "🟡";
  return "🟢";
}

function addCell(row, value, className) {
  const cell = document.createElement("td");
  cell.textContent = value;
  if (className) cell.className = className;
  row.appendChild(cell);
  return cell;
}

function renderizarTabela(items) {
  const tbody = document.getElementById("tableEstoque");
  tbody.replaceChildren();
  if (!items.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 5;
    cell.className = "empty-state";
    cell.textContent = "Nenhum medicamento encontrado.";
    row.appendChild(cell);
    tbody.appendChild(row);
    return;
  }

  items.forEach(item => {
    const row = document.createElement("tr");
    addCell(row, item.nome, "med-name");
    addCell(row, item.categoria || "—", "med-cat");
    const quantityCell = document.createElement("td");
    const badge = document.createElement("span");
    badge.className = `stock-badge ${getStockClass(item.quantidade)}`;
    badge.textContent = `${getStockIcon(item.quantidade)} ${item.quantidade}`;
    quantityCell.appendChild(badge);
    row.appendChild(quantityCell);
    addCell(row, item.unidade || "—");

    const actions = document.createElement("td");
    const actionRow = document.createElement("div");
    actionRow.className = "action-row";
    const edit = document.createElement("button");
    edit.type = "button";
    edit.className = "btn-sm btn-sucess";
    edit.textContent = "✏️ Ajustar";
    edit.addEventListener("click", () => abrirModalEditar(item.id, item.nome, item.quantidade));
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "btn-sm btn-danger-sm";
    remove.textContent = "🗑️ Remover";
    remove.disabled = item.quantidade !== 0;
    remove.title = remove.disabled ? "Zere o estoque antes de remover." : "Remover medicamento";
    remove.addEventListener("click", () => removerMedicamento(item.id, item.nome));
    actionRow.append(edit, remove);
    actions.appendChild(actionRow);
    row.appendChild(actions);
    tbody.appendChild(row);
  });
}

async function darEntrada() {
  const nome = document.getElementById("emNome").value.trim();
  const quantidade = Number(document.getElementById("emQtd").value);
  const unidade = document.getElementById("emUnidade").value;
  const categoria = document.getElementById("emCategoria").value;
  if (!nome) return showToast("Digite o nome do medicamento.", "warning");
  if (!Number.isSafeInteger(quantidade) || quantidade < 0) {
    return showToast("A quantidade inicial deve ser um inteiro igual ou maior que zero.", "warning");
  }

  try {
    const result = await requestJson("/estoque", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, quantidade, unidade, categoria })
    });
    showToast(result.mensagem || "Medicamento cadastrado.", "success");
    document.getElementById("emNome").value = "";
    document.getElementById("emQtd").value = "0";
    await Promise.all([carregarEstoque(), carregarHistoricoEntradas()]);
  } catch (error) {
    showToast(error.message || "Erro ao cadastrar medicamento.", "error");
  }
}

function preencherSelectRepor() {
  const select = document.getElementById("selRepormed");
  if (!select) return;
  const selected = select.value;
  select.replaceChildren(new Option("-- Selecione --", ""));
  estoqueGlobal.forEach(item => {
    const option = new Option(`${item.nome} (atual: ${item.quantidade} ${item.unidade})`, item.id);
    select.appendChild(option);
  });
  if (estoqueGlobal.some(item => String(item.id) === selected)) select.value = selected;
}

async function reporEstoque() {
  const id = document.getElementById("selRepormed").value;
  const quantity = Number(document.getElementById("reporQtd").value);
  if (!id) return showToast("Selecione um medicamento.", "warning");
  if (!Number.isSafeInteger(quantity) || quantity <= 0) {
    return showToast("Informe uma quantidade inteira maior que zero.", "warning");
  }

  try {
    const result = await requestJson(`/estoque/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quantidade: quantity,
        observacao: document.getElementById("reporObs").value.trim()
      })
    });
    showToast(`+${quantity} ${result.medicamento.unidade} adicionados. Novo saldo: ${result.medicamento.quantidade}.`);
    document.getElementById("reporQtd").value = "10";
    document.getElementById("reporObs").value = "";
    await Promise.all([carregarEstoque(), carregarHistoricoEntradas()]);
  } catch (error) {
    showToast(error.message || "Erro ao repor estoque.", "error");
  }
}

function abrirModalEditar(id, nome, quantity) {
  editandoId = id;
  document.getElementById("modalMedNome").textContent =
    `💊 ${nome} — saldo atual: ${quantity}`;
  document.getElementById("modalQtd").value = "0";
  document.getElementById("modalEditar").classList.add("open");
  document.getElementById("modalQtd").focus();
}

function fecharModal() {
  document.getElementById("modalEditar").classList.remove("open");
  editandoId = null;
}

async function confirmarEdicao() {
  const adjustment = Number(document.getElementById("modalQtd").value);
  if (!Number.isSafeInteger(adjustment) || adjustment === 0) {
    return showToast("Informe um ajuste inteiro diferente de zero.", "warning");
  }
  if (editandoId === null) return showToast("Selecione um medicamento para ajustar.", "error");

  try {
    const result = await requestJson(`/estoque/${editandoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantidade: adjustment })
    });
    showToast(`Estoque atualizado: ${result.medicamento.quantidade} ${result.medicamento.unidade}.`);
    fecharModal();
    await Promise.all([carregarEstoque(), carregarHistoricoEntradas()]);
  } catch (error) {
    showToast(error.message || "Erro ao ajustar estoque.", "error");
  }
}

async function removerMedicamento(id, nome) {
  if (!confirm(`Remover "${nome}" do cadastro? O estoque precisa estar zerado.`)) return;
  try {
    const result = await requestJson(`/estoque/${id}`, { method: "DELETE" });
    showToast(result.mensagem || "Medicamento removido.");
    await Promise.all([carregarEstoque(), carregarHistoricoEntradas()]);
  } catch (error) {
    showToast(error.message || "Erro ao remover medicamento.", "error");
  }
}

function formatarData(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Data não disponível" : date.toLocaleString("pt-BR");
}

async function carregarHistoricoEntradas() {
  const container = document.getElementById("historicoEntradas");
  try {
    const entries = await requestJson("/historico-estoque");
    container.replaceChildren();
    if (!entries.length) {
      const empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = "Nenhuma movimentação registrada.";
      container.appendChild(empty);
      return;
    }

    entries.slice(0, 20).forEach(entry => {
      const item = document.createElement("article");
      item.className = "history-item";
      const title = document.createElement("strong");
      title.textContent = entry.medicamento || "Medicamento";
      const type = document.createElement("span");
      type.className = `movement-type movement-${entry.tipo || "ajuste"}`;
      type.textContent = entry.tipo || "movimentação";
      const values = document.createElement("p");
      const changed = Number(entry.quantidadeAlterada) || 0;
      const prefix = changed > 0 ? "+" : "";
      values.textContent =
        `Antes: ${entry.quantidadeAnterior} · Alteração: ${prefix}${changed} · Depois: ${entry.quantidadeNova} ${entry.unidade || ""}`;
      const meta = document.createElement("small");
      meta.textContent = `${formatarData(entry.createdAt)} · Responsável: ${entry.responsavel || "Sistema"}`;
      item.append(title, type, values, meta);
      container.appendChild(item);
    });
  } catch (error) {
    showToast(error.message || "Erro ao carregar histórico.", "error");
  }
}

async function sair() {
  try {
    await fetch("/logout", { method: "POST" });
  } catch (error) {
    console.error("Falha ao encerrar sessão no servidor:", error);
  } finally {
    localStorage.removeItem("hospital_user");
    location.href = "index.html";
  }
}

window.setTab = setTab;
window.setFiltro = setFiltro;
window.filtrarTabela = filtrarTabela;
window.carregarEstoque = carregarEstoque;
window.carregarHistoricoEntradas = carregarHistoricoEntradas;
window.darEntrada = darEntrada;
window.reporEstoque = reporEstoque;
window.abrirModalEditar = abrirModalEditar;
window.fecharModal = fecharModal;
window.confirmarEdicao = confirmarEdicao;
window.removerMedicamento = removerMedicamento;
window.sair = sair;

carregarEstoque();
carregarHistoricoEntradas();
setInterval(() => {
  carregarEstoque();
  carregarHistoricoEntradas();
}, 8000);
