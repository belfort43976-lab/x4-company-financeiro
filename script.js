/* =========================
   FIREBASE X4 COMPANY
   CEO FINANCIAL SYSTEM
========================= */

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";

import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDQ71KOPfBIrp_HnP7MnpuU65oyp6WN2dc",
  authDomain: "x4-company-sistema.firebaseapp.com",
  projectId: "x4-company-sistema",
  storageBucket: "x4-company-sistema.firebasestorage.app",
  messagingSenderId: "881418431819",
  appId: "1:881418431819:web:081aad75ae3df8c4f74cce",
  measurementId: "G-DXK6FL54HJ"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/* =========================
   ESTADO GLOBAL
========================= */

let usuarioLogado = null;

let usuarios = [];
let transacoes = [];
let funcionarios = [];
let clientes = [];

let indicadores = {
  faturamentoMes: 0,
  metaFaturamento: 50000,
  metaLucro: 20000
};

let grafico = null;

let unsubscribeUsuarios = null;
let unsubscribeTransacoes = null;
let unsubscribeFuncionarios = null;
let unsubscribeClientes = null;
let unsubscribeIndicadores = null;

const filtroMes = document.getElementById("filtroMes");

if (filtroMes) {
  filtroMes.value = new Date().toISOString().slice(0, 7);
}

/* =========================
   USUÁRIOS PADRÃO
========================= */

const usuariosPadrao = [
  {
    id: "admin-leandro",
    usuario: "Leandro Belfort",
    senha: "65031265LLd#",
    cargo: "ADM",
    acesso: "TOTAL"
  },
  {
    id: "admin-luiza",
    usuario: "Luiza",
    senha: "0001",
    cargo: "ADM",
    acesso: "TOTAL"
  },
  {
    id: "user-welen",
    usuario: "Welen",
    senha: "Welen2004",
    cargo: "USUARIO",
    acesso: "VENDAS"
  },
  {
    id: "user-ariel",
    usuario: "Ariel",
    senha: "Cibele",
    cargo: "USUARIO",
    acesso: "VENDAS"
  },
  {
    id: "user-murilo",
    usuario: "Murilo",
    senha: "Manoel2026",
    cargo: "USUARIO",
    acesso: "VENDAS"
  }
];

async function garantirUsuariosPadrao() {
  for (const user of usuariosPadrao) {
    await setDoc(doc(db, "usuariosFinanceiro", user.id), {
      usuario: user.usuario,
      senha: user.senha,
      cargo: user.cargo,
      acesso: user.acesso,
      criadoEm: new Date().toISOString()
    }, { merge: true });
  }
}

garantirUsuariosPadrao();

/* =========================
   HELPERS
========================= */

function moeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function dataAtualBR() {
  return new Date().toLocaleDateString("pt-BR");
}

function mesAtual() {
  return filtroMes ? filtroMes.value : new Date().toISOString().slice(0, 7);
}

function ehADM() {
  return usuarioLogado && usuarioLogado.cargo === "ADM";
}

function ehUsuarioComum() {
  return usuarioLogado && usuarioLogado.cargo === "USUARIO";
}

function dadosDoMes() {
  return transacoes.filter(item => item.mes === mesAtual());
}

function funcionariosDoMes() {
  return funcionarios.filter(item => item.mes === mesAtual());
}

function clientesAtivos() {
  return clientes.filter(cliente => cliente.status === "Ativo");
}

function calcularMRR() {
  return clientesAtivos().reduce((total, cliente) => {
    return total + Number(cliente.valor || 0);
  }, 0);
}

function calcularTicketMedio() {
  const ativos = clientesAtivos().length;

  if (ativos === 0) {
    return 0;
  }

  return calcularMRR() / ativos;
}

function calcularPercentualMeta() {
  const meta = Number(indicadores.metaFaturamento || 0);
  const faturamento = Number(indicadores.faturamentoMes || 0);

  if (meta <= 0) {
    return 0;
  }

  return Math.min((faturamento / meta) * 100, 100);
}

function calcularFaltaMeta() {
  const falta = Number(indicadores.metaFaturamento || 0) - Number(indicadores.faturamentoMes || 0);

  return falta > 0 ? falta : 0;
}

