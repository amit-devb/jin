import { fmt, fmtDate, incidentRows, reportSummary, state } from './core';
import type { EndpointDetail } from './types';

function decisionLabelFromCounts(issues: number, unconfirmed: number): 'Safe for now' | 'Needs attention' | 'Block release' {
  if (issues > 0) return 'Needs attention';
  if (unconfirmed > 0) return 'Block release';
  return 'Safe for now';
}

function buildOverviewReport() {
  const summary = reportSummary();
  const decision = decisionLabelFromCounts(Number(summary.active_incidents || 0), Number(summary.unconfirmed_endpoints || 0));
  return [
    '# Jin Overview Brief',
    '',
    `Generated: ${fmtDate(summary.generated_at)}`,
    `Decision: ${decision}`,
    `Tracked APIs: ${summary.endpoints_tracked}`,
    `Healthy APIs: ${summary.healthy_endpoints}`,
    `Unconfirmed APIs: ${summary.unconfirmed_endpoints}`,
    `Active incidents: ${summary.active_incidents}`,
    '',
    '## APIs Needing Attention',
    ...((state.status?.endpoints || [])
      .filter((item) => (item.active_anomalies || 0) > 0 || item.status === 'unconfirmed')
      .slice(0, 10)
      .map((item) => `- ${item.http_method} ${item.endpoint_path}: ${item.active_anomalies || 0} incidents, status ${item.status || 'healthy'}`)),
  ].join('\\n');
}

function buildHtmlReport(title: string, sections: Array<{ title: string; body: string }>) {
  const cards = sections.map((section) => `
    <section style="border:1px solid #d8c7ae;border-radius:16px;padding:18px;margin-bottom:14px;background:#fffdf9;">
      <h2 style="margin:0 0 8px;font-size:18px;">${section.title}</h2>
      <div style="color:#473726;font-size:14px;line-height:1.6;white-space:pre-wrap;">${section.body}</div>
    </section>
  `).join('');
  return `
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
</head>
<body style="margin:0;background:#f4efe7;color:#1f1912;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <main style="max-width:980px;margin:0 auto;padding:32px 20px 56px;">
    <header style="margin-bottom:24px;">
      <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.16em;color:#8a6a43;">Jin Report</div>
      <h1 style="margin:10px 0 6px;font-size:34px;line-height:1.05;">${title}</h1>
      <p style="margin:0;color:#5a4937;">Generated ${fmtDate(new Date().toISOString())}</p>
    </header>
    ${cards}
  </main>
</body>
</html>
  `.trim();
}

function buildIncidentReport() {
  const incidents = incidentRows();
  return [
    '# Jin Incident Brief',
    '',
    `Generated: ${fmtDate(new Date().toISOString())}`,
    `Visible incidents: ${incidents.length}`,
    `Filters: status=${state.incidentStatusFilter || 'all'}, severity=${state.incidentSeverityFilter || 'all'}, sort=${state.incidentSort}`,
    '',
    ...incidents.slice(0, 20).map((item) => [
      `## ${item.endpoint_path} • ${item.kpi_field}`,
      `- Status: ${item.status || 'active'}`,
      `- Severity: ${item.severity || 'low'}`,
      `- Target: ${fmt(item.baseline_used)}`,
      `- Actual: ${fmt(item.actual_value)}`,
      `- Delta: ${fmt(item.pct_change)}%`,
      `- Why flagged: ${item.why_flagged || item.ai_explanation || 'No explanation available.'}`,
      `- Change since last healthy run: ${item.change_since_last_healthy_run || 'No comparison available.'}`,
      '',
    ].join('\\n')),
  ].join('\\n');
}

