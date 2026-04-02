import { ui } from './dom';
import type { DashboardState } from './types';

const state: DashboardState = {
      currentView: 'overview',
      currentApiTab: 'summary',
      selectedApi: null,
      selectedIncident: null,
      status: null,
      anomalies: null,
      scheduler: null,
      detailCache: new Map(),
      apiFilter: '',
      apiStatusFilter: '',
      errorSearch: '',
      errorStatusFilter: '',
      errorCategoryFilter: '',
      errorSeverityFilter: '',
      incidentStatusFilter: '',
      incidentSeverityFilter: '',
      collapsedGroups: {},
      incidentSort: 'business',
      confirmAction: null,
      incidentPage: 1,
      uploadPage: 1,
      runPage: 1,
      uploadSort: 'uploaded_at_desc',
      runSort: 'observed_at_desc',
      density: 'comfortable',
      defaultView: 'overview',
      lastReportData: [],
      savedViews: [],
      operatorHandle: '',
      activeApiDetail: null,
      projectsCatalog: [],
      activeProjectId: null,
      projectMonitorPolicy: null,
      projectHealth: null,
      projectsMonitorSnapshot: null,
      projectRunHistory: [],
      projectDigest: null,
      poPlaybook: null,
      projectWorkflowMessage: null,
      incidentsMessage: null,
      reportsMessage: null,
      projectPolicyLoadedFor: null,
      autoSuggestSummaryByApi: {},
      autoSuggestTriggeredByApi: {},
      coreInsightsByApi: {},
      poMode: false,
      configFocusExpandedByApi: {},
      activeUploadJobByApi: {},
      apiDataState: 'fresh',
      apiDataMessage: null,
      apiDataUpdatedAt: null,
    };

    function setSidebarCollapsed(collapsed: boolean) {
      document.body.dataset.sidebar = collapsed ? 'collapsed' : 'expanded';
      localStorage.setItem('jin-sidebar', collapsed ? 'collapsed' : 'expanded');
    }

    function fmt(value: any) {
      if (!value && value !== 0) return '—';
      if (typeof value === 'number') return Number.isInteger(value) ? String(value) : value.toFixed(2);
      return String(value);
    }

    function isFeatureEnabled(featureName: string): boolean {
      const features = state.status?.project?.policy?.features || [];
      return features.includes(featureName);
    }

    function fmtDate(value: any) {
      if (!value) return '—';
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return String(value);
      return date.toLocaleString();
    }

    function slug(value: any) {
      return encodeURIComponent(String(value || '').replace(/^\//, ''));
    }

    function fmtCurrency(value: number, currency: string = '$') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency === '$' ? 'USD' : currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value);
    }

    function normalizeOperatorHandle(value: unknown): string {
      const raw = String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9._-]+/g, '-')
        .replace(/^-+|-+$/g, '');
      return raw || 'default';
    }

    function currentOperatorHandle(): string {
      return normalizeOperatorHandle(state.operatorHandle || localStorage.getItem('jin-operator-handle') || 'default');
    }

    function namedViewsStorageKey(): string {
      return `jin-named-views:${currentOperatorHandle()}`;
    }

    function defaultNamedViewStorageKey(): string {
      return `jin-default-view-id:${currentOperatorHandle()}`;
    }

    function readDefaultNamedViewId(): number {
      const scoped = Number(localStorage.getItem(defaultNamedViewStorageKey()) || 0);
      if (Number.isFinite(scoped) && scoped > 0) return scoped;
      const legacy = Number(localStorage.getItem('jin-default-view-id') || 0);
      if (Number.isFinite(legacy) && legacy > 0) return legacy;
      return 0;
    }

    function setTheme(theme: string) {
      document.body.dataset.theme = theme;
      localStorage.setItem('jin-theme', theme);
      if (ui.themeSelect) ui.themeSelect.value = theme;
    }

    function setDensity(density: string) {
      state.density = density === 'dense' ? 'dense' : 'comfortable';
      document.body.dataset.density = state.density;
      localStorage.setItem('jin-density', state.density);
      if (ui.densitySelect) ui.densitySelect.value = state.density;
    }

    function inferSeverityClass(item: any) {
      return item?.severity === 'critical' ? 'critical' : item?.status || item?.severity || 'active';
    }

    function statCard(label: string, value: any, note: string) {
      return `
        <div class="metric">
          <span>${label}</span>
          <strong>${value}</strong>
          <small>${note}</small>
        </div>
      `;
    }

    function emptyState(message: string) {
      return `<div class="empty">${message}</div>`;
    }

    function currentEndpoints() {
      return (state.status?.endpoints || []).filter((item) => {
        const haystack = `${item.endpoint_path} ${item.http_method}`.toLowerCase();
        const matchesText = !state.apiFilter || haystack.includes(state.apiFilter.toLowerCase());
        const matchesStatus = !state.apiStatusFilter || (item.status || '') === state.apiStatusFilter;
        return matchesText && matchesStatus;
      });
    }

    function routeGroup(path: any) {
      const clean = String(path || '').replace(/^\//, '');
      const parts = clean.split('/');
      return parts[1] || parts[0] || 'other';
    }

    function paginate(items: any[], page: number, pageSize: number) {
      const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
      const safePage = Math.min(Math.max(page, 1), totalPages);
      return {
        items: items.slice((safePage - 1) * pageSize, safePage * pageSize),
        page: safePage,
        totalPages,
      };
    }

    function renderPagination(kind: string, page: number, totalPages: number) {
      if (totalPages <= 1) return '';
      return `
        <div class="pagination">
          <button class="action ghost" type="button" onclick="changePage('${kind}', -1)" ${page <= 1 ? 'disabled' : ''}>Prev</button>
          <span class="tiny">Page ${page} of ${totalPages}</span>
          <button class="action ghost" type="button" onclick="changePage('${kind}', 1)" ${page >= totalPages ? 'disabled' : ''}>Next</button>
        </div>
      `;
    }

    function downloadCsv(filename: string, rows: any[]) {
      if (!rows.length) {
        showToast('Nothing to export.', 'error');
        return;
      }
      const headers = Object.keys(rows[0]);
      const csv = [
        headers.join(','),
        ...rows.map((row) => headers.map((key) => {
          const value = row[key];
          const serialized = typeof value === 'string' ? value : JSON.stringify(value ?? '');
          const escaped = String(serialized).replace(/"/g, '""');
          return `"${escaped}"`;
        }).join(',')),
      ].join('\\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      showToast(`Exported ${filename}.`, 'success');
    }

    function downloadText(filename: string, content: string, mimeType = 'text/plain;charset=utf-8;') {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      showToast(`Exported ${filename}.`, 'success');
    }

    function downloadJson(filename: string, payload: any) {
      downloadText(filename, JSON.stringify(payload, null, 2), 'application/json;charset=utf-8;');
    }

    function persistPreferences() {
      localStorage.setItem('jin-api-filter', state.apiFilter || '');
      localStorage.setItem('jin-api-status-filter', state.apiStatusFilter || '');
      localStorage.setItem('jin-error-search', state.errorSearch || '');
      localStorage.setItem('jin-error-status-filter', state.errorStatusFilter || '');
      localStorage.setItem('jin-error-category-filter', state.errorCategoryFilter || '');
      localStorage.setItem('jin-error-severity-filter', state.errorSeverityFilter || '');
      localStorage.setItem('jin-incident-status-filter', state.incidentStatusFilter || '');
      localStorage.setItem('jin-incident-severity-filter', state.incidentSeverityFilter || '');
      localStorage.setItem('jin-incident-sort', state.incidentSort || 'business');
      localStorage.setItem('jin-run-sort', state.runSort || 'observed_at_desc');
      localStorage.setItem('jin-upload-sort', state.uploadSort || 'uploaded_at_desc');
      localStorage.setItem('jin-default-view', state.defaultView || 'overview');
    }

    function allIncidentRows() {
      const historyRows = Array.isArray(state.anomalies?.history) ? state.anomalies?.history : [];
      const activeRows = Array.isArray(state.anomalies?.anomalies) ? state.anomalies?.anomalies : [];
      const rows: any[] = [];
      const seen = new Map<string, number>();

      const rowKey = (item: any): string => {
        const numericId = Number(item?.id);
        if (Number.isFinite(numericId) && numericId > 0) return `id:${numericId}`;
        return [
          String(item?.endpoint_path || ''),
          String(item?.grain_key || ''),
          String(item?.kpi_field || ''),
          String(item?.detected_at || item?.resolved_at || ''),
          String(item?.detection_method || ''),
        ].join('|');
      };

      const upsert = (item: any) => {
        if (!item || typeof item !== 'object') return;
        const key = rowKey(item);
        const existingIndex = seen.get(key);
        if (existingIndex == null) {
          seen.set(key, rows.length);
          rows.push(item);
          return;
        }
        const existing = rows[existingIndex] || {};
        rows[existingIndex] = { ...existing, ...item };
      };

      historyRows.forEach(upsert);
      activeRows.forEach(upsert);
      return rows;
    }

    function incidentRows() {
      return sortIncidents(allIncidentRows()).filter((item) => {
        const matchesStatus = !state.incidentStatusFilter || (item.status || 'active') === state.incidentStatusFilter;
        const matchesSeverity = !state.incidentSeverityFilter || (item.severity || 'low') === state.incidentSeverityFilter;
        return matchesStatus && matchesSeverity;
      });
    }

    function reportSummary() {
      const endpoints = state.status?.endpoints || [];
      const incidents = state.anomalies?.history || [];
      const summary = state.status?.summary || {
        total_endpoints: 0,
        healthy: 0,
        anomalies: 0,
        unconfirmed: 0,
      };
      return {
        generated_at: new Date().toISOString(),
        endpoints_tracked: endpoints.length,
        healthy_endpoints: summary.healthy || 0,
        unconfirmed_endpoints: summary.unconfirmed || 0,
        active_incidents: (state.anomalies?.anomalies || []).length,
        selected_api: state.selectedApi || null,
      };
    }

    function namedViewPayload() {
      return {
        id: Date.now(),
        name: '',
        currentView: state.currentView,
        apiFilter: state.apiFilter,
        apiStatusFilter: state.apiStatusFilter,
        errorSearch: state.errorSearch,
        errorStatusFilter: state.errorStatusFilter,
        errorCategoryFilter: state.errorCategoryFilter,
        errorSeverityFilter: state.errorSeverityFilter,
        incidentStatusFilter: state.incidentStatusFilter,
        incidentSeverityFilter: state.incidentSeverityFilter,
        incidentSort: state.incidentSort,
        runSort: state.runSort,
        uploadSort: state.uploadSort,
        density: state.density,
      };
    }

    function saveNamedViews() {
      localStorage.setItem(namedViewsStorageKey(), JSON.stringify(state.savedViews || []));
    }

    function renderSavedViews() {
      if (!ui.savedViews) return;
      ui.savedViews.innerHTML = state.savedViews.length ? state.savedViews.map((view) => `
        <div class="saved-view-item">
          <div>
            <strong>${view.name}</strong>
            <div class="tiny">${view.currentView} • ${view.apiStatusFilter || 'all statuses'} • ${view.density || 'comfortable'} density</div>
          </div>
          <div class="toolbar compact">
            <button class="action secondary" type="button" onclick="applyNamedView(${view.id})">Apply</button>
            <button class="action secondary" type="button" onclick="setDefaultNamedView(${view.id})">${readDefaultNamedViewId() === Number(view.id) ? 'Default' : 'Make Default'}</button>
            <button class="action ghost" type="button" onclick="deleteNamedView(${view.id})">Delete</button>
          </div>
        </div>
      `).join('') : '<div class="empty">No saved views yet. Save a filter + workspace combination for faster operator workflows.</div>';
    }

    function sortRows(items: any[], mode: string, valueKey: string) {
      const rows = [...items];
      if (mode === `${valueKey}_asc`) {
        rows.sort((a, b) => String(a[valueKey] || '').localeCompare(String(b[valueKey] || '')));
        return rows;
      }
      if (mode === `${valueKey}_desc`) {
        rows.sort((a, b) => String(b[valueKey] || '').localeCompare(String(a[valueKey] || '')));
        return rows;
      }
      if (mode === 'grain_asc') {
        rows.sort((a, b) => String(a.grain_key || '').localeCompare(String(b.grain_key || '')));
        return rows;
      }
      if (mode === 'grain_desc') {
        rows.sort((a, b) => String(b.grain_key || '').localeCompare(String(a.grain_key || '')));
        return rows;
      }
      if (mode === 'kpi_asc') {
        rows.sort((a, b) => String((a.kpi_field || a.kpi_json && Object.keys(a.kpi_json)[0]) || '').localeCompare(String((b.kpi_field || b.kpi_json && Object.keys(b.kpi_json)[0]) || '')));
        return rows;
      }
      return rows;
    }

    function renderApiSections() {
      const tabs = document.querySelectorAll('[data-api-tab]');
      const wizard = document.querySelector('.setup-wizard') as HTMLElement;
      
      // Sync Wizard state
      document.querySelectorAll('[data-wizard-step]').forEach((node: any) => {
          const step = node.dataset.wizardStep;
          node.classList.toggle('active', step === state.currentApiTab);
      });

      if (wizard) {
          // If we have refs and it's confirmed, we might want to hide the wizard eventually, 
          // but for now let's just make sure it stays visible if it's there.
          // Actually, if it's summary and we HAVE references, we don't strictly NEED the wizard, 
          // but we can keep it as a status indicator.
      }

      if (!tabs.length) {
        document.querySelectorAll('[data-api-section]').forEach((node: any) => node.classList.add('active'));
        return;
      }

      document.querySelectorAll('[data-api-section]').forEach((node: any) => {
        const section = node.dataset.apiSection;
        const active = section === state.currentApiTab || (state.currentApiTab === 'summary' && (section === 'summary' || section === 'incidents' || section === 'history'));
        node.classList.toggle('active', active);
      });

      tabs.forEach((node: any) => {
          node.classList.toggle('active', node.dataset.apiTab === state.currentApiTab);
      });

      // Pulse the next big action
      const magicBtn = document.getElementById('magic-baseline-button');
      if (magicBtn) {
          magicBtn.classList.toggle('brand-glow', state.currentApiTab === 'uploads');
      }
    }

    function openIncidentDrawer(item) {
      state.selectedIncident = item;
      ui.drawerTitle.textContent = `${item.endpoint_path} • ${item.kpi_field}`;
      const timeline = item.timeline || [];
      const pctValue = Number(item.pct_change || 0);
      const absPct = Math.abs(pctValue);
      const isHigher = pctValue > 0;
      const confidenceRaw = Number(item.confidence);
      const confidence = Number.isFinite(confidenceRaw) ? Math.round(confidenceRaw * 100) : null;
      const confidenceLine = confidence == null
        ? 'Confidence is not available yet (still learning this pattern).'
        : `Confidence: ${confidence}%.`;
      const statusLabelMap = {
        active: 'Needs review',
        acknowledged: 'In review',
        snoozed: 'Snoozed',
        suppressed: 'Suppressed',
        resolved: 'Resolved',
      };
      const severityLabelMap = {
        critical: 'High',
        high: 'High',
        medium: 'Medium',
        low: 'Low',
      };
      const detectedText = item.detected_at ? fmtDate(item.detected_at) : 'Not recorded yet';
      const plainDirection = pctValue === 0 ? 'equal' : (isHigher ? 'higher' : 'lower');
      const endpointPathEscaped = String(item.endpoint_path).replace(/'/g, "\\\\'");
      
      const humanMessage = absPct >= 40 
        ? `<strong>Major ${isHigher ? 'increase' : 'drop'}</strong> compared to the baseline.`
        : `<strong>${isHigher ? 'Higher' : 'Lower'}</strong> than expected.`;

      ui.drawerBody.innerHTML = `
        <div class="row-card drawer-quick-summary">
          <strong>What happened</strong>
          <ul class="drawer-bullets">
            <li><strong>${item.kpi_field}</strong> is ${fmt(absPct)}% ${plainDirection} than the expected value.</li>
            <li>Expected <strong>${fmt(item.baseline_used)}</strong>, API returned <strong>${fmt(item.actual_value)}</strong>.</li>
            <li>${confidenceLine}</li>
          </ul>
        </div>

        <div class="comparison-card">
          <div class="comparison-side">
            <div class="comparison-label">Expected</div>
            <div class="comparison-value">${fmt(item.baseline_used)}</div>
            <div class="comparison-hint">Based on ${item.config_source === 'reference' ? 'your uploaded file' : 'historical learning'}</div>
          </div>
          <div class="comparison-side reality">
            <div class="comparison-label">Reality</div>
            <div class="comparison-value anomaly-ink">${fmt(item.actual_value)}</div>
            <div class="comparison-hint">Observed in latest run</div>
          </div>
        </div>

        ${Number(item.impact) > 0 ? `
          <div class="impact-card">
            <div class="impact-header">
              <span class="impact-icon">💰</span>
              <strong>Estimated impact</strong>
            </div>
            <div class="impact-value">${fmtCurrency(item.impact, item.currency || '$')}</div>
            <div class="impact-hint">Potential loss/risk for this grain.</div>
          </div>
        ` : ''}

        <div class="drift-indicator">
          <span>Difference: ${fmt(pctValue)}%</span>
          <div class="drift-bar-wrap">
            <div class="drift-bar-fill" style="width: ${Math.min(100, absPct)}%"></div>
          </div>
        </div>

        <div class="business-explanation">
          ${humanMessage} ${confidence == null ? 'Jin is still building confidence for this pattern.' : `Jin is <strong>${confidence}% confident</strong> this is a real anomaly.`}
        </div>

        <div class="callout" style="margin-top:20px;">
          <div><strong>Why this alert appeared</strong></div>
          <div style="margin-top:6px;">${item.why_flagged || item.ai_explanation || 'No explanation available.'}</div>
        </div>

        <div class="meta-grid">
          <div class="meta-card"><strong>Status</strong><span>${statusLabelMap[item.status] || item.status || 'Needs review'}</span></div>
          <div class="meta-card"><strong>Priority</strong><span>${severityLabelMap[item.severity] || item.severity || 'Medium'}</span></div>
          <div class="meta-card"><strong>Owner</strong><span>${item.owner || 'Unassigned'}</span></div>
          <div class="meta-card"><strong>Detected</strong><span>${detectedText}</span></div>
          <div class="meta-card"><strong>Change details</strong><span>${item.change_since_last_healthy_run || `${item.kpi_field} moved by ${fmt(pctValue)}% from baseline.`}</span></div>
        </div>

        ${item.sample_json ? `
          <details class="simple-section nested">
            <summary>Technical details</summary>
            <div class="simple-section-body">
              <div class="tiny muted" style="margin-bottom:8px;">Raw payload that triggered this alert.</div>
              <pre class="code-block" style="background:rgba(0,0,0,0.2); padding:10px; border-radius:6px; font-size:11px; max-height:200px; overflow:auto; border:1px solid var(--line);">${fmt(item.sample_json)}</pre>
            </div>
          </details>
        ` : ''}

        <div class="suggestion-toolbar">
          <div class="tiny" style="margin-bottom:8px; font-weight:700; color:var(--ink-soft); text-transform:uppercase; letter-spacing:0.05em;">Recommended next step</div>

          <button class="action secondary" style="width:100%; justify-content:center;" type="button" onclick="quickFixBaseline(${item.id})">
            Accept ${fmt(item.actual_value)} as new baseline
          </button>
          <div class="tiny muted" style="margin-top:6px;">Use this only if this new value is expected going forward.</div>

          <div class="${isFeatureEnabled('ai_chat') ? '' : 'feature-locked'}" style="margin-top:8px;">
            <button class="action" style="width:100%; justify-content:center; background:var(--panel-alt); color:var(--ink);" type="button" 
                    ${isFeatureEnabled('ai_chat') ? 'onclick="investigateWithAi()"' : ''}>
              ${isFeatureEnabled('ai_chat') ? '✨ Explain this alert with AI' : '✨ Explain this alert with AI <span class="feature-lock-badge">BUSINESS</span>'}
            </button>
          </div>
        </div>

        <details class="simple-section nested">
          <summary>Timeline</summary>
          <div class="simple-section-body">
            <div class="history-list" style="margin-top:10px;">
              ${timeline.length ? timeline.map((entry) => `
                <div class="history-item">
                  <strong>${entry.event_type || 'event'}</strong>
                  <div class="tiny">${fmtDate(entry.created_at)}</div>
                  ${entry.owner ? `<div class="tiny muted">Owner: ${entry.owner}</div>` : ''}
                  <div class="muted" style="margin-top:4px;">${entry.note || entry.resolution_reason || 'No note recorded.'}</div>
                </div>
              `).join('') : '<div class="empty">No incident events recorded yet.</div>'}
            </div>
          </div>
        </details>

        <section class="simple-section nested drawer-notes-section">
          <div class="drawer-section-head">Notes And Ownership</div>
          <div class="simple-section-body drawer-notes-body">
            <div class="drawer-notes">
              <div class="tiny muted drawer-notes-hint">Use this for handoff context or before resolving.</div>
              <textarea id="drawer-note" placeholder="What did you validate? Any business context?">${item.note || ''}</textarea>
              <label>
                Owner
                <input id="drawer-owner" type="text" value="${item.owner || ''}" placeholder="Assign an owner (for example: po-oncall)" />
              </label>
              <label>
                Resolution reason
                <input id="drawer-resolution-reason" type="text" value="${item.resolution_reason || ''}" placeholder="Why are you changing or resolving this incident?" />
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
                <button class="action secondary" type="button" onclick="saveIncidentNotes(${item.id})">Save Notes</button>
              </div>
            </div>
          </div>
        </section>
        <div class="drawer-primary-actions">
          <button class="action secondary" type="button" onclick="confirmDrawerIncident(${item.id}, 'acknowledged', 0)">Mark In Review</button>
          <button class="action secondary" type="button" onclick="quickFixBaseline(${item.id})">Accept as Baseline</button>
          <button class="action warn" type="button" onclick="confirmDrawerIncident(${item.id}, 'resolved', 0)">Resolve</button>
        </div>
        <details class="simple-section nested">
          <summary>More actions</summary>
          <div class="simple-section-body">
            <div class="toolbar">
              <button class="action secondary" type="button" onclick="confirmDrawerIncident(${item.id}, 'snoozed', 60)">Snooze 60m</button>
              <button class="action secondary" type="button" onclick="confirmDrawerIncident(${item.id}, 'suppressed', 60)">Suppress 60m</button>
              <button class="action ghost" type="button" onclick="openApi('${endpointPathEscaped}')">Open API</button>
            </div>
          </div>
        </details>
      `;
      ui.drawerBackdrop.classList.add('open');
      ui.drawer.classList.add('open');
      ui.drawerBody.scrollTop = 0;
    }

    function closeIncidentDrawer() {
      state.selectedIncident = null;
      ui.drawerBackdrop.classList.remove('open');
      ui.drawer.classList.remove('open');
    }

    function showToast(message, kind = 'success') {
      const toast = document.createElement('div');
      toast.className = `toast ${kind}`;
      toast.textContent = message;
      ui.toastStack.appendChild(toast);
      setTimeout(() => {
        toast.remove();
      }, 2600);
    }

    function openConfirm(title, copy, action) {
      state.confirmAction = action;
      ui.confirmTitle.textContent = title;
      ui.confirmCopy.textContent = copy;
      ui.confirmBackdrop.classList.add('open');
      ui.confirmModal.classList.add('open');
    }

    function closeConfirm() {
      state.confirmAction = null;
      ui.confirmBackdrop.classList.remove('open');
      ui.confirmModal.classList.remove('open');
    }

    function severityRank(item) {
      const map = { critical: 4, high: 3, medium: 2, low: 1 };
      return map[item?.severity] || 0;
    }

    function normalizedConfidence(item: any): number {
      const raw = Number(item?.confidence);
      if (!Number.isFinite(raw)) return 0;
      const pct = raw <= 1 ? raw * 100 : raw;
      return Math.max(0, Math.min(100, pct));
    }

    function incidentImpactValue(item: any): number {
      const raw = Number(item?.impact);
      return Number.isFinite(raw) ? Math.max(0, Math.abs(raw)) : 0;
    }

    function businessPriorityScore(item: any): number {
      const severity = severityRank(item) * 20;
      const pctChange = Math.min(100, Math.abs(Number(item?.pct_change) || 0)) * 0.35;
      const confidence = normalizedConfidence(item) * 0.15;
      const impact = incidentImpactValue(item);
      const impactScore = impact <= 0 ? 0 : Math.min(40, Math.log10(impact + 1) * 10);
      const detectedAt = new Date(item?.detected_at || item?.resolved_at || '').getTime();
      const now = Date.now();
      const ageHours = Number.isFinite(detectedAt) ? Math.max(0, (now - detectedAt) / (1000 * 60 * 60)) : 9999;
      const recency = ageHours <= 24 ? 20 : ageHours <= 72 ? 12 : ageHours <= 168 ? 6 : 0;
      const status = String(item?.status || item?.incident_status || 'active').toLowerCase();
      const statusAdjustment = status === 'resolved' ? -100 : status === 'suppressed' ? -14 : status === 'snoozed' ? -10 : status === 'acknowledged' ? -5 : 0;
      return severity + pctChange + confidence + impactScore + recency + statusAdjustment;
    }

    function businessPriorityBreakdown(item: any): string[] {
      const parts: string[] = [];
      const severity = severityRank(item);
      if (severity > 0) parts.push(`severity ${severity}/4`);
      const pct = Math.abs(Number(item?.pct_change) || 0);
      parts.push(`drift ${Math.round(Math.min(100, pct))}%`);
      const confidence = Math.round(normalizedConfidence(item));
      if (confidence > 0) parts.push(`confidence ${confidence}%`);
      const impact = incidentImpactValue(item);
      if (impact > 0) {
        try {
          parts.push(`impact ${fmtCurrency(impact, item?.currency || '$')}`);
        } catch (_err) {
          parts.push(`impact ${impact.toFixed(2)}`);
        }
      }
      const status = String(item?.status || item?.incident_status || 'active').toLowerCase();
      if (status !== 'active') parts.push(`state ${status}`);
      return parts;
    }

    function incidentWhyThisMatters(item: any): string {
      const pct = Math.abs(Number(item?.pct_change) || 0);
      const impact = incidentImpactValue(item);
      const confidence = Math.round(normalizedConfidence(item));
      const reasons: string[] = [];

      if (impact > 0) {
        try {
          reasons.push(`Estimated impact ${fmtCurrency(impact, item?.currency || '$')}.`);
        } catch (_err) {
          reasons.push(`Estimated impact ${impact.toFixed(2)}.`);
        }
      }
      if (pct >= 75) reasons.push('Change magnitude is critical.');
      else if (pct >= 30) reasons.push('Change magnitude is high.');
      else if (pct >= 15) reasons.push('Change magnitude is medium.');
      else reasons.push('Change magnitude is currently low.');
      if (confidence > 0) reasons.push(`${confidence}% confidence this drift is real.`);
      if (item?.owner) reasons.push(`Owner: ${item.owner}.`);
      return reasons.join(' ');
    }

    function sortIncidents(items) {
      const rows = [...items];
      if (state.incidentSort === 'business') {
        rows.sort((a, b) => businessPriorityScore(b) - businessPriorityScore(a) || String(b.detected_at || '').localeCompare(String(a.detected_at || '')));
        return rows;
      }
      if (state.incidentSort === 'severity') {
        rows.sort((a, b) => severityRank(b) - severityRank(a) || String(b.detected_at || '').localeCompare(String(a.detected_at || '')));
        return rows;
      }
      if (state.incidentSort === 'status') {
        rows.sort((a, b) => String(a.status || '').localeCompare(String(b.status || '')) || String(b.detected_at || '').localeCompare(String(a.detected_at || '')));
        return rows;
      }
      rows.sort((a, b) => String(b.detected_at || b.resolved_at || '').localeCompare(String(a.detected_at || a.resolved_at || '')));
      return rows;
    }

export {
  state,
  ui,
  fmt,
  fmtDate,
  fmtCurrency,
  isFeatureEnabled,
  slug,
  setTheme,
  setSidebarCollapsed,
  setDensity,
  inferSeverityClass,
  statCard,
  emptyState,
  currentEndpoints,
  routeGroup,
  paginate,
  renderPagination,
  downloadCsv,
  downloadText,
  downloadJson,
  persistPreferences,
  allIncidentRows,
  incidentRows,
  reportSummary,
  namedViewPayload,
  saveNamedViews,
  renderSavedViews,
  sortRows,
  renderApiSections,
  openIncidentDrawer,
  closeIncidentDrawer,
  showToast,
  openConfirm,
  closeConfirm,
  severityRank,
  businessPriorityScore,
  businessPriorityBreakdown,
  incidentWhyThisMatters,
  namedViewsStorageKey,
  defaultNamedViewStorageKey,
  readDefaultNamedViewId,
  currentOperatorHandle,
  normalizeOperatorHandle,
  sortIncidents,
};
(window as any).renderApiSections = renderApiSections;
