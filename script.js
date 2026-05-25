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

if (filtroMes) {
  filtroMes.value = new Date().toISOString().slice(0, 7);
}

/* =========================
   LOGIN
========================= */

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

/* =========================
   PERMISSÕES
========================= */

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
    area.style.display =
      usuarioLogado && usuarioLogado.cargo === "ADM"
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

/* =========================
   HELPERS
========================= */

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
  if (!filtroMes) return transacoes;
  return transacoes.filter(item => item.mes === filtroMes.value);
}

/* =========================
   NAVEGAÇÃO
========================= */

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

  const paginaElemento = document.getElementById(pagina);
  if (paginaElemento) {
    paginaElemento.classList.add("ativa");
  }

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

  if (window.innerWidth <= 768) {
    setTimeout(() => {
      if (pagina === "tarefas") {
        const formulario = document.querySelector("#tarefas .form-panel");

        if (formulario) {
          formulario.scrollIntoView({
            behavior: "smooth",
            block: "start"
          });
        }
      } else {
        const titulo = document.getElementById("tituloPagina");

        if (titulo) {
          titulo.scrollIntoView({
            behavior: "smooth",
            block: "start"
          });
        }
      }
    }, 150);
  }
}

/* =========================
   FINANCEIRO
========================= */

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
    mes: filtroMes ? filtroMes.value : new Date().toISOString().slice(0, 7),
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

  const totalEntradas = document.getElementById("totalEntradas");
  const totalSaidas = document.getElementById("totalSaidas");
  const saldoAtual = document.getElementById("saldoAtual");
  const caixaAtual = document.getElementById("caixaAtual");

  if (totalEntradas) totalEntradas.innerText = moeda(entradas);
  if (totalSaidas) totalSaidas.innerText = moeda(saidas);
  if (saldoAtual) saldoAtual.innerText = moeda(saldo);
  if (caixaAtual) caixaAtual.innerText = moeda(saldo);

  const caixaEntradas = document.getElementById("caixaEntradas");
  const caixaSaidas = document.getElementById("caixaSaidas");
  const caixaDisponivel = document.getElementById("caixaDisponivel");

  if (caixaEntradas) caixaEntradas.innerText = moeda(entradas);
  if (caixaSaidas) caixaSaidas.innerText = moeda(saidas);
  if (caixaDisponivel) caixaDisponivel.innerText = moeda(saldo);

  const relEntradas = document.getElementById("relEntradas");
  const relSaidas = document.getElementById("relSaidas");
  const relSaldo = document.getElementById("relSaldo");
  const relTransacoes = document.getElementById("relTransacoes");

  if (relEntradas) relEntradas.innerText = moeda(entradas);
  if (relSaidas) relSaidas.innerText = moeda(saidas);
  if (relSaldo) relSaldo.innerText = moeda(saldo);
  if (relTransacoes) relTransacoes.innerText = dados.length;

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
  const metaFat = document.getElementById("inputMetaFaturamento");
  const metaCustos = document.getElementById("inputMetaCustos");
  const metaLucro = document.getElementById("inputMetaLucro");

  if (metaFat) metaFat.placeholder = `Meta atual: ${moeda(metas.faturamento)}`;
  if (metaCustos) metaCustos.placeholder = `Limite atual: ${moeda(metas.custos)}`;
  if (metaLucro) metaLucro.placeholder = `Meta atual: ${moeda(metas.lucro)}`;
}

