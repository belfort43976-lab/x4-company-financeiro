/* =========================
   FIREBASE X4 COMPANY
   SISTEMA 100% FINANCEIRO
========================= */

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";

import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
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

let indicadores = {
  faturamentoMes: 0,
  mrr: 0,
  clientesAtivos: 0,
  metaFaturamento: 50000,
  metaLucro: 20000
};

let grafico = null;

let unsubscribeUsuarios = null;
let unsubscribeTransacoes = null;
let unsubscribeFuncionarios = null;
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
    const ref = doc(db, "usuariosFinanceiro", user.id);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      await setDoc(ref, {
        usuario: user.usuario,
        senha: user.senha,
        cargo: user.cargo,
        acesso: user.acesso,
        criadoEm: new Date().toISOString()
      });
    }
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
   FIREBASE LISTENERS
========================= */

function iniciarFirebase() {
  iniciarUsuarios();
  iniciarTransacoes();
  iniciarFuncionarios();
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
    alert("Você tem acesso apenas ao faturamento do mês.");
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
    dashboard: ["Dashboard Financeiro", "Visão geral da X4 Company"],
    entradas: ["Entradas", "Controle de receitas"],
    saidas: ["Saídas", "Controle de despesas"],
    funcionarios: ["Financeiro de Funcionários", "Folha mensal da equipe"],
    metas: ["Metas", "Faturamento, MRR e clientes ativos"],
    relatorios: ["Relatórios", "Resumo financeiro da empresa"],
    ia: ["IA Financeira", "Análise inteligente do financeiro"],
    usuarios: ["Usuários", "Controle de acessos"]
  };

  if (titulos[pagina]) {
    document.getElementById("tituloPagina").innerText = titulos[pagina][0];
    document.getElementById("subtituloPagina").innerText = titulos[pagina][1];
  }

  renderizar();

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
   FINANCEIRO
========================= */

