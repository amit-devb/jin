import {
  allIncidentRows,
  closeConfirm,
  closeIncidentDrawer,
  defaultNamedViewStorageKey,
  downloadCsv,
  downloadJson,
  downloadText,
  fmt,
  incidentRows,
  namedViewsStorageKey,
  namedViewPayload,
  normalizeOperatorHandle,
  openConfirm,
  openIncidentDrawer,
  persistPreferences,
  readDefaultNamedViewId,
  renderApiSections,
  renderSavedViews,
  reportSummary,
  saveNamedViews,
  setSidebarCollapsed,
  setDensity,
  setTheme,
  showToast,
  slug,
  sortIncidents,
  sortRows,
  state,
  ui,
} from './core';
import {
  DashboardApiError,
  addProject,
  archiveProject,
  applyProjectMonitorPolicy,
  deleteProject,
  executiveDigest,
  fetchPoPlaybook,
  fetchDetail,
  fetchJson,
  getProjectMonitorPolicy,
  healthCheck,
  listProjectBundleRuns,
  listProjects,
  monitorProjects,
  promoteProjectBaseline,
  registerOperator,
  refreshAnomalies,
  refreshScheduler,
  refreshStatus,
  restoreProject,
  runProjectBundle,
  selectedApiDetail,
  selectProject,
  setProjectMonitorPolicy,
} from './api';
import {
  buildApiHtmlReport,
  buildApiReport,
  buildIncidentReport,
  buildIncidentsHtmlReport,
  buildOverviewHtmlReport,
  buildOverviewReport,
} from './reports';
import {
  renderApiDetail,
  renderErrors,
  renderFieldRoles,
  renderIncidents,
  renderOverview,
  renderPlaybook,
  renderScheduler,
  renderSidebar,
  renderSettings,
  renderReports,
} from './render';

const PO_MODE_PREF_KEY = 'jin-po-mode';
const PO_MODE_EXPLICIT_KEY = 'jin-po-mode-explicit';

function applyPoMode(nextValue: boolean, options: { explicit?: boolean; toast?: boolean } = {}): void {
  const checked = Boolean(nextValue);
  state.poMode = checked;
  localStorage.setItem(PO_MODE_PREF_KEY, checked ? 'on' : 'off');
  if (options.explicit !== false) {
    localStorage.setItem(PO_MODE_EXPLICIT_KEY, '1');
  }
  if (ui.poModeToggle.checked !== checked) {
    ui.poModeToggle.checked = checked;
  }
  if (state.selectedApi) {
    const detail = selectedApiDetail();
    if (detail) renderApiDetail(detail);
  }
  if (options.toast !== false) {
    showToast(
      checked
        ? 'PO Mode is ON. Advanced controls are simplified, but Segment/Metric/Exclude/Time editing stays available.'
        : 'PO Mode is OFF. Advanced setup controls are fully visible.',
      'success',
    );
  }
}

function clearIncidentFilters(options: { render?: boolean; persist?: boolean } = {}): void {
  state.incidentStatusFilter = '';
  state.incidentSeverityFilter = '';
  state.incidentPage = 1;
  if (options.persist !== false) {
    persistPreferences();
  }
  const statusSelect = document.getElementById('incident-status-select') as HTMLSelectElement | null;
  if (statusSelect) statusSelect.value = '';
  const severitySelect = document.getElementById('incident-severity-select') as HTMLSelectElement | null;
  if (severitySelect) severitySelect.value = '';
  if (options.render !== false) {
    renderIncidents();
  }
}

function parseNamedViews(raw: string | null): any[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return [];
  }
}

function loadNamedViewsForCurrentOperator(): void {
  const scopedViews = parseNamedViews(localStorage.getItem(namedViewsStorageKey()));
  if (scopedViews.length) {
    state.savedViews = scopedViews.slice(0, 12);
    return;
  }
  if (normalizeOperatorHandle(state.operatorHandle || 'default') === 'default') {
    state.savedViews = parseNamedViews(localStorage.getItem('jin-named-views')).slice(0, 12);
    return;
  }
  state.savedViews = [];
}

function activeOperatorOwner(): string | undefined {
  const handle = normalizeOperatorHandle(state.operatorHandle || localStorage.getItem('jin-operator-handle') || 'default');
  if (!handle || handle === 'default') return undefined;
  return handle;
}

function normalizeOwnerInput(value: unknown): string | undefined {
  const normalized = normalizeOperatorHandle(value || '');
  if (!normalized || normalized === 'default') return undefined;
  return normalized;
}

function saveOperatorHandle(): void {
  const input = document.getElementById('operator-handle-input') as HTMLInputElement | null;
  const nextHandle = normalizeOperatorHandle(input?.value || 'default');
  if (input) input.value = nextHandle;
  state.operatorHandle = nextHandle;
  localStorage.setItem('jin-operator-handle', nextHandle);
  loadNamedViewsForCurrentOperator();
  renderSavedViews();
  showToast(`Operator handle set to "${nextHandle}".`, 'success');
}

function flattenSample(row: any): any {
    if (!row) return {};
    const flat = { ...row };
    if (row.dimension_json) {
        if (typeof row.dimension_json === 'string') {
            try { Object.assign(flat, JSON.parse(row.dimension_json)); } catch(e) {}
        } else {
            Object.assign(flat, row.dimension_json);
        }
    }
    if (row.kpi_json) {
        if (typeof row.kpi_json === 'string') {
            try { Object.assign(flat, JSON.parse(row.kpi_json)); } catch(e) {}
        } else {
            Object.assign(flat, row.kpi_json);
        }
    }
    return flat;
}

function resolveSampleFieldValue(row: any, fieldPath: string): any {
  if (!row || !fieldPath) return undefined;
  if (Object.prototype.hasOwnProperty.call(row, fieldPath)) return row[fieldPath];

  const parts = String(fieldPath).split('.').filter(Boolean);
  if (!parts.length) return undefined;

  const walk = (node: any, index: number): any => {
    if (node == null) return undefined;
    if (index >= parts.length) return node;
    const part = parts[index];
    const isArrayPart = part.endsWith('[]');
    const key = isArrayPart ? part.slice(0, -2) : part;

    if (!isArrayPart) {
      return walk(node?.[key], index + 1);
    }

    const candidate = key ? node?.[key] : node;
    if (!Array.isArray(candidate) || !candidate.length) return undefined;
    if (index === parts.length - 1) return candidate;

    for (const item of candidate) {
      const resolved = walk(item, index + 1);
      if (resolved !== undefined && resolved !== null) return resolved;
    }
    return walk(candidate[0], index + 1);
  };

  return walk(row, 0);
}

function isLikelyTimeValue(value: any): boolean {
  if (value == null) return false;
  if (Array.isArray(value)) return value.some((item) => isLikelyTimeValue(item));
  const text = String(value).trim();
  if (!text) return false;
  if (/^\d{10,13}$/.test(text)) return true;
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return true;
  return !Number.isNaN(Date.parse(text));
}

function displayDateFromValue(value: any): string | null {
  if (value == null) return null;
  const text = String(value).trim();
  if (!text) return null;

  let date: Date;
  if (/^\d{10,13}$/.test(text)) {
    const numeric = Number(text);
    const millis = text.length <= 10 ? numeric * 1000 : numeric;
    date = new Date(millis);
  } else {
    date = new Date(text);
  }

  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().split('T')[0];
}

function setupSamples(detail: any): any[] {
  const history = Array.isArray(detail?.history) ? detail.history : [];
  const recent = Array.isArray(detail?.recent_history) ? detail.recent_history : [];
  const source = history.length ? history : recent;
  if (source.length) {
    const sorted = [...source].sort((a: any, b: any) => String(b?.observed_at || '').localeCompare(String(a?.observed_at || '')));
    return sorted.map((row: any) => flattenSample(row));
  }

  const schemaContract = detail?.schema_contract && typeof detail.schema_contract === 'object'
    ? detail.schema_contract
    : {};
  const explicitExampleRows = Array.isArray(schemaContract?.example_rows)
    ? schemaContract.example_rows.filter((row: any) => row && typeof row === 'object')
    : [];
  if (explicitExampleRows.length) {
    return explicitExampleRows.map((row: any) => flattenSample(row));
  }

  const candidateFields = Array.isArray(schemaContract?.fields)
    ? schemaContract.fields
    : (Array.isArray(detail?.fields) ? detail.fields : []);
  const exampleRow: Record<string, any> = {};
  candidateFields.forEach((field: any) => {
    if (!field || typeof field !== 'object') return;
    const fieldName = String(field?.name || '').trim();
    if (!fieldName) return;
    if (field?.example === undefined || field?.example === null) return;
    exampleRow[fieldName] = field.example;
  });
  return Object.keys(exampleRow).length ? [exampleRow] : [];
}

function setupFieldValues(samples: any[], fieldName: string): any[] {
  return samples
    .map((sample: any) => resolveSampleFieldValue(sample, fieldName))
    .filter((value: any) => value !== null && value !== undefined && value !== '');
}

function inferLikelyTimeField(detail: any, samples: any[]): string | null {
  const fields = Array.isArray(detail?.fields) ? detail.fields : [];
  const configuredDims = new Set((detail?.setup_config?.dimension_fields || []) as string[]);
  const candidates: Array<{ name: string; score: number }> = [];

  fields.forEach((field: any) => {
    const name = String(field?.name || field || '').trim();
    if (!name) return;
    const lower = name.toLowerCase();
    const annotation = String(field?.annotation || field?.type || '').toLowerCase();
    const sampleValue = samples.length ? resolveSampleFieldValue(samples[0], name) : undefined;

    let score = 0;
    if (annotation === 'datetime' || annotation === 'date') score += 7;
    if (
      lower.includes('snapshot')
      || lower.includes('timestamp')
      || lower.includes('created_at')
      || lower.includes('updated_at')
      || lower.includes('date')
      || lower.includes('time')
      || lower.endsWith('.period')
      || lower.endsWith('_period')
      || lower === 'period'
    ) {
      score += 4;
    }
    if (isLikelyTimeValue(sampleValue)) score += 4;
    if (configuredDims.has(name)) score += 1;

    if (score > 0) candidates.push({ name, score });
  });

  if (!candidates.length) return null;
  candidates.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  const top = candidates[0];
  return top.score >= 5 ? top.name : null;
}

function autoPromoteLikelyTimeField(detail: any, samples: any[]): boolean {
  if (!detail?.setup_config || detail.setup_config.time_field) return false;
  const timeField = inferLikelyTimeField(detail, samples);
  if (!timeField) return false;

  detail.setup_config.time_field = timeField;
  detail.setup_config.dimension_fields = (detail.setup_config.dimension_fields || []).filter((name: string) => name !== timeField);
  detail.setup_config.kpi_fields = (detail.setup_config.kpi_fields || []).filter((name: string) => name !== timeField);
  detail.setup_config.excluded_fields = (detail.setup_config.excluded_fields || []).filter((name: string) => name !== timeField);
  return true;
}

function hasStrictTimeCandidate(detail: any, samples: any[]): boolean {
  const fields = Array.isArray(detail?.fields) ? detail.fields : [];
  if (!fields.length) return false;
  return fields.some((field: any) => {
    const name = String(field?.name || field || '').trim();
    if (!name) return false;
    const lower = name.toLowerCase();
    const annotation = String(field?.annotation || field?.type || '').toLowerCase();
    if (annotation === 'datetime' || annotation === 'date') return true;
    if (
      lower.includes('time')
      || lower.includes('date')
      || lower.includes('timestamp')
      || lower.includes('created_at')
      || lower.includes('updated_at')
      || lower.includes('period')
    ) {
      return true;
    }
    const values = setupFieldValues(samples, name);
    return values.some((value: any) => isLikelyTimeValue(value));
  });
}

function setupRequiresTimeField(detail: any, setup: any): boolean {
  if (setup?.time_required === false) return false;
  const selectedTime = String(setup?.time_field || '').trim();
  if (selectedTime) return true;
  const samples = setupSamples(detail);
  if (inferLikelyTimeField(detail, samples)) return true;
  return hasStrictTimeCandidate(detail, samples);
}


function closestButton(target: EventTarget | null, selector: string): HTMLButtonElement | null {
  return target instanceof Element ? target.closest(selector) as HTMLButtonElement | null : null;
}

let lastNetworkToastAt = 0;
const STATUS_CACHE_KEY = 'jin-status-cache-v2';

function errorMessage(error: unknown): string {
  if (!error) return 'Unknown error';
  if (error instanceof DashboardApiError) return error.message;
  if (error instanceof Error) return error.message;
  return String(error);
}

function isConnectivityIssue(error: unknown): boolean {
  const text = errorMessage(error).toLowerCase();
  return (
    text.includes('failed to fetch')
    || text.includes('connection reset')
    || text.includes('network')
    || text.includes('timed out')
    || text.includes('timeout')
    || text.includes('abort')
  );
}

function notifyAsyncError(error: unknown, fallback = 'Request failed.'): void {
  const message = errorMessage(error) || fallback;
  if (isConnectivityIssue(error)) {
    const now = Date.now();
    if (now - lastNetworkToastAt > 3000) {
      showToast('Jin backend is temporarily unreachable. Retrying may help after the server stabilizes.', 'error');
      lastNetworkToastAt = now;
    }
    return;
  }
  showToast(message || fallback, 'error');
}

function classifyStatusRefreshFailure(error: unknown): {
  state: 'unavailable' | 'auth_required' | 'error';
  message: string;
} {
  if (isConnectivityIssue(error)) {
    return {
      state: 'unavailable',
      message: 'Cannot reach Jin backend. Start or restart your app to load APIs.',
    };
  }
  if (error instanceof DashboardApiError) {
    if (error.status === 401 || error.status === 403) {
      return {
        state: 'auth_required',
        message: 'Authentication expired. Sign in again to load APIs.',
      };
    }
    if (typeof error.status === 'number') {
      return {
        state: 'error',
        message: `Jin backend returned ${error.status} while loading APIs. Retry and check logs if this continues.`,
      };
    }
  }
  return {
    state: 'error',
    message: 'Jin backend returned an unexpected error while loading APIs. Retry and check logs if this continues.',
  };
}

function cacheStatusSnapshot(): void {
  if (!state.status) return;
  try {
    localStorage.setItem(
      STATUS_CACHE_KEY,
      JSON.stringify({
        saved_at: new Date().toISOString(),
        payload: state.status,
      }),
    );
  } catch {
    // Ignore local storage errors.
  }
}

function restoreStatusSnapshotFromCache(): boolean {
  try {
    const raw = localStorage.getItem(STATUS_CACHE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || !parsed.payload) return false;
    state.status = parsed.payload;
    state.apiDataUpdatedAt = String(parsed.saved_at || '');
    return true;
  } catch {
    return false;
  }
}

function selectedProjectId(): string | null {
  const fromSelect = String(ui.projectActiveSelect.value || '').trim();
  if (fromSelect) return fromSelect;
  if (state.activeProjectId) return String(state.activeProjectId);
  const fallback = state.projectsCatalog?.find((item: any) => item.active && !item.is_archived)?.id
    || state.projectsCatalog?.find((item: any) => !item.is_archived)?.id
    || state.projectsCatalog?.[0]?.id;
  return fallback ? String(fallback) : null;
}

function selectedProjectRecord(projectId: string | null = selectedProjectId()): any | null {
  if (!projectId) return null;
  return state.projectsCatalog?.find((item: any) => String(item.id) === String(projectId)) || null;
}

function operationalProjectIdFromCatalog(): string | null {
  const activeId = String(state.activeProjectId || '').trim();
  if (activeId) {
    const active = state.projectsCatalog?.find((item: any) => String(item.id) === activeId);
    if (active && !active.is_archived) return activeId;
  }
  const fallback = state.projectsCatalog?.find((item: any) => !item.is_archived)?.id;
  return fallback ? String(fallback) : null;
}

function monitorPolicyFromUi() {
  const thresholdRaw = String(ui.projectPolicyThreshold.value || '').trim();
  const threshold = thresholdRaw ? Number(thresholdRaw) : null;
  return {
    cadence_template: String(ui.projectPolicyCadence.value || 'balanced'),
    schedule: String(ui.projectPolicySchedule.value || 'every 2h'),
    baseline_mode: String(ui.projectPolicyBaselineMode.value || 'fixed'),
    threshold: Number.isFinite(threshold as number) ? threshold : null,
    bundle_enabled: Boolean(ui.projectPolicyBundleEnabled.checked),
    bundle_schedule: String(ui.projectPolicyBundleSchedule.value || '').trim() || 'daily 09:00',
    bundle_report_format: String(ui.projectPolicyBundleFormat.value || 'markdown'),
  };
}

function trackedEndpointCount(): number {
  return Array.isArray(state.status?.endpoints) ? state.status.endpoints.length : 0;
}

function runnableWatchJobCount(): number {
  const jobs = Array.isArray(state.scheduler?.jobs) ? state.scheduler.jobs : [];
  return jobs.filter((job: any) => {
    const jobId = String(job?.job_id || '');
    if (!jobId || jobId.startsWith('jin:bundle:')) return false;
    const jobType = String(job?.job_type || '').toLowerCase();
    if (jobType && jobType !== 'watch') return false;
    const skipReason = String(job?.skip_reason || '');
    if (skipReason === 'missing_default_params' || skipReason === 'unsupported_schedule') return false;
    const endpointPath = String(job?.endpoint_path || job?.path || '').trim();
    if (!endpointPath) return false;
    return true;
  }).length;
}

function policyApplyBlockers(result: any): string[] {
  const rows = Array.isArray(result?.results) ? result.results : [];
  const reasons = new Set<string>();
  rows.forEach((row: any) => {
    if (!row || row.ok) return;
    const reason = String(row.reason || '').trim();
    if (!reason) return;
    reasons.add(reason);
  });
  const messages: string[] = [];
  if (reasons.has('missing_default_params')) {
    messages.push('Some APIs are missing default parameters. Open APIs and set watch defaults first.');
  }
  if (reasons.has('unsupported_schedule')) {
    messages.push('Setup contains an unsupported schedule format. Use every Nh, daily HH:MM, or weekly mon[,tue] HH:MM.');
  }
  if (reasons.has('endpoint_not_found')) {
    messages.push('Some APIs listed in setup are no longer available in this runtime.');
  }
  if (!messages.length && rows.some((row: any) => !row?.ok)) {
    messages.push('Some APIs could not be scheduled yet. Review API setup and retry.');
  }
  return messages;
}

async function refreshProjectsCatalog(loadPolicy = true): Promise<void> {
  const payload = await listProjects(true);
  const projects = payload.projects || [];
  state.projectsCatalog = projects;
  state.activeProjectId = String(
    payload.active_project_id
      || projects.find((item: any) => item.active && !item.is_archived)?.id
      || projects.find((item: any) => !item.is_archived)?.id
      || projects[0]?.id
      || '',
  ) || null;

  if (!loadPolicy) return;
  const selectedFromUi = String(ui.projectActiveSelect.value || '').trim();
  const selectedUiRecord = selectedFromUi
    ? projects.find((item: any) => String(item.id) === selectedFromUi)
    : null;
  const projectId = selectedUiRecord && !selectedUiRecord.is_archived
    ? selectedFromUi
    : operationalProjectIdFromCatalog();
  if (!projectId) {
    state.projectMonitorPolicy = null;
    state.projectPolicyLoadedFor = null;
    return;
  }
  const policyPayload = await getProjectMonitorPolicy(projectId);
  state.projectMonitorPolicy = policyPayload.monitor_policy || null;
  state.projectPolicyLoadedFor = projectId;
}

async function refreshProjectOperationalState(projectId: string | null, includeDigest = false): Promise<void> {
  if (!projectId) {
    state.projectHealth = null;
    state.projectRunHistory = [];
    if (includeDigest) state.projectDigest = null;
    return;
  }
  const [healthPayload, historyPayload] = await Promise.all([
    healthCheck(projectId),
    listProjectBundleRuns(projectId, 12),
  ]);
  state.projectHealth = healthPayload;
  state.projectRunHistory = historyPayload.runs || [];
  if (includeDigest) {
    state.projectDigest = await executiveDigest(projectId, 7, 200);
  }
}

async function ensurePoPlaybookLoaded(force = false): Promise<void> {
  if (state.poPlaybook && !force) return;
  state.poPlaybook = await fetchPoPlaybook();
}

async function runWithBusyButton(
  button: HTMLButtonElement,
  workingLabel: string,
  fn: () => Promise<void>,
): Promise<void> {
  const label = button.textContent || 'Run';
  button.disabled = true;
  button.textContent = workingLabel;
  try {
    await fn();
  } finally {
    button.disabled = false;
    button.textContent = label;
  }
}

function setProjectWorkflowMessage(text: string, kind: 'success' | 'error' | 'info' = 'info'): void {
  state.projectWorkflowMessage = { text, kind };
  renderShell();
}

function setIncidentsMessage(text: string, kind: 'success' | 'error' | 'info' = 'info'): void {
  state.incidentsMessage = { text, kind };
  if (state.currentView === 'incidents') renderIncidents();
}

function setReportsMessage(text: string, kind: 'success' | 'error' | 'info' = 'info'): void {
  state.reportsMessage = { text, kind };
  if (state.currentView === 'reports') renderReports();
}