function calcularProjecaoMes() {
  const hoje = new Date();
  const diaAtual = hoje.getDate();
  const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
  const faturamento = Number(indicadores.faturamentoMes || 0);

  if (diaAtual <= 0 || faturamento <= 0) {
    return 0;
  }

  return (faturamento / diaAtual) * ultimoDia;
}
/* =========================
   LOGIN
========================= */

async function fazerLogin() {
  const usuarioDigitado = document.getElementById("loginUsuario").value.trim();
  const senhaDigitada = document.getElementById("loginSenha").value.trim();
  const erro = document.getElementById("loginErro");

  erro.innerText = "";

  if (!usuarioDigitado || !senhaDigitada) {
    erro.innerText = "Preencha usuário e senha.";
    return;
  }

  try {
    const snap = await getDocs(collection(db, "usuariosFinanceiro"));
    let encontrado = null;

    snap.forEach(item => {
      const user = {
        id: item.id,
        ...item.data()
      };

      if (
        user.usuario.toLowerCase() === usuarioDigitado.toLowerCase() &&
        user.senha === senhaDigitada
      ) {
        encontrado = user;
      }
    });

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
    iniciarFirebase();

    abrirPagina("dashboard", document.querySelector("nav button"));

  } catch (error) {
    console.error(error);
    erro.innerText = "Erro ao entrar. Verifique a conexão.";
  }
}

function sairSistema() {
  usuarioLogado = null;

  if (unsubscribeUsuarios) unsubscribeUsuarios();
  if (unsubscribeTransacoes) unsubscribeTransacoes();
  if (unsubscribeFuncionarios) unsubscribeFuncionarios();
  if (unsubscribeClientes) unsubscribeClientes();
  if (unsubscribeIndicadores) unsubscribeIndicadores();

  document.getElementById("loginUsuario").value = "";
  document.getElementById("loginSenha").value = "";
  document.getElementById("loginErro").innerText = "";

  document.getElementById("loginScreen").style.display = "flex";
  document.getElementById("appSistema").style.display = "none";
}

window.fazerLogin = fazerLogin;
window.sairSistema = sairSistema;

/* =========================
   PERMISSÕES
========================= */

function aplicarPermissoes() {
  const app = document.getElementById("appSistema");

  if (ehUsuarioComum()) {
    app.classList.add("usuario-limitado");
  } else {
    app.classList.remove("usuario-limitado");
  }

  document.querySelectorAll(".area-admin").forEach(item => {
    item.style.display = ehADM() ? "block" : "none";
  });

  document.querySelectorAll(".area-admin-card").forEach(item => {
    item.style.display = ehADM() ? "grid" : "none";
  });
}

/* =========================
   FIREBASE TEMPO REAL
========================= */

function iniciarFirebase() {
  iniciarUsuarios();
  iniciarTransacoes();
  iniciarFuncionarios();
  iniciarClientes();
  iniciarIndicadores();
}

function iniciarUsuarios() {
  if (unsubscribeUsuarios) unsubscribeUsuarios();

  unsubscribeUsuarios = onSnapshot(collection(db, "usuariosFinanceiro"), snapshot => {
    usuarios = snapshot.docs.map(item => ({
      id: item.id,
      ...item.data()
    }));

    renderizarUsuarios();
  });
}

function iniciarTransacoes() {
  if (unsubscribeTransacoes) unsubscribeTransacoes();

  unsubscribeTransacoes = onSnapshot(collection(db, "transacoesFinanceiro"), snapshot => {
    transacoes = snapshot.docs.map(item => ({
      id: item.id,
      ...item.data()
    }));

    renderizar();
  });
}

function iniciarFuncionarios() {
  if (unsubscribeFuncionarios) unsubscribeFuncionarios();

  unsubscribeFuncionarios = onSnapshot(collection(db, "funcionariosFinanceiro"), snapshot => {
    funcionarios = snapshot.docs.map(item => ({
      id: item.id,
      ...item.data()
    }));

    renderizar();
    renderizarFuncionarios();
  });
}

function iniciarClientes() {
  if (unsubscribeClientes) unsubscribeClientes();

  unsubscribeClientes = onSnapshot(collection(db, "clientesFinanceiro"), snapshot => {
    clientes = snapshot.docs.map(item => ({
      id: item.id,
      ...item.data()
    }));

    renderizar();
    renderizarClientes();
  });
}

