const DB_KEY="tuitionTrackerDB_v2";
const SESSION_KEY="tuitionTrackerSession_v2";
const DEFAULT_VIEWER_CODE="1234";

const seed={users:[],records:[],viewerCode:DEFAULT_VIEWER_CODE};
function loadDB(){try{const d=JSON.parse(localStorage.getItem(DB_KEY));return d||structuredClone(seed)}catch{return structuredClone(seed)}}
function saveDB(db){localStorage.setItem(DB_KEY,JSON.stringify(db))}
function session(){return JSON.parse(localStorage.getItem(SESSION_KEY)||"null")}
function setSession(u){localStorage.setItem(SESSION_KEY,JSON.stringify({id:u.id,name:u.name,mode:"admin"}))}
function setViewerSession(){localStorage.setItem(SESSION_KEY,JSON.stringify({id:"viewer",name:"View Only User",mode:"viewer"}))}
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,8)}
function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function fmtDate(v){if(!v)return "Not paid";const d=new Date(v+"T00:00:00");return d.toLocaleDateString(undefined,{day:"2-digit",month:"short",year:"numeric"})}
const app=document.getElementById("app");

function authPage(mode="login",msg=""){
  if(mode==="viewer") return viewerLogin(msg);
  const register=mode==="register";
  app.innerHTML=`<main class="auth"><section class="card auth-card">
    <div class="brand">Tuition Fees Tracker</div><div class="muted">Choose how you want to access the tracker</div>
    <div class="mode-buttons"><button class="mode-btn active" id="adminMode">👨‍💼 Admin Login</button><button class="mode-btn" id="viewerMode">👁 View Only</button></div>
    ${msg?`<div class="error">${esc(msg)}</div>`:""}
    <form id="authForm">
      ${register?`<div class="field"><label>Full Name</label><input id="name" required autocomplete="name"></div><div class="field"><label>Date of Birth</label><input id="dob" type="date" required>`:""}
      <div class="field"><label>Username</label><input id="username" required autocomplete="username"></div>
      <div class="field"><label>Password</label><input id="password" type="password" required autocomplete="${register?"new-password":"current-password"}"></div>
      <button class="primary">${register?"Create Admin Account":"Admin Login"}</button>
    </form>
    <div class="auth-switch">${register?"Already have an admin account?":"Don't have an admin account?"} <button class="link-btn" id="switchAuth">${register?"Login":"Register"}</button></div>
  </section></main>`;
  document.getElementById("viewerMode").onclick=()=>authPage("viewer");
  document.getElementById("adminMode").onclick=()=>authPage(register?"register":"login");
  document.getElementById("switchAuth").onclick=()=>authPage(register?"login":"register");
  document.getElementById("authForm").onsubmit=e=>{
    e.preventDefault();const db=loadDB(),username=document.getElementById("username").value.trim().toLowerCase(),password=document.getElementById("password").value;
    if(register){const name=document.getElementById("name").value.trim(),dob=document.getElementById("dob").value;if(db.users.some(u=>u.username===username))return authPage("register","Username already exists.");const u={id:uid(),name,dob,username,password};db.users.push(u);saveDB(db);setSession(u);dashboard();}
    else{const u=db.users.find(x=>x.username===username&&x.password===password);if(!u)return authPage("login","Incorrect username or password.");setSession(u);dashboard();}
  };
}
function viewerLogin(msg=""){
  app.innerHTML=`<main class="auth"><section class="card auth-card">
    <div class="brand">View Only Access</div><div class="muted">Enter the 4 or 6 digit access code to view tuition records.</div>
    ${msg?`<div class="error">${esc(msg)}</div>`:""}
    <form id="viewerForm"><div class="field"><label>Access Code</label><input id="code" class="pin" inputmode="numeric" maxlength="6" minlength="4" pattern="[0-9]{4}|[0-9]{6}" placeholder="••••" required><div class="pin-hint">4 or 6 digits</div></div><button class="primary">Enter View Only Mode</button></form>
    <div class="auth-switch"><button class="link-btn" id="back">← Back to Admin Login</button></div>
  </section></main>`;
  document.getElementById("back").onclick=()=>authPage("login");
  document.getElementById("viewerForm").onsubmit=e=>{e.preventDefault();const code=document.getElementById("code").value.trim(),db=loadDB();if(!/^(\\d{4}|\\d{6})$/.test(code))return viewerLogin("Code must contain exactly 4 or 6 digits.");if(code!==String(db.viewerCode))return viewerLogin("Incorrect view-only access code.");setViewerSession();dashboard()};
}

