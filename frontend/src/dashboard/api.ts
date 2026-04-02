import { slug, state } from './core';
import type {
  AnomaliesPayload,
  BundleRunHistoryPayload,
  ExecutiveDigestPayload,
  EndpointDetail,
  PoPlaybookPayload,
  ProjectCatalogPayload,
  ProjectHealthPayload,
  ProjectMonitorPolicy,
  ProjectMonitorSnapshotPayload,
  SchedulerPayload,
  StatusPayload,
} from './types';

class DashboardApiError extends Error {
  status?: number;
  url?: string;

  constructor(message: string, status?: number, url?: string) {
    super(message);
    this.name = 'DashboardApiError';
    this.status = status;
    this.url = url;
  }
}

function isRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes('failed to fetch')
    || message.includes('networkerror')
    || message.includes('network request failed')
    || message.includes('connection reset')
    || message.includes('timeout')
    || message.includes('abort')
  );
}

async function fetchJsonOnce<T>(url: string, init?: RequestInit, timeoutMs = 8000): Promise<T> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const headers = new Headers(init?.headers || {});
    if (!headers.has('x-jin-client')) {
      headers.set('x-jin-client', 'dashboard');
    }
    const response = await fetch(url, { ...(init || {}), headers, signal: controller.signal });
    const isJson = (response.headers.get('content-type') || '').includes('application/json');
    const body = isJson ? await response.json() : await response.text();
    if (!response.ok) {
      const detail = typeof body === 'object' && body ? (body as any).detail || (body as any).error : body;
      throw new DashboardApiError(
        `${response.status} ${response.statusText}${detail ? `: ${detail}` : ''}`,
        response.status,
        url,
      );
    }
    return body as T;
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      throw new DashboardApiError(`Request timed out for ${url}`, undefined, url);
    }
    if (error instanceof DashboardApiError) {
      throw error;
    }
    throw new DashboardApiError(error?.message || `Request failed for ${url}`, undefined, url);
  } finally {
    window.clearTimeout(timer);
  }
}

async function fetchJson<T>(url: string, init?: RequestInit, timeoutMs = 8000): Promise<T> {
  const maxAttempts = 5;
  let attempt = 0;
  let lastError: unknown = null;

  while (attempt < maxAttempts) {
    attempt += 1;
    try {
      return await fetchJsonOnce<T>(url, init, timeoutMs);
    } catch (error) {
      lastError = error;
      const shouldRetry = isRetryableError(error) && attempt < maxAttempts;
      if (!shouldRetry) break;
      // Exponential-ish backoff to ride out short server restarts.
      const waitMs = Math.min(250 * (2 ** (attempt - 1)), 2000);
      await new Promise((resolve) => window.setTimeout(resolve, waitMs));
    }
  }
  throw lastError;
}

async function fetchDetail(path: string): Promise<EndpointDetail> {
  if (state.detailCache.has(path)) {
    return state.detailCache.get(path)!;
  }
  const payload = await fetchJson<EndpointDetail>(`/jin/api/v2/endpoint/${slug(path)}`);
  if (payload && payload.config) {
    payload.setup_config = JSON.parse(JSON.stringify(payload.config));
  }
  state.detailCache.set(path, payload);
  return payload;
}

function selectedApiDetail(): EndpointDetail | null {
  return state.selectedApi ? (state.detailCache.get(state.selectedApi) || null) : null;
}

async function refreshStatus(): Promise<void> {
  state.status = await fetchJson<StatusPayload>('/jin/api/v2/status');
}

async function refreshAnomalies(): Promise<void> {
  state.anomalies = await fetchJson<AnomaliesPayload>('/jin/api/v2/anomalies');
}

async function refreshScheduler(): Promise<void> {
  state.scheduler = await fetchJson<SchedulerPayload>('/jin/api/v2/scheduler');
}

async function registerOperator(payload: {
  project_name?: string;
  username?: string;
  password?: string;
  write_env?: boolean;
  monitor_policy?: ProjectMonitorPolicy;
  bootstrap_monitoring?: boolean;
  overwrite_existing_schedule?: boolean;
}): Promise<any> {
  return await fetchJson<any>('/jin/api/v2/projects/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  }, 20000);
}

async function listProjects(includeArchived = true): Promise<ProjectCatalogPayload> {
  const suffix = includeArchived ? '?include_archived=1' : '';
  return await fetchJson<ProjectCatalogPayload>(`/jin/api/v2/projects${suffix}`, undefined, 20000);
}

async function addProject(payload: {
  name: string;
  root?: string;
  db_path?: string;
  monitor_policy?: ProjectMonitorPolicy;
  bootstrap_monitoring?: boolean;
  overwrite_existing_schedule?: boolean;
}): Promise<any> {
  return await fetchJson<any>('/jin/api/v2/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  }, 20000);
}

async function selectProject(projectId: string): Promise<any> {
  return await fetchJson<any>('/jin/api/v2/projects/activate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ project_id: projectId }),
  }, 20000);
}

async function archiveProject(projectId: string): Promise<any> {
  return await fetchJson<any>(`/jin/api/v2/projects/${encodeURIComponent(projectId)}/archive`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  }, 20000);
}

