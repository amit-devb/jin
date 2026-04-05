import type { NumberTuple } from './types';
import type { EndpointDetail, EndpointStatus, IncidentRecord } from './types';

function sparklineSvg(values: Array<number | null | undefined>) {
  if (!values.length) return '';
  const nums = values.map((value) => Number(value)).filter((value) => Number.isFinite(value));
  if (!nums.length) return '';
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const range = max - min || 1;
  const points = nums.map((value, index) => {
    const x = nums.length === 1 ? 0 : (index / (nums.length - 1)) * 100;
    const y = 100 - (((value - min) / range) * 100);
    return `${x},${y}`;
  }).join(' ');
  return `
    <svg class="sparkline" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <polyline fill="none" stroke="var(--accent)" stroke-width="3" points="${points}" />
    </svg>
  `;
}

function incidentVolumeChartSvg(items: Array<Pick<IncidentRecord, 'detected_at' | 'resolved_at'>>) {
  const buckets: Record<string, number> = {};
  items.forEach((item) => {
    const key = String(item.detected_at || item.resolved_at || '').slice(0, 10) || 'unknown';
    buckets[key] = (buckets[key] || 0) + 1;
  });
  const entries = Object.entries(buckets).sort((a, b) => a[0].localeCompare(b[0])).slice(-10) as NumberTuple[];
  if (!entries.length) return '';
  const values = entries.map(([, value]) => value);
  const max = Math.max(...values, 1);
  const barWidth = 100 / entries.length;
  const bars = entries.map(([, value], index) => {
    const height = (value / max) * 78;
    const x = index * barWidth + 4;
    const y = 90 - height;
    return `<rect x="${x}" y="${y}" width="${Math.max(barWidth - 8, 4)}" height="${height}" rx="3" fill="var(--accent)"></rect>`;
  }).join('');
  return `<svg class="chart-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${bars}</svg>`;
}

function statusMixChartSvg(endpoints: EndpointStatus[]) {
  const counts: Record<string, number> = { healthy: 0, warning: 0, anomaly: 0, unconfirmed: 0 };
  endpoints.forEach((item) => {
    const key = counts[item.status] !== undefined ? item.status : 'warning';
    counts[key] += 1;
  });
  const total = Math.max(1, endpoints.length);
  let offset = 0;
  const segments = [
    ['healthy', 'var(--healthy)'],
    ['warning', 'var(--warning)'],
    ['anomaly', 'var(--anomaly)'],
    ['unconfirmed', 'var(--ink-muted)'],
  ].map(([name, color]) => {
    const width = (counts[name] / total) * 100;
    const segment = `<rect x="${offset}" y="18" width="${width}" height="18" rx="4" fill="${color}"></rect>`;
    offset += width;
    return segment;
  }).join('');
  return `<svg class="chart-svg chart-svg-compact" viewBox="0 0 100 56" preserveAspectRatio="none" aria-hidden="true">${segments}</svg>`;
}

function activityMixChartSvg(endpoints: EndpointStatus[]) {
  const rows = endpoints
    .map((item) => [item.endpoint_path, Number(item.observation_count || 0)] as NumberTuple)
    .filter(([, count]) => Number.isFinite(count))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  if (!rows.length) return '';
  const max = Math.max(...rows.map(([, count]) => count), 1);
  const barHeight = 84 / rows.length;
  const bars = rows.map(([label, value], index) => {
    const width = (value / max) * 84;
    const y = index * barHeight + 8;
    return `
      <rect x="12" y="${y}" width="${width}" height="${Math.max(barHeight - 4, 5)}" rx="4" fill="var(--accent)"></rect>
      <text x="14" y="${y + Math.max(barHeight - 4, 5) / 2 + 3}" font-size="5" fill="var(--ink)" opacity="0.86">${String(label).slice(0, 18)}</text>
    `;
  }).join('');
  return `<svg class="chart-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${bars}</svg>`;
}

function kpiTrendChartSvg(detail: EndpointDetail) {
  const seriesByKpi: Record<string, number[]> = {};
  (detail.recent_history || []).forEach((row) => {
    Object.entries(row.kpi_json || {}).forEach(([key, value]) => {
      if (!Number.isFinite(value)) return;
      seriesByKpi[key] = seriesByKpi[key] || [];
      seriesByKpi[key].push(Number(value));
    });
  });
  const colors = ['var(--accent)', 'var(--healthy)', 'var(--warning)', 'var(--anomaly)'];
  const series = Object.entries(seriesByKpi).slice(0, 4) as Array<[string, number[]]>;
  if (!series.length) return '';
  const values = series.flatMap(([, nums]) => nums);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const polylines = series.map(([, nums], idx) => {
    const points = nums.map((value, index) => {
      const x = nums.length === 1 ? 0 : (index / (nums.length - 1)) * 100;
      const y = 100 - (((value - min) / range) * 78 + 10);
      return `${x},${y}`;
    }).join(' ');
    return `<polyline fill="none" stroke="${colors[idx % colors.length]}" stroke-width="2.5" points="${points}" />`;
  }).join('');
  return `<svg class="chart-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${polylines}</svg>`;
}

export {
  sparklineSvg,
  incidentVolumeChartSvg,
  statusMixChartSvg,
  activityMixChartSvg,
  kpiTrendChartSvg,
};
