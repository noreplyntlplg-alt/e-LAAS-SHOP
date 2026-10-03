const state={
  apiUrl:localStorage.getItem("finance_api_url")||"",
  token:localStorage.getItem("finance_token")||"",
  user:JSON.parse(localStorage.getItem("finance_user")||"null"),
  rows:{},
  settings:{}
};

const pages={
 dashboard:["แดชบอร์ด","หน้าหลัก"],
 income:["รายรับ","การเงิน / รายรับ"],
 expense:["รายจ่าย","การเงิน / รายจ่าย"],
 transfer:["โอนเงิน","การเงิน / โอนเงิน"],
 accounts:["เงินสด / ธนาคาร","การเงิน / บัญชี"],
 documents:["ทะเบียนเอกสาร","เอกสาร"],
 customers:["ลูกค้า","ข้อมูลพื้นฐาน / ลูกค้า"],
 suppliers:["ผู้จำหน่าย / เจ้าหนี้","ข้อมูลพื้นฐาน / เจ้าหนี้"],
 reports:["รายงานการเงิน","รายงาน"],
 users:["ผู้ใช้งาน","ระบบ / ผู้ใช้งาน"],
 settings:["ตั้งค่าระบบ","ระบบ / ตั้งค่า"]
};

const schemas={
 INCOME:{title:"รายรับ",fields:[
  ["date","วันที่","date",true],["documentNo","เลขที่เอกสาร","text",true],["description","รายการ","text",true],
  ["party","ผู้ชำระ / แหล่งที่มา","text",false],["amount","จำนวนเงิน","number",true],["accountId","รับเข้าบัญชี","account",false],
  ["category","หมวดรายรับ","text",false],["note","หมายเหตุ","textarea",false]
 ]},
 EXPENSE:{title:"รายจ่าย",fields:[
  ["date","วันที่","date",true],["documentNo","เลขที่เอกสาร","text",true],["description","รายการ","text",true],
  ["party","ผู้รับเงิน / เจ้าหนี้","text",false],["amount","จำนวนเงิน","number",true],["accountId","จ่ายจากบัญชี","account",false],
  ["category","หมวดรายจ่าย","text",false],["note","หมายเหตุ","textarea",false]
 ]},
 ACCOUNTS:{title:"เงินสด / ธนาคาร",fields:[
  ["code","รหัสบัญชี","text",true],["name","ชื่อบัญชี","text",true],["type","ประเภท","accountType",true],
  ["bank","ธนาคาร","text",false],["number","เลขบัญชี","text",false],["openingBalance","ยอดยกมา","number",true],
  ["active","ใช้งาน","checkbox",false]
 ]},
 CUSTOMERS:{title:"ลูกค้า",fields:[
  ["code","รหัส","text",true],["name","ชื่อ / หน่วยงาน","text",true],["taxId","เลขประจำตัวผู้เสียภาษี","text",false],
  ["address","ที่อยู่","textarea",false],["phone","โทรศัพท์","text",false],["email","อีเมล","email",false],["note","หมายเหตุ","textarea",false]
 ]},
 SUPPLIERS:{title:"ผู้จำหน่าย / เจ้าหนี้",fields:[
  ["code","รหัส","text",true],["name","ชื่อ / หน่วยงาน","text",true],["taxId","เลขประจำตัวผู้เสียภาษี","text",false],
  ["address","ที่อยู่","textarea",false],["phone","โทรศัพท์","text",false],["email","อีเมล","email",false],["note","หมายเหตุ","textarea",false]
 ]},
 DOCUMENTS:{title:"ทะเบียนเอกสาร",fields:[
  ["date","วันที่","date",true],["documentNo","เลขที่เอกสาร","text",true],["type","ประเภทเอกสาร","documentType",true],
  ["party","คู่ค้า / ผู้รับ","text",false],["subject","เรื่อง","text",true],["amount","จำนวนเงิน","number",false],
  ["status","สถานะ","documentStatus",true],["note","หมายเหตุ","textarea",false]
 ]},
 USERS:{title:"ผู้ใช้งาน",fields:[
  ["username","ชื่อผู้ใช้งาน","text",true],["name","ชื่อ-นามสกุล","text",true],["role","สิทธิ์","role",true],
  ["active","ใช้งาน","checkbox",false]
 ]}
};

