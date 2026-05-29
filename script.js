/* =========================
   FIREBASE X4 COMPANY
========================= */

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";

import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";

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
  onSnapshot,
  query,
  orderBy
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
const auth = getAuth(app);
const db = getFirestore(app);

/* =========================
   ESTADO GLOBAL
========================= */

let usuarioLogado = null;
let usuarios = [];
let transacoes = [];
let tarefas = [];

let metas = {
  faturamento: 50000,
  custos: 15000,
  lucro: 20000,
  faturamentoEmpresa: 0,
  clientesAtivos: 0
};

let grafico = null;
let unsubscribeUsuarios = null;
let unsubscribeTransacoes = null;
let unsubscribeTarefas = null;
let unsubscribeMetas = null;

const filtroMes = document.getElementById("filtroMes");

if (filtroMes) {
  filtroMes.value = new Date().toISOString().slice(0, 7);
}

/* =========================
   PRIMEIRO ACESSO ADM
========================= */

 garantirAdminInicial() {
  const async functionadminRef = doc(db, "usuarios", "admin-leandro-belfort");
  const adminSnap = await getDoc(adminRef);

  if (!adminSnap.exists()) {
    await setDoc(adminRef, {
      usuario: "Leandro Belfort",
      email: "admin@x4company.com",
      senhaVisual: "65031265LLd#",
      cargo: "ADM",
      acesso: "TODOS",
      permissoes: "TOTAL",
      criadoEm: new Date().toISOString()
    });
  }
}

garantirAdminInicial();

/* =========================
   LOGIN
========================= */

async function fazerLogin() {
  const usuarioDigitado = document.getElementById("loginUsuario").value.trim();
  const senha = document.getElementById("loginSenha").value.trim();
  const erro = document.getElementById("loginErro");

  erro.innerText = "";

  if (!usuarioDigitado || !senha) {
    erro.innerText = "Preencha usuário e senha.";
    return;
  }

  try {
    const usuariosSnap = await getDocs(collection(db, "usuarios"));

    let usuarioEncontrado = null;

    usuariosSnap.forEach(item => {
      const user = {
        id: item.id,
        ...item.data()
      };

      const mesmoNome =
        user.usuario &&
        user.usuario.toLowerCase() === usuarioDigitado.toLowerCase();

      const mesmoEmail =
        user.email &&
        user.email.toLowerCase() === usuarioDigitado.toLowerCase();

      if (mesmoNome || mesmoEmail) {
        usuarioEncontrado = user;
      }
    });

    if (!usuarioEncontrado) {
      erro.innerText = "Usuário não encontrado.";
      return;
    }

    const emailLogin = usuarioEncontrado.email || gerarEmailSistema(usuarioEncontrado.usuario);

    try {
      await signInWithEmailAndPassword(auth, emailLogin, senha);
    } catch (firebaseError) {
      if (usuarioEncontrado.usuario === "Leandro Belfort" && senha === "65031265LLd#") {
        try {
          await createUserWithEmailAndPassword(auth, "admin@x4company.com", "65031265LLd#");
        } catch (createError) {}
        await signInWithEmailAndPassword(auth, "admin@x4company.com", "65031265LLd#");
      } else {
        erro.innerText = "Usuário ou senha incorretos.";
        return;
      }
    }

    usuarioLogado = usuarioEncontrado;

    document.getElementById("loginScreen").style.display = "none";
    document.getElementById("appSistema").style.display = "flex";

    document.getElementById("usuarioCargo").innerText =
      `${usuarioLogado.usuario} (${usuarioLogado.cargo})`;

    aplicarPermissoes();
    iniciarListenersFirebase();

    if (usuarioLogado.acesso === "MARKETING") {
      abrirPagina("tarefas", document.querySelector(".menu-marketing"));
    } else {
      abrirPagina("dashboard", document.querySelector(".menu-financeiro"));
    }

  } catch (error) {
    erro.innerText = "Erro ao entrar. Verifique conexão e dados.";
    console.error(error);
  }
}

