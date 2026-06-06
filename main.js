// Silencia logs de inicialização da biblioteca Puter
puter.quiet = true;

// Configuração das IAs e modelos correspondentes
const IAS = {
  gpt:    { nome: "ChatGPT", modelo: "gpt-4o-mini",            logo: "https://upload.wikimedia.org/wikipedia/commons/0/04/ChatGPT_logo.svg" },
  claude: { nome: "Claude",  modelo: "claude-3-5-haiku-latest", logo: "https://upload.wikimedia.org/wikipedia/commons/8/8a/Claude_AI_logo.svg" },
  gemini: { nome: "Gemini",  modelo: "gemini-2.0-flash",       logo: "https://upload.wikimedia.org/wikipedia/commons/8/8f/Google-gemini-icon.svg" }
};

// Estado da sessão atual
let E = { pergunta: "", respostas: {}, notas: {}, comentarios: {}, influente: null, seguiria: null };

// Recupera o histórico de pesquisas salvo no navegador ou inicia um array vazio
let hist = JSON.parse(localStorage.getItem("hist_ia") || "[]");

/**
 * Envia a pergunta para os três modelos de IA concorrentemente
 */
async function enviar() {
  const p = document.getElementById("pergunta").value.trim();
  if (!p) { document.getElementById("pergunta").focus(); return; }

  E.pergunta = p;
  E.respostas = {};

  const btn = document.getElementById("btnEnviar");
  btn.disabled = true;
  btn.textContent = "Enviando...";

  // Reseta visualização de seções anteriores
  document.getElementById("secaoAval").classList.remove("ativa");
  document.getElementById("secaoResult").classList.remove("ativa");

  // Coloca placeholders de carregamento
  ["gpt", "claude", "gemini"].forEach(ia => {
    document.getElementById("texto-" + ia).innerHTML = '<div class="carregando"><div class="spinner"></div> Pensando...</div>';
  });

  let done = 0;

  // Dispara as requisições assíncronas em paralelo
  ["gpt", "claude", "gemini"].forEach(async (ia) => {
    const cfg = IAS[ia];
    const el = document.getElementById("texto-" + ia);

    try {
      const res = await puter.ai.chat(p, { model: cfg.modelo });

      let txt = "";
      // Tratamento para garantir a captura correta da string de resposta
      if (res?.message?.content) {
        txt = Array.isArray(res.message.content)
          ? res.message.content.map(c => c.text || c).join("")
          : res.message.content;
      } else if (typeof res === "string") {
        txt = res;
      } else {
        txt = JSON.stringify(res);
      }

      E.respostas[ia] = txt;
      el.textContent = txt;
    } catch(err) {
      E.respostas[ia] = "[Erro]";
      el.innerHTML = '<span class="erro">Erro: ' + err.message + '</span>';
    }

    done++;
    // Quando as 3 promessas retornarem (com sucesso ou erro) ativa a próxima seção
    if (done >= 3) {
      btn.disabled = false;
      btn.textContent = "Enviar";
      document.getElementById("secaoAval").classList.add("ativa");
      document.getElementById("secaoAval").scrollIntoView({ behavior: "smooth" });
    }
  });
}

/**
 * Atribui nota (estrelas) de 1 a 5 para uma determinada IA
 */
function nota(ia, n) {
  E.notas[ia] = n;
  document.querySelectorAll(`#estrelas-${ia} .estrela`).forEach((e, i) => e.classList.toggle("ativa", i < n));
}

/**
 * Finaliza a coleta de dados da investigação atual e monta o painel de resultados
 */