function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function money(v){return Number(v||0).toLocaleString("th-TH",{minimumFractionDigits:2,maximumFractionDigits:2})}
function today(){return new Date().toISOString().slice(0,10)}
function uid(prefix="REC"){return prefix+"-"+Date.now().toString(36).toUpperCase()+"-"+Math.random().toString(36).slice(2,7).toUpperCase()}
function setStatus(t,good=true){const e=document.getElementById("status");e.textContent=t;e.style.background=good?"#e8f3ea":"#f7e3e3";e.style.color=good?"#286e37":"#a32d2d"}

async function api(action,data={}){
  if(!state.apiUrl)throw new Error("ยังไม่ได้ตั้งค่า Google Apps Script Web App URL");
  const response=await fetch(state.apiUrl,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify(Object.assign({action,token:state.token},data))});
  const result=await response.json();
  if(!result.ok)throw new Error(result.error||"เกิดข้อผิดพลาด");
  return result;
}

async function doLogin(){
  const username=document.getElementById("loginUsername").value.trim();
  const password=document.getElementById("loginPassword").value;
  const result=await api("login",{username,password});
  state.token=result.token;state.user=result.user;
  localStorage.setItem("finance_token",state.token);
  localStorage.setItem("finance_user",JSON.stringify(state.user));
  showApp();
}

function showApp(){
  document.getElementById("loginScreen").classList.add("hidden");
  document.getElementById("app").classList.remove("hidden");
  document.getElementById("userInfo").textContent=(state.user?.name||state.user?.username||"ผู้ใช้งาน")+" · "+(state.user?.role||"user");
  loadPage("dashboard");
}

function logout(){
  localStorage.removeItem("finance_token");
  localStorage.removeItem("finance_user");
  location.reload();
}

async function loadSheet(sheet){
  const result=await api("list",{sheet});
  state.rows[sheet]=result.rows||[];
  return state.rows[sheet];
}

function optionList(type){
  if(type==="accountType")return [["เงินสด","เงินสด"],["ธนาคาร","ธนาคาร"]];
  if(type==="documentType")return [
    ["QUOTATION","ใบเสนอราคา"],["INVOICE","ใบแจ้งหนี้"],["BILLING","ใบวางบิล"],["RECEIPT","ใบเสร็จรับเงิน"],
    ["RECEIVE","ใบรับเงิน"],["RECEIVE_VOUCHER","ใบสำคัญรับ"],["PAYMENT_VOUCHER","ใบสำคัญจ่าย"],["CERTIFICATE","หนังสือรับรองการจ่ายเงิน"],["OTHER","อื่นๆ"]
  ];
  if(type==="documentStatus")return [["DRAFT","ร่าง"],["WAIT","รออนุมัติ"],["APPROVED","อนุมัติแล้ว"],["PAID","ชำระแล้ว"],["CANCELLED","ยกเลิก"]];
  if(type==="role")return [["admin","ผู้ดูแลระบบ"],["finance","การเงิน"],["viewer","ผู้ดูข้อมูล"]];
  return [];
}

function formControl(key,label,type,required,value){
  const v=value??"";
  let control="";
  if(type==="textarea")control=`<textarea name="${key}" rows="3">${esc(v)}</textarea>`;
  else if(type==="checkbox")control=`<input name="${key}" type="checkbox" ${v===true||String(v).toLowerCase()==="true"?"checked":""}>`;
  else if(type==="account"){
    const opts=(state.rows.ACCOUNTS||[]).map(r=>[r._id,r.name]);
    control=`<select name="${key}"><option value="">-- เลือก --</option>${opts.map(o=>`<option value="${esc(o[0])}" ${String(v)===String(o[0])?"selected":""}>${esc(o[1])}</option>`).join("")}</select>`;
  }else if(["accountType","documentType","documentStatus","role"].includes(type)){
    const opts=optionList(type);
    control=`<select name="${key}"><option value="">-- เลือก --</option>${opts.map(o=>`<option value="${esc(o[0])}" ${String(v)===String(o[0])?"selected":""}>${esc(o[1])}</option>`).join("")}</select>`;
  }else{
    const actual=(key==="date"&&!v)?today():v;
    control=`<input name="${key}" type="${type}" value="${esc(actual)}" ${required?"required":""}>`;
  }
  return `<div class="form-group ${type==="textarea"?"full":""}"><label>${esc(label)}${required?" *":""}</label>${control}</div>`;
}

