(()=>{function g(e){let t=document.getElementById(e);if(!t)throw new Error(`Missing dashboard element: ${e}`);return t}var r={sidebarToggle:g("sidebar-toggle"),pageTitle:g("page-title"),pageSubtitle:g("page-subtitle"),viewGuide:g("view-guide"),topbar:g("page-title").closest(".topbar"),nav:g("nav"),apiSearch:g("api-search"),apiStatusFilter:g("api-status-filter"),apiList:g("api-list"),logoutButton:g("logout-button"),themeSelect:g("theme-select"),settingsSecurity:g("settings-security"),settingsLicense:g("settings-license"),overviewMetrics:g("overview-metrics"),overviewCharts:g("overview-charts"),exportOverviewJson:g("export-overview-json"),exportOverviewReport:g("export-overview-report"),exportOverviewHtml:g("export-overview-html"),overviewAttention:g("overview-attention"),poPlaybookContent:g("po-playbook-content"),poActionWorkflow:g("po-action-workflow"),poActionValidation:g("po-action-validation"),poActionChecks:g("po-action-checks"),poActionBaseline:g("po-action-baseline"),poActionHealth:g("po-action-health"),poActionReport:g("po-action-report"),projectRegisterName:g("project-register-name"),projectRegisterAuthAdvanced:g("project-register-auth-advanced"),projectRegisterUser:g("project-register-user"),projectRegisterPass:g("project-register-pass"),projectRegisterWriteEnv:g("project-register-write-env"),projectRegisterButton:g("project-register-button"),projectAddName:g("project-add-name"),projectAddAdvanced:g("project-add-advanced"),projectAddRoot:g("project-add-root"),projectAddDbPath:g("project-add-db-path"),projectAddButton:g("project-add-button"),projectActiveSelect:g("project-active-select"),projectSelectButton:g("project-select-button"),projectLifecycleAdvanced:g("project-lifecycle-advanced"),projectDeleteConfirm:g("project-delete-confirm"),projectArchiveButton:g("project-archive-button"),projectRestoreButton:g("project-restore-button"),projectDeleteButton:g("project-delete-button"),projectPolicyCadence:g("project-policy-cadence"),projectPolicySchedule:g("project-policy-schedule"),projectPolicyBaselineMode:g("project-policy-baseline-mode"),projectPolicyThreshold:g("project-policy-threshold"),projectPolicyBundleEnabled:g("project-policy-bundle-enabled"),projectPolicyBundleSchedule:g("project-policy-bundle-schedule"),projectPolicyBundleFormat:g("project-policy-bundle-format"),projectPolicySaveButton:g("project-policy-save-button"),projectPolicyApplyButton:g("project-policy-apply-button"),projectRunBundleButton:g("project-run-bundle-button"),projectBaselinePromoteButton:g("project-baseline-promote-button"),projectHealthCheckButton:g("project-health-check-button"),projectMonitorRefreshButton:g("project-monitor-refresh-button"),projectReportDigestButton:g("project-report-digest-button"),projectWorkflowFeedback:g("project-workflow-feedback"),projectWorkflowHealth:g("project-workflow-health"),projectWorkflowMonitor:g("project-workflow-monitor"),projectWorkflowRuns:g("project-workflow-runs"),projectWorkflowReport:g("project-workflow-report"),apiEmpty:g("api-empty"),apiWorkspace:g("api-workspace"),apiTitle:g("api-title"),apiSubtitle:g("api-subtitle"),checkNowButton:g("check-now-button"),apiMethod:g("api-method"),apiPath:g("api-path"),apiMetaGrid:g("api-meta-grid"),apiKpis:g("api-kpis"),apiTrends:g("api-trends"),apiIncidentHistory:g("api-incident-history"),apiRunTable:g("api-run-table"),apiCoreInsight:g("api-core-insight"),fieldRoleGrid:g("field-role-grid"),poModeToggle:g("po-mode-toggle"),configActiveTolerance:g("config-active-tolerance"),configRelaxed:g("config-relaxed"),configNormal:g("config-normal"),configStrict:g("config-strict"),configReferences:g("config-references"),configFeedback:g("config-feedback"),configToleranceSimple:g("config-tolerance-simple"),uploadFile:g("upload-file"),uploadButton:g("upload-button"),uploadFeedback:g("upload-feedback"),uploadActivity:g("upload-activity"),configFooter:g("config-footer"),summaryFooter:g("summary-footer"),uploadsFooter:g("uploads-footer"),uploadPreviewStep:g("upload-preview-step"),uploadPreviewBody:g("upload-preview-body"),uploadConfirmToolbar:g("upload-confirm-toolbar"),previewUploadButton:g("preview-upload-button"),cancelUploadButton:g("cancel-upload-button"),exportUploads:g("export-uploads"),templateCsvLink:g("template-csv-link"),templateXlsxLink:g("template-xlsx-link"),templateCsvLinkUpload:g("template-csv-link-upload"),templateXlsxLinkUpload:g("template-xlsx-link-upload"),incidentsList:g("incidents-list"),errorsList:g("errors-list"),errorSearch:g("error-search"),errorStatusFilter:g("error-status-filter"),errorCategoryFilter:g("error-category-filter"),errorSeverityFilter:g("error-severity-filter"),exportErrorsJson:g("export-errors-json"),exportErrorsReport:g("export-errors-report"),incidentSort:g("incident-sort"),incidentFilters:g("incident-filters"),exportIncidents:g("export-incidents"),exportIncidentsJson:g("export-incidents-json"),exportIncidentsReport:g("export-incidents-report"),exportIncidentsHtml:g("export-incidents-html"),bulkAction:g("bulk-action"),bulkNote:g("bulk-note"),bulkRun:g("bulk-run"),bulkPreview:g("bulk-preview"),schedulerList:g("scheduler-list"),exportRuns:g("export-runs"),exportRunsJson:g("export-runs-json"),exportApiReport:g("export-api-report"),exportApiHtml:g("export-api-html"),densitySelect:g("density-select"),defaultViewSelect:g("default-view-select"),namedViewInput:g("named-view-input"),saveNamedView:g("save-named-view"),exportNamedViews:g("export-named-views"),importNamedViewsButton:g("import-named-views-button"),importNamedViewsFile:g("import-named-views-file"),savedViews:g("saved-views"),drawerBackdrop:g("incident-drawer-backdrop"),drawer:g("incident-drawer"),drawerTitle:g("drawer-title"),drawerBody:g("drawer-body"),drawerClose:g("drawer-close"),confirmBackdrop:g("confirm-backdrop"),confirmModal:g("confirm-modal"),confirmTitle:g("confirm-title"),confirmCopy:g("confirm-copy"),confirmCancel:g("confirm-cancel"),confirmAccept:g("confirm-accept"),toastStack:g("toast-stack"),reportEndpointSelect:g("report-endpoint-select"),reportGrainSearch:g("report-grain-search"),runReportButton:g("run-report-button"),reportsFeedback:g("reports-feedback"),reportsContent:g("reports-content"),exportReportCsv:g("export-report-csv"),incidentsFeedback:g("incidents-feedback"),runDetailDrawer:g("run-detail-drawer"),runDetailTitle:g("run-detail-title"),runDetailContent:g("run-detail-content"),runDetailClose:g("run-detail-close")};var s={currentView:"overview",currentApiTab:"summary",selectedApi:null,selectedIncident:null,status:null,anomalies:null,scheduler:null,detailCache:new Map,apiFilter:"",apiStatusFilter:"",errorSearch:"",errorStatusFilter:"",errorCategoryFilter:"",errorSeverityFilter:"",incidentStatusFilter:"",incidentSeverityFilter:"",collapsedGroups:{},incidentSort:"business",confirmAction:null,incidentPage:1,uploadPage:1,runPage:1,uploadSort:"uploaded_at_desc",runSort:"observed_at_desc",density:"comfortable",defaultView:"overview",lastReportData:[],savedViews:[],operatorHandle:"",activeApiDetail:null,projectsCatalog:[],activeProjectId:null,projectMonitorPolicy:null,projectHealth:null,projectsMonitorSnapshot:null,projectRunHistory:[],projectDigest:null,poPlaybook:null,projectWorkflowMessage:null,incidentsMessage:null,reportsMessage:null,projectPolicyLoadedFor:null,autoSuggestSummaryByApi:{},autoSuggestTriggeredByApi:{},coreInsightsByApi:{},poMode:!1,configFocusExpandedByApi:{},activeUploadJobByApi:{},apiDataState:"fresh",apiDataMessage:null,apiDataUpdatedAt:null};function Ft(e){document.body.dataset.sidebar=e?"collapsed":"expanded",localStorage.setItem("jin-sidebar",e?"collapsed":"expanded")}function u(e){return!e&&e!==0?"\u2014":typeof e=="number"?Number.isInteger(e)?String(e):e.toFixed(2):String(e)}function et(e){return(s.status?.project?.policy?.features||[]).includes(e)}function te(e){if(!e)return"\u2014";let t=new Date(e);return Number.isNaN(t.getTime())?String(e):t.toLocaleString()}function ue(e){return encodeURIComponent(String(e||"").replace(/^\//,""))}function Bt(e,t="$"){return new Intl.NumberFormat("en-US",{style:"currency",currency:t==="$"?"USD":t,minimumFractionDigits:2,maximumFractionDigits:2}).format(e)}function Le(e){return String(e||"").trim().toLowerCase().replace(/[^a-z0-9._-]+/g,"-").replace(/^-+|-+$/g,"")||"default"}function mn(){return Le(s.operatorHandle||localStorage.getItem("jin-operator-handle")||"default")}function Ht(){return`jin-named-views:${mn()}`}function vt(){return`jin-default-view-id:${mn()}`}function bt(){let e=Number(localStorage.getItem(vt())||0);if(Number.isFinite(e)&&e>0)return e;let t=Number(localStorage.getItem("jin-default-view-id")||0);return Number.isFinite(t)&&t>0?t:0}function Dt(e){document.body.dataset.theme=e,localStorage.setItem("jin-theme",e),r.themeSelect&&(r.themeSelect.value=e)}function wt(e){s.density=e==="dense"?"dense":"comfortable",document.body.dataset.density=s.density,localStorage.setItem("jin-density",s.density),r.densitySelect&&(r.densitySelect.value=s.density)}function _t(e){return e?.severity==="critical"?"critical":e?.status||e?.severity||"active"}function Ot(e,t,n){return`
        <div class="metric">
          <span>${e}</span>
          <strong>${t}</strong>
          <small>${n}</small>
        </div>
      `}function be(e){return`<div class="empty">${e}</div>`}function fn(){return(s.status?.endpoints||[]).filter(e=>{let t=`${e.endpoint_path} ${e.http_method}`.toLowerCase(),n=!s.apiFilter||t.includes(s.apiFilter.toLowerCase()),i=!s.apiStatusFilter||(e.status||"")===s.apiStatusFilter;return n&&i})}function hn(e){let n=String(e||"").replace(/^\//,"").split("/");return n[1]||n[0]||"other"}function tt(e,t,n){let i=Math.max(1,Math.ceil(e.length/n)),a=Math.min(Math.max(t,1),i);return{items:e.slice((a-1)*n,a*n),page:a,totalPages:i}}function nt(e,t,n){return n<=1?"":`
        <div class="pagination">
          <button class="action ghost" type="button" onclick="changePage('${e}', -1)" ${t<=1?"disabled":""}>Prev</button>
          <span class="tiny">Page ${t} of ${n}</span>
          <button class="action ghost" type="button" onclick="changePage('${e}', 1)" ${t>=n?"disabled":""}>Next</button>
        </div>
      `}function st(e,t){if(!t.length){f("Nothing to export.","error");return}let n=Object.keys(t[0]),i=[n.join(","),...t.map(c=>n.map(d=>{let p=c[d],w=typeof p=="string"?p:JSON.stringify(p??"");return`"${String(w).replace(/"/g,'""')}"`}).join(","))].join("\\n"),a=new Blob([i],{type:"text/csv;charset=utf-8;"}),o=URL.createObjectURL(a),l=document.createElement("a");l.href=o,l.download=e,document.body.appendChild(l),l.click(),l.remove(),URL.revokeObjectURL(o),f(`Exported ${e}.`,"success")}function Te(e,t,n="text/plain;charset=utf-8;"){let i=new Blob([t],{type:n}),a=URL.createObjectURL(i),o=document.createElement("a");o.href=a,o.download=e,document.body.appendChild(o),o.click(),o.remove(),URL.revokeObjectURL(a),f(`Exported ${e}.`,"success")}function Ge(e,t){Te(e,JSON.stringify(t,null,2),"application/json;charset=utf-8;")}function pe(){localStorage.setItem("jin-api-filter",s.apiFilter||""),localStorage.setItem("jin-api-status-filter",s.apiStatusFilter||""),localStorage.setItem("jin-error-search",s.errorSearch||""),localStorage.setItem("jin-error-status-filter",s.errorStatusFilter||""),localStorage.setItem("jin-error-category-filter",s.errorCategoryFilter||""),localStorage.setItem("jin-error-severity-filter",s.errorSeverityFilter||""),localStorage.setItem("jin-incident-status-filter",s.incidentStatusFilter||""),localStorage.setItem("jin-incident-severity-filter",s.incidentSeverityFilter||""),localStorage.setItem("jin-incident-sort",s.incidentSort||"business"),localStorage.setItem("jin-run-sort",s.runSort||"observed_at_desc"),localStorage.setItem("jin-upload-sort",s.uploadSort||"uploaded_at_desc"),localStorage.setItem("jin-default-view",s.defaultView||"overview")}function Ee(){let e=Array.isArray(s.anomalies?.history)?s.anomalies?.history:[],t=Array.isArray(s.anomalies?.anomalies)?s.anomalies?.anomalies:[],n=[],i=new Map,a=l=>{let c=Number(l?.id);return Number.isFinite(c)&&c>0?`id:${c}`:[String(l?.endpoint_path||""),String(l?.grain_key||""),String(l?.kpi_field||""),String(l?.detected_at||l?.resolved_at||""),String(l?.detection_method||"")].join("|")},o=l=>{if(!l||typeof l!="object")return;let c=a(l),d=i.get(c);if(d==null){i.set(c,n.length),n.push(l);return}let p=n[d]||{};n[d]={...p,...l}};return e.forEach(o),t.forEach(o),n}function ze(){return ot(Ee()).filter(e=>{let t=!s.incidentStatusFilter||(e.status||"active")===s.incidentStatusFilter,n=!s.incidentSeverityFilter||(e.severity||"low")===s.incidentSeverityFilter;return t&&n})}function it(){let e=s.status?.endpoints||[],t=s.anomalies?.history||[],n=s.status?.summary||{total_endpoints:0,healthy:0,anomalies:0,unconfirmed:0};return{generated_at:new Date().toISOString(),endpoints_tracked:e.length,healthy_endpoints:n.healthy||0,unconfirmed_endpoints:n.unconfirmed||0,active_incidents:(s.anomalies?.anomalies||[]).length,selected_api:s.selectedApi||null}}function yn(){return{id:Date.now(),name:"",currentView:s.currentView,apiFilter:s.apiFilter,apiStatusFilter:s.apiStatusFilter,errorSearch:s.errorSearch,errorStatusFilter:s.errorStatusFilter,errorCategoryFilter:s.errorCategoryFilter,errorSeverityFilter:s.errorSeverityFilter,incidentStatusFilter:s.incidentStatusFilter,incidentSeverityFilter:s.incidentSeverityFilter,incidentSort:s.incidentSort,runSort:s.runSort,uploadSort:s.uploadSort,density:s.density}}function $t(){localStorage.setItem(Ht(),JSON.stringify(s.savedViews||[]))}function Pe(){r.savedViews&&(r.savedViews.innerHTML=s.savedViews.length?s.savedViews.map(e=>`
        <div class="saved-view-item">
          <div>
            <strong>${e.name}</strong>
            <div class="tiny">${e.currentView} \u2022 ${e.apiStatusFilter||"all statuses"} \u2022 ${e.density||"comfortable"} density</div>
          </div>
          <div class="toolbar compact">
            <button class="action secondary" type="button" onclick="applyNamedView(${e.id})">Apply</button>
            <button class="action secondary" type="button" onclick="setDefaultNamedView(${e.id})">${bt()===Number(e.id)?"Default":"Make Default"}</button>
            <button class="action ghost" type="button" onclick="deleteNamedView(${e.id})">Delete</button>
          </div>
        </div>
      `).join(""):'<div class="empty">No saved views yet. Save a filter + workspace combination for faster operator workflows.</div>')}function Je(e,t,n){let i=[...e];return t===`${n}_asc`?(i.sort((a,o)=>String(a[n]||"").localeCompare(String(o[n]||""))),i):t===`${n}_desc`?(i.sort((a,o)=>String(o[n]||"").localeCompare(String(a[n]||""))),i):t==="grain_asc"?(i.sort((a,o)=>String(a.grain_key||"").localeCompare(String(o.grain_key||""))),i):t==="grain_desc"?(i.sort((a,o)=>String(o.grain_key||"").localeCompare(String(a.grain_key||""))),i):(t==="kpi_asc"&&i.sort((a,o)=>String(a.kpi_field||a.kpi_json&&Object.keys(a.kpi_json)[0]||"").localeCompare(String(o.kpi_field||o.kpi_json&&Object.keys(o.kpi_json)[0]||""))),i)}function rt(){let e=document.querySelectorAll("[data-api-tab]"),t=document.querySelector(".setup-wizard");if(document.querySelectorAll("[data-wizard-step]").forEach(i=>{let a=i.dataset.wizardStep;i.classList.toggle("active",a===s.currentApiTab)}),!e.length){document.querySelectorAll("[data-api-section]").forEach(i=>i.classList.add("active"));return}document.querySelectorAll("[data-api-section]").forEach(i=>{let a=i.dataset.apiSection,o=a===s.currentApiTab||s.currentApiTab==="summary"&&(a==="summary"||a==="incidents"||a==="history");i.classList.toggle("active",o)}),e.forEach(i=>{i.classList.toggle("active",i.dataset.apiTab===s.currentApiTab)});let n=document.getElementById("magic-baseline-button");n&&n.classList.toggle("brand-glow",s.currentApiTab==="uploads")}function kt(e){s.selectedIncident=e,r.drawerTitle.textContent=`${e.endpoint_path} \u2022 ${e.kpi_field}`;let t=e.timeline||[],n=Number(e.pct_change||0),i=Math.abs(n),a=n>0,o=Number(e.confidence),l=Number.isFinite(o)?Math.round(o*100):null,c=l==null?"Confidence is not available yet (still learning this pattern).":`Confidence: ${l}%.`,d={active:"Needs review",acknowledged:"In review",snoozed:"Snoozed",suppressed:"Suppressed",resolved:"Resolved"},p={critical:"High",high:"High",medium:"Medium",low:"Low"},w=e.detected_at?te(e.detected_at):"Not recorded yet",b=n===0?"equal":a?"higher":"lower",x=String(e.endpoint_path).replace(/'/g,"\\\\'"),C=i>=40?`<strong>Major ${a?"increase":"drop"}</strong> compared to the baseline.`:`<strong>${a?"Higher":"Lower"}</strong> than expected.`;r.drawerBody.innerHTML=`
        <div class="row-card drawer-quick-summary">
          <strong>What happened</strong>
          <ul class="drawer-bullets">
            <li><strong>${e.kpi_field}</strong> is ${u(i)}% ${b} than the expected value.</li>
            <li>Expected <strong>${u(e.baseline_used)}</strong>, API returned <strong>${u(e.actual_value)}</strong>.</li>
            <li>${c}</li>
          </ul>
        </div>

        <div class="comparison-card">
          <div class="comparison-side">
            <div class="comparison-label">Expected</div>
            <div class="comparison-value">${u(e.baseline_used)}</div>
            <div class="comparison-hint">Based on ${e.config_source==="reference"?"your uploaded file":"historical learning"}</div>
          </div>
          <div class="comparison-side reality">
            <div class="comparison-label">Reality</div>
            <div class="comparison-value anomaly-ink">${u(e.actual_value)}</div>
            <div class="comparison-hint">Observed in latest run</div>
          </div>
        </div>

        ${Number(e.impact)>0?`
          <div class="impact-card">
            <div class="impact-header">
              <span class="impact-icon">\u{1F4B0}</span>
              <strong>Estimated impact</strong>
            </div>
            <div class="impact-value">${Bt(e.impact,e.currency||"$")}</div>
            <div class="impact-hint">Potential loss/risk for this grain.</div>
          </div>
        `:""}

        <div class="drift-indicator">
          <span>Difference: ${u(n)}%</span>
          <div class="drift-bar-wrap">
            <div class="drift-bar-fill" style="width: ${Math.min(100,i)}%"></div>
          </div>
        </div>

        <div class="business-explanation">
          ${C} ${l==null?"Jin is still building confidence for this pattern.":`Jin is <strong>${l}% confident</strong> this is a real anomaly.`}
        </div>

        <div class="callout" style="margin-top:20px;">
          <div><strong>Why this alert appeared</strong></div>
          <div style="margin-top:6px;">${e.why_flagged||e.ai_explanation||"No explanation available."}</div>
        </div>

        <div class="meta-grid">
          <div class="meta-card"><strong>Status</strong><span>${d[e.status]||e.status||"Needs review"}</span></div>
          <div class="meta-card"><strong>Priority</strong><span>${p[e.severity]||e.severity||"Medium"}</span></div>
          <div class="meta-card"><strong>Owner</strong><span>${e.owner||"Unassigned"}</span></div>
          <div class="meta-card"><strong>Detected</strong><span>${w}</span></div>
          <div class="meta-card"><strong>Change details</strong><span>${e.change_since_last_healthy_run||`${e.kpi_field} moved by ${u(n)}% from baseline.`}</span></div>
        </div>

        ${e.sample_json?`
          <details class="simple-section nested">
            <summary>Technical details</summary>
            <div class="simple-section-body">
              <div class="tiny muted" style="margin-bottom:8px;">Raw payload that triggered this alert.</div>
              <pre class="code-block" style="background:rgba(0,0,0,0.2); padding:10px; border-radius:6px; font-size:11px; max-height:200px; overflow:auto; border:1px solid var(--line);">${u(e.sample_json)}</pre>
            </div>
          </details>
        `:""}

        <div class="suggestion-toolbar">
          <div class="tiny" style="margin-bottom:8px; font-weight:700; color:var(--ink-soft); text-transform:uppercase; letter-spacing:0.05em;">Recommended next step</div>

          <button class="action secondary" style="width:100%; justify-content:center;" type="button" onclick="quickFixBaseline(${e.id})">
            Accept ${u(e.actual_value)} as new baseline
          </button>
          <div class="tiny muted" style="margin-top:6px;">Use this only if this new value is expected going forward.</div>

          <div class="${et("ai_chat")?"":"feature-locked"}" style="margin-top:8px;">
            <button class="action" style="width:100%; justify-content:center; background:var(--panel-alt); color:var(--ink);" type="button" 
                    ${et("ai_chat")?'onclick="investigateWithAi()"':""}>
              ${et("ai_chat")?"\u2728 Explain this alert with AI":'\u2728 Explain this alert with AI <span class="feature-lock-badge">BUSINESS</span>'}
            </button>
          </div>
        </div>

        <details class="simple-section nested">
          <summary>Timeline</summary>
          <div class="simple-section-body">
            <div class="history-list" style="margin-top:10px;">
              ${t.length?t.map(E=>`
                <div class="history-item">
                  <strong>${E.event_type||"event"}</strong>
                  <div class="tiny">${te(E.created_at)}</div>
                  ${E.owner?`<div class="tiny muted">Owner: ${E.owner}</div>`:""}
                  <div class="muted" style="margin-top:4px;">${E.note||E.resolution_reason||"No note recorded."}</div>
                </div>
              `).join(""):'<div class="empty">No incident events recorded yet.</div>'}
            </div>
          </div>
        </details>

        <section class="simple-section nested drawer-notes-section">
          <div class="drawer-section-head">Notes And Ownership</div>
          <div class="simple-section-body drawer-notes-body">
            <div class="drawer-notes">
              <div class="tiny muted drawer-notes-hint">Use this for handoff context or before resolving.</div>
              <textarea id="drawer-note" placeholder="What did you validate? Any business context?">${e.note||""}</textarea>
              <label>
                Owner
                <input id="drawer-owner" type="text" value="${e.owner||""}" placeholder="Assign an owner (for example: po-oncall)" />
              </label>
              <label>
                Resolution reason
                <input id="drawer-resolution-reason" type="text" value="${e.resolution_reason||""}" placeholder="Why are you changing or resolving this incident?" />
              </label>
              <label>
                Quick reason
                <select id="drawer-resolution-quick" onchange="if (this.value) applyResolutionPreset(this.value)">
                  <option value="">Choose common reason</option>
                  <option value="Expected business spike">Expected business spike</option>
                  <option value="Reference update required">Reference update required</option>
                  <option value="Known upstream outage">Known upstream outage</option>
                  <option value="Seasonal pattern confirmed">Seasonal pattern confirmed</option>
                  <option value="False positive after investigation">False positive after investigation</option>
                </select>
              </label>
              <div class="toolbar">
                <button class="action secondary" type="button" onclick="saveIncidentNotes(${e.id})">Save Notes</button>
              </div>
            </div>
          </div>
        </section>
        <div class="drawer-primary-actions">
          <button class="action secondary" type="button" onclick="confirmDrawerIncident(${e.id}, 'acknowledged', 0)">Mark In Review</button>
          <button class="action secondary" type="button" onclick="quickFixBaseline(${e.id})">Accept as Baseline</button>
          <button class="action warn" type="button" onclick="confirmDrawerIncident(${e.id}, 'resolved', 0)">Resolve</button>
        </div>
        <details class="simple-section nested">
          <summary>More actions</summary>
          <div class="simple-section-body">
            <div class="toolbar">
              <button class="action secondary" type="button" onclick="confirmDrawerIncident(${e.id}, 'snoozed', 60)">Snooze 60m</button>
              <button class="action secondary" type="button" onclick="confirmDrawerIncident(${e.id}, 'suppressed', 60)">Suppress 60m</button>
              <button class="action ghost" type="button" onclick="openApi('${x}')">Open API</button>
            </div>
          </div>
        </details>
      `,r.drawerBackdrop.classList.add("open"),r.drawer.classList.add("open"),r.drawerBody.scrollTop=0}function St(){s.selectedIncident=null,r.drawerBackdrop.classList.remove("open"),r.drawer.classList.remove("open")}function f(e,t="success"){let n=document.createElement("div");n.className=`toast ${t}`,n.textContent=e,r.toastStack.appendChild(n),setTimeout(()=>{n.remove()},2600)}function at(e,t,n){s.confirmAction=n,r.confirmTitle.textContent=e,r.confirmCopy.textContent=t,r.confirmBackdrop.classList.add("open"),r.confirmModal.classList.add("open")}function xt(){s.confirmAction=null,r.confirmBackdrop.classList.remove("open"),r.confirmModal.classList.remove("open")}function ht(e){return{critical:4,high:3,medium:2,low:1}[e?.severity]||0}function Vt(e){let t=Number(e?.confidence);if(!Number.isFinite(t))return 0;let n=t<=1?t*100:t;return Math.max(0,Math.min(100,n))}function Ut(e){let t=Number(e?.impact);return Number.isFinite(t)?Math.max(0,Math.abs(t)):0}function yt(e){let t=ht(e)*20,n=Math.min(100,Math.abs(Number(e?.pct_change)||0))*.35,i=Vt(e)*.15,a=Ut(e),o=a<=0?0:Math.min(40,Math.log10(a+1)*10),l=new Date(e?.detected_at||e?.resolved_at||"").getTime(),c=Date.now(),d=Number.isFinite(l)?Math.max(0,(c-l)/(1e3*60*60)):9999,p=d<=24?20:d<=72?12:d<=168?6:0,w=String(e?.status||e?.incident_status||"active").toLowerCase(),b=w==="resolved"?-100:w==="suppressed"?-14:w==="snoozed"?-10:w==="acknowledged"?-5:0;return t+n+i+o+p+b}function vn(e){let t=[],n=ht(e);n>0&&t.push(`severity ${n}/4`);let i=Math.abs(Number(e?.pct_change)||0);t.push(`drift ${Math.round(Math.min(100,i))}%`);let a=Math.round(Vt(e));a>0&&t.push(`confidence ${a}%`);let o=Ut(e);if(o>0)try{t.push(`impact ${Bt(o,e?.currency||"$")}`)}catch{t.push(`impact ${o.toFixed(2)}`)}let l=String(e?.status||e?.incident_status||"active").toLowerCase();return l!=="active"&&t.push(`state ${l}`),t}function bn(e){let t=Math.abs(Number(e?.pct_change)||0),n=Ut(e),i=Math.round(Vt(e)),a=[];if(n>0)try{a.push(`Estimated impact ${Bt(n,e?.currency||"$")}.`)}catch{a.push(`Estimated impact ${n.toFixed(2)}.`)}return t>=75?a.push("Change magnitude is critical."):t>=30?a.push("Change magnitude is high."):t>=15?a.push("Change magnitude is medium."):a.push("Change magnitude is currently low."),i>0&&a.push(`${i}% confidence this drift is real.`),e?.owner&&a.push(`Owner: ${e.owner}.`),a.join(" ")}function ot(e){let t=[...e];return s.incidentSort==="business"?(t.sort((n,i)=>yt(i)-yt(n)||String(i.detected_at||"").localeCompare(String(n.detected_at||""))),t):s.incidentSort==="severity"?(t.sort((n,i)=>ht(i)-ht(n)||String(i.detected_at||"").localeCompare(String(n.detected_at||""))),t):s.incidentSort==="status"?(t.sort((n,i)=>String(n.status||"").localeCompare(String(i.status||""))||String(i.detected_at||"").localeCompare(String(n.detected_at||""))),t):(t.sort((n,i)=>String(i.detected_at||i.resolved_at||"").localeCompare(String(n.detected_at||n.resolved_at||""))),t)}window.renderApiSections=rt;var Ie=class extends Error{constructor(t,n,i){super(t),this.name="DashboardApiError",this.status=n,this.url=i}};function Es(e){if(!(e instanceof Error))return!1;let t=e.message.toLowerCase();return t.includes("failed to fetch")||t.includes("networkerror")||t.includes("network request failed")||t.includes("connection reset")||t.includes("timeout")||t.includes("abort")}async function Is(e,t,n=8e3){let i=new AbortController,a=window.setTimeout(()=>i.abort(),n);try{let o=new Headers(t?.headers||{});o.has("x-jin-client")||o.set("x-jin-client","dashboard");let l=await fetch(e,{...t||{},headers:o,signal:i.signal}),d=(l.headers.get("content-type")||"").includes("application/json")?await l.json():await l.text();if(!l.ok){let p=typeof d=="object"&&d?d.detail||d.error:d;throw new Ie(`${l.status} ${l.statusText}${p?`: ${p}`:""}`,l.status,e)}return d}catch(o){throw o?.name==="AbortError"?new Ie(`Request timed out for ${e}`,void 0,e):o instanceof Ie?o:new Ie(o?.message||`Request failed for ${e}`,void 0,e)}finally{window.clearTimeout(a)}}async function ne(e,t,n=8e3){let a=0,o=null;for(;a<5;){a+=1;try{return await Is(e,t,n)}catch(l){if(o=l,!(Es(l)&&a<5))break;let d=Math.min(250*2**(a-1),2e3);await new Promise(p=>window.setTimeout(p,d))}}throw o}async function We(e){if(s.detailCache.has(e))return s.detailCache.get(e);let t=await ne(`/jin/api/v2/endpoint/${ue(e)}`);return t&&t.config&&(t.setup_config=JSON.parse(JSON.stringify(t.config))),s.detailCache.set(e,t),t}function Z(){return s.selectedApi&&s.detailCache.get(s.selectedApi)||null}async function jt(){s.status=await ne("/jin/api/v2/status")}async function wn(){s.anomalies=await ne("/jin/api/v2/anomalies")}async function Ke(){s.scheduler=await ne("/jin/api/v2/scheduler")}async function _n(e){return await ne("/jin/api/v2/projects/register",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e||{})},2e4)}async function $n(e=!0){return await ne(`/jin/api/v2/projects${e?"?include_archived=1":""}`,void 0,2e4)}async function kn(e){return await ne("/jin/api/v2/projects",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e||{})},2e4)}async function zt(e){return await ne("/jin/api/v2/projects/activate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({project_id:e})},2e4)}async function Sn(e){return await ne(`/jin/api/v2/projects/${encodeURIComponent(e)}/archive`,{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"},2e4)}async function xn(e){return await ne(`/jin/api/v2/projects/${encodeURIComponent(e)}/restore`,{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"},2e4)}async function jn(e){return await ne(`/jin/api/v2/projects/${encodeURIComponent(e)}`,{method:"DELETE"},2e4)}async function qt(e){return await ne(`/jin/api/v2/projects/${encodeURIComponent(e)}/check-plan`,void 0,2e4)}async function An(e,t){return await ne(`/jin/api/v2/projects/${encodeURIComponent(e)}/check-plan`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(t||{})},2e4)}async function At(e,t={}){return await ne(`/jin/api/v2/projects/${encodeURIComponent(e)}/check-plan/apply`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(t||{})},2e4)}async function Tn(e,t={}){return await ne(`/jin/api/v2/projects/${encodeURIComponent(e)}/checks/run`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(t||{})},3e4)}async function Pn(e,t=20){return await ne(`/jin/api/v2/projects/${encodeURIComponent(e)}/checks/history?limit=${encodeURIComponent(String(t))}`,void 0,2e4)}async function Mn(e,t={}){return await ne(`/jin/api/v2/projects/${encodeURIComponent(e)}/baseline/refresh`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(t||{})},3e4)}async function Gt(e){let t=e?`?project_id=${encodeURIComponent(e)}`:"";return await ne(`/jin/api/v2/health${t}`,void 0,2e4)}async function Jt(){return await ne("/jin/api/v2/portfolio/health",void 0,2e4)}async function Wt(e,t=7,n=200){let i=new URLSearchParams;return i.set("days",String(t)),i.set("limit",String(n)),e&&i.set("project_id",e),await ne(`/jin/api/v2/reports/leadership-digest?${i.toString()}`,void 0,3e4)}async function Cn(){return await ne("/jin/api/v2/po/playbook",void 0,2e4)}function Ln(){let e=it();return["# Jin Overview Brief","",`Generated: ${te(e.generated_at)}`,`Tracked APIs: ${e.endpoints_tracked}`,`Healthy APIs: ${e.healthy_endpoints}`,`Unconfirmed APIs: ${e.unconfirmed_endpoints}`,`Active incidents: ${e.active_incidents}`,"","## APIs Needing Attention",...(s.status?.endpoints||[]).filter(t=>(t.active_anomalies||0)>0||t.status==="unconfirmed").slice(0,10).map(t=>`- ${t.http_method} ${t.endpoint_path}: ${t.active_anomalies||0} incidents, status ${t.status||"healthy"}`)].join("\\n")}function Kt(e,t){let n=t.map(i=>`
    <section style="border:1px solid #d8c7ae;border-radius:16px;padding:18px;margin-bottom:14px;background:#fffdf9;">
      <h2 style="margin:0 0 8px;font-size:18px;">${i.title}</h2>
      <div style="color:#473726;font-size:14px;line-height:1.6;white-space:pre-wrap;">${i.body}</div>
    </section>
  `).join("");return`
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${e}</title>
</head>
<body style="margin:0;background:#f4efe7;color:#1f1912;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <main style="max-width:980px;margin:0 auto;padding:32px 20px 56px;">
    <header style="margin-bottom:24px;">
      <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.16em;color:#8a6a43;">Jin Report</div>
      <h1 style="margin:10px 0 6px;font-size:34px;line-height:1.05;">${e}</h1>
      <p style="margin:0;color:#5a4937;">Generated ${te(new Date().toISOString())}</p>
    </header>
    ${n}
  </main>
</body>
</html>
  `.trim()}function En(){let e=ze();return["# Jin Incident Brief","",`Generated: ${te(new Date().toISOString())}`,`Visible incidents: ${e.length}`,`Filters: status=${s.incidentStatusFilter||"all"}, severity=${s.incidentSeverityFilter||"all"}, sort=${s.incidentSort}`,"",...e.slice(0,20).map(t=>[`## ${t.endpoint_path} \u2022 ${t.kpi_field}`,`- Status: ${t.status||"active"}`,`- Severity: ${t.severity||"low"}`,`- Baseline: ${u(t.baseline_used)}`,`- Actual: ${u(t.actual_value)}`,`- Delta: ${u(t.pct_change)}%`,`- Why flagged: ${t.why_flagged||t.ai_explanation||"No explanation available."}`,`- Change since last healthy run: ${t.change_since_last_healthy_run||"No comparison available."}`,""].join("\\n"))].join("\\n")}function In(e){let t=e.trend_summary||[],n=e.upload_activity||[],i=e.anomaly_history||[];return[`# Jin API Brief: ${e.endpoint_path}`,"",`Generated: ${te(new Date().toISOString())}`,`Method: ${e.http_method||"GET"}`,`Recent runs: ${(e.recent_history||[]).length}`,`Open or historical incidents: ${i.length}`,`Reference uploads: ${n.length}`,"","## KPI Snapshot",...(e.current_kpis||[]).map(a=>`- ${a.kpi_field}: actual ${u(a.actual_value)}, baseline ${u(a.expected_value)}, delta ${u(a.pct_change)}%`),"","## Trends",...t.map(a=>`- ${a.kpi_field}: latest ${u(a.latest)}, min ${u(a.min)}, max ${u(a.max)}, delta ${u(a.delta_pct)}%`)].join("\\n")}function Rn(){let e=it();return Kt("Jin Overview Brief",[{title:"Summary",body:[`Tracked APIs: ${e.endpoints_tracked}`,`Healthy APIs: ${e.healthy_endpoints}`,`Unconfirmed APIs: ${e.unconfirmed_endpoints}`,`Active incidents: ${e.active_incidents}`].join("\\n")},{title:"APIs Needing Attention",body:(s.status?.endpoints||[]).filter(t=>(t.active_anomalies||0)>0||t.status==="unconfirmed").slice(0,12).map(t=>`${t.http_method} ${t.endpoint_path} \u2022 ${t.active_anomalies||0} incidents \u2022 ${t.status||"healthy"}`).join("\\n")||"No APIs currently require attention."}])}function Nn(){let e=ze();return Kt("Jin Incident Brief",e.slice(0,20).map(t=>({title:`${t.endpoint_path} \u2022 ${t.kpi_field}`,body:[`Status: ${t.status||"active"}`,`Severity: ${t.severity||"low"}`,`Baseline: ${u(t.baseline_used)}`,`Actual: ${u(t.actual_value)}`,`Delta: ${u(t.pct_change)}%`,`Why flagged: ${t.why_flagged||t.ai_explanation||"No explanation available."}`,`Last healthy comparison: ${t.change_since_last_healthy_run||"No comparison available."}`].join("\\n")})))}function Fn(e){return Kt(`Jin API Brief: ${e.endpoint_path}`,[{title:"API Snapshot",body:[`Method: ${e.http_method||"GET"}`,`Recent runs: ${(e.recent_history||[]).length}`,`Historical incidents: ${(e.anomaly_history||[]).length}`,`Reference uploads: ${(e.upload_activity||[]).length}`].join("\\n")},{title:"KPI Snapshot",body:(e.current_kpis||[]).map(t=>`${t.kpi_field}: actual ${u(t.actual_value)}, baseline ${u(t.expected_value)}, delta ${u(t.pct_change)}%`).join("\\n")||"No KPI snapshot available."},{title:"Trend Summary",body:(e.trend_summary||[]).map(t=>`${t.kpi_field}: latest ${u(t.latest)}, min ${u(t.min)}, max ${u(t.max)}, delta ${u(t.delta_pct)}%`).join("\\n")||"No trend summary available."}])}function Bn(e){if(!e.length)return"";let t=e.map(l=>Number(l)).filter(l=>Number.isFinite(l));if(!t.length)return"";let n=Math.min(...t),a=Math.max(...t)-n||1;return`
    <svg class="sparkline" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <polyline fill="none" stroke="var(--accent)" stroke-width="3" points="${t.map((l,c)=>{let d=t.length===1?0:c/(t.length-1)*100,p=100-(l-n)/a*100;return`${d},${p}`}).join(" ")}" />
    </svg>
  `}function Hn(e){let t={healthy:0,warning:0,anomaly:0,unconfirmed:0};e.forEach(o=>{let l=t[o.status]!==void 0?o.status:"warning";t[l]+=1});let n=Math.max(1,e.length),i=0;return`<svg class="chart-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${[["healthy","var(--healthy)"],["warning","var(--warning)"],["anomaly","var(--anomaly)"],["unconfirmed","var(--ink-muted)"]].map(([o,l])=>{let c=t[o]/n*100,d=`<rect x="${i}" y="32" width="${c}" height="26" fill="${l}"></rect>`;return i+=c,d}).join("")}</svg>`}function Dn(e){let t={};(e.recent_history||[]).forEach(p=>{Object.entries(p.kpi_json||{}).forEach(([w,b])=>{Number.isFinite(b)&&(t[w]=t[w]||[],t[w].push(Number(b)))})});let n=["var(--accent)","var(--healthy)","var(--warning)","var(--anomaly)"],i=Object.entries(t).slice(0,4);if(!i.length)return"";let a=i.flatMap(([,p])=>p),o=Math.min(...a),c=Math.max(...a)-o||1;return`<svg class="chart-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${i.map(([,p],w)=>{let b=p.map((x,C)=>{let E=p.length===1?0:C/(p.length-1)*100,O=100-((x-o)/c*78+10);return`${E},${O}`}).join(" ");return`<polyline fill="none" stroke="${n[w%n.length]}" stroke-width="2.5" points="${b}" />`}).join("")}</svg>`}function zn(e){return e.startsWith("scheduler")?"Scheduler":e.startsWith("router.upload")||e.startsWith("router.save_references")?"Upload":e.startsWith("router.save_config")||e.startsWith("config.")?"Configuration":e.startsWith("router.")||e.startsWith("middleware.")?"Runtime":"General"}function Xt(e){return e.startsWith("scheduler")||e.startsWith("middleware.process_response")?"high":e.startsWith("router.status")||e.startsWith("router.endpoint_detail")?"medium":"low"}function Tt(e){return e.status||"open"}function T(e){return String(e??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function qn(e){if(!e)return!1;if(!!((e.recent_history||[]).length||(e.history||[]).length))return!0;let n=e.schema_contract;if(Array.isArray(n?.example_rows)&&n.example_rows.length>0)return!0;let i=Array.isArray(n?.fields)?n.fields:[];return(i.length?i:e.fields||[]).some(o=>o&&o.example!==void 0&&o.example!==null)}function Gn(e){let t=Array.isArray(e.dimension_fields)?e.dimension_fields.length:0,n=Array.isArray(e.kpi_fields)?e.kpi_fields.length:0,i=!!String(e.time_field||"").trim(),a=e.time_required!==!1,o=!!e.confirmed,l=!!e.last_upload_at;return!t||!n||a&&!i?{label:"Needs setup",tone:"warning",hint:a?"Choose Segment + Metric + Time in Configuration.":"Choose Segment + Metric in Configuration."}:o?l?{label:"Ready",tone:"success",hint:"Setup and baseline are in place."}:{label:"Needs baseline",tone:"info",hint:"Upload a baseline file to start pass/fail checks."}:{label:"Save setup",tone:"warning",hint:"Save configuration before checks/uploads."}}function Rs(e,t){let n=Object.entries(e||{}).filter(([,i])=>i!==null&&i!=="");return n.length?n.map(([i,a])=>`${i}=${a}`).join(" \u2022 "):t||"Global grain"}function Ns(e){let t=e.request||{},n=[],i=Object.entries(t.path||{}),a=Object.entries(t.query||{}),o=t.body;return i.length&&n.push(`Path ${i.map(([l,c])=>`${l}=${c}`).join(", ")}`),a.length&&n.push(`Query ${a.map(([l,c])=>`${l}=${c}`).join(", ")}`),o&&(Array.isArray(o)&&o.length||!Array.isArray(o)&&Object.keys(o).length)&&n.push(`Body ${JSON.stringify(o)}`),n.join(" \u2022 ")}function lt(e){return e==="match"?"healthy":e==="missing_reference"?"acknowledged":e==="missing_kpi"?"warning":e==="mismatch"?"danger":"critical"}function Ye(e){return e==="match"?"Matched":e==="mismatch"?"Mismatch":e==="missing_reference"?"No Baseline":e==="missing_kpi"?"Missing KPI":e==="error"?"Error":e}function Fs(e){return e==="matched"?"Matched":e==="mismatch"?"Mismatch":e==="error"?"Error":e==="skipped"?"Skipped":e||"Unknown"}function Bs(e){return e==="matched"?"healthy":e==="mismatch"?"danger":e==="error"?"critical":"acknowledged"}function De(e){return String(e||"").replace(/^data\[\]\./,"")}function He(e){let t=String(e||"");if(!t)return"";if(!t.includes("|"))return t;let[n,...i]=t.split("|"),a=i.map(o=>o.trim()).filter(Boolean).filter(o=>{let l=o.split("=")[0];return l!=="api_version"&&l!=="label"&&l!=="timestamp"&&l!=="_jin_id"}).sort();return a.length?`${n}|${a.join("|")}`:n}function ct(e){let t=String(e||"").trim().toLowerCase();return t?t.replace(/\[\]/g,"").replace(/^data\./,"").replace(/^payload\./,""):""}function Xe(e){let t=De(e).replace(/\[\]/g," ").replace(/[._]/g," ").trim();return t?t.split(/\s+/).map(n=>n.charAt(0).toUpperCase()+n.slice(1)).join(" "):"Metric"}function Jn(e){let t=String(e||"");if(!t.includes("|"))return t||"Global";let[,...n]=t.split("|"),i={};n.forEach(l=>{let c=l.indexOf("=");if(c<=0)return;let d=l.slice(0,c),p=l.slice(c+1);i[d]=p});let a=[i.retailer?`Retailer: ${i.retailer}`:null,i["data[].date"]||i.date?`Date: ${i["data[].date"]||i.date}`:null,i["data[].label"]||i.label?`Label: ${i["data[].label"]||i.label}`:null].filter(Boolean);if(a.length)return a.join(" \u2022 ");let o=Object.entries(i).filter(([l])=>!["api_version","timestamp","_jin_id"].includes(l)).slice(0,3).map(([l,c])=>`${l}=${c}`);return o.length?o.join(" \u2022 "):t}function Hs(e){let t=Number(e);return!Number.isFinite(t)||t<0?"\u2014":t<1e3?`${Math.round(t)} ms`:`${(t/1e3).toFixed(1)} s`}function Ds(e,t){let n=String(e||"").toLowerCase();if(n==="manual")return"Manual check";if(n==="scheduler")return"Scheduled check";let i=String(t||"").toLowerCase();return i==="manual"?"Manual check":i==="watch"?"Scheduled check":n||i||"Unknown"}function Os(e,t=0){let n=String(e||"").toLowerCase(),i=Number(t||0);return(n==="success"||n==="degraded")&&i>0?{pillClass:"danger",label:"Needs review",tooltip:"Run completed but active mismatches are still open."}:n==="success"?{pillClass:"healthy",label:"Passed",tooltip:"Check finished successfully."}:n==="running"?{pillClass:"acknowledged",label:"Running",tooltip:"Check is currently running."}:n==="error"||n==="failed"?{pillClass:"danger",label:"Failed",tooltip:"Check failed. Open Errors for details."}:n==="skipped"?{pillClass:"warning",label:"Skipped",tooltip:"Check was skipped and did not run."}:{pillClass:"acknowledged",label:n||"Unknown",tooltip:"Run completed with a non-standard status."}}function Vs(e){let t=e.dimensions||{},n=t.retailer||t.grain_retailer,i=t["data[].date"]||t.date||t.period,a=t["data[].label"]||t.label,o=[n?`Retailer: ${n}`:null,i?`Date: ${i}`:null,a?`Label: ${a}`:null].filter(Boolean);return o.length?o.join(" | "):Rs(e.dimensions,e.grain_key)}function Us(e){return e.status==="match"?"Everything in this uploaded row is within the allowed tolerance.":e.status==="error"?"Jin could not run this row because the API call failed.":`Some values are outside the allowed range${e.tolerance_pct==null?"":` (allowed +/-${Number(e.tolerance_pct).toFixed(1)}%)`}.`}function On(e){let t=De(e.kpi_field),n=e.pct_change,i=n==null?null:Number(n);if(e.status==="match")return i==null?`${t} is within the allowed range.`:`${t} is within the allowed range (${Math.abs(i).toFixed(1)}% change).`;if(e.status==="missing_reference")return`No baseline is uploaded for ${t}.`;if(e.status==="missing_kpi")return`${t} was not returned by the API for this grain.`;if(e.status==="error")return e.message||`Could not evaluate ${t}.`;if(i==null)return`${t} is outside the allowed range.`;let a=i>0?"higher":"lower";return`${t} is ${Math.abs(i).toFixed(1)}% ${a} than baseline (outside tolerance).`}function Wn(e){let t=Number(e);if(!Number.isFinite(t))return"\u2014";let n=t>0?"+":"",i=Math.abs(t);return i<1e3?`${n}${i.toFixed(1)}%`:i<1e6?`${n}${Math.round(i).toLocaleString()}%`:`${n}${i.toExponential(2)}%`}function zs(e,t){let n=e.verdict==="matched"?{title:"Upload Analysis Passed",subtitle:e.summary_message,className:"success",icon:"\u2705"}:e.verdict==="mismatch"?{title:"Upload Analysis Found Mismatches",subtitle:e.summary_message,className:"danger",icon:"\u26A0\uFE0F"}:{title:"Upload Analysis Hit Errors",subtitle:e.summary_message,className:"danger",icon:"\u{1F6D1}"},i=m=>{let A=q=>q==="mismatch"?0:q==="error"?1:q==="missing_kpi"?2:q==="missing_reference"?3:4,P=[...m.comparisons||[]].sort((q,v)=>{let N=A(String(q.status||""))-A(String(v.status||""));return N!==0?N:String(q.kpi_field||"").localeCompare(String(v.kpi_field||""))}),j=P.filter(q=>q.status!=="match"),M=P.filter(q=>q.status==="match"),H=Ns(m),R=j.slice(0,2).map(q=>{let v=q.pct_change==null?"":` (${Math.abs(Number(q.pct_change)).toFixed(1)}%)`;return`${De(q.kpi_field)}: ${Ye(q.status)}${v}`}).join(" \u2022 "),ee=Math.max(0,j.length-2),Y=j.length?j:M.slice(0,3),Q=j.length?M:M.slice(3),ce=q=>q.map(v=>`
        <tr>
          <td><strong>${T(De(v.kpi_field))}</strong></td>
          <td>${u(v.expected_value)}</td>
          <td>${u(v.actual_value)}</td>
          <td>${v.pct_change==null?"\u2014":`${Number(v.pct_change)>0?"+":""}${Number(v.pct_change).toFixed(1)}%`}</td>
          <td>
            <span class="status-pill ${lt(v.status)}">${T(Ye(v.status))}</span>
            <div class="tiny muted" style="margin-top:6px;">${T(On(v))}</div>
          </td>
        </tr>
      `).join("");return`
      <div class="upload-analysis-card upload-analysis-card-${T(m.status)}">
        <div class="upload-analysis-header">
          <div>
            <strong>${T(Vs(m))}</strong>
          </div>
          <span class="status-pill ${lt(m.status)}">${T(Ye(m.status))}</span>
        </div>
        <div class="upload-analysis-message">${T(Us(m))}</div>
        <div class="upload-analysis-kpi-stats tiny">
          ${u(P.length)} KPI(s) \u2022 ${u(j.length)} need review \u2022 ${u(M.length)} within range
        </div>
        ${R?`<div class="upload-analysis-highlights"><strong>Top findings:</strong> ${T(R)}${ee?` +${ee} more`:""}</div>`:""}
        <details class="upload-analysis-detail">
          <summary>${P.length?j.length?`KPI details (${j.length} need review)`:`KPI details (${P.length} matched)`:"KPI details"}</summary>
          ${P.length?`
                <div class="table-wrap upload-analysis-table">
                  <table class="row-table">
                    <thead>
                      <tr>
                        <th>KPI</th>
                        <th>Baseline</th>
                        <th>API value</th>
                        <th>Delta</th>
                        <th>Outcome</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${ce(Y)}
                    </tbody>
                  </table>
                </div>
                ${Q.length?`
                  <details class="upload-analysis-inline-more">
                    <summary>Show ${u(Q.length)} additional matched KPI(s)</summary>
                    <div class="table-wrap upload-analysis-table" style="margin-top:10px;">
                      <table class="row-table">
                        <thead>
                          <tr>
                            <th>KPI</th>
                            <th>Baseline</th>
                            <th>API value</th>
                            <th>Delta</th>
                            <th>Outcome</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${ce(Q)}
                        </tbody>
                      </table>
                    </div>
                  </details>
                `:""}
              `:'<div class="tiny muted" style="margin-top:10px;">No KPI comparisons were returned for this row.</div>'}
          ${j.length?`
                <div class="upload-analysis-reasons">
                  <strong>Why this row needs review</strong>
                  <ul>
                    ${j.map(q=>`<li>${T(On(q))}</li>`).join("")}
                  </ul>
                </div>
              `:""}
        </details>
        <details class="upload-analysis-tech">
          <summary>Technical details</summary>
          <div class="tiny muted upload-analysis-request">Grain key: ${T(m.grain_key)}</div>
          ${H?`<div class="tiny muted upload-analysis-request">Called with ${T(H)}</div>`:""}
        </details>
        ${m.error?`<div class="upload-analysis-error">${T(m.error)}</div>`:""}
      </div>
    `},a=e.runs.filter(m=>m.status!=="match"),o=e.runs.filter(m=>m.status==="match"),l=a.slice(0,8),c=a.slice(8),d=a.flatMap(m=>(m.comparisons||[]).filter(A=>A.status!=="match")),p=d.filter(m=>{if(m.status==="error"||m.status==="missing_kpi")return!0;let A=Number(m.pct_change);return Number.isFinite(A)&&Math.abs(A)>=30}),w=d.reduce((m,A)=>{let P=Number(A.pct_change);return Number.isFinite(P)?Math.max(m,Math.abs(P)):m},0),b=new Map;d.forEach(m=>{let A=De(m.kpi_field);if(!A)return;let P=Number(m.pct_change),j=Number.isFinite(P)?Math.abs(P):0,M=b.get(A)??0;j>M&&b.set(A,j)});let x=[...b.entries()].sort((m,A)=>A[1]-m[1]).slice(0,3).map(([m,A])=>`${m}${A>0?` (${A.toFixed(1)}%)`:""}`),C=(()=>{let m=Math.max(1,Number(e.requested_grains||0)),A=Number(e.mismatch_runs||0)/m;return Number(e.failed_runs||0)>0||w>=50||A>=.4?"High":Number(e.mismatch_runs||0)>0?"Medium":"Low"})(),E=(()=>{let m=Math.max(1,Number(e.attempted_runs||e.requested_grains||1)),A=Number(e.successful_runs||0),P=Number(e.failed_runs||0),j=d.length,M=55;return A>0&&(M+=18),P===0&&(M+=12),M+=Math.min(10,Math.round(j/m*10)),Math.max(35,Math.min(95,M))})(),O=e.verdict==="mismatch"?C==="High"?"Open Issues now and triage high-priority mismatches before accepting this baseline.":"Review mismatch rows and mark expected changes in review, then resolve the rest.":e.verdict==="error"?"Fix run errors first, then re-run upload analysis.":"Baseline looks healthy. Continue with scheduled monitoring checks.",D=x.length?x.join(" \u2022 "):p.length>0?`${p.length} KPI check(s) need deeper review.`:"No major KPI shifts detected.",h=`
      ${a.length?`<div class="upload-analysis-section-title">Upload mismatches (${a.length})</div>`:'<div class="upload-analysis-section-title">All uploaded rows matched</div>'}
      ${l.map(m=>i(m)).join("")}
    ${c.length?`
          <details class="upload-analysis-more-runs">
            <summary>Show ${c.length} more flagged row(s)</summary>
            <div class="history-list" style="margin-top:12px;">
              ${c.map(m=>i(m)).join("")}
            </div>
          </details>
        `:""}
    ${o.length?`
          <details class="upload-analysis-more-runs upload-analysis-matched-group">
            <summary>Matched rows (${o.length})</summary>
            <div class="history-list" style="margin-top:12px;">
              ${o.map(m=>i(m)).join("")}
            </div>
          </details>
        `:""}
  `,k=(e.errors||[]).map(m=>m?.error).filter(m=>!!m).slice(0,3),L=e?.issues_sync&&typeof e.issues_sync=="object"?e.issues_sync:null,I=L?.auto_enabled!==!1,F=Number(L?.created||0),_=Number(L?.updated||0),B=Number(L?.candidates||0),$=L?F>0?`<div class="tiny" style="margin-top:10px; color:var(--ok);">Added ${u(F)} mismatch issue${F===1?"":"s"} to <strong>Issues</strong> automatically.</div>`:_>0?`<div class="tiny muted" style="margin-top:10px;">Refreshed ${u(_)} existing mismatch issue${_===1?"":"s"} in <strong>Issues</strong>.</div>`:B>0?'<div class="tiny muted" style="margin-top:10px;">Upload mismatches are already present in <strong>Issues</strong>.</div>':'<div class="tiny muted" style="margin-top:10px;">No mismatch rows to add to <strong>Issues</strong> from this run.</div>':"",V=a.length&&(!L||!I)?`
      <div class="toolbar" style="margin-top:12px; justify-content:flex-start;">
        <button class="action secondary" type="button" onclick="materializeUploadAnalysisIssues()">
          Add ${u(a.length)} mismatch${a.length===1?"":"es"} to Issues
        </button>
      </div>
    `:"",S=a.length?`
      <div class="toolbar" style="margin-top:12px; justify-content:flex-start;">
        <button class="action" type="button" onclick="openUploadIssues()">Open Issues</button>
      </div>
    `:"",U=a.length?'<div class="tiny muted" style="margin-top:8px;">If the Issues list looks empty, clear Status/Severity filters. The button above opens Issues with filters reset.</div>':"",y=k.length?`
      <div class="upload-analysis-errors">
        <strong>Upload analysis errors</strong>
        <div class="history-list" style="margin-top:8px;">
          ${k.map(m=>`<div class="history-item upload-analysis-error-item">${T(m)}</div>`).join("")}
        </div>
      </div>
    `:"";return`
    <div class="results-auto-show">
      <div class="verdict-banner ${n.className}">
        <div class="verdict-icon">${n.icon}</div>
        <div class="verdict-body">
          <h4>${T(n.title)}</h4>
          <p>${T(n.subtitle)}</p>
        </div>
      </div>
      <div class="upload-analysis-explainer">
        <strong>What this means</strong>
        <p>
          A mismatch means the API returned a value outside the allowed tolerance from your uploaded CSV baseline.
          A match means the value stayed within that allowed range.
        </p>
        <p>
          These results are from this upload run. If mismatches exist, they are synced into <strong>Issues</strong> so you can
          triage and resolve them in one place.
        </p>
      </div>
      <div class="upload-analysis-summary-grid">
        <div class="meta-card meta-card-compact">
          <strong>Uploaded grains</strong>
          <span>${u(e.requested_grains)}</span>
        </div>
        <div class="meta-card meta-card-compact">
          <strong>Matched</strong>
          <span>${u(e.matched_runs)}</span>
        </div>
        <div class="meta-card meta-card-compact">
          <strong>Mismatched</strong>
          <span>${u(e.mismatch_runs)}</span>
        </div>
        <div class="meta-card meta-card-compact">
          <strong>Run errors</strong>
          <span>${u(e.failed_runs)}</span>
        </div>
        <div class="meta-card meta-card-compact">
          <strong>Priority</strong>
          <span>${C}</span>
          <div class="tiny muted" style="margin-top:4px;">Confidence ${u(E)}%</div>
        </div>
      </div>
      <div class="row-card" style="margin-top:12px;">
        <strong>Recommended next step</strong>
        <div class="tiny" style="margin-top:6px;">${T(O)}</div>
        <div class="tiny muted" style="margin-top:8px;">Impact focus: ${T(D)}</div>
      </div>
      ${V}
      ${S}
      ${U}
      ${$}
      ${y}
      <div class="history-list" style="margin-top:16px;">
        ${h||be(`No upload analysis results for ${t.endpoint_path} yet.`)}
      </div>
    </div>
  `}function qs(){return(s.status?.recent_errors||[]).filter(t=>{let n=t.category?t.category[0].toUpperCase()+t.category.slice(1):zn(t.source),i=t.severity||Xt(t.source),a=Tt(t),o=`${t.source} ${t.message} ${t.hint||""} ${t.endpoint_path||""}`.toLowerCase(),l=!s.errorSearch||o.includes(s.errorSearch.toLowerCase()),c=!s.errorStatusFilter||a===s.errorStatusFilter,d=!s.errorCategoryFilter||n===s.errorCategoryFilter,p=!s.errorSeverityFilter||i===s.errorSeverityFilter;return l&&c&&d&&p})}function Qe(){let e=s.status?.project,t=e?.trust_score??100,n=String(e?.tier||"free").toLowerCase(),i=e?.license_enforced!==!1,a=i?e?.project_limit==null?n==="free"?"1":"unlimited":String(e.project_limit):"unlimited",o=`
    <div class="sidebar-trust-header">
      <div class="trust-meter">
        <div class="trust-score-ring" style="--score: ${t}%">
          <span class="trust-value">${t}%</span>
        </div>
        <div class="trust-label">Data Trust</div>
      </div>
      <div class="tier-pill tier-${n}">
        <span class="tier-label">${n}</span>
        ${n==="free"&&i?`<span class="tier-limit">${e?.projects_active||1}/${a}</span>`:""}
      </div>
    </div>
    ${e?.policy?.force_upgrade?`
      <div class="sidebar-lock-banner danger">
        <div class="lock-icon">\u{1F6D1}</div>
        <div class="lock-body">
          <strong>Update Required</strong>
          <span class="tiny">Your version of Jin is no longer supported by the current pricing model.</span>
          <br/>
          <button class="upgrade-btn-mini" style="margin-top:8px" onclick="window.location.href='https://jin.dev/download'">Get Latest Version</button>
        </div>
      </div>
    `:e?.is_unlicensed?`
      <div class="sidebar-lock-banner">
        <div class="lock-icon">\u{1F48E}</div>
        <div class="lock-body">
          <strong>Local Project Limit</strong>
          <span class="tiny">Free tier allows one project per account. Activate Business for unlimited projects.</span>
          <br/>
          <button class="upgrade-btn-mini" style="margin-top:8px" onclick="window.location.href='https://jin.dev/upgrade?site=${e.site_id}'">Unlock Unlimited</button>
        </div>
      </div>
    `:""}
  `;document.querySelectorAll("#nav button[data-feature]").forEach(d=>{let p=d.dataset.feature;if(p&&!et(p)){d.classList.add("feature-locked");let w=d.querySelector(".nav-label");w&&!w.querySelector(".feature-lock-badge")&&(w.innerHTML+=' <span class="feature-lock-badge" style="font-size:7px; vertical-align:middle; margin-left:4px;">BUSINESS</span>')}else d.classList.remove("feature-locked")});let l=s.status?.endpoints||[],c=fn();if(c.length){let d=c.reduce((p,w)=>{let b=hn(w.endpoint_path);return p[b]=p[b]||[],p[b].push(w),p},{});r.apiList.innerHTML=o+Object.entries(d).sort((p,w)=>p[0].localeCompare(w[0])).map(([p,w])=>`
            <div class="api-group">
              <div class="api-group-title">
                <span>${p}</span>
                <button class="group-toggle" type="button" data-group-toggle="${p}">
                  ${s.collapsedGroups[p]?"Expand":"Collapse"}
                </button>
              </div>
              ${s.collapsedGroups[p]?"":w.map(b=>`
                <button class="api-item ${s.selectedApi===b.endpoint_path?"active":""}" type="button" data-api="${b.endpoint_path}">
                  <div class="api-row">
                    <span class="status-dot ${b.status||"warning"}"></span>
                    <div class="api-row-main">
                      <div class="api-row-top">
                        <div class="api-method-status">
                          <strong>${b.http_method}</strong>
                          <span class="tiny api-status-label">${b.status||"warning"}</span>
                        </div>
                        ${(b.active_anomalies||0)>0?`<span class="tiny api-row-issues">${b.active_anomalies||0} issues</span>`:""}
                      </div>
                      <div class="api-path">${b.endpoint_path}</div>
                      ${(()=>{let x=Gn(b);return`<div class="api-subline"><span class="api-setup-chip ${x.tone}" title="${T(x.hint)}">${T(x.label)}</span></div>`})()}
                    </div>
                  </div>
                </button>
              `).join("")}
            </div>
          `).join("")+`
            <div class="sidebar-footer">
              <button class="api-item ${s.currentView==="settings"?"active":""}" type="button" onclick="setView('settings')">
                <div class="api-row">
                  <span class="status-dot healthy"></span>
                  <div class="api-row-main">
                    <div class="api-row-top"><strong>Settings</strong></div>
                    <div class="api-path">License & Preferences</div>
                  </div>
                </div>
              </button>
            </div>
          `}else{let p=!!((s.apiFilter||"").trim()||(s.apiStatusFilter||"").trim())?"No APIs match this search.":l.length===0?s.apiDataState==="auth_required"?"Your Jin session expired. Sign in again to load APIs.":s.apiDataState==="error"?"Jin returned an error while loading APIs. Check server logs and retry.":s.apiDataState==="unavailable"?"Cannot load APIs right now. Check backend connection and retry.":"No APIs discovered yet. Call one API endpoint to start monitoring.":"No APIs match this search.";r.apiList.innerHTML=o+be(p)}}window.showRunDetail=e=>{let t=s.activeApiDetail;if(!t)return;let i=((t.history&&t.history.length?t.history:t.recent_history)||[]).filter(y=>y.observed_at===e);if(r.runDetailTitle.innerText=`Run Detail: ${te(e)}`,r.runDetailDrawer.style.display="block",!i.length){r.runDetailContent.innerHTML=be("No observations for this timestamp.");return}let a=y=>{if(!y)return{};if(typeof y=="string")try{let m=JSON.parse(y);return m&&typeof m=="object"?m:{}}catch{return{}}return typeof y=="object"?y:{}},o=y=>{let m=new Map,A=(P,j="")=>{if(P!=null){if(typeof P=="number"){j&&Number.isFinite(P)&&!m.has(j)&&m.set(j,P);return}if(typeof P=="string"){let M=P.trim(),H=Number(M);j&&M&&Number.isFinite(H)&&!m.has(j)&&m.set(j,H);return}if(Array.isArray(P)){P.forEach(M=>A(M,j?`${j}[]`:"data[]"));return}typeof P=="object"&&Object.entries(P).forEach(([M,H])=>{let R=j?`${j}.${M}`:M;A(H,R)})}};return A(y),Array.from(m.entries()).map(([P,j])=>({kpiField:P,value:j}))},l=new Map;(t.references||[]).forEach(y=>{let m=String(y?.grain_key||""),A=String(y?.kpi_field||"");if(!m||!A)return;let P=y?.expected_value,j=y?.tolerance_pct,M=P==null?null:Number(P),H=j==null?null:Number(j),R={expected:Number.isFinite(M)?M:null,tolerance:Number.isFinite(H)?H:null},ee=ct(A);l.set(`${m}__${A}`,R),ee&&ee!==A&&l.set(`${m}__${ee}`,R);let Y=He(m);Y&&(l.has(`${Y}__${A}`)||l.set(`${Y}__${A}`,R),ee&&!l.has(`${Y}__${ee}`)&&l.set(`${Y}__${ee}`,R))});let c=Number(t?.config?.tolerance_normal??t?.config?.tolerance_pct??10),p=i.flatMap(y=>{let m=String(y?.grain_key||"Global"),A=Array.isArray(y?.comparisons)?y.comparisons.filter(j=>j?.kpi_field):[];if(A.length)return A.map(j=>{let M=j.actual_value??j.actual,H=String(j.kpi_field||""),R=ct(H),ee=He(m),Y=l.get(`${m}__${H}`)||(R?l.get(`${m}__${R}`):void 0)||l.get(`${ee}__${H}`)||(R?l.get(`${ee}__${R}`):void 0),Q=j.expected_value??j.expected??Y?.expected??null,ce=j.allowed_tolerance_pct??Y?.tolerance??c,q=Q==null?null:Number(Q),v=M==null?null:Number(M),N=j.pct_change!=null?Number(j.pct_change):q==null||v==null||q===0?null:(v-q)/Math.abs(q)*100,X=String(j.status||""),J=X&&!(X==="missing_reference"&&q!=null)?X:q==null?"missing_reference":N!=null&&Math.abs(N)>ce?"mismatch":"match";return{grainKey:m,kpiField:String(j.kpi_field),actual:v,expected:q,pctChange:N,status:J,message:j.message||"Historical comparison for this metric."}});let P=a(y?.kpi_json);return o(P).map(({kpiField:j,value:M})=>{let H=Number(M),R=ct(j),ee=He(m),Y=l.get(`${m}__${j}`)||(R?l.get(`${m}__${R}`):void 0)||l.get(`${ee}__${j}`)||(R?l.get(`${ee}__${R}`):void 0),Q=Y?.expected??null,ce=Y?.tolerance??c,q=Q==null||Q===0?null:(H-Q)/Math.abs(Q)*100,v=Q==null?"missing_reference":q!=null&&Math.abs(q)>ce?"mismatch":"match",N=Q==null?"No uploaded baseline was found for this metric on this grain.":`Derived from run observation and uploaded baseline (tolerance +/-${ce.toFixed(1)}%).`;return{grainKey:m,kpiField:j,actual:H,expected:Q,pctChange:q,status:v,message:N}})}).filter(y=>y&&String(y.kpiField||"").trim().length>0);if(!p.length){let y=i.flatMap(A=>Object.keys(a(A?.kpi_json)||{})).filter((A,P,j)=>j.indexOf(A)===P),m=y.length?`Captured keys: ${y.slice(0,6).join(", ")}${y.length>6?", ...":""}.`:"No KPI values were returned for this run.";r.runDetailContent.innerHTML=be(`No comparable KPI values were captured for this run. ${m}`);return}let w=new Set(["api_version","timestamp","_jin_id"]),b=y=>{if(!y||y.indexOf("|")===-1)return{};let[,...m]=y.split("|"),A={};return m.forEach(P=>{let j=P.indexOf("=");if(j<=0)return;let M=P.slice(0,j),H=P.slice(j+1);A[M]=H}),A},x=y=>{let m=b(y),A=m.retailer||m.grain_retailer,P=m["data[].date"]||m.date||m.period,j=m["data[].label"]||m.label,M=[A?`Retailer: ${A}`:null,P?`Date: ${P}`:null,j?`Label: ${j}`:null].filter(Boolean);if(M.length)return M.join(" \u2022 ");let H=Object.entries(m).filter(([R])=>!w.has(R)).slice(0,3).map(([R,ee])=>`${R}=${ee}`);return H.length?H.join(" \u2022 "):"Global grain"},C=new Map;p.forEach(y=>{let m=String(y.grainKey||"Global");C.has(m)||C.set(m,[]),C.get(m).push(y)});let E=Array.from(C.entries()).map(([y,m])=>{let A=m.filter(j=>j.status!=="match"&&j.status!=="missing_reference").length,P=m.every(j=>j.status==="missing_reference"||j.expected==null);return{grainKey:y,title:x(y),rows:m,needsReviewCount:A,missingBaseline:P,status:A>0?"mismatch":P?"missing_reference":"match"}}).sort((y,m)=>(y.status==="match"?1:0)-(m.status==="match"?1:0)),O=E.length,D=E.filter(y=>y.status==="mismatch"),h=E.filter(y=>y.status==="missing_reference"),k=h.length,L=D.length,I=E.filter(y=>y.status==="match"),F=y=>{let m=y.rows.filter(M=>M.status==="mismatch"||M.status==="missing_kpi"||M.status==="error").length,A=y.rows.filter(M=>M.status==="missing_reference").length,P=y.rows.filter(M=>M.status==="match").length,j=[`${u(y.rows.length)} metric(s)`];return m&&j.push(`${u(m)} need review`),A&&j.push(`${u(A)} without baseline`),P&&j.push(`${u(P)} matched`),j.join(" \u2022 ")},_=y=>{let m=De(String(y.kpiField||"metric")),A=y.pctChange==null?null:Number(y.pctChange);if(y.status==="match")return A==null?`${m} is within the allowed range.`:`${m} is within the allowed range (${Math.abs(A).toFixed(1)}% change).`;if(y.status==="missing_reference")return`No baseline is uploaded for ${m}.`;if(y.status==="missing_kpi")return`${m} was not returned by the API for this grain.`;if(y.status==="error")return y.message||`Could not evaluate ${m}.`;if(A==null)return`${m} is outside the allowed range.`;let P=A>0?"higher":"lower";return`${m} is ${Math.abs(A).toFixed(1)}% ${P} than baseline (outside tolerance).`},B=y=>{let m=y.rows.filter(R=>R.status!=="match"),A=y.rows.filter(R=>R.status==="match"),P=m.length?m:A.slice(0,3),j=m.length?A:A.slice(3),M=m.slice(0,2).map(R=>_(R)).join(" \u2022 "),H=Math.max(0,m.length-2);return`
    <div class="upload-analysis-card upload-analysis-card-${y.status==="match"?"match":y.status==="missing_reference"?"setup":"mismatch"} run-detail-grain-card">
      <div class="upload-analysis-header">
        <div>
          <strong>${T(y.title)}</strong>
          <div class="tiny muted">${T(F(y))}</div>
        </div>
        <span class="status-pill ${lt(y.status)}">${T(Ye(y.status))}</span>
      </div>

      <div class="run-detail-card-stats tiny">
        ${u(y.rows.length)} metric(s) \u2022 ${u(m.length)} need review \u2022 ${u(A.length)} within range
      </div>

      ${M?`<div class="upload-analysis-highlights"><strong>Top findings:</strong> ${T(M)}${H?` +${H} more`:""}</div>`:""}

      ${y.missingBaseline?`
        <div class="run-detail-inline-help">
          No baseline is linked to this grain yet.
          <button class="action secondary tiny" type="button" onclick="openUploadsTab()">Set baseline</button>
        </div>
      `:""}

      <details class="run-detail-kpi-breakdown">
        <summary>${m.length?`${u(m.length)} KPI(s) need review`:`${u(y.rows.length)} KPI(s) within baseline`}</summary>
        <div class="table-wrap" style="margin-top:10px;">
          <table class="row-table run-detail-kpi-table">
            <thead>
              <tr>
                <th>Metric</th>
                <th>Baseline</th>
                <th>API value</th>
                <th>Delta</th>
                <th>Outcome</th>
              </tr>
            </thead>
            <tbody>
              ${P.map(R=>`
                <tr>
                  <td>
                    <strong>${T(De(R.kpiField))}</strong>
                  </td>
                  <td class="num muted">${R.expected==null?"\u2014":u(R.expected)}</td>
                  <td class="num">${u(R.actual)}</td>
                  <td>${R.pctChange==null?"\u2014":`${Number(R.pctChange)>0?"+":""}${Number(R.pctChange).toFixed(1)}%`}</td>
                  <td>
                    <span class="status-pill ${lt(R.status)}">${T(Ye(R.status))}</span>
                    <div class="tiny muted" style="margin-top:6px;">${T(_(R))}</div>
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
        ${j.length?`
          <details class="upload-analysis-inline-more">
            <summary>Show ${u(j.length)} additional matched KPI(s)</summary>
            <div class="table-wrap" style="margin-top:10px;">
              <table class="row-table run-detail-kpi-table">
                <thead>
                  <tr>
                    <th>Metric</th>
                    <th>Baseline</th>
                    <th>API value</th>
                    <th>Delta</th>
                    <th>Outcome</th>
                  </tr>
                </thead>
                <tbody>
                  ${j.map(R=>`
                    <tr>
                      <td><strong>${T(De(R.kpiField))}</strong></td>
                      <td class="num muted">${R.expected==null?"\u2014":u(R.expected)}</td>
                      <td class="num">${u(R.actual)}</td>
                      <td>${R.pctChange==null?"\u2014":`${Number(R.pctChange)>0?"+":""}${Number(R.pctChange).toFixed(1)}%`}</td>
                      <td>
                        <span class="status-pill ${lt(R.status)}">${T(Ye(R.status))}</span>
                        <div class="tiny muted" style="margin-top:6px;">${T(_(R))}</div>
                      </td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </div>
          </details>
        `:""}
      </details>

      <details class="upload-analysis-tech">
        <summary>Technical grain key</summary>
        <div class="tiny muted upload-analysis-request">${T(y.grainKey)}</div>
      </details>
    </div>
  `},$=D.slice(0,6),V=D.slice(6),S=h.slice(0,6),U=h.slice(6);r.runDetailContent.innerHTML=`
    <div class="run-detail-guide">
      <strong>What this run means</strong>
      <p>This view compares API values against uploaded baselines for each grain.</p>
      ${k?'<p class="tiny" style="margin-top:8px;">Some grains have no baseline yet. You can view raw API values, then upload a baseline to enable pass/fail checks.</p>':""}
    </div>
    <div class="upload-analysis-summary-grid" style="margin-top:12px;">
      <div class="meta-card meta-card-compact">
        <strong>Grains in run</strong>
        <span>${u(O)}</span>
      </div>
      <div class="meta-card meta-card-compact">
        <strong>Needs review</strong>
        <span>${u(L)}</span>
      </div>
      <div class="meta-card meta-card-compact">
        <strong>No baseline</strong>
        <span>${u(k)}</span>
      </div>
    </div>

    <div class="history-list" style="margin-top:14px;">
      ${D.length?`<div class="upload-analysis-section-title">Needs review (${u(D.length)})</div>`:""}
      ${$.map(y=>B(y)).join("")}
      ${V.length?`
        <details class="upload-analysis-more-runs">
          <summary>Show ${u(V.length)} more grain(s) needing review</summary>
          <div class="history-list" style="margin-top:12px;">
            ${V.map(y=>B(y)).join("")}
          </div>
        </details>
      `:""}
      ${h.length?`<div class="upload-analysis-section-title">Needs baseline setup (${u(h.length)})</div>`:""}
      ${S.map(y=>B(y)).join("")}
      ${U.length?`
        <details class="upload-analysis-more-runs">
          <summary>Show ${u(U.length)} more grain(s) needing baseline setup</summary>
          <div class="history-list" style="margin-top:12px;">
            ${U.map(y=>B(y)).join("")}
          </div>
        </details>
      `:""}
      ${!D.length&&!h.length?'<div class="upload-analysis-section-title">No grains need attention</div>':""}
      ${I.length?`
        <details class="upload-analysis-more-runs upload-analysis-matched-group">
          <summary>Matched grains (${u(I.length)})</summary>
          <div class="history-list" style="margin-top:12px;">
            ${I.map(y=>B(y)).join("")}
          </div>
        </details>
      `:""}
    </div>
  `};function Kn(){let e=s.status?.endpoints||[],t=s.anomalies?.anomalies||[],n=s.status?.summary||{total_endpoints:0,healthy:0,anomalies:0,unconfirmed:0},i=s.status?.project,a=s.status?.recent_errors||[],o=e.length?Math.round((n.healthy||0)/e.length*100):100;r.overviewMetrics.innerHTML=[Ot("Healthy",`${o}%`,"Healthy right now"),Ot("Needs Care",t.length+Number(n.unconfirmed||0),"APIs to review or finish")].join(""),r.overviewCharts.innerHTML=`
        <div class="chart-card">
          <strong>Project</strong>
          <div class="chart-value">${i?.name||"Embedded project"}</div>
          <div class="tiny">${e.length} APIs \u2022 ${t.length} issues \u2022 ${a.length} errors</div>
          ${Hn(e)}
          <div class="legend-row">
            <span class="legend-chip healthy">Healthy</span>
            <span class="legend-chip warning">Warning</span>
            <span class="legend-chip anomaly">Anomaly</span>
            <span class="legend-chip unconfirmed">Unconfirmed</span>
          </div>
        </div>
      `;let l=e.filter(d=>d.status==="unconfirmed").length,c=e.filter(d=>(d.active_anomalies||0)>0||d.status==="warning").length;r.overviewAttention.innerHTML=`
        <div class="row-card quick-start-card">
          <strong>Start in APIs</strong>
          <div class="muted">Pick one API, then upload expected values or configure its fields.</div>
          <div class="toolbar" style="margin-top:12px;">
            <button class="action" type="button" data-view="api">Open APIs</button>
          </div>
        </div>
        <div class="row-card">
          <strong>Review Issues next</strong>
          <div class="muted">${t.length} open issues and ${a.length} recent errors are waiting there.</div>
          <div class="toolbar" style="margin-top:12px;">
            <button class="action secondary" type="button" data-view="incidents">Open Issues</button>
          </div>
        </div>
        <div class="row-card">
          <strong>Current focus</strong>
          <div class="muted">${c} APIs need attention and ${l} still need setup.</div>
        </div>
      `}function Xn(){let e=s.poPlaybook;if(!e){r.poPlaybookContent.innerHTML=`
      <div class="row-card">
        <strong>Loading playbook...</strong>
        <div class="muted" style="margin-top:8px;">Preparing your step-by-step workflow guidance.</div>
      </div>
    `,Vn();return}let t=e.workflows||[],n=e.stats||{},i=Number(n.apis_tracked||0),a=Number(n.healthy||0),o=Number(n.anomalies||0),l=Number(n.unconfirmed||0),c=i>0?Math.round(a/i*100):100,d=o>0?`${u(o)} open issue${o===1?"":"s"} need triage.`:l>0?`${u(l)} API${l===1?"":"s"} still need setup.`:"No active blockers right now.",p=o>0?"incidents":"api",w=o>0?"Open Issues":"Open APIs",b=o>0?`${o} issue${o===1?"":"s"} need review. Open Issues and triage high-impact rows first.`:l>0?`${l} API${l===1?"":"s"} still need setup. Open APIs and complete baseline setup.`:"No active blockers. Run checks now and generate this week's report pack.";r.poPlaybookContent.innerHTML=`
    <div class="playbook-snapshot-grid">
      <div class="row-card playbook-snapshot-card">
        <span class="tiny">APIs Tracked</span>
        <strong>${u(i)}</strong>
        <div class="muted">Project: ${u(e.project?.name||"unknown")}</div>
      </div>
      <div class="row-card playbook-snapshot-card">
        <span class="tiny">Healthy</span>
        <strong>${u(a)}</strong>
        <div class="muted">${u(c)}% health score</div>
      </div>
      <div class="row-card playbook-snapshot-card">
        <span class="tiny">Open Issues</span>
        <strong>${u(o)}</strong>
        <div class="muted">Needs triage</div>
      </div>
      <div class="row-card playbook-snapshot-card">
        <span class="tiny">Setup Pending</span>
        <strong>${u(l)}</strong>
        <div class="muted">Needs setup</div>
      </div>
    </div>
    <div class="row-card playbook-next-card" style="margin-bottom:12px;">
      <strong>What to do now</strong>
      <div class="tiny" style="margin-top:8px;">${d}</div>
      <div class="tiny muted" style="margin-top:6px;">${b}</div>
      <div class="toolbar" style="margin-top:10px; gap:8px;">
        <button class="action" type="button" data-view="${p}">${w}</button>
        <button class="action secondary" type="button" data-view="reports">Open Reports</button>
      </div>
    </div>
    <div class="row-card playbook-rhythm-card" style="margin-bottom:12px;">
      <strong>PO operating rhythm</strong>
      <div class="playbook-rhythm-grid">
        <div class="playbook-rhythm-item">
          <div class="tiny playbook-rhythm-label">Daily</div>
          <div class="muted">Run checks and triage high-priority drift in Issues.</div>
        </div>
        <div class="playbook-rhythm-item">
          <div class="tiny playbook-rhythm-label">After expected change</div>
          <div class="muted">Refresh targets only after confirming the change is real and desired.</div>
        </div>
        <div class="playbook-rhythm-item">
          <div class="tiny playbook-rhythm-label">Weekly</div>
          <div class="muted">Generate report pack and share health, risks, and next actions.</div>
        </div>
      </div>
      <div class="tiny muted" style="margin-top:8px;">Updated: ${te(e.generated_at)}</div>
    </div>
    <div class="row-card">
      <strong>Workflow checklist</strong>
      <div class="history-list playbook-checklist" style="margin-top:10px;">
        ${t.map((x,C)=>`
          <div class="history-item">
            <strong>${C+1}. ${x.title}</strong><br/>
            <span class="tiny">${x.outcome}</span>
          </div>
        `).join("")||'<div class="history-item">No workflow items found.</div>'}
      </div>
    </div>
  `,Vn()}function Vn(){let e=s.projectsCatalog||[],n=String(r.projectActiveSelect.value||"").trim()||s.activeProjectId||e.find($=>$.active&&!$.is_archived)?.id||e.find($=>!$.is_archived)?.id||e[0]?.id||"",i=e.find($=>String($.id)===String(n)),a=!!i?.is_archived,o=Array.isArray(s.status?.endpoints)?s.status.endpoints:[],l=o.length,c=o.filter($=>!!$?.last_upload_at).length,p=(Array.isArray(s.scheduler?.jobs)?s.scheduler.jobs:[]).filter($=>{let V=String($?.job_id||"");if(!V||V.startsWith("jin:bundle:"))return!1;let S=String($?.job_type||"").toLowerCase();if(S&&S!=="watch"||!String($?.endpoint_path||$?.path||"").trim())return!1;let y=String($?.skip_reason||"");return y!=="missing_default_params"&&y!=="unsupported_schedule"}),w=Array.isArray(s.projectRunHistory)&&s.projectRunHistory.length>0,b=String(r.projectDeleteConfirm.value||"").trim(),x=String(i?.name||"").trim(),C=!!x&&b===x;if(!String(r.projectRegisterName.value||"").trim()){let $=String(s.status?.project?.name||"").trim();$&&(r.projectRegisterName.value=$)}r.projectActiveSelect.innerHTML=e.length?e.map($=>`
      <option value="${$.id}" ${$.id===n?"selected":""}>
        ${$.name}${$.active?" (active)":""}${$.is_archived?" [archived]":""}
      </option>
    `).join(""):'<option value="">No project found</option>';let E=String(s.activeProjectId||""),O=!!n&&n!==E&&!a;r.projectSelectButton.disabled=!O,r.projectSelectButton.textContent=a?"Archived (restore first)":O?"Switch to Selected Project":"Already Active",r.projectArchiveButton.disabled=!n||a,r.projectRestoreButton.disabled=!n||!a,r.projectDeleteButton.disabled=!n||!a||!C,r.projectDeleteConfirm.placeholder=x?`Type "${x}" to delete`:"Type selected project name exactly";let D=!n||a,h=l===0;if(r.projectPolicySaveButton.disabled=D||h,r.projectPolicyApplyButton.disabled=D||h,r.projectRunBundleButton.disabled=D||h,r.projectBaselinePromoteButton.disabled=D||h,r.projectHealthCheckButton.disabled=D,r.projectMonitorRefreshButton.disabled=D,r.projectReportDigestButton.disabled=D||h||!w,s.projectPolicyLoadedFor===n&&s.projectMonitorPolicy){let $=s.projectMonitorPolicy||{};r.projectPolicyCadence.value=String($.cadence_template||"balanced"),r.projectPolicySchedule.value=String($.schedule||"every 2h"),r.projectPolicyBaselineMode.value=String($.baseline_mode||"fixed"),r.projectPolicyThreshold.value=$.threshold==null?"":String($.threshold),r.projectPolicyBundleEnabled.checked=!!$.bundle_enabled,r.projectPolicyBundleSchedule.value=String($.bundle_schedule||"daily 09:00"),r.projectPolicyBundleFormat.value=String($.bundle_report_format||"markdown")}let k=D?a?"Selected project is archived. Restore it to continue.":"Create or select a project to begin.":h?"No APIs are tracked yet. Call your APIs once, then save setup and run checks.":c===0?`APIs are tracked (${u(l)}), but no baseline is uploaded yet. Open APIs and upload baseline files.`:p.length===0?"Setup is saved but no runnable watch jobs are configured yet. Click Save & Apply Setup.":w?`Core workflow is ready: ${u(l)} API${l===1?"":"s"} tracked, ${u(c)} with baseline, ${u(p.length)} runnable watches.`:"Setup is ready. Run checks now to create the first monitoring run.",L=s.projectWorkflowMessage||{text:k,kind:"info"};r.projectWorkflowFeedback.textContent=L.text||"",r.projectWorkflowFeedback.className=`feedback${L.kind==="error"?" danger":L.kind==="success"?" success":" info"}`;let I=s.projectHealth;if(!I)r.projectWorkflowHealth.innerHTML="";else{let $=I.checks||[];r.projectWorkflowHealth.innerHTML=`
      <div class="row-card">
        <strong>Health Snapshot</strong>
        <div class="tiny" style="margin-top:6px;">
          Status: ${u(I.status||"unknown")} \u2022 Generated: ${te(I.generated_at)}
        </div>
        <div class="history-list" style="margin-top:10px;">
          ${$.map(V=>`
            <div class="history-item">
              <strong>${V.name}</strong> \u2022 ${V.status} \u2022 ${V.detail}
            </div>
          `).join("")||'<div class="history-item">No checks returned.</div>'}
        </div>
      </div>
    `}let F=s.projectsMonitorSnapshot;if(!F)r.projectWorkflowMonitor.innerHTML="";else{let $=F.projects||[];r.projectWorkflowMonitor.innerHTML=`
      <div class="row-card">
        <strong>Portfolio Health</strong>
        <div class="tiny" style="margin-top:6px;">
          Projects: ${u(F.count||$.length)} \u2022 Generated: ${te(F.generated_at)}
        </div>
        <div class="history-list" style="margin-top:10px;">
          ${$.slice(0,6).map(V=>`
            <div class="history-item">
              <strong>${V.name}</strong> \u2022 ${V.status||"unknown"} \u2022 issues: ${u(V.summary?.anomalies||0)} \u2022 APIs with targets: ${u(V.baseline?.endpoints_with_baseline||0)}
            </div>
          `).join("")||'<div class="history-item">No project monitor snapshot returned.</div>'}
        </div>
      </div>
    `}let _=s.projectRunHistory||[];r.projectWorkflowRuns.innerHTML=_.length?`
      <div class="row-card">
        <strong>Recent Check Runs</strong>
        <div class="history-list" style="margin-top:10px;">
          ${_.slice(0,6).map($=>`
            <div class="history-item">
              <strong>${$.status||"unknown"}</strong> \u2022 ${u($.started_at)} \u2022 planned ${u($.requested||0)} \u2022 completed ${u($.executed||0)} \u2022 errors ${u($.errors||0)}
            </div>
          `).join("")}
        </div>
      </div>
    `:"";let B=s.projectDigest;if(!B)r.projectWorkflowReport.innerHTML="";else{let $=B.totals||{};r.projectWorkflowReport.innerHTML=`
      <div class="row-card">
        <strong>Leadership Digest (${u(B.window_days||7)}d)</strong>
        <div class="tiny" style="margin-top:6px;">
          Runs: ${u($.runs||0)} \u2022 Success: ${u($.success||0)} \u2022 Degraded: ${u($.degraded||0)} \u2022 Errors: ${u($.errors||0)}
        </div>
        <div class="tiny" style="margin-top:6px;">
          Requested checks: ${u($.requested||0)} \u2022 Executed checks: ${u($.executed||0)}
        </div>
      </div>
    `}}function Re(){let e=ot(Ee()),t=ze(),n=tt(t,s.incidentPage,10);s.incidentPage=n.page;let i=s.incidentsMessage;r.incidentsFeedback.textContent=i?.text||"",r.incidentsFeedback.className=`feedback feedback-banner${i?.kind==="error"?" danger":i?.kind==="success"?" success":i?" info":""}`;let a=e.filter(S=>String(S.status||"active")!=="resolved").length,o=e.filter(S=>String(S.status||"active")!=="resolved"&&["critical","high"].includes(String(S.severity||"").toLowerCase())).length,l=t.find(S=>String(S.status||"active")!=="resolved")||e.find(S=>String(S.status||"active")!=="resolved")||null,c=document.querySelectorAll(".bulk-incident:checked").length,d=c>0;r.bulkPreview.textContent=d?`${c} issue${c===1?"":"s"} selected.`:"Select one or more issues to apply one action.",r.bulkAction.style.display=d?"":"none",r.bulkNote.style.display=d?"":"none",r.bulkRun.style.display=d?"":"none",r.incidentFilters.innerHTML=`
        <div class="issues-toolbar-grid issues-toolbar-grid-compact issues-toolbar-inline">
          <label>
            Status
            <select id="incident-status-select">
              <option value="">All issues</option>
              <option value="active" ${s.incidentStatusFilter==="active"?"selected":""}>Active</option>
              <option value="acknowledged" ${s.incidentStatusFilter==="acknowledged"?"selected":""}>In review</option>
              <option value="snoozed" ${s.incidentStatusFilter==="snoozed"?"selected":""}>Snoozed</option>
              <option value="suppressed" ${s.incidentStatusFilter==="suppressed"?"selected":""}>Suppressed</option>
              <option value="resolved" ${s.incidentStatusFilter==="resolved"?"selected":""}>Resolved</option>
            </select>
          </label>
          <label>
            Severity
            <select id="incident-severity-select">
              <option value="">All levels</option>
              <option value="critical" ${s.incidentSeverityFilter==="critical"?"selected":""}>Critical</option>
              <option value="high" ${s.incidentSeverityFilter==="high"?"selected":""}>High</option>
              <option value="medium" ${s.incidentSeverityFilter==="medium"?"selected":""}>Medium</option>
              <option value="low" ${s.incidentSeverityFilter==="low"?"selected":""}>Low</option>
            </select>
          </label>
        </div>
        <div class="tiny muted issues-filter-help">Use filters to narrow the queue before applying bulk actions.</div>
      `;let p=S=>{let U=String(S||"active").toLowerCase();return U==="acknowledged"?"In review":U==="snoozed"?"Deferred":U==="suppressed"?"Muted":U==="resolved"?"Resolved":"Needs review"},w=S=>{let U=String(S||"medium").toLowerCase();return U==="critical"||U==="high"?"High":U==="low"?"Low":"Medium"},b=S=>{let U=String(S||"active").toLowerCase();return U==="resolved"?"resolved":U==="acknowledged"?"acknowledged":"active"},x=S=>{let U=Number(S);if(!Number.isFinite(U))return null;let y=U<=1?U*100:U,m=Math.max(0,Math.min(100,y));return`${Math.round(m)}% confidence`},C=(S,U=120)=>{let y=String(S||"").trim();return y?y.length<=U?y:`${y.slice(0,U-1).trimEnd()}\u2026`:""},E=S=>{let U=Number(S?.baseline_used),y=Number(S?.actual_value),m=Number.isFinite(U)?U:null,A=Number.isFinite(y)?y:null;if(m==null||A==null)return`Expected ${u(S?.baseline_used)} -> Actual ${u(S?.actual_value)}`;if(m===0)return`Expected 0 -> Actual ${u(A)} (baseline is zero)`;let P=Math.abs(A/m),j=P>=100?`${P.toFixed(0)}x`:`${P.toFixed(1)}x`;return`Expected ${u(m)} -> Actual ${u(A)} (${j} baseline)`},O=!!((s.incidentStatusFilter||"").trim()||(s.incidentSeverityFilter||"").trim()),D=[];s.incidentStatusFilter&&D.push(`Status: ${p(s.incidentStatusFilter)}`),s.incidentSeverityFilter&&D.push(`Priority: ${w(s.incidentSeverityFilter)}`);let h=D.join(" \u2022 "),k=t.length?(n.page-1)*10+1:0,L=t.length?k+n.items.length-1:0,I=`
    <div class="issues-kpi-grid issues-kpi-grid-compact" style="margin-bottom:10px;">
      <div class="row-card issues-kpi-card">
        <span class="tiny">Open</span>
        <strong class="issues-kpi-value">${u(a)}</strong>
      </div>
      <div class="row-card issues-kpi-card">
        <span class="tiny">High Priority</span>
        <strong class="issues-kpi-value">${u(o)}</strong>
      </div>
      <div class="row-card issues-kpi-card">
        <span class="tiny">Visible</span>
        <strong class="issues-kpi-value">${u(t.length)}</strong>
      </div>
    </div>
  `,F=O?`
      <div class="row-card issue-filter-summary" style="margin-bottom:10px;">
        <strong>Filtered view</strong>
        <div class="tiny" style="margin-top:6px;">
          Showing ${u(t.length)} issue${t.length===1?"":"s"} with ${T(h)}.
        </div>
        <div class="toolbar" style="margin-top:10px;">
          <button class="action secondary" type="button" onclick="clearIncidentFilters()">Clear filters</button>
        </div>
      </div>
    `:"",_=s.incidentSort==="business",B=O?`Showing ${u(k)}-${u(L)} of ${u(t.length)} after filters.`:`Showing ${u(k)}-${u(L)} of ${u(t.length)} in priority order.`,$=l?`<button class="action" type="button" onclick="showIncident(${l.id})">Review Top Issue</button>`:'<button class="action" type="button" data-view="api">Open APIs</button>',V=t.length===0&&e.length>0&&O;r.incidentsList.innerHTML=t.length?`
        ${F}
        ${I}
        <div class="row-card issue-queue-summary" style="margin-bottom:10px;">
          <strong>Triage Queue</strong>
          <div class="tiny" style="margin-top:6px;">${B}</div>
          <div class="tiny muted issue-queue-note" style="margin-top:4px;">
            ${_?"Business ranking is active.":"Priority ordering is active."}
            Start with high-priority rows first.
          </div>
          <div class="toolbar" style="margin-top:10px;">
            ${$}
            <button class="action secondary" type="button" data-view="errors">View Errors</button>
          </div>
        </div>
        <div class="issues-card-list" role="list" aria-label="Issue triage queue">
          ${n.items.map(S=>`
            <article class="issue-card issue-card-${String(S.severity||"medium").toLowerCase()} issue-status-${String(S.status||"active").toLowerCase()}" role="listitem" data-issue-id="${S.id}">
              <div class="issue-card-select">
                <input type="checkbox" class="bulk-incident" value="${S.id}" aria-label="Select issue ${S.id}" />
              </div>
              <div class="issue-card-body">
                <div class="issue-card-header">
                  <div class="issue-card-identity">
                    <div class="table-strong issue-card-endpoint">${u(S.endpoint_path)} <span class="chip issue-id-chip">Issue #${u(S.id)}</span></div>
                    <div class="tiny issue-card-grain">Grain: ${T(C(Jn(String(S.grain_key||"")),96)||"Global")}</div>
                    ${S.owner?`<div class="tiny muted issue-card-owner">Owner: ${T(S.owner)}</div>`:""}
                  </div>
                  <div class="issue-card-priority">
                    <span class="status-pill ${_t(S)}">${w(S.severity)}</span>
                    <span class="status-pill ${b(S.status)}">${p(S.status)}</span>
                    ${x(S.confidence)?`<span class="tiny issue-card-confidence">${x(S.confidence)}</span>`:""}
                  </div>
                </div>
                <div class="issue-card-change">
                  <div class="table-strong issue-card-metric">
                    ${T(Xe(String(S.kpi_field||"metric")))}
                    <span class="issue-delta-chip">${Wn(S.pct_change)}</span>
                  </div>
                  <div class="tiny issue-change-core">${T(E(S))}</div>
                </div>
                <div class="issue-card-meta">
                  <div class="issue-card-meta-item">
                    <span class="issue-card-meta-label">Detected</span>
                    <span class="issue-card-meta-value">${te(S.detected_at)}</span>
                  </div>
                  <div class="issue-card-meta-item">
                    <span class="issue-card-meta-label">Decision status</span>
                    <span class="tiny muted issue-card-meta-value">${p(S.status)} \u2022 ${w(S.severity)} priority</span>
                  </div>
                </div>
                <details class="issue-priority-details issue-card-rank">
                  <summary>Why this was flagged</summary>
                  <div class="tiny muted">${T(C(bn(S),180))}</div>
                  <div class="tiny muted" style="margin-top:4px;">${T(C(S.change_since_last_healthy_run||"Compared with baseline.",160))}</div>
                  <div class="tiny muted" style="margin-top:4px;">Priority score ${Math.round(yt(S))}: ${T(vn(S).join(" \u2022 "))}</div>
                </details>
                <div class="toolbar compact issue-card-actions">
                  <button class="action" type="button" onclick="showIncident(${S.id})">Open Details</button>
                  <details class="more-actions">
                    <summary aria-label="More actions for issue ${S.id}" title="More actions for issue ${S.id}">\u22EF</summary>
                    <div class="more-actions-menu">
                      <button class="action secondary" type="button" onclick="confirmIncident(${S.id}, 'acknowledged', 0)">Mark In Review</button>
                      <button class="action secondary" type="button" onclick="quickFixBaseline(${S.id})">Accept as Baseline</button>
                      <button class="action warn" type="button" onclick="confirmIncident(${S.id}, 'resolved', 0)">Resolve</button>
                      <button class="action ghost" type="button" onclick="openApi('${String(S.endpoint_path).replace(/'/g,"\\\\'")}')">Open API</button>
                    </div>
                  </details>
                </div>
              </div>
            </article>
          `).join("")}
        </div>
      ${nt("incidents",n.page,n.totalPages)}
      `:V?`
        <div class="empty empty-center issue-empty-state">
          <strong>No issues match these filters.</strong>
          <div class="tiny" style="margin-top:6px;">${h?`Active filters: ${T(h)}. `:""}Clear filters to see the full triage queue again.</div>
          <div class="toolbar" style="margin-top:12px; justify-content:center;">
            <button class="action secondary" type="button" onclick="clearIncidentFilters()">Clear filters</button>
          </div>
        </div>
      `:`
        <div class="empty empty-center issue-empty-state">
          <strong>No issues right now.</strong>
          <div class="tiny" style="margin-top:6px;">
            Run checks regularly and return here when any drift needs review.
            If you expected upload mismatches, open Issues from the upload analysis panel to refresh and reset filters.
          </div>
          <div class="toolbar" style="margin-top:12px; justify-content:center;">
            ${O?'<button class="action secondary" type="button" onclick="clearIncidentFilters()">Clear filters</button>':""}
            <button class="action" type="button" data-view="api">Open APIs</button>
          </div>
        </div>
      `}function Yn(){let e=s.scheduler?.jobs||[],t=n=>{let i=String(n?.last_status||"never").toLowerCase(),a=te(n?.last_finished_at),o=!!n?.last_finished_at;return n?.paused?{pillClass:"suppressed",pillLabel:"Paused",tooltip:"Paused: checks are stopped until you click Resume.",lastLine:o?`Last run before pause - ${a}`:"No completed runs yet."}:i==="success"?{pillClass:"resolved",pillLabel:"Healthy",tooltip:"Healthy: the latest run completed without errors.",lastLine:o?`Last successful run - ${a}`:"Last successful run not recorded yet."}:i==="error"?{pillClass:"active",pillLabel:"Failed",tooltip:"Failed: the latest run hit an error. See the error message in this row.",lastLine:o?`Last failed run - ${a}`:"A run failed, but no finish time is recorded."}:i==="backoff"?{pillClass:"acknowledged",pillLabel:"Retrying",tooltip:"Retrying: Jin is waiting before the next attempt after recent failures.",lastLine:o?`Last retry attempt - ${a}`:"Retry mode is active."}:i==="skipped"?{pillClass:"acknowledged",pillLabel:"Skipped",tooltip:"Skipped: this run was intentionally not executed.",lastLine:o?`Last skipped run - ${a}`:"Latest run was skipped."}:{pillClass:"resolved",pillLabel:"Not run yet",tooltip:"Not run yet: this watch has not completed its first run.",lastLine:"No completed runs yet."}};r.schedulerList.innerHTML=e.length?`
        <div class="table-wrap scheduler-table-wrap">
          <table class="scheduler-table">
            <thead>
              <tr>
                <th>Watch</th>
                <th>Status</th>
                <th>Next</th>
                <th>Retry</th>
                <th>Mode</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${e.map(n=>{let i=t(n),a=n.backoff_active?"Backoff":"Normal",o=n.backoff_active?"Backoff mode: next retry is delayed after failures.":"Normal mode: runs follow the regular schedule.";return`
                <tr>
                  <td>
                    <div class="table-strong">${u(n.path||n.job_id||"Watch job")}</div>
                    <div class="tiny" title="${T(i.tooltip)}">${T(i.lastLine)}</div>
                    <div class="tiny">${n.last_error||"No errors."}</div>
                  </td>
                  <td>
                    <span class="status-pill ${i.pillClass}" title="${T(i.tooltip)}">${T(i.pillLabel)}</span>
                  </td>
                  <td>${te(n.next_run_at)}</td>
                  <td>${te(n.next_retry_at)}</td>
                  <td><span title="${T(o)}">${a}</span></td>
                  <td>
                    <div class="toolbar compact issue-table-actions">
                      <button class="action secondary" type="button" onclick="confirmScheduler('${String(n.job_id).replace(/'/g,"\\\\'")}', '${n.paused?"resume":"pause"}')">${n.paused?"Resume":"Pause"}</button>
                      <button class="action" type="button" onclick="confirmScheduler('${String(n.job_id).replace(/'/g,"\\\\'")}', 'run')">Run Now</button>
                    </div>
                  </td>
                </tr>
              `}).join("")}
            </tbody>
          </table>
        </div>
      `:be("No watches yet.")}function Ze(){let e=s.status?.project,t=qs();r.errorsList.innerHTML=t.length?t.map(n=>`
        <div class="row-card">
          <div style="display:flex; justify-content:space-between; gap:12px;">
            <div>
              <strong>${n.category?n.category[0].toUpperCase()+n.category.slice(1):zn(n.source)} \u2022 ${n.source}</strong>
              <div class="muted">${n.message}</div>
            </div>
            <div style="display:flex; gap:8px; flex-wrap:wrap;">
              <span class="status-pill ${n.severity||Xt(n.source)}">${n.severity||Xt(n.source)}</span>
              <span class="status-pill ${Tt(n)==="archived"?"resolved":Tt(n)==="acknowledged"?"acknowledged":"active"}">${Tt(n)}</span>
            </div>
          </div>
          <div class="tag-row">
            <span class="chip">${e?.name||"project"}</span>
            <span class="chip">${n.endpoint_path||"workspace-level"}</span>
            <span class="chip">${te(n.created_at)}</span>
          </div>
          <div class="tiny" style="margin-top:8px;">${n.hint||"Check logs for more detail."}</div>
          ${(n.remediation_steps||[]).length?`
            <div class="history-list" style="margin-top:12px;">
              ${(n.remediation_steps||[]).map(i=>`<div class="history-item">${i}</div>`).join("")}
            </div>
          `:""}
          <div class="toolbar" style="margin-top:10px;">
            ${n.status==="acknowledged"?`<button class="action secondary" type="button" onclick="confirmError(${n.id}, 'reopened')">Reopen</button>`:n.status==="archived"?`<button class="action secondary" type="button" onclick="confirmError(${n.id}, 'reopened')">Restore</button>`:`<button class="action secondary" type="button" onclick="confirmError(${n.id}, 'acknowledged')">Acknowledge</button>`}
            ${n.status==="archived"?"":`<button class="action ghost" type="button" onclick="confirmError(${n.id}, 'archived')">Archive</button>`}
            ${n.endpoint_path?`<button class="action ghost" type="button" onclick="openApi('${String(n.endpoint_path).replace(/'/g,"\\\\'")}')">Open API</button>`:""}
          </div>
          ${n.detail?`<pre style="margin-top:10px;">${n.detail}</pre>`:""}
        </div>
      `).join(""):be("No errors right now.")}function Gs(e){if(!e)return"";let t=e.toLowerCase();return t==="str"||t==="string"?"Text":t==="int"||t==="integer"?"Whole number":t==="float"||t==="decimal"?"Decimal number":t==="bool"||t==="boolean"?"True / False":t==="datetime"||t==="date"?"Date / time":e}function Un(e){let t=String(e||"").replace(/\[\]/g,"");return t?t.startsWith("data.")?t.slice(5):t:""}function Js(e=[]){return e.some(t=>{let n=String(t?.name||t||"").trim();if(!n)return!1;let i=n.toLowerCase(),a=String(t?.annotation||t?.type||"").toLowerCase();return a==="datetime"||a==="date"?!0:i.includes("time")||i.includes("date")||i.includes("timestamp")||i.includes("created_at")||i.includes("updated_at")||i.includes("period")})}function ge(e=[],t,n=[]){let i=new Set(t.dimension_fields||[]),a=new Set(t.kpi_fields||[]),o=t.time_field||null,l=!!o||t.time_required!==!1&&Js(e),c=t.time_granularity||"minute",d=s.poMode!==!1,p=!t.confirmed,w=i.size===0&&a.size===0&&!o,b=new Map;n&&n.forEach(M=>{M.calculation&&M.calculation.field&&b.set(M.calculation.field,M.name)});let x=[...i],C=[...a],E=`
    <div style="margin-bottom:20px; padding:12px; background:rgba(255,255,255,0.02); border-radius:10px; font-size:11px; color:var(--ink-soft); display:flex; gap:20px; border:1px solid var(--line); flex-wrap:wrap;">
      <div style="display:flex; align-items:center; gap:6px;"><div style="width:8px; height:8px; border-radius:2px; background:var(--purple-neon);"></div> <strong>Segments</strong>: How results are grouped (example: region, retailer)</div>
      <div style="display:flex; align-items:center; gap:6px;"><div style="width:8px; height:8px; border-radius:2px; background:var(--green-neon);"></div> <strong>Metrics</strong>: Numbers to monitor</div>
      <div style="display:flex; align-items:center; gap:6px;"><div style="width:8px; height:8px; border-radius:2px; background:var(--brand);"></div> <strong>Time</strong>: Transaction timestamp</div>
    </div>
  `,O=w?`
      <div class="row-card" style="margin-bottom:14px;">
        <strong>Quick start</strong>
        <div class="tiny" style="margin-top:6px;">
          Pick at least one <strong>Segment</strong> and one <strong>Metric</strong>${l?", plus one <strong>Time</strong> field":""}.
          Advanced settings are optional for now.
        </div>
      </div>
    `:"",D="";s.driftSuggestions&&Object.keys(s.driftSuggestions).length>0&&(D=`
      <div class="drift-alert" style="margin-bottom:20px; padding:16px; background:rgba(var(--brand-rgb), 0.1); border:1px solid var(--brand); border-radius:12px; animation: slideDown 0.3s ease;">
         <div style="display:flex; align-items:center; gap:12px;">
            <div style="font-size:24px;">\u{1F9EC}</div>
            <div style="flex:1;">
               <div style="font-weight:700; color:var(--ink);">Self-Healing Detected</div>
               <div class="tiny muted">It looks like some fields were renamed. Jin identified these by their data shape.</div>
            </div>
         </div>
         <div style="margin-top:12px; display:flex; flex-direction:column; gap:8px;">
            ${Object.entries(s.driftSuggestions).map(([M,H])=>`
               <div style="display:flex; align-items:center; gap:10px; background:rgba(255,255,255,0.05); padding:8px 12px; border-radius:8px; border:1px solid var(--line);">
                  <strong style="color:var(--ink-soft);">${H}</strong>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  <strong style="color:var(--brand);">${M}</strong>
                  <button class="btn btn-xs btn-primary" style="margin-left:auto;" onclick="approveDriftMerge('${M}', '${H}')" ${d?'disabled title="Turn off PO Mode to merge manually."':""}>Approve & Merge</button>
               </div>
            `).join("")}
         </div>
      </div>
    `);let h=String(s.selectedApi||""),k=!!s.configFocusExpandedByApi?.[h],L=(M,H,R)=>{if(R)return!0;let ee=String(M||"").toLowerCase(),Y=String(H||"").toLowerCase();return Y==="date"||Y==="datetime"||Y==="int"||Y==="float"||Y==="decimal"?!0:/(retailer|merchant|store|region|country|channel|category|segment|sku|product|item|label|group|period|date|time|timestamp|value|amount|revenue|sales|orders|units|count|qty|quantity|cost|rate|ratio|score)/.test(ee)},I=(e||[]).map(M=>{let H=typeof M=="string"?M:String(M.name||"");if(!H)return null;let R=Un(H),ee=R!==H,Y=typeof M=="string"?"":M.annotation||M.type||"",Q=Gs(Y),ce=H===o?"time":i.has(H)?"dimension":a.has(H)?"kpi":t.excluded_fields?.includes(H)?"exclude":"ignore",q=typeof M=="string"?!1:!!M.suggested;return{name:H,shownName:R,hasTechnicalPath:ee,rawType:Y,type:Q,role:ce,suggested:q,likely:L(H,Y,q)}}).filter(M=>!!M),F=(w||p)&&I.length>8&&!k,_=F?I.filter(M=>M.role!=="ignore"||M.likely):I,B=_.length?_:I,$=Math.max(0,I.length-B.length),V=F?`
      <div class="row-card" style="margin-bottom:12px;">
        <strong>Focused view</strong>
        <div class="tiny" style="margin-top:6px;">
          Showing ${u(B.length)} likely business fields first to reduce setup noise.
          ${$>0?`${u($)} technical/system fields are hidden for now.`:""}
        </div>
        <div class="toolbar" style="margin-top:10px;">
          <button class="action secondary" type="button" onclick="toggleConfigFieldFocus(true)">Show all fields</button>
        </div>
      </div>
    `:(w||p)&&I.length>8&&k?`
          <div class="tiny muted" style="margin-bottom:10px;">
            Showing all ${u(I.length)} fields.
            <button class="action ghost" type="button" style="margin-left:8px;" onclick="toggleConfigFieldFocus(false)">Use focused view</button>
          </div>
        `:"",S=d?`
      <div class="tiny muted" style="margin-bottom:10px;">
        PO Mode keeps advanced sections simplified for first-time setup, but field-role and time setup controls remain editable.
      </div>
    `:"",U=B.map(M=>{let{name:H,shownName:R,hasTechnicalPath:ee,type:Y,role:Q}=M,ce=t.time_extraction_rule||"single",q=String(s.timePreview||"No timeline preview yet"),v=/no sample run yet|no recent sample yet|choose a time field|choose your business time field|no sample value found/i.test(q);return`
      <div class="field-role-card ${Q==="dimension"?"active-dimension":Q==="kpi"?"active-kpi":Q==="exclude"?"active-exclude":""}" data-field-name="${H}">
        <div class="field-info">
          <div class="field-name">
            ${T(R||H)}
            ${b.has(H)?`<span class="chip" style="margin-left:8px; background:rgba(34, 197, 94, 0.1); color:var(--green-neon); border-color:var(--green-neon);">${b.get(H)} Metric</span>`:""}
          </div>
          ${ee?`<div class="tiny muted" style="margin-top:3px;">${T(H)}</div>`:""}
          <div class="field-caption">${Y||"data field"}</div>
        </div>
        <div class="field-role-selector">
          <button class="role-btn ${Q==="ignore"?"active":""}" data-role="ignore" onclick="updateFieldRole('${H}', 'ignore')" title="Do not track this field.">
            Ignore
          </button>
          <button class="role-btn ${Q==="time"?"active":""}" data-role="time" onclick="updateFieldRole('${H}', 'time')" title="The timestamp of the transaction.">
            Time
          </button>
          <button class="role-btn ${Q==="dimension"?"active":""}" data-role="dimension" onclick="updateFieldRole('${H}', 'dimension')" title="Group results (e.g. by Region or Product).">
            Segment
          </button>
          <button class="role-btn ${Q==="kpi"?"active":""}" data-role="kpi" onclick="updateFieldRole('${H}', 'kpi')" title="The value to monitor for anomalies.">
            Metric
          </button>
          <button class="role-btn ${Q==="exclude"?"active":""}" data-role="exclude" onclick="updateFieldRole('${H}', 'exclude')" title="Comparison or secondary data. Ignore for monitoring.">
            Exclude
          </button>
        </div>
        ${Q==="time"?`
          <div class="time-extraction-container">
             <div class="time-verify-preview ${s.timePreview&&!v?"verified":""}" style="margin-top:0;">
                <span>Chronology Pulse:</span>
                <strong id="time-preview-val">${T(q)}</strong>
                <a href="#" class="tweak-link" onclick="toggleTimeSettings('${H}', event)" style="margin-left:auto; font-size:11px; color:var(--brand); text-decoration:none;">${s.showTimeSettings?.[H]?"Hide settings":"Tweak settings"}</a>
             </div>
             ${v?'<div class="tiny muted" style="margin-top:6px;">Setup is not blocked. Save config now and run one check to unlock timeline preview.</div>':""}

             ${s.detectedTimeSources&&s.detectedTimeSources.length>1&&!t?.time_pin?`
                <div class="source-picker" style="margin-top:8px; padding:10px; background:rgba(255,165,0,0.05); border:1px dashed orange; border-radius:8px;">
                   <div class="tiny" style="color:orange; font-weight:700; margin-bottom:6px;">Multiple Time Fields Found:</div>
                   <div style="display:flex; flex-wrap:wrap; gap:6px;">
                      ${s.detectedTimeSources.map(N=>`
                         <button class="btn btn-xs ${H===N?"btn-primary":"btn-outline"}" onclick="selectTimeSource('${N}')" style="font-size:10px; border-radius:12px;">
                            ${T(Un(N))}
                         </button>
                      `).join("")}
                   </div>
                   <div class="tiny muted" style="margin-top:6px;">Jin detected these as potential base clocks. Which one drives your business?</div>
                </div>
             `:""}

             <div class="grain-detection-status" style="margin-top:12px; padding:10px 12px; background:rgba(var(--brand-rgb), 0.05); border-radius:8px; border:1px solid rgba(var(--brand-rgb), 0.1); display:flex; align-items:center; gap:10px;">
                <div class="tiny-badge" style="background:${t?.time_pin?"var(--green-neon)":"var(--brand)"}; display:flex; align-items:center; gap:4px;">
                   ${t?.time_pin?`
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M16 9V4l1 1V2H7v2l1-1v5c0 2.18-1.28 4.02-3.13 4.87l-.87.4V15h7v7l1 1 1-1v-7h7v-1.73l-.87-.4C17.28 13.02 16 11.18 16 9z"/></svg>
                   `:`
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                   `}
                   ${s.detectedGrain||c}
                </div>
                <div style="font-size:11px; color:var(--ink-soft); line-height:1.2;">
                   <strong>Pulse Engine:</strong> ${s.grainReason||"Run one check to infer monitoring frequency."}
                </div>
                
                <button class="tweak-link" onclick="pinGrain()" style="margin-left:auto; border:none; background:none; cursor:pointer;" title="${t?.time_pin?"Unlock (Enable Learning)":"Pin Frequency (Lock current grain)"}">
                   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${t?.time_pin?"var(--green-neon)":"currentColor"}" stroke-width="2"><path d="${t?.time_pin?"M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z":"M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"}"/></svg>
                </button>
             </div>

             ${s.showTimeSettings?.[H]?`
               <div class="time-settings-tweak" style="margin-top:16px; padding:12px; background:rgba(255,255,255,0.02); border-radius:8px; border:1px solid var(--line); animation: fadeIn 0.2s ease;">
                  <div style="display:grid; grid-template-columns: 1fr 1fr; gap:16px;">
                     <div>
                        <div class="tiny muted" style="margin-bottom:6px; font-weight:600; color:var(--ink);">Data Frequency:</div>
                        <select class="control" onchange="updateGranularity(this.value)" style="width:100%; height:32px; padding:0 8px; font-size:12px;">
                           <option value="minute" ${c==="minute"?"selected":""}>Every minute</option>
                           <option value="hour" ${c==="hour"?"selected":""}>Hourly</option>
                           <option value="day" ${c==="day"?"selected":""}>Daily</option>
                           <option value="week" ${c==="week"?"selected":""}>Weekly</option>
                           <option value="month" ${c==="month"?"selected":""}>Monthly</option>
                        </select>
                     </div>
                     <div>
                        <div class="tiny muted" style="margin-bottom:6px; font-weight:600; color:var(--ink);">Date Pick-up:</div>
                        <select class="control" onchange="updateExtractionRule(this.value)" style="width:100%; height:32px; padding:0 8px; font-size:12px;">
                           <option value="single" ${ce==="single"?"selected":""}>Single date in row</option>
                           <option value="first" ${ce==="first"?"selected":""}>First date from array</option>
                           <option value="last" ${ce==="last"?"selected":""}>Last date from array</option>
                           <option value="range" ${ce==="range"?"selected":""}>Two dates (Range)</option>
                        </select>
                     </div>
                  </div>
               </div>
             `:""}
          </div>
        `:""}
      </div>
    `}).join(""),y=s.status?.project?.license_enforced!==!1&&s.status?.project?.is_unlicensed?`
    <div class="feedback info" style="margin-top:12px;">
      License is not activated for this project yet, but setup stays editable in this build.
      Activate Business later only if you want multi-project enforcement.
    </div>
  `:"";r.fieldRoleGrid.innerHTML=`
    <div style="position:relative">
      ${O}
      ${S}
      ${V}
      ${E}
      ${U}
      ${y}
    </div>
  `;let m=x.length?`for every unique <strong>${x.join(", ")}</strong>`:"across your entire dataset",A=C.length?`monitor <strong>${C.join(" and ")}</strong>`:"track any numbers yet",P=document.getElementById("config-step-3-container");if(P){let M=C.length>0||x.length>0||o,H=String(s.selectedApi||""),R=s.autoSuggestSummaryByApi||{},ee=H?R[H]:null,Y=qn(s.activeApiDetail),Q=ee?`${ee.headline} ${ee.details}`:Y?"Use auto-suggest to pre-fill segment and metric fields from recent API traffic or Pydantic examples.":"No recent sample yet. You can still configure Segment/Metric/Time now, then run one check to unlock auto-suggest.";P.innerHTML=`
      <div class="config-story-card ${M?"active":""}" style="margin-top:24px; border-top:1px solid var(--line); padding-top:24px;">
        <div class="story-header" style="display:flex; align-items:center; gap:12px; margin-bottom:12px;">
          <div class="config-step-badge">3</div>
          <h4 style="margin:0;">Confirm your monitoring plan</h4>
        </div>
        <div class="config-story-text" style="font-size:15px; line-height:1.5;">
          Jin will ${A} ${m}${o?` using <strong>${o}</strong> as the clock.`:"."}
        </div>
        <div class="tiny muted" style="margin-top:12px;">
          ${C.length&&x.length?"This is a great setup! You'll see trends broken down by detailed segments.":"Tip: Select at least one group and one measurable number for the best results."}
        </div>
        <div class="toolbar" style="margin-top:20px; justify-content:center;">
          <button class="action" id="save-config-story-button" type="button" onclick="saveConfig()">
            Save configuration and continue to baselines
          </button>
        </div>
        <div class="row-card" style="margin-top:14px; text-align:left;">
          <strong>Need help picking fields?</strong>
          <div class="tiny muted" id="auto-suggest-summary" style="margin-top:8px;">
            ${T(Q)}
          </div>
          <div class="toolbar" style="margin-top:10px;">
            <button class="action secondary" id="auto-suggest-button" type="button" onclick="runMagicGuess(true)" ${Y?"":"disabled"}>
              ${M?"Re-run auto-suggest":"Auto-suggest setup"}
            </button>
          </div>
        </div>
      </div>
    `}let j=t.tolerance_normal??t.tolerance_pct??10;r.configToleranceSimple.value=String(j),r.configActiveTolerance.value=t.active_tolerance||"normal",r.configRelaxed.value=String(t.tolerance_relaxed??20),r.configNormal.value=String(t.tolerance_normal??t.tolerance_pct??10),r.configStrict.value=String(t.tolerance_strict??5)}function le(e){r.apiEmpty.style.display="none",r.apiWorkspace.style.display="grid",r.apiTitle.textContent=e.endpoint_path,r.apiSubtitle.textContent="Upload references, review issues, and configure this API in one place.",r.apiMethod.textContent=e.http_method||"GET",r.apiPath.textContent=e.endpoint_path;let t=`/jin/template/${ue(e.endpoint_path)}`;r.templateCsvLink.href=`${t}.csv`,r.templateXlsxLink.href=`${t}.xlsx`,r.templateCsvLinkUpload.href=`${t}.csv`,r.templateXlsxLinkUpload.href=`${t}.xlsx`,r.poModeToggle.checked=s.poMode!==!1;let n=document.getElementById("advanced-section");n&&(s.poMode!==!1?(n.open=!1,n.style.display="none"):n.style.display="");let i=e.operator_metadata||{},a=[...e.monitoring_runs||[]].sort((v,N)=>String(N?.started_at||"").localeCompare(String(v?.started_at||""))),o=(e.current_kpis||[]).length>0,l=(e.trend_summary||[]).length>0||(e.recent_history||[]).length>0,c=(e.anomaly_history||[]).length>0,d=(e.upload_activity||[]).length>0,p=a.length>0||(e.recent_history||[]).length>0,w=String(s.selectedUploadAnalysisAt||""),b=e.upload_analysis_history||[],C=w&&b.find(v=>String(v?.analyzed_at||"")===w)||null||e.last_upload_analysis||null,E=(e.references||[]).length>0,O=e.operator_metadata?.confirmed,D=a.length>0||(e.recent_history||[]).length>0,h=(e.upload_activity||[]).length>0,k=1;O&&!h&&(k=2),O&&h&&(k=3);let L=r.apiWorkspace.querySelector(".setup-wizard");L||(L=document.createElement("div"),L.className="setup-wizard",r.apiWorkspace.prepend(L)),L.innerHTML=`
      <div class="wizard-step ${k===1?"active":""}" data-api-tab="configuration" data-wizard-step="configuration" onclick="switchApiTab('configuration')">
        <div class="wizard-step-icon">1</div>
        <div class="wizard-step-label">Identify segments & metrics</div>
      </div>
      <div class="wizard-step-connector"></div>
      <div class="wizard-step ${k===2?"active":""}" data-api-tab="uploads" data-wizard-step="uploads" onclick="switchApiTab('uploads')">
        <div class="wizard-step-icon">2</div>
        <div class="wizard-step-label">Set baselines</div>
      </div>
      <div class="wizard-step-connector"></div>
      <div class="wizard-step ${k===3?"active":""}" data-api-tab="history" data-wizard-step="history" onclick="switchApiTab('history')">
        <div class="wizard-step-icon">3</div>
        <div class="wizard-step-label">Monitor</div>
      </div>
  `;let I=(s.status?.endpoints||[]).find(v=>v.endpoint_path===e.endpoint_path),F=Gn({endpoint_path:e.endpoint_path,http_method:e.http_method||"GET",status:I?.status||"warning",dimension_fields:I?.dimension_fields||e.config?.dimension_fields||[],kpi_fields:I?.kpi_fields||e.config?.kpi_fields||[],time_field:I?.time_field||e.config?.time_field||null,time_required:I?.time_required??e.config?.time_required,confirmed:e.operator_metadata?.confirmed??I?.confirmed??!1,last_upload_at:i.last_upload_at||I?.last_upload_at||null});r.apiMetaGrid.innerHTML=[["Status",(s.status?.endpoints||[]).find(v=>v.endpoint_path===e.endpoint_path)?.status||"healthy"],["Setup",F.label],["Last Check",te(i.last_observed_at)],["Last Upload",te(i.last_upload_at)],["Checks",u(i.observation_count)]].map(([v,N])=>`
        <div class="meta-card meta-card-compact">
          <strong>${v}</strong>
          <span>${N}</span>
        </div>
      `).join("");let _=(s.coreInsightsByApi||{})[e.endpoint_path];if(_){let v=_.kind==="error"?"danger":_.kind==="success"?"success":"info",N="";_.actionType==="tab"&&_.actionValue?N=`<button class="action" type="button" onclick="switchApiTab('${T(_.actionValue)}')">${T(_.actionLabel||"Open next step")}</button>`:_.actionType==="view"&&_.actionValue&&(N=`<button class="action" type="button" data-view="${T(_.actionValue)}">${T(_.actionLabel||"Open next step")}</button>`),r.apiCoreInsight.style.display="block",r.apiCoreInsight.innerHTML=`
      <div class="feedback ${v}">
        <strong>${T(_.title||"Insight")}</strong>
        <div class="tiny" style="margin-top:6px;">${T(_.summary||"")}</div>
        ${N?`<div class="toolbar" style="margin-top:10px;">${N}</div>`:""}
      </div>
    `}else r.apiCoreInsight.style.display="none",r.apiCoreInsight.innerHTML="";let B=e.current_kpis||[];r.apiKpis.innerHTML=B.length?B.map(v=>`
        <div class="kpi-card">
          <strong>${Xe(v.kpi_field)}</strong>
          <span>${u(v.actual_value)}</span>
          <div class="delta">${v.expected_value==null?"No baseline yet. Upload a reference to compare.":`Baseline ${u(v.expected_value)}${v.pct_change==null?"":` \u2022 ${u(v.pct_change)}% vs baseline`}`}</div>
        </div>
      `).join(""):`
        <div class="empty empty-starter">
          ${l?E?"Recent API values are available below. Expand Monitor runs to see segment-level comparisons.":"Recent API values are available below, but no baseline is linked yet. Upload a reference file to enable pass/fail checks.":"No values yet. Upload a reference file and run a check to get started."}
        </div>
      `;let $=e.trend_summary||[],V=e.recent_history||[];r.apiTrends.innerHTML=$.length?$.map(v=>{let N=V.map(J=>J?.kpi_json?.[v.kpi_field]).filter(J=>typeof J=="number"),X=N.length?N.reduce((J,fe)=>J+fe,0)/N.length:null;return`
          <div class="trend-card">
            <strong>${Xe(v.kpi_field)}</strong>
            <span>${u(v.latest)}</span>
            <div class="tiny">Typical range: ${u(v.min)} to ${u(v.max)} across ${v.samples} run(s).</div>
            <div class="tiny" style="margin-top:6px;">Average: ${u(X)} \u2022 Change vs first visible run: ${u(v.delta_pct)}%.</div>
            ${Bn(N)}
          </div>
        `}).join(""):be("No trends yet."),r.apiTrends.innerHTML+=`
        <div class="chart-card">
          <strong>Checks Trend</strong>
          <div class="chart-value">${V.length} recent runs</div>
          <div class="tiny">How values are moving over time.</div>
          ${Dn(e)||'<div class="empty" style="margin-top:10px;">No history yet.</div>'}
        </div>
        <div class="chart-card">
          <strong>Uploads</strong>
          <div class="chart-value">${(e.upload_activity||[]).length} reference events</div>
          <div class="tiny">Latest upload: ${te((e.upload_activity||[])[0]?.uploaded_at)}</div>
          <div class="tiny" style="margin-top:8px;">Use the Uploads tab to add or replace baseline files.</div>
          <div class="toolbar" style="margin-top:10px;">
            <button class="action secondary tiny" type="button" onclick="openUploadsTab()">Open Uploads</button>
          </div>
        </div>
      `;let S=document.getElementById("api-start-panel");if(S){let v=(e.anomaly_history||[]).filter(_e=>String(_e?.status||"active")!=="resolved").length,N=!!O,X=N&&!!h,J=X&&!!p,fe=J&&v===0,re=s.currentApiTab==="summary";S.style.display=re?"block":"none";let ve=(_e,G)=>_e?'<span class="status-pill healthy">Done</span>':G?'<span class="status-pill warning">Now</span>':'<span class="status-pill acknowledged">Next</span>',Ae=N?X?J?v>0?{title:"Step 4: Review issues",copy:"Some checks are outside target. Triage and resolve what changed.",cta:"Open Issues",action:"setView('incidents')"}:{title:"Step 5: Generate report",copy:"Monitoring is stable. Generate a leadership-ready update.",cta:"Open Reports",action:"setView('reports')"}:{title:"Step 3: Monitor",copy:"Run checks and see pass/fail status for each segment.",cta:"Open Monitor",action:"switchApiTab('history')"}:{title:"Step 2: Set baselines",copy:"Upload a reference file so checks have a clear target.",cta:"Open Uploads",action:"switchApiTab('uploads')"}:{title:"Step 1: Identify segments & metrics",copy:"Define which fields are segments and which are monitored metrics.",cta:"Open Configure",action:"switchApiTab('configuration')"};S.innerHTML=`
          <div class="panel-head">
            <div>
              <h3>What to do next</h3>
              <p>Follow this exact flow for <strong>${e.endpoint_path}</strong>.</p>
            </div>
          </div>
          <div class="starter-next-action">
            <div>
              <strong>${Ae.title}</strong>
              <p>${Ae.copy}</p>
            </div>
            <button class="action" type="button" onclick="${Ae.action}">${Ae.cta}</button>
          </div>
          <div class="starter-grid">
            <div class="starter-step ${N?"":"active-step"}">
              <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:8px;">
                <div style="display:flex; align-items:center; gap:8px;">
                  <div class="wizard-step-icon" style="width:20px; height:20px; font-size:10px;">1</div>
                  <strong>Identify segments & metrics</strong>
                </div>
                ${ve(N,!N)}
              </div>
              <p>Configure fields once so Jin understands your business shape.</p>
              <button class="action secondary tiny" style="margin-top:10px;" onclick="switchApiTab('configuration')">Open Configure</button>
            </div>
            <div class="starter-step ${N&&!X?"active-step":""}">
              <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:8px;">
                <div style="display:flex; align-items:center; gap:8px;">
                  <div class="wizard-step-icon" style="width:20px; height:20px; font-size:10px;">2</div>
                  <strong>Set baselines</strong>
                </div>
                ${ve(X,N&&!X)}
              </div>
              <p>Upload CSV/XLSX so each segment has expected target values.</p>
              <button class="action secondary tiny" style="margin-top:10px;" onclick="switchApiTab('uploads')">Open Uploads</button>
            </div>
            <div class="starter-step ${X&&!J?"active-step":""}">
              <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:8px;">
                <div style="display:flex; align-items:center; gap:8px;">
                  <div class="wizard-step-icon" style="width:20px; height:20px; font-size:10px;">3</div>
                  <strong>Monitor checks</strong>
                </div>
                ${ve(J,X&&!J)}
              </div>
              <p>Open Monitor to run checks and view segment-level outcomes.</p>
              <button class="action secondary tiny" style="margin-top:10px;" onclick="switchApiTab('history')">Open Monitor</button>
            </div>
            <div class="starter-step ${J&&v>0?"active-step":""}">
              <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:8px;">
                <div style="display:flex; align-items:center; gap:8px;">
                  <div class="wizard-step-icon" style="width:20px; height:20px; font-size:10px;">4</div>
                  <strong>Review issues</strong>
                </div>
                ${ve(J&&v===0,J&&v>0)}
              </div>
              <p>Triage anomalies and decide expected baseline vs real incident.</p>
              <button class="action secondary tiny" style="margin-top:10px;" onclick="setView('incidents')">Open Issues</button>
            </div>
            <div class="starter-step ${fe?"active-step":""}">
              <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:8px;">
                <div style="display:flex; align-items:center; gap:8px;">
                  <div class="wizard-step-icon" style="width:20px; height:20px; font-size:10px;">5</div>
                  <strong>Generate report</strong>
                </div>
                ${ve(fe,fe)}
              </div>
              <p>Create a PO-ready report with health, drift, and next actions.</p>
              <button class="action secondary tiny" style="margin-top:10px;" onclick="setView('reports')">Open Reports</button>
            </div>
          </div>
        `}let U=s.currentApiTab;r.configFooter&&(r.configFooter.style.display=U==="configuration"&&O?"flex":"none"),r.uploadsFooter&&(r.uploadsFooter.style.display=U==="uploads"?"flex":"none"),r.summaryFooter&&(r.summaryFooter.style.display=U==="summary"?"flex":"none");let y=r.apiKpis.closest(".panel"),m=r.apiIncidentHistory.closest(".panel"),A=r.apiRunTable.closest(".panel");y&&(y.style.display=o||l||k===3?"block":"none"),m&&(m.style.display=c||k===3?"block":"none"),A&&(A.style.display=p||k===3?"block":"none");let P=document.getElementById("api-monitoring-progress");if(P){let v=P.dataset.endpoint,N=P.dataset.source;C?(P.dataset.endpoint=e.endpoint_path,P.dataset.source="upload-analysis",P.innerHTML=zs(C,e),P.style.display="block"):!p&&k===3?(P.dataset.endpoint=e.endpoint_path,P.dataset.source="empty-analysis",P.innerHTML=be("Upload a baseline and run analysis to see per-segment results here."),P.style.display="block"):(v!==e.endpoint_path||N==="upload-analysis"||N==="empty-analysis")&&(P.dataset.endpoint=e.endpoint_path,P.dataset.source="",P.innerHTML="",P.style.display="none")}let j=e.anomaly_history||[],M=v=>{let N=Number(v?.actual_value),X=Number(v?.baseline_used);if(Number.isFinite(N)&&Number.isFinite(X)&&X!==0){let J=(N-X)/Math.abs(X)*100,fe=J>=0?"higher":"lower";return`API returned ${u(N)}; baseline is ${u(X)} (${Math.abs(J).toFixed(1)}% ${fe}).`}return Number.isFinite(N)?`API returned ${u(N)}. Baseline is not available for comparison.`:v.why_flagged||v.ai_explanation||"No details yet."};if(r.apiIncidentHistory.innerHTML=j.length?j.slice(0,10).map(v=>`
        <div class="history-item">
          <div style="display:flex; justify-content:space-between; gap:12px;">
            <strong>${Xe(v.kpi_field)} \u2022 ${v.status||"active"}</strong>
            <span class="status-pill ${_t(v)}">${v.status||v.severity||"active"}</span>
          </div>
          <div class="muted">${M(v)}</div>
          <div class="tiny" style="margin-top:5px;">${v.change_since_last_healthy_run||"No earlier comparison details."}</div>
          <div class="tiny" style="margin-top:5px;">Detected ${te(v.detected_at)} \u2022 Baseline ${v.baseline_used==null?"not set":u(v.baseline_used)}</div>
          <div class="toolbar" style="margin-top:8px;">
            <button class="action ghost" type="button" onclick="showIncident(${v.id})">Open</button>
          </div>
        </div>
      `).join(""):be("No issues for this API yet."),a.length){let v=tt(a,s.runPage,8);s.runPage=v.page;let N=a.filter(re=>String(re?.trigger||"").toLowerCase()==="manual").length,X=a.filter(re=>String(re?.trigger||"").toLowerCase()==="scheduler").length,J=Number(C?.mismatch_runs||0),fe=a.filter(re=>{let ve=String(re?.status||"").toLowerCase();return ve==="error"||ve==="failed"}).length;r.apiRunTable.innerHTML=`
        ${J>0?`
          <div class="tiny muted" style="margin-bottom:8px;">
            Upload analysis found ${u(J)} mismatch segment(s). "PASSED" below refers to live check runs only.
          </div>
        `:""}
        <div class="table-toolbar">
          <div class="tiny">Run history (${u(a.length)} total)</div>
          <div class="tiny">Manual: ${u(N)} \u2022 Scheduled: ${u(X)} \u2022 Failed: ${u(fe)}</div>
        </div>
        <div class="table-wrap"><table class="row-table">
          <thead>
            <tr>
              <th>Started</th>
              <th>Trigger</th>
              <th>Result</th>
              <th>Work</th>
              <th>Details</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${v.items.map(re=>{let ve=Number(re?.anomalies_detected||0),Ae=Math.max(ve,J),_e=Os(String(re?.status||"unknown"),Ae),G=Number(re?.grains_processed||0);return`
                <tr>
                  <td>
                    <div>${te(re?.started_at)}</div>
                    <div class="tiny muted">Finished: ${te(re?.finished_at)}</div>
                  </td>
                  <td>
                    <div>${T(Ds(re?.trigger,re?.source))}</div>
                    <div class="tiny muted">${T(String(re?.source||"watch"))}</div>
                  </td>
                  <td>
                    <span class="status-pill ${_e.pillClass}" title="${T(_e.tooltip)}">${T(_e.label)}</span>
                    <div class="tiny muted" style="margin-top:6px;">Duration: ${T(Hs(re?.duration_ms))}</div>
                  </td>
                  <td>
                    <div>${u(G)} segment(s)</div>
                    <div class="tiny ${Ae>0?"":"muted"}">${u(Ae)} mismatch(es)</div>
                  </td>
                  <td>
                    <div class="tiny">Run ID: <code>${T(String(re?.run_id||"unknown"))}</code></div>
                    <div class="tiny">${re?.error?T(String(re.error)):"No error recorded."}</div>
                  </td>
                  <td>
                    <div class="toolbar compact">
                      ${ve>0?`<button class="action secondary tiny" type="button" onclick="setView('incidents')">Open Issues</button>`:J>0?`<button class="action ghost tiny" type="button" onclick="switchApiTab('history')">Upload Findings</button>`:`<button class="action ghost tiny" type="button" onclick="switchApiTab('summary')">View KPIs</button>`}
                      ${re?.error?`<button class="action ghost tiny" type="button" onclick="setView('errors')">Open Errors</button>`:""}
                    </div>
                  </td>
                </tr>
              `}).join("")}
          </tbody>
        </table></div>
        ${nt("runs",v.page,v.totalPages)}
      `}else{let v=(e.history&&e.history.length?e.history:e.recent_history)||[],N=G=>{if((Array.isArray(G?.comparisons)?G.comparisons.filter(oe=>oe?.kpi_field):[]).length)return!0;let de={};if(G?.kpi_json&&typeof G.kpi_json=="string")try{let oe=JSON.parse(G.kpi_json);oe&&typeof oe=="object"&&(de=oe)}catch{de={}}else G?.kpi_json&&typeof G.kpi_json=="object"&&(de=G.kpi_json);let $e=oe=>{if(oe==null)return!1;if(typeof oe=="number")return Number.isFinite(oe);if(typeof oe=="string"){let Be=oe.trim();return Be.length>0&&Number.isFinite(Number(Be))}return Array.isArray(oe)?oe.some(Be=>$e(Be)):typeof oe=="object"?Object.values(oe).some(Be=>$e(Be)):!1};return $e(de)},X=new Map;v.forEach(G=>{let ae=G.observed_at;ae&&(X.has(ae)||X.set(ae,[]),X.get(ae).push(G))});let J=new Set,fe=new Set;(e.references||[]).forEach(G=>{let ae=String(G?.grain_key||"").trim();if(!ae)return;let de=He(ae),$e=String(G?.kpi_field||"").trim(),oe=ct($e);J.add(ae),J.add(de),$e&&fe.add(`${de}__${$e}`),oe&&fe.add(`${de}__${oe}`)});let re=G=>{let ae=Array.isArray(G?.comparisons)?G.comparisons.filter(oe=>oe?.kpi_field):[];if(ae.length){let oe=He(String(G?.grain_key||"").trim());return ae.every(Be=>{let gn=String(Be?.kpi_field||"").trim(),Ls=ct(gn);return!fe.has(`${oe}__${gn}`)&&!fe.has(`${oe}__${Ls}`)})}if(!N(G))return!1;let de=String(G?.grain_key||"").trim();if(!de)return!0;let $e=He(de);return!J.has(de)&&!J.has($e)},ve=Array.from(X.entries()).map(([G,ae])=>({observed_at:G,obs_count:ae.length,status:ae.some(de=>(e.anomaly_history||[]).some($e=>$e.detected_at===G&&He(String($e.grain_key||""))===He(String(de.grain_key||""))))?"anomaly":ae.some(de=>N(de))?ae.every(de=>re(de))?"no_baseline":"healthy":"no_data"})).sort((G,ae)=>ae.observed_at.localeCompare(G.observed_at)),Ae=G=>G==="anomaly"?{pillClass:"danger",label:"Needs review",tooltip:"At least one metric moved outside your allowed tolerance."}:G==="no_data"?{pillClass:"warning",label:"No comparable values",tooltip:"A run happened, but no comparable numeric values were captured."}:G==="no_baseline"?{pillClass:"acknowledged",label:"Needs baseline",tooltip:"Values were captured, but this segment does not have an uploaded baseline yet."}:{pillClass:"healthy",label:"Within target",tooltip:"All compared metrics stayed within tolerance."},_e=tt(ve,s.runPage,8);s.runPage=_e.page,r.apiRunTable.innerHTML=ve.length?`
          <div class="table-toolbar">
            <div class="tiny">Monitoring runs</div>
          </div>
          <div class="table-wrap"><table class="sticky-first">
            <thead>
              <tr>
                <th>Observed</th>
                <th>Segments</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${_e.items.map(G=>{let ae=Ae(G.status);return`
                <tr>
                  <td>${te(G.observed_at)}</td>
                  <td>${G.obs_count} segments checked</td>
                  <td><span class="status-pill ${ae.pillClass}" title="${T(ae.tooltip)}">${T(ae.label)}</span></td>
                  <td>
                    ${G.status==="no_baseline"?'<button class="action secondary tiny" onclick="openUploadsTab()">Set baseline</button>':`<button class="action ghost tiny" onclick="showRunDetail('${G.observed_at}')">Examine details</button>`}
                  </td>
                </tr>
              `}).join("")}
            </tbody>
          </table></div>
          ${nt("runs",_e.page,_e.totalPages)}
        `:be("No checks for this API yet.")}s.uploadSort==="kpi_asc"&&(s.uploadSort="uploaded_at_desc");let H=Je(e.upload_activity||[],s.uploadSort,"uploaded_at"),R=new Map;H.forEach(v=>{let N=String(v?.uploaded_at||""),X=String(v?.grain_key||""),J=`${N}__${X}`;R.has(J)||R.set(J,{uploaded_at:v?.uploaded_at||null,grain_key:v?.grain_key||null,upload_source:v?.upload_source||null,metrics:[]}),R.get(J).metrics.push({kpi_field:String(v?.kpi_field||""),expected_value:v?.expected_value==null?null:Number(v?.expected_value)})});let ee=Array.from(R.values()).map(v=>({...v,metrics:[...v.metrics].sort((N,X)=>String(N.kpi_field||"").localeCompare(String(X.kpi_field||"")))})),Y=tt(ee,s.uploadPage,6);s.uploadPage=Y.page;let Q=[...e.upload_analysis_history||[]].sort((v,N)=>String(N?.analyzed_at||"").localeCompare(String(v?.analyzed_at||""))),ce=new Map;e.metrics&&e.metrics.forEach(v=>{v.calculation&&v.calculation.field&&ce.set(v.calculation.field,v.name)});let q=Q.length?`
        <div class="table-toolbar" style="margin-bottom:8px;">
          <div class="tiny">Upload analysis history</div>
          <div class="tiny">Latest first. Open any row to inspect per-segment outcomes.</div>
        </div>
        <div class="table-wrap" style="margin-bottom:12px;">
          <table class="row-table">
            <thead>
              <tr>
                <th>Analyzed</th>
                <th>Result</th>
                <th>Summary</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${Q.slice(0,8).map(v=>`
                <tr>
                  <td>${te(v.analyzed_at)}</td>
                  <td>
                    <span class="status-pill ${Bs(v.verdict)}">${Fs(v.verdict)}</span>
                    <div class="tiny muted" style="margin-top:6px;">
                      ${u(v.requested_grains)} segments \u2022 ${u(v.matched_runs)} matched \u2022 ${u(v.mismatch_runs)} mismatched \u2022 ${u(v.failed_runs)} errors
                    </div>
                  </td>
                  <td>${T(v.summary_message||"No summary available.")}</td>
                  <td>
                    <button
                      class="action ghost tiny"
                      type="button"
                      onclick="showUploadAnalysis('${String(v.analyzed_at||"").replace(/'/g,"\\\\'")}')"
                    >
                      ${w&&String(v.analyzed_at||"")===w?"Viewing":"Open"}
                    </button>
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
        ${Q.length>8?`<div class="tiny muted" style="margin-bottom:12px;">Showing latest 8 of ${Q.length} upload analysis runs.</div>`:""}
      `:`
        <div class="empty" style="margin-bottom:12px;">No upload analysis history yet.</div>
      `;if(r.uploadActivity.innerHTML=ee.length?`
        ${q}
        <div class="table-toolbar">
          <div class="toolbar">
            <select id="upload-sort">
              <option value="uploaded_at_desc" ${s.uploadSort==="uploaded_at_desc"?"selected":""}>Newest First</option>
              <option value="uploaded_at_asc" ${s.uploadSort==="uploaded_at_asc"?"selected":""}>Oldest First</option>
              <option value="grain_asc" ${s.uploadSort==="grain_asc"?"selected":""}>Segment A-Z</option>
            </select>
          </div>
          <div class="tiny">One row per uploaded segment event.</div>
        </div>
        <div class="table-wrap"><table class="row-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Segment</th>
              <th>Metrics in upload</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>
            ${Y.items.map(v=>`
              <tr>
                <td>${te(v.uploaded_at)}</td>
                <td>
                  <strong>${T(Jn(v.grain_key))}</strong>
                  <details class="upload-analysis-tech" style="margin-top:6px;">
                    <summary class="tiny muted">Technical key</summary>
                    <div class="tiny muted">${T(String(v.grain_key||""))}</div>
                  </details>
                </td>
                <td>
                  <div class="upload-event-metrics">
                    ${v.metrics.slice(0,2).map(N=>`
                      <div class="upload-event-metric">
                        <strong>${T(ce.get(N.kpi_field)||Xe(N.kpi_field))}</strong>
                        <span>${u(N.expected_value)}</span>
                      </div>
                    `).join("")}
                    ${v.metrics.length>2?`
                      <details class="upload-analysis-inline-more">
                        <summary>Show ${u(v.metrics.length-2)} more metric(s)</summary>
                        <div class="upload-event-metrics upload-event-metrics-more">
                          ${v.metrics.slice(2).map(N=>`
                            <div class="upload-event-metric">
                              <strong>${T(ce.get(N.kpi_field)||Xe(N.kpi_field))}</strong>
                              <span>${u(N.expected_value)}</span>
                            </div>
                          `).join("")}
                        </div>
                      </details>
                    `:""}
                  </div>
                </td>
                <td>${T(String(v.upload_source||"upload"))}</td>
              </tr>
            `).join("")}
          </tbody>
        </table></div>
        ${nt("uploads",Y.page,Y.totalPages)}
      `:`${q}${be("No baseline rows are stored for this API yet.")}`,ge(e.fields||[],e.setup_config||e.config||{},e.metrics||[]),Pe(),rt(),s.currentApiTab==="configuration"&&typeof window.refreshTimePreview=="function"&&requestAnimationFrame(()=>{window.refreshTimePreview()}),s.currentApiTab==="configuration"&&typeof window.runMagicGuess=="function"){let v=!!((e.setup_config?.dimension_fields||[]).length||(e.setup_config?.kpi_fields||[]).length||e.setup_config?.time_field),N=qn(e),X=String(e.endpoint_path||s.selectedApi||"").trim(),J=s.autoSuggestTriggeredByApi||{};!v&&N&&X&&!J[X]&&(J[X]=!0,s.autoSuggestTriggeredByApi=J,requestAnimationFrame(()=>{window.runMagicGuess(!1)}))}}function Qn(){let e=s.status?.project,t=e?.policy,n=String(e?.tier||"free").toLowerCase(),i=e?.license_enforced!==!1,a=t?.max_projects==null?"Unlimited":u(t?.max_projects),l=(s.status?.recent_errors||[]).find(b=>String(b?.source||"")==="middleware.db"&&/quarantin|corrupt/i.test(`${b?.message||""} ${b?.hint||""}`))||null,c=String(l?.hint||""),p=c.match(/Old DB moved to (.+?)\. Restore/i)?.[1]||c,w=l?`
      <div class="row-card danger" style="margin-bottom:12px; border-color:rgba(251, 113, 133, 0.35);">
        <strong>Storage Recovery Completed</strong>
        <div class="tiny" style="margin-top:6px;">
          Jin detected a DuckDB internal error and started with a fresh local database.
        </div>
        ${p?`<div class="tiny" style="margin-top:6px;">Backup file: <code>${T(p)}</code></div>`:""}
        <div class="toolbar" style="margin-top:10px;">
          <button class="action secondary" type="button" onclick="setView('errors')">Open Errors</button>
        </div>
      </div>
    `:"";r.settingsLicense.innerHTML=`
    <div class="row-card-inner">
      ${w}
      <div class="tiny" style="margin-bottom:12px;">
        Unique Site ID: <code class="site-id-code">${e?.site_id||"unknown"}</code>
      </div>
      
      <div class="license-status-card tier-${n}">
        <div class="license-status-header">
          <strong>Current Plan: <span class="tier-label">${n.toUpperCase()}</span></strong>
          <span class="status-badge ${n==="business"?"active":"basic"}">
            ${n==="business"?"Licensed":"Free Tier"}
          </span>
        </div>
        
        <div class="policy-limits">
          <div class="policy-limit-item">
            <span class="limit-label">Hosting Model</span>
            <span class="limit-value">Your Infrastructure</span>
          </div>
          <div class="policy-limit-item">
            <span class="limit-label">Project Limit</span>
            <span class="limit-value">${u(e?.projects_active)} / ${i?a:"Unlimited"}</span>
          </div>
        </div>

        ${i?n==="free"?`
          <p class="tiny muted" style="margin-top:16px;">
            Free tier allows 1 project per account. Activate Business for unlimited projects.
          </p>
        `:`
          <p class="tiny muted" style="margin-top:16px;">
            Business tier includes unlimited projects on your own infrastructure.
          </p>
        `:`
          <p class="tiny muted" style="margin-top:16px;">
            License enforcement is currently disabled. You can run Jin without activation in this build.
          </p>
        `}
      </div>

      <div class="activation-form" style="margin-top:20px;">
        <label>
          ${i?"Activate Business License":"Optional: Activate Business License"}
          <div class="activation-input-group">
            <input id="license-key-input" type="password" placeholder="BUS-ORG-XXXX-XXXX" />
            <button class="action" id="activate-license-button" type="button">Activate</button>
          </div>
        </label>
        <div id="license-feedback" class="tiny" style="margin-top:8px;"></div>
      </div>
    </div>
  `}function dt(e=null){let t=s.status?.endpoints||[],n=t.length>0,i=Array.isArray(s.lastReportData)&&s.lastReportData.length>0,a=r.reportsContent.dataset.reportPackReady==="1",o=s.reportsMessage,l=n?i?"Report is ready. Review risks, then export CSV.":"Step 1: Generate report. Step 2: Export CSV.":"";r.reportsFeedback.textContent=o?.text||l,r.reportsFeedback.className=`feedback feedback-banner${o?.kind==="error"?" danger":o?.kind==="success"?" success":o||l?" info":""}`,r.runReportButton.disabled=!n,r.runReportButton.title=n?"Step 1: Generate report":"No tracked APIs yet. Call your APIs first.",r.exportReportCsv.disabled=!n,r.exportReportCsv.textContent=i?"2) Export CSV":"Generate then Export CSV",r.exportReportCsv.title=n?i?"Step 2: Download the latest generated report CSV.":"Generate report and export in one click.":"No tracked APIs yet. Call your APIs first.";let c=r.reportEndpointSelect.value;if(r.reportEndpointSelect.innerHTML='<option value="">All tracked APIs</option>'+t.map(y=>`<option value="${y.endpoint_path}" ${y.endpoint_path===c?"selected":""}>${y.endpoint_path}</option>`).join(""),!e){if(!n){r.reportsContent.dataset.reportPackReady="0",r.reportsContent.innerHTML=`
        <div class="empty empty-center">
          <strong>No tracked APIs yet.</strong>
          <div class="tiny" style="margin-top:6px;">Generate one API response first, then create a report pack.</div>
          <div class="toolbar" style="margin-top:12px; justify-content:center;">
            <button class="action" type="button" data-view="playbook">Open PO Guide</button>
          </div>
        </div>
      `;return}if(a)return;r.reportsContent.dataset.reportPackReady="0",r.reportsContent.innerHTML=i?`
        <div class="row-card reports-start-card">
          <strong>Report is ready</strong>
          <div class="tiny" style="margin-top:8px;">
            Export CSV now, or regenerate first if you want a fresher snapshot before sharing.
          </div>
          <div class="toolbar" style="margin-top:10px;">
            <button class="action secondary" type="button" data-view="incidents">Open Issues</button>
          </div>
        </div>
      `:`
        <div class="row-card reports-start-card">
          <strong>Start here</strong>
          <ol class="reports-flow-steps">
            <li>Click <strong>1) Generate Report</strong> for all tracked APIs or one selected API.</li>
            <li>Review health and top risks, then click <strong>2) Export CSV</strong>.</li>
          </ol>
        </div>
      `;return}if(Array.isArray(e)){if(r.reportsContent.dataset.reportPackReady="0",e.length===0){r.reportsContent.innerHTML=be("No data found for this query.");return}let y=Object.keys(e[0]);r.reportsContent.innerHTML=`
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              ${y.map(m=>`<th>${m}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${e.map(m=>`
              <tr>
                ${y.map(A=>`<td>${u(m[A])}</td>`).join("")}
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;return}let d=e.summary||{},p=e.digest||{},w=e.endpoint_report||e.endpointReport||null,b=d.health||{},x=d.summary||{},C=Array.isArray(d.active_anomalies)?d.active_anomalies:[],E=p.totals||{},O=w?.baseline||{},D=Number(x.anomalies||0),h=Number(x.unconfirmed||0),k=D>=8?"high":D>0||h>0?"medium":"low",L=k==="low"?"Ready to share":k==="high"?"High risk":"Needs review",I=k==="low"?"resolved":k==="high"?"active":"acknowledged",F=Number(O.coverage_pct??0),_=Number.isFinite(F)?Math.max(0,Math.min(100,F)):0,B=e.generated_at?te(e.generated_at):te(new Date().toISOString()),$=D>0?"Open Issues next and resolve high-priority changes before sharing this report.":h>0?"Open APIs next and finish setup for unconfirmed endpoints.":"Monitoring is stable. Share this report and keep the current baseline targets.",V=D>0?{view:"incidents",label:"Open Issues"}:h>0?{view:"api",label:"Open APIs"}:{view:"overview",label:"Open Overview"},S=y=>{let m=String(y||"medium").toLowerCase();return m==="critical"?"Critical":m==="high"?"High":m==="low"?"Low":"Medium"},U=C.length?C.slice(0,5).map(y=>`
      <div class="reports-issue-item">
        <div class="reports-issue-main">
          <strong>${T(String(y.endpoint_path||"unknown endpoint"))}</strong>
          <div class="tiny" style="margin-top:4px;">
            ${T(String(y.kpi_field||"metric"))} moved ${Wn(y.pct_change)} \u2022 expected ${u(y.expected_value??y.baseline_used)} \u2022 actual ${u(y.actual_value)}
          </div>
        </div>
        <span class="status-pill ${_t(y)}">${T(S(y.severity))}</span>
      </div>
    `).join(""):D>0?'<div class="history-item">Open risks exist, but detailed rows are not loaded in this view. Open Issues to triage the full queue.</div>':'<div class="history-item">No active issues right now.</div>';r.reportsContent.dataset.reportPackReady="1",r.reportsContent.innerHTML=`
    <div class="row-card reports-flow-card">
      <strong>Report Snapshot</strong>
      <div class="tiny" style="margin-top:8px;">
        Last generated: ${B}
      </div>
      <div class="tiny muted reports-last-generated" style="margin-top:4px;">
        Review health and risks first, then export this snapshot.
      </div>
    </div>

    <div class="reports-health-banner reports-health-${k}">
      <div>
        <strong>Project Health</strong>
        <div class="tiny" style="margin-top:8px;">
          Status: ${u(b.status||"unknown")} \u2022 APIs: ${u(x.total_endpoints||0)} \u2022 Healthy: ${u(x.healthy||0)} \u2022 Issues: ${u(D)}
        </div>
        <div class="tiny muted" style="margin-top:4px;">
          ${k==="high"?"Share readiness: hold until high-risk issues are triaged.":k==="medium"?"Share readiness: review open issues and setup gaps first.":"Share readiness: clear to share this report snapshot."}
        </div>
      </div>
      <div class="reports-health-tags">
        <span class="status-pill ${I}">${L}</span>
        <span class="tiny muted">Setup pending: ${u(h)}</span>
      </div>
    </div>

    <div class="report-grid reports-summary-grid">
      <div class="row-card reports-summary-card">
        <strong>Open Risks</strong>
        <span>${u(D)}</span>
        <div class="tiny muted" style="margin-top:6px;">Active issues needing triage</div>
      </div>
      <div class="row-card reports-summary-card">
        <strong>Setup Pending</strong>
        <span>${u(h)}</span>
        <div class="tiny muted" style="margin-top:6px;">APIs waiting for full setup</div>
      </div>
      <div class="row-card reports-summary-card">
        <strong>Leadership Digest (7d)</strong>
        <span>${u(E.runs||0)}</span>
        <div class="tiny muted" style="margin-top:6px;">Runs \u2022 Success ${u(E.success||0)} \u2022 Errors ${u(E.errors||0)}</div>
      </div>
    </div>

    <div class="row-card reports-next-step-card" style="margin-top:12px;">
      <strong>Recommended Next Step</strong>
      <div class="tiny" style="margin-top:8px;">${$}</div>
      <div class="toolbar" style="margin-top:10px;">
        <button class="action" type="button" data-view="${V.view}">${V.label}</button>
      </div>
    </div>

    <div class="row-card reports-issues-card" style="margin-top:12px;">
      <strong>Top Active Issues</strong>
      <div class="tiny muted" style="margin-top:6px;">Showing up to 5 highest-priority items for quick review.</div>
      <div class="reports-issues-list" style="margin-top:10px;">
        ${U}
      </div>
      <div class="toolbar" style="margin-top:10px;">
        <button class="action secondary" type="button" data-view="incidents">Open Issues</button>
      </div>
    </div>

    ${w?`
      <div class="row-card reports-endpoint-card" style="margin-top:12px;">
        <strong>Endpoint Snapshot</strong>
        <div class="tiny" style="margin-top:8px;">
          ${T(String(w.endpoint_path||"Selected endpoint"))} \u2022 anomalies ${u(w.anomaly_count||0)} \u2022 baseline rows ${u(O.total_reference_rows||0)}
        </div>
        <div class="reports-coverage-track" aria-label="Endpoint baseline coverage">
          <span style="width:${_.toFixed(1)}%"></span>
        </div>
        <div class="tiny" style="margin-top:6px;">
          APIs with baseline for this endpoint: ${u(O.endpoints_with_baseline||0)} \u2022 coverage ${u(_)}%
        </div>
      </div>
    `:""}
  `}var Zt="jin-po-mode",as="jin-po-mode-explicit";function os(e,t={}){let n=!!e;if(s.poMode=n,localStorage.setItem(Zt,n?"on":"off"),t.explicit!==!1&&localStorage.setItem(as,"1"),r.poModeToggle.checked!==n&&(r.poModeToggle.checked=n),s.selectedApi){let i=Z();i&&le(i)}t.toast!==!1&&f(n?"PO Mode is ON. Advanced controls are simplified, but Segment/Metric/Exclude/Time editing stays available.":"PO Mode is OFF. Advanced setup controls are fully visible.","success")}function ls(e={}){s.incidentStatusFilter="",s.incidentSeverityFilter="",s.incidentPage=1,e.persist!==!1&&pe();let t=document.getElementById("incident-status-select");t&&(t.value="");let n=document.getElementById("incident-severity-select");n&&(n.value=""),e.render!==!1&&Re()}function Zn(e){if(!e)return[];try{let t=JSON.parse(e);return Array.isArray(t)?t:[]}catch{return[]}}function cs(){let e=Zn(localStorage.getItem(Ht()));if(e.length){s.savedViews=e.slice(0,12);return}if(Le(s.operatorHandle||"default")==="default"){s.savedViews=Zn(localStorage.getItem("jin-named-views")).slice(0,12);return}s.savedViews=[]}function nn(){let e=Le(s.operatorHandle||localStorage.getItem("jin-operator-handle")||"default");if(!(!e||e==="default"))return e}function pt(e){let t=Le(e||"");if(!(!t||t==="default"))return t}function Ws(){let e=document.getElementById("operator-handle-input"),t=Le(e?.value||"default");e&&(e.value=t),s.operatorHandle=t,localStorage.setItem("jin-operator-handle",t),cs(),Pe(),f(`Operator handle set to "${t}".`,"success")}function en(e){if(!e)return{};let t={...e};if(e.dimension_json)if(typeof e.dimension_json=="string")try{Object.assign(t,JSON.parse(e.dimension_json))}catch{}else Object.assign(t,e.dimension_json);if(e.kpi_json)if(typeof e.kpi_json=="string")try{Object.assign(t,JSON.parse(e.kpi_json))}catch{}else Object.assign(t,e.kpi_json);return t}function Ce(e,t){if(!e||!t)return;if(Object.prototype.hasOwnProperty.call(e,t))return e[t];let n=String(t).split(".").filter(Boolean);if(!n.length)return;let i=(a,o)=>{if(a==null)return;if(o>=n.length)return a;let l=n[o],c=l.endsWith("[]"),d=c?l.slice(0,-2):l;if(!c)return i(a?.[d],o+1);let p=d?a?.[d]:a;if(!(!Array.isArray(p)||!p.length)){if(o===n.length-1)return p;for(let w of p){let b=i(w,o+1);if(b!=null)return b}return i(p[0],o+1)}};return i(e,0)}function gt(e){if(e==null)return!1;if(Array.isArray(e))return e.some(n=>gt(n));let t=String(e).trim();return t?/^\d{10,13}$/.test(t)||/^\d{4}-\d{2}-\d{2}/.test(t)?!0:!Number.isNaN(Date.parse(t)):!1}function Yt(e){if(e==null)return null;let t=String(e).trim();if(!t)return null;let n;if(/^\d{10,13}$/.test(t)){let i=Number(t),a=t.length<=10?i*1e3:i;n=new Date(a)}else n=new Date(t);return Number.isNaN(n.getTime())?null:n.toISOString().split("T")[0]}function mt(e){let t=Array.isArray(e?.history)?e.history:[],n=Array.isArray(e?.recent_history)?e.recent_history:[],i=t.length?t:n;if(i.length)return[...i].sort((p,w)=>String(w?.observed_at||"").localeCompare(String(p?.observed_at||""))).map(p=>en(p));let a=e?.schema_contract&&typeof e.schema_contract=="object"?e.schema_contract:{},o=Array.isArray(a?.example_rows)?a.example_rows.filter(d=>d&&typeof d=="object"):[];if(o.length)return o.map(d=>en(d));let l=Array.isArray(a?.fields)?a.fields:Array.isArray(e?.fields)?e.fields:[],c={};return l.forEach(d=>{if(!d||typeof d!="object")return;let p=String(d?.name||"").trim();p&&(d?.example===void 0||d?.example===null||(c[p]=d.example))}),Object.keys(c).length?[c]:[]}function ds(e,t){return e.map(n=>Ce(n,t)).filter(n=>n!=null&&n!=="")}function us(e,t){let n=Array.isArray(e?.fields)?e.fields:[],i=new Set(e?.setup_config?.dimension_fields||[]),a=[];if(n.forEach(l=>{let c=String(l?.name||l||"").trim();if(!c)return;let d=c.toLowerCase(),p=String(l?.annotation||l?.type||"").toLowerCase(),w=t.length?Ce(t[0],c):void 0,b=0;(p==="datetime"||p==="date")&&(b+=7),(d.includes("snapshot")||d.includes("timestamp")||d.includes("created_at")||d.includes("updated_at")||d.includes("date")||d.includes("time")||d.endsWith(".period")||d.endsWith("_period")||d==="period")&&(b+=4),gt(w)&&(b+=4),i.has(c)&&(b+=1),b>0&&a.push({name:c,score:b})}),!a.length)return null;a.sort((l,c)=>c.score-l.score||l.name.localeCompare(c.name));let o=a[0];return o.score>=5?o.name:null}function Ks(e,t){if(!e?.setup_config||e.setup_config.time_field)return!1;let n=us(e,t);return n?(e.setup_config.time_field=n,e.setup_config.dimension_fields=(e.setup_config.dimension_fields||[]).filter(i=>i!==n),e.setup_config.kpi_fields=(e.setup_config.kpi_fields||[]).filter(i=>i!==n),e.setup_config.excluded_fields=(e.setup_config.excluded_fields||[]).filter(i=>i!==n),!0):!1}function Xs(e,t){let n=Array.isArray(e?.fields)?e.fields:[];return n.length?n.some(i=>{let a=String(i?.name||i||"").trim();if(!a)return!1;let o=a.toLowerCase(),l=String(i?.annotation||i?.type||"").toLowerCase();return l==="datetime"||l==="date"||o.includes("time")||o.includes("date")||o.includes("timestamp")||o.includes("created_at")||o.includes("updated_at")||o.includes("period")?!0:ds(t,a).some(d=>gt(d))}):!1}function ps(e,t){if(t?.time_required===!1)return!1;if(String(t?.time_field||"").trim())return!0;let i=mt(e);return us(e,i)?!0:Xs(e,i)}function Pt(e,t){return e instanceof Element?e.closest(t):null}var es=0,gs="jin-status-cache-v2";function se(e){return e?e instanceof Ie||e instanceof Error?e.message:String(e):"Unknown error"}function ms(e){let t=se(e).toLowerCase();return t.includes("failed to fetch")||t.includes("connection reset")||t.includes("network")||t.includes("timed out")||t.includes("timeout")||t.includes("abort")}function W(e,t="Request failed."){let n=se(e)||t;if(ms(e)){let i=Date.now();i-es>3e3&&(f("Jin backend is temporarily unreachable. Retrying may help after the server stabilizes.","error"),es=i);return}f(n||t,"error")}function Ys(e){if(ms(e))return{state:"unavailable",message:"Cannot reach Jin backend. Start or restart your app to load APIs."};if(e instanceof Ie){if(e.status===401||e.status===403)return{state:"auth_required",message:"Authentication expired. Sign in again to load APIs."};if(typeof e.status=="number")return{state:"error",message:`Jin backend returned ${e.status} while loading APIs. Retry and check logs if this continues.`}}return{state:"error",message:"Jin backend returned an unexpected error while loading APIs. Retry and check logs if this continues."}}function Qs(){if(s.status)try{localStorage.setItem(gs,JSON.stringify({saved_at:new Date().toISOString(),payload:s.status}))}catch{}}function fs(){try{let e=localStorage.getItem(gs);if(!e)return!1;let t=JSON.parse(e);return!t||typeof t!="object"||!t.payload?!1:(s.status=t.payload,s.apiDataUpdatedAt=String(t.saved_at||""),!0)}catch{return!1}}function ye(){let e=String(r.projectActiveSelect.value||"").trim();if(e)return e;if(s.activeProjectId)return String(s.activeProjectId);let t=s.projectsCatalog?.find(n=>n.active&&!n.is_archived)?.id||s.projectsCatalog?.find(n=>!n.is_archived)?.id||s.projectsCatalog?.[0]?.id;return t?String(t):null}function xe(e=ye()){return e&&s.projectsCatalog?.find(t=>String(t.id)===String(e))||null}function Lt(){let e=String(s.activeProjectId||"").trim();if(e){let n=s.projectsCatalog?.find(i=>String(i.id)===e);if(n&&!n.is_archived)return e}let t=s.projectsCatalog?.find(n=>!n.is_archived)?.id;return t?String(t):null}function sn(){let e=String(r.projectPolicyThreshold.value||"").trim(),t=e?Number(e):null;return{cadence_template:String(r.projectPolicyCadence.value||"balanced"),schedule:String(r.projectPolicySchedule.value||"every 2h"),baseline_mode:String(r.projectPolicyBaselineMode.value||"fixed"),threshold:Number.isFinite(t)?t:null,bundle_enabled:!!r.projectPolicyBundleEnabled.checked,bundle_schedule:String(r.projectPolicyBundleSchedule.value||"").trim()||"daily 09:00",bundle_report_format:String(r.projectPolicyBundleFormat.value||"markdown")}}function ft(){return Array.isArray(s.status?.endpoints)?s.status.endpoints.length:0}function Zs(){return(Array.isArray(s.scheduler?.jobs)?s.scheduler.jobs:[]).filter(t=>{let n=String(t?.job_id||"");if(!n||n.startsWith("jin:bundle:"))return!1;let i=String(t?.job_type||"").toLowerCase();if(i&&i!=="watch")return!1;let a=String(t?.skip_reason||"");return!(a==="missing_default_params"||a==="unsupported_schedule"||!String(t?.endpoint_path||t?.path||"").trim())}).length}function rn(e){let t=Array.isArray(e?.results)?e.results:[],n=new Set;t.forEach(a=>{if(!a||a.ok)return;let o=String(a.reason||"").trim();o&&n.add(o)});let i=[];return n.has("missing_default_params")&&i.push("Some APIs are missing default parameters. Open APIs and set watch defaults first."),n.has("unsupported_schedule")&&i.push("Setup contains an unsupported schedule format. Use every Nh, daily HH:MM, or weekly mon[,tue] HH:MM."),n.has("endpoint_not_found")&&i.push("Some APIs listed in setup are no longer available in this runtime."),!i.length&&t.some(a=>!a?.ok)&&i.push("Some APIs could not be scheduled yet. Review API setup and retry."),i}async function Ve(e=!0){let t=await $n(!0),n=t.projects||[];if(s.projectsCatalog=n,s.activeProjectId=String(t.active_project_id||n.find(c=>c.active&&!c.is_archived)?.id||n.find(c=>!c.is_archived)?.id||n[0]?.id||"")||null,!e)return;let i=String(r.projectActiveSelect.value||"").trim(),a=i?n.find(c=>String(c.id)===i):null,o=a&&!a.is_archived?i:Lt();if(!o){s.projectMonitorPolicy=null,s.projectPolicyLoadedFor=null;return}let l=await qt(o);s.projectMonitorPolicy=l.monitor_policy||null,s.projectPolicyLoadedFor=o}async function je(e,t=!1){if(!e){s.projectHealth=null,s.projectRunHistory=[],t&&(s.projectDigest=null);return}let[n,i]=await Promise.all([Gt(e),Pn(e,12)]);s.projectHealth=n,s.projectRunHistory=i.runs||[],t&&(s.projectDigest=await Wt(e,7,200))}async function Et(e=!1){s.poPlaybook&&!e||(s.poPlaybook=await Cn())}async function we(e,t,n){let i=e.textContent||"Run";e.disabled=!0,e.textContent=t;try{await n()}finally{e.disabled=!1,e.textContent=i}}function z(e,t="info"){s.projectWorkflowMessage={text:e,kind:t},K()}function me(e,t="info"){s.incidentsMessage={text:e,kind:t},s.currentView==="incidents"&&Re()}function Oe(e,t="info"){s.reportsMessage={text:e,kind:t},s.currentView==="reports"&&dt()}function ei(e){let t=e?.summary||{},n=e?.digest||{},i=e?.endpoint_report||e?.endpointReport||null,a=t.health||{},o=t.summary||{},l=Array.isArray(t.active_anomalies)?t.active_anomalies:[],c=n.totals||{},d=i?.baseline||{},p=Number(o.anomalies||0)>0?"Open Issues next and resolve high-priority changes before sharing this report.":Number(o.unconfirmed||0)>0?"Open APIs next and finish setup for unconfirmed endpoints.":"Monitoring is stable. Share this report and keep the current baseline.",w=[{row_type:"summary",generated_at:e?.generated_at||new Date().toISOString(),report_scope:e?.endpoint_path||"all_tracked_apis",focus_note:e?.focus||"",project_status:a.status||"unknown",tracked_apis:Number(o.total_endpoints||0),healthy_apis:Number(o.healthy||0),open_issues:Number(o.anomalies||0),setup_pending:Number(o.unconfirmed||0),digest_runs_7d:Number(c.runs||0),digest_success_7d:Number(c.success||0),digest_errors_7d:Number(c.errors||0),recommendation:p}];return l.slice(0,20).forEach((b,x)=>{w.push({row_type:"top_issue",rank:x+1,endpoint_path:String(b?.endpoint_path||""),kpi_field:String(b?.kpi_field||""),pct_change:Number(b?.pct_change||0),expected_value:b?.expected_value??b?.baseline_used??"",actual_value:b?.actual_value??"",severity:String(b?.severity||""),status:String(b?.status||"")})}),i&&w.push({row_type:"endpoint_snapshot",endpoint_path:String(i?.endpoint_path||e?.endpoint_path||""),endpoint_anomalies:Number(i?.anomaly_count||0),endpoint_baseline_rows:Number(d?.total_reference_rows||0),endpoint_baseline_coverage_pct:Number(d?.coverage_pct||0),endpoint_baseline_apis_with_data:Number(d?.endpoints_with_baseline||0)}),w}function an(e){if(!Number.isFinite(e)||e<=0)return"0 B";let t=["B","KB","MB","GB"],n=e,i=0;for(;n>=1024&&i<t.length-1;)n/=1024,i+=1;return`${n.toFixed(n>=100||i===0?0:1)} ${t[i]}`}function Qt(e,t){if(!e)return;let n=s.autoSuggestSummaryByApi||{};s.autoSuggestSummaryByApi={...n,[e]:{...t,updatedAt:new Date().toISOString()}}}function Se(e,t){if(!e)return;let n=s.coreInsightsByApi||{};s.coreInsightsByApi={...n,[e]:{...t,updatedAt:new Date().toISOString()}}}function ti(e,t){let n=(t?.anomaly_history||[]).filter(o=>String(o?.status||"active")!=="resolved"),i=(t?.upload_activity||[]).length>0,a=Array.isArray(t?.recent_history)?t.recent_history.length:0;if(n.length>0){Se(e,{title:"Insight: review active issues",summary:`${n.length} issue${n.length===1?"":"s"} are outside expected range after the latest check.`,kind:"error",actionType:"view",actionValue:"incidents",actionLabel:"Open Issues"});return}if(!i){Se(e,{title:"Insight: baseline still needed",summary:"Checks can run, but meaningful pass/fail insight needs an uploaded baseline for this API.",kind:"info",actionType:"tab",actionValue:"uploads",actionLabel:"Set Baseline"});return}if(a===0){Se(e,{title:"Insight: waiting for first run",summary:"Setup is saved. Trigger a check to create the first monitoring result.",kind:"info",actionType:"tab",actionValue:"history",actionLabel:"Open Checks"});return}Se(e,{title:"Insight: monitoring is stable",summary:"Latest check stayed within target. Continue monitoring and review this page for new changes.",kind:"success",actionType:"view",actionValue:"overview",actionLabel:"Open Overview"})}function hs(e,t,n=0){let i=String(t?.verdict||"").toLowerCase(),a=Number(t?.mismatch_runs||0),o=Number(t?.matched_runs||0),l=Number(t?.failed_runs||0),c=t?.issues_sync&&typeof t.issues_sync=="object"?t.issues_sync:null,d=Number(c?.created||0),p=Number(c?.updated||0),w=d>0?` ${d} mismatch${d===1?"":"es"} were added to Issues automatically.`:p>0?` ${p} existing mismatch issue${p===1?"":"s"} were refreshed in Issues.`:"";if(i==="matched"&&a===0&&l===0){Se(e,{title:"Insight: baseline upload is clean",summary:`Upload completed. ${o} segment${o===1?"":"s"} matched expected targets.`,kind:"success",actionType:"tab",actionValue:"history",actionLabel:"Review Checks"});return}if(a>0){Se(e,{title:"Insight: some segments need review",summary:`${a} segment${a===1?"":"s"} are outside expected targets after upload analysis.${w}`,kind:"error",actionType:"view",actionValue:"incidents",actionLabel:"Open Issues"});return}if(l>0){Se(e,{title:"Insight: upload analysis had errors",summary:`${l} segment${l===1?"":"s"} could not be analyzed. Check upload details and retry if needed.`,kind:"error",actionType:"tab",actionValue:"uploads",actionLabel:"Review Upload"});return}Se(e,{title:"Insight: upload finished",summary:`Imported ${n} reference row${n===1?"":"s"}. Run checks to validate against live responses.`,kind:"info",actionType:"tab",actionValue:"history",actionLabel:"Open Checks"})}function ys(e){let t=e?.issues_sync&&typeof e.issues_sync=="object"?e.issues_sync:null,n=Number(t?.created||0),i=Number(t?.updated||0);if(n>0){let a=`Added ${n} mismatch issue${n===1?"":"s"} to Issues automatically.`;f(a,"success"),me(a,"success");return}if(i>0){let a=`Refreshed ${i} existing mismatch issue${i===1?"":"s"} in Issues automatically.`;f(a,"info"),me(a,"info")}}var ut=new Set,on=new Map;function Mt(e){e&&on.delete(e)}function ts(e,t){!e||!t||on.set(e,t)}function ns(e,t){return!e||!t?!1:on.get(e)===t}function ln(e){return`jin-upload-job:${e}`}function cn(e,t){if(!e||!t)return;let n=s.activeUploadJobByApi||{};s.activeUploadJobByApi={...n,[e]:t},localStorage.setItem(ln(e),t)}function Ne(e){if(!e)return;let t={...s.activeUploadJobByApi||{}};delete t[e],s.activeUploadJobByApi=t,localStorage.removeItem(ln(e))}function ni(e){switch(String(e||"").toLowerCase()){case"queued":return"Queued";case"parsing":return"Reading file";case"validating":return"Validating rows";case"importing":return"Saving baseline";case"analyzing":return"Running checks";case"completed":return"Completed";case"failed":return"Failed";default:return"Processing upload"}}function ss(e){switch(String(e||"").toLowerCase()){case"queued":return"Queued for deep validation";case"running":return"Deep validation in progress";case"completed":return"Deep validation complete";case"failed":return"Deep validation failed";default:return"No deep validation"}}function tn(e){let t=String(e||"").trim();if(!t)return null;let n=Date.parse(t);return Number.isFinite(n)?n:null}var is=15e3,rs=12e3;async function si(e,t){let n=new FormData;n.append("file",t);let i=await fetch(`/jin/api/v2/upload-async/${ue(e)}`,{method:"POST",body:n}),a=await i.json();if(!i.ok||!a?.job_id)throw new Error(a?.error||a?.detail||"Could not start upload job.");return String(a.job_id)}async function vs(e){let t=await fetch(`/jin/api/v2/upload-async/${encodeURIComponent(e)}`),n=await t.json();if(!t.ok)throw new Error(n?.detail||n?.error||"Upload job status is unavailable.");return n}async function Ct(e){if(!e||ut.has(e))return;let t=(s.activeUploadJobByApi||{})[e],n=localStorage.getItem(ln(e))||"",i=(t||n||"").trim(),a=Date.now();if(i){if(ns(e,i)){Ne(e);return}try{let o=await vs(i),l=String(o?.status||"").toLowerCase(),c=!!o?.done||l==="completed"||l==="failed",d=tn(o?.updated_at||o?.created_at),p=d!==null&&a-d>120*1e3,w=(l==="running"||l==="queued")&&!o?.task_active&&p;(c||w)&&(Ne(e),i="")}catch{Ne(e),i=""}}if(i){if(ns(e,i)){Ne(e);return}cn(e,i),bs(e,i,{quiet:!0})}}async function ii(e,t){let n=Number(t?.imported||0);s.selectedApi===e&&(r.uploadFeedback.textContent=`Imported ${n} reference rows.`),f("Reference upload finished.","success"),s.detailCache.delete(e),await ie(!0),s.selectedUploadAnalysisAt=null,s.selectedApi===e&&Fe("history","replace");let i=t?.analysis||null;if(i){let a=i.verdict==="matched"?"success":"error";f(i.summary_message||"Upload analysis finished.",a);let o=i.errors&&i.errors.length?i.errors[0]?.error:null;o&&f(`Analysis error: ${o}`,"error"),hs(e,i,n),ys(i)}else Se(e,{title:"Insight: upload completed",summary:`Imported ${n} reference row${n===1?"":"s"}. Run checks to compare live data against this baseline.`,kind:"info",actionType:"tab",actionValue:"history",actionLabel:"Open Checks"});if(await ie(!0),s.selectedApi===e){s.detailCache.delete(e);let a=await We(e);s.activeApiDetail=a,le(a)}}async function bs(e,t,n={}){if(!e||!t||ut.has(e))return;ut.add(e),cn(e,t);let i=!1,a=!1,o=null;s.selectedApi===e&&(r.uploadButton.disabled=!0,r.previewUploadButton.disabled=!0);let l=Date.now();try{for(;;){let c=await vs(t),d=Math.max(0,Math.min(100,Number(c?.progress_pct||0))),p=Number(c?.rows_in_file||0),w=Number(c?.columns_in_file||0),b=Number(c?.file_size_bytes||0),x=p||w||b?` \u2022 ${u(p)} row(s) \xD7 ${u(w)} column(s) \u2022 ${an(b)}`:"";if(s.selectedApi===e)if(!i)r.uploadFeedback.textContent=`${ni(c?.stage||c?.status)} ${Math.round(d)}%${x}`;else{let h=String(c?.followup_status||"not_requested"),k=String(c?.followup_message||"").trim();r.uploadFeedback.textContent=k?`${ss(h)} \u2022 ${k}`:ss(h)}if(String(c?.status||"").toLowerCase()==="failed"){Ne(e),Mt(e);let h=c?.result||{},k=String(h?.error||c?.error||c?.message||"Reference upload failed.");s.selectedApi===e&&(r.uploadFeedback.textContent=k),f(k,"error"),s.selectedApi===e?await qe(e,"replace"):await ie(!0);return}let C=String(c?.status||"").toLowerCase(),E=tn(c?.updated_at||c?.created_at||c?.followup_started_at),O=Date.now();if((C==="running"||C==="queued")&&!c?.task_active&&(E!==null&&O-E>is||E===null&&O-l>is)){ts(e,t),Ne(e),s.selectedApi===e&&(r.uploadFeedback.textContent="A stale upload tracker was cleared after restart. You can continue with Check file or start a fresh upload."),n.quiet||f("Cleared a stale upload tracker from a previous server session.","info");return}if(c?.done||String(c?.status||"").toLowerCase()==="completed"){let h=String(c?.followup_status||"not_requested").toLowerCase(),k=!!c?.followup_task_active,L=h==="queued"||h==="running",I=k||L,F=tn(c?.updated_at||c?.followup_started_at||c?.created_at),_=!!(L&&!k&&(F!==null&&Date.now()-F>rs||F===null&&o!==null&&Date.now()-o>rs));if(!i){if(await ii(e,c?.result||{}),i=!0,o=Date.now(),s.selectedApi===e&&(r.previewUploadButton.disabled=!1),I){f("Baseline imported. Running deep validation in the background.","success"),await new Promise(B=>setTimeout(B,2e3));continue}Ne(e);return}if(_){Ne(e),ts(e,t),s.selectedApi===e&&(r.uploadFeedback.textContent="Baseline import completed. Deep validation tracker became stale; continue with Checks/Issues."),n.quiet||f("Baseline import is complete. Deep validation tracking was stale, so live polling stopped.","info");return}if(I){await new Promise(B=>setTimeout(B,2e3));continue}if(Ne(e),Mt(e),!a&&(h==="completed"||h==="failed")){if(a=!0,h==="completed"){let B=c?.result?.full_analysis;if(B?.summary_message){f(B.summary_message,B.verdict==="matched"?"success":"error");let $=Number(c?.result?.imported||0);hs(e,B,$),ys(B)}else f("Deep validation finished.","success")}else{let B=String(c?.followup_message||"Deep validation failed.");f(B,"error")}if(await ie(!0),s.selectedApi===e){s.detailCache.delete(e);let B=await We(e);s.activeApiDetail=B,le(B)}}return}if(Date.now()-l>600*1e3){n.quiet||f("Upload is still running. You can keep working and return to this API anytime.","success");return}await new Promise(h=>setTimeout(h,i?2e3:850))}}catch(c){n.quiet||W(c,"Could not monitor upload progress.")}finally{ut.delete(e),s.selectedApi===e&&(r.uploadButton.disabled=!1,r.previewUploadButton.disabled=!1,r.uploadButton.textContent="Confirm upload")}}function Me(e){return String(e??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function ke(e){let t=document.querySelector(`#nav button[data-view="${e}"]`);t&&t.click()}function ri(){let e="",t="",n="",i="brand",a=null,o=s.status?.endpoints||[],l=Ee().filter(_=>String(_.status||"active")!=="resolved"),c=l[0]||null,d=o.find(_=>_.endpoint_path===s.selectedApi)||null,p=Z(),w=p?.operator_metadata?.confirmed??d?.confirmed??!1,b=!!(p?.upload_activity&&p.upload_activity.length>0||d?.last_upload_at),x=!!(p?.recent_history||[]).length,C=(p?.anomaly_history||[]).filter(_=>String(_?.status||"active")!=="resolved").length,E=String(s.status?.project?.tier||"free").toLowerCase(),O=s.status?.project?.license_enforced!==!1,D=(s.status?.recent_errors||[]).find(_=>String(_?.source||"")==="middleware.db"&&/quarantin|corrupt/i.test(`${_?.message||""} ${_?.hint||""}`))||null,h=String(D?.hint||""),L=h.match(/Old DB moved to (.+?)\. Restore/i)?.[1]||h,I=D?`Storage recovery: Jin reset the local DB after an internal DuckDB error.${L?` Backup: ${L}`:""}`:"";if(s.currentView==="overview")e="See overall data quality health and quickly choose where to act next.",l.length>0?(t=`${l.length} issue${l.length===1?"":"s"} still need review.`,n="Open Issues",a=()=>ke("incidents")):(t="No active issues right now.",n="Open APIs",a=()=>ke("api"));else if(s.currentView==="playbook")e="Use a guided PO flow: setup once, validate baselines, monitor drift, and report with confidence.",t="Start with setup workflow, then use Checks, Issues, and Reports for day-to-day operations.",n="Start With Register",a=()=>{let _=document.getElementById("project-register-name");_&&(_.focus(),_.scrollIntoView({behavior:"smooth",block:"center"}))};else if(s.currentView==="api")e="Configure one API, set baseline targets, and run checks for that endpoint.",s.selectedApi?w?b?x?C>0?(t=`${C} issue${C===1?"":"s"} need review for ${s.selectedApi}.`,n="Review Issues",a=()=>ke("incidents")):(t=`${s.selectedApi} is stable after recent checks.`,n="Open Reports",a=()=>{s.currentView="reports",he("push"),K(),r.reportEndpointSelect&&(r.reportEndpointSelect.value=s.selectedApi||"")}):(t=`${s.selectedApi} is configured and has baseline, but no check run yet.`,n="Open Monitor",a=()=>Fe("history")):(t=`${s.selectedApi} has no uploaded baseline yet.`,n="Upload Baseline",a=()=>Cs()):(t=`${s.selectedApi} still needs setup confirmation.`,n="Finish Setup",a=()=>Fe("configuration")):o.length?(t="Choose one API from the left list to continue.",n="Open First API",a=()=>qe(o[0].endpoint_path)):s.apiDataState==="auth_required"?(t="Your Jin session expired, so API discovery is paused.",n="Sign In",a=()=>{window.location.href="/jin/login?next=/jin"}):s.apiDataState==="error"?(t="Jin returned an error while loading APIs.",n="Retry Connection",a=()=>ie(!1)):s.apiDataState==="unavailable"?(t="Cannot reach Jin backend right now, so API discovery is temporarily unavailable.",n="Retry Connection",a=()=>ie(!1)):(t="No APIs discovered yet.",n="Open PO Guide",a=()=>ke("playbook"));else if(s.currentView==="incidents")e="Triage changes and decide: expected baseline, in review, or resolved.",c?(t=`${l.length} unresolved issue${l.length===1?"":"s"} currently open.`,n="Review Top Issue",a=()=>kt(c)):(t="No unresolved issues right now.",n="Open APIs",a=()=>ke("api"));else if(s.currentView==="errors"){let B=(s.status?.recent_errors||[]).filter($=>String($.status||"open")!=="archived").length;e="Track runtime or scheduler failures and route them to the right owner quickly.",t=B>0?`${B} open error${B===1?"":"s"} need acknowledgement or fixing.`:"No open errors right now.",n="Back To Issues",i="secondary",a=()=>ke("incidents")}else if(s.currentView==="scheduler"){let _=s.scheduler?.jobs||[];e="Control scheduled monitoring runs: pause, resume, retry, or run now.",_.length>0?(t=`${_.length} watch job${_.length===1?"":"s"} configured.`,n="Run First Watch Now",a=()=>Ms(_[0].job_id,"run")):(t="No watch jobs found yet.",n="Open APIs",a=()=>ke("api"))}else if(s.currentView==="reports"){e="Generate leadership-ready report packs with health, risk, and next steps.";let _=Array.isArray(s.lastReportData)&&s.lastReportData.length>0;o.length?_?(t="Report pack is ready. Export CSV when this snapshot is ready to share.",n="Export CSV",a=()=>Ss()):(t="Pick an API only if you want a focused endpoint snapshot.",n="Generate Report Pack",a=()=>pn()):(t="No tracked APIs yet. Call your APIs first.",n="Open APIs",a=()=>ke("api"))}else s.currentView==="settings"?(e="Manage licensing, security defaults, and workspace preferences.",O?E==="free"?(t="Free tier supports one project; Business unlocks unlimited projects.",n="Activate Business License",a=()=>{let _=document.getElementById("license-key-input");_&&_.focus()}):(t="Business is active. Review workflow setup for project operations.",n="Open PO Guide",i="secondary",a=()=>ke("playbook")):(t="Licensing is optional in this build. Focus on setup, monitoring, and issue triage first.",n="Open PO Guide",i="secondary",a=()=>ke("playbook"))):(e="Use this workspace to keep data quality operations simple and repeatable.",n="Open Overview",a=()=>ke("overview"));r.viewGuide.innerHTML=`
    <div class="view-guide-card">
      <div class="view-guide-copy">
        <div class="view-guide-eyebrow">What this page is for</div>
        <div class="view-guide-purpose">${Me(e)}</div>
        <div class="view-guide-next">Primary next action: ${Me(n||"Review this page")}</div>
        ${I?`<div class="view-guide-note" style="color:#fb7185;">${Me(I)}</div>`:""}
        ${s.apiDataMessage?`<div class="view-guide-note" style="color:#f59e0b;">${Me(s.apiDataMessage)}</div>`:""}
        ${t?`<div class="view-guide-note">${Me(t)}</div>`:""}
      </div>
      ${n?`<button class="action ${i==="secondary"?"secondary":""}" id="view-guide-action" type="button">${Me(n)}</button>`:""}
    </div>
  `;let F=document.getElementById("view-guide-action");F&&a&&(F.onclick=()=>{Promise.resolve(a()).catch(_=>{W(_,"Primary action failed.")})})}var ai=new Set(["overview","playbook","api","incidents","errors","scheduler","settings","reports"]),oi=new Set(["summary","incidents","uploads","configuration","history"]);function It(e){let t=String(e||"").toLowerCase();return ai.has(t)?t:String(s.defaultView||"api")}function dn(e){let t=String(e||"").toLowerCase();return oi.has(t)?t:"summary"}function li(){let e=new URLSearchParams(window.location.search),t=e.get("y_api");return{view:It(e.get("y_view")),api:t&&t.trim()?t:null,tab:dn(e.get("y_tab"))}}function he(e="push"){if(e==="none")return;let t=new URL(window.location.href);t.searchParams.set("y_view",String(s.currentView||"overview")),s.selectedApi?t.searchParams.set("y_api",s.selectedApi):t.searchParams.delete("y_api"),s.currentView==="api"?t.searchParams.set("y_tab",String(s.currentApiTab||"summary")):t.searchParams.delete("y_tab");let n=`${t.pathname}${t.search}${t.hash}`,i=`${window.location.pathname}${window.location.search}${window.location.hash}`;if(e==="push"&&n===i)return;let a={jin:!0,view:s.currentView,api:s.selectedApi,tab:s.currentApiTab};e==="replace"?window.history.replaceState(a,"",n):window.history.pushState(a,"",n)}async function ws(){let e=li(),t=new Set((s.status?.endpoints||[]).map(n=>n.endpoint_path));if(e.api&&t.has(e.api)?s.selectedApi=e.api:s.selectedApi||(s.selectedApi=s.status?.endpoints?.[0]?.endpoint_path||null),s.currentView=It(e.view),s.currentApiTab=dn(e.tab),K(),s.currentView==="api"&&s.selectedApi){let n=await Ue(s.selectedApi);if(!n)return;s.activeApiDetail=n,le(n),(s.currentApiTab==="uploads"||s.currentApiTab==="history")&&await Ct(s.selectedApi)}}async function Ue(e){try{return await We(e)}catch(t){return W(t,"Failed to load API details."),null}}async function qe(e,t="push"){if(s.selectedApi=e,s.selectedUploadAnalysisAt=null,s.currentView="api",s.currentApiTab="summary",s.uploadPage=1,s.runPage=1,he(t),K(),s.currentView==="api"&&s.selectedApi){let n=await Ue(e);if(!n)return;s.activeApiDetail=n,le(n)}}async function ci(){let e=document.getElementById("license-key-input"),t=document.getElementById("license-feedback"),n=e?.value.trim();if(!n){f("Please enter a license key.","error");return}f("Activating Business license...","success"),t&&(t.textContent="Contacting server...");try{let i=await fetch("/jin/api/v2/license/activate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({key:n})}),a=await i.json();if(i.ok)f("Business license activated successfully!","success"),await jt(),K();else{let o=a.detail||"Activation failed.";f(o,"error"),t&&(t.textContent=o,t.style.color="var(--danger-ink)")}}catch{f("Network error during activation.","error")}}function K(){let e={overview:["Overview","Start here to see project health and decide where to go next."],playbook:["PO Guide","PO flow for setup, baseline targets, checks, issue triage, and report packs."],api:["APIs",(s.selectedApi,"Pick one API, then follow Configure -> Baselines -> Checks.")],incidents:["Issues","See the current issues and take the next step."],errors:["Errors","Problems and next steps."],scheduler:["Watches","See scheduled checks and run them when needed."],settings:["Settings","Choose display, security, and saved-view behavior."],reports:["Reports","Generate a PO-ready report pack with health, risks, and next actions."]};document.querySelectorAll(".view").forEach(i=>i.classList.remove("active")),document.getElementById(`view-${s.currentView}`)?.classList.add("active"),document.querySelectorAll("#nav button").forEach(i=>{i.classList.toggle("active",i.dataset.view===s.currentView)}),r.pageTitle.textContent=e[s.currentView][0],r.pageSubtitle.textContent=e[s.currentView][1],r.topbar.style.display=["api","incidents","scheduler"].includes(s.currentView)?"none":"block";let t=s.status?.project,n=Le(s.operatorHandle||localStorage.getItem("jin-operator-handle")||"default");s.operatorHandle=n,r.settingsSecurity.innerHTML=`
        <div class="muted">
          ${t?.auth_enabled?"Login is enabled with a project-local session.":"Login is off for this project."}
        </div>
        ${t?.auth_uses_default_credentials?'<div class="empty" style="margin-top:10px;">Default credentials are still active. Change them in <code>.env</code> before sharing this environment.</div>':'<div class="tiny" style="margin-top:10px;">Use <code>JIN_PASSWORD_HASH</code> and <code>JIN_SESSION_SECRET</code> in <code>.env</code> for stronger local security.</div>'}
        <div class="control-grid" style="margin-top:12px;">
          <label>
            Operator handle
            <input id="operator-handle-input" type="text" value="${n}" placeholder="for example: po-oncall" />
          </label>
          <div class="toolbar" style="margin-top:8px;">
            <button class="action secondary" id="operator-handle-save" type="button" onclick="saveOperatorHandle()">Save Handle</button>
          </div>
          <div class="tiny muted">Saved views and default triage view are scoped by this handle.</div>
        </div>
      `,ri(),Qe(),Kn(),Xn(),Re(),Ze(),Yn(),Qn(),Pe(),rt(),dt(),s.currentView!=="api"&&(r.apiWorkspace.style.display=s.selectedApi?"grid":"none",r.apiEmpty.style.display=s.selectedApi?"none":"block")}async function _s(e,t,n=0){let i={action:t};(t==="snoozed"||t==="suppressed")&&(i.snooze_minutes=n||60);let a=document.getElementById("drawer-note"),o=document.getElementById("drawer-owner"),l=document.getElementById("drawer-resolution-reason");if(s.selectedIncident&&Number(s.selectedIncident.id)===Number(e)){if(a&&a.value&&(i.note=a.value),o){let p=pt(o.value);p&&(i.owner=p,o.value=p)}l&&l.value&&(i.resolution_reason=l.value)}i.owner||(i.owner=pt(nn()));let c=await fetch(`/jin/api/v2/anomaly/${e}/status`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(i)}),d=t==="acknowledged"?"marked in review":`updated to ${t}`;if(c.ok){let p=`Issue ${e} ${d}.`;f(p,"success"),me(p,"success")}else{let p=`Failed to update issue ${e}.`;f(p,"error"),me(p,"error")}await ie(!0)}async function di(e){let t=document.getElementById("drawer-note")?.value||"",n=document.getElementById("drawer-owner"),i=pt(n?.value||"");n&&i&&(n.value=i);let a=document.getElementById("drawer-resolution-reason")?.value||"";(await fetch(`/jin/api/v2/anomaly/${e}/status`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:s.selectedIncident?.status||"active",note:t,owner:i||pt(nn()),resolution_reason:a})})).ok?(f("Issue notes saved.","success"),me(`Notes saved for issue ${e}.`,"success")):(f("Failed to save issue notes.","error"),me(`Could not save notes for issue ${e}.`,"error")),await ie(!0);let l=Ee().find(c=>Number(c.id)===Number(e));l&&kt(l)}function ui(e){let t=document.getElementById("drawer-resolution-reason");t&&(t.value=e)}async function $s(e,t){let n=await fetch(`/jin/api/v2/scheduler/${encodeURIComponent(e)}/${t}`,{method:"POST"});f(n.ok?`Scheduler action ${t} applied.`:`Failed scheduler action ${t}.`,n.ok?"success":"error"),await Ke(),s.selectedApi?(s.detailCache.delete(s.selectedApi),await qe(s.selectedApi)):K()}async function pi(e,t){let n=await fetch(`/jin/api/v2/errors/${e}/status`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:t})});f(n.ok?`Error ${e} updated to ${t}.`:`Failed to update error ${e}.`,n.ok?"success":"error"),await jt(),K()}async function gi(){if(!s.selectedApi)return;let e=Z();if(!e)return;let t=e.setup_config||e.config||{dimension_fields:[],kpi_fields:[]},n=Array.isArray(t.dimension_fields)?t.dimension_fields:[],i=Array.isArray(t.kpi_fields)?t.kpi_fields:[],a=String(t.time_field||"").trim(),o=ps(e,t),l=[];if(n.length||l.push("pick at least one Segment field"),i.length||l.push("pick at least one Metric field"),o&&!a&&l.push("pick one Time field"),l.length>0){let E=`Complete setup first: ${l.join(", ")}.`;r.configFeedback.textContent=E,f(E,"error");return}let c;if(r.configReferences.value.trim())try{c=JSON.parse(r.configReferences.value)}catch{r.configFeedback.textContent="Manual references must be valid JSON.",f("Manual references JSON is invalid.","error");return}let d=Number(r.configToleranceSimple.value||10);r.configNormal.value=String(d),r.configRelaxed.value=String(Math.round(d*2)),r.configStrict.value=String(Math.round(d/2));let p={rows_path:t.rows_path||null,time_field:a||null,time_end_field:t.time_end_field||null,time_profile:t.time_profile||"auto",time_extraction_rule:t.time_extraction_rule||"single",time_format:t.time_format||null};if(o||p.time_field){r.configFeedback.textContent="Checking time mapping using available samples...";try{let E=await fetch(`/jin/api/v2/config-mapping/test/${ue(s.selectedApi)}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(p)}),O=await E.json();if(!E.ok||!O?.ok)throw new Error(O?.detail||O?.error||"Time mapping check failed.");let D=String(O?.sample_source||"none"),h=Number(O?.sample_count||0),k=Number(O?.summary?.success_count||0);if(h>0&&k===0&&D!=="schema_example_rows"){let L="Time mapping could not parse sample rows. Update Time field/settings before saving.";r.configFeedback.textContent=L,f(L,"error");return}h===0?r.configFeedback.textContent="No sample rows yet. Setup can still be saved; mapping will validate after first check.":h>0&&k===0?r.configFeedback.textContent="Time mapping could not parse schema example rows yet. Setup can still be saved; mapping will validate after the first real check.":r.configFeedback.textContent=`Time mapping check passed on ${k}/${h} sample row(s).`}catch(E){let O=`Could not validate time mapping: ${se(E)}`;r.configFeedback.textContent=O,f(O,"error");return}}else r.configFeedback.textContent="No time field detected for this API shape. Setup will continue with Segment + Metric only.";let w={dimension_fields:n,kpi_fields:i,active_tolerance:r.configActiveTolerance.value,tolerance_relaxed:Number(r.configRelaxed.value||20),tolerance_normal:d,tolerance_strict:Number(r.configStrict.value||5),tolerance_pct:d,confirmed:!0,rows_path:p.rows_path,time_field:p.time_field,time_end_field:p.time_end_field,time_granularity:t.time_granularity||"minute",time_profile:p.time_profile,time_extraction_rule:p.time_extraction_rule,time_format:p.time_format,time_pin:!!t.time_pin,references:c},b=await fetch(`/jin/api/v2/config/${ue(s.selectedApi)}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(w)}),x=await b.json();b.ok?(s.currentApiTab="uploads",he("push"),f("Setup saved. Ready for baseline data.","success"),Mt(s.selectedApi)):(r.configFeedback.textContent=`Save failed: ${JSON.stringify(x)}`,f("Setup save failed.","error")),s.detailCache.delete(s.selectedApi),await ie(!0);let C=Z();C&&le(C)}window.saveConfig=gi;function mi(e){let t=e?.setup_config||e?.config||{},n=[],i=Array.isArray(t?.dimension_fields)?t.dimension_fields:[],a=Array.isArray(t?.kpi_fields)?t.kpi_fields:[],o=ps(e,t);return i.length||n.push("Segment"),a.length||n.push("Metric"),o&&!String(t?.time_field||"").trim()&&n.push("Time"),t?.confirmed===!1&&n.push("Save configuration"),n}function un(e){let t=String(s.selectedApi||"").trim();if(!t)return!1;let n=Z(),i=mi(n);if(!i.length)return!0;let a=`Before ${e}, complete setup in Configuration: ${i.join(", ")}.`;return r.uploadFeedback.textContent=a,f(a,"error"),Se(t,{title:"Insight: complete setup first",summary:a,kind:"error",actionType:"tab",actionValue:"configuration",actionLabel:"Open Setup"}),Fe("configuration","push"),!1}async function fi(){if(!s.selectedApi){r.uploadFeedback.textContent="Choose an API first, then check your file.",f("Select an API first before checking a file.","error");return}if(!un("checking this file"))return;if(!r.uploadFile.files||!r.uploadFile.files.length){r.uploadFeedback.textContent="Choose a CSV or XLSX file first.";return}let e=new FormData;e.append("file",r.uploadFile.files[0]),r.previewUploadButton.disabled=!0,r.previewUploadButton.textContent="Checking\u2026",r.uploadFeedback.textContent="Checking file format and sample rows...";try{let t=await fetch(`/jin/api/v2/upload-preview/${ue(s.selectedApi)}`,{method:"POST",body:e}),n=await t.text(),i={};if(n)try{i=JSON.parse(n)}catch{i={ok:t.ok,error:n}}else i={ok:t.ok};if((!i||typeof i!="object")&&(i={ok:t.ok,error:String(i||"")}),t.ok||(i.ok=!1,i.error||(i.error=`Server returned ${t.status} while checking the file.`)),r.uploadPreviewStep.style.display="",!i.ok)r.uploadPreviewBody.innerHTML=`
            <div class="upload-preview-error">
              <strong>Problem with your file</strong>
              <div style="margin-top:6px;">${i.error||"Unexpected error."}</div>
              ${(i.warnings||[]).length?`<ul style="margin-top:8px;">${i.warnings.map(a=>`<li>${a}</li>`).join("")}</ul>`:""}
            </div>
          `,r.uploadConfirmToolbar.style.display="none",r.uploadFeedback.textContent=i.error||"File check failed.";else{let a=Number(i.rows_in_file||i.rows_found||0),o=Number(i.columns_in_file||0),l=Number(i.file_size_bytes||0),c=!!i.is_large_upload,d="",p="";try{let b=await fetch(`/jin/api/v2/config-mapping/test/${ue(s.selectedApi)}`,{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"}),x=await b.json();if(b.ok&&x?.ok){let C=Number(x?.sample_count||0),E=Number(x?.summary?.success_count||0),O=String(x?.sample_source||"none"),D=C>0?Math.round(E/C*100):0,h=C===0?"info":E===C?"success":E>0?"info":"danger",k=C===0?"Not validated yet":E===C?`Strong (${D}%)`:E>0?`Partial (${D}%)`:"Needs fix (0%)",L=Array.isArray(x?.summary?.warnings)?x.summary.warnings:[];d=`
            <div class="feedback ${h}" style="margin-top:10px;">
              <strong>Time mapping confidence: ${Me(k)}</strong>
              <div class="tiny" style="margin-top:6px;">
                Parsed ${u(E)}/${u(C)} sample row(s) \u2022 source: ${Me(O)}.
              </div>
              ${L.length?`<div class="tiny muted" style="margin-top:6px;">${Me(String(L[0]))}</div>`:""}
            </div>
          `,p=C>0?` Time mapping parsed ${u(E)}/${u(C)} sample row(s).`:" Time mapping has no runtime sample yet."}}catch{}let w=(i.sample_rows||[]).length?`<table class="preview-table">
                <thead><tr><th>Group</th>${i.metrics_detected.map(b=>`<th>${b}</th>`).join("")}<th>Tolerance %</th></tr></thead>
                <tbody>${i.sample_rows.map(b=>`
                  <tr>
                    <td>${b.group||"(all)"}</td>
                    ${i.metrics_detected.map(x=>`<td>${b.metrics[x]??"\u2014"}</td>`).join("")}
                    <td>${b.tolerance_pct??10}</td>
                  </tr>
                `).join("")}</tbody>
               </table>
               ${i.rows_found>5?`<div class="tiny" style="margin-top:6px;">Showing first 5 of ${i.rows_found} rows</div>`:""}`:'<div class="empty">No data rows found.</div>';r.uploadPreviewBody.innerHTML=`
            <div class="upload-preview-ok">
              <div class="upload-preview-stats">
                <div class="preview-stat"><strong>${i.rows_found}</strong><span>rows</span></div>
                <div class="preview-stat"><strong>${i.groups_detected.join(", ")||"\u2014"}</strong><span>group fields</span></div>
                <div class="preview-stat"><strong>${i.metrics_detected.join(", ")||"\u2014"}</strong><span>metrics</span></div>
                <div class="preview-stat"><strong>${o||"\u2014"}</strong><span>columns</span></div>
              </div>
              <div class="tiny muted" style="margin-top:8px;">
                File shape: ${u(a)} row(s) \xD7 ${u(o)} column(s) \u2022 ${an(l)}
              </div>
              ${c?'<div class="feedback info" style="margin-top:10px;">Large/wide upload detected. Validation may take longer, but Jin will process it safely.</div>':""}
              ${d}
              ${(i.warnings||[]).length?`<div class="upload-preview-warnings"><strong>Warnings</strong><ul>${i.warnings.map(b=>`<li>${b}</li>`).join("")}</ul></div>`:""}
              <div style="margin-top:12px;"><strong>Sample rows</strong></div>
              <div class="table-wrap" style="margin-top:8px;">${w}</div>
            </div>
          `,r.uploadConfirmToolbar.style.display="",r.uploadFeedback.textContent=`File check passed. ${u(a)} row(s) ready for upload.${p}`}}catch(t){r.uploadPreviewBody.innerHTML=`<div class="upload-preview-error">${Me(se(t)||"Could not connect to server. Please try again.")}</div>`,r.uploadConfirmToolbar.style.display="none",r.uploadFeedback.textContent=se(t),W(t,"Could not check the file.")}finally{r.previewUploadButton.disabled=!1,r.previewUploadButton.textContent="Check file \u2192"}}var Rt=()=>{r.runDetailDrawer.style.display="none"};r.runDetailClose.addEventListener("click",Rt);r.runDetailDrawer.addEventListener("click",e=>{e.target===r.runDetailDrawer&&Rt()});document.addEventListener("keydown",e=>{e.key==="Escape"&&r.runDetailDrawer.style.display!=="none"&&Rt()});async function hi(e){let t=document.getElementById("api-monitoring-progress");if(!t||!e)return;let n=Z(),i=h=>{if(!h)return{};if(typeof h=="string")try{let k=JSON.parse(h);return k&&typeof k=="object"?k:{}}catch{return{}}return typeof h=="object"?h:{}},a=h=>{let k=new Map,L=(I,F="")=>{if(I!=null){if(typeof I=="number"){F&&Number.isFinite(I)&&!k.has(F)&&k.set(F,I);return}if(typeof I=="string"){let _=I.trim(),B=Number(_);F&&_&&Number.isFinite(B)&&!k.has(F)&&k.set(F,B);return}if(Array.isArray(I)){I.forEach(_=>L(_,F?`${F}[]`:"data[]"));return}typeof I=="object"&&Object.entries(I).forEach(([_,B])=>{let $=F?`${F}.${_}`:_;L(B,$)})}};return L(h),Array.from(k.entries()).map(([I,F])=>({kpiField:I,value:F}))},o=h=>{if(!h||h.indexOf("|")===-1)return h;let[k,...L]=h.split("|"),I=L.map(F=>F.trim()).filter(Boolean).filter(F=>{let _=F.split("=")[0];return _!=="api_version"&&_!=="label"&&_!=="timestamp"&&_!=="_jin_id"}).sort();return I.length?`${k}|${I.join("|")}`:k},l=h=>{let k=String(h||"").trim().toLowerCase();return k?k.replace(/\[\]/g,"").replace(/^data\./,"").replace(/^payload\./,""):""},c=new Map;(n?.references||[]).forEach(h=>{let k=String(h?.grain_key||""),L=String(h?.kpi_field||"");if(!k||!L)return;let I=h?.expected_value,F=h?.tolerance_pct,_=I==null?null:Number(I),B=F==null?null:Number(F),$={expected:Number.isFinite(_)?_:null,tolerance:Number.isFinite(B)?B:null},V=l(L);c.set(`${k}__${L}`,$),V&&V!==L&&c.set(`${k}__${V}`,$);let S=o(k);S&&(c.has(`${S}__${L}`)||c.set(`${S}__${L}`,$),V&&!c.has(`${S}__${V}`)&&c.set(`${S}__${V}`,$))});let d=Number(n?.config?.tolerance_normal??n?.config?.tolerance_pct??10),p=Array.isArray(e.comparisons)?e.comparisons.filter(h=>h?.kpi_field):[],w=i(e.kpi_json),b=a(w),C=(p.length?p.map(h=>{let k=h.actual_value??h.actual,L=String(e.grain_key||""),I=o(L),F=String(h.kpi_field||""),_=l(F),B=c.get(`${L}__${F}`)||(_?c.get(`${L}__${_}`):void 0)||c.get(`${I}__${F}`)||(_?c.get(`${I}__${_}`):void 0),$=h.expected_value??h.expected??B?.expected??null,V=h.allowed_tolerance_pct??B?.tolerance??d,S=h.pct_change??($==null||k==null||Number($)===0?null:(Number(k)-Number($))/Math.abs(Number($))*100),U=String(h.status||""),y=U&&!(U==="missing_reference"&&$!=null)?U:$==null?"missing_reference":S!=null&&Math.abs(Number(S))>Number(V)?"mismatch":"match";return{...h,kpi_field:h.kpi_field,actualValue:k,expectedValue:$,pctChange:S,status:y,message:h.message||(y==="match"?`${h.kpi_field} matched the expected baseline.`:y==="missing_reference"?`${h.kpi_field} has no uploaded baseline for this grain.`:`${h.kpi_field} did not match the uploaded baseline.`)}}):b.map(({kpiField:h,value:k})=>{let L=Number(k),I=String(e.grain_key||""),F=l(h),_=o(I),B=c.get(`${I}__${h}`)||(F?c.get(`${I}__${F}`):void 0)||c.get(`${_}__${h}`)||(F?c.get(`${_}__${F}`):void 0),$=B?.expected??null,V=B?.tolerance??d,S=$==null||$===0?null:(L-$)/Math.abs($)*100,U=$==null?"missing_reference":S!=null&&Math.abs(S)>V?"mismatch":"match";return{kpi_field:h,actualValue:L,expectedValue:$,pctChange:S,status:U,message:$==null?`No uploaded baseline found for ${h} on this grain.`:`Compared using uploaded baseline (allowed +/-${V.toFixed(1)}%).`}})).filter(h=>h&&String(h.kpi_field||"").trim().length>0);if(!C.length){let h=Object.keys(w||{}),k=h.length?`Captured keys: ${h.slice(0,6).join(", ")}${h.length>6?", ...":""}.`:"No KPI fields were returned by this run.";t.dataset.endpoint=s.selectedApi||"",t.dataset.source="live-check",t.innerHTML=`<div class="empty">No comparable KPI values were captured for this run. ${k}</div>`,t.style.display="block";return}let E=C.filter(h=>h.status!=="match").length,O=E===0?{title:"Data Quality: Excellent",sub:"All metrics are within your defined targets.",class:"success"}:{title:`Action Required: ${E} Issue${E>1?"s":""} Found`,sub:"Some metrics have drifted beyond acceptable limits.",class:"danger"},D=`
    <div class="results-auto-show">
      <div class="verdict-banner ${O.class}">
        <div class="verdict-icon">${E===0?"\u2705":"\u26A0\uFE0F"}</div>
        <div class="verdict-body">
          <h4>${O.title}</h4>
          <p class="tiny">${O.sub}</p>
        </div>
      </div>

      <div class="panel-head" style="margin-bottom:16px; padding-top:12px;">
        <div>
          <h3 style="font-size:14px; color:var(--ink-soft);">Run Analysis</h3>
        </div>
      </div>
      <div class="table-wrap">
        <table class="run-detail-table" style="width:100%; border-collapse:collapse;">
          <thead>
            <tr style="text-align:left; border-bottom:1px solid var(--line);">
              <th style="padding:12px; font-size:11px; color:var(--ink-muted); text-transform:uppercase; letter-spacing:0.05em;">Metric / Grain</th>
              <th style="padding:12px; font-size:11px; color:var(--ink-muted); text-transform:uppercase; letter-spacing:0.05em;">Actual</th>
              <th style="padding:12px; font-size:11px; color:var(--ink-muted); text-transform:uppercase; letter-spacing:0.05em;">Expected</th>
              <th style="padding:12px; font-size:11px; color:var(--ink-muted); text-transform:uppercase; letter-spacing:0.05em;">Delta %</th>
              <th style="padding:12px; font-size:11px; color:var(--ink-muted); text-transform:uppercase; letter-spacing:0.05em;">Status</th>
              <th style="padding:12px; font-size:11px; color:var(--ink-muted); text-transform:uppercase; letter-spacing:0.05em;">Why</th>
            </tr>
          </thead>
          <tbody>
            ${C.map(h=>{let k=h.pctChange,L=h.status!=="match",I=L?"var(--anomaly)":"var(--healthy)";return`
                <tr style="border-bottom:1px solid var(--line);">
                  <td style="padding:12px;">
                    <div style="font-weight:600; font-size:13px;">${h.kpi_field}</div>
                    <div class="tiny muted">${e.grain_key||"Global"}</div>
                  </td>
                  <td style="padding:12px; font-family:var(--font-mono); font-size:13px;">${u(h.actualValue)}</td>
                  <td style="padding:12px; font-family:var(--font-mono); font-size:13px; color:var(--ink-muted);">${u(h.expectedValue)}</td>
                  <td style="padding:12px; font-family:var(--font-mono); font-size:13px; color:${I}; font-weight:600;">
                    ${k==null?"\u2014":`${k>0?"+":""}${k.toFixed(1)}%`}
                  </td>
                  <td style="padding:12px;">
                    <span class="status-pill ${L?"danger":"healthy"}" style="padding:2px 8px; font-size:10px; font-weight:700;">
                      ${L?"MISMATCH":"MATCH"}
                    </span>
                  </td>
                  <td style="padding:12px; color:var(--ink-soft);">${h.message}</td>
                </tr>
              `}).join("")||`
              <tr>
                <td colspan="6" style="padding:14px; color:var(--ink-muted);">No comparable KPI rows were produced for this run.</td>
              </tr>
            `}
          </tbody>
        </table>
      </div>
      
      <div class="next-steps-panel">
        <h5>Guide & Next Steps</h5>
        <div class="next-steps-grid">
          ${E>0?`
            <div class="next-step-card" onclick="setView('incidents')">
              <div class="step-icon">\u{1F6A9}</div>
              <strong>Review Issues</strong>
              <p class="tiny muted">Deep dive into the ${E} detected drift points.</p>
            </div>
          `:`
            <div class="next-step-card" onclick="setView('overview')">
              <div class="step-icon">\u2728</div>
              <strong>Project Health</strong>
              <p class="tiny muted">Everything looks good. See the full overview.</p>
            </div>
          `}
          <div class="next-step-card" onclick="switchApiTab('configuration')">
            <div class="step-icon">\u2699\uFE0F</div>
            <strong>Tweak Targets</strong>
            <p class="tiny muted">Adjust your tolerance levels to be more or less strict.</p>
          </div>
          <div class="next-step-card" onclick="switchApiTab('uploads')">
            <div class="step-icon">\u{1F4CA}</div>
            <strong>Update Baselines</strong>
            <p class="tiny muted">Upload a new reference file if targets have shifted.</p>
          </div>
        </div>
      </div>
    </div>
  `;t.dataset.endpoint=s.selectedApi||"",t.dataset.source="live-check",t.innerHTML=D,t.style.display="block"}async function yi(e="summary"){let t=s.selectedApi;if(!t||!un("running a manual check"))return;r.checkNowButton.disabled=!0,r.checkNowButton.textContent="Checking...",Fe(e,"none");let i=document.getElementById("api-monitoring-progress");i&&(i.dataset.endpoint=t,i.dataset.source="live-check-loading",i.innerHTML=`
      <div class="row-card">
        <strong>Running check...</strong>
        <div class="tiny" style="margin-top:6px;">
          Pulling latest API response and comparing against your configured baseline.
        </div>
      </div>
    `,i.style.display="block");try{let a=await fetch(`/jin/api/v2/check/${ue(t)}`,{method:"POST"}),o=await a.json();if(a.ok){await new Promise(d=>setTimeout(d,300)),s.detailCache.delete(s.selectedApi||""),s.detailCache.delete(t);let l=await We(s.selectedApi||"");if(ti(t,l),l.history&&l.history.length>0)await hi(l.history[0]);else{let d=document.getElementById("api-monitoring-progress");d&&(d.innerHTML=`
                    <div class="verdict-banner success shadow-sm" style="animation: slideIn 0.4s easeOutBack;">
                        <div class="verdict-icon">\u{1F4E1}</div>
                        <div class="verdict-text">
                            <strong>Monitor Active: Waiting for traffic</strong>
                            <p>Targets are set! Jin will scan the next live request automatically.</p>
                        </div>
                    </div>
                `,d.style.display="block")}await ie(!0),le(l);let c=document.getElementById("api-monitoring-progress");c&&(c.style.display="block")}else f(o.error||"Check failed.","error")}catch{f("Network error triggering check.","error")}finally{r.checkNowButton.disabled=!1,r.checkNowButton.textContent="Check Now"}}async function vi(){if(!s.selectedApi||!r.uploadFile.files||!r.uploadFile.files.length){r.uploadFeedback.textContent="Choose a CSV or XLSX file first.";return}if(!un("starting baseline upload"))return;let e=s.selectedApi,t=r.uploadFile.files[0],n=r.uploadButton.textContent||"Confirm upload";Mt(e),r.uploadButton.disabled=!0,r.uploadButton.textContent="Starting...",r.previewUploadButton.disabled=!0,r.uploadFeedback.textContent=`Starting upload for ${t.name} (${an(t.size)})...`;try{let i=await si(e,t);cn(e,i),f("Upload started. Please wait while Jin validates and imports your baseline.","success"),Fe("history","replace"),r.uploadFeedback.textContent=`Upload queued. Tracking progress for ${t.name}...`,Se(e,{title:"Insight: upload in progress",summary:"Baseline upload is running in the background. You can monitor progress in this view.",kind:"info",actionType:"tab",actionValue:"history",actionLabel:"Open Checks"}),bs(e,i)}catch(i){W(i,"Could not start upload."),r.uploadFeedback.textContent=se(i)}finally{ut.has(e)?r.uploadButton.textContent="Uploading...":(r.uploadButton.disabled=!1,r.previewUploadButton.disabled=!1,r.uploadButton.textContent=n)}}function bi(e){let t=Z();if(!t)return;if(!(t.upload_analysis_history||[]).find(a=>String(a?.analyzed_at||"")===String(e||""))){f("This upload analysis record is no longer available.","error");return}s.selectedUploadAnalysisAt=String(e||""),s.currentView="api",s.currentApiTab="history",he("push"),le(t),requestAnimationFrame(()=>{let a=document.getElementById("api-monitoring-progress");a&&a.scrollIntoView({behavior:"smooth",block:"start"})})}window.showUploadAnalysis=bi;async function ks(){ls({render:!1,persist:!0});let e=String(s.selectedApi||"").trim();if(e)try{let t=await ne(`/jin/api/v2/upload-analysis/issues/${ue(e)}`,{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"},15e3),n=Number(t?.created||0)+Number(t?.updated||0);if(n>0){let i=String(t?.message||`Synced ${n} upload mismatch issue${n===1?"":"s"} into Issues.`);me(i,"info")}}catch{}if(await ie(!0),e){let t=Ee().filter(n=>String(n?.endpoint_path||"")===e&&String(n?.status||"active")!=="resolved");t.length>0?me(`Showing ${t.length} active issue${t.length===1?"":"s"} for ${e}.`,"info"):me(`No active issues for ${e} right now.`,"info")}s.currentView="incidents",he("push"),K()}window.openUploadIssues=ks;window.clearIncidentFilters=function(){ls({render:!0,persist:!0})};async function wi(){if(!s.selectedApi)return;let e=s.selectedApi;try{let t=await ne(`/jin/api/v2/upload-analysis/issues/${ue(e)}`,{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"},2e4),n=Number(t?.created||0),i=Number(t?.updated||0);if(n>0||i>0){let o=n>0?`Added ${n} issue${n===1?"":"s"} from upload mismatches.`:`Refreshed ${i} existing issue${i===1?"":"s"} from upload mismatches.`,l=String(t?.message||o);f(l,n>0?"success":"info"),me(l,n>0?"success":"info"),await ks();return}let a=String(t?.message||"No new issues were added from this upload analysis.");f(a,"info"),me(a,"info")}catch(t){W(t,"Could not add upload mismatches to Issues.")}}window.materializeUploadAnalysisIssues=wi;async function _i(){let e=[...document.querySelectorAll(".bulk-incident:checked")].map(i=>Number(i.value));if(!e.length)return;let t=r.bulkAction.value,n={anomaly_ids:e,action:t,note:r.bulkNote.value||void 0,owner:pt(nn())};(t==="snoozed"||t==="suppressed")&&(n.snooze_minutes=60),at("Apply bulk issue action?",`This will apply "${t}" to ${e.length} selected issues.`,async()=>{let i=await fetch("/jin/api/v2/anomalies/bulk",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(n)});if(r.bulkNote.value="",i.ok){let a=`Bulk action applied to ${e.length} issue${e.length===1?"":"s"}.`;f(a,"success"),me(a,"success")}else{let a="Bulk action failed.";f(a,"error"),me(a,"error")}await ie(!0),s.selectedApi&&(s.detailCache.delete(s.selectedApi),await qe(s.selectedApi))})}async function pn(e={}){if((Array.isArray(s.status?.endpoints)?s.status.endpoints.length:0)===0){let a="No APIs are tracked yet. Call your APIs first, then generate a report.";f(a,"error"),Oe(a,"error"),dt();return}let n=r.reportEndpointSelect.value,i=r.reportGrainSearch.value.trim();r.runReportButton.disabled=!0,r.runReportButton.textContent="Generating...";try{let a=new URL(`${window.location.origin}/jin/api/v2/reports/leadership-digest`);a.searchParams.set("days","7"),a.searchParams.set("limit","200"),i&&a.searchParams.set("focus",i);let[o,l,c]=await Promise.all([ne(`${window.location.origin}/jin/api/v2/reports/summary`,void 0,2e4),ne(a.toString(),void 0,2e4),n?ne(`${window.location.origin}/jin/api/v2/reports/endpoint/${ue(n)}`,void 0,2e4):Promise.resolve(null)]),d={summary:o,digest:l,endpoint_report:c,generated_at:new Date().toISOString(),endpoint_path:n||null,focus:i||null};s.lastReportData=ei(d),dt(d),e.suppressSuccessToast||f("Report pack generated.","success"),Oe("Report pack generated. Review top risks, then export CSV.","success")}catch(a){let o=se(a);o.toLowerCase().includes("timed out")?(f("Report generation timed out. Try selecting one API first, then retry.","error"),Oe("Report generation timed out. Select one API and try again.","error")):(W(a,"Failed to generate report pack."),Oe(`Failed to generate report pack: ${o}`,"error"))}finally{r.runReportButton.disabled=!1,r.runReportButton.textContent="1) Generate Report"}}async function Ss(){if((Array.isArray(s.status?.endpoints)?s.status.endpoints.length:0)===0){f("No tracked APIs yet. Call your APIs first.","error"),Oe("No tracked APIs yet. Call your APIs first.","error");return}let t=r.exportReportCsv.textContent||"2) Export CSV";r.exportReportCsv.disabled=!0,r.exportReportCsv.textContent="Preparing export...";let n=!1;try{if((!s.lastReportData||s.lastReportData.length===0)&&(Oe("Generating latest report pack before export...","info"),await pn({suppressSuccessToast:!0}),n=!0),!s.lastReportData||s.lastReportData.length===0){f("No report data to export.","error"),Oe("No report data to export yet. Generate a report pack first.","error");return}st("jin-report.csv",s.lastReportData);let i=n?"Report pack generated and CSV exported.":"Report CSV exported.";f(i,"success"),Oe(i,"success")}finally{r.exportReportCsv.disabled=!1,r.exportReportCsv.textContent=t}}async function $i(){let e=String(r.projectRegisterName.value||"").trim(),t=String(r.projectRegisterUser.value||"").trim(),n=String(r.projectRegisterPass.value||"");if(!e){f("Project name is required for registration.","error");return}if(n&&!t&&(t="operator",r.projectRegisterUser.value=t),t&&!n){f("Add a password, or clear username/password to continue without login setup.","error");return}await we(r.projectRegisterButton,"Registering...",async()=>{await _n({project_name:e,username:t||void 0,password:n||void 0,write_env:r.projectRegisterWriteEnv.checked,monitor_policy:sn(),bootstrap_monitoring:!0,overwrite_existing_schedule:!0}),r.projectRegisterPass.value="",r.projectRegisterAuthAdvanced.open=!1,await Ve(!0),await ie(!1);let i=ye();await je(i,!1),K(),z(`Project "${e}" is ready.`,"success"),f("Project setup completed.","success")})}async function ki(){let e=String(r.projectAddName.value||"").trim();if(!e){f("Project name is required to add a project.","error");return}await we(r.projectAddButton,"Adding...",async()=>{let t=await kn({name:e,root:String(r.projectAddRoot.value||"").trim()||void 0,db_path:String(r.projectAddDbPath.value||"").trim()||void 0,monitor_policy:sn(),bootstrap_monitoring:!0,overwrite_existing_schedule:!0}),n=String(t?.project?.id||"").trim();n&&(await zt(n),s.activeProjectId=n),r.projectAddName.value="",r.projectAddRoot.value="",r.projectAddDbPath.value="",r.projectAddAdvanced.open=!1,await Ve(!0),await ie(!1);let i=ye();await je(i,!1),K(),z(`Added and switched to project "${e}".`,"success"),f("Project added and activated.","success")})}async function Si(){let e=ye();if(!e){f("Select a project first.","error");return}if(xe(e)?.is_archived){f("Restore this project before activating it.","error");return}if(s.activeProjectId&&String(e)===String(s.activeProjectId)){z("That project is already active.","info"),f("Selected project is already active.","success");return}await we(r.projectSelectButton,"Switching...",async()=>{await zt(e),s.detailCache.clear(),s.selectedApi=null,await Ve(!0),await ie(!1),s.selectedApi=s.status?.endpoints?.[0]?.endpoint_path||null,await je(e,!1),K(),z("Switched active project. Dashboard data now reflects the selected project.","success"),f("Project selected.","success")})}async function xi(){let e=ye();if(!e){f("Select a project first.","error");return}let t=xe(e);if(!t){f("Selected project was not found.","error");return}if(t.is_archived){z("Selected project is already archived.","info"),f("Project is already archived.","success");return}await we(r.projectArchiveButton,"Archiving...",async()=>{await Sn(e),r.projectDeleteConfirm.value="",await Ve(!0),await ie(!1),await je(Lt(),!1),K(),z(`Project "${t.name}" archived.`,"success"),f("Project archived.","success")})}async function ji(){let e=ye();if(!e){f("Select a project first.","error");return}let t=xe(e);if(!t){f("Selected project was not found.","error");return}if(!t.is_archived){z("Selected project is already active in catalog.","info"),f("Project is not archived.","success");return}await we(r.projectRestoreButton,"Restoring...",async()=>{await xn(e),r.projectDeleteConfirm.value="",await Ve(!0),await ie(!1),await je(Lt(),!1),K(),z(`Project "${t.name}" restored.`,"success"),f("Project restored.","success")})}async function Ai(){let e=ye();if(!e){f("Select a project first.","error");return}let t=xe(e);if(!t){f("Selected project was not found.","error");return}if(!t.is_archived){f("Archive the project first before deleting it.","error");return}let n=String(t.name||"").trim(),i=String(r.projectDeleteConfirm.value||"").trim();if(!n||i!==n){f(`Type "${n}" exactly to delete this project.`,"error");return}await we(r.projectDeleteButton,"Deleting...",async()=>{await jn(e),r.projectDeleteConfirm.value="",await Ve(!0),await ie(!1),await je(Lt(),!1),K(),z(`Project "${t.name}" deleted.`,"success"),f("Project deleted.","success")})}async function Ti(){let e=ye();if(!e){f("Select a project first.","error");return}if(ft()===0){let n="No APIs are tracked yet. Call your APIs first, then save setup.";z(n,"error"),f(n,"error");return}if(xe(e)?.is_archived){f("Restore this project before updating setup.","error");return}await we(r.projectPolicySaveButton,"Saving & applying...",async()=>{let n=sn(),i=await An(e,n);s.projectMonitorPolicy=i.monitor_policy||n,s.projectPolicyLoadedFor=e;let a=await At(e,{overwrite_existing_schedule:!0});await Ve(!1),await Ke(),await ie(!1),await je(e,!1);let o=Number(a.applied||0),l=Number(a.requested||0),c=rn(a);if(K(),o>0){let p=c.length?` ${c[0]}`:"";z(`Check setup saved and applied to ${o}/${l} APIs.${p}`,"success"),f("Schedule setup saved and applied.","success");return}let d=c[0]||"No API checks were scheduled yet.";z(`Setup saved, but checks were not scheduled. ${d}`,"error"),f("Setup saved, but nothing was scheduled yet.","error")})}async function Pi(){let e=ye();if(!e){f("Select a project first.","error");return}if(ft()===0){let n="No APIs are tracked yet. Call your APIs first, then apply setup.";z(n,"error"),f(n,"error");return}if(xe(e)?.is_archived){f("Restore this project before applying setup.","error");return}await we(r.projectPolicyApplyButton,"Applying...",async()=>{let n=await At(e,{overwrite_existing_schedule:!0});await Ke(),await ie(!1);let i=Number(n.applied||0),a=Number(n.requested||0),o=rn(n);if(i>0){let c=o.length?` ${o[0]}`:"";z(`Schedule setup re-applied to ${i}/${a} APIs.${c}`,"success"),f("Schedule setup re-applied.","success");return}let l=o[0]||"No API checks were scheduled yet.";z(`Setup re-applied, but checks were not scheduled. ${l}`,"error"),f("No checks were scheduled yet.","error")})}async function xs(){let e=ye();if(!e){f("Select a project first.","error");return}if(ft()===0){let n="No APIs are tracked yet. Call your APIs first, then run checks.";z(n,"error"),f(n,"error");return}if(xe(e)?.is_archived){f("Restore this project before running checks.","error");return}await we(r.projectRunBundleButton,"Running...",async()=>{if(Zs()===0){let l=await At(e,{overwrite_existing_schedule:!1});await Ke();let c=Number(l.applied||0);if(c===0){let p=rn(l)[0]||"No runnable API schedules are configured yet.";z(`Cannot run checks yet. ${p}`,"error"),f("Checks are blocked until setup is complete.","error");return}z(`Auto-applied setup for ${c} API${c===1?"":"s"} before running checks.`,"info")}let n=await Tn(e);await je(e,!0),await ie(!1),K();let i=`Checks finished: ${n.status||"done"} \u2022 planned ${u(n.requested||0)} \u2022 completed ${u(n.executed||0)} \u2022 errors ${u(n.errors||0)}`;if(String(n.status||"").toLowerCase()==="not_scheduled"||Number(n.executed||0)===0){let l=String(n.message||"").trim()||"No checks could run. Verify API defaults in setup and retry.";z(`${i}. ${l}`,"error"),f("No checks were executed.","error");return}z(i,Number(n.errors||0)>0?"info":"success"),f("Check run completed.",Number(n.errors||0)>0?"error":"success")})}async function js(){let e=ye();if(!e){f("Select a project first.","error");return}if(ft()===0){let n="No APIs are tracked yet. Call your APIs first, then refresh targets.";z(n,"error"),f(n,"error");return}if(xe(e)?.is_archived){f("Restore this project before refreshing targets.","error");return}await we(r.projectBaselinePromoteButton,"Promoting...",async()=>{let n=await Mn(e,{}),i=Number(n.promoted||0),a=Number(n.requested||0);await ie(!1),await je(e,!1),K(),z(`Targets refreshed for ${i}/${a} APIs.`,i>0?"success":"info"),f("Target refresh finished.",i>0?"success":"error")})}async function As(){let e=ye();if(!e){f("Select a project first.","error");return}if(xe(e)?.is_archived){f("Restore this project before running health checks.","error");return}await we(r.projectHealthCheckButton,"Checking...",async()=>{s.projectHealth=await Gt(e),K(),z("Health status refreshed.","success"),f("Health check completed.","success")})}async function Mi(){await we(r.projectMonitorRefreshButton,"Refreshing...",async()=>{s.projectsMonitorSnapshot=await Jt(),K(),z("Portfolio health refreshed.","success"),f("Portfolio health updated.","success")})}async function Ts(){let e=ye();if(!e){f("Select a project first.","error");return}if(xe(e)?.is_archived){f("Restore this project before generating reports.","error");return}if(ft()===0){let n="No APIs are tracked yet. Call your APIs first, then generate reports.";z(n,"error"),f(n,"error");return}await we(r.projectReportDigestButton,"Generating...",async()=>{s.projectDigest=await Wt(e,7,200);try{let a=new URLSearchParams;a.set("format","markdown"),a.set("days",String(7)),a.set("limit",String(200)),e&&a.set("project_id",e);let o=await fetch(`/jin/api/v2/reports/leadership-digest?${a.toString()}`);if(o.ok){let l=await o.text();Te(`jin-report-pack-${new Date().toISOString().slice(0,10)}.md`,l,"text/markdown;charset=utf-8;")}}catch{}K(),z("Leadership report generated for the latest 7 days.","success"),f("Report pack is ready.","success")})}function Ci(e,t){if(e==="incidents"&&(s.incidentPage=Math.max(1,s.incidentPage+t)),e==="uploads"&&(s.uploadPage=Math.max(1,s.uploadPage+t)),e==="runs"&&(s.runPage=Math.max(1,s.runPage+t)),e==="uploads"||e==="runs"){if(s.selectedApi){let n=Z();n&&le(n)}return}Re()}function Ps(e,t,n=0){let i=t==="resolved"?`Resolve issue ${e}?`:t==="acknowledged"?`Mark issue ${e} as in review?`:`Apply "${t}" to issue ${e}?`;at("Confirm issue action",i,async()=>{await _s(e,t,n)})}function Li(e,t,n=0){Ps(e,t,n)}function Ms(e,t){at("Confirm scheduler action",`Apply "${t}" to job ${e}?`,async()=>{await $s(e,t)})}async function ie(e=!1){let t=await Promise.allSettled([jt(),wn(),Ke(),Et(!1)]),[n,i,a,o]=t,l=n.status==="rejected";if(!l)s.apiDataState="fresh",s.apiDataMessage=null,s.apiDataUpdatedAt=new Date().toISOString(),Qs();else{let c=Ys(n.reason),d=fs(),p=!!(s.status?.endpoints||[]).length;d||p?(s.apiDataState="stale",s.apiDataMessage="Live connection interrupted. Showing the last known API snapshot."):(s.apiDataState=c.state,s.apiDataMessage=c.message),W(n.reason,"Failed to refresh API status.")}!l&&i.status==="rejected"&&W(i.reason,"Failed to refresh issues."),!l&&a.status==="rejected"&&W(a.reason,"Failed to refresh scheduler."),!l&&s.currentView==="playbook"&&o.status==="rejected"&&W(o.reason,"Failed to load PO playbook."),K();try{if(e&&s.selectedApi){let c=await Ue(s.selectedApi);if(!c)return;s.activeApiDetail=c;let d=c.operator_metadata?.confirmed,p=(c.upload_activity||[]).length>0,w=1;if(d&&!p&&(w=2),d&&p&&(w=3),w===3&&s.currentApiTab==="uploads"){s.currentApiTab="summary",he("replace"),setTimeout(()=>le(c),0);return}le(c)}}catch(c){W(c,"Failed to refresh selected API details.")}}r.checkNowButton.addEventListener("click",()=>{yi()});r.nav.addEventListener("click",async e=>{let t=Pt(e.target,"button[data-view]");if(t){if(s.currentView=t.dataset.view,s.currentView==="playbook")try{await Et(!0)}catch(n){W(n,"Failed to load PO playbook.")}if(he("push"),K(),s.currentView==="api"&&s.selectedApi){let n=await Ue(s.selectedApi);if(!n)return;s.activeApiDetail=n,le(n)}}});document.addEventListener("click",async e=>{let t=Pt(e.target,"button[data-view]");if(!(!t||t.closest("#nav"))){if(s.currentView=t.dataset.view,s.currentView==="playbook")try{await Et(!0)}catch(n){W(n,"Failed to load PO playbook.")}if(he("push"),K(),s.currentView==="api"&&s.selectedApi){let n=await Ue(s.selectedApi);if(!n)return;le(n)}}});r.sidebarToggle.addEventListener("click",()=>{Ft(document.body.dataset.sidebar!=="collapsed")});r.apiSearch.addEventListener("input",e=>{let t=e.target;s.apiFilter=t?.value||"",pe(),Qe()});r.apiStatusFilter.addEventListener("change",e=>{let t=e.target;s.apiStatusFilter=t?.value||"",pe(),Qe()});r.errorSearch.addEventListener("input",e=>{let t=e.target;s.errorSearch=t?.value||"",pe(),Ze()});r.errorStatusFilter.addEventListener("change",e=>{let t=e.target;s.errorStatusFilter=t?.value||"",pe(),Ze()});r.errorCategoryFilter.addEventListener("change",e=>{let t=e.target;s.errorCategoryFilter=t?.value||"",pe(),Ze()});r.errorSeverityFilter.addEventListener("change",e=>{let t=e.target;s.errorSeverityFilter=t?.value||"",pe(),Ze()});r.incidentSort.addEventListener("change",e=>{let t=e.target;s.incidentSort=t?.value||"business",s.incidentPage=1,pe(),Re()});document.addEventListener("change",e=>{let t=e.target;if(t?.id==="run-sort"&&(s.runSort=t.value||"observed_at_desc",s.runPage=1,pe(),s.selectedApi)){let n=Z();n&&le(n)}if(t?.id==="upload-sort"&&(s.uploadSort=t.value||"uploaded_at_desc",s.uploadPage=1,pe(),s.selectedApi)){let n=Z();n&&le(n)}if(t?.id==="incident-status-select"&&(s.incidentStatusFilter=t.value||"",s.incidentPage=1,pe(),Re()),t?.id==="incident-severity-select"&&(s.incidentSeverityFilter=t.value||"",s.incidentPage=1,pe(),Re()),t?.classList?.contains("bulk-incident")){let n=document.querySelectorAll(".bulk-incident:checked").length;r.bulkPreview.textContent=n?`${n} issue${n===1?"":"s"} selected.`:"Select one or more issues to apply one action.",r.bulkAction.style.display=n?"":"none",r.bulkNote.style.display=n?"":"none",r.bulkRun.style.display=n?"":"none"}});r.apiList.addEventListener("click",async e=>{let t=Pt(e.target,"[data-group-toggle]");if(t){let i=t.dataset.groupToggle;s.collapsedGroups[i]=!s.collapsedGroups[i],Qe();return}let n=Pt(e.target,"[data-api]");n&&await qe(n.dataset.api)});r.logoutButton.addEventListener("click",e=>{e.preventDefault(),window.location.assign("/jin/logout")});r.themeSelect.addEventListener("change",e=>{let t=e.target.value||"dark";Dt(t)});r.poModeToggle.addEventListener("change",e=>{let t=!!e.target?.checked;os(t,{explicit:!0,toast:!0})});window.disablePoModeForEditing=function(){os(!1,{explicit:!0,toast:!0})};r.densitySelect.addEventListener("change",e=>{let t=e.target;if(wt(t?.value||"comfortable"),pe(),K(),s.selectedApi){let n=Z();n&&le(n)}});r.defaultViewSelect.addEventListener("change",e=>{let t=e.target;s.defaultView=t?.value||"overview",pe(),f(`Default view set to ${s.defaultView}.`,"success")});function Nt(e,t){e.addEventListener("keydown",n=>{n.key==="Enter"&&(n.preventDefault(),t())})}r.projectRegisterButton.addEventListener("click",()=>{$i().catch(e=>{z(se(e),"error"),W(e,"Registration failed.")})});r.projectAddButton.addEventListener("click",()=>{ki().catch(e=>{z(se(e),"error"),W(e,"Add project failed.")})});r.projectSelectButton.addEventListener("click",()=>{Si().catch(e=>{z(se(e),"error"),W(e,"Project selection failed.")})});r.projectArchiveButton.addEventListener("click",()=>{xi().catch(e=>{z(se(e),"error"),W(e,"Archiving project failed.")})});r.projectRestoreButton.addEventListener("click",()=>{ji().catch(e=>{z(se(e),"error"),W(e,"Restoring project failed.")})});r.projectDeleteButton.addEventListener("click",()=>{Ai().catch(e=>{z(se(e),"error"),W(e,"Deleting project failed.")})});r.projectPolicySaveButton.addEventListener("click",()=>{Ti().catch(e=>{z(se(e),"error"),W(e,"Saving setup failed.")})});r.projectPolicyApplyButton.addEventListener("click",()=>{Pi().catch(e=>{z(se(e),"error"),W(e,"Applying setup failed.")})});r.projectRunBundleButton.addEventListener("click",()=>{xs().catch(e=>{z(se(e),"error"),W(e,"Running checks failed.")})});r.projectBaselinePromoteButton.addEventListener("click",()=>{js().catch(e=>{z(se(e),"error"),W(e,"Refreshing targets failed.")})});r.projectHealthCheckButton.addEventListener("click",()=>{As().catch(e=>{z(se(e),"error"),W(e,"Health check failed.")})});r.projectMonitorRefreshButton.addEventListener("click",()=>{Mi().catch(e=>{z(se(e),"error"),W(e,"Refreshing portfolio health failed.")})});r.projectReportDigestButton.addEventListener("click",()=>{Ts().catch(e=>{z(se(e),"error"),W(e,"Generating report pack failed.")})});r.poActionWorkflow.addEventListener("click",()=>{s.currentView="playbook",he("push"),K(),document.getElementById("playbook-core-workflow")?.scrollIntoView({behavior:"smooth",block:"start"}),r.projectRegisterName.focus()});r.poActionValidation.addEventListener("click",()=>{s.currentView="api",s.currentApiTab="uploads",he("push"),K(),s.selectedApi&&Ue(s.selectedApi).then(e=>{e&&(s.activeApiDetail=e,le(e))})});r.poActionChecks.addEventListener("click",()=>{xs().catch(e=>{z(se(e),"error"),W(e,"Running checks failed.")})});r.poActionBaseline.addEventListener("click",()=>{js().catch(e=>{z(se(e),"error"),W(e,"Refreshing baseline targets failed.")})});r.poActionHealth.addEventListener("click",()=>{As().catch(e=>{z(se(e),"error"),W(e,"Health check failed.")})});r.poActionReport.addEventListener("click",()=>{Ts().catch(e=>{z(se(e),"error"),W(e,"Generating report pack failed.")})});r.projectActiveSelect.addEventListener("change",()=>{let e=ye();if(r.projectDeleteConfirm.value="",!e)return;if(xe(e)?.is_archived){s.projectMonitorPolicy=null,s.projectPolicyLoadedFor=null,s.projectHealth=null,s.projectRunHistory=[],s.projectDigest=null,K();return}(async()=>{try{let n=await qt(e);s.projectMonitorPolicy=n.monitor_policy||null,s.projectPolicyLoadedFor=e,await je(e,!1),K()}catch(n){W(n,"Failed to load project setup.")}})()});r.projectDeleteConfirm.addEventListener("input",()=>{K()});Nt(r.projectRegisterName,()=>r.projectRegisterButton.click());Nt(r.projectRegisterPass,()=>r.projectRegisterButton.click());Nt(r.projectAddName,()=>r.projectAddButton.click());Nt(r.projectDeleteConfirm,()=>r.projectDeleteButton.click());r.runReportButton.addEventListener("click",()=>{pn()});r.exportReportCsv.addEventListener("click",()=>{Ss()});r.uploadButton.addEventListener("click",vi);r.previewUploadButton.addEventListener("click",fi);r.cancelUploadButton.addEventListener("click",()=>{r.uploadFile.value="",r.uploadPreviewStep.style.display="none",r.uploadPreviewBody.innerHTML="",r.uploadConfirmToolbar.style.display="none",r.uploadFeedback.textContent=""});r.exportOverviewJson.addEventListener("click",()=>{Ge("jin-overview.json",{summary:it(),status:s.status,anomalies:s.anomalies,scheduler:s.scheduler})});r.exportOverviewReport.addEventListener("click",()=>{Te("jin-overview-brief.md",Ln(),"text/markdown;charset=utf-8;")});r.exportOverviewHtml.addEventListener("click",()=>{Te("jin-overview-brief.html",Rn(),"text/html;charset=utf-8;")});r.exportErrorsJson.addEventListener("click",()=>{Ge("jin-errors.json",{generated_at:new Date().toISOString(),project:s.status?.project||null,filters:{search:s.errorSearch,status:s.errorStatusFilter,category:s.errorCategoryFilter,severity:s.errorSeverityFilter},errors:s.status?.recent_errors||[]})});r.exportErrorsReport.addEventListener("click",()=>{let e=(s.status?.recent_errors||[]).filter(t=>{let n=t.source.startsWith("scheduler")?"Scheduler":t.source.startsWith("router.upload")||t.source.startsWith("router.save_references")?"Upload":t.source.startsWith("router.save_config")||t.source.startsWith("config.")?"Configuration":t.source.startsWith("router.")||t.source.startsWith("middleware.")?"Runtime":"General",i=t.source.startsWith("scheduler")||t.source.startsWith("middleware.process_response")?"high":t.source.startsWith("router.status")||t.source.startsWith("router.endpoint_detail")?"medium":"low",a=`${t.source} ${t.message} ${t.hint||""} ${t.endpoint_path||""}`.toLowerCase();return(!s.errorSearch||a.includes(s.errorSearch.toLowerCase()))&&(!s.errorStatusFilter||(t.status||"open")===s.errorStatusFilter)&&(!s.errorCategoryFilter||n===s.errorCategoryFilter)&&(!s.errorSeverityFilter||i===s.errorSeverityFilter)});Te("jin-errors-brief.md",["# Jin Error Brief","",`Project: ${s.status?.project?.name||"unknown"}`,`Root: ${s.status?.project?.root||"unknown"}`,`DB: ${s.status?.project?.db_path||"unknown"}`,"",...e.map(t=>[`## ${t.source}`,`- Message: ${t.message}`,`- Endpoint: ${t.endpoint_path||"workspace-level"}`,`- Created: ${t.created_at||"unknown"}`,`- Status: ${t.status||"open"}`,`- Hint: ${t.hint||"No remediation hint recorded."}`,`- Remediation: ${(t.remediation_steps||[]).join(" | ")||"No remediation steps recorded."}`,`- Detail: ${t.detail||"No extra detail recorded."}`,""].join("\\n"))].join("\\n"),"text/markdown;charset=utf-8;")});r.exportIncidents.addEventListener("click",()=>{let e=ot(Ee()).map(t=>({id:t.id,endpoint_path:t.endpoint_path,kpi_field:t.kpi_field,status:t.status,severity:t.severity,confidence:t.confidence,actual_value:t.actual_value,baseline_used:t.baseline_used,pct_change:t.pct_change,detected_at:t.detected_at,note:t.note,owner:t.owner,resolution_reason:t.resolution_reason}));st("jin-incidents.csv",e)});r.exportIncidentsJson.addEventListener("click",()=>{Ge("jin-incidents.json",{generated_at:new Date().toISOString(),filters:{status:s.incidentStatusFilter,severity:s.incidentSeverityFilter,sort:s.incidentSort},incidents:ze()})});r.exportIncidentsReport.addEventListener("click",()=>{Te("jin-incidents-brief.md",En(),"text/markdown;charset=utf-8;")});r.exportIncidentsHtml.addEventListener("click",()=>{Te("jin-incidents-brief.html",Nn(),"text/html;charset=utf-8;")});r.exportUploads.addEventListener("click",()=>{if(!s.selectedApi)return;let e=Z(),t=Je(e?.upload_activity||[],s.uploadSort,"uploaded_at").map(n=>({uploaded_at:n.uploaded_at,grain_key:n.grain_key,kpi_field:n.kpi_field,expected_value:n.expected_value,tolerance_pct:n.tolerance_pct,upload_source:n.upload_source}));st("jin-uploads.csv",t)});r.exportRuns.addEventListener("click",()=>{if(!s.selectedApi)return;let e=Z(),t=[...e?.monitoring_runs||[]].sort((i,a)=>String(a?.started_at||"").localeCompare(String(i?.started_at||""))),n=t.length?t.map(i=>({run_id:i.run_id,started_at:i.started_at,finished_at:i.finished_at,trigger:i.trigger,source:i.source,status:i.status,duration_ms:i.duration_ms,grains_processed:i.grains_processed,anomalies_detected:i.anomalies_detected,error:i.error})):Je(e?.recent_history||[],s.runSort,"observed_at").map(i=>({observed_at:i.observed_at,grain_key:i.grain_key,kpi_json:JSON.stringify(i.kpi_json||{})}));st("jin-runs.csv",n)});r.exportRunsJson.addEventListener("click",()=>{if(!s.selectedApi)return;let e=Z(),t=[...e?.monitoring_runs||[]].sort((n,i)=>String(i?.started_at||"").localeCompare(String(n?.started_at||"")));Ge("jin-runs.json",{endpoint_path:s.selectedApi,source:t.length?"run_ledger":"observation_history",sort:t.length?"started_at_desc":s.runSort,runs:t.length?t:Je(e?.recent_history||[],s.runSort,"observed_at")})});r.exportApiReport.addEventListener("click",()=>{if(!s.selectedApi)return;let e=Z();Te(`jin-api-${ue(s.selectedApi)}-brief.md`,In(e),"text/markdown;charset=utf-8;")});r.exportApiHtml.addEventListener("click",()=>{if(!s.selectedApi)return;let e=Z();Te(`jin-api-${ue(s.selectedApi)}-brief.html`,Fn(e),"text/html;charset=utf-8;")});r.saveNamedView.addEventListener("click",()=>{let e=(r.namedViewInput.value||"").trim();if(!e){f("Add a name before saving a view.","error");return}let t=yn();t.name=e,s.savedViews=[t,...(s.savedViews||[]).filter(n=>n.name!==e)].slice(0,12),$t(),Pe(),r.namedViewInput.value="",f(`Saved view "${e}".`,"success")});r.exportNamedViews.addEventListener("click",()=>{Ge("jin-named-views.json",{generated_at:new Date().toISOString(),operator_handle:Le(s.operatorHandle||"default"),default_view_id:bt()||null,views:s.savedViews||[]})});r.importNamedViewsButton.addEventListener("click",()=>{r.importNamedViewsFile.click()});r.importNamedViewsFile.addEventListener("change",async e=>{let n=e.target?.files?.[0];if(n)try{let i=await n.text(),a=JSON.parse(i),o=Array.isArray(a?.views)?a.views:[];s.savedViews=o.slice(0,12),$t(),a?.default_view_id&&localStorage.setItem(vt(),String(a.default_view_id)),Pe(),f(`Imported ${s.savedViews.length} saved view(s).`,"success")}catch{f("Failed to import saved views.","error")}finally{r.importNamedViewsFile.value=""}});r.bulkRun.addEventListener("click",_i);r.bulkAction.addEventListener("change",Re);r.drawerClose.addEventListener("click",St);r.drawerBackdrop.addEventListener("click",St);r.confirmCancel.addEventListener("click",xt);r.confirmBackdrop.addEventListener("click",xt);r.confirmAccept.addEventListener("click",async()=>{let e=s.confirmAction;xt(),e&&await e()});window.openApi=qe;window.incidentAction=_s;window.schedulerAction=$s;window.confirmIncident=Ps;window.confirmDrawerIncident=Li;window.confirmScheduler=Ms;window.confirmError=function(t,n){at("Confirm error action",`Apply "${n}" to error ${t}?`,async()=>{await pi(t,n)})};window.changePage=Ci;window.saveIncidentNotes=di;window.saveOperatorHandle=Ws;window.applyResolutionPreset=ui;window.applyNamedView=async function(t){let n=(s.savedViews||[]).find(i=>Number(i.id)===Number(t));if(n){if(s.apiFilter=n.apiFilter||"",s.apiStatusFilter=n.apiStatusFilter||"",s.errorSearch=n.errorSearch||"",s.errorStatusFilter=n.errorStatusFilter||"",s.errorCategoryFilter=n.errorCategoryFilter||"",s.errorSeverityFilter=n.errorSeverityFilter||"",s.incidentStatusFilter=n.incidentStatusFilter||"",s.incidentSeverityFilter=n.incidentSeverityFilter||"",s.incidentSort=n.incidentSort||"business",s.runSort=n.runSort||"observed_at_desc",s.uploadSort=n.uploadSort||"uploaded_at_desc",s.currentView=It(n.currentView||"overview"),wt(n.density||"comfortable"),r.apiSearch.value=s.apiFilter,r.apiStatusFilter.value=s.apiStatusFilter,r.errorSearch.value=s.errorSearch,r.errorStatusFilter.value=s.errorStatusFilter,r.errorCategoryFilter.value=s.errorCategoryFilter,r.errorSeverityFilter.value=s.errorSeverityFilter,r.incidentSort.value=s.incidentSort,pe(),he("push"),K(),s.currentView==="api"&&s.selectedApi){let i=await We(s.selectedApi);le(i)}f(`Applied saved view "${n.name}".`,"success")}};window.deleteNamedView=function(t){s.savedViews=(s.savedViews||[]).filter(n=>Number(n.id)!==Number(t)),$t(),Pe(),f("Saved view deleted.","success")};window.setDefaultNamedView=function(t){localStorage.setItem(vt(),String(t)),Pe(),f("Default saved view updated.","success")};window.showIncident=function(t){let i=Ee().find(a=>Number(a.id)===Number(t));i&&kt(i)};window.setView=function(t){if(s.currentView=It(t),s.currentView==="playbook"){Et(!0).then(()=>K()).catch(n=>{W(n,"Failed to load PO playbook."),K()});return}he("push"),K()};document.addEventListener("click",e=>{e.target.id==="activate-license-button"&&ci()});function Ei(e,t,n){if(t==="kpi"&&(typeof n=="number"||!isNaN(parseFloat(n))&&isFinite(n)||f(`\u26A0\uFE0F "${e}" contains text. Metrics should usually be numbers. Jin will try to count occurrences instead.`,"info")),t==="time"){let i=String(n);i.match(/^\d{4}/)||i.match(/^\d{10,13}$/)||i.match(/^\[?"\d{4}/)||f(`\u26A0\uFE0F "${e}" doesn't look like a date. Monitoring might fail if we can't find a pulse.`,"warning")}}function Ii(){return s.poMode!==!1}function Ri(e){return Ii()?(f(e,"info"),!0):!1}window.updateFieldRole=function(t,n){let i=Z();if(!i||!i.setup_config)return;let o=(i.recent_history||[]).map(w=>en(w)),l=o[0]?Ce(o[0],t):null;Ei(t,n,l),i.setup_config||(i.setup_config=JSON.parse(JSON.stringify(i.config||{dimension_fields:[],kpi_fields:[]})));let c=new Set(i.setup_config.dimension_fields||[]),d=new Set(i.setup_config.kpi_fields||[]),p=new Set(i.setup_config.excluded_fields||[]);c.delete(t),d.delete(t),p.delete(t),i.setup_config.time_field===t&&delete i.setup_config.time_field,n==="dimension"&&c.add(t),n==="kpi"&&d.add(t),n==="exclude"&&p.add(t),n==="time"&&(i.setup_config.time_field=t),i.setup_config.dimension_fields=[...c],i.setup_config.kpi_fields=[...d],i.setup_config.excluded_fields=[...p],ge(i.fields,i.setup_config,i.metrics),(n==="time"||!i.setup_config.time_field)&&window.refreshTimePreview()};window.toggleConfigFieldFocus=function(t){let n=String(s.selectedApi||"").trim();if(!n)return;let i=!!s.configFocusExpandedByApi?.[n],a=typeof t=="boolean"?t:!i;s.configFocusExpandedByApi={...s.configFocusExpandedByApi||{},[n]:a};let o=Z();o&&ge(o.fields,o.setup_config||o.config||{},o.metrics)};window.updateExtractionRule=function(t){let n=Z();n&&n.setup_config&&(n.setup_config.time_extraction_rule=t,window.refreshTimePreview())};window.toggleTimeSettings=function(t,n){n&&(n.preventDefault(),n.stopPropagation()),s.showTimeSettings||(s.showTimeSettings={}),s.showTimeSettings[t]=!s.showTimeSettings[t];let i=Z();i&&(ge(i.fields,i.setup_config,i.metrics),i.setup_config?.time_field===t&&window.refreshTimePreview())};window.refreshTimePreview=function(){let t=Z();if(!t||!t.setup_config)return;let n=mt(t);s.timePreview=null,s.grainReason=null;let i=new Set;if(n.length>0){let b=n[0];for(let[x,C]of Object.entries(b))gt(C)&&i.add(x);(t.fields||[]).forEach(x=>{let C=String(x?.name||x||"").trim();if(!C)return;let E=Ce(b,C);gt(E)&&i.add(C)})}s.detectedTimeSources=Array.from(i),Ks(t,n);let a=t.setup_config.time_field;if(!a){s.timePreview="Choose your business time field (you can change it later).",s.grainReason="Select the column that represents business time.",ge(t.fields,t.setup_config,t.metrics);return}let o=t.setup_config.time_extraction_rule||"single",l=t.setup_config.time_pin||!1;if(!n.length){s.timePreview="No recent sample yet. Time preview appears after the next check.",s.grainReason="Setup is not blocked. Pick your time field now, then run one check to confirm cadence.",s.detectedGrain=t.setup_config.time_granularity||s.detectedGrain||"day",ge(t.fields,t.setup_config,t.metrics);return}let c=n[0],d=Ce(c,a);if(d==null||d===""){s.timePreview=`No sample value found for "${a}"`,s.grainReason="Pick a different time field or run checks with a payload that includes this field.",s.detectedGrain=t.setup_config.time_granularity||s.detectedGrain||"day",ge(t.fields,t.setup_config,t.metrics);return}if(!l&&n.length>0){let b=d;if(Array.isArray(b)&&b.length===2&&o!=="range"){let E=new Date(b[0]).getTime(),O=new Date(b[1]).getTime();if(!isNaN(E)&&!isNaN(O)){t.setup_config.time_extraction_rule="range",window.refreshTimePreview();return}}let x="day",C="Daily Heartbeat detected.";if(o==="range"&&Array.isArray(b)&&b.length===2){let E=new Date(b[0]).getTime(),O=new Date(b[1]).getTime(),D=Math.abs(O-E)/(1e3*60*60*24);D>=27&&D<=32?(x="month",C="1-month Range window."):D>=6&&D<=8?(x="week",C="7-day Weekly window."):(x="day",C=`Custom ${Math.round(D)}-day Window.`)}else if(n.length>=2){let E=Ce(n[0],a),O=Ce(n[1],a),D=Array.isArray(E)?new Date(E[0]).getTime():new Date(E).getTime(),h=Array.isArray(O)?new Date(O[0]).getTime():new Date(O).getTime();if(!isNaN(D)&&!isNaN(h)){let k=Math.abs(D-h)/864e5;k>=.9&&k<=1.1?(x="day",C="Confirmed Daily Pulse."):k>=6&&k<=8?(x="week",C="Confirmed Weekly Pulse."):k>=28&&k<=31&&(x="month",C="Confirmed Monthly Pulse.")}}s.detectedGrain=x,s.grainReason=C,t.setup_config.time_granularity=x}else l&&(s.detectedGrain=t.setup_config.time_granularity,s.grainReason="Frequency is Pinned (Locked).");let p="";if(o==="range")if(Array.isArray(d)&&d.length>=2){let b=Yt(d[0])||String(d[0]),x=Yt(d[1])||String(d[1]);p=`Range: [${b} -> ${x}]`}else p="Range mode needs two date values";else{let b=Array.isArray(d)?d:[d],x=o==="last"?b[b.length-1]:b[0],C=Yt(x)||String(x);p=`${o==="first"?"First":o==="last"?"Last":"Pulse"}: ${C}`}s.timePreview=p;let w=document.getElementById("time-preview-val");w&&(w.innerText=s.timePreview||"No timeline preview yet"),ge(t.fields,t.setup_config,t.metrics)};window.pinGrain=function(){let t=Z();t&&t.setup_config&&(t.setup_config.time_pin=!t.setup_config.time_pin,window.refreshTimePreview())};window.selectTimeSource=function(t){let n=Z();n&&n.setup_config&&(n.setup_config.time_field=t,s.detectedTimeSources=[],window.refreshTimePreview())};window.runMagicGuess=function(t=!1){let n=Z();if(!n||!n.fields||!n.setup_config)return;let i=String(n.endpoint_path||s.selectedApi||"").trim();if(!i)return;if(((n.setup_config.dimension_fields?.length||0)>0||(n.setup_config.kpi_fields?.length||0)>0||n.setup_config.time_field)&&!t){Qt(i,{headline:"Setup already exists.",details:"You can still edit roles manually if your business logic changed.",hasSuggestions:!0}),ge(n.fields,n.setup_config,n.metrics);return}let o=mt(n);if(!o.length){Qt(i,{headline:"No recent sample data yet.",details:"Call this API once, then run auto-suggest to pre-fill segments and metrics.",hasSuggestions:!1}),ge(n.fields,n.setup_config,n.metrics),f("Auto-suggest needs at least one recent API response.","info");return}let l=[],c=[],d=null;n.fields.forEach(D=>{let h=D.name,k=h.toLowerCase(),L=ds(o,h);if(L.length===0)return;if(!d){if(k.includes("date")||k.includes("time")||k.includes("period")||k.includes("at")){d=h;return}if(L.every(B=>{let $=String(B);return $.match(/^\d{4}-\d{2}-\d{2}/)||$.match(/^\d{10,13}$/)})&&L.length>0){d=h;return}}let I=L.filter(_=>typeof _=="number"||!isNaN(parseFloat(_))&&isFinite(_));if(I.length===L.length&&L.length>0){let _=I.map(V=>typeof V=="number"?V:parseFloat(V)),B=Math.min(..._);if(Math.max(..._)>B){c.push(h);return}else if(["amount","value","total","count","sum","price","quantity","qty","rsv","sales"].some(S=>k.includes(S))){c.push(h);return}}let F=L.filter(_=>typeof _=="string");if(F.length>0){let _=new Set(F).size;if(_/F.length<.8||_<=10){l.push(h);return}if(["id","name","type","category","region","country","brand","retailer","store","channel"].some(V=>k.includes(V))){l.push(h);return}}});let p=new Set(n.setup_config.dimension_fields||[]),w=new Set(n.setup_config.kpi_fields||[]);l.forEach(D=>p.add(D)),c.forEach(D=>w.add(D)),!n.setup_config.time_field&&d&&(n.setup_config.time_field=d),n.setup_config.dimension_fields=[...p],n.setup_config.kpi_fields=[...w],window.refreshTimePreview(),window.scrubNoise();let b=n.setup_config.dimension_fields||[],x=n.setup_config.kpi_fields||[],C=b.length?b.slice(0,3).join(", "):"none",E=x.length?x.slice(0,3).join(", "):"none",O=n.setup_config.time_field?String(n.setup_config.time_field):"not selected";Qt(i,{headline:"Suggested setup is ready.",details:`Segments: ${C}. Metrics: ${E}. Time field: ${O}.`,hasSuggestions:b.length>0||x.length>0||!!n.setup_config.time_field}),ge(n.fields,n.setup_config,n.metrics),f("Auto-suggest updated segment and metric choices from recent data.","success")};window.scrubNoise=function(){let t=Z();if(!t||!t.fields||!t.setup_config)return;let n=mt(t);if(n.length<5)return;let i=new Set(t.setup_config.excluded_fields||[]),a=0;t.fields.forEach(o=>{let l=o.name;if(t.setup_config?.dimension_fields?.includes(l)||t.setup_config?.kpi_fields?.includes(l)||t.setup_config?.time_field===l)return;let c=n.map(x=>Ce(x,l)).filter(x=>x!=null).map(x=>String(x));if(!c.length)return;let p=new Set(c).size/c.length,w=c[0]||"",b=w.length>20||w.match(/[a-f0-9]{8}-/)||l.toLowerCase().includes("id")||l.toLowerCase().includes("trace")||l.toLowerCase().includes("request");p>.8&&b&&(i.add(l),a++)}),a>0&&(t.setup_config.excluded_fields=[...i],ge(t.fields,t.setup_config,t.metrics),f(`\u{1F9F9} Noise Scrubber: Auto-hidden ${a} system fields (UUIDs/IDs).`,"info"))};window.detectDrift=function(){let t=Z();if(!t||!t.fields||!t.setup_config)return;let n=mt(t);if(n.length<3)return;let i=new Set(t.fields.map(d=>d.name)),a=[...t.setup_config.dimension_fields||[],...t.setup_config.kpi_fields||[]],o=a.filter(d=>!i.has(d)),l=t.fields.map(d=>d.name).filter(d=>!a.includes(d)&&!t.setup_config?.excluded_fields?.includes(d)&&d!==t.setup_config?.time_field);if(o.length===0||l.length===0){s.driftSuggestions={};return}let c={};o.forEach(d=>{l.forEach(p=>{Ni(d,p,n)&&(c[p]=d)})}),s.driftSuggestions=c,Object.keys(c).length>0&&ge(t.fields,t.setup_config,t.metrics)};function Ni(e,t,n){let i=n.map(c=>Ce(c,e)).filter(c=>c!==void 0),a=n.map(c=>Ce(c,t)).filter(c=>c!==void 0);if(a.length===0)return!1;let o=typeof i[0],l=typeof a[0];if(o!==l)return!1;if(o==="number"){let c=Math.max(...i),d=Math.max(...a);if(Math.abs(c-d)/Math.max(c,1)<.2)return!0}if(o==="string"){let c=i.reduce((p,w)=>p+String(w).length,0)/i.length,d=a.reduce((p,w)=>p+String(w).length,0)/a.length;if(Math.abs(c-d)<2)return!0}return!1}window.approveDriftMerge=function(t,n){if(Ri("PO Mode is ON. Turn it off to apply drift merges manually."))return;let i=Z();!i||!i.setup_config||(i.setup_config.dimension_fields?.includes(n)&&(i.setup_config.dimension_fields=i.setup_config.dimension_fields.map(a=>a===n?t:a)),i.setup_config.kpi_fields?.includes(n)&&(i.setup_config.kpi_fields=i.setup_config.kpi_fields.map(a=>a===n?t:a)),s.driftSuggestions={},ge(i.fields,i.setup_config,i.metrics),f(`\u{1F9EC} Drift Protection: Successfully self-healed "${n}" to "${t}".`))};window.updateGranularity=function(t){let n=Z();n&&n.setup_config&&(n.setup_config.time_granularity=t)};async function Fi(){if(!s.selectedApi)return;let e=s.selectedApi;f("Promoting recent averages...","success");try{let t=await fetch(`/jin/api/v2/promote-baseline/${ue(e)}`,{method:"POST"}),n=await t.json();t.ok?(f("Baseline refreshed from recent data.","success"),s.detailCache.delete(e),await qe(e)):f(n.detail||"Promotion failed.","error")}catch{f("Network error promoting baseline.","error")}}window.magicBaseline=Fi;async function Bi(e){f(`Accepting actual value as new baseline for issue ${e}...`,"success");let t=document.getElementById("drawer-note")?.value||"",n=document.getElementById("drawer-resolution-reason")?.value||"Accepted as correct baseline by operator";try{let i=await fetch(`/jin/api/v2/anomaly/${e}/promote`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({note:t,resolution_reason:n})}),a=await i.json();if(i.ok)f("Baseline updated and issue resolved.","success"),me(`Issue ${e} accepted as baseline and resolved.`,"success"),St(),await ie(!0);else{let o=a.message||"Promotion failed.";f(o,"error"),me(`Could not accept baseline for issue ${e}.`,"error")}}catch{f("Network error promoting anomaly to baseline.","error"),me(`Network error while accepting baseline for issue ${e}.`,"error")}}window.quickFixBaseline=Bi;function Fe(e,t="push"){let n=dn(e),i=s.currentView!=="api";s.currentView="api",s.currentApiTab=n,he(t),i&&K();let a=Z();if(a){le(a),(n==="uploads"||n==="history")&&s.selectedApi&&Ct(s.selectedApi);return}s.selectedApi&&Ue(s.selectedApi).then(o=>{o&&(s.activeApiDetail=o,le(o),(n==="uploads"||n==="history")&&Ct(s.selectedApi||""))})}window.switchApiTab=Fe;window.openKpiSummary=function(){Fe("summary","push"),requestAnimationFrame(()=>{let t=document.getElementById("api-kpis");t&&t.scrollIntoView({behavior:"smooth",block:"start"})})};function Cs(){Rt(),Fe("uploads"),requestAnimationFrame(()=>{let e=document.querySelector('[data-api-section="uploads"]');e&&e.scrollIntoView({behavior:"smooth",block:"start"});let t=document.getElementById("upload-file");t&&t.focus()})}window.openUploadsTab=Cs;window.refreshConfigStory=()=>{let e=Z();e&&ge(e.fields,e.setup_config||e.config||{},e.metrics)};function Hi(){[r.incidentsFeedback,r.uploadFeedback,r.configFeedback,r.reportsFeedback,r.projectWorkflowFeedback].forEach(e=>{e.setAttribute("role","status"),e.setAttribute("aria-live","polite")}),r.confirmModal.setAttribute("role","dialog"),r.confirmModal.setAttribute("aria-modal","true"),r.drawer.setAttribute("role","dialog"),r.drawer.setAttribute("aria-modal","true")}async function Di(){Hi();let e=localStorage.getItem(Zt),t=localStorage.getItem(as)==="1";s.poMode=t?e!=="off":!1,t||localStorage.setItem(Zt,"off"),r.poModeToggle.checked=s.poMode!==!1,Dt(localStorage.getItem("jin-theme")||"dark"),wt(localStorage.getItem("jin-density")||"comfortable");let n=localStorage.getItem("jin-sidebar");Ft(n?n==="collapsed":window.innerWidth<1180),s.apiFilter=localStorage.getItem("jin-api-filter")||"",s.apiStatusFilter=localStorage.getItem("jin-api-status-filter")||"",s.errorSearch=localStorage.getItem("jin-error-search")||"",s.errorStatusFilter=localStorage.getItem("jin-error-status-filter")||"",s.errorCategoryFilter=localStorage.getItem("jin-error-category-filter")||"",s.errorSeverityFilter=localStorage.getItem("jin-error-severity-filter")||"",s.incidentStatusFilter=localStorage.getItem("jin-incident-status-filter")||"",s.incidentSeverityFilter=localStorage.getItem("jin-incident-severity-filter")||"",s.incidentSort=localStorage.getItem("jin-incident-sort")||"business",s.runSort=localStorage.getItem("jin-run-sort")||"observed_at_desc",s.uploadSort=localStorage.getItem("jin-upload-sort")||"uploaded_at_desc",s.defaultView=localStorage.getItem("jin-default-view")||"api",s.operatorHandle=Le(localStorage.getItem("jin-operator-handle")||"default"),cs(),r.apiSearch.value=s.apiFilter,r.apiStatusFilter.value=s.apiStatusFilter,r.errorSearch.value=s.errorSearch,r.errorStatusFilter.value=s.errorStatusFilter,r.errorCategoryFilter.value=s.errorCategoryFilter,r.errorSeverityFilter.value=s.errorSeverityFilter,r.incidentSort.value=s.incidentSort,r.defaultViewSelect.value=s.defaultView,r.themeSelect.value=document.body.dataset.theme||"dark",fs()&&(s.apiDataState="stale",s.apiDataMessage="Showing the last known API snapshot while reconnecting..."),await ie(!1);try{await Ve(!0),await je(ye(),!1),s.projectsMonitorSnapshot=await Jt()}catch(d){W(d,"Project workflow panel could not be initialized.")}let i=new URLSearchParams(window.location.search),a=i.has("y_view")||i.has("y_api")||i.has("y_tab"),o=s.status?.endpoints?.[0]?.endpoint_path;o&&!s.selectedApi&&(s.selectedApi=o,Qe());let l=bt(),c=(s.savedViews||[]).find(d=>Number(d.id)===l);if(c&&!a){await window.applyNamedView(c.id),he("replace");return}if(a)await ws();else if(s.currentView=s.defaultView||"api",K(),s.currentView==="api"&&s.selectedApi){let d=await Ue(s.selectedApi);d&&(s.activeApiDetail=d,le(d),(s.currentApiTab==="uploads"||s.currentApiTab==="history")&&await Ct(s.selectedApi))}Pe(),he("replace")}window.addEventListener("unhandledrejection",e=>{W(e.reason,"Unexpected async error."),e.preventDefault()});window.addEventListener("popstate",()=>{ws()});Di();})();