function dashboard(){
  if(!session())return authPage();
  const s=session();
  app.innerHTML=`<div class="shell"><header class="topbar"><div class="title">Tuition Fees Tracker</div><div class="top-actions"><span class="user-badge">${esc(s.name)} · ${s.mode==="viewer"?"View Only":"Admin"}</span><button class="secondary" id="refresh">↻ Refresh</button><button class="danger" id="logout">Logout</button></div></header>
  <main class="content"><div class="toolbar"><div><h1>Fee Records</h1><div class="muted">Track teachers, subjects, joining dates and payments.</div></div><div class="toolbar-actions">${s.mode==="admin"?`<button class="primary" style="width:auto" id="add">+ Add Record</button><button class="secondary" id="account">Account</button>`:`<span class="view-only">VIEW ONLY MODE</span>`}</div></div>
  <section class="stats" id="stats"></section><div class="filters"><input id="search" placeholder="Search teacher or subject"><select id="filter"><option value="all">All payments</option><option value="paid">Paid</option><option value="unpaid">Unpaid</option></select></div>
  <section class="card table-card"><table class="table"><thead><tr><th>Teacher</th><th>Subject</th><th>Joining Date</th><th>Payment</th><th>Date Paid</th>${s.mode==="admin"?"<th>Actions</th>":""}</tr></thead><tbody id="rows"></tbody></table></section></main></div><div id="modal"></div>`;
  document.getElementById("refresh").onclick=dashboard;document.getElementById("logout").onclick=()=>{localStorage.removeItem(SESSION_KEY);authPage()};
  if(s.mode==="admin"){document.getElementById("add").onclick=()=>recordModal();document.getElementById("account").onclick=accountModal}
  renderTable();document.getElementById("search").oninput=renderTable;document.getElementById("filter").onchange=renderTable;
}
function renderTable(){
  const db=loadDB(),q=document.getElementById("search").value.toLowerCase(),f=document.getElementById("filter").value,list=db.records.filter(r=>(!q||r.teacher.toLowerCase().includes(q)||r.subject.toLowerCase().includes(q))&&(f==="all"||r.status===f));
  const paid=list.filter(r=>r.status==="paid").length,unpaid=list.filter(r=>r.status==="unpaid").length;
  document.getElementById("stats").innerHTML=`<div class="card stat"><div class="label">Total Records</div><div class="num">${list.length}</div></div><div class="card stat"><div class="label">Paid</div><div class="num">${paid}</div></div><div class="card stat"><div class="label">Unpaid</div><div class="num">${unpaid}</div></div><div class="card stat"><div class="label">Last Updated</div><div class="num" style="font-size:18px">${new Date().toLocaleDateString()}</div></div>`;
  const admin=session().mode==="admin";document.getElementById("rows").innerHTML=list.length?list.map(r=>`<tr><td><strong>${esc(r.teacher)}</strong></td><td>${esc(r.subject)}</td><td>${fmtDate(r.joining)}</td><td><span class="status ${r.status}">${r.status==="paid"?"PAID":"UNPAID"}</span></td><td>${fmtDate(r.paidDate)}</td>${admin?`<td><button class="secondary" onclick="recordModal('${r.id}')">Edit</button> <button class="danger" onclick="deleteRecord('${r.id}')">Delete</button></td>`:""}</tr>`).join(""):`<tr><td colspan="${admin?6:5}" class="empty">No records found.</td></tr>`;
}
function recordModal(id=null){
  const db=loadDB(),r=id?db.records.find(x=>x.id===id):{teacher:"",subject:"",joining:"",status:"unpaid",paidDate:""};
  document.getElementById("modal").innerHTML=`<div class="modal-bg"><section class="card modal"><div class="modal-head"><h2>${id?"Edit":"Add"} Fee Record</h2><button class="close" id="close">×</button></div><form id="recordForm"><div class="field"><label>Teacher's Name</label><input id="teacher" required value="${esc(r.teacher)}"></div><div class="field"><label>Subject</label><input id="subject" required value="${esc(r.subject)}"></div><div class="grid2"><div class="field"><label>Date of Joining</label><input id="joining" type="date" required value="${esc(r.joining)}"></div><div class="field"><label>Payment Status</label><select id="status"><option value="unpaid" ${r.status==="unpaid"?"selected":""}>UNPAID</option><option value="paid" ${r.status==="paid"?"selected":""}>PAID</option></select></div></div><div class="field"><label>Date When Paid</label><input id="paidDate" type="date" value="${esc(r.paidDate||"")}"><div class="calendar-note">Use the calendar picker. A paid date is stored only when marked PAID.</div></div><div class="modal-actions"><button type="button" class="secondary" id="cancel">Cancel</button><button class="primary" style="width:auto">Save Record</button></div></form></section></div>`;
  document.getElementById("close").onclick=closeModal;document.getElementById("cancel").onclick=closeModal;const status=document.getElementById("status"),paid=document.getElementById("paidDate");function sync(){paid.disabled=status.value!=="paid";if(status.value!=="paid")paid.value=""}status.onchange=sync;sync();
  document.getElementById("recordForm").onsubmit=e=>{e.preventDefault();const db=loadDB(),item={id:id||uid(),teacher:document.getElementById("teacher").value.trim(),subject:document.getElementById("subject").value.trim(),joining:document.getElementById("joining").value,status:status.value,paidDate:status.value==="paid"?paid.value:""};const idx=db.records.findIndex(x=>x.id===item.id);if(idx>=0)db.records[idx]=item;else db.records.push(item);saveDB(db);closeModal();dashboard()};
}
function closeModal(){document.getElementById("modal").innerHTML=""}
function deleteRecord(id){if(!confirm("Delete this fee record?"))return;const db=loadDB();db.records=db.records.filter(r=>r.id!==id);saveDB(db);dashboard()}
function accountModal(){
  const db=loadDB(),u=db.users.find(x=>x.id===session().id);
  document.getElementById("modal").innerHTML=`<div class="modal-bg"><section class="card modal"><div class="modal-head"><h2>Account & View-Only Code</h2><button class="close" id="close">×</button></div><p class="muted">Admin account: ${esc(u.name)}</p><div class="field"><label>Current View-Only Code</label><input value="${esc(db.viewerCode)}" disabled></div><hr><h3>Change View-Only Code</h3><p class="muted">Use exactly 4 or 6 digits. Anyone with this code can view records.</p><form id="codeForm"><div class="field"><label>New Code</label><input id="newCode" class="pin" inputmode="numeric" maxlength="6" minlength="4" pattern="[0-9]{4}|[0-9]{6}" required></div><div id="codeMsg"></div><div class="modal-actions"><button type="button" class="secondary" id="cancel">Close</button><button class="primary" style="width:auto">Save Code</button></div></form></section></div>`;
  document.getElementById("close").onclick=closeModal;document.getElementById("cancel").onclick=closeModal;
  document.getElementById("codeForm").onsubmit=e=>{e.preventDefault();const code=document.getElementById("newCode").value.trim();if(!/^(\\d{4}|\\d{6})$/.test(code)){document.getElementById("codeMsg").innerHTML='<div class="error">Code must be exactly 4 or 6 digits.</div>';return}db.viewerCode=code;saveDB(db);document.getElementById("codeMsg").innerHTML='<div class="success">View-only code updated.</div>';document.getElementById("newCode").value=""};
}
if(session())dashboard();else authPage();
