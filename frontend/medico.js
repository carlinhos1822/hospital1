let triagensCarregadas = [];
let triagemSelecionada = null;
let requestIdPendente = null;

async function requestJson(url, options) {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.erro || "Falha na solicitação.");
  return data;
}

function mostrarMensagem(texto, erro = false) {
  const message = document.getElementById("mensagemMedico");
  message.textContent = texto;
  message.className = erro
    ? "status-message error-message"
    : "status-message success-message";
  message.hidden = false;
}

async function carregar() {
  const container = document.getElementById("triagens");
  container.replaceChildren();
  try {
    const data = await requestJson("/triagens");
    triagensCarregadas = data.filter(item =>
      !item.status || item.status === "aguardando_medico"
    );
    if (!triagensCarregadas.length) {
      const empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = "Nenhum paciente aguardando atendimento médico.";
      container.appendChild(empty);
      return;
    }

    triagensCarregadas.forEach((triagem, index) => {
      const card = document.createElement("article");
      card.className = "card triage-card";
      const details = document.createElement("div");
      const title = document.createElement("h3");
      title.textContent = triagem.nome || "Paciente";
      const summary = document.createElement("p");
      summary.textContent = `Sintoma: ${triagem.sintoma || "Não informado"} · Temperatura: ${triagem.temperatura ?? "Não informada"}°C`;
      const risk = document.createElement("span");
      risk.className = `risk-badge ${triagem.risco || "verde"}`;
      risk.textContent = triagem.risco || "verde";
      const allergies = document.createElement("p");
      allergies.textContent = `Alergia: ${triagem.alergia || "Nenhuma"}`;
      const observations = document.createElement("p");
      observations.textContent = `Observação: ${triagem.observacao || "Nenhuma"}`;
      details.append(title, summary, risk, allergies, observations);

      const actions = document.createElement("div");
      actions.className = "triage-actions";
      const attend = document.createElement("button");
      attend.type = "button";
      attend.textContent = "Atender";
      attend.addEventListener("click", () => selecionar(index));
      const call = document.createElement("button");
      call.type = "button";
      call.className = "btn-tv";
      call.textContent = "📺 Chamar na TV";
      call.addEventListener("click", () => chamarNaTV(triagem.nome));
      const discharge = document.createElement("button");
      discharge.type = "button";
      discharge.className = "btn-alta";
      discharge.textContent = "🏥 Alta";
      discharge.addEventListener("click", () => abrirAlta(index));
      actions.append(attend, call, discharge);
      card.append(details, actions);
      container.appendChild(card);
    });
  } catch (error) {
    mostrarMensagem(error.message || "Erro ao carregar a fila médica.", true);
  }
}

async function chamarNaTV(nome) {
  const consultorio = document.getElementById("consultorio-num").value.trim() || "01";
  try {
    await requestJson("/tv/chamar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        localTipo: "CONSULTÓRIO",
        localNumero: consultorio,
        paciente: nome
      })
    });
    mostrarMensagem(`${nome} chamado no Consultório ${consultorio}.`);
  } catch (error) {
    mostrarMensagem(error.message || "Não foi possível chamar na TV.", true);
  }
}

function selecionar(index) {
  triagemSelecionada = triagensCarregadas[index];
  if (!triagemSelecionada) return;
  document.getElementById("paciente").value = triagemSelecionada.nome || "";
  document.getElementById("obs").value = triagemSelecionada.observacao || "";
  document.getElementById("consultaForm").scrollIntoView({ behavior: "smooth", block: "start" });
  if (triagemSelecionada.alergia && triagemSelecionada.alergia !== "Nenhuma") {
    alert(`⚠️ Paciente possui alergia: ${triagemSelecionada.alergia}`);
  }
}

async function carregarMedicacoes() {
  const select = document.getElementById("medicacao");
  select.replaceChildren(new Option("Carregando medicações...", ""));
  try {
    const [names, stock] = await Promise.all([
      requestJson("/lista-medicacoes"),
      requestJson("/estoque")
    ]);
    const quantities = new Map(stock.map(item => [item.nome.toLocaleLowerCase("pt-BR"), item]));
    select.replaceChildren(new Option("Selecione a medicação", ""));
    names.forEach(name => {
      const medication = quantities.get(name.toLocaleLowerCase("pt-BR"));
      const option = new Option(
        medication ? `${name} — ${medication.quantidade} ${medication.unidade}` : name,
        name
      );
      option.disabled = Boolean(medication && medication.quantidade === 0);
      select.appendChild(option);
    });
  } catch (error) {
    select.replaceChildren(new Option("Erro ao carregar medicações", ""));
    mostrarMensagem(error.message || "Erro ao carregar medicações.", true);
  }
}

async function salvar() {
  const paciente = document.getElementById("paciente").value.trim();
  const diagnostico = document.getElementById("diagnostico").value.trim();
  const medicacao = document.getElementById("medicacao").value;
  const obs = document.getElementById("obs").value.trim();
  const quantidade = Number(document.getElementById("quantidade").value);
  if (!paciente || !triagemSelecionada) {
    mostrarMensagem("Selecione um paciente na fila antes de salvar.", true);
    return;
  }
  if (!medicacao) {
    mostrarMensagem("Selecione uma medicação.", true);
    return;
  }
  if (!Number.isSafeInteger(quantidade) || quantidade <= 0) {
    mostrarMensagem("A quantidade deve ser um número inteiro maior que zero.", true);
    return;
  }

  const button = document.getElementById("btnSalvarConsulta");
  button.disabled = true;
  requestIdPendente = requestIdPendente || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  let receivedResponse = false;
  try {
    const response = await fetch("/consulta", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paciente,
        diagnostico,
        medicacao,
        obs,
        quantidade,
        triagemId: triagemSelecionada.id,
        requestId: requestIdPendente
      })
    });
    receivedResponse = true;
    const data = await response.json();
    if (!response.ok) throw new Error(data.erro || "Não foi possível salvar a consulta.");

    requestIdPendente = null;
    mostrarMensagem(`Consulta salva. Estoque restante de ${medicacao}: ${data.estoqueRestante}.`);
    document.getElementById("diagnostico").value = "";
    document.getElementById("medicacao").value = "";
    document.getElementById("quantidade").value = "1";
    document.getElementById("obs").value = "";
    triagemSelecionada = null;
    document.getElementById("paciente").value = "";
    await Promise.all([carregar(), carregarMedicacoes()]);
  } catch (error) {
    if (receivedResponse) requestIdPendente = null;
    mostrarMensagem(error.message || "Erro de conexão ao salvar a consulta.", true);
  } finally {
    button.disabled = false;
  }
}

function abrirAlta(index) {
  const triagem = triagensCarregadas[index];
  if (!triagem) {
    mostrarMensagem("Paciente não encontrado.", true);
    return;
  }
  const pacienteId = triagem.pacienteId || triagem.id;
  const params = new URLSearchParams({
    id: pacienteId,
    nome: triagem.nome || "",
    triagemId: triagem.id
  });
  location.href = `alta.html?${params.toString()}`;
}

document.getElementById("consultaForm").addEventListener("submit", event => {
  event.preventDefault();
  salvar();
});

window.chamarNaTV = chamarNaTV;
carregar();
carregarMedicacoes();
setInterval(carregar, 10000);