function iniciarIndicadores() {
  if (unsubscribeIndicadores) unsubscribeIndicadores();

  unsubscribeIndicadores = onSnapshot(doc(db, "configuracoesFinanceiro", "indicadores"), snapshot => {
    if (snapshot.exists()) {
      indicadores = {
        ...indicadores,
        ...snapshot.data()
      };
    }

    renderizar();
  });
}
/* =========================
   NAVEGAÇÃO
========================= */

function abrirPagina(pagina, botao) {
  if (!usuarioLogado) return;

  if (!ehADM() && pagina !== "dashboard") {
    alert("Você tem acesso apenas ao faturamento do mês e meta.");
    return;
  }

  document.querySelectorAll(".pagina").forEach(secao => {
    secao.classList.remove("ativa");
  });

  const paginaEl = document.getElementById(pagina);

  if (paginaEl) {
    paginaEl.classList.add("ativa");
  }

  document.querySelectorAll("nav button").forEach(btn => {
    btn.classList.remove("active");
  });

  if (botao) {
    botao.classList.add("active");
  }

  const titulos = {
    dashboard: [
      "Dashboard CEO",
      "Controle financeiro executivo da X4 Company"
    ],
    faturamento: [
      "Faturamento",
      "Análise de vendas, meta e projeção mensal"
    ],
    clientes: [
      "Clientes",
      "Carteira ativa, contratos e MRR automático"
    ],
    funcionarios: [
      "Funcionários",
      "Folha mensal da equipe"
    ],
    lancamentos: [
      "Lançamentos",
      "Faturamento e despesas operacionais"
    ],
    metas: [
      "Metas",
      "Objetivos de lucro e crescimento"
    ],
    ia: [
      "IA Financeira",
      "Diagnóstico inteligente da empresa"
    ],
    usuarios: [
      "Usuários",
      "Controle de permissões do sistema"
    ]
  };

  if (titulos[pagina]) {
    document.getElementById("tituloPagina").innerText = titulos[pagina][0];
    document.getElementById("subtituloPagina").innerText = titulos[pagina][1];
  }

  renderizar();

  if (pagina === "clientes") {
    renderizarClientes();
  }

  if (pagina === "funcionarios") {
    renderizarFuncionarios();
  }

  if (pagina === "usuarios") {
    renderizarUsuarios();
  }

  if (window.innerWidth <= 768) {
    setTimeout(() => {
      const titulo = document.getElementById("tituloPagina");

      if (titulo) {
        titulo.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      }
    }, 120);
  }
}

window.abrirPagina = abrirPagina;

/* =========================
   LANÇAMENTOS
========================= */

async function adicionarLancamento() {
  if (!ehADM()) {
    alert("Apenas ADM pode lançar faturamento e despesas.");
    return;
  }

  const descricao = document.getElementById("descricao").value.trim();
  const tipo = document.getElementById("tipo").value;
  const valor = Number(document.getElementById("valor").value);
  const categoria = document.getElementById("categoria").value;

  if (!descricao || valor <= 0) {
    alert("Preencha descrição e valor corretamente.");
    return;
  }

  await addDoc(collection(db, "transacoesFinanceiro"), {
    descricao,
    tipo,
    valor,
    categoria,
    data: dataAtualBR(),
    mes: mesAtual(),
    criadoPor: usuarioLogado.usuario,
    criadoEm: new Date().toISOString()
  });

  document.getElementById("descricao").value = "";
  document.getElementById("valor").value = "";
  document.getElementById("tipo").value = "entrada";
  document.getElementById("categoria").selectedIndex = 0;
}

window.adicionarLancamento = adicionarLancamento;

async function excluirLancamento(id) {
  if (!ehADM()) {
    alert("Apenas ADM pode excluir lançamentos.");
    return;
  }

  if (!confirm("Deseja excluir este lançamento?")) return;

  await deleteDoc(doc(db, "transacoesFinanceiro", id));
}

window.excluirLancamento = excluirLancamento;

/* =========================
   RESUMO FINANCEIRO
========================= */

