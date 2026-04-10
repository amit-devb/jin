export type NumberTuple = [string, number];

export type ConfirmAction = null | (() => void | Promise<void>);

export type DashboardView = 'overview' | 'playbook' | 'api' | 'incidents' | 'errors' | 'scheduler' | 'settings' | 'reports';
export type ApiTab = 'summary' | 'incidents' | 'uploads' | 'configuration' | 'history';

export type EndpointStatus = {
  endpoint_path: string;
  http_method: string;
  status: string;
  dimension_fields?: string[];
  kpi_fields?: string[];
  time_field?: string | null;
  time_required?: boolean;
  time_candidates?: string[];
  active_anomalies?: number;
  grain_count?: number;
  confirmed?: boolean;
  last_checked?: string | null;
  last_observed_at?: string | null;
  last_upload_at?: string | null;
  last_upload_source?: string | null;
  config_source?: string | null;
  observation_count?: number | null;
};

export type StatusPayload = {
  summary: {
    total_endpoints: number;
    healthy: number;
    anomalies: number;
    unconfirmed: number;
  };
  endpoints: EndpointStatus[];
  project?: {
    name: string;
    root: string;
    db_path: string;
    site_id?: string;
    tier?: 'free' | 'business';
    project_limit?: number | null;
    projects_active?: number;
    trust_score?: number;
    is_unlicensed?: boolean;
    license_enforced?: boolean;
    license_backend?: 'commercial_catalog' | 'legacy_demo' | string;
    license_catalog_present?: boolean;
    is_maintainer?: boolean;
    auth_enabled: boolean;
    auth_mode?: string;
    auth_uses_default_credentials?: boolean;
    deployment_model?: string;
    recent_errors: RecentError[];
    usage?: {
      current: number;
      limit?: number | null;
      is_limited: boolean;
    };
    policy?: LicensePolicy;
  };
  recent_errors?: RecentError[];
};

export type LicensePolicy = {
  tier: string;
  max_projects?: number | null;
  features: string[];
  min_version: string;
  force_upgrade: boolean;
  message?: string;
};

export type RecentError = {
  id: number;
  created_at?: string | null;
  source: string;
  category?: string | null;
  severity?: string | null;
  message: string;
  hint?: string | null;
  endpoint_path?: string | null;
  detail?: string | null;
  status?: string | null;
  acknowledged_at?: string | null;
  archived_at?: string | null;
  remediation_steps?: string[];
};

export type IncidentTimelineEntry = {
  event_type?: string;
  created_at?: string | null;
  note?: string | null;
  owner?: string | null;
  resolution_reason?: string | null;
};

export type IncidentRecord = {
  id: number;
  endpoint_path: string;
  kpi_field: string;
  status?: string | null;
  severity?: string | null;
  confidence?: number | null;
  baseline_used?: number | null;
  actual_value?: number | null;
  expected_value?: number | null;
  pct_change?: number | null;
  detected_at?: string | null;
  resolved_at?: string | null;
  impact?: number | null;
  currency?: string | null;
  note?: string | null;
  owner?: string | null;
  resolution_reason?: string | null;
  why_flagged?: string | null;
  ai_explanation?: string | null;
  change_since_last_healthy_run?: string | null;
  grain_key?: string | null;
  tolerance_pct?: number | null;
  config_source?: string | null;
  timeline?: IncidentTimelineEntry[];
};

export type AnomaliesPayload = {
  anomalies: IncidentRecord[];
  history: IncidentRecord[];
};

export type SchedulerJob = {
  job_id: string;
  path?: string | null;
  paused?: boolean;
  last_status?: string | null;
  last_finished_at?: string | null;
  next_run_at?: string | null;
  next_retry_at?: string | null;
  backoff_active?: boolean;
  last_error?: string | null;
};

export type SchedulerPayload = {
  jobs: SchedulerJob[];
};

export type ProjectMonitorPolicy = {
  cadence_template?: 'aggressive' | 'balanced' | 'conservative' | 'custom' | string;
  schedule?: string;
  baseline_mode?: 'fixed' | 'refresh_before_run' | string;
  threshold?: number | null;
  bundle_enabled?: boolean;
  bundle_schedule?: string | null;
  bundle_endpoint_paths?: string[] | null;
  bundle_report_format?: 'markdown' | 'json' | string;
  updated_at?: string | null;
};

