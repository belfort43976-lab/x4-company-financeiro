let usuarioLogado = null;

let usuarios = JSON.parse(localStorage.getItem("x4_usuarios")) || [
  {
    usuario: "Leandro Belfort",
    senha: "65031265LLd#",
    cargo: "ADM",
    acesso: "TODOS",
    permissoes: "TOTAL"
  }
];

let transacoes = JSON.parse(localStorage.getItem("x4_financeiro")) || [];
let tarefas = JSON.parse(localStorage.getItem("x4_tarefas")) || [];

let metas = JSON.parse(localStorage.getItem("x4_metas")) || {
  faturamento: 50000,
  custos: 15000,
  lucro: 20000
};

let grafico;

const filtroMes = document.getElementById("filtroMes");
filtroMes.value = new Date().toISOString().slice(0, 7);

function fazerLogin() {
  const usuario = document.getElementById("loginUsuario").value.trim();
  const senha = document.getElementById("loginSenha").value.trim();
  const erro = document.getElementById("loginErro");

  const encontrado = usuarios.find(user =>
    user.usuario.toLowerCase() === usuario.toLowerCase() &&
    user.senha === senha
  );

  if (!encontrado) {
    erro.innerText = "Usuário ou senha incorretos.";
    return;
  }

  usuarioLogado = encontrado;

  document.getElementById("loginScreen").style.display = "none";
  document.getElementById("appSistema").style.display = "flex";
  document.getElementById("usuarioCargo").innerText =
    `${usuarioLogado.usuario} (${usuarioLogado.cargo})`;

  aplicarPermissoes();
  carregarResponsaveis();

  if (usuarioLogado.acesso === "MARKETING") {
    abrirPagina("tarefas", document.querySelector(".menu-marketing"));
  } else {
    abrirPagina("dashboard", document.querySelector(".menu-financeiro"));
  }

  renderizar();
  renderizarTarefas();
  renderizarInbox();
  renderizarUsuarios();
}

function sairSistema() {
  usuarioLogado = null;

  document.getElementById("loginUsuario").value = "";
  document.getElementById("loginSenha").value = "";
  document.getElementById("loginErro").innerText = "";

  document.getElementById("loginScreen").style.display = "flex";
  document.getElementById("appSistema").style.display = "none";
}

function temAcessoFinanceiro() {
  return usuarioLogado && (
    usuarioLogado.cargo === "ADM" ||
    usuarioLogado.acesso === "FINANCEIRO" ||
    usuarioLogado.acesso === "TODOS"
  );
}

function temAcessoMarketing() {
  return usuarioLogado && (
    usuarioLogado.cargo === "ADM" ||
    usuarioLogado.acesso === "MARKETING" ||
    usuarioLogado.acesso === "TODOS"
  );
}

function aplicarPermissoes() {
  document.querySelectorAll(".area-admin").forEach(area => {
    area.style.display = usuarioLogado && usuarioLogado.cargo === "ADM"
      ? "block"
      : "none";
  });

  document.querySelectorAll(".menu-financeiro").forEach(item => {
    item.style.display = temAcessoFinanceiro() ? "block" : "none";
  });

  document.querySelectorAll(".menu-marketing").forEach(item => {
    item.style.display = temAcessoMarketing() ? "block" : "none";
  });

  document.querySelectorAll(".cards-financeiro").forEach(item => {
    item.style.display = temAcessoFinanceiro() ? "grid" : "none";
  });
}