function buildReportCsvRows(reportPack: any): any[] {
  const summaryPayload = reportPack?.summary || {};
  const digestPayload = reportPack?.digest || {};
  const endpointPayload = reportPack?.endpoint_report || reportPack?.endpointReport || null;
  const healthPayload = summaryPayload.health || {};
  const healthSummary = summaryPayload.summary || {};
  const activeAnomalies = Array.isArray(summaryPayload.active_anomalies) ? summaryPayload.active_anomalies : [];
  const digestTotals = digestPayload.totals || {};
  const endpointBaseline = endpointPayload?.baseline || {};
  const recommendation = Number(healthSummary.anomalies || 0) > 0
    ? 'Open Issues next and resolve high-priority changes before sharing this report.'
    : Number(healthSummary.unconfirmed || 0) > 0
      ? 'Open APIs next and finish setup for unconfirmed endpoints.'
      : 'Monitoring is stable. Share this report and keep the current baseline.';

  const rows: any[] = [
    {
      row_type: 'summary',
      generated_at: reportPack?.generated_at || new Date().toISOString(),
      report_scope: reportPack?.endpoint_path || 'all_tracked_apis',
      focus_note: reportPack?.focus || '',
      project_status: healthPayload.status || 'unknown',
      tracked_apis: Number(healthSummary.total_endpoints || 0),
      healthy_apis: Number(healthSummary.healthy || 0),
      open_issues: Number(healthSummary.anomalies || 0),
      setup_pending: Number(healthSummary.unconfirmed || 0),
      digest_runs_7d: Number(digestTotals.runs || 0),
      digest_success_7d: Number(digestTotals.success || 0),
      digest_errors_7d: Number(digestTotals.errors || 0),
      recommendation,
    },
  ];

  activeAnomalies.slice(0, 20).forEach((item: any, index: number) => {
    rows.push({
      row_type: 'top_issue',
      rank: index + 1,
      endpoint_path: String(item?.endpoint_path || ''),
      kpi_field: String(item?.kpi_field || ''),
      pct_change: Number(item?.pct_change || 0),
      expected_value: item?.expected_value ?? item?.baseline_used ?? '',
      actual_value: item?.actual_value ?? '',
      severity: String(item?.severity || ''),
      status: String(item?.status || ''),
    });
  });

  if (endpointPayload) {
    rows.push({
      row_type: 'endpoint_snapshot',
      endpoint_path: String(endpointPayload?.endpoint_path || reportPack?.endpoint_path || ''),
      endpoint_anomalies: Number(endpointPayload?.anomaly_count || 0),
      endpoint_baseline_rows: Number(endpointBaseline?.total_reference_rows || 0),
      endpoint_baseline_coverage_pct: Number(endpointBaseline?.coverage_pct || 0),
      endpoint_baseline_apis_with_data: Number(endpointBaseline?.endpoints_with_baseline || 0),
    });
  }

  return rows;
}

function formatBytes(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = value;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(size >= 100 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function setAutoSuggestSummary(
  endpointPath: string,
  payload: { headline: string; details: string; hasSuggestions: boolean },
): void {
  if (!endpointPath) return;
  const current = state.autoSuggestSummaryByApi || {};
  state.autoSuggestSummaryByApi = {
    ...current,
    [endpointPath]: {
      ...payload,
      updatedAt: new Date().toISOString(),
    },
  };
}

function setCoreInsight(
  endpointPath: string,
  payload: {
    title: string;
    summary: string;
    kind: 'success' | 'error' | 'info';
    actionType?: 'tab' | 'view';
    actionValue?: string;
    actionLabel?: string;
  },
): void {
  if (!endpointPath) return;
  const current = state.coreInsightsByApi || {};
  state.coreInsightsByApi = {
    ...current,
    [endpointPath]: {
      ...payload,
      updatedAt: new Date().toISOString(),
    },
  };
}

function setCheckInsightFromDetail(endpointPath: string, detail: any): void {
  const issues = (detail?.anomaly_history || []).filter((item: any) => String(item?.status || 'active') !== 'resolved');
  const hasBaseline = Boolean((detail?.upload_activity || []).length > 0);
  const recentRuns = Array.isArray(detail?.recent_history) ? detail.recent_history.length : 0;
  if (issues.length > 0) {
    setCoreInsight(endpointPath, {
      title: 'Insight: review active issues',
      summary: `${issues.length} issue${issues.length === 1 ? '' : 's'} are outside expected range after the latest check.`,
      kind: 'error',
      actionType: 'view',
      actionValue: 'incidents',
      actionLabel: 'Open Issues',
    });
    return;
  }
  if (!hasBaseline) {
    setCoreInsight(endpointPath, {
      title: 'Insight: baseline still needed',
      summary: 'Checks can run, but meaningful pass/fail insight needs an uploaded baseline for this API.',
      kind: 'info',
      actionType: 'tab',
      actionValue: 'uploads',
      actionLabel: 'Set Baseline',
    });
    return;
  }
  if (recentRuns === 0) {
    setCoreInsight(endpointPath, {
      title: 'Insight: waiting for first run',
      summary: 'Setup is saved. Trigger a check to create the first monitoring result.',
      kind: 'info',
      actionType: 'tab',
      actionValue: 'history',
      actionLabel: 'Open Checks',
    });
    return;
  }
  setCoreInsight(endpointPath, {
    title: 'Insight: monitoring is stable',
    summary: 'Latest check stayed within target. Continue monitoring and review this page for new changes.',
    kind: 'success',
    actionType: 'view',
    actionValue: 'overview',
    actionLabel: 'Open Overview',
  });
}

function setUploadInsightFromAnalysis(endpointPath: string, analysis: any, imported = 0): void {
  const verdict = String(analysis?.verdict || '').toLowerCase();
  const mismatched = Number(analysis?.mismatch_runs || 0);
  const matched = Number(analysis?.matched_runs || 0);
  const failed = Number(analysis?.failed_runs || 0);
  const issuesSync = analysis?.issues_sync && typeof analysis.issues_sync === 'object' ? analysis.issues_sync : null;
  const autoIssuesCreated = Number(issuesSync?.created || 0);
  const autoIssuesUpdated = Number(issuesSync?.updated || 0);
  const autoIssueText = autoIssuesCreated > 0
    ? ` ${autoIssuesCreated} mismatch${autoIssuesCreated === 1 ? '' : 'es'} were added to Issues automatically.`
    : (
      autoIssuesUpdated > 0
        ? ` ${autoIssuesUpdated} existing mismatch issue${autoIssuesUpdated === 1 ? '' : 's'} were refreshed in Issues.`
        : ''
    );
  if (verdict === 'matched' && mismatched === 0 && failed === 0) {
    setCoreInsight(endpointPath, {
      title: 'Insight: baseline upload is clean',
      summary: `Upload completed. ${matched} segment${matched === 1 ? '' : 's'} matched expected targets.`,
      kind: 'success',
      actionType: 'tab',
      actionValue: 'history',
      actionLabel: 'Review Checks',
    });
    return;
  }
  if (mismatched > 0) {
    setCoreInsight(endpointPath, {
      title: 'Insight: some segments need review',
      summary: `${mismatched} segment${mismatched === 1 ? '' : 's'} are outside expected targets after upload analysis.${autoIssueText}`,
      kind: 'error',
      actionType: 'view',
      actionValue: 'incidents',
      actionLabel: 'Open Issues',
    });
    return;
  }
  if (failed > 0) {
    setCoreInsight(endpointPath, {
      title: 'Insight: upload analysis had errors',
      summary: `${failed} segment${failed === 1 ? '' : 's'} could not be analyzed. Check upload details and retry if needed.`,
      kind: 'error',
      actionType: 'tab',
      actionValue: 'uploads',
      actionLabel: 'Review Upload',
    });
    return;
  }
  setCoreInsight(endpointPath, {
    title: 'Insight: upload finished',
    summary: `Imported ${imported} reference row${imported === 1 ? '' : 's'}. Run checks to validate against live responses.`,
    kind: 'info',
    actionType: 'tab',
    actionValue: 'history',
    actionLabel: 'Open Checks',
  });
}

function announceUploadIssueSync(analysis: any): void {
  const issuesSync = analysis?.issues_sync && typeof analysis.issues_sync === 'object' ? analysis.issues_sync : null;
  const created = Number(issuesSync?.created || 0);
  const updated = Number(issuesSync?.updated || 0);
  if (created > 0) {
    const message = `Added ${created} mismatch issue${created === 1 ? '' : 's'} to Issues automatically.`;
    showToast(message, 'success');
    setIncidentsMessage(message, 'success');
    return;
  }
  if (updated > 0) {
    const message = `Refreshed ${updated} existing mismatch issue${updated === 1 ? '' : 's'} in Issues automatically.`;
    showToast(message, 'info');
    setIncidentsMessage(message, 'info');
  }
}

const uploadPollingEndpoints = new Set<string>();
const dismissedUploadJobsByApi = new Map<string, string>();

function clearDismissedUploadJob(endpointPath: string): void {
  if (!endpointPath) return;
  dismissedUploadJobsByApi.delete(endpointPath);
}

function markDismissedUploadJob(endpointPath: string, jobId: string): void {
  if (!endpointPath || !jobId) return;
  dismissedUploadJobsByApi.set(endpointPath, jobId);
}

function isDismissedUploadJob(endpointPath: string, jobId: string): boolean {
  if (!endpointPath || !jobId) return false;
  return dismissedUploadJobsByApi.get(endpointPath) === jobId;
}

function uploadJobStorageKey(endpointPath: string): string {
  return `jin-upload-job:${endpointPath}`;
}

function rememberUploadJob(endpointPath: string, jobId: string): void {
  if (!endpointPath || !jobId) return;
  const current = state.activeUploadJobByApi || {};
  state.activeUploadJobByApi = { ...current, [endpointPath]: jobId };
  localStorage.setItem(uploadJobStorageKey(endpointPath), jobId);
}

function clearRememberedUploadJob(endpointPath: string): void {
  if (!endpointPath) return;
  const current = { ...(state.activeUploadJobByApi || {}) };
  delete current[endpointPath];
  state.activeUploadJobByApi = current;
  localStorage.removeItem(uploadJobStorageKey(endpointPath));
}

function uploadStageLabel(stage: string): string {
  switch (String(stage || '').toLowerCase()) {
    case 'queued':
      return 'Queued';
    case 'parsing':
      return 'Reading file';
    case 'validating':
      return 'Validating rows';
    case 'importing':
      return 'Saving baseline';
    case 'analyzing':
      return 'Running checks';
    case 'completed':
      return 'Completed';
    case 'failed':
      return 'Failed';
    default:
      return 'Processing upload';
  }
}

function uploadFollowupLabel(status: string): string {
  switch (String(status || '').toLowerCase()) {
    case 'queued':
      return 'Queued for deep validation';
    case 'running':
      return 'Deep validation in progress';
    case 'completed':
      return 'Deep validation complete';
    case 'failed':
      return 'Deep validation failed';
    default:
      return 'No deep validation';
  }
}

function parseJobTimestamp(value: unknown): number | null {
  const text = String(value || '').trim();
  if (!text) return null;
  const parsed = Date.parse(text);
  return Number.isFinite(parsed) ? parsed : null;
}

const STALE_UPLOAD_TRACKER_MS = 15_000;
const STALE_UPLOAD_FOLLOWUP_MS = 12_000;

async function startUploadJob(endpointPath: string, file: File): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  const response = await fetch(`/jin/api/v2/upload-async/${slug(endpointPath)}`, {
    method: 'POST',
    body: form,
  });
  const result = await response.json();
  if (!response.ok || !result?.job_id) {
    throw new Error(result?.error || result?.detail || 'Could not start upload job.');
  }
  return String(result.job_id);
}

async function fetchUploadJob(jobId: string): Promise<any> {
  const response = await fetch(`/jin/api/v2/upload-async/${encodeURIComponent(jobId)}`);
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.detail || payload?.error || 'Upload job status is unavailable.');
  }
  return payload;
}

async function maybeResumeUploadJob(endpointPath: string): Promise<void> {
  if (!endpointPath || uploadPollingEndpoints.has(endpointPath)) return;
  const activeJob = (state.activeUploadJobByApi || {})[endpointPath];
  const storedJob = localStorage.getItem(uploadJobStorageKey(endpointPath)) || '';
  let jobId = (activeJob || storedJob || '').trim();
  const now = Date.now();

  if (jobId) {
    if (isDismissedUploadJob(endpointPath, jobId)) {
      clearRememberedUploadJob(endpointPath);
      return;
    }
    try {
      const current = await fetchUploadJob(jobId);
      const status = String(current?.status || '').toLowerCase();
      const done = Boolean(current?.done) || status === 'completed' || status === 'failed';
      const updatedAt = parseJobTimestamp(current?.updated_at || current?.created_at);
      const tooOld = updatedAt !== null && (now - updatedAt) > 2 * 60 * 1000;
      const orphanRunning = (status === 'running' || status === 'queued') && !Boolean(current?.task_active) && tooOld;
      if (done || orphanRunning) {
        clearRememberedUploadJob(endpointPath);
        jobId = '';
      }
    } catch {
      clearRememberedUploadJob(endpointPath);
      jobId = '';
    }
  }

  if (!jobId) return;
  if (isDismissedUploadJob(endpointPath, jobId)) {
    clearRememberedUploadJob(endpointPath);
    return;
  }
  rememberUploadJob(endpointPath, jobId);
  void monitorUploadJob(endpointPath, jobId, { quiet: true });
}

async function handleUploadJobCompletion(endpointPath: string, result: any): Promise<void> {
  const imported = Number(result?.imported || 0);
  if (state.selectedApi === endpointPath) {
    ui.uploadFeedback.textContent = `Imported ${imported} reference rows.`;
  }
  showToast('Reference upload finished.', 'success');
  state.detailCache.delete(endpointPath);
  await refreshAll(true);

  (state as any).selectedUploadAnalysisAt = null;
  if (state.selectedApi === endpointPath) {
    switchApiTab('history', 'replace');
  }
  const analysis = result?.analysis || null;
  if (analysis) {
    const toastKind = analysis.verdict === 'matched' ? 'success' : 'error';
    showToast(analysis.summary_message || 'Upload analysis finished.', toastKind);
    const topError = analysis.errors && analysis.errors.length ? analysis.errors[0]?.error : null;
    if (topError) {
      showToast(`Analysis error: ${topError}`, 'error');
    }
    setUploadInsightFromAnalysis(endpointPath, analysis, imported);
    announceUploadIssueSync(analysis);
  } else {
    setCoreInsight(endpointPath, {
      title: 'Insight: upload completed',
      summary: `Imported ${imported} reference row${imported === 1 ? '' : 's'}. Run checks to compare live data against this baseline.`,
      kind: 'info',
      actionType: 'tab',
      actionValue: 'history',
      actionLabel: 'Open Checks',
    });
  }
  await refreshAll(true);
  if (state.selectedApi === endpointPath) {
    state.detailCache.delete(endpointPath);
    const detail = await fetchDetail(endpointPath);
    state.activeApiDetail = detail;
    renderApiDetail(detail);
  }
}

async function monitorUploadJob(endpointPath: string, jobId: string, options: { quiet?: boolean } = {}): Promise<void> {
  if (!endpointPath || !jobId || uploadPollingEndpoints.has(endpointPath)) return;
  uploadPollingEndpoints.add(endpointPath);
  rememberUploadJob(endpointPath, jobId);
  let completionHandled = false;
  let followupHandled = false;
  let completionHandledAt: number | null = null;
  if (state.selectedApi === endpointPath) {
    ui.uploadButton.disabled = true;
    ui.previewUploadButton.disabled = true;
  }
  const startTime = Date.now();
  try {
    while (true) {
      const job = await fetchUploadJob(jobId);
      const progress = Math.max(0, Math.min(100, Number(job?.progress_pct || 0)));
      const rows = Number(job?.rows_in_file || 0);
      const cols = Number(job?.columns_in_file || 0);
      const size = Number(job?.file_size_bytes || 0);
      const shapeSuffix = rows || cols || size
        ? ` • ${fmt(rows)} row(s) × ${fmt(cols)} column(s) • ${formatBytes(size)}`
        : '';
      if (state.selectedApi === endpointPath) {
        if (!completionHandled) {
          ui.uploadFeedback.textContent = `${uploadStageLabel(job?.stage || job?.status)} ${Math.round(progress)}%${shapeSuffix}`;
        } else {
          const followupStatus = String(job?.followup_status || 'not_requested');
          const followupMessage = String(job?.followup_message || '').trim();
          ui.uploadFeedback.textContent = followupMessage
            ? `${uploadFollowupLabel(followupStatus)} • ${followupMessage}`
            : uploadFollowupLabel(followupStatus);
        }
      }
      if (String(job?.status || '').toLowerCase() === 'failed') {
        clearRememberedUploadJob(endpointPath);
        clearDismissedUploadJob(endpointPath);
        const failure = job?.result || {};
        const message = String(
          failure?.error || job?.error || job?.message || 'Reference upload failed.'
        );
        if (state.selectedApi === endpointPath) {
          ui.uploadFeedback.textContent = message;
        }
        showToast(message, 'error');
        if (state.selectedApi === endpointPath) {
          await openApi(endpointPath, 'replace');
        } else {
          await refreshAll(true);
        }
        return;
      }
      const statusLower = String(job?.status || '').toLowerCase();
      const updatedAt = parseJobTimestamp(job?.updated_at || job?.created_at || job?.followup_started_at);
      const now = Date.now();
      const staleRunning = Boolean(
        (statusLower === 'running' || statusLower === 'queued')
        && !Boolean(job?.task_active)
        && (
          (updatedAt !== null && (now - updatedAt) > STALE_UPLOAD_TRACKER_MS)
          || (updatedAt === null && (now - startTime) > STALE_UPLOAD_TRACKER_MS)
        )
      );
      if (staleRunning) {
        markDismissedUploadJob(endpointPath, jobId);
        clearRememberedUploadJob(endpointPath);
        if (state.selectedApi === endpointPath) {
          ui.uploadFeedback.textContent = 'A stale upload tracker was cleared after restart. You can continue with Check file or start a fresh upload.';
        }
        if (!options.quiet) {
          showToast('Cleared a stale upload tracker from a previous server session.', 'info');
        }
        return;
      }
      if (job?.done || String(job?.status || '').toLowerCase() === 'completed') {
        const followupStatus = String(job?.followup_status || 'not_requested').toLowerCase();
        const followupTaskActive = Boolean(job?.followup_task_active);
        const followupMarkedRunning = followupStatus === 'queued' || followupStatus === 'running';
        const followupActive = followupTaskActive || followupMarkedRunning;
        const followupUpdatedAt = parseJobTimestamp(job?.updated_at || job?.followup_started_at || job?.created_at);
        const followupLikelyStale = Boolean(
          followupMarkedRunning
          && !followupTaskActive
          && (
            (followupUpdatedAt !== null && (Date.now() - followupUpdatedAt) > STALE_UPLOAD_FOLLOWUP_MS)
            || (
              followupUpdatedAt === null
              && completionHandledAt !== null
              && (Date.now() - completionHandledAt) > STALE_UPLOAD_FOLLOWUP_MS
            )
          )
        );
        if (!completionHandled) {
          await handleUploadJobCompletion(endpointPath, job?.result || {});
          completionHandled = true;
          completionHandledAt = Date.now();
          // Baseline import is done; keep "Check file" available even if deep validation continues.
          if (state.selectedApi === endpointPath) {
            ui.previewUploadButton.disabled = false;
          }
          if (followupActive) {
            showToast('Baseline imported. Running deep validation in the background.', 'success');
            await new Promise((resolve) => setTimeout(resolve, 2000));
            continue;
          }
          clearRememberedUploadJob(endpointPath);
          return;
        }
        if (followupLikelyStale) {
          clearRememberedUploadJob(endpointPath);
          markDismissedUploadJob(endpointPath, jobId);
          if (state.selectedApi === endpointPath) {
            ui.uploadFeedback.textContent = 'Baseline import completed. Deep validation tracker became stale; continue with Checks/Issues.';
          }
          if (!options.quiet) {
            showToast('Baseline import is complete. Deep validation tracking was stale, so live polling stopped.', 'info');
          }
          return;
        }
        if (followupActive) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
          continue;
        }
        clearRememberedUploadJob(endpointPath);
        clearDismissedUploadJob(endpointPath);
        if (!followupHandled && (followupStatus === 'completed' || followupStatus === 'failed')) {
          followupHandled = true;
          if (followupStatus === 'completed') {
            const fullAnalysis = job?.result?.full_analysis;
            if (fullAnalysis?.summary_message) {
              showToast(fullAnalysis.summary_message, fullAnalysis.verdict === 'matched' ? 'success' : 'error');
              const imported = Number(job?.result?.imported || 0);
              setUploadInsightFromAnalysis(endpointPath, fullAnalysis, imported);
              announceUploadIssueSync(fullAnalysis);
            } else {
              showToast('Deep validation finished.', 'success');
            }
          } else {
            const followupMessage = String(job?.followup_message || 'Deep validation failed.');
            showToast(followupMessage, 'error');
          }
          await refreshAll(true);
          if (state.selectedApi === endpointPath) {
            state.detailCache.delete(endpointPath);
            const detail = await fetchDetail(endpointPath);
            state.activeApiDetail = detail;
            renderApiDetail(detail);
          }
        }
        return;
      }
      if (Date.now() - startTime > 10 * 60 * 1000) {
        if (!options.quiet) {
          showToast('Upload is still running. You can keep working and return to this API anytime.', 'success');
        }
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, completionHandled ? 2000 : 850));
    }
  } catch (error) {
    if (!options.quiet) {
      notifyAsyncError(error, 'Could not monitor upload progress.');
    }
  } finally {
    uploadPollingEndpoints.delete(endpointPath);
    if (state.selectedApi === endpointPath) {
      ui.uploadButton.disabled = false;
      ui.previewUploadButton.disabled = false;
      ui.uploadButton.textContent = 'Confirm upload';
    }
  }
}

function escapeHtml(value: any): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function clickNavView(view: string): void {
  const button = document.querySelector(`#nav button[data-view="${view}"]`) as HTMLButtonElement | null;
  if (button) button.click();
}