function calcularResumo() {
  const dados = dadosDoMes();
  const funcs = funcionariosDoMes();

  const receitasLancadas = dados
    .filter(item => item.tipo === "entrada")
    .reduce((total, item) => total + Number(item.valor || 0), 0);

  const despesas = dados
    .filter(item => item.tipo === "saida")
    .reduce((total, item) => total + Number(item.valor || 0), 0);

  const folha = funcs
    .reduce((total, item) => total + Number(item.valor || 0), 0);

  const saldo = receitasLancadas - despesas;
  const caixaFinal = saldo - folha;

  return {
    dados,
    funcs,
    receitasLancadas,
    despesas,
    folha,
    saldo,
    caixaFinal
  };
}

/* =========================
   RENDER PRINCIPAL
========================= */

function renderizar() {
  if (!usuarioLogado) return;

  const {
    dados,
    receitasLancadas,
    despesas,
    folha,
    saldo,
    caixaFinal
  } = calcularResumo();

  const faturamentoMes = Number(indicadores.faturamentoMes || 0);
  const metaFaturamento = Number(indicadores.metaFaturamento || 0);
  const mrr = calcularMRR();
  const ativos = clientesAtivos().length;
  const percentualMeta = calcularPercentualMeta();
  const faltaMeta = calcularFaltaMeta();
  const ticketMedio = calcularTicketMedio();
  const projecao = calcularProjecaoMes();

  const campos = {
    cardFaturamentoMes: moeda(faturamentoMes),
    cardMetaMes: moeda(metaFaturamento),
    cardMRR: moeda(mrr),
    cardClientesAtivos: ativos,

    cardEntradas: moeda(receitasLancadas),
    cardSaidas: moeda(despesas),
    cardSaldo: moeda(saldo),
    cardFolha: moeda(folha),
    cardCaixaFinal: moeda(caixaFinal),

    radarMeta: `${percentualMeta.toFixed(0)}%`,
    radarFaltaMeta: moeda(faltaMeta),
    radarTicketMedio: moeda(ticketMedio),
    radarProjecao: moeda(projecao),

    detalheFaturamento: moeda(faturamentoMes),
    detalheMeta: moeda(metaFaturamento),
    detalhePercentualMeta: `${percentualMeta.toFixed(0)}%`,
    detalheFaltaMeta: moeda(faltaMeta),

    resumoClientesAtivos: ativos,
    resumoMRR: moeda(mrr),
    resumoTicketMRR: moeda(ticketMedio),

    detalheLucroAtual: moeda(caixaFinal),
    textoMetaLucro: moeda(indicadores.metaLucro || 0)
  };

  Object.entries(campos).forEach(([id, valor]) => {
    const el = document.getElementById(id);
    if (el) {
      el.innerText = valor;
    }
  });

  const cardFaturamentoStatus = document.getElementById("cardFaturamentoStatus");
  const cardMetaStatus = document.getElementById("cardMetaStatus");

  if (cardFaturamentoStatus) {
    cardFaturamentoStatus.innerText =
      `${percentualMeta.toFixed(0)}% da meta atingida`;
  }

  if (cardMetaStatus) {
    cardMetaStatus.innerText =
      faltaMeta > 0
        ? `Faltam ${moeda(faltaMeta)}`
        : "Meta batida";
  }

  if (ehADM()) {
    renderizarTabela("listaTransacoes", dados, true);

    atualizarMetas(faturamentoMes, caixaFinal);
    criarGrafico(receitasLancadas, despesas, folha);
  }
}
/* =========================
   TABELAS
========================= */

function renderizarTabela(idTabela, dados, mostrarAcao) {
  const tabela = document.getElementById(idTabela);
  if (!tabela) return;

  tabela.innerHTML = "";

  if (dados.length === 0) {
    tabela.innerHTML = `
      <tr>
        <td colspan="10">Nenhum registro encontrado.</td>
      </tr>
    `;
    return;
  }

  dados
    .slice()
    .sort((a, b) => new Date(b.criadoEm || 0) - new Date(a.criadoEm || 0))
    .forEach(item => {
      tabela.innerHTML += `
        <tr>
          <td>${item.descricao}</td>
          <td>${item.categoria}</td>

          ${mostrarAcao ? `
            <td class="${item.tipo === "entrada" ? "tipo-entrada" : "tipo-saida"}">
              ${item.tipo === "entrada" ? "FATURAMENTO" : "DESPESA"}
            </td>
          ` : ""}

          <td class="${item.tipo === "entrada" ? "tipo-entrada" : "tipo-saida"}">
            ${moeda(item.valor)}
          </td>

          <td>${item.data}</td>

          ${mostrarAcao ? `
            <td>
              <button class="btn-small btn-delete" onclick="excluirLancamento('${item.id}')">
                Excluir
              </button>
            </td>
          ` : ""}
        </tr>
      `;
    });
}