function atualizarMetas(entradas, saidas, saldo) {
  const percFaturamento = Math.min((entradas / metas.faturamento) * 100, 100);
  const percCustos = Math.min((saidas / metas.custos) * 100, 100);
  const percLucro = Math.min((saldo / metas.lucro) * 100, 100);

  const textoMetaFaturamento = document.getElementById("textoMetaFaturamento");
  const textoMetaCustos = document.getElementById("textoMetaCustos");
  const textoMetaLucro = document.getElementById("textoMetaLucro");

  const metaFaturamento = document.getElementById("metaFaturamento");
  const barraFaturamento = document.getElementById("barraFaturamento");

  const metaCustos = document.getElementById("metaCustos");
  const barraCustos = document.getElementById("barraCustos");

  const metaLucro = document.getElementById("metaLucro");
  const barraLucro = document.getElementById("barraLucro");

  if (textoMetaFaturamento) {
    textoMetaFaturamento.innerText = `Meta: ${moeda(metas.faturamento)}`;
  }

  if (textoMetaCustos) {
    textoMetaCustos.innerText = `Limite: ${moeda(metas.custos)}`;
  }

  if (textoMetaLucro) {
    textoMetaLucro.innerText = `Meta: ${moeda(metas.lucro)}`;
  }

  if (metaFaturamento) {
    metaFaturamento.innerText = `${percFaturamento.toFixed(0)}%`;
  }

  if (barraFaturamento) {
    barraFaturamento.style.width = `${percFaturamento}%`;
  }

  if (metaCustos) {
    metaCustos.innerText = `${percCustos.toFixed(0)}%`;
  }

  if (barraCustos) {
    barraCustos.style.width = `${percCustos}%`;
  }

  if (metaLucro) {
    metaLucro.innerText = `${Math.max(percLucro, 0).toFixed(0)}%`;
  }

  if (barraLucro) {
    barraLucro.style.width = `${Math.max(percLucro, 0)}%`;
  }
}

