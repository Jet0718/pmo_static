// ============================================================================
// 檔案名稱：frontend.test.js
// 用途：使用 Node.js 內建 test runner 對前端所有模組進行單元測試驗證
// ============================================================================

const test = require("node:test");
const assert = require("node:assert/strict");

const PMOApi = require("../frontend/js/arasApiClient.js");
const PMOStore = require("../frontend/js/dashboardStore.js");
const PMOCharts = require("../frontend/js/svgChartEngine.js");
const PMODashboardApp = require("../frontend/js/dashboardApp.js");

test("1. normalizeStatusColor 應正確將 Hex 色碼轉譯為 GREEN / YELLOW / RED / GRAY 燈號物件", () => {
  const green = PMOApi.normalizeStatusColor("#00FF00", 100);
  assert.equal(green.light, "GREEN");
  assert.equal(green.hex, "#10B981");

  const yellow = PMOApi.normalizeStatusColor("#FFD800", 60);
  assert.equal(yellow.light, "YELLOW");
  assert.equal(yellow.hex, "#F59E0B");

  const red = PMOApi.normalizeStatusColor("#FF0000", 40);
  assert.equal(red.light, "RED");
  assert.equal(red.hex, "#EF4444");

  const gray = PMOApi.normalizeStatusColor("", 0);
  assert.equal(gray.light, "GRAY");
});

test("2. normalizeTeamCode 應正確解析 GUID 或 keyed_name 歸類至 6 大團隊", () => {
  assert.equal(PMOApi.normalizeTeamCode("9F9B513C3EEA4C5DA3D50AA82D420556", "TPS 顧問團隊"), "TPS");
  assert.equal(PMOApi.normalizeTeamCode("GUID_ICS", "ICS 顧問處"), "ICS");
  assert.equal(PMOApi.normalizeTeamCode("GUID_PMO", "PMO"), "PMO");
  assert.equal(PMOApi.normalizeTeamCode("GUID_SUS", "SUS永續處"), "SUS");
  assert.equal(PMOApi.normalizeTeamCode("GUID_SHS", "SHS"), "SHS");
  assert.equal(PMOApi.normalizeTeamCode("GUID_UNKNOWN", "CDS 研發處"), "Other");
  assert.equal(PMOApi.normalizeTeamCode("", ""), "Other");
});

test("3. buildSummaryFromProjects 應正確計算多專案 KPI、RAG 分佈與支援 9 大專案類型複選", () => {
  const resAll = PMOApi.buildSummaryFromProjects(PMOApi.DEFAULT_MOCK_PROJECTS, { state: "ALL" });
  assert.equal(resAll.status, "success");
  assert.equal(resAll.summary.total_projects, 6);
  assert.equal(resAll.summary.active_projects, 6);
  assert.equal(resAll.rag_status.green_count, 4);
  assert.equal(resAll.rag_status.amber_count, 1);
  assert.equal(resAll.rag_status.red_count, 1);

  // 測試健康度燈號篩選 RED
  const resRed = PMOApi.buildSummaryFromProjects(PMOApi.DEFAULT_MOCK_PROJECTS, { health_status: "RED" });
  assert.equal(resRed.summary.total_projects, 1);
  assert.equal(resRed.projects[0].proj_num, 2142);

  // 測試服務中心篩選
  const resHsinchu = PMOApi.buildSummaryFromProjects(PMOApi.DEFAULT_MOCK_PROJECTS, { territory: "新竹服務中心" });
  assert.equal(resHsinchu.summary.total_projects, 2);

  // 測試專案類型 9 大類複選 (OR)
  const resMultiType = PMOApi.buildSummaryFromProjects(PMOApi.DEFAULT_MOCK_PROJECTS, { project_type: "1.Standard,2.Professional,3.Upgrade" });
  assert.equal(resMultiType.summary.total_projects, 6);

  // 測試執行團隊篩選 (TPS)
  const resTps = PMOApi.buildSummaryFromProjects(PMOApi.DEFAULT_MOCK_PROJECTS, { team_id: "TPS" });
  assert.equal(resTps.summary.total_projects, 1);
  assert.equal(resTps.projects[0].proj_num, 2127);
});

