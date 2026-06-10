// --- 1. CONFIGURAÇÃO DO SUPABASE ---
// Substitui pelas tuas credenciais do Project Settings > API no Supabase
const supabaseUrl = 'https://helcoktbuyjjygldkcks.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlbGNva3RidXlqanlnbGRrY2tzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3NDIwNjIsImV4cCI6MjA5NjMxODA2Mn0.1Mb8GKOHrFklBZ2RGYa304ECIhTtbwBuafDHbJfbtd0';
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

// --- 2. CONSTANTES GLOBAIS ---
const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const DEFAULT = { baseRate: 9.54, mealAllowance: 129.15, firefighterAllowance: 262.09, shiftAllowance: 361.63, baseMonthlySalary: 1446.51, suppRate: 13.65, hoursPerWeekday: 7, adseRate: 3.5, ssRate: 11, irsRate: 13.53, unionRate: 0.65 };
const shiftHours = { D: 12, N: 12, N4: 4, N8: 8, D7: 7, F: 0, FER: 12, FERIAS: 0, C: -12 };
const nightHours = { D: 0, N: 12, N4: 4, N8: 8, D7: 0, F: 0, FER: 0, FERIAS: 0, C: 0 };

// --- 3. VARIÁVEIS DE ESTADO ---
let currentUser = null;
let isRegistering = false;
let ALL_USERS = []; // Carregado dinamicamente para os administradores

let settings = JSON.parse(localStorage.getItem("fepc_v14_settings") || JSON.stringify(DEFAULT));
let selectedYear = Number(localStorage.getItem("fepc_v14_year") || 2026);
let selectedMonth = Number(localStorage.getItem("fepc_v14_month") || 5);
let selectedDay = null, shifts = {}, manualExtras = {}, monthSettings = {}, receiptValues = {};

// --- 4. SISTEMA DE AUTENTICAÇÃO E PERFIL ---
async function checkSession() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
        await loadUserProfile(session.user.id);
    } else {
        renderAuth();
    }
}

async function loadUserProfile(userId) {
    const { data: profile, error } = await supabaseClient.from('profiles').select('*').eq('id', userId).single();
    console.log("PROFILE:", profile);
    console.log("ERROR:", error);
    if (profile) {
        currentUser = profile;
        currentUser.n = profile.employee_number; // Compatibilidade com a tua lógica antiga
        currentUser.name = profile.full_name;
        currentUser.email = profile.email;

        if (!profile.is_approved) {
            document.getElementById("loginCard").style.display = "none";
            document.getElementById("dashboard").style.display = "none";
            document.getElementById("pendingCard").style.display = "block";
            document.getElementById("btnProfile").style.display = "none";
        } else {
            document.getElementById("pendingCard").style.display = "none";
            document.getElementById("btnProfile").style.display = "inline-block";
            render(); // Carrega o dashboard
        }
    } else {
        renderAuth();
    }
}

function toggleAuthMode() {
    isRegistering = !isRegistering;

    // Atualiza os textos da interface
    document.getElementById("authTitle").innerText = isRegistering ? "Registo" : "Entrar";
    document.getElementById("authHint").innerText = isRegistering ? "Preenche os dados para solicitar acesso." : "Acesso restrito. Usa as tuas credenciais.";
    document.getElementById("authBtn").innerText = isRegistering ? "Registar" : "Entrar";
    document.getElementById("registerFields").style.display = isRegistering ? "block" : "none";
    document.getElementById("confirmPasswordField").style.display = isRegistering ? "block" : "none";


    // A nova funcionalidade: muda o texto do botão de alternância
    const toggleBtn = document.getElementById("toggleAuthBtn");
    if (toggleBtn) {
        toggleBtn.innerText = isRegistering ? "Voltar ao Login" : "Criar Registo";
    }
}