function recordForm(sheet,row={}){
  const s=schemas[sheet];
  let html=`<form id="recordForm" data-sheet="${sheet}" data-id="${esc(row._id||"")}"><div class="form-grid">`;
  s.fields.forEach(f=>html+=formControl(f[0],f[1],f[2],f[3],row[f[0]]));
  html+=`</div><div class="form-actions"><button type="button" class="btn" onclick="closeModal()">ยกเลิก</button><button class="btn primary" type="submit">บันทึกข้อมูล</button></div></form>`;
  return html;
}

function collectForm(form){
  const sheet=form.dataset.sheet;
  const obj={_id:form.dataset.id||uid(sheet.slice(0,4))};
  schemas[sheet].fields.forEach(f=>{
    const el=form.elements[f[0]];
    if(!el)return;
    obj[f[0]]=f[2]==="checkbox"?el.checked:el.value;
  });
  return obj;
}

function openModal(title,body){
  document.getElementById("modalTitle").textContent=title;
  document.getElementById("modalBody").innerHTML=body;
  document.getElementById("modal").classList.remove("hidden");
}
function closeModal(){document.getElementById("modal").classList.add("hidden")}

async function saveRecord(form){
  try{
    const row=collectForm(form);
    await api("upsert",{sheet:form.dataset.sheet,row});
    closeModal();
    await loadPage(document.querySelector(".nav-item.active")?.dataset.page||"dashboard");
    Swal.fire({icon:"success",title:"บันทึกข้อมูลแล้ว",timer:1100,showConfirmButton:false});
  }catch(e){Swal.fire("บันทึกไม่สำเร็จ",e.message,"error")}
}

function formatCell(v,type){
  if(v===null||v===undefined||v==="")return "";
  if(type==="number")return money(v);
  if(type==="date"){const d=new Date(v);return isNaN(d)?esc(v):d.toLocaleDateString("th-TH")}
  if(type==="checkbox")return v===true||String(v).toLowerCase()==="true"?"ใช้งาน":"ไม่ใช้งาน";
  const maps={documentStatus:Object.fromEntries(optionList("documentStatus")),documentType:Object.fromEntries(optionList("documentType")),role:Object.fromEntries(optionList("role")),accountType:Object.fromEntries(optionList("accountType"))};
  if(maps[type]&&maps[type][v])return maps[type][v];
  return esc(v);
}

function renderTable(sheet,rows,allowActions=true){
  const s=schemas[sheet];
  if(!rows.length)return `<div class="empty">ยังไม่มีข้อมูลในฐานข้อมูล</div>`;
  let h="<div class='table-wrap'><table class='data-table'><thead><tr>";
  s.fields.forEach(f=>h+=`<th>${esc(f[1])}</th>`);
  if(allowActions)h+="<th>จัดการ</th>";
  h+="</tr></thead><tbody>";
  rows.forEach(r=>{
    h+="<tr>";
    s.fields.forEach(f=>h+=`<td class="${f[2]==="number"?"right":""}">${formatCell(r[f[0]],f[2])}</td>`);
    if(allowActions)h+=`<td><button class="btn" onclick="editRecord('${esc(sheet)}','${esc(r._id)}')">แก้ไข</button> <button class="btn danger" onclick="removeRecord('${esc(sheet)}','${esc(r._id)}')">ลบ</button></td>`;
    h+="</tr>";
  });
  h+="</tbody></table></div>";
  return h;
}

function renderCrud(sheet,page){
  const rows=state.rows[sheet]||[];
  document.getElementById("content").innerHTML=`
  <div class="card panel">
    <div class="panel-head">
      <div><h2>${esc(schemas[sheet].title)}</h2><div class="muted">ข้อมูลจริงจาก Google Sheets จำนวน ${rows.length} รายการ</div></div>
      <div class="toolbar"><button class="btn" onclick="exportExcel('${sheet}')">Excel</button><button class="btn primary" onclick="openModal('เพิ่ม${esc(schemas[sheet].title)}',recordForm('${sheet}'))">＋ เพิ่มรายการ</button></div>
    </div>
    <div class="filters"><input id="searchBox" placeholder="ค้นหาข้อมูล..." oninput="filterCrud('${sheet}')"></div>
    <div id="tableArea">${renderTable(sheet,rows,true)}</div>
  </div>`;
}

function filterCrud(sheet){
  const q=(document.getElementById("searchBox").value||"").toLowerCase();
  const rows=(state.rows[sheet]||[]).filter(r=>JSON.stringify(r).toLowerCase().includes(q));
  document.getElementById("tableArea").innerHTML=renderTable(sheet,rows,true);
}

