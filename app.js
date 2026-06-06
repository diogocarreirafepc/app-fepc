let USERS=[];
async function loadUsers() {
  const { data, error } = await supabase
    .from("profiles")
    .select("*");

  if (error) {
    console.error("Erro ao carregar utilizadores:", error);
    return;
  }

  USERS = data.map(u => ({
    n: u.employee_number,
    name: u.full_name,
    role: u.role,
    bank: 0,
    overtime: 0,
    debt: 0,
    status: "Serviço"
  }));

  render();
}
let currentUser=JSON.parse(localStorage.getItem("fepc_company_user")||"null");
async function login() {
  const n = document.getElementById("loginUser").value;
  const role = document.getElementById("loginRole").value;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("employee_number", n)
    .single();

  if (error || !data) {
    alert("Utilizador não encontrado");
    return;
  }

  currentUser = {
    n: data.employee_number,
    name: data.full_name,
    role: data.role,
    bank: 0,
    overtime: 0,
    debt: 0,
    status: "Serviço"
  };

  localStorage.setItem(
    "fepc_company_user",
    JSON.stringify(currentUser)
  );

  render();
}
function logout(){localStorage.removeItem("fepc_company_user");currentUser=null;render()}
function canManage(){return["chefe_equipa","chefe_brigada","comandante"].includes(currentUser?.role)}
function render(){document.getElementById("loginCard").style.display=currentUser?"none":"block";document.getElementById("dashboard").style.display=currentUser?"block":"none";if(!currentUser)return;document.getElementById("userTitle").innerText=`${currentUser.n} · ${currentUser.name}`;document.getElementById("roleTitle").innerText=roleName(currentUser.role);document.getElementById("onDuty").innerText=USERS.filter(u=>u.status==="Serviço").length;document.getElementById("vacations").innerText=USERS.filter(u=>u.status==="Férias").length;document.getElementById("absences").innerText=USERS.filter(u=>["Baixa","Ausente"].includes(u.status)).length;document.getElementById("debtHours").innerText=USERS.reduce((s,u)=>s+u.overtime,0)+"h";document.getElementById("myBank").innerText=(currentUser.bank>=0?"+":"")+currentUser.bank+"h";document.getElementById("myOvertime").innerText=currentUser.overtime+"h";document.getElementById("myDebt").innerText=euro(currentUser.debt);document.querySelectorAll(".adminOnly").forEach(el=>el.style.display=canManage()?"block":"none")}
function roleName(r){return{operacional:"Operacional",chefe_equipa:"Chefe de equipa",chefe_brigada:"Chefe de brigada",comandante:"Comandante / Administrador"}[r]||r}
function showUsers(){const rows=USERS.map(u=>`<tr><td>${u.n}</td><td>${u.name}</td><td>${roleName(u.role)}</td><td><span class="badge">${u.status}</span></td><td>${u.bank}h</td><td>${euro(u.debt)}</td></tr>`).join("");document.getElementById("workArea").innerHTML=`<h3>Utilizadores</h3><table class="table"><thead><tr><th>Nº</th><th>Nome</th><th>Perfil</th><th>Estado</th><th>Banco</th><th>Dívida</th></tr></thead><tbody>${rows}</tbody></table>`}
function showSchedule(){document.getElementById("workArea").innerHTML=`<h3>Escala da companhia</h3><p class="hint">Em produção a escala é importada do Excel/PDF e associada a cada operacional.</p><div class="row"><span>D/N</span><strong>12h</strong></div><div class="row"><span>Férias</span><strong>-7h</strong></div><div class="row"><span>Compensação</span><strong>-12h</strong></div><div class="row"><span>Feriado trabalhado</span><strong>150%</strong></div>`}
function showReports(){document.getElementById("workArea").innerHTML=`<h3>Relatórios</h3><div class="row"><span>Horas extra totais</span><strong>${USERS.reduce((s,u)=>s+u.overtime,0)}h</strong></div><div class="row"><span>Valor estimado em dívida</span><strong>${euro(USERS.reduce((s,u)=>s+u.debt,0))}</strong></div><button class="primary" onclick="exportCSV()">Exportar CSV</button>`}
function showSettings(){document.getElementById("workArea").innerHTML=`<h3>Definições</h3><div class="row"><span>Utilizadores previstos</span><strong>250</strong></div><div class="row"><span>Base de dados recomendada</span><strong>Supabase/Postgres</strong></div><div class="row"><span>Perfis</span><strong>4 níveis</strong></div><div class="row"><span>Modo atual</span><strong>Demo local</strong></div>`}
function openPersonal(){document.getElementById("workArea").innerHTML=`<h3>Controlo pessoal</h3><div class="row"><span>Banco</span><strong>${currentUser.bank}h</strong></div><div class="row"><span>Extra</span><strong>${currentUser.overtime}h</strong></div><div class="row"><span>Dívida</span><strong>${euro(currentUser.debt)}</strong></div>`}
function exportCSV(){const header="numero;nome;perfil;estado;banco_horas;horas_extra;valor_divida\n";const body=USERS.map(u=>`${u.n};${u.name};${u.role};${u.status};${u.bank};${u.overtime};${u.debt}`).join("\n");const blob=new Blob([header+body],{type:"text/csv;charset=utf-8"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="FEPC_Companhia_Relatorio.csv";a.click();URL.revokeObjectURL(url)}
function euro(v){return new Intl.NumberFormat("pt-PT",{style:"currency",currency:"EUR"}).format(v)}
if("serviceWorker"in navigator){navigator.serviceWorker.register("./service-worker.js")}
loadUsers();
