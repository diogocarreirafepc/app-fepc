let USERS = [];
let currentUser = null;

// 1. Verifica se o utilizador já tem sessão iniciada ao abrir a app
async function checkSession() {
  const { data: { session } } = await window.supabaseClient.auth.getSession();
  
  if (session) {
    await fetchCurrentUserProfile(session.user.id);
    loadUsers();
  } else {
    render(); // Se não houver sessão, mostra o ecrã de login
  }
}

// 2. Vai buscar os dados do utilizador logado, cruzando com a tabela monthly_totals
async function fetchCurrentUserProfile(userId) {
  const { data, error } = await window.supabaseClient
    .from("profiles")
    .select(`
      *,
      monthly_totals ( bank_hours, overtime_125, overtime_1375, overtime_150, estimated_debt )
    `)
    .eq("id", userId)
    .single();

  if (error || !data) {
    console.error("Erro ao carregar perfil:", error);
    return;
  }

  // Se o utilizador ainda não tiver registos em monthly_totals, assumimos 0
  const totals = data.monthly_totals && data.monthly_totals.length > 0 
    ? data.monthly_totals[0] 
    : { bank_hours: 0, overtime_125: 0, overtime_1375: 0, overtime_150: 0, estimated_debt: 0 };
  
  const totalOvertime = Number(totals.overtime_125) + Number(totals.overtime_1375) + Number(totals.overtime_150);

  currentUser = {
    id: data.id,
    n: data.employee_number,
    name: data.full_name,
    role: data.role,
    bank: Number(totals.bank_hours),
    overtime: totalOvertime,
    debt: Number(totals.estimated_debt),
    status: "Serviço" // Fixo por agora
  };

  render();
}

// 3. Sistema de Login Real com Email e Password
async function login() {
  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;

  if (!email || !password) {
    alert("Por favor, preenche o email e a password.");
    return;
  }

  const { data: authData, error: authError } = await window.supabaseClient.auth.signInWithPassword({
    email: email,
    password: password,
  });

  if (authError || !authData.user) {
    alert("Erro: Credenciais inválidas.");
    return;
  }

  await fetchCurrentUserProfile(authData.user.id);
  loadUsers();
}

// 4. Sistema de Logout
async function logout() {
  await window.supabaseClient.auth.signOut();
  currentUser = null;
  USERS = []; // Limpa a memória por segurança
  render();
}

// 5. Carrega a lista completa de utilizadores (apenas se for chefia)
async function loadUsers() {
  if (!canManage()) return; 

  const { data, error } = await window.supabaseClient
    .from("profiles")
    .select(`
      *,
      monthly_totals ( bank_hours, overtime_125, overtime_1375, overtime_150, estimated_debt )
    `);

  if (error) {
    console.error("Erro ao carregar lista da companhia:", error);
    return;
  }

  USERS = data.map(u => {
    const totals = u.monthly_totals && u.monthly_totals.length > 0 
      ? u.monthly_totals[0] 
      : { bank_hours: 0, overtime_125: 0, overtime_1375: 0, overtime_150: 0, estimated_debt: 0 };
    
    const totalOvertime = Number(totals.overtime_125) + Number(totals.overtime_1375) + Number(totals.overtime_150);

    return {
      n: u.employee_number,
      name: u.full_name,
      role: u.role,
      bank: Number(totals.bank_hours),
      overtime: totalOvertime,
      debt: Number(totals.estimated_debt),
      status: "Serviço"
    };
  });

  render();
}

function canManage() {
  return ["chefe_equipa", "chefe_brigada", "comandante"].includes(currentUser?.role);
}