async function editRecord(sheet,id){
  const row=(state.rows[sheet]||[]).find(r=>String(r._id)===String(id));
  if(!row)return;
  if(sheet==="USERS"){
    openModal("แก้ไขผู้ใช้งาน",userForm(row));
    return;
  }
  openModal("แก้ไข"+schemas[sheet].title,recordForm(sheet,row));
}

async function removeRecord(sheet,id){
  const q=await Swal.fire({icon:"warning",title:"ยืนยันการลบรายการ",text:"ข้อมูลจะถูกลบออกจาก Google Sheets",showCancelButton:true,confirmButtonText:"ลบข้อมูล",cancelButtonText:"ยกเลิก"});
  if(!q.isConfirmed)return;
  try{
    await api("delete",{sheet,id});
    await loadPage(document.querySelector(".nav-item.active")?.dataset.page||"dashboard");
    Swal.fire({icon:"success",title:"ลบข้อมูลแล้ว",timer:1000,showConfirmButton:false});
  }catch(e){Swal.fire("ลบไม่สำเร็จ",e.message,"error")}
}

async function loadPage(page){
  document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.page===page));
  document.getElementById("pageTitle").textContent=pages[page][0];
  document.getElementById("breadcrumb").textContent=pages[page][1];
  setStatus("กำลังโหลด...");
  try{
    if(page==="dashboard")await dashboard();
    else if(page==="reports")await reports();
    else if(page==="settings")settingsPage();
    else if(page==="users"){await loadSheet("USERS");usersPage()}
    else if(page==="transfer"){await Promise.all(["ACCOUNTS","TRANSFERS"].map(loadSheet));transferPage()}
    else{
      const map={income:"INCOME",expense:"EXPENSE",accounts:"ACCOUNTS",documents:"DOCUMENTS",customers:"CUSTOMERS",suppliers:"SUPPLIERS"};
      const sheet=map[page];
      if(page==="income"||page==="expense")await loadSheet(sheet);
      else if(sheet==="ACCOUNTS")await loadSheet("ACCOUNTS");
      else await loadSheet(sheet);
      renderCrud(sheet,page);
    }
    setStatus("เชื่อมต่อแล้ว",true);
  }catch(e){
    setStatus("เชื่อมต่อไม่ได้",false);
    document.getElementById("content").innerHTML=`<div class="card panel"><h2>ไม่สามารถโหลดข้อมูล</h2><p>${esc(e.message)}</p></div>`;
  }
}

async function dashboard(){
  await Promise.all(["INCOME","EXPENSE","ACCOUNTS","DOCUMENTS"].map(loadSheet));
  const income=(state.rows.INCOME||[]).reduce((n,r)=>n+Number(r.amount||0),0);
  const expense=(state.rows.EXPENSE||[]).reduce((n,r)=>n+Number(r.amount||0),0);
  const opening=(state.rows.ACCOUNTS||[]).reduce((n,r)=>n+Number(r.openingBalance||0),0);
  const docs=state.rows.DOCUMENTS||[];
  document.getElementById("content").innerHTML=`
  <div class="grid cards">
    <div class="card metric"><div class="label">รายรับรวม</div><div class="value">${money(income)}</div><div class="sub">${state.rows.INCOME.length} รายการ</div></div>
    <div class="card metric"><div class="label">รายจ่ายรวม</div><div class="value">${money(expense)}</div><div class="sub">${state.rows.EXPENSE.length} รายการ</div></div>
    <div class="card metric"><div class="label">ยอดคงเหลือตามรายการ</div><div class="value">${money(opening+income-expense)}</div><div class="sub">ยอดยกมา + รายรับ - รายจ่าย</div></div>
    <div class="card metric"><div class="label">ทะเบียนเอกสาร</div><div class="value">${docs.length}</div><div class="sub">เอกสารทั้งหมด</div></div>
  </div>
  <div class="two-col">
    <div class="card panel"><div class="panel-head"><h2>รายรับล่าสุด</h2><button class="btn" onclick="loadPage('income')">ดูทั้งหมด</button></div>${renderTable("INCOME",state.rows.INCOME.slice(-8).reverse(),false)}</div>
    <div class="card panel"><div class="panel-head"><h2>รายจ่ายล่าสุด</h2><button class="btn" onclick="loadPage('expense')">ดูทั้งหมด</button></div>${renderTable("EXPENSE",state.rows.EXPENSE.slice(-8).reverse(),false)}</div>
  </div>`;
}