export type ProjectCatalogItem = {
  id: string;
  name: string;
  root: string;
  db_path: string;
  active?: boolean;
  is_archived?: boolean;
  archived_at?: string | null;
  created_at?: string;
  last_seen_at?: string;
  source?: string;
  monitor_policy?: ProjectMonitorPolicy;
};

export type ProjectCatalogPayload = {
  projects: ProjectCatalogItem[];
  active_project?: string;
  active_project_id?: string | null;
  count?: number;
};

export type ProjectHealthPayload = {
  generated_at?: string;
  status?: string;
  summary?: Record<string, any>;
  baseline?: Record<string, any>;
  scheduler?: Record<string, any>;
  checks?: Array<{ name: string; status: string; detail: string }>;
  project?: Record<string, any>;
};

export type ProjectMonitorSnapshotPayload = {
  generated_at?: string;
  count?: number;
  summary?: {
    total_projects?: number;
    active_projects?: number;
    healthy_projects?: number;
    degraded_projects?: number;
    projects_with_baseline?: number;
    projects_without_baseline?: number;
    total_anomalies?: number;
    total_unconfirmed?: number;
    average_risk_score?: number;
    top_risk_project?: {
      id?: string;
      name?: string;
      status?: string;
      risk_score?: number;
      risk_label?: string;
      risk_reasons?: string[];
      coverage_pct?: number;
    } | null;
  };
  projects?: Array<{
    id: string;
    name: string;
    root?: string;
    db_path?: string;
    active?: boolean;
    status?: string;
    risk_score?: number;
    risk_label?: string;
    risk_reasons?: string[];
    trust_score?: number;
    summary?: Record<string, any>;
    baseline?: Record<string, any>;
    generated_at?: string;
  }>;
};

export type BundleRunRow = {
  run_id?: string;
  project_id?: string;
  project_name?: string;
  started_at?: string;
  finished_at?: string;
  status?: string;
  requested?: number;
  executed?: number;
  errors?: number;
  report_markdown?: string;
  summary_message?: string;
  results?: any[];
};

export type BundleRunHistoryPayload = {
  project?: Record<string, any>;
  count?: number;
  runs?: BundleRunRow[];
};

export type ExecutiveDigestPayload = {
  generated_at?: string;
  window_days?: number;
  window_start?: string;
  window_end?: string;
  totals?: Record<string, number>;
  projects?: Array<Record<string, any>>;
  recent_runs?: BundleRunRow[];
  count?: number;
  project?: Record<string, any>;
};

export type PoPlaybookPayload = {
  generated_at?: string;
  persona?: string;
  project?: Record<string, any>;
  stats?: Record<string, any>;
  workflows?: Array<{
    id: string;
    title: string;
    outcome: string;
    ui_action?: string;
  }>;
  route_catalog?: Array<{
    method: string;
    path: string;
    purpose: string;
  }>;
};

export type FieldRole = {
  name: string;
  kind?: string | null;
  annotation?: string | null;
  suggested?: boolean;
  time_candidate?: boolean;
  suggested_role?: string | null;
  type?: string;
  example?: any;
};

export type ModelSetupAdvice = {
  ready: boolean;
  summary: string;
  detail: string;
  missingRoles: string[];
  segmentCandidates: string[];
  metricCandidates: string[];
  timeCandidates: string[];
  weakFields: string[];
  candidateCount: number;
};

export type SchemaContract = {
  fields?: FieldRole[];
  dimension_fields?: string[];
  kpi_fields?: string[];
  example_rows?: Record<string, any>[];
  [key: string]: any;
};

export type HistoryRow = {
  observed_at?: string | null;
  grain_key?: string | null;
  dimension_json?: Record<string, any>;
  kpi_json?: Record<string, number>;
  comparisons?: {
    kpi_field: string;
    actual?: number | null;
    expected?: number | null;
    delta?: number | null;
    actual_value?: number | null;
    expected_value?: number | null;
    pct_change?: number | null;
    status?: string | null;
    message?: string | null;
  }[];
};

export type UploadAnalysisComparison = {
  kpi_field: string;
  actual_value?: number | null;
  expected_value?: number | null;
  delta?: number | null;
  pct_change?: number | null;
  allowed_tolerance_pct?: number | null;
  status: 'match' | 'mismatch' | 'missing_reference' | 'missing_kpi' | 'error' | string;
  message: string;
};

