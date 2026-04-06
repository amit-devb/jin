import {
  allIncidentRows,
  currentEndpoints,
  emptyState,
  businessPriorityBand,
  fmt,
  fmtDate,
  businessPriorityBreakdown,
  businessPriorityScore,
  incidentDecisionLabel,
  incidentDecisionTone,
  incidentRows,
  incidentWhyThisMatters,
  inferSeverityClass,
  isFeatureEnabled,
  isMaintainerMode,
  apiBrowserVirtualWindow,
  paginate,
  renderApiSections,
  renderPagination,
  renderSavedViews,
  routeGroup,
  slug,
  statCard,
  state,
  sortIncidents,
  sortRows,
  ui,
  apiBrowserDensityMetrics,
  normalizeApiBrowserDensity,
  modelSetupAdvice,
} from './core';
import {
  activityMixChartSvg,
  kpiTrendChartSvg,
  sparklineSvg,
  statusMixChartSvg,
} from './charts';
import type {
  EndpointDetail,
  EndpointStatus,
  FieldRole,
  MonitoringRunRow,
  RecentError,
  UploadAnalysisComparison,
  UploadAnalysisRun,
  UploadAnalysisSummary,
} from './types';

type ApiBrowserColumnKey = 'method' | 'status' | 'setup' | 'issues';
type ApiBrowserDensity = 'comfortable' | 'compact' | 'dense';
const API_BROWSER_COLUMN_ORDER: ApiBrowserColumnKey[] = ['method', 'status', 'setup', 'issues'];
const API_BROWSER_COLUMN_DEFAULT_WIDTHS: Record<ApiBrowserColumnKey, number> = {
  method: 92,
  status: 92,
  setup: 112,
  issues: 88,
};
const API_BROWSER_VIRTUALIZATION_THRESHOLD = 120;
const API_BROWSER_VIRTUAL_WINDOW_ROWS = 28;
const API_BROWSER_VIRTUAL_OVERSCAN = 8;

function errorCategory(source: string): string {
  if (source.startsWith('scheduler')) return 'Scheduler';
  if (source.startsWith('router.upload') || source.startsWith('router.save_references')) return 'Upload';
  if (source.startsWith('router.save_config') || source.startsWith('config.')) return 'Configuration';
  if (source.startsWith('router.') || source.startsWith('middleware.')) return 'Runtime';
  return 'General';
}

function errorSeverity(source: string): string {
  if (source.startsWith('scheduler') || source.startsWith('middleware.process_response')) return 'high';
  if (source.startsWith('router.status') || source.startsWith('router.endpoint_detail')) return 'medium';
  return 'low';
}

function errorStatus(item: RecentError): string {
  return item.status || 'open';
}

function escapeHtml(value: any): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderFirstRunChecklist(options: {
  title: string;
  description: string;
  primaryLabel: string;
  primaryView: string;
  secondaryLabel: string;
  secondaryHref: string;
  footer?: string;
}): string {
  return `
    <div class="row-card onboarding-card">
      <strong>${escapeHtml(options.title)}</strong>
      <div class="muted" style="margin-top:6px;">${escapeHtml(options.description)}</div>
      <ol class="reports-flow-steps" style="margin:12px 0 0 18px;">
        <li>Install Jin in your own FastAPI app.</li>
        <li>Hit the endpoint you want to monitor once.</li>
        <li>Open <code>/jin</code> and finish setup in the APIs workspace.</li>
      </ol>
      ${options.footer ? `<div class="tiny muted" style="margin-top:8px;">${escapeHtml(options.footer)}</div>` : ''}
      <div class="toolbar" style="margin-top:12px; flex-wrap:wrap;">
        <button class="action" type="button" data-view="${escapeHtml(options.primaryView)}">${escapeHtml(options.primaryLabel)}</button>
        <button class="action secondary" type="button" onclick="window.open('${options.secondaryHref}', '_blank', 'noopener,noreferrer')">${escapeHtml(options.secondaryLabel)}</button>
      </div>
    </div>
  `;
}

function renderPlainLanguageInsight(): string {
  const endpoints = state.status?.endpoints || [];
  const anomalies = state.anomalies?.anomalies || [];
  const summary = state.status?.summary || {
    healthy: 0,
    unconfirmed: 0,
    anomalies: 0,
  };
  const needsSetup = endpoints.filter((item) => item.status === 'unconfirmed').length;
  const needsAttention = endpoints.filter((item) => (item.active_anomalies || 0) > 0 || item.status === 'warning').length;
  const recentErrors = state.status?.recent_errors || [];

  if (endpoints.length === 0) {
    return `
      <div class="row-card">
        <strong>Block release</strong>
        <div class="muted" style="margin-top:6px;">You do not have a live project yet. Create one endpoint before treating this project as ready.</div>
        <div class="tiny muted" style="margin-top:8px;">Start with your own API, not the maintainer demo harness.</div>
      </div>
    `;
  }

  if (anomalies.length > 0) {
    return `
      <div class="row-card">
        <strong>Needs attention</strong>
        <div class="muted" style="margin-top:6px;">${fmt(anomalies.length)} issue${anomalies.length === 1 ? '' : 's'} need attention. Start with the highest-priority item, then work downward.</div>
        <div class="tiny muted" style="margin-top:8px;">Jin has already grouped the issues so you can make a business call without reading raw logs first.</div>
      </div>
    `;
  }

  if (needsSetup > 0 || needsAttention > 0) {
    return `
      <div class="row-card">
        <strong>Needs attention</strong>
        <div class="muted" style="margin-top:6px;">Some APIs still need setup or baseline review. Finish setup first, then use Issues and Reports to track business impact.</div>
        <div class="tiny muted" style="margin-top:8px;">Healthy: ${fmt(summary.healthy || 0)} • Needs setup: ${fmt(needsSetup)} • Needs care: ${fmt(needsAttention)} • Recent errors: ${fmt(recentErrors.length)}</div>
      </div>
    `;
  }

  return `
    <div class="row-card">
      <strong>Safe for now</strong>
      <div class="muted" style="margin-top:6px;">Your project looks healthy right now. Keep watching the highest-risk API and check Reports weekly so you can spot drift before it becomes a release issue.</div>
      <div class="tiny muted" style="margin-top:8px;">Healthy: ${fmt(summary.healthy || 0)} • Issues: ${fmt(anomalies.length)} • Recent errors: ${fmt(recentErrors.length)}</div>
    </div>
  `;
}

function decisionLanguageForProjectHealth(opts: {
  endpoints: number;
  anomalies: number;
  needsSetup: number;
  needsAttention: number;
  topRiskScore?: number;
}): { label: string; detail: string; tone: 'success' | 'warning' | 'danger' } {
  const topRiskScore = Number(opts.topRiskScore || 0);
  if (opts.endpoints === 0) {
    return {
      label: 'Block release',
      tone: 'danger',
      detail: 'No live endpoint is connected yet.',
    };
  }
  if (opts.anomalies > 0 || opts.needsSetup > 0 || opts.needsAttention > 0) {
    return {
      label: 'Needs attention',
      tone: topRiskScore >= 70 ? 'danger' : 'warning',
      detail: opts.anomalies > 0
        ? `${fmt(opts.anomalies)} issue${opts.anomalies === 1 ? '' : 's'} need attention.`
        : `${fmt(opts.needsSetup || opts.needsAttention)} setup item${(opts.needsSetup || opts.needsAttention) === 1 ? '' : 's'} still need attention.`,
    };
  }
  return {
    label: 'Safe for now',
    tone: 'success',
    detail: 'The project is healthy and ready to keep monitoring.',
  };
}

function hasSetupSamples(detail?: EndpointDetail | null): boolean {
  if (!detail) return false;
  const hasRuntimeSamples = Boolean((detail.recent_history || []).length || (detail.history || []).length);
  if (hasRuntimeSamples) return true;

  const schema = detail.schema_contract;
  if (Array.isArray(schema?.example_rows) && schema.example_rows.length > 0) return true;

  const schemaFields = Array.isArray(schema?.fields) ? schema.fields : [];
  const fields = schemaFields.length ? schemaFields : (detail.fields || []);
  return fields.some((field) => field && field.example !== undefined && field.example !== null);
}

function setupHealthMeta(endpoint: EndpointStatus): { label: string; tone: string; hint: string } {
  const dimensionCount = Array.isArray(endpoint.dimension_fields) ? endpoint.dimension_fields.length : 0;
  const kpiCount = Array.isArray(endpoint.kpi_fields) ? endpoint.kpi_fields.length : 0;
  const hasTimeField = Boolean(String(endpoint.time_field || '').trim());
  const timeRequired = endpoint.time_required !== false;
  const confirmed = Boolean(endpoint.confirmed);
  const hasBaseline = Boolean(endpoint.last_upload_at);

  if (!dimensionCount || !kpiCount || (timeRequired && !hasTimeField)) {
    return {
      label: 'Needs setup',
      tone: 'warning',
      hint: timeRequired
        ? 'Choose Segment + Metric + Time in Configuration.'
        : 'Choose Segment + Metric in Configuration.',
    };
  }
  if (!confirmed) {
    return {
      label: 'Save setup',
      tone: 'warning',
      hint: 'Save configuration before checks/uploads.',
    };
  }
  if (!hasBaseline) {
    return {
      label: 'Needs baseline',
      tone: 'info',
      hint: 'Upload a baseline file to start pass/fail checks.',
    };
  }
  return {
    label: 'Ready',
    tone: 'success',
    hint: 'Setup and baseline are in place.',
  };
}

function apiBrowserMode(): 'grouped' | 'compact' | 'table' {
  return state.apiBrowserMode === 'compact' || state.apiBrowserMode === 'table'
    ? state.apiBrowserMode
    : 'grouped';
}

function apiBrowserDensity(): ApiBrowserDensity {
  return normalizeApiBrowserDensity(state.apiBrowserDensity || 'comfortable');
}

function apiBrowserSortKey(): string {
  return state.apiBrowserSort || 'path';
}

function apiBrowserSortDirection(): 'asc' | 'desc' {
  return state.apiBrowserSortDirection === 'desc' ? 'desc' : 'asc';
}

function apiBrowserSortIndicator(key: string): string {
  if (apiBrowserSortKey() !== key) return '↕';
  return apiBrowserSortDirection() === 'asc' ? '↑' : '↓';
}

function apiBrowserVisibleColumns(): ApiBrowserColumnKey[] {
  const configured = state.apiBrowserColumns || {};
  return apiBrowserColumnOrder().filter((key) => configured[key] !== false);
}