function userForm(row={}){
  return `<form id="userForm" data-id="${esc(row._id||"")}">
  <div class="form-grid">
    ${formControl("username","ชื่อผู้ใช้งาน","text",true,row.username)}
    ${formControl("name","ชื่อ-นามสกุล","text",true,row.name)}
    ${formControl("role","สิทธิ์","role",true,row.role||"viewer")}
    ${formControl("active","ใช้งาน","checkbox",false,row.active!==undefined?row.active:true)}
    <div class="form-group"><label>${row._id?"รหัสผ่านใหม่ (เว้นว่างถ้าไม่เปลี่ยน)":"รหัสผ่าน"}</label><input name="password" type="password" ${row._id?"":"required"}></div>
  </div>
  <div class="form-actions"><button type="button" class="btn" onclick="closeModal()">ยกเลิก</button><button class="btn primary">บันทึก</button></div></form>`;
}

function usersPage(){
  const rows=state.rows.USERS||[];
  document.getElementById("content").innerHTML=`<div class="card panel"><div class="panel-head"><div><h2>ผู้ใช้งาน</h2><div class="muted">จัดการบัญชีผู้ใช้งานระบบ</div></div><button class="btn primary" onclick="openModal('เพิ่มผู้ใช้งาน',userForm())">＋ เพิ่มผู้ใช้งาน</button></div>${renderTable("USERS",rows,true)}</div>`;
}

async function saveUser(form){
  try{
    const obj={_id:form.dataset.id||uid("USR"),username:form.elements.username.value.trim(),name:form.elements.name.value.trim(),role:form.elements.role.value,active:form.elements.active.checked};
    const password=form.elements.password.value;
    if(password)obj.password=password;
    await api("upsertUser",{row:obj});
    closeModal();await loadPage("users");
    Swal.fire({icon:"success",title:"บันทึกผู้ใช้งานแล้ว",timer:1100,showConfirmButton:false});
  }catch(e){Swal.fire("บันทึกไม่สำเร็จ",e.message,"error")}
}