function renderViewGuide(): void {
  let purpose = '';
  let note = '';
  let actionLabel = '';
  let actionKind: 'brand' | 'secondary' = 'brand';
  let action: null | (() => void | Promise<void>) = null;

  const endpoints = state.status?.endpoints || [];
  const unresolvedIssues = allIncidentRows().filter((item: any) => String(item.status || 'active') !== 'resolved');
  const firstUnresolved = unresolvedIssues[0] || null;
  const selectedStatus = endpoints.find((item) => item.endpoint_path === state.selectedApi) || null;
  const selectedDetail = selectedApiDetail();
  const selectedConfirmed = selectedDetail?.operator_metadata?.confirmed ?? selectedStatus?.confirmed ?? false;
  const selectedHasBaseline = Boolean(
    (selectedDetail?.upload_activity && selectedDetail.upload_activity.length > 0)
    || selectedStatus?.last_upload_at,
  );
  const selectedHasRuns = Boolean((selectedDetail?.recent_history || []).length);
  const selectedOpenIssues = (selectedDetail?.anomaly_history || [])
    .filter((item: any) => String(item?.status || 'active') !== 'resolved').length;
  const projectTier = String(state.status?.project?.tier || 'free').toLowerCase();
  const licenseEnforced = state.status?.project?.license_enforced !== false;
  const latestStorageRecovery = (state.status?.recent_errors || []).find((item: any) => (
    String(item?.source || '') === 'middleware.db'
    && /quarantin|corrupt/i.test(`${item?.message || ''} ${item?.hint || ''}`)
  )) || null;
  const storageHint = String(latestStorageRecovery?.hint || '');
  const storagePathMatch = storageHint.match(/Old DB moved to (.+?)\. Restore/i);
  const storagePath = storagePathMatch?.[1] || storageHint;
  const storageRecoveryNote = latestStorageRecovery
    ? `Storage recovery: Jin reset the local DB after an internal DuckDB error.${storagePath ? ` Backup: ${storagePath}` : ''}`
    : '';

  if (state.currentView === 'overview') {
    purpose = 'See overall data quality health and quickly choose where to act next.';
    if (unresolvedIssues.length > 0) {
      note = `${unresolvedIssues.length} issue${unresolvedIssues.length === 1 ? '' : 's'} still need review.`;
      actionLabel = 'Open Issues';
      action = () => clickNavView('incidents');
    } else {
      note = 'No active issues right now.';
      actionLabel = 'Open APIs';
      action = () => clickNavView('api');
    }
  } else if (state.currentView === 'playbook') {
    purpose = 'Use a guided PO flow: setup once, validate baselines, monitor drift, and report with confidence.';
    note = 'Start with setup workflow, then use Checks, Issues, and Reports for day-to-day operations.';
    actionLabel = 'Start With Register';
    action = () => {
      const registerInput = document.getElementById('project-register-name') as HTMLInputElement | null;
      if (registerInput) {
        registerInput.focus();
        registerInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    };
  } else if (state.currentView === 'api') {
    purpose = 'Configure one API, set baseline targets, and run checks for that endpoint.';
    if (!state.selectedApi) {
      if (endpoints.length) {
        note = 'Choose one API from the left list to continue.';
        actionLabel = 'Open First API';
        action = () => openApi(endpoints[0].endpoint_path);
      } else if (state.apiDataState === 'auth_required') {
        note = 'Your Jin session expired, so API discovery is paused.';
        actionLabel = 'Sign In';
        action = () => {
          window.location.href = '/jin/login?next=/jin';
        };
      } else if (state.apiDataState === 'error') {
        note = 'Jin returned an error while loading APIs.';
        actionLabel = 'Retry Connection';
        action = () => refreshAll(false);
      } else if (state.apiDataState === 'unavailable') {
        note = 'Cannot reach Jin backend right now, so API discovery is temporarily unavailable.';
        actionLabel = 'Retry Connection';
        action = () => refreshAll(false);
      } else {
        note = 'No APIs discovered yet.';
        actionLabel = 'Open PO Guide';
        action = () => clickNavView('playbook');
      }
    } else if (!selectedConfirmed) {
      note = `${state.selectedApi} still needs setup confirmation.`;
      actionLabel = 'Finish Setup';
      action = () => switchApiTab('configuration');
    } else if (!selectedHasBaseline) {
      note = `${state.selectedApi} has no uploaded baseline yet.`;
      actionLabel = 'Upload Baseline';
      action = () => openUploadsTab();
    } else if (!selectedHasRuns) {
      note = `${state.selectedApi} is configured and has baseline, but no check run yet.`;
      actionLabel = 'Open Monitor';
      action = () => switchApiTab('history');
    } else if (selectedOpenIssues > 0) {
      note = `${selectedOpenIssues} issue${selectedOpenIssues === 1 ? '' : 's'} need review for ${state.selectedApi}.`;
      actionLabel = 'Review Issues';
      action = () => clickNavView('incidents');
    } else {
      note = `${state.selectedApi} is stable after recent checks.`;
      actionLabel = 'Open Reports';
      action = () => {
        state.currentView = 'reports';
        syncBrowserRoute('push');
        renderShell();
        if (ui.reportEndpointSelect) {
          ui.reportEndpointSelect.value = state.selectedApi || '';
        }
      };
    }
  } else if (state.currentView === 'incidents') {
    purpose = 'Triage changes and decide: expected baseline, in review, or resolved.';
    if (firstUnresolved) {
      note = `${unresolvedIssues.length} unresolved issue${unresolvedIssues.length === 1 ? '' : 's'} currently open.`;
      actionLabel = 'Review Top Issue';
      action = () => openIncidentDrawer(firstUnresolved);
    } else {
      note = 'No unresolved issues right now.';
      actionLabel = 'Open APIs';
      action = () => clickNavView('api');
    }
  } else if (state.currentView === 'errors') {
    const recentErrors = state.status?.recent_errors || [];
    const openErrors = recentErrors.filter((item: any) => String(item.status || 'open') !== 'archived').length;
    purpose = 'Track runtime or scheduler failures and route them to the right owner quickly.';
    note = openErrors > 0
      ? `${openErrors} open error${openErrors === 1 ? '' : 's'} need acknowledgement or fixing.`
      : 'No open errors right now.';
    actionLabel = 'Back To Issues';
    actionKind = 'secondary';
    action = () => clickNavView('incidents');
  } else if (state.currentView === 'scheduler') {
    const jobs = state.scheduler?.jobs || [];
    purpose = 'Control scheduled monitoring runs: pause, resume, retry, or run now.';
    if (jobs.length > 0) {
      note = `${jobs.length} watch job${jobs.length === 1 ? '' : 's'} configured.`;
      actionLabel = 'Run First Watch Now';
      action = () => confirmScheduler(jobs[0].job_id, 'run');
    } else {
      note = 'No watch jobs found yet.';
      actionLabel = 'Open APIs';
      action = () => clickNavView('api');
    }
  } else if (state.currentView === 'reports') {
    purpose = 'Generate leadership-ready report packs with health, risk, and next steps.';
    const hasReportData = Array.isArray(state.lastReportData) && state.lastReportData.length > 0;
    if (!endpoints.length) {
      note = 'No tracked APIs yet. Call your APIs first.';
      actionLabel = 'Open APIs';
      action = () => clickNavView('api');
    } else if (!hasReportData) {
      note = 'Pick an API only if you want a focused endpoint snapshot.';
      actionLabel = 'Generate Report Pack';
      action = () => runReport();
    } else {
      note = 'Report pack is ready. Export CSV when this snapshot is ready to share.';
      actionLabel = 'Export CSV';
      action = () => exportReportCsv();
    }
  } else if (state.currentView === 'settings') {
    purpose = 'Manage licensing, security defaults, and workspace preferences.';
    if (!licenseEnforced) {
      note = 'Licensing is optional in this build. Focus on setup, monitoring, and issue triage first.';
      actionLabel = 'Open PO Guide';
      actionKind = 'secondary';
      action = () => clickNavView('playbook');
    } else if (projectTier === 'free') {
      note = 'Free tier supports one project; Business unlocks unlimited projects.';
      actionLabel = 'Activate Business License';
      action = () => {
        const input = document.getElementById('license-key-input') as HTMLInputElement | null;
        if (input) input.focus();
      };
    } else {
      note = 'Business is active. Review workflow setup for project operations.';
      actionLabel = 'Open PO Guide';
      actionKind = 'secondary';
      action = () => clickNavView('playbook');
    }
  } else {
    purpose = 'Use this workspace to keep data quality operations simple and repeatable.';
    actionLabel = 'Open Overview';
    action = () => clickNavView('overview');
  }

  ui.viewGuide.innerHTML = `
    <div class="view-guide-card">
      <div class="view-guide-copy">
        <div class="view-guide-eyebrow">What this page is for</div>
        <div class="view-guide-purpose">${escapeHtml(purpose)}</div>
        <div class="view-guide-next">Primary next action: ${escapeHtml(actionLabel || 'Review this page')}</div>
        ${storageRecoveryNote ? `<div class="view-guide-note" style="color:#fb7185;">${escapeHtml(storageRecoveryNote)}</div>` : ''}
        ${state.apiDataMessage ? `<div class="view-guide-note" style="color:#f59e0b;">${escapeHtml(state.apiDataMessage)}</div>` : ''}
        ${note ? `<div class="view-guide-note">${escapeHtml(note)}</div>` : ''}
      </div>
      ${actionLabel ? `<button class="action ${actionKind === 'secondary' ? 'secondary' : ''}" id="view-guide-action" type="button">${escapeHtml(actionLabel)}</button>` : ''}
    </div>
  `;

  const actionButton = document.getElementById('view-guide-action') as HTMLButtonElement | null;
  if (actionButton && action) {
    actionButton.onclick = () => {
      void Promise.resolve(action()).catch((error) => {
        notifyAsyncError(error, 'Primary action failed.');
      });
    };
  }
}

type HistoryMode = 'push' | 'replace' | 'none';

const DASHBOARD_VIEWS = new Set(['overview', 'playbook', 'api', 'incidents', 'errors', 'scheduler', 'settings', 'reports']);
const API_TABS = new Set(['summary', 'incidents', 'uploads', 'configuration', 'history']);

function normalizeView(value: unknown): string {
  const candidate = String(value || '').toLowerCase();
  if (DASHBOARD_VIEWS.has(candidate)) return candidate;
  return String(state.defaultView || 'api');
}

function normalizeApiTab(value: unknown): string {
  const candidate = String(value || '').toLowerCase();
  if (API_TABS.has(candidate)) return candidate;
  return 'summary';
}

function readRouteFromUrl(): { view: string; api: string | null; tab: string } {
  const params = new URLSearchParams(window.location.search);
  const api = params.get('y_api');
  return {
    view: normalizeView(params.get('y_view')),
    api: api && api.trim() ? api : null,
    tab: normalizeApiTab(params.get('y_tab')),
  };
}

function syncBrowserRoute(mode: HistoryMode = 'push'): void {
  if (mode === 'none') return;
  const url = new URL(window.location.href);
  url.searchParams.set('y_view', String(state.currentView || 'overview'));
  if (state.selectedApi) {
    url.searchParams.set('y_api', state.selectedApi);
  } else {
    url.searchParams.delete('y_api');
  }
  if (state.currentView === 'api') {
    url.searchParams.set('y_tab', String(state.currentApiTab || 'summary'));
  } else {
    url.searchParams.delete('y_tab');
  }

  const nextUrl = `${url.pathname}${url.search}${url.hash}`;
  const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (mode === 'push' && nextUrl === currentUrl) return;

  const statePayload = {
    jin: true,
    view: state.currentView,
    api: state.selectedApi,
    tab: state.currentApiTab,
  };
  if (mode === 'replace') {
    window.history.replaceState(statePayload, '', nextUrl);
  } else {
    window.history.pushState(statePayload, '', nextUrl);
  }
}

async function applyRouteFromUrl(): Promise<void> {
  const route = readRouteFromUrl();
  const endpointSet = new Set((state.status?.endpoints || []).map((item) => item.endpoint_path));
  if (route.api && endpointSet.has(route.api)) {
    state.selectedApi = route.api;
  } else if (!state.selectedApi) {
    state.selectedApi = state.status?.endpoints?.[0]?.endpoint_path || null;
  }
  state.currentView = normalizeView(route.view);
  state.currentApiTab = normalizeApiTab(route.tab);
  renderShell();
  if (state.currentView === 'api' && state.selectedApi) {
    const detail = await loadDetail(state.selectedApi);
    if (!detail) return;
    state.activeApiDetail = detail;
    renderApiDetail(detail);
    if (state.currentApiTab === 'uploads' || state.currentApiTab === 'history') {
      await maybeResumeUploadJob(state.selectedApi);
    }
  }
}

async function loadDetail(path: string): Promise<any | null> {
  try {
    return await fetchDetail(path);
  } catch (error) {
    notifyAsyncError(error, 'Failed to load API details.');
    return null;
  }
}

async function openApi(path: string, historyMode: HistoryMode = 'push') {
  state.selectedApi = path;
  (state as any).selectedUploadAnalysisAt = null;
  state.currentView = 'api';
  state.currentApiTab = 'summary';
  state.uploadPage = 1;
  state.runPage = 1;
  syncBrowserRoute(historyMode);
  renderShell();
  if (state.currentView === 'api' && state.selectedApi) {
    const detail = await loadDetail(path);
    if (!detail) return;
    state.activeApiDetail = detail;
    renderApiDetail(detail);
  }
}

async function activateLicense() {
  const input = document.getElementById('license-key-input') as HTMLInputElement;
  const feedback = document.getElementById('license-feedback');
  const key = input?.value.trim();

  if (!key) {
    showToast('Please enter a license key.', 'error');
    return;
  }

  showToast('Activating Business license...', 'success');
  if (feedback) feedback.textContent = 'Contacting server...';

  try {
    const response = await fetch('/jin/api/v2/license/activate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key }),
    });

    const result = await response.json();

    if (response.ok) {
      showToast('Business license activated successfully!', 'success');
      await refreshStatus();
      renderShell();
    } else {
      const errorMsg = result.detail || 'Activation failed.';
      showToast(errorMsg, 'error');
      if (feedback) {
        feedback.textContent = errorMsg;
        feedback.style.color = 'var(--danger-ink)';
      }
    }
  } catch (err) {
    showToast('Network error during activation.', 'error');
  }
}

function renderShell() {
  const viewTitles = {
    overview: ['Overview', 'Start here to see project health and decide where to go next.'],
    playbook: ['PO Guide', 'PO flow for setup, baseline targets, checks, issue triage, and report packs.'],
    api: ['APIs', state.selectedApi ? 'Pick one API, then follow Configure -> Baselines -> Checks.' : 'Pick one API, then follow Configure -> Baselines -> Checks.'],
    incidents: ['Issues', 'See the current issues and take the next step.'],
    errors: ['Errors', 'Problems and next steps.'],
    scheduler: ['Watches', 'See scheduled checks and run them when needed.'],
    settings: ['Settings', 'Choose display, security, and saved-view behavior.'],
    reports: ['Reports', 'Generate a PO-ready report pack with health, risks, and next actions.'],
  };
  document.querySelectorAll<HTMLElement>('.view').forEach((node) => node.classList.remove('active'));
  document.getElementById(`view-${state.currentView}`)?.classList.add('active');
  document.querySelectorAll<HTMLButtonElement>('#nav button').forEach((button) => {
    button.classList.toggle('active', button.dataset.view === state.currentView);
  });
  ui.pageTitle.textContent = (viewTitles as any)[state.currentView][0];
  ui.pageSubtitle.textContent = (viewTitles as any)[state.currentView][1];
  ui.topbar.style.display = ['api', 'incidents', 'scheduler'].includes(state.currentView) ? 'none' : 'block';
  const project = state.status?.project;
  const operatorHandle = normalizeOperatorHandle(state.operatorHandle || localStorage.getItem('jin-operator-handle') || 'default');
  state.operatorHandle = operatorHandle;
  ui.settingsSecurity.innerHTML = `
        <div class="muted">
          ${project?.auth_enabled ? 'Login is enabled with a project-local session.' : 'Login is off for this project.'}
        </div>
        ${project?.auth_uses_default_credentials
      ? '<div class="empty" style="margin-top:10px;">Default credentials are still active. Change them in <code>.env</code> before sharing this environment.</div>'
      : '<div class="tiny" style="margin-top:10px;">Use <code>JIN_PASSWORD_HASH</code> and <code>JIN_SESSION_SECRET</code> in <code>.env</code> for stronger local security.</div>'
    }
        <div class="control-grid" style="margin-top:12px;">
          <label>
            Operator handle
            <input id="operator-handle-input" type="text" value="${operatorHandle}" placeholder="for example: po-oncall" />
          </label>
          <div class="toolbar" style="margin-top:8px;">
            <button class="action secondary" id="operator-handle-save" type="button" onclick="saveOperatorHandle()">Save Handle</button>
          </div>
          <div class="tiny muted">Saved views and default triage view are scoped by this handle.</div>
        </div>
      `;
  renderViewGuide();
  renderSidebar();
  renderOverview();
  renderPlaybook();
  renderIncidents();
  renderErrors();
  renderScheduler();
  renderSettings();
  renderSavedViews();
  renderApiSections();
  renderReports();
  if (state.currentView !== 'api') {
    ui.apiWorkspace.style.display = state.selectedApi ? 'grid' : 'none';
    ui.apiEmpty.style.display = state.selectedApi ? 'none' : 'block';
  }
}

async function incidentAction(id: number, action: string, snoozeMinutes = 0) {
  const payload: any = { action };
  if (action === 'snoozed' || action === 'suppressed') payload.snooze_minutes = snoozeMinutes || 60;
  const noteInput = document.getElementById('drawer-note') as HTMLTextAreaElement | null;
  const ownerInput = document.getElementById('drawer-owner') as HTMLInputElement | null;
  const resolutionInput = document.getElementById('drawer-resolution-reason') as HTMLInputElement | null;
  if (state.selectedIncident && Number(state.selectedIncident.id) === Number(id)) {
    if (noteInput && noteInput.value) payload.note = noteInput.value;
    if (ownerInput) {
      const normalizedOwner = normalizeOwnerInput(ownerInput.value);
      if (normalizedOwner) {
        payload.owner = normalizedOwner;
        ownerInput.value = normalizedOwner;
      }
    }
    if (resolutionInput && resolutionInput.value) payload.resolution_reason = resolutionInput.value;
  }
  if (!payload.owner) payload.owner = normalizeOwnerInput(activeOperatorOwner());
  const response = await fetch(`/jin/api/v2/anomaly/${id}/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const label = action === 'acknowledged' ? 'marked in review' : `updated to ${action}`;
  if (response.ok) {
    const message = `Issue ${id} ${label}.`;
    showToast(message, 'success');
    setIncidentsMessage(message, 'success');
  } else {
    const message = `Failed to update issue ${id}.`;
    showToast(message, 'error');
    setIncidentsMessage(message, 'error');
  }
  await refreshAll(true);
}

async function saveIncidentNotes(id: number) {
  const note = (document.getElementById('drawer-note') as HTMLTextAreaElement | null)?.value || '';
  const ownerInput = document.getElementById('drawer-owner') as HTMLInputElement | null;
  const owner = normalizeOwnerInput(ownerInput?.value || '');
  if (ownerInput && owner) ownerInput.value = owner;
  const resolutionReason = (document.getElementById('drawer-resolution-reason') as HTMLInputElement | null)?.value || '';
  const response = await fetch(`/jin/api/v2/anomaly/${id}/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: state.selectedIncident?.status || 'active',
      note,
      owner: owner || normalizeOwnerInput(activeOperatorOwner()),
      resolution_reason: resolutionReason,
    }),
  });
  if (response.ok) {
    showToast('Issue notes saved.', 'success');
    setIncidentsMessage(`Notes saved for issue ${id}.`, 'success');
  } else {
    showToast('Failed to save issue notes.', 'error');
    setIncidentsMessage(`Could not save notes for issue ${id}.`, 'error');
  }
  await refreshAll(true);
  const updated = allIncidentRows().find((entry) => Number(entry.id) === Number(id));
  if (updated) openIncidentDrawer(updated);
}

function applyResolutionPreset(value: string) {
  const input = document.getElementById('drawer-resolution-reason') as HTMLInputElement | null;
  if (input) input.value = value;
}

async function schedulerAction(jobId: string, action: string) {
  const response = await fetch(`/jin/api/v2/scheduler/${encodeURIComponent(jobId)}/${action}`, { method: 'POST' });
  showToast(response.ok ? `Scheduler action ${action} applied.` : `Failed scheduler action ${action}.`, response.ok ? 'success' : 'error');
  await refreshScheduler();
  if (state.selectedApi) {
    state.detailCache.delete(state.selectedApi);
    await openApi(state.selectedApi);
  } else {
    renderShell();
  }
}