function apiBrowserColumnOrder(): ApiBrowserColumnKey[] {
  const rawOrder = Array.isArray(state.apiBrowserColumnOrder) ? state.apiBrowserColumnOrder : [];
  const seen = new Set<string>();
  const order = rawOrder
    .map((key) => String(key))
    .filter((key): key is ApiBrowserColumnKey => API_BROWSER_COLUMN_ORDER.includes(key as ApiBrowserColumnKey))
    .filter((key) => {
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  API_BROWSER_COLUMN_ORDER.forEach((key) => {
    if (!seen.has(key)) order.push(key);
  });
  return order;
}

function apiBrowserGridTemplate(columns = apiBrowserVisibleColumns()): string {
  const widths = state.apiBrowserColumnWidths || {};
  return ['minmax(0, 2.4fr)', ...columns.map((key) => {
    const fallback = API_BROWSER_COLUMN_DEFAULT_WIDTHS[key];
    const width = Number(widths[key]);
    const normalized = Number.isFinite(width) && width > 0 ? Math.round(width) : fallback;
    return `${normalized}px`;
  })].join(' ');
}

function apiBrowserSortValue(item: EndpointStatus, key: string): string | number {
  const setupMeta = setupHealthMeta(item);
  const setupScore = setupMeta.label === 'Ready'
    ? 3
    : setupMeta.label === 'Needs baseline'
      ? 2
      : setupMeta.label === 'Save setup'
        ? 1
        : 0;
  switch (key) {
    case 'method':
      return String(item.http_method || '').toLowerCase();
    case 'status':
      return String(item.status || 'warning').toLowerCase();
    case 'group':
      return routeGroup(item.endpoint_path).toLowerCase();
    case 'issues':
      return Number(item.active_anomalies || 0);
    case 'setup':
      return setupScore;
    case 'confirmed':
      return Number(Boolean(item.confirmed));
    case 'path':
    default:
      return String(item.endpoint_path || '').toLowerCase();
  }
}

function apiBrowserSortedEndpoints(endpoints: EndpointStatus[]): EndpointStatus[] {
  const key = apiBrowserSortKey();
  const direction = apiBrowserSortDirection() === 'desc' ? -1 : 1;
  return [...endpoints].sort((a, b) => {
    const aValue = apiBrowserSortValue(a, key);
    const bValue = apiBrowserSortValue(b, key);
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      if (aValue < bValue) return -1 * direction;
      if (aValue > bValue) return 1 * direction;
    } else {
      const comparison = String(aValue).localeCompare(String(bValue));
      if (comparison !== 0) return comparison * direction;
    }
    return String(a.endpoint_path || '').localeCompare(String(b.endpoint_path || ''));
  });
}

function apiBrowserSortButtonHtml(label: string, key: string): string {
  const active = apiBrowserSortKey() === key;
  return `
    <button class="api-table-sort ${active ? 'active' : ''}" type="button" data-api-sort="${escapeHtml(key)}" aria-pressed="${active}">
      <span>${escapeHtml(label)}</span>
      <span class="api-table-sort-indicator">${apiBrowserSortIndicator(key)}</span>
    </button>
  `;
}

function apiBrowserHeaderCellHtml(label: string, key: ApiBrowserColumnKey | 'path', resizable = false): string {
  const pinnedClass =
    key === 'path'
      ? 'pinned pinned-path'
      : key === 'status'
        ? 'pinned pinned-status'
        : key === 'issues'
          ? 'pinned pinned-issues'
          : '';
  return `
    <div class="api-browser-head-cell ${pinnedClass} ${resizable ? 'resizable' : ''}" data-api-browser-column-header="${escapeHtml(key)}">
      ${apiBrowserSortButtonHtml(label, key)}
      ${resizable ? `<span class="api-browser-resize-handle" role="separator" aria-orientation="vertical" aria-label="Resize ${escapeHtml(label)} column" data-api-browser-column-resize="${escapeHtml(key)}"></span>` : ''}
    </div>
  `;
}

function apiBrowserTableCellHtml(item: EndpointStatus, key: ApiBrowserColumnKey, setupMeta: { label: string; tone: string; hint: string }, issues: number): string {
  if (key === 'method') {
    return `<span class="api-browser-cell api-browser-cell-method"><span class="api-browser-pill">${escapeHtml(item.http_method || 'GET')}</span></span>`;
  }
  if (key === 'status') {
    const status = String(item.status || 'warning');
    return `<span class="api-browser-cell api-browser-cell-status pinned pinned-status"><span class="api-browser-pill status">${escapeHtml(status)}</span></span>`;
  }
  if (key === 'setup') {
    return `<span class="api-browser-cell api-browser-cell-setup"><span class="api-setup-chip ${setupMeta.tone}" title="${escapeHtml(setupMeta.hint)}">${escapeHtml(setupMeta.label)}</span></span>`;
  }
  if (key === 'issues') {
    return `<span class="api-browser-cell api-browser-cell-issues pinned pinned-issues">${issues > 0 ? `<span class="api-browser-pill issues">${issues} issue${issues === 1 ? '' : 's'}</span>` : '<span class="tiny muted">—</span>'}</span>`;
  }
  return '';
}

function apiBrowserTableRowHtml(item: EndpointStatus, visibleColumns: ApiBrowserColumnKey[]): string {
  const setupMeta = setupHealthMeta(item);
  const group = routeGroup(item.endpoint_path);
  const status = String(item.status || 'warning');
  const issues = Number(item.active_anomalies || 0);
  return `
    <button class="api-browser-row ${state.selectedApi === item.endpoint_path ? 'active' : ''}" type="button" data-api="${escapeHtml(item.endpoint_path)}" onclick="openApiFromBrowser(event, '${escapeHtml(item.endpoint_path)}')">
      <span class="api-browser-cell api-browser-cell-path pinned pinned-path">
        <span class="status-dot ${status || 'warning'}"></span>
        <span class="api-browser-path-main">
          <strong title="${escapeHtml(item.endpoint_path)}">${escapeHtml(item.endpoint_path)}</strong>
          <span class="tiny muted">${escapeHtml(group)}</span>
        </span>
      </span>
      ${visibleColumns.map((key) => apiBrowserTableCellHtml(item, key, setupMeta, issues)).join('')}
    </button>
  `;
}

function apiBrowserColumnControlHtml(key: ApiBrowserColumnKey, label: string, visible: boolean): string {
  return `
    <button class="api-column-btn ${visible ? 'active' : ''}" type="button" data-api-browser-column="${escapeHtml(key)}" aria-pressed="${visible}">
      <span>${escapeHtml(label)}</span>
    </button>
  `;
}

function apiBrowserColumnControlsHtml(): string {
  const visibleColumns = apiBrowserVisibleColumns();
  const orderedColumns = apiBrowserColumnOrder();
  return `
    <div class="api-browser-columns">
      <div class="api-browser-columns-label">
        <span class="tiny muted">Columns</span>
        <span class="tiny muted">Path locked</span>
      </div>
      <div class="api-browser-columns-buttons">
        ${apiBrowserColumnControlHtml('method', 'Method', visibleColumns.includes('method'))}
        ${apiBrowserColumnControlHtml('status', 'Status', visibleColumns.includes('status'))}
        ${apiBrowserColumnControlHtml('setup', 'Setup', visibleColumns.includes('setup'))}
        ${apiBrowserColumnControlHtml('issues', 'Issues', visibleColumns.includes('issues'))}
      </div>
      <div class="api-browser-order">
        <div class="tiny muted">Order</div>
        <div class="api-browser-order-buttons">
          ${orderedColumns.map((key) => `
            <div class="api-browser-order-chip ${visibleColumns.includes(key) ? '' : 'hidden'}" draggable="true" data-api-browser-column-drag="${escapeHtml(key)}" data-api-browser-column-drop="${escapeHtml(key)}">
              <span class="api-browser-order-handle" aria-hidden="true">⋮⋮</span>
              <span>${escapeHtml(key)}</span>
              <div class="api-browser-order-actions">
                <button class="api-column-step" type="button" onclick="moveApiBrowserColumn('${escapeHtml(key)}','left')" data-api-browser-column-move="${escapeHtml(key)}:left" aria-label="Move ${escapeHtml(key)} left">←</button>
                <button class="api-column-step" type="button" onclick="moveApiBrowserColumn('${escapeHtml(key)}','right')" data-api-browser-column-move="${escapeHtml(key)}:right" aria-label="Move ${escapeHtml(key)} right">→</button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

function apiBrowserTableHtml(endpoints: EndpointStatus[]): string {
  const sorted = apiBrowserSortedEndpoints(endpoints);
  const visibleColumns = apiBrowserVisibleColumns();
  const gridTemplate = apiBrowserGridTemplate(visibleColumns);
  const density = apiBrowserDensity();
  const densityMetrics = apiBrowserDensityMetrics(density);
  const pageSize = sorted.length > 120 ? 80 : 50;
  const pagination = paginate(sorted, state.apiBrowserPage || 1, pageSize);
  const virtualization = sorted.length > API_BROWSER_VIRTUALIZATION_THRESHOLD
    ? apiBrowserVirtualWindow(sorted.length, state.apiBrowserScrollTop || 0, {
      rowHeight: densityMetrics.rowHeight,
      windowRows: API_BROWSER_VIRTUAL_WINDOW_ROWS,
      overscan: API_BROWSER_VIRTUAL_OVERSCAN,
    })
    : null;
  const virtualized = Boolean(virtualization);
  state.apiBrowserVirtualWindowStart = virtualization?.start || 0;
  state.apiBrowserVirtualWindowEnd = virtualization?.end || 0;
  const items = virtualized
    ? sorted.slice(virtualization!.start, virtualization!.end)
    : pagination.items;
  const page = virtualized ? 1 : pagination.page;
  const totalPages = virtualized ? 1 : pagination.totalPages;
  const pageLabel = virtualized
    ? `Virtualized • Showing ${fmt((virtualization?.start || 0) + 1)}-${fmt(Math.min(sorted.length, virtualization?.end || 0))} of ${fmt(sorted.length)}`
    : totalPages > 1
      ? `Page ${page} of ${totalPages}`
      : `${fmt(sorted.length)} APIs`;
  const topSpacer = virtualized ? Math.max(0, (virtualization?.start || 0) * densityMetrics.rowHeight) : 0;
  const bottomSpacer = virtualized ? Math.max(0, (sorted.length - (virtualization?.end || 0)) * densityMetrics.rowHeight) : 0;
  const rowsHtml = items.length
    ? items.map((item) => apiBrowserTableRowHtml(item, visibleColumns)).join('')
    : '<div class="empty empty-center api-browser-empty">No APIs match this search.</div>';
  const headHtml = visibleColumns.map((key) => {
    if (key === 'method') return apiBrowserHeaderCellHtml('Method', 'method', true);
    if (key === 'status') return apiBrowserHeaderCellHtml('Status', 'status', true);
    if (key === 'setup') return apiBrowserHeaderCellHtml('Setup', 'setup', true);
    return apiBrowserHeaderCellHtml('Issues', 'issues', true);
  }).join('');
  return `
    <div class="api-browser-table-shell" data-api-browser-density="${escapeHtml(density)}" style="--api-browser-grid-template: ${escapeHtml(gridTemplate)}; --api-browser-row-height: ${densityMetrics.rowHeight}px; --api-browser-table-gap: ${densityMetrics.tableGap}px; --api-browser-grid-gap: ${densityMetrics.gridGap}px; --api-browser-head-pad-y: ${densityMetrics.headPadY}px; --api-browser-head-pad-x: ${densityMetrics.headPadX}px; --api-browser-row-pad-y: ${densityMetrics.rowPadY}px; --api-browser-row-pad-x: ${densityMetrics.rowPadX}px;">
      <div class="api-browser-table-bar">
        <div class="api-browser-column-bar">
          ${apiBrowserColumnControlsHtml()}
          <div class="tiny muted">${escapeHtml(pageLabel)} • Sorted by ${escapeHtml(apiBrowserSortKey())} ${escapeHtml(apiBrowserSortDirection())}</div>
        </div>
        <div class="toolbar compact">${virtualized ? '' : renderPagination('api-browser', page, totalPages)}</div>
      </div>
      <div class="api-browser-table ${virtualized ? 'virtualized' : ''}" role="table" aria-label="API index table">
        <div class="api-browser-table-head" role="row">
          ${apiBrowserHeaderCellHtml('Path', 'path')}
          ${headHtml}
        </div>
        <div class="api-browser-table-body ${virtualized ? 'virtualized' : ''}">
          ${virtualized ? `<div class="api-browser-spacer" aria-hidden="true" style="height:${topSpacer}px"></div>` : ''}
          ${rowsHtml}
          ${virtualized ? `<div class="api-browser-spacer" aria-hidden="true" style="height:${bottomSpacer}px"></div>` : ''}
        </div>
      </div>
    </div>
  `;
}

function apiBrowserSummaryHtml(endpoints: EndpointStatus[]): string {
  const total = endpoints.length;
  const healthy = endpoints.filter((item) => (item.status || '').toLowerCase() === 'healthy' && (item.active_anomalies || 0) === 0).length;
  const atRisk = endpoints.filter((item) => {
    const status = String(item.status || '').toLowerCase();
    return (item.active_anomalies || 0) > 0 || status === 'warning' || status === 'anomaly' || status === 'unconfirmed';
  }).length;
  const needsSetup = endpoints.filter((item) => setupHealthMeta(item).label !== 'Ready').length;
  const groups = new Set(endpoints.map((item) => routeGroup(item.endpoint_path))).size;
  return `
    <div class="api-browser-summary" aria-label="API browser summary">
      <div class="api-summary-stat">
        <span class="tiny">Visible APIs</span>
        <strong>${fmt(total)}</strong>
      </div>
      <div class="api-summary-stat healthy">
        <span class="tiny">Healthy</span>
        <strong>${fmt(healthy)}</strong>
      </div>
      <div class="api-summary-stat warning">
        <span class="tiny">At risk</span>
        <strong>${fmt(atRisk)}</strong>
      </div>
      <div class="api-summary-stat setup">
        <span class="tiny">Need setup</span>
        <strong>${fmt(needsSetup)}</strong>
      </div>
      <div class="api-summary-stat muted">
        <span class="tiny">Groups</span>
        <strong>${fmt(groups)}</strong>
      </div>
    </div>
  `;
}

function apiBrowserDensityToggleHtml(density: ApiBrowserDensity): string {
  return `
    <div class="api-browser-density" role="group" aria-label="API browser row density">
      <div class="api-browser-density-buttons">
        <button class="api-mode-btn ${density === 'comfortable' ? 'active' : ''}" type="button" data-api-browser-density="comfortable" aria-pressed="${density === 'comfortable'}">Comfortable</button>
        <button class="api-mode-btn ${density === 'compact' ? 'active' : ''}" type="button" data-api-browser-density="compact" aria-pressed="${density === 'compact'}">Compact</button>
        <button class="api-mode-btn ${density === 'dense' ? 'active' : ''}" type="button" data-api-browser-density="dense" aria-pressed="${density === 'dense'}">Dense</button>
      </div>
    </div>
  `;
}

function apiBrowserHeroHtml(endpoints: EndpointStatus[], mode: 'grouped' | 'compact' | 'table'): string {
  const total = endpoints.length;
  const atRisk = endpoints.filter((item) => {
    const status = String(item.status || '').toLowerCase();
    return (item.active_anomalies || 0) > 0 || status === 'warning' || status === 'anomaly' || status === 'unconfirmed';
  }).length;
  const needSetup = endpoints.filter((item) => setupHealthMeta(item).label !== 'Ready').length;
  const groupCounts = endpoints.reduce((acc: Record<string, number>, item) => {
    const group = routeGroup(item.endpoint_path);
    acc[group] = (acc[group] || 0) + 1;
    return acc;
  }, {});
  const largestGroup = Object.entries(groupCounts).reduce(
    (best, [group, count]) => (count > best.count ? { group, count } : best),
    { group: 'other', count: 0 },
  );
  const tip = mode === 'compact'
    ? 'Compact scan keeps the list dense, sorted, and easy to scan at scale.'
    : (mode === 'table'
      ? 'Table index is the highest-density view and is built for larger inventories.'
      : 'Grouped view is best when you are still configuring a smaller project.');
  return `
    <div class="api-browser-hero">
      <div class="api-browser-hero-copy">
        <div class="api-browser-hero-meta tiny muted">${fmt(total)} APIs • ${fmt(atRisk)} at risk • ${fmt(needSetup)} need setup • Top group: ${escapeHtml(largestGroup.group)}${largestGroup.count ? ` • ${fmt(largestGroup.count)}` : ''}</div>
        <div class="api-browser-hero-actions">
          <button class="action secondary tiny" type="button" onclick="saveBrowserView()">Save browser view</button>
          <button class="action ghost tiny" type="button" data-view="settings">Open saved views</button>
        </div>
        ${apiBrowserDensityToggleHtml(apiBrowserDensity())}
      </div>
    </div>
  `;
}

function apiBrowserModeToggleHtml(mode: 'grouped' | 'compact' | 'table'): string {
  return `
    <div class="api-browser-mode" role="group" aria-label="API browser layout">
      <button class="api-mode-btn ${mode === 'grouped' ? 'active' : ''}" type="button" data-api-browser-mode="grouped" aria-pressed="${mode === 'grouped'}">Grouped view</button>
      <button class="api-mode-btn ${mode === 'compact' ? 'active' : ''}" type="button" data-api-browser-mode="compact" aria-pressed="${mode === 'compact'}">Compact scan</button>
      <button class="api-mode-btn ${mode === 'table' ? 'active' : ''}" type="button" data-api-browser-mode="table" aria-pressed="${mode === 'table'}">Table index</button>
    </div>
  `;
}

function apiBrowserItemHtml(item: EndpointStatus, options: { compact?: boolean; group?: string } = {}): string {
  const compact = Boolean(options.compact);
  const setupMeta = setupHealthMeta(item);
  const issues = Number(item.active_anomalies || 0);
  const status = String(item.status || 'warning');
  const groupHtml = options.group ? `<span class="api-group-tag">${escapeHtml(options.group)}</span>` : '';
  const compactMeta = compact
    ? `<div class="api-subline api-subline-compact">${groupHtml}<span class="api-setup-chip ${setupMeta.tone}" title="${escapeHtml(setupMeta.hint)}">${escapeHtml(setupMeta.label)}</span></div>`
    : `<div class="api-subline"><span class="api-setup-chip ${setupMeta.tone}" title="${escapeHtml(setupMeta.hint)}">${escapeHtml(setupMeta.label)}</span></div>`;
  return `
    <button class="api-item ${compact ? 'compact' : ''} ${state.selectedApi === item.endpoint_path ? 'active' : ''}" type="button" data-api="${escapeHtml(item.endpoint_path)}" onclick="openApiFromBrowser(event, '${escapeHtml(item.endpoint_path)}')">
      <div class="api-row ${compact ? 'compact' : ''}">
        <span class="status-dot ${status || 'warning'}"></span>
        <div class="api-row-main">
          <div class="api-row-top">
            <div class="api-method-status">
              <strong>${escapeHtml(item.http_method || 'GET')}</strong>
              <span class="tiny api-status-label">${escapeHtml(status)}</span>
            </div>
            ${issues > 0 ? `<span class="tiny api-row-issues">${issues} issue${issues === 1 ? '' : 's'}</span>` : ''}
          </div>
          <div class="api-path">${escapeHtml(item.endpoint_path)}</div>
          ${compactMeta}
        </div>
      </div>
    </button>
  `;
}

function apiBrowserGroupHtml(group: string, items: EndpointStatus[], options: { compact?: boolean; collapsed?: boolean } = {}): string {
  const compact = Boolean(options.compact);
  const collapsed = Boolean(options.collapsed);
  const issues = items.filter((item) => (item.active_anomalies || 0) > 0 || String(item.status || '').toLowerCase() === 'anomaly').length;
  const setupNeeded = items.filter((item) => setupHealthMeta(item).label !== 'Ready').length;
  const summaryBits = [
    `${fmt(items.length)} API${items.length === 1 ? '' : 's'}`,
    issues ? `${fmt(issues)} at risk` : null,
    setupNeeded ? `${fmt(setupNeeded)} need setup` : null,
  ].filter(Boolean);
  return `
    <div class="api-group ${compact ? 'compact' : ''}">
      <div class="api-group-title">
        <div class="api-group-name">
          <span>${escapeHtml(group)}</span>
          <span class="api-group-count">${fmt(items.length)}</span>
        </div>
        <div class="api-group-actions">
          <span class="api-group-summary">${escapeHtml(summaryBits.join(' • '))}</span>
          ${compact ? '' : `<button class="group-toggle" type="button" data-group-toggle="${escapeHtml(group)}">${collapsed ? 'Expand' : 'Collapse'}</button>`}
        </div>
      </div>
      ${collapsed ? '' : items.map((item) => apiBrowserItemHtml(item, { compact, group })).join('')}
    </div>
  `;
}

function formatDimensionSummary(dimensions?: Record<string, any>, grainKey?: string | null): string {
  const entries = Object.entries(dimensions || {}).filter(([, value]) => value !== null && value !== '');
  if (!entries.length) return grainKey || 'Global grain';
  return entries.map(([key, value]) => `${key}=${value}`).join(' • ');
}

function requestPreview(run: UploadAnalysisRun): string {
  const request = run.request || {};
  const parts: string[] = [];
  const pathBits = Object.entries(request.path || {});
  const queryBits = Object.entries(request.query || {});
  const body = request.body;

  if (pathBits.length) parts.push(`Path ${pathBits.map(([key, value]) => `${key}=${value}`).join(', ')}`);
  if (queryBits.length) parts.push(`Query ${queryBits.map(([key, value]) => `${key}=${value}`).join(', ')}`);
  if (body && ((Array.isArray(body) && body.length) || (!Array.isArray(body) && Object.keys(body).length))) {
    parts.push(`Body ${JSON.stringify(body)}`);
  }
  return parts.join(' • ');
}

function analysisStatusPill(status: string): string {
  if (status === 'match') return 'healthy';
  if (status === 'missing_reference') return 'acknowledged';
  if (status === 'missing_kpi') return 'warning';
  if (status === 'mismatch') return 'danger';
  return 'critical';
}

function analysisStatusLabel(status: string): string {
  if (status === 'match') return 'Matched';
  if (status === 'mismatch') return 'Mismatch';
  if (status === 'missing_reference') return 'No Baseline';
  if (status === 'missing_kpi') return 'Missing KPI';
  if (status === 'error') return 'Error';
  return status;
}

function uploadVerdictLabel(verdict: string): string {
  if (verdict === 'matched') return 'Matched';
  if (verdict === 'mismatch') return 'Mismatch';
  if (verdict === 'error') return 'Error';
  if (verdict === 'skipped') return 'Skipped';
  return verdict || 'Unknown';
}

function uploadVerdictPill(verdict: string): string {
  if (verdict === 'matched') return 'healthy';
  if (verdict === 'mismatch') return 'danger';
  if (verdict === 'error') return 'critical';
  return 'acknowledged';
}

function cleanKpiLabel(kpi: string): string {
  return String(kpi || '').replace(/^data\[\]\./, '');
}

function canonicalGrainKey(grainKey: string): string {
  const raw = String(grainKey || '');
  if (!raw) return '';
  if (!raw.includes('|')) return raw;
  const [endpoint, ...parts] = raw.split('|');
  const normalizedParts = parts
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => {
      const key = part.split('=')[0];
      return key !== 'api_version' && key !== 'label' && key !== 'timestamp' && key !== '_jin_id';
    })
    .sort();
  return normalizedParts.length ? `${endpoint}|${normalizedParts.join('|')}` : endpoint;
}

function canonicalKpiField(kpiField: string): string {
  const raw = String(kpiField || '').trim().toLowerCase();
  if (!raw) return '';
  return raw
    .replace(/\[\]/g, '')
    .replace(/^data\./, '')
    .replace(/^payload\./, '');
}

function friendlyMetricLabel(kpi: string): string {
  const plain = cleanKpiLabel(kpi).replace(/\[\]/g, ' ').replace(/[._]/g, ' ').trim();
  if (!plain) return 'Metric';
  return plain
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function friendlyGrainLabel(grainKey: string): string {
  const raw = String(grainKey || '');
  if (!raw.includes('|')) return raw || 'Global';
  const [, ...parts] = raw.split('|');
  const dims: Record<string, string> = {};
  parts.forEach((part) => {
    const eq = part.indexOf('=');
    if (eq <= 0) return;
    const key = part.slice(0, eq);
    const value = part.slice(eq + 1);
    dims[key] = value;
  });
  const labels = [
    dims.retailer ? `Retailer: ${dims.retailer}` : null,
    dims['data[].date'] || dims.date ? `Date: ${dims['data[].date'] || dims.date}` : null,
    dims['data[].label'] || dims.label ? `Label: ${dims['data[].label'] || dims.label}` : null,
  ].filter(Boolean) as string[];
  if (labels.length) return labels.join(' • ');
  const fallback = Object.entries(dims)
    .filter(([key]) => !['api_version', 'timestamp', '_jin_id'].includes(key))
    .slice(0, 3)
    .map(([key, value]) => `${key}=${value}`);
  return fallback.length ? fallback.join(' • ') : raw;
}

function runDurationLabel(durationMs: number | null | undefined): string {
  const ms = Number(durationMs);
  if (!Number.isFinite(ms) || ms < 0) return '—';
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

function runTriggerLabel(trigger: string | null | undefined, source: string | null | undefined): string {
  const rawTrigger = String(trigger || '').toLowerCase();
  if (rawTrigger === 'manual') return 'Manual check';
  if (rawTrigger === 'scheduler') return 'Scheduled check';
  const rawSource = String(source || '').toLowerCase();
  if (rawSource === 'manual') return 'Manual check';
  if (rawSource === 'watch') return 'Scheduled check';
  return rawTrigger || rawSource || 'Unknown';
}

function monitoringRunStatusMeta(status: string, anomaliesDetected = 0): { pillClass: string; label: string; tooltip: string } {
  const normalized = String(status || '').toLowerCase();
  const anomalies = Number(anomaliesDetected || 0);
  if ((normalized === 'success' || normalized === 'degraded') && anomalies > 0) {
    return {
      pillClass: 'danger',
      label: 'Needs attention',
      tooltip: 'Run completed but active mismatches are still open.',
    };
  }
  if (normalized === 'success') {
    return {
      pillClass: 'healthy',
      label: 'Passed',
      tooltip: 'Check finished successfully.',
    };
  }
  if (normalized === 'running') {
    return {
      pillClass: 'acknowledged',
      label: 'Running',
      tooltip: 'Check is currently running.',
    };
  }
  if (normalized === 'error' || normalized === 'failed') {
    return {
      pillClass: 'danger',
      label: 'Failed',
      tooltip: 'Check failed. Open Errors for details.',
    };
  }
  if (normalized === 'skipped') {
    return {
      pillClass: 'warning',
      label: 'Skipped',
      tooltip: 'Check was skipped and did not run.',
    };
  }
  return {
    pillClass: 'acknowledged',
    label: normalized || 'Unknown',
    tooltip: 'Run completed with a non-standard status.',
  };
}

function plainRunTitle(run: UploadAnalysisRun): string {
  const dims = run.dimensions || {};
  const retailer = dims.retailer || dims['grain_retailer'];
  const date = dims['data[].date'] || dims.date || dims.period;
  const label = dims['data[].label'] || dims.label;
  const parts = [
    retailer ? `Retailer: ${retailer}` : null,
    date ? `Date: ${date}` : null,
    label ? `Label: ${label}` : null,
  ].filter(Boolean);
  if (parts.length) return parts.join(' | ');
  return formatDimensionSummary(run.dimensions, run.grain_key);
}

function plainRunMessage(run: UploadAnalysisRun): string {
  if (run.status === 'match') {
    return 'Everything in this uploaded row is within the allowed tolerance.';
  }
  if (run.status === 'error') {
    return 'Jin could not run this row because the API call failed.';
  }
  const tolerance = run.tolerance_pct == null ? '' : ` (allowed +/-${Number(run.tolerance_pct).toFixed(1)}%)`;
  return `Some values are outside the allowed range${tolerance}.`;
}

function uploadDecisionLabel(analysis: UploadAnalysisSummary): 'Safe for now' | 'Needs attention' | 'Block release' {
  if (Number(analysis.failed_runs || 0) > 0) return 'Block release';
  if (Number(analysis.mismatch_runs || 0) > 0) return 'Needs attention';
  return 'Safe for now';
}

function plainComparisonReason(comparison: UploadAnalysisComparison): string {
  const label = cleanKpiLabel(comparison.kpi_field);
  const pctRaw = comparison.pct_change;
  const pct = pctRaw == null ? null : Number(pctRaw);
  if (comparison.status === 'match') {
    if (pct == null) return `${label} is within the allowed range.`;
    return `${label} is within the allowed range (${Math.abs(pct).toFixed(1)}% change).`;
  }
  if (comparison.status === 'missing_reference') {
    return `No baseline is uploaded for ${label}.`;
  }
  if (comparison.status === 'missing_kpi') {
    return `${label} was not returned by the API for this grain.`;
  }
  if (comparison.status === 'error') {
    return comparison.message || `Could not evaluate ${label}.`;
  }
  if (pct == null) return `${label} is outside the allowed range.`;
  const direction = pct > 0 ? 'higher' : 'lower';
  return `${label} is ${Math.abs(pct).toFixed(1)}% ${direction} than baseline (outside tolerance).`;
}

function formatPercentDelta(value: unknown): string {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '—';
  const sign = numeric > 0 ? '+' : '';
  return `${sign}${numeric.toFixed(1)}%`;
}

function formatPercentDeltaCompact(value: unknown): string {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '—';
  const sign = numeric > 0 ? '+' : '';
  const absValue = Math.abs(numeric);
  if (absValue < 1000) return `${sign}${absValue.toFixed(1)}%`;
  if (absValue < 1_000_000) return `${sign}${Math.round(absValue).toLocaleString()}%`;
  return `${sign}${absValue.toExponential(2)}%`;
}

function renderUploadAnalysis(analysis: UploadAnalysisSummary, detail: EndpointDetail): string {
  const verdict =
    analysis.verdict === 'matched'
      ? {
          title: 'Upload Analysis Passed',
          subtitle: analysis.summary_message,
          className: 'success',
          icon: '✅',
        }
      : analysis.verdict === 'mismatch'
        ? {
            title: 'Upload Analysis Found Mismatches',
            subtitle: analysis.summary_message,
            className: 'danger',
            icon: '⚠️',
          }
        : {
            title: 'Upload Analysis Hit Errors',
            subtitle: analysis.summary_message,
            className: 'danger',
            icon: '🛑',
          };

  const runCard = (run: UploadAnalysisRun): string => {
    const statusPriority = (status: string): number => {
      if (status === 'mismatch') return 0;
      if (status === 'error') return 1;
      if (status === 'missing_kpi') return 2;
      if (status === 'missing_reference') return 3;
      return 4;
    };
    const comparisons = [...(run.comparisons || [])]
      .sort((a, b) => {
        const priorityDelta = statusPriority(String(a.status || '')) - statusPriority(String(b.status || ''));
        if (priorityDelta !== 0) return priorityDelta;
        return String(a.kpi_field || '').localeCompare(String(b.kpi_field || ''));
      });
    const flaggedComparisons = comparisons.filter((comparison) => comparison.status !== 'match');
    const matchedComparisons = comparisons.filter((comparison) => comparison.status === 'match');
    const requestLine = requestPreview(run);
    const highlights = flaggedComparisons
      .slice(0, 2)
      .map((comparison) => {
        const pct = comparison.pct_change == null ? '' : ` (${Math.abs(Number(comparison.pct_change)).toFixed(1)}%)`;
        return `${cleanKpiLabel(comparison.kpi_field)}: ${analysisStatusLabel(comparison.status)}${pct}`;
      })
      .join(' • ');
    const hiddenFlaggedCount = Math.max(0, flaggedComparisons.length - 2);
    const defaultVisibleRows = flaggedComparisons.length ? flaggedComparisons : matchedComparisons.slice(0, 3);
    const hiddenMatchedRows = flaggedComparisons.length ? matchedComparisons : matchedComparisons.slice(3);
    const renderComparisonRows = (rows: UploadAnalysisComparison[]): string => rows
      .map((comparison: UploadAnalysisComparison) => `
        <tr>
          <td><strong>${escapeHtml(cleanKpiLabel(comparison.kpi_field))}</strong></td>
          <td>${fmt(comparison.expected_value)}</td>
          <td>${fmt(comparison.actual_value)}</td>
          <td>${comparison.pct_change == null ? '—' : `${Number(comparison.pct_change) > 0 ? '+' : ''}${Number(comparison.pct_change).toFixed(1)}%`}</td>
          <td>
            <span class="status-pill ${analysisStatusPill(comparison.status)}">${escapeHtml(analysisStatusLabel(comparison.status))}</span>
            <div class="tiny muted" style="margin-top:6px;">${escapeHtml(plainComparisonReason(comparison))}</div>
          </td>
        </tr>
      `)
      .join('');

    return `
      <div class="upload-analysis-card upload-analysis-card-${escapeHtml(run.status)}">
        <div class="upload-analysis-header">
          <div>
            <strong>${escapeHtml(plainRunTitle(run))}</strong>
          </div>
          <span class="status-pill ${analysisStatusPill(run.status)}">${escapeHtml(analysisStatusLabel(run.status))}</span>
        </div>
        <div class="upload-analysis-message">${escapeHtml(plainRunMessage(run))}</div>
        <div class="upload-analysis-kpi-stats tiny">
          ${fmt(comparisons.length)} KPI(s) • ${fmt(flaggedComparisons.length)} need attention • ${fmt(matchedComparisons.length)} within range
        </div>
        ${highlights ? `<div class="upload-analysis-highlights"><strong>Top findings:</strong> ${escapeHtml(highlights)}${hiddenFlaggedCount ? ` +${hiddenFlaggedCount} more` : ''}</div>` : ''}
        <details class="upload-analysis-detail">
          <summary>${comparisons.length ? (flaggedComparisons.length ? `KPI details (${flaggedComparisons.length} need attention)` : `KPI details (${comparisons.length} matched)`) : 'KPI details'}</summary>
          ${
            comparisons.length
              ? `
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
                      ${renderComparisonRows(defaultVisibleRows)}
                    </tbody>
                  </table>
                </div>
                ${hiddenMatchedRows.length ? `
                  <details class="upload-analysis-inline-more">
                    <summary>Show ${fmt(hiddenMatchedRows.length)} additional matched KPI(s)</summary>
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
                          ${renderComparisonRows(hiddenMatchedRows)}
                        </tbody>
                      </table>
                    </div>
                  </details>
                ` : ''}
              `
              : '<div class="tiny muted" style="margin-top:10px;">No KPI comparisons were returned for this row.</div>'
          }
          ${
            flaggedComparisons.length
              ? `
                <div class="upload-analysis-reasons">
                  <strong>Why this row needs attention</strong>
                  <ul>
                    ${flaggedComparisons
                      .map((comparison) => `<li>${escapeHtml(plainComparisonReason(comparison))}</li>`)
                      .join('')}
                  </ul>
                </div>
              `
              : ''
          }
        </details>
        <details class="upload-analysis-tech">
          <summary>Technical details</summary>
          <div class="tiny muted upload-analysis-request">Grain key: ${escapeHtml(run.grain_key)}</div>
          ${requestLine ? `<div class="tiny muted upload-analysis-request">Called with ${escapeHtml(requestLine)}</div>` : ''}
        </details>
        ${run.error ? `<div class="upload-analysis-error">${escapeHtml(run.error)}</div>` : ''}
      </div>
    `;
  };

  const flaggedRuns = analysis.runs.filter((run) => run.status !== 'match');
  const matchedRuns = analysis.runs.filter((run) => run.status === 'match');
  const visibleFlaggedRuns = flaggedRuns.slice(0, 8);
  const hiddenFlaggedRuns = flaggedRuns.slice(8);
  const flaggedComparisons = flaggedRuns.flatMap((run) => (run.comparisons || []).filter((item) => item.status !== 'match'));
  const severeComparisons = flaggedComparisons.filter((comparison) => {
    if (comparison.status === 'error' || comparison.status === 'missing_kpi') return true;
    const pct = Number(comparison.pct_change);
    return Number.isFinite(pct) && Math.abs(pct) >= 30;
  });
  const maxDelta = flaggedComparisons.reduce((max, comparison) => {
    const pct = Number(comparison.pct_change);
    if (!Number.isFinite(pct)) return max;
    return Math.max(max, Math.abs(pct));
  }, 0);
  const impactByKpi = new Map<string, number>();
  flaggedComparisons.forEach((comparison) => {
    const label = cleanKpiLabel(comparison.kpi_field);
    if (!label) return;
    const pct = Number(comparison.pct_change);
    const magnitude = Number.isFinite(pct) ? Math.abs(pct) : 0;
    const current = impactByKpi.get(label) ?? 0;
    if (magnitude > current) impactByKpi.set(label, magnitude);
  });
  const topImpactList = [...impactByKpi.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, magnitude]) => `${name}${magnitude > 0 ? ` (${magnitude.toFixed(1)}%)` : ''}`);
  const riskScore = (() => {
    const requested = Math.max(1, Number(analysis.requested_grains || 0));
    const mismatchRatio = Number(analysis.mismatch_runs || 0) / requested;
    if (Number(analysis.failed_runs || 0) > 0) return 'High';
    if (maxDelta >= 50) return 'High';
    if (mismatchRatio >= 0.4) return 'High';
    if (Number(analysis.mismatch_runs || 0) > 0) return 'Medium';
    return 'Low';
  })();
  const confidencePct = (() => {
    const attempted = Math.max(1, Number(analysis.attempted_runs || analysis.requested_grains || 1));
    const successful = Number(analysis.successful_runs || 0);
    const failed = Number(analysis.failed_runs || 0);
    const flagged = flaggedComparisons.length;
    let score = 55;
    if (successful > 0) score += 18;
    if (failed === 0) score += 12;
    score += Math.min(10, Math.round((flagged / attempted) * 10));
    return Math.max(35, Math.min(95, score));
  })();
  const recommendation = (() => {
    if (analysis.verdict === 'mismatch') {
      if (riskScore === 'High') {
        return 'Block release: review Issues now and review high-priority mismatches before accepting this baseline.';
      }
      return 'Needs attention: review mismatch rows and mark expected changes in review, then resolve the rest.';
    }
    if (analysis.verdict === 'error') {
      return 'Block release: fix run errors first, then re-run upload analysis.';
    }
    return 'Safe for now: baseline looks healthy. Continue with scheduled monitoring checks.';
  })();
  const impactSummary = topImpactList.length
    ? topImpactList.join(' • ')
    : (severeComparisons.length > 0 ? `${severeComparisons.length} KPI check(s) need deeper review.` : 'No major KPI shifts detected.');

  const runCards = `
      ${flaggedRuns.length ? `<div class="upload-analysis-section-title">Needs attention (${flaggedRuns.length})</div>` : '<div class="upload-analysis-section-title">Safe for now</div>'}
      ${visibleFlaggedRuns.map((run) => runCard(run)).join('')}
    ${
      hiddenFlaggedRuns.length
        ? `
          <details class="upload-analysis-more-runs">
            <summary>Show ${hiddenFlaggedRuns.length} more flagged row(s)</summary>
            <div class="history-list" style="margin-top:12px;">
              ${hiddenFlaggedRuns.map((run) => runCard(run)).join('')}
            </div>
          </details>
        `
        : ''
    }
    ${
      matchedRuns.length
        ? `
          <details class="upload-analysis-more-runs upload-analysis-matched-group">
            <summary>Matched rows (${matchedRuns.length})</summary>
            <div class="history-list" style="margin-top:12px;">
              ${matchedRuns.map((run) => runCard(run)).join('')}
            </div>
          </details>
        `
        : ''
    }
  `;

  const analysisErrors = (analysis.errors || [])
    .map((item) => item?.error)
    .filter((item): item is string => Boolean(item))
    .slice(0, 3);
  const issuesSync = analysis?.issues_sync && typeof analysis.issues_sync === 'object' ? analysis.issues_sync : null;
  const issuesAutoEnabled = issuesSync?.auto_enabled !== false;
  const issuesCreated = Number(issuesSync?.created || 0);
  const issuesUpdated = Number(issuesSync?.updated || 0);
  const issuesCandidates = Number(issuesSync?.candidates || 0);
  const issuesSyncStatus = issuesSync
    ? (
      issuesCreated > 0
        ? `<div class="tiny" style="margin-top:10px; color:var(--ok);">Added ${fmt(issuesCreated)} mismatch issue${issuesCreated === 1 ? '' : 's'} to <strong>Issues</strong> automatically.</div>`
        : (
          issuesUpdated > 0
            ? `<div class="tiny muted" style="margin-top:10px;">Refreshed ${fmt(issuesUpdated)} existing mismatch issue${issuesUpdated === 1 ? '' : 's'} in <strong>Issues</strong>.</div>`
            : (
              issuesCandidates > 0
                ? '<div class="tiny muted" style="margin-top:10px;">Upload mismatches are already present in <strong>Issues</strong>.</div>'
                : '<div class="tiny muted" style="margin-top:10px;">No mismatch rows to add to <strong>Issues</strong> from this run.</div>'
            )
        )
    )
    : '';
  const createIssuesAction = flaggedRuns.length && (!issuesSync || !issuesAutoEnabled)
    ? `
      <div class="toolbar" style="margin-top:12px; justify-content:flex-start;">
        <button class="action secondary" type="button" onclick="materializeUploadAnalysisIssues()">
          Add ${fmt(flaggedRuns.length)} mismatch${flaggedRuns.length === 1 ? '' : 'es'} to Issues
        </button>
      </div>
    `
    : '';
  const openIssuesAction = flaggedRuns.length
    ? `
      <div class="toolbar" style="margin-top:12px; justify-content:flex-start;">
        <button class="action" type="button" onclick="openUploadIssues()">Review Issues</button>
      </div>
    `
    : '';
  const issuesVisibilityHint = flaggedRuns.length
    ? '<div class="tiny muted" style="margin-top:8px;">If the Issues list looks empty, clear Status/Severity filters. The button above opens Issues with filters reset.</div>'
    : '';
  const errorBlock = analysisErrors.length
    ? `
      <div class="upload-analysis-errors">
        <strong>Upload analysis errors</strong>
        <div class="history-list" style="margin-top:8px;">
          ${analysisErrors.map((item) => `<div class="history-item upload-analysis-error-item">${escapeHtml(item)}</div>`).join('')}
        </div>
      </div>
    `
    : '';

  return `
    <div class="results-auto-show">
      <div class="verdict-banner ${verdict.className}">
        <div class="verdict-icon">${verdict.icon}</div>
        <div class="verdict-body">
          <h4>${escapeHtml(verdict.title)}</h4>
          <p>${escapeHtml(verdict.subtitle)}</p>
        </div>
      </div>
      <div class="upload-analysis-explainer">
        <strong>${uploadDecisionLabel(analysis)}</strong>
        <p>
          A mismatch means the API returned a value outside the allowed tolerance from your uploaded CSV baseline.
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
          <span>${fmt(analysis.requested_grains)}</span>
        </div>
        <div class="meta-card meta-card-compact">
          <strong>Safe for now</strong>
          <span>${fmt(analysis.matched_runs)}</span>
        </div>
        <div class="meta-card meta-card-compact">
          <strong>Needs attention</strong>
          <span>${fmt(analysis.mismatch_runs)}</span>
        </div>
        <div class="meta-card meta-card-compact">
          <strong>Block release</strong>
          <span>${fmt(analysis.failed_runs)}</span>
        </div>
        <div class="meta-card meta-card-compact">
          <strong>Priority</strong>
          <span>${riskScore}</span>
          <div class="tiny muted" style="margin-top:4px;">Confidence ${fmt(confidencePct)}%</div>
        </div>
      </div>
      <div class="row-card" style="margin-top:12px;">
        <strong>Recommended next step</strong>
        <div class="tiny" style="margin-top:6px;">${escapeHtml(recommendation)}</div>
        <div class="tiny muted" style="margin-top:8px;">Impact focus: ${escapeHtml(impactSummary)}</div>
      </div>
      ${createIssuesAction}
      ${openIssuesAction}
      ${issuesVisibilityHint}
      ${issuesSyncStatus}
      ${errorBlock}
      <div class="history-list" style="margin-top:16px;">
        ${runCards || emptyState(`No upload analysis results for ${detail.endpoint_path} yet.`)}
      </div>
    </div>
  `;
}

function filteredErrors(): RecentError[] {
  const rows = state.status?.recent_errors || [];
  return rows.filter((item) => {
    const category = item.category ? item.category[0].toUpperCase() + item.category.slice(1) : errorCategory(item.source);
    const severity = item.severity || errorSeverity(item.source);
    const status = errorStatus(item);
    const haystack = `${item.source} ${item.message} ${item.hint || ''} ${item.endpoint_path || ''}`.toLowerCase();
    const matchesText = !state.errorSearch || haystack.includes(state.errorSearch.toLowerCase());
    const matchesStatus = !state.errorStatusFilter || status === state.errorStatusFilter;
    const matchesCategory = !state.errorCategoryFilter || category === state.errorCategoryFilter;
    const matchesSeverity = !state.errorSeverityFilter || severity === state.errorSeverityFilter;
    return matchesText && matchesStatus && matchesCategory && matchesSeverity;
  });
}

function renderSidebar() {
  const project = state.status?.project;
  const maintainerMode = isMaintainerMode();
  const trustScore = project?.trust_score ?? 100;
  const tier = String(project?.tier || 'free').toLowerCase();
  const licenseEnforced = project?.license_enforced !== false;
  const projectLimitText = !licenseEnforced
    ? 'unlimited'
    : (project?.project_limit == null ? (tier === 'free' ? '1' : 'unlimited') : String(project.project_limit));
  
  const headerHtml = maintainerMode ? `
    <div class="sidebar-trust-header">
      <div class="trust-meter">
        <div class="trust-score-ring" style="--score: ${trustScore}%">
          <span class="trust-value">${trustScore}%</span>
        </div>
        <div class="trust-label">Data Trust</div>
      </div>
      <div class="tier-pill tier-${tier}">
        <span class="tier-label">${tier}</span>
        ${tier === 'free' && licenseEnforced ? `<span class="tier-limit">${project?.projects_active || 1}/${projectLimitText}</span>` : ''}
      </div>
    </div>
    ${project?.policy?.force_upgrade ? `
      <div class="sidebar-lock-banner danger">
        <div class="lock-icon">🛑</div>
        <div class="lock-body">
          <strong>Update Required</strong>
          <span class="tiny">Your version of Jin is no longer supported by the current pricing model.</span>
          <br/>
          <button class="upgrade-btn-mini" style="margin-top:8px" onclick="window.location.href='https://jin.dev/download'">Get Latest Version</button>
        </div>
      </div>
    ` : project?.is_unlicensed ? `
      <div class="sidebar-lock-banner">
        <div class="lock-icon">💎</div>
        <div class="lock-body">
          <strong>Local Project Limit</strong>
          <span class="tiny">Free tier allows one project per account. Activate Business for unlimited projects.</span>
          <br/>
          <button class="upgrade-btn-mini" style="margin-top:8px" onclick="window.location.href='https://jin.dev/upgrade?site=${project.site_id}'">Unlock Unlimited</button>
        </div>
      </div>
    ` : ''}
  ` : '';
  const projectSummaryHtml = maintainerMode ? '' : `
    <div class="sidebar-card">
      <strong>Project</strong>
      <span>${project?.name || 'Customer project'}</span>
      <div class="tiny" style="margin-top:6px;">Use APIs, Issues, and Reports to operate your project.</div>
    </div>
  `;

  // Apply feature gating to nav buttons
  document.querySelectorAll<HTMLButtonElement>('#nav button[data-feature]').forEach((btn) => {
    const feature = btn.dataset.feature;
    if (feature && !isFeatureEnabled(feature)) {
      btn.classList.add('feature-locked');
      const label = btn.querySelector('.nav-label');
      if (label && !label.querySelector('.feature-lock-badge')) {
        label.innerHTML += ` <span class="feature-lock-badge" style="font-size:7px; vertical-align:middle; margin-left:4px;">BUSINESS</span>`;
      }
    } else {
      btn.classList.remove('feature-locked');
    }
  });

  const allEndpoints = state.status?.endpoints || [];
  const endpoints = currentEndpoints();
  const browserMode = apiBrowserMode();
  const browserHeroHtml = apiBrowserHeroHtml(endpoints, browserMode);
  const browserModeHtml = apiBrowserModeToggleHtml(browserMode);
  const browserSummaryHtml = apiBrowserSummaryHtml(endpoints);
  if (!endpoints.length) {
    const hasFilters = Boolean((state.apiFilter || '').trim() || (state.apiStatusFilter || '').trim());
    const onboardingEmptyState = allEndpoints.length === 0 && !hasFilters
      ? `
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
      `
      : '';
    const message = hasFilters
      ? 'No APIs match this search.'
      : allEndpoints.length === 0
        ? (state.apiDataState === 'auth_required'
          ? 'Your Jin session expired. Sign in again to load APIs.'
          : state.apiDataState === 'error'
            ? 'Jin returned an error while loading APIs. Check server logs and retry.'
            : state.apiDataState === 'unavailable'
              ? 'Cannot load APIs right now. Check backend connection and retry.'
              : 'No APIs connected yet. Open Overview for the first-run checklist.')
        : 'No APIs match this search.';
    ui.apiList.innerHTML = headerHtml + projectSummaryHtml + browserHeroHtml + browserSummaryHtml + browserModeHtml + (onboardingEmptyState || emptyState(message));
  } else {
    const groupedHtml = browserMode === 'table'
      ? ''
      : (() => {
        const grouped = endpoints.reduce((acc: Record<string, EndpointStatus[]>, item: EndpointStatus) => {
          const key = routeGroup(item.endpoint_path);
          acc[key] = acc[key] || [];
          acc[key].push(item);
          return acc;
        }, {});
        const sortedGroups = Object.entries(grouped).sort((a, b) => a[0].localeCompare(b[0]));
        const isLargeSet = endpoints.length > 24;
        return sortedGroups.map(([group, items]) => {
          const collapsed = state.collapsedGroups[group] ?? (browserMode === 'grouped' && (isLargeSet || items.length > 8));
          return apiBrowserGroupHtml(group, items, { compact: browserMode === 'compact', collapsed });
        }).join('');
      })();
    ui.apiList.innerHTML = headerHtml + projectSummaryHtml + browserHeroHtml + browserSummaryHtml + browserModeHtml + `
            ${browserMode === 'table'
              ? apiBrowserTableHtml(endpoints)
              : `<div class="api-browser-body ${browserMode === 'compact' ? 'compact' : 'grouped'}">${groupedHtml}</div>`
            }
            <div class="sidebar-footer">
              <button class="api-item ${state.currentView === 'settings' ? 'active' : ''}" type="button" onclick="setView('settings')">
                <div class="api-row">
                  <span class="status-dot healthy"></span>
                  <div class="api-row-main">
                    <div class="api-row-top"><strong>Settings</strong></div>
                    <div class="api-path">${maintainerMode ? 'License & Preferences' : 'Preferences'}</div>
                  </div>
                </div>
              </button>
            </div>
          `;
  }
  const tableBody = ui.apiList.querySelector('.api-browser-table-body.virtualized') as HTMLElement | null;
  if (tableBody) {
    const scrollHandler = (window as any).handleApiBrowserTableScroll;
    if (typeof scrollHandler === 'function') {
      tableBody.addEventListener('scroll', scrollHandler, { passive: true });
    }
    tableBody.scrollTop = Math.max(0, Number(state.apiBrowserScrollTop || 0));
  }
  const syncPinnedOffsets = (window as any).syncApiBrowserPinnedOffsets;
  if (typeof syncPinnedOffsets === 'function') {
    syncPinnedOffsets();
  }
}

(window as any).showRunDetail = (timestamp: string) => {
  const detail = state.activeApiDetail;
  if (!detail) return;
  
  const history = (detail.history && detail.history.length ? detail.history : detail.recent_history) || [];
  const runObs = history.filter((o: any) => o.observed_at === timestamp);
  
  ui.runDetailTitle.innerText = `Run Detail: ${fmtDate(timestamp)}`;
  ui.runDetailDrawer.style.display = 'block';
  
  if (!runObs.length) {
    ui.runDetailContent.innerHTML = emptyState('No observations for this timestamp.');
    return;
  }

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
  const referenceIndex = new Map<string, { expected: number | null; tolerance: number | null }>();
  (detail.references || []).forEach((item: any) => {
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
    const canonicalKpi = canonicalKpiField(kpiField);
    referenceIndex.set(`${grainKey}__${kpiField}`, reference);
    if (canonicalKpi && canonicalKpi !== kpiField) {
      referenceIndex.set(`${grainKey}__${canonicalKpi}`, reference);
    }
    const normalizedGrain = canonicalGrainKey(grainKey);
    if (normalizedGrain) {
      if (!referenceIndex.has(`${normalizedGrain}__${kpiField}`)) {
        referenceIndex.set(`${normalizedGrain}__${kpiField}`, reference);
      }
      if (canonicalKpi && !referenceIndex.has(`${normalizedGrain}__${canonicalKpi}`)) {
        referenceIndex.set(`${normalizedGrain}__${canonicalKpi}`, reference);
      }
    }
  });

  const defaultTolerance = Number(detail?.config?.tolerance_normal ?? detail?.config?.tolerance_pct ?? 10);
  const flattenedRows = runObs.flatMap((obs: any) => {
    const grainKey = String(obs?.grain_key || 'Global');
    const explicitComparisons = Array.isArray(obs?.comparisons) ? obs.comparisons.filter((item: any) => item?.kpi_field) : [];
    if (explicitComparisons.length) {
      return explicitComparisons.map((comp: any) => {
        const actual = comp.actual_value ?? comp.actual;
        const rawKpiField = String(comp.kpi_field || '');
        const normalizedKpi = canonicalKpiField(rawKpiField);
        const normalizedGrain = canonicalGrainKey(grainKey);
        const fallbackReference = referenceIndex.get(`${grainKey}__${rawKpiField}`)
          || (normalizedKpi ? referenceIndex.get(`${grainKey}__${normalizedKpi}`) : undefined)
          || referenceIndex.get(`${normalizedGrain}__${rawKpiField}`)
          || (normalizedKpi ? referenceIndex.get(`${normalizedGrain}__${normalizedKpi}`) : undefined);
        const expected = comp.expected_value ?? comp.expected ?? fallbackReference?.expected ?? null;
        const allowedTolerance = comp.allowed_tolerance_pct ?? fallbackReference?.tolerance ?? defaultTolerance;
        const expectedNum = expected == null ? null : Number(expected);
        const actualNum = actual == null ? null : Number(actual);
        const pctChange = comp.pct_change != null
          ? Number(comp.pct_change)
          : (expectedNum == null || actualNum == null || expectedNum === 0 ? null : ((actualNum - expectedNum) / Math.abs(expectedNum)) * 100);
        const explicitStatus = String(comp.status || '');
        const status = (explicitStatus && !(explicitStatus === 'missing_reference' && expectedNum != null))
          ? explicitStatus
          : (expectedNum == null
            ? 'missing_reference'
            : (pctChange != null && Math.abs(pctChange) > allowedTolerance ? 'mismatch' : 'match'));
        return {
          grainKey,
          kpiField: String(comp.kpi_field),
          actual: actualNum,
          expected: expectedNum,
          pctChange,
          status,
          message: comp.message || 'Historical comparison for this metric.',
        };
      });
    }

    const kpis = parseObject(obs?.kpi_json);
    return extractNumericMetrics(kpis)
      .map(({ kpiField, value }) => {
        const actual = Number(value);
        const canonicalKpi = canonicalKpiField(kpiField);
        const normalizedGrain = canonicalGrainKey(grainKey);
        const reference = referenceIndex.get(`${grainKey}__${kpiField}`)
          || (canonicalKpi ? referenceIndex.get(`${grainKey}__${canonicalKpi}`) : undefined)
          || referenceIndex.get(`${normalizedGrain}__${kpiField}`)
          || (canonicalKpi ? referenceIndex.get(`${normalizedGrain}__${canonicalKpi}`) : undefined);
        const expected = reference?.expected ?? null;
        const tolerance = reference?.tolerance ?? defaultTolerance;
        const pctChange = expected == null || expected === 0 ? null : ((actual - expected) / Math.abs(expected)) * 100;
        const status = expected == null
          ? 'missing_reference'
          : (pctChange != null && Math.abs(pctChange) > tolerance ? 'mismatch' : 'match');
        const message = expected == null
          ? 'No uploaded baseline was found for this metric on this grain.'
          : `Derived from run observation and uploaded baseline (tolerance +/-${tolerance.toFixed(1)}%).`;
        return {
          grainKey,
          kpiField,
          actual,
          expected,
          pctChange,
          status,
          message,
        };
      });
  });

  const comparableRows = flattenedRows.filter((row: any) => row && String(row.kpiField || '').trim().length > 0);
  if (!comparableRows.length) {
    const topLevelKeys = runObs
      .flatMap((obs: any) => Object.keys(parseObject(obs?.kpi_json) || {}))
      .filter((key: string, index: number, list: string[]) => list.indexOf(key) === index);
    const hint = topLevelKeys.length
      ? `Captured keys: ${topLevelKeys.slice(0, 6).join(', ')}${topLevelKeys.length > 6 ? ', ...' : ''}.`
      : 'No KPI values were returned for this run.';
    ui.runDetailContent.innerHTML = emptyState(`No comparable KPI values were captured for this run. ${hint}`);
    return;
  }

  const technicalDimensionKeys = new Set(['api_version', 'timestamp', '_jin_id']);
  const parseGrainDimensions = (grainKey: string): Record<string, string> => {
    if (!grainKey || grainKey.indexOf('|') === -1) return {};
    const [, ...parts] = grainKey.split('|');
    const output: Record<string, string> = {};
    parts.forEach((part) => {
      const eq = part.indexOf('=');
      if (eq <= 0) return;
      const key = part.slice(0, eq);
      const value = part.slice(eq + 1);
      output[key] = value;
    });
    return output;
  };
  const displayGrainTitle = (grainKey: string): string => {
    const dims = parseGrainDimensions(grainKey);
    const retailer = dims.retailer || dims.grain_retailer;
    const date = dims['data[].date'] || dims.date || dims.period;
    const label = dims['data[].label'] || dims.label;
    const parts = [
      retailer ? `Retailer: ${retailer}` : null,
      date ? `Date: ${date}` : null,
      label ? `Label: ${label}` : null,
    ].filter(Boolean);
    if (parts.length) return parts.join(' • ');
    const fallback = Object.entries(dims)
      .filter(([key]) => !technicalDimensionKeys.has(key))
      .slice(0, 3)
      .map(([key, value]) => `${key}=${value}`);
    return fallback.length ? fallback.join(' • ') : 'Global grain';
  };

  const grouped = new Map<string, any[]>();
  comparableRows.forEach((row: any) => {
    const key = String(row.grainKey || 'Global');
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(row);
  });
  const groupedRuns = Array.from(grouped.entries()).map(([grainKey, rows]) => {
    const needsReviewCount = rows.filter((row) => row.status !== 'match' && row.status !== 'missing_reference').length;
    const missingBaseline = rows.every((row) => row.status === 'missing_reference' || row.expected == null);
    return {
      grainKey,
      title: displayGrainTitle(grainKey),
      rows,
      needsReviewCount,
      missingBaseline,
      status: needsReviewCount > 0 ? 'mismatch' : (missingBaseline ? 'missing_reference' : 'match'),
    };
  }).sort((a, b) => (a.status === 'match' ? 1 : 0) - (b.status === 'match' ? 1 : 0));

  const totalGrains = groupedRuns.length;
  const needsReviewGroups = groupedRuns.filter((row) => row.status === 'mismatch');
  const needsBaselineGroups = groupedRuns.filter((row) => row.status === 'missing_reference');
  const missingBaselineGrains = needsBaselineGroups.length;
  const mismatchGrains = needsReviewGroups.length;
  const matchedGroups = groupedRuns.filter((group) => group.status === 'match');
  const runCardStatusSummary = (group: any): string => {
    const mismatches = group.rows.filter((row: any) => row.status === 'mismatch' || row.status === 'missing_kpi' || row.status === 'error').length;
    const missingBaseline = group.rows.filter((row: any) => row.status === 'missing_reference').length;
    const matched = group.rows.filter((row: any) => row.status === 'match').length;
    const bits = [`${fmt(group.rows.length)} metric(s)`];
    if (mismatches) bits.push(`${fmt(mismatches)} need attention`);
    if (missingBaseline) bits.push(`${fmt(missingBaseline)} without baseline`);
    if (matched) bits.push(`${fmt(matched)} matched`);
    return bits.join(' • ');
  };
  const runRowReason = (row: any): string => {
    const label = cleanKpiLabel(String(row.kpiField || 'metric'));
    const pct = row.pctChange == null ? null : Number(row.pctChange);
    if (row.status === 'match') {
      if (pct == null) return `${label} is within the allowed range.`;
      return `${label} is within the allowed range (${Math.abs(pct).toFixed(1)}% change).`;
    }
    if (row.status === 'missing_reference') {
      return `No baseline is uploaded for ${label}.`;
    }
    if (row.status === 'missing_kpi') {
      return `${label} was not returned by the API for this grain.`;
    }
    if (row.status === 'error') {
      return row.message || `Could not evaluate ${label}.`;
    }
    if (pct == null) return `${label} is outside the allowed range.`;
    const direction = pct > 0 ? 'higher' : 'lower';
    return `${label} is ${Math.abs(pct).toFixed(1)}% ${direction} than baseline (outside tolerance).`;
  };
  const renderGroupCard = (group: any): string => {
    const flaggedRows = group.rows.filter((row: any) => row.status !== 'match');
    const matchedRows = group.rows.filter((row: any) => row.status === 'match');
    const visibleRows = flaggedRows.length ? flaggedRows : matchedRows.slice(0, 3);
    const hiddenMatchedRows = flaggedRows.length ? matchedRows : matchedRows.slice(3);
    const topFindings = flaggedRows
      .slice(0, 2)
      .map((row: any) => runRowReason(row))
      .join(' • ');
    const hiddenFindingCount = Math.max(0, flaggedRows.length - 2);
    return `
    <div class="upload-analysis-card upload-analysis-card-${group.status === 'match' ? 'match' : (group.status === 'missing_reference' ? 'setup' : 'mismatch')} run-detail-grain-card">
      <div class="upload-analysis-header">
        <div>
          <strong>${escapeHtml(group.title)}</strong>
          <div class="tiny muted">${escapeHtml(runCardStatusSummary(group))}</div>
        </div>
        <span class="status-pill ${analysisStatusPill(group.status)}">${escapeHtml(analysisStatusLabel(group.status))}</span>
      </div>

      <div class="run-detail-card-stats tiny">
        ${fmt(group.rows.length)} metric(s) • ${fmt(flaggedRows.length)} need attention • ${fmt(matchedRows.length)} within range
      </div>

      ${topFindings ? `<div class="upload-analysis-highlights"><strong>Top findings:</strong> ${escapeHtml(topFindings)}${hiddenFindingCount ? ` +${hiddenFindingCount} more` : ''}</div>` : ''}

      ${group.missingBaseline ? `
        <div class="run-detail-inline-help">
          No baseline is linked to this grain yet.
          <button class="action secondary tiny" type="button" onclick="openUploadsTab()">Set baseline</button>
        </div>
      ` : ''}

      <details class="run-detail-kpi-breakdown">
        <summary>${flaggedRows.length ? `${fmt(flaggedRows.length)} KPI(s) need attention` : `${fmt(group.rows.length)} KPI(s) within baseline`}</summary>
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
              ${visibleRows.map((row: any) => `
                <tr>
                  <td>
                    <strong>${escapeHtml(cleanKpiLabel(row.kpiField))}</strong>
                  </td>
                  <td class="num muted">${row.expected == null ? '—' : fmt(row.expected)}</td>
                  <td class="num">${fmt(row.actual)}</td>
                  <td>${row.pctChange == null ? '—' : `${Number(row.pctChange) > 0 ? '+' : ''}${Number(row.pctChange).toFixed(1)}%`}</td>
                  <td>
                    <span class="status-pill ${analysisStatusPill(row.status)}">${escapeHtml(analysisStatusLabel(row.status))}</span>
                    <div class="tiny muted" style="margin-top:6px;">${escapeHtml(runRowReason(row))}</div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ${hiddenMatchedRows.length ? `
          <details class="upload-analysis-inline-more">
            <summary>Show ${fmt(hiddenMatchedRows.length)} additional matched KPI(s)</summary>
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
                  ${hiddenMatchedRows.map((row: any) => `
                    <tr>
                      <td><strong>${escapeHtml(cleanKpiLabel(row.kpiField))}</strong></td>
                      <td class="num muted">${row.expected == null ? '—' : fmt(row.expected)}</td>
                      <td class="num">${fmt(row.actual)}</td>
                      <td>${row.pctChange == null ? '—' : `${Number(row.pctChange) > 0 ? '+' : ''}${Number(row.pctChange).toFixed(1)}%`}</td>
                      <td>
                        <span class="status-pill ${analysisStatusPill(row.status)}">${escapeHtml(analysisStatusLabel(row.status))}</span>
                        <div class="tiny muted" style="margin-top:6px;">${escapeHtml(runRowReason(row))}</div>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </details>
        ` : ''}
      </details>

      <details class="upload-analysis-tech">
        <summary>Technical grain key</summary>
        <div class="tiny muted upload-analysis-request">${escapeHtml(group.grainKey)}</div>
      </details>
    </div>
  `;
  };

  const visibleNeedsReviewGroups = needsReviewGroups.slice(0, 6);
  const hiddenNeedsReviewGroups = needsReviewGroups.slice(6);
  const visibleNeedsBaselineGroups = needsBaselineGroups.slice(0, 6);
  const hiddenNeedsBaselineGroups = needsBaselineGroups.slice(6);

  ui.runDetailContent.innerHTML = `
    <div class="run-detail-guide">
      <strong>What this run means</strong>
      <p>This view compares API values against uploaded baselines for each grain.</p>
      ${missingBaselineGrains ? '<p class="tiny" style="margin-top:8px;">Some grains have no baseline yet. You can view raw API values, then upload a baseline to enable pass/fail checks.</p>' : ''}
    </div>
      <div class="upload-analysis-summary-grid" style="margin-top:12px;">
        <div class="meta-card meta-card-compact">
          <strong>Grains in run</strong>
          <span>${fmt(totalGrains)}</span>
        </div>
        <div class="meta-card meta-card-compact">
          <strong>Needs attention</strong>
          <span>${fmt(mismatchGrains)}</span>
        </div>
      <div class="meta-card meta-card-compact">
        <strong>No baseline</strong>
        <span>${fmt(missingBaselineGrains)}</span>
      </div>
    </div>

    <div class="history-list" style="margin-top:14px;">
      ${needsReviewGroups.length ? `<div class="upload-analysis-section-title">Needs attention (${fmt(needsReviewGroups.length)})</div>` : ''}
      ${visibleNeedsReviewGroups.map((group) => renderGroupCard(group)).join('')}
      ${hiddenNeedsReviewGroups.length ? `
        <details class="upload-analysis-more-runs">
          <summary>Show ${fmt(hiddenNeedsReviewGroups.length)} more grain(s) needing attention</summary>
          <div class="history-list" style="margin-top:12px;">
            ${hiddenNeedsReviewGroups.map((group) => renderGroupCard(group)).join('')}
          </div>
        </details>
      ` : ''}
      ${needsBaselineGroups.length ? `<div class="upload-analysis-section-title">Needs baseline setup (${fmt(needsBaselineGroups.length)})</div>` : ''}
      ${visibleNeedsBaselineGroups.map((group) => renderGroupCard(group)).join('')}
      ${hiddenNeedsBaselineGroups.length ? `
        <details class="upload-analysis-more-runs">
          <summary>Show ${fmt(hiddenNeedsBaselineGroups.length)} more grain(s) needing baseline setup</summary>
          <div class="history-list" style="margin-top:12px;">
            ${hiddenNeedsBaselineGroups.map((group) => renderGroupCard(group)).join('')}
          </div>
        </details>
      ` : ''}
      ${!needsReviewGroups.length && !needsBaselineGroups.length ? '<div class="upload-analysis-section-title">No grains need attention</div>' : ''}
      ${matchedGroups.length ? `
        <details class="upload-analysis-more-runs upload-analysis-matched-group">
          <summary>Matched grains (${fmt(matchedGroups.length)})</summary>
          <div class="history-list" style="margin-top:12px;">
            ${matchedGroups.map((group) => renderGroupCard(group)).join('')}
          </div>
        </details>
      ` : ''}
    </div>
  `;
};

function renderOverview() {
  const endpoints = state.status?.endpoints || [];
  const anomalies = state.anomalies?.anomalies || [];
  const summary = state.status?.summary || {
    total_endpoints: 0,
    healthy: 0,
    anomalies: 0,
    unconfirmed: 0,
  };
  const project = state.status?.project;
  const recentErrors = state.status?.recent_errors || [];
  const healthPct = endpoints.length ? Math.round(((summary.healthy || 0) / endpoints.length) * 100) : 100;
  ui.overviewMetrics.innerHTML = [
    statCard('Healthy', `${healthPct}%`, 'Healthy right now'),
    statCard('At risk', anomalies.length + Number(summary.unconfirmed || 0), 'APIs to review or finish'),
  ].join('');

  ui.overviewCharts.innerHTML = `
        <div class="chart-card">
          <strong>Project</strong>
          <div class="chart-value">${project?.name || 'Your project'}</div>
          <div class="tiny">${endpoints.length} APIs • ${anomalies.length} issues • ${recentErrors.length} errors</div>
          ${statusMixChartSvg(endpoints)}
          <div class="legend-row">
            <span class="legend-chip healthy">Healthy</span>
            <span class="legend-chip warning">Warning</span>
            <span class="legend-chip anomaly">Anomaly</span>
            <span class="legend-chip unconfirmed">Unconfirmed</span>
          </div>
        </div>
      `;
  const needsSetup = endpoints.filter((item) => item.status === 'unconfirmed').length;
  const needsAttention = endpoints.filter((item) => (item.active_anomalies || 0) > 0 || item.status === 'warning').length;
  const firstRunOnboarding = endpoints.length === 0
    ? renderFirstRunChecklist({
        title: 'Create your project',
        description: 'Jin is meant to monitor your own FastAPI app, not the maintainer demo harness.',
        primaryLabel: 'Set Up APIs',
        primaryView: 'api',
        secondaryLabel: 'Open Getting Started',
        secondaryHref: 'https://amit-devb.github.io/jin/',
        footer: 'After the first request, come back here to finish dimensions, KPIs, and baselines.',
      })
    : '';
  ui.overviewAttention.innerHTML = endpoints.length === 0
    ? `
        ${renderPlainLanguageInsight()}
        ${firstRunOnboarding}
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
      `
    : `
        ${renderPlainLanguageInsight()}
        <div class="row-card quick-start-card">
          <strong>Connect your API</strong>
          <div class="muted">Start with your own API, then upload expected values or configure the fields for the first endpoint.</div>
          <div class="toolbar" style="margin-top:12px;">
            <button class="action" type="button" data-view="api">Set Up APIs</button>
          </div>
        </div>
        <div class="row-card">
          <strong>Review issues next</strong>
          <div class="muted">${anomalies.length} issues and ${recentErrors.length} recent errors are waiting there.</div>
          <div class="toolbar" style="margin-top:12px;">
            <button class="action secondary" type="button" data-view="incidents">Review Issues</button>
          </div>
        </div>
        <div class="row-card">
          <strong>Current focus</strong>
          <div class="muted">${needsAttention} APIs need attention and ${needsSetup} still need setup.</div>
        </div>
      `;
}

function renderPlaybook() {
  const payload = state.poPlaybook;
  if (!payload) {
    ui.poPlaybookContent.innerHTML = `
      <div class="row-card">
        <strong>Loading playbook...</strong>
        <div class="muted" style="margin-top:8px;">Preparing your step-by-step workflow guidance.</div>
      </div>
    `;
    renderProjectWorkflowPanel();
    return;
  }

  const workflows = payload.workflows || [];
  const endpoints = state.status?.endpoints || [];
  const stats = payload.stats || {};
  const tracked = Number(stats.apis_tracked || 0);
  const healthy = Number(stats.healthy || 0);
  const anomaliesCount = Number(stats.anomalies || 0);
  const setupPending = Number(stats.unconfirmed || 0);
  const healthPct = tracked > 0 ? Math.round((healthy / tracked) * 100) : 100;
  const topRiskText = anomaliesCount > 0
    ? `${fmt(anomaliesCount)} open issue${anomaliesCount === 1 ? '' : 's'} need attention.`
    : setupPending > 0
      ? `${fmt(setupPending)} API${setupPending === 1 ? '' : 's'} still need setup.`
      : 'No active blockers right now.';
  const nextActionView = anomaliesCount > 0 ? 'incidents' : 'api';
  const nextActionLabel = anomaliesCount > 0 ? 'Review Issues' : 'Set Up APIs';
  const nextStepCopy = anomaliesCount > 0
    ? `${anomaliesCount} issue${anomaliesCount === 1 ? '' : 's'} need attention. Review Issues and focus on high-impact rows first.`
    : setupPending > 0
      ? `${setupPending} API${setupPending === 1 ? '' : 's'} still need setup. Set Up APIs and complete baseline setup.`
      : 'No active blockers. Run checks now and generate this week\'s report pack.';
  ui.poPlaybookContent.innerHTML = `
    <div class="playbook-snapshot-grid">
      <div class="row-card playbook-snapshot-card">
        <span class="tiny">APIs Tracked</span>
        <strong>${fmt(tracked)}</strong>
        <div class="muted">Project: ${fmt(payload.project?.name || 'unknown')}</div>
      </div>
      <div class="row-card playbook-snapshot-card">
        <span class="tiny">Healthy</span>
        <strong>${fmt(healthy)}</strong>
        <div class="muted">${fmt(healthPct)}% health score</div>
      </div>
      <div class="row-card playbook-snapshot-card">
        <span class="tiny">Issues</span>
        <strong>${fmt(anomaliesCount)}</strong>
        <div class="muted">Needs attention</div>
      </div>
      <div class="row-card playbook-snapshot-card">
        <span class="tiny">Setup Pending</span>
        <strong>${fmt(setupPending)}</strong>
        <div class="muted">Needs setup</div>
      </div>
    </div>
    <div class="row-card" style="margin-bottom:12px;">
      <strong>Plain-language summary</strong>
      <div class="muted" style="margin-top:6px;">${endpoints.length === 0
        ? 'Block release: you do not have a live project yet. Connect your own FastAPI app first.'
        : anomaliesCount > 0
          ? `Needs attention: ${fmt(anomaliesCount)} issue${anomaliesCount === 1 ? '' : 's'} need attention. Start with the highest-priority row and work downward.`
          : setupPending > 0
            ? `Needs attention: ${fmt(setupPending)} API${setupPending === 1 ? '' : 's'} still need setup. Finish setup before looking for deeper insights.`
            : 'Safe for now: your project looks healthy. Review the highest-priority project in the portfolio and keep an eye on the weekly report pack.'}</div>
    </div>
    <div class="row-card playbook-next-card" style="margin-bottom:12px;">
      <strong>What to do now</strong>
      <div class="tiny" style="margin-top:8px;">${topRiskText}</div>
      <div class="tiny muted" style="margin-top:6px;">${nextStepCopy}</div>
      <div class="toolbar" style="margin-top:10px; gap:8px;">
        <button class="action" type="button" data-view="${nextActionView}">${nextActionLabel}</button>
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
      <div class="tiny muted" style="margin-top:8px;">Updated: ${fmtDate(payload.generated_at)}</div>
    </div>
    <div class="row-card">
      <strong>Workflow checklist</strong>
      <div class="history-list playbook-checklist" style="margin-top:10px;">
        ${workflows.map((item: any, index: number) => `
          <div class="history-item">
            <strong>${index + 1}. ${item.title}</strong><br/>
            <span class="tiny">${item.outcome}</span>
          </div>
        `).join('') || '<div class="history-item">No workflow items found.</div>'}
      </div>
    </div>
  `;
  renderProjectWorkflowPanel();
}

function renderProjectWorkflowPanel() {
  const maintainerMode = isMaintainerMode();
  const setupCard = document.getElementById('playbook-maintainer-setup') as HTMLElement | null;
  const workflowPanel = document.getElementById('playbook-core-workflow') as HTMLElement | null;
  if (setupCard) setupCard.style.display = maintainerMode ? '' : 'none';
  if (workflowPanel) workflowPanel.style.display = maintainerMode ? '' : 'none';
  if (!maintainerMode) {
    [
      ui.projectWorkflowFeedback,
      ui.projectWorkflowHealth,
      ui.projectWorkflowMonitor,
      ui.projectWorkflowRuns,
      ui.projectWorkflowReport,
    ].forEach((node) => {
      const rowCard = node.closest('.row-card') as HTMLElement | null;
      if (rowCard) rowCard.style.display = 'none';
    });
    return;
  }

  const projects = state.projectsCatalog || [];
  const selectedFromUi = String(ui.projectActiveSelect.value || '').trim();
  const selectedProjectId = selectedFromUi
    || state.activeProjectId
    || projects.find((item) => item.active && !item.is_archived)?.id
    || projects.find((item) => !item.is_archived)?.id
    || projects[0]?.id
    || '';
  const selectedProject = projects.find((item) => String(item.id) === String(selectedProjectId));
  const selectedIsArchived = Boolean(selectedProject?.is_archived);
  const endpoints = Array.isArray(state.status?.endpoints) ? state.status.endpoints : [];
  const trackedEndpoints = endpoints.length;
  const endpointsWithBaseline = endpoints.filter((item) => Boolean(item?.last_upload_at)).length;
  const schedulerJobs = Array.isArray(state.scheduler?.jobs) ? state.scheduler.jobs : [];
  const runnableWatchJobs = schedulerJobs.filter((job: any) => {
    const jobId = String(job?.job_id || '');
    if (!jobId || jobId.startsWith('jin:bundle:')) return false;
    const jobType = String(job?.job_type || '').toLowerCase();
    if (jobType && jobType !== 'watch') return false;
    const endpointPath = String(job?.endpoint_path || job?.path || '').trim();
    if (!endpointPath) return false;
    const skipReason = String(job?.skip_reason || '');
    return skipReason !== 'missing_default_params' && skipReason !== 'unsupported_schedule';
  });
  const hasRecentRuns = Array.isArray(state.projectRunHistory) && state.projectRunHistory.length > 0;
  const deleteName = String(ui.projectDeleteConfirm.value || '').trim();
  const expectedDeleteName = String(selectedProject?.name || '').trim();
  const deleteNameMatches = Boolean(expectedDeleteName) && deleteName === expectedDeleteName;
  if (!String(ui.projectRegisterName.value || '').trim()) {
    const defaultName = String(state.status?.project?.name || '').trim();
    if (defaultName) ui.projectRegisterName.value = defaultName;
  }
  ui.projectActiveSelect.innerHTML = projects.length
    ? projects.map((project) => `
      <option value="${project.id}" ${project.id === selectedProjectId ? 'selected' : ''}>
        ${project.name}${project.active ? ' (active)' : ''}${project.is_archived ? ' [archived]' : ''}
      </option>
    `).join('')
    : '<option value="">No project found</option>';
  const activeProjectId = String(state.activeProjectId || '');
  const canSwitchProject = Boolean(selectedProjectId) && selectedProjectId !== activeProjectId && !selectedIsArchived;
  ui.projectSelectButton.disabled = !canSwitchProject;
  ui.projectSelectButton.textContent = selectedIsArchived
    ? 'Archived (restore first)'
    : (canSwitchProject ? 'Switch to Selected Project' : 'Already Active');
  ui.projectArchiveButton.disabled = !selectedProjectId || selectedIsArchived;
  ui.projectRestoreButton.disabled = !selectedProjectId || !selectedIsArchived;
  ui.projectDeleteButton.disabled = !selectedProjectId || !selectedIsArchived || !deleteNameMatches;
  ui.projectDeleteConfirm.placeholder = expectedDeleteName
    ? `Type "${expectedDeleteName}" to delete`
    : 'Type selected project name exactly';
  const projectLocked = !selectedProjectId || selectedIsArchived;
  const noTrackedEndpoints = trackedEndpoints === 0;
  ui.projectPolicySaveButton.disabled = projectLocked || noTrackedEndpoints;
  ui.projectPolicyApplyButton.disabled = projectLocked || noTrackedEndpoints;
  ui.projectRunBundleButton.disabled = projectLocked || noTrackedEndpoints;
  ui.projectBaselinePromoteButton.disabled = projectLocked || noTrackedEndpoints;
  ui.projectHealthCheckButton.disabled = projectLocked;
  ui.projectMonitorRefreshButton.disabled = projectLocked;
  ui.projectReportDigestButton.disabled = projectLocked || noTrackedEndpoints || !hasRecentRuns;

  if (state.projectPolicyLoadedFor === selectedProjectId && state.projectMonitorPolicy) {
    const policy = state.projectMonitorPolicy || {};
    ui.projectPolicyCadence.value = String(policy.cadence_template || 'balanced');
    ui.projectPolicySchedule.value = String(policy.schedule || 'every 2h');
    ui.projectPolicyBaselineMode.value = String(policy.baseline_mode || 'fixed');
    ui.projectPolicyThreshold.value = policy.threshold == null ? '' : String(policy.threshold);
    ui.projectPolicyBundleEnabled.checked = Boolean(policy.bundle_enabled);
    ui.projectPolicyBundleSchedule.value = String(policy.bundle_schedule || 'daily 09:00');
    ui.projectPolicyBundleFormat.value = String(policy.bundle_report_format || 'markdown');
  }

  const readinessText = projectLocked
    ? (selectedIsArchived
      ? 'Selected project is archived. Restore it to continue.'
      : 'Create or select a project to begin.')
    : noTrackedEndpoints
      ? 'No APIs are tracked yet. Call your APIs once, then save setup and run checks.'
      : endpointsWithBaseline === 0
        ? `APIs are tracked (${fmt(trackedEndpoints)}), but no baseline is uploaded yet. Set Up APIs and upload baseline files.`
        : runnableWatchJobs.length === 0
          ? 'Setup is saved but no runnable watch jobs are configured yet. Click Save & Apply Setup.'
          : !hasRecentRuns
            ? 'Setup is ready. Run checks now to create the first monitoring run.'
            : `Core workflow is ready: ${fmt(trackedEndpoints)} API${trackedEndpoints === 1 ? '' : 's'} tracked, ${fmt(endpointsWithBaseline)} with baseline, ${fmt(runnableWatchJobs.length)} runnable watches.`;
  const message = state.projectWorkflowMessage || { text: readinessText, kind: 'info' as const };
  ui.projectWorkflowFeedback.textContent = message.text || '';
  ui.projectWorkflowFeedback.className = `feedback${message.kind === 'error' ? ' danger' : message.kind === 'success' ? ' success' : ' info'}`;

  const health = state.projectHealth;
  if (!health) {
    ui.projectWorkflowHealth.innerHTML = '';
  } else {
    const checks = health.checks || [];
    ui.projectWorkflowHealth.innerHTML = `
      <div class="row-card">
        <strong>Health Snapshot</strong>
        <div class="tiny" style="margin-top:6px;">
          Status: ${fmt(health.status || 'unknown')} • Generated: ${fmtDate(health.generated_at)}
        </div>
        <div class="history-list" style="margin-top:10px;">
          ${checks.map((item) => `
            <div class="history-item">
              <strong>${item.name}</strong> • ${item.status} • ${item.detail}
            </div>
          `).join('') || '<div class="history-item">No checks returned.</div>'}
        </div>
      </div>
    `;
  }

  const monitor = state.projectsMonitorSnapshot;
  if (!monitor) {
    ui.projectWorkflowMonitor.innerHTML = '';
  } else {
    const projectRows = monitor.projects || [];
    const summary = monitor.summary || {};
    const topRiskProject = summary.top_risk_project || null;
    const healthyProjects = summary.healthy_projects ?? projectRows.filter((item) => String(item.status || '').toLowerCase() === 'healthy').length;
    const degradedProjects = summary.degraded_projects ?? projectRows.filter((item) => String(item.status || '').toLowerCase() !== 'healthy').length;
    const projectsWithBaseline = summary.projects_with_baseline ?? projectRows.filter((item) => Number(item.baseline?.coverage_pct || 0) >= 70).length;
    const averageRisk = summary.average_risk_score ?? (
      projectRows.length
        ? projectRows.reduce((acc, item) => acc + Number(item.risk_score || 0), 0) / projectRows.length
        : 0
    );
    const decision = decisionLanguageForProjectHealth({
      endpoints: projectRows.length,
      anomalies: Number((topRiskProject as any)?.summary?.anomalies || 0),
      needsSetup: Number(projectRows.filter((item) => Number(item.baseline?.coverage_pct || 0) < 70).length),
      needsAttention: degradedProjects,
      topRiskScore: Number(topRiskProject?.risk_score || 0),
    });
    const monitorCards = [
      statCard('Projects', fmt(monitor.count || projectRows.length), 'Tracked across the portfolio'),
      statCard('Healthy', fmt(healthyProjects), 'Projects currently stable'),
      statCard('At risk', fmt(degradedProjects), 'Projects needing attention'),
      statCard('Avg risk', `${Math.round(Number(averageRisk || 0))}%`, 'Portfolio risk snapshot'),
    ].join('');
    const portfolioNextStep = topRiskProject
      ? (decision.label === 'Block release'
        ? 'Treat this portfolio as blocked until the highest-risk project is addressed.'
        : decision.label === 'Needs attention'
          ? 'Review the highest-risk project first, then compare it with the rest of the portfolio.'
          : 'The portfolio looks safe for now. Keep watching the highest-risk project and recheck weekly.')
      : 'Keep the portfolio view open while you review project health and baseline coverage.';
    ui.projectWorkflowMonitor.innerHTML = `
      <div class="row-card">
        <strong>Portfolio Health</strong>
        <div class="tiny" style="margin-top:6px;">
          Projects: ${fmt(monitor.count || projectRows.length)} • Baseline coverage: ${fmt(projectsWithBaseline)} • Generated: ${fmtDate(monitor.generated_at)}
        </div>
        <div class="metric-row" style="margin-top:12px;">
          ${monitorCards}
        </div>
        <div class="row-card ${decision.tone}" style="margin-top:12px;">
          <strong>${decision.label}</strong>
          <div class="tiny" style="margin-top:6px;">${escapeHtml(decision.detail)} ${escapeHtml(portfolioNextStep)}</div>
        </div>
        ${topRiskProject ? `
          <div class="sidebar-card" style="margin-top:12px;">
            <strong>Top Risk Project</strong>
            <div class="tiny" style="margin-top:6px;">${escapeHtml(String(topRiskProject.name || 'Unknown project'))} • ${decision.label} • risk ${Math.round(Number(topRiskProject.risk_score || 0))}%</div>
            <div class="tiny muted" style="margin-top:6px;">${escapeHtml(Array.isArray(topRiskProject.risk_reasons) ? topRiskProject.risk_reasons.join(' • ') : '')}</div>
            ${topRiskProject.id ? `<div class="toolbar compact" style="margin-top:10px;"><button class="action secondary tiny" type="button" onclick="focusPortfolioProject('${escapeHtml(String(topRiskProject.id))}')">Focus Project</button></div>` : ''}
          </div>
        ` : ''}
        <div class="history-list" style="margin-top:10px;">
          ${projectRows.slice(0, 6).map((item) => `
            <div class="history-item">
              <strong>${item.name}</strong> • ${item.status || 'unknown'} • ${String(item.risk_label || 'watch')} • risk ${Math.round(Number(item.risk_score || 0))}% • issues: ${fmt(item.summary?.anomalies || 0)} • APIs with targets: ${fmt(item.baseline?.endpoints_with_baseline || 0)}
              ${item.id ? `<div class="toolbar compact" style="margin-top:8px;"><button class="action ghost tiny" type="button" onclick="focusPortfolioProject('${escapeHtml(String(item.id))}')">Focus</button></div>` : ''}
            </div>
          `).join('') || '<div class="history-item">No project monitor snapshot returned.</div>'}
        </div>
      </div>
    `;
  }

  const runs = state.projectRunHistory || [];
  ui.projectWorkflowRuns.innerHTML = runs.length
    ? `
      <div class="row-card">
        <strong>Recent Check Runs</strong>
        <div class="history-list" style="margin-top:10px;">
          ${runs.slice(0, 6).map((run) => `
            <div class="history-item">
              <strong>${run.status || 'unknown'}</strong> • ${fmt(run.started_at)} • planned ${fmt(run.requested || 0)} • completed ${fmt(run.executed || 0)} • errors ${fmt(run.errors || 0)}
            </div>
          `).join('')}
        </div>
      </div>
    `
    : '';

  const digest = state.projectDigest;
  if (!digest) {
    ui.projectWorkflowReport.innerHTML = '';
  } else {
    const totals = digest.totals || {};
    ui.projectWorkflowReport.innerHTML = `
      <div class="row-card">
        <strong>Leadership Digest (${fmt(digest.window_days || 7)}d)</strong>
        <div class="tiny" style="margin-top:6px;">
          Runs: ${fmt(totals.runs || 0)} • Success: ${fmt(totals.success || 0)} • Degraded: ${fmt(totals.degraded || 0)} • Errors: ${fmt(totals.errors || 0)}
        </div>
        <div class="tiny" style="margin-top:6px;">
          Requested checks: ${fmt(totals.requested || 0)} • Executed checks: ${fmt(totals.executed || 0)}
        </div>
      </div>
    `;
  }
}

function renderIncidents() {
  const allRows = sortIncidents(allIncidentRows());
  const anomalies = incidentRows();
  const paged = paginate(anomalies, state.incidentPage, 10);
  state.incidentPage = paged.page;
  const incidentsMessage = state.incidentsMessage;
  ui.incidentsFeedback.textContent = incidentsMessage?.text || '';
  ui.incidentsFeedback.className = `feedback feedback-banner${incidentsMessage?.kind === 'error' ? ' danger' : incidentsMessage?.kind === 'success' ? ' success' : incidentsMessage ? ' info' : ''}`;
  const openIssues = allRows.filter((item) => String(item.status || 'active') !== 'resolved').length;
  const highPriority = allRows.filter((item) => (
    String(item.status || 'active') !== 'resolved'
    && ['critical', 'high'].includes(String(item.severity || '').toLowerCase())
  )).length;
  const firstOpenIssue = anomalies.find((item) => String(item.status || 'active') !== 'resolved')
    || allRows.find((item) => String(item.status || 'active') !== 'resolved')
    || null;
  const selectedCount = document.querySelectorAll('.bulk-incident:checked').length;
  const bulkActive = selectedCount > 0;
  ui.bulkPreview.textContent = bulkActive
    ? `${selectedCount} issue${selectedCount === 1 ? '' : 's'} selected.`
    : 'Select one or more issues to apply one action.';
  ui.bulkAction.style.display = bulkActive ? '' : 'none';
  ui.bulkNote.style.display = bulkActive ? '' : 'none';
  ui.bulkRun.style.display = bulkActive ? '' : 'none';
  ui.incidentFilters.innerHTML = `
        <div class="issues-toolbar-grid issues-toolbar-grid-compact issues-toolbar-inline">
          <label>
            Status
            <select id="incident-status-select">
              <option value="">All issues</option>
              <option value="active" ${state.incidentStatusFilter === 'active' ? 'selected' : ''}>Active</option>
              <option value="acknowledged" ${state.incidentStatusFilter === 'acknowledged' ? 'selected' : ''}>In review</option>
              <option value="snoozed" ${state.incidentStatusFilter === 'snoozed' ? 'selected' : ''}>Snoozed</option>
              <option value="suppressed" ${state.incidentStatusFilter === 'suppressed' ? 'selected' : ''}>Suppressed</option>
              <option value="resolved" ${state.incidentStatusFilter === 'resolved' ? 'selected' : ''}>Resolved</option>
            </select>
          </label>
          <label>
            Severity
            <select id="incident-severity-select">
              <option value="">All levels</option>
              <option value="critical" ${state.incidentSeverityFilter === 'critical' ? 'selected' : ''}>Critical</option>
              <option value="high" ${state.incidentSeverityFilter === 'high' ? 'selected' : ''}>High</option>
              <option value="medium" ${state.incidentSeverityFilter === 'medium' ? 'selected' : ''}>Medium</option>
              <option value="low" ${state.incidentSeverityFilter === 'low' ? 'selected' : ''}>Low</option>
            </select>
          </label>
        </div>
        <div class="tiny muted issues-filter-help">Use filters to narrow the queue before applying bulk actions.</div>
      `;
  const statusLabel = (value: string | null | undefined) => {
    const normalized = String(value || 'active').toLowerCase();
    if (normalized === 'acknowledged') return 'In review';
    if (normalized === 'snoozed') return 'Deferred';
    if (normalized === 'suppressed') return 'Muted';
    if (normalized === 'resolved') return 'Resolved';
    return 'Needs attention';
  };
  const severityLabel = (value: string | null | undefined) => {
    const normalized = String(value || 'medium').toLowerCase();
    if (normalized === 'critical' || normalized === 'high') return 'High';
    if (normalized === 'low') return 'Low';
    return 'Medium';
  };
  const statusPillClass = (value: string | null | undefined) => {
    const normalized = String(value || 'active').toLowerCase();
    if (normalized === 'resolved') return 'resolved';
    if (normalized === 'acknowledged') return 'acknowledged';
    return 'active';
  };
  const decisionPillClass = (item: any) => {
    const decisionTone = incidentDecisionTone(item);
    if (decisionTone === 'danger') return 'danger';
    if (decisionTone === 'warning') return 'warning';
    return 'healthy';
  };
  const confidenceLabel = (value: unknown) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return null;
    const pct = numeric <= 1 ? numeric * 100 : numeric;
    const clamped = Math.max(0, Math.min(100, pct));
    return `${Math.round(clamped)}% confidence`;
  };
  const trimCopy = (value: unknown, limit = 120) => {
    const text = String(value || '').trim();
    if (!text) return '';
    if (text.length <= limit) return text;
    return `${text.slice(0, limit - 1).trimEnd()}…`;
  };
  const issueExpectedActualLine = (item: any) => {
    const expectedRaw = Number(item?.baseline_used);
    const actualRaw = Number(item?.actual_value);
    const expected = Number.isFinite(expectedRaw) ? expectedRaw : null;
    const actual = Number.isFinite(actualRaw) ? actualRaw : null;
    if (expected == null || actual == null) {
      return `Expected ${fmt(item?.baseline_used)} -> Actual ${fmt(item?.actual_value)}`;
    }
    if (expected === 0) {
      return `Expected 0 -> Actual ${fmt(actual)} (baseline is zero)`;
    }
    const ratio = Math.abs(actual / expected);
    const ratioLabel = ratio >= 100 ? `${ratio.toFixed(0)}x` : `${ratio.toFixed(1)}x`;
    return `Expected ${fmt(expected)} -> Actual ${fmt(actual)} (${ratioLabel} baseline)`;
  };
  const hasActiveFilters = Boolean((state.incidentStatusFilter || '').trim() || (state.incidentSeverityFilter || '').trim());
  const activeFilterParts: string[] = [];
  if (state.incidentStatusFilter) activeFilterParts.push(`Status: ${statusLabel(state.incidentStatusFilter)}`);
  if (state.incidentSeverityFilter) activeFilterParts.push(`Priority: ${severityLabel(state.incidentSeverityFilter)}`);
  const activeFilterSummary = activeFilterParts.join(' • ');
  const queueStart = anomalies.length ? ((paged.page - 1) * 10) + 1 : 0;
  const queueEnd = anomalies.length ? (queueStart + paged.items.length - 1) : 0;
  const issuesKpiStrip = `
    <div class="issues-kpi-grid issues-kpi-grid-compact" style="margin-bottom:10px;">
      <div class="row-card issues-kpi-card">
        <span class="tiny">Open</span>
        <strong class="issues-kpi-value">${fmt(openIssues)}</strong>
      </div>
      <div class="row-card issues-kpi-card">
        <span class="tiny">High Priority</span>
        <strong class="issues-kpi-value">${fmt(highPriority)}</strong>
      </div>
      <div class="row-card issues-kpi-card">
        <span class="tiny">Visible</span>
        <strong class="issues-kpi-value">${fmt(anomalies.length)}</strong>
      </div>
    </div>
  `;
  const filterSummaryCard = hasActiveFilters
    ? `
      <div class="row-card issue-filter-summary" style="margin-bottom:10px;">
        <strong>Filtered view</strong>
        <div class="tiny" style="margin-top:6px;">
          Showing ${fmt(anomalies.length)} issue${anomalies.length === 1 ? '' : 's'} with ${escapeHtml(activeFilterSummary)}.
        </div>
        <div class="toolbar" style="margin-top:10px;">
          <button class="action secondary" type="button" onclick="clearIncidentFilters()">Clear filters</button>
        </div>
      </div>
    `
    : '';
  const businessSortActive = state.incidentSort === 'business';
  const issueQueueHint = hasActiveFilters
    ? `Showing ${fmt(queueStart)}-${fmt(queueEnd)} of ${fmt(anomalies.length)} after filters.`
    : `Showing ${fmt(queueStart)}-${fmt(queueEnd)} of ${fmt(anomalies.length)} in priority order.`;
  const topIssueCta = firstOpenIssue
    ? `<button class="action" type="button" onclick="showIncident(${firstOpenIssue.id})">Review Top Issue</button>`
    : '<button class="action" type="button" data-view="api">Set Up APIs</button>';
  const filterHidRows = anomalies.length === 0 && allRows.length > 0 && hasActiveFilters;
  ui.incidentsList.innerHTML = anomalies.length ? `
        ${filterSummaryCard}
        ${issuesKpiStrip}
        <div class="row-card issue-queue-summary" style="margin-bottom:10px;">
          <strong>Issue Review Queue</strong>
          <div class="tiny" style="margin-top:6px;">${issueQueueHint}</div>
          <div class="tiny muted issue-queue-note" style="margin-top:4px;">
            ${businessSortActive ? 'Business ranking is active.' : 'Priority ordering is active.'}
            Start with high-priority rows first.
          </div>
          <div class="toolbar" style="margin-top:10px;">
            ${topIssueCta}
            <button class="action secondary" type="button" data-view="errors">View Errors</button>
          </div>
        </div>
        <div class="issues-card-list" role="list" aria-label="Issue review queue">
          ${paged.items.map((item) => `
            <article class="issue-card issue-card-${String(item.severity || 'medium').toLowerCase()} issue-status-${String(item.status || 'active').toLowerCase()}" role="listitem" data-issue-id="${item.id}">
              <div class="issue-card-select">
                <input type="checkbox" class="bulk-incident" value="${item.id}" aria-label="Select issue ${item.id}" />
              </div>
              <div class="issue-card-body">
                <div class="issue-card-header">
                  <div class="issue-card-identity">
                    <div class="table-strong issue-card-endpoint">${fmt(item.endpoint_path)} <span class="chip issue-id-chip">Issue #${fmt(item.id)}</span></div>
                    <div class="tiny issue-card-grain">Grain: ${escapeHtml(trimCopy(friendlyGrainLabel(String(item.grain_key || '')), 96) || 'Global')}</div>
                    ${item.owner ? `<div class="tiny muted issue-card-owner">Owner: ${escapeHtml(item.owner)}</div>` : ''}
                  </div>
                  <div class="issue-card-priority">
                    <span class="status-pill ${inferSeverityClass(item)}">${severityLabel(item.severity)}</span>
                    <span class="status-pill ${statusPillClass(item.status)}">${statusLabel(item.status)}</span>
                    <span class="status-pill ${businessPriorityBand(item).toLowerCase()}">Priority ${businessPriorityBand(item)}</span>
                    <span class="status-pill ${decisionPillClass(item)}">${incidentDecisionLabel(item)}</span>
                    ${confidenceLabel(item.confidence) ? `<span class="tiny issue-card-confidence">${confidenceLabel(item.confidence)}</span>` : ''}
                  </div>
                </div>
                <div class="issue-card-change">
                  <div class="table-strong issue-card-metric">
                    ${escapeHtml(friendlyMetricLabel(String(item.kpi_field || 'metric')))}
                    <span class="issue-delta-chip">${formatPercentDeltaCompact(item.pct_change)}</span>
                  </div>
                  <div class="tiny issue-change-core">${escapeHtml(issueExpectedActualLine(item))}</div>
                </div>
                <div class="issue-card-meta">
                  <div class="issue-card-meta-item">
                    <span class="issue-card-meta-label">Detected</span>
                    <span class="issue-card-meta-value">${fmtDate(item.detected_at)}</span>
                  </div>
                  <div class="issue-card-meta-item">
                    <span class="issue-card-meta-label">Decision status</span>
                    <span class="tiny muted issue-card-meta-value">${incidentDecisionLabel(item)} • ${statusLabel(item.status)} • ${severityLabel(item.severity)} priority</span>
                  </div>
                </div>
                <details class="issue-priority-details issue-card-rank">
                  <summary>${incidentDecisionLabel(item)} - why this was flagged</summary>
                  <div class="tiny muted">${escapeHtml(trimCopy(incidentWhyThisMatters(item), 180))}</div>
                  <div class="tiny muted" style="margin-top:4px;">${escapeHtml(trimCopy(item.change_since_last_healthy_run || 'Compared with baseline.', 160))}</div>
          <div class="tiny muted" style="margin-top:4px;">Priority score ${Math.round(businessPriorityScore(item))} • ${businessPriorityBand(item)} priority • ${escapeHtml(businessPriorityBreakdown(item).join(' • '))}</div>
                </details>
                <div class="toolbar compact issue-card-actions">
                  <button class="action" type="button" onclick="showIncident(${item.id})">Open Details</button>
                  <details class="more-actions">
                    <summary aria-label="More actions for issue ${item.id}" title="More actions for issue ${item.id}">⋯</summary>
                    <div class="more-actions-menu">
                      <button class="action secondary" type="button" onclick="confirmIncident(${item.id}, 'acknowledged', 0)">Mark In Review</button>
                      <button class="action secondary" type="button" onclick="quickFixBaseline(${item.id})">Accept as Baseline</button>
                      <button class="action warn" type="button" onclick="confirmIncident(${item.id}, 'resolved', 0)">Resolve</button>
                      <button class="action ghost" type="button" onclick="openApi('${String(item.endpoint_path).replace(/'/g, "\\\\'")}')">Open API</button>
                    </div>
                  </details>
                </div>
              </div>
            </article>
          `).join('')}
        </div>
      ${renderPagination('incidents', paged.page, paged.totalPages)}
      ` : filterHidRows ? `
        <div class="empty empty-center issue-empty-state">
          <strong>No issues match these filters.</strong>
          <div class="tiny" style="margin-top:6px;">${activeFilterSummary ? `Active filters: ${escapeHtml(activeFilterSummary)}. ` : ''}Clear filters to see the full issue queue again.</div>
          <div class="toolbar" style="margin-top:12px; justify-content:center;">
            <button class="action secondary" type="button" onclick="clearIncidentFilters()">Clear filters</button>
          </div>
        </div>
      ` : `
        <div class="empty empty-center issue-empty-state">
          <strong>No issues right now.</strong>
          <div class="tiny" style="margin-top:6px;">
            Run checks regularly and return here when any drift needs attention.
            If you expected upload mismatches, review Issues from the upload analysis panel to refresh and reset filters.
          </div>
          <div class="toolbar" style="margin-top:12px; justify-content:center;">
            ${hasActiveFilters ? '<button class="action secondary" type="button" onclick="clearIncidentFilters()">Clear filters</button>' : ''}
            <button class="action" type="button" data-view="api">Set Up APIs</button>
          </div>
        </div>
      `;
}