test("4. aggregateCrossProjectAssignees 應正確統計跨專案成員任務負荷與逾期排序", () => {
  const assignees = PMOApi.aggregateCrossProjectAssignees(PMOApi.DEFAULT_MOCK_PROJECTS, {});
  assert.ok(assignees.length >= 4);
  // 張家豪跨 3 個專案且逾期任務最多，應排在第一位
  assert.equal(assignees[0].assignee_id, "USR_CHANG");
  assert.equal(assignees[0].project_count, 3);
  assert.equal(assignees[0].overdue_tasks, 4);
  assert.equal(assignees[0].load_level, "OVERLOAD");
});

test("5. ArasApiClient 支援 IOM applyMethod 注入與 RESTful 路由分發", async () => {
  let calledMethod = "";
  let calledAml = "";
  const fakeAras = {
    applyMethod: function (name, aml) {
      calledMethod = name;
      calledAml = aml;
      return "<Result>{\"status\":\"success\",\"custom\":true}</Result>";
    }
  };

  const clientWithAras = new PMOApi.ArasApiClient({ arasObj: fakeAras });
  const resIom = await clientWithAras.request("/api/v1/dashboard/summary", { state: "Active" });
  assert.equal(calledMethod, "PMO_ProjectAnalytics_API");
  assert.ok(calledAml.includes("<route>/api/v1/dashboard/summary</route>"));
  assert.equal(resIom.custom, true);

  // 測試本地引擎路由 /api/v1/dashboard/project
  const clientLocal = new PMOApi.ArasApiClient();
  const resDetail = await clientLocal.request("/api/v1/dashboard/project", { proj_num: 2142 });
  assert.equal(resDetail.project.proj_num, 2142);
  assert.equal(resDetail.wbs_items.length, 3);
});

test("6. DashboardStateStore 與 SVG 圖表/視圖渲染器應輸出零 NaN 且長條圖標題動態聯動", async () => {
  const client = new PMOApi.ArasApiClient();
  const store = new PMOStore.DashboardStateStore(client);

  // 1. 首頁預設高速概覽模式 (state: Active)
  await store.refreshActiveView();
  assert.equal(store.isDetailExpanded, false);
  assert.ok(store.teamSummaryData);
  assert.equal(store.teamSummaryData.teams.length, 6);
  assert.equal(store.teamSummaryData.teams[0].team_name, "TPS");
  assert.equal(store.teamSummaryData.teams[1].team_name, "ICS");
  assert.equal(store.teamSummaryData.teams[2].team_name, "PMO");
  assert.equal(store.teamSummaryData.teams[3].team_name, "SUS");
  assert.equal(store.teamSummaryData.teams[4].team_name, "SHS");
  assert.equal(store.teamSummaryData.teams[5].team_name, "Other");

  const fastOverviewHtml = PMODashboardApp.renderPortfolioSummaryView(store.summaryData, store);
  assert.ok(fastOverviewHtml.includes("各執行團隊進行中 (Active) 專案數量統計"));
  assert.ok(fastOverviewHtml.includes("進行中專案總計"));
  assert.ok(fastOverviewHtml.includes("data-team-id=\"TPS\""));
  assert.ok(fastOverviewHtml.includes("data-team-id=\"ICS\""));
  assert.ok(!fastOverviewHtml.includes("NaN"));

  // 2. 切換狀態篩選為 ALL 時，長條圖標題應動態更新為全部狀態
  await store.updateFilters({ state: "ALL" });
  const allStateHtml = PMODashboardApp.renderPortfolioSummaryView(store.summaryData, store);
  assert.ok(allStateHtml.includes("各執行團隊專案數量統計 (全部狀態)"));
  assert.ok(allStateHtml.includes("專案總計:"));

  // 恢復 state 為 Active 並點擊團隊色塊展開明細分析 (需求 1 & 需求 5)
  await store.updateFilters({ state: "Active" });
  await store.expandTeamDetail("TPS");
  assert.equal(store.isDetailExpanded, true);
  assert.equal(store.selectedTeamForDrill, "TPS");

  const expandedHtml = PMODashboardApp.renderPortfolioSummaryView(store.summaryData, store);
  assert.ok(expandedHtml.includes("次世代 BDM 智慧製造整合專案"));
  // 驗證需求 5：取消下鑽操作欄位，併入第一欄專案編號超連結
  assert.ok(expandedHtml.includes("class=\"pmo-proj-link js-drill-project\" data-proj-num=\"2127\""));
  assert.ok(!expandedHtml.includes("<th>下鑽操作</th>"));
  assert.ok(!expandedHtml.includes("階段與成員分析 &rarr;"));
  assert.ok(!expandedHtml.includes("NaN"));
  assert.ok(!expandedHtml.includes("[object Object]"));

  // 3. 單一專案階段分析
  await store.setActiveTab("PROJECT_DETAIL", 2135);
  const detailHtml = PMODashboardApp.renderProjectDetailView(store.projectDetailData, store.summaryData ? store.summaryData.projects : []);
  assert.ok(detailHtml.includes("車用電子研發 BOM 與變更簽核導入案"));
  assert.ok(detailHtml.includes("Phase 2: EBOM/MBOM 自動拋轉介面開發"));
  assert.ok(detailHtml.includes("+6 天延遲"));
  assert.ok(!detailHtml.includes("NaN"));

  // 4. 成員任務負荷分析
  await store.setActiveTab("ASSIGNEES");
  const assigneeHtml = PMODashboardApp.renderAssigneeWorkloadView(store.assigneeWorkloadData);
  assert.ok(assigneeHtml.includes("張家豪 (全端工程師)"));
  assert.ok(assigneeHtml.includes("OVERLOAD"));
  assert.ok(!assigneeHtml.includes("NaN"));
});