function buildApiReport(detail: EndpointDetail) {
  const trends = detail.trend_summary || [];
  const uploads = detail.upload_activity || [];
  const incidents = detail.anomaly_history || [];
  return [
    `# Jin API Brief: ${detail.endpoint_path}`,
    '',
    `Generated: ${fmtDate(new Date().toISOString())}`,
    `Method: ${detail.http_method || 'GET'}`,
    `Recent runs: ${(detail.recent_history || []).length}`,
    `Open or historical incidents: ${incidents.length}`,
    `Reference uploads: ${uploads.length}`,
    '',
    '## KPI Snapshot',
    ...((detail.current_kpis || []).map((item) => `- ${item.kpi_field}: actual ${fmt(item.actual_value)}, target ${fmt(item.expected_value)}, delta ${fmt(item.pct_change)}%`)),
    '',
    '## Trends',
    ...(trends.map((item) => `- ${item.kpi_field}: latest ${fmt(item.latest)}, min ${fmt(item.min)}, max ${fmt(item.max)}, delta ${fmt(item.delta_pct)}%`)),
  ].join('\\n');
}

function buildOverviewHtmlReport() {
  const summary = reportSummary();
  const decision = decisionLabelFromCounts(Number(summary.active_incidents || 0), Number(summary.unconfirmed_endpoints || 0));
  return buildHtmlReport('Jin Overview Brief', [
    {
      title: 'Summary',
      body: [
        `Decision: ${decision}`,
        `Tracked APIs: ${summary.endpoints_tracked}`,
        `Healthy APIs: ${summary.healthy_endpoints}`,
        `Unconfirmed APIs: ${summary.unconfirmed_endpoints}`,
        `Active incidents: ${summary.active_incidents}`,
      ].join('\\n'),
    },
    {
      title: 'APIs Needing Attention',
      body: (state.status?.endpoints || [])
        .filter((item) => (item.active_anomalies || 0) > 0 || item.status === 'unconfirmed')
        .slice(0, 12)
        .map((item) => `${item.http_method} ${item.endpoint_path} • ${item.active_anomalies || 0} incidents • ${item.status || 'healthy'}`)
        .join('\\n') || 'No APIs currently require attention.',
    },
  ]);
}

function buildIncidentsHtmlReport() {
  const incidents = incidentRows();
  return buildHtmlReport('Jin Incident Brief', incidents.slice(0, 20).map((item) => ({
    title: `${item.endpoint_path} • ${item.kpi_field}`,
    body: [
      `Status: ${item.status || 'active'}`,
      `Severity: ${item.severity || 'low'}`,
      `Target: ${fmt(item.baseline_used)}`,
      `Actual: ${fmt(item.actual_value)}`,
      `Delta: ${fmt(item.pct_change)}%`,
      `Why flagged: ${item.why_flagged || item.ai_explanation || 'No explanation available.'}`,
      `Last healthy comparison: ${item.change_since_last_healthy_run || 'No comparison available.'}`,
    ].join('\\n'),
  })));
}

function buildApiHtmlReport(detail: EndpointDetail) {
  return buildHtmlReport(`Jin API Brief: ${detail.endpoint_path}`, [
    {
      title: 'API Snapshot',
      body: [
        `Method: ${detail.http_method || 'GET'}`,
        `Recent runs: ${(detail.recent_history || []).length}`,
        `Historical incidents: ${(detail.anomaly_history || []).length}`,
        `Reference uploads: ${(detail.upload_activity || []).length}`,
      ].join('\\n'),
    },
    {
      title: 'KPI Snapshot',
      body: (detail.current_kpis || [])
        .map((item) => `${item.kpi_field}: actual ${fmt(item.actual_value)}, target ${fmt(item.expected_value)}, delta ${fmt(item.pct_change)}%`)
        .join('\\n') || 'No KPI snapshot available.',
    },
    {
      title: 'Trend Summary',
      body: (detail.trend_summary || [])
        .map((item) => `${item.kpi_field}: latest ${fmt(item.latest)}, min ${fmt(item.min)}, max ${fmt(item.max)}, delta ${fmt(item.delta_pct)}%`)
        .join('\\n') || 'No trend summary available.',
    },
  ]);
}

export {
  buildOverviewReport,
  buildHtmlReport,
  buildIncidentReport,
  buildApiReport,
  buildOverviewHtmlReport,
  buildIncidentsHtmlReport,
  buildApiHtmlReport,
};