function transferPage(){
  const accounts=state.rows.ACCOUNTS||[];
  document.getElementById("content").innerHTML=`<div class="card panel"><div class="panel-head"><div><h2>โอนเงินระหว่างบัญชี</h2><div class="muted">บันทึกธุรกรรมจริงลง Google Sheets</div></div><button class="btn primary" onclick="openTransfer()">＋ บันทึกการโอน</button></div>${renderTransferTable()}</div>`;
}
function renderTransferTable(){
  const rows=state.rows.TRANSFERS||[];
  if(!rows.length)return `<div class="empty">ยังไม่มีรายการโอนเงิน</div>`;
  return `<div class="table-wrap"><table class="data-table"><thead><tr><th>วันที่</th><th>เลขที่</th><th>จากบัญชี</th><th>ไปบัญชี</th><th>จำนวนเงิน</th><th>หมายเหตุ</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${formatCell(r.date,"date")}</td><td>${esc(r.documentNo)}</td><td>${esc(accountName(r.fromAccountId))}</td><td>${esc(accountName(r.toAccountId))}</td><td class="right">${money(r.amount)}</td><td>${esc(r.note)}</td></tr>`).join("")}</tbody></table></div>`;
}
function accountName(id){const r=(state.rows.ACCOUNTS||[]).find(x=>String(x._id)===String(id));return r?r.name:id||""}
function openTransfer(){
  const opts=(state.rows.ACCOUNTS||[]).map(r=>`<option value="${esc(r._id)}">${esc(r.name)}</option>`).join("");
  openModal("บันทึกการโอนเงิน",`<form id="transferForm"><div class="form-grid">
  <div class="form-group"><label>วันที่ *</label><input name="date" type="date" value="${today()}" required></div>
  <div class="form-group"><label>เลขที่เอกสาร *</label><input name="documentNo" value="TR-${new Date().getFullYear()}-${String((state.rows.TRANSFERS||[]).length+1).padStart(5,"0")}" required></div>
  <div class="form-group"><label>โอนจาก *</label><select name="fromAccountId" required><option value="">-- เลือก --</option>${opts}</select></div>
  <div class="form-group"><label>โอนไป *</label><select name="toAccountId" required><option value="">-- เลือก --</option>${opts}</select></div>
  <div class="form-group"><label>จำนวนเงิน *</label><input name="amount" type="number" step="0.01" min="0.01" required></div>
  <div class="form-group"><label>หมายเหตุ</label><input name="note"></div>
  </div><div class="form-actions"><button type="button" class="btn" onclick="closeModal()">ยกเลิก</button><button class="btn primary">บันทึก</button></div></form>`);
}

async function saveTransfer(form){
  try{
    const row={_id:uid("TRF"),date:form.elements.date.value,documentNo:form.elements.documentNo.value,fromAccountId:form.elements.fromAccountId.value,toAccountId:form.elements.toAccountId.value,amount:form.elements.amount.value,note:form.elements.note.value};
    if(row.fromAccountId===row.toAccountId)throw new Error("บัญชีต้นทางและปลายทางต้องไม่เหมือนกัน");
    await api("upsert",{sheet:"TRANSFERS",row});
    closeModal();await loadPage("transfer");
    Swal.fire({icon:"success",title:"บันทึกการโอนแล้ว",timer:1100,showConfirmButton:false});
  }catch(e){Swal.fire("บันทึกไม่สำเร็จ",e.message,"error")}
}

async function reports(){
  await Promise.all(["INCOME","EXPENSE","ACCOUNTS","TRANSFERS","DOCUMENTS"].map(loadSheet));
  document.getElementById("content").innerHTML=`
  <div class="card panel"><div class="panel-head"><div><h2>รายงานการเงิน</h2><div class="muted">ข้อมูลจากฐานข้อมูลจริง</div></div></div>
  <div class="summary">
    <div class="summary-box"><div class="label">รายรับ</div><div class="value">${money(sum("INCOME"))}</div></div>
    <div class="summary-box"><div class="label">รายจ่าย</div><div class="value">${money(sum("EXPENSE"))}</div></div>
    <div class="summary-box"><div class="label">สุทธิ</div><div class="value">${money(sum("INCOME")-sum("EXPENSE"))}</div></div>
  </div>
  <div class="toolbar" style="margin-top:15px">
    <button class="btn" onclick="exportExcel('INCOME')">Excel รายรับ</button>
    <button class="btn" onclick="exportExcel('EXPENSE')">Excel รายจ่าย</button>
    <button class="btn" onclick="exportExcel('DOCUMENTS')">Excel เอกสาร</button>
    <button class="btn" onclick="exportExcel('ACCOUNTS')">Excel บัญชี</button>
    <button class="btn primary" onclick="downloadFinancialPDF()">PDF รายงานการเงิน</button>
  </div></div>
  <div class="card panel"><div class="panel-head"><h2>ทะเบียนเอกสาร</h2><button class="btn" onclick="loadPage('documents')">จัดการเอกสาร</button></div>${renderTable("DOCUMENTS",state.rows.DOCUMENTS.slice(-15).reverse(),false)}</div>`;
}
function sum(sheet){return (state.rows[sheet]||[]).reduce((n,r)=>n+Number(r.amount||0),0)}

function settingsPage(){
  document.getElementById("content").innerHTML=`<div class="card panel"><div class="panel-head"><h2>ตั้งค่าระบบ</h2></div>
  <div class="form-grid">
    <div class="form-group full"><label>Google Apps Script Web App URL</label><input id="apiUrlInput" value="${esc(state.apiUrl)}" placeholder="https://script.google.com/macros/s/xxxxxxxx/exec"></div>
    <div class="form-group"><label>ชื่อกิจการ</label><input id="businessInput" value="${esc(state.settings.businessName||"ระบบการเงินและเอกสารกิจการ")}"></div>
    <div class="form-group"><label>เลขประจำตัวผู้เสียภาษี</label><input id="taxInput" value="${esc(state.settings.taxId||"")}"></div>
    <div class="form-group full"><label>ที่อยู่กิจการ</label><textarea id="addressInput" rows="3">${esc(state.settings.address||"")}</textarea></div>
    <div class="form-group"><label>โทรศัพท์</label><input id="phoneInput" value="${esc(state.settings.phone||"")}"></div>
    <div class="form-group"><label>อีเมล</label><input id="emailInput" value="${esc(state.settings.email||"")}"></div>
  </div>
  <div class="form-actions"><button class="btn primary" onclick="saveSettings()">บันทึกการตั้งค่า</button><button class="btn" onclick="setupSystem()">ตรวจสอบ/สร้างหัวตารางอัตโนมัติ</button></div>
  <hr><p>การสร้างหัวตารางจะตรวจทุก Sheet ที่ระบบต้องใช้ และเพิ่มเฉพาะหัวตารางที่ขาด โดยไม่ลบข้อมูลเดิม</p>
  </div>`;
}
async function saveSettings(){
  try{
    state.apiUrl=document.getElementById("apiUrlInput").value.trim();
    localStorage.setItem("finance_api_url",state.apiUrl);
    await api("saveSettings",{settings:{businessName:document.getElementById("businessInput").value,taxId:document.getElementById("taxInput").value,address:document.getElementById("addressInput").value,phone:document.getElementById("phoneInput").value,email:document.getElementById("emailInput").value}});
    state.settings=Object.assign({},state.settings,{businessName:document.getElementById("businessInput").value,taxId:document.getElementById("taxInput").value,address:document.getElementById("addressInput").value,phone:document.getElementById("phoneInput").value,email:document.getElementById("emailInput").value});
    document.getElementById("businessName").textContent=state.settings.businessName||"ระบบการเงิน";
    Swal.fire({icon:"success",title:"บันทึกแล้ว",timer:1100,showConfirmButton:false});
  }catch(e){Swal.fire("บันทึกไม่สำเร็จ",e.message,"error")}
}
async function setupSystem(){try{const r=await api("setup");Swal.fire("สำเร็จ","สร้าง/ตรวจสอบหัวตารางทั้งหมด "+r.sheets.length+" ตารางแล้ว","success")}catch(e){Swal.fire("ไม่สำเร็จ",e.message,"error")}}

function exportExcel(sheet){
  const rows=state.rows[sheet]||[];
  if(!rows.length){Swal.fire("ไม่มีข้อมูล","ไม่มีข้อมูลสำหรับส่งออก","info");return}
  const clean=rows.map(r=>{const x={};schemas[sheet]?.fields.forEach(f=>x[f[1]]=r[f[0]]);return Object.keys(x).length?x:r});
  const ws=XLSX.utils.json_to_sheet(clean);
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,(schemas[sheet]?.title||sheet).slice(0,31));
  XLSX.writeFile(wb,`${sheet}_${today()}.xlsx`);
}

function thaiDate(d){return new Date(d).toLocaleDateString("th-TH",{day:"2-digit",month:"2-digit",year:"numeric"})}

function downloadFinancialPDF(){
  const {jsPDF}=window.jspdf;
  const doc=new jsPDF({orientation:"portrait",unit:"mm",format:"a4"});
  const title=state.settings.businessName||"ระบบบริหารการเงินและเอกสารกิจการ";
  doc.setFont("helvetica","normal");
  doc.setFontSize(16);doc.text(title,105,15,{align:"center"});
  doc.setFontSize(13);doc.text("รายงานสรุปการเงิน",105,22,{align:"center"});
  doc.setFontSize(9);doc.text("วันที่ออกรายงาน "+new Date().toLocaleDateString("th-TH"),105,28,{align:"center"});
  doc.autoTable({startY:36,head:[["รายการ","จำนวนเงิน"]],body:[["รายรับรวม",money(sum("INCOME"))],["รายจ่ายรวม",money(sum("EXPENSE"))],["ยอดสุทธิ",money(sum("INCOME")-sum("EXPENSE"))]],styles:{font:"helvetica",fontSize:10}});
  const data=[...(state.rows.INCOME||[]).slice(-20).map(r=>["รายรับ",r.date,r.documentNo,r.description,Number(r.amount||0)]),...(state.rows.EXPENSE||[]).slice(-20).map(r=>["รายจ่าย",r.date,r.documentNo,r.description,Number(r.amount||0)])];
  doc.autoTable({startY:doc.lastAutoTable.finalY+10,head:[["ประเภท","วันที่","เลขที่","รายการ","จำนวนเงิน"]],body:data.map(r=>[r[0],r[1],r[2],r[3],money(r[4])]),styles:{font:"helvetica",fontSize:8}});
  doc.save(`รายงานการเงิน_${today()}.pdf`);
}

function documentForm(row={}){
  return recordForm("DOCUMENTS",row);
}

function previewDocument(row){
  const s=state.settings;
  const html=`<div class="document-preview" id="printDocument">
    <div class="doc-head"><h1>${esc(s.businessName||"ชื่อกิจการ")}</h1><p>${esc(s.address||"")}</p><p>เลขประจำตัวผู้เสียภาษี ${esc(s.taxId||"-")} โทร. ${esc(s.phone||"-")}</p><h1>${esc(optionList("documentType").find(x=>x[0]===row.type)?.[1]||row.type||"เอกสาร")}</h1></div>
    <table style="width:100%;font-size:18px"><tr><td>เลขที่: ${esc(row.documentNo)}</td><td style="text-align:right">วันที่: ${thaiDate(row.date)}</td></tr><tr><td colspan="2">ผู้เกี่ยวข้อง: ${esc(row.party||"-")}</td></tr><tr><td colspan="2">เรื่อง: ${esc(row.subject||"-")}</td></tr></table>
    <table class="doc-table"><thead><tr><th>รายการ</th><th style="width:180px">จำนวนเงิน</th></tr></thead><tbody><tr><td>${esc(row.subject||"")}</td><td style="text-align:right">${money(row.amount)}</td></tr></tbody></table>
    <div class="signatures"><div>ลงชื่อ ................................................<br>ผู้จัดทำ / ผู้รับเงิน</div><div>ลงชื่อ ................................................<br>ผู้อนุมัติ</div></div>
  </div>
  <div class="form-actions"><button class="btn primary" onclick="downloadDocumentPDF('${esc(row._id)}')">บันทึก PDF ลงเครื่อง</button><button class="btn" onclick="closeModal()">ปิด</button></div>`;
  openModal("ตัวอย่างเอกสาร",html);
}
async function downloadDocumentPDF(id){
  const row=(state.rows.DOCUMENTS||[]).find(r=>String(r._id)===String(id));if(!row)return;
  const {jsPDF}=window.jspdf;const doc=new jsPDF({format:"a4"});
  const s=state.settings;
  doc.setFont("helvetica","normal");
  doc.setFontSize(16);doc.text(s.businessName||"ชื่อกิจการ",105,18,{align:"center"});
  doc.setFontSize(10);doc.text(String(s.address||"").slice(0,100),105,25,{align:"center"});
  doc.text("เลขประจำตัวผู้เสียภาษี: "+(s.taxId||"-"),105,31,{align:"center"});
  const type=optionList("documentType").find(x=>x[0]===row.type)?.[1]||row.type;
  doc.setFontSize(15);doc.text(type||"เอกสาร",105,43,{align:"center"});
  doc.setFontSize(10);doc.text("เลขที่: "+row.documentNo,20,55);doc.text("วันที่: "+thaiDate(row.date),145,55);
  doc.text("คู่ค้า/ผู้รับ: "+String(row.party||"-").slice(0,80),20,63);
  doc.text("เรื่อง: "+String(row.subject||"-").slice(0,100),20,71);
  doc.autoTable({startY:78,head:[["รายการ","จำนวนเงิน"]],body:[[row.subject||"",money(row.amount)]],styles:{font:"helvetica",fontSize:10}});
  const y=doc.lastAutoTable.finalY+45;
  doc.text("ลงชื่อ ................................................",35,y);doc.text("ลงชื่อ ................................................",125,y);
  doc.text("ผู้จัดทำ / ผู้รับเงิน",48,y+8);doc.text("ผู้อนุมัติ",143,y+8);
  doc.save(`${row.documentNo||"document"}.pdf`);
}

document.getElementById("loginForm").addEventListener("submit",async e=>{e.preventDefault();try{await doLogin()}catch(err){Swal.fire("เข้าสู่ระบบไม่สำเร็จ",err.message,"error")}});
document.getElementById("logoutBtn").addEventListener("click",logout);
document.getElementById("refreshBtn").addEventListener("click",()=>loadPage(document.querySelector(".nav-item.active")?.dataset.page||"dashboard"));
document.getElementById("menuBtn").addEventListener("click",()=>document.getElementById("sidebar").classList.toggle("open"));
document.getElementById("modalClose").addEventListener("click",closeModal);
document.querySelector(".modal-backdrop").addEventListener("click",closeModal);
document.getElementById("modalBody").addEventListener("submit",async e=>{
  if(e.target.id==="recordForm"){e.preventDefault();await saveRecord(e.target)}
  if(e.target.id==="userForm"){e.preventDefault();await saveUser(e.target)}
  if(e.target.id==="transferForm"){e.preventDefault();await saveTransfer(e.target)}
});
document.querySelector(".sidebar nav").addEventListener("click",e=>{const b=e.target.closest(".nav-item");if(b)loadPage(b.dataset.page)});

async function init(){
  if(state.apiUrl&&state.token){
    document.getElementById("loginScreen").classList.add("hidden");
    document.getElementById("app").classList.remove("hidden");
    try{const r=await api("getSettings");state.settings=r.settings||{};document.getElementById("businessName").textContent=state.settings.businessName||"ระบบการเงิน"}catch{}
    showApp();
  }
}
init();
