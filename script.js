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
   PRIMEIRO ADM
========================= */

async function garantirAdminInicial() {
  const adminRef = doc(db, "usuarios", "admin-leandro-belfort");
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

function ehADM() {
  return usuarioLogado && usuarioLogado.cargo === "ADM";
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

    const emailLogin =
      usuarioEncontrado.email || gerarEmailSistema(usuarioEncontrado.usuario);

    try {
      await signInWithEmailAndPassword(auth, emailLogin, senha);
    } catch (firebaseError) {
      if (
        usuarioEncontrado.usuario === "Leandro Belfort" &&
        senha === "65031265LLd#"
      ) {
        try {
          await createUserWithEmailAndPassword(
            auth,
            "admin@x4company.com",
            "65031265LLd#"
          );
        } catch (createError) {}

        await signInWithEmailAndPassword(
          auth,
          "admin@x4company.com",
          "65031265LLd#"
        );
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
    console.error("Erro no login:", error);
    erro.innerText = "Erro ao entrar. Verifique conexão e dados.";
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

window.fazerLogin = fazerLogin;
window.sairSistema = sairSistema;
/* =========================
   PERMISSÕES
========================= */

function aplicarPermissoes() {
  document.querySelectorAll(".area-admin").forEach(area => {
    area.style.display = ehADM() ? "block" : "none";
  });

  document.querySelectorAll(".menu-financeiro").forEach(item => {
    item.style.display =
      temAcessoFinanceiro()
        ? "block"
        : "none";
  });

  document.querySelectorAll(".menu-marketing").forEach(item => {
    item.style.display =
      temAcessoMarketing()
        ? "block"
        : "none";
  });

  document.querySelectorAll(".cards-financeiro").forEach(item => {
    item.style.display =
      temAcessoFinanceiro()
        ? "grid"
        : "none";
  });
}

/* =========================
   FIREBASE LISTENERS
========================= */

function iniciarListenersFirebase() {
  iniciarUsuarios();
  iniciarTransacoes();
  iniciarTarefas();
  iniciarMetas();
}

function iniciarUsuarios() {
  if (unsubscribeUsuarios) {
    unsubscribeUsuarios();
  }

  unsubscribeUsuarios =
    onSnapshot(
      collection(db, "usuarios"),
      snapshot => {

        usuarios =
          snapshot.docs.map(item => ({
            id: item.id,
            ...item.data()
          }));

        carregarResponsaveis();
        renderizarUsuarios();
      }
    );
}

function iniciarTransacoes() {
  if (unsubscribeTransacoes) {
    unsubscribeTransacoes();
  }

  unsubscribeTransacoes =
    onSnapshot(
      collection(db, "transacoes"),
      snapshot => {

        transacoes =
          snapshot.docs.map(item => ({
            id: item.id,
            ...item.data()
          }));

        renderizar();
      }
    );
}

function iniciarTarefas() {
  if (unsubscribeTarefas) {
    unsubscribeTarefas();
  }

  unsubscribeTarefas =
    onSnapshot(
      collection(db, "tarefas"),
      snapshot => {

        tarefas =
          snapshot.docs.map(item => ({
            id: item.id,
            ...item.data()
          }));

        renderizarTarefas();
        renderizarInbox();
      }
    );
}

function iniciarMetas() {
  if (unsubscribeMetas) {
    unsubscribeMetas();
  }

  unsubscribeMetas =
    onSnapshot(
      doc(db, "configuracoes", "metas"),
      snapshot => {

        if (snapshot.exists()) {
          metas = {
            ...metas,
            ...snapshot.data()
          };
        }

        renderizar();
      }
    );
}

/* =========================
   MENU / PÁGINAS
========================= */

function abrirPagina(
  pagina,
  botao
) {

  if (
    [
      "dashboard",
      "entradas",
      "saidas",
      "caixa",
      "metas",
      "relatorios",
      "categorias",
      "ia"
    ].includes(pagina)
    &&
    !temAcessoFinanceiro()
  ) {
    alert(
      "Você não tem acesso ao setor financeiro."
    );
    return;
  }

  if (
    [
      "tarefas",
      "inbox"
    ].includes(pagina)
    &&
    !temAcessoMarketing()
  ) {
    alert(
      "Você não tem acesso ao marketing."
    );
    return;
  }

  if (
    pagina === "usuarios"
    &&
    !ehADM()
  ) {
    alert(
      "Apenas ADM."
    );
    return;
  }

  document
    .querySelectorAll(".pagina")
    .forEach(item =>
      item.classList.remove("ativa")
    );

  document
    .getElementById(pagina)
    ?.classList.add("ativa");

  document
    .querySelectorAll("nav button")
    .forEach(btn =>
      btn.classList.remove("active")
    );

  if (botao) {
    botao.classList.add("active");
  }

  const titulos = {
    dashboard: [
      "Dashboard Financeiro",
      "Visão geral da X4 Company"
    ],

    entradas: [
      "Entradas",
      "Receitas da empresa"
    ],

    saidas: [
      "Saídas",
      "Custos e despesas"
    ],

    caixa: [
      "Caixa",
      "Saldo financeiro"
    ],

    metas: [
      "Metas",
      "Faturamento e indicadores"
    ],

    relatorios: [
      "Relatórios",
      "Análise geral"
    ],

    categorias: [
      "Categorias",
      "Organização financeira"
    ],

    ia: [
      "IA Financeira",
      "Resumo inteligente"
    ],

    tarefas: [
      "Marketing / Tarefas",
      "Controle operacional"
    ],

    inbox: [
      "Caixa de Entrada",
      "Lembretes automáticos"
    ],

    usuarios: [
      "Usuários",
      "Controle do sistema"
    ]
  };

  if (titulos[pagina]) {
    document.getElementById(
      "tituloPagina"
    ).innerText =
      titulos[pagina][0];

    document.getElementById(
      "subtituloPagina"
    ).innerText =
      titulos[pagina][1];
  }

  renderizar();

  if (pagina === "tarefas") {
    renderizarTarefas();
  }

  if (pagina === "usuarios") {
    renderizarUsuarios();
  }

  if (pagina === "inbox") {
    renderizarInbox();
  }

  /* MOBILE */

  if (
    window.innerWidth <= 768
  ) {
    setTimeout(() => {

      if (pagina === "tarefas") {

        const form =
          document.querySelector(
            "#tarefas .form-panel"
          );

        if (form) {
          form.scrollIntoView({
            behavior: "smooth",
            block: "start"
          });
        }

      } else {

        const titulo =
          document.getElementById(
            "tituloPagina"
          );

        titulo?.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });

      }

    }, 120);
  }
}

window.abrirPagina =
  abrirPagina;

/* =========================
   FINANCEIRO
========================= */

async function adicionarLancamento() {

  if (
    !temAcessoFinanceiro()
  ) {
    alert(
      "Sem permissão."
    );
    return;
  }

  const descricao =
    document
      .getElementById(
        "descricao"
      )
      .value
      .trim();

  const tipo =
    document
      .getElementById(
        "tipo"
      )
      .value;

  const valor =
    Number(
      document
        .getElementById(
          "valor"
        )
        .value
    );

  const categoria =
    document
      .getElementById(
        "categoria"
      )
      .value;

  if (
    descricao === ""
    ||
    valor <= 0
  ) {
    alert(
      "Preencha descrição e valor."
    );
    return;
  }

  await addDoc(
    collection(
      db,
      "transacoes"
    ),
    {
      descricao,
      tipo,
      valor,
      categoria,
      data:
        dataAtualBR(),

      mes:
        mesAtual(),

      criadoPor:
        usuarioLogado.usuario,

      criadoEm:
        new Date().toISOString()
    }
  );

  document.getElementById(
    "descricao"
  ).value = "";

  document.getElementById(
    "valor"
  ).value = "";

  document.getElementById(
    "tipo"
  ).value = "entrada";

  document.getElementById(
    "categoria"
  ).selectedIndex = 0;
}

window.adicionarLancamento =
  adicionarLancamento;
  async function excluirLancamento(id) {
  if (!ehADM()) {
    alert("Apenas ADM pode excluir lançamentos.");
    return;
  }

  if (!confirm("Deseja excluir este lançamento?")) {
    return;
  }

  await deleteDoc(
    doc(db, "transacoes", id)
  );
}

window.excluirLancamento = excluirLancamento;

function calcularResumo() {
  const dados = dadosDoMes();

  const entradas =
    dados
      .filter(item => item.tipo === "entrada")
      .reduce(
        (total, item) =>
          total + Number(item.valor || 0),
        0
      );

  const saidas =
    dados
      .filter(item => item.tipo === "saida")
      .reduce(
        (total, item) =>
          total + Number(item.valor || 0),
        0
      );

  const saldo =
    entradas - saidas;

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

  const {
    dados,
    entradas,
    saidas,
    saldo
  } = calcularResumo();

  const campos = {
    totalEntradas:
      moeda(entradas),

    totalSaidas:
      moeda(saidas),

    saldoAtual:
      moeda(saldo),

    caixaAtual:
      moeda(saldo),

    caixaEntradas:
      moeda(entradas),

    caixaSaidas:
      moeda(saidas),

    caixaDisponivel:
      moeda(saldo),

    relEntradas:
      moeda(entradas),

    relSaidas:
      moeda(saidas),

    relSaldo:
      moeda(saldo),

    relTransacoes:
      dados.length,

    faturamentoEmpresaMes:
      moeda(
        metas.faturamentoEmpresa || 0
      ),

    clientesAtivosEmpresa:
      metas.clientesAtivos || 0,

    relFaturamentoEmpresa:
      moeda(
        metas.faturamentoEmpresa || 0
      ),

    relClientesAtivos:
      metas.clientesAtivos || 0,

    indicadorFaturamentoEmpresa:
      moeda(
        metas.faturamentoEmpresa || 0
      ),

    indicadorClientesAtivos:
      metas.clientesAtivos || 0
  };

  Object
    .entries(campos)
    .forEach(([id, valor]) => {
      const el =
        document.getElementById(id);

      if (el) {
        el.innerText = valor;
      }
    });

  renderizarTabela(
    "listaTransacoes",
    dados,
    true
  );

  renderizarTabela(
    "listaEntradas",
    dados.filter(
      item => item.tipo === "entrada"
    ),
    false
  );

  renderizarTabela(
    "listaSaidas",
    dados.filter(
      item => item.tipo === "saida"
    ),
    false
  );

  atualizarMetas(
    entradas,
    saidas,
    saldo
  );

  preencherInputsMetas();

  criarGrafico(
    entradas,
    saidas,
    saldo
  );
}

function renderizarTabela(
  idTabela,
  dados,
  comAcao
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
          Nenhum lançamento encontrado.
        </td>
      </tr>
    `;
    return;
  }

  dados
    .slice()
    .sort(
      (a, b) =>
        new Date(b.criadoEm || 0)
        -
        new Date(a.criadoEm || 0)
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
            idTabela === "listaTransacoes"
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
            ${item.data || "-"}
          </td>

          ${
            comAcao
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
   METAS E INDICADORES
========================= */

async function salvarMetas() {
  if (!ehADM()) {
    alert("Apenas ADM pode alterar metas.");
    return;
  }

  const faturamento =
    Number(
      document.getElementById(
        "inputMetaFaturamento"
      ).value
    );

  const custos =
    Number(
      document.getElementById(
        "inputMetaCustos"
      ).value
    );

  const lucro =
    Number(
      document.getElementById(
        "inputMetaLucro"
      ).value
    );

  const faturamentoEmpresa =
    Number(
      document.getElementById(
        "inputFaturamentoEmpresa"
      ).value
    );

  const clientesAtivos =
    Number(
      document.getElementById(
        "inputClientesAtivos"
      ).value
    );

  const novasMetas = {
    faturamento:
      faturamento > 0
        ? faturamento
        : metas.faturamento,

    custos:
      custos > 0
        ? custos
        : metas.custos,

    lucro:
      lucro > 0
        ? lucro
        : metas.lucro,

    faturamentoEmpresa:
      faturamentoEmpresa >= 0
        ? faturamentoEmpresa
        : metas.faturamentoEmpresa,

    clientesAtivos:
      clientesAtivos >= 0
        ? clientesAtivos
        : metas.clientesAtivos,

    atualizadoPor:
      usuarioLogado.usuario,

    atualizadoEm:
      new Date().toISOString()
  };

  await setDoc(
    doc(
      db,
      "configuracoes",
      "metas"
    ),
    novasMetas,
    { merge: true }
  );

  document.getElementById(
    "inputMetaFaturamento"
  ).value = "";

  document.getElementById(
    "inputMetaCustos"
  ).value = "";

  document.getElementById(
    "inputMetaLucro"
  ).value = "";

  document.getElementById(
    "inputFaturamentoEmpresa"
  ).value = "";

  document.getElementById(
    "inputClientesAtivos"
  ).value = "";

  alert(
    "Metas e indicadores salvos com sucesso!"
  );
}

window.salvarMetas = salvarMetas;

function preencherInputsMetas() {
  const campos = {
    inputMetaFaturamento:
      `Meta atual: ${moeda(metas.faturamento)}`,

    inputMetaCustos:
      `Limite atual: ${moeda(metas.custos)}`,

    inputMetaLucro:
      `Meta atual: ${moeda(metas.lucro)}`,

    inputFaturamentoEmpresa:
      `Atual: ${moeda(metas.faturamentoEmpresa || 0)}`,

    inputClientesAtivos:
      `Atual: ${metas.clientesAtivos || 0} clientes`
  };

  Object
    .entries(campos)
    .forEach(([id, texto]) => {
      const campo =
        document.getElementById(id);

      if (campo) {
        campo.placeholder = texto;
      }
    });
}
function atualizarMetas(
  entradas,
  saidas,
  saldo
) {
  const percFaturamento =
    metas.faturamento > 0
      ? Math.min(
          (entradas / metas.faturamento) * 100,
          100
        )
      : 0;

  const percCustos =
    metas.custos > 0
      ? Math.min(
          (saidas / metas.custos) * 100,
          100
        )
      : 0;

  const percLucro =
    metas.lucro > 0
      ? Math.min(
          (saldo / metas.lucro) * 100,
          100
        )
      : 0;

  const textos = {
    textoMetaFaturamento:
      `Meta: ${moeda(metas.faturamento)}`,

    textoMetaCustos:
      `Limite: ${moeda(metas.custos)}`,

    textoMetaLucro:
      `Meta: ${moeda(metas.lucro)}`,

    metaFaturamento:
      `${percFaturamento.toFixed(0)}%`,

    metaCustos:
      `${percCustos.toFixed(0)}%`,

    metaLucro:
      `${Math.max(percLucro, 0).toFixed(0)}%`
  };

  Object
    .entries(textos)
    .forEach(([id, valor]) => {
      const el =
        document.getElementById(id);

      if (el) {
        el.innerText = valor;
      }
    });

  const barraFaturamento =
    document.getElementById(
      "barraFaturamento"
    );

  const barraCustos =
    document.getElementById(
      "barraCustos"
    );

  const barraLucro =
    document.getElementById(
      "barraLucro"
    );

  if (barraFaturamento) {
    barraFaturamento.style.width =
      `${percFaturamento}%`;
  }

  if (barraCustos) {
    barraCustos.style.width =
      `${percCustos}%`;
  }

  if (barraLucro) {
    barraLucro.style.width =
      `${Math.max(percLucro, 0)}%`;
  }
}

/* =========================
   IA FINANCEIRA
========================= */

function gerarResumoIA() {
  if (!temAcessoFinanceiro()) return;

  const {
    dados,
    entradas,
    saidas,
    saldo
  } = calcularResumo();

  const maiorEntrada =
    dados
      .filter(item => item.tipo === "entrada")
      .sort(
        (a, b) =>
          Number(b.valor || 0)
          -
          Number(a.valor || 0)
      )[0];

  const maiorSaida =
    dados
      .filter(item => item.tipo === "saida")
      .sort(
        (a, b) =>
          Number(b.valor || 0)
          -
          Number(a.valor || 0)
      )[0];

  let texto = `
    <h4>Análise Inteligente da X4 Company</h4>

    <p>
      No mês selecionado, a empresa registrou
      <strong>${moeda(entradas)}</strong>
      em entradas financeiras.
    </p>

    <p>
      O faturamento mensal informado está em
      <strong>${moeda(metas.faturamentoEmpresa || 0)}</strong>.
    </p>

    <p>
      A agência possui atualmente
      <strong>${metas.clientesAtivos || 0}</strong>
      clientes ativos.
    </p>

    <p>
      As despesas somaram
      <strong>${moeda(saidas)}</strong>,
      deixando saldo líquido de
      <strong>${moeda(saldo)}</strong>.
    </p>

    <p>
      Foram registradas
      <strong>${dados.length}</strong>
      movimentações financeiras neste mês.
    </p>
  `;

  if (maiorEntrada) {
    texto += `
      <p>
        A maior entrada foi
        <strong>${maiorEntrada.descricao}</strong>,
        no valor de
        <strong>${moeda(maiorEntrada.valor)}</strong>.
      </p>
    `;
  }

  if (maiorSaida) {
    texto += `
      <p>
        A maior saída foi
        <strong>${maiorSaida.descricao}</strong>,
        no valor de
        <strong>${moeda(maiorSaida.valor)}</strong>.
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
        Ainda faltam
        <strong>${moeda(metas.faturamento - entradas)}</strong>
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

  const box =
    document.getElementById(
      "resumoIA"
    );

  if (box) {
    box.innerHTML = texto;
  }
}

window.gerarResumoIA =
  gerarResumoIA;

/* =========================
   TAREFAS / MARKETING
========================= */

function carregarResponsaveis() {
  const select =
    document.getElementById(
      "tarefaResponsavel"
    );

  if (!select) return;

  select.innerHTML =
    `<option value="">Selecione o responsável</option>`;

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

  if (
    ehADM() ||
    usuarioLogado.acesso === "TODOS"
  ) {
    return tarefas;
  }

  if (
    usuarioLogado.acesso === "MARKETING"
  ) {
    return tarefas.filter(tarefa =>
      tarefa.responsavel === usuarioLogado.usuario ||
      tarefa.criadoPor === usuarioLogado.usuario
    );
  }

  return [];
}
function lerArquivosSelecionados(input) {
  return new Promise(resolve => {
    const arquivos =
      Array.from(input?.files || []);

    if (arquivos.length === 0) {
      resolve([]);
      return;
    }

    const anexos = [];
    let carregados = 0;

    arquivos.forEach(file => {
      const reader =
        new FileReader();

      reader.onload =
        function (e) {
          anexos.push({
            nome:
              file.name,

            tipo:
              file.type || "documento",

            tamanho:
              file.size,

            dataUrl:
              e.target.result
          });

          carregados++;

          if (
            carregados === arquivos.length
          ) {
            resolve(anexos);
          }
        };

      reader.readAsDataURL(file);
    });
  });
}

async function adicionarTarefa() {
  if (!temAcessoMarketing()) {
    alert(
      "Você não tem acesso ao setor de Marketing/Tarefas."
    );
    return;
  }

  const titulo =
    document
      .getElementById("tarefaTitulo")
      .value
      .trim();

  const cliente =
    document
      .getElementById("tarefaCliente")
      .value
      .trim();

  const responsavel =
    document
      .getElementById("tarefaResponsavel")
      .value;

  const prioridade =
    document
      .getElementById("tarefaPrioridade")
      .value;

  const status =
    document
      .getElementById("tarefaStatus")
      .value;

  const data =
    document
      .getElementById("tarefaData")
      .value;

  const prazo =
    document
      .getElementById("tarefaPrazo")
      .value;

  const tempoAcao =
    document
      .getElementById("tarefaTempoAcao")
      .value
      .trim();

  const observacao =
    document
      .getElementById("tarefaObservacao")
      .value
      .trim();

  const inputArquivos =
    document.getElementById(
      "tarefaArquivos"
    );

  if (
    !titulo ||
    !responsavel ||
    !prazo
  ) {
    alert(
      "Preencha pelo menos tarefa, responsável e prazo."
    );
    return;
  }

  const anexos =
    await lerArquivosSelecionados(
      inputArquivos
    );

  await addDoc(
    collection(db, "tarefas"),
    {
      titulo,
      cliente,
      responsavel,
      prioridade,
      status,

      data:
        data ||
        new Date()
          .toISOString()
          .slice(0, 10),

      prazo,
      tempoAcao,
      observacao,
      anexos,

      criadoPor:
        usuarioLogado.usuario,

      criadoEm:
        new Date().toISOString()
    }
  );

  document.getElementById(
    "tarefaTitulo"
  ).value = "";

  document.getElementById(
    "tarefaCliente"
  ).value = "";

  document.getElementById(
    "tarefaResponsavel"
  ).value = "";

  document.getElementById(
    "tarefaPrioridade"
  ).value = "Baixa";

  document.getElementById(
    "tarefaStatus"
  ).value = "Pendente";

  document.getElementById(
    "tarefaData"
  ).value = "";

  document.getElementById(
    "tarefaPrazo"
  ).value = "";

  document.getElementById(
    "tarefaTempoAcao"
  ).value = "";

  document.getElementById(
    "tarefaObservacao"
  ).value = "";

  if (inputArquivos) {
    inputArquivos.value = "";
  }

  alert(
    "Tarefa salva com sucesso!"
  );
}

window.adicionarTarefa =
  adicionarTarefa;

/* =========================
   HELPERS TAREFAS
========================= */

function tarefaEstaAtrasada(tarefa) {
  if (
    tarefa.status === "Concluído"
  ) {
    return false;
  }

  const hoje =
    new Date();

  hoje.setHours(0, 0, 0, 0);

  const prazo =
    new Date(
      tarefa.prazo + "T00:00:00"
    );

  return prazo < hoje;
}

function diasAtePrazo(tarefa) {
  const hoje =
    new Date();

  hoje.setHours(0, 0, 0, 0);

  const prazo =
    new Date(
      tarefa.prazo + "T00:00:00"
    );

  const diferenca =
    prazo - hoje;

  return Math.ceil(
    diferenca /
    (1000 * 60 * 60 * 24)
  );
}

function textoLembrete(tarefa) {
  if (
    tarefa.status === "Concluído"
  ) {
    return "Concluída";
  }

  const dias =
    diasAtePrazo(tarefa);

  if (dias < 0) {
    return `Atrasada há ${Math.abs(dias)} dia(s)`;
  }

  if (dias === 0) {
    return "Vence hoje";
  }

  if (dias === 1) {
    return "Vence amanhã";
  }

  if (dias <= 3) {
    return `Vence em ${dias} dias`;
  }

  return "Dentro do prazo";
}

function classeStatus(tarefa) {
  if (tarefaEstaAtrasada(tarefa)) {
    return "status-atrasado";
  }

  if (tarefa.status === "Pendente") {
    return "status-pendente";
  }

  if (tarefa.status === "Em andamento") {
    return "status-andamento";
  }

  if (
    tarefa.status ===
    "Aguardando aprovação"
  ) {
    return "status-aprovacao";
  }

  if (tarefa.status === "Concluído") {
    return "status-concluido";
  }

  return "status-pendente";
}

function classePrioridade(prioridade) {
  const p =
    String(prioridade || "")
      .toLowerCase();

  if (p === "baixa") {
    return "prioridade-baixa";
  }

  if (
    p === "média" ||
    p === "media"
  ) {
    return "prioridade-media";
  }

  if (p === "alta") {
    return "prioridade-alta";
  }

  if (p === "urgente") {
    return "prioridade-urgente";
  }

  return "prioridade-baixa";
}

function formatarData(data) {
  if (!data) return "-";

  if (String(data).includes("/")) {
    return data;
  }

  const partes =
    String(data).split("-");

  if (partes.length !== 3) {
    return data;
  }

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
  const tabela =
    document.getElementById(
      "listaTarefas"
    );

  if (!tabela) return;

  tabela.innerHTML = "";

  const tarefasUsuario =
    tarefasVisiveis();

  const pendentes =
    tarefasUsuario.filter(t =>
      t.status === "Pendente" &&
      !tarefaEstaAtrasada(t)
    ).length;

  const andamento =
    tarefasUsuario.filter(t =>
      t.status === "Em andamento" &&
      !tarefaEstaAtrasada(t)
    ).length;

  const atrasadas =
    tarefasUsuario.filter(t =>
      tarefaEstaAtrasada(t)
    ).length;

  const concluidas =
    tarefasUsuario.filter(t =>
      t.status === "Concluído"
    ).length;

  const totalPendentes =
    document.getElementById(
      "totalTarefasPendentes"
    );

  const totalAndamento =
    document.getElementById(
      "totalTarefasAndamento"
    );

  const totalAtrasadas =
    document.getElementById(
      "totalTarefasAtrasadas"
    );

  const totalConcluidas =
    document.getElementById(
      "totalTarefasConcluidas"
    );

  if (totalPendentes) {
    totalPendentes.innerText = pendentes;
  }

  if (totalAndamento) {
    totalAndamento.innerText = andamento;
  }

  if (totalAtrasadas) {
    totalAtrasadas.innerText = atrasadas;
  }

  if (totalConcluidas) {
    totalConcluidas.innerText = concluidas;
  }

  if (tarefasUsuario.length === 0) {
    tabela.innerHTML = `
      <tr>
        <td colspan="11">
          Nenhuma tarefa encontrada.
        </td>
      </tr>
    `;
    return;
  }

  tarefasUsuario
    .slice()
    .sort(
      (a, b) =>
        new Date(a.prazo)
        -
        new Date(b.prazo)
    )
    .forEach(tarefa => {

      const anexosHtml =
        tarefa.anexos &&
        tarefa.anexos.length > 0
          ? tarefa.anexos
              .map((arquivo, index) => `
                <span
                  class="anexo-chip"
                  onclick="abrirAnexo('${tarefa.id}', ${index})"
                >
                  📎 ${arquivo.nome}
                </span>
              `)
              .join("")
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
            <span class="status ${classeStatus(tarefa)}">
              ${tarefa.status}
            </span>
          </td>

          <td>
            <span class="prioridade ${classePrioridade(tarefa.prioridade)}">
              ${tarefa.prioridade}
            </span>
          </td>

          <td>
            ${formatarData(tarefa.data)}
          </td>

          <td>
            ${formatarData(tarefa.prazo)}
          </td>

          <td>
            <strong>
              ${textoLembrete(tarefa)}
            </strong>
          </td>

          <td>
            ${tarefa.tempoAcao || "-"}
          </td>

          <td>
            <div class="anexos-list">
              ${anexosHtml}
            </div>
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
   INBOX
========================= */

function renderizarInbox() {
  const lista =
    document.getElementById(
      "listaInbox"
    );

  if (!lista) return;

  lista.innerHTML = "";

  const tarefasUsuario =
    tarefasVisiveis()
      .filter(t =>
        t.status !== "Concluído"
      );

  if (tarefasUsuario.length === 0) {
    lista.innerHTML = `
      <div class="inbox-card inbox-ok">
        <div class="inbox-dot"></div>

        <div>
          <h4>
            Nenhum lembrete encontrado
          </h4>

          <p>
            Não existem tarefas próximas do prazo ou atrasadas.
          </p>
        </div>

        <span class="inbox-tag">
          Tudo certo
        </span>
      </div>
    `;
    return;
  }

  tarefasUsuario
    .slice()
    .sort(
      (a, b) =>
        new Date(a.prazo)
        -
        new Date(b.prazo)
    )
    .forEach(tarefa => {

      const dias =
        diasAtePrazo(tarefa);

      let classe =
        "inbox-ok";

      let tag =
        "Dentro do prazo";

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

          <span class="inbox-tag">
            ${tag}
          </span>
        </div>
      `;
    });
}

/* =========================
   AÇÕES TAREFAS
========================= */

async function concluirTarefa(id) {
  await updateDoc(
    doc(db, "tarefas", id),
    {
      status: "Concluído",
      concluidoPor:
        usuarioLogado.usuario,

      concluidoEm:
        new Date().toISOString()
    }
  );
}

window.concluirTarefa =
  concluirTarefa;

async function excluirTarefa(id) {
  if (!ehADM()) {
    alert(
      "Somente ADM pode excluir."
    );
    return;
  }

  if (
    !confirm(
      "Deseja excluir esta tarefa?"
    )
  ) {
    return;
  }

  await deleteDoc(
    doc(db, "tarefas", id)
  );
}

window.excluirTarefa =
  excluirTarefa;

function abrirAnexo(id, index) {
  const tarefa =
    tarefas.find(t =>
      t.id === id
    );

  if (!tarefa) return;

  const arquivo =
    tarefa.anexos[index];

  if (!arquivo) return;

  const novaAba =
    window.open();

  novaAba.document.write(`
    <iframe
      src="${arquivo.dataUrl}"
      style="width:100%;height:100vh;border:none;"
    ></iframe>
  `);
}

window.abrirAnexo =
  abrirAnexo;

/* =========================
   IA TAREFAS
========================= */

function gerarResumoTarefas() {
  const lista =
    tarefasVisiveis();

  const total =
    lista.length;

  const pendentes =
    lista.filter(t =>
      t.status === "Pendente" &&
      !tarefaEstaAtrasada(t)
    ).length;

  const andamento =
    lista.filter(t =>
      t.status === "Em andamento" &&
      !tarefaEstaAtrasada(t)
    ).length;

  const atrasadas =
    lista.filter(t =>
      tarefaEstaAtrasada(t)
    ).length;

  const concluidas =
    lista.filter(t =>
      t.status === "Concluído"
    ).length;

  const urgentes =
    lista.filter(t =>
      t.prioridade === "Urgente"
    ).length;

  let texto = `
    <h4>Análise Inteligente do Marketing</h4>

    <p>
      O setor possui
      <strong>${total}</strong>
      tarefas cadastradas.
    </p>

    <p>
      <strong>${pendentes}</strong>
      pendentes,
      <strong>${andamento}</strong>
      em andamento e
      <strong>${concluidas}</strong>
      concluídas.
    </p>
  `;

  if (atrasadas > 0) {
    texto += `
      <p class="negativo">
        Existem
        <strong>${atrasadas}</strong>
        tarefas atrasadas. Priorize essas demandas.
      </p>
    `;
  } else {
    texto += `
      <p class="positivo">
        Nenhuma tarefa atrasada no momento.
      </p>
    `;
  }

  if (urgentes > 0) {
    texto += `
      <p class="alerta">
        Existem
        <strong>${urgentes}</strong>
        tarefas urgentes.
      </p>
    `;
  }

  const box =
    document.getElementById(
      "resumoTarefasIA"
    );

  if (box) {
    box.innerHTML = texto;
  }
}

window.gerarResumoTarefas =
  gerarResumoTarefas;

/* =========================
   USUÁRIOS
========================= */

async function criarUsuario() {
  if (!ehADM()) {
    alert(
      "Apenas ADM pode criar usuários."
    );
    return;
  }

  const campoUsuario =
    document.getElementById(
      "novoUsuario"
    );

  const campoSenha =
    document.getElementById(
      "novaSenha"
    );

  const campoCargo =
    document.getElementById(
      "novoCargo"
    );

  const campoAcesso =
    document.getElementById(
      "novoAcesso"
    );

  const usuario =
    campoUsuario.value.trim();

  const senha =
    campoSenha.value.trim();

  const cargo =
    campoCargo.value;

  const acesso =
    campoAcesso.value;

  if (!usuario || !senha) {
    alert(
      "Preencha nome e senha."
    );
    return;
  }

  if (senha.length < 6) {
    alert(
      "A senha precisa ter pelo menos 6 caracteres."
    );
    return;
  }

  const email =
    gerarEmailSistema(usuario);

  try {
    try {
      await createUserWithEmailAndPassword(
        auth,
        email,
        senha
      );
    } catch (authError) {
      console.warn(
        "Auth já existe ou não pôde criar:",
        authError
      );
    }

    await addDoc(
      collection(db, "usuarios"),
      {
        usuario,
        email,
        senhaVisual:
          senha,

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
      }
    );

    campoUsuario.value = "";
    campoSenha.value = "";

    alert(
      "Usuário criado com sucesso!"
    );

  } catch (error) {
    console.error(
      "Erro ao criar usuário:",
      error
    );

    alert(
      "Erro ao criar usuário: " +
      error.message
    );
  }
}

window.criarUsuario =
  criarUsuario;

function renderizarUsuarios() {
  const lista =
    document.getElementById(
      "listaUsuarios"
    );

  if (!lista) return;

  lista.innerHTML = "";

  usuarios.forEach(user => {
    lista.innerHTML += `
      <div class="user-card">

        <h4>
          ${user.usuario}
        </h4>

        <p>
          Cargo:
          <strong>${user.cargo}</strong>
        </p>

        <p>
          Acesso:
          <strong>${user.acesso}</strong>
        </p>

        <small>
          Login:
          ${user.email || gerarEmailSistema(user.usuario)}
        </small>

        ${
          user.usuario !== "Leandro Belfort" &&
          ehADM()
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
  if (!ehADM()) {
    return;
  }

  if (
    !confirm(
      "Excluir usuário?"
    )
  ) {
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
    document.getElementById(
      "graficoFinanceiro"
    );

  if (
    !canvas ||
    typeof Chart === "undefined"
  ) {
    return;
  }

  if (grafico) {
    grafico.destroy();
  }

  grafico =
    new Chart(canvas, {
      type: "bar",

      data: {
        labels: [
          "Entradas",
          "Saídas",
          "Saldo"
        ],

        datasets: [
          {
            label:
              "Financeiro X4",

            data: [
              entradas,
              saidas,
              saldo
            ],

            borderWidth:
              1
          }
        ]
      },

      options: {
        responsive:
          true,

        plugins: {
          legend: {
            labels: {
              color:
                "#fff"
            }
          }
        },

        scales: {
          x: {
            ticks: {
              color:
                "#8fb8d8"
            }
          },

          y: {
            ticks: {
              color:
                "#8fb8d8"
            }
          }
        }
      }
    });
}

/* =========================
   EVENTOS FINAIS
========================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    if (filtroMes) {
      filtroMes.addEventListener(
        "change",
        () => {
          renderizar();
          gerarResumoIA();
        }
      );
    }

  }
);