async function handleAuth() {
    const email = document.getElementById("authEmail").value;
    const password = document.getElementById("authPassword").value;

    if (!email || !password) return alert("Preenche o email e a palavra-passe.");

    if (isRegistering) {
        const name = document.getElementById("regName").value;
        const number = document.getElementById("regNumber").value;
        if (!name || !number) return alert("Preenche o nome e o número mecanográfico.");

        const password = document.getElementById("authPassword").value;
        const confirmPassword = document.getElementById("authPasswordConfirm").value;

        if (isRegistering && password !== confirmPassword) {
            alert("As palavras-passe não coincidem.");
            return;
        }

        const { data, error } = await supabaseClient.auth.signUp({
            email: email,
            password: password,
            options: { data: { full_name: name, employee_number: number } }
        });

        if (error) alert("Erro: " + error.message);
        else {
            alert("Registo com sucesso! Aguarda aprovação do Comandante.");
            toggleAuthMode();
        }
    } else {
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) alert("Credenciais inválidas.");
        else await checkSession();
    }
}

async function logout() {
    await supabaseClient.auth.signOut();
    currentUser = null;
    document.getElementById("pendingCard").style.display = "none";
    document.getElementById("btnProfile").style.display = "none";
    renderAuth();
}

function renderAuth() {
    document.getElementById("loginCard").style.display = "block";
    document.getElementById("dashboard").style.display = "none";
}

function openProfileModal() {
    document.getElementById("editName").value = currentUser.name;
    document.getElementById("editEmail").value = currentUser.email || "";
    document.getElementById("editPassword").value = "";
    document.getElementById("profileModal").style.display = "block";
}

async function saveProfile() {
    const newName = document.getElementById("editName").value;
    const newEmail = document.getElementById("editEmail").value.trim();
    const newPassword = document.getElementById("editPassword").value;
    const confirmPassword = document.getElementById("editPasswordConfirm").value;

    if (newName !== currentUser.name) {
        await supabaseClient.from('profiles').update({ full_name: newName }).eq('id', currentUser.id);
    }

    if (newEmail && newEmail !== currentUser.email) {
        const { error } = await supabaseClient.auth.updateUser({
            email: newEmail
        });

        if (error) {
            alert("Erro ao atualizar email: " + error.message);
            return;
        }

        alert("Foi enviado um email de confirmação para o novo endereço.");
    }

    if (newPassword) {
        const { error } = await supabaseClient.auth.updateUser({ password: newPassword });
        if (error) alert("Erro ao atualizar palavra-passe: " + error.message);
    }

    if (newPassword && newPassword !== confirmPassword) {
        alert("As palavras-passe não coincidem.");
        return;
    }

    alert("Perfil atualizado com sucesso!");
    document.getElementById("profileModal").style.display = "none";
    await loadUserProfile(currentUser.id);
}

function canManage() { return ["chefe_equipa", "chefe_brigada", "comandante"].includes(currentUser?.role) }
function roleName(r) { return { pendente: "Pendente", operacional: "Operacional", chefe_equipa: "Chefe de equipa", chefe_brigada: "Chefe de brigada", comandante: "Comandante / Administrador" }[r] || r }

// --- 5. GESTÃO DE DADOS (HORAS) ---
function keyBase() { return `fepc_v14_${currentUser?.n || "local"}_${selectedYear}_${selectedMonth}` }

function loadMonth() {
    shifts = JSON.parse(localStorage.getItem(keyBase() + "_shifts") || "{}");
    manualExtras = JSON.parse(localStorage.getItem(keyBase() + "_extras") || "{}");
    monthSettings = JSON.parse(localStorage.getItem(keyBase() + "_settings") || JSON.stringify({ holidays: 0, vacationDays: 1 }));
    receiptValues = JSON.parse(localStorage.getItem(keyBase() + "_receipt") || "{}");
}

function saveMonth() {
    localStorage.setItem(keyBase() + "_shifts", JSON.stringify(shifts));
    localStorage.setItem(keyBase() + "_extras", JSON.stringify(manualExtras));
    localStorage.setItem(keyBase() + "_settings", JSON.stringify(monthSettings));
    localStorage.setItem(keyBase() + "_receipt", JSON.stringify(receiptValues));
}

// --- 6. RENDERIZAÇÃO E INTERFACE ---
function initSelectors() {
    const y = document.getElementById("yearSelect");
    if (!y || y.children.length) return;
    for (let year = 2025; year <= 2030; year++) {
        let o = document.createElement("option"); o.value = year; o.textContent = year;
        if (year === selectedYear) o.selected = true; y.appendChild(o);
    }
    const m = document.getElementById("monthSelect");
    MONTHS.forEach((name, i) => {
        let o = document.createElement("option"); o.value = i; o.textContent = name;
        if (i === selectedMonth) o.selected = true; m.appendChild(o);
    });
}