/* =========================
   IA FINANCEIRA
========================= */

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

    <p>
      No mês selecionado, a empresa registrou
      <strong>${moeda(entradas)}</strong> em faturamento.
    </p>

    <p>
      As despesas somaram
      <strong>${moeda(saidas)}</strong>, deixando saldo líquido de
      <strong>${moeda(saldo)}</strong>.
    </p>

    <p>
      Foram registradas
      <strong>${dados.length}</strong> movimentações financeiras.
    </p>
  `;

  if (maiorEntrada) {
    texto += `
      <p>
        A maior entrada foi <strong>${maiorEntrada.descricao}</strong>,
        no valor de <strong>${moeda(maiorEntrada.valor)}</strong>.
      </p>
    `;
  }

  if (maiorSaida) {
    texto += `
      <p>
        A maior saída foi <strong>${maiorSaida.descricao}</strong>,
        no valor de <strong>${moeda(maiorSaida.valor)}</strong>.
      </p>
    `;
  }

  if (saldo > 0) {
    texto += `
      <p class="positivo">
        Diagnóstico: a empresa está fechando o mês com resultado positivo.
      </p>
    `;
  } else if (saldo < 0) {
    texto += `
      <p class="negativo">
        Diagnóstico: a empresa está fechando o mês no negativo.
        Recomendo revisar despesas, custos fixos e ferramentas.
      </p>
    `;
  } else {
    texto += `
      <p>
        Diagnóstico: a empresa está empatada no mês.
      </p>
    `;
  }

  if (entradas >= metas.faturamento) {
    texto += `
      <p class="positivo">
        A meta de faturamento foi atingida ou superada.
      </p>
    `;
  } else {
    texto += `
      <p>
        Ainda faltam <strong>${moeda(metas.faturamento - entradas)}</strong>
        para bater a meta de faturamento.
      </p>
    `;
  }

  if (saidas > metas.custos) {
    texto += `
      <p class="negativo">
        Atenção: as despesas ultrapassaram o limite definido para o mês.
      </p>
    `;
  }

  const box = document.getElementById("resumoIA");

  if (box) {
    box.innerHTML = texto;
  }
}

/* =========================
   MARKETING / TAREFAS
========================= */

function carregarResponsaveis() {
  const select = document.getElementById("tarefaResponsavel");
  if (!select) return;

  select.innerHTML = `<option value="">Selecione o responsável</option>`;

  usuarios
    .filter(user =>
      user.acesso === "MARKETING" ||
      user.acesso === "TODOS" ||
      user.cargo === "ADM"
    )
    .forEach(user => {
      select.innerHTML += `
        <option value="${user.usuario}">
          ${user.usuario} - ${user.cargo}
        </option>
      `;
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

  if (inputArquivos) {
    inputArquivos.value = "";
  }

  renderizarTarefas();
  renderizarInbox();
}
function renderizarTarefas() {
  const tabela = document.getElementById("listaTarefas");
  if (!tabela) return;

  tabela.innerHTML = "";

  const pendente = tarefas.filter(t => t.status === "Pendente").length;
  const andamento = tarefas.filter(t => t.status === "Em andamento").length;
  const atrasadas = tarefas.filter(t =>
    new Date(t.prazo) < new Date() &&
    t.status !== "Concluído"
  ).length;
  const concluidas = tarefas.filter(t => t.status === "Concluído").length;

  const cardPendente = document.getElementById("cardPendente");
  const cardAndamento = document.getElementById("cardAndamento");
  const cardAtrasadas = document.getElementById("cardAtrasadas");
  const cardConcluidas = document.getElementById("cardConcluidas");

  if (cardPendente) cardPendente.innerText = pendente;
  if (cardAndamento) cardAndamento.innerText = andamento;
  if (cardAtrasadas) cardAtrasadas.innerText = atrasadas;
  if (cardConcluidas) cardConcluidas.innerText = concluidas;

  if (tarefas.length === 0) {
    tabela.innerHTML = `
      <tr>
        <td colspan="20">
          Nenhuma tarefa cadastrada.
        </td>
      </tr>
    `;
    return;
  }

  tarefas
    .slice()
    .reverse()
    .forEach(tarefa => {

      const iniciais = tarefa.responsavel
        ? tarefa.responsavel
            .split(" ")
            .map(n => n[0])
            .join("")
            .slice(0, 2)
            .toUpperCase()
        : "--";

      const anexosHtml =
        tarefa.anexos && tarefa.anexos.length > 0
          ? `
            <div class="anexos-list">
              ${tarefa.anexos.map((arquivo, index) => `
                <span
                  class="anexo-chip"
                  onclick="abrirAnexo(${tarefa.id}, ${index})"
                >
                  📎 ${arquivo.nome}
                </span>
              `).join("")}
            </div>
          `
          : "Sem anexos";

      tabela.innerHTML += `
        <tr>

          <td>
            <strong class="task-title">
              ${tarefa.titulo}
            </strong>

            <span class="task-note">
              ${tarefa.observacao || "Sem observação"}
            </span>
          </td>

          <td>
            ${tarefa.cliente || "-"}
          </td>

          <td>
            <div class="avatar-user">
              <div class="avatar-circle">
                ${iniciais}
              </div>

              ${tarefa.responsavel}
            </div>
          </td>

          <td>
            <span class="prioridade prioridade-${tarefa.prioridade.toLowerCase()}">
              ${tarefa.prioridade}
            </span>
          </td>

          <td>
            <span class="status status-${tarefa.status.toLowerCase().replace(" ", "-")}">
              ${tarefa.status}
            </span>
          </td>

          <td>
            ${tarefa.data || "-"}
          </td>

          <td>
            ${tarefa.prazo}
          </td>

          <td>
            ${tarefa.tempoAcao || "-"}
          </td>

          <td>
            ${anexosHtml}
          </td>

          <td>
            <button
              class="btn-small btn-done"
              onclick="concluirTarefa(${tarefa.id})"
            >
              Concluir
            </button>

            <button
              class="btn-small btn-delete"
              onclick="excluirTarefa(${tarefa.id})"
            >
              Excluir
            </button>
          </td>

        </tr>
      `;
    });
}

function concluirTarefa(id) {
  const tarefa = tarefas.find(t => t.id === id);

  if (!tarefa) return;

  tarefa.status = "Concluído";

  salvarTarefas();
  renderizarTarefas();
  renderizarInbox();
}

function excluirTarefa(id) {
  if (
    !usuarioLogado ||
    usuarioLogado.cargo !== "ADM"
  ) {
    alert("Apenas ADM pode excluir tarefas.");
    return;
  }

  if (!confirm("Deseja excluir esta tarefa?")) return;

  tarefas = tarefas.filter(t => t.id !== id);

  salvarTarefas();
  renderizarTarefas();
  renderizarInbox();
}

function abrirAnexo(tarefaId, indexArquivo) {
  const tarefa = tarefas.find(t => t.id === tarefaId);

  if (!tarefa) return;

  const arquivo = tarefa.anexos[indexArquivo];

  if (!arquivo) return;

  window.open(arquivo.dataUrl, "_blank");
}

/* =========================
   INBOX / LEMBRETES
========================= */

function renderizarInbox() {
  const lista = document.getElementById("listaInbox");
  if (!lista) return;

  lista.innerHTML = "";

  const hoje = new Date();

  const tarefasPendentes = tarefas.filter(
    t => t.status !== "Concluído"
  );

  if (tarefasPendentes.length === 0) {
    lista.innerHTML = `
      <div class="inbox-card inbox-ok">
        <div class="inbox-dot"></div>

        <div>
          <h4>
            Nenhuma pendência
          </h4>

          <p>
            Tudo certo por aqui 😎
          </p>
        </div>
      </div>
    `;

    return;
  }

  tarefasPendentes.forEach(tarefa => {

    const prazo = new Date(tarefa.prazo);
    const diff = Math.ceil(
      (prazo - hoje) / (1000 * 60 * 60 * 24)
    );

    let classe = "inbox-breve";
    let tag = "Próximo";

    if (diff < 0) {
      classe = "inbox-atrasado";
      tag = "Atrasado";
    } else if (diff === 0) {
      classe = "inbox-hoje";
      tag = "Hoje";
    } else if (diff === 1) {
      classe = "inbox-amanha";
      tag = "Amanhã";
    }

    lista.innerHTML += `
      <div class="inbox-card ${classe}">
        <div class="inbox-dot"></div>

        <div>
          <h4>
            ${tarefa.titulo}
          </h4>

          <p>
            Responsável:
            <strong>${tarefa.responsavel}</strong>
          </p>

          <p>
            Prazo:
            <strong>${tarefa.prazo}</strong>
          </p>
        </div>

        <span class="inbox-tag">
          ${tag}
        </span>
      </div>
    `;
  });
}

/* =========================
   USUÁRIOS
========================= */

function adicionarUsuario() {
  if (
    !usuarioLogado ||
    usuarioLogado.cargo !== "ADM"
  ) {
    alert("Apenas ADM pode criar usuários.");
    return;
  }

  const nome =
    document.getElementById("novoUsuario").value.trim();

  const senha =
    document.getElementById("novaSenha").value.trim();

  const cargo =
    document.getElementById("novoCargo").value;

  const acesso =
    document.getElementById("novoAcesso").value;

  if (!nome || !senha) {
    alert("Preencha nome e senha.");
    return;
  }

  usuarios.push({
    usuario: nome,
    senha,
    cargo,
    acesso,
    permissoes:
      cargo === "ADM" ? "TOTAL" : acesso
  });

  salvarUsuarios();

  document.getElementById("novoUsuario").value = "";
  document.getElementById("novaSenha").value = "";

  carregarResponsaveis();
  renderizarUsuarios();

  alert("Usuário criado!");
}

function renderizarUsuarios() {
  const lista = document.getElementById("listaUsuarios");
  if (!lista) return;

  lista.innerHTML = "";

  usuarios.forEach((user, index) => {
    lista.innerHTML += `
      <div class="user-card">

        <h4>
          ${user.usuario}
        </h4>

        <p>
          Cargo:
          <strong>${user.cargo}</strong>
        </p>

        <small>
          Acesso:
          ${user.acesso}
        </small>

        ${
          user.usuario !== "Leandro Belfort"
            ? `
              <button
                class="btn-delete"
                onclick="excluirUsuario(${index})"
              >
                Excluir
              </button>
            `
            : ""
        }

      </div>
    `;
  });
}

function excluirUsuario(index) {
  if (!confirm("Excluir usuário?")) return;

  usuarios.splice(index, 1);

  salvarUsuarios();
  renderizarUsuarios();
  carregarResponsaveis();
}

/* =========================
   GRÁFICO
========================= */

function criarGrafico(
  entradas,
  saidas,
  saldo
) {
  const canvas =
    document.getElementById("graficoFinanceiro");

  if (!canvas || typeof Chart === "undefined") return;

  const ctx = canvas.getContext("2d");

  if (grafico) {
    grafico.destroy();
  }

  grafico = new Chart(ctx, {
    type: "bar",
    data: {
      labels: [
        "Entradas",
        "Saídas",
        "Saldo"
      ],
      datasets: [
        {
          label: "Financeiro",
          data: [
            entradas,
            saidas,
            saldo
          ],
          borderWidth: 1
        }
      ]
    },
    options: {
      responsive: true
    }
  });
}

/* =========================
   EVENTOS
========================= */

if (filtroMes) {
  filtroMes.addEventListener(
    "change",
    () => {
      renderizar();
      gerarResumoIA();
    }
  );
}

/* IA AUTOMATICA */
setTimeout(() => {
  gerarResumoIA();
}, 800);