async function restoreProject(projectId: string): Promise<any> {
  return await fetchJson<any>(`/jin/api/v2/projects/${encodeURIComponent(projectId)}/restore`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  }, 20000);
}

async function deleteProject(projectId: string): Promise<any> {
  return await fetchJson<any>(`/jin/api/v2/projects/${encodeURIComponent(projectId)}`, {
    method: 'DELETE',
  }, 20000);
}

async function getProjectMonitorPolicy(projectId: string): Promise<{ project: any; monitor_policy: ProjectMonitorPolicy }> {
  return await fetchJson<{ project: any; monitor_policy: ProjectMonitorPolicy }>(
    `/jin/api/v2/projects/${encodeURIComponent(projectId)}/check-plan`,
    undefined,
    20000,
  );
}

async function setProjectMonitorPolicy(projectId: string, payload: ProjectMonitorPolicy): Promise<any> {
  return await fetchJson<any>(`/jin/api/v2/projects/${encodeURIComponent(projectId)}/check-plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  }, 20000);
}

async function applyProjectMonitorPolicy(
  projectId: string,
  payload: { endpoint_paths?: string[]; overwrite_existing_schedule?: boolean } = {},
): Promise<any> {
  return await fetchJson<any>(`/jin/api/v2/projects/${encodeURIComponent(projectId)}/check-plan/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  }, 20000);
}

async function runProjectBundle(projectId: string, payload: { endpoint_paths?: string[] } = {}): Promise<any> {
  return await fetchJson<any>(`/jin/api/v2/projects/${encodeURIComponent(projectId)}/checks/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  }, 30000);
}

async function listProjectBundleRuns(projectId: string, limit = 20): Promise<BundleRunHistoryPayload> {
  return await fetchJson<BundleRunHistoryPayload>(
    `/jin/api/v2/projects/${encodeURIComponent(projectId)}/checks/history?limit=${encodeURIComponent(String(limit))}`,
    undefined,
    20000,
  );
}

async function promoteProjectBaseline(projectId: string, payload: { endpoints?: string[] } = {}): Promise<any> {
  return await fetchJson<any>(`/jin/api/v2/projects/${encodeURIComponent(projectId)}/baseline/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  }, 30000);
}

async function healthCheck(projectId?: string | null): Promise<ProjectHealthPayload> {
  const suffix = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
  return await fetchJson<ProjectHealthPayload>(`/jin/api/v2/health${suffix}`, undefined, 20000);
}

async function monitorProjects(): Promise<ProjectMonitorSnapshotPayload> {
  return await fetchJson<ProjectMonitorSnapshotPayload>('/jin/api/v2/portfolio/health', undefined, 20000);
}

async function executiveDigest(projectId?: string | null, days = 7, limit = 200): Promise<ExecutiveDigestPayload> {
  const params = new URLSearchParams();
  params.set('days', String(days));
  params.set('limit', String(limit));
  if (projectId) params.set('project_id', projectId);
  return await fetchJson<ExecutiveDigestPayload>(`/jin/api/v2/reports/leadership-digest?${params.toString()}`, undefined, 30000);
}

async function fetchPoPlaybook(): Promise<PoPlaybookPayload> {
  return await fetchJson<PoPlaybookPayload>('/jin/api/v2/po/playbook', undefined, 20000);
}

export {
  DashboardApiError,
  addProject,
  archiveProject,
  applyProjectMonitorPolicy,
  deleteProject,
  executiveDigest,
  fetchPoPlaybook,
  fetchJson,
  fetchDetail,
  getProjectMonitorPolicy,
  healthCheck,
  listProjectBundleRuns,
  listProjects,
  monitorProjects,
  promoteProjectBaseline,
  selectedApiDetail,
  registerOperator,
  restoreProject,
  runProjectBundle,
  refreshStatus,
  refreshAnomalies,
  refreshScheduler,
  selectProject,
  setProjectMonitorPolicy,
};