function moeda(valor) {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function salvar() {
  localStorage.setItem("x4_financeiro", JSON.stringify(transacoes));
}

function salvarTarefas() {
  localStorage.setItem("x4_tarefas", JSON.stringify(tarefas));
}

function salvarUsuarios() {
  localStorage.setItem("x4_usuarios", JSON.stringify(usuarios));
}

function salvarMetasStorage() {
  localStorage.setItem("x4_metas", JSON.stringify(metas));
}

function dadosDoMes() {
  return transacoes.filter(item => item.mes === filtroMes.value);
}

function adicionarLancamento() {
  if (!temAcessoFinanceiro()) {
    alert("Você não tem acesso ao setor financeiro.");
    return;
  }

  const descricao = document.getElementById("descricao").value.trim();
  const tipo = document.getElementById("tipo").value;
  const valor = Number(document.getElementById("valor").value);
  const categoria = document.getElementById("categoria").value;

  if (descricao === "" || valor <= 0) {
    alert("Preencha descrição e valor corretamente.");
    return;
  }

  transacoes.push({
    id: Date.now(),
    descricao,
    tipo,
    valor,
    categoria,
    data: new Date().toLocaleDateString("pt-BR"),
    mes: filtroMes.value,
    criadoPor: usuarioLogado ? usuarioLogado.usuario : "Sistema"
  });

  salvar();

  document.getElementById("descricao").value = "";
  document.getElementById("valor").value = "";
  document.getElementById("tipo").value = "entrada";
  document.getElementById("categoria").selectedIndex = 0;

  renderizar();
}

function salvarMetas() {
  if (!usuarioLogado || usuarioLogado.cargo !== "ADM") {
    alert("Apenas ADM pode alterar metas.");
    return;
  }

  const faturamento = Number(document.getElementById("inputMetaFaturamento").value);
  const custos = Number(document.getElementById("inputMetaCustos").value);
  const lucro = Number(document.getElementById("inputMetaLucro").value);

  metas = {
    faturamento: faturamento > 0 ? faturamento : metas.faturamento,
    custos: custos > 0 ? custos : metas.custos,
    lucro: lucro > 0 ? lucro : metas.lucro
  };

  salvarMetasStorage();

  document.getElementById("inputMetaFaturamento").value = "";
  document.getElementById("inputMetaCustos").value = "";
  document.getElementById("inputMetaLucro").value = "";

  renderizar();
  alert("Metas salvas com sucesso!");
}

function excluirLancamento(id) {
  if (!usuarioLogado || usuarioLogado.cargo !== "ADM") {
    alert("Apenas ADM pode excluir lançamentos.");
    return;
  }

  if (!confirm("Deseja excluir este lançamento?")) return;

  transacoes = transacoes.filter(item => item.id !== id);
  salvar();
  renderizar();
}

function abrirPagina(pagina, botao) {
  if (
    ["dashboard", "entradas", "saidas", "caixa", "metas", "relatorios", "categorias", "ia"].includes(pagina) &&
    !temAcessoFinanceiro()
  ) {
    alert("Você não tem acesso ao setor financeiro.");
    return;
  }

  if (["tarefas", "inbox"].includes(pagina) && !temAcessoMarketing()) {
    alert("Você não tem acesso ao setor de Marketing/Tarefas.");
    return;
  }

  if (pagina === "usuarios" && (!usuarioLogado || usuarioLogado.cargo !== "ADM")) {
    alert("Apenas ADM pode acessar usuários.");
    return;
  }

  document.querySelectorAll(".pagina").forEach(secao => {
    secao.classList.remove("ativa");
  });

  document.getElementById(pagina).classList.add("ativa");

  document.querySelectorAll("nav button").forEach(btn => {
    btn.classList.remove("active");
  });

  if (botao) {
    botao.classList.add("active");
  }

  const titulos = {
    dashboard: ["Dashboard Financeiro", "Visão geral da X4 Company"],
    entradas: ["Entradas", "Controle de valores que entram na empresa"],
    saidas: ["Saídas", "Controle de custos, despesas e pagamentos"],
    caixa: ["Caixa", "Dinheiro disponível e saldo financeiro"],
    metas: ["Metas", "Configure e acompanhe o faturamento da empresa"],
    relatorios: ["Relatórios", "Resumo completo do desempenho financeiro"],
    categorias: ["Categorias", "Organização por tipo de lançamento"],
    ia: ["IA Financeira", "Resumo inteligente do financeiro da X4 Company"],
    tarefas: ["Marketing / Tarefas", "Gestão operacional do time de marketing"],
    inbox: ["Caixa de Entrada", "Lembretes automáticos e alertas de prazo"],
    usuarios: ["Usuários", "Cadastro e controle de permissões do sistema"]
  };

  document.getElementById("tituloPagina").innerText = titulos[pagina][0];
  document.getElementById("subtituloPagina").innerText = titulos[pagina][1];

  const cardsFinanceiro = document.querySelector(".cards-financeiro");
  if (cardsFinanceiro) {
    cardsFinanceiro.style.display =
      ["dashboard", "entradas", "saidas", "caixa", "metas", "relatorios", "categorias", "ia"].includes(pagina)
        ? "grid"
        : "none";
  }

  renderizar();

  if (pagina === "tarefas") renderizarTarefas();
  if (pagina === "inbox") renderizarInbox();
  if (pagina === "usuarios") renderizarUsuarios();
}

function calcularResumo() {
  const dados = dadosDoMes();

  const entradas = dados
    .filter(item => item.tipo === "entrada")
    .reduce((total, item) => total + item.valor, 0);

  const saidas = dados
    .filter(item => item.tipo === "saida")
    .reduce((total, item) => total + item.valor, 0);

  const saldo = entradas - saidas;

  return { dados, entradas, saidas, saldo };
}

function renderizar() {
  if (!temAcessoFinanceiro() && usuarioLogado) return;

  const { dados, entradas, saidas, saldo } = calcularResumo();

  document.getElementById("totalEntradas").innerText = moeda(entradas);
  document.getElementById("totalSaidas").innerText = moeda(saidas);
  document.getElementById("saldoAtual").innerText = moeda(saldo);
  document.getElementById("caixaAtual").innerText = moeda(saldo);

  document.getElementById("caixaEntradas").innerText = moeda(entradas);
  document.getElementById("caixaSaidas").innerText = moeda(saidas);
  document.getElementById("caixaDisponivel").innerText = moeda(saldo);

  document.getElementById("relEntradas").innerText = moeda(entradas);
  document.getElementById("relSaidas").innerText = moeda(saidas);
  document.getElementById("relSaldo").innerText = moeda(saldo);
  document.getElementById("relTransacoes").innerText = dados.length;

  renderizarTabela("listaTransacoes", dados, true);
  renderizarTabela("listaEntradas", dados.filter(item => item.tipo === "entrada"), false);
  renderizarTabela("listaSaidas", dados.filter(item => item.tipo === "saida"), false);

  atualizarMetas(entradas, saidas, saldo);
  preencherInputsMetas();
  criarGrafico(entradas, saidas, saldo);
}

function renderizarTabela(idTabela, dados, comAcao) {
  const tabela = document.getElementById(idTabela);
  if (!tabela) return;

  tabela.innerHTML = "";

  if (dados.length === 0) {
    tabela.innerHTML = `
      <tr>
        <td colspan="10" class="empty">Nenhum lançamento encontrado.</td>
      </tr>
    `;
    return;
  }

  dados.slice().reverse().forEach(item => {
    tabela.innerHTML += `
      <tr>
        <td>${item.descricao}</td>
        <td>${item.categoria}</td>

        ${idTabela === "listaTransacoes" ? `
          <td class="${item.tipo === "entrada" ? "tipo-entrada" : "tipo-saida"}">
            ${item.tipo.toUpperCase()}
          </td>
        ` : ""}

        <td class="${item.tipo === "entrada" ? "tipo-entrada" : "tipo-saida"}">
          ${moeda(item.valor)}
        </td>

        <td>${item.data}</td>

        ${comAcao ? `
          <td>
            <button class="btn-delete" onclick="excluirLancamento(${item.id})">
              Excluir
            </button>
          </td>
        ` : ""}
      </tr>
    `;
  });
}

function preencherInputsMetas() {
  document.getElementById("inputMetaFaturamento").placeholder =
    `Meta atual: ${moeda(metas.faturamento)}`;

  document.getElementById("inputMetaCustos").placeholder =
    `Limite atual: ${moeda(metas.custos)}`;

  document.getElementById("inputMetaLucro").placeholder =
    `Meta atual: ${moeda(metas.lucro)}`;
}

function atualizarMetas(entradas, saidas, saldo) {
  const percFaturamento = Math.min((entradas / metas.faturamento) * 100, 100);
  const percCustos = Math.min((saidas / metas.custos) * 100, 100);
  const percLucro = Math.min((saldo / metas.lucro) * 100, 100);

  document.getElementById("textoMetaFaturamento").innerText =
    `Meta: ${moeda(metas.faturamento)}`;

  document.getElementById("textoMetaCustos").innerText =
    `Limite: ${moeda(metas.custos)}`;

  document.getElementById("textoMetaLucro").innerText =
    `Meta: ${moeda(metas.lucro)}`;

  document.getElementById("metaFaturamento").innerText =
    `${percFaturamento.toFixed(0)}%`;

  document.getElementById("barraFaturamento").style.width =
    `${percFaturamento}%`;

  document.getElementById("metaCustos").innerText =
    `${percCustos.toFixed(0)}%`;

  document.getElementById("barraCustos").style.width =
    `${percCustos}%`;

  document.getElementById("metaLucro").innerText =
    `${Math.max(percLucro, 0).toFixed(0)}%`;

  document.getElementById("barraLucro").style.width =
    `${Math.max(percLucro, 0)}%`;
}

function gerarResumoIA() {
  const { dados, entradas, saidas, saldo } = calcularResumo();

  const maiorEntrada = dados
    .filter(item => item.tipo === "entrada")
    .sort((a, b) => b.valor - a.valor)[0];

  const maiorSaida = dados
    .filter(item => item.tipo === "saida")
    .sort((a, b) => b.valor - a.valor)[0];

  let texto = `
    <h4>Análise Inteligente da X4 Company</h4>
    <p>No mês selecionado, a empresa registrou <strong>${moeda(entradas)}</strong> em faturamento.</p>
    <p>As despesas somaram <strong>${moeda(saidas)}</strong>, deixando saldo líquido de <strong>${moeda(saldo)}</strong>.</p>
    <p>Foram registradas <strong>${dados.length}</strong> movimentações financeiras.</p>
  `;

  if (maiorEntrada) {
    texto += `<p>A maior entrada foi <strong>${maiorEntrada.descricao}</strong>, no valor de <strong>${moeda(maiorEntrada.valor)}</strong>.</p>`;
  }

  if (maiorSaida) {
    texto += `<p>A maior saída foi <strong>${maiorSaida.descricao}</strong>, no valor de <strong>${moeda(maiorSaida.valor)}</strong>.</p>`;
  }

  if (saldo > 0) {
    texto += `<p class="positivo">Diagnóstico: a empresa está fechando o mês com resultado positivo.</p>`;
  } else if (saldo < 0) {
    texto += `<p class="negativo">Diagnóstico: a empresa está fechando o mês no negativo. Recomendo revisar despesas.</p>`;
  } else {
    texto += `<p>Diagnóstico: a empresa está empatada no mês.</p>`;
  }

  if (entradas >= metas.faturamento) {
    texto += `<p class="positivo">A meta de faturamento foi atingida ou superada.</p>`;
  } else {
    texto += `<p>Ainda faltam <strong>${moeda(metas.faturamento - entradas)}</strong> para bater a meta de faturamento.</p>`;
  }

  if (saidas > metas.custos) {
    texto += `<p class="negativo">Atenção: as despesas ultrapassaram o limite definido para o mês.</p>`;
  }

  document.getElementById("resumoIA").innerHTML = texto;
}

/* MARKETING / TAREFAS */

function carregarResponsaveis() {
  const select = document.getElementById("tarefaResponsavel");
  if (!select) return;

  select.innerHTML = `<option value="">Selecione o responsável</option>`;

  usuarios
    .filter(user => user.acesso === "MARKETING" || user.acesso === "TODOS" || user.cargo === "ADM")
    .forEach(user => {
      select.innerHTML += `<option value="${user.usuario}">${user.usuario} - ${user.cargo}</option>`;
    });
}

function lerArquivosSelecionados(input) {
  return new Promise(resolve => {
    const arquivos = Array.from(input.files || []);

    if (arquivos.length === 0) {
      resolve([]);
      return;
    }

    const anexos = [];
    let carregados = 0;

    arquivos.forEach(file => {
      const reader = new FileReader();

      reader.onload = function(e) {
        anexos.push({
          nome: file.name,
          tipo: file.type || "documento",
          tamanho: file.size,
          dataUrl: e.target.result
        });

        carregados++;

        if (carregados === arquivos.length) {
          resolve(anexos);
        }
      };

      reader.readAsDataURL(file);
    });
  });
}

async function adicionarTarefa() {
  if (!temAcessoMarketing()) {
    alert("Você não tem acesso ao setor de Marketing/Tarefas.");
    return;
  }

  const titulo = document.getElementById("tarefaTitulo").value.trim();
  const cliente = document.getElementById("tarefaCliente").value.trim();
  const responsavel = document.getElementById("tarefaResponsavel").value;
  const prioridade = document.getElementById("tarefaPrioridade").value;
  const status = document.getElementById("tarefaStatus").value;
  const data = document.getElementById("tarefaData").value;
  const prazo = document.getElementById("tarefaPrazo").value;
  const tempoAcao = document.getElementById("tarefaTempoAcao").value.trim();
  const observacao = document.getElementById("tarefaObservacao").value.trim();
  const inputArquivos = document.getElementById("tarefaArquivos");

  if (!titulo || !responsavel || !prazo) {
    alert("Preencha pelo menos tarefa, responsável e prazo.");
    return;
  }

  const anexos = await lerArquivosSelecionados(inputArquivos);

  tarefas.push({
    id: Date.now(),
    titulo,
    cliente,
    responsavel,
    prioridade,
    status,
    data: data || new Date().toISOString().slice(0, 10),
    prazo,
    tempoAcao,
    observacao,
    anexos,
    criadoPor: usuarioLogado ? usuarioLogado.usuario : "Sistema",
    criadoEm: new Date().toLocaleDateString("pt-BR")
  });

  salvarTarefas();

  document.getElementById("tarefaTitulo").value = "";
  document.getElementById("tarefaCliente").value = "";
  document.getElementById("tarefaResponsavel").value = "";
  document.getElementById("tarefaPrioridade").value = "Baixa";
  document.getElementById("tarefaStatus").value = "Pendente";
  document.getElementById("tarefaData").value = "";
  document.getElementById("tarefaPrazo").value = "";
  document.getElementById("tarefaTempoAcao").value = "";
  document.getElementById("tarefaObservacao").value = "";
  document.getElementById("tarefaArquivos").value = "";

  renderizarTarefas();
  renderizarInbox();
}

function tarefaEstaAtrasada(tarefa) {
  if (tarefa.status === "Concluído") return false;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const prazo = new Date(tarefa.prazo + "T00:00:00");
  return prazo < hoje;
}

function diasAtePrazo(tarefa) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const prazo = new Date(tarefa.prazo + "T00:00:00");
  const diferenca = prazo - hoje;

  return Math.ceil(diferenca / (1000 * 60 * 60 * 24));
}

