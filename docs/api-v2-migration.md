# API v2 Migration

Jin now provides a stable versioned operator API at `/jin/api/v2`.

## Scope

The v2 surface focuses on the first-release operator workflow:

1. set up the current project
2. configure upload/check policy
3. run checks
4. refresh baseline
5. monitor and health check
6. generate reports

Legacy `/jin/api/...` routes remain available for backward compatibility.

Legacy responses for this core surface now include:

- `Deprecation: true`
- `Sunset: Thu, 31 Dec 2026 23:59:59 GMT`
- `Link: </jin/api/v2/migration>; rel="deprecation"; type="application/json"`

## Core Mapping

- `POST /jin/api/register` -> `POST /jin/api/v2/projects/register`
- `GET /jin/api/projects` -> `GET /jin/api/v2/projects`
- `POST /jin/api/projects` -> `POST /jin/api/v2/projects`
- `POST /jin/api/projects/select` -> `POST /jin/api/v2/projects/activate`
- `GET /jin/api/projects/active` -> `GET /jin/api/v2/projects/current`
- `GET /jin/api/projects/{project_id}/monitor-policy` -> `GET /jin/api/v2/projects/{project_id}/check-plan`
- `POST /jin/api/projects/{project_id}/monitor-policy` -> `POST /jin/api/v2/projects/{project_id}/check-plan`
- `POST /jin/api/projects/{project_id}/monitor-policy/apply` -> `POST /jin/api/v2/projects/{project_id}/check-plan/apply`
- `POST /jin/api/projects/{project_id}/monitor-bootstrap` -> `POST /jin/api/v2/projects/{project_id}/check-plan/bootstrap`
- `POST /jin/api/projects/{project_id}/run-bundle` -> `POST /jin/api/v2/projects/{project_id}/checks/run`
- `GET /jin/api/projects/{project_id}/run-bundle/history` -> `GET /jin/api/v2/projects/{project_id}/checks/history`
- `GET /jin/api/projects/{project_id}/run-bundle/{run_id}` -> `GET /jin/api/v2/projects/{project_id}/checks/{run_id}`
- `GET /jin/api/projects/{project_id}/run-bundle/{run_id}/report` -> `GET /jin/api/v2/projects/{project_id}/checks/{run_id}/report`
- `POST /jin/api/projects/{project_id}/baseline/promote` -> `POST /jin/api/v2/projects/{project_id}/baseline/refresh`
- `GET /jin/api/projects/monitor` -> `GET /jin/api/v2/portfolio/health`
- `GET /jin/api/status` -> `GET /jin/api/v2/status`
- `GET /jin/api/health` -> `GET /jin/api/v2/health`
- `GET /jin/api/report/summary` -> `GET /jin/api/v2/reports/summary`
- `GET /jin/api/report/executive-digest` -> `GET /jin/api/v2/reports/leadership-digest`
- `GET /jin/api/report/endpoint/{path}` -> `GET /jin/api/v2/reports/endpoint/{path}`
- `GET /jin/api/po/playbook` -> `GET /jin/api/v2/po/playbook`
- `POST /jin/api/upload-preview/{path}` -> `POST /jin/api/v2/upload-preview/{path}`
- `POST /jin/api/upload/{path}` -> `POST /jin/api/v2/upload/{path}`
- `POST /jin/api/check/{path}` -> `POST /jin/api/v2/check/{path}`
- `POST /jin/api/promote-baseline/{path}` -> `POST /jin/api/v2/promote-baseline/{path}`
- `GET/POST /jin/api/v1/query` -> `GET/POST /jin/api/v2/query`

## Migration Steps

1. Move dashboard or client calls to `/jin/api/v2/...`.
2. Keep existing payload formats unchanged.
3. Validate project workflow end-to-end using check-plan, checks, health, and reports.
4. Remove direct usage of legacy route names from external clients when ready.