function render() {
    document.getElementById("loginCard").style.display = "none";
    document.getElementById("dashboard").style.display = "block";
    initSelectors();
    document.getElementById("userTitle").innerText = `${currentUser.n} · ${currentUser.name}`;
    document.getElementById("roleTitle").innerText = roleName(currentUser.role);
    document.querySelectorAll(".adminOnly").forEach(el => el.style.display = canManage() ? "" : "none");
    loadMonth(); loadSettingsInputs(); loadReceiptValues(); renderCalendar();
    setTab(canManage() ? "companhia" : "pessoal");
    if (canManage()) fetchAllUsers(); // Atualiza painel admin
}

function setTab(tab) {
    document.querySelectorAll(".tab").forEach(t => t.style.display = "none");
    document.getElementById(tab).style.display = "block";
    document.querySelectorAll(".tabs button").forEach(b => b.classList.remove("active"));
    let btn = document.getElementById("tab-" + tab);
    if (btn) btn.classList.add("active");
    calculate();
}

function changePeriod() {
    selectedYear = +document.getElementById("yearSelect").value;
    selectedMonth = +document.getElementById("monthSelect").value;
    localStorage.setItem("fepc_v14_year", selectedYear);
    localStorage.setItem("fepc_v14_month", selectedMonth);
    selectedDay = null;
    loadMonth(); loadReceiptValues(); renderCalendar(); loadSelectedDayPanel();
}

// --- 7. CALENDÁRIO E CÁLCULOS ---
function daysInMonth(y, m) { return new Date(y, m + 1, 0).getDate() }
function firstWeekdayOffset(y, m) { return (new Date(y, m, 1).getDay() + 6) % 7 }
function countWeekdays(y, m) { let c = 0; for (let d = 1; d <= daysInMonth(y, m); d++) { let day = new Date(y, m, d).getDay(); if (day >= 1 && day <= 5) c++ } return c }
function holidayDaysInMonth() { let marked = 0; for (const d in shifts) if (shifts[d] === "FER") marked++; return Math.max(+(monthSettings.holidays || 0), marked) }
function vacationDaysInMonth() { let marked = 0; for (const d in shifts) if (shifts[d] === "FERIAS") marked++; return Math.max(+(monthSettings.vacationDays ?? 1), marked) }
function compDaysInMonth() { let marked = 0; for (const d in shifts) if (shifts[d] === "C") marked++; return marked }
function targetHours() { return Math.max(0, (countWeekdays(selectedYear, selectedMonth) - holidayDaysInMonth() - vacationDaysInMonth()) * 7) }

function renderCalendar() {
    setText("periodTitle", `${MONTHS[selectedMonth]} ${selectedYear}`);
    setText("targetInfo", `Horas necessárias: ${h(targetHours())} (${countWeekdays(selectedYear, selectedMonth)} dias úteis - ${holidayDaysInMonth()} feriados - ${vacationDaysInMonth()} férias)`);
    const cal = document.getElementById("calendar"); cal.innerHTML = "";
    for (let i = 0; i < firstWeekdayOffset(selectedYear, selectedMonth); i++) {
        let b = document.createElement("div"); b.className = "blank"; cal.appendChild(b)
    }
    for (let d = 1; d <= daysInMonth(selectedYear, selectedMonth); d++) {
        const shift = shifts[d] || ""; let btn = document.createElement("button");
        btn.className = "day" + (selectedDay === d ? " selected" : "");
        btn.onclick = () => { selectedDay = d; renderCalendar(); loadSelectedDayPanel() };
        btn.innerHTML = `<span>${d}</span><span class="badge ${shift || ''}">${shift || "-"}</span>`;
        cal.appendChild(btn)
    }
    calculate()
}

function applyShift(shift) {
    if (!selectedDay) { alert("Escolhe primeiro um dia."); return }
    if (shift === "") delete shifts[selectedDay];
    else shifts[selectedDay] = shift;
    saveMonth(); renderCalendar();
}