async function errorAction(id: number, action: string) {
  const response = await fetch(`/jin/api/v2/errors/${id}/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action }),
  });
  showToast(response.ok ? `Error ${id} updated to ${action}.` : `Failed to update error ${id}.`, response.ok ? 'success' : 'error');
  await refreshStatus();
  renderShell();
}

async function saveConfig() {
  if (!state.selectedApi) return;
  const detail = selectedApiDetail();
  if (!detail) return;
  const setup = detail.setup_config || detail.config || { dimension_fields: [], kpi_fields: [] };
  const dimensionFields = Array.isArray(setup.dimension_fields) ? setup.dimension_fields : [];
  const kpiFields = Array.isArray(setup.kpi_fields) ? setup.kpi_fields : [];
  const timeField = String(setup.time_field || '').trim();
  const timeRequired = setupRequiresTimeField(detail, setup);
  const setupBlockers: string[] = [];
  if (!dimensionFields.length) setupBlockers.push('pick at least one Segment field');
  if (!kpiFields.length) setupBlockers.push('pick at least one Metric field');
  if (timeRequired && !timeField) setupBlockers.push('pick one Time field');
  if (setupBlockers.length > 0) {
    const message = `Complete setup first: ${setupBlockers.join(', ')}.`;
    ui.configFeedback.textContent = message;
    showToast(message, 'error');
    return;
  }
  
  let references;
  if (ui.configReferences.value.trim()) {
    try {
      references = JSON.parse(ui.configReferences.value);
    } catch {
      ui.configFeedback.textContent = 'Manual references must be valid JSON.';
      showToast('Manual references JSON is invalid.', 'error');
      return;
    }
  }

  // Read from simple tolerance (primary path) and sync to advanced inputs
  const simpleTol = Number(ui.configToleranceSimple.value || 10);
  ui.configNormal.value = String(simpleTol);
  ui.configRelaxed.value = String(Math.round(simpleTol * 2));
  ui.configStrict.value = String(Math.round(simpleTol / 2));

  const mappingPayload = {
    rows_path: setup.rows_path || null,
    time_field: timeField || null,
    time_end_field: setup.time_end_field || null,
    time_profile: setup.time_profile || 'auto',
    time_extraction_rule: setup.time_extraction_rule || 'single',
    time_format: setup.time_format || null,
  };

  if (timeRequired || mappingPayload.time_field) {
    ui.configFeedback.textContent = 'Checking time mapping using available samples...';
    try {
      const previewResponse = await fetch(`/jin/api/v2/config-mapping/test/${slug(state.selectedApi)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mappingPayload),
      });
      const previewPayload = await previewResponse.json();
      if (!previewResponse.ok || !previewPayload?.ok) {
        throw new Error(previewPayload?.detail || previewPayload?.error || 'Time mapping check failed.');
      }
      const sampleSource = String(previewPayload?.sample_source || 'none');
      const sampleCount = Number(previewPayload?.sample_count || 0);
      const successCount = Number(previewPayload?.summary?.success_count || 0);
      if (sampleCount > 0 && successCount === 0 && sampleSource !== 'schema_example_rows') {
        const message = 'Time mapping could not parse sample rows yet. Setup can still be saved; mapping will validate after the first real check.';
        ui.configFeedback.textContent = message;
        showToast(message, 'warning');
      }
      if (sampleCount === 0) {
        ui.configFeedback.textContent = 'No sample rows yet. Setup can still be saved; mapping will validate after first check.';
      } else if (sampleCount > 0 && successCount === 0) {
        ui.configFeedback.textContent = 'Time mapping could not parse schema example rows yet. Setup can still be saved; mapping will validate after the first real check.';
      } else {
        ui.configFeedback.textContent = `Time mapping check passed on ${successCount}/${sampleCount} sample row(s).`;
      }
    } catch (error) {
      const message = `Could not validate time mapping: ${errorMessage(error)}`;
      ui.configFeedback.textContent = message;
      showToast(message, 'error');
      return;
    }
  } else {
    ui.configFeedback.textContent = 'No time field detected for this API shape. Setup will continue with Segment + Metric only.';
  }

  const payload = {
    dimension_fields: dimensionFields,
    kpi_fields: kpiFields,
    active_tolerance: ui.configActiveTolerance.value,
    tolerance_relaxed: Number(ui.configRelaxed.value || 20),
    tolerance_normal: simpleTol,
    tolerance_strict: Number(ui.configStrict.value || 5),
    tolerance_pct: simpleTol,
    confirmed: true,
    rows_path: mappingPayload.rows_path,
    time_field: mappingPayload.time_field,
    time_end_field: mappingPayload.time_end_field,
    time_granularity: setup.time_granularity || 'minute',
    time_profile: mappingPayload.time_profile,
    time_extraction_rule: mappingPayload.time_extraction_rule,
    time_format: mappingPayload.time_format,
    time_pin: Boolean(setup.time_pin),
    references,
  };

  const response = await fetch(`/jin/api/v2/config/${slug(state.selectedApi)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  
  const result = await response.json();
  
  if (response.ok) {
    state.currentApiTab = 'uploads';
    syncBrowserRoute('push');
    showToast('Setup saved. Ready for baseline data.', 'success');
    clearDismissedUploadJob(state.selectedApi);
  } else {
    ui.configFeedback.textContent = `Save failed: ${JSON.stringify(result)}`;
    showToast('Setup save failed.', 'error');
  }

  state.detailCache.delete(state.selectedApi);
  await refreshAll(true);
  const updatedDetail = selectedApiDetail();
  if (updatedDetail) {
      renderApiDetail(updatedDetail);
  }
}

(window as any).saveConfig = saveConfig;

function baselineSetupBlockers(detail: any): string[] {
  const setup = detail?.setup_config || detail?.config || {};
  const blockers: string[] = [];
  const dims = Array.isArray(setup?.dimension_fields) ? setup.dimension_fields : [];
  const kpis = Array.isArray(setup?.kpi_fields) ? setup.kpi_fields : [];
  const timeRequired = setupRequiresTimeField(detail, setup);
  if (!dims.length) blockers.push('Segment');
  if (!kpis.length) blockers.push('Metric');
  if (timeRequired && !String(setup?.time_field || '').trim()) blockers.push('Time');
  if (setup?.confirmed === false) blockers.push('Save configuration');
  return blockers;
}

function ensureBaselineSetupReady(actionText: string): boolean {
  const endpointPath = String(state.selectedApi || '').trim();
  if (!endpointPath) return false;
  const detail = selectedApiDetail();
  const blockers = baselineSetupBlockers(detail);
  if (!blockers.length) return true;
  const message = `Before ${actionText}, complete setup in Configuration: ${blockers.join(', ')}.`;
  ui.uploadFeedback.textContent = message;
  showToast(message, 'error');
  setCoreInsight(endpointPath, {
    title: 'Insight: complete setup first',
    summary: message,
    kind: 'error',
    actionType: 'tab',
    actionValue: 'configuration',
    actionLabel: 'Open Setup',
  });
  switchApiTab('configuration', 'push');
  return false;
}

async function previewUpload() {
  if (!state.selectedApi) {
    ui.uploadFeedback.textContent = 'Choose an API first, then check your file.';
    showToast('Select an API first before checking a file.', 'error');
    return;
  }
  if (!ensureBaselineSetupReady('checking this file')) return;
  if (!ui.uploadFile.files || !ui.uploadFile.files.length) {
    ui.uploadFeedback.textContent = 'Choose a CSV or XLSX file first.';
    return;
  }
  const form = new FormData();
  form.append('file', ui.uploadFile.files[0]);
  ui.previewUploadButton.disabled = true;
  ui.previewUploadButton.textContent = 'Checking…';
  ui.uploadFeedback.textContent = 'Checking file format and sample rows...';
  try {
    const response = await fetch(`/jin/api/v2/upload-preview/${slug(state.selectedApi)}`, {
      method: 'POST',
      body: form,
    });
    const raw = await response.text();
    let result: any = {};
    if (raw) {
      try {
        result = JSON.parse(raw);
      } catch {
        result = { ok: response.ok, error: raw };
      }
    } else {
      result = { ok: response.ok };
    }
    if (!result || typeof result !== 'object') {
      result = { ok: response.ok, error: String(result || '') };
    }
    if (!response.ok) {
      result.ok = false;
      if (!result.error) {
        result.error = `Server returned ${response.status} while checking the file.`;
      }
    }
    ui.uploadPreviewStep.style.display = '';
    if (!result.ok) {
      ui.uploadPreviewBody.innerHTML = `
            <div class="upload-preview-error">
              <strong>Problem with your file</strong>
              <div style="margin-top:6px;">${result.error || 'Unexpected error.'}</div>
              ${(result.warnings || []).length
          ? `<ul style="margin-top:8px;">${result.warnings.map((w: string) => `<li>${w}</li>`).join('')}</ul>`
          : ''}
            </div>
          `;
      ui.uploadConfirmToolbar.style.display = 'none';
      ui.uploadFeedback.textContent = result.error || 'File check failed.';
    } else {
      const rowsInFile = Number(result.rows_in_file || result.rows_found || 0);
      const columnsInFile = Number(result.columns_in_file || 0);
      const fileSizeBytes = Number(result.file_size_bytes || 0);
      const largeUpload = Boolean(result.is_large_upload);
      let mappingConfidenceHtml = '';
      let mappingFeedbackSuffix = '';
      try {
        const mappingResponse = await fetch(`/jin/api/v2/config-mapping/test/${slug(state.selectedApi)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{}',
        });
        const mappingPayload = await mappingResponse.json();
        if (mappingResponse.ok && mappingPayload?.ok) {
          const sampleCount = Number(mappingPayload?.sample_count || 0);
          const successCount = Number(mappingPayload?.summary?.success_count || 0);
          const mappingSource = String(mappingPayload?.sample_source || 'none');
          const ratioPct = sampleCount > 0 ? Math.round((successCount / sampleCount) * 100) : 0;
          const confidenceTone = sampleCount === 0 ? 'info' : successCount === sampleCount ? 'success' : (successCount > 0 ? 'info' : 'danger');
          const confidenceLabel = sampleCount === 0
            ? 'Not validated yet'
            : successCount === sampleCount
              ? `Strong (${ratioPct}%)`
              : successCount > 0
                ? `Partial (${ratioPct}%)`
                : 'Needs fix (0%)';
          const warningRows = Array.isArray(mappingPayload?.summary?.warnings)
            ? mappingPayload.summary.warnings
            : [];
          mappingConfidenceHtml = `
            <div class="feedback ${confidenceTone}" style="margin-top:10px;">
              <strong>Time mapping confidence: ${escapeHtml(confidenceLabel)}</strong>
              <div class="tiny" style="margin-top:6px;">
                Parsed ${fmt(successCount)}/${fmt(sampleCount)} sample row(s) • source: ${escapeHtml(mappingSource)}.
              </div>
              ${warningRows.length
                ? `<div class="tiny muted" style="margin-top:6px;">${escapeHtml(String(warningRows[0]))}</div>`
                : ''}
            </div>
          `;
          mappingFeedbackSuffix = sampleCount > 0
            ? ` Time mapping parsed ${fmt(successCount)}/${fmt(sampleCount)} sample row(s).`
            : ' Time mapping has no runtime sample yet.';
        }
      } catch {
        // Keep upload preview resilient even if mapping confidence fetch fails.
      }
      const sampleHtml = (result.sample_rows || []).length
        ? `<table class="preview-table">
                <thead><tr><th>Group</th>${result.metrics_detected.map((m: string) => `<th>${m}</th>`).join('')}<th>Tolerance %</th></tr></thead>
                <tbody>${result.sample_rows.map((r: any) => `
                  <tr>
                    <td>${r.group || '(all)'}</td>
                    ${result.metrics_detected.map((m: string) => `<td>${r.metrics[m] ?? '—'}</td>`).join('')}
                    <td>${r.tolerance_pct ?? 10}</td>
                  </tr>
                `).join('')}</tbody>
               </table>
               ${result.rows_found > 5 ? `<div class="tiny" style="margin-top:6px;">Showing first 5 of ${result.rows_found} rows</div>` : ''}`
        : '<div class="empty">No data rows found.</div>';
      ui.uploadPreviewBody.innerHTML = `
            <div class="upload-preview-ok">
              <div class="upload-preview-stats">
                <div class="preview-stat"><strong>${result.rows_found}</strong><span>rows</span></div>
                <div class="preview-stat"><strong>${result.groups_detected.join(', ') || '—'}</strong><span>group fields</span></div>
                <div class="preview-stat"><strong>${result.metrics_detected.join(', ') || '—'}</strong><span>metrics</span></div>
                <div class="preview-stat"><strong>${columnsInFile || '—'}</strong><span>columns</span></div>
              </div>
              <div class="tiny muted" style="margin-top:8px;">
                File shape: ${fmt(rowsInFile)} row(s) × ${fmt(columnsInFile)} column(s) • ${formatBytes(fileSizeBytes)}
              </div>
              ${largeUpload
          ? `<div class="feedback info" style="margin-top:10px;">Large/wide upload detected. Validation may take longer, but Jin will process it safely.</div>`
          : ''}
              ${mappingConfidenceHtml}
              ${(result.warnings || []).length
          ? `<div class="upload-preview-warnings"><strong>Warnings</strong><ul>${result.warnings.map((w: string) => `<li>${w}</li>`).join('')}</ul></div>`
          : ''}
              <div style="margin-top:12px;"><strong>Sample rows</strong></div>
              <div class="table-wrap" style="margin-top:8px;">${sampleHtml}</div>
            </div>
          `;
      ui.uploadConfirmToolbar.style.display = '';
      ui.uploadFeedback.textContent = `File check passed. ${fmt(rowsInFile)} row(s) ready for upload.${mappingFeedbackSuffix}`;
    }
  } catch (err) {
    ui.uploadPreviewBody.innerHTML = `<div class="upload-preview-error">${escapeHtml(errorMessage(err) || 'Could not connect to server. Please try again.')}</div>`;
    ui.uploadConfirmToolbar.style.display = 'none';
    ui.uploadFeedback.textContent = errorMessage(err);
    notifyAsyncError(err, 'Could not check the file.');
  } finally {
    ui.previewUploadButton.disabled = false;
    ui.previewUploadButton.textContent = 'Check file →';
  }
}

const closeRunDetailDrawer = () => {
  ui.runDetailDrawer.style.display = 'none';
};

ui.runDetailClose.addEventListener('click', closeRunDetailDrawer);
ui.runDetailDrawer.addEventListener('click', (event) => {
  if (event.target === ui.runDetailDrawer) {
    closeRunDetailDrawer();
  }
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && ui.runDetailDrawer.style.display !== 'none') {
    closeRunDetailDrawer();
  }
});

async function renderComparisonInline(run: any) {
  const container = document.getElementById('api-monitoring-progress');
  if (!container || !run) return;

  const detail = selectedApiDetail();
  const parseObject = (value: any): Record<string, any> => {
    if (!value) return {};
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return parsed && typeof parsed === 'object' ? parsed : {};
      } catch {
        return {};
      }
    }
    if (typeof value === 'object') return value as Record<string, any>;
    return {};
  };
  const extractNumericMetrics = (source: any): Array<{ kpiField: string; value: number }> => {
    const collected = new Map<string, number>();
    const walk = (value: any, prefix = ''): void => {
      if (value == null) return;
      if (typeof value === 'number') {
        if (prefix && Number.isFinite(value) && !collected.has(prefix)) {
          collected.set(prefix, value);
        }
        return;
      }
      if (typeof value === 'string') {
        const trimmed = value.trim();
        const numeric = Number(trimmed);
        if (prefix && trimmed && Number.isFinite(numeric) && !collected.has(prefix)) {
          collected.set(prefix, numeric);
        }
        return;
      }
      if (Array.isArray(value)) {
        value.forEach((item) => walk(item, prefix ? `${prefix}[]` : 'data[]'));
        return;
      }
      if (typeof value === 'object') {
        Object.entries(value).forEach(([key, nested]) => {
          const nextPrefix = prefix ? `${prefix}.${key}` : key;
          walk(nested, nextPrefix);
        });
      }
    };
    walk(source);
    return Array.from(collected.entries()).map(([kpiField, value]) => ({ kpiField, value }));
  };
  const normalizeGrainKey = (grainKey: string): string => {
    if (!grainKey || grainKey.indexOf('|') === -1) return grainKey;
    const [endpoint, ...parts] = grainKey.split('|');
    const filtered = parts
      .map((part) => part.trim())
      .filter(Boolean)
      .filter((part) => {
        const key = part.split('=')[0];
        return key !== 'api_version' && key !== 'label' && key !== 'timestamp' && key !== '_jin_id';
      })
      .sort();
    return filtered.length ? `${endpoint}|${filtered.join('|')}` : endpoint;
  };
  const normalizeKpiField = (kpiField: string): string => {
    const raw = String(kpiField || '').trim().toLowerCase();
    if (!raw) return '';
    return raw
      .replace(/\[\]/g, '')
      .replace(/^data\./, '')
      .replace(/^payload\./, '');
  };

  const referenceIndex = new Map<string, { expected: number | null; tolerance: number | null }>();
  (detail?.references || []).forEach((item: any) => {
    const grainKey = String(item?.grain_key || '');
    const kpiField = String(item?.kpi_field || '');
    if (!grainKey || !kpiField) return;
    const expectedRaw = item?.expected_value;
    const toleranceRaw = item?.tolerance_pct;
    const expected = expectedRaw == null ? null : Number(expectedRaw);
    const tolerance = toleranceRaw == null ? null : Number(toleranceRaw);
    const reference = {
      expected: Number.isFinite(expected as number) ? (expected as number) : null,
      tolerance: Number.isFinite(tolerance as number) ? (tolerance as number) : null,
    };
    const normalizedKpi = normalizeKpiField(kpiField);
    referenceIndex.set(`${grainKey}__${kpiField}`, reference);
    if (normalizedKpi && normalizedKpi !== kpiField) {
      referenceIndex.set(`${grainKey}__${normalizedKpi}`, reference);
    }
    const normalizedGrain = normalizeGrainKey(grainKey);
    if (normalizedGrain) {
      if (!referenceIndex.has(`${normalizedGrain}__${kpiField}`)) {
        referenceIndex.set(`${normalizedGrain}__${kpiField}`, reference);
      }
      if (normalizedKpi && !referenceIndex.has(`${normalizedGrain}__${normalizedKpi}`)) {
        referenceIndex.set(`${normalizedGrain}__${normalizedKpi}`, reference);
      }
    }
  });

  const defaultTolerance = Number(detail?.config?.tolerance_normal ?? detail?.config?.tolerance_pct ?? 10);
  const explicitComparisons = Array.isArray(run.comparisons) ? run.comparisons.filter((item: any) => item?.kpi_field) : [];
  const rawKpiPayload = parseObject(run.kpi_json);
  const derivedMetrics = extractNumericMetrics(rawKpiPayload);

  const normalizedRaw = explicitComparisons.length
    ? explicitComparisons.map((comparison: any) => {
        const actualValue = comparison.actual_value ?? comparison.actual;
        const runGrain = String(run.grain_key || '');
        const normalizedGrain = normalizeGrainKey(runGrain);
        const rawKpi = String(comparison.kpi_field || '');
        const normalizedKpi = normalizeKpiField(rawKpi);
        const fallbackReference = referenceIndex.get(`${runGrain}__${rawKpi}`)
          || (normalizedKpi ? referenceIndex.get(`${runGrain}__${normalizedKpi}`) : undefined)
          || referenceIndex.get(`${normalizedGrain}__${rawKpi}`)
          || (normalizedKpi ? referenceIndex.get(`${normalizedGrain}__${normalizedKpi}`) : undefined);
        const expectedValue = (comparison.expected_value ?? comparison.expected ?? fallbackReference?.expected ?? null);
        const tolerance = comparison.allowed_tolerance_pct ?? fallbackReference?.tolerance ?? defaultTolerance;
        const pctChange = comparison.pct_change ?? (expectedValue == null || actualValue == null || Number(expectedValue) === 0
          ? null
          : ((Number(actualValue) - Number(expectedValue)) / Math.abs(Number(expectedValue))) * 100);
        const explicitStatus = String(comparison.status || '');
        const status = (explicitStatus && !(explicitStatus === 'missing_reference' && expectedValue != null))
          ? explicitStatus
          : (
          expectedValue == null
            ? 'missing_reference'
            : (pctChange != null && Math.abs(Number(pctChange)) > Number(tolerance) ? 'mismatch' : 'match')
          );
        return {
          ...comparison,
          kpi_field: comparison.kpi_field,
          actualValue,
          expectedValue,
          pctChange,
          status,
          message: comparison.message || (
            status === 'match'
              ? `${comparison.kpi_field} matched the expected baseline.`
              : status === 'missing_reference'
                ? `${comparison.kpi_field} has no uploaded baseline for this grain.`
                : `${comparison.kpi_field} did not match the uploaded baseline.`
          ),
        };
      })
    : derivedMetrics.map(({ kpiField, value }) => {
          const actualValue = Number(value);
          const runGrain = String(run.grain_key || '');
          const normalizedKpi = normalizeKpiField(kpiField);
          const normalizedGrain = normalizeGrainKey(runGrain);
          const reference = referenceIndex.get(`${runGrain}__${kpiField}`)
            || (normalizedKpi ? referenceIndex.get(`${runGrain}__${normalizedKpi}`) : undefined)
            || referenceIndex.get(`${normalizedGrain}__${kpiField}`)
            || (normalizedKpi ? referenceIndex.get(`${normalizedGrain}__${normalizedKpi}`) : undefined);
          const expectedValue = reference?.expected ?? null;
          const tolerance = reference?.tolerance ?? defaultTolerance;
          const pctChange = expectedValue == null || expectedValue === 0
            ? null
            : ((actualValue - expectedValue) / Math.abs(expectedValue)) * 100;
          const status = expectedValue == null
            ? 'missing_reference'
            : (pctChange != null && Math.abs(pctChange) > tolerance ? 'mismatch' : 'match');
          return {
            kpi_field: kpiField,
            actualValue,
            expectedValue,
            pctChange,
            status,
            message: expectedValue == null
              ? `No uploaded baseline found for ${kpiField} on this grain.`
              : `Compared using uploaded baseline (allowed +/-${tolerance.toFixed(1)}%).`,
          };
        });
  const normalized = normalizedRaw.filter((item: any) => item && String(item.kpi_field || '').trim().length > 0);

  if (!normalized.length) {
    const topLevelKeys = Object.keys(rawKpiPayload || {});
    const hint = topLevelKeys.length
      ? `Captured keys: ${topLevelKeys.slice(0, 6).join(', ')}${topLevelKeys.length > 6 ? ', ...' : ''}.`
      : 'No KPI fields were returned by this run.';
    container.dataset.endpoint = state.selectedApi || '';
    container.dataset.source = 'live-check';
    container.innerHTML = `<div class="empty">No comparable KPI values were captured for this run. ${hint}</div>`;
    container.style.display = 'block';
    return;
  }

  const anomalyCount = normalized.filter((c: any) => c.status !== 'match').length;
  const verdict = anomalyCount === 0 
    ? { title: 'Data Quality: Excellent', sub: 'All metrics are within your defined targets.', class: 'success' }
    : { title: `Action Required: ${anomalyCount} Issue${anomalyCount > 1 ? 's' : ''} Found`, sub: 'Some metrics have drifted beyond acceptable limits.', class: 'danger' };

  const html = `
    <div class="results-auto-show">
      <div class="verdict-banner ${verdict.class}">
        <div class="verdict-icon">${anomalyCount === 0 ? '✅' : '⚠️'}</div>
        <div class="verdict-body">
          <h4>${verdict.title}</h4>
          <p class="tiny">${verdict.sub}</p>
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
            ${(normalized.map((c: any) => {
              const delta = c.pctChange;
              const isMismatch = c.status !== 'match';
              const deltaColor = isMismatch ? 'var(--anomaly)' : 'var(--healthy)';
              return `
                <tr style="border-bottom:1px solid var(--line);">
                  <td style="padding:12px;">
                    <div style="font-weight:600; font-size:13px;">${c.kpi_field}</div>
                    <div class="tiny muted">${run.grain_key || 'Global'}</div>
                  </td>
                  <td style="padding:12px; font-family:var(--font-mono); font-size:13px;">${fmt(c.actualValue)}</td>
                  <td style="padding:12px; font-family:var(--font-mono); font-size:13px; color:var(--ink-muted);">${fmt(c.expectedValue)}</td>
                  <td style="padding:12px; font-family:var(--font-mono); font-size:13px; color:${deltaColor}; font-weight:600;">
                    ${delta == null ? '—' : `${delta > 0 ? '+' : ''}${delta.toFixed(1)}%`}
                  </td>
                  <td style="padding:12px;">
                    <span class="status-pill ${isMismatch ? 'danger' : 'healthy'}" style="padding:2px 8px; font-size:10px; font-weight:700;">
                      ${isMismatch ? 'MISMATCH' : 'MATCH'}
                    </span>
                  </td>
                  <td style="padding:12px; color:var(--ink-soft);">${c.message}</td>
                </tr>
              `;
            }).join('')) || `
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
          ${anomalyCount > 0 ? `
            <div class="next-step-card" onclick="setView('incidents')">
              <div class="step-icon">🚩</div>
              <strong>Review Issues</strong>
              <p class="tiny muted">Deep dive into the ${anomalyCount} detected drift points.</p>
            </div>
          ` : `
            <div class="next-step-card" onclick="setView('overview')">
              <div class="step-icon">✨</div>
              <strong>Project Health</strong>
              <p class="tiny muted">Everything looks good. See the full overview.</p>
            </div>
          `}
          <div class="next-step-card" onclick="switchApiTab('configuration')">
            <div class="step-icon">⚙️</div>
            <strong>Tweak Targets</strong>
            <p class="tiny muted">Adjust your tolerance levels to be more or less strict.</p>
          </div>
          <div class="next-step-card" onclick="switchApiTab('uploads')">
            <div class="step-icon">📊</div>
            <strong>Update Baselines</strong>
            <p class="tiny muted">Upload a new reference file if targets have shifted.</p>
          </div>
        </div>
      </div>
    </div>
  `;
  container.dataset.endpoint = state.selectedApi || '';
  container.dataset.source = 'live-check';
  container.innerHTML = html;
  container.style.display = 'block';
}

async function manualCheck(targetTab: 'summary' | 'history' = 'summary') {
  const path = state.selectedApi;
  if (!path) return;
  const setupReady = ensureBaselineSetupReady('running a manual check');
  if (!setupReady) return;
  
  ui.checkNowButton.disabled = true;
  ui.checkNowButton.textContent = 'Checking...';
  
  switchApiTab(targetTab, 'none');
  const monitoringContainer = document.getElementById('api-monitoring-progress');
  if (monitoringContainer) {
    monitoringContainer.dataset.endpoint = path;
    monitoringContainer.dataset.source = 'live-check-loading';
    monitoringContainer.innerHTML = `
      <div class="row-card">
        <strong>Running check...</strong>
        <div class="tiny" style="margin-top:6px;">
          Pulling latest API response and comparing against your configured baseline.
        </div>
      </div>
    `;
    monitoringContainer.style.display = 'block';
  }
  
  try {
    const response = await fetch(`/jin/api/v2/check/${slug(path)}`, { method: 'POST' });
    const result = await response.json();
    if (response.ok) {
        // Force-refresh the details and wait for any background commits
        await new Promise((resolve) => setTimeout(resolve, 300));
        state.detailCache.delete(state.selectedApi || '');
        state.detailCache.delete(path); // Double-delete for path as well
        const freshDetail = await fetchDetail(state.selectedApi || '');
        setCheckInsightFromDetail(path, freshDetail);
        
        if (freshDetail.history && freshDetail.history.length > 0) {
            await renderComparisonInline(freshDetail.history[0]);
        } else {
            // Special state for brand new monitors with no traffic yet
            const monitoringContainerFinal = document.getElementById('api-monitoring-progress');
            if (monitoringContainerFinal) {
                monitoringContainerFinal.innerHTML = `
                    <div class="verdict-banner success shadow-sm" style="animation: slideIn 0.4s easeOutBack;">
                        <div class="verdict-icon">📡</div>
                        <div class="verdict-text">
                            <strong>Monitor Active: Waiting for traffic</strong>
                            <p>Targets are set! Jin will scan the next live request automatically.</p>
                        </div>
                    </div>
                `;
                monitoringContainerFinal.style.display = 'block';
            }
        }
        
        await refreshAll(true);
        // We don't call openApi again because we want to STAY on the results we just rendered
        renderApiDetail(freshDetail); 
        const monitoringContainerFinal = document.getElementById('api-monitoring-progress');
        if (monitoringContainerFinal) monitoringContainerFinal.style.display = 'block';
    } else {
        showToast(result.error || 'Check failed.', 'error');
    }
  } catch (err) {
    showToast('Network error triggering check.', 'error');
  } finally {
    ui.checkNowButton.disabled = false;
    ui.checkNowButton.textContent = 'Check Now';
  }
}

async function uploadReferences() {
  if (!state.selectedApi || !ui.uploadFile.files || !ui.uploadFile.files.length) {
    ui.uploadFeedback.textContent = 'Choose a CSV or XLSX file first.';
    return;
  }
  if (!ensureBaselineSetupReady('starting baseline upload')) return;
  const endpointPath = state.selectedApi;
  const file = ui.uploadFile.files[0];
  const uploadLabel = ui.uploadButton.textContent || 'Confirm upload';
  clearDismissedUploadJob(endpointPath);
  ui.uploadButton.disabled = true;
  ui.uploadButton.textContent = 'Starting...';
  ui.previewUploadButton.disabled = true;
  ui.uploadFeedback.textContent = `Starting upload for ${file.name} (${formatBytes(file.size)})...`;
  try {
    const jobId = await startUploadJob(endpointPath, file);
    rememberUploadJob(endpointPath, jobId);
    showToast('Upload started. Please wait while Jin validates and imports your baseline.', 'success');
    switchApiTab('history', 'replace');
    ui.uploadFeedback.textContent = `Upload queued. Tracking progress for ${file.name}...`;
    setCoreInsight(endpointPath, {
      title: 'Insight: upload in progress',
      summary: 'Baseline upload is running in the background. You can monitor progress in this view.',
      kind: 'info',
      actionType: 'tab',
      actionValue: 'history',
      actionLabel: 'Open Checks',
    });
    void monitorUploadJob(endpointPath, jobId);
  } catch (error) {
    notifyAsyncError(error, 'Could not start upload.');
    ui.uploadFeedback.textContent = errorMessage(error);
  } finally {
    if (!uploadPollingEndpoints.has(endpointPath)) {
      ui.uploadButton.disabled = false;
      ui.previewUploadButton.disabled = false;
      ui.uploadButton.textContent = uploadLabel;
    } else {
      ui.uploadButton.textContent = 'Uploading...';
    }
  }
}

function showUploadAnalysis(analyzedAt: string) {
  const detail = selectedApiDetail();
  if (!detail) return;
  const history = detail.upload_analysis_history || [];
  const selected = history.find((item: any) => String(item?.analyzed_at || '') === String(analyzedAt || ''));
  if (!selected) {
    showToast('This upload analysis record is no longer available.', 'error');
    return;
  }
  (state as any).selectedUploadAnalysisAt = String(analyzedAt || '');
  state.currentView = 'api';
  state.currentApiTab = 'history';
  syncBrowserRoute('push');
  renderApiDetail(detail);
  requestAnimationFrame(() => {
    const panel = document.getElementById('api-monitoring-progress');
    if (panel) panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}
(window as any).showUploadAnalysis = showUploadAnalysis;

async function openUploadIssues() {
  clearIncidentFilters({ render: false, persist: true });
  const endpointPath = String(state.selectedApi || '').trim();
  if (endpointPath) {
    try {
      const syncPayload = await fetchJson<any>(
        `/jin/api/v2/upload-analysis/issues/${slug(endpointPath)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{}',
        },
        15000,
      );
      const syncedCount = Number(syncPayload?.created || 0) + Number(syncPayload?.updated || 0);
      if (syncedCount > 0) {
        const syncMessage = String(syncPayload?.message || `Synced ${syncedCount} upload mismatch issue${syncedCount === 1 ? '' : 's'} into Issues.`);
        setIncidentsMessage(syncMessage, 'info');
      }
    } catch (_error) {
      // Non-blocking: even if sync fails, continue opening Issues view.
    }
  }
  await refreshAll(true);
  if (endpointPath) {
    const activeForEndpoint = allIncidentRows().filter((item: any) => (
      String(item?.endpoint_path || '') === endpointPath
      && String(item?.status || 'active') !== 'resolved'
    ));
    if (activeForEndpoint.length > 0) {
      setIncidentsMessage(
        `Showing ${activeForEndpoint.length} active issue${activeForEndpoint.length === 1 ? '' : 's'} for ${endpointPath}.`,
        'info',
      );
    } else {
      setIncidentsMessage(`No active issues for ${endpointPath} right now.`, 'info');
    }
  }
  state.currentView = 'incidents';
  syncBrowserRoute('push');
  renderShell();
}
(window as any).openUploadIssues = openUploadIssues;
(window as any).clearIncidentFilters = function clearIncidentFiltersAction() {
  clearIncidentFilters({ render: true, persist: true });
};