export type UploadAnalysisRun = {
  grain_key: string;
  dimensions?: Record<string, any>;
  request?: {
    path?: Record<string, any>;
    query?: Record<string, any>;
    body?: Record<string, any> | any[];
    headers?: Record<string, any>;
  };
  status: 'match' | 'mismatch' | 'error' | string;
  message: string;
  error?: string | null;
  tolerance_pct?: number | null;
  matched_checks?: number;
  mismatched_checks?: number;
  comparisons: UploadAnalysisComparison[];
};

export type UploadAnalysisSummary = {
  status: 'success' | 'partial' | 'failed' | 'skipped' | string;
  verdict: 'matched' | 'mismatch' | 'error' | 'skipped' | string;
  requested_grains: number;
  attempted_runs: number;
  successful_runs: number;
  failed_runs: number;
  matched_runs: number;
  mismatch_runs: number;
  anomalies_detected: number;
  summary_message: string;
  analyzed_at?: string | null;
  issues_sync?: {
    ok?: boolean;
    endpoint_path?: string;
    created?: number;
    updated?: number;
    candidates?: number;
    analyzed_at?: string | null;
    auto_enabled?: boolean;
    message?: string;
  };
  runs: UploadAnalysisRun[];
  errors?: { grain?: Record<string, any>; error: string }[];
};

export type UploadJobStatus = {
  ok: boolean;
  job_id: string;
  endpoint_path: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | string;
  stage: string;
  progress_pct: number;
  message?: string;
  filename?: string;
  file_size_bytes?: number;
  rows_in_file?: number;
  columns_in_file?: number;
  is_large_upload?: boolean;
  result?: Record<string, any> | null;
  error?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  done?: boolean;
  task_active?: boolean;
};

export type UploadActivityRow = {
  uploaded_at?: string | null;
  grain_key?: string | null;
  kpi_field?: string | null;
  expected_value?: number | null;
  tolerance_pct?: number | null;
  upload_source?: string | null;
};

export type MonitoringRunRow = {
  run_id?: string | null;
  endpoint_path?: string | null;
  job_id?: string | null;
  trigger?: string | null;
  source?: string | null;
  status?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
  duration_ms?: number | null;
  grains_processed?: number | null;
  anomalies_detected?: number | null;
  open_issues?: number | null;
  error?: string | null;
};

export type TrendSummaryRow = {
  kpi_field: string;
  latest?: number | null;
  min?: number | null;
  max?: number | null;
  samples?: number | null;
  delta_pct?: number | null;
};

export type KpiSnapshot = {
  kpi_field: string;
  actual_value?: number | null;
  expected_value?: number | null;
  pct_change?: number | null;
  severity?: string | null;
  confidence?: number | null;
};

export type EndpointDetail = {
  endpoint_path: string;
  http_method?: string | null;
  response_model_present?: boolean;
  history?: any[];
  fields?: FieldRole[];
  schema_contract?: SchemaContract;
  setup_blockers?: string[];
  recent_history?: HistoryRow[];
  current_kpis?: KpiSnapshot[];
  trend_summary?: TrendSummaryRow[];
  anomaly_history?: IncidentRecord[];
  upload_activity?: UploadActivityRow[];
  config?: Record<string, any>;
  setup_config?: Record<string, any>;
  metrics?: any[];
  references?: any[];
  operator_metadata?: {
    last_observed_at?: string | null;
    last_upload_at?: string | null;
    last_upload_source?: string | null;
    config_updated_at?: string | null;
    observation_count?: number | null;
    upload_count?: number | null;
    latest_incident_at?: string | null;
    confirmed?: boolean | null;
  };
  monitoring_runs?: MonitoringRunRow[];
  last_upload_analysis?: UploadAnalysisSummary | null;
  upload_analysis_history?: UploadAnalysisSummary[];
};

export type NamedView = {
  id: number;
  name: string;
  currentView: DashboardView | string;
  apiFilter: string;
  apiStatusFilter: string;
  apiBrowserMode?: 'grouped' | 'compact' | 'table';
  apiBrowserDensity?: 'comfortable' | 'compact' | 'dense';
  apiBrowserSort?: string;
  apiBrowserSortDirection?: 'asc' | 'desc';
  apiBrowserColumns?: string[];
  apiBrowserColumnOrder?: string[];
  apiBrowserColumnWidths?: Record<string, number>;
  errorSearch: string;
  errorStatusFilter: string;
  errorCategoryFilter: string;
  errorSeverityFilter: string;
  incidentStatusFilter: string;
  incidentSeverityFilter: string;
  incidentSort: string;
  runSort: string;
  uploadSort: string;
  density: string;
};



