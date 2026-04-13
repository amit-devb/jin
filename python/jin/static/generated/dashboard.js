(()=>{function h(e){let t=document.getElementById(e);if(!t)throw new Error(`Missing dashboard element: ${e}`);return t}var a={sidebarToggle:h("sidebar-toggle"),pageTitle:h("page-title"),pageSubtitle:h("page-subtitle"),viewGuide:h("view-guide"),topbar:h("page-title").closest(".topbar"),nav:h("nav"),apiSearch:h("api-search"),apiStatusFilter:h("api-status-filter"),apiList:h("api-list"),logoutButton:h("logout-button"),themeSelect:h("theme-select"),settingsSecurity:h("settings-security"),settingsLicense:h("settings-license"),overviewMetrics:h("overview-metrics"),overviewCharts:h("overview-charts"),exportOverviewJson:h("export-overview-json"),exportOverviewReport:h("export-overview-report"),exportOverviewHtml:h("export-overview-html"),overviewAttention:h("overview-attention"),poPlaybookContent:h("po-playbook-content"),poActionWorkflow:h("po-action-workflow"),poActionValidation:h("po-action-validation"),poActionChecks:h("po-action-checks"),poActionBaseline:h("po-action-baseline"),poActionHealth:h("po-action-health"),poActionReport:h("po-action-report"),projectRegisterName:h("project-register-name"),projectRegisterAuthAdvanced:h("project-register-auth-advanced"),projectRegisterUser:h("project-register-user"),projectRegisterPass:h("project-register-pass"),projectRegisterWriteEnv:h("project-register-write-env"),projectRegisterButton:h("project-register-button"),projectAddName:h("project-add-name"),projectAddAdvanced:h("project-add-advanced"),projectAddRoot:h("project-add-root"),projectAddDbPath:h("project-add-db-path"),projectAddButton:h("project-add-button"),projectActiveSelect:h("project-active-select"),projectSelectButton:h("project-select-button"),projectLifecycleAdvanced:h("project-lifecycle-advanced"),projectDeleteConfirm:h("project-delete-confirm"),projectArchiveButton:h("project-archive-button"),projectRestoreButton:h("project-restore-button"),projectDeleteButton:h("project-delete-button"),projectPolicyCadence:h("project-policy-cadence"),projectPolicySchedule:h("project-policy-schedule"),projectPolicyBaselineMode:h("project-policy-baseline-mode"),projectPolicyThreshold:h("project-policy-threshold"),projectPolicyBundleEnabled:h("project-policy-bundle-enabled"),projectPolicyBundleSchedule:h("project-policy-bundle-schedule"),projectPolicyBundleFormat:h("project-policy-bundle-format"),projectPolicySaveButton:h("project-policy-save-button"),projectPolicyApplyButton:h("project-policy-apply-button"),projectRunBundleButton:h("project-run-bundle-button"),projectBaselinePromoteButton:h("project-baseline-promote-button"),projectHealthCheckButton:h("project-health-check-button"),projectMonitorRefreshButton:h("project-monitor-refresh-button"),projectReportDigestButton:h("project-report-digest-button"),projectWorkflowFeedback:h("project-workflow-feedback"),projectWorkflowHealth:h("project-workflow-health"),projectWorkflowMonitor:h("project-workflow-monitor"),projectWorkflowRuns:h("project-workflow-runs"),projectWorkflowReport:h("project-workflow-report"),apiEmpty:h("api-empty"),apiWorkspace:h("api-workspace"),apiTitle:h("api-title"),apiSubtitle:h("api-subtitle"),checkNowButton:h("check-now-button"),apiMethod:h("api-method"),apiPath:h("api-path"),apiMetaGrid:h("api-meta-grid"),apiKpis:h("api-kpis"),apiTrends:h("api-trends"),apiIncidentHistory:h("api-incident-history"),apiRunTable:h("api-run-table"),apiCoreInsight:h("api-core-insight"),fieldRoleGrid:h("field-role-grid"),poModeToggle:h("po-mode-toggle"),configActiveTolerance:h("config-active-tolerance"),configRelaxed:h("config-relaxed"),configNormal:h("config-normal"),configStrict:h("config-strict"),configReferences:h("config-references"),configFeedback:h("config-feedback"),configToleranceSimple:h("config-tolerance-simple"),uploadFile:h("upload-file"),uploadButton:h("upload-button"),uploadFeedback:h("upload-feedback"),uploadActivity:h("upload-activity"),configFooter:h("config-footer"),summaryFooter:h("summary-footer"),uploadsFooter:h("uploads-footer"),uploadPreviewStep:h("upload-preview-step"),uploadPreviewBody:h("upload-preview-body"),uploadConfirmToolbar:h("upload-confirm-toolbar"),previewUploadButton:h("preview-upload-button"),cancelUploadButton:h("cancel-upload-button"),exportUploads:h("export-uploads"),templateCsvLink:h("template-csv-link"),templateXlsxLink:h("template-xlsx-link"),templateCsvLinkUpload:h("template-csv-link-upload"),templateXlsxLinkUpload:h("template-xlsx-link-upload"),incidentsList:h("incidents-list"),errorsList:h("errors-list"),errorSearch:h("error-search"),errorStatusFilter:h("error-status-filter"),errorCategoryFilter:h("error-category-filter"),errorSeverityFilter:h("error-severity-filter"),exportErrorsJson:h("export-errors-json"),exportErrorsReport:h("export-errors-report"),incidentSort:h("incident-sort"),incidentFilters:h("incident-filters"),exportIncidents:h("export-incidents"),exportIncidentsJson:h("export-incidents-json"),exportIncidentsReport:h("export-incidents-report"),exportIncidentsHtml:h("export-incidents-html"),bulkAction:h("bulk-action"),bulkNote:h("bulk-note"),bulkRun:h("bulk-run"),bulkPreview:h("bulk-preview"),schedulerList:h("scheduler-list"),exportRuns:h("export-runs"),exportRunsJson:h("export-runs-json"),exportApiReport:h("export-api-report"),exportApiHtml:h("export-api-html"),densitySelect:h("density-select"),defaultViewSelect:h("default-view-select"),namedViewInput:h("named-view-input"),saveNamedView:h("save-named-view"),exportNamedViews:h("export-named-views"),importNamedViewsButton:h("import-named-views-button"),importNamedViewsFile:h("import-named-views-file"),savedViews:h("saved-views"),drawerBackdrop:h("incident-drawer-backdrop"),drawer:h("incident-drawer"),drawerTitle:h("drawer-title"),drawerBody:h("drawer-body"),drawerClose:h("drawer-close"),confirmBackdrop:h("confirm-backdrop"),confirmModal:h("confirm-modal"),confirmTitle:h("confirm-title"),confirmCopy:h("confirm-copy"),confirmCancel:h("confirm-cancel"),confirmAccept:h("confirm-accept"),toastStack:h("toast-stack"),reportEndpointSelect:h("report-endpoint-select"),reportGrainSearch:h("report-grain-search"),runReportButton:h("run-report-button"),reportsFeedback:h("reports-feedback"),reportsContent:h("reports-content"),exportReportCsv:h("export-report-csv"),incidentsFeedback:h("incidents-feedback"),runDetailDrawer:h("run-detail-drawer"),runDetailTitle:h("run-detail-title"),runDetailContent:h("run-detail-content"),runDetailClose:h("run-detail-close")};var He=["method","status","setup","issues"],Ci=["comfortable","compact","dense"],at={method:92,status:92,setup:112,issues:88},s={currentView:"overview",currentApiTab:"summary",selectedApi:null,apiWorkspaceOpen:!1,selectedIncident:null,status:null,anomalies:null,scheduler:null,detailCache:new Map,apiFilter:"",apiStatusFilter:"",apiBrowserMode:"grouped",apiBrowserDensity:"comfortable",apiBrowserSort:"path",apiBrowserSortDirection:"asc",apiBrowserColumns:{method:!0,status:!0,setup:!0,issues:!0},apiBrowserColumnOrder:["method","status","setup","issues"],apiBrowserColumnWidths:{method:at.method,status:at.status,setup:at.setup,issues:at.issues},apiBrowserPage:1,apiBrowserScrollTop:0,apiBrowserVirtualWindowStart:0,apiBrowserVirtualWindowEnd:0,errorSearch:"",errorStatusFilter:"",errorCategoryFilter:"",errorSeverityFilter:"",incidentStatusFilter:"",incidentSeverityFilter:"",collapsedGroups:{},incidentSort:"business",confirmAction:null,incidentPage:1,uploadPage:1,runPage:1,uploadSort:"uploaded_at_desc",runSort:"observed_at_desc",density:"comfortable",defaultView:"overview",lastReportData:[],savedViews:[],operatorHandle:"",activeApiDetail:null,projectsCatalog:[],activeProjectId:null,projectMonitorPolicy:null,projectHealth:null,projectsMonitorSnapshot:null,projectRunHistory:[],projectDigest:null,poPlaybook:null,projectWorkflowMessage:null,incidentsMessage:null,reportsMessage:null,projectPolicyLoadedFor:null,autoSuggestSummaryByApi:{},autoSuggestTriggeredByApi:{},coreInsightsByApi:{},poMode:!1,configFocusExpandedByApi:{},activeUploadJobByApi:{},mappingNoSamplesToastByApi:{},uploadConfirmGateByApi:{},apiDataState:"fresh",apiDataMessage:null,apiDataUpdatedAt:null};function vn(e){document.body.dataset.sidebar=e?"collapsed":"expanded",localStorage.setItem("jin-sidebar",e?"collapsed":"expanded")}function p(e){return!e&&e!==0?"\u2014":typeof e=="number"?Number.isInteger(e)?String(e):e.toFixed(2):String(e)}function wt(e){return(s.status?.project?.policy?.features||[]).includes(e)}function Le(){return document.body.dataset.maintainer==="1"||!!s.status?.project?.is_maintainer}function ne(e){if(!e)return"\u2014";let t=new Date(e);return Number.isNaN(t.getTime())?String(e):t.toLocaleString()}function he(e){return encodeURIComponent(String(e||"").replace(/^\//,""))}function wn(e,t="$"){return new Intl.NumberFormat("en-US",{style:"currency",currency:t==="$"?"USD":t,minimumFractionDigits:2,maximumFractionDigits:2}).format(e)}function Fe(e){return String(e||"").trim().toLowerCase().replace(/[^a-z0-9._-]+/g,"-").replace(/^-+|-+$/g,"")||"default"}function ts(){return Fe(s.operatorHandle||localStorage.getItem("jin-operator-handle")||"default")}function bn(){return`jin-named-views:${ts()}`}function Jt(){return`jin-default-view-id:${ts()}`}function Gt(){let e=Number(localStorage.getItem(Jt())||0);if(Number.isFinite(e)&&e>0)return e;let t=Number(localStorage.getItem("jin-default-view-id")||0);return Number.isFinite(t)&&t>0?t:0}function Sn(e){document.body.dataset.theme=e,localStorage.setItem("jin-theme",e),a.themeSelect&&(a.themeSelect.value=e)}function Kt(e){s.density=e==="dense"?"dense":"comfortable",document.body.dataset.density=s.density,localStorage.setItem("jin-density",s.density),a.densitySelect&&(a.densitySelect.value=s.density)}function Ge(e){let t=String(e||"comfortable").toLowerCase();return Ci.includes(t)?t:"comfortable"}function $n(e){let t=Ge(e);return t==="compact"?"Compact":t==="dense"?"Dense":"Comfortable"}function Xt(e){let t=Ge(e);return t==="compact"?{rowHeight:62,tableGap:5,gridGap:7,headPadY:7,headPadX:9,rowPadY:8,rowPadX:9}:t==="dense"?{rowHeight:54,tableGap:4,gridGap:6,headPadY:6,headPadX:8,rowPadY:7,rowPadX:8}:{rowHeight:72,tableGap:6,gridGap:8,headPadY:8,headPadX:10,rowPadY:10,rowPadX:10}}function zt(e){let t=String(e||"").trim().replace(/\[\]/g,"");return t||""}function Wt(e,t=3){let n=[...new Set(e.map(r=>zt(r)).filter(Boolean))];if(!n.length)return"";let i=n.slice(0,t);return i.length===1?i[0]:i.length===2?`${i[0]} and ${i[1]}`:n.length>t?`${i.join(", ")}, and ${n.length-t} more`:i.join(", ")}function ot(e=[]){let t=Array.isArray(e)?e.filter(Boolean):[],n=[],i=[],r=[],o=[],l=[],c=[],d=[],u=(x,y)=>{let P=zt(y);!P||x.includes(P)||x.push(P)},$=(x,y,P)=>{let _=zt(y);if(!_||P<=0)return;let V=x.find(f=>f.name===_);if(V){V.score=Math.max(V.score,P);return}x.push({name:_,score:P})},A=x=>[...x].sort((y,P)=>P.score-y.score||y.name.localeCompare(P.name)).map(y=>y.name),N=(x,y,P)=>{let _=0;return x?.time_candidate&&(_+=18),String(x?.suggested_role||"").toLowerCase()==="time"&&(_+=18),(P==="datetime"||P==="date")&&(_+=20),y.includes("snapshot")&&(_+=24),y.includes("timestamp")&&(_+=15),y.includes("created_at")&&(_+=8),y.includes("updated_at")&&(_+=8),y.includes("period")&&(_+=18),y.includes("date")&&(_+=12),y.includes("time")&&(_+=12),_},H=(x,y,P)=>{let _=0;return String(x?.kind||"").toLowerCase()==="kpi"&&(_+=18),["int","integer","float","decimal","double","number"].includes(P)&&(_+=18),y.includes("amount")&&(_+=14),y.includes("price")&&(_+=14),y.includes("revenue")&&(_+=16),y.includes("value")&&(_+=12),y.includes("total")&&(_+=14),y.includes("rate")&&(_+=12),y.includes("percentage")&&(_+=14),y.includes("score")&&(_+=12),y.includes("in_stock")&&(_+=10),y.includes("units")&&(_+=12),y.includes("count")&&(_+=12),y.includes("quantity")&&(_+=12),y.includes("cost")&&(_+=12),y.includes("sales")&&(_+=14),y.includes("rsv")&&(_+=16),_},j=(x,y,P)=>{let _=0;return String(x?.kind||"").toLowerCase()==="dimension"&&(_+=18),(P==="str"||P==="string")&&(_+=16),P.includes("enum")&&(_+=16),P.includes("literal")&&(_+=16),y.includes("retailer")&&(_+=24),y.includes("tenant")&&(_+=16),y.includes("region")&&(_+=16),y.includes("country")&&(_+=14),y.includes("category")&&(_+=14),y.includes("type")&&(_+=12),y.includes("kind")&&(_+=12),y.includes("code")&&(_+=12),y.includes("group")&&(_+=10),y.includes("sku")&&(_+=12),y.includes("status")&&(_+=12),y.includes("name")&&(_+=12),y.includes("label")&&(_+=12),y.includes("brand")&&(_+=12),y.includes("store")&&(_+=12),y.includes("channel")&&(_+=12),y.includes("id")&&(_+=10),_};t.forEach(x=>{let y=zt(x?.name);if(!y)return;let P=y.toLowerCase(),_=String(x?.annotation||x?.type||"").toLowerCase(),V=N(x,P,_);if(V>0){$(r,y,V),(_==="date"||_==="datetime"||P.includes("time")||P.includes("date")||P.includes("timestamp")||P.includes("created_at")||P.includes("updated_at")||P.includes("period"))&&u(c,y);return}let f=H(x,P,_),m=j(x,P,_);f>=m&&f>0?($(i,y,f),["int","integer","float","decimal","double","number"].includes(_)&&u(l,y)):m>0?($(n,y,m),(_==="str"||_==="string"||_.includes("enum")||_.includes("literal"))&&u(o,y)):(u(d,y),(_==="str"||_==="string"||_.includes("enum")||_.includes("literal"))&&u(o,y),["int","integer","float","decimal","double","number"].includes(_)&&u(l,y),(_==="date"||_==="datetime"||P.includes("time")||P.includes("date")||P.includes("timestamp")||P.includes("created_at")||P.includes("updated_at")||P.includes("period"))&&u(c,y))});let k=A(n),M=A(i),v=A(r),C=[];k.length||C.push("Segment"),M.length||C.push("Metric"),v.length||C.push("Time");let R=C.length===0,T=k.length+M.length+v.length;if(!t.length)return{ready:!1,summary:"Jin found the Pydantic model, but it does not expose any fields yet.",detail:"Add typed response fields so Jin can identify Segment, Metric, and Time candidates.",missingRoles:C,segmentCandidates:k,metricCandidates:M,timeCandidates:v,weakFields:d,candidateCount:T};if(R)return{ready:!0,summary:"Jin can pre-fill Segment, Metric, and Time from the Pydantic response model before any traffic arrives.",detail:"The model exposes clear Segment, Metric, and Time candidates already.",missingRoles:C,segmentCandidates:k,metricCandidates:M,timeCandidates:v,weakFields:d,candidateCount:T};let E=[];return k.length?E.push(k.length>1?`Best Segment candidate: ${k[0]}. Next: ${k[1]}.`:`Best Segment candidate: ${k[0]}.`):E.push(o.length?`No clear Segment fields yet. Closest text-like fields: ${Wt(o)}. Use a stable string or enum for grouping.`:"No clear Segment fields yet. Add a stable string or enum field for grouping, like retailer or region."),M.length?E.push(M.length>1?`Best Metric candidate: ${M[0]}. Next: ${M[1]}.`:`Best Metric candidate: ${M[0]}.`):E.push(l.length?`No clear Metric fields yet. Closest numeric fields: ${Wt(l)}. Mark one as the KPI you want to monitor.`:"No clear Metric fields yet. Add a typed int, float, or Decimal field for the KPI you want to monitor."),v.length?E.push(v.length>1?`Best Time candidate: ${v[0]}. Next: ${v[1]}.`:`Best Time candidate: ${v[0]}.`):E.push(c.length?`No clear Time field yet. Closest date-like fields: ${Wt(c)}. Mark one as date or datetime if this API is time-based.`:"No clear Time field yet. Add a typed date or datetime field like snapshot_date or created_at if this API is time-based."),d.length&&E.push(`Weak or generic fields: ${Wt(d)}.`),{ready:!1,summary:`Jin found the Pydantic model, but ${C.join(", ")} still need clearer fields.`,detail:E.join(" "),missingRoles:C,segmentCandidates:k,metricCandidates:M,timeCandidates:v,weakFields:d,candidateCount:T}}function St(e){return e?.severity==="critical"?"critical":e?.status||e?.severity||"active"}function tt(e,t,n){return`
        <div class="metric">
          <span>${e}</span>
          <strong>${t}</strong>
          <small>${n}</small>
        </div>
      `}function ke(e){return`<div class="empty">${e}</div>`}function $t(){return(s.status?.endpoints||[]).filter(e=>{let t=`${e.endpoint_path} ${e.http_method}`.toLowerCase(),n=!s.apiFilter||t.includes(s.apiFilter.toLowerCase()),i=!s.apiStatusFilter||(e.status||"")===s.apiStatusFilter;return n&&i})}function lt(e){let n=String(e||"").replace(/^\//,"").split("/");return n[1]||n[0]||"other"}function ct(e,t,n){let i=Math.max(1,Math.ceil(e.length/n)),r=Math.min(Math.max(t,1),i);return{items:e.slice((r-1)*n,r*n),page:r,totalPages:i}}function _t(e,t,n={}){let i=Math.max(36,Math.round(Number(n.rowHeight)||72)),r=Math.max(12,Math.round(Number(n.windowRows)||28)),o=Math.max(2,Math.round(Number(n.overscan)||8)),l=Math.max(0,Math.round(Number(e)||0));if(!l)return{start:0,end:0,rowHeight:i,windowRows:r,overscan:o};let c=Math.max(0,Math.round(Number(t)||0)),d=Math.max(0,Math.floor(c/i)),u=Math.max(0,d-o),$=Math.min(l,u+r);return{start:u,end:Math.max($,u+1),rowHeight:i,windowRows:r,overscan:o}}function dt(e,t,n){return n<=1?"":`
        <div class="pagination">
          <button class="action ghost" type="button" onclick="changePage('${e}', -1)" ${t<=1?"disabled":""}>Prev</button>
          <span class="tiny">Page ${t} of ${n}</span>
          <button class="action ghost" type="button" onclick="changePage('${e}', 1)" ${t>=n?"disabled":""}>Next</button>
        </div>
      `}function kt(e,t){if(!t.length){w("Nothing to export.","error");return}let n=Object.keys(t[0]),i=[n.join(","),...t.map(c=>n.map(d=>{let u=c[d],$=typeof u=="string"?u:JSON.stringify(u??"");return`"${String($).replace(/"/g,'""')}"`}).join(","))].join("\\n"),r=new Blob([i],{type:"text/csv;charset=utf-8;"}),o=URL.createObjectURL(r),l=document.createElement("a");l.href=o,l.download=e,document.body.appendChild(l),l.click(),l.remove(),URL.revokeObjectURL(o),w(`Exported ${e}.`,"success")}function Ie(e,t,n="text/plain;charset=utf-8;"){let i=new Blob([t],{type:n}),r=URL.createObjectURL(i),o=document.createElement("a");o.href=r,o.download=e,document.body.appendChild(o),o.click(),o.remove(),URL.revokeObjectURL(r),w(`Exported ${e}.`,"success")}function ut(e,t){Ie(e,JSON.stringify(t,null,2),"application/json;charset=utf-8;")}function oe(){localStorage.setItem("jin-api-filter",s.apiFilter||""),localStorage.setItem("jin-api-status-filter",s.apiStatusFilter||""),localStorage.setItem("jin-api-browser-mode",s.apiBrowserMode||"grouped"),localStorage.setItem("jin-api-browser-density",s.apiBrowserDensity||"comfortable"),localStorage.setItem("jin-api-browser-sort",s.apiBrowserSort||"path"),localStorage.setItem("jin-api-browser-sort-direction",s.apiBrowserSortDirection||"asc"),localStorage.setItem("jin-api-browser-columns",JSON.stringify(At())),localStorage.setItem("jin-api-browser-column-order",JSON.stringify(_n())),localStorage.setItem("jin-api-browser-column-widths",JSON.stringify(kn())),localStorage.setItem("jin-error-search",s.errorSearch||""),localStorage.setItem("jin-error-status-filter",s.errorStatusFilter||""),localStorage.setItem("jin-error-category-filter",s.errorCategoryFilter||""),localStorage.setItem("jin-error-severity-filter",s.errorSeverityFilter||""),localStorage.setItem("jin-incident-status-filter",s.incidentStatusFilter||""),localStorage.setItem("jin-incident-severity-filter",s.incidentSeverityFilter||""),localStorage.setItem("jin-incident-sort",s.incidentSort||"business"),localStorage.setItem("jin-run-sort",s.runSort||"observed_at_desc"),localStorage.setItem("jin-upload-sort",s.uploadSort||"uploaded_at_desc"),localStorage.setItem("jin-default-view",s.defaultView||"overview")}function De(){let e=Array.isArray(s.anomalies?.history)?s.anomalies?.history:[],t=Array.isArray(s.anomalies?.anomalies)?s.anomalies?.anomalies:[],n=[],i=new Map,r=l=>{let c=Number(l?.id);return Number.isFinite(c)&&c>0?`id:${c}`:[String(l?.endpoint_path||""),String(l?.grain_key||""),String(l?.kpi_field||""),String(l?.detected_at||l?.resolved_at||""),String(l?.detection_method||"")].join("|")},o=l=>{if(!l||typeof l!="object")return;let c=r(l),d=i.get(c);if(d==null){i.set(c,n.length),n.push(l);return}let u=n[d]||{};n[d]={...u,...l}};return e.forEach(o),t.forEach(o),n}function nt(){return Bt(De()).filter(e=>{let t=!s.incidentStatusFilter||(e.status||"active")===s.incidentStatusFilter,n=!s.incidentSeverityFilter||(e.severity||"low")===s.incidentSeverityFilter;return t&&n})}function xt(){let e=s.status?.endpoints||[],t=s.anomalies?.history||[],n=s.status?.summary||{total_endpoints:0,healthy:0,anomalies:0,unconfirmed:0};return{generated_at:new Date().toISOString(),endpoints_tracked:e.length,healthy_endpoints:n.healthy||0,unconfirmed_endpoints:n.unconfirmed||0,active_incidents:(s.anomalies?.anomalies||[]).length,selected_api:s.selectedApi||null}}function At(){return _n().filter(e=>s.apiBrowserColumns?.[e]!==!1)}function _n(){let e=Array.isArray(s.apiBrowserColumnOrder)?s.apiBrowserColumnOrder:[],t=new Set,n=e.map(i=>String(i)).filter(i=>He.includes(i)).filter(i=>t.has(i)?!1:(t.add(i),!0));return He.forEach(i=>{t.has(i)||n.push(i)}),n}function Ti(e){let n=(Array.isArray(e)?e:He.slice()).filter(i=>He.includes(i));return n.length?n.length===He.length?"all columns":`columns: ${n.join(", ")}`:"path only"}function Pi(e){let n=(Array.isArray(e)?e:He.slice()).filter(i=>He.includes(i));return n.length?`order: ${n.join(", ")}`:"default order"}function kn(){let e=s.apiBrowserColumnWidths||{};return He.reduce((t,n)=>{let i=at[n],r=Number(e[n]);return t[n]=Number.isFinite(r)&&r>0?Math.round(r):i,t},{})}function Mi(e){let t=e||kn(),n=He.map(i=>{let r=Number(t[i]),o=at[i];return Number.isFinite(r)&&r>0?{column:i,value:Math.round(r),fallback:o}:{column:i,value:o,fallback:o}}).filter(({value:i,fallback:r})=>i!==r).map(({column:i,value:r})=>`${i} ${r}px`);return n.length?`widths: ${n.join(", ")}`:"default widths"}function xn(){return{id:Date.now(),name:"",currentView:s.currentView,apiFilter:s.apiFilter,apiStatusFilter:s.apiStatusFilter,apiBrowserMode:s.apiBrowserMode,apiBrowserDensity:s.apiBrowserDensity,apiBrowserSort:s.apiBrowserSort,apiBrowserSortDirection:s.apiBrowserSortDirection,apiBrowserColumns:At(),apiBrowserColumnOrder:_n(),apiBrowserColumnWidths:kn(),errorSearch:s.errorSearch,errorStatusFilter:s.errorStatusFilter,errorCategoryFilter:s.errorCategoryFilter,errorSeverityFilter:s.errorSeverityFilter,incidentStatusFilter:s.incidentStatusFilter,incidentSeverityFilter:s.incidentSeverityFilter,incidentSort:s.incidentSort,runSort:s.runSort,uploadSort:s.uploadSort,density:s.density}}function jt(){localStorage.setItem(bn(),JSON.stringify(s.savedViews||[]))}function Be(){a.savedViews&&(a.savedViews.innerHTML=s.savedViews.length?s.savedViews.map(e=>`
        <div class="saved-view-item">
          <div>
            <strong>${e.name}</strong>
            <div class="tiny">${e.currentView} \u2022 ${e.apiStatusFilter||"all statuses"} \u2022 ${e.apiBrowserMode||"grouped"} browser \u2022 ${$n(e.apiBrowserDensity||"comfortable")} rows \u2022 ${Ti(e.apiBrowserColumns)} \u2022 ${Pi(e.apiBrowserColumnOrder)} \u2022 ${Mi(e.apiBrowserColumnWidths)} \u2022 ${e.apiBrowserSort||"path"} ${e.apiBrowserSortDirection||"asc"} \u2022 ${e.density||"comfortable"} density</div>
          </div>
          <div class="toolbar compact">
            <button class="action secondary" type="button" onclick="applyNamedView(${e.id})">Apply</button>
            <button class="action secondary" type="button" onclick="setDefaultNamedView(${e.id})">${Gt()===Number(e.id)?"Default":"Make Default"}</button>
            <button class="action ghost" type="button" onclick="deleteNamedView(${e.id})">Delete</button>
          </div>
        </div>
      `).join(""):'<div class="empty">No saved views yet. Save a filter + browser combination for faster operator workflows.</div>')}function pt(e,t,n){let i=[...e];return t===`${n}_asc`?(i.sort((r,o)=>String(r[n]||"").localeCompare(String(o[n]||""))),i):t===`${n}_desc`?(i.sort((r,o)=>String(o[n]||"").localeCompare(String(r[n]||""))),i):t==="grain_asc"?(i.sort((r,o)=>String(r.grain_key||"").localeCompare(String(o.grain_key||""))),i):t==="grain_desc"?(i.sort((r,o)=>String(o.grain_key||"").localeCompare(String(r.grain_key||""))),i):(t==="kpi_asc"&&i.sort((r,o)=>String(r.kpi_field||r.kpi_json&&Object.keys(r.kpi_json)[0]||"").localeCompare(String(o.kpi_field||o.kpi_json&&Object.keys(o.kpi_json)[0]||""))),i)}function Ct(){let e=document.querySelectorAll("[data-api-tab]"),t=document.querySelector(".setup-wizard");if(document.querySelectorAll("[data-wizard-step]").forEach(i=>{let r=i.dataset.wizardStep;i.classList.toggle("active",r===s.currentApiTab)}),!e.length){document.querySelectorAll("[data-api-section]").forEach(i=>i.classList.add("active"));return}document.querySelectorAll("[data-api-section]").forEach(i=>{let r=i.dataset.apiSection,o=r===s.currentApiTab||s.currentApiTab==="summary"&&(r==="summary"||r==="incidents"||r==="history");i.classList.toggle("active",o)}),e.forEach(i=>{i.classList.toggle("active",i.dataset.apiTab===s.currentApiTab)});let n=document.getElementById("magic-baseline-button");n&&n.classList.toggle("brand-glow",s.currentApiTab==="uploads")}function Tt(e){s.selectedIncident=e,a.drawerTitle.textContent=`${e.endpoint_path} \u2022 ${e.kpi_field}`;let t=e.timeline||[],n=Number(e.pct_change||0),i=Math.abs(n),r=n>0,o=Number(e.confidence),l=Number.isFinite(o)?Math.round(o*100):null,c=l==null?"Confidence is not available yet (still learning this pattern).":`Confidence: ${l}%.`,d={active:"Needs review",acknowledged:"In review",snoozed:"Snoozed",suppressed:"Suppressed",resolved:"Resolved"},u={critical:"High",high:"High",medium:"Medium",low:"Low"},$=e.detected_at?ne(e.detected_at):"Not recorded yet",A=n===0?"equal":r?"higher":"lower",N=String(e.endpoint_path).replace(/'/g,"\\\\'"),H=i>=40?`<strong>Major ${r?"increase":"drop"}</strong> compared to the target.`:`<strong>${r?"Higher":"Lower"}</strong> than expected.`;a.drawerBody.innerHTML=`
        <div class="row-card drawer-quick-summary">
          <strong>What happened</strong>
          <ul class="drawer-bullets">
            <li><strong>${e.kpi_field}</strong> is ${p(i)}% ${A} than the expected value.</li>
            <li>Expected <strong>${p(e.baseline_used)}</strong>, API returned <strong>${p(e.actual_value)}</strong>.</li>
            <li>${c}</li>
          </ul>
        </div>

        <div class="comparison-card">
          <div class="comparison-side">
            <div class="comparison-label">Expected</div>
            <div class="comparison-value">${p(e.baseline_used)}</div>
            <div class="comparison-hint">Based on ${e.config_source==="reference"?"your uploaded file":"historical learning"}</div>
          </div>
          <div class="comparison-side reality">
            <div class="comparison-label">Reality</div>
            <div class="comparison-value anomaly-ink">${p(e.actual_value)}</div>
            <div class="comparison-hint">Observed in latest run</div>
          </div>
        </div>

        ${Number(e.impact)>0?`
          <div class="impact-card">
            <div class="impact-header">
              <span class="impact-icon">\u{1F4B0}</span>
              <strong>Estimated impact</strong>
            </div>
            <div class="impact-value">${wn(e.impact,e.currency||"$")}</div>
            <div class="impact-hint">Potential loss/risk for this grain.</div>
          </div>
        `:""}

        <div class="drift-indicator">
          <span>Difference: ${p(n)}%</span>
          <div class="drift-bar-wrap">
            <div class="drift-bar-fill" style="width: ${Math.min(100,i)}%"></div>
          </div>
        </div>

        <div class="business-explanation">
          ${H} ${l==null?"Jin is still building confidence for this pattern.":`Jin is <strong>${l}% confident</strong> this is a real anomaly.`}
        </div>

        <div class="callout" style="margin-top:20px;">
          <div><strong>Why this alert appeared</strong></div>
          <div style="margin-top:6px;">${e.why_flagged||e.ai_explanation||"No explanation available."}</div>
        </div>

        <div class="meta-grid">
          <div class="meta-card"><strong>Status</strong><span>${d[e.status]||e.status||"Needs review"}</span></div>
          <div class="meta-card"><strong>Priority</strong><span>${u[e.severity]||e.severity||"Medium"}</span></div>
          <div class="meta-card"><strong>Owner</strong><span>${e.owner||"Unassigned"}</span></div>
          <div class="meta-card"><strong>Detected</strong><span>${$}</span></div>
          <div class="meta-card"><strong>Change details</strong><span>${e.change_since_last_healthy_run||`${e.kpi_field} moved by ${p(n)}% from target.`}</span></div>
        </div>

        ${e.sample_json?`
          <details class="simple-section nested">
            <summary>Technical details</summary>
            <div class="simple-section-body">
              <div class="tiny muted" style="margin-bottom:8px;">Raw payload that triggered this alert.</div>
              <pre class="code-block" style="background:rgba(0,0,0,0.2); padding:10px; border-radius:6px; font-size:11px; max-height:200px; overflow:auto; border:1px solid var(--line);">${p(e.sample_json)}</pre>
            </div>
          </details>
        `:""}

        <div class="suggestion-toolbar">
          <div class="tiny" style="margin-bottom:8px; font-weight:700; color:var(--ink-soft); text-transform:uppercase; letter-spacing:0.05em;">Recommended next step</div>

          <button class="action secondary" style="width:100%; justify-content:center;" type="button" onclick="quickFixBaseline(${e.id})">
            Accept ${p(e.actual_value)} as new target
          </button>
          <div class="tiny muted" style="margin-top:6px;">Use this only if this new value is expected going forward.</div>

          <div class="${wt("ai_chat")?"":"feature-locked"}" style="margin-top:8px;">
            <button class="action" style="width:100%; justify-content:center; background:var(--panel-alt); color:var(--ink);" type="button" 
                    ${wt("ai_chat")?'onclick="investigateWithAi()"':""}>
              ${wt("ai_chat")?"\u2728 Explain this alert with AI":'\u2728 Explain this alert with AI <span class="feature-lock-badge">BUSINESS</span>'}
            </button>
          </div>
        </div>

        <details class="simple-section nested">
          <summary>Timeline</summary>
          <div class="simple-section-body">
            <div class="history-list" style="margin-top:10px;">
              ${t.length?t.map(j=>`
                <div class="history-item">
                  <strong>${j.event_type||"event"}</strong>
                  <div class="tiny">${ne(j.created_at)}</div>
                  ${j.owner?`<div class="tiny muted">Owner: ${j.owner}</div>`:""}
                  <div class="muted" style="margin-top:4px;">${j.note||j.resolution_reason||"No note recorded."}</div>
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
          <button class="action secondary" type="button" onclick="quickFixBaseline(${e.id})">Accept as Target</button>
          <button class="action warn" type="button" onclick="confirmDrawerIncident(${e.id}, 'resolved', 0)">Resolve</button>
        </div>
        <details class="simple-section nested">
          <summary>More actions</summary>
          <div class="simple-section-body">
            <div class="toolbar">
              <button class="action secondary" type="button" onclick="confirmDrawerIncident(${e.id}, 'snoozed', 60)">Snooze 60m</button>
              <button class="action secondary" type="button" onclick="confirmDrawerIncident(${e.id}, 'suppressed', 60)">Suppress 60m</button>
              <button class="action ghost" type="button" onclick="openApi('${N}')">Open API</button>
            </div>
          </div>
        </details>
      `,a.drawerBackdrop.classList.add("open"),a.drawer.classList.add("open"),a.drawerBody.scrollTop=0}function Yt(){s.selectedIncident=null,a.drawerBackdrop.classList.remove("open"),a.drawer.classList.remove("open")}function w(e,t="success"){let n=document.createElement("div");n.className=`toast ${t}`,n.textContent=e,a.toastStack.appendChild(n),setTimeout(()=>{n.remove()},2600)}function Pt(e,t,n){s.confirmAction=n,a.confirmTitle.textContent=e,a.confirmCopy.textContent=t,a.confirmBackdrop.classList.add("open"),a.confirmModal.classList.add("open")}function Qt(){s.confirmAction=null,a.confirmBackdrop.classList.remove("open"),a.confirmModal.classList.remove("open")}function qt(e){return{critical:4,high:3,medium:2,low:1}[e?.severity]||0}function An(e){let t=Number(e?.confidence);if(!Number.isFinite(t))return 0;let n=t<=1?t*100:t;return Math.max(0,Math.min(100,n))}function jn(e){let t=Number(e?.impact);return Number.isFinite(t)?Math.max(0,Math.abs(t)):0}function bt(e){let t=qt(e)*18,n=Math.min(100,Math.abs(Number(e?.pct_change)||0))*.4,i=An(e)*.18,r=jn(e),o=r<=0?0:Math.min(50,Math.log10(r+1)*12),l=new Date(e?.detected_at||e?.resolved_at||"").getTime(),c=Date.now(),d=Number.isFinite(l)?Math.max(0,(c-l)/(1e3*60*60)):9999,u=d<=12?22:d<=48?16:d<=120?8:0,$=String(e?.status||e?.incident_status||"active").toLowerCase(),A=$==="resolved"?-100:$==="suppressed"?-18:$==="snoozed"?-12:$==="acknowledged"?-4:0;return t+n+i+o+u+A}function Mt(e){let t=bt(e);return t>=110?"Critical":t>=80?"High":t>=55?"Watch":t>=30?"Review":"Low"}function Lt(e){let t=String(e?.status||e?.incident_status||"active").toLowerCase();if(t==="resolved")return"Safe for now";if(t==="suppressed"||t==="snoozed")return"Needs attention";let n=Mt(e);return n==="Critical"||n==="High"?"Block release":n==="Watch"||n==="Review"?"Needs attention":"Safe for now"}function ns(e){let t=Lt(e);return t==="Block release"?"danger":t==="Needs attention"?"warning":"success"}function ss(e){let t=[],n=qt(e);n>0&&t.push(`severity ${n}/4`);let i=Math.abs(Number(e?.pct_change)||0);t.push(`drift ${Math.round(Math.min(100,i))}%`);let r=Math.round(An(e));r>0&&t.push(`confidence ${r}%`);let o=jn(e);if(o>0)try{t.push(`impact ${wn(o,e?.currency||"$")}`)}catch{t.push(`impact ${o.toFixed(2)}`)}let l=String(e?.status||e?.incident_status||"active").toLowerCase();return l!=="active"&&t.push(`state ${l}`),t}function is(e){let t=Math.abs(Number(e?.pct_change)||0),n=jn(e),i=Math.round(An(e)),r=[];if(n>0)try{r.push(`Estimated impact ${wn(n,e?.currency||"$")}.`)}catch{r.push(`Estimated impact ${n.toFixed(2)}.`)}return t>=75?r.push("Change magnitude is critical."):t>=30?r.push("Change magnitude is high."):t>=15?r.push("Change magnitude is medium."):r.push("Change magnitude is currently low."),i>0&&r.push(`${i}% confidence this drift is real.`),e?.owner&&r.push(`Owner: ${e.owner}.`),r.join(" ")}function Bt(e){let t=[...e];return s.incidentSort==="business"?(t.sort((n,i)=>bt(i)-bt(n)||String(i.detected_at||"").localeCompare(String(n.detected_at||""))),t):s.incidentSort==="severity"?(t.sort((n,i)=>qt(i)-qt(n)||String(i.detected_at||"").localeCompare(String(n.detected_at||""))),t):s.incidentSort==="status"?(t.sort((n,i)=>String(n.status||"").localeCompare(String(i.status||""))||String(i.detected_at||"").localeCompare(String(n.detected_at||""))),t):(t.sort((n,i)=>String(i.detected_at||i.resolved_at||"").localeCompare(String(n.detected_at||n.resolved_at||""))),t)}window.renderApiSections=Ct;var Oe=class extends Error{constructor(t,n,i){super(t),this.name="DashboardApiError",this.status=n,this.url=i}};function Li(e){if(!(e instanceof Error))return!1;let t=e.message.toLowerCase();return t.includes("failed to fetch")||t.includes("networkerror")||t.includes("network request failed")||t.includes("connection reset")||t.includes("timeout")||t.includes("abort")}async function Bi(e,t,n=8e3){let i=new AbortController,r=window.setTimeout(()=>i.abort(),n);try{let o=new Headers(t?.headers||{});o.has("x-jin-client")||o.set("x-jin-client","dashboard");let l=await fetch(e,{...t||{},headers:o,signal:i.signal}),d=(l.headers.get("content-type")||"").includes("application/json")?await l.json():await l.text();if(!l.ok){let u=typeof d=="object"&&d?d.detail||d.error:d;throw new Oe(`${l.status} ${l.statusText}${u?`: ${u}`:""}`,l.status,e)}return d}catch(o){throw o?.name==="AbortError"?new Oe(`Request timed out for ${e}`,void 0,e):o instanceof Oe?o:new Oe(o?.message||`Request failed for ${e}`,void 0,e)}finally{window.clearTimeout(r)}}async function re(e,t,n=8e3){let r=0,o=null;for(;r<5;){r+=1;try{return await Bi(e,t,n)}catch(l){if(o=l,!(Li(l)&&r<5))break;let d=Math.min(250*2**(r-1),2e3);await new Promise(u=>window.setTimeout(u,d))}}throw o}async function mt(e){if(s.detailCache.has(e))return s.detailCache.get(e);let t=await re(`/jin/api/v2/endpoint/${he(e)}`);return t&&t.config&&(t.setup_config=JSON.parse(JSON.stringify(t.config))),s.detailCache.set(e,t),t}function Z(){return s.selectedApi&&s.detailCache.get(s.selectedApi)||null}async function Zt(){s.status=await re("/jin/api/v2/status")}async function rs(){s.anomalies=await re("/jin/api/v2/anomalies")}async function gt(){s.scheduler=await re("/jin/api/v2/scheduler")}async function as(e){return await re("/jin/api/v2/projects/register",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e||{})},2e4)}async function os(e=!0){return await re(`/jin/api/v2/projects${e?"?include_archived=1":""}`,void 0,2e4)}async function ls(e){return await re("/jin/api/v2/projects",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e||{})},2e4)}async function en(e){return await re("/jin/api/v2/projects/activate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({project_id:e})},2e4)}async function cs(e){return await re(`/jin/api/v2/projects/${encodeURIComponent(e)}/archive`,{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"},2e4)}async function ds(e){return await re(`/jin/api/v2/projects/${encodeURIComponent(e)}/restore`,{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"},2e4)}async function us(e){return await re(`/jin/api/v2/projects/${encodeURIComponent(e)}`,{method:"DELETE"},2e4)}async function Cn(e){return await re(`/jin/api/v2/projects/${encodeURIComponent(e)}/check-plan`,void 0,2e4)}async function ps(e,t){return await re(`/jin/api/v2/projects/${encodeURIComponent(e)}/check-plan`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(t||{})},2e4)}async function tn(e,t={}){return await re(`/jin/api/v2/projects/${encodeURIComponent(e)}/check-plan/apply`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(t||{})},2e4)}async function ms(e,t={}){return await re(`/jin/api/v2/projects/${encodeURIComponent(e)}/checks/run`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(t||{})},3e4)}async function gs(e,t=20){return await re(`/jin/api/v2/projects/${encodeURIComponent(e)}/checks/history?limit=${encodeURIComponent(String(t))}`,void 0,2e4)}async function fs(e,t={}){return await re(`/jin/api/v2/projects/${encodeURIComponent(e)}/baseline/refresh`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(t||{})},3e4)}async function Tn(e){let t=e?`?project_id=${encodeURIComponent(e)}`:"";return await re(`/jin/api/v2/health${t}`,void 0,2e4)}async function Pn(){return await re("/jin/api/v2/portfolio/health",void 0,2e4)}async function Mn(e,t=7,n=200){let i=new URLSearchParams;return i.set("days",String(t)),i.set("limit",String(n)),e&&i.set("project_id",e),await re(`/jin/api/v2/reports/leadership-digest?${i.toString()}`,void 0,3e4)}async function hs(){return await re("/jin/api/v2/po/playbook",void 0,2e4)}function ys(e,t){return e>0?"Needs attention":t>0?"Block release":"Safe for now"}function vs(){let e=xt(),t=ys(Number(e.active_incidents||0),Number(e.unconfirmed_endpoints||0));return["# Jin Overview Brief","",`Generated: ${ne(e.generated_at)}`,`Decision: ${t}`,`Tracked APIs: ${e.endpoints_tracked}`,`Healthy APIs: ${e.healthy_endpoints}`,`Unconfirmed APIs: ${e.unconfirmed_endpoints}`,`Active incidents: ${e.active_incidents}`,"","## APIs Needing Attention",...(s.status?.endpoints||[]).filter(n=>(n.active_anomalies||0)>0||n.status==="unconfirmed").slice(0,10).map(n=>`- ${n.http_method} ${n.endpoint_path}: ${n.active_anomalies||0} incidents, status ${n.status||"healthy"}`)].join("\\n")}function Ln(e,t){let n=t.map(i=>`
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
      <p style="margin:0;color:#5a4937;">Generated ${ne(new Date().toISOString())}</p>
    </header>
    ${n}
  </main>
</body>
</html>
  `.trim()}function ws(){let e=nt();return["# Jin Incident Brief","",`Generated: ${ne(new Date().toISOString())}`,`Visible incidents: ${e.length}`,`Filters: status=${s.incidentStatusFilter||"all"}, severity=${s.incidentSeverityFilter||"all"}, sort=${s.incidentSort}`,"",...e.slice(0,20).map(t=>[`## ${t.endpoint_path} \u2022 ${t.kpi_field}`,`- Status: ${t.status||"active"}`,`- Severity: ${t.severity||"low"}`,`- Target: ${p(t.baseline_used)}`,`- Actual: ${p(t.actual_value)}`,`- Delta: ${p(t.pct_change)}%`,`- Why flagged: ${t.why_flagged||t.ai_explanation||"No explanation available."}`,`- Change since last healthy run: ${t.change_since_last_healthy_run||"No comparison available."}`,""].join("\\n"))].join("\\n")}function bs(e){let t=e.trend_summary||[],n=e.upload_activity||[],i=e.anomaly_history||[];return[`# Jin API Brief: ${e.endpoint_path}`,"",`Generated: ${ne(new Date().toISOString())}`,`Method: ${e.http_method||"GET"}`,`Recent runs: ${(e.recent_history||[]).length}`,`Open or historical incidents: ${i.length}`,`Reference uploads: ${n.length}`,"","## KPI Snapshot",...(e.current_kpis||[]).map(r=>`- ${r.kpi_field}: actual ${p(r.actual_value)}, target ${p(r.expected_value)}, delta ${p(r.pct_change)}%`),"","## Trends",...t.map(r=>`- ${r.kpi_field}: latest ${p(r.latest)}, min ${p(r.min)}, max ${p(r.max)}, delta ${p(r.delta_pct)}%`)].join("\\n")}function Ss(){let e=xt(),t=ys(Number(e.active_incidents||0),Number(e.unconfirmed_endpoints||0));return Ln("Jin Overview Brief",[{title:"Summary",body:[`Decision: ${t}`,`Tracked APIs: ${e.endpoints_tracked}`,`Healthy APIs: ${e.healthy_endpoints}`,`Unconfirmed APIs: ${e.unconfirmed_endpoints}`,`Active incidents: ${e.active_incidents}`].join("\\n")},{title:"APIs Needing Attention",body:(s.status?.endpoints||[]).filter(n=>(n.active_anomalies||0)>0||n.status==="unconfirmed").slice(0,12).map(n=>`${n.http_method} ${n.endpoint_path} \u2022 ${n.active_anomalies||0} incidents \u2022 ${n.status||"healthy"}`).join("\\n")||"No APIs currently require attention."}])}function $s(){let e=nt();return Ln("Jin Incident Brief",e.slice(0,20).map(t=>({title:`${t.endpoint_path} \u2022 ${t.kpi_field}`,body:[`Status: ${t.status||"active"}`,`Severity: ${t.severity||"low"}`,`Target: ${p(t.baseline_used)}`,`Actual: ${p(t.actual_value)}`,`Delta: ${p(t.pct_change)}%`,`Why flagged: ${t.why_flagged||t.ai_explanation||"No explanation available."}`,`Last healthy comparison: ${t.change_since_last_healthy_run||"No comparison available."}`].join("\\n")})))}function _s(e){return Ln(`Jin API Brief: ${e.endpoint_path}`,[{title:"API Snapshot",body:[`Method: ${e.http_method||"GET"}`,`Recent runs: ${(e.recent_history||[]).length}`,`Historical incidents: ${(e.anomaly_history||[]).length}`,`Reference uploads: ${(e.upload_activity||[]).length}`].join("\\n")},{title:"KPI Snapshot",body:(e.current_kpis||[]).map(t=>`${t.kpi_field}: actual ${p(t.actual_value)}, target ${p(t.expected_value)}, delta ${p(t.pct_change)}%`).join("\\n")||"No KPI snapshot available."},{title:"Trend Summary",body:(e.trend_summary||[]).map(t=>`${t.kpi_field}: latest ${p(t.latest)}, min ${p(t.min)}, max ${p(t.max)}, delta ${p(t.delta_pct)}%`).join("\\n")||"No trend summary available."}])}function ks(e){if(!e.length)return"";let t=e.map(l=>Number(l)).filter(l=>Number.isFinite(l));if(!t.length)return"";let n=Math.min(...t),r=Math.max(...t)-n||1;return`
    <svg class="sparkline" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <polyline fill="none" stroke="var(--accent)" stroke-width="3" points="${t.map((l,c)=>{let d=t.length===1?0:c/(t.length-1)*100,u=100-(l-n)/r*100;return`${d},${u}`}).join(" ")}" />
    </svg>
  `}function xs(e){let t={healthy:0,warning:0,anomaly:0,unconfirmed:0};e.forEach(o=>{let l=t[o.status]!==void 0?o.status:"warning";t[l]+=1});let n=Math.max(1,e.length),i=0;return`<svg class="chart-svg chart-svg-compact" viewBox="0 0 100 56" preserveAspectRatio="none" aria-hidden="true">${[["healthy","var(--healthy)"],["warning","var(--warning)"],["anomaly","var(--anomaly)"],["unconfirmed","var(--ink-muted)"]].map(([o,l])=>{let c=t[o]/n*100,d=`<rect x="${i}" y="18" width="${c}" height="18" rx="4" fill="${l}"></rect>`;return i+=c,d}).join("")}</svg>`}function As(e){let t={};(e.recent_history||[]).forEach(u=>{Object.entries(u.kpi_json||{}).forEach(([$,A])=>{Number.isFinite(A)&&(t[$]=t[$]||[],t[$].push(Number(A)))})});let n=["var(--accent)","var(--healthy)","var(--warning)","var(--anomaly)"],i=Object.entries(t).slice(0,4);if(!i.length)return"";let r=i.flatMap(([,u])=>u),o=Math.min(...r),c=Math.max(...r)-o||1;return`<svg class="chart-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${i.map(([,u],$)=>{let A=u.map((N,H)=>{let j=u.length===1?0:H/(u.length-1)*100,k=100-((N-o)/c*78+10);return`${j},${k}`}).join(" ");return`<polyline fill="none" stroke="${n[$%n.length]}" stroke-width="2.5" points="${A}" />`}).join("")}</svg>`}var js=["method","status","setup","issues"],Ei={method:92,status:92,setup:112,issues:88},Ii=120,Ri=28,Ni=8;function Bs(e){return e.startsWith("scheduler")?"Scheduler":e.startsWith("router.upload")||e.startsWith("router.save_references")?"Upload":e.startsWith("router.save_config")||e.startsWith("config.")?"Configuration":e.startsWith("router.")||e.startsWith("middleware.")?"Runtime":"General"}function Bn(e){return e.startsWith("scheduler")||e.startsWith("middleware.process_response")?"high":e.startsWith("router.status")||e.startsWith("router.endpoint_detail")?"medium":"low"}function sn(e){return e.status||"open"}function S(e){return String(e??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function Hi(e){return`
    <div class="row-card onboarding-card">
      <strong>${S(e.title)}</strong>
      <div class="muted" style="margin-top:6px;">${S(e.description)}</div>
      <ol class="reports-flow-steps" style="margin:12px 0 0 18px;">
        <li>Install Jin in your own FastAPI app.</li>
        <li>Hit the endpoint you want to monitor once.</li>
        <li>Open <code>/jin</code> and finish setup in the APIs workspace.</li>
      </ol>
      ${e.footer?`<div class="tiny muted" style="margin-top:8px;">${S(e.footer)}</div>`:""}
      <div class="toolbar" style="margin-top:12px; flex-wrap:wrap;">
        <button class="action" type="button" data-view="${S(e.primaryView)}">${S(e.primaryLabel)}</button>
        <button class="action secondary" type="button" onclick="window.open('${e.secondaryHref}', '_blank', 'noopener,noreferrer')">${S(e.secondaryLabel)}</button>
      </div>
    </div>
  `}function Cs(){let e=s.status?.endpoints||[],t=s.anomalies?.anomalies||[],n=s.status?.summary||{healthy:0,unconfirmed:0,anomalies:0},i=e.filter(l=>l.status==="unconfirmed").length,r=e.filter(l=>(l.active_anomalies||0)>0||l.status==="warning").length,o=s.status?.recent_errors||[];return e.length===0?`
      <div class="row-card">
        <strong>Block release</strong>
        <div class="muted" style="margin-top:6px;">You do not have a live project yet. Create one endpoint before treating this project as ready.</div>
        <div class="tiny muted" style="margin-top:8px;">Start with your own API, not the maintainer demo harness.</div>
      </div>
    `:t.length>0?`
      <div class="row-card">
        <strong>Needs attention</strong>
        <div class="muted" style="margin-top:6px;">${p(t.length)} issue${t.length===1?"":"s"} need attention. Start with the highest-priority item, then work downward.</div>
        <div class="tiny muted" style="margin-top:8px;">Jin has already grouped the issues so you can make a business call without reading raw logs first.</div>
      </div>
    `:i>0||r>0?`
      <div class="row-card">
        <strong>Needs attention</strong>
        <div class="muted" style="margin-top:6px;">Some APIs still need setup or target review. Finish setup first, then use Issues and Reports to track business impact.</div>
        <div class="tiny muted" style="margin-top:8px;">Healthy: ${p(n.healthy||0)} \u2022 Needs setup: ${p(i)} \u2022 Needs care: ${p(r)} \u2022 Recent errors: ${p(o.length)}</div>
      </div>
    `:`
    <div class="row-card">
      <strong>Safe for now</strong>
      <div class="muted" style="margin-top:6px;">Your project looks healthy right now. Keep watching the highest-risk API and check Reports weekly so you can spot drift before it becomes a release issue.</div>
      <div class="tiny muted" style="margin-top:8px;">Healthy: ${p(n.healthy||0)} \u2022 Issues: ${p(t.length)} \u2022 Recent errors: ${p(o.length)}</div>
    </div>
  `}function Fi(e){let t=Number(e.topRiskScore||0);return e.endpoints===0?{label:"Block release",tone:"danger",detail:"No live endpoint is connected yet."}:e.anomalies>0||e.needsSetup>0||e.needsAttention>0?{label:"Needs attention",tone:t>=70?"danger":"warning",detail:e.anomalies>0?`${p(e.anomalies)} issue${e.anomalies===1?"":"s"} need attention.`:`${p(e.needsSetup||e.needsAttention)} setup item${(e.needsSetup||e.needsAttention)===1?"":"s"} still need attention.`}:{label:"Safe for now",tone:"success",detail:"The project is healthy and ready to keep monitoring."}}function Es(e){if(!e)return!1;if(!!((e.recent_history||[]).length||(e.history||[]).length))return!0;let n=e.schema_contract;if(Array.isArray(n?.example_rows)&&n.example_rows.length>0)return!0;let i=Array.isArray(n?.fields)?n.fields:[];return(i.length?i:e.fields||[]).some(o=>o&&o.example!==void 0&&o.example!==null)}function st(e){let t=Array.isArray(e.dimension_fields)?e.dimension_fields.length:0,n=Array.isArray(e.kpi_fields)?e.kpi_fields.length:0,i=!!String(e.time_field||"").trim(),r=e.time_required!==!1,o=!!e.confirmed,l=!!e.last_upload_at;return!t||!n||r&&!i?{label:"Needs setup",tone:"warning",hint:r?"Choose Segment + Metric + Time in Configuration.":"Choose Segment + Metric in Configuration."}:o?l?{label:"Ready",tone:"success",hint:"Setup and targets are in place."}:{label:"Needs targets",tone:"info",hint:"Upload a target file to start pass/fail checks."}:{label:"Save setup",tone:"warning",hint:"Save configuration before checks/uploads."}}function Di(){return s.apiBrowserMode==="compact"||s.apiBrowserMode==="table"?s.apiBrowserMode:"grouped"}function Is(){return Ge(s.apiBrowserDensity||"comfortable")}function rn(){return s.apiBrowserSort||"path"}function En(){return s.apiBrowserSortDirection==="desc"?"desc":"asc"}function Oi(e){return rn()!==e?"\u2195":En()==="asc"?"\u2191":"\u2193"}function In(){let e=s.apiBrowserColumns||{};return Rs().filter(t=>e[t]!==!1)}function Rs(){let e=Array.isArray(s.apiBrowserColumnOrder)?s.apiBrowserColumnOrder:[],t=new Set,n=e.map(i=>String(i)).filter(i=>js.includes(i)).filter(i=>t.has(i)?!1:(t.add(i),!0));return js.forEach(i=>{t.has(i)||n.push(i)}),n}function Vi(e=In()){let t=s.apiBrowserColumnWidths||{};return["minmax(0, 2.4fr)",...e.map(n=>{let i=Ei[n],r=Number(t[n]);return`${Number.isFinite(r)&&r>0?Math.round(r):i}px`})].join(" ")}function Ts(e,t){let n=st(e),i=n.label==="Ready"?3:n.label==="Needs targets"?2:n.label==="Save setup"?1:0;switch(t){case"method":return String(e.http_method||"").toLowerCase();case"status":return String(e.status||"warning").toLowerCase();case"group":return lt(e.endpoint_path).toLowerCase();case"issues":return Number(e.active_anomalies||0);case"setup":return i;case"confirmed":return+!!e.confirmed;default:return String(e.endpoint_path||"").toLowerCase()}}function Ui(e){let t=rn(),n=En()==="desc"?-1:1;return[...e].sort((i,r)=>{let o=Ts(i,t),l=Ts(r,t);if(typeof o=="number"&&typeof l=="number"){if(o<l)return-1*n;if(o>l)return 1*n}else{let c=String(o).localeCompare(String(l));if(c!==0)return c*n}return String(i.endpoint_path||"").localeCompare(String(r.endpoint_path||""))})}function Wi(e,t){let n=rn()===t;return`
    <button class="api-table-sort ${n?"active":""}" type="button" data-api-sort="${S(t)}" aria-pressed="${n}">
      <span>${S(e)}</span>
      <span class="api-table-sort-indicator">${Oi(t)}</span>
    </button>
  `}function Et(e,t,n=!1){return`
    <div class="api-browser-head-cell ${t==="path"?"pinned pinned-path":t==="status"?"pinned pinned-status":t==="issues"?"pinned pinned-issues":""} ${n?"resizable":""}" data-api-browser-column-header="${S(t)}">
      ${Wi(e,t)}
      ${n?`<span class="api-browser-resize-handle" role="separator" aria-orientation="vertical" aria-label="Resize ${S(e)} column" data-api-browser-column-resize="${S(t)}"></span>`:""}
    </div>
  `}function zi(e,t,n,i){if(t==="method")return`<span class="api-browser-cell api-browser-cell-method"><span class="api-browser-pill">${S(e.http_method||"GET")}</span></span>`;if(t==="status"){let r=String(e.status||"warning");return`<span class="api-browser-cell api-browser-cell-status pinned pinned-status"><span class="api-browser-pill status">${S(r)}</span></span>`}return t==="setup"?`<span class="api-browser-cell api-browser-cell-setup"><span class="api-setup-chip ${n.tone}" title="${S(n.hint)}">${S(n.label)}</span></span>`:t==="issues"?`<span class="api-browser-cell api-browser-cell-issues pinned pinned-issues">${i>0?`<span class="api-browser-pill issues">${i} issue${i===1?"":"s"}</span>`:'<span class="tiny muted">\u2014</span>'}</span>`:""}function qi(e,t){let n=st(e),i=lt(e.endpoint_path),r=String(e.status||"warning"),o=Number(e.active_anomalies||0);return`
    <button class="api-browser-row ${s.selectedApi===e.endpoint_path?"active":""}" type="button" data-api="${S(e.endpoint_path)}" onclick="openApiFromBrowser(event, '${S(e.endpoint_path)}')">
      <span class="api-browser-cell api-browser-cell-path pinned pinned-path">
        <span class="status-dot ${r||"warning"}"></span>
        <span class="api-browser-path-main">
          <strong title="${S(e.endpoint_path)}">${S(e.endpoint_path)}</strong>
          <span class="tiny muted">${S(i)}</span>
        </span>
      </span>
      ${t.map(l=>zi(e,l,n,o)).join("")}
    </button>
  `}function nn(e,t,n){return`
    <button class="api-column-btn ${n?"active":""}" type="button" data-api-browser-column="${S(e)}" aria-pressed="${n}">
      <span>${S(t)}</span>
    </button>
  `}function Ji(){let e=In(),t=Rs();return`
    <div class="api-browser-columns">
      <div class="api-browser-columns-label">
        <span class="tiny muted">Columns</span>
        <span class="tiny muted">Path locked</span>
      </div>
      <div class="api-browser-columns-buttons">
        ${nn("method","Method",e.includes("method"))}
        ${nn("status","Status",e.includes("status"))}
        ${nn("setup","Setup",e.includes("setup"))}
        ${nn("issues","Issues",e.includes("issues"))}
      </div>
      <div class="api-browser-order">
        <div class="tiny muted">Order</div>
        <div class="api-browser-order-buttons">
          ${t.map(n=>`
            <div class="api-browser-order-chip ${e.includes(n)?"":"hidden"}" draggable="true" data-api-browser-column-drag="${S(n)}" data-api-browser-column-drop="${S(n)}">
              <span class="api-browser-order-handle" aria-hidden="true">\u22EE\u22EE</span>
              <span>${S(n)}</span>
              <div class="api-browser-order-actions">
                <button class="api-column-step" type="button" onclick="moveApiBrowserColumn('${S(n)}','left')" data-api-browser-column-move="${S(n)}:left" aria-label="Move ${S(n)} left">\u2190</button>
                <button class="api-column-step" type="button" onclick="moveApiBrowserColumn('${S(n)}','right')" data-api-browser-column-move="${S(n)}:right" aria-label="Move ${S(n)} right">\u2192</button>
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    </div>
  `}function Gi(e){let t=Ui(e),n=In(),i=Vi(n),r=Is(),o=Xt(r),l=t.length>120?80:50,c=ct(t,s.apiBrowserPage||1,l),d=t.length>Ii?_t(t.length,s.apiBrowserScrollTop||0,{rowHeight:o.rowHeight,windowRows:Ri,overscan:Ni}):null,u=!!d;s.apiBrowserVirtualWindowStart=d?.start||0,s.apiBrowserVirtualWindowEnd=d?.end||0;let $=u?t.slice(d.start,d.end):c.items,A=u?1:c.page,N=u?1:c.totalPages,H=u?`Virtualized \u2022 Showing ${p((d?.start||0)+1)}-${p(Math.min(t.length,d?.end||0))} of ${p(t.length)}`:N>1?`Page ${A} of ${N}`:`${p(t.length)} APIs`,j=u?Math.max(0,(d?.start||0)*o.rowHeight):0,k=u?Math.max(0,(t.length-(d?.end||0))*o.rowHeight):0,M=$.length?$.map(C=>qi(C,n)).join(""):'<div class="empty empty-center api-browser-empty">No APIs match this search.</div>',v=n.map(C=>C==="method"?Et("Method","method",!0):C==="status"?Et("Status","status",!0):C==="setup"?Et("Setup","setup",!0):Et("Issues","issues",!0)).join("");return`
    <div class="api-browser-table-shell" data-api-browser-density="${S(r)}" style="--api-browser-grid-template: ${S(i)}; --api-browser-row-height: ${o.rowHeight}px; --api-browser-table-gap: ${o.tableGap}px; --api-browser-grid-gap: ${o.gridGap}px; --api-browser-head-pad-y: ${o.headPadY}px; --api-browser-head-pad-x: ${o.headPadX}px; --api-browser-row-pad-y: ${o.rowPadY}px; --api-browser-row-pad-x: ${o.rowPadX}px;">
      <div class="api-browser-table-bar">
        <div class="api-browser-column-bar">
          ${Ji()}
          <div class="tiny muted">${S(H)} \u2022 Sorted by ${S(rn())} ${S(En())}</div>
        </div>
        <div class="toolbar compact">${u?"":dt("api-browser",A,N)}</div>
      </div>
      <div class="api-browser-table ${u?"virtualized":""}" role="table" aria-label="API index table">
        <div class="api-browser-table-head" role="row">
          ${Et("Path","path")}
          ${v}
        </div>
        <div class="api-browser-table-body ${u?"virtualized":""}">
          ${u?`<div class="api-browser-spacer" aria-hidden="true" style="height:${j}px"></div>`:""}
          ${M}
          ${u?`<div class="api-browser-spacer" aria-hidden="true" style="height:${k}px"></div>`:""}
        </div>
      </div>
    </div>
  `}function Ki(e){let t=e.length,n=e.filter(l=>(l.status||"").toLowerCase()==="healthy"&&(l.active_anomalies||0)===0).length,i=e.filter(l=>{let c=String(l.status||"").toLowerCase();return(l.active_anomalies||0)>0||c==="warning"||c==="anomaly"||c==="unconfirmed"}).length,r=e.filter(l=>st(l).label!=="Ready").length,o=new Set(e.map(l=>lt(l.endpoint_path))).size;return`
    <div class="api-browser-summary" aria-label="API browser summary">
      <div class="api-summary-stat">
        <span class="tiny">Visible APIs</span>
        <strong>${p(t)}</strong>
      </div>
      <div class="api-summary-stat healthy">
        <span class="tiny">Healthy</span>
        <strong>${p(n)}</strong>
      </div>
      <div class="api-summary-stat warning">
        <span class="tiny">At risk</span>
        <strong>${p(i)}</strong>
      </div>
      <div class="api-summary-stat setup">
        <span class="tiny">Need setup</span>
        <strong>${p(r)}</strong>
      </div>
      <div class="api-summary-stat muted">
        <span class="tiny">Groups</span>
        <strong>${p(o)}</strong>
      </div>
    </div>
  `}function Xi(e){return`
    <div class="api-browser-density" role="group" aria-label="API browser row density">
      <div class="api-browser-density-buttons">
        <button class="api-mode-btn ${e==="comfortable"?"active":""}" type="button" data-api-browser-density="comfortable" aria-pressed="${e==="comfortable"}">Comfortable</button>
        <button class="api-mode-btn ${e==="compact"?"active":""}" type="button" data-api-browser-density="compact" aria-pressed="${e==="compact"}">Compact</button>
        <button class="api-mode-btn ${e==="dense"?"active":""}" type="button" data-api-browser-density="dense" aria-pressed="${e==="dense"}">Dense</button>
      </div>
    </div>
  `}function Yi(e,t){let n=e.length,i=e.filter(d=>{let u=String(d.status||"").toLowerCase();return(d.active_anomalies||0)>0||u==="warning"||u==="anomaly"||u==="unconfirmed"}).length,r=e.filter(d=>st(d).label!=="Ready").length,o=e.reduce((d,u)=>{let $=lt(u.endpoint_path);return d[$]=(d[$]||0)+1,d},{}),l=Object.entries(o).reduce((d,[u,$])=>$>d.count?{group:u,count:$}:d,{group:"other",count:0}),c=t==="compact"?"Compact scan keeps the list dense, sorted, and easy to scan at scale.":t==="table"?"Table index is the highest-density view and is built for larger inventories.":"Grouped view is best when you are still configuring a smaller project.";return`
    <div class="api-browser-hero">
      <div class="api-browser-hero-copy">
        <div class="api-browser-hero-meta tiny muted">${p(n)} APIs \u2022 ${p(i)} at risk \u2022 ${p(r)} need setup \u2022 Top group: ${S(l.group)}${l.count?` \u2022 ${p(l.count)}`:""}</div>
        <div class="api-browser-hero-actions">
          <button class="action secondary tiny" type="button" onclick="saveBrowserView()">Save browser view</button>
          <button class="action ghost tiny" type="button" data-view="settings">Open saved views</button>
        </div>
        ${Xi(Is())}
      </div>
    </div>
  `}function Qi(e){return`
    <div class="api-browser-mode" role="group" aria-label="API browser layout">
      <button class="api-mode-btn ${e==="grouped"?"active":""}" type="button" data-api-browser-mode="grouped" aria-pressed="${e==="grouped"}">Grouped view</button>
      <button class="api-mode-btn ${e==="compact"?"active":""}" type="button" data-api-browser-mode="compact" aria-pressed="${e==="compact"}">Compact scan</button>
      <button class="api-mode-btn ${e==="table"?"active":""}" type="button" data-api-browser-mode="table" aria-pressed="${e==="table"}">Table index</button>
    </div>
  `}function Zi(e,t={}){let n=!!t.compact,i=st(e),r=Number(e.active_anomalies||0),o=String(e.status||"warning"),l=t.group?`<span class="api-group-tag">${S(t.group)}</span>`:"",c=n?`<div class="api-subline api-subline-compact">${l}<span class="api-setup-chip ${i.tone}" title="${S(i.hint)}">${S(i.label)}</span></div>`:`<div class="api-subline"><span class="api-setup-chip ${i.tone}" title="${S(i.hint)}">${S(i.label)}</span></div>`;return`
    <button class="api-item ${n?"compact":""} ${s.selectedApi===e.endpoint_path?"active":""}" type="button" data-api="${S(e.endpoint_path)}" onclick="openApiFromBrowser(event, '${S(e.endpoint_path)}')">
      <div class="api-row ${n?"compact":""}">
        <span class="status-dot ${o||"warning"}"></span>
        <div class="api-row-main">
          <div class="api-row-top">
            <div class="api-method-status">
              <strong>${S(e.http_method||"GET")}</strong>
              <span class="tiny api-status-label">${S(o)}</span>
            </div>
            ${r>0?`<span class="tiny api-row-issues">${r} issue${r===1?"":"s"}</span>`:""}
          </div>
          <div class="api-path">${S(e.endpoint_path)}</div>
          ${c}
        </div>
      </div>
    </button>
  `}function er(e,t,n={}){let i=!!n.compact,r=!!n.collapsed,o=t.filter(d=>(d.active_anomalies||0)>0||String(d.status||"").toLowerCase()==="anomaly").length,l=t.filter(d=>st(d).label!=="Ready").length,c=[`${p(t.length)} API${t.length===1?"":"s"}`,o?`${p(o)} at risk`:null,l?`${p(l)} need setup`:null].filter(Boolean);return`
    <div class="api-group ${i?"compact":""}">
      <div class="api-group-title">
        <div class="api-group-name">
          <span>${S(e)}</span>
          <span class="api-group-count">${p(t.length)}</span>
        </div>
        <div class="api-group-actions">
          <span class="api-group-summary">${S(c.join(" \u2022 "))}</span>
          ${i?"":`<button class="group-toggle" type="button" data-group-toggle="${S(e)}">${r?"Expand":"Collapse"}</button>`}
        </div>
      </div>
      ${r?"":t.map(d=>Zi(d,{compact:i,group:e})).join("")}
    </div>
  `}function tr(e,t){let n=Object.entries(e||{}).filter(([,i])=>i!==null&&i!=="");return n.length?n.map(([i,r])=>`${i}=${r}`).join(" \u2022 "):t||"Global grain"}function nr(e){let t=e.request||{},n=[],i=Object.entries(t.path||{}),r=Object.entries(t.query||{}),o=t.body;return i.length&&n.push(`Path ${i.map(([l,c])=>`${l}=${c}`).join(", ")}`),r.length&&n.push(`Query ${r.map(([l,c])=>`${l}=${c}`).join(", ")}`),o&&(Array.isArray(o)&&o.length||!Array.isArray(o)&&Object.keys(o).length)&&n.push(`Body ${JSON.stringify(o)}`),n.join(" \u2022 ")}function It(e){return e==="match"?"healthy":e==="missing_reference"?"acknowledged":e==="missing_kpi"?"warning":e==="mismatch"?"danger":"critical"}function ht(e){return e==="match"?"Matched":e==="mismatch"?"Mismatch":e==="missing_reference"?"No Targets":e==="missing_kpi"?"Missing KPI":e==="error"?"Error":e}function sr(e){return e==="matched"?"Matched":e==="mismatch"?"Mismatch":e==="error"?"Error":e==="skipped"?"Skipped":e||"Unknown"}function ir(e){return e==="matched"?"healthy":e==="mismatch"?"danger":e==="error"?"critical":"acknowledged"}function Xe(e){return String(e||"").replace(/^data\[\]\./,"")}function Ke(e){let t=String(e||"");if(!t)return"";if(!t.includes("|"))return t;let[n,...i]=t.split("|"),r=i.map(o=>o.trim()).filter(Boolean).filter(o=>{let l=o.split("=")[0];return l!=="api_version"&&l!=="label"&&l!=="timestamp"&&l!=="_jin_id"}).sort();return r.length?`${n}|${r.join("|")}`:n}function Rt(e){let t=String(e||"").trim().toLowerCase();return t?t.replace(/\[\]/g,"").replace(/^data\./,"").replace(/^payload\./,""):""}function ft(e){let t=Xe(e).replace(/\[\]/g," ").replace(/[._]/g," ").trim();return t?t.split(/\s+/).map(n=>n.charAt(0).toUpperCase()+n.slice(1)).join(" "):"Metric"}function Ns(e){let t=String(e||"");if(!t.includes("|"))return t||"Global";let[,...n]=t.split("|"),i={};n.forEach(l=>{let c=l.indexOf("=");if(c<=0)return;let d=l.slice(0,c),u=l.slice(c+1);i[d]=u});let r=[i.retailer?`Retailer: ${i.retailer}`:null,i["data[].date"]||i.date?`Date: ${i["data[].date"]||i.date}`:null,i["data[].label"]||i.label?`Label: ${i["data[].label"]||i.label}`:null].filter(Boolean);if(r.length)return r.join(" \u2022 ");let o=Object.entries(i).filter(([l])=>!["api_version","timestamp","_jin_id"].includes(l)).slice(0,3).map(([l,c])=>`${l}=${c}`);return o.length?o.join(" \u2022 "):t}function rr(e){let t=Number(e);return!Number.isFinite(t)||t<0?"\u2014":t<1e3?`${Math.round(t)} ms`:`${(t/1e3).toFixed(1)} s`}function ar(e,t){let n=String(e||"").toLowerCase();if(n==="manual")return"Manual check";if(n==="scheduler")return"Scheduled check";let i=String(t||"").toLowerCase();return i==="manual"?"Manual check":i==="watch"?"Scheduled check":n||i||"Unknown"}function or(e,t=0){let n=String(e||"").toLowerCase(),i=Number(t||0);return(n==="success"||n==="degraded")&&i>0?{pillClass:"danger",label:"Needs attention",tooltip:"Run completed but active mismatches are still open."}:n==="success"?{pillClass:"healthy",label:"Passed",tooltip:"Check finished successfully."}:n==="running"?{pillClass:"acknowledged",label:"Running",tooltip:"Check is currently running."}:n==="error"||n==="failed"?{pillClass:"danger",label:"Failed",tooltip:"Check failed. Open Errors for details."}:n==="skipped"?{pillClass:"warning",label:"Skipped",tooltip:"Check was skipped and did not run."}:{pillClass:"acknowledged",label:n||"Unknown",tooltip:"Run completed with a non-standard status."}}function lr(e){let t=e.dimensions||{},n=t.retailer||t.grain_retailer,i=t["data[].date"]||t.date||t.period,r=t["data[].label"]||t.label,o=[n?`Retailer: ${n}`:null,i?`Date: ${i}`:null,r?`Label: ${r}`:null].filter(Boolean);return o.length?o.join(" | "):tr(e.dimensions,e.grain_key)}function cr(e){return e.status==="match"?"Everything in this uploaded row is within the allowed tolerance.":e.status==="error"?"Jin could not run this row because the API call failed.":`Some values are outside the allowed range${e.tolerance_pct==null?"":` (allowed +/-${Number(e.tolerance_pct).toFixed(1)}%)`}.`}function dr(e){return Number(e.failed_runs||0)>0?"Block release":Number(e.mismatch_runs||0)>0?"Needs attention":"Safe for now"}function Ps(e){let t=Xe(e.kpi_field),n=e.pct_change,i=n==null?null:Number(n);if(e.status==="match")return i==null?`${t} is within the allowed range.`:`${t} is within the allowed range (${Math.abs(i).toFixed(1)}% change).`;if(e.status==="missing_reference")return`No targets are uploaded for ${t}.`;if(e.status==="missing_kpi")return`${t} was not returned by the API for this grain.`;if(e.status==="error")return e.message||`Could not evaluate ${t}.`;if(i==null)return`${t} is outside the allowed range.`;let r=i>0?"higher":"lower";return`${t} is ${Math.abs(i).toFixed(1)}% ${r} than target (outside tolerance).`}function Hs(e){let t=Number(e);if(!Number.isFinite(t))return"\u2014";let n=t>0?"+":"",i=Math.abs(t);return i<1e3?`${n}${i.toFixed(1)}%`:i<1e6?`${n}${Math.round(i).toLocaleString()}%`:`${n}${i.toExponential(2)}%`}function ur(e,t){let n=e.verdict==="matched"?{title:"Upload Analysis Passed",subtitle:e.summary_message,className:"success",icon:"\u2705"}:e.verdict==="mismatch"?{title:"Upload Analysis Found Mismatches",subtitle:e.summary_message,className:"danger",icon:"\u26A0\uFE0F"}:{title:"Upload Analysis Hit Errors",subtitle:e.summary_message,className:"danger",icon:"\u{1F6D1}"},i=g=>{let I=K=>K==="mismatch"?0:K==="error"?1:K==="missing_kpi"?2:K==="missing_reference"?3:4,F=[...g.comparisons||[]].sort((K,se)=>{let be=I(String(K.status||""))-I(String(se.status||""));return be!==0?be:String(K.kpi_field||"").localeCompare(String(se.kpi_field||""))}),L=F.filter(K=>K.status!=="match"),O=F.filter(K=>K.status==="match"),U=nr(g),D=L.slice(0,2).map(K=>{let se=K.pct_change==null?"":` (${Math.abs(Number(K.pct_change)).toFixed(1)}%)`;return`${Xe(K.kpi_field)}: ${ht(K.status)}${se}`}).join(" \u2022 "),le=Math.max(0,L.length-2),Y=L.length?L:O.slice(0,3),pe=L.length?O:O.slice(3),Ae=K=>K.map(se=>`
        <tr>
          <td><strong>${S(Xe(se.kpi_field))}</strong></td>
          <td>${p(se.expected_value)}</td>
          <td>${p(se.actual_value)}</td>
          <td>${se.pct_change==null?"\u2014":`${Number(se.pct_change)>0?"+":""}${Number(se.pct_change).toFixed(1)}%`}</td>
          <td>
            <span class="status-pill ${It(se.status)}">${S(ht(se.status))}</span>
            <div class="tiny muted" style="margin-top:6px;">${S(Ps(se))}</div>
          </td>
        </tr>
      `).join("");return`
      <div class="upload-analysis-card upload-analysis-card-${S(g.status)}">
        <div class="upload-analysis-header">
          <div>
            <strong>${S(lr(g))}</strong>
          </div>
          <span class="status-pill ${It(g.status)}">${S(ht(g.status))}</span>
        </div>
        <div class="upload-analysis-message">${S(cr(g))}</div>
        <div class="upload-analysis-kpi-stats tiny">
          ${p(F.length)} KPI(s) \u2022 ${p(L.length)} need attention \u2022 ${p(O.length)} within range
        </div>
        ${D?`<div class="upload-analysis-highlights"><strong>Top findings:</strong> ${S(D)}${le?` +${le} more`:""}</div>`:""}
        <details class="upload-analysis-detail">
          <summary>${F.length?L.length?`KPI details (${L.length} need attention)`:`KPI details (${F.length} matched)`:"KPI details"}</summary>
          ${F.length?`
                <div class="table-wrap upload-analysis-table">
                  <table class="row-table">
                    <thead>
                      <tr>
                        <th>KPI</th>
                        <th>Target</th>
                        <th>API value</th>
                        <th>Delta</th>
                        <th>Outcome</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${Ae(Y)}
                    </tbody>
                  </table>
                </div>
                ${pe.length?`
                  <details class="upload-analysis-inline-more">
                    <summary>Show ${p(pe.length)} additional matched KPI(s)</summary>
                    <div class="table-wrap upload-analysis-table" style="margin-top:10px;">
                      <table class="row-table">
                        <thead>
                          <tr>
                            <th>KPI</th>
                            <th>Target</th>
                            <th>API value</th>
                            <th>Delta</th>
                            <th>Outcome</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${Ae(pe)}
                        </tbody>
                      </table>
                    </div>
                  </details>
                `:""}
              `:'<div class="tiny muted" style="margin-top:10px;">No KPI comparisons were returned for this row.</div>'}
          ${L.length?`
                <div class="upload-analysis-reasons">
                  <strong>Why this row needs attention</strong>
                  <ul>
                    ${L.map(K=>`<li>${S(Ps(K))}</li>`).join("")}
                  </ul>
                </div>
              `:""}
        </details>
        <details class="upload-analysis-tech">
          <summary>Technical details</summary>
          <div class="tiny muted upload-analysis-request">Grain key: ${S(g.grain_key)}</div>
          ${U?`<div class="tiny muted upload-analysis-request">Called with ${S(U)}</div>`:""}
        </details>
        ${g.error?`<div class="upload-analysis-error">${S(g.error)}</div>`:""}
      </div>
    `},r=e.runs.filter(g=>g.status!=="match"),o=e.runs.filter(g=>g.status==="match"),l=r.slice(0,8),c=r.slice(8),d=r.flatMap(g=>(g.comparisons||[]).filter(I=>I.status!=="match")),u=d.filter(g=>{if(g.status==="error"||g.status==="missing_kpi")return!0;let I=Number(g.pct_change);return Number.isFinite(I)&&Math.abs(I)>=30}),$=d.reduce((g,I)=>{let F=Number(I.pct_change);return Number.isFinite(F)?Math.max(g,Math.abs(F)):g},0),A=new Map;d.forEach(g=>{let I=Xe(g.kpi_field);if(!I)return;let F=Number(g.pct_change),L=Number.isFinite(F)?Math.abs(F):0,O=A.get(I)??0;L>O&&A.set(I,L)});let N=[...A.entries()].sort((g,I)=>I[1]-g[1]).slice(0,3).map(([g,I])=>`${g}${I>0?` (${I.toFixed(1)}%)`:""}`),H=(()=>{let g=Math.max(1,Number(e.requested_grains||0)),I=Number(e.mismatch_runs||0)/g;return Number(e.failed_runs||0)>0||$>=50||I>=.4?"High":Number(e.mismatch_runs||0)>0?"Medium":"Low"})(),j=(()=>{let g=Math.max(1,Number(e.attempted_runs||e.requested_grains||1)),I=Number(e.successful_runs||0),F=Number(e.failed_runs||0),L=d.length,O=55;return I>0&&(O+=18),F===0&&(O+=12),O+=Math.min(10,Math.round(L/g*10)),Math.max(35,Math.min(95,O))})(),k=e.verdict==="mismatch"?H==="High"?"Block release: review Issues now and review high-priority mismatches before accepting these targets as correct.":"Needs attention: review mismatch rows and mark expected changes in review, then resolve the rest.":e.verdict==="error"?"Block release: fix run errors first, then re-run upload analysis.":"Safe for now: targets look healthy. Continue with scheduled monitoring checks.",M=N.length?N.join(" \u2022 "):u.length>0?`${u.length} KPI check(s) need deeper review.`:"No major KPI shifts detected.",v=`
      ${r.length?`<div class="upload-analysis-section-title">Needs attention (${r.length})</div>`:'<div class="upload-analysis-section-title">Safe for now</div>'}
      ${l.map(g=>i(g)).join("")}
    ${c.length?`
          <details class="upload-analysis-more-runs">
            <summary>Show ${c.length} more flagged row(s)</summary>
            <div class="history-list" style="margin-top:12px;">
              ${c.map(g=>i(g)).join("")}
            </div>
          </details>
        `:""}
    ${o.length?`
          <details class="upload-analysis-more-runs upload-analysis-matched-group">
            <summary>Matched rows (${o.length})</summary>
            <div class="history-list" style="margin-top:12px;">
              ${o.map(g=>i(g)).join("")}
            </div>
          </details>
        `:""}
  `,C=(e.errors||[]).map(g=>g?.error).filter(g=>!!g).slice(0,3),R=e?.issues_sync&&typeof e.issues_sync=="object"?e.issues_sync:null,T=R?.auto_enabled!==!1,E=Number(R?.created||0),x=Number(R?.updated||0),y=Number(R?.candidates||0),P=R?E>0?`<div class="tiny" style="margin-top:10px; color:var(--ok);">Added ${p(E)} mismatch issue${E===1?"":"s"} to <strong>Issues</strong> automatically.</div>`:x>0?`<div class="tiny muted" style="margin-top:10px;">Refreshed ${p(x)} existing mismatch issue${x===1?"":"s"} in <strong>Issues</strong>.</div>`:y>0?'<div class="tiny muted" style="margin-top:10px;">Upload mismatches are already present in <strong>Issues</strong>.</div>':'<div class="tiny muted" style="margin-top:10px;">No mismatch rows to add to <strong>Issues</strong> from this run.</div>':"",_=r.length&&(!R||!T)?`
      <div class="toolbar" style="margin-top:12px; justify-content:flex-start;">
        <button class="action secondary" type="button" onclick="materializeUploadAnalysisIssues()">
          Add ${p(r.length)} mismatch${r.length===1?"":"es"} to Issues
        </button>
      </div>
    `:"",V=r.length?`
      <div class="toolbar" style="margin-top:12px; justify-content:flex-start;">
        <button class="action" type="button" onclick="openUploadIssues()">Review Issues</button>
      </div>
    `:"",f=r.length?'<div class="tiny muted" style="margin-top:8px;">If the Issues list looks empty, clear Status/Severity filters. The button above opens Issues with filters reset.</div>':"",m=C.length?`
      <div class="upload-analysis-errors">
        <strong>Upload analysis errors</strong>
        <div class="history-list" style="margin-top:8px;">
          ${C.map(g=>`<div class="history-item upload-analysis-error-item">${S(g)}</div>`).join("")}
        </div>
      </div>
    `:"";return`
    <div class="results-auto-show">
      <div class="verdict-banner ${n.className}">
        <div class="verdict-icon">${n.icon}</div>
        <div class="verdict-body">
          <h4>${S(n.title)}</h4>
          <p>${S(n.subtitle)}</p>
        </div>
      </div>
      <div class="upload-analysis-explainer">
        <strong>${dr(e)}</strong>
        <p>
          A mismatch means the API returned a value outside the allowed tolerance from your uploaded CSV targets.
          A match means the value stayed within that allowed range.
        </p>
        <p>
          These results are from this upload run. If mismatches exist, they are synced into <strong>Issues</strong> so you can
          review and resolve them in one place.
        </p>
      </div>
      <div class="upload-analysis-summary-grid">
        <div class="meta-card meta-card-compact">
          <strong>Uploaded grains</strong>
          <span>${p(e.requested_grains)}</span>
        </div>
        <div class="meta-card meta-card-compact">
          <strong>Safe for now</strong>
          <span>${p(e.matched_runs)}</span>
        </div>
        <div class="meta-card meta-card-compact">
          <strong>Needs attention</strong>
          <span>${p(e.mismatch_runs)}</span>
        </div>
        <div class="meta-card meta-card-compact">
          <strong>Block release</strong>
          <span>${p(e.failed_runs)}</span>
        </div>
        <div class="meta-card meta-card-compact">
          <strong>Priority</strong>
          <span>${H}</span>
          <div class="tiny muted" style="margin-top:4px;">Confidence ${p(j)}%</div>
        </div>
      </div>
      <div class="row-card" style="margin-top:12px;">
        <strong>Recommended next step</strong>
        <div class="tiny" style="margin-top:6px;">${S(k)}</div>
        <div class="tiny muted" style="margin-top:8px;">Impact focus: ${S(M)}</div>
      </div>
      ${_}
      ${V}
      ${f}
      ${P}
      ${m}
      <div class="history-list" style="margin-top:16px;">
        ${v||ke(`No upload analysis results for ${t.endpoint_path} yet.`)}
      </div>
    </div>
  `}function pr(){return(s.status?.recent_errors||[]).filter(t=>{let n=t.category?t.category[0].toUpperCase()+t.category.slice(1):Bs(t.source),i=t.severity||Bn(t.source),r=sn(t),o=`${t.source} ${t.message} ${t.hint||""} ${t.endpoint_path||""}`.toLowerCase(),l=!s.errorSearch||o.includes(s.errorSearch.toLowerCase()),c=!s.errorStatusFilter||r===s.errorStatusFilter,d=!s.errorCategoryFilter||n===s.errorCategoryFilter,u=!s.errorSeverityFilter||i===s.errorSeverityFilter;return l&&c&&d&&u})}function $e(){let e=s.status?.project,t=Le(),n=e?.trust_score??100,i=String(e?.tier||"free").toLowerCase(),r=e?.license_enforced!==!1,o=r?e?.project_limit==null?i==="free"?"1":"unlimited":String(e.project_limit):"unlimited",l=t?`
    <div class="sidebar-trust-header">
      <div class="trust-meter">
        <div class="trust-score-ring" style="--score: ${n}%">
          <span class="trust-value">${n}%</span>
        </div>
        <div class="trust-label">Data Trust</div>
      </div>
      <div class="tier-pill tier-${i}">
        <span class="tier-label">${i}</span>
        ${i==="free"&&r?`<span class="tier-limit">${e?.projects_active||1}/${o}</span>`:""}
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
  `:"",c=t?"":`
    <div class="sidebar-card">
      <strong>Project</strong>
      <span>${e?.name||"Customer project"}</span>
      <div class="tiny" style="margin-top:6px;">Use APIs, Issues, and Reports to operate your project.</div>
    </div>
  `;document.querySelectorAll("#nav button[data-feature]").forEach(M=>{let v=M.dataset.feature;if(v&&!wt(v)){M.classList.add("feature-locked");let C=M.querySelector(".nav-label");C&&!C.querySelector(".feature-lock-badge")&&(C.innerHTML+=' <span class="feature-lock-badge" style="font-size:7px; vertical-align:middle; margin-left:4px;">BUSINESS</span>')}else M.classList.remove("feature-locked")});let d=s.status?.endpoints||[],u=$t(),$=Di(),A=Yi(u,$),N=Qi($),H=Ki(u);if(u.length){let M=$==="table"?"":(()=>{let v=u.reduce((T,E)=>{let x=lt(E.endpoint_path);return T[x]=T[x]||[],T[x].push(E),T},{}),C=Object.entries(v).sort((T,E)=>T[0].localeCompare(E[0])),R=u.length>24;return C.map(([T,E])=>{let x=s.collapsedGroups[T]??($==="grouped"&&(R||E.length>8));return er(T,E,{compact:$==="compact",collapsed:x})}).join("")})();a.apiList.innerHTML=l+c+A+H+N+`
            ${$==="table"?Gi(u):`<div class="api-browser-body ${$==="compact"?"compact":"grouped"}">${M}</div>`}
            <div class="sidebar-footer">
              <button class="api-item ${s.currentView==="settings"?"active":""}" type="button" onclick="setView('settings')">
                <div class="api-row">
                  <span class="status-dot healthy"></span>
                  <div class="api-row-main">
                    <div class="api-row-top"><strong>Settings</strong></div>
                    <div class="api-path">${t?"License & Preferences":"Preferences"}</div>
                  </div>
                </div>
              </button>
            </div>
          `}else{let M=!!((s.apiFilter||"").trim()||(s.apiStatusFilter||"").trim()),v=d.length===0&&!M?`
        <div class="empty empty-center onboarding-empty">
          <strong>No APIs connected yet.</strong>
          <div class="tiny" style="margin-top:6px;">Open Overview for the first-run checklist, then come back here to confirm dimensions, KPIs, and time for your first endpoint.</div>
          <ol class="reports-flow-steps" style="margin:12px 0 0 18px; text-align:left;">
            <li>Install Jin in your own FastAPI app.</li>
            <li>Hit the endpoint you want to monitor once.</li>
            <li>Return here to finish setup in the APIs workspace.</li>
          </ol>
          <div class="toolbar" style="margin-top:12px; justify-content:center; flex-wrap:wrap;">
            <button class="action" type="button" data-view="overview">Open Overview</button>
            <button class="action secondary" type="button" onclick="window.open('https://amit-devb.github.io/jin/', '_blank', 'noopener,noreferrer')">Open Getting Started</button>
          </div>
        </div>
      `:"",C=M?"No APIs match this search.":d.length===0?s.apiDataState==="auth_required"?"Your Jin session expired. Sign in again to load APIs.":s.apiDataState==="error"?"Jin returned an error while loading APIs. Check server logs and retry.":s.apiDataState==="unavailable"?"Cannot load APIs right now. Check backend connection and retry.":"No APIs connected yet. Open Overview for the first-run checklist.":"No APIs match this search.";a.apiList.innerHTML=l+c+A+H+N+(v||ke(C))}let j=a.apiList.querySelector(".api-browser-table-body.virtualized");if(j){let M=window.handleApiBrowserTableScroll;typeof M=="function"&&j.addEventListener("scroll",M,{passive:!0}),j.scrollTop=Math.max(0,Number(s.apiBrowserScrollTop||0))}let k=window.syncApiBrowserPinnedOffsets;typeof k=="function"&&k()}window.showRunDetail=e=>{let t=s.activeApiDetail;if(!t)return;let i=((t.history&&t.history.length?t.history:t.recent_history)||[]).filter(m=>m.observed_at===e);if(a.runDetailTitle.innerText=`Run Detail: ${ne(e)}`,a.runDetailDrawer.style.display="block",!i.length){a.runDetailContent.innerHTML=ke("No observations for this timestamp.");return}let r=m=>{if(!m)return{};if(typeof m=="string")try{let g=JSON.parse(m);return g&&typeof g=="object"?g:{}}catch{return{}}return typeof m=="object"?m:{}},o=m=>{let g=new Map,I=(F,L="")=>{if(F!=null){if(typeof F=="number"){L&&Number.isFinite(F)&&!g.has(L)&&g.set(L,F);return}if(typeof F=="string"){let O=F.trim(),U=Number(O);L&&O&&Number.isFinite(U)&&!g.has(L)&&g.set(L,U);return}if(Array.isArray(F)){F.forEach(O=>I(O,L?`${L}[]`:"data[]"));return}typeof F=="object"&&Object.entries(F).forEach(([O,U])=>{let D=L?`${L}.${O}`:O;I(U,D)})}};return I(m),Array.from(g.entries()).map(([F,L])=>({kpiField:F,value:L}))},l=new Map;(t.references||[]).forEach(m=>{let g=String(m?.grain_key||""),I=String(m?.kpi_field||"");if(!g||!I)return;let F=m?.expected_value,L=m?.tolerance_pct,O=F==null?null:Number(F),U=L==null?null:Number(L),D={expected:Number.isFinite(O)?O:null,tolerance:Number.isFinite(U)?U:null},le=Rt(I);l.set(`${g}__${I}`,D),le&&le!==I&&l.set(`${g}__${le}`,D);let Y=Ke(g);Y&&(l.has(`${Y}__${I}`)||l.set(`${Y}__${I}`,D),le&&!l.has(`${Y}__${le}`)&&l.set(`${Y}__${le}`,D))});let c=Number(t?.config?.tolerance_normal??t?.config?.tolerance_pct??10),u=i.flatMap(m=>{let g=String(m?.grain_key||"Global"),I=Array.isArray(m?.comparisons)?m.comparisons.filter(L=>L?.kpi_field):[];if(I.length)return I.map(L=>{let O=L.actual_value??L.actual,U=String(L.kpi_field||""),D=Rt(U),le=Ke(g),Y=l.get(`${g}__${U}`)||(D?l.get(`${g}__${D}`):void 0)||l.get(`${le}__${U}`)||(D?l.get(`${le}__${D}`):void 0),pe=L.expected_value??L.expected??Y?.expected??null,Ae=L.allowed_tolerance_pct??Y?.tolerance??c,K=pe==null?null:Number(pe),se=O==null?null:Number(O),be=L.pct_change!=null?Number(L.pct_change):K==null||se==null||K===0?null:(se-K)/Math.abs(K)*100,qe=String(L.status||""),b=qe&&!(qe==="missing_reference"&&K!=null)?qe:K==null?"missing_reference":be!=null&&Math.abs(be)>Ae?"mismatch":"match";return{grainKey:g,kpiField:String(L.kpi_field),actual:se,expected:K,pctChange:be,status:b,message:L.message||"Historical comparison for this metric."}});let F=r(m?.kpi_json);return o(F).map(({kpiField:L,value:O})=>{let U=Number(O),D=Rt(L),le=Ke(g),Y=l.get(`${g}__${L}`)||(D?l.get(`${g}__${D}`):void 0)||l.get(`${le}__${L}`)||(D?l.get(`${le}__${D}`):void 0),pe=Y?.expected??null,Ae=Y?.tolerance??c,K=pe==null||pe===0?null:(U-pe)/Math.abs(pe)*100,se=pe==null?"missing_reference":K!=null&&Math.abs(K)>Ae?"mismatch":"match",be=pe==null?"No uploaded targets were found for this metric on this grain.":`Derived from run observation and uploaded targets (tolerance +/-${Ae.toFixed(1)}%).`;return{grainKey:g,kpiField:L,actual:U,expected:pe,pctChange:K,status:se,message:be}})}).filter(m=>m&&String(m.kpiField||"").trim().length>0);if(!u.length){let m=i.flatMap(I=>Object.keys(r(I?.kpi_json)||{})).filter((I,F,L)=>L.indexOf(I)===F),g=m.length?`Captured keys: ${m.slice(0,6).join(", ")}${m.length>6?", ...":""}.`:"No KPI values were returned for this run.";a.runDetailContent.innerHTML=ke(`No comparable KPI values were captured for this run. ${g}`);return}let $=new Set(["api_version","timestamp","_jin_id"]),A=m=>{if(!m||m.indexOf("|")===-1)return{};let[,...g]=m.split("|"),I={};return g.forEach(F=>{let L=F.indexOf("=");if(L<=0)return;let O=F.slice(0,L),U=F.slice(L+1);I[O]=U}),I},N=m=>{let g=A(m),I=g.retailer||g.grain_retailer,F=g["data[].date"]||g.date||g.period,L=g["data[].label"]||g.label,O=[I?`Retailer: ${I}`:null,F?`Date: ${F}`:null,L?`Label: ${L}`:null].filter(Boolean);if(O.length)return O.join(" \u2022 ");let U=Object.entries(g).filter(([D])=>!$.has(D)).slice(0,3).map(([D,le])=>`${D}=${le}`);return U.length?U.join(" \u2022 "):"Global grain"},H=new Map;u.forEach(m=>{let g=String(m.grainKey||"Global");H.has(g)||H.set(g,[]),H.get(g).push(m)});let j=Array.from(H.entries()).map(([m,g])=>{let I=g.filter(L=>L.status!=="match"&&L.status!=="missing_reference").length,F=g.every(L=>L.status==="missing_reference"||L.expected==null);return{grainKey:m,title:N(m),rows:g,needsReviewCount:I,missingBaseline:F,status:I>0?"mismatch":F?"missing_reference":"match"}}).sort((m,g)=>(m.status==="match"?1:0)-(g.status==="match"?1:0)),k=j.length,M=j.filter(m=>m.status==="mismatch"),v=j.filter(m=>m.status==="missing_reference"),C=v.length,R=M.length,T=j.filter(m=>m.status==="match"),E=m=>{let g=m.rows.filter(O=>O.status==="mismatch"||O.status==="missing_kpi"||O.status==="error").length,I=m.rows.filter(O=>O.status==="missing_reference").length,F=m.rows.filter(O=>O.status==="match").length,L=[`${p(m.rows.length)} metric(s)`];return g&&L.push(`${p(g)} need attention`),I&&L.push(`${p(I)} without targets`),F&&L.push(`${p(F)} matched`),L.join(" \u2022 ")},x=m=>{let g=Xe(String(m.kpiField||"metric")),I=m.pctChange==null?null:Number(m.pctChange);if(m.status==="match")return I==null?`${g} is within the allowed range.`:`${g} is within the allowed range (${Math.abs(I).toFixed(1)}% change).`;if(m.status==="missing_reference")return`No targets are uploaded for ${g}.`;if(m.status==="missing_kpi")return`${g} was not returned by the API for this grain.`;if(m.status==="error")return m.message||`Could not evaluate ${g}.`;if(I==null)return`${g} is outside the allowed range.`;let F=I>0?"higher":"lower";return`${g} is ${Math.abs(I).toFixed(1)}% ${F} than target (outside tolerance).`},y=m=>{let g=m.rows.filter(D=>D.status!=="match"),I=m.rows.filter(D=>D.status==="match"),F=g.length?g:I.slice(0,3),L=g.length?I:I.slice(3),O=g.slice(0,2).map(D=>x(D)).join(" \u2022 "),U=Math.max(0,g.length-2);return`
    <div class="upload-analysis-card upload-analysis-card-${m.status==="match"?"match":m.status==="missing_reference"?"setup":"mismatch"} run-detail-grain-card">
      <div class="upload-analysis-header">
        <div>
          <strong>${S(m.title)}</strong>
          <div class="tiny muted">${S(E(m))}</div>
        </div>
        <span class="status-pill ${It(m.status)}">${S(ht(m.status))}</span>
      </div>

      <div class="run-detail-card-stats tiny">
        ${p(m.rows.length)} metric(s) \u2022 ${p(g.length)} need attention \u2022 ${p(I.length)} within range
      </div>

      ${O?`<div class="upload-analysis-highlights"><strong>Top findings:</strong> ${S(O)}${U?` +${U} more`:""}</div>`:""}

      ${m.missingBaseline?`
        <div class="run-detail-inline-help">
          No targets are linked to this grain yet.
          <button class="action secondary tiny" type="button" onclick="openUploadsTab()">Upload targets</button>
        </div>
      `:""}

      <details class="run-detail-kpi-breakdown">
        <summary>${g.length?`${p(g.length)} KPI(s) need attention`:`${p(m.rows.length)} KPI(s) within targets`}</summary>
        <div class="table-wrap" style="margin-top:10px;">
          <table class="row-table run-detail-kpi-table">
            <thead>
              <tr>
                <th>Metric</th>
                <th>Target</th>
                <th>API value</th>
                <th>Delta</th>
                <th>Outcome</th>
              </tr>
            </thead>
            <tbody>
              ${F.map(D=>`
                <tr>
                  <td>
                    <strong>${S(Xe(D.kpiField))}</strong>
                  </td>
                  <td class="num muted">${D.expected==null?"\u2014":p(D.expected)}</td>
                  <td class="num">${p(D.actual)}</td>
                  <td>${D.pctChange==null?"\u2014":`${Number(D.pctChange)>0?"+":""}${Number(D.pctChange).toFixed(1)}%`}</td>
                  <td>
                    <span class="status-pill ${It(D.status)}">${S(ht(D.status))}</span>
                    <div class="tiny muted" style="margin-top:6px;">${S(x(D))}</div>
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
        ${L.length?`
          <details class="upload-analysis-inline-more">
            <summary>Show ${p(L.length)} additional matched KPI(s)</summary>
            <div class="table-wrap" style="margin-top:10px;">
              <table class="row-table run-detail-kpi-table">
                <thead>
                  <tr>
                    <th>Metric</th>
                    <th>Target</th>
                    <th>API value</th>
                    <th>Delta</th>
                    <th>Outcome</th>
                  </tr>
                </thead>
                <tbody>
                  ${L.map(D=>`
                    <tr>
                      <td><strong>${S(Xe(D.kpiField))}</strong></td>
                      <td class="num muted">${D.expected==null?"\u2014":p(D.expected)}</td>
                      <td class="num">${p(D.actual)}</td>
                      <td>${D.pctChange==null?"\u2014":`${Number(D.pctChange)>0?"+":""}${Number(D.pctChange).toFixed(1)}%`}</td>
                      <td>
                        <span class="status-pill ${It(D.status)}">${S(ht(D.status))}</span>
                        <div class="tiny muted" style="margin-top:6px;">${S(x(D))}</div>
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
        <div class="tiny muted upload-analysis-request">${S(m.grainKey)}</div>
      </details>
    </div>
  `},P=M.slice(0,6),_=M.slice(6),V=v.slice(0,6),f=v.slice(6);a.runDetailContent.innerHTML=`
    <div class="run-detail-guide">
      <strong>What this run means</strong>
      <p>This view compares API values against uploaded targets for each grain.</p>
      ${C?'<p class="tiny" style="margin-top:8px;">Some grains have no targets yet. You can view raw API values, then upload targets to enable pass/fail checks.</p>':""}
    </div>
      <div class="upload-analysis-summary-grid" style="margin-top:12px;">
        <div class="meta-card meta-card-compact">
          <strong>Grains in run</strong>
          <span>${p(k)}</span>
        </div>
        <div class="meta-card meta-card-compact">
          <strong>Needs attention</strong>
          <span>${p(R)}</span>
        </div>
      <div class="meta-card meta-card-compact">
        <strong>No targets</strong>
        <span>${p(C)}</span>
      </div>
    </div>

    <div class="history-list" style="margin-top:14px;">
      ${M.length?`<div class="upload-analysis-section-title">Needs attention (${p(M.length)})</div>`:""}
      ${P.map(m=>y(m)).join("")}
      ${_.length?`
        <details class="upload-analysis-more-runs">
          <summary>Show ${p(_.length)} more grain(s) needing attention</summary>
          <div class="history-list" style="margin-top:12px;">
            ${_.map(m=>y(m)).join("")}
          </div>
        </details>
      `:""}
      ${v.length?`<div class="upload-analysis-section-title">Needs target setup (${p(v.length)})</div>`:""}
      ${V.map(m=>y(m)).join("")}
      ${f.length?`
        <details class="upload-analysis-more-runs">
          <summary>Show ${p(f.length)} more grain(s) needing target setup</summary>
          <div class="history-list" style="margin-top:12px;">
            ${f.map(m=>y(m)).join("")}
          </div>
        </details>
      `:""}
      ${!M.length&&!v.length?'<div class="upload-analysis-section-title">No grains need attention</div>':""}
      ${T.length?`
        <details class="upload-analysis-more-runs upload-analysis-matched-group">
          <summary>Matched grains (${p(T.length)})</summary>
          <div class="history-list" style="margin-top:12px;">
            ${T.map(m=>y(m)).join("")}
          </div>
        </details>
      `:""}
    </div>
  `};function Fs(){let e=s.status?.endpoints||[],t=s.anomalies?.anomalies||[],n=s.status?.summary||{total_endpoints:0,healthy:0,anomalies:0,unconfirmed:0},i=s.status?.project,r=s.status?.recent_errors||[],o=e.length?Math.round((n.healthy||0)/e.length*100):100;a.overviewMetrics.innerHTML=[tt("Healthy",`${o}%`,"Healthy right now"),tt("At risk",t.length+Number(n.unconfirmed||0),"APIs to review or finish")].join(""),a.overviewCharts.innerHTML=`
        <div class="chart-card">
          <strong>Project</strong>
          <div class="chart-value">${i?.name||"Your project"}</div>
          <div class="tiny">${e.length} APIs \u2022 ${t.length} issues \u2022 ${r.length} errors</div>
          ${xs(e)}
          <div class="legend-row">
            <span class="legend-chip healthy">Healthy</span>
            <span class="legend-chip warning">Warning</span>
            <span class="legend-chip anomaly">Anomaly</span>
            <span class="legend-chip unconfirmed">Unconfirmed</span>
          </div>
        </div>
      `;let l=e.filter(u=>u.status==="unconfirmed").length,c=e.filter(u=>(u.active_anomalies||0)>0||u.status==="warning").length,d=e.length===0?Hi({title:"Create your project",description:"Jin is meant to monitor your own FastAPI app, not the maintainer demo harness.",primaryLabel:"Set Up APIs",primaryView:"api",secondaryLabel:"Open Getting Started",secondaryHref:"https://amit-devb.github.io/jin/",footer:"After the first request, come back here to finish dimensions, KPIs, and targets."}):"";a.overviewAttention.innerHTML=e.length===0?`
        ${Cs()}
        ${d}
        <div class="row-card quick-start-card">
          <strong>Connect your API</strong>
          <div class="muted">Open the APIs workspace, choose the endpoint, and confirm dimensions, KPIs, and time from the reflected schema.</div>
          <div class="toolbar" style="margin-top:12px;">
            <button class="action" type="button" data-view="api">Open API Setup</button>
          </div>
        </div>
        <div class="row-card">
          <strong>What happens next</strong>
          <div class="muted">Once your first endpoint is connected, Jin will show health, issues, and report guidance for your own project.</div>
        </div>
      `:`
        ${Cs()}
        <div class="row-card quick-start-card">
          <strong>Connect your API</strong>
          <div class="muted">Start with your own API, then upload expected values or configure the fields for the first endpoint.</div>
          <div class="toolbar" style="margin-top:12px;">
            <button class="action" type="button" data-view="api">Set Up APIs</button>
          </div>
        </div>
        <div class="row-card">
          <strong>Review issues next</strong>
          <div class="muted">${t.length} issues and ${r.length} recent errors are waiting there.</div>
          <div class="toolbar" style="margin-top:12px;">
            <button class="action secondary" type="button" data-view="incidents">Review Issues</button>
          </div>
        </div>
        <div class="row-card">
          <strong>Current focus</strong>
          <div class="muted">${c} APIs need attention and ${l} still need setup.</div>
        </div>
      `}function Ds(){let e=s.poPlaybook;if(!e){a.poPlaybookContent.innerHTML=`
      <div class="row-card">
        <strong>Loading playbook...</strong>
        <div class="muted" style="margin-top:8px;">Preparing your step-by-step workflow guidance.</div>
      </div>
    `,Ms();return}let t=e.workflows||[],n=s.status?.endpoints||[],i=e.stats||{},r=Number(i.apis_tracked||0),o=Number(i.healthy||0),l=Number(i.anomalies||0),c=Number(i.unconfirmed||0),d=r>0?Math.round(o/r*100):100,u=l>0?`${p(l)} open issue${l===1?"":"s"} need attention.`:c>0?`${p(c)} API${c===1?"":"s"} still need setup.`:"No active blockers right now.",$=l>0?"incidents":"api",A=l>0?"Review Issues":"Set Up APIs",N=l>0?`${l} issue${l===1?"":"s"} need attention. Review Issues and focus on high-impact rows first.`:c>0?`${c} API${c===1?"":"s"} still need setup. Set Up APIs and complete target setup.`:"No active blockers. Run checks now and generate this week's report pack.";a.poPlaybookContent.innerHTML=`
    <div class="playbook-snapshot-grid">
      <div class="row-card playbook-snapshot-card">
        <span class="tiny">APIs Tracked</span>
        <strong>${p(r)}</strong>
        <div class="muted">Project: ${p(e.project?.name||"unknown")}</div>
      </div>
      <div class="row-card playbook-snapshot-card">
        <span class="tiny">Healthy</span>
        <strong>${p(o)}</strong>
        <div class="muted">${p(d)}% health score</div>
      </div>
      <div class="row-card playbook-snapshot-card">
        <span class="tiny">Issues</span>
        <strong>${p(l)}</strong>
        <div class="muted">Needs attention</div>
      </div>
      <div class="row-card playbook-snapshot-card">
        <span class="tiny">Setup Pending</span>
        <strong>${p(c)}</strong>
        <div class="muted">Needs setup</div>
      </div>
    </div>
    <div class="row-card" style="margin-bottom:12px;">
      <strong>Plain-language summary</strong>
      <div class="muted" style="margin-top:6px;">${n.length===0?"Block release: you do not have a live project yet. Connect your own FastAPI app first.":l>0?`Needs attention: ${p(l)} issue${l===1?"":"s"} need attention. Start with the highest-priority row and work downward.`:c>0?`Needs attention: ${p(c)} API${c===1?"":"s"} still need setup. Finish setup before looking for deeper insights.`:"Safe for now: your project looks healthy. Review the highest-priority project in the portfolio and keep an eye on the weekly report pack."}</div>
    </div>
    <div class="row-card playbook-next-card" style="margin-bottom:12px;">
      <strong>What to do now</strong>
      <div class="tiny" style="margin-top:8px;">${u}</div>
      <div class="tiny muted" style="margin-top:6px;">${N}</div>
      <div class="toolbar" style="margin-top:10px; gap:8px;">
        <button class="action" type="button" data-view="${$}">${A}</button>
        <button class="action secondary" type="button" data-view="reports">Open Reports</button>
      </div>
    </div>
    <div class="row-card playbook-rhythm-card" style="margin-bottom:12px;">
      <strong>PO operating rhythm</strong>
      <div class="playbook-rhythm-grid">
        <div class="playbook-rhythm-item">
          <div class="tiny playbook-rhythm-label">Daily</div>
          <div class="muted">Run checks and review high-priority drift in Issues.</div>
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
      <div class="tiny muted" style="margin-top:8px;">Updated: ${ne(e.generated_at)}</div>
    </div>
    <div class="row-card">
      <strong>Workflow checklist</strong>
      <div class="history-list playbook-checklist" style="margin-top:10px;">
        ${t.map((H,j)=>`
          <div class="history-item">
            <strong>${j+1}. ${H.title}</strong><br/>
            <span class="tiny">${H.outcome}</span>
          </div>
        `).join("")||'<div class="history-item">No workflow items found.</div>'}
      </div>
    </div>
  `,Ms()}function Ms(){let e=Le(),t=document.getElementById("playbook-maintainer-setup"),n=document.getElementById("playbook-core-workflow");if(t&&(t.style.display=e?"":"none"),n&&(n.style.display=e?"":"none"),!e){[a.projectWorkflowFeedback,a.projectWorkflowHealth,a.projectWorkflowMonitor,a.projectWorkflowRuns,a.projectWorkflowReport].forEach(f=>{let m=f.closest(".row-card");m&&(m.style.display="none")});return}let i=s.projectsCatalog||[],o=String(a.projectActiveSelect.value||"").trim()||s.activeProjectId||i.find(f=>f.active&&!f.is_archived)?.id||i.find(f=>!f.is_archived)?.id||i[0]?.id||"",l=i.find(f=>String(f.id)===String(o)),c=!!l?.is_archived,d=Array.isArray(s.status?.endpoints)?s.status.endpoints:[],u=d.length,$=d.filter(f=>!!f?.last_upload_at).length,N=(Array.isArray(s.scheduler?.jobs)?s.scheduler.jobs:[]).filter(f=>{let m=String(f?.job_id||"");if(!m||m.startsWith("jin:bundle:"))return!1;let g=String(f?.job_type||"").toLowerCase();if(g&&g!=="watch"||!String(f?.endpoint_path||f?.path||"").trim())return!1;let F=String(f?.skip_reason||"");return F!=="missing_default_params"&&F!=="unsupported_schedule"}),H=Array.isArray(s.projectRunHistory)&&s.projectRunHistory.length>0,j=String(a.projectDeleteConfirm.value||"").trim(),k=String(l?.name||"").trim(),M=!!k&&j===k;if(!String(a.projectRegisterName.value||"").trim()){let f=String(s.status?.project?.name||"").trim();f&&(a.projectRegisterName.value=f)}a.projectActiveSelect.innerHTML=i.length?i.map(f=>`
      <option value="${f.id}" ${f.id===o?"selected":""}>
        ${f.name}${f.active?" (active)":""}${f.is_archived?" [archived]":""}
      </option>
    `).join(""):'<option value="">No project found</option>';let v=String(s.activeProjectId||""),C=!!o&&o!==v&&!c;a.projectSelectButton.disabled=!C,a.projectSelectButton.textContent=c?"Archived (restore first)":C?"Switch to Selected Project":"Already Active",a.projectArchiveButton.disabled=!o||c,a.projectRestoreButton.disabled=!o||!c,a.projectDeleteButton.disabled=!o||!c||!M,a.projectDeleteConfirm.placeholder=k?`Type "${k}" to delete`:"Type selected project name exactly";let R=!o||c,T=u===0;if(a.projectPolicySaveButton.disabled=R||T,a.projectPolicyApplyButton.disabled=R||T,a.projectRunBundleButton.disabled=R||T,a.projectBaselinePromoteButton.disabled=R||T,a.projectHealthCheckButton.disabled=R,a.projectMonitorRefreshButton.disabled=R,a.projectReportDigestButton.disabled=R||T||!H,s.projectPolicyLoadedFor===o&&s.projectMonitorPolicy){let f=s.projectMonitorPolicy||{};a.projectPolicyCadence.value=String(f.cadence_template||"balanced"),a.projectPolicySchedule.value=String(f.schedule||"every 2h"),a.projectPolicyBaselineMode.value=String(f.baseline_mode||"fixed"),a.projectPolicyThreshold.value=f.threshold==null?"":String(f.threshold),a.projectPolicyBundleEnabled.checked=!!f.bundle_enabled,a.projectPolicyBundleSchedule.value=String(f.bundle_schedule||"daily 09:00"),a.projectPolicyBundleFormat.value=String(f.bundle_report_format||"markdown")}let E=R?c?"Selected project is archived. Restore it to continue.":"Create or select a project to begin.":T?"No APIs are tracked yet. Call your APIs once, then save setup and run checks.":$===0?`APIs are tracked (${p(u)}), but no targets are uploaded yet. Set Up APIs and upload target files.`:N.length===0?"Setup is saved but no runnable watch jobs are configured yet. Click Save & Apply Setup.":H?`Core workflow is ready: ${p(u)} API${u===1?"":"s"} tracked, ${p($)} with targets, ${p(N.length)} runnable watches.`:"Setup is ready. Run checks now to create the first monitoring run.",x=s.projectWorkflowMessage||{text:E,kind:"info"};a.projectWorkflowFeedback.textContent=x.text||"",a.projectWorkflowFeedback.className=`feedback${x.kind==="error"?" danger":x.kind==="success"?" success":" info"}`;let y=s.projectHealth;if(!y)a.projectWorkflowHealth.innerHTML="";else{let f=y.checks||[];a.projectWorkflowHealth.innerHTML=`
      <div class="row-card">
        <strong>Health Snapshot</strong>
        <div class="tiny" style="margin-top:6px;">
          Status: ${p(y.status||"unknown")} \u2022 Generated: ${ne(y.generated_at)}
        </div>
        <div class="history-list" style="margin-top:10px;">
          ${f.map(m=>`
            <div class="history-item">
              <strong>${m.name}</strong> \u2022 ${m.status} \u2022 ${m.detail}
            </div>
          `).join("")||'<div class="history-item">No checks returned.</div>'}
        </div>
      </div>
    `}let P=s.projectsMonitorSnapshot;if(!P)a.projectWorkflowMonitor.innerHTML="";else{let f=P.projects||[],m=P.summary||{},g=m.top_risk_project||null,I=m.healthy_projects??f.filter(Y=>String(Y.status||"").toLowerCase()==="healthy").length,F=m.degraded_projects??f.filter(Y=>String(Y.status||"").toLowerCase()!=="healthy").length,L=m.projects_with_baseline??f.filter(Y=>Number(Y.baseline?.coverage_pct||0)>=70).length,O=m.average_risk_score??(f.length?f.reduce((Y,pe)=>Y+Number(pe.risk_score||0),0)/f.length:0),U=Fi({endpoints:f.length,anomalies:Number(g?.summary?.anomalies||0),needsSetup:Number(f.filter(Y=>Number(Y.baseline?.coverage_pct||0)<70).length),needsAttention:F,topRiskScore:Number(g?.risk_score||0)}),D=[tt("Projects",p(P.count||f.length),"Tracked across the portfolio"),tt("Healthy",p(I),"Projects currently stable"),tt("At risk",p(F),"Projects needing attention"),tt("Avg risk",`${Math.round(Number(O||0))}%`,"Portfolio risk snapshot")].join(""),le=g?U.label==="Block release"?"Treat this portfolio as blocked until the highest-risk project is addressed.":U.label==="Needs attention"?"Review the highest-risk project first, then compare it with the rest of the portfolio.":"The portfolio looks safe for now. Keep watching the highest-risk project and recheck weekly.":"Keep the portfolio view open while you review project health and target coverage.";a.projectWorkflowMonitor.innerHTML=`
      <div class="row-card">
        <strong>Portfolio Health</strong>
        <div class="tiny" style="margin-top:6px;">
          Projects: ${p(P.count||f.length)} \u2022 Target coverage: ${p(L)} \u2022 Generated: ${ne(P.generated_at)}
        </div>
        <div class="metric-row" style="margin-top:12px;">
          ${D}
        </div>
        <div class="row-card ${U.tone}" style="margin-top:12px;">
          <strong>${U.label}</strong>
          <div class="tiny" style="margin-top:6px;">${S(U.detail)} ${S(le)}</div>
        </div>
        ${g?`
          <div class="sidebar-card" style="margin-top:12px;">
            <strong>Top Risk Project</strong>
            <div class="tiny" style="margin-top:6px;">${S(String(g.name||"Unknown project"))} \u2022 ${U.label} \u2022 risk ${Math.round(Number(g.risk_score||0))}%</div>
            <div class="tiny muted" style="margin-top:6px;">${S(Array.isArray(g.risk_reasons)?g.risk_reasons.join(" \u2022 "):"")}</div>
            ${g.id?`<div class="toolbar compact" style="margin-top:10px;"><button class="action secondary tiny" type="button" onclick="focusPortfolioProject('${S(String(g.id))}')">Focus Project</button></div>`:""}
          </div>
        `:""}
        <div class="history-list" style="margin-top:10px;">
          ${f.slice(0,6).map(Y=>`
            <div class="history-item">
              <strong>${Y.name}</strong> \u2022 ${Y.status||"unknown"} \u2022 ${String(Y.risk_label||"watch")} \u2022 risk ${Math.round(Number(Y.risk_score||0))}% \u2022 issues: ${p(Y.summary?.anomalies||0)} \u2022 APIs with targets: ${p(Y.baseline?.endpoints_with_baseline||0)}
              ${Y.id?`<div class="toolbar compact" style="margin-top:8px;"><button class="action ghost tiny" type="button" onclick="focusPortfolioProject('${S(String(Y.id))}')">Focus</button></div>`:""}
            </div>
          `).join("")||'<div class="history-item">No project monitor snapshot returned.</div>'}
        </div>
      </div>
    `}let _=s.projectRunHistory||[];a.projectWorkflowRuns.innerHTML=_.length?`
      <div class="row-card">
        <strong>Recent Check Runs</strong>
        <div class="history-list" style="margin-top:10px;">
          ${_.slice(0,6).map(f=>`
            <div class="history-item">
              <strong>${f.status||"unknown"}</strong> \u2022 ${p(f.started_at)} \u2022 planned ${p(f.requested||0)} \u2022 completed ${p(f.executed||0)} \u2022 errors ${p(f.errors||0)}
            </div>
          `).join("")}
        </div>
      </div>
    `:"";let V=s.projectDigest;if(!V)a.projectWorkflowReport.innerHTML="";else{let f=V.totals||{};a.projectWorkflowReport.innerHTML=`
      <div class="row-card">
        <strong>Leadership Digest (${p(V.window_days||7)}d)</strong>
        <div class="tiny" style="margin-top:6px;">
          Runs: ${p(f.runs||0)} \u2022 Success: ${p(f.success||0)} \u2022 Degraded: ${p(f.degraded||0)} \u2022 Errors: ${p(f.errors||0)}
        </div>
        <div class="tiny" style="margin-top:6px;">
          Requested checks: ${p(f.requested||0)} \u2022 Executed checks: ${p(f.executed||0)}
        </div>
      </div>
    `}}function Ve(){let e=Bt(De()),t=nt(),n=ct(t,s.incidentPage,10);s.incidentPage=n.page;let i=s.incidentsMessage;a.incidentsFeedback.textContent=i?.text||"",a.incidentsFeedback.className=`feedback feedback-banner${i?.kind==="error"?" danger":i?.kind==="success"?" success":i?" info":""}`;let r=e.filter(f=>String(f.status||"active")!=="resolved").length,o=e.filter(f=>String(f.status||"active")!=="resolved"&&["critical","high"].includes(String(f.severity||"").toLowerCase())).length,l=t.find(f=>String(f.status||"active")!=="resolved")||e.find(f=>String(f.status||"active")!=="resolved")||null,c=document.querySelectorAll(".bulk-incident:checked").length,d=c>0;a.bulkPreview.textContent=d?`${c} issue${c===1?"":"s"} selected.`:"Select one or more issues to apply one action.",a.bulkAction.style.display=d?"":"none",a.bulkNote.style.display=d?"":"none",a.bulkRun.style.display=d?"":"none",a.incidentFilters.innerHTML=`
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
      `;let u=f=>{let m=String(f||"active").toLowerCase();return m==="acknowledged"?"In review":m==="snoozed"?"Deferred":m==="suppressed"?"Muted":m==="resolved"?"Resolved":"Needs attention"},$=f=>{let m=String(f||"medium").toLowerCase();return m==="critical"||m==="high"?"High":m==="low"?"Low":"Medium"},A=f=>{let m=String(f||"active").toLowerCase();return m==="resolved"?"resolved":m==="acknowledged"?"acknowledged":"active"},N=f=>{let m=ns(f);return m==="danger"?"danger":m==="warning"?"warning":"healthy"},H=f=>{let m=Number(f);if(!Number.isFinite(m))return null;let g=m<=1?m*100:m,I=Math.max(0,Math.min(100,g));return`${Math.round(I)}% confidence`},j=(f,m=120)=>{let g=String(f||"").trim();return g?g.length<=m?g:`${g.slice(0,m-1).trimEnd()}\u2026`:""},k=f=>{let m=Number(f?.baseline_used),g=Number(f?.actual_value),I=Number.isFinite(m)?m:null,F=Number.isFinite(g)?g:null;if(I==null||F==null)return`Expected ${p(f?.baseline_used)} -> Actual ${p(f?.actual_value)}`;if(I===0)return`Expected 0 -> Actual ${p(F)} (target is zero)`;let L=Math.abs(F/I),O=L>=100?`${L.toFixed(0)}x`:`${L.toFixed(1)}x`;return`Expected ${p(I)} -> Actual ${p(F)} (${O} vs target)`},M=!!((s.incidentStatusFilter||"").trim()||(s.incidentSeverityFilter||"").trim()),v=[];s.incidentStatusFilter&&v.push(`Status: ${u(s.incidentStatusFilter)}`),s.incidentSeverityFilter&&v.push(`Priority: ${$(s.incidentSeverityFilter)}`);let C=v.join(" \u2022 "),R=t.length?(n.page-1)*10+1:0,T=t.length?R+n.items.length-1:0,E=`
    <div class="issues-kpi-grid issues-kpi-grid-compact" style="margin-bottom:10px;">
      <div class="row-card issues-kpi-card">
        <span class="tiny">Open</span>
        <strong class="issues-kpi-value">${p(r)}</strong>
      </div>
      <div class="row-card issues-kpi-card">
        <span class="tiny">High Priority</span>
        <strong class="issues-kpi-value">${p(o)}</strong>
      </div>
      <div class="row-card issues-kpi-card">
        <span class="tiny">Visible</span>
        <strong class="issues-kpi-value">${p(t.length)}</strong>
      </div>
    </div>
  `,x=M?`
      <div class="row-card issue-filter-summary" style="margin-bottom:10px;">
        <strong>Filtered view</strong>
        <div class="tiny" style="margin-top:6px;">
          Showing ${p(t.length)} issue${t.length===1?"":"s"} with ${S(C)}.
        </div>
        <div class="toolbar" style="margin-top:10px;">
          <button class="action secondary" type="button" onclick="clearIncidentFilters()">Clear filters</button>
        </div>
      </div>
    `:"",y=s.incidentSort==="business",P=M?`Showing ${p(R)}-${p(T)} of ${p(t.length)} after filters.`:`Showing ${p(R)}-${p(T)} of ${p(t.length)} in priority order.`,_=l?`<button class="action" type="button" onclick="showIncident(${l.id})">Review Top Issue</button>`:'<button class="action" type="button" data-view="api">Set Up APIs</button>',V=t.length===0&&e.length>0&&M;a.incidentsList.innerHTML=t.length?`
        ${x}
        ${E}
        <div class="row-card issue-queue-summary" style="margin-bottom:10px;">
          <strong>Issue Review Queue</strong>
          <div class="tiny" style="margin-top:6px;">${P}</div>
          <div class="tiny muted issue-queue-note" style="margin-top:4px;">
            ${y?"Business ranking is active.":"Priority ordering is active."}
            Start with high-priority rows first.
          </div>
          <div class="toolbar" style="margin-top:10px;">
            ${_}
            <button class="action secondary" type="button" data-view="errors">View Errors</button>
          </div>
        </div>
        <div class="issues-card-list" role="list" aria-label="Issue review queue">
          ${n.items.map(f=>`
            <article class="issue-card issue-card-${String(f.severity||"medium").toLowerCase()} issue-status-${String(f.status||"active").toLowerCase()}" role="listitem" data-issue-id="${f.id}">
              <div class="issue-card-select">
                <input type="checkbox" class="bulk-incident" value="${f.id}" aria-label="Select issue ${f.id}" />
              </div>
              <div class="issue-card-body">
                <div class="issue-card-header">
                  <div class="issue-card-identity">
                    <div class="table-strong issue-card-endpoint">${p(f.endpoint_path)} <span class="chip issue-id-chip">Issue #${p(f.id)}</span></div>
                    <div class="tiny issue-card-grain">Grain: ${S(j(Ns(String(f.grain_key||"")),96)||"Global")}</div>
                    ${f.owner?`<div class="tiny muted issue-card-owner">Owner: ${S(f.owner)}</div>`:""}
                  </div>
                  <div class="issue-card-priority">
                    <span class="status-pill ${St(f)}">${$(f.severity)}</span>
                    <span class="status-pill ${A(f.status)}">${u(f.status)}</span>
                    <span class="status-pill ${Mt(f).toLowerCase()}">Priority ${Mt(f)}</span>
                    <span class="status-pill ${N(f)}">${Lt(f)}</span>
                    ${H(f.confidence)?`<span class="tiny issue-card-confidence">${H(f.confidence)}</span>`:""}
                  </div>
                </div>
                <div class="issue-card-change">
                  <div class="table-strong issue-card-metric">
                    ${S(ft(String(f.kpi_field||"metric")))}
                    <span class="issue-delta-chip">${Hs(f.pct_change)}</span>
                  </div>
                  <div class="tiny issue-change-core">${S(k(f))}</div>
                </div>
                <div class="issue-card-meta">
                  <div class="issue-card-meta-item">
                    <span class="issue-card-meta-label">Detected</span>
                    <span class="issue-card-meta-value">${ne(f.detected_at)}</span>
                  </div>
                  <div class="issue-card-meta-item">
                    <span class="issue-card-meta-label">Decision status</span>
                    <span class="tiny muted issue-card-meta-value">${Lt(f)} \u2022 ${u(f.status)} \u2022 ${$(f.severity)} priority</span>
                  </div>
                </div>
                <details class="issue-priority-details issue-card-rank">
                  <summary>${Lt(f)} - why this was flagged</summary>
                  <div class="tiny muted">${S(j(is(f),180))}</div>
                  <div class="tiny muted" style="margin-top:4px;">${S(j(f.change_since_last_healthy_run||"Compared with targets.",160))}</div>
          <div class="tiny muted" style="margin-top:4px;">Priority score ${Math.round(bt(f))} \u2022 ${Mt(f)} priority \u2022 ${S(ss(f).join(" \u2022 "))}</div>
                </details>
                <div class="toolbar compact issue-card-actions">
                  <button class="action" type="button" onclick="showIncident(${f.id})">Open Details</button>
                  <details class="more-actions">
                    <summary aria-label="More actions for issue ${f.id}" title="More actions for issue ${f.id}">\u22EF</summary>
                    <div class="more-actions-menu">
                      <button class="action secondary" type="button" onclick="confirmIncident(${f.id}, 'acknowledged', 0)">Mark In Review</button>
                      <button class="action secondary" type="button" onclick="quickFixBaseline(${f.id})">Accept as Target</button>
                      <button class="action warn" type="button" onclick="confirmIncident(${f.id}, 'resolved', 0)">Resolve</button>
                      <button class="action ghost" type="button" onclick="openApi('${String(f.endpoint_path).replace(/'/g,"\\\\'")}')">Open API</button>
                    </div>
                  </details>
                </div>
              </div>
            </article>
          `).join("")}
        </div>
      ${dt("incidents",n.page,n.totalPages)}
      `:V?`
        <div class="empty empty-center issue-empty-state">
          <strong>No issues match these filters.</strong>
          <div class="tiny" style="margin-top:6px;">${C?`Active filters: ${S(C)}. `:""}Clear filters to see the full issue queue again.</div>
          <div class="toolbar" style="margin-top:12px; justify-content:center;">
            <button class="action secondary" type="button" onclick="clearIncidentFilters()">Clear filters</button>
          </div>
        </div>
      `:`
        <div class="empty empty-center issue-empty-state">
          <strong>No issues right now.</strong>
          <div class="tiny" style="margin-top:6px;">
            Run checks regularly and return here when any drift needs attention.
            If you expected upload mismatches, review Issues from the upload analysis panel to refresh and reset filters.
          </div>
          <div class="toolbar" style="margin-top:12px; justify-content:center;">
            ${M?'<button class="action secondary" type="button" onclick="clearIncidentFilters()">Clear filters</button>':""}
            <button class="action" type="button" data-view="api">Set Up APIs</button>
          </div>
        </div>
      `}function Os(){let e=s.scheduler?.jobs||[],t=n=>{let i=String(n?.last_status||"never").toLowerCase(),r=ne(n?.last_finished_at),o=!!n?.last_finished_at;return n?.paused?{pillClass:"suppressed",pillLabel:"Paused",tooltip:"Paused: checks are stopped until you click Resume.",lastLine:o?`Last run before pause - ${r}`:"No completed runs yet."}:i==="success"?{pillClass:"resolved",pillLabel:"Healthy",tooltip:"Healthy: the latest run completed without errors.",lastLine:o?`Last successful run - ${r}`:"Last successful run not recorded yet."}:i==="error"?{pillClass:"active",pillLabel:"Failed",tooltip:"Failed: the latest run hit an error. See the error message in this row.",lastLine:o?`Last failed run - ${r}`:"A run failed, but no finish time is recorded."}:i==="backoff"?{pillClass:"acknowledged",pillLabel:"Retrying",tooltip:"Retrying: Jin is waiting before the next attempt after recent failures.",lastLine:o?`Last retry attempt - ${r}`:"Retry mode is active."}:i==="skipped"?{pillClass:"acknowledged",pillLabel:"Skipped",tooltip:"Skipped: this run was intentionally not executed.",lastLine:o?`Last skipped run - ${r}`:"Latest run was skipped."}:{pillClass:"resolved",pillLabel:"Not run yet",tooltip:"Not run yet: this watch has not completed its first run.",lastLine:"No completed runs yet."}};a.schedulerList.innerHTML=e.length?`
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
              ${e.map(n=>{let i=t(n),r=n.backoff_active?"Backoff":"Normal",o=n.backoff_active?"Backoff mode: next retry is delayed after failures.":"Normal mode: runs follow the regular schedule.";return`
                <tr>
                  <td>
                    <div class="table-strong">${p(n.path||n.job_id||"Watch job")}</div>
                    <div class="tiny" title="${S(i.tooltip)}">${S(i.lastLine)}</div>
                    <div class="tiny">${n.last_error||"No errors."}</div>
                  </td>
                  <td>
                    <span class="status-pill ${i.pillClass}" title="${S(i.tooltip)}">${S(i.pillLabel)}</span>
                  </td>
                  <td>${ne(n.next_run_at)}</td>
                  <td>${ne(n.next_retry_at)}</td>
                  <td><span title="${S(o)}">${r}</span></td>
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
      `:ke("No watches yet.")}function yt(){let e=s.status?.project,t=pr();a.errorsList.innerHTML=t.length?t.map(n=>`
        <div class="row-card">
          <div style="display:flex; justify-content:space-between; gap:12px;">
            <div>
              <strong>${n.category?n.category[0].toUpperCase()+n.category.slice(1):Bs(n.source)} \u2022 ${n.source}</strong>
              <div class="muted">${n.message}</div>
            </div>
            <div style="display:flex; gap:8px; flex-wrap:wrap;">
              <span class="status-pill ${n.severity||Bn(n.source)}">${n.severity||Bn(n.source)}</span>
              <span class="status-pill ${sn(n)==="archived"?"resolved":sn(n)==="acknowledged"?"acknowledged":"active"}">${sn(n)}</span>
            </div>
          </div>
          <div class="tag-row">
            <span class="chip">${e?.name||"project"}</span>
            <span class="chip">${n.endpoint_path||"workspace-level"}</span>
            <span class="chip">${ne(n.created_at)}</span>
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
      `).join(""):ke("No errors right now.")}function mr(e){if(!e)return"";let t=e.toLowerCase();return t==="str"||t==="string"?"Text":t==="int"||t==="integer"?"Whole number":t==="float"||t==="decimal"?"Decimal number":t==="bool"||t==="boolean"?"True / False":t==="datetime"||t==="date"?"Date / time":e}function Ls(e){let t=String(e||"").replace(/\[\]/g,"");return t?t.startsWith("data.")?t.slice(5):t:""}function gr(e=[]){return e.some(t=>{let n=String(t?.name||t||"").trim();if(!n)return!1;let i=n.toLowerCase(),r=String(t?.annotation||t?.type||"").toLowerCase();return r==="datetime"||r==="date"?!0:i.includes("time")||i.includes("date")||i.includes("timestamp")||i.includes("created_at")||i.includes("updated_at")||i.includes("period")})}function _e(e=[],t,n=[],i=null){let r=new Set(t.dimension_fields||[]),o=new Set(t.kpi_fields||[]),l=t.time_field||null,c=!!l||t.time_required!==!1&&gr(e),d=t.time_granularity||"minute",u=s.poMode!==!1,$=!t.confirmed,A=r.size===0&&o.size===0&&!l,N=i?.response_model_present===!1,H=N?null:ot(e||[]),j=new Map;n&&n.forEach(b=>{b.calculation&&b.calculation.field&&j.set(b.calculation.field,b.name)});let k=[...r],M=[...o],v=`
    <div style="margin-bottom:20px; padding:12px; background:rgba(255,255,255,0.02); border-radius:10px; font-size:11px; color:var(--ink-soft); display:flex; gap:20px; border:1px solid var(--line); flex-wrap:wrap;">
      <div style="display:flex; align-items:center; gap:6px;"><div style="width:8px; height:8px; border-radius:2px; background:var(--purple-neon);"></div> <strong>Segments</strong>: How results are grouped (example: region, retailer)</div>
      <div style="display:flex; align-items:center; gap:6px;"><div style="width:8px; height:8px; border-radius:2px; background:var(--green-neon);"></div> <strong>Metrics</strong>: Numbers to monitor</div>
      <div style="display:flex; align-items:center; gap:6px;"><div style="width:8px; height:8px; border-radius:2px; background:var(--brand);"></div> <strong>Time</strong>: Transaction timestamp</div>
    </div>
  `,C=N?`
      <div class="feedback danger" style="margin-bottom:14px;">
        <strong>Pydantic response model required</strong>
        <div class="tiny" style="margin-top:6px;">Define <code>response_model</code> on this FastAPI route first. Jin uses the model to discover fields and time candidates before setup can be saved.</div>
      </div>
    `:"",R=!!H?.ready,T=!!(H&&H.candidateCount>0),E=new Map,x=(b,B)=>{let W=String(b||"").trim();!W||E.has(W)||E.set(W,B)};H&&(x(H.timeCandidates?.[0],"time"),x(H.segmentCandidates?.[0],"dimension"),x(H.metricCandidates?.[0],"kpi"));let y=N?"":R?`
      <div class="feedback success" style="margin-bottom:14px;">
        <strong>Model first</strong>
        <div class="tiny" style="margin-top:6px;">Jin can pre-fill Segment, Metric, and Time from the Pydantic response model before any traffic arrives.</div>
      </div>
    `:`
      <div class="feedback warning" style="margin-bottom:14px;">
        <strong>${S(H?.summary||"Response model needs clearer fields")}</strong>
        <div class="tiny" style="margin-top:6px;">${S(H?.detail||"Add typed Segment, Metric, or Time candidates to make setup automatic.")}</div>
      </div>
    `,P=N?"":A?`
      <div class="row-card" style="margin-bottom:14px;">
        <strong>Quick start</strong>
        <div class="tiny" style="margin-top:6px;">
          Pick at least one <strong>Segment</strong> and one <strong>Metric</strong>${c?", plus one <strong>Time</strong> field":""}.
          Advanced settings are optional for now.
        </div>
      </div>
    `:"",_="";s.driftSuggestions&&Object.keys(s.driftSuggestions).length>0&&(_=`
      <div class="drift-alert" style="margin-bottom:20px; padding:16px; background:rgba(var(--brand-rgb), 0.1); border:1px solid var(--brand); border-radius:12px; animation: slideDown 0.3s ease;">
         <div style="display:flex; align-items:center; gap:12px;">
            <div style="font-size:24px;">\u{1F9EC}</div>
            <div style="flex:1;">
               <div style="font-weight:700; color:var(--ink);">Self-Healing Detected</div>
               <div class="tiny muted">It looks like some fields were renamed. Jin identified these by their data shape.</div>
            </div>
         </div>
         <div style="margin-top:12px; display:flex; flex-direction:column; gap:8px;">
            ${Object.entries(s.driftSuggestions).map(([b,B])=>`
               <div style="display:flex; align-items:center; gap:10px; background:rgba(255,255,255,0.05); padding:8px 12px; border-radius:8px; border:1px solid var(--line);">
                  <strong style="color:var(--ink-soft);">${B}</strong>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  <strong style="color:var(--brand);">${b}</strong>
                  <button class="btn btn-xs btn-primary" style="margin-left:auto;" onclick="approveDriftMerge('${b}', '${B}')" ${u?'disabled title="Turn off PO Mode to merge manually."':""}>Approve & Merge</button>
               </div>
            `).join("")}
         </div>
      </div>
    `);let V=String(s.selectedApi||""),f=!!s.configFocusExpandedByApi?.[V],m=(b,B,W)=>{if(W)return!0;let q=String(b||"").toLowerCase(),ee=String(B||"").toLowerCase();return ee==="date"||ee==="datetime"||ee==="int"||ee==="float"||ee==="decimal"?!0:/(retailer|merchant|store|region|country|channel|category|segment|sku|product|item|label|group|period|date|time|timestamp|value|amount|revenue|sales|orders|units|count|qty|quantity|cost|rate|ratio|score)/.test(q)},g=(e||[]).map(b=>{let B=typeof b=="string"?b:String(b.name||"");if(!B)return null;let W=Ls(B),q=W!==B,ee=typeof b=="string"?"":b.annotation||b.type||"",z=mr(ee),te=typeof b=="string"?!1:!!(b.time_candidate||String(b.suggested_role||"").toLowerCase()==="time"),Se=E.get(B)||null,ye=(t.excluded_fields?.includes(B)?"exclude":null)||(r.has(B)?"dimension":null)||(o.has(B)?"kpi":null)||(B===l?"time":null)||(te?"time":null)||Se||"ignore",J=typeof b=="string"?!1:!!b.suggested;return{name:B,shownName:W,hasTechnicalPath:q,rawType:ee,type:z,role:ye,suggested:J,timeCandidate:te,likely:m(B,ee,J)}}).filter(b=>!!b),I=(A||$)&&g.length>8&&!f,F=I?g.filter(b=>b.role!=="ignore"||b.likely):g,L=F.length?F:g,O=Math.max(0,g.length-L.length),U=I?`
      <div class="row-card" style="margin-bottom:12px;">
        <strong>Focused view</strong>
        <div class="tiny" style="margin-top:6px;">
          Showing ${p(L.length)} likely business fields first to reduce setup noise.
          ${O>0?`${p(O)} technical/system fields are hidden for now.`:""}
        </div>
        <div class="toolbar" style="margin-top:10px;">
          <button class="action secondary" type="button" onclick="toggleConfigFieldFocus(true)">Show all fields</button>
        </div>
      </div>
    `:(A||$)&&g.length>8&&f?`
          <div class="tiny muted" style="margin-bottom:10px;">
            Showing all ${p(g.length)} fields.
            <button class="action ghost" type="button" style="margin-left:8px;" onclick="toggleConfigFieldFocus(false)">Use focused view</button>
          </div>
        `:"",D=u?`
      <div class="tiny muted" style="margin-bottom:10px;">
        PO Mode keeps advanced sections simplified for first-time setup, but field-role and time setup controls remain editable.
      </div>
    `:"",le=new Map,Y=(b,B,W)=>{let q=String(b||"").trim();if(!q)return;let ee=le.get(q)||[];ee.some(z=>z.role===W)||(ee.push({label:B,role:W}),le.set(q,ee))};Y(H?.segmentCandidates?.[0],"Best Segment","segment"),Y(H?.metricCandidates?.[0],"Best Metric","metric"),Y(H?.timeCandidates?.[0],"Best Time","time");let pe=L.map(b=>{let{name:B,shownName:W,hasTechnicalPath:q,type:ee,role:z}=b,te=t.time_extraction_rule||"single",Se=le.get(B)||[],ye=Se.length?` best-candidate ${Se.map(ie=>`best-${ie.role}`).join(" ")}`:"",J=String(z==="time"?s.timePreview||`Model-selected time field: ${W||B}`:s.timePreview||"No timeline preview yet"),ae=/no sample run yet|no recent sample yet|choose a time field|choose your business time field|no sample value found/i.test(J);return`
      <div class="field-role-card ${z==="time"?"active-time":z==="dimension"?"active-dimension":z==="kpi"?"active-kpi":z==="exclude"?"active-exclude":""}${ye}" data-field-name="${B}">
        <div class="field-info">
          <div class="field-name">
            ${S(W||B)}
            ${Se.map(ie=>`<span class="chip field-candidate-chip field-candidate-chip--${ie.role}">${ie.label}</span>`).join("")}
            ${j.has(B)?`<span class="chip" style="margin-left:8px; background:rgba(34, 197, 94, 0.1); color:var(--green-neon); border-color:var(--green-neon);">${j.get(B)} Metric</span>`:""}
          </div>
          ${q?`<div class="tiny muted" style="margin-top:3px;">${S(B)}</div>`:""}
          <div class="field-caption">${ee||"data field"}</div>
        </div>
        <div class="field-role-selector">
          <button class="role-btn ${z==="ignore"?"active":""}" data-role="ignore" onclick="updateFieldRole('${B}', 'ignore')" title="Do not track this field.">
            Ignore
          </button>
          <button class="role-btn ${z==="time"?"active":""}" data-role="time" onclick="updateFieldRole('${B}', 'time')" title="The timestamp of the transaction.">
            Time
          </button>
          <button class="role-btn ${z==="dimension"?"active":""}" data-role="dimension" onclick="updateFieldRole('${B}', 'dimension')" title="Group results (e.g. by Region or Product).">
            Segment
          </button>
          <button class="role-btn ${z==="kpi"?"active":""}" data-role="kpi" onclick="updateFieldRole('${B}', 'kpi')" title="The value to monitor for anomalies.">
            Metric
          </button>
          <button class="role-btn ${z==="exclude"?"active":""}" data-role="exclude" onclick="updateFieldRole('${B}', 'exclude')" title="Comparison or secondary data. Ignore for monitoring.">
            Exclude
          </button>
        </div>
        ${z==="time"?`
          <div class="time-extraction-container">
             <div class="time-verify-preview ${J&&!ae?"verified":""}" style="margin-top:0;">
                <span>Chronology Pulse:</span>
                <strong id="time-preview-val">${S(J)}</strong>
                <a href="#" class="tweak-link" onclick="toggleTimeSettings('${B}', event)" style="margin-left:auto; font-size:11px; color:var(--brand); text-decoration:none;">${s.showTimeSettings?.[B]?"Hide settings":"Tweak settings"}</a>
             </div>
             ${ae?'<div class="tiny muted" style="margin-top:6px;">Setup is not blocked. Save config now and run one check to unlock timeline preview.</div>':""}

             ${s.detectedTimeSources&&s.detectedTimeSources.length>1&&!t?.time_pin?`
                <div class="source-picker" style="margin-top:8px; padding:10px; background:rgba(255,165,0,0.05); border:1px dashed orange; border-radius:8px;">
                   <div class="tiny" style="color:orange; font-weight:700; margin-bottom:6px;">Multiple Time Fields Found:</div>
                   <div style="display:flex; flex-wrap:wrap; gap:6px;">
                      ${s.detectedTimeSources.map(ie=>`
                         <button class="btn btn-xs ${B===ie?"btn-primary":"btn-outline"}" onclick="selectTimeSource('${ie}')" style="font-size:10px; border-radius:12px;">
                            ${S(Ls(ie))}
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
                   ${s.detectedGrain||d}
                </div>
                <div style="font-size:11px; color:var(--ink-soft); line-height:1.2;">
                   <strong>Pulse Engine:</strong> ${s.grainReason||"Run one check to infer monitoring frequency."}
                </div>
                
                <button class="tweak-link" onclick="pinGrain()" style="margin-left:auto; border:none; background:none; cursor:pointer;" title="${t?.time_pin?"Unlock (Enable Learning)":"Pin Frequency (Lock current grain)"}">
                   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${t?.time_pin?"var(--green-neon)":"currentColor"}" stroke-width="2"><path d="${t?.time_pin?"M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z":"M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"}"/></svg>
                </button>
             </div>

             ${s.showTimeSettings?.[B]?`
               <div class="time-settings-tweak" style="margin-top:16px; padding:12px; background:rgba(255,255,255,0.02); border-radius:8px; border:1px solid var(--line); animation: fadeIn 0.2s ease;">
                  <div style="display:grid; grid-template-columns: 1fr 1fr; gap:16px;">
                     <div>
                        <div class="tiny muted" style="margin-bottom:6px; font-weight:600; color:var(--ink);">Data Frequency:</div>
                        <select class="control" onchange="updateGranularity(this.value)" style="width:100%; height:32px; padding:0 8px; font-size:12px;">
                           <option value="minute" ${d==="minute"?"selected":""}>Every minute</option>
                           <option value="hour" ${d==="hour"?"selected":""}>Hourly</option>
                           <option value="day" ${d==="day"?"selected":""}>Daily</option>
                           <option value="week" ${d==="week"?"selected":""}>Weekly</option>
                           <option value="month" ${d==="month"?"selected":""}>Monthly</option>
                        </select>
                     </div>
                     <div>
                        <div class="tiny muted" style="margin-bottom:6px; font-weight:600; color:var(--ink);">Date Pick-up:</div>
                        <select class="control" onchange="updateExtractionRule(this.value)" style="width:100%; height:32px; padding:0 8px; font-size:12px;">
                           <option value="single" ${te==="single"?"selected":""}>Single date in row</option>
                           <option value="first" ${te==="first"?"selected":""}>First date from array</option>
                           <option value="last" ${te==="last"?"selected":""}>Last date from array</option>
                           <option value="range" ${te==="range"?"selected":""}>Two dates (Range)</option>
                        </select>
                     </div>
                  </div>
               </div>
             `:""}
          </div>
        `:""}
      </div>
    `}).join(""),Ae=s.status?.project?.license_enforced!==!1&&s.status?.project?.is_unlicensed?`
    <div class="feedback info" style="margin-top:12px;">
      License is not activated for this project yet, but setup stays editable in this build.
      Activate Business later only if you want multi-project enforcement.
      </div>
    `:"";a.fieldRoleGrid.innerHTML=`
    <div style="position:relative">
      ${C}
      ${y}
      ${P}
      ${D}
      ${U}
      ${v}
      ${pe}
      ${Ae}
    </div>
  `;let K=k.length?`for every unique <strong>${k.join(", ")}</strong>`:"across your entire dataset",se=M.length?`monitor <strong>${M.join(" and ")}</strong>`:"track any numbers yet",be=document.getElementById("config-step-3-container");if(be){let b=M.length>0||k.length>0||l,B=String(s.selectedApi||""),W=s.autoSuggestSummaryByApi||{},q=B?W[B]:null,ee=Es(s.activeApiDetail),z=i.response_model_present===!1,te=z?null:ot(i.fields||i.schema_contract?.fields||[]),Se=!!te?.ready,ye=!!(te&&te.candidateCount>0),J=z?"No response_model detected. Jin can infer Segment, Metric, and Time from runtime traffic or a pasted sample payload.":q?`${q.headline} ${q.details}`:Se?"Jin can pre-fill Segment, Metric, and Time from the Pydantic response model even before traffic arrives.":ee?`Use auto-suggest to pre-fill setup from recent API traffic or Pydantic examples. ${te?.detail||""}`:`${te?.summary||"The response model is present, but Jin needs clearer typed fields or examples to pre-fill setup."} ${te?.detail||""}`.trim();be.innerHTML=`
      <div class="config-story-card ${b?"active":""}" style="margin-top:24px; border-top:1px solid var(--line); padding-top:24px;">
        <div class="story-header" style="display:flex; align-items:center; gap:12px; margin-bottom:12px;">
          <div class="config-step-badge">3</div>
          <h4 style="margin:0;">Confirm your monitoring plan</h4>
        </div>
        <div class="config-story-text" style="font-size:15px; line-height:1.5;">
          Jin will ${se} ${K}${l?` using <strong>${l}</strong> as the clock.`:"."}
        </div>
        <div class="tiny muted" style="margin-top:12px;">
          ${M.length&&k.length?"This is a great setup! You'll see trends broken down by detailed segments.":"Tip: Select at least one group and one measurable number for the best results."}
        </div>
        <div class="toolbar" style="margin-top:20px; justify-content:center;">
          <button class="action" id="save-config-story-button" type="button" onclick="saveConfig()">
            Save configuration and continue to references
          </button>
        </div>
          <div class="row-card" style="margin-top:14px; text-align:left;">
            <strong>Need help picking fields?</strong>
            <div class="tiny muted" id="auto-suggest-summary" style="margin-top:8px;">
              ${S(J)}
            </div>
            <div class="toolbar" style="margin-top:10px;">
            <button class="action secondary" id="auto-suggest-button" type="button" onclick="runMagicGuess(true)" ${!z&&(ee||ye)?"":"disabled"}>
              ${b?"Re-run auto-suggest":"Auto-suggest setup"}
            </button>
          </div>
        </div>
      </div>
    `}let qe=t.tolerance_normal??t.tolerance_pct??10;a.configToleranceSimple.value=String(qe),a.configActiveTolerance.value=t.active_tolerance||"normal",a.configRelaxed.value=String(t.tolerance_relaxed??20),a.configNormal.value=String(t.tolerance_normal??t.tolerance_pct??10),a.configStrict.value=String(t.tolerance_strict??5)}function de(e){let t=document.getElementById("view-api");t&&(t.classList.remove("api-browser-only"),t.classList.add("api-browser-detail-open")),a.apiEmpty.style.display="none",a.apiWorkspace.style.display="grid",a.apiWorkspace.classList.remove("api-workspace-entering"),a.apiWorkspace.offsetWidth,a.apiWorkspace.classList.add("api-workspace-entering"),a.apiTitle.textContent=e.endpoint_path,a.apiSubtitle.textContent="Review health, targets, checks, and issues.",a.apiMethod.textContent=e.http_method||"GET",a.apiPath.textContent=e.endpoint_path;let n=`/jin/template/${he(e.endpoint_path)}`;a.templateCsvLink.href=`${n}.csv`,a.templateXlsxLink.href=`${n}.xlsx`,a.templateCsvLinkUpload.href=`${n}.csv`,a.templateXlsxLinkUpload.href=`${n}.xlsx`,a.poModeToggle.checked=s.poMode!==!1;let i=document.getElementById("advanced-section");i&&(s.poMode!==!1?(i.open=!1,i.style.display="none"):i.style.display="");let r=e.operator_metadata||{},o=[...e.monitoring_runs||[]].sort((b,B)=>String(B?.started_at||"").localeCompare(String(b?.started_at||""))),l=(e.current_kpis||[]).length>0,c=(e.trend_summary||[]).length>0||(e.recent_history||[]).length>0,d=(e.anomaly_history||[]).length>0,u=(e.upload_activity||[]).length>0,$=o.length>0||(e.recent_history||[]).length>0,A=(e.anomaly_history||[]).filter(b=>String(b?.status||"active")!=="resolved").length,N=String(s.selectedUploadAnalysisAt||""),H=e.upload_analysis_history||[],k=N&&H.find(b=>String(b?.analyzed_at||"")===N)||null||e.last_upload_analysis||null,M=(e.references||[]).length>0,v=e.operator_metadata?.confirmed,C=o.length>0||(e.recent_history||[]).length>0,R=(e.upload_activity||[]).length>0,T=1;v&&!R&&(T=2),v&&R&&(T=3);let E=a.apiWorkspace.querySelector(".setup-wizard");E||(E=document.createElement("div"),E.className="setup-wizard",a.apiWorkspace.prepend(E)),E.innerHTML=`
      <div class="wizard-step ${T===1?"active":""}" data-api-tab="configuration" data-wizard-step="configuration" onclick="switchApiTab('configuration')">
        <div class="wizard-step-icon">1</div>
        <div class="wizard-step-label">Identify segments & metrics</div>
      </div>
      <div class="wizard-step-connector"></div>
      <div class="wizard-step ${T===2?"active":""}" data-api-tab="uploads" data-wizard-step="uploads" onclick="switchApiTab('uploads')">
        <div class="wizard-step-icon">2</div>
        <div class="wizard-step-label">Upload targets</div>
      </div>
      <div class="wizard-step-connector"></div>
      <div class="wizard-step ${T===3?"active":""}" data-api-tab="history" data-wizard-step="history" onclick="switchApiTab('history')">
        <div class="wizard-step-icon">3</div>
        <div class="wizard-step-label">Monitor</div>
      </div>
  `;let x=(s.status?.endpoints||[]).find(b=>b.endpoint_path===e.endpoint_path),y=e.response_model_present===!1,P=y?{label:"Define response model",tone:"danger",hint:"Add response_model on this FastAPI route first. Jin uses it to discover fields and time candidates."}:st({endpoint_path:e.endpoint_path,http_method:e.http_method||"GET",status:x?.status||"warning",dimension_fields:x?.dimension_fields||e.config?.dimension_fields||[],kpi_fields:x?.kpi_fields||e.config?.kpi_fields||[],time_field:x?.time_field||e.config?.time_field||null,time_required:x?.time_required??e.config?.time_required,confirmed:e.operator_metadata?.confirmed??x?.confirmed??!1,last_upload_at:r.last_upload_at||x?.last_upload_at||null});a.apiMetaGrid.innerHTML=[["Status",`
      <strong>${S((s.status?.endpoints||[]).find(b=>b.endpoint_path===e.endpoint_path)?.status||"healthy")}</strong>
      <div class="tiny muted" style="margin-top:4px;">Last check ${ne(r.last_observed_at)}</div>
    `],["Setup",`
      <strong>${S(P.label)}</strong>
      <div class="tiny muted" style="margin-top:4px;">${S(P.hint)}</div>
    `],["Activity",`
      <strong>${p(r.observation_count)} checks</strong>
      <div class="tiny muted" style="margin-top:4px;">Last upload ${ne(r.last_upload_at)}</div>
    `],["Issues",A>0?`<span class="status-pill warning">${p(A)} open</span><div class="tiny muted" style="margin-top:4px;">Review Issues</div>`:'<span class="status-pill healthy">Safe for now</span><div class="tiny muted" style="margin-top:4px;">No open issues</div>']].map(([b,B])=>`
        <div class="meta-card meta-card-compact">
          <strong>${b}</strong>
          <span>${B}</span>
        </div>
      `).join("");let _=(s.coreInsightsByApi||{})[e.endpoint_path];if(_){let b=_.kind==="error"?"danger":_.kind==="success"?"success":"info",B="";_.actionType==="tab"&&_.actionValue?B=`<button class="action" type="button" onclick="switchApiTab('${S(_.actionValue)}')">${S(_.actionLabel||"Open next step")}</button>`:_.actionType==="view"&&_.actionValue&&(B=`<button class="action" type="button" data-view="${S(_.actionValue)}">${S(_.actionLabel||"Open next step")}</button>`),a.apiCoreInsight.style.display="block",a.apiCoreInsight.innerHTML=`
      <div class="feedback ${b}">
        <strong>${S(_.title||"Insight")}</strong>
        <div class="tiny" style="margin-top:6px;">${S(_.summary||"")}</div>
        ${B?`<div class="toolbar" style="margin-top:10px;">${B}</div>`:""}
      </div>
    `}else a.apiCoreInsight.style.display="none",a.apiCoreInsight.innerHTML="";let V=e.current_kpis||[];a.apiKpis.innerHTML=V.length?V.map(b=>`
        <div class="kpi-card">
          <strong>${ft(b.kpi_field)}</strong>
          <span>${p(b.actual_value)}</span>
          <div class="delta">${b.expected_value==null?"No targets yet. Upload a reference to compare.":`Target ${p(b.expected_value)}${b.pct_change==null?"":` \u2022 ${p(b.pct_change)}% vs target`}`}</div>
        </div>
      `).join(""):`
        <div class="empty empty-starter">
          ${c?M?"Recent API values are available below. Expand Monitor runs to see segment-level comparisons.":"Recent API values are available below, but no targets are linked yet. Upload a reference file to enable pass/fail checks.":"No values yet. Upload a reference file and run a check to get started."}
        </div>
      `;let f=e.trend_summary||[],m=e.recent_history||[];a.apiTrends.innerHTML=f.length?f.map(b=>{let B=m.map(q=>q?.kpi_json?.[b.kpi_field]).filter(q=>typeof q=="number"),W=B.length?B.reduce((q,ee)=>q+ee,0)/B.length:null;return`
          <div class="trend-card">
            <strong>${ft(b.kpi_field)}</strong>
            <span>${p(b.latest)}</span>
            <div class="tiny">Typical range: ${p(b.min)} to ${p(b.max)} across ${b.samples} run(s).</div>
            <div class="tiny" style="margin-top:6px;">Average: ${p(W)} \u2022 Change vs first visible run: ${p(b.delta_pct)}%.</div>
            ${ks(B)}
          </div>
        `}).join(""):ke("No trends yet."),a.apiTrends.innerHTML+=`
        <div class="chart-card">
          <strong>Checks Trend</strong>
          <div class="chart-value">${m.length} recent runs</div>
          <div class="tiny">How values are moving over time.</div>
          ${As(e)||'<div class="empty" style="margin-top:10px;">No history yet.</div>'}
        </div>
        <div class="chart-card">
          <strong>Uploads</strong>
          <div class="chart-value">${(e.upload_activity||[]).length} reference events</div>
          <div class="tiny">Latest upload: ${ne((e.upload_activity||[])[0]?.uploaded_at)}</div>
          <div class="tiny" style="margin-top:8px;">Use the Uploads tab to add or replace target files.</div>
          <div class="toolbar" style="margin-top:10px;">
            <button class="action secondary tiny" type="button" onclick="openUploadsTab()">Open Uploads</button>
          </div>
        </div>
      `;let g=document.getElementById("api-start-panel");if(g){let b=!!v,B=b&&!!R,W=B&&!!$,q=W&&A===0,ee=s.currentApiTab==="summary";g.style.display=ee?"block":"none";let z=(Se,ye)=>Se?'<span class="status-pill healthy">Done</span>':ye?'<span class="status-pill warning">Now</span>':'<span class="status-pill acknowledged">Next</span>',te=b?B?W?A>0?{title:"Step 4: Review issues",copy:"Some checks are outside target. Review and resolve what changed.",cta:"Review Issues",action:"setView('incidents')"}:{title:"Step 5: Generate report",copy:"Monitoring is stable. Generate a leadership-ready update.",cta:"Open Reports",action:"setView('reports')"}:{title:"Step 3: Monitor",copy:"Run checks and see pass/fail status for each segment.",cta:"Open Monitor",action:"switchApiTab('history')"}:{title:"Step 2: Upload targets",copy:"Upload a reference file so checks have a clear target.",cta:"Open Uploads",action:"switchApiTab('uploads')"}:{title:"Step 1: Identify segments & metrics",copy:"Define which fields are segments and which are monitored metrics.",cta:"Open Configure",action:"switchApiTab('configuration')"};g.innerHTML=`
          <div class="panel-head">
            <div>
              <h3>What to do next</h3>
              <p>Follow this exact flow for <strong>${e.endpoint_path}</strong>.</p>
            </div>
          </div>
          <div class="starter-next-action">
            <div>
              <strong>${te.title}</strong>
              <p>${te.copy}</p>
            </div>
            <button class="action" type="button" onclick="${te.action}">${te.cta}</button>
          </div>
          <div class="starter-grid">
            <div class="starter-step ${b?"":"active-step"}">
              <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:8px;">
                <div style="display:flex; align-items:center; gap:8px;">
                  <div class="wizard-step-icon" style="width:20px; height:20px; font-size:10px;">1</div>
                  <strong>Identify segments & metrics</strong>
                </div>
                ${z(b,!b)}
              </div>
              <p>Configure fields once so Jin understands your business shape.</p>
              <button class="action secondary tiny" style="margin-top:10px;" onclick="switchApiTab('configuration')">Open Configure</button>
            </div>
            <div class="starter-step ${b&&!B?"active-step":""}">
              <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:8px;">
                <div style="display:flex; align-items:center; gap:8px;">
                  <div class="wizard-step-icon" style="width:20px; height:20px; font-size:10px;">2</div>
                  <strong>Upload targets</strong>
                </div>
                ${z(B,b&&!B)}
              </div>
              <p>Upload CSV/XLSX so each segment has expected target values.</p>
              <button class="action secondary tiny" style="margin-top:10px;" onclick="switchApiTab('uploads')">Open Uploads</button>
            </div>
            <div class="starter-step ${B&&!W?"active-step":""}">
              <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:8px;">
                <div style="display:flex; align-items:center; gap:8px;">
                  <div class="wizard-step-icon" style="width:20px; height:20px; font-size:10px;">3</div>
                  <strong>Monitor checks</strong>
                </div>
                ${z(W,B&&!W)}
              </div>
              <p>Open Monitor to run checks and view segment-level outcomes.</p>
              <button class="action secondary tiny" style="margin-top:10px;" onclick="switchApiTab('history')">Open Monitor</button>
            </div>
            <div class="starter-step ${W&&A>0?"active-step":""}">
              <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:8px;">
                <div style="display:flex; align-items:center; gap:8px;">
                  <div class="wizard-step-icon" style="width:20px; height:20px; font-size:10px;">4</div>
                  <strong>Review issues</strong>
                </div>
                ${z(W&&A===0,W&&A>0)}
              </div>
              <p>Review issues and decide if the API changed or the uploaded targets need an update.</p>
              <button class="action secondary tiny" style="margin-top:10px;" onclick="setView('incidents')">Review Issues</button>
            </div>
            <div class="starter-step ${q?"active-step":""}">
              <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:8px;">
                <div style="display:flex; align-items:center; gap:8px;">
                  <div class="wizard-step-icon" style="width:20px; height:20px; font-size:10px;">5</div>
                  <strong>Generate report</strong>
                </div>
                ${z(q,q)}
              </div>
              <p>Create a PO-ready report with health, drift, and next actions.</p>
              <button class="action secondary tiny" style="margin-top:10px;" onclick="setView('reports')">Open Reports</button>
            </div>
          </div>
        `}let I=s.currentApiTab;a.configFooter&&(a.configFooter.style.display=I==="configuration"&&v?"flex":"none"),a.uploadsFooter&&(a.uploadsFooter.style.display=I==="uploads"?"flex":"none"),a.summaryFooter&&(a.summaryFooter.style.display=I==="summary"?"flex":"none");let F=a.apiKpis.closest(".panel"),L=a.apiIncidentHistory.closest(".panel"),O=a.apiRunTable.closest(".panel");F&&(F.style.display=l||c||T===3?"block":"none"),L&&(L.style.display=d||T===3?"block":"none"),O&&(O.style.display=$||T===3?"block":"none");let U=document.getElementById("api-monitoring-progress");if(U){let b=U.dataset.endpoint,B=U.dataset.source;k?(U.dataset.endpoint=e.endpoint_path,U.dataset.source="upload-analysis",U.innerHTML=ur(k,e),U.style.display="block"):!$&&T===3?(U.dataset.endpoint=e.endpoint_path,U.dataset.source="empty-analysis",U.innerHTML=ke("Upload targets and run analysis to see per-segment results here."),U.style.display="block"):(b!==e.endpoint_path||B==="upload-analysis"||B==="empty-analysis")&&(U.dataset.endpoint=e.endpoint_path,U.dataset.source="",U.innerHTML="",U.style.display="none")}let D=e.anomaly_history||[],le=b=>{let B=Number(b?.actual_value),W=Number(b?.baseline_used);if(Number.isFinite(B)&&Number.isFinite(W)&&W!==0){let q=(B-W)/Math.abs(W)*100,ee=q>=0?"higher":"lower";return`API returned ${p(B)}; target is ${p(W)} (${Math.abs(q).toFixed(1)}% ${ee}).`}return Number.isFinite(B)?`API returned ${p(B)}. Target is not available for comparison.`:b.why_flagged||b.ai_explanation||"No details yet."};if(a.apiIncidentHistory.innerHTML=D.length?D.slice(0,10).map(b=>{let B=St(b),W=b.status||b.severity||"active",q=b.change_since_last_healthy_run||"No earlier comparison details.";return`
        <div class="history-item api-issue-card api-issue-card-${B}">
          <div class="api-issue-card-head">
            <div class="api-issue-card-head-copy">
              <strong>${ft(b.kpi_field)}</strong>
              <div class="tiny muted api-issue-card-subline">${S(q)}</div>
            </div>
            <span class="status-pill ${B}">${S(W)}</span>
          </div>
          <div class="api-issue-card-summary">${S(le(b))}</div>
          <div class="api-issue-card-meta tiny muted">
            Detected ${ne(b.detected_at)} \u2022 Target ${b.baseline_used==null?"not set":p(b.baseline_used)}
          </div>
          <div class="toolbar compact api-issue-card-actions">
            <button class="action ghost" type="button" onclick="showIncident(${b.id})">Open issue</button>
          </div>
        </div>
      `}).join(""):ke("No issues for this API yet."),o.length){let b=ct(o,s.runPage,8);s.runPage=b.page;let B=o.filter(z=>String(z?.trigger||"").toLowerCase()==="manual").length,W=o.filter(z=>String(z?.trigger||"").toLowerCase()==="scheduler").length,q=Number(k?.mismatch_runs||0),ee=o.filter(z=>{let te=String(z?.status||"").toLowerCase();return te==="error"||te==="failed"}).length;a.apiRunTable.innerHTML=`
        ${q>0?`
          <div class="tiny muted" style="margin-bottom:8px;">
            Upload analysis found ${p(q)} mismatch segment(s). "PASSED" below refers to live check runs only.
          </div>
        `:""}
        <div class="table-toolbar">
          <div class="tiny">Run history (${p(o.length)} total)</div>
          <div class="tiny">Manual: ${p(B)} \u2022 Scheduled: ${p(W)} \u2022 Failed: ${p(ee)}</div>
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
            ${b.items.map(z=>{let te=Number(z?.anomalies_detected||0),Se=Math.max(te,q),ye=or(String(z?.status||"unknown"),Se),J=Number(z?.grains_processed||0);return`
                <tr>
                  <td>
                    <div>${ne(z?.started_at)}</div>
                    <div class="tiny muted">Finished: ${ne(z?.finished_at)}</div>
                  </td>
                  <td>
                    <div>${S(ar(z?.trigger,z?.source))}</div>
                    <div class="tiny muted">${S(String(z?.source||"watch"))}</div>
                  </td>
                  <td>
                    <span class="status-pill ${ye.pillClass}" title="${S(ye.tooltip)}">${S(ye.label)}</span>
                    <div class="tiny muted" style="margin-top:6px;">Duration: ${S(rr(z?.duration_ms))}</div>
                  </td>
                  <td>
                    <div>${p(J)} segment(s)</div>
                    <div class="tiny ${Se>0?"":"muted"}">${p(Se)} mismatch(es)</div>
                  </td>
                  <td>
                    <div class="tiny">Run ID: <code>${S(String(z?.run_id||"unknown"))}</code></div>
                    <div class="tiny">${z?.error?S(String(z.error)):"No error recorded."}</div>
                  </td>
                  <td>
                    <div class="toolbar compact">
                      ${te>0?`<button class="action secondary tiny" type="button" onclick="setView('incidents')">Review Issues</button>`:q>0?`<button class="action ghost tiny" type="button" onclick="switchApiTab('history')">Upload Findings</button>`:`<button class="action ghost tiny" type="button" onclick="switchApiTab('summary')">View KPIs</button>`}
                      ${z?.error?`<button class="action ghost tiny" type="button" onclick="setView('errors')">Open Errors</button>`:""}
                    </div>
                  </td>
                </tr>
              `}).join("")}
          </tbody>
        </table></div>
        ${dt("runs",b.page,b.totalPages)}
      `}else{let b=(e.history&&e.history.length?e.history:e.recent_history)||[],B=J=>{if((Array.isArray(J?.comparisons)?J.comparisons.filter(me=>me?.kpi_field):[]).length)return!0;let ie={};if(J?.kpi_json&&typeof J.kpi_json=="string")try{let me=JSON.parse(J.kpi_json);me&&typeof me=="object"&&(ie=me)}catch{ie={}}else J?.kpi_json&&typeof J.kpi_json=="object"&&(ie=J.kpi_json);let je=me=>{if(me==null)return!1;if(typeof me=="number")return Number.isFinite(me);if(typeof me=="string"){let Je=me.trim();return Je.length>0&&Number.isFinite(Number(Je))}return Array.isArray(me)?me.some(Je=>je(Je)):typeof me=="object"?Object.values(me).some(Je=>je(Je)):!1};return je(ie)},W=new Map;b.forEach(J=>{let ae=J.observed_at;ae&&(W.has(ae)||W.set(ae,[]),W.get(ae).push(J))});let q=new Set,ee=new Set;(e.references||[]).forEach(J=>{let ae=String(J?.grain_key||"").trim();if(!ae)return;let ie=Ke(ae),je=String(J?.kpi_field||"").trim(),me=Rt(je);q.add(ae),q.add(ie),je&&ee.add(`${ie}__${je}`),me&&ee.add(`${ie}__${me}`)});let z=J=>{let ae=Array.isArray(J?.comparisons)?J.comparisons.filter(me=>me?.kpi_field):[];if(ae.length){let me=Ke(String(J?.grain_key||"").trim());return ae.every(Je=>{let es=String(Je?.kpi_field||"").trim(),ji=Rt(es);return!ee.has(`${me}__${es}`)&&!ee.has(`${me}__${ji}`)})}if(!B(J))return!1;let ie=String(J?.grain_key||"").trim();if(!ie)return!0;let je=Ke(ie);return!q.has(ie)&&!q.has(je)},te=Array.from(W.entries()).map(([J,ae])=>({observed_at:J,obs_count:ae.length,status:ae.some(ie=>(e.anomaly_history||[]).some(je=>je.detected_at===J&&Ke(String(je.grain_key||""))===Ke(String(ie.grain_key||""))))?"anomaly":ae.some(ie=>B(ie))?ae.every(ie=>z(ie))?"no_baseline":"healthy":"no_data"})).sort((J,ae)=>ae.observed_at.localeCompare(J.observed_at)),Se=J=>J==="anomaly"?{pillClass:"danger",label:"Needs attention",tooltip:"At least one metric moved outside your allowed tolerance."}:J==="no_data"?{pillClass:"warning",label:"No comparable values",tooltip:"A run happened, but no comparable numeric values were captured."}:J==="no_baseline"?{pillClass:"acknowledged",label:"Needs targets",tooltip:"Values were captured, but this segment does not have uploaded targets yet."}:{pillClass:"healthy",label:"Within target",tooltip:"All compared metrics stayed within tolerance."},ye=ct(te,s.runPage,8);s.runPage=ye.page,a.apiRunTable.innerHTML=te.length?`
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
              ${ye.items.map(J=>{let ae=Se(J.status);return`
                <tr>
                  <td>${ne(J.observed_at)}</td>
                  <td>${J.obs_count} segments checked</td>
                  <td><span class="status-pill ${ae.pillClass}" title="${S(ae.tooltip)}">${S(ae.label)}</span></td>
                  <td>
                    ${J.status==="no_baseline"?'<button class="action secondary tiny" onclick="openUploadsTab()">Upload targets</button>':`<button class="action ghost tiny" onclick="showRunDetail('${J.observed_at}')">Examine details</button>`}
                  </td>
                </tr>
              `}).join("")}
            </tbody>
          </table></div>
          ${dt("runs",ye.page,ye.totalPages)}
        `:ke("No checks for this API yet.")}s.uploadSort==="kpi_asc"&&(s.uploadSort="uploaded_at_desc");let Y=pt(e.upload_activity||[],s.uploadSort,"uploaded_at"),pe=new Map;Y.forEach(b=>{let B=String(b?.uploaded_at||""),W=String(b?.grain_key||""),q=`${B}__${W}`;pe.has(q)||pe.set(q,{uploaded_at:b?.uploaded_at||null,grain_key:b?.grain_key||null,upload_source:b?.upload_source||null,metrics:[]}),pe.get(q).metrics.push({kpi_field:String(b?.kpi_field||""),expected_value:b?.expected_value==null?null:Number(b?.expected_value)})});let Ae=Array.from(pe.values()).map(b=>({...b,metrics:[...b.metrics].sort((B,W)=>String(B.kpi_field||"").localeCompare(String(W.kpi_field||"")))})),K=ct(Ae,s.uploadPage,6);s.uploadPage=K.page;let se=[...e.upload_analysis_history||[]].sort((b,B)=>String(B?.analyzed_at||"").localeCompare(String(b?.analyzed_at||""))),be=new Map;e.metrics&&e.metrics.forEach(b=>{b.calculation&&b.calculation.field&&be.set(b.calculation.field,b.name)});let qe=se.length?`
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
              ${se.slice(0,8).map(b=>`
                <tr>
                  <td>${ne(b.analyzed_at)}</td>
                  <td>
                    <span class="status-pill ${ir(b.verdict)}">${sr(b.verdict)}</span>
                    <div class="tiny muted" style="margin-top:6px;">
                      ${p(b.requested_grains)} segments \u2022 ${p(b.matched_runs)} matched \u2022 ${p(b.mismatch_runs)} mismatched \u2022 ${p(b.failed_runs)} errors
                    </div>
                  </td>
                  <td>${S(b.summary_message||"No summary available.")}</td>
                  <td>
                    <button
                      class="action ghost tiny"
                      type="button"
                      onclick="showUploadAnalysis('${String(b.analyzed_at||"").replace(/'/g,"\\\\'")}')"
                    >
                      ${N&&String(b.analyzed_at||"")===N?"Viewing":"Open"}
                    </button>
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
        ${se.length>8?`<div class="tiny muted" style="margin-bottom:12px;">Showing latest 8 of ${se.length} upload analysis runs.</div>`:""}
      `:`
        <div class="empty" style="margin-bottom:12px;">No upload analysis history yet.</div>
      `;if(a.uploadActivity.innerHTML=Ae.length?`
        ${qe}
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
            ${K.items.map(b=>`
              <tr>
                <td>${ne(b.uploaded_at)}</td>
                <td>
                  <strong>${S(Ns(b.grain_key))}</strong>
                  <details class="upload-analysis-tech" style="margin-top:6px;">
                    <summary class="tiny muted">Technical key</summary>
                    <div class="tiny muted">${S(String(b.grain_key||""))}</div>
                  </details>
                </td>
                <td>
                  <div class="upload-event-metrics">
                    ${b.metrics.slice(0,2).map(B=>`
                      <div class="upload-event-metric">
                        <strong>${S(be.get(B.kpi_field)||ft(B.kpi_field))}</strong>
                        <span>${p(B.expected_value)}</span>
                      </div>
                    `).join("")}
                    ${b.metrics.length>2?`
                      <details class="upload-analysis-inline-more">
                        <summary>Show ${p(b.metrics.length-2)} more metric(s)</summary>
                        <div class="upload-event-metrics upload-event-metrics-more">
                          ${b.metrics.slice(2).map(B=>`
                            <div class="upload-event-metric">
                              <strong>${S(be.get(B.kpi_field)||ft(B.kpi_field))}</strong>
                              <span>${p(B.expected_value)}</span>
                            </div>
                          `).join("")}
                        </div>
                      </details>
                    `:""}
                  </div>
                </td>
                <td>${S(String(b.upload_source||"upload"))}</td>
              </tr>
            `).join("")}
          </tbody>
        </table></div>
        ${dt("uploads",K.page,K.totalPages)}
      `:`${qe}${ke("No target rows are stored for this API yet.")}`,_e(e.fields||[],e.setup_config||e.config||{},e.metrics||[],e),Be(),Ct(),s.currentApiTab==="configuration"&&typeof window.refreshTimePreview=="function"&&requestAnimationFrame(()=>{window.refreshTimePreview()}),s.currentApiTab==="configuration"&&typeof window.runMagicGuess=="function"){let b=!!((e.setup_config?.dimension_fields||[]).length||(e.setup_config?.kpi_fields||[]).length||e.setup_config?.time_field),B=Es(e),W=String(e.endpoint_path||s.selectedApi||"").trim(),q=s.autoSuggestTriggeredByApi||{};!b&&B&&W&&!q[W]&&!y&&(q[W]=!0,s.autoSuggestTriggeredByApi=q,requestAnimationFrame(()=>{window.runMagicGuess(!1)}))}}function Vs(){let e=s.status?.project,t=Le(),n=e?.policy,i=String(e?.tier||"free").toLowerCase(),o=String(e?.license_backend||(e?.license_catalog_present?"commercial_catalog":"legacy_demo"))==="commercial_catalog"||!!e?.license_catalog_present,l=e?.license_enforced!==!1,c=n?.max_projects==null?"Unlimited":p(n?.max_projects),u=(s.status?.recent_errors||[]).find(k=>String(k?.source||"")==="middleware.db"&&/quarantin|corrupt/i.test(`${k?.message||""} ${k?.hint||""}`))||null,$=String(u?.hint||""),N=$.match(/Old DB moved to (.+?)\. Restore/i)?.[1]||$,H=u?`
      <div class="row-card danger" style="margin-bottom:12px; border-color:rgba(251, 113, 133, 0.35);">
        <strong>Storage Recovery Completed</strong>
        <div class="tiny" style="margin-top:6px;">
          Jin detected a DuckDB internal error and started with a fresh local database.
        </div>
        ${N?`<div class="tiny" style="margin-top:6px;">Backup file: <code>${S(N)}</code></div>`:""}
        <div class="toolbar" style="margin-top:10px;">
          <button class="action secondary" type="button" onclick="setView('errors')">Open Errors</button>
        </div>
      </div>
    `:"",j=a.settingsLicense.closest(".row-card");if(j&&(j.style.display=t?"":"none"),!t){a.settingsLicense.innerHTML="";return}a.settingsLicense.innerHTML=`
    <div class="row-card-inner">
      ${H}
      <div class="row-card" style="margin-bottom:12px; border:1px solid rgba(var(--brand-rgb), 0.14); background:rgba(var(--brand-rgb), 0.03);">
        <strong>Maintainer-only controls</strong>
        <div class="tiny" style="margin-top:6px;">
          This panel manages customer-project licensing, plan limits, and the legacy demo compatibility path for maintainers.
        </div>
        <div class="tiny muted" style="margin-top:6px;">
          Customer projects remain separate. Normal users should never see this surface.
        </div>
      </div>
      <div class="tiny" style="margin-bottom:12px;">
        Unique Site ID: <code class="site-id-code">${e?.site_id||"unknown"}</code>
      </div>
      
      <div class="license-status-card tier-${i}">
        <div class="license-status-header">
          <strong>${o?"Commercial Entitlement":"Legacy Demo Compatibility"}: <span class="tier-label">${i.toUpperCase()}</span></strong>
          <span class="status-badge ${i==="business"?"active":"basic"}">
            ${i==="business"?"Licensed":"Free Tier"}
          </span>
        </div>
        
        <div class="policy-limits">
          <div class="policy-limit-item">
            <span class="limit-label">Hosting Model</span>
            <span class="limit-value">Your Infrastructure</span>
          </div>
          <div class="policy-limit-item">
            <span class="limit-label">Project Limit</span>
            <span class="limit-value">${p(e?.projects_active)} / ${l?c:"Unlimited"}</span>
          </div>
        </div>

        ${l?`
          <p class="tiny muted" style="margin-top:16px;">
            ${o?"Commercial catalog is active. Business activation unlocks unlimited projects on your own infrastructure.":"Legacy demo compatibility is active. Maintainers can still test the licensing flow locally."}
          </p>
        `:`
          <p class="tiny muted" style="margin-top:16px;">
            License enforcement is currently disabled. ${o?"A commercial catalog is available for activation.":"This runtime is using the legacy demo entitlement backend."}
          </p>
        `}
      </div>

      <div class="activation-form" style="margin-top:20px;">
        <label>
          ${o?l?"Activate Business License":"Optional: Activate Business License":l?"Run Legacy Demo Activation":"Optional: Run Legacy Demo Activation"}
          <div class="activation-input-group">
            <input id="license-key-input" type="password" placeholder="BUS-ORG-XXXX-XXXX" />
            <button class="action" id="activate-license-button" type="button">${o?"Activate Business License":"Run Legacy Demo"}</button>
          </div>
        </label>
        <div id="license-feedback" class="tiny" style="margin-top:8px;"></div>
      </div>
    </div>
  `}function Nt(e=null){let t=s.status?.endpoints||[],n=t.length>0,i=Array.isArray(s.lastReportData)&&s.lastReportData.length>0,r=a.reportsContent.dataset.reportPackReady==="1",o=s.reportsMessage,l=n?i?"Report is ready. Review risks, then export CSV.":"Step 1: Generate report. Step 2: Export CSV.":"";a.reportsFeedback.textContent=o?.text||l,a.reportsFeedback.className=`feedback feedback-banner${o?.kind==="error"?" danger":o?.kind==="success"?" success":o||l?" info":""}`,a.runReportButton.disabled=!n,a.runReportButton.title=n?"Step 1: Generate report":"No tracked APIs yet. Connect your first endpoint before generating a report pack.",a.exportReportCsv.disabled=!n,a.exportReportCsv.textContent=i?"2) Export CSV":"Generate then Export CSV",a.exportReportCsv.title=n?i?"Step 2: Download the latest generated report CSV.":"Generate report and export in one click.":"No tracked APIs yet. Connect your first endpoint before generating a report pack.";let c=a.reportEndpointSelect.value;if(a.reportEndpointSelect.innerHTML='<option value="">All tracked APIs</option>'+t.map(m=>`<option value="${m.endpoint_path}" ${m.endpoint_path===c?"selected":""}>${m.endpoint_path}</option>`).join(""),!e){if(!n){a.reportsContent.dataset.reportPackReady="0",a.reportsContent.innerHTML=`
        <div class="empty empty-center">
          <strong>No tracked APIs yet.</strong>
          <div class="tiny" style="margin-top:6px;">Connect your first endpoint before generating a report pack.</div>
          <div class="toolbar" style="margin-top:12px; justify-content:center;">
            <button class="action" type="button" data-view="api">Set Up APIs</button>
          </div>
        </div>
      `;return}if(r)return;a.reportsContent.dataset.reportPackReady="0",a.reportsContent.innerHTML=i?`
        <div class="row-card reports-start-card">
          <strong>Report is ready</strong>
          <div class="tiny" style="margin-top:8px;">
            Export CSV now, or regenerate first if you want a fresher snapshot before sharing.
          </div>
          <div class="toolbar" style="margin-top:10px;">
            <button class="action secondary" type="button" data-view="incidents">Review Issues</button>
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
      `;return}if(Array.isArray(e)){if(a.reportsContent.dataset.reportPackReady="0",e.length===0){a.reportsContent.innerHTML=ke("No data found for this query.");return}let m=Object.keys(e[0]);a.reportsContent.innerHTML=`
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              ${m.map(g=>`<th>${g}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${e.map(g=>`
              <tr>
                ${m.map(I=>`<td>${p(g[I])}</td>`).join("")}
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;return}let d=e.summary||{},u=e.digest||{},$=e.endpoint_report||e.endpointReport||null,A=d.health||{},N=d.summary||{},H=Array.isArray(d.active_anomalies)?d.active_anomalies:[],j=u.totals||{},k=$?.references||$?.baseline||{},M=Number(N.anomalies||0),v=Number(N.unconfirmed||0),C=M>=8?"high":M>0||v>0?"medium":"low",R=Number(k.coverage_pct??0),T=Number.isFinite(R)?Math.max(0,Math.min(100,R)):0,E=e.generated_at?ne(e.generated_at):ne(new Date().toISOString()),x=M>0?{label:"Needs attention",tone:"warning"}:v>0?{label:"Block release",tone:"danger"}:{label:"Safe for now",tone:"success"},y=x.tone==="success"?"resolved":x.tone==="danger"?"active":"acknowledged",P=M>0?"Needs attention: review Issues next and resolve high-priority changes before sharing this report.":v>0?"Block release: set up APIs next and finish setup for unconfirmed endpoints.":"Safe for now: monitoring is stable. Share this report and keep the current targets.",_=M>0?{view:"incidents",label:"Review Issues"}:v>0?{view:"api",label:"Set Up APIs"}:{view:"overview",label:"Open Overview"},V=m=>{let g=String(m||"medium").toLowerCase();return g==="critical"?"Critical":g==="high"?"High":g==="low"?"Low":"Medium"},f=H.length?H.slice(0,5).map(m=>`
      <div class="reports-issue-item reports-issue-item-${St(m)}">
        <div class="reports-issue-main">
          <strong>${S(String(m.endpoint_path||"unknown endpoint"))}</strong>
          <div class="tiny" style="margin-top:4px;">
            ${S(String(m.kpi_field||"metric"))} moved ${Hs(m.pct_change)}
          </div>
          <div class="tiny muted" style="margin-top:4px;">
            expected ${p(m.expected_value??m.baseline_used)} \u2022 actual ${p(m.actual_value)}
          </div>
        </div>
        <span class="status-pill ${St(m)}">${S(V(m.severity))}</span>
      </div>
    `).join(""):M>0?'<div class="history-item">Open risks exist, but detailed rows are not loaded in this view. Review Issues to see the full queue.</div>':'<div class="history-item">No active issues right now.</div>';a.reportsContent.dataset.reportPackReady="1",a.reportsContent.innerHTML=`
    <div class="row-card reports-flow-card">
      <strong>Report Snapshot</strong>
      <div class="tiny" style="margin-top:8px;">
        Last generated: ${E}
      </div>
      <div class="tiny muted reports-last-generated" style="margin-top:4px;">
        Review health and risks first, then export this snapshot.
      </div>
    </div>

    <div class="reports-health-banner reports-health-${C}">
      <div>
        <strong>${x.label}</strong>
        <div class="tiny" style="margin-top:8px;">
          Status: ${p(A.status||"unknown")} \u2022 APIs: ${p(N.total_endpoints||0)} \u2022 Healthy: ${p(N.healthy||0)} \u2022 Issues: ${p(M)}
        </div>
        <div class="tiny muted" style="margin-top:4px;">
          ${x.label==="Block release"?"Share readiness: hold until setup gaps are closed.":x.label==="Needs attention"?"Share readiness: review Issues and setup gaps first.":"Share readiness: clear to share this report snapshot."}
        </div>
      </div>
      <div class="reports-health-tags">
        <span class="status-pill ${y}">${x.label}</span>
        <span class="tiny muted">Setup pending: ${p(v)}</span>
      </div>
    </div>

    <div class="report-grid reports-summary-grid">
      <div class="row-card reports-summary-card">
        <strong>Open Risks</strong>
        <span>${p(M)}</span>
        <div class="tiny muted" style="margin-top:6px;">Active issues needing review</div>
      </div>
      <div class="row-card reports-summary-card">
        <strong>Setup Pending</strong>
        <span>${p(v)}</span>
        <div class="tiny muted" style="margin-top:6px;">APIs waiting for full setup</div>
      </div>
      <div class="row-card reports-summary-card">
        <strong>Leadership Digest (7d)</strong>
        <span>${p(j.runs||0)}</span>
        <div class="tiny muted" style="margin-top:6px;">Runs \u2022 Success ${p(j.success||0)} \u2022 Errors ${p(j.errors||0)}</div>
      </div>
    </div>

    <div class="row-card reports-next-step-card" style="margin-top:12px;">
      <strong>Recommended Next Step</strong>
      <div class="tiny" style="margin-top:8px;">${P}</div>
      <div class="toolbar" style="margin-top:10px;">
        <button class="action" type="button" data-view="${_.view}">${_.label}</button>
      </div>
    </div>

    <div class="row-card reports-issues-card" style="margin-top:12px;">
      <strong>Top Active Issues</strong>
      <div class="tiny muted" style="margin-top:6px;">Showing up to 5 highest-priority items for quick review.</div>
      <div class="reports-issues-list" style="margin-top:10px;">
        ${f}
      </div>
      <div class="toolbar" style="margin-top:10px;">
        <button class="action secondary" type="button" data-view="incidents">Review Issues</button>
      </div>
    </div>

    ${$?`
      <div class="row-card reports-endpoint-card" style="margin-top:12px;">
        <strong>Endpoint Snapshot</strong>
        <div class="tiny" style="margin-top:8px;">
          ${S(String($.endpoint_path||"Selected endpoint"))} \u2022 anomalies ${p($.anomaly_count||0)} \u2022 target rows ${p(k.total_reference_rows||0)}
        </div>
        <div class="reports-coverage-track" aria-label="Endpoint target coverage">
          <span style="width:${T.toFixed(1)}%"></span>
        </div>
        <div class="tiny" style="margin-top:6px;">
          APIs with targets for this endpoint: ${p(k.endpoints_with_baseline||0)} \u2022 coverage ${p(T)}%
        </div>
      </div>
    `:""}
  `}var Nn="jin-po-mode",Xs="jin-po-mode-explicit",fr={method:92,status:92,setup:112,issues:88},hr=36,yr=90,Ys=120;function Qs(e,t={}){let n=!!e;if(s.poMode=n,localStorage.setItem(Nn,n?"on":"off"),t.explicit!==!1&&localStorage.setItem(Xs,"1"),a.poModeToggle.checked!==n&&(a.poModeToggle.checked=n),s.selectedApi){let i=Z();i&&de(i)}t.toast!==!1&&w(n?"PO Mode is ON. Advanced controls are simplified, but Segment/Metric/Exclude/Time editing stays available.":"PO Mode is OFF. Advanced setup controls are fully visible.","success")}function Zs(e={}){s.incidentStatusFilter="",s.incidentSeverityFilter="",s.incidentPage=1,e.persist!==!1&&oe();let t=document.getElementById("incident-status-select");t&&(t.value="");let n=document.getElementById("incident-severity-select");n&&(n.value=""),e.render!==!1&&Ve()}function Us(e){if(!e)return[];try{let t=JSON.parse(e);return Array.isArray(t)?t:[]}catch{return[]}}function ei(){let e=Us(localStorage.getItem(bn()));if(e.length){s.savedViews=e.slice(0,12);return}if(Fe(s.operatorHandle||"default")==="default"){s.savedViews=Us(localStorage.getItem("jin-named-views")).slice(0,12);return}s.savedViews=[]}function Dn(){let e=Fe(s.operatorHandle||localStorage.getItem("jin-operator-handle")||"default");if(!(!e||e==="default"))return e}function Dt(e){let t=Fe(e||"");if(!(!t||t==="default"))return t}function ln(){let e=document.getElementById("view-api"),t=s.currentView==="api"&&(!!s.apiWorkspaceOpen||!!s.selectedApi),n=(s.status?.endpoints||[]).length>0;e&&(e.classList.toggle("api-browser-only",!t&&n),e.classList.toggle("api-browser-detail-open",t)),s.currentView==="api"?(a.apiWorkspace.style.display=t?"grid":"none",a.apiEmpty.style.display=!t&&!n?"block":"none"):(a.apiWorkspace.style.display=t?"grid":"none",a.apiEmpty.style.display="none")}function cn(){let e=document.getElementById("view-api");e&&(e.classList.remove("api-browser-only"),e.classList.add("api-browser-detail-open")),a.apiEmpty.style.display="none",a.apiWorkspace.style.display="grid"}function ti(e){let t={method:!0,status:!0,setup:!0,issues:!0};if(!e)return t;if(Array.isArray(e)){let n=new Set(e.map(i=>String(i)));return{method:n.has("method"),status:n.has("status"),setup:n.has("setup"),issues:n.has("issues")}}if(typeof e=="object"){let n=e;return{method:n.method===void 0?t.method:!!n.method,status:n.status===void 0?t.status:!!n.status,setup:n.setup===void 0?t.setup:!!n.setup,issues:n.issues===void 0?t.issues:!!n.issues}}return t}function Ot(e){let t=["method","status","setup","issues"];if(!Array.isArray(e))return t;let n=new Set(t),i=new Set,r=e.map(o=>String(o)).filter(o=>n.has(o)).filter(o=>i.has(o)?!1:(i.add(o),!0));return t.forEach(o=>{i.has(o)||r.push(o)}),r}function vr(){let e=document.getElementById("operator-handle-input"),t=Fe(e?.value||"default");e&&(e.value=t),s.operatorHandle=t,localStorage.setItem("jin-operator-handle",t),ei(),Be(),w(`Operator handle set to "${t}".`,"success")}function wr(){let e=s.apiBrowserMode==="table"?"table index":s.apiBrowserMode==="compact"?"compact scan":"grouped view",t=$n(s.apiBrowserDensity||"comfortable").toLowerCase(),n=[];s.apiStatusFilter&&n.push(s.apiStatusFilter),s.apiFilter&&n.push("filtered");let i=At(),r=i.length===4?"":`cols ${i.join(", ")}`,o=Ot(s.apiBrowserColumnOrder||[]),l=o.join(", ")==="method,status,setup,issues"?"":`order ${o.join(", ")}`,c=s.apiBrowserSort&&s.apiBrowserSort!=="path"?`sorted by ${s.apiBrowserSort} ${s.apiBrowserSortDirection||"asc"}`:"",d=t==="comfortable"?"":`${t} rows`;return[`API ${e}`,d,...n,r,l,c].filter(Boolean).join(" \u2022 ")}function br(e){return e>yr?"dense":e>hr?"compact":"comfortable"}function vt(e){let t={...fr};if(!e||typeof e!="object"||Array.isArray(e))return t;let n=e;return{method:Math.max(72,Math.min(220,Math.round(Number(n.method)||t.method))),status:Math.max(72,Math.min(220,Math.round(Number(n.status)||t.status))),setup:Math.max(80,Math.min(260,Math.round(Number(n.setup)||t.setup))),issues:Math.max(72,Math.min(200,Math.round(Number(n.issues)||t.issues)))}}function Sr(){let e=At(),t=vt(s.apiBrowserColumnWidths||null);return["minmax(0, 2.4fr)",...e.map(n=>`${t[n]}px`)].join(" ")}function On(){let e=a.apiList.querySelector(".api-browser-table-shell");e&&e.style.setProperty("--api-browser-grid-template",Sr())}function ni(){let e=a.apiList.querySelector(".api-browser-table-shell");if(!e)return;let t=a.apiList.querySelector(".api-browser-table"),n=a.apiList.querySelector(".api-browser-head-cell.pinned-path"),i=a.apiList.querySelector(".api-browser-head-cell.pinned-status"),r=a.apiList.querySelector(".api-browser-head-cell.pinned-issues");if(!n||!i||!r)return;let o=t?window.getComputedStyle(t):window.getComputedStyle(n),l=Number.parseFloat(o.columnGap||o.gap||"8")||8,c=Math.max(0,Math.round(n.getBoundingClientRect().width+l)),d=Math.max(0,Math.round(i.getBoundingClientRect().width+l)),u=Math.max(0,Math.round(r.getBoundingClientRect().width+l));e.style.setProperty("--api-browser-path-pinned-width",`${c}px`),e.style.setProperty("--api-browser-status-pinned-width",`${d}px`),e.style.setProperty("--api-browser-issues-pinned-width",`${u}px`)}function si(){return Xt(s.apiBrowserDensity||"comfortable").rowHeight}function ii(e,t){let n=Ot(s.apiBrowserColumnOrder||[]),i=n.indexOf(e);if(i<0)return;let r=t==="left"?i-1:i+1;if(r<0||r>=n.length)return;let o=[...n],[l]=o.splice(i,1);o.splice(r,0,l),s.apiBrowserColumnOrder=o,s.apiBrowserPage=1,oe(),$e()}function $r(e,t,n){let i=Ot(s.apiBrowserColumnOrder||[]),r=i.indexOf(e),o=i.indexOf(t);if(r<0||o<0||e===t&&n==="before")return;let l=[...i],[c]=l.splice(r,1),d=n==="before"?o:o+1;r<d&&(d-=1),d<0&&(d=0),d>l.length&&(d=l.length),l.splice(d,0,c),s.apiBrowserColumnOrder=l,s.apiBrowserPage=1,oe(),$e()}var ge=null,an=null;function Vn(e,t,n={}){let i=vt({...s.apiBrowserColumnWidths||{},[e]:t});s.apiBrowserColumnWidths=i,n.render!==!1&&On(),n.persist!==!1&&(oe(),$e())}function Qe(){s.apiBrowserScrollTop=0,s.apiBrowserVirtualWindowStart=0,s.apiBrowserVirtualWindowEnd=0}function _r(e){let t=Ge(e);s.apiBrowserDensity!==t&&(s.apiBrowserDensity=t,s.apiBrowserPage=1,Qe(),oe(),$e())}function ri(e,t={}){let n=$t().length;if(s.apiBrowserMode!=="table"||n<=Ys)return;let i=Math.max(0,Math.round(Number(e)||0));s.apiBrowserScrollTop=i;let r=_t(n,i,{rowHeight:si()});s.apiBrowserVirtualWindowStart=r.start,s.apiBrowserVirtualWindowEnd=r.end,t.render!==!1&&$e()}function Un(){ge&&(ge=null,document.body.classList.remove("api-browser-resizing"),oe(),$e())}function Hn(e){if(!e)return{};let t={...e};if(e.dimension_json)if(typeof e.dimension_json=="string")try{Object.assign(t,JSON.parse(e.dimension_json))}catch{}else Object.assign(t,e.dimension_json);if(e.kpi_json)if(typeof e.kpi_json=="string")try{Object.assign(t,JSON.parse(e.kpi_json))}catch{}else Object.assign(t,e.kpi_json);return t}function Re(e,t){if(!e||!t)return;if(Object.prototype.hasOwnProperty.call(e,t))return e[t];let n=String(t).split(".").filter(Boolean);if(!n.length)return;let i=(r,o)=>{if(r==null)return;if(o>=n.length)return r;let l=n[o],c=l.endsWith("[]"),d=c?l.slice(0,-2):l;if(!c)return i(r?.[d],o+1);let u=d?r?.[d]:r;if(!(!Array.isArray(u)||!u.length)){if(o===n.length-1)return u;for(let $ of u){let A=i($,o+1);if(A!=null)return A}return i(u[0],o+1)}};return i(e,0)}function rt(e){if(e==null)return!1;if(Array.isArray(e))return e.some(n=>rt(n));let t=String(e).trim();return t?/^\d{10,13}$/.test(t)||/^\d{4}-\d{2}-\d{2}/.test(t)?!0:!Number.isNaN(Date.parse(t)):!1}function Ht(e){if(e==null)return null;let t=String(e).trim();if(!t)return null;let n;if(/^\d{10,13}$/.test(t)){let i=Number(t),r=t.length<=10?i*1e3:i;n=new Date(r)}else n=new Date(t);return Number.isNaN(n.getTime())?null:n.toISOString().split("T")[0]}function Vt(e){let t=Array.isArray(e?.history)?e.history:[],n=Array.isArray(e?.recent_history)?e.recent_history:[],i=t.length?t:n;if(i.length)return[...i].sort((u,$)=>String($?.observed_at||"").localeCompare(String(u?.observed_at||""))).map(u=>Hn(u));let r=e?.schema_contract&&typeof e.schema_contract=="object"?e.schema_contract:{},o=Array.isArray(r?.example_rows)?r.example_rows.filter(d=>d&&typeof d=="object"):[];if(o.length)return o.map(d=>Hn(d));let l=Array.isArray(r?.fields)?r.fields:Array.isArray(e?.fields)?e.fields:[],c={};return l.forEach(d=>{if(!d||typeof d!="object")return;let u=String(d?.name||"").trim();u&&(d?.example===void 0||d?.example===null||(c[u]=d.example))}),Object.keys(c).length?[c]:[]}function ai(e,t){return e.map(n=>Re(n,t)).filter(n=>n!=null&&n!=="")}function Wn(e){return!e||typeof e!="object"?!1:e.time_candidate?!0:String(e?.suggested_role||"").toLowerCase()==="time"}function oi(e,t){let n=Array.isArray(e?.fields)?e.fields:Array.isArray(e?.schema_contract?.fields)?e.schema_contract.fields:[],i=new Set([...Array.isArray(e?.setup_config?.time_candidates)?e.setup_config.time_candidates:[],...Array.isArray(e?.config?.time_candidates)?e.config.time_candidates:[],...Array.isArray(e?.schema_contract?.time_candidates)?e.schema_contract.time_candidates:[]].map(c=>String(c).trim()).filter(Boolean)),r=new Set(e?.setup_config?.dimension_fields||[]),o=[];if(n.forEach(c=>{let d=String(c?.name||c||"").trim();if(!d)return;let u=d.toLowerCase(),$=String(c?.annotation||c?.type||"").toLowerCase(),A=t.length?Re(t[0],d):void 0,N=c?.example,H=0;i.has(d)&&(H+=12),Wn(c)&&(H+=10),($==="datetime"||$==="date")&&(H+=7),(u.includes("snapshot")||u.includes("timestamp")||u.includes("created_at")||u.includes("updated_at")||u.includes("date")||u.includes("time")||u.endsWith(".period")||u.endsWith("_period")||u==="period")&&(H+=4),(rt(A)||rt(N))&&(H+=4),r.has(d)&&(H+=1),H>0&&o.push({name:d,score:H})}),!o.length)return null;o.sort((c,d)=>d.score-c.score||c.name.localeCompare(d.name));let l=o[0];return l.score>=5?l.name:null}function kr(e){let t=Array.isArray(e?.fields)?e.fields:Array.isArray(e?.schema_contract?.fields)?e.schema_contract.fields:[],n=ot(t);return{dimensionFields:[...n.segmentCandidates],kpiFields:[...n.metricCandidates],timeField:n.timeCandidates[0]||null,candidateCount:n.candidateCount}}function xr(e,t){if(!e?.setup_config||e.setup_config.time_field)return!1;let n=oi(e,t);return n?(e.setup_config.time_field=n,e.setup_config.dimension_fields=(e.setup_config.dimension_fields||[]).filter(i=>i!==n),e.setup_config.kpi_fields=(e.setup_config.kpi_fields||[]).filter(i=>i!==n),e.setup_config.excluded_fields=(e.setup_config.excluded_fields||[]).filter(i=>i!==n),!0):!1}function Ar(e,t){let n=Array.isArray(e?.fields)?e.fields:[];return n.length?n.some(i=>{let r=String(i?.name||i||"").trim();if(!r)return!1;let o=r.toLowerCase(),l=String(i?.annotation||i?.type||"").toLowerCase();return Wn(i)||l==="datetime"||l==="date"||o.includes("time")||o.includes("date")||o.includes("timestamp")||o.includes("created_at")||o.includes("updated_at")||o.includes("period")?!0:ai(t,r).some(d=>rt(d))}):!1}function dn(e,t){if(t?.time_required===!1)return!1;if(String(t?.time_field||"").trim()||Array.isArray(t?.time_candidates)&&t.time_candidates.length>0||Array.isArray(e?.config?.time_candidates)&&e.config.time_candidates.length>0)return!0;let i=Vt(e);return oi(e,i)?!0:Ar(e,i)}function Ue(e,t){return e instanceof Element?e.closest(t):null}var Ws=0,li="jin-status-cache-v2";function ue(e){return e?e instanceof Oe||e instanceof Error?e.message:String(e):"Unknown error"}function ci(e){let t=ue(e).toLowerCase();return t.includes("failed to fetch")||t.includes("connection reset")||t.includes("network")||t.includes("timed out")||t.includes("timeout")||t.includes("abort")}function Q(e,t="Request failed."){let n=ue(e)||t;if(ci(e)){let i=Date.now();i-Ws>3e3&&(w("Jin backend is temporarily unreachable. Retrying may help after the server stabilizes.","error"),Ws=i);return}w(n||t,"error")}function jr(e){if(ci(e))return{state:"unavailable",message:"Cannot reach Jin backend. Start or restart your app to load APIs."};if(e instanceof Oe){if(e.status===401||e.status===403)return{state:"auth_required",message:"Authentication expired. Sign in again to load APIs."};if(typeof e.status=="number")return{state:"error",message:`Jin backend returned ${e.status} while loading APIs. Retry and check logs if this continues.`}}return{state:"error",message:"Jin backend returned an unexpected error while loading APIs. Retry and check logs if this continues."}}function Cr(){if(s.status)try{localStorage.setItem(li,JSON.stringify({saved_at:new Date().toISOString(),payload:s.status}))}catch{}}function di(){try{let e=localStorage.getItem(li);if(!e)return!1;let t=JSON.parse(e);return!t||typeof t!="object"||!t.payload?!1:(s.status=t.payload,s.apiDataUpdatedAt=String(t.saved_at||""),!0)}catch{return!1}}function we(){let e=String(a.projectActiveSelect.value||"").trim();if(e)return e;if(s.activeProjectId)return String(s.activeProjectId);let t=s.projectsCatalog?.find(n=>n.active&&!n.is_archived)?.id||s.projectsCatalog?.find(n=>!n.is_archived)?.id||s.projectsCatalog?.[0]?.id;return t?String(t):null}function Ee(e=we()){return e&&s.projectsCatalog?.find(t=>String(t.id)===String(e))||null}function mn(){let e=String(s.activeProjectId||"").trim();if(e){let n=s.projectsCatalog?.find(i=>String(i.id)===e);if(n&&!n.is_archived)return e}let t=s.projectsCatalog?.find(n=>!n.is_archived)?.id;return t?String(t):null}function zn(){let e=String(a.projectPolicyThreshold.value||"").trim(),t=e?Number(e):null;return{cadence_template:String(a.projectPolicyCadence.value||"balanced"),schedule:String(a.projectPolicySchedule.value||"every 2h"),baseline_mode:String(a.projectPolicyBaselineMode.value||"fixed"),threshold:Number.isFinite(t)?t:null,bundle_enabled:!!a.projectPolicyBundleEnabled.checked,bundle_schedule:String(a.projectPolicyBundleSchedule.value||"").trim()||"daily 09:00",bundle_report_format:String(a.projectPolicyBundleFormat.value||"markdown")}}function Ut(){return Array.isArray(s.status?.endpoints)?s.status.endpoints.length:0}function Tr(){return(Array.isArray(s.scheduler?.jobs)?s.scheduler.jobs:[]).filter(t=>{let n=String(t?.job_id||"");if(!n||n.startsWith("jin:bundle:"))return!1;let i=String(t?.job_type||"").toLowerCase();if(i&&i!=="watch")return!1;let r=String(t?.skip_reason||"");return!(r==="missing_default_params"||r==="unsupported_schedule"||!String(t?.endpoint_path||t?.path||"").trim())}).length}function qn(e){let t=Array.isArray(e?.results)?e.results:[],n=new Set;t.forEach(r=>{if(!r||r.ok)return;let o=String(r.reason||"").trim();o&&n.add(o)});let i=[];return n.has("missing_default_params")&&i.push("Some APIs are missing default parameters. Set up APIs and add watch defaults first."),n.has("unsupported_schedule")&&i.push("Setup contains an unsupported schedule format. Use every Nh, daily HH:MM, or weekly mon[,tue] HH:MM."),n.has("endpoint_not_found")&&i.push("Some APIs listed in setup are no longer available in this runtime."),!i.length&&t.some(r=>!r?.ok)&&i.push("Some APIs could not be scheduled yet. Review API setup and retry."),i}async function ze(e=!0){if(!Le()){s.projectsCatalog=[],s.activeProjectId=null,s.projectMonitorPolicy=null,s.projectPolicyLoadedFor=null;return}let t=await os(!0),n=t.projects||[];if(s.projectsCatalog=n,s.activeProjectId=String(t.active_project_id||n.find(c=>c.active&&!c.is_archived)?.id||n.find(c=>!c.is_archived)?.id||n[0]?.id||"")||null,!e)return;let i=String(a.projectActiveSelect.value||"").trim(),r=i?n.find(c=>String(c.id)===i):null,o=r&&!r.is_archived?i:mn();if(!o){s.projectMonitorPolicy=null,s.projectPolicyLoadedFor=null;return}let l=await Cn(o);s.projectMonitorPolicy=l.monitor_policy||null,s.projectPolicyLoadedFor=o}async function Me(e,t=!1){if(!Le()){s.projectHealth=null,s.projectRunHistory=[],t&&(s.projectDigest=null);return}if(!e){s.projectHealth=null,s.projectRunHistory=[],t&&(s.projectDigest=null);return}let[n,i]=await Promise.all([Tn(e),gs(e,12)]);s.projectHealth=n,s.projectRunHistory=i.runs||[],t&&(s.projectDigest=await Mn(e,7,200))}async function gn(e=!1){Le()&&(s.poPlaybook&&!e||(s.poPlaybook=await hs()))}async function xe(e,t,n){let i=e.textContent||"Run";e.disabled=!0,e.textContent=t;try{await n()}finally{e.disabled=!1,e.textContent=i}}function G(e,t="info"){s.projectWorkflowMessage={text:e,kind:t},X()}function fe(e,t="info"){s.incidentsMessage={text:e,kind:t},s.currentView==="incidents"&&Ve()}function Ye(e,t="info"){s.reportsMessage={text:e,kind:t},s.currentView==="reports"&&Nt()}function Pr(e){let t=e?.summary||{},n=e?.digest||{},i=e?.endpoint_report||e?.endpointReport||null,r=t.health||{},o=t.summary||{},l=Array.isArray(t.active_anomalies)?t.active_anomalies:[],c=n.totals||{},d=i?.references||i?.baseline||{},u=Number(o.anomalies||0)>0?"Review Issues next and resolve high-priority changes before sharing this report.":Number(o.unconfirmed||0)>0?"Set Up APIs next and finish setup for unconfirmed endpoints.":"Monitoring is stable. Share this report and keep the current targets.",$=[{row_type:"summary",generated_at:e?.generated_at||new Date().toISOString(),report_scope:e?.endpoint_path||"all_tracked_apis",focus_note:e?.focus||"",project_status:r.status||"unknown",tracked_apis:Number(o.total_endpoints||0),healthy_apis:Number(o.healthy||0),open_issues:Number(o.anomalies||0),setup_pending:Number(o.unconfirmed||0),digest_runs_7d:Number(c.runs||0),digest_success_7d:Number(c.success||0),digest_errors_7d:Number(c.errors||0),recommendation:u}];return l.slice(0,20).forEach((A,N)=>{$.push({row_type:"top_issue",rank:N+1,endpoint_path:String(A?.endpoint_path||""),kpi_field:String(A?.kpi_field||""),pct_change:Number(A?.pct_change||0),expected_value:A?.expected_value??A?.baseline_used??"",actual_value:A?.actual_value??"",severity:String(A?.severity||""),status:String(A?.status||"")})}),i&&$.push({row_type:"endpoint_snapshot",endpoint_path:String(i?.endpoint_path||e?.endpoint_path||""),endpoint_anomalies:Number(i?.anomaly_count||0),endpoint_reference_rows:Number(d?.total_reference_rows||0),endpoint_reference_coverage_pct:Number(d?.coverage_pct||0),endpoint_reference_apis_with_data:Number(d?.endpoints_with_baseline||0)}),$}function Jn(e){if(!Number.isFinite(e)||e<=0)return"0 B";let t=["B","KB","MB","GB"],n=e,i=0;for(;n>=1024&&i<t.length-1;)n/=1024,i+=1;return`${n.toFixed(n>=100||i===0?0:1)} ${t[i]}`}function Rn(e,t){if(!e)return;let n=s.autoSuggestSummaryByApi||{};s.autoSuggestSummaryByApi={...n,[e]:{...t,updatedAt:new Date().toISOString()}}}function Pe(e,t){if(!e)return;let n=s.coreInsightsByApi||{};s.coreInsightsByApi={...n,[e]:{...t,updatedAt:new Date().toISOString()}}}function Mr(e,t){let n=(t?.anomaly_history||[]).filter(o=>String(o?.status||"active")!=="resolved"),i=(t?.upload_activity||[]).length>0,r=Array.isArray(t?.recent_history)?t.recent_history.length:0;if(n.length>0){Pe(e,{title:"Insight: review active issues",summary:`${n.length} issue${n.length===1?"":"s"} are outside expected range after the latest check.`,kind:"error",actionType:"view",actionValue:"incidents",actionLabel:"Review Issues"});return}if(!i){Pe(e,{title:"Insight: targets still needed",summary:"Checks can run, but meaningful pass/fail insight needs an uploaded target file for this API.",kind:"info",actionType:"tab",actionValue:"uploads",actionLabel:"Upload Targets"});return}if(r===0){Pe(e,{title:"Insight: waiting for first run",summary:"Setup is saved. Trigger a check to create the first monitoring result.",kind:"info",actionType:"tab",actionValue:"history",actionLabel:"Open Checks"});return}Pe(e,{title:"Insight: monitoring is stable",summary:"Latest check stayed within target. Continue monitoring and review this page for new changes.",kind:"success",actionType:"view",actionValue:"overview",actionLabel:"Open Overview"})}function ui(e,t,n=0){let i=String(t?.verdict||"").toLowerCase(),r=Number(t?.mismatch_runs||0),o=Number(t?.matched_runs||0),l=Number(t?.failed_runs||0),c=t?.issues_sync&&typeof t.issues_sync=="object"?t.issues_sync:null,d=Number(c?.created||0),u=Number(c?.updated||0),$=d>0?` ${d} mismatch${d===1?"":"es"} were added to Issues automatically.`:u>0?` ${u} existing mismatch issue${u===1?"":"s"} were refreshed in Issues.`:"";if(i==="matched"&&r===0&&l===0){Pe(e,{title:"Insight: target upload is clean",summary:`Upload completed. ${o} segment${o===1?"":"s"} matched expected targets.`,kind:"success",actionType:"tab",actionValue:"history",actionLabel:"Review Checks"});return}if(r>0){Pe(e,{title:"Insight: some segments need attention",summary:`${r} segment${r===1?"":"s"} are outside expected targets after upload analysis.${$}`,kind:"error",actionType:"view",actionValue:"incidents",actionLabel:"Review Issues"});return}if(l>0){Pe(e,{title:"Insight: upload analysis had errors",summary:`${l} segment${l===1?"":"s"} could not be analyzed. Check upload details and retry if needed.`,kind:"error",actionType:"tab",actionValue:"uploads",actionLabel:"Review Upload"});return}Pe(e,{title:"Insight: upload finished",summary:`Imported ${n} reference row${n===1?"":"s"}. Run checks to validate against live responses.`,kind:"info",actionType:"tab",actionValue:"history",actionLabel:"Open Checks"})}function pi(e){let t=e?.issues_sync&&typeof e.issues_sync=="object"?e.issues_sync:null,n=Number(t?.created||0),i=Number(t?.updated||0);if(n>0){let r=`Added ${n} mismatch issue${n===1?"":"s"} to Issues automatically.`;w(r,"success"),fe(r,"success");return}if(i>0){let r=`Refreshed ${i} existing mismatch issue${i===1?"":"s"} in Issues automatically.`;w(r,"info"),fe(r,"info")}}var Ft=new Set,Gn=new Map;function un(e){e&&Gn.delete(e)}function zs(e,t){!e||!t||Gn.set(e,t)}function qs(e,t){return!e||!t?!1:Gn.get(e)===t}function Kn(e){return`jin-upload-job:${e}`}function Xn(e,t){if(!e||!t)return;let n=s.activeUploadJobByApi||{};s.activeUploadJobByApi={...n,[e]:t},localStorage.setItem(Kn(e),t)}function We(e){if(!e)return;let t={...s.activeUploadJobByApi||{}};delete t[e],s.activeUploadJobByApi=t,localStorage.removeItem(Kn(e))}function Lr(e){switch(String(e||"").toLowerCase()){case"queued":return"Queued";case"parsing":return"Reading file";case"validating":return"Validating rows";case"importing":return"Saving targets";case"analyzing":return"Running checks";case"completed":return"Completed";case"failed":return"Failed";default:return"Processing upload"}}function Js(e){switch(String(e||"").toLowerCase()){case"queued":return"Queued for deep validation";case"running":return"Deep validation in progress";case"completed":return"Deep validation complete";case"failed":return"Deep validation failed";default:return"No deep validation"}}function Fn(e){let t=String(e||"").trim();if(!t)return null;let n=Date.parse(t);return Number.isFinite(n)?n:null}var Gs=15e3,Ks=12e3;async function Br(e,t){let n=new FormData;n.append("file",t);let i=await fetch(`/jin/api/v2/upload-async/${he(e)}`,{method:"POST",body:n}),r=await i.json();if(!i.ok||!r?.job_id)throw new Error(r?.error||r?.detail||"Could not start upload job.");return String(r.job_id)}async function mi(e){let t=await fetch(`/jin/api/v2/upload-async/${encodeURIComponent(e)}`),n=await t.json();if(!t.ok)throw new Error(n?.detail||n?.error||"Upload job status is unavailable.");return n}async function pn(e){if(!e||Ft.has(e))return;let t=(s.activeUploadJobByApi||{})[e],n=localStorage.getItem(Kn(e))||"",i=(t||n||"").trim(),r=Date.now();if(i){if(qs(e,i)){We(e);return}try{let o=await mi(i),l=String(o?.status||"").toLowerCase(),c=!!o?.done||l==="completed"||l==="failed",d=Fn(o?.updated_at||o?.created_at),u=d!==null&&r-d>120*1e3,$=(l==="running"||l==="queued")&&!o?.task_active&&u;(c||$)&&(We(e),i="")}catch{We(e),i=""}}if(i){if(qs(e,i)){We(e);return}Xn(e,i),gi(e,i,{quiet:!0})}}async function Er(e,t){let n=Number(t?.imported||0);s.selectedApi===e&&(a.uploadFeedback.textContent=`Imported ${n} reference rows.`),w("Reference upload finished.","success"),s.detailCache.delete(e),await ce(!0),s.selectedUploadAnalysisAt=null,s.selectedApi===e&&Ne("history","replace");let i=t?.analysis||null;if(i){let r=i.verdict==="matched"?"success":"error";w(i.summary_message||"Upload analysis finished.",r);let o=i.errors&&i.errors.length?i.errors[0]?.error:null;o&&w(`Analysis error: ${o}`,"error"),ui(e,i,n),pi(i)}else Pe(e,{title:"Insight: upload completed",summary:`Imported ${n} reference row${n===1?"":"s"}. Run checks to compare live data against these targets.`,kind:"info",actionType:"tab",actionValue:"history",actionLabel:"Open Checks"});if(await ce(!0),s.selectedApi===e){s.detailCache.delete(e);let r=await mt(e);s.activeApiDetail=r,de(r)}}async function gi(e,t,n={}){if(!e||!t||Ft.has(e))return;Ft.add(e),Xn(e,t);let i=!1,r=!1,o=null;s.selectedApi===e&&(a.uploadButton.disabled=!0,a.previewUploadButton.disabled=!0);let l=Date.now();try{for(;;){let c=await mi(t),d=Math.max(0,Math.min(100,Number(c?.progress_pct||0))),u=Number(c?.rows_in_file||0),$=Number(c?.columns_in_file||0),A=Number(c?.file_size_bytes||0),N=u||$||A?` \u2022 ${p(u)} row(s) \xD7 ${p($)} column(s) \u2022 ${Jn(A)}`:"";if(s.selectedApi===e)if(!i)a.uploadFeedback.textContent=`${Lr(c?.stage||c?.status)} ${Math.round(d)}%${N}`;else{let v=String(c?.followup_status||"not_requested"),C=String(c?.followup_message||"").trim();a.uploadFeedback.textContent=C?`${Js(v)} \u2022 ${C}`:Js(v)}if(String(c?.status||"").toLowerCase()==="failed"){We(e),un(e);let v=c?.result||{},C=String(v?.error||c?.error||c?.message||"Reference upload failed.");s.selectedApi===e&&(a.uploadFeedback.textContent=C),w(C,"error"),s.selectedApi===e?await et(e,"replace"):await ce(!0);return}let H=String(c?.status||"").toLowerCase(),j=Fn(c?.updated_at||c?.created_at||c?.followup_started_at),k=Date.now();if((H==="running"||H==="queued")&&!c?.task_active&&(j!==null&&k-j>Gs||j===null&&k-l>Gs)){zs(e,t),We(e),s.selectedApi===e&&(a.uploadFeedback.textContent="A stale upload tracker was cleared after restart. You can continue with Check file or start a fresh upload."),n.quiet||w("Cleared a stale upload tracker from a previous server session.","info");return}if(c?.done||String(c?.status||"").toLowerCase()==="completed"){let v=String(c?.followup_status||"not_requested").toLowerCase(),C=!!c?.followup_task_active,R=v==="queued"||v==="running",T=C||R,E=Fn(c?.updated_at||c?.followup_started_at||c?.created_at),x=!!(R&&!C&&(E!==null&&Date.now()-E>Ks||E===null&&o!==null&&Date.now()-o>Ks));if(!i){if(await Er(e,c?.result||{}),i=!0,o=Date.now(),s.selectedApi===e&&(a.previewUploadButton.disabled=!1),T){w("Targets imported. Running deep validation in the background.","success"),await new Promise(y=>setTimeout(y,2e3));continue}We(e);return}if(x){We(e),zs(e,t),s.selectedApi===e&&(a.uploadFeedback.textContent="Target import completed. Deep validation tracker became stale; continue with Checks/Issues."),n.quiet||w("Target import is complete. Deep validation tracking was stale, so live polling stopped.","info");return}if(T){await new Promise(y=>setTimeout(y,2e3));continue}if(We(e),un(e),!r&&(v==="completed"||v==="failed")){if(r=!0,v==="completed"){let y=c?.result?.full_analysis;if(y?.summary_message){w(y.summary_message,y.verdict==="matched"?"success":"error");let P=Number(c?.result?.imported||0);ui(e,y,P),pi(y)}else w("Deep validation finished.","success")}else{let y=String(c?.followup_message||"Deep validation failed.");w(y,"error")}if(await ce(!0),s.selectedApi===e){s.detailCache.delete(e);let y=await mt(e);s.activeApiDetail=y,de(y)}}return}if(Date.now()-l>600*1e3){n.quiet||w("Upload is still running. You can keep working and return to this API anytime.","success");return}await new Promise(v=>setTimeout(v,i?2e3:850))}}catch(c){n.quiet||Q(c,"Could not monitor upload progress.")}finally{Ft.delete(e),s.selectedApi===e&&(a.uploadButton.disabled=!1,a.previewUploadButton.disabled=!1,a.uploadButton.textContent="Confirm upload")}}function Te(e){return String(e??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function Ce(e){let t=document.querySelector(`#nav button[data-view="${e}"]`);t&&t.click()}function Ir(){let e="",t="",n="",i="brand",r=null,o=s.status?.endpoints||[],l=De().filter(y=>String(y.status||"active")!=="resolved"),c=l[0]||null,d=o.find(y=>y.endpoint_path===s.selectedApi)||null,u=Z(),$=u?.operator_metadata?.confirmed??d?.confirmed??!1,A=!!(u?.upload_activity&&u.upload_activity.length>0||d?.last_upload_at),N=!!(u?.recent_history||[]).length,H=(u?.anomaly_history||[]).filter(y=>String(y?.status||"active")!=="resolved").length,j=Le(),k=String(s.status?.project?.tier||"free").toLowerCase(),M=s.status?.project?.license_enforced!==!1,v=(s.status?.recent_errors||[]).find(y=>String(y?.source||"")==="middleware.db"&&/quarantin|corrupt/i.test(`${y?.message||""} ${y?.hint||""}`))||null,C=String(v?.hint||""),T=C.match(/Old DB moved to (.+?)\. Restore/i)?.[1]||C,E=j&&v?`Storage recovery: Jin reset the local DB after an internal DuckDB error.${T?` Backup: ${T}`:""}`:"";if(s.currentView==="overview")e="See overall project health and quickly choose the next setup step.",l.length>0?(t=`${l.length} issue${l.length===1?"":"s"} still need attention.`,n="Review Issues",r=()=>Ce("incidents")):(t=o.length?"No active issues right now.":"Start with the onboarding checklist, then Set Up APIs to configure your first endpoint.",n="Set Up APIs",r=()=>Ce("api"));else if(s.currentView==="playbook")j?(e="Use a guided PO flow: setup once, validate targets, monitor drift, and report with confidence.",t="Start with setup workflow, then use Checks, Issues, and Reports for day-to-day operations.",n="Start With Register",r=()=>{let y=document.getElementById("project-register-name");y&&(y.focus(),y.scrollIntoView({behavior:"smooth",block:"center"}))}):(e="Review your project health, keep an eye on drift, and move to the next action quickly.",t=l.length>0?`${l.length} issue${l.length===1?"":"s"} still need attention.`:"No active issues right now. Set up APIs to configure endpoints or Reports to share results.",n=l.length>0?"Review Issues":"Set Up APIs",r=()=>Ce(l.length>0?"incidents":"api"));else if(s.currentView==="api")e="Configure one API, upload targets, and run checks for that endpoint.",s.selectedApi?$?A?N?H>0?(t=`${H} issue${H===1?"":"s"} need attention for ${s.selectedApi}.`,n="Review Issues",r=()=>Ce("incidents")):(t=`${s.selectedApi} is stable after recent checks.`,n="Open Reports",r=()=>{s.currentView="reports",ve("push"),X(),a.reportEndpointSelect&&(a.reportEndpointSelect.value=s.selectedApi||"")}):(t=`${s.selectedApi} is configured and has targets, but no check run yet.`,n="Open Monitor",r=()=>Ne("history")):(t=`${s.selectedApi} has no uploaded targets yet.`,n="Upload Targets",r=()=>Ai()):(t=`${s.selectedApi} still needs setup confirmation.`,n="Finish Setup",r=()=>Ne("configuration")):o.length?(t="Choose one API from the left list to continue.",n="Open First API",r=()=>et(o[0].endpoint_path)):s.apiDataState==="auth_required"?(t="Your Jin session expired, so API discovery is paused.",n="Sign In",r=()=>{window.location.href="/jin/login?next=/jin"}):s.apiDataState==="error"?(t="Jin returned an error while loading APIs.",n="Retry Connection",r=()=>ce(!1)):s.apiDataState==="unavailable"?(t="Cannot reach Jin backend right now, so API discovery is temporarily unavailable.",n="Retry Connection",r=()=>ce(!1)):(t="No APIs connected yet. Open Overview for the first-run checklist, then return here to finish setup.",n="Open Overview",r=()=>Ce("overview"));else if(s.currentView==="incidents")e="Review project changes, confirm what is expected, and close out anything unresolved.",c?(t=`${l.length} issue${l.length===1?"":"s"} need attention right now.`,n="Review Top Issue",r=()=>Tt(c)):(t="No unresolved issues right now.",n="Set Up APIs",r=()=>Ce("api"));else if(s.currentView==="errors"){let P=(s.status?.recent_errors||[]).filter(_=>String(_.status||"open")!=="archived").length;e="Track runtime or scheduler failures and route them to the right owner quickly.",t=P>0?`${P} open error${P===1?"":"s"} need acknowledgement or fixing.`:"No open errors right now.",n="Back To Issues",i="secondary",r=()=>Ce("incidents")}else if(s.currentView==="scheduler"){let y=s.scheduler?.jobs||[];e="Control scheduled monitoring runs: pause, resume, retry, or run now.",y.length>0?(t=`${y.length} watch job${y.length===1?"":"s"} configured.`,n="Run First Watch Now",r=()=>xi(y[0].job_id,"run")):(t="No watch jobs found yet.",n="Set Up APIs",r=()=>Ce("api"))}else if(s.currentView==="reports"){e="Generate leadership-ready report packs with health, risk, and next steps.";let y=Array.isArray(s.lastReportData)&&s.lastReportData.length>0;o.length?y?(t="Report pack is ready. Export CSV when this snapshot is ready to share.",n="Export CSV",r=()=>wi()):(t="Pick an API only if you want a focused endpoint snapshot.",n="Generate Report Pack",r=()=>Zn()):(t="No tracked APIs yet. Connect your first endpoint first.",n="Set Up APIs",r=()=>Ce("api"))}else if(s.currentView==="settings"){let P=String(s.status?.project?.license_backend||(s.status?.project?.license_catalog_present?"commercial_catalog":"legacy_demo"))==="commercial_catalog"||!!s.status?.project?.license_catalog_present;j?(e=P?"Manage commercial licensing, security defaults, and workspace preferences.":"Manage legacy demo licensing, security defaults, and workspace preferences.",M?P?(t=k==="free"?"Commercial catalog is active. Activate a business license to test the paid entitlement flow.":"Commercial catalog is active. Review the licensed business settings for this project.",n=k==="free"?"Activate Business License":"Review Business License",r=()=>{let _=document.getElementById("license-key-input");_&&_.focus()}):(t=k==="free"?"Legacy demo compatibility is active until a commercial catalog is configured.":"Legacy demo compatibility is active and this project is already in business mode.",n=k==="free"?"Run Legacy Demo Activation":"Review License Settings",r=()=>{let _=document.getElementById("license-key-input");_&&_.focus()}):(t=P?"Licensing is optional in this build. A commercial catalog is available for activation.":"Licensing is optional in this build. The runtime is using the legacy demo entitlement backend.",n="Open Playbook",i="secondary",r=()=>Ce("playbook"))):(e="Manage your project and saved-view preferences.",t="Use saved views and display preferences to keep your customer project organized.",n="Open Overview",i="secondary",r=()=>Ce("overview"))}else e="Use this workspace to keep data quality operations simple and repeatable.",n="Open Overview",r=()=>Ce("overview");a.viewGuide.innerHTML=`
    <div class="view-guide-card">
      <div class="view-guide-copy">
        <div class="view-guide-eyebrow">What this page is for</div>
        <div class="view-guide-purpose">${Te(e)}</div>
        <div class="view-guide-next">Primary next action: ${Te(n||"Review this page")}</div>
        ${E?`<div class="view-guide-note" style="color:#fb7185;">${Te(E)}</div>`:""}
        ${s.apiDataMessage?`<div class="view-guide-note" style="color:#f59e0b;">${Te(s.apiDataMessage)}</div>`:""}
        ${t?`<div class="view-guide-note">${Te(t)}</div>`:""}
      </div>
      ${n?`<button class="action ${i==="secondary"?"secondary":""}" id="view-guide-action" type="button">${Te(n)}</button>`:""}
    </div>
  `;let x=document.getElementById("view-guide-action");x&&r&&(x.onclick=()=>{Promise.resolve(r()).catch(y=>{Q(y,"Primary action failed.")})})}var Rr=new Set(["overview","playbook","api","incidents","errors","scheduler","settings","reports"]),Nr=new Set(["summary","incidents","uploads","configuration","history"]);function fn(e){let t=String(e||"").toLowerCase();return Rr.has(t)?t:String(s.defaultView||"api")}function Yn(e){let t=String(e||"").toLowerCase();return Nr.has(t)?t:"summary"}function Hr(){let e=new URLSearchParams(window.location.search),t=e.get("y_api");return{view:fn(e.get("y_view")),api:t&&t.trim()?t:null,tab:Yn(e.get("y_tab"))}}function ve(e="push"){if(e==="none")return;let t=new URL(window.location.href);t.searchParams.set("y_view",String(s.currentView||"overview")),s.selectedApi?t.searchParams.set("y_api",s.selectedApi):t.searchParams.delete("y_api"),s.currentView==="api"&&s.selectedApi?t.searchParams.set("y_tab",String(s.currentApiTab||"summary")):t.searchParams.delete("y_tab");let n=`${t.pathname}${t.search}${t.hash}`,i=`${window.location.pathname}${window.location.search}${window.location.hash}`;if(e==="push"&&n===i)return;let r={jin:!0,view:s.currentView,api:s.selectedApi,tab:s.currentApiTab};e==="replace"?window.history.replaceState(r,"",n):window.history.pushState(r,"",n)}async function fi(){let e=Hr(),t=new Set((s.status?.endpoints||[]).map(n=>n.endpoint_path));if(e.api&&t.has(e.api)?(s.selectedApi=e.api,s.apiWorkspaceOpen=!0):s.apiWorkspaceOpen=!1,s.currentView=fn(e.view),s.currentApiTab=Yn(e.tab),X(),s.currentView==="api"&&s.selectedApi){let n=await Ze(s.selectedApi);if(!n)return;s.activeApiDetail=n,de(n),(s.currentApiTab==="uploads"||s.currentApiTab==="history")&&await pn(s.selectedApi)}}async function Ze(e){try{return await mt(e)}catch(t){return Q(t,"Failed to load API details."),null}}async function et(e,t="push"){if(s.selectedApi=e,s.apiWorkspaceOpen=!0,s.selectedUploadAnalysisAt=null,s.currentView="api",s.currentApiTab="summary",s.uploadPage=1,s.runPage=1,ve(t),ln(),X(),cn(),ln(),s.currentView==="api"&&s.selectedApi){let n=await Ze(e);if(!n)return;s.activeApiDetail=n,de(n)}}async function Fr(e,t){e&&(e.preventDefault(),e.stopPropagation());let n=String(t||"").trim();if(n){s.selectedApi=n,s.apiWorkspaceOpen=!0,s.currentView="api",s.currentApiTab="summary",cn();try{await et(n,"replace")}finally{cn()}}}function Dr(){s.selectedApi=null,s.activeApiDetail=null,s.apiWorkspaceOpen=!1,s.currentApiTab="summary",X(),ln(),ve("replace")}async function Or(){let e=document.getElementById("license-key-input"),t=document.getElementById("license-feedback"),n=e?.value.trim(),r=String(s.status?.project?.license_backend||(s.status?.project?.license_catalog_present?"commercial_catalog":"legacy_demo"))==="commercial_catalog"||!!s.status?.project?.license_catalog_present,o=r?"business license":"legacy demo license";if(!n){w(`Please enter a ${o} key.`,"error");return}w(`Running ${o} activation...`,"success"),t&&(t.textContent="Contacting server...");try{let l=await fetch("/jin/api/v2/license/activate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({key:n})}),c=await l.json();if(l.ok)w(`${r?"Business":"Legacy demo"} activation completed successfully!`,"success"),await Zt(),X();else{let d=c.detail||"Activation failed.";w(d,"error"),t&&(t.textContent=d,t.style.color="var(--danger-ink)")}}catch{w("Network error during activation.","error")}}function X(){let e={overview:["Overview","Start here to see project health and decide where to go next."],playbook:["PO Guide","PO flow for setup, target uploads, checks, issue review, and report packs."],api:["APIs",(s.selectedApi,"Pick one API, then follow Configure -> Uploads -> Checks.")],incidents:["Issues","See the current issues and take the next step."],errors:["Errors","Problems and next steps."],scheduler:["Watches","See scheduled checks and run them when needed."],settings:["Settings","Choose display, security, and saved-view behavior."],reports:["Reports","Generate a PO-ready report pack with health, risks, and next actions."]};document.querySelectorAll(".view").forEach(i=>i.classList.remove("active")),document.getElementById(`view-${s.currentView}`)?.classList.add("active"),document.querySelectorAll("#nav button").forEach(i=>{i.classList.toggle("active",i.dataset.view===s.currentView)}),a.pageTitle.textContent=e[s.currentView][0],a.pageSubtitle.textContent=e[s.currentView][1],a.topbar.style.display=["api","incidents","scheduler"].includes(s.currentView)?"none":"block";let t=s.status?.project,n=Fe(s.operatorHandle||localStorage.getItem("jin-operator-handle")||"default");s.operatorHandle=n,a.settingsSecurity.innerHTML=`
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
          <div class="tiny muted">Saved views and the default issue review view are scoped by this handle.</div>
        </div>
      `,Ir(),$e(),Fs(),Ds(),Ve(),yt(),Os(),Vs(),Be(),Ct(),Nt(),ln()}async function hi(e,t,n=0){let i={action:t};(t==="snoozed"||t==="suppressed")&&(i.snooze_minutes=n||60);let r=document.getElementById("drawer-note"),o=document.getElementById("drawer-owner"),l=document.getElementById("drawer-resolution-reason");if(s.selectedIncident&&Number(s.selectedIncident.id)===Number(e)){if(r&&r.value&&(i.note=r.value),o){let u=Dt(o.value);u&&(i.owner=u,o.value=u)}l&&l.value&&(i.resolution_reason=l.value)}i.owner||(i.owner=Dt(Dn()));let c=await fetch(`/jin/api/v2/anomaly/${e}/status`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(i)}),d=t==="acknowledged"?"marked in review":`updated to ${t}`;if(c.ok){let u=`Issue ${e} ${d}.`;w(u,"success"),fe(u,"success")}else{let u=`Failed to update issue ${e}.`;w(u,"error"),fe(u,"error")}await ce(!0)}async function Vr(e){let t=document.getElementById("drawer-note")?.value||"",n=document.getElementById("drawer-owner"),i=Dt(n?.value||"");n&&i&&(n.value=i);let r=document.getElementById("drawer-resolution-reason")?.value||"";(await fetch(`/jin/api/v2/anomaly/${e}/status`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:s.selectedIncident?.status||"active",note:t,owner:i||Dt(Dn()),resolution_reason:r})})).ok?(w("Issue notes saved.","success"),fe(`Notes saved for issue ${e}.`,"success")):(w("Failed to save issue notes.","error"),fe(`Could not save notes for issue ${e}.`,"error")),await ce(!0);let l=De().find(c=>Number(c.id)===Number(e));l&&Tt(l)}function Ur(e){let t=document.getElementById("drawer-resolution-reason");t&&(t.value=e)}async function yi(e,t){let n=await fetch(`/jin/api/v2/scheduler/${encodeURIComponent(e)}/${t}`,{method:"POST"});w(n.ok?`Scheduler action ${t} applied.`:`Failed scheduler action ${t}.`,n.ok?"success":"error"),await gt(),s.selectedApi?(s.detailCache.delete(s.selectedApi),await et(s.selectedApi)):X()}async function Wr(e,t){let n=await fetch(`/jin/api/v2/errors/${e}/status`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:t})});w(n.ok?`Error ${e} updated to ${t}.`:`Failed to update error ${e}.`,n.ok?"success":"error"),await Zt(),X()}async function zr(){if(!s.selectedApi)return;let e=Z();if(!e)return;let t=e.setup_config||e.config||{dimension_fields:[],kpi_fields:[]},n=Array.isArray(t.dimension_fields)?t.dimension_fields:[],i=Array.isArray(t.kpi_fields)?t.kpi_fields:[],r=String(t.time_field||"").trim(),o=dn(e,t),l=[];if(n.length||l.push("pick at least one Segment field"),i.length||l.push("pick at least one Metric field"),o&&!r&&l.push("pick one Time field"),l.length>0){let j=`Complete setup first: ${l.join(", ")}.`;a.configFeedback.textContent=j,w(j,"error");return}let c;if(a.configReferences.value.trim())try{c=JSON.parse(a.configReferences.value)}catch{a.configFeedback.textContent="Manual references must be valid JSON.",w("Manual references JSON is invalid.","error");return}let d=Number(a.configToleranceSimple.value||10);a.configNormal.value=String(d),a.configRelaxed.value=String(Math.round(d*2)),a.configStrict.value=String(Math.round(d/2));let u={rows_path:t.rows_path||null,time_field:r||null,time_end_field:t.time_end_field||null,time_profile:t.time_profile||"auto",time_extraction_rule:t.time_extraction_rule||"single",time_format:t.time_format||null};if(o||u.time_field){a.configFeedback.textContent="Checking time mapping using available samples...";try{let j=await fetch(`/jin/api/v2/config-mapping/test/${he(s.selectedApi)}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(u)}),k=await j.json();if(!j.ok||!k?.ok)throw new Error(k?.detail||k?.error||"Time mapping check failed.");let M=String(k?.sample_source||"none"),v=Number(k?.sample_count||0),C=Number(k?.summary?.success_count||0);if(v===0&&M==="none"){let R=String(s.selectedApi||"");R&&!s.mappingNoSamplesToastByApi?.[R]&&(s.mappingNoSamplesToastByApi=s.mappingNoSamplesToastByApi||{},s.mappingNoSamplesToastByApi[R]=!0,w("Time mapping preview could not run yet (no JSON samples found). Fix: hit this API once while Jin is running, or paste a JSON sample payload in Configuration > Time mapping > Test. If this API has no time field, you can ignore this.","warning"))}if(v>0&&C===0&&M!=="schema_example_rows"){let R="Time mapping could not parse sample rows yet. Setup can still be saved; mapping will validate after the first real check.";a.configFeedback.textContent=R,w(R,"warning")}v===0?a.configFeedback.textContent="No sample rows yet. Setup can still be saved; mapping will validate after first check.":v>0&&C===0?a.configFeedback.textContent="Time mapping could not parse schema example rows yet. Setup can still be saved; mapping will validate after the first real check.":a.configFeedback.textContent=`Time mapping check passed on ${C}/${v} sample row(s).`}catch(j){let k=`Could not validate time mapping: ${ue(j)}`;a.configFeedback.textContent=k,w(k,"error");return}}else a.configFeedback.textContent="No time field detected for this API shape. Setup will continue with Segment + Metric only.";let $={dimension_fields:n,kpi_fields:i,active_tolerance:a.configActiveTolerance.value,tolerance_relaxed:Number(a.configRelaxed.value||20),tolerance_normal:d,tolerance_strict:Number(a.configStrict.value||5),tolerance_pct:d,confirmed:!0,rows_path:u.rows_path,time_field:u.time_field,time_end_field:u.time_end_field,time_granularity:t.time_granularity||"minute",time_profile:u.time_profile,time_extraction_rule:u.time_extraction_rule,time_format:u.time_format,time_pin:!!t.time_pin,references:c},A=await fetch(`/jin/api/v2/config/${he(s.selectedApi)}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify($)}),N=await A.json();A.ok?(s.currentApiTab="uploads",ve("push"),w("Setup saved. Ready for target data.","success"),un(s.selectedApi)):(a.configFeedback.textContent=`Save failed: ${JSON.stringify(N)}`,w("Setup save failed.","error")),s.detailCache.delete(s.selectedApi),await ce(!0);let H=Z();H&&de(H)}window.saveConfig=zr;function qr(e){let t=e?.setup_config||e?.config||{},n=[],i=Array.isArray(t?.dimension_fields)?t.dimension_fields:[],r=Array.isArray(t?.kpi_fields)?t.kpi_fields:[],o=String(t?.time_field||"").trim(),l=Array.isArray(e?.fields)&&e.fields.some($=>$.kind==="dimension"||$.kind==="kpi"),c=t?.confirmed===!0;!i.length&&!l&&n.push("Segment"),!r.length&&!l&&n.push("Metric");let d=dn(e,t),u=Array.isArray(e?.fields)&&e.fields.some($=>$.time_candidate||$.suggested_role==="time");return d&&!o&&!u&&n.push("Time"),!c&&(!i.length||!r.length)&&n.push("Save configuration"),n}function Qn(e){let t=String(s.selectedApi||"").trim();if(!t)return!1;let n=Z(),i=qr(n);if(!i.length)return!0;let r=`Before ${e}, complete setup in Configuration: ${i.join(", ")}.`;return a.uploadFeedback.textContent=r,w(r,"error"),Pe(t,{title:"Insight: complete setup first",summary:r,kind:"error",actionType:"tab",actionValue:"configuration",actionLabel:"Open Setup"}),Ne("configuration","push"),!1}async function Jr(){if(!s.selectedApi){a.uploadFeedback.textContent="Choose an API first, then check your file.",w("Select an API first before checking a file.","error");return}if(!Qn("checking this file"))return;if(!a.uploadFile.files||!a.uploadFile.files.length){a.uploadFeedback.textContent="Choose a CSV or XLSX file first.";return}let e=new FormData;e.append("file",a.uploadFile.files[0]),a.previewUploadButton.disabled=!0,a.previewUploadButton.textContent="Checking\u2026",a.uploadFeedback.textContent="Checking file format and sample rows...";try{let t=await fetch(`/jin/api/v2/upload-preview/${he(s.selectedApi)}`,{method:"POST",body:e}),n=await t.text(),i={};if(n)try{i=JSON.parse(n)}catch{i={ok:t.ok,error:n}}else i={ok:t.ok};if((!i||typeof i!="object")&&(i={ok:t.ok,error:String(i||"")}),t.ok||(i.ok=!1,i.error||(i.error=`Server returned ${t.status} while checking the file.`)),a.uploadPreviewStep.style.display="",i.ok){let r=Number(i.rows_in_file||i.rows_found||0),o=Number(i.columns_in_file||0),l=Number(i.file_size_bytes||0),c=!!i.is_large_upload,d="",u="",$=!0,A="",N="";try{let k=await fetch(`/jin/api/v2/config-mapping/test/${he(s.selectedApi)}`,{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"}),M=await k.json(),v=Z(),C=v?.setup_config||v?.config||{},R=dn(v,C);if(k.ok&&M?.ok){let T=Number(M?.sample_count||0),E=Number(M?.summary?.success_count||0),x=String(M?.sample_source||"none");if(T===0&&x==="none"){let m=String(s.selectedApi||"");m&&!s.mappingNoSamplesToastByApi?.[m]&&(s.mappingNoSamplesToastByApi=s.mappingNoSamplesToastByApi||{},s.mappingNoSamplesToastByApi[m]=!0,w("Time mapping confidence is not validated yet because Jin has no runtime JSON samples for this API. Fix: hit the API once with Jin running, or paste a JSON sample payload in Configuration > Time mapping > Test.","info"))}let y=T>0?Math.round(E/T*100):0,P=T===0?"info":E===T?"success":E>0?"info":"danger",_=T===0?i.upload_has_time_validated?"Validated (Upload)":"Not validated yet":E===T?`Strong (${y}%)`:E>0?`Partial (${y}%)`:"Needs fix (0%)",V=Array.isArray(M?.summary?.warnings)?M.summary.warnings:[],f=T===0&&i.upload_has_time_validated?"upload content":x;if(d=`
            <div class="feedback ${P}" style="margin-top:10px;">
              <strong>Time mapping confidence: ${Te(_)}</strong>
              <div class="tiny" style="margin-top:6px;">
                Parsed ${p(T===0?i.rows_found:E)}/${p(T||i.rows_found)} sample row(s) \u2022 source: ${Te(f)}.
              </div>
              ${V.length?`<div class="tiny muted" style="margin-top:6px;">${Te(String(V[0]))}</div>`:""}
            </div>
          `,u=T>0?` Time mapping parsed ${p(E)}/${p(T)} sample row(s).`:" Time mapping has no runtime sample yet.",R){let m=!!i.upload_has_time_validated;T===0&&!m?($=!1,A="Time mapping is not validated yet (no runtime JSON samples)."):T===0&&m?u=" Time mapping validated from your upload.":E!==T&&($=!1,A=`Time mapping needs a fix (${p(E)}/${p(T)} samples parsed).`)}}else R&&($=!1,A="Could not validate time mapping for this API.")}catch{let k=Z(),M=k?.setup_config||k?.config||{};dn(k,M)&&($=!1,A="Could not validate time mapping for this API (network or server error).")}let H=String(s.selectedApi||"");if(H&&(s.uploadConfirmGateByApi=s.uploadConfirmGateByApi||{},s.uploadConfirmGateByApi[H]={ready:$,reason:A||void 0,hint:$?void 0:"Fix: hit the API once with Jin running, or paste a JSON sample in Configuration > Time mapping > Test, then re-run Check file."}),!$){let k=A||"Upload is blocked because setup is not ready yet.";N=`
          <div class="feedback danger" style="margin-top:10px;">
            <strong>Upload blocked</strong>
            <div class="tiny" style="margin-top:6px;">
              ${Te(k)} Fix this first in <strong>Configuration</strong>, then re-run <strong>Check file</strong>.
            </div>
          </div>
        `,w(`${k} Open Configuration to fix it.`,"error")}let j=(i.sample_rows||[]).length?`<table class="preview-table">
                <thead><tr><th>Group</th>${i.metrics_detected.map(k=>`<th>${k}</th>`).join("")}<th>Tolerance %</th></tr></thead>
                <tbody>${i.sample_rows.map(k=>`
                  <tr>
                    <td>${k.group||"(all)"}</td>
                    ${i.metrics_detected.map(M=>`<td>${k.metrics[M]??"\u2014"}</td>`).join("")}
                    <td>${k.tolerance_pct??10}</td>
                  </tr>
                `).join("")}</tbody>
               </table>
               ${i.rows_found>5?`<div class="tiny" style="margin-top:6px;">Showing first 5 of ${i.rows_found} rows</div>`:""}`:'<div class="empty">No data rows found.</div>';a.uploadPreviewBody.innerHTML=`
            <div class="upload-preview-ok">
              <div class="upload-preview-stats">
                <div class="preview-stat"><strong>${i.rows_found}</strong><span>rows</span></div>
                <div class="preview-stat"><strong>${i.groups_detected.join(", ")||"\u2014"}</strong><span>group fields</span></div>
                <div class="preview-stat"><strong>${i.metrics_detected.join(", ")||"\u2014"}</strong><span>metrics</span></div>
                <div class="preview-stat"><strong>${o||"\u2014"}</strong><span>columns</span></div>
              </div>
              <div class="tiny muted" style="margin-top:8px;">
                File shape: ${p(r)} row(s) \xD7 ${p(o)} column(s) \u2022 ${Jn(l)}
              </div>
              ${c?'<div class="feedback info" style="margin-top:10px;">Large/wide upload detected. Validation may take longer, but Jin will process it safely.</div>':""}
              ${d}
              ${N}
              ${(i.warnings||[]).length?`<div class="upload-preview-warnings"><strong>Warnings</strong><ul>${i.warnings.map(k=>`<li>${k}</li>`).join("")}</ul></div>`:""}
              <div style="margin-top:12px;"><strong>Sample rows</strong></div>
              <div class="table-wrap" style="margin-top:8px;">${j}</div>
            </div>
          `,a.uploadConfirmToolbar.style.display="",a.uploadButton.disabled=!$,a.uploadButton.title=$?"":A||"Upload blocked",a.uploadFeedback.textContent=$?`File check passed. ${p(r)} row(s) ready for upload.${u}`:`Upload blocked. ${A||""}`.trim()}else{let r=String(i.error||"Unexpected error."),l=r.toLowerCase().includes("local variable 'warnings'")?"Upload preview failed due to a server bug. Restart Jin (or upgrade to the latest build) and retry Check file.":r;a.uploadPreviewBody.innerHTML=`
            <div class="upload-preview-error">
              <strong>Problem with your file</strong>
              <div style="margin-top:6px;">${Te(l)}</div>
              ${(i.warnings||[]).length?`<ul style="margin-top:8px;">${i.warnings.map(c=>`<li>${c}</li>`).join("")}</ul>`:""}
            </div>
          `,a.uploadConfirmToolbar.style.display="none",a.uploadFeedback.textContent=l||"File check failed."}}catch(t){a.uploadPreviewBody.innerHTML=`<div class="upload-preview-error">${Te(ue(t)||"Could not connect to server. Please try again.")}</div>`,a.uploadConfirmToolbar.style.display="none",a.uploadFeedback.textContent=ue(t),Q(t,"Could not check the file.")}finally{a.previewUploadButton.disabled=!1,a.previewUploadButton.textContent="Check file \u2192"}}var hn=()=>{a.runDetailDrawer.style.display="none"};a.runDetailClose.addEventListener("click",hn);a.runDetailDrawer.addEventListener("click",e=>{e.target===a.runDetailDrawer&&hn()});document.addEventListener("keydown",e=>{e.key==="Escape"&&a.runDetailDrawer.style.display!=="none"&&hn()});async function Gr(e){let t=document.getElementById("api-monitoring-progress");if(!t||!e)return;let n=Z(),i=v=>{if(!v)return{};if(typeof v=="string")try{let C=JSON.parse(v);return C&&typeof C=="object"?C:{}}catch{return{}}return typeof v=="object"?v:{}},r=v=>{let C=new Map,R=(T,E="")=>{if(T!=null){if(typeof T=="number"){E&&Number.isFinite(T)&&!C.has(E)&&C.set(E,T);return}if(typeof T=="string"){let x=T.trim(),y=Number(x);E&&x&&Number.isFinite(y)&&!C.has(E)&&C.set(E,y);return}if(Array.isArray(T)){T.forEach(x=>R(x,E?`${E}[]`:"data[]"));return}typeof T=="object"&&Object.entries(T).forEach(([x,y])=>{let P=E?`${E}.${x}`:x;R(y,P)})}};return R(v),Array.from(C.entries()).map(([T,E])=>({kpiField:T,value:E}))},o=v=>{if(!v||v.indexOf("|")===-1)return v;let[C,...R]=v.split("|"),T=R.map(E=>E.trim()).filter(Boolean).filter(E=>{let x=E.split("=")[0];return x!=="api_version"&&x!=="label"&&x!=="timestamp"&&x!=="_jin_id"}).sort();return T.length?`${C}|${T.join("|")}`:C},l=v=>{let C=String(v||"").trim().toLowerCase();return C?C.replace(/\[\]/g,"").replace(/^data\./,"").replace(/^payload\./,""):""},c=new Map;(n?.references||[]).forEach(v=>{let C=String(v?.grain_key||""),R=String(v?.kpi_field||"");if(!C||!R)return;let T=v?.expected_value,E=v?.tolerance_pct,x=T==null?null:Number(T),y=E==null?null:Number(E),P={expected:Number.isFinite(x)?x:null,tolerance:Number.isFinite(y)?y:null},_=l(R);c.set(`${C}__${R}`,P),_&&_!==R&&c.set(`${C}__${_}`,P);let V=o(C);V&&(c.has(`${V}__${R}`)||c.set(`${V}__${R}`,P),_&&!c.has(`${V}__${_}`)&&c.set(`${V}__${_}`,P))});let d=Number(n?.config?.tolerance_normal??n?.config?.tolerance_pct??10),u=Array.isArray(e.comparisons)?e.comparisons.filter(v=>v?.kpi_field):[],$=i(e.kpi_json),A=r($),H=(u.length?u.map(v=>{let C=v.actual_value??v.actual,R=String(e.grain_key||""),T=o(R),E=String(v.kpi_field||""),x=l(E),y=c.get(`${R}__${E}`)||(x?c.get(`${R}__${x}`):void 0)||c.get(`${T}__${E}`)||(x?c.get(`${T}__${x}`):void 0),P=v.expected_value??v.expected??y?.expected??null,_=v.allowed_tolerance_pct??y?.tolerance??d,V=v.pct_change??(P==null||C==null||Number(P)===0?null:(Number(C)-Number(P))/Math.abs(Number(P))*100),f=String(v.status||""),m=f&&!(f==="missing_reference"&&P!=null)?f:P==null?"missing_reference":V!=null&&Math.abs(Number(V))>Number(_)?"mismatch":"match";return{...v,kpi_field:v.kpi_field,actualValue:C,expectedValue:P,pctChange:V,status:m,message:v.message||(m==="match"?`${v.kpi_field} matched the expected target.`:m==="missing_reference"?`${v.kpi_field} has no uploaded targets for this grain.`:`${v.kpi_field} did not match the uploaded targets.`)}}):A.map(({kpiField:v,value:C})=>{let R=Number(C),T=String(e.grain_key||""),E=l(v),x=o(T),y=c.get(`${T}__${v}`)||(E?c.get(`${T}__${E}`):void 0)||c.get(`${x}__${v}`)||(E?c.get(`${x}__${E}`):void 0),P=y?.expected??null,_=y?.tolerance??d,V=P==null||P===0?null:(R-P)/Math.abs(P)*100,f=P==null?"missing_reference":V!=null&&Math.abs(V)>_?"mismatch":"match";return{kpi_field:v,actualValue:R,expectedValue:P,pctChange:V,status:f,message:P==null?`No uploaded targets found for ${v} on this grain.`:`Compared using uploaded targets (allowed +/-${_.toFixed(1)}%).`}})).filter(v=>v&&String(v.kpi_field||"").trim().length>0);if(!H.length){let v=Object.keys($||{}),C=v.length?`Captured keys: ${v.slice(0,6).join(", ")}${v.length>6?", ...":""}.`:"No KPI fields were returned by this run.";t.dataset.endpoint=s.selectedApi||"",t.dataset.source="live-check",t.innerHTML=`<div class="empty">No comparable KPI values were captured for this run. ${C}</div>`,t.style.display="block";return}let j=H.filter(v=>v.status!=="match").length,k=j===0?{title:"Data Quality: Excellent",sub:"All metrics are within your defined targets.",class:"success"}:{title:`Action Required: ${j} Issue${j>1?"s":""} Found`,sub:"Some metrics have drifted beyond acceptable limits.",class:"danger"},M=`
    <div class="results-auto-show">
      <div class="verdict-banner ${k.class}">
        <div class="verdict-icon">${j===0?"\u2705":"\u26A0\uFE0F"}</div>
        <div class="verdict-body">
          <h4>${k.title}</h4>
          <p class="tiny">${k.sub}</p>
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
            ${H.map(v=>{let C=v.pctChange,R=v.status!=="match",T=R?"var(--anomaly)":"var(--healthy)";return`
                <tr style="border-bottom:1px solid var(--line);">
                  <td style="padding:12px;">
                    <div style="font-weight:600; font-size:13px;">${v.kpi_field}</div>
                    <div class="tiny muted">${e.grain_key||"Global"}</div>
                  </td>
                  <td style="padding:12px; font-family:var(--font-mono); font-size:13px;">${p(v.actualValue)}</td>
                  <td style="padding:12px; font-family:var(--font-mono); font-size:13px; color:var(--ink-muted);">${p(v.expectedValue)}</td>
                  <td style="padding:12px; font-family:var(--font-mono); font-size:13px; color:${T}; font-weight:600;">
                    ${C==null?"\u2014":`${C>0?"+":""}${C.toFixed(1)}%`}
                  </td>
                  <td style="padding:12px;">
                    <span class="status-pill ${R?"danger":"healthy"}" style="padding:2px 8px; font-size:10px; font-weight:700;">
                      ${R?"MISMATCH":"MATCH"}
                    </span>
                  </td>
                  <td style="padding:12px; color:var(--ink-soft);">${v.message}</td>
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
          ${j>0?`
            <div class="next-step-card" onclick="setView('incidents')">
              <div class="step-icon">\u{1F6A9}</div>
              <strong>Review Issues</strong>
              <p class="tiny muted">Deep dive into the ${j} detected drift points.</p>
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
            <strong>Update Targets</strong>
            <p class="tiny muted">Upload a new reference file if targets have shifted.</p>
          </div>
        </div>
      </div>
    </div>
  `;t.dataset.endpoint=s.selectedApi||"",t.dataset.source="live-check",t.innerHTML=M,t.style.display="block"}async function Kr(e="summary"){let t=s.selectedApi;if(!t||!Qn("running a manual check"))return;a.checkNowButton.disabled=!0,a.checkNowButton.textContent="Checking...",Ne(e,"none");let i=document.getElementById("api-monitoring-progress");i&&(i.dataset.endpoint=t,i.dataset.source="live-check-loading",i.innerHTML=`
      <div class="row-card">
        <strong>Running check...</strong>
        <div class="tiny" style="margin-top:6px;">
          Pulling latest API response and comparing against your uploaded targets.
        </div>
      </div>
    `,i.style.display="block");try{let r=await fetch(`/jin/api/v2/check/${he(t)}`,{method:"POST"}),o=await r.json();if(r.ok){await new Promise(d=>setTimeout(d,300)),s.detailCache.delete(s.selectedApi||""),s.detailCache.delete(t);let l=await mt(s.selectedApi||"");if(Mr(t,l),l.history&&l.history.length>0)await Gr(l.history[0]);else{let d=document.getElementById("api-monitoring-progress");d&&(d.innerHTML=`
                    <div class="verdict-banner success shadow-sm" style="animation: slideIn 0.4s easeOutBack;">
                        <div class="verdict-icon">\u{1F4E1}</div>
                        <div class="verdict-text">
                            <strong>Monitor Active: Waiting for traffic</strong>
                            <p>Targets are set! Jin will scan the next live request automatically.</p>
                        </div>
                    </div>
                `,d.style.display="block")}await ce(!0),de(l);let c=document.getElementById("api-monitoring-progress");c&&(c.style.display="block")}else w(o.error||"Check failed.","error")}catch{w("Network error triggering check.","error")}finally{a.checkNowButton.disabled=!1,a.checkNowButton.textContent="Check Now"}}async function Xr(){if(!s.selectedApi||!a.uploadFile.files||!a.uploadFile.files.length){a.uploadFeedback.textContent="Choose a CSV or XLSX file first.";return}if(!Qn("starting target upload"))return;let e=s.selectedApi,t=s.uploadConfirmGateByApi?.[e];if(t&&t.ready===!1){let r=t.reason||"Upload is blocked because setup is not ready yet.";a.uploadFeedback.textContent=`Upload blocked. ${r}`,w(`${r} Fix it in Configuration, then re-run Check file.`,"error"),Pe(e,{title:"Insight: fix setup before upload",summary:`${r} ${t.hint||""}`.trim(),kind:"error",actionType:"tab",actionValue:"configuration",actionLabel:"Open Setup"}),Ne("configuration","push");return}let n=a.uploadFile.files[0],i=a.uploadButton.textContent||"Confirm upload";un(e),a.uploadButton.disabled=!0,a.uploadButton.textContent="Starting...",a.previewUploadButton.disabled=!0,a.uploadFeedback.textContent=`Starting upload for ${n.name} (${Jn(n.size)})...`;try{let r=await Br(e,n);Xn(e,r),w("Upload started. Please wait while Jin validates and imports your targets.","success"),Ne("history","replace"),a.uploadFeedback.textContent=`Upload queued. Tracking progress for ${n.name}...`,Pe(e,{title:"Insight: upload in progress",summary:"Target upload is running in the background. You can monitor progress in this view.",kind:"info",actionType:"tab",actionValue:"history",actionLabel:"Open Checks"}),gi(e,r)}catch(r){Q(r,"Could not start upload."),a.uploadFeedback.textContent=ue(r)}finally{Ft.has(e)?a.uploadButton.textContent="Uploading...":(a.uploadButton.disabled=!1,a.previewUploadButton.disabled=!1,a.uploadButton.textContent=i)}}function Yr(e){let t=Z();if(!t)return;if(!(t.upload_analysis_history||[]).find(r=>String(r?.analyzed_at||"")===String(e||""))){w("This upload analysis record is no longer available.","error");return}s.selectedUploadAnalysisAt=String(e||""),s.currentView="api",s.currentApiTab="history",ve("push"),de(t),requestAnimationFrame(()=>{let r=document.getElementById("api-monitoring-progress");r&&r.scrollIntoView({behavior:"smooth",block:"start"})})}window.showUploadAnalysis=Yr;async function vi(){Zs({render:!1,persist:!0});let e=String(s.selectedApi||"").trim();if(e)try{let t=await re(`/jin/api/v2/upload-analysis/issues/${he(e)}`,{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"},15e3),n=Number(t?.created||0)+Number(t?.updated||0);if(n>0){let i=String(t?.message||`Synced ${n} upload mismatch issue${n===1?"":"s"} into Issues.`);fe(i,"info")}}catch{}if(await ce(!0),e){let t=De().filter(n=>String(n?.endpoint_path||"")===e&&String(n?.status||"active")!=="resolved");t.length>0?fe(`Showing ${t.length} active issue${t.length===1?"":"s"} for ${e}.`,"info"):fe(`No active issues for ${e} right now.`,"info")}s.currentView="incidents",ve("push"),X()}window.openUploadIssues=vi;window.clearIncidentFilters=function(){Zs({render:!0,persist:!0})};async function Qr(){if(!s.selectedApi)return;let e=s.selectedApi;try{let t=await re(`/jin/api/v2/upload-analysis/issues/${he(e)}`,{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"},2e4),n=Number(t?.created||0),i=Number(t?.updated||0);if(n>0||i>0){let o=n>0?`Added ${n} issue${n===1?"":"s"} from upload mismatches.`:`Refreshed ${i} existing issue${i===1?"":"s"} from upload mismatches.`,l=String(t?.message||o);w(l,n>0?"success":"info"),fe(l,n>0?"success":"info"),await vi();return}let r=String(t?.message||"No new issues were added from this upload analysis.");w(r,"info"),fe(r,"info")}catch(t){Q(t,"Could not add upload mismatches to Issues.")}}window.materializeUploadAnalysisIssues=Qr;async function Zr(){let e=[...document.querySelectorAll(".bulk-incident:checked")].map(i=>Number(i.value));if(!e.length)return;let t=a.bulkAction.value,n={anomaly_ids:e,action:t,note:a.bulkNote.value||void 0,owner:Dt(Dn())};(t==="snoozed"||t==="suppressed")&&(n.snooze_minutes=60),Pt("Apply bulk issue action?",`This will apply "${t}" to ${e.length} selected issues.`,async()=>{let i=await fetch("/jin/api/v2/anomalies/bulk",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(n)});if(a.bulkNote.value="",i.ok){let r=`Bulk action applied to ${e.length} issue${e.length===1?"":"s"}.`;w(r,"success"),fe(r,"success")}else{let r="Bulk action failed.";w(r,"error"),fe(r,"error")}await ce(!0),s.selectedApi&&(s.detailCache.delete(s.selectedApi),await et(s.selectedApi))})}async function Zn(e={}){if((Array.isArray(s.status?.endpoints)?s.status.endpoints.length:0)===0){let r="No APIs are tracked yet. Connect your first endpoint first, then generate a report.";w(r,"error"),Ye(r,"error"),Nt();return}let n=a.reportEndpointSelect.value,i=a.reportGrainSearch.value.trim();a.runReportButton.disabled=!0,a.runReportButton.textContent="Generating...";try{let r=new URL(`${window.location.origin}/jin/api/v2/reports/leadership-digest`);r.searchParams.set("days","7"),r.searchParams.set("limit","200"),i&&r.searchParams.set("focus",i);let[o,l,c]=await Promise.all([re(`${window.location.origin}/jin/api/v2/reports/summary`,void 0,2e4),re(r.toString(),void 0,2e4),n?re(`${window.location.origin}/jin/api/v2/reports/endpoint/${he(n)}`,void 0,2e4):Promise.resolve(null)]),d={summary:o,digest:l,endpoint_report:c,generated_at:new Date().toISOString(),endpoint_path:n||null,focus:i||null};s.lastReportData=Pr(d),Nt(d),e.suppressSuccessToast||w("Report pack generated.","success"),Ye("Report pack generated. Review top risks, then export CSV.","success")}catch(r){let o=ue(r);o.toLowerCase().includes("timed out")?(w("Report generation timed out. Try selecting one API first, then retry.","error"),Ye("Report generation timed out. Select one API and try again.","error")):(Q(r,"Failed to generate report pack."),Ye(`Failed to generate report pack: ${o}`,"error"))}finally{a.runReportButton.disabled=!1,a.runReportButton.textContent="1) Generate Report"}}async function wi(){if((Array.isArray(s.status?.endpoints)?s.status.endpoints.length:0)===0){w("No tracked APIs yet. Connect your first endpoint first.","error"),Ye("No tracked APIs yet. Connect your first endpoint first.","error");return}let t=a.exportReportCsv.textContent||"2) Export CSV";a.exportReportCsv.disabled=!0,a.exportReportCsv.textContent="Preparing export...";let n=!1;try{if((!s.lastReportData||s.lastReportData.length===0)&&(Ye("Generating latest report pack before export...","info"),await Zn({suppressSuccessToast:!0}),n=!0),!s.lastReportData||s.lastReportData.length===0){w("No report data to export.","error"),Ye("No report data to export yet. Generate a report pack first.","error");return}kt("jin-report.csv",s.lastReportData);let i=n?"Report pack generated and CSV exported.":"Report CSV exported.";w(i,"success"),Ye(i,"success")}finally{a.exportReportCsv.disabled=!1,a.exportReportCsv.textContent=t}}async function ea(){let e=String(a.projectRegisterName.value||"").trim(),t=String(a.projectRegisterUser.value||"").trim(),n=String(a.projectRegisterPass.value||"");if(!e){w("Project name is required for registration.","error");return}if(n&&!t&&(t="operator",a.projectRegisterUser.value=t),t&&!n){w("Add a password, or clear username/password to continue without login setup.","error");return}await xe(a.projectRegisterButton,"Registering...",async()=>{await as({project_name:e,username:t||void 0,password:n||void 0,write_env:a.projectRegisterWriteEnv.checked,monitor_policy:zn(),bootstrap_monitoring:!0,overwrite_existing_schedule:!0}),a.projectRegisterPass.value="",a.projectRegisterAuthAdvanced.open=!1,await ze(!0),await ce(!1);let i=we();await Me(i,!1),X(),G(`Project "${e}" is ready.`,"success"),w("Project setup completed.","success")})}async function ta(){let e=String(a.projectAddName.value||"").trim();if(!e){w("Project name is required to add a project.","error");return}await xe(a.projectAddButton,"Adding...",async()=>{let t=await ls({name:e,root:String(a.projectAddRoot.value||"").trim()||void 0,db_path:String(a.projectAddDbPath.value||"").trim()||void 0,monitor_policy:zn(),bootstrap_monitoring:!0,overwrite_existing_schedule:!0}),n=String(t?.project?.id||"").trim();n&&(await en(n),s.activeProjectId=n),a.projectAddName.value="",a.projectAddRoot.value="",a.projectAddDbPath.value="",a.projectAddAdvanced.open=!1,await ze(!0),await ce(!1);let i=we();await Me(i,!1),X(),G(`Added and switched to project "${e}".`,"success"),w("Project added and activated.","success")})}async function na(){let e=we();if(!e){w("Select a project first.","error");return}if(Ee(e)?.is_archived){w("Restore this project before activating it.","error");return}if(s.activeProjectId&&String(e)===String(s.activeProjectId)){G("That project is already active.","info"),w("Selected project is already active.","success");return}await xe(a.projectSelectButton,"Switching...",async()=>{await en(e),s.detailCache.clear(),s.selectedApi=null,s.apiWorkspaceOpen=!1,await ze(!0),await ce(!1),await Me(e,!1),X(),G("Switched active project. Dashboard data now reflects the selected project.","success"),w("Project selected.","success")})}async function sa(){let e=we();if(!e){w("Select a project first.","error");return}let t=Ee(e);if(!t){w("Selected project was not found.","error");return}if(t.is_archived){G("Selected project is already archived.","info"),w("Project is already archived.","success");return}await xe(a.projectArchiveButton,"Archiving...",async()=>{await cs(e),a.projectDeleteConfirm.value="",await ze(!0),await ce(!1),await Me(mn(),!1),X(),G(`Project "${t.name}" archived.`,"success"),w("Project archived.","success")})}async function ia(){let e=we();if(!e){w("Select a project first.","error");return}let t=Ee(e);if(!t){w("Selected project was not found.","error");return}if(!t.is_archived){G("Selected project is already active in catalog.","info"),w("Project is not archived.","success");return}await xe(a.projectRestoreButton,"Restoring...",async()=>{await ds(e),a.projectDeleteConfirm.value="",await ze(!0),await ce(!1),await Me(mn(),!1),X(),G(`Project "${t.name}" restored.`,"success"),w("Project restored.","success")})}async function ra(){let e=we();if(!e){w("Select a project first.","error");return}let t=Ee(e);if(!t){w("Selected project was not found.","error");return}if(!t.is_archived){w("Archive the project first before deleting it.","error");return}let n=String(t.name||"").trim(),i=String(a.projectDeleteConfirm.value||"").trim();if(!n||i!==n){w(`Type "${n}" exactly to delete this project.`,"error");return}await xe(a.projectDeleteButton,"Deleting...",async()=>{await us(e),a.projectDeleteConfirm.value="",await ze(!0),await ce(!1),await Me(mn(),!1),X(),G(`Project "${t.name}" deleted.`,"success"),w("Project deleted.","success")})}async function aa(){let e=we();if(!e){w("Select a project first.","error");return}if(Ut()===0){let n="No APIs are tracked yet. Connect your first endpoint first, then save setup.";G(n,"error"),w(n,"error");return}if(Ee(e)?.is_archived){w("Restore this project before updating setup.","error");return}await xe(a.projectPolicySaveButton,"Saving & applying...",async()=>{let n=zn(),i=await ps(e,n);s.projectMonitorPolicy=i.monitor_policy||n,s.projectPolicyLoadedFor=e;let r=await tn(e,{overwrite_existing_schedule:!0});await ze(!1),await gt(),await ce(!1),await Me(e,!1);let o=Number(r.applied||0),l=Number(r.requested||0),c=qn(r);if(X(),o>0){let u=c.length?` ${c[0]}`:"";G(`Check setup saved and applied to ${o}/${l} APIs.${u}`,"success"),w("Schedule setup saved and applied.","success");return}let d=c[0]||"No API checks were scheduled yet.";G(`Setup saved, but checks were not scheduled. ${d}`,"error"),w("Setup saved, but nothing was scheduled yet.","error")})}async function oa(){let e=we();if(!e){w("Select a project first.","error");return}if(Ut()===0){let n="No APIs are tracked yet. Connect your first endpoint first, then apply setup.";G(n,"error"),w(n,"error");return}if(Ee(e)?.is_archived){w("Restore this project before applying setup.","error");return}await xe(a.projectPolicyApplyButton,"Applying...",async()=>{let n=await tn(e,{overwrite_existing_schedule:!0});await gt(),await ce(!1);let i=Number(n.applied||0),r=Number(n.requested||0),o=qn(n);if(i>0){let c=o.length?` ${o[0]}`:"";G(`Schedule setup re-applied to ${i}/${r} APIs.${c}`,"success"),w("Schedule setup re-applied.","success");return}let l=o[0]||"No API checks were scheduled yet.";G(`Setup re-applied, but checks were not scheduled. ${l}`,"error"),w("No checks were scheduled yet.","error")})}async function bi(){let e=we();if(!e){w("Select a project first.","error");return}if(Ut()===0){let n="No APIs are tracked yet. Connect your first endpoint first, then run checks.";G(n,"error"),w(n,"error");return}if(Ee(e)?.is_archived){w("Restore this project before running checks.","error");return}await xe(a.projectRunBundleButton,"Running...",async()=>{if(Tr()===0){let l=await tn(e,{overwrite_existing_schedule:!1});await gt();let c=Number(l.applied||0);if(c===0){let u=qn(l)[0]||"No runnable API schedules are configured yet.";G(`Cannot run checks yet. ${u}`,"error"),w("Checks are blocked until setup is complete.","error");return}G(`Auto-applied setup for ${c} API${c===1?"":"s"} before running checks.`,"info")}let n=await ms(e);await Me(e,!0),await ce(!1),X();let i=`Checks finished: ${n.status||"done"} \u2022 planned ${p(n.requested||0)} \u2022 completed ${p(n.executed||0)} \u2022 errors ${p(n.errors||0)}`;if(String(n.status||"").toLowerCase()==="not_scheduled"||Number(n.executed||0)===0){let l=String(n.message||"").trim()||"No checks could run. Verify API defaults in setup and retry.";G(`${i}. ${l}`,"error"),w("No checks were executed.","error");return}G(i,Number(n.errors||0)>0?"info":"success"),w("Check run completed.",Number(n.errors||0)>0?"error":"success")})}async function Si(){let e=we();if(!e){w("Select a project first.","error");return}if(Ut()===0){let n="No APIs are tracked yet. Connect your first endpoint first, then refresh targets.";G(n,"error"),w(n,"error");return}if(Ee(e)?.is_archived){w("Restore this project before refreshing targets.","error");return}await xe(a.projectBaselinePromoteButton,"Promoting...",async()=>{let n=await fs(e,{}),i=Number(n.promoted||0),r=Number(n.requested||0);await ce(!1),await Me(e,!1),X(),G(`Targets refreshed for ${i}/${r} APIs.`,i>0?"success":"info"),w("Target refresh finished.",i>0?"success":"error")})}async function $i(){let e=we();if(!e){w("Select a project first.","error");return}if(Ee(e)?.is_archived){w("Restore this project before running health checks.","error");return}await xe(a.projectHealthCheckButton,"Checking...",async()=>{s.projectHealth=await Tn(e),X(),G("Health status refreshed.","success"),w("Health check completed.","success")})}async function la(){await xe(a.projectMonitorRefreshButton,"Refreshing...",async()=>{s.projectsMonitorSnapshot=await Pn(),X(),G("Portfolio health refreshed.","success"),w("Portfolio health updated.","success")})}async function _i(){let e=we();if(!e){w("Select a project first.","error");return}if(Ee(e)?.is_archived){w("Restore this project before generating reports.","error");return}if(Ut()===0){let n="No APIs are tracked yet. Connect your first endpoint first, then generate reports.";G(n,"error"),w(n,"error");return}await xe(a.projectReportDigestButton,"Generating...",async()=>{s.projectDigest=await Mn(e,7,200);try{let r=new URLSearchParams;r.set("format","markdown"),r.set("days",String(7)),r.set("limit",String(200)),e&&r.set("project_id",e);let o=await fetch(`/jin/api/v2/reports/leadership-digest?${r.toString()}`);if(o.ok){let l=await o.text();Ie(`jin-report-pack-${new Date().toISOString().slice(0,10)}.md`,l,"text/markdown;charset=utf-8;")}}catch{}X(),G("Leadership report generated for the latest 7 days.","success"),w("Report pack is ready.","success")})}function ca(e,t){if(e==="incidents"&&(s.incidentPage=Math.max(1,s.incidentPage+t)),e==="uploads"&&(s.uploadPage=Math.max(1,s.uploadPage+t)),e==="runs"&&(s.runPage=Math.max(1,s.runPage+t)),e==="api-browser"&&(s.apiBrowserPage=Math.max(1,(s.apiBrowserPage||1)+t)),e==="uploads"||e==="runs"){if(s.selectedApi){let n=Z();n&&de(n)}return}if(e==="api-browser"){$e();return}Ve()}function ki(e,t,n=0){let i=t==="resolved"?`Resolve issue ${e}?`:t==="acknowledged"?`Mark issue ${e} as in review?`:`Apply "${t}" to issue ${e}?`;Pt("Confirm issue action",i,async()=>{await hi(e,t,n)})}function da(e,t,n=0){ki(e,t,n)}function xi(e,t){Pt("Confirm scheduler action",`Apply "${t}" to job ${e}?`,async()=>{await yi(e,t)})}async function ce(e=!1){let t=Le(),n=[Zt(),rs(),gt()];t&&n.push(gn(!1));let i=await Promise.allSettled(n),[r,o,l,c]=i,d=r.status==="rejected";if(!d)s.apiDataState="fresh",s.apiDataMessage=null,s.apiDataUpdatedAt=new Date().toISOString(),Cr();else{let u=jr(r.reason),$=di(),A=!!(s.status?.endpoints||[]).length;$||A?(s.apiDataState="stale",s.apiDataMessage="Live connection interrupted. Showing the last known API snapshot."):(s.apiDataState=u.state,s.apiDataMessage=u.message),Q(r.reason,"Failed to refresh API status.")}!d&&o.status==="rejected"&&Q(o.reason,"Failed to refresh issues."),!d&&l.status==="rejected"&&Q(l.reason,"Failed to refresh scheduler."),t&&!d&&s.currentView==="playbook"&&c?.status==="rejected"&&Q(c.reason,"Failed to load PO playbook."),X();try{if(e&&s.selectedApi){let u=await Ze(s.selectedApi);if(!u)return;s.activeApiDetail=u;let $=u.operator_metadata?.confirmed,A=(u.upload_activity||[]).length>0,N=1;if($&&!A&&(N=2),$&&A&&(N=3),N===3&&s.currentApiTab==="uploads"){s.currentApiTab="summary",ve("replace"),setTimeout(()=>de(u),0);return}de(u)}}catch(u){Q(u,"Failed to refresh selected API details.")}}a.checkNowButton.addEventListener("click",()=>{Kr()});a.nav.addEventListener("click",async e=>{let t=Ue(e.target,"button[data-view]");if(t&&(s.currentView=t.dataset.view,ve("push"),X(),s.currentView==="playbook"&&gn(!0).then(()=>{s.currentView==="playbook"&&X()}).catch(n=>{Q(n,"Failed to load PO playbook.")}),s.currentView==="api"&&s.selectedApi)){let n=await Ze(s.selectedApi);if(!n)return;s.activeApiDetail=n,de(n)}});document.addEventListener("click",async e=>{let t=Ue(e.target,"button[data-view]");if(!(!t||t.closest("#nav"))&&(s.currentView=t.dataset.view,ve("push"),X(),s.currentView==="playbook"&&gn(!0).then(()=>{s.currentView==="playbook"&&X()}).catch(n=>{Q(n,"Failed to load PO playbook.")}),s.currentView==="api"&&s.selectedApi)){let n=await Ze(s.selectedApi);if(!n)return;de(n)}});a.sidebarToggle.addEventListener("click",()=>{vn(document.body.dataset.sidebar!=="collapsed")});a.apiSearch.addEventListener("input",e=>{let t=e.target;s.apiFilter=t?.value||"",s.apiBrowserPage=1,Qe(),oe(),$e()});a.apiStatusFilter.addEventListener("change",e=>{let t=e.target;s.apiStatusFilter=t?.value||"",s.apiBrowserPage=1,Qe(),oe(),$e()});a.errorSearch.addEventListener("input",e=>{let t=e.target;s.errorSearch=t?.value||"",oe(),yt()});a.errorStatusFilter.addEventListener("change",e=>{let t=e.target;s.errorStatusFilter=t?.value||"",oe(),yt()});a.errorCategoryFilter.addEventListener("change",e=>{let t=e.target;s.errorCategoryFilter=t?.value||"",oe(),yt()});a.errorSeverityFilter.addEventListener("change",e=>{let t=e.target;s.errorSeverityFilter=t?.value||"",oe(),yt()});a.incidentSort.addEventListener("change",e=>{let t=e.target;s.incidentSort=t?.value||"business",s.incidentPage=1,oe(),Ve()});document.addEventListener("change",e=>{let t=e.target;if(t?.id==="run-sort"&&(s.runSort=t.value||"observed_at_desc",s.runPage=1,oe(),s.selectedApi)){let n=Z();n&&de(n)}if(t?.id==="upload-sort"&&(s.uploadSort=t.value||"uploaded_at_desc",s.uploadPage=1,oe(),s.selectedApi)){let n=Z();n&&de(n)}if(t?.id==="incident-status-select"&&(s.incidentStatusFilter=t.value||"",s.incidentPage=1,oe(),Ve()),t?.id==="incident-severity-select"&&(s.incidentSeverityFilter=t.value||"",s.incidentPage=1,oe(),Ve()),t?.classList?.contains("bulk-incident")){let n=document.querySelectorAll(".bulk-incident:checked").length;a.bulkPreview.textContent=n?`${n} issue${n===1?"":"s"} selected.`:"Select one or more issues to apply one action.",a.bulkAction.style.display=n?"":"none",a.bulkNote.style.display=n?"":"none",a.bulkRun.style.display=n?"":"none"}});a.apiList.addEventListener("click",async e=>{let t=Ue(e.target,"[data-api-browser-mode]");if(t){let d=t.dataset.apiBrowserMode==="compact"?"compact":t.dataset.apiBrowserMode==="table"?"table":"grouped";s.apiBrowserMode=d,s.apiBrowserPage=1,Qe(),oe(),$e();return}let n=Ue(e.target,"[data-api-browser-density]");if(n){_r(n.dataset.apiBrowserDensity||"comfortable");return}let i=Ue(e.target,"[data-api-browser-column]");if(i){let d=i.dataset.apiBrowserColumn||"";if(d&&d!=="path"){let u=s.apiBrowserColumns?.[d]!==!1;s.apiBrowserColumns={...s.apiBrowserColumns||{},[d]:!u},s.apiBrowserPage=1,Qe(),oe(),$e()}return}let r=Ue(e.target,"[data-api-browser-column-move]");if(r){let d=r.dataset.apiBrowserColumnMove||"",[u,$]=d.split(":");($==="left"||$==="right")&&ii(u,$);return}let o=Ue(e.target,"[data-api-sort]");if(o){let d=o.dataset.apiSort||"path";s.apiBrowserSort===d?s.apiBrowserSortDirection=s.apiBrowserSortDirection==="asc"?"desc":"asc":(s.apiBrowserSort=d,s.apiBrowserSortDirection=d==="issues"?"desc":"asc"),s.apiBrowserPage=1,Qe(),oe(),$e();return}let l=Ue(e.target,"[data-api]");if(l){let d=String(l.dataset.api||"").trim();d&&(s.selectedApi=d,s.apiWorkspaceOpen=!0,s.currentView="api",s.currentApiTab="summary",cn(),await et(d,"replace"));return}let c=Ue(e.target,"[data-group-toggle]");if(c){let d=c.dataset.groupToggle;s.collapsedGroups[d]=!s.collapsedGroups[d],$e();return}});function ua(e){if(s.apiBrowserMode!=="table")return;let t=e.target;if(!t||!t.classList.contains("api-browser-table-body"))return;let n=Math.max(0,Math.round(t.scrollTop||0)),i=$t().length;if(i<=Ys)return;let r=_t(i,n,{rowHeight:si()});s.apiBrowserVirtualWindowStart===r.start&&s.apiBrowserVirtualWindowEnd===r.end||(an!=null&&cancelAnimationFrame(an),an=requestAnimationFrame(()=>{an=null,ri(n)}))}window.handleApiBrowserTableScroll=ua;window.setApiBrowserTableScrollTop=ri;window.syncApiBrowserPinnedOffsets=ni;window.openApiFromBrowser=Fr;window.closeApiWorkspace=Dr;window.addEventListener("resize",()=>{s.currentView==="api"&&ni()});a.apiList.addEventListener("pointerdown",e=>{let t=e.target instanceof Element?e.target.closest("[data-api-browser-column-resize]"):null;if(!t)return;let n=t.dataset.apiBrowserColumnResize;if(!n)return;e.preventDefault(),e.stopPropagation();let i=vt(s.apiBrowserColumnWidths||null);ge={column:n,startX:e.clientX,startWidth:i[n],trackingId:e.pointerId,source:"pointer"},document.body.classList.add("api-browser-resizing"),t.setPointerCapture?.(e.pointerId)});a.apiList.addEventListener("mousedown",e=>{let t=e.target instanceof Element?e.target.closest("[data-api-browser-column-resize]"):null;if(!t||e.button!==0)return;let n=t.dataset.apiBrowserColumnResize;if(!n)return;e.preventDefault(),e.stopPropagation();let i=vt(s.apiBrowserColumnWidths||null);ge={column:n,startX:e.clientX,startWidth:i[n],trackingId:0,source:"mouse"},document.body.classList.add("api-browser-resizing")});window.addEventListener("pointermove",e=>{if(!ge||ge.source!=="pointer"||e.pointerId!==ge.trackingId)return;let t=e.clientX-ge.startX,n=ge.startWidth+t;Vn(ge.column,n,{persist:!1,render:!1}),On()});window.addEventListener("pointerup",e=>{!ge||ge.source!=="pointer"||e.pointerId!==ge.trackingId||Un()});window.addEventListener("pointercancel",e=>{!ge||ge.source!=="pointer"||e.pointerId!==ge.trackingId||Un()});window.addEventListener("mousemove",e=>{if(!ge||ge.source!=="mouse")return;let t=e.clientX-ge.startX,n=ge.startWidth+t;Vn(ge.column,n,{persist:!1,render:!1}),On()});window.addEventListener("mouseup",e=>{!ge||ge.source!=="mouse"||e.button!==0||Un()});var it=null;function on(){it=null,document.querySelectorAll(".api-browser-order-chip.dragging, .api-browser-order-chip.drop-before, .api-browser-order-chip.drop-after").forEach(e=>{e.classList.remove("dragging","drop-before","drop-after")})}a.apiList.addEventListener("dragstart",e=>{let t=e.target instanceof Element?e.target.closest("[data-api-browser-column-drag]"):null;if(!t)return;let n=t.dataset.apiBrowserColumnDrag||"";n&&(it=n,e.dataTransfer?.setData("text/plain",n),e.dataTransfer?.setData("application/x-jin-api-browser-column",n),e.dataTransfer&&(e.dataTransfer.effectAllowed="move"),t.classList.add("dragging"))});a.apiList.addEventListener("dragover",e=>{if(!it)return;let t=e.target instanceof Element?e.target.closest("[data-api-browser-column-drop]"):null;if(!t)return;let n=t.dataset.apiBrowserColumnDrop||"";if(!n||n===it)return;e.preventDefault(),e.dataTransfer&&(e.dataTransfer.dropEffect="move");let i=t.getBoundingClientRect(),r=Number.isFinite(e.clientX)?e.clientX<=i.left+i.width/2:!0;t.classList.toggle("drop-before",r),t.classList.toggle("drop-after",!r)});a.apiList.addEventListener("drop",e=>{if(!it)return;let t=e.target instanceof Element?e.target.closest("[data-api-browser-column-drop]"):null;if(!t){on();return}let n=t.dataset.apiBrowserColumnDrop||"";if(!n||n==="path"||n===it){on();return}e.preventDefault();let i=t.getBoundingClientRect(),r=Number.isFinite(e.clientX)?e.clientX<=i.left+i.width/2:!0;$r(it,n,r?"before":"after"),on()});a.apiList.addEventListener("dragend",on);a.logoutButton.addEventListener("click",e=>{e.preventDefault(),window.location.assign("/jin/logout")});a.themeSelect.addEventListener("change",e=>{let t=e.target.value||"dark";Sn(t)});a.poModeToggle.addEventListener("change",e=>{let t=!!e.target?.checked;Qs(t,{explicit:!0,toast:!0})});window.disablePoModeForEditing=function(){Qs(!1,{explicit:!0,toast:!0})};a.densitySelect.addEventListener("change",e=>{let t=e.target;if(Kt(t?.value||"comfortable"),oe(),X(),s.selectedApi){let n=Z();n&&de(n)}});a.defaultViewSelect.addEventListener("change",e=>{let t=e.target;s.defaultView=t?.value||"overview",oe(),w(`Default view set to ${s.defaultView}.`,"success")});function yn(e,t){e.addEventListener("keydown",n=>{n.key==="Enter"&&(n.preventDefault(),t())})}a.projectRegisterButton.addEventListener("click",()=>{ea().catch(e=>{G(ue(e),"error"),Q(e,"Registration failed.")})});a.projectAddButton.addEventListener("click",()=>{ta().catch(e=>{G(ue(e),"error"),Q(e,"Add project failed.")})});a.projectSelectButton.addEventListener("click",()=>{na().catch(e=>{G(ue(e),"error"),Q(e,"Project selection failed.")})});a.projectArchiveButton.addEventListener("click",()=>{sa().catch(e=>{G(ue(e),"error"),Q(e,"Archiving project failed.")})});a.projectRestoreButton.addEventListener("click",()=>{ia().catch(e=>{G(ue(e),"error"),Q(e,"Restoring project failed.")})});a.projectDeleteButton.addEventListener("click",()=>{ra().catch(e=>{G(ue(e),"error"),Q(e,"Deleting project failed.")})});a.projectPolicySaveButton.addEventListener("click",()=>{aa().catch(e=>{G(ue(e),"error"),Q(e,"Saving setup failed.")})});a.projectPolicyApplyButton.addEventListener("click",()=>{oa().catch(e=>{G(ue(e),"error"),Q(e,"Applying setup failed.")})});a.projectRunBundleButton.addEventListener("click",()=>{bi().catch(e=>{G(ue(e),"error"),Q(e,"Running checks failed.")})});a.projectBaselinePromoteButton.addEventListener("click",()=>{Si().catch(e=>{G(ue(e),"error"),Q(e,"Refreshing targets failed.")})});a.projectHealthCheckButton.addEventListener("click",()=>{$i().catch(e=>{G(ue(e),"error"),Q(e,"Health check failed.")})});a.projectMonitorRefreshButton.addEventListener("click",()=>{la().catch(e=>{G(ue(e),"error"),Q(e,"Refreshing portfolio health failed.")})});a.projectReportDigestButton.addEventListener("click",()=>{_i().catch(e=>{G(ue(e),"error"),Q(e,"Generating report pack failed.")})});a.poActionWorkflow.addEventListener("click",()=>{s.currentView="playbook",ve("push"),X(),document.getElementById("playbook-core-workflow")?.scrollIntoView({behavior:"smooth",block:"start"}),a.projectRegisterName.focus()});a.poActionValidation.addEventListener("click",()=>{s.currentView="api",s.currentApiTab="uploads",ve("push"),X(),s.selectedApi&&Ze(s.selectedApi).then(e=>{e&&(s.activeApiDetail=e,de(e))})});a.poActionChecks.addEventListener("click",()=>{bi().catch(e=>{G(ue(e),"error"),Q(e,"Running checks failed.")})});a.poActionBaseline.addEventListener("click",()=>{Si().catch(e=>{G(ue(e),"error"),Q(e,"Refreshing targets failed.")})});a.poActionHealth.addEventListener("click",()=>{$i().catch(e=>{G(ue(e),"error"),Q(e,"Health check failed.")})});a.poActionReport.addEventListener("click",()=>{_i().catch(e=>{G(ue(e),"error"),Q(e,"Generating report pack failed.")})});a.projectActiveSelect.addEventListener("change",()=>{let e=we();if(a.projectDeleteConfirm.value="",!e)return;if(Ee(e)?.is_archived){s.projectMonitorPolicy=null,s.projectPolicyLoadedFor=null,s.projectHealth=null,s.projectRunHistory=[],s.projectDigest=null,X();return}(async()=>{try{let n=await Cn(e);s.projectMonitorPolicy=n.monitor_policy||null,s.projectPolicyLoadedFor=e,await Me(e,!1),X()}catch(n){Q(n,"Failed to load project setup.")}})()});a.projectDeleteConfirm.addEventListener("input",()=>{X()});yn(a.projectRegisterName,()=>a.projectRegisterButton.click());yn(a.projectRegisterPass,()=>a.projectRegisterButton.click());yn(a.projectAddName,()=>a.projectAddButton.click());yn(a.projectDeleteConfirm,()=>a.projectDeleteButton.click());a.runReportButton.addEventListener("click",()=>{Zn()});a.exportReportCsv.addEventListener("click",()=>{wi()});a.uploadButton.addEventListener("click",Xr);a.previewUploadButton.addEventListener("click",Jr);a.cancelUploadButton.addEventListener("click",()=>{a.uploadFile.value="",a.uploadPreviewStep.style.display="none",a.uploadPreviewBody.innerHTML="",a.uploadConfirmToolbar.style.display="none",a.uploadFeedback.textContent=""});a.exportOverviewJson.addEventListener("click",()=>{ut("jin-overview.json",{summary:xt(),status:s.status,anomalies:s.anomalies,scheduler:s.scheduler})});a.exportOverviewReport.addEventListener("click",()=>{Ie("jin-overview-brief.md",vs(),"text/markdown;charset=utf-8;")});a.exportOverviewHtml.addEventListener("click",()=>{Ie("jin-overview-brief.html",Ss(),"text/html;charset=utf-8;")});a.exportErrorsJson.addEventListener("click",()=>{ut("jin-errors.json",{generated_at:new Date().toISOString(),project:s.status?.project||null,filters:{search:s.errorSearch,status:s.errorStatusFilter,category:s.errorCategoryFilter,severity:s.errorSeverityFilter},errors:s.status?.recent_errors||[]})});a.exportErrorsReport.addEventListener("click",()=>{let e=(s.status?.recent_errors||[]).filter(t=>{let n=t.source.startsWith("scheduler")?"Scheduler":t.source.startsWith("router.upload")||t.source.startsWith("router.save_references")?"Upload":t.source.startsWith("router.save_config")||t.source.startsWith("config.")?"Configuration":t.source.startsWith("router.")||t.source.startsWith("middleware.")?"Runtime":"General",i=t.source.startsWith("scheduler")||t.source.startsWith("middleware.process_response")?"high":t.source.startsWith("router.status")||t.source.startsWith("router.endpoint_detail")?"medium":"low",r=`${t.source} ${t.message} ${t.hint||""} ${t.endpoint_path||""}`.toLowerCase();return(!s.errorSearch||r.includes(s.errorSearch.toLowerCase()))&&(!s.errorStatusFilter||(t.status||"open")===s.errorStatusFilter)&&(!s.errorCategoryFilter||n===s.errorCategoryFilter)&&(!s.errorSeverityFilter||i===s.errorSeverityFilter)});Ie("jin-errors-brief.md",["# Jin Error Brief","",`Project: ${s.status?.project?.name||"unknown"}`,`Root: ${s.status?.project?.root||"unknown"}`,`DB: ${s.status?.project?.db_path||"unknown"}`,"",...e.map(t=>[`## ${t.source}`,`- Message: ${t.message}`,`- Endpoint: ${t.endpoint_path||"workspace-level"}`,`- Created: ${t.created_at||"unknown"}`,`- Status: ${t.status||"open"}`,`- Hint: ${t.hint||"No remediation hint recorded."}`,`- Remediation: ${(t.remediation_steps||[]).join(" | ")||"No remediation steps recorded."}`,`- Detail: ${t.detail||"No extra detail recorded."}`,""].join("\\n"))].join("\\n"),"text/markdown;charset=utf-8;")});a.exportIncidents.addEventListener("click",()=>{let e=Bt(De()).map(t=>({id:t.id,endpoint_path:t.endpoint_path,kpi_field:t.kpi_field,status:t.status,severity:t.severity,confidence:t.confidence,actual_value:t.actual_value,baseline_used:t.baseline_used,pct_change:t.pct_change,detected_at:t.detected_at,note:t.note,owner:t.owner,resolution_reason:t.resolution_reason}));kt("jin-incidents.csv",e)});a.exportIncidentsJson.addEventListener("click",()=>{ut("jin-incidents.json",{generated_at:new Date().toISOString(),filters:{status:s.incidentStatusFilter,severity:s.incidentSeverityFilter,sort:s.incidentSort},incidents:nt()})});a.exportIncidentsReport.addEventListener("click",()=>{Ie("jin-incidents-brief.md",ws(),"text/markdown;charset=utf-8;")});a.exportIncidentsHtml.addEventListener("click",()=>{Ie("jin-incidents-brief.html",$s(),"text/html;charset=utf-8;")});a.exportUploads.addEventListener("click",()=>{if(!s.selectedApi)return;let e=Z(),t=pt(e?.upload_activity||[],s.uploadSort,"uploaded_at").map(n=>({uploaded_at:n.uploaded_at,grain_key:n.grain_key,kpi_field:n.kpi_field,expected_value:n.expected_value,tolerance_pct:n.tolerance_pct,upload_source:n.upload_source}));kt("jin-uploads.csv",t)});a.exportRuns.addEventListener("click",()=>{if(!s.selectedApi)return;let e=Z(),t=[...e?.monitoring_runs||[]].sort((i,r)=>String(r?.started_at||"").localeCompare(String(i?.started_at||""))),n=t.length?t.map(i=>({run_id:i.run_id,started_at:i.started_at,finished_at:i.finished_at,trigger:i.trigger,source:i.source,status:i.status,duration_ms:i.duration_ms,grains_processed:i.grains_processed,anomalies_detected:i.anomalies_detected,error:i.error})):pt(e?.recent_history||[],s.runSort,"observed_at").map(i=>({observed_at:i.observed_at,grain_key:i.grain_key,kpi_json:JSON.stringify(i.kpi_json||{})}));kt("jin-runs.csv",n)});a.exportRunsJson.addEventListener("click",()=>{if(!s.selectedApi)return;let e=Z(),t=[...e?.monitoring_runs||[]].sort((n,i)=>String(i?.started_at||"").localeCompare(String(n?.started_at||"")));ut("jin-runs.json",{endpoint_path:s.selectedApi,source:t.length?"run_ledger":"observation_history",sort:t.length?"started_at_desc":s.runSort,runs:t.length?t:pt(e?.recent_history||[],s.runSort,"observed_at")})});a.exportApiReport.addEventListener("click",()=>{if(!s.selectedApi)return;let e=Z();Ie(`jin-api-${he(s.selectedApi)}-brief.md`,bs(e),"text/markdown;charset=utf-8;")});a.exportApiHtml.addEventListener("click",()=>{if(!s.selectedApi)return;let e=Z();Ie(`jin-api-${he(s.selectedApi)}-brief.html`,_s(e),"text/html;charset=utf-8;")});a.saveNamedView.addEventListener("click",()=>{let e=(a.namedViewInput.value||"").trim();if(!e){w("Add a name before saving a view.","error");return}let t=xn();t.name=e,s.savedViews=[t,...(s.savedViews||[]).filter(n=>n.name!==e)].slice(0,12),jt(),Be(),a.namedViewInput.value="",w(`Saved view "${e}".`,"success")});function pa(){let e=wr(),t=xn();t.name=e,s.savedViews=[t,...(s.savedViews||[]).filter(n=>n.name!==e)].slice(0,12),jt(),Be(),w(`Saved browser view "${e}".`,"success")}a.exportNamedViews.addEventListener("click",()=>{ut("jin-named-views.json",{generated_at:new Date().toISOString(),operator_handle:Fe(s.operatorHandle||"default"),default_view_id:Gt()||null,views:s.savedViews||[]})});a.importNamedViewsButton.addEventListener("click",()=>{a.importNamedViewsFile.click()});a.importNamedViewsFile.addEventListener("change",async e=>{let n=e.target?.files?.[0];if(n)try{let i=await n.text(),r=JSON.parse(i),o=Array.isArray(r?.views)?r.views:[];s.savedViews=o.slice(0,12),jt(),r?.default_view_id&&localStorage.setItem(Jt(),String(r.default_view_id)),Be(),w(`Imported ${s.savedViews.length} saved view(s).`,"success")}catch{w("Failed to import saved views.","error")}finally{a.importNamedViewsFile.value=""}});a.bulkRun.addEventListener("click",Zr);a.bulkAction.addEventListener("change",Ve);a.drawerClose.addEventListener("click",Yt);a.drawerBackdrop.addEventListener("click",Yt);a.confirmCancel.addEventListener("click",Qt);a.confirmBackdrop.addEventListener("click",Qt);a.confirmAccept.addEventListener("click",async()=>{let e=s.confirmAction;Qt(),e&&await e()});window.openApi=et;window.incidentAction=hi;window.schedulerAction=yi;window.confirmIncident=ki;window.confirmDrawerIncident=da;window.confirmScheduler=xi;window.confirmError=function(t,n){Pt("Confirm error action",`Apply "${n}" to error ${t}?`,async()=>{await Wr(t,n)})};window.changePage=ca;window.saveIncidentNotes=Vr;window.saveOperatorHandle=vr;window.saveBrowserView=pa;window.moveApiBrowserColumn=ii;window.setApiBrowserColumnWidth=Vn;window.applyResolutionPreset=Ur;window.applyNamedView=async function(t){let n=(s.savedViews||[]).find(i=>Number(i.id)===Number(t));if(n){if(s.apiFilter=n.apiFilter||"",s.apiStatusFilter=n.apiStatusFilter||"",s.apiBrowserMode=n.apiBrowserMode||s.apiBrowserMode||"grouped",s.apiBrowserDensity=Ge(n.apiBrowserDensity||s.apiBrowserDensity||"comfortable"),s.apiBrowserSort=n.apiBrowserSort||s.apiBrowserSort||"path",s.apiBrowserSortDirection=n.apiBrowserSortDirection||s.apiBrowserSortDirection||"asc",s.apiBrowserColumns=ti(n.apiBrowserColumns),s.apiBrowserColumnOrder=Ot(n.apiBrowserColumnOrder),s.apiBrowserColumnWidths=vt(n.apiBrowserColumnWidths),s.apiBrowserPage=1,Qe(),s.errorSearch=n.errorSearch||"",s.errorStatusFilter=n.errorStatusFilter||"",s.errorCategoryFilter=n.errorCategoryFilter||"",s.errorSeverityFilter=n.errorSeverityFilter||"",s.incidentStatusFilter=n.incidentStatusFilter||"",s.incidentSeverityFilter=n.incidentSeverityFilter||"",s.incidentSort=n.incidentSort||"business",s.runSort=n.runSort||"observed_at_desc",s.uploadSort=n.uploadSort||"uploaded_at_desc",s.currentView=fn(n.currentView||"overview"),Kt(n.density||"comfortable"),a.apiSearch.value=s.apiFilter,a.apiStatusFilter.value=s.apiStatusFilter,a.errorSearch.value=s.errorSearch,a.errorStatusFilter.value=s.errorStatusFilter,a.errorCategoryFilter.value=s.errorCategoryFilter,a.errorSeverityFilter.value=s.errorSeverityFilter,a.incidentSort.value=s.incidentSort,oe(),ve("push"),X(),s.currentView==="api"&&s.selectedApi){let i=await mt(s.selectedApi);de(i)}w(`Applied saved view "${n.name}".`,"success")}};window.deleteNamedView=function(t){s.savedViews=(s.savedViews||[]).filter(n=>Number(n.id)!==Number(t)),jt(),Be(),w("Saved view deleted.","success")};window.setDefaultNamedView=function(t){localStorage.setItem(Jt(),String(t)),Be(),w("Default saved view updated.","success")};window.showIncident=function(t){let i=De().find(r=>Number(r.id)===Number(t));i&&Tt(i)};window.setView=function(t){s.currentView=fn(t),ve("push"),X(),s.currentView==="playbook"&&gn(!0).then(()=>{s.currentView==="playbook"&&X()}).catch(n=>{Q(n,"Failed to load PO playbook."),X()})};document.addEventListener("click",e=>{e.target.id==="activate-license-button"&&Or()});function ma(e,t,n){if(t==="kpi"&&(typeof n=="number"||!isNaN(parseFloat(n))&&isFinite(n)||w(`\u26A0\uFE0F "${e}" contains text. Metrics should usually be numbers. Jin will try to count occurrences instead.`,"info")),t==="time"){let i=String(n);i.match(/^\d{4}/)||i.match(/^\d{10,13}$/)||i.match(/^\[?"\d{4}/)||w(`\u26A0\uFE0F "${e}" doesn't look like a date. Monitoring might fail if we can't find a pulse.`,"warning")}}function ga(){return s.poMode!==!1}function fa(e){return ga()?(w(e,"info"),!0):!1}window.updateFieldRole=function(t,n){let i=Z();if(!i||!i.setup_config)return;let o=(i.recent_history||[]).map($=>Hn($)),l=o[0]?Re(o[0],t):null;ma(t,n,l),i.setup_config||(i.setup_config=JSON.parse(JSON.stringify(i.config||{dimension_fields:[],kpi_fields:[]})));let c=new Set(i.setup_config.dimension_fields||[]),d=new Set(i.setup_config.kpi_fields||[]),u=new Set(i.setup_config.excluded_fields||[]);c.delete(t),d.delete(t),u.delete(t),i.setup_config.time_field===t&&delete i.setup_config.time_field,n==="dimension"&&c.add(t),n==="kpi"&&d.add(t),n==="exclude"&&u.add(t),n==="time"&&(i.setup_config.time_field=t),i.setup_config.dimension_fields=[...c],i.setup_config.kpi_fields=[...d],i.setup_config.excluded_fields=[...u],de(i),(n==="time"||!i.setup_config.time_field)&&window.refreshTimePreview()};window.toggleConfigFieldFocus=function(t){let n=String(s.selectedApi||"").trim();if(!n)return;let i=!!s.configFocusExpandedByApi?.[n],r=typeof t=="boolean"?t:!i;s.configFocusExpandedByApi={...s.configFocusExpandedByApi||{},[n]:r};let o=Z();o&&de(o)};window.updateExtractionRule=function(t){let n=Z();n&&n.setup_config&&(n.setup_config.time_extraction_rule=t,window.refreshTimePreview())};window.toggleTimeSettings=function(t,n){n&&(n.preventDefault(),n.stopPropagation()),s.showTimeSettings||(s.showTimeSettings={}),s.showTimeSettings[t]=!s.showTimeSettings[t];let i=Z();i&&(_e(i.fields,i.setup_config,i.metrics),i.setup_config?.time_field===t&&window.refreshTimePreview())};window.refreshTimePreview=function(){let t=Z();if(!t||!t.setup_config)return;let n=Vt(t),i=Array.isArray(t.fields)?t.fields:[],r=String(t.setup_config.time_field||"").trim(),o=i.find(j=>String(j?.name||j||"").trim()===r)||null;s.timePreview=null,s.grainReason=null;let l=new Set;if(n.length>0){let j=n[0];for(let[k,M]of Object.entries(j))rt(M)&&l.add(k);(t.fields||[]).forEach(k=>{let M=String(k?.name||k||"").trim();if(!M)return;let v=Re(j,M);rt(v)&&l.add(M)})}s.detectedTimeSources=Array.from(l),xr(t,n);let c=t.setup_config.time_field;if(!c){s.timePreview="Choose your business time field (you can change it later).",s.grainReason="Select the column that represents business time.",_e(t.fields,t.setup_config,t.metrics);return}let d=t.setup_config.time_extraction_rule||"single",u=t.setup_config.time_pin||!1;if(!n.length){let j=o?.example;s.timePreview=j?`Model-selected time field "${c}": ${Ht(j)||String(j)}`:`Model-selected time field: ${c}`,s.grainReason="Pydantic response model selected this clock before traffic arrives.",s.detectedGrain=t.setup_config.time_granularity||s.detectedGrain||"day",_e(t.fields,t.setup_config,t.metrics);return}let $=n[0],A=Re($,c);if(A==null||A===""){let j=o?.example;if(j!=null&&j!==""){s.timePreview=`Model-selected example for "${c}": ${Ht(j)||String(j)}`,s.grainReason="Pydantic response model selected this clock before traffic arrives.",s.detectedGrain=t.setup_config.time_granularity||s.detectedGrain||"day",_e(t.fields,t.setup_config,t.metrics);return}s.timePreview=`Model-selected time field: ${c}`,s.grainReason="Pydantic response model selected this clock before traffic arrives.",s.detectedGrain=t.setup_config.time_granularity||s.detectedGrain||"day",_e(t.fields,t.setup_config,t.metrics);return}if(!u&&n.length>0){let j=A;if(Array.isArray(j)&&j.length===2&&d!=="range"){let v=new Date(j[0]).getTime(),C=new Date(j[1]).getTime();if(!isNaN(v)&&!isNaN(C)){t.setup_config.time_extraction_rule="range",window.refreshTimePreview();return}}let k="day",M="Daily Heartbeat detected.";if(d==="range"&&Array.isArray(j)&&j.length===2){let v=new Date(j[0]).getTime(),C=new Date(j[1]).getTime(),R=Math.abs(C-v)/(1e3*60*60*24);R>=27&&R<=32?(k="month",M="1-month Range window."):R>=6&&R<=8?(k="week",M="7-day Weekly window."):(k="day",M=`Custom ${Math.round(R)}-day Window.`)}else if(n.length>=2){let v=Re(n[0],c),C=Re(n[1],c),R=Array.isArray(v)?new Date(v[0]).getTime():new Date(v).getTime(),T=Array.isArray(C)?new Date(C[0]).getTime():new Date(C).getTime();if(!isNaN(R)&&!isNaN(T)){let E=Math.abs(R-T)/864e5;E>=.9&&E<=1.1?(k="day",M="Confirmed Daily Pulse."):E>=6&&E<=8?(k="week",M="Confirmed Weekly Pulse."):E>=28&&E<=31&&(k="month",M="Confirmed Monthly Pulse.")}}s.detectedGrain=k,s.grainReason=M,t.setup_config.time_granularity=k}else u&&(s.detectedGrain=t.setup_config.time_granularity,s.grainReason="Frequency is Pinned (Locked).");let N="";if(d==="range")if(Array.isArray(A)&&A.length>=2){let j=Ht(A[0])||String(A[0]),k=Ht(A[1])||String(A[1]);N=`Range: [${j} -> ${k}]`}else N="Range mode needs two date values";else{let j=Array.isArray(A)?A:[A],k=d==="last"?j[j.length-1]:j[0],M=Ht(k)||String(k);N=`${d==="first"?"First":d==="last"?"Last":"Pulse"}: ${M}`}s.timePreview=N;let H=document.getElementById("time-preview-val");H&&(H.innerText=s.timePreview||"No timeline preview yet"),_e(t.fields,t.setup_config,t.metrics)};window.pinGrain=function(){let t=Z();t&&t.setup_config&&(t.setup_config.time_pin=!t.setup_config.time_pin,window.refreshTimePreview())};window.selectTimeSource=function(t){let n=Z();n&&n.setup_config&&(n.setup_config.time_field=t,s.detectedTimeSources=[],window.refreshTimePreview())};window.runMagicGuess=function(t=!1){let n=Z();if(!n||!n.fields||!n.setup_config)return;let i=String(n.endpoint_path||s.selectedApi||"").trim();if(!i)return;n.response_model_present===!1&&w("No response_model detected. Jin will infer fields from runtime traffic and samples.","info");let r=kr(n),o=ot(n.fields||n.schema_contract?.fields||[]),l=o.ready;if(((n.setup_config.dimension_fields?.length||0)>0||(n.setup_config.kpi_fields?.length||0)>0||n.setup_config.time_field)&&!t){Rn(i,{headline:"Setup already exists.",details:"You can still edit roles manually if your business logic changed.",hasSuggestions:!0}),_e(n.fields,n.setup_config,n.metrics);return}let d=Vt(n),u=o.candidateCount>0,$=[],A=[],N=r.timeField||null;if(u&&(r.dimensionFields.forEach(x=>$.push(x)),r.kpiFields.forEach(x=>A.push(x))),!u){if(!d.length){Rn(i,{headline:"Model needs clearer fields.",details:o.detail||"Jin found the response model, but it does not expose clear Segment, Metric, or Time candidates yet. Add typed fields or examples so setup can be pre-filled.",hasSuggestions:!1}),_e(n.fields,n.setup_config,n.metrics),w("Add clearer typed fields or examples to make auto-suggest work from the API model.","info");return}n.fields.forEach(x=>{let y=x.name,P=y.toLowerCase(),_=String(x?.annotation||x?.type||"").toLowerCase(),V=ai(d,y);if(!N){if(Wn(x)||_==="datetime"||_==="date"){N=y;return}if(P.includes("date")||P.includes("time")||P.includes("period")||P.includes("at")){N=y;return}if(V.length===0&&rt(x?.example)){N=y;return}if(V.length>0&&V.every(I=>{let F=String(I);return F.match(/^\d{4}-\d{2}-\d{2}/)||F.match(/^\d{10,13}$/)})&&V.length>0){N=y;return}}if(V.length===0)return;let f=V.filter(g=>typeof g=="number"||!isNaN(parseFloat(g))&&isFinite(g));if(f.length===V.length&&V.length>0){let g=f.map(L=>typeof L=="number"?L:parseFloat(L)),I=Math.min(...g);if(Math.max(...g)>I){A.push(y);return}else if(["amount","value","total","count","sum","price","quantity","qty","rsv","sales"].some(O=>P.includes(O))){A.push(y);return}}let m=V.filter(g=>typeof g=="string");if(m.length>0){let g=new Set(m).size;if(g/m.length<.8||g<=10){$.push(y);return}if(["id","name","type","category","region","country","brand","retailer","store","channel"].some(L=>P.includes(L))){$.push(y);return}}})}let H=new Set(n.setup_config.dimension_fields||[]),j=new Set(n.setup_config.kpi_fields||[]);$.forEach(x=>H.add(x)),A.forEach(x=>j.add(x)),!n.setup_config.time_field&&N&&(n.setup_config.time_field=N),n.setup_config.dimension_fields=[...H],n.setup_config.kpi_fields=[...j],window.refreshTimePreview(),u||window.scrubNoise();let k=n.setup_config.dimension_fields||[],M=n.setup_config.kpi_fields||[],v=k.length?k.slice(0,3).join(", "):"none",C=M.length?M.slice(0,3).join(", "):"none",R=n.setup_config.time_field?String(n.setup_config.time_field):"not selected",T=l?"Suggested setup is ready from the Pydantic response model.":"Suggested setup is partially ready from the Pydantic model.",E=l?`Segments: ${v}. Metrics: ${C}. ${n.setup_config.time_field?`Time field: ${R}.`:"Choose a Time field from the model if this API is time-based."}`:`${o.summary} ${o.detail} Segments: ${v}. Metrics: ${C}. ${n.setup_config.time_field?`Time field: ${R}.`:"Time field not selected yet."}`.trim();Rn(i,{headline:T,details:E,hasSuggestions:k.length>0||M.length>0||!!n.setup_config.time_field}),_e(n.fields,n.setup_config,n.metrics),w(u?"Auto-suggest filled setup from the API model.":"Auto-suggest updated segment and metric choices from recent data.","success")};window.scrubNoise=function(){let t=Z();if(!t||!t.fields||!t.setup_config)return;let n=Vt(t);if(n.length<5)return;let i=new Set(t.setup_config.excluded_fields||[]),r=0;t.fields.forEach(o=>{let l=o.name;if(t.setup_config?.dimension_fields?.includes(l)||t.setup_config?.kpi_fields?.includes(l)||t.setup_config?.time_field===l)return;let c=n.map(N=>Re(N,l)).filter(N=>N!=null).map(N=>String(N));if(!c.length)return;let u=new Set(c).size/c.length,$=c[0]||"",A=$.length>20||$.match(/[a-f0-9]{8}-/)||l.toLowerCase().includes("id")||l.toLowerCase().includes("trace")||l.toLowerCase().includes("request");u>.8&&A&&(i.add(l),r++)}),r>0&&(t.setup_config.excluded_fields=[...i],_e(t.fields,t.setup_config,t.metrics),w(`\u{1F9F9} Noise Scrubber: Auto-hidden ${r} system fields (UUIDs/IDs).`,"info"))};window.detectDrift=function(){let t=Z();if(!t||!t.fields||!t.setup_config)return;let n=Vt(t);if(n.length<3)return;let i=new Set(t.fields.map(d=>d.name)),r=[...t.setup_config.dimension_fields||[],...t.setup_config.kpi_fields||[]],o=r.filter(d=>!i.has(d)),l=t.fields.map(d=>d.name).filter(d=>!r.includes(d)&&!t.setup_config?.excluded_fields?.includes(d)&&d!==t.setup_config?.time_field);if(o.length===0||l.length===0){s.driftSuggestions={};return}let c={};o.forEach(d=>{l.forEach(u=>{ha(d,u,n)&&(c[u]=d)})}),s.driftSuggestions=c,Object.keys(c).length>0&&_e(t.fields,t.setup_config,t.metrics)};function ha(e,t,n){let i=n.map(c=>Re(c,e)).filter(c=>c!==void 0),r=n.map(c=>Re(c,t)).filter(c=>c!==void 0);if(r.length===0)return!1;let o=typeof i[0],l=typeof r[0];if(o!==l)return!1;if(o==="number"){let c=Math.max(...i),d=Math.max(...r);if(Math.abs(c-d)/Math.max(c,1)<.2)return!0}if(o==="string"){let c=i.reduce((u,$)=>u+String($).length,0)/i.length,d=r.reduce((u,$)=>u+String($).length,0)/r.length;if(Math.abs(c-d)<2)return!0}return!1}window.approveDriftMerge=function(t,n){if(fa("PO Mode is ON. Turn it off to apply drift merges manually."))return;let i=Z();!i||!i.setup_config||(i.setup_config.dimension_fields?.includes(n)&&(i.setup_config.dimension_fields=i.setup_config.dimension_fields.map(r=>r===n?t:r)),i.setup_config.kpi_fields?.includes(n)&&(i.setup_config.kpi_fields=i.setup_config.kpi_fields.map(r=>r===n?t:r)),s.driftSuggestions={},_e(i.fields,i.setup_config,i.metrics),w(`\u{1F9EC} Drift Protection: Successfully self-healed "${n}" to "${t}".`))};window.updateGranularity=function(t){let n=Z();n&&n.setup_config&&(n.setup_config.time_granularity=t)};async function ya(){if(!s.selectedApi)return;let e=s.selectedApi;w("Seeding targets from recent averages...","success");try{let t=await fetch(`/jin/api/v2/promote-baseline/${he(e)}`,{method:"POST"}),n=await t.json();t.ok?(w("Targets seeded from recent data.","success"),s.detailCache.delete(e),await et(e)):w(n.detail||"Promotion failed.","error")}catch{w("Network error seeding targets.","error")}}window.magicBaseline=ya;async function va(e){w(`Accepting actual value as new target for issue ${e}...`,"success");let t=document.getElementById("drawer-note")?.value||"",n=document.getElementById("drawer-resolution-reason")?.value||"Accepted as correct target by operator";try{let i=await fetch(`/jin/api/v2/anomaly/${e}/promote`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({note:t,resolution_reason:n})}),r=await i.json();if(i.ok)w("Target updated and issue resolved.","success"),fe(`Issue ${e} accepted as target and resolved.`,"success"),Yt(),await ce(!0);else{let o=r.message||"Promotion failed.";w(o,"error"),fe(`Could not accept target for issue ${e}.`,"error")}}catch{w("Network error promoting issue into targets.","error"),fe(`Network error while accepting target for issue ${e}.`,"error")}}window.quickFixBaseline=va;async function wa(){let e=s.selectedIncident;if(!e||!Number.isFinite(Number(e.id))){w("Open an issue first.","error");return}let t=Number(e.id);w("Generating an explanation...","success");try{let n=await fetch(`/jin/api/v2/anomaly/${t}/ai-explain`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({})}),i=await n.json();if(n.ok){let r=i?.anomaly||{},o=String(i?.ai_explanation||r?.ai_explanation||r?.why_flagged||"No explanation available."),l={...e,...r,ai_explanation:o,why_flagged:String(i?.why_flagged||o)};Tt(l),w("AI explanation added to the alert.","success"),fe("AI explanation generated for this issue.","success")}else{let r=String(i?.detail||i?.message||"AI explanation failed.");w(r,"error"),fe(r,"error")}}catch{w("Network error generating the explanation.","error"),fe("Could not reach the AI explanation endpoint.","error")}}window.investigateWithAi=wa;async function ba(e){let t=String(e||"").trim();if(!t){w("Project could not be focused.","error");return}if(String(s.activeProjectId||"").trim()===t){G("That project is already active.","info"),w("Project is already active.","success");return}try{await en(t),s.activeProjectId=t,s.detailCache.clear(),s.selectedApi=null,s.apiWorkspaceOpen=!1,await ze(!0),await ce(!1);let i=we();await Me(i,!1),X(),G("Focused the selected portfolio project.","success"),w("Portfolio project focused.","success")}catch{w("Could not focus that project.","error"),G("Could not switch to the selected project.","error")}}window.focusPortfolioProject=ba;function Ne(e,t="push"){let n=Yn(e),i=s.currentView!=="api";s.currentView="api",s.currentApiTab=n,ve(t),i&&X();let r=Z();if(r){de(r),(n==="uploads"||n==="history")&&s.selectedApi&&pn(s.selectedApi);return}s.selectedApi&&Ze(s.selectedApi).then(o=>{o&&(s.activeApiDetail=o,de(o),(n==="uploads"||n==="history")&&pn(s.selectedApi||""))})}window.switchApiTab=Ne;window.openKpiSummary=function(){Ne("summary","push"),requestAnimationFrame(()=>{let t=document.getElementById("api-kpis");t&&t.scrollIntoView({behavior:"smooth",block:"start"})})};function Ai(){hn(),Ne("uploads"),requestAnimationFrame(()=>{let e=document.querySelector('[data-api-section="uploads"]');e&&e.scrollIntoView({behavior:"smooth",block:"start"});let t=document.getElementById("upload-file");t&&t.focus()})}window.openUploadsTab=Ai;window.refreshConfigStory=()=>{let e=Z();e&&_e(e.fields,e.setup_config||e.config||{},e.metrics)};function Sa(){[a.incidentsFeedback,a.uploadFeedback,a.configFeedback,a.reportsFeedback,a.projectWorkflowFeedback].forEach(e=>{e.setAttribute("role","status"),e.setAttribute("aria-live","polite")}),a.confirmModal.setAttribute("role","dialog"),a.confirmModal.setAttribute("aria-modal","true"),a.drawer.setAttribute("role","dialog"),a.drawer.setAttribute("aria-modal","true")}async function $a(){Sa();let e=localStorage.getItem(Nn),t=localStorage.getItem(Xs)==="1";s.poMode=t?e!=="off":!1,t||localStorage.setItem(Nn,"off"),a.poModeToggle.checked=s.poMode!==!1,Sn(localStorage.getItem("jin-theme")||"dark"),Kt(localStorage.getItem("jin-density")||"comfortable");let n=localStorage.getItem("jin-sidebar");vn(n?n==="collapsed":window.innerWidth<1180);let i=localStorage.getItem("jin-api-browser-mode");if(s.apiFilter=localStorage.getItem("jin-api-filter")||"",s.apiStatusFilter=localStorage.getItem("jin-api-status-filter")||"",s.apiBrowserMode=i==="table"?"table":i==="compact"?"compact":"grouped",s.apiBrowserDensity=Ge(localStorage.getItem("jin-api-browser-density")||"comfortable"),s.apiBrowserSort=localStorage.getItem("jin-api-browser-sort")||"path",s.apiBrowserSortDirection=localStorage.getItem("jin-api-browser-sort-direction")==="desc"?"desc":"asc",s.apiBrowserColumns=ti((()=>{let d=localStorage.getItem("jin-api-browser-columns");if(!d)return null;try{return JSON.parse(d)}catch{return null}})()),s.apiBrowserColumnOrder=Ot((()=>{let d=localStorage.getItem("jin-api-browser-column-order");if(!d)return null;try{return JSON.parse(d)}catch{return null}})()),s.apiBrowserColumnWidths=vt((()=>{let d=localStorage.getItem("jin-api-browser-column-widths");if(!d)return null;try{return JSON.parse(d)}catch{return null}})()),s.apiBrowserPage=1,Qe(),s.errorSearch=localStorage.getItem("jin-error-search")||"",s.errorStatusFilter=localStorage.getItem("jin-error-status-filter")||"",s.errorCategoryFilter=localStorage.getItem("jin-error-category-filter")||"",s.errorSeverityFilter=localStorage.getItem("jin-error-severity-filter")||"",s.incidentStatusFilter=localStorage.getItem("jin-incident-status-filter")||"",s.incidentSeverityFilter=localStorage.getItem("jin-incident-severity-filter")||"",s.incidentSort=localStorage.getItem("jin-incident-sort")||"business",s.runSort=localStorage.getItem("jin-run-sort")||"observed_at_desc",s.uploadSort=localStorage.getItem("jin-upload-sort")||"uploaded_at_desc",s.defaultView=localStorage.getItem("jin-default-view")||"api",s.operatorHandle=Fe(localStorage.getItem("jin-operator-handle")||"default"),ei(),a.apiSearch.value=s.apiFilter,a.apiStatusFilter.value=s.apiStatusFilter,a.errorSearch.value=s.errorSearch,a.errorStatusFilter.value=s.errorStatusFilter,a.errorCategoryFilter.value=s.errorCategoryFilter,a.errorSeverityFilter.value=s.errorSeverityFilter,a.incidentSort.value=s.incidentSort,a.defaultViewSelect.value=s.defaultView,a.themeSelect.value=document.body.dataset.theme||"dark",di()&&(s.apiDataState="stale",s.apiDataMessage="Showing the last known API snapshot while reconnecting..."),await ce(!1),i||(s.apiBrowserMode="table",oe()),!localStorage.getItem("jin-api-browser-density")){let d=s.status?.endpoints?.length||0;s.apiBrowserDensity=br(d),oe()}if(Le())try{await ze(!0),await Me(we(),!1),s.projectsMonitorSnapshot=await Pn()}catch(d){Q(d,"Project workflow panel could not be initialized.")}let r=new URLSearchParams(window.location.search),o=r.has("y_view")||r.has("y_api")||r.has("y_tab"),l=Gt(),c=(s.savedViews||[]).find(d=>Number(d.id)===l);if(c&&!o){await window.applyNamedView(c.id),ve("replace");return}if(o)await fi();else if(s.currentView=s.defaultView||"api",X(),s.currentView==="api"&&s.selectedApi){let d=await Ze(s.selectedApi);d&&(s.activeApiDetail=d,de(d),(s.currentApiTab==="uploads"||s.currentApiTab==="history")&&await pn(s.selectedApi))}Be(),ve("replace")}window.addEventListener("unhandledrejection",e=>{Q(e.reason,"Unexpected async error."),e.preventDefault()});window.addEventListener("popstate",()=>{fi()});$a();})();