async function materializeUploadAnalysisIssues() {
  if (!state.selectedApi) return;
  const endpointPath = state.selectedApi;
  try {
    const payload = await fetchJson<any>(
      `/jin/api/v2/upload-analysis/issues/${slug(endpointPath)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      },
      20000,
    );
    const created = Number(payload?.created || 0);
    const updated = Number(payload?.updated || 0);
    if (created > 0 || updated > 0) {
      const fallback = created > 0
        ? `Added ${created} issue${created === 1 ? '' : 's'} from upload mismatches.`
        : `Refreshed ${updated} existing issue${updated === 1 ? '' : 's'} from upload mismatches.`;
      const message = String(payload?.message || fallback);
      showToast(message, created > 0 ? 'success' : 'info');
      setIncidentsMessage(message, created > 0 ? 'success' : 'info');
      await openUploadIssues();
      return;
    }
    const message = String(payload?.message || 'No new issues were added from this upload analysis.');
    showToast(message, 'info');
    setIncidentsMessage(message, 'info');
  } catch (error) {
    notifyAsyncError(error, 'Could not add upload mismatches to Issues.');
  }
}
(window as any).materializeUploadAnalysisIssues = materializeUploadAnalysisIssues;

async function runBulkAction() {
  const ids = [...document.querySelectorAll<HTMLInputElement>('.bulk-incident:checked')].map((node) => Number(node.value));
  if (!ids.length) return;
  const action = ui.bulkAction.value;
  const payload: any = {
    anomaly_ids: ids,
    action,
    note: ui.bulkNote.value || undefined,
    owner: normalizeOwnerInput(activeOperatorOwner()),
  };
  if (action === 'snoozed' || action === 'suppressed') payload.snooze_minutes = 60;
  openConfirm(
    'Apply bulk issue action?',
    `This will apply "${action}" to ${ids.length} selected issues.`,
    async () => {
      const response = await fetch('/jin/api/v2/anomalies/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      ui.bulkNote.value = '';
      if (response.ok) {
        const message = `Bulk action applied to ${ids.length} issue${ids.length === 1 ? '' : 's'}.`;
        showToast(message, 'success');
        setIncidentsMessage(message, 'success');
      } else {
        const message = 'Bulk action failed.';
        showToast(message, 'error');
        setIncidentsMessage(message, 'error');
      }
      await refreshAll(true);
      if (state.selectedApi) {
        state.detailCache.delete(state.selectedApi);
        await openApi(state.selectedApi);
      }
    }
  );
}

async function runReport(options: { suppressSuccessToast?: boolean } = {}) {
  const trackedEndpoints = Array.isArray(state.status?.endpoints) ? state.status.endpoints.length : 0;
  if (trackedEndpoints === 0) {
    const message = 'No APIs are tracked yet. Call your APIs first, then generate a report.';
    showToast(message, 'error');
    setReportsMessage(message, 'error');
    renderReports();
    return;
  }
  const endpoint = ui.reportEndpointSelect.value;
  const focus = ui.reportGrainSearch.value.trim();

  ui.runReportButton.disabled = true;
  ui.runReportButton.textContent = 'Generating...';

  try {
    const digestUrl = new URL(`${window.location.origin}/jin/api/v2/reports/leadership-digest`);
    digestUrl.searchParams.set('days', '7');
    digestUrl.searchParams.set('limit', '200');
    if (focus) digestUrl.searchParams.set('focus', focus);

    const [summary, digest, endpointReport] = await Promise.all([
      fetchJson<any>(`${window.location.origin}/jin/api/v2/reports/summary`, undefined, 20000),
      fetchJson<any>(digestUrl.toString(), undefined, 20000),
      endpoint
        ? fetchJson<any>(`${window.location.origin}/jin/api/v2/reports/endpoint/${slug(endpoint)}`, undefined, 20000)
        : Promise.resolve(null),
    ]);

    const reportPack = {
      summary,
      digest,
      endpoint_report: endpointReport,
      generated_at: new Date().toISOString(),
      endpoint_path: endpoint || null,
      focus: focus || null,
    };
    state.lastReportData = buildReportCsvRows(reportPack);
    renderReports(reportPack);
    if (!options.suppressSuccessToast) {
      showToast('Report pack generated.', 'success');
    }
    setReportsMessage('Report pack generated. Review top risks, then export CSV.', 'success');
  } catch (err) {
    const rawMessage = errorMessage(err);
    const message = rawMessage.toLowerCase();
    if (message.includes('timed out')) {
      showToast('Report generation timed out. Try selecting one API first, then retry.', 'error');
      setReportsMessage('Report generation timed out. Select one API and try again.', 'error');
    } else {
      notifyAsyncError(err, 'Failed to generate report pack.');
      setReportsMessage(`Failed to generate report pack: ${rawMessage}`, 'error');
    }
  } finally {
    ui.runReportButton.disabled = false;
    ui.runReportButton.textContent = '1) Generate Report';
  }
}

async function exportReportCsv() {
  const trackedEndpoints = Array.isArray(state.status?.endpoints) ? state.status.endpoints.length : 0;
  if (trackedEndpoints === 0) {
    showToast('No tracked APIs yet. Call your APIs first.', 'error');
    setReportsMessage('No tracked APIs yet. Call your APIs first.', 'error');
    return;
  }
  const originalLabel = ui.exportReportCsv.textContent || '2) Export CSV';
  ui.exportReportCsv.disabled = true;
  ui.exportReportCsv.textContent = 'Preparing export...';
  let generatedForExport = false;
  try {
    if (!state.lastReportData || state.lastReportData.length === 0) {
      setReportsMessage('Generating latest report pack before export...', 'info');
      await runReport({ suppressSuccessToast: true });
      generatedForExport = true;
    }
    if (!state.lastReportData || state.lastReportData.length === 0) {
      showToast('No report data to export.', 'error');
      setReportsMessage('No report data to export yet. Generate a report pack first.', 'error');
      return;
    }
    downloadCsv('jin-report.csv', state.lastReportData);
    const successMessage = generatedForExport
      ? 'Report pack generated and CSV exported.'
      : 'Report CSV exported.';
    showToast(successMessage, 'success');
    setReportsMessage(successMessage, 'success');
  } finally {
    ui.exportReportCsv.disabled = false;
    ui.exportReportCsv.textContent = originalLabel;
  }
}

async function registerProjectOperator() {
  const projectName = String(ui.projectRegisterName.value || '').trim();
  let username = String(ui.projectRegisterUser.value || '').trim();
  const password = String(ui.projectRegisterPass.value || '');
  if (!projectName) {
    showToast('Project name is required for registration.', 'error');
    return;
  }
  if (password && !username) {
    username = 'operator';
    ui.projectRegisterUser.value = username;
  }
  if (username && !password) {
    showToast('Add a password, or clear username/password to continue without login setup.', 'error');
    return;
  }
  await runWithBusyButton(ui.projectRegisterButton, 'Registering...', async () => {
    await registerOperator({
      project_name: projectName,
      username: username || undefined,
      password: password || undefined,
      write_env: ui.projectRegisterWriteEnv.checked,
      monitor_policy: monitorPolicyFromUi(),
      bootstrap_monitoring: true,
      overwrite_existing_schedule: true,
    });
    ui.projectRegisterPass.value = '';
    ui.projectRegisterAuthAdvanced.open = false;
    await refreshProjectsCatalog(true);
    await refreshAll(false);
    const projectId = selectedProjectId();
    await refreshProjectOperationalState(projectId, false);
    renderShell();
    setProjectWorkflowMessage(`Project "${projectName}" is ready.`, 'success');
    showToast('Project setup completed.', 'success');
  });
}

async function addProjectToCatalog() {
  const name = String(ui.projectAddName.value || '').trim();
  if (!name) {
    showToast('Project name is required to add a project.', 'error');
    return;
  }
  await runWithBusyButton(ui.projectAddButton, 'Adding...', async () => {
    const added = await addProject({
      name,
      root: String(ui.projectAddRoot.value || '').trim() || undefined,
      db_path: String(ui.projectAddDbPath.value || '').trim() || undefined,
      monitor_policy: monitorPolicyFromUi(),
      bootstrap_monitoring: true,
      overwrite_existing_schedule: true,
    });
    const addedProjectId = String(added?.project?.id || '').trim();
    if (addedProjectId) {
      await selectProject(addedProjectId);
      state.activeProjectId = addedProjectId;
    }
    ui.projectAddName.value = '';
    ui.projectAddRoot.value = '';
    ui.projectAddDbPath.value = '';
    ui.projectAddAdvanced.open = false;
    await refreshProjectsCatalog(true);
    await refreshAll(false);
    const projectId = selectedProjectId();
    await refreshProjectOperationalState(projectId, false);
    renderShell();
    setProjectWorkflowMessage(`Added and switched to project "${name}".`, 'success');
    showToast('Project added and activated.', 'success');
  });
}

async function selectActiveProject() {
  const projectId = selectedProjectId();
  if (!projectId) {
    showToast('Select a project first.', 'error');
    return;
  }
  const selectedProject = selectedProjectRecord(projectId);
  if (selectedProject?.is_archived) {
    showToast('Restore this project before activating it.', 'error');
    return;
  }
  if (state.activeProjectId && String(projectId) === String(state.activeProjectId)) {
    setProjectWorkflowMessage('That project is already active.', 'info');
    showToast('Selected project is already active.', 'success');
    return;
  }
  await runWithBusyButton(ui.projectSelectButton, 'Switching...', async () => {
    await selectProject(projectId);
    state.detailCache.clear();
    state.selectedApi = null;
    await refreshProjectsCatalog(true);
    await refreshAll(false);
    state.selectedApi = state.status?.endpoints?.[0]?.endpoint_path || null;
    await refreshProjectOperationalState(projectId, false);
    renderShell();
    setProjectWorkflowMessage('Switched active project. Dashboard data now reflects the selected project.', 'success');
    showToast('Project selected.', 'success');
  });
}

async function archiveSelectedProjectFromCatalog() {
  const projectId = selectedProjectId();
  if (!projectId) {
    showToast('Select a project first.', 'error');
    return;
  }
  const project = selectedProjectRecord(projectId);
  if (!project) {
    showToast('Selected project was not found.', 'error');
    return;
  }
  if (project.is_archived) {
    setProjectWorkflowMessage('Selected project is already archived.', 'info');
    showToast('Project is already archived.', 'success');
    return;
  }
  await runWithBusyButton(ui.projectArchiveButton, 'Archiving...', async () => {
    await archiveProject(projectId);
    ui.projectDeleteConfirm.value = '';
    await refreshProjectsCatalog(true);
    await refreshAll(false);
    await refreshProjectOperationalState(operationalProjectIdFromCatalog(), false);
    renderShell();
    setProjectWorkflowMessage(`Project "${project.name}" archived.`, 'success');
    showToast('Project archived.', 'success');
  });
}

async function restoreSelectedProjectFromCatalog() {
  const projectId = selectedProjectId();
  if (!projectId) {
    showToast('Select a project first.', 'error');
    return;
  }
  const project = selectedProjectRecord(projectId);
  if (!project) {
    showToast('Selected project was not found.', 'error');
    return;
  }
  if (!project.is_archived) {
    setProjectWorkflowMessage('Selected project is already active in catalog.', 'info');
    showToast('Project is not archived.', 'success');
    return;
  }
  await runWithBusyButton(ui.projectRestoreButton, 'Restoring...', async () => {
    await restoreProject(projectId);
    ui.projectDeleteConfirm.value = '';
    await refreshProjectsCatalog(true);
    await refreshAll(false);
    await refreshProjectOperationalState(operationalProjectIdFromCatalog(), false);
    renderShell();
    setProjectWorkflowMessage(`Project "${project.name}" restored.`, 'success');
    showToast('Project restored.', 'success');
  });
}

async function deleteSelectedProjectFromCatalog() {
  const projectId = selectedProjectId();
  if (!projectId) {
    showToast('Select a project first.', 'error');
    return;
  }
  const project = selectedProjectRecord(projectId);
  if (!project) {
    showToast('Selected project was not found.', 'error');
    return;
  }
  if (!project.is_archived) {
    showToast('Archive the project first before deleting it.', 'error');
    return;
  }
  const expectedName = String(project.name || '').trim();
  const typedName = String(ui.projectDeleteConfirm.value || '').trim();
  if (!expectedName || typedName !== expectedName) {
    showToast(`Type "${expectedName}" exactly to delete this project.`, 'error');
    return;
  }
  await runWithBusyButton(ui.projectDeleteButton, 'Deleting...', async () => {
    await deleteProject(projectId);
    ui.projectDeleteConfirm.value = '';
    await refreshProjectsCatalog(true);
    await refreshAll(false);
    await refreshProjectOperationalState(operationalProjectIdFromCatalog(), false);
    renderShell();
    setProjectWorkflowMessage(`Project "${project.name}" deleted.`, 'success');
    showToast('Project deleted.', 'success');
  });
}

async function saveSelectedProjectPolicy() {
  const projectId = selectedProjectId();
  if (!projectId) {
    showToast('Select a project first.', 'error');
    return;
  }
  if (trackedEndpointCount() === 0) {
    const message = 'No APIs are tracked yet. Call your APIs first, then save setup.';
    setProjectWorkflowMessage(message, 'error');
    showToast(message, 'error');
    return;
  }
  const project = selectedProjectRecord(projectId);
  if (project?.is_archived) {
    showToast('Restore this project before updating setup.', 'error');
    return;
  }
  await runWithBusyButton(ui.projectPolicySaveButton, 'Saving & applying...', async () => {
    const payload = monitorPolicyFromUi();
    const response = await setProjectMonitorPolicy(projectId, payload as any);
    state.projectMonitorPolicy = response.monitor_policy || payload;
    state.projectPolicyLoadedFor = projectId;
    const applyResult = await applyProjectMonitorPolicy(projectId, { overwrite_existing_schedule: true });
    await refreshProjectsCatalog(false);
    await refreshScheduler();
    await refreshAll(false);
    await refreshProjectOperationalState(projectId, false);
    const applied = Number(applyResult.applied || 0);
    const requested = Number(applyResult.requested || 0);
    const blockers = policyApplyBlockers(applyResult);
    renderShell();
    if (applied > 0) {
      const detail = blockers.length ? ` ${blockers[0]}` : '';
      setProjectWorkflowMessage(`Check setup saved and applied to ${applied}/${requested} APIs.${detail}`, 'success');
      showToast('Schedule setup saved and applied.', 'success');
      return;
    }
    const blockerCopy = blockers[0] || 'No API checks were scheduled yet.';
    setProjectWorkflowMessage(`Setup saved, but checks were not scheduled. ${blockerCopy}`, 'error');
    showToast('Setup saved, but nothing was scheduled yet.', 'error');
  });
}

async function applySelectedProjectPolicy() {
  const projectId = selectedProjectId();
  if (!projectId) {
    showToast('Select a project first.', 'error');
    return;
  }
  if (trackedEndpointCount() === 0) {
    const message = 'No APIs are tracked yet. Call your APIs first, then apply setup.';
    setProjectWorkflowMessage(message, 'error');
    showToast(message, 'error');
    return;
  }
  const project = selectedProjectRecord(projectId);
  if (project?.is_archived) {
    showToast('Restore this project before applying setup.', 'error');
    return;
  }
  await runWithBusyButton(ui.projectPolicyApplyButton, 'Applying...', async () => {
    const result = await applyProjectMonitorPolicy(projectId, { overwrite_existing_schedule: true });
    await refreshScheduler();
    await refreshAll(false);
    const applied = Number(result.applied || 0);
    const requested = Number(result.requested || 0);
    const blockers = policyApplyBlockers(result);
    if (applied > 0) {
      const detail = blockers.length ? ` ${blockers[0]}` : '';
      setProjectWorkflowMessage(`Schedule setup re-applied to ${applied}/${requested} APIs.${detail}`, 'success');
      showToast('Schedule setup re-applied.', 'success');
      return;
    }
    const blockerCopy = blockers[0] || 'No API checks were scheduled yet.';
    setProjectWorkflowMessage(`Setup re-applied, but checks were not scheduled. ${blockerCopy}`, 'error');
    showToast('No checks were scheduled yet.', 'error');
  });
}

async function runSelectedProjectBundle() {
  const projectId = selectedProjectId();
  if (!projectId) {
    showToast('Select a project first.', 'error');
    return;
  }
  if (trackedEndpointCount() === 0) {
    const message = 'No APIs are tracked yet. Call your APIs first, then run checks.';
    setProjectWorkflowMessage(message, 'error');
    showToast(message, 'error');
    return;
  }
  const project = selectedProjectRecord(projectId);
  if (project?.is_archived) {
    showToast('Restore this project before running checks.', 'error');
    return;
  }
  await runWithBusyButton(ui.projectRunBundleButton, 'Running...', async () => {
    if (runnableWatchJobCount() === 0) {
      const bootstrap = await applyProjectMonitorPolicy(projectId, { overwrite_existing_schedule: false });
      await refreshScheduler();
      const bootstrapApplied = Number(bootstrap.applied || 0);
      if (bootstrapApplied === 0) {
        const blockers = policyApplyBlockers(bootstrap);
        const blockerCopy = blockers[0] || 'No runnable API schedules are configured yet.';
        setProjectWorkflowMessage(`Cannot run checks yet. ${blockerCopy}`, 'error');
        showToast('Checks are blocked until setup is complete.', 'error');
        return;
      }
      setProjectWorkflowMessage(`Auto-applied setup for ${bootstrapApplied} API${bootstrapApplied === 1 ? '' : 's'} before running checks.`, 'info');
    }
    const result = await runProjectBundle(projectId);
    await refreshProjectOperationalState(projectId, true);
    await refreshAll(false);
    renderShell();
    const summary = `Checks finished: ${result.status || 'done'} • planned ${fmt(result.requested || 0)} • completed ${fmt(result.executed || 0)} • errors ${fmt(result.errors || 0)}`;
    const runStatus = String(result.status || '').toLowerCase();
    const blocked = runStatus === 'not_scheduled' || Number(result.executed || 0) === 0;
    if (blocked) {
      const blockerMessage = String(result.message || '').trim()
        || 'No checks could run. Verify API defaults in setup and retry.';
      setProjectWorkflowMessage(`${summary}. ${blockerMessage}`, 'error');
      showToast('No checks were executed.', 'error');
      return;
    }
    setProjectWorkflowMessage(summary, Number(result.errors || 0) > 0 ? 'info' : 'success');
    showToast('Check run completed.', Number(result.errors || 0) > 0 ? 'error' : 'success');
  });
}

async function promoteSelectedProjectBaseline() {
  const projectId = selectedProjectId();
  if (!projectId) {
    showToast('Select a project first.', 'error');
    return;
  }
  if (trackedEndpointCount() === 0) {
    const message = 'No APIs are tracked yet. Call your APIs first, then refresh targets.';
    setProjectWorkflowMessage(message, 'error');
    showToast(message, 'error');
    return;
  }
  const project = selectedProjectRecord(projectId);
  if (project?.is_archived) {
    showToast('Restore this project before refreshing targets.', 'error');
    return;
  }
  await runWithBusyButton(ui.projectBaselinePromoteButton, 'Promoting...', async () => {
    const result = await promoteProjectBaseline(projectId, {});
    const promoted = Number(result.promoted || 0);
    const requested = Number(result.requested || 0);
    await refreshAll(false);
    await refreshProjectOperationalState(projectId, false);
    renderShell();
    setProjectWorkflowMessage(`Targets refreshed for ${promoted}/${requested} APIs.`, promoted > 0 ? 'success' : 'info');
    showToast('Target refresh finished.', promoted > 0 ? 'success' : 'error');
  });
}

async function runSelectedProjectHealthCheck() {
  const projectId = selectedProjectId();
  if (!projectId) {
    showToast('Select a project first.', 'error');
    return;
  }
  const project = selectedProjectRecord(projectId);
  if (project?.is_archived) {
    showToast('Restore this project before running health checks.', 'error');
    return;
  }
  await runWithBusyButton(ui.projectHealthCheckButton, 'Checking...', async () => {
    state.projectHealth = await healthCheck(projectId);
    renderShell();
    setProjectWorkflowMessage('Health status refreshed.', 'success');
    showToast('Health check completed.', 'success');
  });
}

async function refreshProjectMonitorGrid() {
  await runWithBusyButton(ui.projectMonitorRefreshButton, 'Refreshing...', async () => {
    state.projectsMonitorSnapshot = await monitorProjects();
    renderShell();
    setProjectWorkflowMessage('Portfolio health refreshed.', 'success');
    showToast('Portfolio health updated.', 'success');
  });
}

async function generateExecutiveDigest() {
  const projectId = selectedProjectId();
  if (!projectId) {
    showToast('Select a project first.', 'error');
    return;
  }
  const project = selectedProjectRecord(projectId);
  if (project?.is_archived) {
    showToast('Restore this project before generating reports.', 'error');
    return;
  }
  if (trackedEndpointCount() === 0) {
    const message = 'No APIs are tracked yet. Call your APIs first, then generate reports.';
    setProjectWorkflowMessage(message, 'error');
    showToast(message, 'error');
    return;
  }
  await runWithBusyButton(ui.projectReportDigestButton, 'Generating...', async () => {
    const days = 7;
    const limit = 200;
    state.projectDigest = await executiveDigest(projectId, days, limit);
    try {
      const params = new URLSearchParams();
      params.set('format', 'markdown');
      params.set('days', String(days));
      params.set('limit', String(limit));
      if (projectId) params.set('project_id', projectId);
      const response = await fetch(`/jin/api/v2/reports/leadership-digest?${params.toString()}`);
      if (response.ok) {
        const markdown = await response.text();
        downloadText(
          `jin-report-pack-${new Date().toISOString().slice(0, 10)}.md`,
          markdown,
          'text/markdown;charset=utf-8;',
        );
      }
    } catch (_error) {
      // Report preview is still shown in the dashboard even if markdown download fails.
    }
    renderShell();
    setProjectWorkflowMessage('Leadership report generated for the latest 7 days.', 'success');
    showToast('Report pack is ready.', 'success');
  });
}

function changePage(kind: string, delta: number) {
  if (kind === 'incidents') state.incidentPage = Math.max(1, state.incidentPage + delta);
  if (kind === 'uploads') state.uploadPage = Math.max(1, state.uploadPage + delta);
  if (kind === 'runs') state.runPage = Math.max(1, state.runPage + delta);
  if (kind === 'uploads' || kind === 'runs') {
    if (state.selectedApi) {
      const detail = selectedApiDetail();
      if (detail) renderApiDetail(detail);
    }
    return;
  }
  renderIncidents();
}

function confirmIncident(id: number, action: string, minutes = 0) {
  const copy = action === 'resolved'
    ? `Resolve issue ${id}?`
    : action === 'acknowledged'
      ? `Mark issue ${id} as in review?`
      : `Apply "${action}" to issue ${id}?`;
  openConfirm('Confirm issue action', copy, async () => {
    await incidentAction(id, action, minutes);
  });
}

function confirmDrawerIncident(id: number, action: string, minutes = 0) {
  confirmIncident(id, action, minutes);
}

function confirmScheduler(jobId: string, action: string) {
  openConfirm('Confirm scheduler action', `Apply "${action}" to job ${jobId}?`, async () => {
    await schedulerAction(jobId, action);
  });
}

async function refreshAll(keepApi = false) {
  const results = await Promise.allSettled([
    refreshStatus(),
    refreshAnomalies(),
    refreshScheduler(),
    ensurePoPlaybookLoaded(false),
  ]);
  const [statusResult, anomaliesResult, schedulerResult, playbookResult] = results;

  const statusFailed = statusResult.status === 'rejected';
  if (!statusFailed) {
    state.apiDataState = 'fresh';
    state.apiDataMessage = null;
    state.apiDataUpdatedAt = new Date().toISOString();
    cacheStatusSnapshot();
  } else {
    const statusFailure = classifyStatusRefreshFailure(statusResult.reason);
    const restored = restoreStatusSnapshotFromCache();
    const hasStatusData = Boolean((state.status?.endpoints || []).length);
    if (restored || hasStatusData) {
      state.apiDataState = 'stale';
      state.apiDataMessage = 'Live connection interrupted. Showing the last known API snapshot.';
    } else {
      state.apiDataState = statusFailure.state;
      state.apiDataMessage = statusFailure.message;
    }
    notifyAsyncError(statusResult.reason, 'Failed to refresh API status.');
  }

  if (!statusFailed && anomaliesResult.status === 'rejected') {
    notifyAsyncError(anomaliesResult.reason, 'Failed to refresh issues.');
  }
  if (!statusFailed && schedulerResult.status === 'rejected') {
    notifyAsyncError(schedulerResult.reason, 'Failed to refresh scheduler.');
  }
  if (!statusFailed && state.currentView === 'playbook' && playbookResult.status === 'rejected') {
    notifyAsyncError(playbookResult.reason, 'Failed to load PO playbook.');
  }

  renderShell();
  try {
    if (keepApi && state.selectedApi) {
      const detail = await loadDetail(state.selectedApi);
      if (!detail) return;
      state.activeApiDetail = detail;

      // Determine the current setup step for the selected API
      const isConfirmed = detail.operator_metadata?.confirmed;
      const hasRefs = (detail.upload_activity || []).length > 0;
      let activeStep = 1;
      if (isConfirmed && !hasRefs) activeStep = 2;
      if (isConfirmed && hasRefs) activeStep = 3;

      // AUTO-SWITCH: If we just finished Step 2 (upload) but the user is still on the 'uploads' tab,
      // push them to 'summary' so they see the progress/results.
      if (activeStep === 3 && state.currentApiTab === 'uploads') {
        state.currentApiTab = 'summary';
        syncBrowserRoute('replace');
        // Re-call to ensure everything is in sync for the new tab
        setTimeout(() => renderApiDetail(detail), 0);
        return;
      }
      renderApiDetail(detail);
    }
  } catch (error) {
    notifyAsyncError(error, 'Failed to refresh selected API details.');
  }
}

ui.checkNowButton.addEventListener('click', () => {
  manualCheck();
});

ui.nav.addEventListener('click', async (event: Event) => {
  const button = closestButton(event.target, 'button[data-view]');
  if (!button) return;
  state.currentView = button.dataset.view;
  syncBrowserRoute('push');
  renderShell();
  if (state.currentView === 'playbook') {
    void ensurePoPlaybookLoaded(true).then(() => {
      if (state.currentView === 'playbook') renderShell();
    }).catch((error) => {
      notifyAsyncError(error, 'Failed to load PO playbook.');
    });
  }
  if (state.currentView === 'api' && state.selectedApi) {
    const detail = await loadDetail(state.selectedApi);
    if (!detail) return;
    state.activeApiDetail = detail;
    renderApiDetail(detail);
  }
});

document.addEventListener('click', async (event: Event) => {
  const button = closestButton(event.target, 'button[data-view]');
  if (!button || button.closest('#nav')) return;
  state.currentView = button.dataset.view as any;
  syncBrowserRoute('push');
  renderShell();
  if (state.currentView === 'playbook') {
    void ensurePoPlaybookLoaded(true).then(() => {
      if (state.currentView === 'playbook') renderShell();
    }).catch((error) => {
      notifyAsyncError(error, 'Failed to load PO playbook.');
    });
  }
  if (state.currentView === 'api' && state.selectedApi) {
    const detail = await loadDetail(state.selectedApi);
    if (!detail) return;
    renderApiDetail(detail);
  }
});

ui.sidebarToggle.addEventListener('click', () => {
  setSidebarCollapsed(document.body.dataset.sidebar !== 'collapsed');
});

ui.apiSearch.addEventListener('input', (event: Event) => {
  const input = event.target as HTMLInputElement | null;
  state.apiFilter = input?.value || '';
  persistPreferences();
  renderSidebar();
});

ui.apiStatusFilter.addEventListener('change', (event: Event) => {
  const select = event.target as HTMLSelectElement | null;
  state.apiStatusFilter = select?.value || '';
  persistPreferences();
  renderSidebar();
});
ui.errorSearch.addEventListener('input', (event: Event) => {
  const input = event.target as HTMLInputElement | null;
  state.errorSearch = input?.value || '';
  persistPreferences();
  renderErrors();
});
ui.errorStatusFilter.addEventListener('change', (event: Event) => {
  const select = event.target as HTMLSelectElement | null;
  state.errorStatusFilter = select?.value || '';
  persistPreferences();
  renderErrors();
});
ui.errorCategoryFilter.addEventListener('change', (event: Event) => {
  const select = event.target as HTMLSelectElement | null;
  state.errorCategoryFilter = select?.value || '';
  persistPreferences();
  renderErrors();
});
ui.errorSeverityFilter.addEventListener('change', (event: Event) => {
  const select = event.target as HTMLSelectElement | null;
  state.errorSeverityFilter = select?.value || '';
  persistPreferences();
  renderErrors();
});
ui.incidentSort.addEventListener('change', (event: Event) => {
  const select = event.target as HTMLSelectElement | null;
  state.incidentSort = select?.value || 'business';
  state.incidentPage = 1;
  persistPreferences();
  renderIncidents();
});
document.addEventListener('change', (event: Event) => {
  const target = event.target as HTMLElement | null;
  if ((target as HTMLSelectElement | null)?.id === 'run-sort') {
    state.runSort = (target as HTMLSelectElement).value || 'observed_at_desc';
    state.runPage = 1;
    persistPreferences();
    if (state.selectedApi) {
      const detail = selectedApiDetail();
      if (detail) renderApiDetail(detail);
    }
  }
  if ((target as HTMLSelectElement | null)?.id === 'upload-sort') {
    state.uploadSort = (target as HTMLSelectElement).value || 'uploaded_at_desc';
    state.uploadPage = 1;
    persistPreferences();
    if (state.selectedApi) {
      const detail = selectedApiDetail();
      if (detail) renderApiDetail(detail);
    }
  }
  if ((target as HTMLSelectElement | null)?.id === 'incident-status-select') {
    state.incidentStatusFilter = (target as HTMLSelectElement).value || '';
    state.incidentPage = 1;
    persistPreferences();
    renderIncidents();
  }
  if ((target as HTMLSelectElement | null)?.id === 'incident-severity-select') {
    state.incidentSeverityFilter = (target as HTMLSelectElement).value || '';
    state.incidentPage = 1;
    persistPreferences();
    renderIncidents();
  }
  if (target?.classList?.contains('bulk-incident')) {
    const selectedCount = document.querySelectorAll('.bulk-incident:checked').length;
    ui.bulkPreview.textContent = selectedCount
      ? `${selectedCount} issue${selectedCount === 1 ? '' : 's'} selected.`
      : 'Select one or more issues to apply one action.';
    ui.bulkAction.style.display = selectedCount ? '' : 'none';
    ui.bulkNote.style.display = selectedCount ? '' : 'none';
    ui.bulkRun.style.display = selectedCount ? '' : 'none';
  }
});

ui.apiList.addEventListener('click', async (event: Event) => {
  const toggle = closestButton(event.target, '[data-group-toggle]');
  if (toggle) {
    const group = toggle.dataset.groupToggle;
    state.collapsedGroups[group] = !state.collapsedGroups[group];
    renderSidebar();
    return;
  }
  const button = closestButton(event.target, '[data-api]');
  if (!button) return;
  await openApi(button.dataset.api);
});

ui.logoutButton.addEventListener('click', (event: Event) => {
  event.preventDefault();
  window.location.assign('/jin/logout');
});
ui.themeSelect.addEventListener('change', (event: Event) => {
  const value = (event.target as HTMLSelectElement).value || 'dark';
  setTheme(value);
});
ui.poModeToggle.addEventListener('change', (event: Event) => {
  const checked = Boolean((event.target as HTMLInputElement | null)?.checked);
  applyPoMode(checked, { explicit: true, toast: true });
});
(window as any).disablePoModeForEditing = function disablePoModeForEditing() {
  applyPoMode(false, { explicit: true, toast: true });
};
ui.densitySelect.addEventListener('change', (event: Event) => {
  const select = event.target as HTMLSelectElement | null;
  setDensity(select?.value || 'comfortable');
  persistPreferences();
  renderShell();
  if (state.selectedApi) {
    const detail = selectedApiDetail();
    if (detail) renderApiDetail(detail);
  }
});
ui.defaultViewSelect.addEventListener('change', (event: Event) => {
  const select = event.target as HTMLSelectElement | null;
  state.defaultView = select?.value || 'overview';
  persistPreferences();
  showToast(`Default view set to ${state.defaultView}.`, 'success');
});

function triggerOnEnter(input: HTMLInputElement, action: () => void) {
  input.addEventListener('keydown', (event: KeyboardEvent) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    action();
  });
}

ui.projectRegisterButton.addEventListener('click', () => {
  void registerProjectOperator().catch((error) => {
    setProjectWorkflowMessage(errorMessage(error), 'error');
    notifyAsyncError(error, 'Registration failed.');
  });
});
ui.projectAddButton.addEventListener('click', () => {
  void addProjectToCatalog().catch((error) => {
    setProjectWorkflowMessage(errorMessage(error), 'error');
    notifyAsyncError(error, 'Add project failed.');
  });
});
ui.projectSelectButton.addEventListener('click', () => {
  void selectActiveProject().catch((error) => {
    setProjectWorkflowMessage(errorMessage(error), 'error');
    notifyAsyncError(error, 'Project selection failed.');
  });
});
ui.projectArchiveButton.addEventListener('click', () => {
  void archiveSelectedProjectFromCatalog().catch((error) => {
    setProjectWorkflowMessage(errorMessage(error), 'error');
    notifyAsyncError(error, 'Archiving project failed.');
  });
});
ui.projectRestoreButton.addEventListener('click', () => {
  void restoreSelectedProjectFromCatalog().catch((error) => {
    setProjectWorkflowMessage(errorMessage(error), 'error');
    notifyAsyncError(error, 'Restoring project failed.');
  });
});
ui.projectDeleteButton.addEventListener('click', () => {
  void deleteSelectedProjectFromCatalog().catch((error) => {
    setProjectWorkflowMessage(errorMessage(error), 'error');
    notifyAsyncError(error, 'Deleting project failed.');
  });
});
ui.projectPolicySaveButton.addEventListener('click', () => {
  void saveSelectedProjectPolicy().catch((error) => {
    setProjectWorkflowMessage(errorMessage(error), 'error');
    notifyAsyncError(error, 'Saving setup failed.');
  });
});
ui.projectPolicyApplyButton.addEventListener('click', () => {
  void applySelectedProjectPolicy().catch((error) => {
    setProjectWorkflowMessage(errorMessage(error), 'error');
    notifyAsyncError(error, 'Applying setup failed.');
  });
});
ui.projectRunBundleButton.addEventListener('click', () => {
  void runSelectedProjectBundle().catch((error) => {
    setProjectWorkflowMessage(errorMessage(error), 'error');
    notifyAsyncError(error, 'Running checks failed.');
  });
});
ui.projectBaselinePromoteButton.addEventListener('click', () => {
  void promoteSelectedProjectBaseline().catch((error) => {
    setProjectWorkflowMessage(errorMessage(error), 'error');
    notifyAsyncError(error, 'Refreshing targets failed.');
  });
});
ui.projectHealthCheckButton.addEventListener('click', () => {
  void runSelectedProjectHealthCheck().catch((error) => {
    setProjectWorkflowMessage(errorMessage(error), 'error');
    notifyAsyncError(error, 'Health check failed.');
  });
});
ui.projectMonitorRefreshButton.addEventListener('click', () => {
  void refreshProjectMonitorGrid().catch((error) => {
    setProjectWorkflowMessage(errorMessage(error), 'error');
    notifyAsyncError(error, 'Refreshing portfolio health failed.');
  });
});
ui.projectReportDigestButton.addEventListener('click', () => {
  void generateExecutiveDigest().catch((error) => {
    setProjectWorkflowMessage(errorMessage(error), 'error');
    notifyAsyncError(error, 'Generating report pack failed.');
  });
});
ui.poActionWorkflow.addEventListener('click', () => {
  state.currentView = 'playbook';
  syncBrowserRoute('push');
  renderShell();
  const workflowPanel = document.getElementById('playbook-core-workflow');
  workflowPanel?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  ui.projectRegisterName.focus();
});
ui.poActionValidation.addEventListener('click', () => {
  state.currentView = 'api';
  state.currentApiTab = 'uploads';
  syncBrowserRoute('push');
  renderShell();
  if (state.selectedApi) {
    void loadDetail(state.selectedApi).then((detail) => {
      if (!detail) return;
      state.activeApiDetail = detail;
      renderApiDetail(detail);
    });
  }
});
ui.poActionChecks.addEventListener('click', () => {
  void runSelectedProjectBundle().catch((error) => {
    setProjectWorkflowMessage(errorMessage(error), 'error');
    notifyAsyncError(error, 'Running checks failed.');
  });
});
ui.poActionBaseline.addEventListener('click', () => {
  void promoteSelectedProjectBaseline().catch((error) => {
    setProjectWorkflowMessage(errorMessage(error), 'error');
    notifyAsyncError(error, 'Refreshing baseline targets failed.');
  });
});
ui.poActionHealth.addEventListener('click', () => {
  void runSelectedProjectHealthCheck().catch((error) => {
    setProjectWorkflowMessage(errorMessage(error), 'error');
    notifyAsyncError(error, 'Health check failed.');
  });
});
ui.poActionReport.addEventListener('click', () => {
  void generateExecutiveDigest().catch((error) => {
    setProjectWorkflowMessage(errorMessage(error), 'error');
    notifyAsyncError(error, 'Generating report pack failed.');
  });
});
ui.projectActiveSelect.addEventListener('change', () => {
  const projectId = selectedProjectId();
  ui.projectDeleteConfirm.value = '';
  if (!projectId) return;
  const project = selectedProjectRecord(projectId);
  if (project?.is_archived) {
    state.projectMonitorPolicy = null;
    state.projectPolicyLoadedFor = null;
    state.projectHealth = null;
    state.projectRunHistory = [];
    state.projectDigest = null;
    renderShell();
    return;
  }
  void (async () => {
    try {
      const policyPayload = await getProjectMonitorPolicy(projectId);
      state.projectMonitorPolicy = policyPayload.monitor_policy || null;
      state.projectPolicyLoadedFor = projectId;
      await refreshProjectOperationalState(projectId, false);
      renderShell();
    } catch (error) {
      notifyAsyncError(error, 'Failed to load project setup.');
    }
  })();
});
ui.projectDeleteConfirm.addEventListener('input', () => {
  renderShell();
});
triggerOnEnter(ui.projectRegisterName, () => ui.projectRegisterButton.click());
triggerOnEnter(ui.projectRegisterPass, () => ui.projectRegisterButton.click());
triggerOnEnter(ui.projectAddName, () => ui.projectAddButton.click());
triggerOnEnter(ui.projectDeleteConfirm, () => ui.projectDeleteButton.click());

ui.runReportButton.addEventListener('click', () => {
  void runReport();
});
ui.exportReportCsv.addEventListener('click', () => {
  void exportReportCsv();
});
ui.uploadButton.addEventListener('click', uploadReferences);
ui.previewUploadButton.addEventListener('click', previewUpload);
ui.cancelUploadButton.addEventListener('click', () => {
  ui.uploadFile.value = '';
  ui.uploadPreviewStep.style.display = 'none';
  ui.uploadPreviewBody.innerHTML = '';
  ui.uploadConfirmToolbar.style.display = 'none';
  ui.uploadFeedback.textContent = '';
});
ui.exportOverviewJson.addEventListener('click', () => {
  downloadJson('jin-overview.json', {
    summary: reportSummary(),
    status: state.status,
    anomalies: state.anomalies,
    scheduler: state.scheduler,
  });
});
ui.exportOverviewReport.addEventListener('click', () => {
  downloadText('jin-overview-brief.md', buildOverviewReport(), 'text/markdown;charset=utf-8;');
});
ui.exportOverviewHtml.addEventListener('click', () => {
  downloadText('jin-overview-brief.html', buildOverviewHtmlReport(), 'text/html;charset=utf-8;');
});
ui.exportErrorsJson.addEventListener('click', () => {
  downloadJson('jin-errors.json', {
    generated_at: new Date().toISOString(),
    project: state.status?.project || null,
    filters: {
      search: state.errorSearch,
      status: state.errorStatusFilter,
      category: state.errorCategoryFilter,
      severity: state.errorSeverityFilter,
    },
    errors: state.status?.recent_errors || [],
  });
});
ui.exportErrorsReport.addEventListener('click', () => {
  const rows = (state.status?.recent_errors || []).filter((item) => {
    const category = item.source.startsWith('scheduler')
      ? 'Scheduler'
      : item.source.startsWith('router.upload') || item.source.startsWith('router.save_references')
        ? 'Upload'
        : item.source.startsWith('router.save_config') || item.source.startsWith('config.')
          ? 'Configuration'
          : item.source.startsWith('router.') || item.source.startsWith('middleware.')
            ? 'Runtime'
            : 'General';
    const severity = item.source.startsWith('scheduler') || item.source.startsWith('middleware.process_response')
      ? 'high'
      : item.source.startsWith('router.status') || item.source.startsWith('router.endpoint_detail')
        ? 'medium'
        : 'low';
    const haystack = `${item.source} ${item.message} ${item.hint || ''} ${item.endpoint_path || ''}`.toLowerCase();
    return (!state.errorSearch || haystack.includes(state.errorSearch.toLowerCase()))
      && (!state.errorStatusFilter || (item.status || 'open') === state.errorStatusFilter)
      && (!state.errorCategoryFilter || category === state.errorCategoryFilter)
      && (!state.errorSeverityFilter || severity === state.errorSeverityFilter);
  });
  downloadText(
    'jin-errors-brief.md',
    [
      '# Jin Error Brief',
      '',
      `Project: ${state.status?.project?.name || 'unknown'}`,
      `Root: ${state.status?.project?.root || 'unknown'}`,
      `DB: ${state.status?.project?.db_path || 'unknown'}`,
      '',
      ...rows.map((item) => [
        `## ${item.source}`,
        `- Message: ${item.message}`,
        `- Endpoint: ${item.endpoint_path || 'workspace-level'}`,
        `- Created: ${item.created_at || 'unknown'}`,
        `- Status: ${item.status || 'open'}`,
        `- Hint: ${item.hint || 'No remediation hint recorded.'}`,
        `- Remediation: ${(item.remediation_steps || []).join(' | ') || 'No remediation steps recorded.'}`,
        `- Detail: ${item.detail || 'No extra detail recorded.'}`,
        '',
      ].join('\\n')),
    ].join('\\n'),
    'text/markdown;charset=utf-8;',
  );
});
ui.exportIncidents.addEventListener('click', () => {
  const anomalies = sortIncidents(allIncidentRows()).map((item) => ({
    id: item.id,
    endpoint_path: item.endpoint_path,
    kpi_field: item.kpi_field,
    status: item.status,
    severity: item.severity,
    confidence: item.confidence,
    actual_value: item.actual_value,
    baseline_used: item.baseline_used,
    pct_change: item.pct_change,
    detected_at: item.detected_at,
    note: item.note,
    owner: item.owner,
    resolution_reason: item.resolution_reason,
  }));
  downloadCsv('jin-incidents.csv', anomalies);
});
ui.exportIncidentsJson.addEventListener('click', () => {
  downloadJson('jin-incidents.json', {
    generated_at: new Date().toISOString(),
    filters: {
      status: state.incidentStatusFilter,
      severity: state.incidentSeverityFilter,
      sort: state.incidentSort,
    },
    incidents: incidentRows(),
  });
});
ui.exportIncidentsReport.addEventListener('click', () => {
  downloadText('jin-incidents-brief.md', buildIncidentReport(), 'text/markdown;charset=utf-8;');
});
ui.exportIncidentsHtml.addEventListener('click', () => {
  downloadText('jin-incidents-brief.html', buildIncidentsHtmlReport(), 'text/html;charset=utf-8;');
});
ui.exportUploads.addEventListener('click', () => {
  if (!state.selectedApi) return;
  const detail = selectedApiDetail();
  const rows = sortRows(detail?.upload_activity || [], state.uploadSort, 'uploaded_at').map((item) => ({
    uploaded_at: item.uploaded_at,
    grain_key: item.grain_key,
    kpi_field: item.kpi_field,
    expected_value: item.expected_value,
    tolerance_pct: item.tolerance_pct,
    upload_source: item.upload_source,
  }));
  downloadCsv('jin-uploads.csv', rows);
});
ui.exportRuns.addEventListener('click', () => {
  if (!state.selectedApi) return;
  const detail = selectedApiDetail();
  const monitoringRuns = [...(detail?.monitoring_runs || [])]
    .sort((a, b) => String(b?.started_at || '').localeCompare(String(a?.started_at || '')));
  const rows = monitoringRuns.length
    ? monitoringRuns.map((item) => ({
      run_id: item.run_id,
      started_at: item.started_at,
      finished_at: item.finished_at,
      trigger: item.trigger,
      source: item.source,
      status: item.status,
      duration_ms: item.duration_ms,
      grains_processed: item.grains_processed,
      anomalies_detected: item.anomalies_detected,
      error: item.error,
    }))
    : sortRows(detail?.recent_history || [], state.runSort, 'observed_at').map((item) => ({
      observed_at: item.observed_at,
      grain_key: item.grain_key,
      kpi_json: JSON.stringify(item.kpi_json || {}),
    }));
  downloadCsv('jin-runs.csv', rows);
});
ui.exportRunsJson.addEventListener('click', () => {
  if (!state.selectedApi) return;
  const detail = selectedApiDetail();
  const monitoringRuns = [...(detail?.monitoring_runs || [])]
    .sort((a, b) => String(b?.started_at || '').localeCompare(String(a?.started_at || '')));
  downloadJson('jin-runs.json', {
    endpoint_path: state.selectedApi,
    source: monitoringRuns.length ? 'run_ledger' : 'observation_history',
    sort: monitoringRuns.length ? 'started_at_desc' : state.runSort,
    runs: monitoringRuns.length
      ? monitoringRuns
      : sortRows(detail?.recent_history || [], state.runSort, 'observed_at'),
  });
});
ui.exportApiReport.addEventListener('click', () => {
  if (!state.selectedApi) return;
  const detail = selectedApiDetail();
  downloadText(`jin-api-${slug(state.selectedApi)}-brief.md`, buildApiReport(detail), 'text/markdown;charset=utf-8;');
});
ui.exportApiHtml.addEventListener('click', () => {
  if (!state.selectedApi) return;
  const detail = selectedApiDetail();
  downloadText(`jin-api-${slug(state.selectedApi)}-brief.html`, buildApiHtmlReport(detail), 'text/html;charset=utf-8;');
});
ui.saveNamedView.addEventListener('click', () => {
  const name = (ui.namedViewInput.value || '').trim();
  if (!name) {
    showToast('Add a name before saving a view.', 'error');
    return;
  }
  const view = namedViewPayload();
  view.name = name;
  state.savedViews = [view, ...(state.savedViews || []).filter((item) => item.name !== name)].slice(0, 12);
  saveNamedViews();
  renderSavedViews();
  ui.namedViewInput.value = '';
  showToast(`Saved view "${name}".`, 'success');
});
ui.exportNamedViews.addEventListener('click', () => {
  downloadJson('jin-named-views.json', {
    generated_at: new Date().toISOString(),
    operator_handle: normalizeOperatorHandle(state.operatorHandle || 'default'),
    default_view_id: readDefaultNamedViewId() || null,
    views: state.savedViews || [],
  });
});
ui.importNamedViewsButton.addEventListener('click', () => {
  ui.importNamedViewsFile.click();
});
ui.importNamedViewsFile.addEventListener('change', async (event: Event) => {
  const input = event.target as HTMLInputElement | null;
  const file = input?.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    const payload = JSON.parse(text);
    const imported = Array.isArray(payload?.views) ? payload.views : [];
    state.savedViews = imported.slice(0, 12);
    saveNamedViews();
    if (payload?.default_view_id) {
      localStorage.setItem(defaultNamedViewStorageKey(), String(payload.default_view_id));
    }
    renderSavedViews();
    showToast(`Imported ${state.savedViews.length} saved view(s).`, 'success');
  } catch (error) {
    showToast('Failed to import saved views.', 'error');
  } finally {
    ui.importNamedViewsFile.value = '';
  }
});
ui.bulkRun.addEventListener('click', runBulkAction);
ui.bulkAction.addEventListener('change', renderIncidents);
ui.drawerClose.addEventListener('click', closeIncidentDrawer);
ui.drawerBackdrop.addEventListener('click', closeIncidentDrawer);
ui.confirmCancel.addEventListener('click', closeConfirm);
ui.confirmBackdrop.addEventListener('click', closeConfirm);
ui.confirmAccept.addEventListener('click', async () => {
  const action = state.confirmAction;
  closeConfirm();
  if (action) await action();
});