/* =========================
   CLIENTES / MRR AUTOMÁTICO
========================= */

async function adicionarCliente() {
  if (!ehADM()) {
    alert("Apenas ADM pode cadastrar clientes.");
    return;
  }

  const nome = document.getElementById("clienteNome").value.trim();
  const valor = Number(document.getElementById("clienteValor").value);
  const status = document.getElementById("clienteStatus").value;

  if (!nome || valor <= 0) {
    alert("Preencha nome e valor mensal corretamente.");
    return;
  }

  await addDoc(collection(db, "clientesFinanceiro"), {
    nome,
    valor,
    status,
    criadoPor: usuarioLogado.usuario,
    criadoEm: new Date().toISOString()
  });

  document.getElementById("clienteNome").value = "";
  document.getElementById("clienteValor").value = "";
  document.getElementById("clienteStatus").value = "Ativo";
}

window.adicionarCliente = adicionarCliente;

function renderizarClientes() {
  const tabela = document.getElementById("listaClientes");
  if (!tabela) return;

  tabela.innerHTML = "";

  if (clientes.length === 0) {
    tabela.innerHTML = `
      <tr>
        <td colspan="4">Nenhum cliente cadastrado.</td>
      </tr>
    `;
    return;
  }

  clientes
    .slice()
    .sort((a, b) => String(a.nome).localeCompare(String(b.nome)))
    .forEach(cliente => {
      tabela.innerHTML += `
        <tr>
          <td>${cliente.nome}</td>
          <td>${moeda(cliente.valor)}</td>
          <td class="${cliente.status === "Ativo" ? "status-pago" : "status-pendente"}">
            ${cliente.status}
          </td>
          <td>
            <button class="btn-small btn-edit" onclick="alternarStatusCliente('${cliente.id}', '${cliente.status}')">
              ${cliente.status === "Ativo" ? "Inativar" : "Ativar"}
            </button>

            <button class="btn-small btn-delete" onclick="excluirCliente('${cliente.id}')">
              Excluir
            </button>
          </td>
        </tr>
      `;
    });
}

async function alternarStatusCliente(id, statusAtual) {
  const novoStatus = statusAtual === "Ativo" ? "Inativo" : "Ativo";

  await updateDoc(doc(db, "clientesFinanceiro", id), {
    status: novoStatus,
    atualizadoPor: usuarioLogado.usuario,
    atualizadoEm: new Date().toISOString()
  });
}

window.alternarStatusCliente = alternarStatusCliente;

async function excluirCliente(id) {
  if (!confirm("Excluir este cliente?")) return;

  await deleteDoc(doc(db, "clientesFinanceiro", id));
}

window.excluirCliente = excluirCliente;

/* =========================
   FUNCIONÁRIOS
========================= */

async function adicionarFuncionario() {
  if (!ehADM()) {
    alert("Apenas ADM pode cadastrar funcionários.");
    return;
  }

  const nome = document.getElementById("funcNome").value.trim();
  const cargo = document.getElementById("funcCargo").value.trim();
  const valor = Number(document.getElementById("funcValor").value);
  const dataPagamento = document.getElementById("funcDataPagamento").value;
  const status = document.getElementById("funcStatus").value;

  if (!nome || !cargo || valor <= 0) {
    alert("Preencha nome, cargo e valor corretamente.");
    return;
  }

  await addDoc(collection(db, "funcionariosFinanceiro"), {
    nome,
    cargo,
    valor,
    dataPagamento,
    status,
    mes: mesAtual(),
    criadoPor: usuarioLogado.usuario,
    criadoEm: new Date().toISOString()
  });

  document.getElementById("funcNome").value = "";
  document.getElementById("funcCargo").value = "";
  document.getElementById("funcValor").value = "";
  document.getElementById("funcDataPagamento").value = "";
  document.getElementById("funcStatus").value = "Pendente";
}