async function sairSistema() {
  usuarioLogado = null;

  if (unsubscribeUsuarios) unsubscribeUsuarios();
  if (unsubscribeTransacoes) unsubscribeTransacoes();
  if (unsubscribeTarefas) unsubscribeTarefas();
  if (unsubscribeMetas) unsubscribeMetas();

  try {
    await signOut(auth);
  } catch (error) {}

  document.getElementById("loginUsuario").value = "";
  document.getElementById("loginSenha").value = "";
  document.getElementById("loginErro").innerText = "";

  document.getElementById("loginScreen").style.display = "flex";
  document.getElementById("appSistema").style.display = "none";
}

/* =========================
   FUNÇÕES GLOBAIS PARA HTML
========================= */

window.fazerLogin = fazerLogin;
window.sairSistema = sairSistema;

/* =========================
   HELPERS
========================= */

function gerarEmailSistema(nome) {
  return nome
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, ".")
    .replace(/\.+/g, ".")
    .replace(/^\.|\.$/g, "") + "@x4company.com";
}

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

function dadosDoMes() {
  return transacoes.filter(item => item.mes === mesAtual());
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

function ehADM() {
  return usuarioLogado && usuarioLogado.cargo === "ADM";
}

/* =========================
   PERMISSÕES
========================= */

function aplicarPermissoes() {
  document.querySelectorAll(".area-admin").forEach(area => {
    area.style.display = ehADM() ? "block" : "none";
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
   LISTENERS FIREBASE
========================= */

function iniciarListenersFirebase() {
  iniciarUsuarios();
  iniciarTransacoes();
  iniciarTarefas();
  iniciarMetas();
}

function iniciarUsuarios() {
  if (unsubscribeUsuarios) unsubscribeUsuarios();

  unsubscribeUsuarios = onSnapshot(collection(db, "usuarios"), snapshot => {
    usuarios = snapshot.docs.map(item => ({
      id: item.id,
      ...item.data()
    }));

    carregarResponsaveis();
    renderizarUsuarios();
  });
}

function iniciarTransacoes() {
  if (unsubscribeTransacoes) unsubscribeTransacoes();

  unsubscribeTransacoes = onSnapshot(collection(db, "transacoes"), snapshot => {
    transacoes = snapshot.docs.map(item => ({
      id: item.id,
      ...item.data()
    }));

    renderizar();
  });
}

function iniciarTarefas() {
  if (unsubscribeTarefas) unsubscribeTarefas();

  unsubscribeTarefas = onSnapshot(collection(db, "tarefas"), snapshot => {
    tarefas = snapshot.docs.map(item => ({
      id: item.id,
      ...item.data()
    }));

    renderizarTarefas();
    renderizarInbox();
  });
}

function iniciarMetas() {
  if (unsubscribeMetas) unsubscribeMetas();

  const metaRef = doc(db, "configuracoes", "metas");

  unsubscribeMetas = onSnapshot(metaRef, snapshot => {
    if (snapshot.exists()) {
      metas = {
        ...metas,
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

  if (pagina === "usuarios" && !ehADM()) {
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

  if (titulos[pagina]) {
    document.getElementById("tituloPagina").innerText = titulos[pagina][0];
    document.getElementById("subtituloPagina").innerText = titulos[pagina][1];
  }

  const cardsFinanceiro = document.querySelector(".cards-financeiro");
  const indicadoresEmpresa = document.querySelector(".indicadores-empresa");

  const paginaFinanceira =
    ["dashboard", "entradas", "saidas", "caixa", "metas", "relatorios", "categorias", "ia"].includes(pagina);

  if (cardsFinanceiro) {
    cardsFinanceiro.style.display = paginaFinanceira && temAcessoFinanceiro()
      ? "grid"
      : "none";
  }

  if (indicadoresEmpresa) {
    indicadoresEmpresa.style.display = paginaFinanceira && temAcessoFinanceiro()
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

window.abrirPagina = abrirPagina;

/* =========================
   FINANCEIRO
========================= */

async function criarUsuario() {
  if (!ehADM()) {
    alert("Apenas ADM pode criar usuários.");
    return;
  }

  const usuario = document.getElementById("novoUsuario").value.trim();
  const senha = document.getElementById("novaSenha").value.trim();
  const cargo = document.getElementById("novoCargo").value;
  const acesso = document.getElementById("novoAcesso").value;

  if (!usuario || !senha) {
    alert("Preencha nome e senha.");
    return;
  }

  if (senha.length < 6) {
    alert("A senha precisa ter pelo menos 6 caracteres.");
    return;
  }

  const email = gerarEmailSistema(usuario);

  try {
    await createUserWithEmailAndPassword(auth, email, senha);

    await addDoc(collection(db, "usuarios"), {
      usuario,
      email,
      senhaVisual: senha,
      cargo,
      acesso,
      permissoes: acesso === "TODOS" ? "TOTAL" : acesso,
      criadoPor: usuarioLogado.usuario,
      criadoEm: new Date().toISOString()
    });

    document.getElementById("novoUsuario").value = "";
    document.getElementById("novaSenha").value = "";

    alert("Usuário criado com sucesso!");

  } catch (error) {
    console.error("Erro ao criar usuário:", error);
    alert("Erro ao criar usuário: " + error.message);
  }
}

window.criarUsuario = criarUsuario;

function calcularResumo() {
  const dados = dadosDoMes();

  const entradas = dados
    .filter(item => item.tipo === "entrada")
    .reduce((total, item) => total + Number(item.valor || 0), 0);

  const saidas = dados
    .filter(item => item.tipo === "saida")
    .reduce((total, item) => total + Number(item.valor || 0), 0);

  const saldo = entradas - saidas;

  return {
    dados,
    entradas,
    saidas,
    saldo
  };
}

function renderizar() {
  if (!usuarioLogado) return;

  if (!temAcessoFinanceiro()) return;

  const { dados, entradas, saidas, saldo } = calcularResumo();

  const totalEntradas = document.getElementById("totalEntradas");
  const totalSaidas = document.getElementById("totalSaidas");
  const saldoAtual = document.getElementById("saldoAtual");
  const caixaAtual = document.getElementById("caixaAtual");

  if (totalEntradas) totalEntradas.innerText = moeda(entradas);
  if (totalSaidas) totalSaidas.innerText = moeda(saidas);
  if (saldoAtual) saldoAtual.innerText = moeda(saldo);
  if (caixaAtual) caixaAtual.innerText = moeda(saldo);

  const faturamentoEmpresaMes = document.getElementById("faturamentoEmpresaMes");
  const clientesAtivosEmpresa = document.getElementById("clientesAtivosEmpresa");

  if (faturamentoEmpresaMes) {
    faturamentoEmpresaMes.innerText = moeda(metas.faturamentoEmpresa || 0);
  }

  if (clientesAtivosEmpresa) {
    clientesAtivosEmpresa.innerText = metas.clientesAtivos || 0;
  }

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
  const relFaturamentoEmpresa = document.getElementById("relFaturamentoEmpresa");
  const relClientesAtivos = document.getElementById("relClientesAtivos");

  if (relEntradas) relEntradas.innerText = moeda(entradas);
  if (relSaidas) relSaidas.innerText = moeda(saidas);
  if (relSaldo) relSaldo.innerText = moeda(saldo);
  if (relTransacoes) relTransacoes.innerText = dados.length;
  if (relFaturamentoEmpresa) relFaturamentoEmpresa.innerText = moeda(metas.faturamentoEmpresa || 0);
  if (relClientesAtivos) relClientesAtivos.innerText = metas.clientesAtivos || 0;

  const indicadorFaturamentoEmpresa = document.getElementById("indicadorFaturamentoEmpresa");
  const indicadorClientesAtivos = document.getElementById("indicadorClientesAtivos");

  if (indicadorFaturamentoEmpresa) {
    indicadorFaturamentoEmpresa.innerText = moeda(metas.faturamentoEmpresa || 0);
  }

  if (indicadorClientesAtivos) {
    indicadorClientesAtivos.innerText = metas.clientesAtivos || 0;
  }

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

  dados
    .slice()
    .sort((a, b) => new Date(b.criadoEm || 0) - new Date(a.criadoEm || 0))
    .forEach(item => {
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

          <td>${item.data || "-"}</td>

          ${comAcao ? `
            <td>
              <button class="btn-delete btn-small" onclick="excluirLancamento('${item.id}')">
                Excluir
              </button>
            </td>
          ` : ""}
        </tr>
      `;
    });
}

/* =========================
   METAS E INDICADORES
========================= */

async function salvarMetas() {
  if (!ehADM()) {
    alert("Apenas ADM pode alterar metas.");
    return;
  }

  const faturamento = Number(document.getElementById("inputMetaFaturamento").value);
  const custos = Number(document.getElementById("inputMetaCustos").value);
  const lucro = Number(document.getElementById("inputMetaLucro").value);

  const faturamentoEmpresa = Number(document.getElementById("inputFaturamentoEmpresa").value);
  const clientesAtivos = Number(document.getElementById("inputClientesAtivos").value);

  const novasMetas = {
    faturamento: faturamento > 0 ? faturamento : metas.faturamento,
    custos: custos > 0 ? custos : metas.custos,
    lucro: lucro > 0 ? lucro : metas.lucro,
    faturamentoEmpresa: faturamentoEmpresa >= 0 ? faturamentoEmpresa : metas.faturamentoEmpresa,
    clientesAtivos: clientesAtivos >= 0 ? clientesAtivos : metas.clientesAtivos,
    atualizadoPor: usuarioLogado.usuario,
    atualizadoEm: new Date().toISOString()
  };

  await setDoc(doc(db, "configuracoes", "metas"), novasMetas, { merge: true });

  document.getElementById("inputMetaFaturamento").value = "";
  document.getElementById("inputMetaCustos").value = "";
  document.getElementById("inputMetaLucro").value = "";
  document.getElementById("inputFaturamentoEmpresa").value = "";
  document.getElementById("inputClientesAtivos").value = "";

  alert("Metas e indicadores salvos com sucesso!");
}

window.salvarMetas = salvarMetas;

function preencherInputsMetas() {
  const metaFat = document.getElementById("inputMetaFaturamento");
  const metaCustos = document.getElementById("inputMetaCustos");
  const metaLucro = document.getElementById("inputMetaLucro");
  const fatEmpresa = document.getElementById("inputFaturamentoEmpresa");
  const clientes = document.getElementById("inputClientesAtivos");

  if (metaFat) metaFat.placeholder = `Meta atual: ${moeda(metas.faturamento)}`;
  if (metaCustos) metaCustos.placeholder = `Limite atual: ${moeda(metas.custos)}`;
  if (metaLucro) metaLucro.placeholder = `Meta atual: ${moeda(metas.lucro)}`;
  if (fatEmpresa) fatEmpresa.placeholder = `Atual: ${moeda(metas.faturamentoEmpresa || 0)}`;
  if (clientes) clientes.placeholder = `Atual: ${metas.clientesAtivos || 0} clientes`;
}

function atualizarMetas(entradas, saidas, saldo) {
  const percFaturamento = metas.faturamento > 0
    ? Math.min((entradas / metas.faturamento) * 100, 100)
    : 0;

  const percCustos = metas.custos > 0
    ? Math.min((saidas / metas.custos) * 100, 100)
    : 0;

  const percLucro = metas.lucro > 0
    ? Math.min((saldo / metas.lucro) * 100, 100)
    : 0;

  const textoMetaFaturamento = document.getElementById("textoMetaFaturamento");
  const textoMetaCustos = document.getElementById("textoMetaCustos");
  const textoMetaLucro = document.getElementById("textoMetaLucro");

  const metaFaturamento = document.getElementById("metaFaturamento");
  const barraFaturamento = document.getElementById("barraFaturamento");

  const metaCustos = document.getElementById("metaCustos");
  const barraCustos = document.getElementById("barraCustos");

  const metaLucro = document.getElementById("metaLucro");
  const barraLucro = document.getElementById("barraLucro");

  if (textoMetaFaturamento) textoMetaFaturamento.innerText = `Meta: ${moeda(metas.faturamento)}`;
  if (textoMetaCustos) textoMetaCustos.innerText = `Limite: ${moeda(metas.custos)}`;
  if (textoMetaLucro) textoMetaLucro.innerText = `Meta: ${moeda(metas.lucro)}`;

  if (metaFaturamento) metaFaturamento.innerText = `${percFaturamento.toFixed(0)}%`;
  if (barraFaturamento) barraFaturamento.style.width = `${percFaturamento}%`;

  if (metaCustos) metaCustos.innerText = `${percCustos.toFixed(0)}%`;
  if (barraCustos) barraCustos.style.width = `${percCustos}%`;

  if (metaLucro) metaLucro.innerText = `${Math.max(percLucro, 0).toFixed(0)}%`;
  if (barraLucro) barraLucro.style.width = `${Math.max(percLucro, 0)}%`;
}
/* =========================
   IA FINANCEIRA
========================= */

function gerarResumoIA() {
  if (!temAcessoFinanceiro()) return;

  const { dados, entradas, saidas, saldo } = calcularResumo();

  const maiorEntrada = dados
    .filter(item => item.tipo === "entrada")
    .sort((a, b) => Number(b.valor || 0) - Number(a.valor || 0))[0];

  const maiorSaida = dados
    .filter(item => item.tipo === "saida")
    .sort((a, b) => Number(b.valor || 0) - Number(a.valor || 0))[0];

  let texto = `
    <h4>Análise Inteligente da X4 Company</h4>

    <p>
      No mês selecionado, a empresa registrou
      <strong>${moeda(entradas)}</strong> em entradas financeiras.
    </p>

    <p>
      O faturamento mensal informado da empresa está em
      <strong>${moeda(metas.faturamentoEmpresa || 0)}</strong>.
    </p>

    <p>
      A agência possui atualmente
      <strong>${metas.clientesAtivos || 0}</strong> clientes ativos.
    </p>

    <p>
      As despesas somaram
      <strong>${moeda(saidas)}</strong>, deixando saldo líquido de
      <strong>${moeda(saldo)}</strong>.
    </p>

    <p>
      Foram registradas
      <strong>${dados.length}</strong> movimentações financeiras neste mês.
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

window.gerarResumoIA = gerarResumoIA;

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
      user.cargo === "ADM" ||
      user.cargo === "GERENTE"
    )
    .forEach(user => {
      select.innerHTML += `
        <option value="${user.usuario}">
          ${user.usuario} - ${user.cargo}
        </option>
      `;
    });
}

function tarefasVisiveis() {
  if (!usuarioLogado) return [];

  if (ehADM() || usuarioLogado.acesso === "TODOS") {
    return tarefas;
  }

  if (usuarioLogado.acesso === "MARKETING") {
    return tarefas.filter(tarefa =>
      tarefa.responsavel === usuarioLogado.usuario ||
      tarefa.criadoPor === usuarioLogado.usuario
    );
  }

  return [];
}

function lerArquivosSelecionados(input) {
  return new Promise(resolve => {
    const arquivos = Array.from(input?.files || []);

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

  await addDoc(collection(db, "tarefas"), {
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
    criadoPor: usuarioLogado.usuario,
    criadoEm: new Date().toISOString()
  });

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

  alert("Tarefa salva com sucesso!");
}

window.adicionarTarefa = adicionarTarefa;

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
  if (tarefa.status === "Concluído") return "Concluída";

  const dias = diasAtePrazo(tarefa);

  if (dias < 0) return `Atrasada há ${Math.abs(dias)} dia(s)`;
  if (dias === 0) return "Vence hoje";
  if (dias === 1) return "Vence amanhã";
  if (dias <= 3) return `Vence em ${dias} dias`;

  return "Dentro do prazo";
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
  const p = String(prioridade || "").toLowerCase();

  if (p === "baixa") return "prioridade-baixa";
  if (p === "média" || p === "media") return "prioridade-media";
  if (p === "alta") return "prioridade-alta";
  if (p === "urgente") return "prioridade-urgente";

  return "prioridade-baixa";
}

function formatarData(data) {
  if (!data) return "-";

  if (data.includes("/")) return data;

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
/* =========================
   RENDER TAREFAS
========================= */

function renderizarTarefas() {
  const tabela = document.getElementById("listaTarefas");
  if (!tabela) return;

  tabela.innerHTML = "";

  const tarefasUsuario = tarefasVisiveis();

  if (tarefasUsuario.length === 0) {
    tabela.innerHTML = `
      <tr>
        <td colspan="12">
          Nenhuma tarefa encontrada.
        </td>
      </tr>
    `;
    return;
  }

  tarefasUsuario
    .sort((a, b) => new Date(a.prazo) - new Date(b.prazo))
    .forEach(tarefa => {

      const anexosHtml =
        tarefa.anexos?.length > 0
          ? tarefa.anexos.map((arquivo, index) => `
              <span
                class="anexo-chip"
                onclick="abrirAnexo('${tarefa.id}', ${index})"
              >
                📎 ${arquivo.nome}
              </span>
            `).join("")
          : "-";

      tabela.innerHTML += `
        <tr>

          <td>
            <div class="task-title">
              ${tarefa.titulo}
            </div>

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
                ${iniciais(tarefa.responsavel)}
              </div>

              ${tarefa.responsavel}
            </div>
          </td>

          <td>
            <span class="prioridade ${classePrioridade(tarefa.prioridade)}">
              ${tarefa.prioridade}
            </span>
          </td>

          <td>
            <span class="status ${classeStatus(tarefa)}">
              ${tarefa.status}
            </span>
          </td>

          <td>
            ${formatarData(tarefa.data)}
          </td>

          <td>
            ${formatarData(tarefa.prazo)}
          </td>

          <td>
            ${tarefa.tempoAcao || "-"}
          </td>

          <td>
            <strong>
              ${textoLembrete(tarefa)}
            </strong>
          </td>

          <td>
            <div class="anexos-list">
              ${anexosHtml}
            </div>
          </td>

          <td>
            ${tarefa.criadoPor || "-"}
          </td>

          <td>

            ${tarefa.status !== "Concluído" ? `
              <button
                class="btn-small btn-done"
                onclick="concluirTarefa('${tarefa.id}')"
              >
                Concluir
              </button>
            ` : ""}

            ${ehADM() ? `
              <button
                class="btn-small btn-delete"
                onclick="excluirTarefa('${tarefa.id}')"
              >
                Excluir
              </button>
            ` : ""}

          </td>

        </tr>
      `;
    });
}

/* =========================
   INBOX DE PRAZOS
========================= */

function renderizarInbox() {
  const lista = document.getElementById("listaInbox");
  if (!lista) return;

  lista.innerHTML = "";

  const tarefasUsuario = tarefasVisiveis();

  if (tarefasUsuario.length === 0) {
    lista.innerHTML = `
      <div class="inbox-card">
        Nenhum lembrete encontrado.
      </div>
    `;
    return;
  }

  tarefasUsuario
    .sort((a, b) => new Date(a.prazo) - new Date(b.prazo))
    .forEach(tarefa => {

      const dias = diasAtePrazo(tarefa);

      let classe = "inbox-ok";
      let tag = "Dentro do prazo";

      if (dias < 0) {
        classe = "inbox-atrasado";
        tag = "Atrasada";
      } else if (dias === 0) {
        classe = "inbox-hoje";
        tag = "Hoje";
      } else if (dias === 1) {
        classe = "inbox-amanha";
        tag = "Amanhã";
      } else if (dias <= 3) {
        classe = "inbox-breve";
        tag = "Próximo";
      }

      lista.innerHTML += `
        <div class="inbox-card ${classe}">
          <div class="inbox-dot"></div>

          <div>
            <h4>
              ${tarefa.titulo}
            </h4>

            <p>
              <strong>Cliente:</strong>
              ${tarefa.cliente || "-"}
            </p>

            <p>
              <strong>Responsável:</strong>
              ${tarefa.responsavel}
            </p>

            <p>
              <strong>Prazo:</strong>
              ${formatarData(tarefa.prazo)}
            </p>

            <p>
              ${textoLembrete(tarefa)}
            </p>
          </div>

          <div class="inbox-tag status ${classeStatus(tarefa)}">
            ${tag}
          </div>
        </div>
      `;
    });
}

/* =========================
   AÇÕES TAREFAS
========================= */

async function concluirTarefa(id) {
  await updateDoc(doc(db, "tarefas", id), {
    status: "Concluído"
  });
}

window.concluirTarefa = concluirTarefa;

async function excluirTarefa(id) {
  if (!ehADM()) {
    alert("Somente ADM pode excluir.");
    return;
  }

  if (!confirm("Deseja excluir esta tarefa?")) {
    return;
  }

  await deleteDoc(doc(db, "tarefas", id));
}

window.excluirTarefa = excluirTarefa;

function abrirAnexo(id, index) {
  const tarefa = tarefas.find(t => t.id === id);

  if (!tarefa) return;

  const arquivo = tarefa.anexos[index];

  if (!arquivo) return;

  window.open(arquivo.dataUrl, "_blank");
}

window.abrirAnexo = abrirAnexo;

/* =========================
   USUÁRIOS
========================= */

async function criarUsuario() {
  if (!ehADM()) {
    alert("Apenas ADM.");
    return;
  }

  const usuario =
    document.getElementById("novoUsuario").value.trim();

  const senha =
    document.getElementById("novaSenha").value.trim();

  const cargo =
    document.getElementById("cargoUsuario").value;

  const acesso =
    document.getElementById("acessoUsuario").value;

  if (!usuario || !senha) {
    alert("Preencha nome e senha.");
    return;
  }

  const email = gerarEmailSistema(usuario);

  try {
    await createUserWithEmailAndPassword(
      auth,
      email,
      senha
    );
  } catch (error) {}

  await addDoc(collection(db, "usuarios"), {
    usuario,
    email,
    senhaVisual: senha,
    cargo,
    acesso,
    permissoes:
      acesso === "TODOS"
        ? "TOTAL"
        : acesso,

    criadoPor:
      usuarioLogado.usuario,

    criadoEm:
      new Date().toISOString()
  });

  document.getElementById("novoUsuario").value = "";
  document.getElementById("novaSenha").value = "";

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

        <h4>
          ${user.usuario}
        </h4>

        <p>
          Cargo: ${user.cargo}
        </p>

        <p>
          Acesso: ${user.acesso}
        </p>

        <small>
          Permissão:
          ${user.permissoes}
        </small>

        ${
          user.usuario !== "Leandro Belfort"
          && ehADM()
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

  if (!confirm("Excluir usuário?")) {
    return;
  }

  await deleteDoc(
    doc(db, "usuarios", id)
  );
}

window.excluirUsuario =
  excluirUsuario;

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

  if (!canvas) return;

  if (grafico) {
    grafico.destroy();
  }

  grafico = new Chart(canvas, {
    type: "bar",

    data: {
      labels: [
        "Entradas",
        "Saídas",
        "Saldo"
      ],

      datasets: [{
        data: [
          entradas,
          saidas,
          saldo
        ]
      }]
    },

    options: {
      responsive: true,

      plugins: {
        legend: {
          display: false
        }
      }
    }
  });
}

/* =========================
   EVENTOS
========================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    const filtro =
      document.getElementById(
        "filtroMes"
      );

    if (filtro) {
      filtro.addEventListener(
        "change",
        renderizar
      );
    }

    gerarResumoIA();

    if (
      window.innerWidth <= 768
    ) {
      document
        .querySelectorAll(
          "nav button"
        )
        .forEach(botao => {

          botao.addEventListener(
            "click",
            () => {

              setTimeout(() => {

                const titulo =
                  document.getElementById(
                    "tituloPagina"
                  );

                if (titulo) {
                  titulo.scrollIntoView({
                    behavior:
                      "smooth",
                    block:
                      "start"
                  });
                }

              }, 120);
            }
          );
        });
    }
  }
);