function renderScheduler() {
  const jobs = state.scheduler?.jobs || [];

  const schedulerStatusMeta = (job: any) => {
    const status = String(job?.last_status || 'never').toLowerCase();
    const finishedAt = fmtDate(job?.last_finished_at);
    const hasFinishedAt = Boolean(job?.last_finished_at);

    if (job?.paused) {
      return {
        pillClass: 'suppressed',
        pillLabel: 'Paused',
        tooltip: 'Paused: checks are stopped until you click Resume.',
        lastLine: hasFinishedAt ? `Last run before pause - ${finishedAt}` : 'No completed runs yet.',
      };
    }

    if (status === 'success') {
      return {
        pillClass: 'resolved',
        pillLabel: 'Healthy',
        tooltip: 'Healthy: the latest run completed without errors.',
        lastLine: hasFinishedAt ? `Last successful run - ${finishedAt}` : 'Last successful run not recorded yet.',
      };
    }

    if (status === 'error') {
      return {
        pillClass: 'active',
        pillLabel: 'Failed',
        tooltip: 'Failed: the latest run hit an error. See the error message in this row.',
        lastLine: hasFinishedAt ? `Last failed run - ${finishedAt}` : 'A run failed, but no finish time is recorded.',
      };
    }

    if (status === 'backoff') {
      return {
        pillClass: 'acknowledged',
        pillLabel: 'Retrying',
        tooltip: 'Retrying: Jin is waiting before the next attempt after recent failures.',
        lastLine: hasFinishedAt ? `Last retry attempt - ${finishedAt}` : 'Retry mode is active.',
      };
    }

    if (status === 'skipped') {
      return {
        pillClass: 'acknowledged',
        pillLabel: 'Skipped',
        tooltip: 'Skipped: this run was intentionally not executed.',
        lastLine: hasFinishedAt ? `Last skipped run - ${finishedAt}` : 'Latest run was skipped.',
      };
    }

    return {
      pillClass: 'resolved',
      pillLabel: 'Not run yet',
      tooltip: 'Not run yet: this watch has not completed its first run.',
      lastLine: 'No completed runs yet.',
    };
  };

  ui.schedulerList.innerHTML = jobs.length ? `
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
              ${jobs.map((job) => {
                const statusMeta = schedulerStatusMeta(job);
                const modeLabel = job.backoff_active ? 'Backoff' : 'Normal';
                const modeTooltip = job.backoff_active
                  ? 'Backoff mode: next retry is delayed after failures.'
                  : 'Normal mode: runs follow the regular schedule.';
                return `
                <tr>
                  <td>
                    <div class="table-strong">${fmt(job.path || job.job_id || 'Watch job')}</div>
                    <div class="tiny" title="${escapeHtml(statusMeta.tooltip)}">${escapeHtml(statusMeta.lastLine)}</div>
                    <div class="tiny">${job.last_error || 'No errors.'}</div>
                  </td>
                  <td>
                    <span class="status-pill ${statusMeta.pillClass}" title="${escapeHtml(statusMeta.tooltip)}">${escapeHtml(statusMeta.pillLabel)}</span>
                  </td>
                  <td>${fmtDate(job.next_run_at)}</td>
                  <td>${fmtDate(job.next_retry_at)}</td>
                  <td><span title="${escapeHtml(modeTooltip)}">${modeLabel}</span></td>
                  <td>
                    <div class="toolbar compact issue-table-actions">
                      <button class="action secondary" type="button" onclick="confirmScheduler('${String(job.job_id).replace(/'/g, "\\\\'")}', '${job.paused ? 'resume' : 'pause'}')">${job.paused ? 'Resume' : 'Pause'}</button>
                      <button class="action" type="button" onclick="confirmScheduler('${String(job.job_id).replace(/'/g, "\\\\'")}', 'run')">Run Now</button>
                    </div>
                  </td>
                </tr>
              `;
              }).join('')}
            </tbody>
          </table>
        </div>
      ` : emptyState('No watches yet.');
}