// 6. Atualiza o HTML
function render() {
  document.getElementById("loginCard").style.display = currentUser ? "none" : "block";
  document.getElementById("dashboard").style.display = currentUser ? "block" : "none";
  
  if (!currentUser) return;

  document.getElementById("userTitle").innerText = `${currentUser.n} · ${currentUser.name}`;
  document.getElementById("roleTitle").innerText = roleName(currentUser.role);
  
  if (canManage()) {
    document.getElementById("totalUsers").innerText = USERS.length;
    document.getElementById("onDuty").innerText = USERS.filter(u => u.status === "Serviço").length;
    document.getElementById("vacations").innerText = USERS.filter(u => u.status === "Férias").length;
    document.getElementById("absences").innerText = USERS.filter(u => ["Baixa", "Ausente"].includes(u.status)).length;
    document.getElementById("debtHours").innerText = USERS.reduce((s, u) => s + u.overtime, 0) + "h";
  }

  document.getElementById("myBank").innerText = (currentUser.bank >= 0 ? "+" : "") + currentUser.bank + "h";
  document.getElementById("myOvertime").innerText = currentUser.overtime + "h";
  document.getElementById("myDebt").innerText = euro(currentUser.debt);
  
  document.querySelectorAll(".adminOnly").forEach(el => el.style.display = canManage() ? "block" : "none");
}

function roleName(r) {
  return { operacional: "Operacional", chefe_equipa: "Chefe de equipa", chefe_brigada: "Chefe de brigada", comandante: "Comandante / Administrador" }[r] || r;
}

function showUsers() {
  const rows = USERS.map(u => `<tr><td>${u.n}</td><td>${u.name}</td><td>${roleName(u.role)}</td><td><span class="badge">${u.status}</span></td><td>${u.bank}h</td><td>${euro(u.debt)}</td></tr>`).join("");
  document.getElementById("workArea").innerHTML = `<h3>Utilizadores</h3><table class="table"><thead><tr><th>Nº</th><th>Nome</th><th>Perfil</th><th>Estado</th><th>Banco</th><th>Dívida</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function showSchedule() {
  document.getElementById("workArea").innerHTML = `<h3>Escala da companhia</h3><p class="hint">Em produção a escala é importada do Excel/PDF e associada a cada operacional.</p><div class="row"><span>D/N</span><strong>12h</strong></div><div class="row"><span>Férias</span><strong>-7h</strong></div><div class="row"><span>Compensação</span><strong>-12h</strong></div><div class="row"><span>Feriado trabalhado</span><strong>150%</strong></div>`;
}

function showReports() {
  document.getElementById("workArea").innerHTML = `<h3>Relatórios</h3><div class="row"><span>Horas extra totais</span><strong>${USERS.reduce((s, u) => s + u.overtime, 0)}h</strong></div><div class="row"><span>Valor estimado em dívida</span><strong>${euro(USERS.reduce((s, u) => s + u.debt, 0))}</strong></div><button class="primary" onclick="exportCSV()">Exportar CSV</button>`;
}

function showSettings() {
  document.getElementById("workArea").innerHTML = `<h3>Definições</h3><div class="row"><span>Base de dados</span><strong>Supabase/Postgres</strong></div><div class="row"><span>Autenticação</span><strong>Supabase Auth</strong></div>`;
}

function openPersonal() {
  document.getElementById("workArea").innerHTML = `<h3>Controlo pessoal</h3><div class="row"><span>Banco</span><strong>${currentUser.bank}h</strong></div><div class="row"><span>Extra</span><strong>${currentUser.overtime}h</strong></div><div class="row"><span>Dívida</span><strong>${euro(currentUser.debt)}</strong></div>`;
}

function exportCSV() {
  const header = "numero;nome;perfil;estado;banco_horas;horas_extra;valor_divida\n";
  const body = USERS.map(u => `${u.n};${u.name};${u.role};${u.status};${u.bank};${u.overtime};${u.debt}`).join("\n");
  const blob = new Blob([header + body], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "FEPC_Companhia_Relatorio.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function euro(v) {
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(v);
}

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./service-worker.js");
}

// Inicia a aplicação
checkSession();