// ============================================================================
// 檔案名稱：dashboardApp.js
// 專案名稱：BDM 系統專案進度狀態分析統計模組 (Aras Innovator 12 SP9)
// 職責說明：整合自然語言 NoUI 篩選器、使用者團隊權限預讀控管、PortfolioOverviewRenderer、
//           ProjectDetailRenderer、AssigneeWorkloadRenderer 與跨專案工時回報下鑽 Modal，
//           負責事件委派、浮層防裁切渲染與 Aras 12 SP9 uiShowItem 視窗連動。
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

  // 渲染專案清單左側之 Aras Project Item Icon 按鈕 (需求 4：點擊可在 Aras Innovator 開啟該專案 Item 畫面)
  function renderArasProjectItemIconBtn(projectId = "", projNum = 0, projectName = "") {
    var safeId = escapeHtml(projectId || "");
    var safeNum = escapeHtml(String(projNum || ""));
    var titleText = "在 Aras Innovator 系統中開啟專案 [" + safeNum + "] " + (projectName || "") + " 畫面";
    return (
      '<button type="button" class="aras-item-open-btn js-open-aras-item" ' +
        'data-project-id="' + safeId + '" data-proj-num="' + safeNum + '" ' +
        'title="' + escapeHtml(titleText) + '" aria-label="' + escapeHtml(titleText) + '">' +
        '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
          '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>' +
          '<polyline points="14 2 14 8 20 8"></polyline>' +
          '<line x1="16" y1="13" x2="8" y2="13"></line>' +
          '<line x1="16" y1="17" x2="8" y2="17"></line>' +
        '</svg>' +
      '</button>'
    );
  }

  // 渲染當前登入使用者預讀徽章 (需求 2：顯示 user.team_id.keyed_name 與 user.value_score 與權限狀態)
  function renderUserContextBadgeHtml(userContext = null) {
    if (!userContext) return "";
    var name = escapeHtml(userContext.user_name || userContext.login_name || "系統使用者");
    var team = escapeHtml(userContext.team_code || userContext.raw_team_keyed_name || "未指定");
    var score = escapeHtml(userContext.value_score || "未設定");
    var isRestricted = Boolean(userContext.is_team_restricted);

    var lockLabel = isRestricted
      ? "🔒 限查 " + team + " 團隊"
      : (userContext.is_managed_exec_team ? "🔓 預設 " + team + " (可跨團隊)" : "🌐 全域查詢權限");

    return (
      '<div class="user-context-badge' + (isRestricted ? " restricted" : "") + '" id="current-user-context-badge" ' +
        'title="當前登入者: ' + name + ' | 團隊 (user.team_id.keyed_name): ' + team + ' | 職等 (user.value_score): ' + score + '">' +
        '<span>👤 ' + name + '</span>' +
        '<span>| 團隊: <strong>' + team + '</strong></span>' +
        '<span>| 職等: <strong>' + score + '</strong></span>' +
        '<span>(' + lockLabel + ')</span>' +
      '</div>'
    );
  }

  // 渲染自然語言 NoUI 常用條件提示標籤 (需求 1 & 需求 2)
  function renderNoUiPromptChipsHtml(store = null) {
    var chips = PMOApi.COMMON_NL_PROMPT_CHIPS || [];
    var uCtx = (store && store.userContext) || null;
    var currentNl = String((store && store.naturalQuery) || "").trim();
    var html = "";

    chips.forEach(function (chip) {
      var isCrossTeamBlocked = Boolean(
        uCtx &&
        uCtx.is_team_restricted &&
        chip.team_only &&
        chip.team_only.toUpperCase() !== String(uCtx.team_code || "").toUpperCase()
      );
      var isActive = currentNl && currentNl.toLowerCase() === String(chip.query || "").toLowerCase();
      var cls = "noui-prompt-chip js-nl-prompt-chip" +
                (isActive ? " active" : "") +
                (isCrossTeamBlocked ? " disabled-chip" : "");
      var tip = isCrossTeamBlocked
        ? ("您的職等 (" + (uCtx.value_score || "未設定") + ") 限制僅能查詢所屬 " + uCtx.team_code + " 團隊")
        : ("點擊套用條件：" + chip.query);

      html +=
        '<button type="button" class="' + cls + '" data-nl-query="' + escapeHtml(chip.query) + '" title="' + escapeHtml(tip) + '">' +
          escapeHtml(chip.label) +
        '</button>';
    });
    return html;
  }

  // 取得停滯歸因之繁體中文顯示標籤
  function getStallReasonLabel(code = "") {
    var c = String(code || "").trim().toLowerCase();
    if (c === "wait_cust_system") return "等待客戶系統一併上線";
    if (c === "commercial_dispute") return "商務/驗收追加款爭議";
    if (c === "cust_hold") return "客戶端專案暫停/延後";
    if (c === "cust_scope_change") return "客戶需求規格重大變更";
    if (c === "internal_bottleneck") return "內部團隊資源/技術瓶頸";
    return c || "無";
  }

  // 渲染專案阻礙停滯歸因與實質完工標籤徽章 (需求：區分外部非團隊因素與真落後，消除統計污染)
  function renderProjectStallBadges(p = {}) {
    var html = "";
    if (p.stall_type === "EXTERNAL") {
      var extLabel = p.stall_reason_label || getStallReasonLabel(p.stall_reason);
      html += '<span class="badge-stall badge-stall-external" title="非團隊內部因素阻礙：' + escapeHtml(extLabel) + '">⏳ ' + escapeHtml(extLabel) + '</span>';
    } else if (p.stall_type === "COMMERCIAL") {
      var comLabel = p.stall_reason_label || getStallReasonLabel(p.stall_reason);
      html += '<span class="badge-stall badge-stall-commercial" title="商務合約爭議：' + escapeHtml(comLabel) + '">📑 ' + escapeHtml(comLabel) + '</span>';
    } else if (p.stall_type === "INTERNAL") {
      html += '<span class="badge-stall badge-stall-internal" title="內部團隊執行落後，需介入排除瓶頸">🚨 團隊真落後</span>';
    }

    if (p.is_substantially_completed) {
      var pct = Number(p.actual_progress || 0).toFixed(0);
      html += '<span class="badge-stall badge-stall-substantial" title="主要任務已實質完成 (' + pct + '%)，僅餘少數驗收收尾事項">🏁 實質完工 (' + pct + '%)</span>';
    }
    return html;
  }

  // 渲染當前自然語言解析後生效的篩選條件摘要膠囊與權限提示 (需求 1 & 需求 2)
  function renderActiveFilterSummaryHtml(store = null) {
    var f = (store && store.filters) || {
      state: "Active",
      project_type: "1.Standard,2.Professional",
      territory: "ALL",
      team_id: "ALL",
      health_status: "ALL",
      filter_blocked: "all",
      stall_reason: "ALL",
      is_substantially_completed: "",
      keyword: ""
    };
    var notice = (store && store.restrictionNotice) || "";

    var html =
      '<span style="color:#64748b;font-weight:700;">目前生效篩選：</span>' +
      '<span class="active-filter-pill highlight">狀態: ' + escapeHtml(f.state) + '</span>' +
      '<span class="active-filter-pill highlight">類型: ' + escapeHtml(f.project_type) + '</span>' +
      '<span class="active-filter-pill' + (f.team_id !== "ALL" ? " highlight" : "") + '">執行團隊: ' + escapeHtml(f.team_id) + '</span>' +
      '<span class="active-filter-pill' + (f.territory !== "ALL" ? " highlight" : "") + '">服務中心: ' + escapeHtml(f.territory) + '</span>' +
      '<span class="active-filter-pill' + (f.health_status !== "ALL" ? " highlight" : "") + '">健康度燈號: ' + escapeHtml(f.health_status) + '</span>';

    if (f.filter_blocked === "exclude_external") {
      html += '<span class="active-filter-pill highlight filter-pill-purify">🛡️ 排除外部受阻 (淨化戰況)</span>';
    } else if (f.filter_blocked === "only_external") {
      html += '<span class="active-filter-pill highlight filter-pill-blocked">⏳ 僅檢視外部受阻專案</span>';
    }

    if (f.stall_reason && f.stall_reason !== "ALL") {
      html += '<span class="active-filter-pill highlight">阻礙歸因: ' + escapeHtml(getStallReasonLabel(f.stall_reason)) + '</span>';
    }

    if (f.is_substantially_completed === "true") {
      html += '<span class="active-filter-pill highlight filter-pill-substantial">🏁 實質完工待收尾</span>';
    }

    if (f.keyword) {
      html += '<span class="active-filter-pill highlight">關鍵字: ' + escapeHtml(f.keyword) + '</span>';
    }
    if (notice) {
      html += '<span class="noui-restriction-notice" id="noui-restriction-alert">' + escapeHtml(notice) + '</span>';
    }
    return html;
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
    var teamSummary = (store && store.teamSummaryData) || (data && data.team_summary) || null;
    var selectedTeamId = (store && store.selectedTeamForDrill) || (store && store.filters && store.filters.team_id !== "ALL" ? store.filters.team_id : null);
    var isExpanded = store ? Boolean(store.isDetailExpanded) : Boolean(data && data.summary);

    // 1. 首頁極速展示卡片：執行團隊 (team_id) 專案數量長條統計圖
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
      var uCtx = (store && store.userContext) || null;
      var expandBtnText = (uCtx && uCtx.is_team_restricted && uCtx.team_code)
        ? ("展開 " + escapeHtml(uCtx.team_code) + " 團隊專案進度明細 &darr;")
        : "展開全部專案進度明細 &darr;";

      var guideHtml =
        '<div class="pmo-card" style="text-align:center;padding:36px 20px;background:#f8fafc;border:2px dashed #cbd5e1;border-radius:12px;">' +
          '<div style="font-size:16px;font-weight:700;color:#1e293b;margin-bottom:8px;">' +
            '🚀 首頁高速概覽已就緒' +
          '</div>' +
          '<p style="color:#64748b;font-size:14px;max-width:620px;margin:0 auto 16px auto;line-height:1.6;">' +
            '系統已先以最快速度載入執行團隊專案數量統計。請<strong>點擊上方長條圖的任一團隊色塊 (如 TPS, ICS, PMO, SUS, SHS, Other)</strong>，或點選下方按鈕展開詳細多專案進度與 Ph 1~12 階段分析。' +
          '</p>' +
          '<button type="button" class="btn-action js-expand-all-teams" style="background:#2563eb;color:#fff;padding:9px 24px;border-radius:6px;font-weight:600;border:none;cursor:pointer;font-size:13px;">' +
            expandBtnText +
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
          '<span class="kpi-sub">合約落後: ' + rag.red_count + ' 案 | 團隊真落後: ' + (((data.operational_rag && data.operational_rag.red_count) !== undefined) ? data.operational_rag.red_count : rag.red_count) + ' 案</span>' +
        '</div>' +
        '<div class="kpi-card" style="border-left-color:#8b5cf6;">' +
          '<span class="kpi-label">外部非團隊受阻 (Blocked)</span>' +
          '<div class="kpi-value" id="kpi-blocked-count" style="color:#8b5cf6;">' + ((data.operational_rag && data.operational_rag.blocked_count) || 0) + '</div>' +
          '<span class="kpi-sub">等客戶系統/商務爭議 | 不給懲罰性紅燈</span>' +
        '</div>' +
        '<div class="kpi-card" style="border-left-color:#3b82f6;">' +
          '<span class="kpi-label">實質完工待收尾 (>=85%)</span>' +
          '<div class="kpi-value" id="kpi-substantial-count" style="color:#3b82f6;">' + (data.substantially_completed_count || 0) + '</div>' +
          '<span class="kpi-sub">主任務達標 | 全域 EVM: ' + Number(evm.avg_spi || 0).toFixed(2) + ' / ' + Number(evm.avg_cpi || 0).toFixed(2) + '</span>' +
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

      // 雙軌健康度與阻礙徽章渲染
      var healthHtml = '<span class="health-badge health-' + light + '"><span class="health-dot"></span>' + getHealthLabelText(light) + '</span>';
      if (p.operational_health && p.operational_health !== light) {
        var opCls = p.operational_health === "BLOCKED" ? "op-health-blocked" : (p.operational_health === "SUBSTANTIAL" ? "op-health-substantial" : "op-health-" + p.operational_health);
        var opText = p.operational_health === "BLOCKED" ? "🛡️ 外部受阻" : (p.operational_health === "SUBSTANTIAL" ? "🏁 實質完工" : p.operational_health);
        healthHtml += '<div style="margin-top:4px;"><span class="op-health-badge ' + opCls + '" title="內部團隊執行健康度：' + opText + '">' + opText + '</span></div>';
      }

      var delayTextHtml = "";
      if (p.stall_type === "EXTERNAL" || p.stall_type === "COMMERCIAL") {
        delayTextHtml = '<span style="color:#10b981;font-weight:700;" title="非內部團隊因素停滯，延遲工作天數校正為 0 天">校正延遲: 0 天</span> <small style="color:#94a3b8;text-decoration:line-through;" title="合約原始排程延遲 ' + p.delay_days + ' 天">(' + p.delay_days + '天)</small>';
      } else {
        delayTextHtml = '延遲: ' + p.delay_days + ' 天';
      }

      // 需求 4：在專案清單左側增加一個 Item Icon，點擊可在 Aras Innovator 系統中開啟該專案 Item 畫面
      rowsHtml +=
        '<tr data-proj-num="' + p.proj_num + '" data-project-id="' + escapeHtml(p.id || "") + '">' +
          '<td>' +
            '<div class="pmo-proj-cell-flex">' +
              renderArasProjectItemIconBtn(p.id || "", p.proj_num, p.project_name) +
              '<div>' +
                '<a href="javascript:void(0);" class="pmo-proj-link js-drill-project" data-proj-num="' + p.proj_num + '" title="點擊下鑽查看專案 ' + p.proj_num + ' 階段達成率與成員任務負荷分析">' +
                  p.proj_num +
                '</a>' +
                '<br/><small style="color:#64748b;">' + escapeHtml(p.project_type) + '</small>' +
              '</div>' +
            '</div>' +
          '</td>' +
          '<td>' +
            '<div style="font-weight:700;color:#0f172a;display:flex;align-items:center;flex-wrap:wrap;gap:6px;">' +
              escapeHtml(p.project_name) +
              renderProjectStallBadges(p) +
            '</div>' +
            '<div style="font-size:12px;color:#64748b;">客戶: ' + escapeHtml(p.customer_name || "-") + ' | 服務中心: ' + escapeHtml(p.territory || "-") + '</div>' +
          '</td>' +
          '<td><div>' + escapeHtml(p.pm_name) + '</div><small style="color:#64748b;">' + escapeHtml(p.team_name) + '</small></td>' +
          '<td>' + healthHtml + '</td>' +
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
            '<div style="font-size:11px;color:' + (p.overdue_tasks > 0 ? "#ef4444;font-weight:700;" : "#64748b;") + '">逾期: ' + p.overdue_tasks + ' 項 | ' + delayTextHtml + '</div>' +
          '</td>' +
        '</tr>';
    });

    if (!rowsHtml) {
      rowsHtml = '<tr><td colspan="8" style="text-align:center;padding:28px;color:#64748b;">無符合自然語言篩選條件的專案資料</td></tr>';
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
                '<th>Aras / 專案編號 / 類型</th>' +
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

    var optionsHtml = "";
    (allProjects || []).forEach(function (item) {
      var sel = item.proj_num === p.proj_num ? " selected" : "";
      var statusSuffix = item.health_status || "GREEN";
      if (item.operational_health && item.operational_health !== item.health_status) {
        statusSuffix += " / " + (item.operational_health === "BLOCKED" ? "外部受阻" : (item.operational_health === "SUBSTANTIAL" ? "實質完工" : item.operational_health));
      }
      optionsHtml += '<option value="' + item.proj_num + '"' + sel + '>[' + item.proj_num + '] ' + escapeHtml(item.project_name) + ' (' + statusSuffix + ')</option>';
    });

    // 雙軌健康度分流標籤渲染
    var opHealthHtml = "";
    if (p.operational_health) {
      var opCls = p.operational_health === "BLOCKED" ? "op-health-blocked" : (p.operational_health === "SUBSTANTIAL" ? "op-health-substantial" : "op-health-" + p.operational_health);
      var opText = p.operational_health === "BLOCKED" ? "🛡️ 內部健康度: 外部受阻" : (p.operational_health === "SUBSTANTIAL" ? "🏁 內部健康度: 實質完工待驗收" : "內部健康度: " + getHealthLabelText(p.operational_health));
      opHealthHtml = '<span class="op-health-badge ' + opCls + '" style="font-size:12px;padding:3px 8px;vertical-align:middle;" title="內部團隊執行健康度：' + opText + '">' + opText + '</span>';
    }

    var headerBanner =
      '<div class="pmo-card" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">' +
        '<div>' +
          '<div style="display:flex;align-items:center;flex-wrap:wrap;gap:8px;">' +
            renderArasProjectItemIconBtn(p.id || "", p.proj_num, p.project_name) +
            '<h2 style="margin:0;font-size:18px;" id="detail-project-title">[' + p.proj_num + '] ' + escapeHtml(p.project_name) + '</h2>' +
            renderProjectStallBadges(p) +
            '<span class="health-badge health-' + light + '" title="排程合約健康度燈號"><span class="health-dot"></span>' + getHealthLabelText(light) + '</span>' +
            opHealthHtml +
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

    var kpiHtml =
      '<div class="kpi-grid">' +
        '<div class="kpi-card" style="border-left-color:#2563eb;">' +
          '<span class="kpi-label">整體實際完成率 / 計劃進度</span>' +
          '<div class="kpi-value">' + Number(p.actual_progress).toFixed(1) + '% <small style="font-size:14px;color:#64748b;">/ ' + Number(p.expected_progress).toFixed(1) + '%</small></div>' +
          '<span class="kpi-sub">進度落差: ' + Number(p.progress_gap).toFixed(1) + '% | ' +
            (p.stall_type === "EXTERNAL" || p.stall_type === "COMMERCIAL"
              ? '<span style="color:#10b981;font-weight:700;" title="非內部團隊因素停滯，延遲工作天數校正為 0 天">校正延遲: 0 天</span> <small style="color:#94a3b8;text-decoration:line-through;" title="合約原始排程延遲 ' + p.delay_days + ' 天">(' + p.delay_days + '天)</small>'
              : '延遲天數: ' + p.delay_days + ' 天'
            ) +
          '</span>' +
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

  // 渲染跨專案成員任務負荷與工時回報統計頁籤 (ASSIGNEES，整合需求 3：成員工時回報統計與跨專案工時/工天明細連結)
  function renderAssigneeWorkloadView(assigneeData = null) {
    var assignees = (assigneeData && assigneeData.assignees) || [];
    var totalMembers = assignees.length;
    var overloadCount = assignees.filter(function (a) { return a.load_level === "OVERLOAD" || a.load_level === "HIGH"; }).length;
    var totalTasks = assignees.reduce(function (acc, a) { return acc + Number(a.total_tasks || 0); }, 0);
    var totalOverdue = assignees.reduce(function (acc, a) { return acc + Number(a.overdue_tasks || 0); }, 0);
    var totalReportedHours = Number(
      (assigneeData && assigneeData.total_reported_hours !== undefined)
        ? assigneeData.total_reported_hours
        : assignees.reduce(function (acc, a) {
            return acc + Number(a.reported_work_hours !== undefined ? a.reported_work_hours : (a.total_actual_hours || 0));
          }, 0)
    );
    var totalReportedDays = Number(
      (assigneeData && assigneeData.total_reported_days !== undefined)
        ? assigneeData.total_reported_days
        : (totalReportedHours / 8.0)
    );

    var kpiHtml =
      '<div class="kpi-grid">' +
        '<div class="kpi-card" style="border-left-color:#2563eb;">' +
          '<span class="kpi-label">納管專案成員總數 (Assignees)</span>' +
          '<div class="kpi-value" id="kpi-assignee-count">' + totalMembers + ' 位</div>' +
          '<span class="kpi-sub">跨專案 Activity2 與工時回報成員彙總</span>' +
        '</div>' +
        '<div class="kpi-card" style="border-left-color:#0ea5e9;">' +
          '<span class="kpi-label">篩選範圍工時回報總值</span>' +
          '<div class="kpi-value" id="kpi-total-reported-hours" style="color:#0284c7;">' + totalReportedHours.toFixed(1) + ' hr</div>' +
          '<span class="kpi-sub">折合總工天: <strong>' + totalReportedDays.toFixed(2) + ' 工天</strong> (8hr/天)</span>' +
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
      var repHrs = Number(a.reported_work_hours !== undefined ? a.reported_work_hours : (a.total_actual_hours || 0));
      var repDays = Number(a.reported_work_days !== undefined ? a.reported_work_days : (repHrs / 8.0));
      var memberKey = a.assignee_id || a.assignee_name;

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
          '<td>' + a.total_est_hours + ' hr (剩餘 <strong>' + a.remaining_est_hours + ' hr</strong>)</td>' +
          '<td>' +
            '<a href="javascript:void(0);" class="pmo-worktime-link js-drill-member-worktime" ' +
              'data-assignee-id="' + escapeHtml(memberKey) + '" ' +
              'title="點擊深入檢視 ' + escapeHtml(a.assignee_name) + ' 在各專案的工時回報總工時/工天明細">' +
              '<strong>' + repHrs.toFixed(1) + ' hr</strong> (' + repDays.toFixed(2) + ' 工天) &#128269;' +
            '</a>' +
          '</td>' +
          '<td><span style="font-weight:800;color:' + loadColor + ';">' + escapeHtml(a.load_level) + '</span></td>' +
        '</tr>';
    });

    var workTimeChartHtml = typeof PMOCharts.renderMemberWorkTimeReportChart === "function"
      ? PMOCharts.renderMemberWorkTimeReportChart(assignees)
      : "";

    return (
      kpiHtml +
      '<div class="chart-grid-2">' +
        '<div class="pmo-card">' +
          '<div class="pmo-card-header"><h3>專案成員工時回報統計 (當前篩選條件下各成員回報總工時 / 工天)</h3></div>' +
          workTimeChartHtml +
        '</div>' +
        '<div class="pmo-card">' +
          '<div class="pmo-card-header"><h3>專案成員 (Assignee) 任務負荷與完成狀態堆疊圖</h3></div>' +
          PMOCharts.renderAssigneeStackedChart(assignees) +
        '</div>' +
      '</div>' +
      '<div class="pmo-card">' +
        '<div class="pmo-card-header"><h3>專案成員 (Assignee) 任務負荷與使用者工時回報統計明細表 (點擊工時連結可深入檢視各專案工時/工天)</h3></div>' +
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
                '<th>預估工時 (剩餘預估)</th>' +
                '<th>使用者工時回報總值 (總工時 / 工天)</th>' +
                '<th>負荷等級</th>' +
              '</tr>' +
            '</thead>' +
            '<tbody>' + rowsHtml + '</tbody>' +
          '</table>' +
        '</div>' +
      '</div>'
    );
  }

  // 渲染成員在各專案的工時回報總工時/工天明細浮層 Modal (需求 3 & 需求 4)
  function renderMemberWorkTimeModalHtml(member = null) {
    if (!member) return "";
    var name = escapeHtml(member.assignee_name || member.assignee_id || "專案成員");
    var totalHrs = Number(member.reported_work_hours !== undefined ? member.reported_work_hours : (member.total_actual_hours || 0));
    var totalDays = Number(member.reported_work_days !== undefined ? member.reported_work_days : (totalHrs / 8.0));
    var breakdowns = member.project_worktime_breakdowns || [];

    var rowsHtml = "";
    breakdowns.forEach(function (b) {
      var hrs = Number(b.reported_hours || 0);
      var days = Number(b.reported_days !== undefined ? b.reported_days : (hrs / 8.0));
      var pct = totalHrs > 0 ? Number(((hrs / totalHrs) * 100).toFixed(1)) : 0;

      rowsHtml +=
        '<tr>' +
          '<td>' +
            '<div class="pmo-proj-cell-flex">' +
              renderArasProjectItemIconBtn(b.project_id || "", b.proj_num, b.project_name) +
              '<a href="javascript:void(0);" class="pmo-proj-link js-drill-project-from-modal" data-proj-num="' + b.proj_num + '">' +
                b.proj_num +
              '</a>' +
            '</div>' +
          '</td>' +
          '<td><strong>' + escapeHtml(b.project_name) + '</strong></td>' +
          '<td style="font-weight:700;color:#2563eb;">' + hrs.toFixed(1) + ' hr</td>' +
          '<td style="font-weight:700;color:#0f172a;">' + days.toFixed(2) + ' 工天</td>' +
          '<td>' +
            '<div style="display:flex;align-items:center;gap:8px;">' +
              '<div class="progress-track" style="width:90px;"><div class="progress-fill" style="width:' + Math.min(100, pct) + '%;background:#2563eb;"></div></div>' +
              '<span>' + pct.toFixed(1) + '%</span>' +
            '</div>' +
          '</td>' +
        '</tr>';
    });

    if (!rowsHtml) {
      rowsHtml = '<tr><td colspan="5" style="text-align:center;padding:20px;color:#64748b;">尚無各專案工時回報明細資料</td></tr>';
    }

    return (
      '<div class="pmo-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="worktime-modal-title">' +
        '<div class="pmo-modal-header">' +
          '<h3 id="worktime-modal-title">⏱️ 【' + name + '】於各專案之工時回報明細統計 (總工時 / 工天)</h3>' +
          '<button type="button" class="pmo-modal-close js-close-worktime-modal" title="關閉視窗">&times;</button>' +
        '</div>' +
        '<div class="pmo-modal-body">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:14px;padding:12px 16px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;">' +
            '<div>' +
              '<span style="font-size:13px;color:#1e40af;font-weight:600;">成員名稱：</span>' +
              '<strong style="font-size:15px;color:#0f172a;">' + name + '</strong>' +
              '<span style="margin-left:12px;font-size:12px;color:#475569;">(參與 ' + breakdowns.length + ' 個專案)</span>' +
            '</div>' +
            '<div style="font-size:14px;font-weight:800;color:#1d4ed8;">' +
              '回報總工時：' + totalHrs.toFixed(1) + ' hr &nbsp;|&nbsp; 換算總工天：' + totalDays.toFixed(2) + ' 工天 <small style="font-weight:500;color:#475569;">(8 hr/天)</small>' +
            '</div>' +
          '</div>' +
          '<div class="table-responsive">' +
            '<table class="pmo-table" id="member-project-worktime-table">' +
              '<thead>' +
                '<tr>' +
                  '<th>Aras / 專案編號</th>' +
                  '<th>專案名稱</th>' +
                  '<th>該專案回報總工時 (hr)</th>' +
                  '<th>換算總工天 (工時 / 8)</th>' +
                  '<th>工時佔比</th>' +
                '</tr>' +
              '</thead>' +
              '<tbody>' + rowsHtml + '</tbody>' +
            '</table>' +
          '</div>' +
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
    var nlInput = doc.getElementById("nl-filter-input");
    var btnApplyNl = doc.getElementById("btn-apply-nl-filter");
    var btnReset = doc.getElementById("btn-reset-filters");
    var userBadgeContainer = doc.getElementById("user-context-badge-container");
    var promptChipsContainer = doc.getElementById("noui-prompt-chips-container");
    var activeSummaryContainer = doc.getElementById("noui-active-filters-summary");

    // 建立掛載於 document.body 之防裁切全域 Tooltip
    var tooltipEl = doc.getElementById("pmo-global-tooltip");
    if (!tooltipEl && doc.body) {
      tooltipEl = doc.createElement("div");
      tooltipEl.id = "pmo-global-tooltip";
      tooltipEl.className = "pmo-floating-tooltip";
      doc.body.appendChild(tooltipEl);
    }

    // 建立掛載於 document.body 之防裁切成員工時回報明細 Modal
    var modalEl = doc.getElementById("pmo-worktime-modal");
    if (!modalEl && doc.body) {
      modalEl = doc.createElement("div");
      modalEl.id = "pmo-worktime-modal";
      modalEl.className = "pmo-modal-backdrop";
      modalEl.style.display = "none";
      doc.body.appendChild(modalEl);
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

      // 更新 NoUI 使用者權限預讀徽章、常用提示 Chips 與目前生效條件摘要
      if (userBadgeContainer) {
        userBadgeContainer.innerHTML = renderUserContextBadgeHtml(currentStore.userContext);
      }
      if (promptChipsContainer) {
        promptChipsContainer.innerHTML = renderNoUiPromptChipsHtml(currentStore);
      }
      if (activeSummaryContainer) {
        activeSummaryContainer.innerHTML = renderActiveFilterSummaryHtml(currentStore);
      }
      if (nlInput && doc.activeElement !== nlInput) {
        nlInput.value = currentStore.naturalQuery || "";
      }

      // 渲染主視圖
      if (currentStore.activeTab === "PROJECT_DETAIL") {
        var allProjs = (currentStore.summaryData && currentStore.summaryData.projects) || [];
        viewContainer.innerHTML = renderProjectDetailView(currentStore.projectDetailData, allProjs);
      } else if (currentStore.activeTab === "ASSIGNEES") {
        viewContainer.innerHTML = renderAssigneeWorkloadView(currentStore.assigneeWorkloadData);
      } else {
        viewContainer.innerHTML = renderPortfolioSummaryView(currentStore.summaryData, currentStore);
      }

      // 渲染或隱藏成員跨專案工時回報 Modal
      if (modalEl) {
        if (currentStore.selectedMemberForWorkTimeModal) {
          modalEl.innerHTML = renderMemberWorkTimeModalHtml(currentStore.selectedMemberForWorkTimeModal);
          modalEl.style.display = "flex";
        } else {
          modalEl.style.display = "none";
          modalEl.innerHTML = "";
        }
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

    // 綁定自然語言輸入框按下 Enter 或點擊「套用查詢」按鈕
    if (nlInput) {
      nlInput.addEventListener("keydown", function (ev) {
        if (ev.key === "Enter") {
          ev.preventDefault();
          store.applyNaturalLanguageQuery(nlInput.value);
        }
      });
    }
    if (btnApplyNl && nlInput) {
      btnApplyNl.addEventListener("click", function () {
        store.applyNaturalLanguageQuery(nlInput.value);
      });
    }

    // 綁定常用條件提示標籤 (Prompt Chips) 點擊事件
    if (promptChipsContainer) {
      promptChipsContainer.addEventListener("click", function (ev) {
        var chipBtn = ev.target.closest(".js-nl-prompt-chip");
        if (!chipBtn) return;
        var q = chipBtn.getAttribute("data-nl-query") || "";
        if (nlInput) nlInput.value = q;
        store.applyNaturalLanguageQuery(q);
      });
    }

    // 綁定重置預設按鈕
    if (btnReset) {
      btnReset.addEventListener("click", function () {
        if (nlInput) nlInput.value = "";
        store.resetFilters();
      });
    }

    // 綁定成員工時回報 Modal 點擊事件 (關閉、開啟 Aras 專案畫面、下鑽專案)
    if (modalEl) {
      modalEl.addEventListener("click", function (ev) {
        if (ev.target === modalEl || ev.target.closest(".js-close-worktime-modal")) {
          store.closeMemberWorkTimeModal();
          return;
        }
        var openArasBtn = ev.target.closest(".js-open-aras-item");
        if (openArasBtn) {
          var pid = openArasBtn.getAttribute("data-project-id") || "";
          var pnum = Number(openArasBtn.getAttribute("data-proj-num") || 0);
          PMOApi.openProjectItemInAras(pid, pnum, apiClient.arasObj);
          return;
        }
        var drillFromModal = ev.target.closest(".js-drill-project-from-modal");
        if (drillFromModal) {
          var targetNum = Number(drillFromModal.getAttribute("data-proj-num") || 0);
          store.closeMemberWorkTimeModal();
          store.setActiveTab("PROJECT_DETAIL", targetNum);
        }
      });
    }

    // 綁定內容區域委派事件 (開啟 Aras 專案畫面、開啟成員工時回報下鑽 Modal、點擊長條圖色塊展開明細、下鑽單一專案)
    if (viewContainer) {
      viewContainer.addEventListener("click", function (ev) {
        // 1. 點擊專案清單左側之 Aras Project Item Icon 按鈕 (需求 4)
        var openArasBtn = ev.target.closest(".js-open-aras-item");
        if (openArasBtn) {
          ev.stopPropagation();
          var projectId = openArasBtn.getAttribute("data-project-id") || "";
          var projNumForOpen = Number(openArasBtn.getAttribute("data-proj-num") || 0);
          PMOApi.openProjectItemInAras(projectId, projNumForOpen, apiClient.arasObj);
          return;
        }

        // 2. 點擊成員工時回報總值超連結，開啟該員在各專案的工時/工天明細 Modal (需求 3)
        var worktimeLink = ev.target.closest(".js-drill-member-worktime");
        if (worktimeLink) {
          var assigneeId = worktimeLink.getAttribute("data-assignee-id") || "";
          store.openMemberWorkTimeModal(assigneeId);
          return;
        }

        // 3. 點擊長條圖色塊或團隊群組展開該團隊明細
        var teamBar = ev.target.closest(".js-team-bar-item") || ev.target.closest(".team-bar-group");
        if (teamBar) {
          var teamId = teamBar.getAttribute("data-team-id") || "ALL";
          store.expandTeamDetail(teamId);
          return;
        }

        // 4. 點擊展開全部團隊專案明細按鈕
        var expandAllBtn = ev.target.closest(".js-expand-all-teams");
        if (expandAllBtn) {
          store.expandTeamDetail("ALL");
          return;
        }

        // 5. 點擊收合詳細分析按鈕
        var collapseBtn = ev.target.closest(".js-collapse-detail");
        if (collapseBtn) {
          store.collapseDetail();
          return;
        }

        // 6. 點擊專案編號切換至單一專案下鑽視圖
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
    renderArasProjectItemIconBtn: renderArasProjectItemIconBtn,
    renderUserContextBadgeHtml: renderUserContextBadgeHtml,
    renderNoUiPromptChipsHtml: renderNoUiPromptChipsHtml,
    renderActiveFilterSummaryHtml: renderActiveFilterSummaryHtml,
    renderPhaseMiniMatrix: renderPhaseMiniMatrix,
    renderPortfolioSummaryView: renderPortfolioSummaryView,
    renderProjectDetailView: renderProjectDetailView,
    renderAssigneeWorkloadView: renderAssigneeWorkloadView,
    renderMemberWorkTimeModalHtml: renderMemberWorkTimeModalHtml,
    initDashboardApp: initDashboardApp
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = exported;
  }
  if (root) {
    root.PMODashboardApp = exported;
  }
})(typeof window !== "undefined" ? window : globalThis);
