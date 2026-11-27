let pacienteSelecionadoId = null;

async function respostaJson(url, options) {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.erro || "Falha na solicitação.");
  return data;
}

function classificarRisco(sintoma, temperatura) {
  const criticos = ["infarto", "avc", "convulsao", "hemorragia", "falta_ar_grave"];
  const moderados = ["febre", "vomito", "diarreia", "falta_ar_moderada"];

  if (temperatura >= 39 || criticos.includes(sintoma)) return "vermelho";
  if (temperatura >= 38 || moderados.includes(sintoma)) return "amarelo";
  return "verde";
}

async function carregarPacientes() {
  const container = document.getElementById("fila-pacientes");
  container.replaceChildren();

  try {
    const pacientes = await respostaJson("/pacientes");
    const fila = pacientes.filter(paciente => paciente.status === "triagem");
    if (!fila.length) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = "Nenhum paciente aguardando triagem.";
      container.appendChild(empty);
      return;
    }

    fila.forEach(paciente => {
      const item = document.createElement("article");
      item.className = "fila-item";
      const info = document.createElement("div");
      info.className = "paciente-info";
      const avatar = document.createElement("span");
      avatar.className = "paciente-avatar";
      avatar.textContent = "👤";
      const details = document.createElement("div");
      const name = document.createElement("strong");
      name.textContent = paciente.nome;
      const secondary = document.createElement("small");
      secondary.textContent = `CPF: ${paciente.cpf || "—"} | Tipo: ${paciente.tipo || "—"}`;
      details.append(name, secondary);
      info.append(avatar, details);

      const actions = document.createElement("div");
      actions.className = "fila-item-actions";
      const selectButton = document.createElement("button");
      selectButton.type = "button";
      selectButton.className = "btn-primary";
      selectButton.textContent = "Selecionar para triagem";
      selectButton.addEventListener("click", () => {
        pacienteSelecionadoId = paciente.id;
        document.getElementById("nome").value = paciente.nome;
        document.getElementById("nome").focus();
      });

      const callButton = document.createElement("button");
      callButton.type = "button";
      callButton.className = "btn-tv";
      callButton.textContent = "📺 Chamar na TV";
      callButton.addEventListener("click", () => chamarNaTV(paciente.nome));
      actions.append(selectButton, callButton);
      item.append(info, actions);
      container.appendChild(item);
    });
  } catch (error) {
    const message = document.createElement("div");
    message.className = "error-state";
    message.textContent = error.message || "Erro ao carregar pacientes.";
    container.appendChild(message);
  }
}

async function chamarNaTV(nome) {
  try {
    await respostaJson("/tv/chamar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        localTipo: "GUICHÊ",
        localNumero: "01",
        paciente: nome
      })
    });
    alert(`✅ ${nome} foi chamado na TV para o Guichê 01!`);
  } catch (error) {
    alert(error.message || "Não foi possível chamar o paciente.");
  }
}

async function salvar() {
  const nome = document.getElementById("nome").value.trim();
  const sintoma = document.getElementById("sintoma").value;
  const temperaturaInput = document.getElementById("temp").value;
  const temperatura = temperaturaInput === "" ? 0 : Number(temperaturaInput);
  const alergia = document.getElementById("alergia").value.trim();
  const observacao = document.getElementById("observacao").value.trim();
  const resultado = document.getElementById("resultado");

  if (!nome || !sintoma) {
    alert("Informe o paciente e selecione o sintoma principal.");
    return;
  }
  if (!Number.isFinite(temperatura) || temperatura < 0 || temperatura > 50) {
    alert("Informe uma temperatura válida.");
    return;
  }

  const risco = classificarRisco(sintoma, temperatura);
  const body = { nome, sintoma, temperatura, alergia, observacao, risco };
  if (pacienteSelecionadoId !== null) body.pacienteId = pacienteSelecionadoId;

  const button = document.querySelector(".form-actions button");
  button.disabled = true;
  try {
    await respostaJson("/triagem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    resultado.className = `resultado ${risco}`;
    resultado.textContent = `Classificação: ${risco.toUpperCase()}`;
    alert("✅ Triagem salva com sucesso!");
    pacienteSelecionadoId = null;
    await carregarPacientes();
  } catch (error) {
    alert(error.message || "Não foi possível salvar a triagem.");
  } finally {
    button.disabled = false;
  }
}

document.getElementById("nome").addEventListener("input", () => {
  pacienteSelecionadoId = null;
});

window.carregarPacientes = carregarPacientes;
window.salvar = salvar;
window.chamarNaTV = chamarNaTV;
carregarPacientes();
setInterval(carregarPacientes, 10000);