window.openApi = openApi;
window.incidentAction = incidentAction;
window.schedulerAction = schedulerAction;
window.confirmIncident = confirmIncident;
window.confirmDrawerIncident = confirmDrawerIncident;
window.confirmScheduler = confirmScheduler;
window.confirmError = function confirmError(id: number, action: string) {
  openConfirm('Confirm error action', `Apply "${action}" to error ${id}?`, async () => {
    await errorAction(id, action);
  });
};
window.changePage = changePage;
window.saveIncidentNotes = saveIncidentNotes;
window.saveOperatorHandle = saveOperatorHandle;
window.applyResolutionPreset = applyResolutionPreset;
window.applyNamedView = async function applyNamedView(id: number) {
  const view = (state.savedViews || []).find((entry) => Number(entry.id) === Number(id));
  if (!view) return;
  state.apiFilter = view.apiFilter || '';
  state.apiStatusFilter = view.apiStatusFilter || '';
  state.errorSearch = view.errorSearch || '';
  state.errorStatusFilter = view.errorStatusFilter || '';
  state.errorCategoryFilter = view.errorCategoryFilter || '';
  state.errorSeverityFilter = view.errorSeverityFilter || '';
  state.incidentStatusFilter = view.incidentStatusFilter || '';
  state.incidentSeverityFilter = view.incidentSeverityFilter || '';
  state.incidentSort = view.incidentSort || 'business';
  state.runSort = view.runSort || 'observed_at_desc';
  state.uploadSort = view.uploadSort || 'uploaded_at_desc';
  state.currentView = normalizeView(view.currentView || 'overview');
  setDensity(view.density || 'comfortable');
  ui.apiSearch.value = state.apiFilter;
  ui.apiStatusFilter.value = state.apiStatusFilter;
  ui.errorSearch.value = state.errorSearch;
  ui.errorStatusFilter.value = state.errorStatusFilter;
  ui.errorCategoryFilter.value = state.errorCategoryFilter;
  ui.errorSeverityFilter.value = state.errorSeverityFilter;
  ui.incidentSort.value = state.incidentSort;
  persistPreferences();
  syncBrowserRoute('push');
  renderShell();
  if (state.currentView === 'api' && state.selectedApi) {
    const detail = await fetchDetail(state.selectedApi);
    renderApiDetail(detail);
  }
  showToast(`Applied saved view "${view.name}".`, 'success');
};
window.deleteNamedView = function deleteNamedView(id: number) {
  state.savedViews = (state.savedViews || []).filter((entry) => Number(entry.id) !== Number(id));
  saveNamedViews();
  renderSavedViews();
  showToast('Saved view deleted.', 'success');
};
window.setDefaultNamedView = function setDefaultNamedView(id: number) {
  localStorage.setItem(defaultNamedViewStorageKey(), String(id));
  renderSavedViews();
  showToast('Default saved view updated.', 'success');
};
window.showIncident = function showIncident(id: number) {
  const incidents = allIncidentRows();
  const item = incidents.find((entry) => Number(entry.id) === Number(id));
  if (item) openIncidentDrawer(item);
};