window.adicionarFuncionario = adicionarFuncionario;

function renderizarFuncionarios() {
  const tabela = document.getElementById("listaFuncionarios");
  if (!tabela) return;

  const funcs = funcionariosDoMes();

  tabela.innerHTML = "";

  if (funcs.length === 0) {
    tabela.innerHTML = `
      <tr>
        <td colspan="6">Nenhum funcionário cadastrado neste mês.</td>
      </tr>
    `;
    atualizarResumoFuncionarios();
    return;
  }

  funcs
    .slice()
    .sort((a, b) => new Date(b.criadoEm || 0) - new Date(a.criadoEm || 0))
    .forEach(func => {
      tabela.innerHTML += `
        <tr>
          <td>${func.nome}</td>
          <td>${func.cargo}</td>
          <td>${moeda(func.valor)}</td>
          <td>${func.dataPagamento || "-"}</td>
          <td class="${func.status === "Pago" ? "status-pago" : "status-pendente"}">
            ${func.status}
          </td>
          <td>
            <button class="btn-small btn-edit" onclick="alternarStatusFuncionario('${func.id}', '${func.status}')">
              ${func.status === "Pago" ? "Marcar pendente" : "Marcar pago"}
            </button>

            <button class="btn-small btn-delete" onclick="excluirFuncionario('${func.id}')">
              Excluir
            </button>
          </td>
        </tr>
      `;
    });

  atualizarResumoFuncionarios();
}

function atualizarResumoFuncionarios() {
  const funcs = funcionariosDoMes();

  const total = funcs.reduce((acc, f) => acc + Number(f.valor || 0), 0);
  const pendentes = funcs.filter(f => f.status === "Pendente").length;
  const pagos = funcs.filter(f => f.status === "Pago").length;

  const campos = {
    totalFolhaFuncionarios: moeda(total),
    totalFuncionarios: funcs.length,
    totalFuncionariosPendentes: pendentes,
    totalFuncionariosPagos: pagos
  };

  Object.entries(campos).forEach(([id, valor]) => {
    const el = document.getElementById(id);
    if (el) el.innerText = valor;
  });
}
async function alternarStatusFuncionario(id, statusAtual) {
  const novoStatus = statusAtual === "Pago" ? "Pendente" : "Pago";

  await updateDoc(doc(db, "funcionariosFinanceiro", id), {
    status: novoStatus,
    atualizadoPor: usuarioLogado.usuario,
    atualizadoEm: new Date().toISOString()
  });
}

window.alternarStatusFuncionario = alternarStatusFuncionario;

async function excluirFuncionario(id) {
  if (!confirm("Deseja excluir este funcionário?")) return;

  await deleteDoc(doc(db, "funcionariosFinanceiro", id));
}

window.excluirFuncionario = excluirFuncionario;

/* =========================
   INDICADORES / METAS
========================= */

function pegarNumeroDoInput(id, valorAtual) {
  const campo = document.getElementById(id);

  if (!campo) return valorAtual;

  if (campo.value === "") {
    return valorAtual;
  }

  return Number(campo.value);
}

async function salvarIndicadores() {
  if (!ehADM()) {
    alert("Apenas ADM pode alterar indicadores.");
    return;
  }

  const novosIndicadores = {
    faturamentoMes: pegarNumeroDoInput(
      "inputFaturamentoMes",
      indicadores.faturamentoMes
    ),

    metaFaturamento: pegarNumeroDoInput(
      "inputMetaFaturamento",
      indicadores.metaFaturamento
    ),

    metaLucro: pegarNumeroDoInput(
      "inputMetaLucro",
      indicadores.metaLucro
    ),

    atualizadoPor: usuarioLogado.usuario,
    atualizadoEm: new Date().toISOString()
  };

  await setDoc(
    doc(db, "configuracoesFinanceiro", "indicadores"),
    novosIndicadores,
    { merge: true }
  );

  [
    "inputFaturamentoMes",
    "inputMetaFaturamento",
    "inputMetaLucro"
  ].forEach(id => {
    const campo = document.getElementById(id);

    if (campo) {
      campo.value = "";
    }
  });

  alert("Indicadores salvos com sucesso!");
}

window.salvarIndicadores = salvarIndicadores;

