from __future__ import annotations

from jin.branding import JIN_MARK_SVG

DASHBOARD_BODY = r"""
<body data-theme="dark" data-maintainer="0">
  <div class="app-shell">
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-left">
          <button class="sidebar-toggle" id="sidebar-toggle" type="button" aria-label="Toggle sidebar">
            <span class="nav-icon" aria-hidden="true">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
                <path d="M6 7.25h8M6 10h8M6 12.75h8"/>
              </svg>
            </span>
          </button>
          <div class="brand-icon" aria-hidden="true">
            {jin_mark_svg}
          </div>
          <div class="brand-mark">
            <h1>Jin</h1>
          </div>
        </div>
      </div>

      <nav class="nav" id="nav">
        <button class="active" data-view="overview" type="button">
          <span class="nav-icon" aria-hidden="true">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 10.25 10 5l6 5.25"/>
              <path d="M5.5 9.5V15h9V9.5"/>
            </svg>
          </span>
          <span class="nav-label">Overview</span>
        </button>
        <button data-view="playbook" type="button">
          <span class="nav-icon" aria-hidden="true">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4.5 4.5h11v11h-11z"/>
              <path d="M7 7h6M7 10h6M7 13h3"/>
            </svg>
          </span>
          <span class="nav-label">PO Guide</span>
        </button>
        <button data-view="api" type="button">
          <span class="nav-icon" aria-hidden="true">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3.5" y="4" width="13" height="12" rx="2"/>
              <path d="M3.5 8.25h13"/>
            </svg>
          </span>
          <span class="nav-label">APIs</span>
        </button>
        <button data-view="incidents" type="button">
          <span class="nav-icon" aria-hidden="true">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10 4.25 16 15.5H4L10 4.25Z"/>
              <path d="M10 8v3.5"/>
              <circle cx="10" cy="13.1" r=".7" fill="currentColor" stroke="none"/>
            </svg>
          </span>
          <span class="nav-label">Issues</span>
        </button>
        <button data-view="scheduler" type="button">
          <span class="nav-icon" aria-hidden="true">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="10" cy="10" r="6"/>
              <path d="M10 6.8v3.6l2.4 1.4"/>
            </svg>
          </span>
          <span class="nav-label">Watches</span>
        </button>
        <button data-view="reports" type="button">
          <span class="nav-icon" aria-hidden="true">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 4h12v12H4V4z"/>
              <path d="M4 8h12M9 8v8"/>
            </svg>
          </span>
          <span class="nav-label">Reports</span>
        </button>
        <button data-view="settings" type="button">
          <span class="nav-icon" aria-hidden="true">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10 6.25a3.75 3.75 0 1 0 0 7.5 3.75 3.75 0 0 0 0-7.5Z"/>
              <path d="M10 3.75v1.5M10 14.75v1.5M5.94 5.94l1.06 1.06M12.99 12.99l1.06 1.06M3.75 10h1.5M14.75 10h1.5M5.94 14.06 7 13M12.99 7.01l1.06-1.07"/>
            </svg>
          </span>
          <span class="nav-label">Settings</span>
        </button>
      </nav>
      <div class="sidebar-footer">
        <form class="logout-form" action="/jin/logout" method="post">
          <button class="logout-button" id="logout-button" type="submit">
            <span class="nav-icon" aria-hidden="true">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                <path d="M7 5H5.5A1.5 1.5 0 0 0 4 6.5v7A1.5 1.5 0 0 0 5.5 15H7"/>
                <path d="M11 13.5 14.5 10 11 6.5"/>
                <path d="M8 10h6.5"/>
              </svg>
            </span>
            <span class="nav-label">Logout</span>
          </button>
        </form>
      </div>
    </aside>

    <main class="main">
      <header class="topbar">
        <div class="title-block">
          <h2 id="page-title">Overview</h2>
          <p id="page-subtitle">Review API health, recent changes, and follow-up actions one endpoint at a time.</p>
        </div>
      </header>
      <div class="view-guide" id="view-guide"></div>

      <section class="view active" id="view-overview">
        <div class="metrics" id="overview-metrics"></div>
        <div class="panel">
          <div class="panel-head">
            <div>
              <h3>Summary</h3>
              <p>How this project is doing right now.</p>
            </div>
            <div class="toolbar compact">
              <details class="more-actions">
                <summary>⋯</summary>
                <div class="more-actions-menu">
                  <button class="action secondary" id="export-overview-json" type="button">Export JSON</button>
                  <button class="action secondary" id="export-overview-report" type="button">Export Brief</button>
                  <button class="action secondary" id="export-overview-html" type="button">Export HTML</button>
                </div>
              </details>
            </div>
          </div>
          <div class="chart-grid" id="overview-charts"></div>
        </div>
        <div class="panel">
          <div class="panel-head">
            <div>
              <h3>Next</h3>
              <p>Where to go from here.</p>
            </div>
          </div>
          <div class="stack" id="overview-attention"></div>
        </div>
      </section>

      <section class="view" id="view-playbook">
        <div class="panel playbook-hero-panel">
          <div class="panel-head">
            <div>
              <h3>PO Guide</h3>
              <p>One place to set up monitoring, manage baseline targets, review issues, and share report packs.</p>
            </div>
          </div>
          <div class="playbook-quick-grid">
            <div class="row-card playbook-quick-card" id="playbook-maintainer-setup" style="display:none;">
              <strong>Start & Setup</strong>
              <div class="tiny muted">Register project settings and set baseline targets.</div>
              <div class="toolbar compact" style="margin-top:10px; flex-wrap:wrap;">
                <button class="action" id="po-action-workflow" type="button">Open Setup Workflow</button>
                <button class="action secondary" id="po-action-validation" type="button">Open Baseline Setup</button>
              </div>
            </div>
            <div class="row-card playbook-quick-card">
              <strong>Monitor & Refresh</strong>
              <div class="tiny muted">Run checks, inspect health, and refresh baseline targets when behavior is expected.</div>
              <div class="toolbar compact" style="margin-top:10px; flex-wrap:wrap;">
                <button class="action secondary" id="po-action-checks" type="button">Run Checks Now</button>
                <button class="action secondary" id="po-action-health" type="button">Run Health Check</button>
                <button class="action secondary" id="po-action-baseline" type="button">Refresh Baseline Targets</button>
              </div>
            </div>
            <div class="row-card playbook-quick-card">
              <strong>Share & Communicate</strong>
              <div class="tiny muted">Generate a report pack after issue review to communicate risk and next steps.</div>
              <div class="toolbar compact" style="margin-top:10px; flex-wrap:wrap;">
                <button class="action secondary" id="po-action-report" type="button">Generate Report Pack</button>
              </div>
            </div>
          </div>
        </div>
        <div class="panel" id="po-playbook-content"></div>
        <div class="panel" id="playbook-core-workflow" style="display:none;">
          <div class="panel-head">
            <div>
              <h3>Core Workflow</h3>
              <p>Follow this order: create project, configure run policy, execute checks, review issues, then share outcomes.</p>
            </div>
          </div>
          <div class="row-card playbook-step-card" style="margin-bottom:14px;">
            <strong>1) Create or update this project</strong>
            <div class="control-grid" style="margin-top:10px;">
              <label>
                Project name
                <input id="project-register-name" type="text" placeholder="Retail Revenue API" />
              </label>
            </div>
            <details id="project-register-auth-advanced" style="margin-top:10px;">
              <summary class="tiny" style="cursor:pointer;">Advanced: enable dashboard login now</summary>
              <div class="control-grid" style="margin-top:10px;">
                <label>
                  Username (optional)
                  <input id="project-register-user" type="text" placeholder="operator" />
                </label>
                <label>
                  Password (optional)
                  <input id="project-register-pass" type="password" placeholder="Minimum 8 characters" />
                </label>
              </div>
              <div class="toolbar" style="margin-top:10px;">
                <label class="tiny" style="display:flex; align-items:center; gap:8px;">
                  <input id="project-register-write-env" type="checkbox" />
                  Write credentials to <code>.env</code>
                </label>
              </div>
            </details>
            <div class="toolbar" style="margin-top:10px;">
              <button class="action" id="project-register-button" type="button">Save Project Setup</button>
              <div class="tiny muted">Fast path: name only. Advanced login is optional.</div>
            </div>
          </div>
          <div class="row-card playbook-step-card playbook-step-optional" style="margin-bottom:14px;">
            <strong>2) Switch project or add another (optional)</strong>
            <div class="tiny muted" style="margin-top:8px;">Use this only when you manage multiple data products in one workspace.</div>
            <div class="control-grid" style="margin-top:10px;">
              <label>
                New project name
                <input id="project-add-name" type="text" placeholder="Pricing API" />
              </label>
            </div>
            <details id="project-add-advanced" style="margin-top:10px;">
              <summary class="tiny" style="cursor:pointer;">Advanced: custom root and DB path</summary>
              <div class="control-grid" style="margin-top:10px;">
                <label>
                  Root (optional)
                  <input id="project-add-root" type="text" placeholder="/workspace/project-root" />
                </label>
                <label>
                  DB path (optional)
                  <input id="project-add-db-path" type="text" placeholder="/workspace/.jin/jin.duckdb" />
                </label>
              </div>
            </details>
            <div class="toolbar" style="margin-top:10px;">
              <button class="action secondary" id="project-add-button" type="button">Add Project</button>
            </div>
            <div class="control-grid" style="margin-top:10px;">
              <label>
                Active project
                <select id="project-active-select"></select>
              </label>
            </div>
            <div class="toolbar" style="margin-top:10px;">
              <button class="action secondary" id="project-select-button" type="button">Switch to Selected Project</button>
            </div>
            <details id="project-lifecycle-advanced" style="margin-top:10px;">
              <summary class="tiny" style="cursor:pointer;">Advanced: archive, restore, or delete selected project</summary>
              <div class="control-grid" style="margin-top:10px;">
                <label>
                  Type project name to allow delete
                  <input id="project-delete-confirm" type="text" placeholder="Type selected project name exactly" />
                </label>
              </div>
              <div class="toolbar" style="margin-top:10px; flex-wrap:wrap;">
                <button class="action secondary" id="project-archive-button" type="button">Archive Selected Project</button>
                <button class="action secondary" id="project-restore-button" type="button">Restore Selected Project</button>
                <button class="action ghost" id="project-delete-button" type="button">Delete Selected Project</button>
              </div>
              <div class="tiny muted" style="margin-top:6px;">
                Safe mode: archive first, then type exact project name to delete permanently.
              </div>
            </details>
          </div>
          <div class="row-card playbook-step-card" style="margin-bottom:14px;">
            <strong>3) Set check schedule and target mode</strong>
            <div class="control-grid" style="margin-top:10px;">
              <label>
                Check pace
                <select id="project-policy-cadence">
                  <option value="balanced">Balanced (recommended)</option>
                  <option value="aggressive">Aggressive</option>
                  <option value="conservative">Conservative</option>
                  <option value="custom">Custom</option>
                </select>
              </label>
              <label>
                Run schedule
                <input id="project-policy-schedule" type="text" placeholder="every 2h (recommended), daily 09:00, weekly mon,fri 14:30" />
              </label>
              <label>
                Target mode
                <select id="project-policy-baseline-mode">
                  <option value="fixed">Keep current targets</option>
                  <option value="refresh_before_run">Refresh targets before each check</option>
                </select>
              </label>
              <label>
                Alert sensitivity % (optional)
                <input id="project-policy-threshold" type="number" step="0.1" min="0" placeholder="10" />
              </label>
              <label>
                Report pack schedule
                <input id="project-policy-bundle-schedule" type="text" placeholder="daily 09:00" />
              </label>
              <label>
                Report pack format
                <select id="project-policy-bundle-format">
                  <option value="markdown">Markdown</option>
                  <option value="json">JSON</option>
                </select>
              </label>
            </div>
            <div class="toolbar" style="margin-top:10px;">
              <label class="tiny" style="display:flex; align-items:center; gap:8px;">
                <input id="project-policy-bundle-enabled" type="checkbox" />
                Enable scheduled report packs
              </label>
            </div>
            <div class="toolbar" style="margin-top:10px;">
              <button class="action secondary" id="project-policy-save-button" type="button">Save & Apply Setup</button>
              <button class="action secondary" id="project-policy-apply-button" type="button">Re-Apply Setup</button>
            </div>
          </div>
          <div class="row-card playbook-step-card" style="margin-bottom:14px;">
            <strong>4) Run checks and share outcomes</strong>
            <div class="toolbar" style="margin-top:10px; flex-wrap:wrap;">
              <button class="action" id="project-run-bundle-button" type="button">Run Checks Now</button>
              <button class="action secondary" id="project-baseline-promote-button" type="button">Refresh Baseline Targets</button>
              <button class="action secondary" id="project-health-check-button" type="button">Run Health Check</button>
              <button class="action secondary" id="project-monitor-refresh-button" type="button">Refresh Portfolio Health</button>
              <button class="action secondary" id="project-report-digest-button" type="button">Generate Report Pack</button>
            </div>
          </div>
          <div class="feedback" id="project-workflow-feedback"></div>
          <div class="stack" id="project-workflow-health" style="margin-top:10px;"></div>
          <div class="stack" id="project-workflow-monitor" style="margin-top:10px;"></div>
          <div class="stack" id="project-workflow-runs" style="margin-top:10px;"></div>
          <div class="stack" id="project-workflow-report" style="margin-top:10px;"></div>
        </div>
      </section>

      <section class="view" id="view-api">
        <div class="panel api-browser-panel">
          <div class="panel-head">
            <div>
              <h3>APIs</h3>
              <p>Pick one API, then follow Configure -> Baselines -> Checks.</p>
            </div>
          </div>
          <div class="api-browser-toolbar">
            <input class="api-search" id="api-search" type="search" placeholder="Search APIs" />
            <select id="api-status-filter">
              <option value="">All statuses</option>
              <option value="anomaly">Anomaly</option>
              <option value="warning">Warning</option>
              <option value="healthy">Healthy</option>
              <option value="unconfirmed">Unconfirmed</option>
            </select>
          </div>
          <div class="api-browser-list api-list" id="api-list"></div>
        </div>

        <div class="panel" id="api-empty">
          <div class="empty">Pick one API above to start setup and monitoring.</div>
        </div>

        <div id="api-workspace" class="api-workspace-panel" style="display:none; gap:18px;">
          <div class="panel">
            <div class="panel-head">
              <button class="action secondary api-workspace-close" id="api-workspace-close" type="button" aria-label="Close API details" onclick="closeApiWorkspace()">×</button>
              <div>
                <h3 id="api-title">API</h3>
                <p id="api-subtitle">One endpoint, one place.</p>
              </div>
              <div class="toolbar">
                <button class="action primary" id="check-now-button" title="Trigger a manual monitor check">Check Now</button>
                <a class="action secondary" id="template-csv-link" href="#" download>CSV Template</a>
                <details class="more-actions">
                  <summary>⋯</summary>
                  <div class="more-actions-menu">
                    <a class="action secondary" id="template-xlsx-link" href="#" download>XLSX Template</a>
                  </div>
                </details>
              </div>
            </div>
            <div class="route-line">
              <span class="method" id="api-method">GET</span>
              <span class="route-path" id="api-path">/api/example</span>
            </div>
            <div class="meta-grid" id="api-meta-grid"></div>
          </div>

          <div class="api-layout">
            <div class="panel api-start-panel" id="api-start-panel"></div>

            <div class="panel api-section active" data-api-section="summary">
              <div class="panel-head">
                <div>
                  <h3>At a Glance</h3>
                  <p>Latest API values and what changed.</p>
                </div>
              </div>
              <div class="kpi-grid" id="api-kpis"></div>
              <div class="trend-grid" id="api-trends" style="margin-top:14px;"></div>
              
            </div>

            <div class="panel api-section active" data-api-section="incidents">
              <div class="panel-head">
                <div>
                  <h3>Issues</h3>
                  <p>Recent changes and actions.</p>
                </div>
              </div>
              <div class="history-list" id="api-incident-history"></div>
            </div>

            <div class="api-actions-grid">
              <div class="panel api-section active api-tool-panel" data-api-section="uploads">
                <div class="panel-head">
                  <div>
                    <h3>Upload reference file</h3>
                    <p>Provide your target values to detect anomalies.</p>
                  </div>
                  <button class="action secondary" id="export-uploads" type="button">Export</button>
                </div>

                <details class="advanced-section" id="upload-magic-container" style="margin-bottom:16px;">
                  <summary class="advanced-toggle">Optional: use recent API history as baseline</summary>
                  <div class="advanced-body">
                    <div class="tiny muted" style="margin-bottom:10px;">
                      Use this only if the last 24 hours represent normal behavior for this API.
                    </div>
                    <button class="action secondary" id="magic-baseline-button" type="button" onclick="magicBaseline()">
                      Use recent averages as baseline
                    </button>
                  </div>
                </details>

                <div class="upload-guide-steps">
                  <div class="upload-step">
                    <div class="upload-step-num">1</div>
                    <div class="upload-step-body">
                      <strong>Download the template</strong>
                      <div class="muted" style="margin-top:4px;">Get the pre-built file with the correct columns for this API.</div>
                      <div class="toolbar" style="margin-top:10px;">
                        <a class="action secondary" id="template-csv-link-upload" href="#" download>Download CSV</a>
                        <a class="action secondary" id="template-xlsx-link-upload" href="#" download>Download XLSX</a>
                      </div>
                    </div>
                  </div>

                  <div class="upload-step">
                    <div class="upload-step-num">2</div>
                    <div class="upload-step-body">
                      <strong>Fill in and save the file</strong>
                      <div class="muted" style="margin-top:4px;">Enter one row per segment. Fill in expected numbers for each segment. Save the file.</div>
                    </div>
                  </div>

                  <div class="upload-step">
                    <div class="upload-step-num">3</div>
                    <div class="upload-step-body">
                      <strong>Choose your file</strong>
                      <div class="muted" style="margin-top:4px;">Pick your filled-in CSV or XLSX file.</div>
                      <div class="control-grid" style="margin-top:10px;">
                        <label>
                          Reference file
                          <input id="upload-file" type="file" accept=".csv,.xlsx" />
                        </label>
                      </div>
                      <div class="toolbar" style="margin-top:10px;">
                        <button class="action secondary" id="preview-upload-button" type="button">Check file →</button>
                      </div>
                    </div>
                  </div>

                  <!-- Step 4: Preview (shown after check) -->
                  <div class="upload-step" id="upload-preview-step" style="display:none;">
                    <div class="upload-step-num">4</div>
                    <div class="upload-step-body">
                      <strong>Preview</strong>
                      <div id="upload-preview-body" style="margin-top:10px;"></div>
                      <div class="toolbar" id="upload-confirm-toolbar" style="margin-top:12px; display:none;">
                        <button class="action" id="upload-button" type="button">Confirm upload</button>
                        <button class="action ghost" id="cancel-upload-button" type="button">Change file</button>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="feedback" id="upload-feedback"></div>
                <div id="upload-activity" style="margin-top:12px;"></div>
                
                <!-- Navigation Footer (Step 2) -->
                <div class="api-section-footer" id="uploads-footer" style="margin-top:40px; border-top:1px solid var(--line); padding-top:24px; display:none; justify-content:center; gap:16px;">
                  <button class="action secondary" type="button" onclick="switchApiTab('configuration')" style="padding:12px 24px;">
                    ← Back to Config
                  </button>
                  <button class="action" type="button" onclick="switchApiTab('history')" style="padding:12px 24px;">
                    Next: Monitor API
                  </button>
                </div>
              </div>

              <div class="panel api-section active api-tool-panel" data-api-section="configuration">
                <div class="panel-head">
                  <div>
                    <h3>Configure</h3>
                    <p>Tell Jin what defines each segment and which numbers to monitor.</p>
                  </div>
                </div>

                <!-- Guided steps -->
                <div class="config-guide">
                  <div class="row-card" style="margin-bottom:16px;">
                    <div style="display:flex; align-items:center; justify-content:space-between; gap:12px;">
                      <div>
                        <strong>PO Mode</strong>
                        <div class="tiny muted" style="margin-top:4px;">When enabled, recommended field roles stay locked. Turn this off to edit Segment/KPI/Exclude and time settings.</div>
                      </div>
                      <label class="switch" style="display:flex; align-items:center; gap:8px; white-space:nowrap;">
                        <input id="po-mode-toggle" type="checkbox" />
                        <span class="tiny">Keep it simple</span>
                      </label>
                    </div>
                  </div>

                  <div class="config-guide-step">
                    <div class="config-guide-label">
                      <span class="config-step-badge">1</span>
                      <strong>Define data relationships</strong>
                    </div>
                    <div class="muted" style="margin:6px 0 12px; font-size:13px;">
                      Each field in your API response needs a role. Use the dropdowns below.
                    </div>
                    <div class="field-role-grid" id="field-role-grid"></div>
                  </div>

                  <div class="config-guide-step">
                    <div class="config-guide-label">
                      <span class="config-step-badge">2</span>
                      <strong>Set tolerance</strong>
                    </div>
                    <div class="muted" style="margin:6px 0 12px; font-size:13px;">
                      How much variation is acceptable before an alert fires?
                    </div>
                    <div class="tolerance-simple-row">
                      <label>
                        Allowed variation (%)
                        <input id="config-tolerance-simple" type="number" step="1" min="1" max="100" value="10" oninput="renderFieldRoles()" />
                      </label>
                      <div class="muted" style="font-size:12px; margin-top:6px;">
                        e.g. 10 means ±10% is fine before an alert fires.
                      </div>
                    </div>
                  </div>

                  <!-- Step 3 is rendered dynamically via renderFieldRoles' story card -->
                  <div id="config-step-3-container"></div>
                  <div class="feedback" id="config-feedback"></div>

                  <!-- Advanced: JSON references (collapsed by default) -->
                  <details class="advanced-section" id="advanced-section">
                    <summary class="advanced-toggle">Advanced options</summary>
                    <div class="advanced-body">
                      <div class="control-grid">
                        <label>
                          Relaxed tolerance %
                          <input id="config-relaxed" type="number" step="0.1" />
                        </label>
                        <label>
                          Normal tolerance %
                          <input id="config-normal" type="number" step="0.1" />
                        </label>
                        <label>
                          Strict tolerance %
                          <input id="config-strict" type="number" step="0.1" />
                        </label>
                        <label>
                          Active tolerance tier
                          <select id="config-active-tolerance">
                            <option value="relaxed">Relaxed</option>
                            <option value="normal">Normal</option>
                            <option value="strict">Strict</option>
                          </select>
                        </label>
                      </div>
                      <label style="margin-top:14px; display:block;">
                        Manual references (JSON)
                        <textarea id="config-references" placeholder='[{"grain_key":"...","kpi_field":"revenue","expected_value":100}]'></textarea>
                      </label>
                    </div>
                  </details>
                  
                  <!-- Navigation Footer (Step 1) -->
                  <div class="api-section-footer" id="config-footer" style="margin-top:40px; border-top:1px solid var(--line); padding-top:24px; display:none; justify-content:center;">
                    <button class="action" type="button" onclick="switchApiTab('uploads')" style="padding:12px 24px;">
                      Next: Set Baselines
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div class="panel api-section active" data-api-section="history">
              <div class="panel-head">
                <div>
                  <h3>Checks</h3>
                  <p>Review each run and decide: set baseline, investigate, or continue monitoring.</p>
                </div>
                <div class="toolbar">
                  <button class="action secondary" id="export-runs" type="button">Export</button>
                  <details class="more-actions">
                    <summary>⋯</summary>
                    <div class="more-actions-menu">
                      <button class="action secondary" id="export-runs-json" type="button">Export JSON</button>
                      <button class="action secondary" id="export-api-report" type="button">Export Brief</button>
                      <button class="action secondary" id="export-api-html" type="button">Export HTML</button>
                    </div>
                  </details>
                </div>
                
                <!-- Navigation Footer for Monitor (Step 3) -->
                <div class="api-section-footer" id="summary-footer" style="margin-top:40px; border-top:1px solid var(--line); padding-top:24px; display:none; justify-content:center; gap:16px;">
                  <button class="action secondary" type="button" onclick="switchApiTab('uploads')" style="padding:12px 24px;">
                    ← Back to Baselines
                  </button>
                  <button class="action secondary" type="button" onclick="switchApiTab('configuration')" style="padding:12px 24px;">
                    Edit Config
                  </button>
                </div>
              </div>
              <div id="api-core-insight" style="display:none; margin-bottom:12px;"></div>
              <div id="api-monitoring-progress" style="display:none; margin-bottom:24px;"></div>
              <div id="api-run-table"></div>
            </div>
          </div>
        </div>
      </section>
      <section class="view" id="view-reports">
        <div class="panel">
          <div class="panel-head">
            <div>
              <h3>Reports</h3>
              <p>Create a shareable health snapshot with risks and next actions.</p>
            </div>
          </div>
          <div class="reports-controls-grid">
            <select id="report-endpoint-select">
              <option value="">All tracked APIs</option>
            </select>
            <input type="text" id="report-grain-search" placeholder="Focus note (optional): retailer=amazon" />
            <button class="action" id="run-report-button" type="button">1) Generate Report</button>
            <button class="action secondary" id="export-report-csv" type="button">2) Export CSV</button>
          </div>
          <div class="tiny muted reports-controls-note" style="margin-top:8px;">Pick one API only if you want a focused snapshot. Export can auto-generate if a fresh report is needed.</div>
          <div class="feedback" id="reports-feedback"></div>
          <div id="reports-content" style="margin-top:16px;">
            <div class="empty">Pick an API (optional) and click "1) Generate Report".</div>
          </div>
        </div>
      </section>

      <section class="view" id="view-incidents">
        <div class="panel">
          <div class="panel-head">
            <div>
              <h3>Issues</h3>
              <p>Review project changes, confirm what is expected, and close out anything unresolved.</p>
            </div>
          </div>
          <div class="issues-toolbar-shell">
            <div class="issues-toolbar-row">
              <div class="issues-toolbar-filters">
                <div class="tiny subtle">Filter queue</div>
                <div class="filter-row" id="incident-filters"></div>
              </div>
              <div class="issues-toolbar-actions">
                <label class="issues-sort-control">
                  Sort
                  <select id="incident-sort">
                    <option value="business">Business Impact First (recommended)</option>
                    <option value="severity">Priority First</option>
                    <option value="recent">Newest First</option>
                    <option value="status">By Status</option>
                  </select>
                </label>
                <button class="action ghost" data-view="errors" type="button">View Errors</button>
                <button class="action secondary" id="export-incidents" type="button">Export CSV</button>
                <details class="more-actions">
                  <summary>More Exports</summary>
                  <div class="more-actions-menu">
                    <button class="action secondary" id="export-incidents-json" type="button">Export JSON</button>
                    <button class="action secondary" id="export-incidents-report" type="button">Export Brief</button>
                    <button class="action secondary" id="export-incidents-html" type="button">Export HTML</button>
                  </div>
                </details>
              </div>
            </div>
            <div class="bulk-bar issues-bulk-bar">
              <select id="bulk-action">
                <option value="acknowledged">Mark In Review</option>
                <option value="snoozed">Snooze 60m</option>
                <option value="suppressed">Suppress 60m</option>
                <option value="resolved">Resolve</option>
              </select>
              <input id="bulk-note" type="text" placeholder="Optional note for this update" />
              <button class="action" id="bulk-run" type="button">Apply To Selected</button>
              <span class="tiny" id="bulk-preview">Select one or more issues to apply one action.</span>
            </div>
          </div>
          <div class="feedback" id="incidents-feedback"></div>
          <div id="incidents-list"></div>
        </div>
      </section>

      <section class="view" id="view-scheduler">
        <div class="panel">
          <div class="panel-head">
            <div>
              <h3>Watches</h3>
              <p>Pause, resume, or run now.</p>
            </div>
          </div>
          <div class="stack" id="scheduler-list"></div>
        </div>
      </section>

      <section class="view" id="view-errors">
        <div class="panel">
          <div class="panel-head">
            <div>
              <h3>Errors</h3>
              <p>Problems and what to do next.</p>
            </div>
            <div class="toolbar">
              <button class="action ghost" data-view="incidents" type="button">Back To Issues</button>
              <button class="action secondary" id="export-errors-json" type="button">Export JSON</button>
              <button class="action secondary" id="export-errors-report" type="button">Export Brief</button>
            </div>
          </div>
          <div class="filter-row">
            <input class="api-search" id="error-search" type="search" placeholder="Search errors, endpoints, or hints" />
            <select id="error-status-filter">
              <option value="">All statuses</option>
              <option value="open">Open</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="archived">Archived</option>
            </select>
            <select id="error-category-filter">
              <option value="">All categories</option>
              <option value="Scheduler">Scheduler</option>
              <option value="Upload">Upload</option>
              <option value="Configuration">Configuration</option>
              <option value="Runtime">Runtime</option>
              <option value="General">General</option>
            </select>
            <select id="error-severity-filter">
              <option value="">All severity</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div id="errors-list"></div>
        </div>
      </section>

      <section class="view" id="view-settings">
        <div class="panel">
          <div class="panel-head">
            <div>
              <h3>Settings</h3>
              <p>Simple project and display settings.</p>
            </div>
          </div>
          <div class="settings-simple-grid settings-simple-grid-one">
            <div class="row-card">
              <strong>Display</strong>
              <div class="control-grid">
                <label>
                  Theme
                  <select id="theme-select">
                    <option value="dark">Dark</option>
                    <option value="light">Light</option>
                  </select>
                </label>
                <label>
                  Density
                  <select id="density-select">
                    <option value="comfortable">Comfortable</option>
                    <option value="dense">Dense</option>
                  </select>
                </label>
                <label>
                  Start Page
                  <select id="default-view-select">
                    <option value="api">APIs</option>
                    <option value="overview">Overview</option>
                    <option value="playbook">PO Guide</option>
                    <option value="incidents">Issues</option>
                    <option value="scheduler">Watches</option>
                    <option value="settings">Settings</option>
                  </select>
                </label>
              </div>
            </div>

            <div class="row-card">
              <strong>Security</strong>
              <div id="settings-security" style="margin-top:12px;"></div>
            </div>

            <div class="row-card" id="settings-license-card" style="display:none;">
              <strong>Licensing</strong>
              <div id="settings-license" style="margin-top:12px;"></div>
            </div>

            <div class="row-card">
              <strong>Saved Views</strong>
              <div class="tiny" style="margin-top:10px;">Save a favorite screen if you repeat the same workflow often.</div>
              <div class="control-grid">
                <label>
                  View Name
                  <input id="named-view-input" type="text" placeholder="For example: Revenue team review" />
                </label>
              </div>
              <div class="toolbar" style="margin-top:12px;">
                <button class="action" id="save-named-view" type="button">Save Current View</button>
                <button class="action secondary" id="export-named-views" type="button">Export Views</button>
                <button class="action secondary" id="import-named-views-button" type="button">Import Views</button>
                <input id="import-named-views-file" type="file" accept="application/json" style="display:none;" />
              </div>
              <div class="saved-view-list" id="saved-views"></div>
            </div>

            <div class="row-card">
              <strong>Project</strong>
              <div class="tiny" style="margin-top:10px;">This console runs inside your project. Change <code>JIN_PROJECT_NAME</code>, <code>JIN_DB_PATH</code>, and <code>JIN_LOG_LEVEL</code> in <code>.env</code> if needed.</div>
              <div class="toolbar" style="margin-top:12px;">
                <a class="action secondary" href="http://127.0.0.1:8001">Open local docs</a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  </div>

  <div class="drawer-backdrop" id="incident-drawer-backdrop"></div>
  <aside class="drawer" id="incident-drawer">
    <div class="drawer-head">
      <div>
        <div class="subtle">Incident Detail</div>
        <h3 id="drawer-title" style="margin:6px 0 0;">No incident selected</h3>
      </div>
      <button class="drawer-close" id="drawer-close" type="button">Close</button>
    </div>
    <div class="drawer-body" id="drawer-body"></div>
  </aside>
  <div class="modal-backdrop" id="confirm-backdrop"></div>
  <div class="modal" id="confirm-modal">
    <div class="subtle">Confirm Action</div>
    <h3 id="confirm-title" style="margin:8px 0 0;">Are you sure?</h3>
    <p id="confirm-copy" class="muted" style="margin:10px 0 0;">Please confirm this operator action.</p>
    <div class="modal-actions">
      <button class="action ghost" id="confirm-cancel" type="button">Cancel</button>
      <button class="action" id="confirm-accept" type="button">Continue</button>
    </div>
  </div>
  <!-- Run Detail Drawer -->
  <div class="run-detail-overlay" id="run-detail-drawer" style="display:none;">
    <div class="run-detail-panel" id="run-detail-panel">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:32px;">
        <div>
          <h2 id="run-detail-title" style="margin:0;">Run Details</h2>
          <p id="run-detail-subtitle" class="muted" style="margin:4px 0 0 0;">Historical comparison.</p>
        </div>
        <button class="action secondary" id="run-detail-close">Close</button>
      </div>
      <div id="run-detail-content">
        <!-- Details go here -->
      </div>
    </div>
  </div>

  <div class="toast-stack" id="toast-stack"></div>

"""

DASHBOARD_BODY = DASHBOARD_BODY.replace("{jin_mark_svg}", JIN_MARK_SVG)