function textoLembrete(tarefa) {
  if (tarefa.status === "Concluído") {
    return "Concluída";
  }

  const dias = diasAtePrazo(tarefa);

  if (dias < 0) return `Atrasada há ${Math.abs(dias)} dia(s)`;
  if (dias === 0) return "Vence hoje";
  if (dias === 1) return "Vence amanhã";
  if (dias <= 3) return `Vence em ${dias} dias`;

  return "Dentro do prazo";
}

function classeInbox(tarefa) {
  if (tarefa.status === "Concluído") return "inbox-ok";

  const dias = diasAtePrazo(tarefa);

  if (dias < 0) return "inbox-atrasado";
  if (dias === 0) return "inbox-hoje";
  if (dias === 1) return "inbox-amanha";
  if (dias <= 3) return "inbox-breve";

  return "inbox-ok";
}

function classeStatus(tarefa) {
  if (tarefaEstaAtrasada(tarefa)) return "status-atrasado";
  if (tarefa.status === "Pendente") return "status-pendente";
  if (tarefa.status === "Em andamento") return "status-andamento";
  if (tarefa.status === "Aguardando aprovação") return "status-aprovacao";
  if (tarefa.status === "Concluído") return "status-concluido";
  return "status-pendente";
}

function classePrioridade(prioridade) {
  if (prioridade === "Baixa") return "prioridade-baixa";
  if (prioridade === "Média") return "prioridade-media";
  if (prioridade === "Alta") return "prioridade-alta";
  if (prioridade === "Urgente") return "prioridade-urgente";
  return "prioridade-baixa";
}