window.setView = function setView(v: any) {
  state.currentView = normalizeView(v);
  syncBrowserRoute('push');
  renderShell();
  if (state.currentView === 'playbook') {
    void ensurePoPlaybookLoaded(true).then(() => {
      if (state.currentView === 'playbook') renderShell();
    }).catch((error) => {
      notifyAsyncError(error, 'Failed to load PO playbook.');
      renderShell();
    });
  }
};

document.addEventListener('click', (e) => {
  if ((e.target as HTMLElement).id === 'activate-license-button') {
    activateLicense();
  }
});

function validateUserAction(fieldName: string, role: string, sampleVal: any) {
  if (role === 'kpi') {
    const isNumeric = typeof sampleVal === 'number' || (!isNaN(parseFloat(sampleVal)) && isFinite(sampleVal));
    if (!isNumeric) {
      showToast(`⚠️ "${fieldName}" contains text. Metrics should usually be numbers. Jin will try to count occurrences instead.`, 'info');
    }
  }
  if (role === 'time') {
    const sVal = String(sampleVal);
    // Flexible date detection: ISO, Unix, or Array Range ["2024-01-01", ...]
    const isDate = sVal.match(/^\d{4}/) || sVal.match(/^\d{10,13}$/) || sVal.match(/^\[?"\d{4}/);
    if (!isDate) {
      showToast(`⚠️ "${fieldName}" doesn't look like a date. Monitoring might fail if we can't find a pulse.`, 'warning');
    }
  }
}

function poModeEnabled(): boolean {
  return state.poMode !== false;
}

function blockInPoMode(message: string): boolean {
  if (!poModeEnabled()) return false;
  showToast(message, 'info');
  return true;
}

(window as any).updateFieldRole = function updateFieldRole(fieldName: string, role: string) {
  const detail = selectedApiDetail();
  if (!detail || !detail.setup_config) return;

  const rawSamples = detail.recent_history || [];
  const samples = rawSamples.map(s => flattenSample(s));
  const sampleVal = samples[0] ? resolveSampleFieldValue(samples[0], fieldName) : null;
  validateUserAction(fieldName, role, sampleVal);

  if (!detail.setup_config) {
      detail.setup_config = JSON.parse(JSON.stringify(detail.config || { dimension_fields: [], kpi_fields: [] }));
  }
  const dims = new Set((detail.setup_config.dimension_fields || []) as string[]);
  const kpis = new Set((detail.setup_config.kpi_fields || []) as string[]);
  const excluded = new Set((detail.setup_config.excluded_fields || []) as string[]);
  
  dims.delete(fieldName);
  kpis.delete(fieldName);
  excluded.delete(fieldName);

  if (detail.setup_config.time_field === fieldName) {
      delete detail.setup_config.time_field;
  }

  if (role === 'dimension') dims.add(fieldName);
  if (role === 'kpi') kpis.add(fieldName);
  if (role === 'exclude') excluded.add(fieldName);
  if (role === 'time') {
      detail.setup_config.time_field = fieldName;
  }

  detail.setup_config.dimension_fields = [...dims];
  detail.setup_config.kpi_fields = [...kpis];
  detail.setup_config.excluded_fields = [...excluded];
  renderFieldRoles(detail.fields, detail.setup_config, detail.metrics);
  if (role === 'time' || !detail.setup_config.time_field) (window as any).refreshTimePreview();
};

(window as any).toggleConfigFieldFocus = function toggleConfigFieldFocus(forceExpanded?: boolean) {
  const endpointPath = String(state.selectedApi || '').trim();
  if (!endpointPath) return;
  const current = Boolean(state.configFocusExpandedByApi?.[endpointPath]);
  const next = typeof forceExpanded === 'boolean' ? forceExpanded : !current;
  state.configFocusExpandedByApi = {
    ...(state.configFocusExpandedByApi || {}),
    [endpointPath]: next,
  };
  const detail = selectedApiDetail();
  if (!detail) return;
  renderFieldRoles(detail.fields, detail.setup_config || detail.config || {}, detail.metrics);
};

(window as any).updateExtractionRule = function updateExtractionRule(val: string) {
    const detail = selectedApiDetail();
    if (detail && detail.setup_config) {
        detail.setup_config.time_extraction_rule = val;
        (window as any).refreshTimePreview();
    }
};

(window as any).toggleTimeSettings = function toggleTimeSettings(name: string, event: Event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    if (!state.showTimeSettings) state.showTimeSettings = {};
    state.showTimeSettings[name] = !state.showTimeSettings[name];
    
    const detail = selectedApiDetail();
    if (detail) {
        renderFieldRoles(detail.fields, detail.setup_config, detail.metrics);
        if (detail.setup_config?.time_field === name) {
            (window as any).refreshTimePreview();
        }
    }
};

(window as any).refreshTimePreview = function refreshTimePreview() {
    const detail = selectedApiDetail();
    if (!detail || !detail.setup_config) return;
    
    // 1. Source Detection & Flattening
    const samples = setupSamples(detail);
    state.timePreview = null;
    state.grainReason = null;
    
    const potentialSources = new Set<string>();
    if (samples.length > 0) {
      const sampleRow = samples[0] as any;
      for (const [key, val] of Object.entries(sampleRow)) {
        if (isLikelyTimeValue(val)) potentialSources.add(key);
      }
      (detail.fields || []).forEach((field: any) => {
        const fieldName = String(field?.name || field || '').trim();
        if (!fieldName) return;
        const fieldValue = resolveSampleFieldValue(sampleRow, fieldName);
        if (isLikelyTimeValue(fieldValue)) potentialSources.add(fieldName);
      });
    }
    state.detectedTimeSources = Array.from(potentialSources);

    autoPromoteLikelyTimeField(detail, samples);
    const name = detail.setup_config.time_field;
    if (!name) {
      state.timePreview = 'Choose your business time field (you can change it later).';
      state.grainReason = 'Select the column that represents business time.';
      renderFieldRoles(detail.fields, detail.setup_config, detail.metrics);
      return;
    }

    const rule = detail.setup_config.time_extraction_rule || 'single';
    const isPinned = detail.setup_config.time_pin || false;

    if (!samples.length) {
      state.timePreview = 'No recent sample yet. Time preview appears after the next check.';
      state.grainReason = 'Setup is not blocked. Pick your time field now, then run one check to confirm cadence.';
      state.detectedGrain = detail.setup_config.time_granularity || state.detectedGrain || 'day';
      renderFieldRoles(detail.fields, detail.setup_config, detail.metrics);
      return;
    }

    const latestRow = samples[0];
    const rawVal = resolveSampleFieldValue(latestRow, name);
    if (rawVal === undefined || rawVal === null || rawVal === '') {
      state.timePreview = `No sample value found for "${name}"`;
      state.grainReason = 'Pick a different time field or run checks with a payload that includes this field.';
      state.detectedGrain = detail.setup_config.time_granularity || state.detectedGrain || 'day';
      renderFieldRoles(detail.fields, detail.setup_config, detail.metrics);
      return;
    }

    // --- 2. Smart Grain Detection (The Pulse) ---
    if (!isPinned && samples.length > 0) {
        const val = rawVal;
        
        // Auto-heuristic for Extraction Rule & Range
        if (Array.isArray(val) && val.length === 2 && rule !== 'range') {
            const d1 = new Date(val[0]).getTime();
            const d2 = new Date(val[1]).getTime();
            if (!isNaN(d1) && !isNaN(d2)) {
                detail.setup_config.time_extraction_rule = 'range';
                (window as any).refreshTimePreview(); 
                return;
            }
        }

        let detected = 'day';
        let reason = 'Daily Heartbeat detected.';

        if (rule === 'range' && Array.isArray(val) && val.length === 2) {
            const d1 = new Date(val[0]).getTime();
            const d2 = new Date(val[1]).getTime();
            const diffDays = Math.abs(d2 - d1) / (1000 * 60 * 60 * 24);
            if (diffDays >= 27 && diffDays <= 32) { detected = 'month'; reason = '1-month Range window.'; }
            else if (diffDays >= 6 && diffDays <= 8) { detected = 'week'; reason = '7-day Weekly window.'; }
            else { detected = 'day'; reason = `Custom ${Math.round(diffDays)}-day Window.`; }
        } else {
             // Deep Scan across history for Pulse
             if (samples.length >= 2) {
                 const t1Raw = resolveSampleFieldValue(samples[0], name);
                 const t2Raw = resolveSampleFieldValue(samples[1], name);
                 const t1 = Array.isArray(t1Raw) ? new Date(t1Raw[0]).getTime() : new Date(t1Raw).getTime();
                 const t2 = Array.isArray(t2Raw) ? new Date(t2Raw[0]).getTime() : new Date(t2Raw).getTime();
                 if (!isNaN(t1) && !isNaN(t2)) {
                     const gap = Math.abs(t1 - t2) / (1000 * 60 * 60 * 24);
                     if (gap >= 0.9 && gap <= 1.1) { detected = 'day'; reason = 'Confirmed Daily Pulse.'; }
                     else if (gap >= 6 && gap <= 8) { detected = 'week'; reason = 'Confirmed Weekly Pulse.'; }
                     else if (gap >= 28 && gap <= 31) { detected = 'month'; reason = 'Confirmed Monthly Pulse.'; }
                 }
             }
        }

        state.detectedGrain = detected;
        state.grainReason = reason;
        detail.setup_config.time_granularity = detected;
    } else if (isPinned) {
        state.detectedGrain = detail.setup_config.time_granularity;
        state.grainReason = 'Frequency is Pinned (Locked).';
    }

    // 3. Update Preview Presentation
    let preview = '';
    if (rule === 'range') {
      if (Array.isArray(rawVal) && rawVal.length >= 2) {
        const left = displayDateFromValue(rawVal[0]) || String(rawVal[0]);
        const right = displayDateFromValue(rawVal[1]) || String(rawVal[1]);
        preview = `Range: [${left} -> ${right}]`;
      } else {
        preview = 'Range mode needs two date values';
      }
    } else {
      const list = Array.isArray(rawVal) ? rawVal : [rawVal];
      const candidate = rule === 'last' ? list[list.length - 1] : list[0];
      const display = displayDateFromValue(candidate) || String(candidate);
      preview = `${rule === 'first' ? 'First' : rule === 'last' ? 'Last' : 'Pulse'}: ${display}`;
    }
    state.timePreview = preview;

    const previewVal = document.getElementById('time-preview-val');
    if (previewVal) previewVal.innerText = state.timePreview || 'No timeline preview yet';
    
    // Refresh UI
    renderFieldRoles(detail.fields, detail.setup_config, detail.metrics);
};

(window as any).pinGrain = function pinGrain() {
    const detail = selectedApiDetail();
    if (detail && detail.setup_config) {
        detail.setup_config.time_pin = !detail.setup_config.time_pin;
        (window as any).refreshTimePreview();
    }
};

(window as any).selectTimeSource = function selectTimeSource(fieldName: string) {
    const detail = selectedApiDetail();
    if (detail && detail.setup_config) {
        detail.setup_config.time_field = fieldName;
        state.detectedTimeSources = []; // Close picker
        (window as any).refreshTimePreview();
    }
};

/**
 * V7: Magic Scaffolding. 
 * Automatically guesses roles for a new API based on semantics.
 */
(window as any).runMagicGuess = function runMagicGuess(force = false) {
    const detail = selectedApiDetail();
    if (!detail || !detail.fields || !detail.setup_config) return;
    const endpointPath = String(detail.endpoint_path || state.selectedApi || '').trim();
    if (!endpointPath) return;

    // Only run if nothing is configured yet (or forced)
    const hasConfig = (detail.setup_config.dimension_fields?.length || 0) > 0 || 
                      (detail.setup_config.kpi_fields?.length || 0) > 0 ||
                      detail.setup_config.time_field;

    if (hasConfig && !force) {
        setAutoSuggestSummary(endpointPath, {
            headline: 'Setup already exists.',
            details: 'You can still edit roles manually if your business logic changed.',
            hasSuggestions: true,
        });
        renderFieldRoles(detail.fields, detail.setup_config, detail.metrics);
        return;
    }

    const samples = setupSamples(detail);
    if (!samples.length) {
        setAutoSuggestSummary(endpointPath, {
            headline: 'No recent sample data yet.',
            details: 'Call this API once, then run auto-suggest to pre-fill segments and metrics.',
            hasSuggestions: false,
        });
        renderFieldRoles(detail.fields, detail.setup_config, detail.metrics);
        showToast('Auto-suggest needs at least one recent API response.', 'info');
        return;
    }
    
    const suggestedDims: string[] = [];
    const suggestedKpis: string[] = [];
    let suggestedTime: string | null = null;

    detail.fields.forEach(f => {
        const name = f.name;
        const lowerName = name.toLowerCase();

        // Collect all non-null values for this field
        const values = setupFieldValues(samples, name);
        if (values.length === 0) return;

        // 1. Guess Time
        if (!suggestedTime) {
            if (lowerName.includes('date') || lowerName.includes('time') || lowerName.includes('period') || lowerName.includes('at')) {
                suggestedTime = name;
                return;
            }
            // Check if ALL values look like timestamps/dates
            const allLookLikeDates = values.every(v => {
                const sVal = String(v);
                return sVal.match(/^\d{4}-\d{2}-\d{2}/) || sVal.match(/^\d{10,13}$/);
            });
            if (allLookLikeDates && values.length > 0) {
                suggestedTime = name;
                return;
            }
        }

        // 2. Guess Watch Num (KPIs) - check for numbers with Variance
        const numericValues = values.filter(v => typeof v === 'number' || (!isNaN(parseFloat(v)) && isFinite(v as number)));
        if (numericValues.length === values.length && values.length > 0) {
            // It's predominantly numeric
            const nums = numericValues.map(v => typeof v === 'number' ? v : parseFloat(v));
            const min = Math.min(...nums);
            const max = Math.max(...nums);
            
            // If it fluctuates, it's a KPI. If it's pure constant, maybe an ID.
            if (max > min) {
                suggestedKpis.push(name);
                return;
            } else {
                // It's a constant number. Let's see if the name hints at a KPI anyway.
                const kpiKeywords = ['amount', 'value', 'total', 'count', 'sum', 'price', 'quantity', 'qty', 'rsv', 'sales'];
                if (kpiKeywords.some(kw => lowerName.includes(kw))) {
                    suggestedKpis.push(name);
                    return;
                }
            }
        }

        // 3. Guess Groups (Dimensions) - check Cardinality
        const stringValues = values.filter(v => typeof v === 'string');
        if (stringValues.length > 0) {
            const uniqueCount = new Set(stringValues).size;
            const cardinalityRatio = uniqueCount / stringValues.length;
            
            // If cardinality is relatively low (e.g., less than 80% unique, or very few unique items)
            if (cardinalityRatio < 0.8 || uniqueCount <= 10) {
                suggestedDims.push(name);
                return;
            }
            
            // Fallback to name heuristic if cardinality is high but it sounds like a dimension
            const dimKeywords = ['id', 'name', 'type', 'category', 'region', 'country', 'brand', 'retailer', 'store', 'channel'];
            if (dimKeywords.some(kw => lowerName.includes(kw))) {
                suggestedDims.push(name);
                return;
            }
        }
    });

    const existingDims = new Set((detail.setup_config.dimension_fields || []) as string[]);
    const existingKpis = new Set((detail.setup_config.kpi_fields || []) as string[]);
    suggestedDims.forEach((name) => existingDims.add(name));
    suggestedKpis.forEach((name) => existingKpis.add(name));
    if (!detail.setup_config.time_field && suggestedTime) detail.setup_config.time_field = suggestedTime;
    detail.setup_config.dimension_fields = [...existingDims];
    detail.setup_config.kpi_fields = [...existingKpis];

    (window as any).refreshTimePreview();
    (window as any).scrubNoise(); // V8: Filter out UUID/System junk

    const finalDims = detail.setup_config.dimension_fields || [];
    const finalKpis = detail.setup_config.kpi_fields || [];
    const dimText = finalDims.length ? finalDims.slice(0, 3).join(', ') : 'none';
    const kpiText = finalKpis.length ? finalKpis.slice(0, 3).join(', ') : 'none';
    const timeText = detail.setup_config.time_field ? String(detail.setup_config.time_field) : 'not selected';
    setAutoSuggestSummary(endpointPath, {
        headline: 'Suggested setup is ready.',
        details: `Segments: ${dimText}. Metrics: ${kpiText}. Time field: ${timeText}.`,
        hasSuggestions: finalDims.length > 0 || finalKpis.length > 0 || Boolean(detail.setup_config.time_field),
    });
    renderFieldRoles(detail.fields, detail.setup_config, detail.metrics);
    showToast('Auto-suggest updated segment and metric choices from recent data.', 'success');
};

/**
 * V8: Noise Scrubber.
 * Auto-excludes high-cardinality "junk" fields (UUIDs, Trace IDs, Hashes).
 */
(window as any).scrubNoise = function scrubNoise() {
    const detail = selectedApiDetail();
    if (!detail || !detail.fields || !detail.setup_config) return;

    const samples = setupSamples(detail);
    if (samples.length < 5) return; // Need a small sample size to detect uniqueness reliably

    const excluded = new Set((detail.setup_config.excluded_fields || []) as string[]);
    let scrubbedCount = 0;

    detail.fields.forEach(f => {
        const name = f.name;
        // Don't scrub if it's already a dimension/kpi/time
        if (detail.setup_config?.dimension_fields?.includes(name)) return;
        if (detail.setup_config?.kpi_fields?.includes(name)) return;
        if (detail.setup_config?.time_field === name) return;

        const values = samples
            .map(s => resolveSampleFieldValue(s, name))
            .filter(v => v !== null && v !== undefined)
            .map(v => String(v));
        if (!values.length) return;
        const uniqueValues = new Set(values);
        
        // Scrubber Heuristic: If values are mostly unique strings and look like hashes/IDs
        const uniquenessRatio = uniqueValues.size / values.length;
        const firstVal = values[0] || '';
        
        const isJunkPattern = firstVal.length > 20 || // Long hashes
                             firstVal.match(/[a-f0-9]{8}-/) || // UUIDs
                             name.toLowerCase().includes('id') ||
                             name.toLowerCase().includes('trace') ||
                             name.toLowerCase().includes('request');

        if (uniquenessRatio > 0.8 && isJunkPattern) {
            excluded.add(name);
            scrubbedCount++;
        }
    });

    if (scrubbedCount > 0) {
        detail.setup_config.excluded_fields = [...excluded];
        renderFieldRoles(detail.fields, detail.setup_config, detail.metrics);
        showToast(`🧹 Noise Scrubber: Auto-hidden ${scrubbedCount} system fields (UUIDs/IDs).`, 'info');
    }
};

/**
 * V8: Drift Protection (Self-Healing).
 * Detects if a configured field was renamed by comparing "Data Fingerprints".
 */
(window as any).detectDrift = function detectDrift() {
    const detail = selectedApiDetail();
    if (!detail || !detail.fields || !detail.setup_config) return;

    const samples = setupSamples(detail);
    if (samples.length < 3) return;

    const currentFieldNames = new Set(detail.fields.map(f => f.name));
    const configuredFields = [
        ...(detail.setup_config.dimension_fields || []),
        ...(detail.setup_config.kpi_fields || [])
    ];
    
    const missingFields = configuredFields.filter(f => !currentFieldNames.has(f));
    const unconfiguredFields = detail.fields
        .map(f => f.name)
        .filter(name => !configuredFields.includes(name) && !detail.setup_config?.excluded_fields?.includes(name) && name !== detail.setup_config?.time_field);

    if (missingFields.length === 0 || unconfiguredFields.length === 0) {
        state.driftSuggestions = {};
        return;
    }

    const suggestions: Record<string, string> = {};

    missingFields.forEach(missing => {
        // Try to find a match among unconfigured fields
        unconfiguredFields.forEach(candidate => {
            const match = checkFingerprintMatch(missing, candidate, samples);
            if (match) {
                suggestions[candidate] = missing;
            }
        });
    });

    state.driftSuggestions = suggestions;
    if (Object.keys(suggestions).length > 0) {
        renderFieldRoles(detail.fields, detail.setup_config, detail.metrics);
    }
};

function checkFingerprintMatch(oldName: string, newName: string, samples: any[]): boolean {
    const oldVals = samples.map(s => resolveSampleFieldValue(s, oldName)).filter(v => v !== undefined);
    const newVals = samples.map(s => resolveSampleFieldValue(s, newName)).filter(v => v !== undefined);
    
    if (newVals.length === 0) return false;

    const oldType = typeof oldVals[0];
    const newType = typeof newVals[0];
    if (oldType !== newType) return false;

    if (oldType === 'number') {
        const oldMax = Math.max(...oldVals);
        const newMax = Math.max(...newVals);
        // If max values are within 20% of each other, it might be the same field
        if (Math.abs(oldMax - newMax) / Math.max(oldMax, 1) < 0.2) return true;
    }

    if (oldType === 'string') {
        const oldAvgLen = oldVals.reduce((acc, v) => acc + String(v).length, 0) / oldVals.length;
        const newAvgLen = newVals.reduce((acc, v) => acc + String(v).length, 0) / newVals.length;
        if (Math.abs(oldAvgLen - newAvgLen) < 2) return true;
    }

    return false;
}

(window as any).approveDriftMerge = function approveDriftMerge(newField: string, oldField: string) {
    if (blockInPoMode('PO Mode is ON. Turn it off to apply drift merges manually.')) return;
    const detail = selectedApiDetail();
    if (!detail || !detail.setup_config) return;

    // Replace old field with new field in config
    if (detail.setup_config.dimension_fields?.includes(oldField)) {
        detail.setup_config.dimension_fields = detail.setup_config.dimension_fields.map(f => f === oldField ? newField : f);
    }
    if (detail.setup_config.kpi_fields?.includes(oldField)) {
        detail.setup_config.kpi_fields = detail.setup_config.kpi_fields.map(f => f === oldField ? newField : f);
    }

    state.driftSuggestions = {};
    renderFieldRoles(detail.fields, detail.setup_config, detail.metrics);
    showToast(`🧬 Drift Protection: Successfully self-healed "${oldField}" to "${newField}".`);
};

(window as any).updateGranularity = function updateGranularity(val: string) {
    const detail = selectedApiDetail();
    if (detail && detail.setup_config) {
        detail.setup_config.time_granularity = val;
    }
};


async function magicBaseline() {
    if (!state.selectedApi) return;
    const path = state.selectedApi;
    showToast('Promoting recent averages...', 'success');
    try {
        const response = await fetch(`/jin/api/v2/promote-baseline/${slug(path)}`, { method: 'POST' });
        const result = await response.json();
        if (response.ok) {
            showToast('Baseline refreshed from recent data.', 'success');
            state.detailCache.delete(path);
            await openApi(path);
        } else {
            showToast(result.detail || 'Promotion failed.', 'error');
        }
    } catch (err) {
        showToast('Network error promoting baseline.', 'error');
    }
}
(window as any).magicBaseline = magicBaseline;

async function quickFixBaseline(id: number) {
    showToast(`Accepting actual value as new baseline for issue ${id}...`, 'success');
    const note = (document.getElementById('drawer-note') as HTMLTextAreaElement | null)?.value || '';
    const resolutionReason = (document.getElementById('drawer-resolution-reason') as HTMLInputElement | null)?.value || 'Accepted as correct baseline by operator';
    
    try {
        const response = await fetch(`/jin/api/v2/anomaly/${id}/promote`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                note,
                resolution_reason: resolutionReason
            })
        });
        const result = await response.json();
        if (response.ok) {
            showToast('Baseline updated and issue resolved.', 'success');
            setIncidentsMessage(`Issue ${id} accepted as baseline and resolved.`, 'success');
            closeIncidentDrawer();
            await refreshAll(true);
        } else {
            const message = result.message || 'Promotion failed.';
            showToast(message, 'error');
            setIncidentsMessage(`Could not accept baseline for issue ${id}.`, 'error');
        }
    } catch (err) {
        showToast('Network error promoting anomaly to baseline.', 'error');
        setIncidentsMessage(`Network error while accepting baseline for issue ${id}.`, 'error');
    }
}
(window as any).quickFixBaseline = quickFixBaseline;