function atualizarMetas(faturamentoMes, lucro) {
  const metaFaturamento =
    Number(indicadores.metaFaturamento || 0);

  const metaLucro =
    Number(indicadores.metaLucro || 0);

  const percFaturamento =
    metaFaturamento > 0
      ? Math.min((faturamentoMes / metaFaturamento) * 100, 100)
      : 0;

  const percLucro =
    metaLucro > 0
      ? Math.min((lucro / metaLucro) * 100, 100)
      : 0;

  const barraFaturamento =
    document.getElementById("barraFaturamento");

  const barraLucro =
    document.getElementById("barraLucro");

  const metaLucroTexto =
    document.getElementById("metaLucro");

  if (barraFaturamento) {
    barraFaturamento.style.width = `${percFaturamento}%`;
  }

  if (barraLucro) {
    barraLucro.style.width = `${Math.max(percLucro, 0)}%`;
  }

  if (metaLucroTexto) {
    metaLucroTexto.innerText =
      `${Math.max(percLucro, 0).toFixed(0)}%`;
  }
}

/* =========================
   IA FINANCEIRA
========================= */

function gerarResumoIA() {
  if (!ehADM()) {
    alert("Apenas ADM pode acessar a IA Financeira.");
    return;
  }

  const {
    dados,
    receitasLancadas,
    despesas,
    folha,
    saldo,
    caixaFinal
  } = calcularResumo();

  const faturamentoMes =
    Number(indicadores.faturamentoMes || 0);

  const metaFaturamento =
    Number(indicadores.metaFaturamento || 0);

  const mrr =
    calcularMRR();

  const ativos =
    clientesAtivos().length;

  const percentualMeta =
    calcularPercentualMeta();

  const faltaMeta =
    calcularFaltaMeta();

  const ticketMedio =
    calcularTicketMedio();

  const projecao =
    calcularProjecaoMes();

  const maiorReceita =
    dados
      .filter(item => item.tipo === "entrada")
      .sort((a, b) => Number(b.valor || 0) - Number(a.valor || 0))[0];

  const maiorDespesa =
    dados
      .filter(item => item.tipo === "saida")
      .sort((a, b) => Number(b.valor || 0) - Number(a.valor || 0))[0];

  let texto = `
    <h4>Análise Executiva X4 Company</h4>

    <p>
      O faturamento atual do mês está em
      <strong>${moeda(faturamentoMes)}</strong>.
    </p>

    <p>
      A meta mensal é
      <strong>${moeda(metaFaturamento)}</strong>,
      com
      <strong>${percentualMeta.toFixed(0)}%</strong>
      atingido até agora.
    </p>

    <p>
      Ainda faltam
      <strong>${moeda(faltaMeta)}</strong>
      para bater a meta.
    </p>

    <p>
      O MRR automático da carteira ativa está em
      <strong>${moeda(mrr)}</strong>,
      com
      <strong>${ativos}</strong>
      clientes ativos.
    </p>

    <p>
      O ticket médio mensal por cliente ativo está em
      <strong>${moeda(ticketMedio)}</strong>.
    </p>

    <p>
      A projeção estimada para fechamento do mês é
      <strong>${moeda(projecao)}</strong>.
    </p>

    <p>
      As receitas lançadas somam
      <strong>${moeda(receitasLancadas)}</strong>,
      enquanto as despesas somam
      <strong>${moeda(despesas)}</strong>.
    </p>

    <p>
      A folha de funcionários soma
      <strong>${moeda(folha)}</strong>.
      O caixa final estimado após folha é
      <strong>${moeda(caixaFinal)}</strong>.
    </p>
  `;

  if (maiorReceita) {
    texto += `
      <p>
        A maior receita lançada foi
        <strong>${maiorReceita.descricao}</strong>,
        no valor de
        <strong>${moeda(maiorReceita.valor)}</strong>.
      </p>
    `;
  }

  if (maiorDespesa) {
    texto += `
      <p>
        A maior despesa lançada foi
        <strong>${maiorDespesa.descricao}</strong>,
        no valor de
        <strong>${moeda(maiorDespesa.valor)}</strong>.
      </p>
    `;
  }

  if (percentualMeta >= 100) {
    texto += `
      <p class="positivo">
        Diagnóstico: a meta mensal foi batida. O time está performando acima do objetivo.
      </p>
    `;
  } else if (percentualMeta >= 70) {
    texto += `
      <p class="alerta">
        Diagnóstico: a empresa está próxima da meta. Recomendo intensificar fechamento e follow-up.
      </p>
    `;
  } else {
    texto += `
      <p class="negativo">
        Diagnóstico: o faturamento ainda está distante da meta. É necessário aumentar vendas, reativar leads e acelerar propostas.
      </p>
    `;
  }

  if (caixaFinal > 0) {
    texto += `
      <p class="positivo">
        Caixa final positivo. A operação está financeiramente saudável neste cenário.
      </p>
    `;
  } else if (caixaFinal < 0) {
    texto += `
      <p class="negativo">
        Caixa final negativo. Revise despesas, folha e custos operacionais antes de novos compromissos.
      </p>
    `;
  }

  const box =
    document.getElementById("resumoIA");

  if (box) {
    box.innerHTML = texto;
  }
}

