let ultimoId = null;

async function atualizar() {
  const patientName = document.getElementById("patient-name");
  try {
    const response = await fetch("/tv/chamada");
    const data = await response.json();
    if (!response.ok) throw new Error(data.erro || "Falha ao carregar chamadas.");

    const chamada = data.chamada;
    const historico = Array.isArray(data.historico) ? data.historico : [];
    if (chamada) {
      document.getElementById("local-tipo").textContent = chamada.localTipo || "GUICHÊ";
      document.getElementById("local-numero").textContent = chamada.localNumero || "--";
      patientName.textContent = chamada.paciente || "Aguardando chamada";
      if (chamada.id !== ultimoId) {
        ultimoId = chamada.id;
        const patientBox = document.querySelector(".patient-box");
        patientBox.classList.remove("flash");
        void patientBox.offsetWidth;
        patientBox.classList.add("flash");
      }
    } else {
      patientName.textContent = "AGUARDANDO...";
    }

    const list = document.getElementById("history-list");
    list.replaceChildren();
    historico.slice(0, 4).forEach(item => {
      const entry = document.createElement("li");
      entry.textContent = `${item.localTipo || "GUICHÊ"} ${item.localNumero || "--"} — ${item.paciente || ""}`;
      list.appendChild(entry);
    });
  } catch (error) {
    console.error("Erro ao buscar chamada:", error);
    if (ultimoId === null) patientName.textContent = "Falha ao conectar com o painel";
  }
}

atualizar();
setInterval(atualizar, 2000);