function switchApiTab(tab: string, historyMode: HistoryMode = 'push') {
    const normalizedTab = normalizeApiTab(tab);
    const movedToApiView = state.currentView !== 'api';
    state.currentView = 'api';
    state.currentApiTab = normalizedTab as any;
    syncBrowserRoute(historyMode);
    if (movedToApiView) {
      renderShell();
    }
    const detail = selectedApiDetail();
    if (detail) {
      renderApiDetail(detail);
      if ((normalizedTab === 'uploads' || normalizedTab === 'history') && state.selectedApi) {
        void maybeResumeUploadJob(state.selectedApi);
      }
      return;
    }
    if (state.selectedApi) {
      void loadDetail(state.selectedApi).then((freshDetail) => {
        if (!freshDetail) return;
        state.activeApiDetail = freshDetail;
        renderApiDetail(freshDetail);
        if (normalizedTab === 'uploads' || normalizedTab === 'history') {
          void maybeResumeUploadJob(state.selectedApi || '');
        }
      });
    }
}
(window as any).switchApiTab = switchApiTab;

(window as any).openKpiSummary = function openKpiSummary() {
  switchApiTab('summary', 'push');
  requestAnimationFrame(() => {
    const kpiSection = document.getElementById('api-kpis');
    if (kpiSection) {
      kpiSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
};

function openUploadsTab() {
    closeRunDetailDrawer();
    switchApiTab('uploads');
    requestAnimationFrame(() => {
      const uploadsPanel = document.querySelector('[data-api-section="uploads"]') as HTMLElement | null;
      if (uploadsPanel) {
        uploadsPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      const fileInput = document.getElementById('upload-file') as HTMLInputElement | null;
      if (fileInput) fileInput.focus();
    });
}
(window as any).openUploadsTab = openUploadsTab;

(window as any).refreshConfigStory = () => {
    const detail = selectedApiDetail();
    if (detail) renderFieldRoles(detail.fields, detail.setup_config || detail.config || {}, detail.metrics);
};

function initializeAccessibilityAttributes(): void {
  [
    ui.incidentsFeedback,
    ui.uploadFeedback,
    ui.configFeedback,
    ui.reportsFeedback,
    ui.projectWorkflowFeedback,
  ].forEach((node) => {
    node.setAttribute('role', 'status');
    node.setAttribute('aria-live', 'polite');
  });
  ui.confirmModal.setAttribute('role', 'dialog');
  ui.confirmModal.setAttribute('aria-modal', 'true');
  ui.drawer.setAttribute('role', 'dialog');
  ui.drawer.setAttribute('aria-modal', 'true');
}

async function init() {
  initializeAccessibilityAttributes();
  const storedPoMode = localStorage.getItem(PO_MODE_PREF_KEY);
  const explicitPoModeChoice = localStorage.getItem(PO_MODE_EXPLICIT_KEY) === '1';
  state.poMode = explicitPoModeChoice ? storedPoMode !== 'off' : false;
  if (!explicitPoModeChoice) {
    localStorage.setItem(PO_MODE_PREF_KEY, 'off');
  }
  ui.poModeToggle.checked = state.poMode !== false;
  setTheme(localStorage.getItem('jin-theme') || 'dark');
  setDensity(localStorage.getItem('jin-density') || 'comfortable');
  const savedSidebar = localStorage.getItem('jin-sidebar');
  setSidebarCollapsed(savedSidebar ? savedSidebar === 'collapsed' : window.innerWidth < 1180);
  state.apiFilter = localStorage.getItem('jin-api-filter') || '';
  state.apiStatusFilter = localStorage.getItem('jin-api-status-filter') || '';
  state.errorSearch = localStorage.getItem('jin-error-search') || '';
  state.errorStatusFilter = localStorage.getItem('jin-error-status-filter') || '';
  state.errorCategoryFilter = localStorage.getItem('jin-error-category-filter') || '';
  state.errorSeverityFilter = localStorage.getItem('jin-error-severity-filter') || '';
  state.incidentStatusFilter = localStorage.getItem('jin-incident-status-filter') || '';
  state.incidentSeverityFilter = localStorage.getItem('jin-incident-severity-filter') || '';
  state.incidentSort = localStorage.getItem('jin-incident-sort') || 'business';
  state.runSort = localStorage.getItem('jin-run-sort') || 'observed_at_desc';
  state.uploadSort = localStorage.getItem('jin-upload-sort') || 'uploaded_at_desc';
  state.defaultView = localStorage.getItem('jin-default-view') || 'api';
  state.operatorHandle = normalizeOperatorHandle(localStorage.getItem('jin-operator-handle') || 'default');
  loadNamedViewsForCurrentOperator();
  ui.apiSearch.value = state.apiFilter;
  ui.apiStatusFilter.value = state.apiStatusFilter;
  ui.errorSearch.value = state.errorSearch;
  ui.errorStatusFilter.value = state.errorStatusFilter;
  ui.errorCategoryFilter.value = state.errorCategoryFilter;
  ui.errorSeverityFilter.value = state.errorSeverityFilter;
  ui.incidentSort.value = state.incidentSort;
  ui.defaultViewSelect.value = state.defaultView;
  ui.themeSelect.value = document.body.dataset.theme || 'dark';
  if (restoreStatusSnapshotFromCache()) {
    state.apiDataState = 'stale';
    state.apiDataMessage = 'Showing the last known API snapshot while reconnecting...';
  }
  await refreshAll(false);
  try {
    await refreshProjectsCatalog(true);
    await refreshProjectOperationalState(selectedProjectId(), false);
    state.projectsMonitorSnapshot = await monitorProjects();
  } catch (error) {
    notifyAsyncError(error, 'Project workflow panel could not be initialized.');
  }
  const routeParams = new URLSearchParams(window.location.search);
  const hasRouteState = routeParams.has('y_view') || routeParams.has('y_api') || routeParams.has('y_tab');
  const first = state.status?.endpoints?.[0]?.endpoint_path;
  if (first && !state.selectedApi) {
    state.selectedApi = first;
    renderSidebar();
  }
  const defaultNamedViewId = readDefaultNamedViewId();
  const defaultNamedView = (state.savedViews || []).find((item) => Number(item.id) === defaultNamedViewId);
  if (defaultNamedView && !hasRouteState) {
    await window.applyNamedView(defaultNamedView.id);
    syncBrowserRoute('replace');
    return;
  }
  if (hasRouteState) {
    await applyRouteFromUrl();
  } else {
    state.currentView = state.defaultView || 'api';
    renderShell();
    if (state.currentView === 'api' && state.selectedApi) {
      const detail = await loadDetail(state.selectedApi);
      if (detail) {
        state.activeApiDetail = detail;
        renderApiDetail(detail);
        if (state.currentApiTab === 'uploads' || state.currentApiTab === 'history') {
          await maybeResumeUploadJob(state.selectedApi);
        }
      }
    }
  }
  renderSavedViews();
  syncBrowserRoute('replace');
}

window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
  notifyAsyncError(event.reason, 'Unexpected async error.');
  event.preventDefault();
});

window.addEventListener('popstate', () => {
  void applyRouteFromUrl();
});

init();

export { init };
