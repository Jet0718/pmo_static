// ============================================================================
// 檔案名稱：svgChartEngine.js
// 專案名稱：BDM 系統專案進度狀態分析統計模組 (Aras Innovator 12 SP9)
// 職責說明：零外部依賴之純 SVG 向量視覺化圖表渲染器，負責產生：
//           1. 紅黃綠燈 RAG 環狀圓餅圖 (Donut Chart)
//           2. 團隊/PM 完成率與 SPI/CPI 分組比較圖 (Horizontal Bar Chart)
//           3. WBS 階段進度達成率 vs 應有進度與時程偏差對比圖 (Dual Progress & Variance Chart)
//           4. 專案成員任務負荷堆疊橫條圖 (Stacked Workload Bar Chart)
// ============================================================================

(function (root) {
  "use strict";

  // 安全轉義 HTML 文字
  function escapeHtml(str = "") {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // 渲染健康度燈號 RAG 環狀圓餅圖 SVG
  function renderRagDonutSvg(ragStatus = {}) {
    var green = Number(ragStatus.green_count || 0);
    var amber = Number(ragStatus.amber_count || 0);
    var red = Number(ragStatus.red_count || 0);
    var total = green + amber + red;
    var greenPct = Number(ragStatus.green_percent || 0).toFixed(1);

    var r = 62;
    var c = Number((2 * Math.PI * r).toFixed(2));
    var gLen = total > 0 ? (green / total) * c : 0;
    var aLen = total > 0 ? (amber / total) * c : 0;
    var rLen = total > 0 ? (red / total) * c : 0;

    var gOffset = 0;
    var aOffset = -gLen;
    var rOffset = -(gLen + aLen);

    return (
      '<div style="display:flex;align-items:center;justify-content:space-around;flex-wrap:wrap;gap:16px;padding:8px 0;">' +
        '<svg width="170" height="170" viewBox="0 0 170 170">' +
          '<circle cx="85" cy="85" r="' + r + '" fill="none" stroke="#e2e8f0" stroke-width="22"/>' +
          (total > 0
            ? '<circle cx="85" cy="85" r="' + r + '" fill="none" stroke="#10b981" stroke-width="22" stroke-dasharray="' + gLen + ' ' + c + '" stroke-dashoffset="' + gOffset + '" transform="rotate(-90 85 85)"/>' +
              '<circle cx="85" cy="85" r="' + r + '" fill="none" stroke="#f59e0b" stroke-width="22" stroke-dasharray="' + aLen + ' ' + c + '" stroke-dashoffset="' + aOffset + '" transform="rotate(-90 85 85)"/>' +
              '<circle cx="85" cy="85" r="' + r + '" fill="none" stroke="#ef4444" stroke-width="22" stroke-dasharray="' + rLen + ' ' + c + '" stroke-dashoffset="' + rOffset + '" transform="rotate(-90 85 85)"/>'
            : '') +
          '<text x="85" y="80" text-anchor="middle" font-size="22" font-weight="800" fill="#0f172a">' + greenPct + '%</text>' +
          '<text x="85" y="102" text-anchor="middle" font-size="12" font-weight="600" fill="#64748b">綠燈健康率</text>' +
        '</svg>' +
        '<div style="display:flex;flex-direction:column;gap:10px;min-width:160px;">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;">' +
            '<span style="display:flex;align-items:center;gap:8px;font-weight:600;"><span style="width:12px;height:12px;border-radius:3px;background:#10b981;display:inline-block;"></span>綠燈 (正常)</span>' +
            '<strong>' + green + ' 案 (' + Number(ragStatus.green_percent || 0).toFixed(1) + '%)</strong>' +
          '</div>' +
          '<div style="display:flex;justify-content:space-between;align-items:center;">' +
            '<span style="display:flex;align-items:center;gap:8px;font-weight:600;"><span style="width:12px;height:12px;border-radius:3px;background:#f59e0b;display:inline-block;"></span>黃燈 (警示)</span>' +
            '<strong>' + amber + ' 案 (' + Number(ragStatus.amber_percent || 0).toFixed(1) + '%)</strong>' +
          '</div>' +
          '<div style="display:flex;justify-content:space-between;align-items:center;">' +
            '<span style="display:flex;align-items:center;gap:8px;font-weight:600;"><span style="width:12px;height:12px;border-radius:3px;background:#ef4444;display:inline-block;"></span>紅燈 (嚴重延遲)</span>' +
            '<strong>' + red + ' 案 (' + Number(ragStatus.red_percent || 0).toFixed(1) + '%)</strong>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  // 渲染團隊或 PM 績效橫向對比圖 (包含平均進度、SPI 與 CPI)
  function renderGroupComparisonHtml(items = [], nameKey = "team_name") {
    if (!items || items.length === 0) {
      return '<div style="padding:24px;text-align:center;color:#64748b;">尚無分組統計資料</div>';
    }
    var html = '<div style="display:flex;flex-direction:column;gap:12px;">';
    items.forEach(function (item) {
      var name = escapeHtml(item[nameKey] || "未命名");
      var prog = Number(item.avg_progress || 0);
      var spi = Number(item.avg_spi || 0);
      var cpi = Number(item.avg_cpi || 0);
      var spiColor = spi >= 0.95 ? "#10b981" : (spi >= 0.8 ? "#f59e0b" : "#ef4444");
      var cpiColor = cpi >= 0.95 ? "#10b981" : (cpi >= 0.8 ? "#f59e0b" : "#ef4444");

      html +=
        '<div style="padding:10px 12px;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">' +
            '<span style="font-weight:700;color:#0f172a;">' + name + ' <small style="color:#64748b;font-weight:500;">(' + item.project_count + ' 專案)</small></span>' +
            '<span style="display:flex;gap:10px;font-size:12px;font-weight:700;">' +
              '<span style="color:' + spiColor + ';">SPI: ' + spi.toFixed(2) + '</span>' +
              '<span style="color:' + cpiColor + ';">CPI: ' + cpi.toFixed(2) + '</span>' +
              '<span style="color:#2563eb;">平均完成: ' + prog.toFixed(1) + '%</span>' +
            '</span>' +
          '</div>' +
          '<div class="progress-track">' +
            '<div class="progress-fill" style="width:' + Math.min(100, Math.max(0, prog)) + '%;background:#2563eb;"></div>' +
          '</div>' +
        '</div>';
    });
    html += '</div>';
    return html;
  }

  // 渲染 WBS 各階段進度達成率 vs 應有進度與時程偏差視覺化圖表
  function renderWbsStageDeviationChart(wbsStages = []) {
    if (!wbsStages || wbsStages.length === 0) {
      return '<div style="padding:24px;text-align:center;color:#64748b;">此專案尚無 WBS 階段明細資料</div>';
    }
    var html = '<div style="display:flex;flex-direction:column;gap:14px;">';
    wbsStages.forEach(function (st) {
      var actual = Number(st.completion || 0);
      var expected = Number(st.expected_completion || 0);
      var varDays = Number(st.schedule_variance_days || 0);
      var light = st.health_light || "GREEN";
      var barColor = light === "RED" ? "#ef4444" : (light === "YELLOW" ? "#f59e0b" : "#10b981");
      var badgeText = varDays > 0 ? ("延遲 +" + varDays + " 天") : "時程正常 (0 天偏差)";
      var badgeBg = varDays > 0 ? "#fee2e2" : "#d1fae5";
      var badgeFg = varDays > 0 ? "#991b1b" : "#065f46";

      html +=
        '<div style="padding:12px 14px;border:1px solid #e2e8f0;border-radius:8px;background:#ffffff;">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:8px;">' +
            '<div>' +
              '<span style="font-weight:700;color:#0f172a;">[' + escapeHtml(st.wbs_code) + '] ' + escapeHtml(st.wbs_name) + '</span>' +
              '<span style="margin-left:8px;font-size:12px;color:#64748b;">(' + escapeHtml(st.sched_start) + ' ~ ' + escapeHtml(st.sched_due) + ')</span>' +
            '</div>' +
            '<div style="display:flex;align-items:center;gap:8px;">' +
              '<span style="padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700;background:' + badgeBg + ';color:' + badgeFg + ';">' + badgeText + '</span>' +
              '<span class="health-badge health-' + light + '"><span class="health-dot"></span>' + light + '</span>' +
            '</div>' +
          '</div>' +
          '<div style="display:grid;grid-template-columns:90px 1fr 60px;align-items:center;gap:8px;font-size:12px;margin-bottom:5px;">' +
            '<span style="color:#475569;font-weight:600;">實際達成率</span>' +
            '<div class="progress-track"><div class="progress-fill" style="width:' + Math.min(100, actual) + '%;background:' + barColor + ';"></div></div>' +
            '<strong style="text-align:right;">' + actual.toFixed(1) + '%</strong>' +
          '</div>' +
          '<div style="display:grid;grid-template-columns:90px 1fr 60px;align-items:center;gap:8px;font-size:12px;">' +
            '<span style="color:#64748b;">應有計劃基準</span>' +
            '<div class="progress-track"><div class="progress-fill" style="width:' + Math.min(100, expected) + '%;background:#94a3b8;"></div></div>' +
            '<span style="text-align:right;color:#64748b;">' + expected.toFixed(1) + '%</span>' +
          '</div>' +
        '</div>';
    });
    html += '</div>';
    return html;
  }

  // 渲染專案成員 (Assignee) 任務狀態堆疊橫條圖
  function renderAssigneeStackedChart(assignees = []) {
    if (!assignees || assignees.length === 0) {
      return '<div style="padding:24px;text-align:center;color:#64748b;">尚無成員任務指派資料</div>';
    }
    var html = '<div style="display:flex;flex-direction:column;gap:12px;">';
    assignees.forEach(function (a) {
      var total = Math.max(1, Number(a.total_tasks || 0));
      var donePct = ((Number(a.completed_tasks || 0) / total) * 100).toFixed(1);
      var inProgNormal = Math.max(0, Number(a.in_progress_tasks || 0) - Number(a.overdue_tasks || 0));
      var inProgPct = ((inProgNormal / total) * 100).toFixed(1);
      var ovdPct = ((Number(a.overdue_tasks || 0) / total) * 100).toFixed(1);
      var pendingPct = Math.max(0, 100 - Number(donePct) - Number(inProgPct) - Number(ovdPct)).toFixed(1);

      var loadBadgeBg = a.load_level === "OVERLOAD" ? "#fee2e2" : (a.load_level === "HIGH" ? "#fef3c7" : "#d1fae5");
      var loadBadgeFg = a.load_level === "OVERLOAD" ? "#991b1b" : (a.load_level === "HIGH" ? "#92400e" : "#065f46");

      html +=
        '<div style="padding:10px 14px;border:1px solid #e2e8f0;border-radius:8px;background:#ffffff;">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;flex-wrap:wrap;gap:6px;">' +
            '<span style="font-weight:700;color:#0f172a;">' + escapeHtml(a.assignee_name) + '</span>' +
            '<div style="display:flex;gap:10px;align-items:center;font-size:12px;">' +
              '<span>總任務: <strong>' + a.total_tasks + '</strong> (完成 ' + a.completed_tasks + ' / 進行中 ' + a.in_progress_tasks + ' / 逾期 <strong style="color:#ef4444;">' + a.overdue_tasks + '</strong>)</span>' +
              '<span style="padding:2px 8px;border-radius:999px;font-weight:700;background:' + loadBadgeBg + ';color:' + loadBadgeFg + ';">負荷: ' + escapeHtml(a.load_level) + ' (' + a.remaining_est_hours + ' hr 剩餘)</span>' +
            '</div>' +
          '</div>' +
          '<div style="display:flex;height:12px;width:100%;border-radius:999px;overflow:hidden;background:#e2e8f0;">' +
            '<div title="已完成: ' + a.completed_tasks + '" style="width:' + donePct + '%;background:#10b981;"></div>' +
            '<div title="進行中: ' + inProgNormal + '" style="width:' + inProgPct + '%;background:#3b82f6;"></div>' +
            '<div title="已逾期: ' + a.overdue_tasks + '" style="width:' + ovdPct + '%;background:#ef4444;"></div>' +
            '<div title="未開始: ' + a.not_started_tasks + '" style="width:' + pendingPct + '%;background:#cbd5e1;"></div>' +
          '</div>' +
        '</div>';
    });
    html += '</div>';
    return html;
  }

  // 渲染執行團隊 (team_id) 啟動中 (Active) 專案數量長條統計圖 (首頁極速展示專用)
  function renderTeamActiveProjectsBarChart(teamSummary = {}, selectedTeamId = null) {
    var teams = (teamSummary && teamSummary.teams) || [];
    var totalActive = Number((teamSummary && teamSummary.total_active_projects) || 0);
    if (!teams || teams.length === 0) {
      return '<div style="padding:20px;text-align:center;color:#64748b;">暫無執行團隊統計數據</div>';
    }

    var maxCount = 1;
    teams.forEach(function (t) {
      var c = Number(t.active_count || 0);
      if (c > maxCount) maxCount = c;
    });

    var chartH = 140;
    var barW = 48;
    var gap = 24;
    var startX = 30;
    var totalW = startX * 2 + teams.length * (barW + gap) - gap;

    var barsSvg = "";
    teams.forEach(function (t, idx) {
      var count = Number(t.active_count || 0);
      var barH = maxCount > 0 ? Math.round((count / maxCount) * (chartH - 45)) : 0;
      if (count > 0 && barH < 8) barH = 8;
      var x = startX + idx * (barW + gap);
      var y = chartH - 26 - barH;
      var isSel = selectedTeamId && selectedTeamId.toUpperCase() === String(t.team_id).toUpperCase();
      var color = t.color || "#2563eb";
      var strokeAttr = isSel ? 'stroke="#0f172a" stroke-width="3"' : 'stroke="none"';

      barsSvg +=
        '<g class="team-bar-group" data-team-id="' + escapeHtml(t.team_id) + '" style="cursor:pointer;">' +
          // 柱頂數值標籤
          '<text x="' + (x + barW / 2) + '" y="' + (y - 6) + '" text-anchor="middle" font-size="13" font-weight="700" fill="' + (isSel ? '#0f172a' : color) + '">' +
            count +
          '</text>' +
          // 長條柱色塊 (帶有 class js-team-bar-item 與 data-team-id 供點擊互動展開)
          '<rect class="team-bar-item js-team-bar-item' + (isSel ? ' selected' : '') + '" ' +
            'x="' + x + '" y="' + y + '" width="' + barW + '" height="' + Math.max(4, barH) + '" rx="6" ' +
            'fill="' + escapeHtml(color) + '" ' + strokeAttr + ' data-team-id="' + escapeHtml(t.team_id) + '" ' +
            'style="transition:all 0.2s ease;filter:' + (isSel ? 'brightness(1.1) drop-shadow(0 4px 6px rgba(0,0,0,0.15))' : 'none') + ';">' +
            '<title>' + escapeHtml(t.team_name) + ': ' + count + ' 案啟動中 (點擊展開明細)' + '</title>' +
          '</rect>' +
          // 底部團隊代碼標籤
          '<text x="' + (x + barW / 2) + '" y="' + (chartH - 8) + '" text-anchor="middle" font-size="12" font-weight="700" fill="' + (isSel ? '#2563eb' : '#475569') + '">' +
            escapeHtml(t.team_id) +
          '</text>' +
        '</g>';
    });

    return (
      '<div class="team-active-barchart-container" style="display:flex;flex-direction:column;align-items:center;padding:10px 0;">' +
        '<div style="width:100%;max-width:' + Math.max(500, totalW) + 'px;overflow-x:auto;">' +
          '<svg width="' + Math.max(500, totalW) + '" height="' + chartH + '" viewBox="0 0 ' + Math.max(500, totalW) + ' ' + chartH + '" style="display:block;margin:0 auto;">' +
            '<line x1="16" y1="' + (chartH - 26) + '" x2="' + (Math.max(500, totalW) - 16) + '" y2="' + (chartH - 26) + '" stroke="#e2e8f0" stroke-width="1.5" />' +
            barsSvg +
          '</svg>' +
        '</div>' +
        '<div style="margin-top:8px;font-size:12px;color:#64748b;display:flex;align-items:center;gap:6px;justify-content:center;">' +
          '<span>💡 提示：點擊上方團隊長條色塊，可直接向下展開該團隊執行專案之健康度與 Ph 1~12 明細列表</span>' +
        '</div>' +
      '</div>'
    );
  }

  var exported = {
    escapeHtml: escapeHtml,
    renderRagDonutSvg: renderRagDonutSvg,
    renderTeamActiveProjectsBarChart: renderTeamActiveProjectsBarChart,
    renderGroupComparisonHtml: renderGroupComparisonHtml,
    renderWbsStageDeviationChart: renderWbsStageDeviationChart,
    renderAssigneeStackedChart: renderAssigneeStackedChart
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = exported;
  }
  if (root) {
    root.PMOCharts = exported;
  }
})(typeof window !== "undefined" ? window : globalThis);