test("7. 單一專案 WBS 階段應嚴格依名稱自然排序升冪，且本專案成員統計應包含全體指派成員", () => {
  const fakeDetail = {
    project: {
      proj_num: 2339,
      project_name: "亞昕PLM導入專案",
      pm_name: "吳怡潔 Joy",
      team_name: "TPS",
      territory: "台北服務中心",
      customer_name: "亞昕科技",
      sched_start: "2025-12-22",
      sched_due: "2026-08-13",
      actual_progress: 76.0,
      expected_progress: 86.0,
      progress_gap: 10.0,
      delay_days: 178,
      spi: 0.88,
      cpi: 2.81,
      planned_value: 1218,
      earned_value: 1076,
      actual_cost: 452.5,
      exp_mandays: 177,
      remainder_hours: 1153,
      completed_tasks: 20,
      total_tasks: 27,
      in_progress_tasks: 5,
      not_started_tasks: 2,
      overdue_tasks: 7,
      phases: []
    },
    // 輸入刻意錯亂之主階段順序 (50 -> 40 -> 30 -> 20 -> 10 -> 60)
    wbs_items: [
      { wbs_code: ".2", wbs_name: "50 上線準備", classification: "Phase", sched_start: "2026-05-18", sched_due: "2026-06-03", completion: 60.0, expected_completion: 100.0, schedule_variance_days: 159, spi: 0.60, cpi: 5.14, completed_tasks: 3, in_progress_tasks: 2, overdue_tasks: 2, health_light: "RED" },
      { wbs_code: ".2", wbs_name: "40 測試驗證", classification: "Phase", sched_start: "2026-03-31", sched_due: "2026-05-15", completion: 70.0, expected_completion: 100.0, schedule_variance_days: 178, spi: 0.70, cpi: 1.66, completed_tasks: 3, in_progress_tasks: 2, overdue_tasks: 2, health_light: "RED" },
      { wbs_code: ".2", wbs_name: "30 系統設計", classification: "Phase", sched_start: "2026-02-23", sched_due: "2026-03-30", completion: 100.0, expected_completion: 100.0, schedule_variance_days: 0, spi: 1.0, cpi: 1.0, completed_tasks: 5, in_progress_tasks: 0, overdue_tasks: 0, health_light: "GREEN" },
      { wbs_code: ".2", wbs_name: "20 需求分析", classification: "Phase", sched_start: "2025-12-25", sched_due: "2026-02-13", completion: 100.0, expected_completion: 100.0, schedule_variance_days: 0, spi: 1.0, cpi: 1.0, completed_tasks: 4, in_progress_tasks: 0, overdue_tasks: 0, health_light: "GREEN" },
      { wbs_code: ".2", wbs_name: "10 啟動階段", classification: "Phase", sched_start: "2025-12-22", sched_due: "2025-12-25", completion: 100.0, expected_completion: 100.0, schedule_variance_days: 0, spi: 1.0, cpi: 1.0, completed_tasks: 2, in_progress_tasks: 0, overdue_tasks: 0, health_light: "GREEN" },
      { wbs_code: ".2", wbs_name: "60 系統上線", classification: "Phase", sched_start: "2026-06-04", sched_due: "2026-08-13", completion: 0.0, expected_completion: 100.0, schedule_variance_days: 88, spi: 0.0, cpi: 0.0, completed_tasks: 0, in_progress_tasks: 1, overdue_tasks: 1, health_light: "RED" }
    ],
    // 包含多位實際負責人 (managed_by_id)
    assignees: [
      { assignee_id: "USR_1", assignee_name: "陸睿旭 Andrew", total_tasks: 12, completed_tasks: 8, in_progress_tasks: 2, not_started_tasks: 2, overdue_tasks: 2, load_level: "NORMAL" },
      { assignee_id: "USR_2", assignee_name: "張國倫 Allen.chang", total_tasks: 8, completed_tasks: 6, in_progress_tasks: 1, not_started_tasks: 1, overdue_tasks: 1, load_level: "NORMAL" },
      { assignee_id: "USR_3", assignee_name: "吳怡潔 Joy", total_tasks: 7, completed_tasks: 6, in_progress_tasks: 1, not_started_tasks: 0, overdue_tasks: 0, load_level: "NORMAL" }
    ]
  };

  const html = PMODashboardApp.renderProjectDetailView(fakeDetail, [fakeDetail.project]);
  
  // 驗證成員統計卡片包含全體指派成員 (不只有專案經理一人)
  assert.ok(html.includes("陸睿旭 Andrew"), "單一專案成員應包含陸睿旭 Andrew");
  assert.ok(html.includes("張國倫 Allen.chang"), "單一專案成員應包含張國倫 Allen.chang");
  assert.ok(html.includes("吳怡潔 Joy"), "單一專案成員應包含吳怡潔 Joy");

  // 驗證 WBS 明細表中，10 啟動階段 在 20 需求分析 之前，20 在 30 之前，50 在 60 之前
  const pos10 = html.indexOf("10 啟動階段");
  const pos20 = html.indexOf("20 需求分析");
  const pos30 = html.indexOf("30 系統設計");
  const pos40 = html.indexOf("40 測試驗證");
  const pos50 = html.indexOf("50 上線準備");
  const pos60 = html.indexOf("60 系統上線");

  assert.ok(pos10 !== -1 && pos20 !== -1 && pos30 !== -1 && pos40 !== -1 && pos50 !== -1 && pos60 !== -1, "所有六大階段皆應存在");
  assert.ok(pos10 < pos20, "10 啟動階段 必須排在 20 需求分析 之前");
  assert.ok(pos20 < pos30, "20 需求分析 必須排在 30 系統設計 之前");
  assert.ok(pos30 < pos40, "30 系統設計 必須排在 40 測試驗證 之前");
  assert.ok(pos40 < pos50, "40 測試驗證 必須排在 50 上線準備 之前");
  assert.ok(pos50 < pos60, "50 上線準備 必須排在 60 系統上線 之前");
});