function renderErrors() {
  const project = state.status?.project;
  const recentErrors = filteredErrors();
  ui.errorsList.innerHTML = recentErrors.length ? recentErrors.map((item: RecentError) => `
        <div class="row-card">
          <div style="display:flex; justify-content:space-between; gap:12px;">
            <div>
              <strong>${item.category ? item.category[0].toUpperCase() + item.category.slice(1) : errorCategory(item.source)} • ${item.source}</strong>
              <div class="muted">${item.message}</div>
            </div>
            <div style="display:flex; gap:8px; flex-wrap:wrap;">
              <span class="status-pill ${item.severity || errorSeverity(item.source)}">${item.severity || errorSeverity(item.source)}</span>
              <span class="status-pill ${errorStatus(item) === 'archived' ? 'resolved' : errorStatus(item) === 'acknowledged' ? 'acknowledged' : 'active'}">${errorStatus(item)}</span>
            </div>
          </div>
          <div class="tag-row">
            <span class="chip">${project?.name || 'project'}</span>
            <span class="chip">${item.endpoint_path || 'workspace-level'}</span>
            <span class="chip">${fmtDate(item.created_at)}</span>
          </div>
          <div class="tiny" style="margin-top:8px;">${item.hint || 'Check logs for more detail.'}</div>
          ${(item.remediation_steps || []).length ? `
            <div class="history-list" style="margin-top:12px;">
              ${(item.remediation_steps || []).map((step) => `<div class="history-item">${step}</div>`).join('')}
            </div>
          ` : ''}
          <div class="toolbar" style="margin-top:10px;">
            ${item.status === 'acknowledged'
      ? `<button class="action secondary" type="button" onclick="confirmError(${item.id}, 'reopened')">Reopen</button>`
      : item.status === 'archived'
        ? `<button class="action secondary" type="button" onclick="confirmError(${item.id}, 'reopened')">Restore</button>`
        : `<button class="action secondary" type="button" onclick="confirmError(${item.id}, 'acknowledged')">Acknowledge</button>`
    }
            ${item.status === 'archived'
      ? ''
      : `<button class="action ghost" type="button" onclick="confirmError(${item.id}, 'archived')">Archive</button>`
    }
            ${item.endpoint_path ? `<button class="action ghost" type="button" onclick="openApi('${String(item.endpoint_path).replace(/'/g, "\\\\'")}')">Open API</button>` : ''}
          </div>
          ${item.detail ? `<pre style="margin-top:10px;">${item.detail}</pre>` : ''}
        </div>
      `).join('') : emptyState('No errors right now.');
}

function fieldTypeCaption(annotation: string): string {
  if (!annotation) return '';
  const lower = annotation.toLowerCase();
  if (lower === 'str' || lower === 'string') return 'Text';
  if (lower === 'int' || lower === 'integer') return 'Whole number';
  if (lower === 'float' || lower === 'decimal') return 'Decimal number';
  if (lower === 'bool' || lower === 'boolean') return 'True / False';
  if (lower === 'datetime' || lower === 'date') return 'Date / time';
  return annotation;
}

function displayFieldName(fieldName: string): string {
  const raw = String(fieldName || '').replace(/\[\]/g, '');
  if (!raw) return '';
  if (raw.startsWith('data.')) return raw.slice(5);
  return raw;
}

function hasStrictTimeFieldCandidate(fields: FieldRole[] = []): boolean {
  return fields.some((field) => {
    const name = String((field as any)?.name || field || '').trim();
    if (!name) return false;
    const lower = name.toLowerCase();
    const annotation = String((field as any)?.annotation || (field as any)?.type || '').toLowerCase();
    if (annotation === 'datetime' || annotation === 'date') return true;
    return (
      lower.includes('time')
      || lower.includes('date')
      || lower.includes('timestamp')
      || lower.includes('created_at')
      || lower.includes('updated_at')
      || lower.includes('period')
    );
  });
}

export function renderFieldRoles(fields: FieldRole[] = [], config: Record<string, any>, metrics: any[] = [], detail: EndpointDetail | null = null) {
  const dims = new Set((config.dimension_fields || []) as string[]);
  const kpis = new Set((config.kpi_fields || []) as string[]);
  const timeField = config.time_field || null;
  const timeRequired = Boolean(timeField) || (config.time_required !== false && hasStrictTimeFieldCandidate(fields));
  const granularity = config.time_granularity || 'minute';
  const poMode = state.poMode !== false;
  const setupNotConfirmed = !Boolean(config.confirmed);
  const firstTimeSetup = dims.size === 0 && kpis.size === 0 && !timeField;
  const responseModelMissing = detail?.response_model_present === false;
  const modelAdvice = responseModelMissing ? null : modelSetupAdvice(fields || []);
  
  const metricMapByField = new Map<string, string>();
  if (metrics) {
    metrics.forEach(m => {
       if (m.calculation && m.calculation.field) {
         metricMapByField.set(m.calculation.field, m.name);
       }
    });
  }

  const activeDims: string[] = [...dims];
  const activeKpis: string[] = [...kpis];

  const legendHtml = `
    <div style="margin-bottom:20px; padding:12px; background:rgba(255,255,255,0.02); border-radius:10px; font-size:11px; color:var(--ink-soft); display:flex; gap:20px; border:1px solid var(--line); flex-wrap:wrap;">
      <div style="display:flex; align-items:center; gap:6px;"><div style="width:8px; height:8px; border-radius:2px; background:var(--purple-neon);"></div> <strong>Segments</strong>: How results are grouped (example: region, retailer)</div>
      <div style="display:flex; align-items:center; gap:6px;"><div style="width:8px; height:8px; border-radius:2px; background:var(--green-neon);"></div> <strong>Metrics</strong>: Numbers to monitor</div>
      <div style="display:flex; align-items:center; gap:6px;"><div style="width:8px; height:8px; border-radius:2px; background:var(--brand);"></div> <strong>Time</strong>: Transaction timestamp</div>
    </div>
  `;
  const responseModelHtml = responseModelMissing
    ? `
      <div class="feedback danger" style="margin-bottom:14px;">
        <strong>Pydantic response model required</strong>
        <div class="tiny" style="margin-top:6px;">Define <code>response_model</code> on this FastAPI route first. Jin uses the model to discover fields and time candidates before setup can be saved.</div>
      </div>
    `
    : '';
  const modelAutoSuggestReady = Boolean(modelAdvice?.ready);
  const modelHasAnyCandidates = Boolean(modelAdvice && modelAdvice.candidateCount > 0);
  const modelRoleHints = new Map<string, 'time' | 'dimension' | 'kpi'>();
  const addModelRoleHint = (value: unknown, role: 'time' | 'dimension' | 'kpi'): void => {
    const name = String(value || '').trim();
    if (!name || modelRoleHints.has(name)) return;
    modelRoleHints.set(name, role);
  };
  if (modelAdvice) {
    addModelRoleHint(modelAdvice.timeCandidates?.[0], 'time');
    addModelRoleHint(modelAdvice.segmentCandidates?.[0], 'dimension');
    addModelRoleHint(modelAdvice.metricCandidates?.[0], 'kpi');
  }
  const modelFirstHtml = responseModelMissing
    ? ''
    : modelAutoSuggestReady
    ? `
      <div class="feedback success" style="margin-bottom:14px;">
        <strong>Model first</strong>
        <div class="tiny" style="margin-top:6px;">Jin can pre-fill Segment, Metric, and Time from the Pydantic response model before any traffic arrives.</div>
      </div>
    `
    : `
      <div class="feedback warning" style="margin-bottom:14px;">
        <strong>${escapeHtml(modelAdvice?.summary || 'Response model needs clearer fields')}</strong>
        <div class="tiny" style="margin-top:6px;">${escapeHtml(modelAdvice?.detail || 'Add typed Segment, Metric, or Time candidates to make setup automatic.')}</div>
      </div>
    `;
  const firstTimeGuideHtml = responseModelMissing
    ? ''
    : firstTimeSetup
    ? `
      <div class="row-card" style="margin-bottom:14px;">
        <strong>Quick start</strong>
        <div class="tiny" style="margin-top:6px;">
          Pick at least one <strong>Segment</strong> and one <strong>Metric</strong>${timeRequired ? ', plus one <strong>Time</strong> field' : ''}.
          Advanced settings are optional for now.
        </div>
      </div>
    `
    : '';

  let driftHtml = '';
  if (state.driftSuggestions && Object.keys(state.driftSuggestions).length > 0) {
    driftHtml = `
      <div class="drift-alert" style="margin-bottom:20px; padding:16px; background:rgba(var(--brand-rgb), 0.1); border:1px solid var(--brand); border-radius:12px; animation: slideDown 0.3s ease;">
         <div style="display:flex; align-items:center; gap:12px;">
            <div style="font-size:24px;">🧬</div>
            <div style="flex:1;">
               <div style="font-weight:700; color:var(--ink);">Self-Healing Detected</div>
               <div class="tiny muted">It looks like some fields were renamed. Jin identified these by their data shape.</div>
            </div>
         </div>
         <div style="margin-top:12px; display:flex; flex-direction:column; gap:8px;">
            ${Object.entries(state.driftSuggestions).map(([newF, oldF]) => `
               <div style="display:flex; align-items:center; gap:10px; background:rgba(255,255,255,0.05); padding:8px 12px; border-radius:8px; border:1px solid var(--line);">
                  <strong style="color:var(--ink-soft);">${oldF}</strong>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  <strong style="color:var(--brand);">${newF}</strong>
                  <button class="btn btn-xs btn-primary" style="margin-left:auto;" onclick="approveDriftMerge('${newF}', '${oldF}')" ${poMode ? 'disabled title="Turn off PO Mode to merge manually."' : ''}>Approve & Merge</button>
               </div>
            `).join('')}
         </div>
      </div>
    `;
  }

  const selectedPath = String(state.selectedApi || '');
  const focusExpanded = Boolean(state.configFocusExpandedByApi?.[selectedPath]);
  const likelyBusinessField = (name: string, annotation: string, suggested: boolean): boolean => {
    if (suggested) return true;
    const lower = String(name || '').toLowerCase();
    const ann = String(annotation || '').toLowerCase();
    if (ann === 'date' || ann === 'datetime' || ann === 'int' || ann === 'float' || ann === 'decimal') return true;
    return (
      /(retailer|merchant|store|region|country|channel|category|segment|sku|product|item|label|group|period|date|time|timestamp|value|amount|revenue|sales|orders|units|count|qty|quantity|cost|rate|ratio|score)/.test(lower)
    );
  };

  type ConfigFieldEntry = {
    name: string;
    shownName: string;
    hasTechnicalPath: boolean;
    rawType: string;
    type: string;
    role: string;
    suggested: boolean;
    timeCandidate: boolean;
    likely: boolean;
  };

  const entries: ConfigFieldEntry[] = (fields || [])
    .map((field) => {
      const name = typeof field === 'string' ? field : String(field.name || '');
      if (!name) return null;
      const shownName = displayFieldName(name);
      const hasTechnicalPath = shownName !== name;
      const rawType = typeof field === 'string' ? '' : (field.annotation || field.type || '');
      const type = fieldTypeCaption(rawType);
      const timeCandidate = typeof field === 'string'
        ? false
        : Boolean(field.time_candidate || String(field.suggested_role || '').toLowerCase() === 'time');
      const modelRoleHint = modelRoleHints.get(name) || null;
      const role = (config.excluded_fields?.includes(name) ? 'exclude' : null)
        || (dims.has(name) ? 'dimension' : null)
        || (kpis.has(name) ? 'kpi' : null)
        || (name === timeField ? 'time' : null)
        || (timeCandidate ? 'time' : null)
        || modelRoleHint
        || 'ignore';
      const suggested = typeof field === 'string' ? false : Boolean(field.suggested);
      return {
        name,
        shownName,
        hasTechnicalPath,
        rawType,
        type,
        role,
        suggested,
        timeCandidate,
        likely: likelyBusinessField(name, rawType, suggested),
      };
    })
    .filter((entry): entry is ConfigFieldEntry => Boolean(entry));

  const focusEnabled = (firstTimeSetup || setupNotConfirmed) && entries.length > 8 && !focusExpanded;
  const focusedEntries = focusEnabled
    ? entries.filter((entry) => entry.role !== 'ignore' || entry.likely)
    : entries;
  const visibleEntries = focusedEntries.length ? focusedEntries : entries;
  const hiddenFieldCount = Math.max(0, entries.length - visibleEntries.length);
  const focusControlHtml = focusEnabled
    ? `
      <div class="row-card" style="margin-bottom:12px;">
        <strong>Focused view</strong>
        <div class="tiny" style="margin-top:6px;">
          Showing ${fmt(visibleEntries.length)} likely business fields first to reduce setup noise.
          ${hiddenFieldCount > 0 ? `${fmt(hiddenFieldCount)} technical/system fields are hidden for now.` : ''}
        </div>
        <div class="toolbar" style="margin-top:10px;">
          <button class="action secondary" type="button" onclick="toggleConfigFieldFocus(true)">Show all fields</button>
        </div>
      </div>
    `
    : (
      (firstTimeSetup || setupNotConfirmed) && entries.length > 8 && focusExpanded
        ? `
          <div class="tiny muted" style="margin-bottom:10px;">
            Showing all ${fmt(entries.length)} fields.
            <button class="action ghost" type="button" style="margin-left:8px;" onclick="toggleConfigFieldFocus(false)">Use focused view</button>
          </div>
        `
        : ''
    );

  const poModeHintHtml = poMode
    ? `
      <div class="tiny muted" style="margin-bottom:10px;">
        PO Mode keeps advanced sections simplified for first-time setup, but field-role and time setup controls remain editable.
      </div>
    `
    : '';
  const bestCandidateBadgesByField = new Map<string, { label: string; role: 'segment' | 'metric' | 'time' }[]>();
  const addBestCandidateBadge = (fieldName: string | undefined, label: string, role: 'segment' | 'metric' | 'time'): void => {
    const cleanName = String(fieldName || '').trim();
    if (!cleanName) return;
    const badges = bestCandidateBadgesByField.get(cleanName) || [];
    if (!badges.some((badge) => badge.role === role)) {
      badges.push({ label, role });
      bestCandidateBadgesByField.set(cleanName, badges);
    }
  };
  addBestCandidateBadge(modelAdvice?.segmentCandidates?.[0], 'Best Segment', 'segment');
  addBestCandidateBadge(modelAdvice?.metricCandidates?.[0], 'Best Metric', 'metric');
  addBestCandidateBadge(modelAdvice?.timeCandidates?.[0], 'Best Time', 'time');

  const gridHtml = visibleEntries.map((entry) => {
    const { name, shownName, hasTechnicalPath, type, role } = entry;
    const extractionRule = config.time_extraction_rule || 'single';
    const candidateBadges = bestCandidateBadgesByField.get(name) || [];
    const candidateClasses = candidateBadges.length
      ? ` best-candidate ${candidateBadges.map((badge) => `best-${badge.role}`).join(' ')}`
      : '';
    const previewText = role === 'time'
      ? String(state.timePreview || `Model-selected time field: ${shownName || name}`)
      : String(state.timePreview || 'No timeline preview yet');
    const previewPending = /no sample run yet|no recent sample yet|choose a time field|choose your business time field|no sample value found/i.test(previewText);

    return `
      <div class="field-role-card ${role === 'time' ? 'active-time' : (role === 'dimension' ? 'active-dimension' : (role === 'kpi' ? 'active-kpi' : (role === 'exclude' ? 'active-exclude' : '')))}${candidateClasses}" data-field-name="${name}">
        <div class="field-info">
          <div class="field-name">
            ${escapeHtml(shownName || name)}
            ${candidateBadges.map((badge) => `<span class="chip field-candidate-chip field-candidate-chip--${badge.role}">${badge.label}</span>`).join('')}
            ${metricMapByField.has(name) ? `<span class="chip" style="margin-left:8px; background:rgba(34, 197, 94, 0.1); color:var(--green-neon); border-color:var(--green-neon);">${metricMapByField.get(name)} Metric</span>` : ''}
          </div>
          ${hasTechnicalPath ? `<div class="tiny muted" style="margin-top:3px;">${escapeHtml(name)}</div>` : ''}
          <div class="field-caption">${type || 'data field'}</div>
        </div>
        <div class="field-role-selector">
          <button class="role-btn ${role === 'ignore' ? 'active' : ''}" data-role="ignore" onclick="updateFieldRole('${name}', 'ignore')" title="Do not track this field.">
            Ignore
          </button>
          <button class="role-btn ${role === 'time' ? 'active' : ''}" data-role="time" onclick="updateFieldRole('${name}', 'time')" title="The timestamp of the transaction.">
            Time
          </button>
          <button class="role-btn ${role === 'dimension' ? 'active' : ''}" data-role="dimension" onclick="updateFieldRole('${name}', 'dimension')" title="Group results (e.g. by Region or Product).">
            Segment
          </button>
          <button class="role-btn ${role === 'kpi' ? 'active' : ''}" data-role="kpi" onclick="updateFieldRole('${name}', 'kpi')" title="The value to monitor for anomalies.">
            Metric
          </button>
          <button class="role-btn ${role === 'exclude' ? 'active' : ''}" data-role="exclude" onclick="updateFieldRole('${name}', 'exclude')" title="Comparison or secondary data. Ignore for monitoring.">
            Exclude
          </button>
        </div>
        ${role === 'time' ? `
          <div class="time-extraction-container">
             <div class="time-verify-preview ${previewText && !previewPending ? 'verified' : ''}" style="margin-top:0;">
                <span>Chronology Pulse:</span>
                <strong id="time-preview-val">${escapeHtml(previewText)}</strong>
                <a href="#" class="tweak-link" onclick="toggleTimeSettings('${name}', event)" style="margin-left:auto; font-size:11px; color:var(--brand); text-decoration:none;">${state.showTimeSettings?.[name] ? 'Hide settings' : 'Tweak settings'}</a>
             </div>
             ${previewPending ? '<div class="tiny muted" style="margin-top:6px;">Setup is not blocked. Save config now and run one check to unlock timeline preview.</div>' : ''}

             ${state.detectedTimeSources && state.detectedTimeSources.length > 1 && !config?.time_pin ? `
                <div class="source-picker" style="margin-top:8px; padding:10px; background:rgba(255,165,0,0.05); border:1px dashed orange; border-radius:8px;">
                   <div class="tiny" style="color:orange; font-weight:700; margin-bottom:6px;">Multiple Time Fields Found:</div>
                   <div style="display:flex; flex-wrap:wrap; gap:6px;">
                      ${state.detectedTimeSources.map(src => `
                         <button class="btn btn-xs ${name === src ? 'btn-primary' : 'btn-outline'}" onclick="selectTimeSource('${src}')" style="font-size:10px; border-radius:12px;">
                            ${escapeHtml(displayFieldName(src))}
                         </button>
                      `).join('')}
                   </div>
                   <div class="tiny muted" style="margin-top:6px;">Jin detected these as potential base clocks. Which one drives your business?</div>
                </div>
             ` : ''}

             <div class="grain-detection-status" style="margin-top:12px; padding:10px 12px; background:rgba(var(--brand-rgb), 0.05); border-radius:8px; border:1px solid rgba(var(--brand-rgb), 0.1); display:flex; align-items:center; gap:10px;">
                <div class="tiny-badge" style="background:${config?.time_pin ? 'var(--green-neon)' : 'var(--brand)'}; display:flex; align-items:center; gap:4px;">
                   ${config?.time_pin ? `
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M16 9V4l1 1V2H7v2l1-1v5c0 2.18-1.28 4.02-3.13 4.87l-.87.4V15h7v7l1 1 1-1v-7h7v-1.73l-.87-.4C17.28 13.02 16 11.18 16 9z"/></svg>
                   ` : `
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                   `}
                   ${state.detectedGrain || granularity}
                </div>
                <div style="font-size:11px; color:var(--ink-soft); line-height:1.2;">
                   <strong>Pulse Engine:</strong> ${state.grainReason || 'Run one check to infer monitoring frequency.'}
                </div>
                
                <button class="tweak-link" onclick="pinGrain()" style="margin-left:auto; border:none; background:none; cursor:pointer;" title="${config?.time_pin ? 'Unlock (Enable Learning)' : 'Pin Frequency (Lock current grain)'}">
                   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${config?.time_pin ? 'var(--green-neon)' : 'currentColor'}" stroke-width="2"><path d="${config?.time_pin ? 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' : 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z'}"/></svg>
                </button>
             </div>

             ${state.showTimeSettings?.[name] ? `
               <div class="time-settings-tweak" style="margin-top:16px; padding:12px; background:rgba(255,255,255,0.02); border-radius:8px; border:1px solid var(--line); animation: fadeIn 0.2s ease;">
                  <div style="display:grid; grid-template-columns: 1fr 1fr; gap:16px;">
                     <div>
                        <div class="tiny muted" style="margin-bottom:6px; font-weight:600; color:var(--ink);">Data Frequency:</div>
                        <select class="control" onchange="updateGranularity(this.value)" style="width:100%; height:32px; padding:0 8px; font-size:12px;">
                           <option value="minute" ${granularity === 'minute' ? 'selected' : ''}>Every minute</option>
                           <option value="hour" ${granularity === 'hour' ? 'selected' : ''}>Hourly</option>
                           <option value="day" ${granularity === 'day' ? 'selected' : ''}>Daily</option>
                           <option value="week" ${granularity === 'week' ? 'selected' : ''}>Weekly</option>
                           <option value="month" ${granularity === 'month' ? 'selected' : ''}>Monthly</option>
                        </select>
                     </div>
                     <div>
                        <div class="tiny muted" style="margin-bottom:6px; font-weight:600; color:var(--ink);">Date Pick-up:</div>
                        <select class="control" onchange="updateExtractionRule(this.value)" style="width:100%; height:32px; padding:0 8px; font-size:12px;">
                           <option value="single" ${extractionRule === 'single' ? 'selected' : ''}>Single date in row</option>
                           <option value="first" ${extractionRule === 'first' ? 'selected' : ''}>First date from array</option>
                           <option value="last" ${extractionRule === 'last' ? 'selected' : ''}>Last date from array</option>
                           <option value="range" ${extractionRule === 'range' ? 'selected' : ''}>Two dates (Range)</option>
                        </select>
                     </div>
                  </div>
               </div>
             ` : ''}
          </div>
        ` : ''}
      </div>
    `;
  }).join('');

  const lockHint = state.status?.project?.license_enforced !== false && state.status?.project?.is_unlicensed ? `
    <div class="feedback info" style="margin-top:12px;">
      License is not activated for this project yet, but setup stays editable in this build.
      Activate Business later only if you want multi-project enforcement.
      </div>
    ` : '';
  ui.fieldRoleGrid.innerHTML = `
    <div style="position:relative">
      ${responseModelHtml}
      ${modelFirstHtml}
      ${firstTimeGuideHtml}
      ${poModeHintHtml}
      ${focusControlHtml}
      ${legendHtml}
      ${gridHtml}
      ${lockHint}
    </div>
  `;

  // Add the Business Story summary
  const dimText = activeDims.length 
    ? `for every unique <strong>${activeDims.join(', ')}</strong>` 
    : 'across your entire dataset';
  
  const kpiText = activeKpis.length 
    ? `monitor <strong>${activeKpis.join(' and ')}</strong>` 
    : 'track any numbers yet';

  const storyContainer = document.getElementById('config-step-3-container');
  if (storyContainer) {
    const hasRoles = activeKpis.length > 0 || activeDims.length > 0 || timeField;
    const selectedPath = String(state.selectedApi || '');
    const summaryMap = state.autoSuggestSummaryByApi || {};
    const suggestSummary = selectedPath ? summaryMap[selectedPath] : null;
    const hasRecentSamples = hasSetupSamples(state.activeApiDetail);
    const responseModelMissing = detail.response_model_present === false;
    const modelAdvice = responseModelMissing ? null : modelSetupAdvice(detail.fields || detail.schema_contract?.fields || []);
    const modelAutoSuggestReady = Boolean(modelAdvice?.ready);
    const modelHasAnyCandidates = Boolean(modelAdvice && modelAdvice.candidateCount > 0);
    const suggestCopy = responseModelMissing
      ? 'Define a Pydantic response model first. Jin needs it to discover fields and time candidates before setup can be saved.'
      : suggestSummary
      ? `${suggestSummary.headline} ${suggestSummary.details}`
      : (modelAutoSuggestReady
        ? 'Jin can pre-fill Segment, Metric, and Time from the Pydantic response model even before traffic arrives.'
        : (hasRecentSamples
          ? `Use auto-suggest to pre-fill setup from recent API traffic or Pydantic examples. ${modelAdvice?.detail || ''}`
          : `${modelAdvice?.summary || 'The response model is present, but Jin needs clearer typed fields or examples to pre-fill setup.'} ${modelAdvice?.detail || ''}`.trim()));
    storyContainer.innerHTML = `
      <div class="config-story-card ${hasRoles ? 'active' : ''}" style="margin-top:24px; border-top:1px solid var(--line); padding-top:24px;">
        <div class="story-header" style="display:flex; align-items:center; gap:12px; margin-bottom:12px;">
          <div class="config-step-badge">3</div>
          <h4 style="margin:0;">Confirm your monitoring plan</h4>
        </div>
        <div class="config-story-text" style="font-size:15px; line-height:1.5;">
          Jin will ${kpiText} ${dimText}${timeField ? ` using <strong>${timeField}</strong> as the clock.` : '.'}
        </div>
        <div class="tiny muted" style="margin-top:12px;">
          ${(activeKpis.length && activeDims.length) 
            ? 'This is a great setup! You\'ll see trends broken down by detailed segments.' 
            : 'Tip: Select at least one group and one measurable number for the best results.'}
        </div>
        <div class="toolbar" style="margin-top:20px; justify-content:center;">
          <button class="action" id="save-config-story-button" type="button" onclick="saveConfig()" ${responseModelMissing ? 'disabled title="Define response_model first."' : ''}>
            ${responseModelMissing ? 'Define response_model first' : 'Save configuration and continue to baselines'}
          </button>
        </div>
          <div class="row-card" style="margin-top:14px; text-align:left;">
            <strong>Need help picking fields?</strong>
            <div class="tiny muted" id="auto-suggest-summary" style="margin-top:8px;">
              ${escapeHtml(suggestCopy)}
            </div>
            <div class="toolbar" style="margin-top:10px;">
            <button class="action secondary" id="auto-suggest-button" type="button" onclick="runMagicGuess(true)" ${(!responseModelMissing && (hasRecentSamples || modelHasAnyCandidates)) ? '' : 'disabled'}>
              ${hasRoles ? 'Re-run auto-suggest' : 'Auto-suggest setup'}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // Sync simple tolerance (primary path)
  const simpleTolerance = config.tolerance_normal ?? config.tolerance_pct ?? 10;
  ui.configToleranceSimple.value = String(simpleTolerance);
  // Keep advanced inputs in sync
  ui.configActiveTolerance.value = config.active_tolerance || 'normal';
  ui.configRelaxed.value = String(config.tolerance_relaxed ?? 20);
  ui.configNormal.value = String(config.tolerance_normal ?? config.tolerance_pct ?? 10);
  ui.configStrict.value = String(config.tolerance_strict ?? 5);
}