async function adicionarLancamento() {
  if (!ehADM()) {
    alert("Apenas ADM pode lançar entradas e saídas.");
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

function calcularResumo() {
  const dados = dadosDoMes();
  const funcs = funcionariosDoMes();

  const entradas = dados
    .filter(item => item.tipo === "entrada")
    .reduce((total, item) => total + Number(item.valor || 0), 0);

  const saidas = dados
    .filter(item => item.tipo === "saida")
    .reduce((total, item) => total + Number(item.valor || 0), 0);

  const folha = funcs
    .reduce((total, item) => total + Number(item.valor || 0), 0);

  const saldo = entradas - saidas;
  const caixaFinal = saldo - folha;

  return {
    dados,
    funcs,
    entradas,
    saidas,
    folha,
    saldo,
    caixaFinal
  };
}
/* =========================
   RENDERIZAÇÃO PRINCIPAL
========================= */

function renderizar() {
  if (!usuarioLogado) return;

  const {
    dados,
    entradas,
    saidas,
    folha,
    saldo,
    caixaFinal
  } = calcularResumo();

  /* CARDS PRINCIPAIS */

  const cardFaturamentoMes =
    document.getElementById("cardFaturamentoMes");

  const cardMRR =
    document.getElementById("cardMRR");

  const cardClientesAtivos =
    document.getElementById("cardClientesAtivos");

  if (cardFaturamentoMes) {
    cardFaturamentoMes.innerText =
      moeda(indicadores.faturamentoMes || 0);
  }

  if (cardMRR) {
    cardMRR.innerText =
      moeda(indicadores.mrr || 0);
  }

  if (cardClientesAtivos) {
    cardClientesAtivos.innerText =
      indicadores.clientesAtivos || 0;
  }

  /* SOMENTE ADM */

  if (ehADM()) {

    const cardEntradas =
      document.getElementById("cardEntradas");

    const cardSaidas =
      document.getElementById("cardSaidas");

    const cardSaldo =
      document.getElementById("cardSaldo");

    const cardFolha =
      document.getElementById("cardFolha");

    const cardCaixaFinal =
      document.getElementById("cardCaixaFinal");

    if (cardEntradas) {
      cardEntradas.innerText =
        moeda(entradas);
    }

    if (cardSaidas) {
      cardSaidas.innerText =
        moeda(saidas);
    }

    if (cardSaldo) {
      cardSaldo.innerText =
        moeda(saldo);
    }

    if (cardFolha) {
      cardFolha.innerText =
        moeda(folha);
    }

    if (cardCaixaFinal) {
      cardCaixaFinal.innerText =
        moeda(caixaFinal);
    }

    renderizarTabela(
      "listaTransacoes",
      dados,
      true
    );

    renderizarTabela(
      "listaEntradas",
      dados.filter(
        item =>
          item.tipo === "entrada"
      ),
      false
    );

    renderizarTabela(
      "listaSaidas",
      dados.filter(
        item =>
          item.tipo === "saida"
      ),
      false
    );

    atualizarMetas(
      indicadores.faturamentoMes || 0,
      caixaFinal
    );

    criarGrafico(
      entradas,
      saidas,
      folha
    );

    atualizarRelatorios(
      entradas,
      saidas,
      folha,
      caixaFinal,
      dados.length
    );
  }
}

/* =========================
   TABELAS
========================= */

function renderizarTabela(
  idTabela,
  dados,
  mostrarAcao
) {

  const tabela =
    document.getElementById(
      idTabela
    );

  if (!tabela) return;

  tabela.innerHTML = "";

  if (dados.length === 0) {

    tabela.innerHTML = `
      <tr>
        <td colspan="10">
          Nenhum registro encontrado.
        </td>
      </tr>
    `;

    return;
  }

  dados
    .slice()
    .sort(
      (a, b) =>
        new Date(
          b.criadoEm || 0
        ) -
        new Date(
          a.criadoEm || 0
        )
    )
    .forEach(item => {

      tabela.innerHTML += `
        <tr>

          <td>
            ${item.descricao}
          </td>

          <td>
            ${item.categoria}
          </td>

          ${
            mostrarAcao
              ? `
                <td class="${
                  item.tipo === "entrada"
                    ? "tipo-entrada"
                    : "tipo-saida"
                }">
                  ${item.tipo.toUpperCase()}
                </td>
              `
              : ""
          }

          <td class="${
            item.tipo === "entrada"
              ? "tipo-entrada"
              : "tipo-saida"
          }">
            ${moeda(item.valor)}
          </td>

          <td>
            ${item.data}
          </td>

          ${
            mostrarAcao
              ? `
                <td>
                  <button
                    class="btn-small btn-delete"
                    onclick="excluirLancamento('${item.id}')"
                  >
                    Excluir
                  </button>
                </td>
              `
              : ""
          }

        </tr>
      `;
    });
}

/* =========================
   RELATÓRIOS
========================= */

function atualizarRelatorios(
  entradas,
  saidas,
  folha,
  caixaFinal,
  totalTransacoes
) {

  const relFaturamentoMes =
    document.getElementById(
      "relFaturamentoMes"
    );

  const relMRR =
    document.getElementById(
      "relMRR"
    );

  const relClientesAtivos =
    document.getElementById(
      "relClientesAtivos"
    );

  const relEntradas =
    document.getElementById(
      "relEntradas"
    );

  const relSaidas =
    document.getElementById(
      "relSaidas"
    );

  const relFolha =
    document.getElementById(
      "relFolha"
    );

  const relSaldoFinal =
    document.getElementById(
      "relSaldoFinal"
    );

  const relTransacoes =
    document.getElementById(
      "relTransacoes"
    );

  if (relFaturamentoMes) {
    relFaturamentoMes.innerText =
      moeda(
        indicadores.faturamentoMes || 0
      );
  }

  if (relMRR) {
    relMRR.innerText =
      moeda(
        indicadores.mrr || 0
      );
  }

  if (relClientesAtivos) {
    relClientesAtivos.innerText =
      indicadores.clientesAtivos || 0;
  }

  if (relEntradas) {
    relEntradas.innerText =
      moeda(entradas);
  }

  if (relSaidas) {
    relSaidas.innerText =
      moeda(saidas);
  }

  if (relFolha) {
    relFolha.innerText =
      moeda(folha);
  }

  if (relSaldoFinal) {
    relSaldoFinal.innerText =
      moeda(caixaFinal);
  }

  if (relTransacoes) {
    relTransacoes.innerText =
      totalTransacoes;
  }
}
/* =========================
   FINANCEIRO FUNCIONÁRIOS
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

  const totalFolhaFuncionarios = document.getElementById("totalFolhaFuncionarios");
  const totalFuncionarios = document.getElementById("totalFuncionarios");
  const totalFuncionariosPendentes = document.getElementById("totalFuncionariosPendentes");
  const totalFuncionariosPagos = document.getElementById("totalFuncionariosPagos");

  if (totalFolhaFuncionarios) totalFolhaFuncionarios.innerText = moeda(total);
  if (totalFuncionarios) totalFuncionarios.innerText = funcs.length;
  if (totalFuncionariosPendentes) totalFuncionariosPendentes.innerText = pendentes;
  if (totalFuncionariosPagos) totalFuncionariosPagos.innerText = pagos;
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

async function salvarIndicadores() {
  if (!ehADM()) {
    alert("Apenas ADM pode alterar indicadores.");
    return;
  }

  const faturamentoMes = Number(document.getElementById("inputFaturamentoMes").value);
  const mrr = Number(document.getElementById("inputMRR").value);
  const clientesAtivos = Number(document.getElementById("inputClientesAtivos").value);
  const metaFaturamento = Number(document.getElementById("inputMetaFaturamento").value);
  const metaLucro = Number(document.getElementById("inputMetaLucro").value);

  const novosIndicadores = {
    faturamentoMes: faturamentoMes >= 0 ? faturamentoMes : indicadores.faturamentoMes,
    mrr: mrr >= 0 ? mrr : indicadores.mrr,
    clientesAtivos: clientesAtivos >= 0 ? clientesAtivos : indicadores.clientesAtivos,
    metaFaturamento: metaFaturamento > 0 ? metaFaturamento : indicadores.metaFaturamento,
    metaLucro: metaLucro > 0 ? metaLucro : indicadores.metaLucro,
    atualizadoPor: usuarioLogado.usuario,
    atualizadoEm: new Date().toISOString()
  };

  await setDoc(doc(db, "configuracoesFinanceiro", "indicadores"), novosIndicadores, { merge: true });

  document.getElementById("inputFaturamentoMes").value = "";
  document.getElementById("inputMRR").value = "";
  document.getElementById("inputClientesAtivos").value = "";
  document.getElementById("inputMetaFaturamento").value = "";
  document.getElementById("inputMetaLucro").value = "";

  alert("Indicadores salvos com sucesso!");
}

window.salvarIndicadores = salvarIndicadores;

function atualizarMetas(faturamentoMes, lucro) {
  const percFaturamento = indicadores.metaFaturamento > 0
    ? Math.min((faturamentoMes / indicadores.metaFaturamento) * 100, 100)
    : 0;

  const percLucro = indicadores.metaLucro > 0
    ? Math.min((lucro / indicadores.metaLucro) * 100, 100)
    : 0;

  const textoMetaFaturamento = document.getElementById("textoMetaFaturamento");
  const textoMetaLucro = document.getElementById("textoMetaLucro");
  const metaFaturamento = document.getElementById("metaFaturamento");
  const metaLucro = document.getElementById("metaLucro");
  const barraFaturamento = document.getElementById("barraFaturamento");
  const barraLucro = document.getElementById("barraLucro");

  if (textoMetaFaturamento) {
    textoMetaFaturamento.innerText = `Meta: ${moeda(indicadores.metaFaturamento)}`;
  }

  if (textoMetaLucro) {
    textoMetaLucro.innerText = `Meta: ${moeda(indicadores.metaLucro)}`;
  }

  if (metaFaturamento) {
    metaFaturamento.innerText = `${percFaturamento.toFixed(0)}%`;
  }

  if (metaLucro) {
    metaLucro.innerText = `${Math.max(percLucro, 0).toFixed(0)}%`;
  }

  if (barraFaturamento) {
    barraFaturamento.style.width = `${percFaturamento}%`;
  }

  if (barraLucro) {
    barraLucro.style.width = `${Math.max(percLucro, 0)}%`;
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

  const { dados, entradas, saidas, folha, saldo, caixaFinal } = calcularResumo();

  const maiorEntrada = dados
    .filter(item => item.tipo === "entrada")
    .sort((a, b) => Number(b.valor || 0) - Number(a.valor || 0))[0];

  const maiorSaida = dados
    .filter(item => item.tipo === "saida")
    .sort((a, b) => Number(b.valor || 0) - Number(a.valor || 0))[0];

  let texto = `
    <h4>Análise Inteligente da X4 Company</h4>

    <p>O faturamento do mês informado está em <strong>${moeda(indicadores.faturamentoMes)}</strong>.</p>
    <p>A receita recorrente mensal (MRR) está em <strong>${moeda(indicadores.mrr)}</strong>.</p>
    <p>A agência possui <strong>${indicadores.clientesAtivos}</strong> clientes ativos.</p>

    <p>As entradas lançadas somam <strong>${moeda(entradas)}</strong>.</p>
    <p>As saídas lançadas somam <strong>${moeda(saidas)}</strong>.</p>
    <p>A folha de funcionários soma <strong>${moeda(folha)}</strong>.</p>
    <p>O saldo antes da folha é <strong>${moeda(saldo)}</strong>.</p>
    <p>O caixa final após folha é <strong>${moeda(caixaFinal)}</strong>.</p>
  `;

  if (maiorEntrada) {
    texto += `<p>A maior entrada foi <strong>${maiorEntrada.descricao}</strong>, no valor de <strong>${moeda(maiorEntrada.valor)}</strong>.</p>`;
  }

  if (maiorSaida) {
    texto += `<p>A maior saída foi <strong>${maiorSaida.descricao}</strong>, no valor de <strong>${moeda(maiorSaida.valor)}</strong>.</p>`;
  }

  if (caixaFinal > 0) {
    texto += `<p class="positivo">Diagnóstico: a empresa está com caixa final positivo. O cenário financeiro está saudável.</p>`;
  } else if (caixaFinal < 0) {
    texto += `<p class="negativo">Diagnóstico: a empresa está com caixa final negativo. Recomendo revisar custos, folha e despesas fixas.</p>`;
  } else {
    texto += `<p class="alerta">Diagnóstico: a empresa está empatada após considerar a folha.</p>`;
  }

  if (indicadores.faturamentoMes >= indicadores.metaFaturamento) {
    texto += `<p class="positivo">A meta de faturamento foi atingida ou superada.</p>`;
  } else {
    texto += `<p>Ainda faltam <strong>${moeda(indicadores.metaFaturamento - indicadores.faturamentoMes)}</strong> para bater a meta de faturamento.</p>`;
  }

  const ticketMedio = indicadores.clientesAtivos > 0
    ? indicadores.faturamentoMes / indicadores.clientesAtivos
    : 0;

  if (ticketMedio > 0) {
    texto += `<p>Ticket médio aproximado por cliente ativo: <strong>${moeda(ticketMedio)}</strong>.</p>`;
  }

  const box = document.getElementById("resumoIA");

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

  const usuario = document.getElementById("novoUsuario").value.trim();
  const senha = document.getElementById("novaSenha").value.trim();
  const cargo = document.getElementById("novoCargo").value;

  if (!usuario || !senha) {
    alert("Preencha nome e senha.");
    return;
  }

  const id = usuario
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "-");

  await setDoc(doc(db, "usuariosFinanceiro", id), {
    usuario,
    senha,
    cargo,
    acesso: cargo === "ADM" ? "TOTAL" : "VENDAS",
    criadoPor: usuarioLogado.usuario,
    criadoEm: new Date().toISOString()
  }, { merge: true });

  document.getElementById("novoUsuario").value = "";
  document.getElementById("novaSenha").value = "";
  document.getElementById("novoCargo").value = "USUARIO";

  alert("Usuário criado com sucesso!");
}

window.criarUsuario = criarUsuario;

function renderizarUsuarios() {
  const lista = document.getElementById("listaUsuarios");
  if (!lista) return;

  lista.innerHTML = "";

  usuarios.forEach(user => {
    lista.innerHTML += `
      <div class="user-card">
        <h4>${user.usuario}</h4>
        <p>Cargo: <strong>${user.cargo}</strong></p>
        <p>Acesso: <strong>${user.acesso}</strong></p>
        <small>Senha cadastrada: ${user.senha}</small>

        ${user.usuario !== "Leandro Belfort" ? `
          <button class="btn-small btn-delete" onclick="excluirUsuario('${user.id}')">
            Excluir
          </button>
        ` : ""}
      </div>
    `;
  });
}

async function excluirUsuario(id) {
  if (!ehADM()) return;

  if (!confirm("Excluir este usuário?")) return;

  await deleteDoc(doc(db, "usuariosFinanceiro", id));
}

window.excluirUsuario = excluirUsuario;

/* =========================
   GRÁFICO
========================= */

function criarGrafico(entradas, saidas, folha) {
  const canvas = document.getElementById("graficoFinanceiro");

  if (!canvas || typeof Chart === "undefined") return;

  if (grafico) {
    grafico.destroy();
  }

  grafico = new Chart(canvas, {
    type: "bar",
    data: {
      labels: ["Entradas", "Saídas", "Folha"],
      datasets: [{
        label: "Financeiro X4",
        data: [entradas, saidas, folha],
        borderWidth: 1
      }]
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
   EVENTOS FINAIS
========================= */

if (filtroMes) {
  filtroMes.addEventListener("change", () => {
    renderizar();
    renderizarFuncionarios();
  });
}