function loadSelectedDayPanel() {
    setText("selectedDayLabel", selectedDay ? `Dia ${selectedDay} de ${MONTHS[selectedMonth]} ${selectedYear}` : "Nenhum dia selecionado.");
    const e = selectedDay ? (manualExtras[selectedDay] || {}) : {};
    ["manual125", "manual1375", "manual150"].forEach((id, i) => {
        let el = document.getElementById(id); if (el) el.value = [e.e125 || 0, e.e1375 || 0, e.e150 || 0][i]
    })
}

function saveManualExtras() {
    if (!selectedDay) { alert("Escolhe primeiro um dia."); return }
    manualExtras[selectedDay] = { e125: +(document.getElementById("manual125").value || 0), e1375: +(document.getElementById("manual1375").value || 0), e150: +(document.getElementById("manual150").value || 0) };
    saveMonth(); calculate();
}

function loadSettingsInputs() {
    const vals = {
        baseMonthlySalaryInput: settings.baseMonthlySalary, 
        mealAllowanceInput: settings.mealAllowance,
        firefighterAllowanceInput: settings.firefighterAllowance,
        shiftAllowanceInput: settings.shiftAllowance, 
        baseRateInput: settings.baseRate, 
        suppRateInput: settings.suppRate, 
        adseInput: settings.adseRate, 
        ssInput: settings.ssRate, 
        irsInput: settings.irsRate, 
        unionInput: settings.unionRate, 
        holidaysInput: monthSettings.holidays || 0, 
        vacationDaysInput: monthSettings.vacationDays ?? 1
    };
    for (const id in vals) { let el = document.getElementById(id); if (el) el.value = vals[id] }
}

function saveSettings() {
    settings = { 
        baseMonthlySalary: +(document.getElementById("baseMonthlySalaryInput").value || 1446.51), 
        mealAllowance:+(document.getElementById("mealAllowanceInput").value||0),
        firefighterAllowance:+(document.getElementById("firefighterAllowanceInput").value||0),
        shiftAllowance:+(document.getElementById("shiftAllowanceInput").value||0), 
        baseRate: +(document.getElementById("baseRateInput").value || 9.54), 
        suppRate: +(document.getElementById("suppRateInput").value || 13.65), 
        hoursPerWeekday: 7, 
        adseRate: +(document.getElementById("adseInput").value || 3.5), 
        ssRate: +(document.getElementById("ssInput").value || 11), 
        irsRate: +(document.getElementById("irsInput").value || 13.53), 
        unionRate: +(document.getElementById("unionInput").value || 0.65) 
    };
    monthSettings.holidays = +(document.getElementById("holidaysInput").value || 0);
    monthSettings.vacationDays = +(document.getElementById("vacationDaysInput").value || 0);
    localStorage.setItem("fepc_v14_settings", JSON.stringify(settings)); saveMonth(); renderCalendar()
}

function loadReceiptValues() {
    const vals = { paidGross: receiptValues.paidGross || "", paidNet: receiptValues.paidNet || "", paidExtra125: receiptValues.paidExtra125 || "", paidExtra1375: receiptValues.paidExtra1375 || "", paidExtra150: receiptValues.paidExtra150 || "" };
    for (const id in vals) { let el = document.getElementById(id); if (el) el.value = vals[id] }
}

function saveReceiptValues() {
    receiptValues = { paidGross: +(document.getElementById("paidGross").value || 0), paidNet: +(document.getElementById("paidNet").value || 0), paidExtra125: +(document.getElementById("paidExtra125").value || 0), paidExtra1375: +(document.getElementById("paidExtra1375").value || 0), paidExtra150: +(document.getElementById("paidExtra150").value || 0) };
    saveMonth(); calculate()
}