function renderApiDetail(detail: EndpointDetail) {
  const apiView = document.getElementById('view-api');
  if (apiView) {
    apiView.classList.remove('api-browser-only');
    apiView.classList.add('api-browser-detail-open');
  }
  ui.apiEmpty.style.display = 'none';
  ui.apiWorkspace.style.display = 'grid';
  ui.apiWorkspace.classList.remove('api-workspace-entering');
  void ui.apiWorkspace.offsetWidth;
  ui.apiWorkspace.classList.add('api-workspace-entering');
  ui.apiTitle.textContent = detail.endpoint_path;
  ui.apiSubtitle.textContent = 'Review health, baselines, checks, and issues.';
  ui.apiMethod.textContent = detail.http_method || 'GET';
  ui.apiPath.textContent = detail.endpoint_path;
  const templateBase = `/jin/template/${slug(detail.endpoint_path)}`;
  ui.templateCsvLink.href = `${templateBase}.csv`;
  ui.templateXlsxLink.href = `${templateBase}.xlsx`;
  ui.templateCsvLinkUpload.href = `${templateBase}.csv`;
  ui.templateXlsxLinkUpload.href = `${templateBase}.xlsx`;
  ui.poModeToggle.checked = state.poMode !== false;
  const advancedSection = document.getElementById('advanced-section') as HTMLDetailsElement | null;
  if (advancedSection) {
    if (state.poMode !== false) {
      advancedSection.open = false;
      advancedSection.style.display = 'none';
    } else {
      advancedSection.style.display = '';
    }
  }

  const meta = detail.operator_metadata || {};
  const monitoringRuns = [...(detail.monitoring_runs || [])]
    .sort((a, b) => String(b?.started_at || '').localeCompare(String(a?.started_at || '')));
  const hasValues = (detail.current_kpis || []).length > 0;
  const hasTrends = (detail.trend_summary || []).length > 0 || (detail.recent_history || []).length > 0;
  const hasIssues = (detail.anomaly_history || []).length > 0;
  const hasUploads = (detail.upload_activity || []).length > 0;
  const hasRuns = monitoringRuns.length > 0 || (detail.recent_history || []).length > 0;
  const openIssueCount = (detail.anomaly_history || [])
    .filter((item: any) => String(item?.status || 'active') !== 'resolved')
    .length;
  const selectedUploadAnalysisAt = String((state as any).selectedUploadAnalysisAt || '');
  const uploadAnalysisHistoryRows = detail.upload_analysis_history || [];
  const selectedUploadAnalysis = selectedUploadAnalysisAt
    ? uploadAnalysisHistoryRows.find((item) => String(item?.analyzed_at || '') === selectedUploadAnalysisAt) || null
    : null;
  const uploadAnalysis = selectedUploadAnalysis || detail.last_upload_analysis || null;
  const hasReferenceRows = (detail.references || []).length > 0;

  // Setup Wizard for new/unconfigured endpoints
  const isConfirmed = detail.operator_metadata?.confirmed;
  const hasHistory = monitoringRuns.length > 0 || (detail.recent_history || []).length > 0;
  const hasRefs = (detail.upload_activity || []).length > 0;
  
  let activeStep = 1;
  if (isConfirmed && !hasRefs) activeStep = 2;
  if (isConfirmed && hasRefs) activeStep = 3;

  let wizardEl = ui.apiWorkspace.querySelector('.setup-wizard');
  if (!wizardEl) {
    wizardEl = document.createElement('div');
    wizardEl.className = 'setup-wizard';
    ui.apiWorkspace.prepend(wizardEl);
  }
  wizardEl.innerHTML = `
      <div class="wizard-step ${activeStep === 1 ? 'active' : ''}" data-api-tab="configuration" data-wizard-step="configuration" onclick="switchApiTab('configuration')">
        <div class="wizard-step-icon">1</div>
        <div class="wizard-step-label">Identify segments & metrics</div>
      </div>
      <div class="wizard-step-connector"></div>
      <div class="wizard-step ${activeStep === 2 ? 'active' : ''}" data-api-tab="uploads" data-wizard-step="uploads" onclick="switchApiTab('uploads')">
        <div class="wizard-step-icon">2</div>
        <div class="wizard-step-label">Set baselines</div>
      </div>
      <div class="wizard-step-connector"></div>
      <div class="wizard-step ${activeStep === 3 ? 'active' : ''}" data-api-tab="history" data-wizard-step="history" onclick="switchApiTab('history')">
        <div class="wizard-step-icon">3</div>
        <div class="wizard-step-label">Monitor</div>
      </div>
  `;

  // Existing meta cards...
  const selectedStatus = (state.status?.endpoints || []).find((item) => item.endpoint_path === detail.endpoint_path);
  const responseModelMissing = detail.response_model_present === false;
  const setupMeta = responseModelMissing
    ? {
        label: 'Define response model',
        tone: 'danger',
        hint: 'Add response_model on this FastAPI route first. Jin uses it to discover fields and time candidates.',
      }
    : setupHealthMeta({
        endpoint_path: detail.endpoint_path,
        http_method: detail.http_method || 'GET',
        status: selectedStatus?.status || 'warning',
        dimension_fields: selectedStatus?.dimension_fields || (detail.config?.dimension_fields || []),
        kpi_fields: selectedStatus?.kpi_fields || (detail.config?.kpi_fields || []),
        time_field: selectedStatus?.time_field || detail.config?.time_field || null,
        time_required: selectedStatus?.time_required ?? detail.config?.time_required,
        confirmed: detail.operator_metadata?.confirmed ?? selectedStatus?.confirmed ?? false,
        last_upload_at: meta.last_upload_at || selectedStatus?.last_upload_at || null,
      });
  ui.apiMetaGrid.innerHTML = [
    ['Status', `
      <strong>${escapeHtml((state.status?.endpoints || []).find((item) => item.endpoint_path === detail.endpoint_path)?.status || 'healthy')}</strong>
      <div class="tiny muted" style="margin-top:4px;">Last check ${fmtDate(meta.last_observed_at)}</div>
    `],
    ['Setup', `
      <strong>${escapeHtml(setupMeta.label)}</strong>
      <div class="tiny muted" style="margin-top:4px;">${escapeHtml(setupMeta.hint)}</div>
    `],
    ['Activity', `
      <strong>${fmt(meta.observation_count)} checks</strong>
      <div class="tiny muted" style="margin-top:4px;">Last upload ${fmtDate(meta.last_upload_at)}</div>
    `],
    ['Issues', openIssueCount > 0
      ? `<span class="status-pill warning">${fmt(openIssueCount)} open</span><div class="tiny muted" style="margin-top:4px;">Review Issues</div>`
      : '<span class="status-pill healthy">Safe for now</span><div class="tiny muted" style="margin-top:4px;">No open issues</div>'],
  ].map(([label, value]) => `
        <div class="meta-card meta-card-compact">
          <strong>${label}</strong>
          <span>${value}</span>
        </div>
      `).join('');

  const coreInsight = (state.coreInsightsByApi || {})[detail.endpoint_path];
  if (coreInsight) {
    const kindClass = coreInsight.kind === 'error'
      ? 'danger'
      : coreInsight.kind === 'success'
        ? 'success'
        : 'info';
    let actionHtml = '';
    if (coreInsight.actionType === 'tab' && coreInsight.actionValue) {
      actionHtml = `<button class="action" type="button" onclick="switchApiTab('${escapeHtml(coreInsight.actionValue)}')">${escapeHtml(coreInsight.actionLabel || 'Open next step')}</button>`;
    } else if (coreInsight.actionType === 'view' && coreInsight.actionValue) {
      actionHtml = `<button class="action" type="button" data-view="${escapeHtml(coreInsight.actionValue)}">${escapeHtml(coreInsight.actionLabel || 'Open next step')}</button>`;
    }
    ui.apiCoreInsight.style.display = 'block';
    ui.apiCoreInsight.innerHTML = `
      <div class="feedback ${kindClass}">
        <strong>${escapeHtml(coreInsight.title || 'Insight')}</strong>
        <div class="tiny" style="margin-top:6px;">${escapeHtml(coreInsight.summary || '')}</div>
        ${actionHtml ? `<div class="toolbar" style="margin-top:10px;">${actionHtml}</div>` : ''}
      </div>
    `;
  } else {
    ui.apiCoreInsight.style.display = 'none';
    ui.apiCoreInsight.innerHTML = '';
  }

  const kpis = detail.current_kpis || [];
  ui.apiKpis.innerHTML = kpis.length ? kpis.map((item) => `
        <div class="kpi-card">
          <strong>${friendlyMetricLabel(item.kpi_field)}</strong>
          <span>${fmt(item.actual_value)}</span>
          <div class="delta">${item.expected_value == null ? 'No baseline yet. Upload a reference to compare.' : `Baseline ${fmt(item.expected_value)}${item.pct_change == null ? '' : ` • ${fmt(item.pct_change)}% vs baseline`}`}</div>
        </div>
      `).join('') : `
        <div class="empty empty-starter">
          ${hasTrends
            ? (hasReferenceRows
              ? 'Recent API values are available below. Expand Monitor runs to see segment-level comparisons.'
              : 'Recent API values are available below, but no baseline is linked yet. Upload a reference file to enable pass/fail checks.')
            : 'No values yet. Upload a reference file and run a check to get started.'}
        </div>
      `;

  const trends = detail.trend_summary || [];
  const recentHistory = detail.recent_history || [];
  ui.apiTrends.innerHTML = trends.length ? trends.map((item) => {
    const series = recentHistory
      .map((row) => row?.kpi_json?.[item.kpi_field])
      .filter((value) => typeof value === 'number');
    const average = series.length ? (series.reduce((sum, value) => sum + value, 0) / series.length) : null;
    return `
          <div class="trend-card">
            <strong>${friendlyMetricLabel(item.kpi_field)}</strong>
            <span>${fmt(item.latest)}</span>
            <div class="tiny">Typical range: ${fmt(item.min)} to ${fmt(item.max)} across ${item.samples} run(s).</div>
            <div class="tiny" style="margin-top:6px;">Average: ${fmt(average)} • Change vs first visible run: ${fmt(item.delta_pct)}%.</div>
            ${sparklineSvg(series)}
          </div>
        `;
  }).join('') : emptyState('No trends yet.');

  ui.apiTrends.innerHTML += `
        <div class="chart-card">
          <strong>Checks Trend</strong>
          <div class="chart-value">${recentHistory.length} recent runs</div>
          <div class="tiny">How values are moving over time.</div>
          ${kpiTrendChartSvg(detail) || '<div class="empty" style="margin-top:10px;">No history yet.</div>'}
        </div>
        <div class="chart-card">
          <strong>Uploads</strong>
          <div class="chart-value">${(detail.upload_activity || []).length} reference events</div>
          <div class="tiny">Latest upload: ${fmtDate((detail.upload_activity || [])[0]?.uploaded_at)}</div>
          <div class="tiny" style="margin-top:8px;">Use the Uploads tab to add or replace baseline files.</div>
          <div class="toolbar" style="margin-top:10px;">
            <button class="action secondary tiny" type="button" onclick="openUploadsTab()">Open Uploads</button>
          </div>
        </div>
      `;

  const starter = document.getElementById('api-start-panel');
  if (starter) {
    const setupDone = Boolean(isConfirmed);
    const baselineDone = setupDone && Boolean(hasRefs);
    const monitorDone = baselineDone && Boolean(hasRuns);
    const reviewDone = monitorDone && openIssueCount === 0;
    const showStarter = state.currentApiTab === 'summary';
    starter.style.display = showStarter ? 'block' : 'none';
    const stepBadge = (done: boolean, active: boolean): string => (
      done
        ? '<span class="status-pill healthy">Done</span>'
        : (active ? '<span class="status-pill warning">Now</span>' : '<span class="status-pill acknowledged">Next</span>')
    );
    const nextAction = !setupDone
      ? {
          title: 'Step 1: Identify segments & metrics',
          copy: 'Define which fields are segments and which are monitored metrics.',
          cta: 'Open Configure',
          action: "switchApiTab('configuration')",
        }
      : !baselineDone
        ? {
            title: 'Step 2: Set baselines',
            copy: 'Upload a reference file so checks have a clear target.',
            cta: 'Open Uploads',
            action: "switchApiTab('uploads')",
          }
        : !monitorDone
          ? {
              title: 'Step 3: Monitor',
              copy: 'Run checks and see pass/fail status for each segment.',
              cta: 'Open Monitor',
              action: "switchApiTab('history')",
            }
          : openIssueCount > 0
            ? {
                title: 'Step 4: Review issues',
                copy: 'Some checks are outside target. Review and resolve what changed.',
              cta: 'Review Issues',
                action: "setView('incidents')",
              }
            : {
                title: 'Step 5: Generate report',
                copy: 'Monitoring is stable. Generate a leadership-ready update.',
                cta: 'Open Reports',
                action: "setView('reports')",
              };
    starter.innerHTML = `
          <div class="panel-head">
            <div>
              <h3>What to do next</h3>
              <p>Follow this exact flow for <strong>${detail.endpoint_path}</strong>.</p>
            </div>
          </div>
          <div class="starter-next-action">
            <div>
              <strong>${nextAction.title}</strong>
              <p>${nextAction.copy}</p>
            </div>
            <button class="action" type="button" onclick="${nextAction.action}">${nextAction.cta}</button>
          </div>
          <div class="starter-grid">
            <div class="starter-step ${!setupDone ? 'active-step' : ''}">
              <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:8px;">
                <div style="display:flex; align-items:center; gap:8px;">
                  <div class="wizard-step-icon" style="width:20px; height:20px; font-size:10px;">1</div>
                  <strong>Identify segments & metrics</strong>
                </div>
                ${stepBadge(setupDone, !setupDone)}
              </div>
              <p>Configure fields once so Jin understands your business shape.</p>
              <button class="action secondary tiny" style="margin-top:10px;" onclick="switchApiTab('configuration')">Open Configure</button>
            </div>
            <div class="starter-step ${setupDone && !baselineDone ? 'active-step' : ''}">
              <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:8px;">
                <div style="display:flex; align-items:center; gap:8px;">
                  <div class="wizard-step-icon" style="width:20px; height:20px; font-size:10px;">2</div>
                  <strong>Set baselines</strong>
                </div>
                ${stepBadge(baselineDone, setupDone && !baselineDone)}
              </div>
              <p>Upload CSV/XLSX so each segment has expected target values.</p>
              <button class="action secondary tiny" style="margin-top:10px;" onclick="switchApiTab('uploads')">Open Uploads</button>
            </div>
            <div class="starter-step ${baselineDone && !monitorDone ? 'active-step' : ''}">
              <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:8px;">
                <div style="display:flex; align-items:center; gap:8px;">
                  <div class="wizard-step-icon" style="width:20px; height:20px; font-size:10px;">3</div>
                  <strong>Monitor checks</strong>
                </div>
                ${stepBadge(monitorDone, baselineDone && !monitorDone)}
              </div>
              <p>Open Monitor to run checks and view segment-level outcomes.</p>
              <button class="action secondary tiny" style="margin-top:10px;" onclick="switchApiTab('history')">Open Monitor</button>
            </div>
            <div class="starter-step ${monitorDone && openIssueCount > 0 ? 'active-step' : ''}">
              <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:8px;">
                <div style="display:flex; align-items:center; gap:8px;">
                  <div class="wizard-step-icon" style="width:20px; height:20px; font-size:10px;">4</div>
                  <strong>Review issues</strong>
                </div>
                ${stepBadge(monitorDone && openIssueCount === 0, monitorDone && openIssueCount > 0)}
              </div>
              <p>Review anomalies and decide expected baseline vs real incident.</p>
              <button class="action secondary tiny" style="margin-top:10px;" onclick="setView('incidents')">Review Issues</button>
            </div>
            <div class="starter-step ${reviewDone ? 'active-step' : ''}">
              <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:8px;">
                <div style="display:flex; align-items:center; gap:8px;">
                  <div class="wizard-step-icon" style="width:20px; height:20px; font-size:10px;">5</div>
                  <strong>Generate report</strong>
                </div>
                ${stepBadge(reviewDone, reviewDone)}
              </div>
              <p>Create a PO-ready report with health, drift, and next actions.</p>
              <button class="action secondary tiny" style="margin-top:10px;" onclick="setView('reports')">Open Reports</button>
            </div>
          </div>
        `;
  }

  // Handling wizard navigation footers
  const currentTab = state.currentApiTab;
  if (ui.configFooter) ui.configFooter.style.display = (currentTab === 'configuration' && isConfirmed) ? 'flex' : 'none';
  if (ui.uploadsFooter) ui.uploadsFooter.style.display = (currentTab === 'uploads') ? 'flex' : 'none';
  if (ui.summaryFooter) ui.summaryFooter.style.display = (currentTab === 'summary') ? 'flex' : 'none';

  const valuesPanel = ui.apiKpis.closest('.panel') as HTMLElement | null;
  const issuesPanel = ui.apiIncidentHistory.closest('.panel') as HTMLElement | null;
  const checksPanel = ui.apiRunTable.closest('.panel') as HTMLElement | null;
  if (valuesPanel) valuesPanel.style.display = (hasValues || hasTrends || activeStep === 3) ? 'block' : 'none';
  if (issuesPanel) issuesPanel.style.display = (hasIssues || activeStep === 3) ? 'block' : 'none';
  if (checksPanel) checksPanel.style.display = (hasRuns || activeStep === 3) ? 'block' : 'none';

  const monitoringProgress = document.getElementById('api-monitoring-progress') as HTMLElement | null;
  if (monitoringProgress) {
    const currentEndpoint = monitoringProgress.dataset.endpoint;
    const currentSource = monitoringProgress.dataset.source;
    if (uploadAnalysis) {
      monitoringProgress.dataset.endpoint = detail.endpoint_path;
      monitoringProgress.dataset.source = 'upload-analysis';
      monitoringProgress.innerHTML = renderUploadAnalysis(uploadAnalysis, detail);
      monitoringProgress.style.display = 'block';
    } else if (!hasRuns && activeStep === 3) {
      monitoringProgress.dataset.endpoint = detail.endpoint_path;
      monitoringProgress.dataset.source = 'empty-analysis';
      monitoringProgress.innerHTML = emptyState('Upload a baseline and run analysis to see per-segment results here.');
      monitoringProgress.style.display = 'block';
    } else if (currentEndpoint !== detail.endpoint_path || currentSource === 'upload-analysis' || currentSource === 'empty-analysis') {
      monitoringProgress.dataset.endpoint = detail.endpoint_path;
      monitoringProgress.dataset.source = '';
      monitoringProgress.innerHTML = '';
      monitoringProgress.style.display = 'none';
    }
  }

  const anomalyHistory = detail.anomaly_history || [];
  const issueSummary = (item: any): string => {
    const actual = Number(item?.actual_value);
    const baseline = Number(item?.baseline_used);
    if (Number.isFinite(actual) && Number.isFinite(baseline) && baseline !== 0) {
      const pct = ((actual - baseline) / Math.abs(baseline)) * 100;
      const direction = pct >= 0 ? 'higher' : 'lower';
      return `API returned ${fmt(actual)}; baseline is ${fmt(baseline)} (${Math.abs(pct).toFixed(1)}% ${direction}).`;
    }
    if (Number.isFinite(actual)) {
      return `API returned ${fmt(actual)}. Baseline is not available for comparison.`;
    }
    return item.why_flagged || item.ai_explanation || 'No details yet.';
  };
  ui.apiIncidentHistory.innerHTML = anomalyHistory.length ? anomalyHistory.slice(0, 10).map((item) => {
    const severityClass = inferSeverityClass(item);
    const issueStatus = item.status || item.severity || 'active';
    const changeLine = item.change_since_last_healthy_run || 'No earlier comparison details.';
    return `
        <div class="history-item api-issue-card api-issue-card-${severityClass}">
          <div class="api-issue-card-head">
            <div class="api-issue-card-head-copy">
              <strong>${friendlyMetricLabel(item.kpi_field)}</strong>
              <div class="tiny muted api-issue-card-subline">${escapeHtml(changeLine)}</div>
            </div>
            <span class="status-pill ${severityClass}">${escapeHtml(issueStatus)}</span>
          </div>
          <div class="api-issue-card-summary">${escapeHtml(issueSummary(item))}</div>
          <div class="api-issue-card-meta tiny muted">
            Detected ${fmtDate(item.detected_at)} • Baseline ${item.baseline_used == null ? 'not set' : fmt(item.baseline_used)}
          </div>
          <div class="toolbar compact api-issue-card-actions">
            <button class="action ghost" type="button" onclick="showIncident(${item.id})">Open issue</button>
          </div>
        </div>
      `;
  }).join('') : emptyState('No issues for this API yet.');

  if (monitoringRuns.length) {
    const pagedRuns = paginate(monitoringRuns, state.runPage, 8);
    state.runPage = pagedRuns.page;
    const manualRuns = monitoringRuns.filter((run) => String(run?.trigger || '').toLowerCase() === 'manual').length;
    const scheduledRuns = monitoringRuns.filter((run) => String(run?.trigger || '').toLowerCase() === 'scheduler').length;
    const uploadMismatchRuns = Number(uploadAnalysis?.mismatch_runs || 0);
    const failedRuns = monitoringRuns.filter((run) => {
      const status = String(run?.status || '').toLowerCase();
      return status === 'error' || status === 'failed';
    }).length;
    ui.apiRunTable.innerHTML = `
        ${uploadMismatchRuns > 0 ? `
          <div class="tiny muted" style="margin-bottom:8px;">
            Upload analysis found ${fmt(uploadMismatchRuns)} mismatch segment(s). "PASSED" below refers to live check runs only.
          </div>
        ` : ''}
        <div class="table-toolbar">
          <div class="tiny">Run history (${fmt(monitoringRuns.length)} total)</div>
          <div class="tiny">Manual: ${fmt(manualRuns)} • Scheduled: ${fmt(scheduledRuns)} • Failed: ${fmt(failedRuns)}</div>
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
            ${pagedRuns.items.map((run: MonitoringRunRow) => {
              const anomalies = Number(run?.anomalies_detected || 0);
              const displayedAnomalies = Math.max(anomalies, uploadMismatchRuns);
              const statusMeta = monitoringRunStatusMeta(String(run?.status || 'unknown'), displayedAnomalies);
              const grains = Number(run?.grains_processed || 0);
              return `
                <tr>
                  <td>
                    <div>${fmtDate(run?.started_at)}</div>
                    <div class="tiny muted">Finished: ${fmtDate(run?.finished_at)}</div>
                  </td>
                  <td>
                    <div>${escapeHtml(runTriggerLabel(run?.trigger, run?.source))}</div>
                    <div class="tiny muted">${escapeHtml(String(run?.source || 'watch'))}</div>
                  </td>
                  <td>
                    <span class="status-pill ${statusMeta.pillClass}" title="${escapeHtml(statusMeta.tooltip)}">${escapeHtml(statusMeta.label)}</span>
                    <div class="tiny muted" style="margin-top:6px;">Duration: ${escapeHtml(runDurationLabel(run?.duration_ms))}</div>
                  </td>
                  <td>
                    <div>${fmt(grains)} segment(s)</div>
                    <div class="tiny ${displayedAnomalies > 0 ? '' : 'muted'}">${fmt(displayedAnomalies)} mismatch(es)</div>
                  </td>
                  <td>
                    <div class="tiny">Run ID: <code>${escapeHtml(String(run?.run_id || 'unknown'))}</code></div>
                    <div class="tiny">${run?.error ? escapeHtml(String(run.error)) : 'No error recorded.'}</div>
                  </td>
                  <td>
                    <div class="toolbar compact">
                      ${anomalies > 0
                        ? '<button class="action secondary tiny" type="button" onclick="setView(\'incidents\')">Review Issues</button>'
                        : uploadMismatchRuns > 0
                          ? '<button class="action ghost tiny" type="button" onclick="switchApiTab(\'history\')">Upload Findings</button>'
                          : '<button class="action ghost tiny" type="button" onclick="switchApiTab(\'summary\')">View KPIs</button>'}
                      ${run?.error ? '<button class="action ghost tiny" type="button" onclick="setView(\'errors\')">Open Errors</button>' : ''}
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table></div>
        ${renderPagination('runs', pagedRuns.page, pagedRuns.totalPages)}
      `;
  } else {
    const historyRows = (detail.history && detail.history.length ? detail.history : detail.recent_history) || [];
    // Group observations by timestamp to show "Runs"
    const runHasComparableMetrics = (observation: any): boolean => {
      const comparisons = Array.isArray(observation?.comparisons)
        ? observation.comparisons.filter((item: any) => item?.kpi_field)
        : [];
      if (comparisons.length) return true;

      let payload: Record<string, any> = {};
      if (observation?.kpi_json && typeof observation.kpi_json === 'string') {
        try {
          const parsed = JSON.parse(observation.kpi_json);
          if (parsed && typeof parsed === 'object') payload = parsed as Record<string, any>;
        } catch {
          payload = {};
        }
      } else if (observation?.kpi_json && typeof observation.kpi_json === 'object') {
        payload = observation.kpi_json as Record<string, any>;
      }
      const walk = (value: any): boolean => {
        if (value == null) return false;
        if (typeof value === 'number') return Number.isFinite(value);
        if (typeof value === 'string') {
          const trimmed = value.trim();
          return trimmed.length > 0 && Number.isFinite(Number(trimmed));
        }
        if (Array.isArray(value)) return value.some((item) => walk(item));
        if (typeof value === 'object') return Object.values(value).some((item) => walk(item));
        return false;
      };
      return walk(payload);
    };

    const runsMap = new Map<string, any[]>();
    historyRows.forEach(row => {
      const ts = row.observed_at;
      if (!ts) return;
      if (!runsMap.has(ts)) runsMap.set(ts, []);
      runsMap.get(ts)!.push(row);
    });

    const referenceGrainKeys = new Set<string>();
    const referenceTargets = new Set<string>();
    (detail.references || []).forEach((item: any) => {
      const grain = String(item?.grain_key || '').trim();
      if (!grain) return;
      const normalizedGrain = canonicalGrainKey(grain);
      const rawKpi = String(item?.kpi_field || '').trim();
      const normalizedKpi = canonicalKpiField(rawKpi);
      referenceGrainKeys.add(grain);
      referenceGrainKeys.add(normalizedGrain);
      if (rawKpi) {
        referenceTargets.add(`${normalizedGrain}__${rawKpi}`);
      }
      if (normalizedKpi) {
        referenceTargets.add(`${normalizedGrain}__${normalizedKpi}`);
      }
    });

    const observationMissingBaseline = (observation: any): boolean => {
      const comparisons = Array.isArray(observation?.comparisons)
        ? observation.comparisons.filter((item: any) => item?.kpi_field)
        : [];
      if (comparisons.length) {
        const normalizedGrain = canonicalGrainKey(String(observation?.grain_key || '').trim());
        return comparisons.every((item: any) => {
          const rawKpi = String(item?.kpi_field || '').trim();
          const normalizedKpi = canonicalKpiField(rawKpi);
          return (
            !referenceTargets.has(`${normalizedGrain}__${rawKpi}`) &&
            !referenceTargets.has(`${normalizedGrain}__${normalizedKpi}`)
          );
        });
      }
      if (!runHasComparableMetrics(observation)) return false;
      const grainKey = String(observation?.grain_key || '').trim();
      if (!grainKey) return true;
      const canonical = canonicalGrainKey(grainKey);
      return !referenceGrainKeys.has(grainKey) && !referenceGrainKeys.has(canonical);
    };

    const runGroups = Array.from(runsMap.entries()).map(([ts, obs]) => ({
      observed_at: ts,
      obs_count: obs.length,
      status: obs.some(o => (detail.anomaly_history || []).some((a:any) =>
        a.detected_at === ts && canonicalGrainKey(String(a.grain_key || '')) === canonicalGrainKey(String(o.grain_key || ''))
      ))
        ? 'anomaly'
        : (!obs.some((o) => runHasComparableMetrics(o))
          ? 'no_data'
          : (obs.every((o) => observationMissingBaseline(o)) ? 'no_baseline' : 'healthy'))
    })).sort((a,b) => b.observed_at.localeCompare(a.observed_at));

    const runStatusMeta = (status: string) => {
      if (status === 'anomaly') {
        return {
          pillClass: 'danger',
          label: 'Needs attention',
          tooltip: 'At least one metric moved outside your allowed tolerance.',
        };
      }
      if (status === 'no_data') {
        return {
          pillClass: 'warning',
          label: 'No comparable values',
          tooltip: 'A run happened, but no comparable numeric values were captured.',
        };
      }
      if (status === 'no_baseline') {
        return {
          pillClass: 'acknowledged',
          label: 'Needs baseline',
          tooltip: 'Values were captured, but this segment does not have an uploaded baseline yet.',
        };
      }
      return {
        pillClass: 'healthy',
        label: 'Within target',
        tooltip: 'All compared metrics stayed within tolerance.',
      };
    };

    const pagedRuns = paginate(runGroups, state.runPage, 8);
    state.runPage = pagedRuns.page;

    ui.apiRunTable.innerHTML = runGroups.length ? `
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
              ${pagedRuns.items.map((run) => {
                const statusMeta = runStatusMeta(run.status);
                return `
                <tr>
                  <td>${fmtDate(run.observed_at)}</td>
                  <td>${run.obs_count} segments checked</td>
                  <td><span class="status-pill ${statusMeta.pillClass}" title="${escapeHtml(statusMeta.tooltip)}">${escapeHtml(statusMeta.label)}</span></td>
                  <td>
                    ${run.status === 'no_baseline'
                      ? '<button class="action secondary tiny" onclick="openUploadsTab()">Set baseline</button>'
                      : `<button class="action ghost tiny" onclick="showRunDetail('${run.observed_at}')">Examine details</button>`}
                  </td>
                </tr>
              `;
              }).join('')}
            </tbody>
          </table></div>
          ${renderPagination('runs', pagedRuns.page, pagedRuns.totalPages)}
        ` : emptyState('No checks for this API yet.');
  }

  if (state.uploadSort === 'kpi_asc') {
    state.uploadSort = 'uploaded_at_desc';
  }
  const uploadRows = sortRows(detail.upload_activity || [], state.uploadSort, 'uploaded_at');
  const uploadEventsByKey = new Map<string, {
    uploaded_at?: string | null;
    grain_key?: string | null;
    upload_source?: string | null;
    metrics: Array<{ kpi_field: string; expected_value: number | null }>;
  }>();
  uploadRows.forEach((item: any) => {
    const uploadedAt = String(item?.uploaded_at || '');
    const grainKey = String(item?.grain_key || '');
    const key = `${uploadedAt}__${grainKey}`;
    if (!uploadEventsByKey.has(key)) {
      uploadEventsByKey.set(key, {
        uploaded_at: item?.uploaded_at || null,
        grain_key: item?.grain_key || null,
        upload_source: item?.upload_source || null,
        metrics: [],
      });
    }
    const event = uploadEventsByKey.get(key)!;
    event.metrics.push({
      kpi_field: String(item?.kpi_field || ''),
      expected_value: item?.expected_value == null ? null : Number(item?.expected_value),
    });
  });
  const uploadEvents = Array.from(uploadEventsByKey.values())
    .map((event) => ({
      ...event,
      metrics: [...event.metrics].sort((a, b) => String(a.kpi_field || '').localeCompare(String(b.kpi_field || ''))),
    }));
  const pagedUploadEvents = paginate(uploadEvents, state.uploadPage, 6);
  state.uploadPage = pagedUploadEvents.page;
  const uploadAnalysisHistory = [...(detail.upload_analysis_history || [])]
    .sort((a, b) => String(b?.analyzed_at || '').localeCompare(String(a?.analyzed_at || '')));

  const metricMapByField = new Map<string, string>();
  if (detail.metrics) {
    detail.metrics.forEach(m => {
       if (m.calculation && m.calculation.field) {
         metricMapByField.set(m.calculation.field, m.name);
       }
    });
  }

  const uploadHistoryBlock = uploadAnalysisHistory.length ? `
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
              ${uploadAnalysisHistory.slice(0, 8).map((analysis) => `
                <tr>
                  <td>${fmtDate(analysis.analyzed_at)}</td>
                  <td>
                    <span class="status-pill ${uploadVerdictPill(analysis.verdict)}">${uploadVerdictLabel(analysis.verdict)}</span>
                    <div class="tiny muted" style="margin-top:6px;">
                      ${fmt(analysis.requested_grains)} segments • ${fmt(analysis.matched_runs)} matched • ${fmt(analysis.mismatch_runs)} mismatched • ${fmt(analysis.failed_runs)} errors
                    </div>
                  </td>
                  <td>${escapeHtml(analysis.summary_message || 'No summary available.')}</td>
                  <td>
                    <button
                      class="action ghost tiny"
                      type="button"
                      onclick="showUploadAnalysis('${String(analysis.analyzed_at || '').replace(/'/g, "\\\\'")}')"
                    >
                      ${selectedUploadAnalysisAt && String(analysis.analyzed_at || '') === selectedUploadAnalysisAt ? 'Viewing' : 'Open'}
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ${uploadAnalysisHistory.length > 8 ? `<div class="tiny muted" style="margin-bottom:12px;">Showing latest 8 of ${uploadAnalysisHistory.length} upload analysis runs.</div>` : ''}
      ` : `
        <div class="empty" style="margin-bottom:12px;">No upload analysis history yet.</div>
      `;

  ui.uploadActivity.innerHTML = uploadEvents.length ? `
        ${uploadHistoryBlock}
        <div class="table-toolbar">
          <div class="toolbar">
            <select id="upload-sort">
              <option value="uploaded_at_desc" ${state.uploadSort === 'uploaded_at_desc' ? 'selected' : ''}>Newest First</option>
              <option value="uploaded_at_asc" ${state.uploadSort === 'uploaded_at_asc' ? 'selected' : ''}>Oldest First</option>
              <option value="grain_asc" ${state.uploadSort === 'grain_asc' ? 'selected' : ''}>Segment A-Z</option>
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
            ${pagedUploadEvents.items.map((item: any) => `
              <tr>
                <td>${fmtDate(item.uploaded_at)}</td>
                <td>
                  <strong>${escapeHtml(friendlyGrainLabel(item.grain_key))}</strong>
                  <details class="upload-analysis-tech" style="margin-top:6px;">
                    <summary class="tiny muted">Technical key</summary>
                    <div class="tiny muted">${escapeHtml(String(item.grain_key || ''))}</div>
                  </details>
                </td>
                <td>
                  <div class="upload-event-metrics">
                    ${item.metrics.slice(0, 2).map((metric: any) => `
                      <div class="upload-event-metric">
                        <strong>${escapeHtml(metricMapByField.get(metric.kpi_field) || friendlyMetricLabel(metric.kpi_field))}</strong>
                        <span>${fmt(metric.expected_value)}</span>
                      </div>
                    `).join('')}
                    ${item.metrics.length > 2 ? `
                      <details class="upload-analysis-inline-more">
                        <summary>Show ${fmt(item.metrics.length - 2)} more metric(s)</summary>
                        <div class="upload-event-metrics upload-event-metrics-more">
                          ${item.metrics.slice(2).map((metric: any) => `
                            <div class="upload-event-metric">
                              <strong>${escapeHtml(metricMapByField.get(metric.kpi_field) || friendlyMetricLabel(metric.kpi_field))}</strong>
                              <span>${fmt(metric.expected_value)}</span>
                            </div>
                          `).join('')}
                        </div>
                      </details>
                    ` : ''}
                  </div>
                </td>
                <td>${escapeHtml(String(item.upload_source || 'upload'))}</td>
              </tr>
            `).join('')}
          </tbody>
        </table></div>
        ${renderPagination('uploads', pagedUploadEvents.page, pagedUploadEvents.totalPages)}
      ` : `${uploadHistoryBlock}${emptyState('No baseline rows are stored for this API yet.')}`;

  renderFieldRoles(detail.fields || [], detail.setup_config || detail.config || {}, detail.metrics || [], detail);
  renderSavedViews();
  renderApiSections();
  if (state.currentApiTab === 'configuration' && typeof (window as any).refreshTimePreview === 'function') {
    requestAnimationFrame(() => {
      (window as any).refreshTimePreview();
    });
  }
  if (state.currentApiTab === 'configuration' && typeof (window as any).runMagicGuess === 'function') {
    const hasSetup = Boolean(
      (detail.setup_config?.dimension_fields || []).length
      || (detail.setup_config?.kpi_fields || []).length
      || detail.setup_config?.time_field,
    );
    const hasSamples = hasSetupSamples(detail);
    const selectedPath = String(detail.endpoint_path || state.selectedApi || '').trim();
    const triggeredMap = ((state as any).autoSuggestTriggeredByApi || {}) as Record<string, boolean>;
    if (!hasSetup && hasSamples && selectedPath && !triggeredMap[selectedPath] && !responseModelMissing) {
      triggeredMap[selectedPath] = true;
      (state as any).autoSuggestTriggeredByApi = triggeredMap;
      requestAnimationFrame(() => {
        (window as any).runMagicGuess(false);
      });
    }
  }
}

function renderSettings() {
  const project = state.status?.project;
  const maintainerMode = isMaintainerMode();
  const policy = project?.policy;
  const tier = String(project?.tier || 'free').toLowerCase();
  const licenseBackend = String(project?.license_backend || (project?.license_catalog_present ? 'commercial_catalog' : 'legacy_demo'));
  const commercialCatalog = licenseBackend === 'commercial_catalog' || Boolean(project?.license_catalog_present);
  const licenseEnforced = project?.license_enforced !== false;
  const projectLimit = policy?.max_projects == null ? 'Unlimited' : fmt(policy?.max_projects);
  const recentErrors = state.status?.recent_errors || [];
  const latestStorageRecovery = recentErrors.find((item) => (
    String(item?.source || '') === 'middleware.db'
    && /quarantin|corrupt/i.test(`${item?.message || ''} ${item?.hint || ''}`)
  )) || null;
  const recoveryHint = String(latestStorageRecovery?.hint || '');
  const recoveryPathMatch = recoveryHint.match(/Old DB moved to (.+?)\. Restore/i);
  const recoveryPath = recoveryPathMatch?.[1] || recoveryHint;
  const storageRecoveryHtml = latestStorageRecovery
    ? `
      <div class="row-card danger" style="margin-bottom:12px; border-color:rgba(251, 113, 133, 0.35);">
        <strong>Storage Recovery Completed</strong>
        <div class="tiny" style="margin-top:6px;">
          Jin detected a DuckDB internal error and started with a fresh local database.
        </div>
        ${recoveryPath ? `<div class="tiny" style="margin-top:6px;">Backup file: <code>${escapeHtml(recoveryPath)}</code></div>` : ''}
        <div class="toolbar" style="margin-top:10px;">
          <button class="action secondary" type="button" onclick="setView('errors')">Open Errors</button>
        </div>
      </div>
    `
    : '';

  const licenseCard = ui.settingsLicense.closest('.row-card') as HTMLElement | null;
  if (licenseCard) {
    licenseCard.style.display = maintainerMode ? '' : 'none';
  }
  if (!maintainerMode) {
    ui.settingsLicense.innerHTML = '';
    return;
  }

  ui.settingsLicense.innerHTML = `
    <div class="row-card-inner">
      ${storageRecoveryHtml}
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
        Unique Site ID: <code class="site-id-code">${project?.site_id || 'unknown'}</code>
      </div>
      
      <div class="license-status-card tier-${tier}">
        <div class="license-status-header">
          <strong>${commercialCatalog ? 'Commercial Entitlement' : 'Legacy Demo Compatibility'}: <span class="tier-label">${tier.toUpperCase()}</span></strong>
          <span class="status-badge ${tier === 'business' ? 'active' : 'basic'}">
            ${tier === 'business' ? 'Licensed' : 'Free Tier'}
          </span>
        </div>
        
        <div class="policy-limits">
          <div class="policy-limit-item">
            <span class="limit-label">Hosting Model</span>
            <span class="limit-value">Your Infrastructure</span>
          </div>
          <div class="policy-limit-item">
            <span class="limit-label">Project Limit</span>
            <span class="limit-value">${fmt(project?.projects_active)} / ${licenseEnforced ? projectLimit : 'Unlimited'}</span>
          </div>
        </div>

        ${!licenseEnforced ? `
          <p class="tiny muted" style="margin-top:16px;">
            License enforcement is currently disabled. ${commercialCatalog ? 'A commercial catalog is available for activation.' : 'This runtime is using the legacy demo entitlement backend.'}
          </p>
        ` : `
          <p class="tiny muted" style="margin-top:16px;">
            ${commercialCatalog
              ? 'Commercial catalog is active. Business activation unlocks unlimited projects on your own infrastructure.'
              : 'Legacy demo compatibility is active. Maintainers can still test the licensing flow locally.'}
          </p>
        `}
      </div>

      <div class="activation-form" style="margin-top:20px;">
        <label>
          ${commercialCatalog
            ? (licenseEnforced ? 'Activate Business License' : 'Optional: Activate Business License')
            : (licenseEnforced ? 'Run Legacy Demo Activation' : 'Optional: Run Legacy Demo Activation')}
          <div class="activation-input-group">
            <input id="license-key-input" type="password" placeholder="BUS-ORG-XXXX-XXXX" />
            <button class="action" id="activate-license-button" type="button">${commercialCatalog ? 'Activate Business License' : 'Run Legacy Demo'}</button>
          </div>
        </label>
        <div id="license-feedback" class="tiny" style="margin-top:8px;"></div>
      </div>
    </div>
  `;
}

function renderReports(payload: any = null) {
  const endpoints = state.status?.endpoints || [];
  const hasTrackedEndpoints = endpoints.length > 0;
  const hasReportData = Array.isArray(state.lastReportData) && state.lastReportData.length > 0;
  const reportPackReady = ui.reportsContent.dataset.reportPackReady === '1';
  const reportsMessage = state.reportsMessage;
  const fallbackReportsText = hasTrackedEndpoints
    ? (
      hasReportData
        ? 'Report is ready. Review risks, then export CSV.'
        : 'Step 1: Generate report. Step 2: Export CSV.'
    )
    : '';
  ui.reportsFeedback.textContent = reportsMessage?.text || fallbackReportsText;
  ui.reportsFeedback.className = `feedback feedback-banner${reportsMessage?.kind === 'error' ? ' danger' : reportsMessage?.kind === 'success' ? ' success' : (reportsMessage || fallbackReportsText) ? ' info' : ''}`;
  ui.runReportButton.disabled = !hasTrackedEndpoints;
  ui.runReportButton.title = hasTrackedEndpoints
    ? 'Step 1: Generate report'
    : 'No tracked APIs yet. Connect your first endpoint before generating a report pack.';
  ui.exportReportCsv.disabled = !hasTrackedEndpoints;
  ui.exportReportCsv.textContent = hasReportData ? '2) Export CSV' : 'Generate then Export CSV';
  ui.exportReportCsv.title = hasTrackedEndpoints
    ? (hasReportData ? 'Step 2: Download the latest generated report CSV.' : 'Generate report and export in one click.')
    : 'No tracked APIs yet. Connect your first endpoint before generating a report pack.';

  const currentVal = ui.reportEndpointSelect.value;
  ui.reportEndpointSelect.innerHTML = '<option value="">All tracked APIs</option>'
    + endpoints.map((e) => `<option value="${e.endpoint_path}" ${e.endpoint_path === currentVal ? 'selected' : ''}>${e.endpoint_path}</option>`).join('');

  if (!payload) {
    if (!hasTrackedEndpoints) {
      ui.reportsContent.dataset.reportPackReady = '0';
      ui.reportsContent.innerHTML = `
        <div class="empty empty-center">
          <strong>No tracked APIs yet.</strong>
          <div class="tiny" style="margin-top:6px;">Connect your first endpoint before generating a report pack.</div>
          <div class="toolbar" style="margin-top:12px; justify-content:center;">
            <button class="action" type="button" data-view="api">Set Up APIs</button>
          </div>
        </div>
      `;
      return;
    }
    if (reportPackReady) return;
    ui.reportsContent.dataset.reportPackReady = '0';
    ui.reportsContent.innerHTML = hasReportData
      ? `
        <div class="row-card reports-start-card">
          <strong>Report is ready</strong>
          <div class="tiny" style="margin-top:8px;">
            Export CSV now, or regenerate first if you want a fresher snapshot before sharing.
          </div>
          <div class="toolbar" style="margin-top:10px;">
            <button class="action secondary" type="button" data-view="incidents">Review Issues</button>
          </div>
        </div>
      `
      : `
        <div class="row-card reports-start-card">
          <strong>Start here</strong>
          <ol class="reports-flow-steps">
            <li>Click <strong>1) Generate Report</strong> for all tracked APIs or one selected API.</li>
            <li>Review health and top risks, then click <strong>2) Export CSV</strong>.</li>
          </ol>
        </div>
      `;
    return;
  }

  if (Array.isArray(payload)) {
    ui.reportsContent.dataset.reportPackReady = '0';
    if (payload.length === 0) {
      ui.reportsContent.innerHTML = emptyState('No data found for this query.');
      return;
    }

    const headers = Object.keys(payload[0]);
    ui.reportsContent.innerHTML = `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              ${headers.map((h) => `<th>${h}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${payload.map((row: any) => `
              <tr>
                ${headers.map((h) => `<td>${fmt(row[h])}</td>`).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
    return;
  }

  const summaryPayload = payload.summary || {};
  const digestPayload = payload.digest || {};
  const endpointPayload = payload.endpoint_report || payload.endpointReport || null;
  const healthPayload = summaryPayload.health || {};
  const healthSummary = summaryPayload.summary || {};
  const activeAnomalies = Array.isArray(summaryPayload.active_anomalies) ? summaryPayload.active_anomalies : [];
  const digestTotals = digestPayload.totals || {};
  const endpointBaseline = endpointPayload?.baseline || {};
  const anomaliesCount = Number(healthSummary.anomalies || 0);
  const unconfirmedCount = Number(healthSummary.unconfirmed || 0);
  const riskLevel = anomaliesCount >= 8 ? 'high' : ((anomaliesCount > 0 || unconfirmedCount > 0) ? 'medium' : 'low');
  const coverageRaw = Number(endpointBaseline.coverage_pct ?? 0);
  const coveragePct = Number.isFinite(coverageRaw) ? Math.max(0, Math.min(100, coverageRaw)) : 0;
  const generatedAt = payload.generated_at ? fmtDate(payload.generated_at) : fmtDate(new Date().toISOString());
  const decision = anomaliesCount > 0
    ? { label: 'Needs attention', tone: 'warning' as const }
    : unconfirmedCount > 0
      ? { label: 'Block release', tone: 'danger' as const }
      : { label: 'Safe for now', tone: 'success' as const };
  const decisionPillClass = decision.tone === 'success'
    ? 'resolved'
    : decision.tone === 'danger'
      ? 'active'
      : 'acknowledged';
  const recommendation = anomaliesCount > 0
    ? 'Needs attention: review Issues next and resolve high-priority changes before sharing this report.'
    : unconfirmedCount > 0
      ? 'Block release: set up APIs next and finish setup for unconfirmed endpoints.'
      : 'Safe for now: monitoring is stable. Share this report and keep the current baseline targets.';
  const recommendationAction = anomaliesCount > 0
    ? { view: 'incidents', label: 'Review Issues' }
    : unconfirmedCount > 0
      ? { view: 'api', label: 'Set Up APIs' }
      : { view: 'overview', label: 'Open Overview' };
  const reportSeverityLabel = (value: unknown): string => {
    const normalized = String(value || 'medium').toLowerCase();
    if (normalized === 'critical') return 'Critical';
    if (normalized === 'high') return 'High';
    if (normalized === 'low') return 'Low';
    return 'Medium';
  };
  const topActiveIssuesCopy = activeAnomalies.length
    ? activeAnomalies.slice(0, 5).map((item: any) => `
      <div class="reports-issue-item reports-issue-item-${inferSeverityClass(item)}">
        <div class="reports-issue-main">
          <strong>${escapeHtml(String(item.endpoint_path || 'unknown endpoint'))}</strong>
          <div class="tiny" style="margin-top:4px;">
            ${escapeHtml(String(item.kpi_field || 'metric'))} moved ${formatPercentDeltaCompact(item.pct_change)}
          </div>
          <div class="tiny muted" style="margin-top:4px;">
            expected ${fmt(item.expected_value ?? item.baseline_used)} • actual ${fmt(item.actual_value)}
          </div>
        </div>
        <span class="status-pill ${inferSeverityClass(item)}">${escapeHtml(reportSeverityLabel(item.severity))}</span>
      </div>
    `).join('')
    : anomaliesCount > 0
      ? '<div class="history-item">Open risks exist, but detailed rows are not loaded in this view. Review Issues to see the full queue.</div>'
      : '<div class="history-item">No active issues right now.</div>';

  ui.reportsContent.dataset.reportPackReady = '1';
  ui.reportsContent.innerHTML = `
    <div class="row-card reports-flow-card">
      <strong>Report Snapshot</strong>
      <div class="tiny" style="margin-top:8px;">
        Last generated: ${generatedAt}
      </div>
      <div class="tiny muted reports-last-generated" style="margin-top:4px;">
        Review health and risks first, then export this snapshot.
      </div>
    </div>

    <div class="reports-health-banner reports-health-${riskLevel}">
      <div>
        <strong>${decision.label}</strong>
        <div class="tiny" style="margin-top:8px;">
          Status: ${fmt(healthPayload.status || 'unknown')} • APIs: ${fmt(healthSummary.total_endpoints || 0)} • Healthy: ${fmt(healthSummary.healthy || 0)} • Issues: ${fmt(anomaliesCount)}
        </div>
        <div class="tiny muted" style="margin-top:4px;">
          ${decision.label === 'Block release'
            ? 'Share readiness: hold until setup gaps are closed.'
            : decision.label === 'Needs attention'
              ? 'Share readiness: review Issues and setup gaps first.'
              : 'Share readiness: clear to share this report snapshot.'}
        </div>
      </div>
      <div class="reports-health-tags">
        <span class="status-pill ${decisionPillClass}">${decision.label}</span>
        <span class="tiny muted">Setup pending: ${fmt(unconfirmedCount)}</span>
      </div>
    </div>

    <div class="report-grid reports-summary-grid">
      <div class="row-card reports-summary-card">
        <strong>Open Risks</strong>
        <span>${fmt(anomaliesCount)}</span>
        <div class="tiny muted" style="margin-top:6px;">Active issues needing review</div>
      </div>
      <div class="row-card reports-summary-card">
        <strong>Setup Pending</strong>
        <span>${fmt(unconfirmedCount)}</span>
        <div class="tiny muted" style="margin-top:6px;">APIs waiting for full setup</div>
      </div>
      <div class="row-card reports-summary-card">
        <strong>Leadership Digest (7d)</strong>
        <span>${fmt(digestTotals.runs || 0)}</span>
        <div class="tiny muted" style="margin-top:6px;">Runs • Success ${fmt(digestTotals.success || 0)} • Errors ${fmt(digestTotals.errors || 0)}</div>
      </div>
    </div>

    <div class="row-card reports-next-step-card" style="margin-top:12px;">
      <strong>Recommended Next Step</strong>
      <div class="tiny" style="margin-top:8px;">${recommendation}</div>
      <div class="toolbar" style="margin-top:10px;">
        <button class="action" type="button" data-view="${recommendationAction.view}">${recommendationAction.label}</button>
      </div>
    </div>

    <div class="row-card reports-issues-card" style="margin-top:12px;">
      <strong>Top Active Issues</strong>
      <div class="tiny muted" style="margin-top:6px;">Showing up to 5 highest-priority items for quick review.</div>
      <div class="reports-issues-list" style="margin-top:10px;">
        ${topActiveIssuesCopy}
      </div>
      <div class="toolbar" style="margin-top:10px;">
        <button class="action secondary" type="button" data-view="incidents">Review Issues</button>
      </div>
    </div>

    ${endpointPayload ? `
      <div class="row-card reports-endpoint-card" style="margin-top:12px;">
        <strong>Endpoint Snapshot</strong>
        <div class="tiny" style="margin-top:8px;">
          ${escapeHtml(String(endpointPayload.endpoint_path || 'Selected endpoint'))} • anomalies ${fmt(endpointPayload.anomaly_count || 0)} • baseline rows ${fmt(endpointBaseline.total_reference_rows || 0)}
        </div>
        <div class="reports-coverage-track" aria-label="Endpoint baseline coverage">
          <span style="width:${coveragePct.toFixed(1)}%"></span>
        </div>
        <div class="tiny" style="margin-top:6px;">
          APIs with baseline for this endpoint: ${fmt(endpointBaseline.endpoints_with_baseline || 0)} • coverage ${fmt(coveragePct)}%
        </div>
      </div>
    ` : ''}
  `;
}

export {
  renderSidebar,
  renderOverview,
  renderPlaybook,
  renderIncidents,
  renderErrors,
  renderScheduler,
  renderApiDetail,
  renderSettings,
  renderReports,
};
