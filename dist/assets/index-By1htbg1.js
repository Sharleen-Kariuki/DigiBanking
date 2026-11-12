(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const a of document.querySelectorAll('link[rel="modulepreload"]'))s(a);new MutationObserver(a=>{for(const r of a)if(r.type==="childList")for(const i of r.addedNodes)i.tagName==="LINK"&&i.rel==="modulepreload"&&s(i)}).observe(document,{childList:!0,subtree:!0});function e(a){const r={};return a.integrity&&(r.integrity=a.integrity),a.referrerPolicy&&(r.referrerPolicy=a.referrerPolicy),a.crossOrigin==="use-credentials"?r.credentials="include":a.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function s(a){if(a.ep)return;a.ep=!0;const r=e(a);fetch(a.href,r)}})();const F="digibanking_theme",H="digibanking_font_size",Z={blue:{label:"Navy Blue",primaryHex:"#1e3a8a",desc:"Classic Corporate Banking"},green:{label:"Emerald Green",primaryHex:"#047857",desc:"Wealth & Digital Finance"},burgundy:{label:"Burgundy",primaryHex:"#831843",desc:"Private & Premier Banking"}};class ee{currentTheme="blue";currentFontSize=16;listeners=[];constructor(){this.loadFromStorage(),this.apply()}loadFromStorage(){const t=localStorage.getItem(F);t&&(t==="blue"||t==="green"||t==="burgundy")?this.currentTheme=t:this.currentTheme="blue";const e=localStorage.getItem(H);if(e){const s=parseInt(e,10);!isNaN(s)&&s>=12&&s<=20&&(this.currentFontSize=s)}}getTheme(){return this.currentTheme}setTheme(t){this.currentTheme=t,localStorage.setItem(F,t),this.apply(),this.notify()}getFontSize(){return this.currentFontSize}setFontSize(t){const e=Math.max(12,Math.min(20,t));this.currentFontSize=e,localStorage.setItem(H,String(e)),this.apply(),this.notify()}apply(){this.currentTheme==="blue"?document.documentElement.removeAttribute("data-theme"):document.documentElement.setAttribute("data-theme",this.currentTheme),document.documentElement.style.fontSize=`${this.currentFontSize}px`}subscribe(t){return this.listeners.push(t),()=>{this.listeners=this.listeners.filter(e=>e!==t)}}notify(){this.listeners.forEach(t=>{try{t()}catch(e){console.error("ThemeManager listener error:",e)}})}}const S=new ee,O="digibanking_api_base_url",V="http://localhost:3000/api/v1";class te{currentBaseUrl;listeners=[];constructor(){const t=localStorage.getItem(O);this.currentBaseUrl=t&&t.trim()?t.trim():V}getBaseUrl(){return this.currentBaseUrl.replace(/\/+$/,"")}setBaseUrl(t){const e=t.trim().replace(/\/+$/,"");this.currentBaseUrl=e,localStorage.setItem(O,e),this.notifyListeners()}resetToDefault(){this.setBaseUrl(V)}subscribe(t){return this.listeners.push(t),()=>{this.listeners=this.listeners.filter(e=>e!==t)}}notifyListeners(){this.listeners.forEach(t=>{try{t(this.currentBaseUrl)}catch(e){console.error("Error in ApiConfig listener:",e)}})}async checkHealth(){const t=`${this.getBaseUrl()}/health`,e=performance.now();try{const s=new AbortController,a=setTimeout(()=>s.abort(),4e3),r=await fetch(t,{signal:s.signal,headers:{Accept:"application/xml, text/xml, */*"}});clearTimeout(a);const i=Math.round(performance.now()-e);if(!r.ok)return{online:!1,latencyMs:i,error:`HTTP ${r.status}: ${r.statusText}`};const n=await r.text(),d=new DOMParser().parseFromString(n,"application/xml"),p=d.querySelector("status"),h=d.querySelector("service"),y=d.querySelector("database"),E=d.querySelector("timestamp");return{online:p?.textContent?.toLowerCase()==="ok",service:h?.textContent||void 0,database:y?.textContent||void 0,timestamp:E?.textContent||void 0,latencyMs:i}}catch(s){return{online:!1,latencyMs:Math.round(performance.now()-e),error:s instanceof Error?s.message:"Connection failed"}}}}const v=new te;class c{static container=null;static ensureContainer(){return this.container||(this.container=document.createElement("div"),this.container.className="toast-container",this.container.setAttribute("aria-live","polite"),this.container.setAttribute("aria-atomic","true"),document.body.appendChild(this.container)),this.container}static show(t,e="info",s=5e3){const a=this.ensureContainer(),r=document.createElement("div");r.className=`toast toast-${e}`,r.setAttribute("role","status");const i={info:'<i class="fa-solid fa-circle-info"></i>',success:'<i class="fa-solid fa-circle-check"></i>',warning:'<i class="fa-solid fa-triangle-exclamation"></i>',danger:'<i class="fa-solid fa-circle-xmark"></i>'};r.innerHTML=`
      <span class="toast-icon" aria-hidden="true">${i[e]}</span>
      <div class="toast-message">${t}</div>
    `,a.appendChild(r),setTimeout(()=>{r.style.transition="all 200ms ease",r.style.opacity="0",r.style.transform="translateY(8px)",setTimeout(()=>{r.remove()},200)},s)}static success(t,e=5e3){this.show(t,"success",e)}static error(t,e=7e3){this.show(t,"danger",e)}static warning(t,e=6e3){this.show(t,"warning",e)}static info(t,e=5e3){this.show(t,"info",e)}}class B{static instance=null;backdropEl;drawerEl;previouslyFocusedEl=null;constructor(){this.backdropEl=document.createElement("div"),this.backdropEl.className="drawer-backdrop",this.backdropEl.setAttribute("role","dialog"),this.backdropEl.setAttribute("aria-modal","true"),this.backdropEl.setAttribute("aria-labelledby","drawer-title-id"),this.drawerEl=document.createElement("aside"),this.drawerEl.className="side-drawer",this.render(),this.bindEvents()}static open(){this.instance||(this.instance=new B),this.instance.show()}render(){const t=S.getTheme(),e=S.getFontSize(),s=v.getBaseUrl();this.drawerEl.innerHTML=`
      <div class="drawer-header">
        <h3 id="drawer-title-id" class="drawer-title">
          Portal Settings
        </h3>
        <button type="button" class="drawer-close-btn" id="drawer-close-btn" aria-label="Close Settings Drawer">
          &times;
        </button>
      </div>

      <div class="drawer-body">
        <!-- Section 1: Appearance & Color Themes -->
        <div class="drawer-section">
          <div class="drawer-section-title">
            Color Theme
          </div>
          <p style="font-size: 0.8rem; color: var(--neutral-500); margin-bottom: 0.25rem;">
            Choose an institutional digital banking color scheme:
          </p>

          <div class="theme-selector-grid">
            <!-- Blue -->
            <button
              type="button"
              class="theme-card ${t==="blue"?"active":""}"
              data-theme="blue"
              title="Classic Navy Blue Corporate Banking Theme"
            >
              <div class="theme-color-disc" style="background: linear-gradient(135deg, #1e3a8a, #3b82f6);">
                ${t==="blue"?'<i class="fa-solid fa-check"></i>':""}
              </div>
              <span class="theme-card-label">Navy Blue</span>
            </button>

            <!-- Green -->
            <button
              type="button"
              class="theme-card ${t==="green"?"active":""}"
              data-theme="green"
              title="Emerald Green Wealth & Investment Banking Theme"
            >
              <div class="theme-color-disc" style="background: linear-gradient(135deg, #047857, #10b981);">
                ${t==="green"?'<i class="fa-solid fa-check"></i>':""}
              </div>
              <span class="theme-card-label">Emerald</span>
            </button>

            <!-- Burgundy -->
            <button
              type="button"
              class="theme-card ${t==="burgundy"?"active":""}"
              data-theme="burgundy"
              title="Rich Burgundy Premier Banking Theme"
            >
              <div class="theme-color-disc" style="background: linear-gradient(135deg, #831843, #be185d);">
                ${t==="burgundy"?'<i class="fa-solid fa-check"></i>':""}
              </div>
              <span class="theme-card-label">Burgundy</span>
            </button>
          </div>
        </div>

        <!-- Section 2: Font Size Slider -->
        <div class="drawer-section">
          <div class="drawer-section-title">
             Interface Font Size
          </div>
          <p style="font-size: 0.8rem; color: var(--neutral-500); margin-bottom: 0.25rem;">
            Adjust the typography size across all tables, forms, and cards:
          </p>

          <div class="font-slider-container">
            <div class="font-slider-header">
              <span style="font-size: 0.85rem; font-weight: 600; color: var(--neutral-700);">Current Size:</span>
              <span class="font-slider-value" id="font-slider-readout">${e}px</span>
            </div>

            <input
              type="range"
              id="font-size-slider"
              class="font-slider-input"
              min="13"
              max="19"
              step="1"
              value="${e}"
              aria-label="Font size slider"
            />

            <div class="font-slider-ticks">
              <span>13px (Compact)</span>
              <span>16px (Default)</span>
              <span>19px (Large)</span>
            </div>

            <div class="font-preset-buttons">
              <button type="button" class="font-preset-btn ${e===14?"active":""}" data-size="14">
                Compact (14px)
              </button>
              <button type="button" class="font-preset-btn ${e===16?"active":""}" data-size="16">
                Default (16px)
              </button>
              <button type="button" class="font-preset-btn ${e===18?"active":""}" data-size="18">
                Large (18px)
              </button>
            </div>
          </div>
        </div>

        <!-- Section 3: API & Service Endpoint -->
        <div class="drawer-section">
        
        

          <div class="form-group" style="margin-bottom: 0.75rem;">
            <label class="form-label" for="drawer-api-url" style="font-size: 0.8rem;">API Base Address</label>
            <input
              type="url"
              id="drawer-api-url"
              class="form-control"
              style="font-size: 0.85rem;"
              value="${s}"
              placeholder="http://localhost:3000/api/v1"
            />
          </div>

          

          <div style="background-color: var(--neutral-50); border: 1px solid var(--neutral-200); border-radius: var(--radius-md); padding: 0.85rem;">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <span style="font-weight: 600; font-size: 0.8rem; color: var(--neutral-700);">API Connection Test:</span>
              <button type="button" class="btn btn-sm btn-outline-primary" id="drawer-btn-ping">
                Test /health
              </button>
            </div>
            <div id="drawer-ping-output" style="margin-top: 0.5rem; font-size: 0.8rem; color: var(--neutral-600);">
              Click "Test /health" to check connection.
            </div>
          </div>

          <button type="button" class="btn btn-primary" id="drawer-btn-save-api" style="width: 100%; margin-top: 0.75rem;">
            Save API Settings
          </button>
        </div>
      </div>
    `,this.backdropEl.appendChild(this.drawerEl)}bindEvents(){this.backdropEl.addEventListener("click",i=>{i.target===this.backdropEl&&this.hide()}),this.backdropEl.addEventListener("keydown",i=>{i.key==="Escape"&&this.hide()}),this.drawerEl.querySelector("#drawer-close-btn")?.addEventListener("click",()=>{this.hide()}),this.drawerEl.querySelectorAll(".theme-card").forEach(i=>{i.addEventListener("click",()=>{const n=i.dataset.theme;n&&(S.setTheme(n),this.updateActiveTheme(n),c.info(`Theme switched to ${Z[n].label}.`))})});const t=this.drawerEl.querySelector("#font-size-slider"),e=this.drawerEl.querySelector("#font-slider-readout");t.addEventListener("input",()=>{const i=parseInt(t.value,10);e.textContent=`${i}px`,S.setFontSize(i),this.updateActiveFontPresets(i)}),this.drawerEl.querySelectorAll(".font-preset-btn").forEach(i=>{i.addEventListener("click",()=>{const n=parseInt(i.dataset.size||"16",10);t.value=String(n),e.textContent=`${n}px`,S.setFontSize(n),this.updateActiveFontPresets(n)})});const s=this.drawerEl.querySelector("#drawer-api-url");this.drawerEl.querySelector("#drawer-preset-3000")?.addEventListener("click",()=>{s.value="http://localhost:3000/api/v1"}),this.drawerEl.querySelector("#drawer-preset-3100")?.addEventListener("click",()=>{s.value="http://localhost:3100/api/v1"}),this.drawerEl.querySelector("#drawer-btn-reset-api")?.addEventListener("click",()=>{s.value="http://localhost:3000/api/v1"});const a=this.drawerEl.querySelector("#drawer-btn-ping"),r=this.drawerEl.querySelector("#drawer-ping-output");a.addEventListener("click",async()=>{r.innerHTML='<span style="color: var(--neutral-500);">Checking API health...</span>',a.disabled=!0;const i=s.value.trim().replace(/\/+$/,""),n=v.getBaseUrl();v.setBaseUrl(i);try{const l=await v.checkHealth();l.online?r.innerHTML=`
            <div style="color: var(--success); font-weight: 600;">
              <i class="fa-solid fa-circle-check" aria-hidden="true"></i> Connected successfully (${l.latencyMs}ms)
            </div>
            <div style="font-size: 0.75rem; margin-top: 0.2rem; color: var(--neutral-600);">
              Service: <strong>${l.service||"bulk-onboarding-api"}</strong> | DB: <strong>${l.database||"sqlite"}</strong>
            </div>
          `:r.innerHTML=`
            <div style="color: var(--danger); font-weight: 600;">
              <i class="fa-solid fa-circle-xmark" aria-hidden="true"></i> Connection failed: ${l.error||"Server unreachable"}
            </div>
            <div style="font-size: 0.75rem; margin-top: 0.2rem; color: var(--neutral-500);">
              Ensure <code>windows-x64\\run.bat</code> is running on this port.
            </div>
          `}finally{v.setBaseUrl(n),a.disabled=!1}}),this.drawerEl.querySelector("#drawer-btn-save-api")?.addEventListener("click",()=>{const i=s.value.trim();if(!i){c.error("API Base URL cannot be empty.");return}v.setBaseUrl(i),c.success("API configuration saved."),this.hide()})}updateActiveTheme(t){this.drawerEl.querySelectorAll(".theme-card").forEach(e=>{const s=e.dataset.theme,a=e.querySelector(".theme-color-disc");s===t?(e.classList.add("active"),a&&(a.innerHTML='<i class="fa-solid fa-check"></i>')):(e.classList.remove("active"),a&&(a.innerHTML=""))})}updateActiveFontPresets(t){this.drawerEl.querySelectorAll(".font-preset-btn").forEach(e=>{parseInt(e.dataset.size||"0",10)===t?e.classList.add("active"):e.classList.remove("active")})}show(){this.previouslyFocusedEl=document.activeElement;const t=S.getTheme(),e=S.getFontSize();this.updateActiveTheme(t);const s=this.drawerEl.querySelector("#font-size-slider"),a=this.drawerEl.querySelector("#font-slider-readout");s&&(s.value=String(e)),a&&(a.textContent=`${e}px`),this.updateActiveFontPresets(e);const r=this.drawerEl.querySelector("#drawer-api-url");r&&(r.value=v.getBaseUrl()),document.body.appendChild(this.backdropEl),document.body.style.overflow="hidden",this.backdropEl.offsetHeight,this.backdropEl.classList.add("open"),this.drawerEl.querySelector("#drawer-close-btn")?.focus()}hide(){this.backdropEl.classList.remove("open"),document.body.style.overflow="",setTimeout(()=>{this.backdropEl.remove(),this.previouslyFocusedEl&&this.previouslyFocusedEl.focus()},250)}}class C extends Error{code;status;details;constructor(t,e,s,a){super(s),this.name="ApiError",this.status=t,this.code=e,this.details=a}}class f{static parser=new DOMParser;static parseDocument(t){const e=this.parser.parseFromString(t,"application/xml"),s=e.querySelector("parsererror");if(s)throw new Error(`XML Parse Error: ${s.textContent||"Malformed XML document"}`);return e}static checkAndThrowError(t,e=400){const s=t.querySelector("response > error");if(s){const a=s.querySelector("code")?.textContent?.trim()||"UNKNOWN_ERROR",r=s.querySelector("message")?.textContent?.trim()||"An error occurred",i=s.querySelector("details");let n;throw i&&(n=this.nodeToPlainObject(i)),new C(e,a,r,n)}}static parseUploadSession(t){const e=i=>t.querySelector(`:scope > ${i}`)?.textContent?.trim()||"",s=i=>Number(e(i))||0,a=t.querySelector(":scope > uploaded_chunks"),r=[];return a&&a.querySelectorAll(":scope > item").forEach(i=>{const n=parseInt(i.textContent||"",10);isNaN(n)||r.push(n)}),{id:e("id"),batch_name:e("batch_name"),description:e("description"),file_name:e("file_name"),file_size:s("file_size"),file_sha256:e("file_sha256"),chunk_size:s("chunk_size")||1024*1024,status:e("status")||"created",uploaded_chunks:r,chunk_count:s("chunk_count"),upload_progress:s("upload_progress"),process_progress:s("process_progress"),total_rows:s("total_rows"),processed_rows:s("processed_rows"),valid_rows:s("valid_rows"),invalid_rows:s("invalid_rows"),onboarded_rows:s("onboarded_rows"),created_at:e("created_at"),updated_at:e("updated_at"),completed_at:e("completed_at")||void 0}}static parseUploadRecord(t){const e=a=>t.querySelector(`:scope > ${a}`)?.textContent?.trim()||"",s=a=>Number(e(a))||0;return{id:e("id"),upload_id:e("upload_id"),row_number:s("row_number"),first_name:e("first_name"),last_name:e("last_name"),date_of_birth:e("date_of_birth"),email:e("email"),branch:e("branch"),account_type:e("account_type"),member_number:e("member_number")||void 0,phone_number:e("phone_number")||void 0,id_number:e("id_number")||void 0,status:e("status")||"pending",reason:e("reason")||void 0,member_id:e("member_id")||void 0,created_at:e("created_at")}}static parseMember(t){const e=s=>t.querySelector(`:scope > ${s}`)?.textContent?.trim()||"";return{id:e("id"),core_member_id:e("core_member_id"),member_number:e("member_number"),phone_number:e("phone_number"),id_number:e("id_number"),first_name:e("first_name"),last_name:e("last_name"),date_of_birth:e("date_of_birth"),email:e("email"),branch:e("branch"),account_type:e("account_type"),account_number:e("account_number"),source_upload_id:e("source_upload_id"),created_at:e("created_at")}}static parsePagination(t){if(!t)return{page:1,limit:20,skip:0,total:0,total_pages:1};const e=s=>Number(t.querySelector(`:scope > ${s}`)?.textContent?.trim())||0;return{page:e("page")||1,limit:e("limit")||20,skip:e("skip")||0,total:e("total")||0,total_pages:e("total_pages")||1}}static parseStatusCounts(t){const e={};return t&&t.querySelectorAll(":scope > item").forEach(s=>{const a=s.querySelector("status")?.textContent?.trim(),r=Number(s.querySelector("count")?.textContent?.trim())||0;a&&(e[a]=r)}),e}static parseUploadListResponse(t,e=200){const s=this.parseDocument(t);this.checkAndThrowError(s,e);const a=[];s.querySelectorAll("response > data > item").forEach(n=>{a.push(this.parseUploadSession(n))});const r=s.querySelector("response > pagination"),i=this.parsePagination(r);return{data:a,pagination:i}}static parseUploadSingleResponse(t,e=200){const s=this.parseDocument(t);this.checkAndThrowError(s,e);const a=s.querySelector("response > upload");if(!a)throw new Error("Upload session missing in API response");const i=s.querySelector("response > resumed")?.textContent?.trim()?.toLowerCase()==="true",n=s.querySelector("response > message")?.textContent?.trim()||void 0;return{upload:this.parseUploadSession(a),resumed:i,message:n}}static parseRecordsResponse(t,e=200){const s=this.parseDocument(t);this.checkAndThrowError(s,e);const a=[];s.querySelectorAll("response > data > item").forEach(d=>{a.push(this.parseUploadRecord(d))});const r=s.querySelector("response > pagination"),i=this.parsePagination(r),n=s.querySelector("response > status_counts"),l=this.parseStatusCounts(n);return{data:a,pagination:i,status_counts:l}}static parseMembersResponse(t,e=200){const s=this.parseDocument(t);this.checkAndThrowError(s,e);const a=[];s.querySelectorAll("response > data > item").forEach(n=>{a.push(this.parseMember(n))});const r=s.querySelector("response > pagination"),i=this.parsePagination(r);return{data:a,pagination:i}}static parseMemberSingleResponse(t,e=200){const s=this.parseDocument(t);this.checkAndThrowError(s,e);const a=s.querySelector("response > member");if(!a)throw new Error("Member details missing in API response");return this.parseMember(a)}static parseCommitResponse(t,e=200){const s=this.parseDocument(t);this.checkAndThrowError(s,e);const a=s.querySelector("response > upload");if(!a)throw new Error("Upload session missing in commit response");const r=Number(s.querySelector("response > committed_rows")?.textContent?.trim())||0,i=Number(s.querySelector("response > conflict_rows")?.textContent?.trim())||0,n=s.querySelector("response > already_committed")?.textContent?.trim()?.toLowerCase()==="true";return{upload:this.parseUploadSession(a),committed_rows:r,conflict_rows:i,already_committed:n}}static parseSsePayload(t){try{const e=this.parseDocument(t),s=e.querySelector("event > payload")||e.querySelector("payload")||e.documentElement;return this.nodeToPlainObject(s)}catch{return{}}}static nodeToPlainObject(t){const e=Array.from(t.children);if(e.length===0){const r=t.textContent?.trim()||"";return/^-?\d+(\.\d+)?$/.test(r)?Number(r):r.toLowerCase()==="true"?!0:r.toLowerCase()==="false"?!1:r}if(e.every(r=>r.tagName.toLowerCase()==="item"))return e.map(r=>this.nodeToPlainObject(r));const a={};return e.forEach(r=>{const i=r.tagName.toLowerCase();a[i]=this.nodeToPlainObject(r)}),a}}function L(o){return o.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;")}class W{static buildUploadRequest(t){const e=t.description?`<description>${L(t.description)}</description>`:"<description></description>";return`<?xml version="1.0" encoding="UTF-8"?>
<upload_request>
  <batch_name>${L(t.batch_name.trim())}</batch_name>
  ${e}
  <file_name>${L(t.file_name.trim())}</file_name>
  <file_size>${Math.floor(t.file_size)}</file_size>
  <file_sha256>${L(t.file_sha256.toLowerCase().trim())}</file_sha256>
</upload_request>`}static buildCommitRequest(t=!0){return`<?xml version="1.0" encoding="UTF-8"?>
<commit_request>
  <review_confirmed>${t?"true":"false"}</review_confirmed>
</commit_request>`}}class g{static buildUrl(t,e){const s=v.getBaseUrl(),a=new URL(`${s}${t.startsWith("/")?t:"/"+t}`);return e&&(e.page!==void 0&&a.searchParams.set("page",String(e.page)),e.limit!==void 0&&a.searchParams.set("limit",String(e.limit)),e.status&&a.searchParams.set("status",e.status),e.search&&a.searchParams.set("search",e.search),e.$filter&&a.searchParams.set("$filter",e.$filter),e.$orderby&&a.searchParams.set("$orderby",e.$orderby),e.$top!==void 0&&a.searchParams.set("$top",String(e.$top)),e.$skip!==void 0&&a.searchParams.set("$skip",String(e.$skip)),e.$count!==void 0&&a.searchParams.set("$count",String(e.$count)),e.$select&&a.searchParams.set("$select",e.$select)),a.toString()}static async handleXmlResponse(t){const e=await t.text();let s;try{s=f.parseDocument(e)}catch{throw new C(t.status,"INVALID_XML",`Server returned invalid XML (HTTP ${t.status})`,{raw:e})}if(!t.ok)throw f.checkAndThrowError(s,t.status),new C(t.status,"HTTP_ERROR",`Request failed with status ${t.status}: ${t.statusText}`);return{text:e,doc:s}}static async listUploads(t){const e=this.buildUrl("/uploads",t),s=await fetch(e,{method:"GET",headers:{Accept:"application/xml, text/xml"}}),{text:a}=await this.handleXmlResponse(s);return f.parseUploadListResponse(a,s.status)}static async getUpload(t){const e=this.buildUrl(`/uploads/${t}`),s=await fetch(e,{method:"GET",headers:{Accept:"application/xml, text/xml"}}),{text:a}=await this.handleXmlResponse(s);return f.parseUploadSingleResponse(a,s.status).upload}static async createUpload(t,e){const s=this.buildUrl("/uploads"),a=W.buildUploadRequest(t),r=await fetch(s,{method:"POST",headers:{"Content-Type":"application/xml; charset=utf-8","Idempotency-Key":e,Accept:"application/xml, text/xml"},body:a}),{text:i}=await this.handleXmlResponse(r),n=f.parseUploadSingleResponse(i,r.status);return{upload:n.upload,resumed:!!n.resumed}}static async uploadChunk(t,e,s,a,r){const i=this.buildUrl(`/uploads/${t}/chunks/${e}`),n=await fetch(i,{method:"PUT",headers:{"Content-Type":"application/octet-stream","Content-SHA256":a,Accept:"application/xml, text/xml"},body:s,signal:r}),{text:l,doc:d}=await this.handleXmlResponse(n),p=f.parseUploadSingleResponse(l,n.status),h=d.querySelector("response > chunk > already_received")?.textContent==="true";return{upload:p.upload,alreadyReceived:h}}static async completeUpload(t){const e=this.buildUrl(`/uploads/${t}/complete`),s=await fetch(e,{method:"POST",headers:{Accept:"application/xml, text/xml"}}),{text:a}=await this.handleXmlResponse(s),r=f.parseUploadSingleResponse(a,s.status);return{upload:r.upload,message:r.message}}static async commitValidatedUpload(t,e=!0){const s=this.buildUrl(`/uploads/${t}/commit`),a=W.buildCommitRequest(e),r=await fetch(s,{method:"POST",headers:{"Content-Type":"application/xml; charset=utf-8",Accept:"application/xml, text/xml"},body:a}),{text:i}=await this.handleXmlResponse(r);return f.parseCommitResponse(i,r.status)}static async listUploadRecords(t,e){const s=this.buildUrl(`/uploads/${t}/records`,e),a=await fetch(s,{method:"GET",headers:{Accept:"application/xml, text/xml"}}),{text:r}=await this.handleXmlResponse(a);return f.parseRecordsResponse(r,a.status)}static async exportRecords(t,e="xlsx",s,a,r){const i=v.getBaseUrl(),n=new URL(`${i}/uploads/${t}/records/export`);n.searchParams.set("format",e),s&&n.searchParams.set("status",s),a&&n.searchParams.set("$filter",a),r&&n.searchParams.set("$orderby",r);const l=await fetch(n.toString(),{method:"GET"});if(!l.ok){const h=await l.text();try{const y=f.parseDocument(h);f.checkAndThrowError(y,l.status)}catch(y){if(y instanceof C)throw y}throw new C(l.status,"EXPORT_FAILED",`Export failed with HTTP ${l.status}`)}const d=await l.blob(),p=`records-${t.slice(0,8)}${s?"-"+s:""}.${e}`;this.triggerDownload(d,p)}static async downloadInvalidRows(t){const s=`${v.getBaseUrl()}/uploads/${t}/invalid.xlsx`,a=await fetch(s,{method:"GET"});if(!a.ok)throw new C(a.status,"DOWNLOAD_FAILED",`Download of invalid rows failed with HTTP ${a.status}`);const r=await a.blob();this.triggerDownload(r,`invalid-records-${t.slice(0,8)}.xlsx`)}static async downloadTemplate(){const e=`${v.getBaseUrl()}/onboarding/template`,s=await fetch(e,{method:"GET"});if(!s.ok)throw new C(s.status,"TEMPLATE_ERROR",`Failed to download onboarding template (HTTP ${s.status})`);const a=await s.blob();this.triggerDownload(a,"onboarding-template.xlsx")}static async listMembers(t){const e=this.buildUrl("/members",t),s=await fetch(e,{method:"GET",headers:{Accept:"application/xml, text/xml"}}),{text:a}=await this.handleXmlResponse(s);return f.parseMembersResponse(a,s.status)}static async getMember(t){const e=this.buildUrl(`/members/${t}`),s=await fetch(e,{method:"GET",headers:{Accept:"application/xml, text/xml"}}),{text:a}=await this.handleXmlResponse(s);return f.parseMemberSingleResponse(a,s.status)}static triggerDownload(t,e){const s=URL.createObjectURL(t),a=document.createElement("a");a.href=s,a.download=e,document.body.appendChild(a),a.click(),document.body.removeChild(a),setTimeout(()=>URL.revokeObjectURL(s),1e3)}}const P=1024*1024;class X{options;status="idle";abortController=null;fileSha256="";uploadSession=null;uploadedChunkIndices=new Set;totalChunks=0;idempotencyKey="";constructor(t){this.options=t,this.totalChunks=Math.max(1,Math.ceil(this.options.file.size/P))}async start(){try{if(this.setStatus("hashing","Computing file SHA-256 checksum..."),this.fileSha256=await this.computeSha256(this.options.file),this.options.idempotencyKey)this.idempotencyKey=this.options.idempotencyKey;else{const s=`${this.options.batchName}_${this.options.file.name}_${this.options.file.size}_${this.fileSha256.slice(0,16)}`;this.idempotencyKey=s.replace(/[^A-Za-z0-9_-]/g,"_").slice(0,120)}this.setStatus("initiating","Registering upload session with server..."),this.abortController=new AbortController;const{upload:t,resumed:e}=await g.createUpload({batch_name:this.options.batchName,description:this.options.description,file_name:this.options.file.name,file_size:this.options.file.size,file_sha256:this.fileSha256},this.idempotencyKey);return this.uploadSession=t,this.uploadedChunkIndices=new Set(t.uploaded_chunks||[]),await this.uploadChunks(e)}catch(t){throw this.status==="interrupted"||this.status==="paused"||(this.setStatus("error",t instanceof Error?t.message:"Upload failed"),this.options.onError&&this.options.onError(t instanceof Error?t:new Error(String(t)))),t}}async resume(){if(!this.uploadSession)return this.start();try{this.setStatus("initiating","Checking session status on server...");const t=await g.getUpload(this.uploadSession.id);return this.uploadSession=t,this.uploadedChunkIndices=new Set(t.uploaded_chunks||[]),await this.uploadChunks(!0)}catch(t){throw this.setStatus("error",t instanceof Error?t.message:"Failed to resume upload"),this.options.onError&&this.options.onError(t instanceof Error?t:new Error(String(t))),t}}simulateNetworkInterruption(){this.status==="uploading"&&(this.setStatus("interrupted","Network connection interrupted. Upload paused. You can resume anytime."),this.abortController&&(this.abortController.abort(),this.abortController=null))}pause(){this.status==="uploading"&&(this.setStatus("paused","Upload paused by user."),this.abortController&&(this.abortController.abort(),this.abortController=null))}async uploadChunks(t){if(!this.uploadSession)throw new Error("No active upload session");this.setStatus("uploading",t?"Resuming upload...":"Uploading chunks..."),this.abortController=new AbortController;const e=this.uploadSession.id,s=this.options.file,a=s.size;for(let i=0;i<this.totalChunks;i++){if(this.uploadedChunkIndices.has(i)){this.emitProgress(e,i+1,a,t);continue}if(this.status==="interrupted"||this.status==="paused")throw new Error(this.status==="interrupted"?"Upload interrupted by network simulation":"Upload paused");const n=i*P,l=Math.min(n+P,a),p=await s.slice(n,l).arrayBuffer(),h=new Uint8Array(p),y=await this.bufferToSha256(p);try{const{upload:E}=await g.uploadChunk(e,i,h,y,this.abortController.signal);this.uploadSession=E,this.uploadedChunkIndices.add(i),this.emitProgress(e,i+1,a,t)}catch(E){if(this.abortController?.signal.aborted){const x=this.status==="interrupted";throw new Error(x?"Network connection lost":"Upload paused")}throw E}}this.setStatus("completing","Finalizing file and triggering validation...");const r=await g.completeUpload(e);return this.uploadSession=r.upload,this.setStatus("completed","File verified. Row validation is in progress."),this.options.onComplete&&this.options.onComplete(this.uploadSession),this.uploadSession}emitProgress(t,e,s,a){if(!this.options.onProgress)return;const r=Math.min(s,e*P),i=Math.min(100,Math.round(r/s*100));this.options.onProgress({uploadId:t,bytesUploaded:r,totalBytes:s,percent:i,currentChunk:e,totalChunks:this.totalChunks,uploadedChunkIndices:Array.from(this.uploadedChunkIndices),isResumed:a})}async computeSha256(t){const e=await t.arrayBuffer();return this.bufferToSha256(e)}async bufferToSha256(t){const e=await crypto.subtle.digest("SHA-256",t);return Array.from(new Uint8Array(e)).map(a=>a.toString(16).padStart(2,"0")).join("")}setStatus(t,e){this.status=t,this.options.onStatusChange&&this.options.onStatusChange(t,e)}getStatus(){return this.status}getUploadSession(){return this.uploadSession}getIdempotencyKey(){return this.idempotencyKey}}class z{backdropEl;dialogEl;options;previouslyFocusedEl=null;constructor(t){this.options=t,this.backdropEl=document.createElement("div"),this.backdropEl.className="modal-backdrop",this.backdropEl.setAttribute("role","dialog"),this.backdropEl.setAttribute("aria-modal","true"),this.backdropEl.setAttribute("aria-labelledby","modal-title-id"),this.dialogEl=document.createElement("div"),this.dialogEl.className="modal-dialog",t.maxWidth&&(this.dialogEl.style.maxWidth=t.maxWidth),this.render(),this.bindEvents()}render(){const t=document.createElement("div");t.className="modal-header";const e=document.createElement("h2");e.id="modal-title-id",e.className="modal-title",e.textContent=this.options.title;const s=document.createElement("button");s.className="modal-close-btn",s.setAttribute("aria-label","Close modal"),s.innerHTML="&times;",s.addEventListener("click",()=>this.close()),t.appendChild(e),t.appendChild(s);const a=document.createElement("div");if(a.className="modal-body",typeof this.options.content=="string"?a.innerHTML=this.options.content:a.appendChild(this.options.content),this.dialogEl.appendChild(t),this.dialogEl.appendChild(a),this.options.footerButtons&&this.options.footerButtons.length>0){const r=document.createElement("div");r.className="modal-footer",this.options.footerButtons.forEach(i=>{const n=document.createElement("button");n.type="button",n.className=`btn ${i.className||"btn-secondary"}`,n.textContent=i.label,n.addEventListener("click",()=>i.onClick(this)),r.appendChild(n)}),this.dialogEl.appendChild(r)}this.backdropEl.appendChild(this.dialogEl)}bindEvents(){this.backdropEl.addEventListener("click",t=>{t.target===this.backdropEl&&this.close()}),this.backdropEl.addEventListener("keydown",t=>{t.key==="Escape"&&this.close()})}open(){this.previouslyFocusedEl=document.activeElement,document.body.appendChild(this.backdropEl),document.body.style.overflow="hidden",this.backdropEl.offsetHeight,this.backdropEl.classList.add("open"),this.dialogEl.querySelector("input, button, select, textarea")?.focus()}close(){this.backdropEl.classList.remove("open"),document.body.style.overflow="",setTimeout(()=>{this.backdropEl.remove(),this.previouslyFocusedEl&&this.previouslyFocusedEl.focus(),this.options.onClose&&this.options.onClose()},200)}getElement(){return this.backdropEl}}class N{static uploader=null;static open(t=""){const e=document.createElement("div");e.innerHTML=`
      <div id="step-form">
        <p style="font-size: 0.9rem; color: var(--neutral-600); margin-bottom: 1.25rem;">
          Submit a spreadsheet of members requesting digital banking access. The system validates each row before any member is onboarded.
        </p>

        <div style="background-color: var(--primary-light); border: 1px solid var(--primary-border); border-radius: var(--radius-md); padding: 0.875rem 1rem; margin-bottom: 1.25rem; display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap;">
          <div>
            <div style="font-weight: 600; font-size: 0.85rem; color: var(--primary);">Need the spreadsheet template?</div>
            <div style="font-size: 0.75rem; color: var(--neutral-600);">Download the official bank onboarding template or load the Riverside Branch walkthrough workbook.</div>
          </div>
          <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
            <button type="button" class="btn btn-sm btn-secondary" id="btn-download-template">
               Blank Template
            </button>
            <button type="button" class="btn btn-sm btn-outline-primary" id="btn-load-demo-file">
              Load Riverside Demo File
            </button>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="batch-name">
            Batch Name <span class="required">*</span>
          </label>
          <input
            type="text"
            id="batch-name"
            class="form-control"
            maxlength="120"
            required
            placeholder="e.g. Riverside Branch — October Enrolment"
            value="${t}"
          />
          <div class="form-hint">Required display name for this upload session (up to 120 characters).</div>
        </div>

        <div class="form-group">
          <label class="form-label" for="batch-desc">
            Description <span style="font-weight: normal; color: var(--neutral-500);">(Optional)</span>
          </label>
          <textarea
            id="batch-desc"
            class="form-control"
            rows="2"
            maxlength="1000"
            placeholder="e.g. October digital banking enrollments from Riverside branch members."
          ></textarea>
          <div class="form-hint">Optional batch notes for audit and staff tracking.</div>
        </div>

        <div class="form-group">
          <label class="form-label">
            Completed Spreadsheet (XLSX) <span class="required">*</span>
          </label>
          <div class="file-dropzone" id="file-dropzone" tabindex="0" role="button" aria-label="Drop Excel spreadsheet here or click to browse">
          
            <div class="dropzone-text" id="dropzone-text">Click to choose file or drag & drop</div>
            <div class="dropzone-subtext" id="dropzone-subtext">Supports Microsoft Excel (.xlsx) workbooks up to 50MB</div>
            <input type="file" id="file-input" accept=".xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" style="display: none;" />
          </div>
        </div>

        <div id="file-details-card" style="display: none; background: #ffffff; border: 1px solid var(--neutral-200); border-radius: var(--radius-md); padding: 0.85rem 1rem; margin-bottom: 1.25rem;">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 0.65rem;">
              <div>
                <div id="selected-file-name" style="font-weight: 600; font-size: 0.9rem; color: var(--neutral-900);"></div>
                <div id="selected-file-size" style="font-size: 0.75rem; color: var(--neutral-500);"></div>
              </div>
            </div>
            <button type="button" class="btn btn-sm btn-secondary" id="btn-clear-file">Change</button>
          </div>
        </div>
      </div>

      <!-- Live Upload Monitor (Shown during upload) -->
      <div id="step-upload" style="display: none;">
        <div style="text-align: center; margin-bottom: 1.5rem;">
          <h3 style="font-size: 1.15rem; font-weight: 700; margin-bottom: 0.25rem;" id="upload-status-title">Uploading Workbook...</h3>
          <p style="font-size: 0.85rem; color: var(--neutral-500);" id="upload-status-desc">Transferring binary chunks securely to server</p>
        </div>

        <div style="margin-bottom: 1.25rem;">
          <div style="display: flex; justify-content: space-between; font-size: 0.85rem; font-weight: 600; margin-bottom: 0.35rem;">
            <span id="upload-progress-percent">0%</span>
            <span id="upload-chunk-info" style="color: var(--neutral-500); font-variant-numeric: tabular-nums;">Chunk 0 of 0</span>
          </div>
          <div class="progress-container" style="height: 10px;">
            <div class="progress-bar-fill animated" id="upload-progress-bar" style="width: 0%;"></div>
          </div>
        </div>

        <!-- Walkthrough Interruption Simulation Box -->
        <div id="interruption-banner" style="display: none; background-color: var(--warning-bg); border: 1px solid var(--warning-border); border-radius: var(--radius-md); padding: 1rem; margin-bottom: 1.25rem;">
          <div style="display: flex; gap: 0.75rem;">
            
            <div>
              <div style="font-weight: 700; font-size: 0.9rem; color: var(--warning-text);">Network Connection Interrupted</div>
              <p style="font-size: 0.8rem; color: var(--warning-text); margin-top: 0.25rem;">
                Upload paused. The server has securely retained uploaded chunks. Click <strong>Resume Upload</strong> to continue seamlessly without re-uploading previously accepted chunks.
              </p>
              <div style="margin-top: 0.75rem;">
                <button type="button" class="btn btn-sm btn-primary" id="btn-resume-upload">
                  Resume Upload
                </button>
              </div>
            </div>
          </div>
        </div>

        <div style="display: flex; justify-content: center; gap: 0.75rem; margin-top: 1.5rem;">
          <button type="button" class="btn btn-warning btn-sm" id="btn-simulate-interruption">
             Simulate Network Interruption
          </button>
        </div>
      </div>
    `;let s=null;const a=e.querySelector("#step-form"),r=e.querySelector("#step-upload"),i=e.querySelector("#batch-name"),n=e.querySelector("#batch-desc"),l=e.querySelector("#file-dropzone"),d=e.querySelector("#file-input"),p=e.querySelector("#file-details-card"),h=e.querySelector("#selected-file-name"),y=e.querySelector("#selected-file-size"),E=e.querySelector("#btn-clear-file"),x=e.querySelector("#upload-status-title"),$=e.querySelector("#upload-status-desc"),k=e.querySelector("#upload-progress-bar"),G=e.querySelector("#upload-progress-percent"),Q=e.querySelector("#upload-chunk-info"),q=e.querySelector("#interruption-banner"),T=e.querySelector("#btn-simulate-interruption"),Y=e.querySelector("#btn-resume-upload");e.querySelector("#btn-download-template")?.addEventListener("click",async()=>{try{await g.downloadTemplate(),c.success("Onboarding template downloaded.")}catch(u){c.error(`Failed to download template: ${u instanceof Error?u.message:String(u)}`)}}),e.querySelector("#btn-load-demo-file")?.addEventListener("click",async()=>{try{const u=await fetch("/riverside-branch-october-enrolment.xlsx");if(!u.ok)throw new Error("Demo file not found");const _=await u.blob();s=new File([_],"riverside-branch-october-enrolment.xlsx",{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}),i.value="Riverside Branch — October Enrolment",I(s),c.info("Loaded Riverside Branch demo workbook with 7 test rows.")}catch(u){c.error(`Failed to load demo file: ${u instanceof Error?u.message:String(u)}`)}});function I(u){s=u,h.textContent=u.name;const _=(u.size/1024).toFixed(1);y.textContent=`${_} KB (${u.size.toLocaleString()} bytes)`,l.style.display="none",p.style.display="block"}E.addEventListener("click",()=>{s=null,d.value="",p.style.display="none",l.style.display="block"}),l.addEventListener("click",()=>d.click()),d.addEventListener("change",()=>{d.files&&d.files[0]&&I(d.files[0])}),l.addEventListener("dragover",u=>{u.preventDefault(),l.classList.add("drag-over")}),l.addEventListener("dragleave",()=>{l.classList.remove("drag-over")}),l.addEventListener("drop",u=>{u.preventDefault(),l.classList.remove("drag-over"),u.dataTransfer?.files&&u.dataTransfer.files[0]&&I(u.dataTransfer.files[0])});const U=new z({title:"Create New Upload Batch",content:e,maxWidth:"650px",footerButtons:[{label:"Cancel",className:"btn-secondary",onClick:u=>{this.uploader&&(this.uploader.pause(),this.uploader=null),u.close()}},{label:"Start Upload",className:"btn-primary btn-submit-upload",onClick:async()=>{const u=i.value.trim(),_=n.value.trim();if(!u){c.error("Batch name is required."),i.focus();return}if(!s){c.error("Please choose or drop an Excel (.xlsx) workbook.");return}a.style.display="none",r.style.display="block";const D=e.closest(".modal-dialog")?.querySelector(".btn-submit-upload");D&&(D.style.display="none"),this.uploader=new X({batchName:u,description:_,file:s,onStatusChange:(m,J)=>{m==="interrupted"?(x.textContent="Upload Interrupted",$.textContent=J||"Network connection dropped.",k.classList.remove("animated"),k.classList.add("warning"),q.style.display="block",T.style.display="none"):m==="uploading"?(x.textContent="Uploading Chunks...",$.textContent="Transferring file chunks to server",k.classList.add("animated"),k.classList.remove("warning"),q.style.display="none",T.style.display="inline-flex"):m==="completing"?(x.textContent="Verifying File Assembly...",$.textContent="Server is validating file SHA-256 and initiating validation",T.style.display="none"):m==="completed"&&(x.textContent="Upload Complete!",$.textContent="Starting validation stream...")},onProgress:m=>{k.style.width=`${m.percent}%`,G.textContent=`${m.percent}%`,Q.textContent=`Chunk ${m.currentChunk} of ${m.totalChunks}`},onComplete:m=>{c.success(`Batch "${m.batch_name}" uploaded. Asynchronous validation has started.`),U.close(),window.location.hash=`#/batch/${m.id}`},onError:m=>{c.error(`Upload error: ${m.message}`)}});try{await this.uploader.start()}catch(m){console.log("Upload stopped or failed:",m)}}}]});T.addEventListener("click",()=>{this.uploader&&(this.uploader.simulateNetworkInterruption(),c.warning("Simulated network interruption: Upload paused."))}),Y.addEventListener("click",async()=>{if(this.uploader){c.info("Reconnecting and resuming batch upload...");try{await this.uploader.resume()}catch(u){console.log("Resume error:",u)}}}),U.open()}}class se{static open(){const t=document.createElement("div");t.innerHTML=`
      <p style="font-size: 0.9rem; color: var(--neutral-600); margin-bottom: 1.25rem;">
        This interactive checklist guides you through all 9 demonstration steps specified in <code>assignment.md</code>.
      </p>

      <div style="display: flex; flex-direction: column; gap: 0.85rem;">
        <!-- Step 1 -->
        <div style="border: 1px solid var(--neutral-200); border-radius: var(--radius-md); padding: 0.85rem; background: var(--neutral-50);">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.35rem;">
            <strong style="font-size: 0.9rem; color: var(--primary);">Step 1: Open New Batch & Download Template</strong>
            <button type="button" class="btn btn-sm btn-primary" id="wt-step-1-btn">Open New Batch Modal</button>
          </div>
          <p style="font-size: 0.8rem; color: var(--neutral-600);">
            Pre-fills “Riverside Branch — October Enrolment”. Click “Blank Template” to download <code>onboarding-template.xlsx</code> directly from the API.
          </p>
        </div>

        <!-- Step 2 -->
        <div style="border: 1px solid var(--neutral-200); border-radius: var(--radius-md); padding: 0.85rem; background: var(--neutral-50);">
          <strong style="font-size: 0.9rem; color: var(--neutral-800); display: block; margin-bottom: 0.35rem;">Step 2: Load or Upload Completed Workbook</strong>
          <p style="font-size: 0.8rem; color: var(--neutral-600);">
            Click <strong>“Load Riverside Demo File”</strong> inside the New Batch modal. The pre-generated workbook contains 7 test rows (3 valid core members, 1 intra-batch duplicate, and 3 invalid records).
          </p>
        </div>

        <!-- Step 3 -->
        <div style="border: 1px solid var(--neutral-200); border-radius: var(--radius-md); padding: 0.85rem; background: var(--neutral-50);">
          <strong style="font-size: 0.9rem; color: var(--neutral-800); display: block; margin-bottom: 0.35rem;">Step 3: Simulate Network Interruption & Resume Upload</strong>
          <p style="font-size: 0.8rem; color: var(--neutral-600);">
            While chunks are uploading, click <strong>“Simulate Network Interruption”</strong>. The upload pauses and displays retained chunks. Click <strong>“Resume Upload”</strong> to continue without re-uploading existing chunks.
          </p>
        </div>

        <!-- Step 4 -->
        <div style="border: 1px solid var(--neutral-200); border-radius: var(--radius-md); padding: 0.85rem; background: var(--neutral-50);">
          <strong style="font-size: 0.9rem; color: var(--neutral-800); display: block; margin-bottom: 0.35rem;">Step 4: Real-Time SSE Validation Monitoring</strong>
          <p style="font-size: 0.8rem; color: var(--neutral-600);">
            Upon file assembly, the server begins row validation. Watch the live progress bar and expand the <strong>Server-Sent Events Stream</strong> log to observe live event messages.
          </p>
        </div>

        <!-- Step 5 -->
        <div style="border: 1px solid var(--neutral-200); border-radius: var(--radius-md); padding: 0.85rem; background: var(--neutral-50);">
          <strong style="font-size: 0.9rem; color: var(--neutral-800); display: block; margin-bottom: 0.35rem;">Step 5: Review Results Before Taking Action</strong>
          <p style="font-size: 0.8rem; color: var(--neutral-600);">
            Notice that <strong>no members have been onboarded yet</strong> (Onboarded = 0). Review the records table and use the status tabs (Valid, Invalid, Duplicate) to inspect specific reasons.
          </p>
        </div>

        <!-- Step 6 -->
        <div style="border: 1px solid var(--neutral-200); border-radius: var(--radius-md); padding: 0.85rem; background: var(--neutral-50);">
          <strong style="font-size: 0.9rem; color: var(--neutral-800); display: block; margin-bottom: 0.35rem;">Step 6: Confirm Review & Commit Valid Rows</strong>
          <p style="font-size: 0.8rem; color: var(--neutral-600);">
            Check the explicit confirmation checkbox: <em>“I confirm that I have reviewed the validation results...”</em> and click <strong>“Commit Valid Rows”</strong> to send the XML commit request.
          </p>
        </div>

        <!-- Step 7 -->
        <div style="border: 1px solid var(--neutral-200); border-radius: var(--radius-md); padding: 0.85rem; background: var(--neutral-50);">
          <strong style="font-size: 0.9rem; color: var(--neutral-800); display: block; margin-bottom: 0.35rem;">Step 7: Confirm Committed Members & Download Invalid Rows</strong>
          <p style="font-size: 0.8rem; color: var(--neutral-600);">
            The confirmation shows 3 onboarded members. Click <strong>“Download Invalid Rows (.xlsx)”</strong> to fetch <code>invalid.xlsx</code> directly from the API.
          </p>
        </div>

        <!-- Step 8 -->
        <div style="border: 1px solid var(--neutral-200); border-radius: var(--radius-md); padding: 0.85rem; background: var(--neutral-50);">
          <strong style="font-size: 0.9rem; color: var(--neutral-800); display: block; margin-bottom: 0.35rem;">Step 8: Filter & Export Records</strong>
          <p style="font-size: 0.8rem; color: var(--neutral-600);">
            Return to the batches list or batch records table, filter by status, and click <strong>“Export CSV”</strong> or <strong>“Export XLSX”</strong> to download audit exports.
          </p>
        </div>

        <!-- Step 9 -->
        <div style="border: 1px solid var(--neutral-200); border-radius: var(--radius-md); padding: 0.85rem; background: var(--neutral-50);">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.35rem;">
            <strong style="font-size: 0.9rem; color: var(--primary);">Step 9: Open Onboarded Members Directory</strong>
            <a href="#/members" class="btn btn-sm btn-secondary" id="wt-step-9-link">Go to Members →</a>
          </div>
          <p style="font-size: 0.8rem; color: var(--neutral-600);">
            Search for <code>Amina</code> or <code>MBR-100001</code> and click <strong>“View”</strong> to see their full profile and link to the source batch.
          </p>
        </div>
      </div>
    `;const e=new z({title:"Walkthrough Demonstration Checklist",content:t,maxWidth:"680px",footerButtons:[{label:"Close",className:"btn-secondary",onClick:s=>s.close()}]});t.querySelector("#wt-step-1-btn")?.addEventListener("click",()=>{e.close(),N.open()}),t.querySelector("#wt-step-9-link")?.addEventListener("click",()=>{e.close()}),e.open()}}class ae{el;statusBadgeEl=null;healthInterval=null;constructor(){this.el=document.createElement("header"),this.el.className="site-header",this.render(),this.startHealthPolling()}render(){return this.el.innerHTML=`
      <div class="header-inner">
        <a href="#/batches" class="header-brand">
          <div class="brand-logo" aria-hidden="true">DB</div>
          <div class="brand-info">
            <h1>DigiBanking Portal</h1>
            <p>Bulk Member Onboarding</p>
          </div>
        </a>

        <nav aria-label="Main Navigation">
          <ul class="nav-links">
            <li>
              <a href="#/batches" class="nav-link" id="nav-batches">
               Batches
              </a>
            </li>
            <li>
              <a href="#/members" class="nav-link" id="nav-members">
                Onboarded Members
              </a>
            </li>
          </ul>
        </nav>

        <div class="header-actions">
          <button type="button" class="btn btn-secondary btn-sm" id="btn-walkthrough-header" title="Open 9-Step Walkthrough Guide">
            Walkthrough
          </button>

          <button type="button" class="api-status-badge offline" id="api-status-indicator" title="Click to check or configure API address">
            <span class="status-dot"></span>
            <span class="status-text">Checking API...</span>
          </button>

          <button type="button" class="btn btn-secondary btn-sm" id="btn-settings-header" title="Configure API Endpoint">
             Settings
          </button>

         
        </div>
      </div>
    `,this.statusBadgeEl=this.el.querySelector("#api-status-indicator"),this.statusBadgeEl?.addEventListener("click",()=>{B.open()}),this.el.querySelector("#btn-walkthrough-header")?.addEventListener("click",()=>{se.open()}),this.el.querySelector("#btn-settings-header")?.addEventListener("click",()=>{B.open()}),this.el.querySelector("#btn-new-batch-header")?.addEventListener("click",()=>{N.open()}),this.updateActiveNav(),window.addEventListener("hashchange",()=>this.updateActiveNav()),this.el}updateActiveNav(){const t=window.location.hash||"#/batches",e=this.el.querySelector("#nav-batches"),s=this.el.querySelector("#nav-members");t.startsWith("#/members")?(s?.classList.add("active"),e?.classList.remove("active")):(e?.classList.add("active"),s?.classList.remove("active"))}async checkApiStatus(){if(!this.statusBadgeEl)return;const t=await v.checkHealth();t.online?(this.statusBadgeEl.className="api-status-badge online",this.statusBadgeEl.querySelector(".status-text").textContent=`API Online (${t.latencyMs}ms)`):(this.statusBadgeEl.className="api-status-badge offline",this.statusBadgeEl.querySelector(".status-text").textContent="API Offline")}startHealthPolling(){this.checkApiStatus(),this.healthInterval=window.setInterval(()=>{this.checkApiStatus()},15e3),v.subscribe(()=>{this.checkApiStatus()})}destroy(){this.healthInterval&&clearInterval(this.healthInterval)}getElement(){return this.el}}class M{options;container;tableWrapper;tableEl;theadEl;tbodyEl;toolbarEl;searchInput=null;searchClearBtn=null;columnToggleBtn=null;columnPopover=null;customFilterSlot;customActionsSlot;paginationBar;pageInfoEl;pageControlsEl;pageSizeSelect=null;hiddenColumnIds=new Set;sortColumnId="";sortDirection="asc";currentPage=1;pageSize=20;totalRows=0;data=[];isLoading=!1;searchDebounceTimer=null;constructor(t){this.options={enableSearch:!0,enableColumnToggle:!0,enablePagination:!0,pageSizeOptions:[10,20,50,100],searchPlaceholder:"Search records...",emptyTitle:"No records found",emptyMessage:"No records matched your search or filters.",...t},this.currentPage=t.page||1,this.pageSize=t.pageSize||20,this.totalRows=t.totalRows||0,this.data=t.data||[],t.initialSort&&(this.sortColumnId=t.initialSort.columnId,this.sortDirection=t.initialSort.direction),this.loadColumnPreferences(),this.container=document.createElement("div"),this.container.className="datatable-container",this.toolbarEl=document.createElement("div"),this.toolbarEl.className="toolbar datatable-toolbar",this.customFilterSlot=document.createElement("div"),this.customFilterSlot.className="datatable-filter-slot",this.customActionsSlot=document.createElement("div"),this.customActionsSlot.className="datatable-actions-slot",this.tableWrapper=document.createElement("div"),this.tableWrapper.className="table-responsive",this.tableEl=document.createElement("table"),this.tableEl.className="data-table",this.theadEl=document.createElement("thead"),this.tbodyEl=document.createElement("tbody"),this.tableEl.appendChild(this.theadEl),this.tableEl.appendChild(this.tbodyEl),this.tableWrapper.appendChild(this.tableEl),this.paginationBar=document.createElement("div"),this.paginationBar.className="pagination-bar datatable-pagination",this.pageInfoEl=document.createElement("div"),this.pageControlsEl=document.createElement("div"),this.pageControlsEl.className="pagination-controls",this.buildToolbar(),this.buildPagination(),this.renderHeader(),this.renderBody(),this.container.appendChild(this.toolbarEl),this.container.appendChild(this.tableWrapper),this.options.enablePagination&&this.container.appendChild(this.paginationBar),this.bindDocumentEvents()}loadColumnPreferences(){this.options.columns.forEach(t=>{t.hidden&&this.hiddenColumnIds.add(t.id)});try{const t=localStorage.getItem(`dt_cols_${this.options.tableId}`);if(t){const e=JSON.parse(t);Array.isArray(e)&&(this.hiddenColumnIds=new Set(e))}}catch{}}saveColumnPreferences(){try{localStorage.setItem(`dt_cols_${this.options.tableId}`,JSON.stringify(Array.from(this.hiddenColumnIds)))}catch{}}buildToolbar(){this.toolbarEl.innerHTML="";const t=document.createElement("div");if(t.className="toolbar-group",this.options.enableSearch){const s=document.createElement("div");s.className="search-input-wrapper datatable-search-wrapper";const a=document.createElement("span");a.className="search-icon",a.innerHTML='<i class="fa-solid fa-magnifying-glass"></i>',this.searchInput=document.createElement("input"),this.searchInput.type="text",this.searchInput.className="search-input",this.searchInput.placeholder=this.options.searchPlaceholder||"Search records...",this.searchInput.setAttribute("aria-label",this.options.searchPlaceholder||"Search records"),this.searchClearBtn=document.createElement("button"),this.searchClearBtn.type="button",this.searchClearBtn.className="search-clear-btn",this.searchClearBtn.innerHTML="&times;",this.searchClearBtn.title="Clear search",this.searchClearBtn.style.display="none",this.searchInput.addEventListener("input",()=>{const r=this.searchInput?.value.trim()||"";this.searchClearBtn.style.display=r?"block":"none",this.searchDebounceTimer&&clearTimeout(this.searchDebounceTimer),this.searchDebounceTimer=window.setTimeout(()=>{this.currentPage=1,this.options.onSearch&&this.options.onSearch(r)},280)}),this.searchClearBtn.addEventListener("click",()=>{this.searchInput&&(this.searchInput.value="",this.searchClearBtn.style.display="none",this.currentPage=1,this.options.onSearch&&this.options.onSearch(""),this.searchInput.focus())}),s.appendChild(a),s.appendChild(this.searchInput),s.appendChild(this.searchClearBtn),t.appendChild(s)}t.appendChild(this.customFilterSlot);const e=document.createElement("div");if(e.className="toolbar-group",e.appendChild(this.customActionsSlot),this.options.enableColumnToggle){const s=document.createElement("div");s.className="column-toggle-wrapper",s.style.position="relative",this.columnToggleBtn=document.createElement("button"),this.columnToggleBtn.type="button",this.columnToggleBtn.className="btn btn-secondary btn-sm column-toggle-btn",this.updateColumnToggleBtnText(),this.columnPopover=document.createElement("div"),this.columnPopover.className="column-toggle-popover",this.columnPopover.style.display="none",this.renderColumnPopover(),this.columnToggleBtn.addEventListener("click",a=>{a.stopPropagation();const r=this.columnPopover.style.display==="block";this.columnPopover.style.display=r?"none":"block"}),s.appendChild(this.columnToggleBtn),s.appendChild(this.columnPopover),e.appendChild(s)}this.toolbarEl.appendChild(t),this.toolbarEl.appendChild(e)}updateColumnToggleBtnText(){if(!this.columnToggleBtn)return;const t=this.options.columns.filter(s=>s.hideable!==!1),e=t.filter(s=>!this.hiddenColumnIds.has(s.id)).length;this.columnToggleBtn.innerHTML=`<i class="fa-solid fa-table-columns"></i> Columns (${e}/${t.length})`}renderColumnPopover(){if(!this.columnPopover)return;this.columnPopover.innerHTML=`
      <div class="col-popover-header">
        <span style="font-weight: 700; font-size: 0.8rem; color: var(--neutral-700);">Toggle Columns</span>
        <button type="button" class="btn-text-sm" id="btn-col-reset" style="font-size: 0.75rem; color: var(--primary); cursor: pointer; background: none; border: none;">Reset</button>
      </div>
      <div class="col-popover-list" id="col-popover-items"></div>
    `;const t=this.columnPopover.querySelector("#col-popover-items");this.options.columns.forEach(e=>{if(e.hideable===!1)return;const s=document.createElement("label");s.className="col-popover-item";const a=document.createElement("input");a.type="checkbox",a.checked=!this.hiddenColumnIds.has(e.id),a.dataset.colId=e.id,a.addEventListener("change",()=>{if(a.checked)this.hiddenColumnIds.delete(e.id);else{if(this.options.columns.filter(l=>l.hideable!==!1).filter(l=>!this.hiddenColumnIds.has(l.id)&&l.id!==e.id).length===0){a.checked=!0;return}this.hiddenColumnIds.add(e.id)}this.saveColumnPreferences(),this.updateColumnToggleBtnText(),this.renderHeader(),this.renderBody()});const r=document.createElement("span");r.textContent=e.header,s.appendChild(a),s.appendChild(r),t.appendChild(s)}),this.columnPopover.querySelector("#btn-col-reset")?.addEventListener("click",()=>{this.hiddenColumnIds.clear(),this.options.columns.forEach(e=>{e.hidden&&this.hiddenColumnIds.add(e.id)}),this.saveColumnPreferences(),this.updateColumnToggleBtnText(),this.renderColumnPopover(),this.renderHeader(),this.renderBody()})}bindDocumentEvents(){document.addEventListener("click",t=>{if(this.columnPopover&&this.columnPopover.style.display==="block"){const e=t.target;!this.columnPopover.contains(e)&&e!==this.columnToggleBtn&&(this.columnPopover.style.display="none")}})}getVisibleColumns(){return this.options.columns.filter(t=>!this.hiddenColumnIds.has(t.id))}renderHeader(){this.theadEl.innerHTML="";const t=document.createElement("tr");this.getVisibleColumns().forEach(s=>{const a=document.createElement("th");s.width&&(a.style.width=s.width),s.align&&(a.style.textAlign=s.align);const r=document.createElement("div");if(r.className="th-inner",s.sortable){a.classList.add("sortable"),a.setAttribute("tabindex","0"),a.setAttribute("role","button"),a.setAttribute("aria-label",`Sort by ${s.header}`);const i=document.createElement("span");i.textContent=s.header;const n=document.createElement("span");n.className="sort-indicator",this.sortColumnId===s.id?(a.classList.add("sorted",this.sortDirection),n.textContent=this.sortDirection==="asc"?" ▲":" ▼"):n.textContent=" ↕",r.appendChild(i),r.appendChild(n);const l=()=>{this.sortColumnId===s.id?this.sortDirection=this.sortDirection==="asc"?"desc":"asc":(this.sortColumnId=s.id,this.sortDirection="asc");const d=s.sortKey||s.id;this.options.onSort&&this.options.onSort(s.id,this.sortDirection,d),this.renderHeader()};a.addEventListener("click",l),a.addEventListener("keydown",d=>{(d.key==="Enter"||d.key===" ")&&(d.preventDefault(),l())})}else r.textContent=s.header;a.appendChild(r),t.appendChild(a)}),this.theadEl.appendChild(t)}renderBody(){this.tbodyEl.innerHTML="";const t=this.getVisibleColumns();if(this.isLoading){const e=document.createElement("tr"),s=document.createElement("td");s.colSpan=t.length,s.style.textAlign="center",s.style.padding="3rem 1rem",s.innerHTML=`
        <div style="display: flex; flex-direction: column; align-items: center; gap: 0.5rem; color: var(--neutral-500);">
          <span style="font-size: 1.5rem;"><i class="fa-solid fa-spinner fa-spin"></i></span>
          <span style="font-weight: 600;">Loading data...</span>
        </div>
      `,e.appendChild(s),this.tbodyEl.appendChild(e);return}if(this.data.length===0){const e=document.createElement("tr"),s=document.createElement("td");s.colSpan=t.length,s.innerHTML=`
        <div class="empty-state" style="padding: 2.5rem 1rem;">
          <div class="empty-icon" style="font-size: 2.2rem; margin-bottom: 0.5rem;"><i class="fa-solid fa-magnifying-glass"></i></div>
          <div class="empty-title" style="font-size: 1.05rem;">${R(this.options.emptyTitle||"No records found")}</div>
          <div class="empty-description" style="font-size: 0.85rem; max-width: 360px;">${R(this.options.emptyMessage||"No matching entries found.")}</div>
        </div>
      `,e.appendChild(s),this.tbodyEl.appendChild(e);return}this.data.forEach((e,s)=>{const a=document.createElement("tr");this.options.onRowClick&&(a.style.cursor="pointer",a.addEventListener("click",()=>this.options.onRowClick(e,s))),t.forEach(r=>{const i=document.createElement("td");if(r.align&&(i.style.textAlign=r.align),r.className&&(i.className=r.className),r.render){const n=r.render(e,s);typeof n=="string"?i.innerHTML=n:i.appendChild(n)}else if(r.accessor){let n;typeof r.accessor=="function"?n=r.accessor(e):n=e[r.accessor],i.textContent=n!=null?String(n):"—"}a.appendChild(i)}),this.tbodyEl.appendChild(a)}),this.updatePagination()}buildPagination(){this.paginationBar.innerHTML="";const t=document.createElement("div");if(t.style.display="flex",t.style.alignItems="center",t.style.gap="1rem",t.style.flexWrap="wrap",t.appendChild(this.pageInfoEl),this.options.pageSizeOptions&&this.options.pageSizeOptions.length>1){const e=document.createElement("div");e.style.display="flex",e.style.alignItems="center",e.style.gap="0.35rem",e.style.fontSize="0.8rem",e.style.color="var(--neutral-600)";const s=document.createElement("span");s.textContent="Rows per page:",this.pageSizeSelect=document.createElement("select"),this.pageSizeSelect.className="filter-select",this.pageSizeSelect.style.padding="0.25rem 1.5rem 0.25rem 0.5rem",this.pageSizeSelect.style.fontSize="0.8rem",this.options.pageSizeOptions.forEach(a=>{const r=document.createElement("option");r.value=String(a),r.textContent=String(a),a===this.pageSize&&(r.selected=!0),this.pageSizeSelect.appendChild(r)}),this.pageSizeSelect.addEventListener("change",()=>{this.pageSize=parseInt(this.pageSizeSelect.value,10),this.currentPage=1,this.options.onPageSizeChange&&this.options.onPageSizeChange(this.pageSize)}),e.appendChild(s),e.appendChild(this.pageSizeSelect),t.appendChild(e)}this.paginationBar.appendChild(t),this.paginationBar.appendChild(this.pageControlsEl)}updatePagination(){if(!this.options.enablePagination)return;const t=Math.max(1,Math.ceil(this.totalRows/this.pageSize)),e=this.totalRows===0?0:(this.currentPage-1)*this.pageSize+1,s=Math.min(this.currentPage*this.pageSize,this.totalRows);this.pageInfoEl.textContent=`Showing ${e} to ${s} of ${this.totalRows} entries`,this.pageControlsEl.innerHTML="";const a=document.createElement("button");a.className="page-btn",a.textContent="‹ Prev",a.disabled=this.currentPage<=1,a.addEventListener("click",()=>{this.currentPage>1&&(this.currentPage--,this.options.onPageChange&&this.options.onPageChange(this.currentPage))}),this.pageControlsEl.appendChild(a);for(let i=1;i<=t;i++)if(i===1||i===t||i>=this.currentPage-2&&i<=this.currentPage+2){const n=document.createElement("button");n.className=`page-btn ${i===this.currentPage?"active":""}`,n.textContent=String(i),n.addEventListener("click",()=>{this.currentPage=i,this.options.onPageChange&&this.options.onPageChange(i)}),this.pageControlsEl.appendChild(n)}const r=document.createElement("button");r.className="page-btn",r.textContent="Next ›",r.disabled=this.currentPage>=t,r.addEventListener("click",()=>{this.currentPage<t&&(this.currentPage++,this.options.onPageChange&&this.options.onPageChange(this.currentPage))}),this.pageControlsEl.appendChild(r)}setData(t,e,s){this.data=t,e!==void 0&&(this.totalRows=e),s!==void 0&&(this.currentPage=s),this.isLoading=!1,this.renderBody()}setLoading(t){this.isLoading=t,this.renderBody()}setError(t){this.tbodyEl.innerHTML=`
      <tr>
        <td colspan="${this.getVisibleColumns().length}" style="text-align: center; padding: 2.5rem; color: var(--danger);">
          <div style="font-weight: 700; margin-bottom: 0.25rem;"><i class="fa-solid fa-triangle-exclamation"></i> Error Loading Records</div>
          <div style="font-size: 0.85rem;">${R(t)}</div>
        </td>
      </tr>
    `}setCustomFilterSlot(t){this.customFilterSlot.innerHTML="",this.customFilterSlot.appendChild(t)}addCustomAction(t){this.customActionsSlot.appendChild(t)}getSearchValue(){return this.searchInput?.value.trim()||""}setSearchValue(t){this.searchInput&&(this.searchInput.value=t,this.searchClearBtn&&(this.searchClearBtn.style.display=t?"block":"none"))}getElement(){return this.container}}function R(o){return o.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;")}class re{container;dataTable;currentPage=1;pageSize=15;activeStatus="";searchQuery="";orderBy="created_at desc";constructor(){this.container=document.createElement("div"),this.container.className="batches-view";const t=[{id:"batch_name",header:"Batch Name & File",sortable:!0,sortKey:"batch_name",render:e=>`
          <div>
            <div class="cell-bold">${K(e.batch_name)}</div>
            <div style="font-size: 0.75rem; color: var(--neutral-500); margin-top: 0.15rem;">
              <i class="fa-regular fa-file-excel" aria-hidden="true"></i> ${K(e.file_name)} (${(e.file_size/1024).toFixed(1)} KB)
            </div>
          </div>
        `},{id:"status",header:"Status",sortable:!0,sortKey:"status",width:"150px",render:e=>`
          <span class="badge badge-${e.status}">
            ${ie(e.status)}
          </span>
        `},{id:"progress",header:"Progress",width:"180px",render:e=>{const s=e.status==="committed"||e.status==="committed_with_errors",a=e.status==="validating";return e.status==="uploading"?`
              <div style="font-size: 0.75rem; color: var(--neutral-600); margin-bottom: 0.2rem;">
                Uploading: ${e.upload_progress}% (${e.uploaded_chunks.length}/${e.chunk_count} chunks)
              </div>
              <div class="progress-container"><div class="progress-bar-fill animated" style="width: ${e.upload_progress}%;"></div></div>
            `:a?`
              <div style="font-size: 0.75rem; color: var(--neutral-600); margin-bottom: 0.2rem;">
                Validating: ${e.process_progress}% (${e.processed_rows}/${e.total_rows} rows)
              </div>
              <div class="progress-container"><div class="progress-bar-fill animated" style="width: ${e.process_progress}%;"></div></div>
            `:s?`
              <div style="font-size: 0.75rem; color: var(--success-text); font-weight: 600;">
                100% Processed (${e.onboarded_rows} onboarded)
              </div>
              <div class="progress-container"><div class="progress-bar-fill success" style="width: 100%;"></div></div>
            `:`
              <div style="font-size: 0.75rem; color: var(--neutral-500);">
                ${e.total_rows} total rows
              </div>
              <div class="progress-container"><div class="progress-bar-fill" style="width: 100%;"></div></div>
            `}},{id:"row_breakdown",header:"Row Breakdown",render:e=>`
          <div style="font-size: 0.8rem; line-height: 1.4;">
            <span style="color: var(--success); font-weight: 600;">${e.valid_rows} Valid</span> |
            <span style="color: var(--danger); font-weight: 600;">${e.invalid_rows} Invalid</span> |
            <span style="color: var(--secondary); font-weight: 600;">${e.onboarded_rows} Onboarded</span>
          </div>
        `},{id:"created_at",header:"Uploaded At",sortable:!0,sortKey:"created_at",width:"140px",className:"cell-mono",render:e=>`<span style="font-size: 0.8rem; color: var(--neutral-600);">${ne(e.created_at)}</span>`},{id:"actions",header:"Action",hideable:!1,width:"110px",align:"right",render:e=>{const s=e.status==="uploading",a=document.createElement("a");return a.href=`#/batch/${e.id}`,a.className=`btn ${s?"btn-primary":"btn-secondary"} btn-sm`,a.textContent=s?"Resume →":"Open →",a}}];this.dataTable=new M({tableId:"batches_table",columns:t,pageSize:this.pageSize,searchPlaceholder:"Search batches by name or file...",initialSort:{columnId:"created_at",direction:"desc"},emptyTitle:"No upload batches found",emptyMessage:"No batches matched your filter criteria.",onSearch:e=>{this.searchQuery=e,this.currentPage=1,this.loadBatches()},onSort:(e,s,a)=>{this.orderBy=`${a} ${s}`,this.currentPage=1,this.loadBatches()},onPageChange:e=>{this.currentPage=e,this.loadBatches()},onPageSizeChange:e=>{this.pageSize=e,this.currentPage=1,this.loadBatches()},onRowClick:e=>{window.location.hash=`#/batch/${e.id}`}}),this.setupCustomFilters()}setupCustomFilters(){const t=document.createElement("select");t.className="filter-select",t.setAttribute("aria-label","Filter batches by status"),t.innerHTML=`
      <option value="">All Statuses</option>
      <option value="uploading">Uploading</option>
      <option value="validating">Validating</option>
      <option value="validated">Validated (Ready to Review)</option>
      <option value="validated_with_errors">Validated with Errors</option>
      <option value="committing">Committing</option>
      <option value="committed">Committed</option>
      <option value="committed_with_errors">Committed with Errors</option>
      <option value="failed">Failed</option>
    `,t.addEventListener("change",()=>{this.activeStatus=t.value,this.currentPage=1,this.loadBatches()}),this.dataTable.setCustomFilterSlot(t)}async render(){return this.container.innerHTML=`
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.75rem; flex-wrap: wrap; gap: 1rem;">
        <div>
          <h2 style="font-size: 1.6rem; font-weight: 700; color: var(--neutral-900);">Upload Batches</h2>
          <p style="color: var(--neutral-500); font-size: 0.9rem; margin-top: 0.2rem;">
            Manage bulk spreadsheet uploads, follow validation progress, and review records before committing.
          </p>
        </div>

        <div style="display: flex; gap: 0.75rem;">
          <button type="button" class="btn btn-primary" id="btn-create-batch-view">
            + New Upload Batch
          </button>
        </div>
      </div>

      <!-- Quick Metrics Grid -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-header">
            <span class="stat-label">Total Batches</span>
            <i class="fa-solid fa-folder" style="color: var(--neutral-400);" aria-hidden="true"></i>
          </div>
          <div class="stat-value" id="stat-total-batches">-</div>
          <div class="stat-subtext">Uploaded sessions</div>
        </div>

        <div class="stat-card">
          <div class="stat-header">
            <span class="stat-label">Pending Staff Review</span>
            <i class="fa-solid fa-clipboard-list" style="color: var(--warning);" aria-hidden="true"></i>
          </div>
          <div class="stat-value" style="color: var(--warning);" id="stat-pending-review">-</div>
          <div class="stat-subtext">Validated & ready to commit</div>
        </div>

        <div class="stat-card">
          <div class="stat-header">
            <span class="stat-label">Successfully Committed</span>
            <i class="fa-solid fa-circle-check" style="color: var(--success);" aria-hidden="true"></i>
          </div>
          <div class="stat-value" style="color: var(--success);" id="stat-committed-batches">-</div>
          <div class="stat-subtext">Onboarded to digital banking</div>
        </div>

        <div class="stat-card">
          <div class="stat-header">
            <span class="stat-label">Total Members Onboarded</span>
            <i class="fa-solid fa-users" style="color: var(--secondary);" aria-hidden="true"></i>
          </div>
          <div class="stat-value" style="color: var(--secondary);" id="stat-total-onboarded">-</div>
          <div class="stat-subtext">Across all batches</div>
        </div>
      </div>

      <!-- Main Batches Card -->
      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">All Batches</h3>
            <p class="card-subtitle">Search, filter columns, sort by status or date, and open batches</p>
          </div>

          <button type="button" class="btn btn-secondary btn-sm" id="btn-refresh-batches">
            <i class="fa-solid fa-rotate-right" aria-hidden="true"></i> Refresh
          </button>
        </div>

        <div class="card-body" id="batches-table-slot" style="padding-top: 1rem;">
          <!-- DataTable is injected here -->
        </div>
      </div>
    `,this.container.querySelector("#batches-table-slot")?.appendChild(this.dataTable.getElement()),this.container.querySelector("#btn-create-batch-view")?.addEventListener("click",()=>{N.open()}),this.container.querySelector("#btn-refresh-batches")?.addEventListener("click",()=>{this.loadBatches()}),await this.loadBatches(),this.container}async loadBatches(){this.dataTable.setLoading(!0);try{let t="";if(this.searchQuery){const s=this.searchQuery.replace(/'/g,"''");t=`contains(batch_name, '${s}') or contains(file_name, '${s}')`}const e=await g.listUploads({page:this.currentPage,limit:this.pageSize,status:this.activeStatus||void 0,$filter:t||void 0,$orderby:this.orderBy,$count:!0});this.dataTable.setData(e.data,e.pagination.total,e.pagination.page),this.updateMetrics(e)}catch(t){this.dataTable.setError(t instanceof Error?t.message:String(t))}}updateMetrics(t){const e=t.data,s=t.pagination.total,a=e.filter(h=>h.status==="validated"||h.status==="validated_with_errors").length,r=e.filter(h=>h.status==="committed"||h.status==="committed_with_errors").length,i=e.reduce((h,y)=>h+(y.onboarded_rows||0),0),n=this.container.querySelector("#stat-total-batches"),l=this.container.querySelector("#stat-pending-review"),d=this.container.querySelector("#stat-committed-batches"),p=this.container.querySelector("#stat-total-onboarded");n&&(n.textContent=String(s)),l&&(l.textContent=String(a)),d&&(d.textContent=String(r)),p&&(p.textContent=String(i))}destroy(){}}function K(o){return o.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;")}function ie(o){return o.replace(/_/g," ")}function ne(o){try{return new Date(o).toLocaleDateString(void 0,{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}catch{return o}}class oe{uploadId;eventSource=null;lastEventId=0;connectionState="disconnected";reconnectAttempts=0;maxReconnectAttempts=10;reconnectTimer=null;isExplicitlyClosed=!1;messageListeners=[];stateListeners=[];constructor(t,e=0){this.uploadId=t,this.lastEventId=e}connect(){if(this.connectionState==="connected"||this.connectionState==="connecting")return;this.isExplicitlyClosed=!1,this.setConnectionState(this.reconnectAttempts>0?"reconnecting":"connecting");const t=v.getBaseUrl(),e=new URL(`${t}/uploads/${this.uploadId}/events`);this.lastEventId>0&&e.searchParams.set("last_event_id",String(this.lastEventId));try{this.eventSource=new EventSource(e.toString()),this.eventSource.onopen=()=>{this.reconnectAttempts=0,this.setConnectionState("connected")},["upload_created","chunk_received","file_received","processing_started","row_processed","validation_completed","commit_started","row_committed","commit_completed","failed"].forEach(a=>{this.eventSource?.addEventListener(a,r=>{this.handleEvent(r,a)})}),this.eventSource.onmessage=a=>{this.handleEvent(a,"message")},this.eventSource.onerror=()=>{this.isExplicitlyClosed||this.handleDisconnect()}}catch{this.handleDisconnect()}}handleEvent(t,e){const s=t.lastEventId?Number(t.lastEventId):0;s>this.lastEventId&&(this.lastEventId=s);const a=t.type||e,r=f.parseSsePayload(t.data),i={id:this.lastEventId,event:a,payload:r,timestamp:new Date};this.notifyMessage(i),(a==="commit_completed"||a==="failed")&&this.setConnectionState("completed")}handleDisconnect(){if(this.isExplicitlyClosed)return;if(this.eventSource&&(this.eventSource.close(),this.eventSource=null),this.reconnectAttempts>=this.maxReconnectAttempts){this.setConnectionState("error");return}this.reconnectAttempts++,this.setConnectionState("reconnecting");const t=Math.min(1e3*Math.pow(1.5,this.reconnectAttempts-1),1e4);this.reconnectTimer=window.setTimeout(()=>{this.isExplicitlyClosed||this.connect()},t)}close(){this.isExplicitlyClosed=!0,this.reconnectTimer&&(clearTimeout(this.reconnectTimer),this.reconnectTimer=null),this.eventSource&&(this.eventSource.close(),this.eventSource=null),this.setConnectionState("disconnected")}onMessage(t){return this.messageListeners.push(t),()=>{this.messageListeners=this.messageListeners.filter(e=>e!==t)}}onStateChange(t){return this.stateListeners.push(t),t(this.connectionState),()=>{this.stateListeners=this.stateListeners.filter(e=>e!==t)}}getState(){return this.connectionState}getLastEventId(){return this.lastEventId}setConnectionState(t){this.connectionState!==t&&(this.connectionState=t,this.stateListeners.forEach(e=>e(t)))}notifyMessage(t){this.messageListeners.forEach(e=>{try{e(t)}catch(s){console.error("Error in SSE listener:",s)}})}}class le{uploadId;container;upload=null;sseClient=null;currentRecordsResponse=null;dataTable;activeStatusFilter="";searchQuery="";currentPage=1;pageSize=20;orderBy="row_number asc";constructor(t){this.uploadId=t,this.container=document.createElement("div"),this.container.className="batch-detail-view";const e=[{id:"row_number",header:"Row",width:"75px",sortable:!0,sortKey:"row_number",className:"cell-mono cell-bold",render:s=>String(s.row_number)},{id:"status",header:"Status",width:"130px",sortable:!0,sortKey:"status",render:s=>`
          <span class="badge badge-${s.status}">
            ${A(s.status)}
          </span>
        `},{id:"member_number",header:"Member #",sortable:!0,sortKey:"member_number",className:"cell-mono cell-bold",render:s=>s.member_number?w(s.member_number):'<span style="color: var(--neutral-400);">Not Set</span>'},{id:"full_name",header:"Name",sortable:!0,sortKey:"first_name",className:"cell-bold",render:s=>w(`${s.first_name||""} ${s.last_name||""}`.trim()||"—")},{id:"identifiers",header:"Phone / ID",className:"cell-mono",render:s=>{const a=s.id_number?`ID: ${s.id_number}`:"",r=s.phone_number?`Tel: ${s.phone_number}`:"";return a&&r?`<div>${w(a)}</div><div style="color: var(--neutral-500); font-size: 0.75rem;">${w(r)}</div>`:w(a||r||"—")}},{id:"branch_account",header:"Branch & Account",render:s=>w(`${s.branch||"—"} (${s.account_type||"—"})`)},{id:"reason",header:"Reason / Findings",className:"cell-reason",render:s=>s.reason?`<span style="color: var(--danger-text);">${w(s.reason)}</span>`:'<span style="color: var(--neutral-400); font-style: italic;">No errors</span>'},{id:"actions",header:"Action",hideable:!1,width:"90px",align:"right",render:s=>{const a=document.createElement("button");return a.type="button",a.className="btn btn-secondary btn-sm",a.textContent="Inspect",a.addEventListener("click",r=>{r.stopPropagation(),this.openRecordInspector(s)}),a}}];this.dataTable=new M({tableId:`batch_records_${this.uploadId}`,columns:e,pageSize:this.pageSize,searchPlaceholder:"Search by name, member #, email, ID...",initialSort:{columnId:"row_number",direction:"asc"},emptyTitle:"No records found",emptyMessage:"No records matched the selected status or search query.",onSearch:s=>{this.searchQuery=s,this.currentPage=1,this.loadRecords()},onSort:(s,a,r)=>{this.orderBy=`${r} ${a}`,this.currentPage=1,this.loadRecords()},onPageChange:s=>{this.currentPage=s,this.loadRecords()},onPageSizeChange:s=>{this.pageSize=s,this.currentPage=1,this.loadRecords()},onRowClick:s=>{this.openRecordInspector(s)}}),this.setupExportActions()}setupExportActions(){const t=document.createElement("button");t.type="button",t.className="btn btn-secondary btn-sm",t.title="Export records as CSV",t.innerHTML='<i class="fa-solid fa-file-csv"></i> CSV',t.addEventListener("click",async()=>{try{c.info("Preparing CSV export..."),await g.exportRecords(this.uploadId,"csv",this.activeStatusFilter||void 0),c.success("CSV downloaded successfully.")}catch(a){c.error(`Export failed: ${a instanceof Error?a.message:String(a)}`)}});const e=document.createElement("button");e.type="button",e.className="btn btn-secondary btn-sm",e.title="Export records as XLSX",e.innerHTML='<i class="fa-solid fa-file-excel"></i> XLSX',e.addEventListener("click",async()=>{try{c.info("Preparing Excel export..."),await g.exportRecords(this.uploadId,"xlsx",this.activeStatusFilter||void 0),c.success("Excel workbook downloaded successfully.")}catch(a){c.error(`Export failed: ${a instanceof Error?a.message:String(a)}`)}});const s=document.createElement("button");s.type="button",s.className="btn btn-outline-primary btn-sm",s.title="Download only invalid & duplicate records",s.innerHTML='<i class="fa-solid fa-triangle-exclamation"></i> Invalid Rows',s.addEventListener("click",async()=>{try{c.info("Downloading invalid and duplicate rows..."),await g.downloadInvalidRows(this.uploadId),c.success("Invalid rows workbook downloaded.")}catch(a){c.error(`Download failed: ${a instanceof Error?a.message:String(a)}`)}}),this.dataTable.addCustomAction(t),this.dataTable.addCustomAction(e),this.dataTable.addCustomAction(s)}async render(){return this.container.innerHTML=`
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
        <div>
          <a href="#/batches" style="display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.85rem; color: var(--neutral-500); text-decoration: none; margin-bottom: 0.5rem;">
            ← Back to All Batches
          </a>
          <h2 id="batch-title" style="font-size: 1.6rem; font-weight: 700; color: var(--neutral-900); display: flex; align-items: center; gap: 0.75rem;">
            Loading Batch...
          </h2>
          <p id="batch-description" style="color: var(--neutral-600); font-size: 0.9rem; margin-top: 0.25rem;"></p>
        </div>

        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;" id="batch-header-actions">
          <!-- Actions populated dynamically -->
        </div>
      </div>

      <!-- Live SSE Progress / Status Banner -->
      <div id="live-progress-container" style="display: none; margin-bottom: 1.5rem;"></div>

      <!-- Review & Commit Banner -->
      <div id="commit-action-banner" style="display: none; margin-bottom: 1.5rem;"></div>

      <!-- Stats Grid -->
      <div class="stats-grid" id="batch-stats-grid">
        <div class="stat-card">
          <div class="stat-header">
            <span class="stat-label">Total Rows</span>
            <i class="fa-solid fa-chart-simple" style="color: var(--neutral-400);" aria-hidden="true"></i>
          </div>
          <div class="stat-value" id="stat-total">-</div>
          <div class="stat-subtext">Workbook records</div>
        </div>
        <div class="stat-card">
          <div class="stat-header">
            <span class="stat-label">Valid Eligible</span>
            <i class="fa-solid fa-circle-check" style="color: var(--success);" aria-hidden="true"></i>
          </div>
          <div class="stat-value" style="color: var(--success);" id="stat-valid">-</div>
          <div class="stat-subtext">Ready for onboarding</div>
        </div>
        <div class="stat-card">
          <div class="stat-header">
            <span class="stat-label">Invalid Rows</span>
            <i class="fa-solid fa-circle-xmark" style="color: var(--danger);" aria-hidden="true"></i>
          </div>
          <div class="stat-value" style="color: var(--danger);" id="stat-invalid">-</div>
          <div class="stat-subtext">Core mismatch or errors</div>
        </div>
        <div class="stat-card">
          <div class="stat-header">
            <span class="stat-label">Duplicates</span>
            <i class="fa-solid fa-triangle-exclamation" style="color: var(--warning);" aria-hidden="true"></i>
          </div>
          <div class="stat-value" style="color: var(--warning);" id="stat-duplicates">-</div>
          <div class="stat-subtext">Already onboarded / repeated</div>
        </div>
        <div class="stat-card">
          <div class="stat-header">
            <span class="stat-label">Onboarded</span>
            <i class="fa-solid fa-users" style="color: var(--secondary);" aria-hidden="true"></i>
          </div>
          <div class="stat-value" style="color: var(--secondary);" id="stat-onboarded">-</div>
          <div class="stat-subtext">Confirmed in digital banking</div>
        </div>
      </div>

      <!-- Records Table Card -->
      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">Workbook Records</h3>
            <p class="card-subtitle">Inspect individual records, toggle columns, search in real-time, and export results</p>
          </div>

          <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
            <div class="filter-tabs" id="status-filter-tabs">
              <button type="button" class="filter-tab active" data-status="">All <span class="filter-tab-count" id="count-all">0</span></button>
              <button type="button" class="filter-tab" data-status="valid">Valid <span class="filter-tab-count" id="count-valid">0</span></button>
              <button type="button" class="filter-tab" data-status="onboarded">Onboarded <span class="filter-tab-count" id="count-onboarded">0</span></button>
              <button type="button" class="filter-tab" data-status="invalid">Invalid <span class="filter-tab-count" id="count-invalid">0</span></button>
              <button type="button" class="filter-tab" data-status="duplicate">Duplicate <span class="filter-tab-count" id="count-duplicate">0</span></button>
            </div>
          </div>
        </div>

        <div class="card-body" id="records-table-slot" style="padding-top: 1rem;">
          <!-- DataTable is injected here -->
        </div>
      </div>

      <!-- Live Event Feed Collapsible Drawer -->
      <div class="card" id="event-feed-card" style="margin-top: 1rem;">
        <div class="card-header" style="cursor: pointer;" id="event-feed-toggle">
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <i class="fa-solid fa-tower-broadcast" style="color: var(--primary);" aria-hidden="true"></i>
            <h4 style="font-size: 0.95rem; font-weight: 700; color: var(--neutral-800);">Server-Sent Events (SSE) Stream</h4>
            <span class="badge badge-validating" id="sse-connection-pill">Connecting</span>
          </div>
          <span id="event-feed-chevron" style="color: var(--neutral-400); font-size: 0.85rem;"><i class="fa-solid fa-chevron-down"></i> Click to expand log</span>
        </div>
        <div class="card-body" id="event-feed-body" style="display: none; padding-top: 0.5rem;">
          <div class="event-log-container" id="event-log-list">
            <div style="color: #64748b; font-style: italic;">Awaiting server events...</div>
          </div>
        </div>
      </div>
    `,this.container.querySelector("#records-table-slot")?.appendChild(this.dataTable.getElement()),this.bindEvents(),await this.loadBatch(),this.container}bindEvents(){this.container.querySelectorAll(".filter-tab").forEach(a=>{a.addEventListener("click",()=>{this.container.querySelectorAll(".filter-tab").forEach(r=>r.classList.remove("active")),a.classList.add("active"),this.activeStatusFilter=a.dataset.status||"",this.currentPage=1,this.loadRecords()})});const t=this.container.querySelector("#event-feed-toggle"),e=this.container.querySelector("#event-feed-body"),s=this.container.querySelector("#event-feed-chevron");t?.addEventListener("click",()=>{if(e){const a=e.style.display==="none";e.style.display=a?"block":"none",s&&(s.innerHTML=a?'<i class="fa-solid fa-chevron-up"></i> Click to collapse log':'<i class="fa-solid fa-chevron-down"></i> Click to expand log')}})}async loadBatch(){try{this.upload=await g.getUpload(this.uploadId),this.renderHeader(),this.renderStats(),this.updateBanners(),await this.loadRecords(),this.initSseStream()}catch(t){c.error(`Failed to load batch: ${t instanceof Error?t.message:String(t)}`)}}renderHeader(){if(!this.upload)return;const t=this.container.querySelector("#batch-title"),e=this.container.querySelector("#batch-description"),s=this.container.querySelector("#batch-header-actions");t.innerHTML=`
      <span>${w(this.upload.batch_name)}</span>
      <span class="badge badge-${this.upload.status}">${A(this.upload.status)}</span>
    `,e.textContent=this.upload.description||`File: ${this.upload.file_name} (${(this.upload.file_size/1024).toFixed(1)} KB)`,s.innerHTML=`
      <button type="button" class="btn btn-secondary btn-sm" id="btn-refresh-batch">
        <i class="fa-solid fa-rotate-right" aria-hidden="true"></i> Refresh
      </button>
    `,s.querySelector("#btn-refresh-batch")?.addEventListener("click",()=>{this.loadBatch()})}renderStats(){if(!this.upload)return;this.container.querySelector("#stat-total").textContent=String(this.upload.total_rows||0),this.container.querySelector("#stat-valid").textContent=String(this.upload.valid_rows||0),this.container.querySelector("#stat-invalid").textContent=String(this.upload.invalid_rows||0),this.container.querySelector("#stat-onboarded").textContent=String(this.upload.onboarded_rows||0);const t=this.currentRecordsResponse?.status_counts?.duplicate??0;this.container.querySelector("#stat-duplicates").textContent=String(t)}updateBanners(){if(!this.upload)return;const t=this.container.querySelector("#live-progress-container"),e=this.container.querySelector("#commit-action-banner");if(this.upload.status==="uploading"){t.style.display="block";const s=this.upload.uploaded_chunks.length,a=this.upload.chunk_count||1;t.innerHTML=`
        <div class="banner banner-warning">
          <span class="banner-icon"><i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i></span>
          <div class="banner-content">
            <div class="banner-title">Upload Incomplete (${this.upload.upload_progress}% Transferred)</div>
            <p style="font-size: 0.85rem; margin-bottom: 0.5rem;">
              The server has received ${s} of ${a} chunks for <strong>${w(this.upload.file_name)}</strong>.
              You can select the file to resume uploading remaining chunks without starting over.
            </p>
            <div style="display: flex; gap: 0.5rem; align-items: center; margin-top: 0.75rem;">
              <input type="file" id="resume-file-picker" accept=".xlsx" style="display: none;" />
              <button type="button" class="btn btn-primary btn-sm" id="btn-select-resume-file">
                <i class="fa-solid fa-folder-open" aria-hidden="true"></i> Select File to Resume Upload
              </button>
            </div>
            <div id="resume-progress-area" style="margin-top: 0.75rem; display: none;">
              <div class="progress-container" style="height: 8px;">
                <div class="progress-bar-fill animated" id="resume-progress-fill" style="width: ${this.upload.upload_progress}%;"></div>
              </div>
            </div>
          </div>
        </div>
      `;const r=t.querySelector("#resume-file-picker"),i=t.querySelector("#btn-select-resume-file"),n=t.querySelector("#resume-progress-area"),l=t.querySelector("#resume-progress-fill");i.addEventListener("click",()=>r.click()),r.addEventListener("change",async()=>{if(!r.files||!r.files[0])return;const d=r.files[0];i.disabled=!0,i.textContent="Resuming...",n.style.display="block";const p=new X({batchName:this.upload.batch_name,description:this.upload.description,file:d,onProgress:h=>{l.style.width=`${h.percent}%`},onComplete:()=>{c.success("Upload resumed and completed. Validation started."),this.loadBatch()},onError:h=>{c.error(`Resume error: ${h.message}`),i.disabled=!1,i.innerHTML='<i class="fa-solid fa-folder-open" aria-hidden="true"></i> Select File to Resume Upload'}});try{await p.start()}catch(h){console.error(h)}});return}if(this.upload.status==="validating"||this.upload.status==="committing"){t.style.display="block";const s=this.upload.status==="committing"?95:this.upload.process_progress||0;t.innerHTML=`
        <div class="banner banner-info">
          <span class="banner-icon"><i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i></span>
          <div class="banner-content">
            <div class="banner-title">
              ${this.upload.status==="committing"?"Onboarding Eligible Members...":"Validation In Progress..."}
            </div>
            <p style="font-size: 0.85rem; margin-bottom: 0.5rem;">
              ${this.upload.status==="committing"?"Registering members with core banking and activating digital accounts.":`Checked ${this.upload.processed_rows} of ${this.upload.total_rows} rows against core banking records.`}
            </p>
            <div class="progress-container" style="height: 8px;">
              <div class="progress-bar-fill animated" style="width: ${s}%;"></div>
            </div>
          </div>
        </div>
      `}else t.style.display="none";if(this.upload.status==="validated"||this.upload.status==="validated_with_errors"){e.style.display="block";const s=this.upload.valid_rows||0,a=this.upload.invalid_rows||0;e.innerHTML=`
        <div class="banner banner-warning">
          <span class="banner-icon"><i class="fa-solid fa-clipboard-check" aria-hidden="true"></i></span>
          <div class="banner-content">
            <div class="banner-title">Staff Review Required — No Members Onboarded Yet</div>
            <p style="font-size: 0.875rem; margin-top: 0.25rem;">
              Validation is complete. In accordance with digital banking controls, <strong>no members have been onboarded yet</strong>.
              Please inspect the rows below. There are <strong>${s} eligible valid rows</strong> and <strong>${a} invalid / duplicate rows</strong>.
            </p>
            
            <div style="margin-top: 0.85rem; display: flex; align-items: center; gap: 0.5rem;">
              <input type="checkbox" id="check-confirm-review" style="width: 18px; height: 18px; cursor: pointer;" />
              <label for="check-confirm-review" style="font-size: 0.875rem; font-weight: 600; cursor: pointer; color: var(--neutral-900);">
                I confirm that I have reviewed the validation results and authorize onboarding of all valid rows.
              </label>
            </div>

            <div class="banner-actions">
              <button type="button" class="btn btn-success" id="btn-commit-batch" disabled>
                <i class="fa-solid fa-circle-check" aria-hidden="true"></i> Commit Valid Rows (${s} Members)
              </button>
            </div>
          </div>
        </div>
      `;const r=e.querySelector("#check-confirm-review"),i=e.querySelector("#btn-commit-batch");r.addEventListener("change",()=>{i.disabled=!r.checked||s===0}),i.addEventListener("click",async()=>{i.disabled=!0,i.innerHTML='<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Committing Members...';try{c.info("Committing valid members to digital banking...");const n=await g.commitValidatedUpload(this.uploadId,!0);c.success(`Successfully committed! ${n.committed_rows} members have been onboarded.`),await this.loadBatch()}catch(n){c.error(`Commit failed: ${n instanceof Error?n.message:String(n)}`),i.disabled=!1,i.innerHTML=`<i class="fa-solid fa-circle-check" aria-hidden="true"></i> Commit Valid Rows (${s} Members)`}})}else if(this.upload.status==="committed"||this.upload.status==="committed_with_errors"){e.style.display="block";const s=this.upload.onboarded_rows||0,a=this.upload.invalid_rows||0;e.innerHTML=`
        <div class="banner banner-success">
          <span class="banner-icon"><i class="fa-solid fa-circle-check" aria-hidden="true"></i></span>
          <div class="banner-content">
            <div class="banner-title">Batch Successfully Committed</div>
            <p style="font-size: 0.875rem; margin-top: 0.25rem;">
              <strong>${s} members</strong> have been activated in digital banking.
              ${a>0?`The ${a} invalid or duplicate rows remain preserved in this batch for your audit.`:""}
            </p>
            <div class="banner-actions">
              <a href="#/members" class="btn btn-secondary btn-sm">
                <i class="fa-solid fa-users" aria-hidden="true"></i> View Onboarded Members Directory
              </a>
              ${a>0?'<button type="button" class="btn btn-outline-primary btn-sm" id="btn-download-invalid-banner"><i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i> Download Invalid Rows (.xlsx)</button>':""}
            </div>
          </div>
        </div>
      `,e.querySelector("#btn-download-invalid-banner")?.addEventListener("click",async()=>{try{await g.downloadInvalidRows(this.uploadId)}catch(r){c.error(String(r))}})}else e.style.display="none"}async loadRecords(){this.dataTable.setLoading(!0);try{let t="";if(this.searchQuery){const e=this.searchQuery.replace(/'/g,"''");t=`contains(first_name, '${e}') or contains(last_name, '${e}') or contains(member_number, '${e}') or contains(email, '${e}')`}this.currentRecordsResponse=await g.listUploadRecords(this.uploadId,{page:this.currentPage,limit:this.pageSize,status:this.activeStatusFilter||void 0,$filter:t||void 0,$orderby:this.orderBy,$count:!0}),this.dataTable.setData(this.currentRecordsResponse.data,this.currentRecordsResponse.pagination.total,this.currentRecordsResponse.pagination.page),this.updateStatusTabCounts()}catch(t){this.dataTable.setError(t instanceof Error?t.message:String(t))}}updateStatusTabCounts(){if(!this.currentRecordsResponse)return;const t=this.currentRecordsResponse.status_counts||{},e=Object.values(t).reduce((d,p)=>d+p,0)||this.currentRecordsResponse.pagination.total,s=this.container.querySelector("#count-all"),a=this.container.querySelector("#count-valid"),r=this.container.querySelector("#count-onboarded"),i=this.container.querySelector("#count-invalid"),n=this.container.querySelector("#count-duplicate"),l=this.container.querySelector("#stat-duplicates");s&&(s.textContent=String(e)),a&&(a.textContent=String(t.valid||0)),r&&(r.textContent=String(t.onboarded||0)),i&&(i.textContent=String(t.invalid||0)),n&&(n.textContent=String(t.duplicate||0)),l&&(l.textContent=String(t.duplicate||0))}openRecordInspector(t){const e=document.createElement("div");e.innerHTML=`
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.25rem;">
        <div>
          <div style="font-size: 0.75rem; color: var(--neutral-500); text-transform: uppercase; font-weight: 600;">Status</div>
          <div style="margin-top: 0.25rem;">
            <span class="badge badge-${t.status}">${A(t.status)}</span>
          </div>
        </div>
        <div>
          <div style="font-size: 0.75rem; color: var(--neutral-500); text-transform: uppercase; font-weight: 600;">Workbook Row</div>
          <div style="font-weight: 700; font-family: var(--font-mono); margin-top: 0.25rem;">Row #${t.row_number}</div>
        </div>
      </div>

      ${t.reason?`
        <div style="background-color: var(--danger-bg); border: 1px solid var(--danger-border); border-radius: var(--radius-md); padding: 0.85rem; margin-bottom: 1.25rem;">
          <div style="font-weight: 700; font-size: 0.85rem; color: var(--danger-text);">Validation Finding:</div>
          <div style="font-size: 0.85rem; color: var(--danger-text); margin-top: 0.2rem;">${w(t.reason)}</div>
        </div>
      `:""}

      <div style="border-top: 1px solid var(--neutral-200); padding-top: 1rem;">
        <h4 style="font-size: 0.9rem; font-weight: 700; margin-bottom: 0.75rem; color: var(--neutral-800);">Member Details</h4>
        <dl style="display: grid; grid-template-columns: 140px 1fr; gap: 0.5rem; font-size: 0.875rem;">
          <dt style="color: var(--neutral-500);">Full Name:</dt>
          <dd style="font-weight: 600;">${w(t.first_name)} ${w(t.last_name)}</dd>

          <dt style="color: var(--neutral-500);">Member Number:</dt>
          <dd class="cell-mono">${t.member_number||"—"}</dd>

          <dt style="color: var(--neutral-500);">National ID:</dt>
          <dd class="cell-mono">${t.id_number||"—"}</dd>

          <dt style="color: var(--neutral-500);">Phone Number:</dt>
          <dd class="cell-mono">${t.phone_number||"—"}</dd>

          <dt style="color: var(--neutral-500);">Date of Birth:</dt>
          <dd class="cell-mono">${t.date_of_birth||"—"}</dd>

          <dt style="color: var(--neutral-500);">Email Address:</dt>
          <dd>${t.email||"—"}</dd>

          <dt style="color: var(--neutral-500);">Branch:</dt>
          <dd>${t.branch||"—"}</dd>

          <dt style="color: var(--neutral-500);">Account Type:</dt>
          <dd style="text-transform: capitalize;">${t.account_type||"—"}</dd>
        </dl>
      </div>
    `,new z({title:`Inspect Record — Row #${t.row_number}`,content:e,footerButtons:[{label:"Close",className:"btn-secondary",onClick:a=>a.close()}]}).open()}initSseStream(){if(this.sseClient)return;this.sseClient=new oe(this.uploadId);const t=this.container.querySelector("#sse-connection-pill"),e=this.container.querySelector("#event-log-list");this.sseClient.onStateChange(s=>{t&&(t.textContent=s.toUpperCase(),s==="connected"?t.className="badge badge-valid":s==="reconnecting"?t.className="badge badge-warning":t.className="badge badge-validated")}),this.sseClient.onMessage(s=>{if(e){const a=document.createElement("div");a.className="log-entry";const r=s.timestamp.toTimeString().split(" ")[0];a.innerHTML=`
          <span class="log-time">[${r}]</span>
          <span class="log-badge ${de(s.event)}">${s.event}</span>
          <span>${ce(s.event,s.payload)}</span>
        `,e.insertBefore(a,e.firstChild)}["row_processed","validation_completed","row_committed","commit_completed"].includes(s.event)&&this.refreshStateFromEvent(s)}),this.sseClient.connect()}async refreshStateFromEvent(t){if(t.event==="validation_completed"||t.event==="commit_completed")c.info(`Server reported: ${t.event.replace("_"," ")}`),await this.loadBatch();else if(t.event==="row_processed"){const e=t.payload;this.upload&&e.processed_rows&&(this.upload.processed_rows=e.processed_rows,this.updateBanners())}}destroy(){this.sseClient&&(this.sseClient.close(),this.sseClient=null)}}function w(o){return o.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;")}function A(o){return o.replace(/_/g," ")}function de(o){return o.includes("completed")||o==="upload_created"?"success":o.includes("started")||o.includes("processed")?"info":o.includes("error")||o==="failed"?"danger":"warning"}function ce(o,t){return o==="row_processed"?`Row ${t.row_number} checked: status=${t.status}`:o==="row_committed"?`Row ${t.row_number} committed to digital banking (ID: ${String(t.member_id||"").slice(0,8)})`:o==="validation_completed"?`Validation finished. Valid: ${t.valid_rows}, Invalid: ${t.invalid_rows}`:o==="commit_completed"?`Commit complete. ${t.committed_rows} members onboarded.`:JSON.stringify(t)}class ue{container;dataTable;currentPage=1;pageSize=20;searchQuery="";orderBy="created_at desc";constructor(){this.container=document.createElement("div"),this.container.className="members-view";const t=[{id:"member_number",header:"Member #",sortable:!0,sortKey:"member_number",width:"140px",className:"cell-mono cell-bold",render:e=>`<span style="color: var(--primary);">${b(e.member_number)}</span>`},{id:"full_name",header:"Full Name",sortable:!0,sortKey:"last_name",className:"cell-bold",render:e=>b(`${e.first_name} ${e.last_name}`)},{id:"identifiers",header:"Identifiers (ID & Phone)",className:"cell-mono",render:e=>`
          <div style="font-size: 0.8rem; line-height: 1.35;">
            <div>ID: ${b(e.id_number||"—")}</div>
            <div style="color: var(--neutral-500);">Tel: ${b(e.phone_number||"—")}</div>
          </div>
        `},{id:"branch",header:"Branch",sortable:!0,sortKey:"branch",accessor:"branch"},{id:"account",header:"Account Type & No.",className:"cell-mono",render:e=>`
          <div style="font-size: 0.825rem;">
            <span style="font-weight: 600; text-transform: capitalize;">${b(e.account_type)}</span>
            <div style="color: var(--neutral-500); font-size: 0.775rem;">${b(e.account_number||"—")}</div>
          </div>
        `},{id:"created_at",header:"Onboarded At",sortable:!0,sortKey:"created_at",width:"150px",className:"cell-mono",render:e=>`<span style="font-size: 0.8rem; color: var(--neutral-600);">${j(e.created_at)}</span>`},{id:"actions",header:"Action",hideable:!1,width:"90px",align:"right",render:e=>{const s=document.createElement("button");return s.type="button",s.className="btn btn-secondary btn-sm",s.textContent="View",s.addEventListener("click",a=>{a.stopPropagation(),this.openMemberDetail(e)}),s}}];this.dataTable=new M({tableId:"members_table",columns:t,pageSize:this.pageSize,searchPlaceholder:"Search by member #, name, phone, or national ID...",initialSort:{columnId:"created_at",direction:"desc"},emptyTitle:"No onboarded members found",emptyMessage:"No members matched your search criteria.",onSearch:e=>{this.searchQuery=e,this.currentPage=1,this.loadMembers()},onSort:(e,s,a)=>{this.orderBy=`${a} ${s}`,this.currentPage=1,this.loadMembers()},onPageChange:e=>{this.currentPage=e,this.loadMembers()},onPageSizeChange:e=>{this.pageSize=e,this.currentPage=1,this.loadMembers()},onRowClick:e=>{this.openMemberDetail(e)}})}async render(){return this.container.innerHTML=`
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
        <div>
          <h2 style="font-size: 1.6rem; font-weight: 700; color: var(--neutral-900);">Onboarded Members Directory</h2>
          <p style="color: var(--neutral-500); font-size: 0.9rem; margin-top: 0.2rem;">
            Bank members who have been successfully reviewed and activated in digital banking.
          </p>
        </div>

        <button type="button" class="btn btn-secondary btn-sm" id="btn-refresh-members">
          <i class="fa-solid fa-rotate-right" aria-hidden="true"></i> Refresh
        </button>
      </div>

      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">Active Digital Banking Members</h3>
            <p class="card-subtitle">Filter columns, search in real-time, and inspect member accounts</p>
          </div>
        </div>

        <div class="card-body" id="table-slot" style="padding-top: 1rem;">
          <!-- DataTable is injected here -->
        </div>
      </div>
    `,this.container.querySelector("#table-slot")?.appendChild(this.dataTable.getElement()),this.container.querySelector("#btn-refresh-members")?.addEventListener("click",()=>{this.loadMembers()}),await this.loadMembers(),this.container}async loadMembers(){this.dataTable.setLoading(!0);try{const t=await g.listMembers({page:this.currentPage,limit:this.pageSize,search:this.searchQuery||void 0,$orderby:this.orderBy,$count:!0});this.dataTable.setData(t.data,t.pagination.total,t.pagination.page)}catch(t){this.dataTable.setError(t instanceof Error?t.message:String(t))}}destroy(){}async openMemberDetail(t){try{const e=await g.getMember(t.id),s=document.createElement("div");s.innerHTML=`
        <div style="background-color: var(--primary-light); border: 1px solid var(--primary-border); border-radius: var(--radius-md); padding: 1rem; margin-bottom: 1.25rem; display: flex; align-items: center; justify-content: space-between;">
          <div>
            <div style="font-size: 0.75rem; color: var(--primary); font-weight: 700; text-transform: uppercase;">Digital Banking Member</div>
            <div style="font-size: 1.25rem; font-weight: 700; color: var(--neutral-900);">${b(e.first_name)} ${b(e.last_name)}</div>
          </div>
          <span class="badge badge-onboarded">Active Online Banking</span>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.25rem;">
          <div>
            <div style="font-size: 0.75rem; color: var(--neutral-500); text-transform: uppercase; font-weight: 600;">Member Number</div>
            <div class="cell-mono" style="font-weight: 700; font-size: 1rem; color: var(--primary); margin-top: 0.15rem;">
              ${b(e.member_number)}
            </div>
          </div>
          <div>
            <div style="font-size: 0.75rem; color: var(--neutral-500); text-transform: uppercase; font-weight: 600;">Account Number</div>
            <div class="cell-mono" style="font-weight: 700; font-size: 1rem; margin-top: 0.15rem;">
              ${b(e.account_number)}
            </div>
          </div>
        </div>

        <div style="border-top: 1px solid var(--neutral-200); padding-top: 1rem;">
          <h4 style="font-size: 0.85rem; font-weight: 700; color: var(--neutral-700); text-transform: uppercase; margin-bottom: 0.75rem;">Profile & Identification</h4>
          <dl style="display: grid; grid-template-columns: 140px 1fr; gap: 0.5rem; font-size: 0.875rem;">
            <dt style="color: var(--neutral-500);">National ID:</dt>
            <dd class="cell-mono">${b(e.id_number)}</dd>

            <dt style="color: var(--neutral-500);">Phone Number:</dt>
            <dd class="cell-mono">${b(e.phone_number)}</dd>

            <dt style="color: var(--neutral-500);">Date of Birth:</dt>
            <dd class="cell-mono">${b(e.date_of_birth)}</dd>

            <dt style="color: var(--neutral-500);">Email Address:</dt>
            <dd>${b(e.email)}</dd>

            <dt style="color: var(--neutral-500);">Assigned Branch:</dt>
            <dd>${b(e.branch)}</dd>

            <dt style="color: var(--neutral-500);">Account Type:</dt>
            <dd style="text-transform: capitalize;">${b(e.account_type)}</dd>

            <dt style="color: var(--neutral-500);">Source Batch:</dt>
            <dd>
              <a href="#/batch/${e.source_upload_id}" id="link-source-batch" style="color: var(--primary); text-decoration: underline; font-family: var(--font-mono); font-size: 0.825rem;">
                ${e.source_upload_id.slice(0,13)}...
              </a>
            </dd>

            <dt style="color: var(--neutral-500);">Date Onboarded:</dt>
            <dd class="cell-mono" style="font-size: 0.825rem;">${j(e.created_at)}</dd>
          </dl>
        </div>
      `;const a=new z({title:`Member Profile: ${e.member_number}`,content:s,footerButtons:[{label:"Close",className:"btn-secondary",onClick:r=>r.close()}]});s.querySelector("#link-source-batch")?.addEventListener("click",()=>{a.close()}),a.open()}catch(e){c.error(`Failed to load member profile: ${e instanceof Error?e.message:String(e)}`)}}}function b(o){return o.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;")}function j(o){try{return new Date(o).toLocaleDateString(void 0,{year:"numeric",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}catch{return o}}class he{outlet;currentView=null;constructor(t){this.outlet=t,window.addEventListener("hashchange",()=>this.handleRoute())}init(){window.location.hash?this.handleRoute():window.location.hash="#/batches"}async handleRoute(){const t=window.location.hash||"#/batches";this.currentView?.destroy&&(this.currentView.destroy(),this.currentView=null),this.outlet.innerHTML=`
      <div style="display: flex; align-items: center; justify-content: center; padding: 4rem 1rem; color: var(--neutral-400);">
        <span>Loading...</span>
      </div>
    `;try{if(t.startsWith("#/batch/")){const e=t.replace("#/batch/","").split("?")[0],s=new le(e);this.currentView=s;const a=await s.render();this.outlet.innerHTML="",this.outlet.appendChild(a)}else if(t.startsWith("#/members")){const e=new ue;this.currentView=e;const s=await e.render();this.outlet.innerHTML="",this.outlet.appendChild(s)}else{const e=new re;this.currentView=e;const s=await e.render();this.outlet.innerHTML="",this.outlet.appendChild(s)}}catch(e){this.outlet.innerHTML=`
        <div class="empty-state">
          <div class="empty-title">Page Load Error</div>
          <div class="empty-description">${e instanceof Error?e.message:String(e)}</div>
          <a href="#/batches" class="btn btn-primary">Return to Batches</a>
        </div>
      `}}}async function pe(){S.apply();const o=document.getElementById("app");if(!o)throw new Error("#app root container missing");if(!localStorage.getItem("digibanking_api_base_url"))try{const i=await fetch("/config.xml");if(i.ok){const n=await i.text(),d=new DOMParser().parseFromString(n,"application/xml").querySelector("configuration > api > port")?.textContent?.trim();d&&v.setBaseUrl(`http://localhost:${d}/api/v1`)}}catch(i){console.warn("Failed to load /config.xml",i)}const t=document.createElement("div");t.className="app-container";const e=new ae;t.appendChild(e.render());const s=document.createElement("main");s.id="app-main",s.className="main-content",t.appendChild(s);const a=document.createElement("footer");a.className="site-footer",a.innerHTML=`
    <div style="max-width: 1320px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; flex-wrap: gap: 1rem;">
      <div>
        <strong>DigiBanking Bulk Onboarding Portal</strong> &mdash; Staff Interface
      </div>
      <div>
        Security Policy: All operations are audited.
      </div>
    </div>
  `,t.appendChild(a),o.appendChild(t),new he(s).init()}pe().catch(console.error);
//# sourceMappingURL=index-By1htbg1.js.map