function formatarData(data) {
  if (!data) return "-";
  const partes = data.split("-");
  if (partes.length !== 3) return data;
  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function iniciais(nome) {
  if (!nome) return "?";
  return nome
    .split(" ")
    .map(parte => parte[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
}

function renderizarAnexos(anexos) {
  if (!anexos || anexos.length === 0) {
    return "-";
  }

  return `
    <div class="anexos-list">
      ${anexos.map((anexo, index) => `
        <span class="anexo-chip" onclick="abrirAnexo('${anexo.dataUrl}')">
          ${iconeAnexo(anexo.tipo)} ${anexo.nome.length > 14 ? anexo.nome.substring(0, 14) + "..." : anexo.nome}
        </span>
      `).join("")}
    </div>
  `;
}

function iconeAnexo(tipo) {
  if (tipo.startsWith("image")) return "🖼️";
  if (tipo.startsWith("video")) return "🎬";
  if (tipo.includes("pdf")) return "📄";
  return "📎";
}

function abrirAnexo(dataUrl) {
  const novaAba = window.open();
  novaAba.document.write(`
    <iframe src="${dataUrl}" style="width:100%;height:100vh;border:none;"></iframe>
  `);
}

function renderizarTarefas() {
  const lista = document.getElementById("listaTarefas");
  if (!lista) return;

  lista.innerHTML = "";

  const pendentes = tarefas.filter(t => t.status === "Pendente" && !tarefaEstaAtrasada(t)).length;
  const andamento = tarefas.filter(t => t.status === "Em andamento" && !tarefaEstaAtrasada(t)).length;
  const atrasadas = tarefas.filter(t => tarefaEstaAtrasada(t)).length;
  const concluidas = tarefas.filter(t => t.status === "Concluído").length;

  document.getElementById("totalTarefasPendentes").innerText = pendentes;
  document.getElementById("totalTarefasAndamento").innerText = andamento;
  document.getElementById("totalTarefasAtrasadas").innerText = atrasadas;
  document.getElementById("totalTarefasConcluidas").innerText = concluidas;

  if (tarefas.length === 0) {
    lista.innerHTML = `
      <tr>
        <td colspan="11" class="empty">Nenhuma tarefa cadastrada.</td>
      </tr>
    `;
    return;
  }

  tarefas.slice().reverse().forEach(tarefa => {
    const statusVisual = tarefaEstaAtrasada(tarefa) ? "Atrasado" : tarefa.status;

    lista.innerHTML += `
      <tr>
        <td>
          <span class="task-title">${tarefa.titulo}</span>
          <span class="task-note">${tarefa.observacao || ""}</span>
        </td>

        <td>${tarefa.cliente || "-"}</td>

        <td>
          <div class="avatar-user">
            <span class="avatar-circle">${iniciais(tarefa.responsavel)}</span>
            <span>${tarefa.responsavel}</span>
          </div>
        </td>

        <td>
          <span class="status ${classeStatus(tarefa)}">${statusVisual}</span>
        </td>

        <td>
          <span class="prioridade ${classePrioridade(tarefa.prioridade)}">${tarefa.prioridade}</span>
        </td>

        <td>${formatarData(tarefa.data)}</td>
        <td>${formatarData(tarefa.prazo)}</td>

        <td>
          <span class="status ${classeStatus(tarefa)}">${textoLembrete(tarefa)}</span>
        </td>

        <td>${tarefa.tempoAcao || "-"}</td>

        <td>${renderizarAnexos(tarefa.anexos)}</td>

        <td>
          <button class="btn-small btn-edit" onclick="mudarStatusTarefa(${tarefa.id}, 'Em andamento')">Andamento</button>
          <button class="btn-small btn-done" onclick="mudarStatusTarefa(${tarefa.id}, 'Concluído')">Concluir</button>
          <button class="btn-small btn-danger" onclick="excluirTarefa(${tarefa.id})">Excluir</button>
        </td>
      </tr>
    `;
  });
}

function renderizarInbox() {
  const lista = document.getElementById("listaInbox");
  if (!lista) return;

  const tarefasAtivas = tarefas
    .filter(tarefa => tarefa.status !== "Concluído")
    .sort((a, b) => new Date(a.prazo) - new Date(b.prazo));

  lista.innerHTML = "";

  const tarefasImportantes = tarefasAtivas.filter(tarefa => {
    const dias = diasAtePrazo(tarefa);
    return dias <= 3;
  });

  if (tarefasImportantes.length === 0) {
    lista.innerHTML = `
      <div class="inbox-card inbox-ok">
        <div class="inbox-dot"></div>
        <div>
          <h4>Nenhum lembrete urgente</h4>
          <p>Não existem tarefas próximas do prazo ou atrasadas neste momento.</p>
        </div>
        <span class="inbox-tag">Tudo certo</span>
      </div>
    `;
    return;
  }

  tarefasImportantes.forEach(tarefa => {
    const classe = classeInbox(tarefa);

    lista.innerHTML += `
      <div class="inbox-card ${classe}">
        <div class="inbox-dot"></div>

        <div>
          <h4>${tarefa.titulo}</h4>
          <p>
            Cliente: <strong>${tarefa.cliente || "-"}</strong> |
            Responsável: <strong>${tarefa.responsavel}</strong> |
            Prazo: <strong>${formatarData(tarefa.prazo)}</strong>
          </p>
        </div>

        <span class="inbox-tag">${textoLembrete(tarefa)}</span>
      </div>
    `;
  });
}

function mudarStatusTarefa(id, novoStatus) {
  const tarefa = tarefas.find(t => t.id === id);
  if (!tarefa) return;

  tarefa.status = novoStatus;
  salvarTarefas();
  renderizarTarefas();
  renderizarInbox();
}

function excluirTarefa(id) {
  if (!confirm("Deseja excluir esta tarefa?")) return;

  tarefas = tarefas.filter(tarefa => tarefa.id !== id);
  salvarTarefas();
  renderizarTarefas();
  renderizarInbox();
}

function gerarResumoTarefas() {
  const total = tarefas.length;
  const pendentes = tarefas.filter(t => t.status === "Pendente" && !tarefaEstaAtrasada(t)).length;
  const andamento = tarefas.filter(t => t.status === "Em andamento" && !tarefaEstaAtrasada(t)).length;
  const atrasadas = tarefas.filter(t => tarefaEstaAtrasada(t)).length;
  const concluidas = tarefas.filter(t => t.status === "Concluído").length;
  const urgentes = tarefas.filter(t => t.prioridade === "Urgente").length;

  let texto = `
    <h4>Análise Inteligente do Marketing</h4>
    <p>O setor possui <strong>${total}</strong> tarefas cadastradas.</p>
    <p><strong>${pendentes}</strong> tarefas estão pendentes, <strong>${andamento}</strong> em andamento e <strong>${concluidas}</strong> concluídas.</p>
  `;

  if (atrasadas > 0) {
    texto += `<p class="negativo">Atenção: existem <strong>${atrasadas}</strong> tarefas atrasadas. Priorize essas demandas imediatamente.</p>`;
  } else {
    texto += `<p class="positivo">Nenhuma tarefa atrasada no momento.</p>`;
  }

  if (urgentes > 0) {
    texto += `<p class="alerta">Existem <strong>${urgentes}</strong> tarefas marcadas como urgentes.</p>`;
  }

  const proximoPrazo = tarefas
    .filter(t => t.status !== "Concluído")
    .sort((a, b) => new Date(a.prazo) - new Date(b.prazo))[0];

  if (proximoPrazo) {
    texto += `<p>Próxima demanda crítica: <strong>${proximoPrazo.titulo}</strong>, responsável: <strong>${proximoPrazo.responsavel}</strong>, prazo: <strong>${formatarData(proximoPrazo.prazo)}</strong>.</p>`;
  }

  document.getElementById("resumoTarefasIA").innerHTML = texto;
}

/* USUÁRIOS */

function criarUsuario() {
  if (!usuarioLogado || usuarioLogado.cargo !== "ADM") {
    alert("Somente ADM pode criar usuários.");
    return;
  }

  const usuario = document.getElementById("novoUsuario").value.trim();
  const senha = document.getElementById("novaSenha").value.trim();
  const cargo = document.getElementById("novoCargo").value;
  const acesso = document.getElementById("novoAcesso").value;

  if (!usuario || !senha) {
    alert("Preencha usuário e senha.");
    return;
  }

  const jaExiste = usuarios.some(
    user => user.usuario.toLowerCase() === usuario.toLowerCase()
  );

  if (jaExiste) {
    alert("Esse usuário já existe.");
    return;
  }

  usuarios.push({
    usuario,
    senha,
    cargo,
    acesso,
    permissoes: cargo === "ADM" ? "TOTAL" : "LIMITADO"
  });

  salvarUsuarios();
  carregarResponsaveis();

  document.getElementById("novoUsuario").value = "";
  document.getElementById("novaSenha").value = "";
  document.getElementById("novoCargo").value = "FUNCIONARIO";
  document.getElementById("novoAcesso").value = "MARKETING";

  renderizarUsuarios();
  alert("Usuário criado com sucesso!");
}

function renderizarUsuarios() {
  const lista = document.getElementById("listaUsuarios");
  if (!lista) return;

  lista.innerHTML = "";

  usuarios.forEach((user, index) => {
    lista.innerHTML += `
      <div class="user-card">
        <h4>${user.usuario}</h4>
        <p>Cargo: ${user.cargo}</p>
        <p>Acesso: ${user.acesso || "TODOS"}</p>
        <p>Permissão: ${user.permissoes || "LIMITADO"}</p>

        ${user.usuario === "Leandro Belfort" ? `
          <small>Usuário principal do sistema</small>
        ` : `
          <button onclick="excluirUsuario(${index})">
            Excluir Usuário
          </button>
        `}
      </div>
    `;
  });
}

function excluirUsuario(index) {
  if (!usuarioLogado || usuarioLogado.cargo !== "ADM") {
    alert("Somente ADM pode excluir usuários.");
    return;
  }

  if (usuarios[index].usuario === "Leandro Belfort") {
    alert("O usuário principal não pode ser excluído.");
    return;
  }

  if (!confirm("Deseja excluir este usuário?")) return;

  usuarios.splice(index, 1);
  salvarUsuarios();
  carregarResponsaveis();
  renderizarUsuarios();
}

/* GRÁFICO */

function criarGrafico(entradas, saidas, saldo) {
  const ctx = document.getElementById("graficoFinanceiro");

  if (!ctx) return;

  if (grafico) {
    grafico.destroy();
  }

  grafico = new Chart(ctx, {
    type: "line",
    data: {
      labels: ["Entradas", "Saídas", "Saldo"],
      datasets: [{
        label: "Financeiro X4",
        data: [entradas, saidas, saldo],
        borderColor: "#00d9ff",
        backgroundColor: "rgba(0,217,255,.18)",
        borderWidth: 4,
        tension: 0.4,
        fill: true,
        pointRadius: 6,
        pointBackgroundColor: "#00d9ff",
        pointBorderColor: "#fff"
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          labels: { color: "#fff" }
        }
      },
      scales: {
        x: {
          ticks: { color: "#8bbce0" },
          grid: { color: "rgba(255,255,255,.06)" }
        },
        y: {
          ticks: { color: "#8bbce0" },
          grid: { color: "rgba(255,255,255,.06)" }
        }
      }
    }
  });
}

filtroMes.addEventListener("change", renderizar);

carregarResponsaveis();
renderizar();
renderizarTarefas();
renderizarInbox();