function calculate() {
    let shiftWorked = 0, holidayShiftHours = 0, night = 0, man125 = 0, man1375 = 0, man150 = 0, totalWorkedRaw = 0;
    for (const d in shifts) { const s = shifts[d], hours = shiftHours[s] || 0; totalWorkedRaw += hours; if (s === "FER") holidayShiftHours += hours; else shiftWorked += hours; night += nightHours[s] || 0 }
    for (const d in manualExtras) { const e = manualExtras[d] || {}; man125 += +(e.e125 || 0); man1375 += +(e.e1375 || 0); man150 += +(e.e150 || 0) }
    let needed = targetHours(), automaticExcess = Math.max(0, shiftWorked - needed), e125 = Math.min(automaticExcess, 1) + man125, e1375 = Math.max(0, automaticExcess - 1) + man1375, e150 = holidayShiftHours + man150, totalWorked = totalWorkedRaw + man125 + man1375 + man150, bank = totalWorked - needed;
    let baseSalary = +settings.baseMonthlySalary || 0; let mealAllowance =+settings.mealAllowance || 0;
    let firefighterAllowance =+settings.firefighterAllowance || 0;
    let shiftAllowance =+settings.shiftAllowance || 0;
    let fixedSupplements =mealAllowance +firefighterAllowance +shiftAllowance;
    let overtime125Value = e125 * settings.suppRate * 1.25, overtime1375Value = e1375 * settings.suppRate * 1.375, overtime150Value = e150 * settings.suppRate * 1.5, overtimeTotal = overtime125Value + overtime1375Value + overtime150Value, fixedGross = baseSalary + fixedSupplements, gross = fixedGross + overtimeTotal, adse = baseSalary * settings.adseRate / 100, ss = gross * settings.ssRate / 100, irs = gross * settings.irsRate / 100, sindicato = baseSalary * settings.unionRate / 100, totalDesc = adse + ss + irs + sindicato, net = gross - totalDesc, paidGross = +(receiptValues.paidGross || 0), paidNet = +(receiptValues.paidNet || 0);

    const map = { 
        totalHours: h(totalWorked), 
        targetHours: h(needed), 
        nightHours: h(night), 
        extra125: h(e125), 
        extra1375: h(e1375), 
        holiday150: h(e150), 
        vacationDaysCount: vacationDaysInMonth(), 
        holidayDaysCount: holidayDaysInMonth(), 
        compDaysCount: compDaysInMonth(), 
        bankHours: (bank >= 0 ? "+" : "") + h(bank), 
        fixedBaseSalary: euro(baseSalary),
        mealAllowanceValue:euro(mealAllowance),
        firefighterAllowanceValue:euro(firefighterAllowance),
        shiftAllowanceValue:euro(shiftAllowance),
        fixedSupplementsValue: euro(fixedSupplements), 
        fixedGrossTotal: euro(fixedGross), 
        overtime125Detail: `${h(e125)} · ${euro(overtime125Value)}`, 
        overtime1375Detail: `${h(e1375)} · ${euro(overtime1375Value)}`, 
        overtime150Detail: `${h(e150)} · ${euro(overtime150Value)}`, 
        overtimeTotalValue: euro(overtimeTotal), 
        adse: euro(adse), 
        ss: euro(ss), 
        irs: euro(irs), 
        sindicato: euro(sindicato), 
        totalDesc: euro(totalDesc), 
        resultFixedGross: euro(fixedGross), 
        resultOvertimeGross: euro(overtimeTotal), 
        totalGross: euro(gross), 
        resultDiscounts: euro(totalDesc), 
        netPay: euro(net), 
        grossDebt: euro(paidGross > 0 ? gross - paidGross : 0), 
        netDebt: euro(paidNet > 0 ? net - paidNet : 0), 
        missing125: h(Math.max(0, e125 - (receiptValues.paidExtra125 || 0))), 
        missing1375: h(Math.max(0, e1375 - (receiptValues.paidExtra1375 || 0))), 
        missing150: h(Math.max(0, e150 - (receiptValues.paidExtra150 || 0))) 
};
    for (const id in map) setText(id, map[id]);
    renderCompany(paidGross > 0 ? gross - paidGross : 0, e125 + e1375 + e150);
}

function setText(id, v) { let el = document.getElementById(id); if (el) el.innerText = v }

// --- 8. ADMINISTRAÇÃO E COMPANHIA ---
async function fetchAllUsers() {
    const { data, error } = await supabaseClient.from('profiles').select('*').order('created_at', { ascending: false });
    if (data) ALL_USERS = data;
}

