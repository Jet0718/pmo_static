// ============================================================================
// 檔案名稱：dashboardApp.js
// 專案名稱：BDM 系統專案進度狀態分析統計模組 (Aras Innovator 12 SP9)
// 職責說明：整合 PortfolioOverviewRenderer、ProjectDetailRenderer、AssigneeWorkloadRenderer，
//           負責事件委派、浮層 Tooltip 防裁切渲染與 Aras 12 SP9 視窗連動。
// ============================================================================

(function (root) {
  "use strict";

  var PMOApi = root.PMOApi || (typeof require !== "undefined" ? require("./arasApiClient.js") : {});
  var PMOStore = root.PMOStore || (typeof require !== "undefined" ? require("./dashboardStore.js") : {});
  var PMOCharts = root.PMOCharts || (typeof require !== "undefined" ? require("./svgChartEngine.js") : {});

  var escapeHtml = PMOCharts.escapeHtml || function (s = "") { return String(s || ""); };

  // 將健康度燈號轉為中文顯示文字
  function getHealthLabelText(light = "GREEN") {
    if (light === "RED") return "紅燈 (嚴重延遲)";
    if (light === "YELLOW") return "黃燈 (進度警示)";
    return "綠燈 (進度正常)";
  }

  // 渲染 Ph 1 ~ Ph 12 微縮色塊矩陣 (供專案總覽列表使用)
  function renderPhaseMiniMatrix(phases = []) {
    var html = '<div class="phase-mini-grid">';
    for (var i = 0; i < 12; i++) {
      var ph = (phases && phases[i]) || { phase_no: i + 1, label: "Ph " + (i + 1), percent_compl: 0, hex_color: "#94A3B8", light: "GRAY" };
      var bg = ph.hex_color || "#94A3B8";
      var tip = ph.label + ": " + ph.percent_compl + "% (" + ph.light + ")";
      html +=
        '<span class="phase-cell" style="background:' + escapeHtml(bg) + ';" data-tooltip="' + escapeHtml(tip) + '" title="' + escapeHtml(tip) + '">' +
          (i + 1) +
        '</span>';
    }
    html += '</div>';
    return html;
  }

  // 渲染全域多專案總覽頁籤 (SUMMARY)
  function renderPortfolioSummaryView(data = null, store = null) {
    // 取得極速團隊長條統計資料 (優先取 store.teamSummaryData，次取 data.team_summary 或本地聚合)
    var teamSummary = (store && store.teamSummaryData) || (data && data.team_summary) || null;
    var selectedTeamId = (store && store.selectedTeamForDrill) || (store && store.filters && store.filters.team_id !== "ALL" ? store.filters.team_id : null);
    var isExpanded = store ? Boolean(store.isDetailExpanded) : Boolean(data && data.summary);

    // 1. 首頁極速展示卡片：執行團隊 (team_id) 專案數量長條統計圖 (隨狀態篩選動態聯動)
    var barChartHtml = "";
    if (teamSummary && typeof PMOCharts.renderTeamActiveProjectsBarChart === "function") {
      var currentFilterState = (store && store.filters && store.filters.state) ? String(store.filters.state) : "Active";
      var dynamicTitle = "各執行團隊專案數量統計";
      var dynamicBadge = "專案總計: ";
      if (currentFilterState.toLowerCase() === "active") {
        dynamicTitle = "各執行團隊進行中 (Active) 專案數量統計";
        dynamicBadge = "進行中專案總計: ";
      } else if (currentFilterState.toLowerCase() === "closed") {
        dynamicTitle = "各執行團隊已結案 (closed) 專案數量統計";
        dynamicBadge = "已結案專案總計: ";
      } else if (currentFilterState.toLowerCase() === "pending") {
        dynamicTitle = "各執行團隊暫停中 (pending) 專案數量統計";
        dynamicBadge = "暫停中專案總計: ";
      } else if (currentFilterState.toUpperCase() === "ALL") {
        dynamicTitle = "各執行團隊專案數量統計 (全部狀態)";
        dynamicBadge = "專案總計: ";
      } else {
        dynamicTitle = "各執行團隊【" + escapeHtml(currentFilterState) + "】專案數量統計";
        dynamicBadge = escapeHtml(currentFilterState) + "專案總計: ";
      }
      var totalProjCount = Number(teamSummary.total_projects !== undefined ? teamSummary.total_projects : (teamSummary.total_active_projects || 0));

      barChartHtml =
        '<div class="pmo-card" style="margin-bottom:16px;">' +
          '<div class="pmo-card-header" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">' +
            '<div>' +
              '<h3 style="margin:0;display:flex;align-items:center;gap:8px;">' +
                '<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#2563eb;"></span>' +
                dynamicTitle +
              '</h3>' +
              '<p style="margin:4px 0 0 0;font-size:12px;color:#64748b;">' +
                '涵蓋 TPS、ICS、PMO、SUS、SHS 與 Other 等團隊 | 點擊長條柱色塊可直接向下展開明細' +
              '</p>' +
            '</div>' +
            '<div style="font-size:13px;font-weight:700;color:#2563eb;background:#eff6ff;padding:4px 12px;border-radius:20px;">' +
              dynamicBadge + totalProjCount + ' 案' +
            '</div>' +
          '</div>' +
          PMOCharts.renderTeamActiveProjectsBarChart(teamSummary, selectedTeamId) +
        '</div>';
    }

    // 2. 若使用者尚未點擊色塊展開明細，顯示高速引導卡片
    if (!isExpanded) {
      var guideHtml =
        '<div class="pmo-card" style="text-align:center;padding:36px 20px;background:#f8fafc;border:2px dashed #cbd5e1;border-radius:12px;">' +
          '<div style="font-size:16px;font-weight:700;color:#1e293b;margin-bottom:8px;">' +
            '🚀 首頁高速概覽已就緒' +
          '</div>' +
          '<p style="color:#64748b;font-size:14px;max-width:620px;margin:0 auto 16px auto;line-height:1.6;">' +
            '系統已先以最快速度載入執行團隊專案數量統計。請<strong>點擊上方長條圖的任一團隊色塊 (如 TPS, ICS, PMO, SUS, SHS, Other)</strong>，或點選下方按鈕展開詳細多專案進度與 Ph 1~12 階段分析。' +
          '</p>' +
          '<button type="button" class="btn-action js-expand-all-teams" style="background:#2563eb;color:#fff;padding:9px 24px;border-radius:6px;font-weight:600;border:none;cursor:pointer;font-size:13px;">' +
            '展開全部專案進度明細 &darr;' +
          '</button>' +
        '</div>';
      return barChartHtml + guideHtml;
    }

    if (!data || !data.summary) {
      return barChartHtml + '<div class="pmo-card">載入詳細統計資料中...</div>';
    }

    var s = data.summary;
    var rag = data.rag_status || {};
    var evm = data.evm_summary || {};
    var projects = data.projects || [];

    var currentScopeText = selectedTeamId && selectedTeamId !== "ALL"
      ? "【" + escapeHtml(selectedTeamId) + " 執行團隊】專案詳細進度與健康度分析"
      : "【全域團隊】多專案進度與健康度詳細分析";

    var expandToolbarHtml =
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;">' +
        '<div style="font-size:15px;font-weight:700;color:#0f172a;display:flex;align-items:center;gap:8px;">' +
          '<span style="width:8px;height:8px;border-radius:50%;background:#10b981;display:inline-block;"></span>' +
          currentScopeText +
        '</div>' +
        '<button type="button" class="btn-action js-collapse-detail" style="background:#f1f5f9;color:#475569;border:1px solid #cbd5e1;padding:5px 14px;border-radius:6px;font-size:12px;cursor:pointer;font-weight:600;">' +
          '收合詳細分析 &uarr;' +
        '</button>' +
      '</div>';

    var kpiHtml =
      '<div class="kpi-grid">' +
        '<div class="kpi-card" style="border-left-color:#2563eb;">' +
          '<span class="kpi-label">納管專案總數 (Total Projects)</span>' +
          '<div class="kpi-value" id="kpi-total-projects">' + s.total_projects + '</div>' +
          '<span class="kpi-sub">Active: ' + s.active_projects + ' | 已結案: ' + s.closed_projects + '</span>' +
        '</div>' +
        '<div class="kpi-card" style="border-left-color:#0ea5e9;">' +
          '<span class="kpi-label">整體平均完成率 (Avg Progress)</span>' +
          '<div class="kpi-value" id="kpi-avg-progress">' + Number(s.avg_progress || 0).toFixed(1) + '%</div>' +
          '<span class="kpi-sub">涵蓋 ' + s.total_team_count + ' 個執行團隊 / ' + s.total_pm_count + ' 位 PM</span>' +
        '</div>' +
        '<div class="kpi-card" style="border-left-color:#10b981;">' +
          '<span class="kpi-label">綠燈正常專案 (Green)</span>' +
          '<div class="kpi-value" id="kpi-green-count" style="color:#10b981;">' + rag.green_count + '</div>' +
          '<span class="kpi-sub">佔比 ' + Number(rag.green_percent || 0).toFixed(1) + '%</span>' +
        '</div>' +
        '<div class="kpi-card" style="border-left-color:#f59e0b;">' +
          '<span class="kpi-label">黃燈警示專案 (Yellow)</span>' +
          '<div class="kpi-value" id="kpi-yellow-count" style="color:#f59e0b;">' + rag.amber_count + '</div>' +
          '<span class="kpi-sub">佔比 ' + Number(rag.amber_percent || 0).toFixed(1) + '%</span>' +
        '</div>' +
        '<div class="kpi-card" style="border-left-color:#ef4444;">' +
          '<span class="kpi-label">紅燈嚴重延遲 (Red)</span>' +
          '<div class="kpi-value" id="kpi-red-count" style="color:#ef4444;">' + rag.red_count + '</div>' +
          '<span class="kpi-sub">逾期未完成任務總計: ' + s.total_overdue_tasks + ' 項</span>' +
        '</div>' +
        '<div class="kpi-card" style="border-left-color:#8b5cf6;">' +
          '<span class="kpi-label">全域 EVM 績效 (SPI / CPI)</span>' +
          '<div class="kpi-value" id="kpi-evm-index">' + Number(evm.avg_spi || 0).toFixed(2) + ' / ' + Number(evm.avg_cpi || 0).toFixed(2) + '</div>' +
          '<span class="kpi-sub">PV: ' + evm.total_planned_value + 'h | EV: ' + evm.total_earned_value + 'h | AC: ' + evm.total_actual_cost + 'h</span>' +
        '</div>' +
      '</div>';

    var chartsHtml =
      '<div class="chart-grid-2">' +
        '<div class="pmo-card">' +
          '<div class="pmo-card-header"><h3>專案健康度燈號分佈 (RAG Health Distribution)</h3></div>' +
          PMOCharts.renderRagDonutSvg(rag) +
        '</div>' +
        '<div class="pmo-card">' +
          '<div class="pmo-card-header"><h3>各執行團隊 (Team) 與專案經理 (PM) 績效對比</h3></div>' +
          PMOCharts.renderGroupComparisonHtml(
            (data.pm_performance && data.pm_performance.length > 0) ? data.pm_performance : (data.team_performance || []),
            (data.pm_performance && data.pm_performance.length > 0) ? "pm_name" : "team_name"
          ) +
        '</div>' +
      '</div>';

    var rowsHtml = "";
    projects.forEach(function (p) {
      var light = p.health_status || "GREEN";
      var barColor = light === "RED" ? "#ef4444" : (light === "YELLOW" ? "#f59e0b" : "#10b981");
      var spiColor = p.spi >= 0.95 ? "#10b981" : (p.spi >= 0.8 ? "#f59e0b" : "#ef4444");
      var cpiColor = p.cpi >= 0.95 ? "#10b981" : (p.cpi >= 0.8 ? "#f59e0b" : "#ef4444");

      // 需求 5：取消獨立下鑽操作欄位，將該欄原本的連結併在專案編號欄中
      rowsHtml +=
        '<tr data-proj-num="' + p.proj_num + '">' +
          '<td>' +
            '<a href="javascript:void(0);" class="pmo-proj-link js-drill-project" data-proj-num="' + p.proj_num + '" title="點擊下鑽查看專案 ' + p.proj_num + ' 階段達成率與成員任務負荷分析">' +
              p.proj_num +
            '</a>' +
            '<br/><small style="color:#64748b;">' + escapeHtml(p.project_type) + '</small>' +
          '</td>' +
          '<td>' +
            '<div style="font-weight:700;color:#0f172a;">' + escapeHtml(p.project_name) + '</div>' +
            '<div style="font-size:12px;color:#64748b;">客戶: ' + escapeHtml(p.customer_name || "-") + ' | 服務中心: ' + escapeHtml(p.territory || "-") + '</div>' +
          '</td>' +
          '<td><div>' + escapeHtml(p.pm_name) + '</div><small style="color:#64748b;">' + escapeHtml(p.team_name) + '</small></td>' +
          '<td><span class="health-badge health-' + light + '"><span class="health-dot"></span>' + getHealthLabelText(light) + '</span></td>' +
          '<td>' +
            '<div class="progress-bar-wrap">' +
              '<div class="progress-track"><div class="progress-fill" style="width:' + Math.min(100, p.actual_progress) + '%;background:' + barColor + ';"></div></div>' +
              '<div class="progress-meta"><span>實際: <strong>' + Number(p.actual_progress).toFixed(1) + '%</strong></span><span>計劃: ' + Number(p.expected_progress).toFixed(1) + '%</span></div>' +
            '</div>' +
          '</td>' +
          '<td>' + renderPhaseMiniMatrix(p.phases) + '</td>' +
          '<td>' +
            '<span style="font-weight:700;color:' + spiColor + ';">' + Number(p.spi).toFixed(2) + '</span> / ' +
            '<span style="font-weight:700;color:' + cpiColor + ';">' + Number(p.cpi).toFixed(2) + '</span>' +
            '<div style="font-size:11px;color:#64748b;">SV: ' + p.cn_sv + ' | CV: ' + p.cn_cv + '</div>' +
          '</td>' +
          '<td>' +
            '<div>完成 ' + p.completed_tasks + ' / 總數 ' + p.total_tasks + '</div>' +
            '<div style="font-size:11px;color:' + (p.overdue_tasks > 0 ? "#ef4444;font-weight:700;" : "#64748b;") + '">逾期: ' + p.overdue_tasks + ' 項 | 延遲: ' + p.delay_days + ' 天</div>' +
          '</td>' +
        '</tr>';
    });

    if (!rowsHtml) {
      rowsHtml = '<tr><td colspan="8" style="text-align:center;padding:28px;color:#64748b;">無符合篩選條件的專案資料</td></tr>';
    }

    var tableHtml =
      '<div class="pmo-card">' +
        '<div class="pmo-card-header">' +
          '<h3>多專案進度狀態與 Ph 1~12 階段總覽表 (共 ' + projects.length + ' 案)</h3>' +
        '</div>' +
        '<div class="table-responsive">' +
          '<table class="pmo-table" id="portfolio-projects-table">' +
            '<thead>' +
              '<tr>' +
                '<th>專案編號 / 類型</th>' +
                '<th>專案名稱 / 客戶 / 服務中心</th>' +
                '<th>專案經理 / 團隊</th>' +
                '<th>健康度燈號</th>' +
                '<th>整體完成率 vs 計劃進度 (cn_plan_compl)</th>' +
                '<th>Ph 1 ~ Ph 12 階段狀態色塊</th>' +
                '<th>SPI / CPI (SV / CV)</th>' +
                '<th>工作任務狀態與延遲天數</th>' +
              '</tr>' +
            '</thead>' +
            '<tbody>' + rowsHtml + '</tbody>' +
          '</table>' +
        '</div>' +
      '</div>';

    return barChartHtml + expandToolbarHtml + kpiHtml + chartsHtml + tableHtml;
  }

  // 渲染單一專案下鑽頁籤：各階段 (Ph 1~12 & WBS Element) 進度達成率與時程偏差 + 專案成員負荷 (PROJECT_DETAIL)
  function renderProjectDetailView(detailData = null, allProjects = []) {
    if (!detailData || !detailData.project) {
      return '<div class="pmo-card">找不到該專案分析資料</div>';
    }
    var p = detailData.project;
    var wbsItems = detailData.wbs_items || [];
    var assignees = detailData.assignees || [];
    var light = p.health_status || "GREEN";

    // 專案切換下拉選單
    var optionsHtml = "";
    (allProjects || []).forEach(function (item) {
      var sel = item.proj_num === p.proj_num ? " selected" : "";
      optionsHtml += '<option value="' + item.proj_num + '"' + sel + '>[' + item.proj_num + '] ' + escapeHtml(item.project_name) + ' (' + item.health_status + ')</option>';
    });

    var headerBanner =
      '<div class="pmo-card" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">' +
        '<div>' +
          '<div style="display:flex;align-items:center;gap:10px;">' +
            '<h2 style="margin:0;font-size:18px;" id="detail-project-title">[' + p.proj_num + '] ' + escapeHtml(p.project_name) + '</h2>' +
            '<span class="health-badge health-' + light + '"><span class="health-dot"></span>' + getHealthLabelText(light) + '</span>' +
          '</div>' +
          '<div style="font-size:12px;color:#475569;margin-top:6px;">' +
            '專案經理 (owned_by_id): <strong>' + escapeHtml(p.pm_name) + '</strong> | ' +
            '執行團隊 (team_id): <strong>' + escapeHtml(p.team_name) + '</strong> | ' +
            '服務中心 (territory): <strong>' + escapeHtml(p.territory) + '</strong> | ' +
            '客戶 (cn_customer): <strong>' + escapeHtml(p.customer_name) + '</strong> | ' +
            '排程起訖: <strong>' + escapeHtml(p.sched_start) + ' ~ ' + escapeHtml(p.sched_due) + '</strong>' +
          '</div>' +
        '</div>' +
        '<div style="display:flex;align-items:center;gap:10px;">' +
          '<label for="select-detail-proj" style="font-size:12px;font-weight:700;">切換專案：</label>' +
          '<select id="select-detail-proj" class="filter-control">' + optionsHtml + '</select>' +
          '<button type="button" class="btn-action btn-secondary" id="btn-back-summary">&larr; 返回多專案總覽</button>' +
        '</div>' +
      '</div>';

    // 單一專案 KPI 摘要
    var kpiHtml =
      '<div class="kpi-grid">' +
        '<div class="kpi-card" style="border-left-color:#2563eb;">' +
          '<span class="kpi-label">整體實際完成率 / 計劃進度</span>' +
          '<div class="kpi-value">' + Number(p.actual_progress).toFixed(1) + '% <small style="font-size:14px;color:#64748b;">/ ' + Number(p.expected_progress).toFixed(1) + '%</small></div>' +
          '<span class="kpi-sub">進度落差: ' + Number(p.progress_gap).toFixed(1) + '% | 延遲天數 (cn_delay_days): ' + p.delay_days + ' 天</span>' +
        '</div>' +
        '<div class="kpi-card" style="border-left-color:#10b981;">' +
          '<span class="kpi-label">EVM 績效指標 (cn_spi / cn_cpi)</span>' +
          '<div class="kpi-value">' + Number(p.spi).toFixed(2) + ' / ' + Number(p.cpi).toFixed(2) + '</div>' +
          '<span class="kpi-sub">時程變異 SV: ' + p.cn_sv + 'h | 成本變異 CV: ' + p.cn_cv + 'h</span>' +
        '</div>' +
        '<div class="kpi-card" style="border-left-color:#f59e0b;">' +
          '<span class="kpi-label">工時統計 (PV / EV / AC)</span>' +
          '<div class="kpi-value" style="font-size:20px;">' + p.planned_value + ' / ' + p.earned_value + ' / ' + p.actual_cost + ' hr</div>' +
          '<span class="kpi-sub">原始規劃人天: ' + p.exp_mandays + ' 天 | 剩餘工時: ' + p.remainder_hours + ' hr</span>' +
        '</div>' +
        '<div class="kpi-card" style="border-left-color:#ef4444;">' +
          '<span class="kpi-label">工作任務與里程碑完成狀態</span>' +
          '<div class="kpi-value">' + p.completed_tasks + ' / ' + p.total_tasks + '</div>' +
          '<span class="kpi-sub">進行中: ' + p.in_progress_tasks + ' | 未開始: ' + p.not_started_tasks + ' | 逾期: <strong style="color:#ef4444;">' + p.overdue_tasks + '</strong></span>' +
        '</div>' +
      '</div>';

    // Ph 1 ~ Ph 12 階段進度與狀態燈號時間軸
    var phasesGridHtml = '<div class="phase-timeline-grid">';
    (p.phases || []).forEach(function (ph) {
      phasesGridHtml +=
        '<div class="phase-detail-card" style="border-top:4px solid ' + escapeHtml(ph.hex_color) + ';">' +
          '<div class="ph-title">' + escapeHtml(ph.label) + '</div>' +
          '<div class="ph-pct" style="color:' + escapeHtml(ph.hex_color) + ';">' + ph.percent_compl + '%</div>' +
          '<div style="font-size:11px;color:#64748b;">燈號: ' + escapeHtml(ph.light) + '</div>' +
        '</div>';
    });
    phasesGridHtml += '</div>';

    var phSectionHtml =
      '<div class="pmo-card">' +
        '<div class="pmo-card-header"><h3>專案主檔 Ph 1 ~ Ph 12 階段完成率與色塊狀態 (percent_compl_1~12 &amp; status_1~12)</h3></div>' +
        phasesGridHtml +
      '</div>';

        // WBS 階段進度達成率與時程偏差分析圖 + 明細表 (嚴格按名稱自然排序升冪：10 -> 20 -> ... -> 60)
    var sortedWbsItems = (wbsItems || []).slice().sort(function (a, b) {
      var nameA = String(a.wbs_name || a.stage_name || "");
      var nameB = String(b.wbs_name || b.stage_name || "");
      return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: "base" });
    });
    var wbsRowsHtml = "";
    sortedWbsItems.forEach(function (w) {
      var varDays = Number(w.schedule_variance_days || 0);
      wbsRowsHtml +=
        '<tr>' +
          '<td><strong>' + escapeHtml(w.wbs_code) + '</strong></td>' +
          '<td><strong>' + escapeHtml(w.wbs_name) + '</strong></td>' +
          '<td>' + escapeHtml(w.classification) + '</td>' +
          '<td>' + escapeHtml(w.sched_start) + ' ~ ' + escapeHtml(w.sched_due) + '</td>' +
          '<td><strong>' + Number(w.completion).toFixed(1) + '%</strong> / ' + Number(w.expected_completion).toFixed(1) + '%</td>' +
          '<td style="color:' + (varDays > 0 ? "#ef4444;font-weight:700;" : "#10b981;font-weight:700;") + '">' + (varDays > 0 ? ("+" + varDays + " 天延遲") : "0 天 (準時)") + '</td>' +
          '<td>' + Number(w.spi).toFixed(2) + ' / ' + Number(w.cpi).toFixed(2) + '</td>' +
          '<td>完成 ' + w.completed_tasks + ' / 進行 ' + w.in_progress_tasks + ' / 逾期 <strong style="color:#ef4444;">' + w.overdue_tasks + '</strong></td>' +
          '<td><span class="health-badge health-' + w.health_light + '"><span class="health-dot"></span>' + w.health_light + '</span></td>' +
        '</tr>';
    });

    var stageAndAssigneeHtml =
      '<div class="chart-grid-2">' +
        '<div class="pmo-card">' +
          '<div class="pmo-card-header"><h3>各階段 (WBS Stage / Milestone) 進度達成率與時程偏差分析</h3></div>' +
          PMOCharts.renderWbsStageDeviationChart(sortedWbsItems) +
        '</div>' +
        '<div class="pmo-card">' +
          '<div class="pmo-card-header"><h3>本專案成員 (Assignee) 任務負荷與完成狀態統計</h3></div>' +
          PMOCharts.renderAssigneeStackedChart(assignees) +
        '</div>' +
      '</div>' +
      '<div class="pmo-card">' +
        '<div class="pmo-card-header"><h3>WBS 主階段與里程碑時程偏差明細表</h3></div>' +
        '<div class="table-responsive">' +
          '<table class="pmo-table" id="wbs-stages-table">' +
            '<thead>' +
              '<tr>' +
                '<th>WBS 編碼</th>' +
                '<th>階段 / 里程碑名稱</th>' +
                '<th>分類</th>' +
                '<th>預計排程起訖日</th>' +
                '<th>實際達成率 / 應有進度</th>' +
                '<th>時程偏差天數</th>' +
                '<th>階段 SPI / CPI</th>' +
                '<th>下轄任務狀態統計</th>' +
                '<th>階段燈號</th>' +
              '</tr>' +
            '</thead>' +
            '<tbody>' + wbsRowsHtml + '</tbody>' +
          '</table>' +
        '</div>' +
      '</div>';

    return headerBanner + kpiHtml + phSectionHtml + stageAndAssigneeHtml;
  }

  // 渲染跨專案成員任務負荷與完成狀態統計頁籤 (ASSIGNEES)
  function renderAssigneeWorkloadView(assigneeData = null) {
    var assignees = (assigneeData && assigneeData.assignees) || [];
    var totalMembers = assignees.length;
    var overloadCount = assignees.filter(function (a) { return a.load_level === "OVERLOAD" || a.load_level === "HIGH"; }).length;
    var totalTasks = assignees.reduce(function (acc, a) { return acc + Number(a.total_tasks || 0); }, 0);
    var totalOverdue = assignees.reduce(function (acc, a) { return acc + Number(a.overdue_tasks || 0); }, 0);

    var kpiHtml =
      '<div class="kpi-grid">' +
        '<div class="kpi-card" style="border-left-color:#2563eb;">' +
          '<span class="kpi-label">納管專案成員總數 (Assignees)</span>' +
          '<div class="kpi-value" id="kpi-assignee-count">' + totalMembers + ' 位</div>' +
          '<span class="kpi-sub">跨專案 Activity2 Assignment 與負責人彙總</span>' +
        '</div>' +
        '<div class="kpi-card" style="border-left-color:#ef4444;">' +
          '<span class="kpi-label">高負荷 / 超載預警成員數</span>' +
          '<div class="kpi-value" style="color:#ef4444;">' + overloadCount + ' 位</div>' +
          '<span class="kpi-sub">負荷等級 HIGH 或 OVERLOAD</span>' +
        '</div>' +
        '<div class="kpi-card" style="border-left-color:#10b981;">' +
          '<span class="kpi-label">指派工作任務總數</span>' +
          '<div class="kpi-value">' + totalTasks + ' 項</div>' +
          '<span class="kpi-sub">含要徑任務與一般工作包</span>' +
        '</div>' +
        '<div class="kpi-card" style="border-left-color:#f59e0b;">' +
          '<span class="kpi-label">成員逾期未完成任務總計</span>' +
          '<div class="kpi-value" style="color:#f59e0b;">' + totalOverdue + ' 項</div>' +
          '<span class="kpi-sub">需優先協助資源調度</span>' +
        '</div>' +
      '</div>';

    var rowsHtml = "";
    assignees.forEach(function (a) {
      var loadColor = a.load_level === "OVERLOAD" ? "#ef4444" : (a.load_level === "HIGH" ? "#f59e0b" : "#10b981");
      rowsHtml +=
        '<tr>' +
          '<td><strong>' + escapeHtml(a.assignee_name) + '</strong></td>' +
          '<td>' + a.project_count + ' 案</td>' +
          '<td><strong>' + a.total_tasks + '</strong></td>' +
          '<td style="color:#10b981;font-weight:700;">' + a.completed_tasks + '</td>' +
          '<td style="color:#2563eb;font-weight:700;">' + a.in_progress_tasks + '</td>' +
          '<td>' + a.not_started_tasks + '</td>' +
          '<td style="color:' + (a.overdue_tasks > 0 ? "#ef4444;font-weight:800;" : "#64748b;") + '">' + a.overdue_tasks + ' (' + a.overdue_rate + '%)</td>' +
          '<td>' + a.critical_tasks + ' 項</td>' +
          '<td><strong>' + Number(a.completion_rate).toFixed(1) + '%</strong></td>' +
          '<td>' + a.total_est_hours + ' hr / ' + a.total_actual_hours + ' hr (剩餘 <strong>' + a.remaining_est_hours + ' hr</strong>)</td>' +
          '<td><span style="font-weight:800;color:' + loadColor + ';">' + escapeHtml(a.load_level) + '</span></td>' +
        '</tr>';
    });

    return (
      kpiHtml +
      '<div class="pmo-card">' +
        '<div class="pmo-card-header"><h3>專案成員 (Assignee) 任務負荷與完成狀態堆疊圖</h3></div>' +
        PMOCharts.renderAssigneeStackedChart(assignees) +
      '</div>' +
      '<div class="pmo-card">' +
        '<div class="pmo-card-header"><h3>專案成員 (Assignee) 任務負荷與工時統計明細表</h3></div>' +
        '<div class="table-responsive">' +
          '<table class="pmo-table" id="assignee-workload-table">' +
            '<thead>' +
              '<tr>' +
                '<th>專案成員 (Assignee)</th>' +
                '<th>參與專案數</th>' +
                '<th>總指派任務</th>' +
                '<th>已完成</th>' +
                '<th>進行中</th>' +
                '<th>未開始</th>' +
                '<th>已逾期 (逾期率)</th>' +
                '<th>要徑任務數</th>' +
                '<th>個人完成率 (%)</th>' +
                '<th>預估工時 / 實報工時 (剩餘工時)</th>' +
                '<th>負荷等級</th>' +
              '</tr>' +
            '</thead>' +
            '<tbody>' + rowsHtml + '</tbody>' +
          '</table>' +
        '</div>' +
      '</div>'
    );
  }

  // 初始化儀表板應用程式並綁定 DOM 互動事件
  function initDashboardApp(targetDoc = null) {
    var doc = targetDoc || (typeof document !== "undefined" ? document : null);
    if (!doc) return null;

    var apiClient = new PMOApi.ArasApiClient();
    var store = new PMOStore.DashboardStateStore(apiClient);
    var viewContainer = doc.getElementById("pmo-view-container");

    // 建立掛載於 document.body 之防裁切全域 Tooltip
    var tooltipEl = doc.getElementById("pmo-global-tooltip");
    if (!tooltipEl && doc.body) {
      tooltipEl = doc.createElement("div");
      tooltipEl.id = "pmo-global-tooltip";
      tooltipEl.className = "pmo-floating-tooltip";
      doc.body.appendChild(tooltipEl);
    }

    function renderApp(currentStore = store) {
      if (!viewContainer) return;

      // 更新頂部 Tab 按鈕狀態
      var tabBtns = doc.querySelectorAll(".pmo-tab-btn");
      for (var i = 0; i < tabBtns.length; i++) {
        var btn = tabBtns[i];
        var t = btn.getAttribute("data-tab");
        if (t === currentStore.activeTab) {
          btn.classList.add("active");
        } else {
          btn.classList.remove("active");
        }
      }

      if (currentStore.activeTab === "PROJECT_DETAIL") {
        var allProjs = (currentStore.summaryData && currentStore.summaryData.projects) || [];
        viewContainer.innerHTML = renderProjectDetailView(currentStore.projectDetailData, allProjs);
      } else if (currentStore.activeTab === "ASSIGNEES") {
        viewContainer.innerHTML = renderAssigneeWorkloadView(currentStore.assigneeWorkloadData);
      } else {
        viewContainer.innerHTML = renderPortfolioSummaryView(currentStore.summaryData, currentStore);
      }
    }

    store.subscribe(renderApp);

    // 綁定頂部導航頁籤點擊事件
    var navContainer = doc.querySelector(".pmo-nav-tabs");
    if (navContainer) {
      navContainer.addEventListener("click", function (ev) {
        var btn = ev.target.closest(".pmo-tab-btn");
        if (!btn) return;
        var tab = btn.getAttribute("data-tab");
        if (tab) {
          store.setActiveTab(tab);
        }
      });
    }

    // 綁定篩選器變更事件
    var filterIds = [
      { id: "filter-state", key: "state" },
      { id: "filter-territory", key: "territory" },
      { id: "filter-team", key: "team_id" },
      { id: "filter-health", key: "health_status" }
    ];
    filterIds.forEach(function (f) {
      var el = doc.getElementById(f.id);
      if (el) {
        el.addEventListener("change", function () {
          var patch = {};
          patch[f.key] = el.value;
          store.updateFilters(patch);
        });
      }
    });

    // 需求 2：專案類型 (cn_project_type 9 大類) 下拉式複選元件監聽與連動
    var typeDropdown = doc.getElementById("multiselect-project-type");
    var typeTrigger = doc.getElementById("type-dropdown-trigger");
    var typePanel = doc.getElementById("type-dropdown-panel");
    var typeText = doc.getElementById("type-dropdown-text");
    var typeCheckboxes = doc.querySelectorAll(".js-filter-type");
    var hiddenTypeInput = doc.getElementById("filter-type");
    var btnTypeSelectAll = doc.getElementById("btn-type-select-all");
    var btnTypeClearAll = doc.getElementById("btn-type-clear-all");
    var btnTypeDefault = doc.getElementById("btn-type-default");

    function updateTypeDropdownDisplay(selectedValues) {
      if (!typeText) return;
      if (selectedValues.length === 0) {
        typeText.textContent = "未選擇專案類型 (0 項)";
      } else if (selectedValues.length === typeCheckboxes.length) {
        typeText.textContent = "全部專案類型 (全選 " + selectedValues.length + " 項)";
      } else {
        var preview = selectedValues.slice(0, 2).join(", ");
        if (selectedValues.length > 2) {
          preview += " 等 " + selectedValues.length + " 項";
        }
        typeText.textContent = "已選 " + selectedValues.length + " 項 (" + preview + ")";
      }
    }

    function handleTypeCheckboxChange() {
      var selected = [];
      for (var i = 0; i < typeCheckboxes.length; i++) {
        if (typeCheckboxes[i].checked) {
          selected.push(typeCheckboxes[i].value);
        }
      }
      var typeVal = selected.join(",");
      if (hiddenTypeInput) hiddenTypeInput.value = typeVal;
      updateTypeDropdownDisplay(selected);
      store.updateFilters({ project_type: typeVal || "NONE" });
    }

    for (var tc = 0; tc < typeCheckboxes.length; tc++) {
      typeCheckboxes[tc].addEventListener("change", handleTypeCheckboxChange);
    }

    // 點擊觸發鈕開啟/關閉下拉面板
    if (typeTrigger && typeDropdown) {
      typeTrigger.addEventListener("click", function (e) {
        e.stopPropagation();
        var isOpen = typeDropdown.classList.contains("open");
        if (isOpen) {
          typeDropdown.classList.remove("open");
          typeTrigger.classList.remove("active");
          typeTrigger.setAttribute("aria-expanded", "false");
        } else {
          typeDropdown.classList.add("open");
          typeTrigger.classList.add("active");
          typeTrigger.setAttribute("aria-expanded", "true");
        }
      });
    }

    // 點擊面板內部不冒泡，防止自動關閉
    if (typePanel) {
      typePanel.addEventListener("click", function (e) {
        e.stopPropagation();
      });
    }

    // 點擊頁面其他空白處自動收合下拉面板
    doc.addEventListener("click", function () {
      if (typeDropdown && typeDropdown.classList.contains("open")) {
        typeDropdown.classList.remove("open");
        if (typeTrigger) {
          typeTrigger.classList.remove("active");
          typeTrigger.setAttribute("aria-expanded", "false");
        }
      }
    });

    // 快捷鍵：全選
    if (btnTypeSelectAll) {
      btnTypeSelectAll.addEventListener("click", function (e) {
        e.stopPropagation();
        for (var i = 0; i < typeCheckboxes.length; i++) {
          typeCheckboxes[i].checked = true;
        }
        handleTypeCheckboxChange();
      });
    }

    // 快捷鍵：清除
    if (btnTypeClearAll) {
      btnTypeClearAll.addEventListener("click", function (e) {
        e.stopPropagation();
        for (var i = 0; i < typeCheckboxes.length; i++) {
          typeCheckboxes[i].checked = false;
        }
        handleTypeCheckboxChange();
      });
    }

    // 快捷鍵：恢復預設 (1.Standard & 2.Professional)
    if (btnTypeDefault) {
      btnTypeDefault.addEventListener("click", function (e) {
        e.stopPropagation();
        for (var i = 0; i < typeCheckboxes.length; i++) {
          var val = typeCheckboxes[i].value;
          typeCheckboxes[i].checked = (val === "1.Standard" || val === "2.Professional");
        }
        handleTypeCheckboxChange();
      });
    }

    var kwInput = doc.getElementById("filter-keyword");
    if (kwInput) {
      kwInput.addEventListener("input", function () {
        store.updateFilters({ keyword: kwInput.value });
      });
    }

    var btnReset = doc.getElementById("btn-reset-filters");
    if (btnReset) {
      btnReset.addEventListener("click", function () {
        var elState = doc.getElementById("filter-state");
        if (elState) elState.value = "Active";

        for (var i = 0; i < typeCheckboxes.length; i++) {
          typeCheckboxes[i].checked = true;
        }
        if (hiddenTypeInput) hiddenTypeInput.value = "1.Standard,2.Professional";

        var elTerr = doc.getElementById("filter-territory");
        if (elTerr) elTerr.value = "ALL";
        var elTeam = doc.getElementById("filter-team");
        if (elTeam) elTeam.value = "ALL";
        var elHealth = doc.getElementById("filter-health");
        if (elHealth) elHealth.value = "ALL";

        if (kwInput) kwInput.value = "";
        store.resetFilters();
      });
    }

    // 綁定內容區域委派事件 (下鑽單一專案、點擊長條圖色塊展開明細、展開全部、收合詳細分析)
    if (viewContainer) {
      viewContainer.addEventListener("click", function (ev) {
        // 1. 點擊長條圖色塊或團隊群組展開該團隊明細 (需求 1 & 使用者指定)
        var teamBar = ev.target.closest(".js-team-bar-item") || ev.target.closest(".team-bar-group");
        if (teamBar) {
          var teamId = teamBar.getAttribute("data-team-id") || "ALL";
          var elTeam = doc.getElementById("filter-team");
          if (elTeam) elTeam.value = teamId;
          store.expandTeamDetail(teamId);
          return;
        }

        // 2. 點擊展開全部團隊專案明細按鈕
        var expandAllBtn = ev.target.closest(".js-expand-all-teams");
        if (expandAllBtn) {
          var elTeamAll = doc.getElementById("filter-team");
          if (elTeamAll) elTeamAll.value = "ALL";
          store.expandTeamDetail("ALL");
          return;
        }

        // 3. 點擊收合詳細分析按鈕
        var collapseBtn = ev.target.closest(".js-collapse-detail");
        if (collapseBtn) {
          store.collapseDetail();
          return;
        }

        // 4. 點擊專案編號 (或下鑽連結) 切換至單一專案下鑽視圖 (需求 5)
        var drillBtn = ev.target.closest(".js-drill-project");
        if (drillBtn) {
          var projNum = Number(drillBtn.getAttribute("data-proj-num") || 0);
          store.setActiveTab("PROJECT_DETAIL", projNum);
          return;
        }
        var backBtn = ev.target.closest("#btn-back-summary");
        if (backBtn) {
          store.setActiveTab("SUMMARY");
        }
      });

      viewContainer.addEventListener("change", function (ev) {
        if (ev.target && ev.target.id === "select-detail-proj") {
          var newProjNum = Number(ev.target.value || 0);
          store.setActiveTab("PROJECT_DETAIL", newProjNum);
        }
      });

      // Ph 1~12 浮層 Tooltip 防裁切顯示
      viewContainer.addEventListener("mouseover", function (ev) {
        var cell = ev.target.closest(".phase-cell");
        if (cell && tooltipEl) {
          var text = cell.getAttribute("data-tooltip") || "";
          tooltipEl.textContent = text;
          tooltipEl.style.display = "block";
          var rect = cell.getBoundingClientRect();
          tooltipEl.style.left = Math.max(8, rect.left - 20) + "px";
          tooltipEl.style.top = Math.max(8, rect.top - 38) + "px";
        }
      });

      viewContainer.addEventListener("mouseout", function (ev) {
        var cell = ev.target.closest(".phase-cell");
        if (cell && tooltipEl) {
          tooltipEl.style.display = "none";
        }
      });
    }

    store.refreshActiveView();
    return store;
  }

  var exported = {
    getHealthLabelText: getHealthLabelText,
    renderPhaseMiniMatrix: renderPhaseMiniMatrix,
    renderPortfolioSummaryView: renderPortfolioSummaryView,
    renderProjectDetailView: renderProjectDetailView,
    renderAssigneeWorkloadView: renderAssigneeWorkloadView,
    initDashboardApp: initDashboardApp
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = exported;
  }
  if (root) {
    root.PMODashboardApp = exported;
  }
})(typeof window !== "undefined" ? window : globalThis);