window.gerarResumoIA = gerarResumoIA;

/* =========================
   USUÁRIOS
========================= */

async function criarUsuario() {
  if (!ehADM()) {
    alert("Apenas ADM pode criar usuários.");
    return;
  }

  const usuario =
    document.getElementById("novoUsuario").value.trim();

  const senha =
    document.getElementById("novaSenha").value.trim();

  const cargo =
    document.getElementById("novoCargo").value;

  if (!usuario || !senha) {
    alert("Preencha nome e senha.");
    return;
  }

  const id =
    usuario
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "-");

  await setDoc(
    doc(db, "usuariosFinanceiro", id),
    {
      usuario,
      senha,
      cargo,
      acesso: cargo === "ADM" ? "TOTAL" : "VENDAS",
      criadoPor: usuarioLogado.usuario,
      criadoEm: new Date().toISOString()
    },
    { merge: true }
  );

  document.getElementById("novoUsuario").value = "";
  document.getElementById("novaSenha").value = "";
  document.getElementById("novoCargo").value = "USUARIO";

  alert("Usuário criado com sucesso!");
}

window.criarUsuario = criarUsuario;

function renderizarUsuarios() {
  const lista =
    document.getElementById("listaUsuarios");

  if (!lista) return;

  lista.innerHTML = "";

  usuarios.forEach(user => {
    lista.innerHTML += `
      <div class="user-card">
        <h4>${user.usuario}</h4>

        <p>
          Cargo:
          <strong>${user.cargo}</strong>
        </p>

        <p>
          Acesso:
          <strong>${user.acesso}</strong>
        </p>

        <small>
          Senha cadastrada: ${user.senha}
        </small>

        ${
          user.usuario !== "Leandro Belfort"
            ? `
              <button
                class="btn-small btn-delete"
                onclick="excluirUsuario('${user.id}')"
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

async function excluirUsuario(id) {
  if (!ehADM()) return;

  if (!confirm("Excluir este usuário?")) return;

  await deleteDoc(
    doc(db, "usuariosFinanceiro", id)
  );
}

window.excluirUsuario = excluirUsuario;

/* =========================
   GRÁFICO
========================= */

function criarGrafico(receitas, despesas, folha) {
  const canvas =
    document.getElementById("graficoFinanceiro");

  if (!canvas || typeof Chart === "undefined") return;

  if (grafico) {
    grafico.destroy();
  }

  grafico = new Chart(canvas, {
    type: "bar",

    data: {
      labels: [
        "Receitas",
        "Despesas",
        "Folha"
      ],

      datasets: [
        {
          label: "Financeiro X4",
          data: [
            receitas,
            despesas,
            folha
          ],
          borderWidth: 1
        }
      ]
    },

    options: {
      responsive: true,

      plugins: {
        legend: {
          labels: {
            color: "#fff"
          }
        }
      },

      scales: {
        x: {
          ticks: {
            color: "#8fb8d8"
          }
        },

        y: {
          ticks: {
            color: "#8fb8d8"
          }
        }
      }
    }
  });
}

/* =========================
   EVENTOS
========================= */

if (filtroMes) {
  filtroMes.addEventListener("change", () => {
    renderizar();
    renderizarFuncionarios();
    renderizarClientes();
  });
}