function finalizar() {
  const ri = document.querySelector('input[name="influente"]:checked');
  const rs = document.querySelector('input[name="seguiria"]:checked');
  E.influente = ri ? ri.value : null;
  E.seguiria = rs ? rs.value : null;

  const grid = document.getElementById("gridResult");
  grid.innerHTML = "";
  let melhor = null, melhorN = 0;

  // Constrói os minicards com as avaliações dadas
  ["gpt", "claude", "gemini"].forEach(ia => {
    const cfg = IAS[ia];
    const n = E.notas[ia] || 0;
    if (n > melhorN) { melhorN = n; melhor = ia; }
    grid.innerHTML += `
      <div class="resultado-card">
        <img src="${cfg.logo}"/>
        <h4>${cfg.nome}</h4>
        <div class="nota-big">${n > 0 ? "★ " + n : "—"}</div>
        <p class="coment">${E.comentarios[ia] || "Sem comentário"}</p>
      </div>`;
  });

  const inf = E.influente && E.influente !== "nenhuma"
    ? `A IA que mais influenciou foi <strong>${IAS[E.influente].nome}</strong>.`
    : "Nenhuma IA influenciou diretamente.";
  const seg = { sim: "Seguiria totalmente o conselho.", parcial: "Seguiria parcialmente.", nao: "Não seguiria o conselho." };

  document.getElementById("resumo").innerHTML = `
    <p><strong>Pergunta:</strong> ${E.pergunta}</p>
    <p style="margin-top:8px">${inf}</p>
    <p>${seg[E.seguiria] || ""}</p>
    ${melhor ? `<p style="margin-top:8px">Melhor avaliada: <strong>${IAS[melhor].nome}</strong> (${melhorN}/5)</p>` : ""}
  `;

  // Salva no histórico e atualiza o LocalStorage
  hist.push({ 
    data: new Date().toISOString(), 
    pergunta: E.pergunta, 
    notas: { ...E.notas }, 
    comentarios: { ...E.comentarios }, 
    respostas: { ...E.respostas }, 
    influente: E.influente, 
    seguiria: E.seguiria 
  });
  localStorage.setItem("hist_ia", JSON.stringify(hist));

  document.getElementById("totalInv").textContent = "Total: " + hist.length + " investigações";
  document.getElementById("secaoAval").classList.remove("ativa");
  document.getElementById("secaoResult").classList.add("ativa");
  document.getElementById("secaoResult").scrollIntoView({ behavior: "smooth" });
}

/**
 * Reseta o estado da tela para permitir uma nova inserção limpa
 */
function nova() {
  E = { pergunta: "", respostas: {}, notas: {}, comentarios: {}, influente: null, seguiria: null };
  document.getElementById("pergunta").value = "";
  document.getElementById("secaoResult").classList.remove("ativa");
  document.getElementById("secaoAval").classList.remove("ativa");
  
  ["gpt", "claude", "gemini"].forEach(ia => {
    document.getElementById("texto-" + ia).innerHTML = '<div class="placeholder">Aguardando pergunta...</div>';
    document.querySelectorAll(`#estrelas-${ia} .estrela`).forEach(e => e.classList.remove("ativa"));
  });
  
  document.querySelectorAll(".aval-card textarea").forEach(t => t.value = "");
  document.querySelectorAll('input[type="radio"]').forEach(r => r.checked = false);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/**
 * Converte o histórico coletado em CSV e força o download
 */
function exportar() {
  if (!hist.length) { alert("Nenhum dado."); return; }
  let csv = "Data,Pergunta,Nota_ChatGPT,Nota_Claude,Nota_Gemini,Influente,Seguiria\n";
  hist.forEach(r => {
    csv += [r.data, '"' + (r.pergunta || "").replace(/"/g, '""') + '"', r.notas.gpt || "", r.notas.claude || "", r.notas.gemini || "", r.influente || "", r.seguiria || ""].join(",") + "\n";
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" }));
  a.download = "dados_ia_comparativa.csv"; 
  a.click();
}

/**
 * Exibe os dados brutos consolidados até então através de um alerta resumido
 */
function verHist() {
  if (!hist.length) { alert("Nenhuma investigação ainda."); return; }
  let t = "=== HISTÓRICO ===\n\n";
  hist.forEach((r, i) => {
    t += `#${i+1}\nPergunta: ${r.pergunta}\nNotas: GPT=${r.notas.gpt||"-"} | Claude=${r.notas.claude||"-"} | Gemini=${r.notas.gemini||"-"}\nInfluenciou: ${r.influente||"-"} | Seguiria: ${r.seguiria||"-"}\n\n`;
  });
  alert(t);
}