function renderCompany(currentDebt = 0, currentOT = 0) {
    const ativos = ALL_USERS.filter(u => u.is_approved).length;
    const pendentes = ALL_USERS.filter(u => !u.is_approved).length;

    setText("onDuty", ativos); // Substitui status estático para mostrar total de membros ativos na BD
    setText("vacations", pendentes); // Mostra os perfis por aprovar
    setText("absences", 0);
    setText("companyOvertime", h(currentOT));
    setText("companyDebt", euro(currentDebt));
}

async function showUsers() {
    await fetchAllUsers(); // Refresca os dados
    let html = `<h3>Utilizadores Registados (${ALL_USERS.length})</h3>
    <table class="table"><thead><tr><th>Nº</th><th>Nome</th><th>Perfil</th><th>Aprovação</th></tr></thead><tbody>`;

    ALL_USERS.forEach(u => {
        html += `<tr>
      <td>${u.employee_number}</td>
      <td>${u.full_name}</td>
      <td>
        <select onchange="updateUserRole('${u.id}', this.value)">
          <option value="pendente" ${u.role === 'pendente' ? 'selected' : ''}>Pendente</option>
          <option value="operacional" ${u.role === 'operacional' ? 'selected' : ''}>Operacional</option>
          <option value="chefe_equipa" ${u.role === 'chefe_equipa' ? 'selected' : ''}>Chefe Equipa</option>
          <option value="chefe_brigada" ${u.role === 'chefe_brigada' ? 'selected' : ''}>Chefe Brigada</option>
          <option value="comandante" ${u.role === 'comandante' ? 'selected' : ''}>Comandante</option>
        </select>
      </td>
      <td>
        ${u.is_approved
                ? '<span style="color:var(--green)">Ativo</span>'
                : `<button class="small" onclick="approveUser('${u.id}')">Aprovar</button>`}
      </td>
    </tr>`;
    });
    html += `</tbody></table>`;
    document.getElementById("workArea").innerHTML = html;
}

async function approveUser(userId) {
    const { error } = await supabaseClient.from('profiles').update({ is_approved: true }).eq('id', userId);
    if (!error) {
        alert('Utilizador aprovado com sucesso!');
        showUsers();
    } else {
        alert('Erro ao aprovar: ' + error.message);
    }
}

async function updateUserRole(userId, newRole) {
    const { error } = await supabaseClient.from('profiles').update({ role: newRole }).eq('id', userId);
    if (!error) alert('Perfil atualizado com sucesso!');
}

function showSchedule() { document.getElementById("workArea").innerHTML = `<h3>Escala Geral</h3><p class="hint">Necessário base de dados remota de turnos para preencher.</p><div class="row"><span>D/N</span><strong>12h</strong></div><div class="row"><span>Férias</span><strong>-7h</strong></div><div class="row"><span>Compensação</span><strong>-12h</strong></div><div class="row"><span>FER</span><strong>150%</strong></div>` }
function showReports() { document.getElementById("workArea").innerHTML = `<h3>Relatórios</h3><button class="primary" onclick="exportCSV()">Exportar CSV Utilizadores</button>` }
function showSettings() { document.getElementById("workArea").innerHTML = `<h3>Definições companhia</h3><div class="row"><span>Ligação</span><strong>Supabase (Ativa)</strong></div><div class="row"><span>Modo de Autenticação</span><strong>Email/Palavra-passe</strong></div>` }

function exportCSV() {
    const csv = "numero;nome;perfil;estado\n" + ALL_USERS.map(u => `${u.employee_number};${u.full_name};${u.role};${u.is_approved ? 'Ativo' : 'Pendente'}`).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "FEPC_v14_utilizadores.csv"; a.click(); URL.revokeObjectURL(url);
}

// --- 9. FORMATADORES ---
function h(v) { const sign = v < 0 ? "-" : ""; v = Math.abs(v); const hours = Math.floor(v), minutes = Math.round((v - hours) * 60); return minutes ? `${sign}${hours}h${String(minutes).padStart(2, "0")}` : `${sign}${hours}h` }
function euro(v) { return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(v) }

// Registo do Service Worker para cache (App instalável / PWA)
if ("serviceWorker" in navigator) navigator.serviceWorker.register("./service-worker.js");

// Arranca o fluxo verificando se alguém tem a sessão iniciada
checkSession();