export type DashboardState = {
  currentView: DashboardView | string;
  currentApiTab: ApiTab | string;
  selectedApi: string | null;
  apiWorkspaceOpen: boolean;
  selectedIncident: IncidentRecord | null;
  status: StatusPayload | null;
  anomalies: AnomaliesPayload | null;
  scheduler: SchedulerPayload | null;
  detailCache: Map<string, EndpointDetail>;
  apiFilter: string;
  apiStatusFilter: string;
  apiBrowserMode: 'grouped' | 'compact' | 'table';
  apiBrowserDensity: 'comfortable' | 'compact' | 'dense';
  apiBrowserSort: string;
  apiBrowserSortDirection: 'asc' | 'desc';
  apiBrowserColumns: Record<string, boolean>;
  apiBrowserColumnOrder: string[];
  apiBrowserColumnWidths: Record<string, number>;
  errorSearch: string;
  errorStatusFilter: string;
  errorCategoryFilter: string;
  errorSeverityFilter: string;
  incidentStatusFilter: string;
  incidentSeverityFilter: string;
  collapsedGroups: Record<string, boolean>;
  incidentSort: string;
  confirmAction: ConfirmAction;
  incidentPage: number;
  uploadPage: number;
  runPage: number;
  uploadSort: string;
  runSort: string;
  density: string;
  defaultView?: string;
  lastReportData?: any[];
  savedViews?: NamedView[];
  operatorHandle?: string;
  timePreview?: string | null;
  showTimeSettings?: Record<string, boolean>;
  detectedGrain?: string | null;
  grainReason?: string | null;
  detectedTimeSources?: string[];
  driftSuggestions?: Record<string, string>; // { newField: oldField }
  activeApiDetail?: EndpointDetail | null;
  projectsCatalog?: ProjectCatalogItem[];
  activeProjectId?: string | null;
  projectMonitorPolicy?: ProjectMonitorPolicy | null;
  projectHealth?: ProjectHealthPayload | null;
  projectsMonitorSnapshot?: ProjectMonitorSnapshotPayload | null;
  projectRunHistory?: BundleRunRow[];
  projectDigest?: ExecutiveDigestPayload | null;
  poPlaybook?: PoPlaybookPayload | null;
  projectWorkflowMessage?: { kind: 'success' | 'error' | 'info'; text: string } | null;
  incidentsMessage?: { kind: 'success' | 'error' | 'info'; text: string } | null;
  reportsMessage?: { kind: 'success' | 'error' | 'info'; text: string } | null;
  projectPolicyLoadedFor?: string | null;
  autoSuggestSummaryByApi?: Record<
    string,
    {
      headline: string;
      details: string;
      hasSuggestions: boolean;
      updatedAt: string;
    }
  >;
  autoSuggestTriggeredByApi?: Record<string, boolean>;
  coreInsightsByApi?: Record<
    string,
    {
      title: string;
      summary: string;
      kind: 'success' | 'error' | 'info';
      actionType?: 'tab' | 'view';
      actionValue?: string;
      actionLabel?: string;
      updatedAt?: string;
    }
  >;
  poMode?: boolean;
  configFocusExpandedByApi?: Record<string, boolean>;
  activeUploadJobByApi?: Record<string, string>;
  mappingNoSamplesToastByApi?: Record<string, boolean>;
  // Populated during "Check file" to prevent confirming uploads when setup isn't ready.
  uploadConfirmGateByApi?: Record<
    string,
    {
      ready: boolean;
      reason?: string;
      hint?: string;
    }
  >;
  apiDataState?: 'fresh' | 'stale' | 'unavailable' | 'auth_required' | 'error';
  apiDataMessage?: string | null;
  apiDataUpdatedAt?: string | null;
  apiBrowserPage?: number;
  apiBrowserScrollTop?: number;
  apiBrowserVirtualWindowStart?: number;
  apiBrowserVirtualWindowEnd?: number;
};
