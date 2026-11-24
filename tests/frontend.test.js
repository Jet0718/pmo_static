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
  assert.equal(resAll.summary.total_projects, 9);
  assert.equal(resAll.summary.active_projects, 9);
  assert.equal(resAll.rag_status.green_count, 4);
  assert.equal(resAll.rag_status.amber_count, 2);
  assert.equal(resAll.rag_status.red_count, 3);

  // 測試健康度燈號篩選 RED
  const resRed = PMOApi.buildSummaryFromProjects(PMOApi.DEFAULT_MOCK_PROJECTS, { health_status: "RED" });
  assert.equal(resRed.summary.total_projects, 3);

  // 測試服務中心篩選
  const resHsinchu = PMOApi.buildSummaryFromProjects(PMOApi.DEFAULT_MOCK_PROJECTS, { territory: "新竹服務中心" });
  assert.equal(resHsinchu.summary.total_projects, 3);

  // 測試專案類型 9 大類複選 (OR)
  const resMultiType = PMOApi.buildSummaryFromProjects(PMOApi.DEFAULT_MOCK_PROJECTS, { project_type: "1.Standard,2.Professional,3.Upgrade" });
  assert.equal(resMultiType.summary.total_projects, 9);

  // 測試執行團隊篩選 (TPS)
  const resTps = PMOApi.buildSummaryFromProjects(PMOApi.DEFAULT_MOCK_PROJECTS, { team_id: "TPS" });
  assert.equal(resTps.summary.total_projects, 2);
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

test("8. 各執行團隊與專案經理績效對比：展開團隊時應依不同的專案經理 (pm_performance) 作績效統計", () => {
  const fakeSummary = {
    summary: { total_projects: 18, active_projects: 18, closed_projects: 0, avg_progress: 59.6, total_team_count: 1, total_pm_count: 3, total_overdue_tasks: 205 },
    rag_status: { green_count: 0, amber_count: 0, red_count: 18, green_percent: 0, amber_percent: 0, red_percent: 100 },
    evm_summary: { avg_spi: 1.39, avg_cpi: 1.38, total_planned_value: 17169, total_earned_value: 16108, total_actual_cost: 25963.2 },
    team_performance: [
      { team_id: "TPS", team_name: "TPS", project_count: 18, avg_progress: 59.6, avg_spi: 1.39, avg_cpi: 1.38 }
    ],
    pm_performance: [
      { pm_id: "PM1", pm_name: "陸睿旭 Andrew", project_count: 6, avg_progress: 65.2, avg_spi: 1.25, avg_cpi: 1.30 },
      { pm_id: "PM2", pm_name: "張國倫 Allen.chang", project_count: 5, avg_progress: 52.0, avg_spi: 1.10, avg_cpi: 1.15 },
      { pm_id: "PM3", pm_name: "羅仁 Jet", project_count: 7, avg_progress: 61.0, avg_spi: 1.65, avg_cpi: 1.60 }
    ],
    projects: []
  };
  const fakeTeamSummary = {
    total_projects: 43,
    teams: [{ team_id: "TPS", team_name: "TPS", active_count: 18, project_count: 18, color: "#2563eb" }]
  };
  const fakeStore = {
    teamSummaryData: fakeTeamSummary,
    isDetailExpanded: true,
    selectedTeamForDrill: "TPS",
    filters: { state: "Active", team_id: "TPS" }
  };
  const html = PMODashboardApp.renderPortfolioSummaryView(fakeSummary, fakeStore);
  assert.ok(html.includes("陸睿旭 Andrew") && html.includes("(6 專案)"), "績效對比卡片應包含陸睿旭 Andrew (6 專案)");
  assert.ok(html.includes("張國倫 Allen.chang") && html.includes("(5 專案)"), "績效對比卡片應包含張國倫 Allen.chang (5 專案)");
  assert.ok(html.includes("羅仁 Jet") && html.includes("(7 專案)"), "績效對比卡片應包含羅仁 Jet (7 專案)");
  assert.ok(!html.includes("(18 專案)"), "績效對比卡片不應只顯示單一團隊 TPS (18 專案)，而應依不同 PM 統計");
});

test("9. [需求 1] 自然語言 NoUI 篩選解析器應保留預設 Standard/Professional 並正確解析複合自然語言條件", () => {
  // 空輸入時應保留預設 state=Active 且 project_type=1.Standard,2.Professional
  const defaultParsed = PMOApi.parseNaturalLanguageQuery("", null);
  assert.equal(defaultParsed.state, "Active");
  assert.equal(defaultParsed.project_type, "1.Standard,2.Professional");
  assert.equal(defaultParsed.team_id, "ALL");

  // 輸入「進行中 TPS 紅燈專案」
  const parsedTpsRed = PMOApi.parseNaturalLanguageQuery("查詢 進行中 TPS 紅燈專案", null);
  assert.equal(parsedTpsRed.state, "Active");
  assert.equal(parsedTpsRed.project_type, "1.Standard,2.Professional", "未提及專案類型時應維持預設 Standard/Professional");
  assert.equal(parsedTpsRed.team_id, "TPS");
  assert.equal(parsedTpsRed.health_status, "RED");
  assert.equal(parsedTpsRed.keyword, "");

  // 輸入「新竹服務中心 customize 或 upgrade 黃燈 陳建宏」
  const parsedCustom = PMOApi.parseNaturalLanguageQuery("新竹服務中心 customize 或 upgrade 黃燈 陳建宏", null);
  assert.equal(parsedCustom.territory, "新竹服務中心");
  assert.equal(parsedCustom.project_type, "3.Upgrade,4.Customize");
  assert.equal(parsedCustom.health_status, "YELLOW");
  assert.equal(parsedCustom.keyword, "陳建宏");
});

test("10. [需求 2] 預讀當前使用者 (user.team_id.keyed_name 與 user.value_score) 預設帶入團隊並限制非 V9/V10 跨團隊查詢", async () => {
  // 情境 A：TPS 團隊成員且 value_score = V8 (非 V9/V10) -> 預設篩選增加 TPS 且限制查詢其他執行團隊
  const clientTpsV8 = new PMOApi.ArasApiClient({
    mockUserContext: {
      user_id: "U_TPS_V8",
      login_name: "allen.chang",
      user_name: "張國倫 Allen.chang",
      team_id: "604F804DDA84451CA3B6CB54CD905BC9",
      raw_team_keyed_name: "TPS",
      value_score: "V8"
    }
  });
  const storeTpsV8 = new PMOStore.DashboardStateStore(clientTpsV8);
  await storeTpsV8.refreshActiveView();

  assert.equal(storeTpsV8.userContext.team_code, "TPS");
  assert.equal(storeTpsV8.userContext.value_score, "V8");
  assert.equal(storeTpsV8.userContext.is_team_restricted, true);
  assert.equal(storeTpsV8.filters.team_id, "TPS", "TPS 使用者預設篩選條件應自動帶入 TPS");

  // 當 TPS (V8) 使用者嘗試用自然語言查詢 ICS 團隊時，應被強制限制回 TPS 並產生權限提示
  await storeTpsV8.applyNaturalLanguageQuery("查詢 ICS 進行中專案");
  assert.equal(storeTpsV8.filters.team_id, "TPS", "非 V9/V10 之 TPS 使用者查詢 ICS 時應被強制鎖定為 TPS");
  assert.ok(storeTpsV8.restrictionNotice.includes("限制僅查詢 TPS"), "應顯示跨團隊限制提示訊息");

  // 當 TPS (V8) 使用者點擊長條圖上的 ICS 色塊時，也應被限制在 TPS
  await storeTpsV8.expandTeamDetail("ICS");
  assert.equal(storeTpsV8.selectedTeamForDrill, "TPS");
  assert.equal(storeTpsV8.summaryData.projects.length, 2);
  assert.equal(storeTpsV8.summaryData.projects[0].team_id, "TPS");

  // 情境 B：TPS 團隊成員但 value_score = V9 -> 預設篩選為 TPS，但允許跨團隊查詢 ICS
  const clientTpsV9 = new PMOApi.ArasApiClient({
    mockUserContext: {
      user_id: "U_TPS_V9",
      login_name: "tps.director",
      user_name: "TPS處長",
      team_id: "604F804DDA84451CA3B6CB54CD905BC9",
      raw_team_keyed_name: "TPS",
      value_score: "V9"
    }
  });
  const storeTpsV9 = new PMOStore.DashboardStateStore(clientTpsV9);
  await storeTpsV9.refreshActiveView();
  assert.equal(storeTpsV9.userContext.is_team_restricted, false);
  assert.equal(storeTpsV9.filters.team_id, "TPS", "TPS (V9) 預設仍帶入 TPS 團隊");

  await storeTpsV9.applyNaturalLanguageQuery("查詢 ICS 進行中專案");
  assert.equal(storeTpsV9.filters.team_id, "ICS", "V9 使用者應允許跨團隊切換查詢 ICS");
});

test("11. [需求 3 & 需求 4] 專案成員工時回報統計、各專案總工時/工天明細下鑽連結與左側 Aras Item Icon 開啟專案畫面", async () => {
  let openedItemType = "";
  let openedItemId = "";
  const fakeArasForUi = {
    uiShowItem: function (typeName, itemId) {
      openedItemType = typeName;
      openedItemId = itemId;
    }
  };

  const client = new PMOApi.ArasApiClient();
  const store = new PMOStore.DashboardStateStore(client);
  await store.expandTeamDetail("ALL");

  // 驗證需求 4：專案清單左側包含 Aras Project Item Icon 按鈕，且點擊可呼叫 uiShowItem 開啟專案畫面
  const summaryHtml = PMODashboardApp.renderPortfolioSummaryView(store.summaryData, store);
  assert.ok(summaryHtml.includes("js-open-aras-item"), "專案清單左側應渲染 Aras Item Icon 按鈕");
  assert.ok(summaryHtml.includes("data-project-id=\"A101B202C303D404E505F60607080910\""));

  const openRes = PMOApi.openProjectItemInAras("A101B202C303D404E505F60607080910", 2127, fakeArasForUi);
  assert.equal(openRes.opened, true);
  assert.equal(openedItemType, "Project");
  assert.equal(openedItemId, "A101B202C303D404E505F60607080910");

  // 驗證需求 3：切換至成員負荷與工時回報頁籤，檢驗成員工時回報統計圖、使用者工時回報總值連結與各專案工時/工天明細 Modal
  await store.setActiveTab("ASSIGNEES");
  const assigneeHtml = PMODashboardApp.renderAssigneeWorkloadView(store.assigneeWorkloadData);
  assert.ok(assigneeHtml.includes("專案成員工時回報統計"), "應包含專案成員工時回報統計卡片");
  assert.ok(assigneeHtml.includes("使用者工時回報總值 (總工時 / 工天)"), "成員負荷明細表應包含使用者工時回報總值欄位");
  assert.ok(assigneeHtml.includes("js-drill-member-worktime"), "成員工時回報總值應包含下鑽連結");

  // 點擊張家豪 (USR_CHANG) 的工時回報連結開啟跨專案工時/工天明細 Modal
  const member = store.openMemberWorkTimeModal("USR_CHANG");
  assert.ok(member, "應找到張家豪的工時回報資料");
  // 張家豪在 2127 (214.6hr)、2135 (365hr)、2142 (495hr) 總計 1074.6 hr = 134.33 工天
  assert.equal(member.reported_work_hours, 1074.6);
  assert.equal(member.reported_work_days, 134.33);
  assert.equal(member.project_worktime_breakdowns.length, 3);

  const modalHtml = PMODashboardApp.renderMemberWorkTimeModalHtml(member);
  assert.ok(modalHtml.includes("1074.6 hr") && modalHtml.includes("134.33 工天"), "Modal 應顯示該員回報總工時與換算總工天");
  assert.ok(modalHtml.includes("全球供應鏈協同門戶與派工整合升級案") && modalHtml.includes("495.0 hr"), "Modal 應列出各專案工時明細");

  // 當下鑽至單一專案 (PROJECT_DETAIL) 點擊成員工時連結時，應優先取用該專案 projectDetailData.assignees 之工時明細
  await store.setActiveTab("PROJECT_DETAIL", 2127);
  const singleProjMember = store.openMemberWorkTimeModal("USR_CHANG");
  assert.ok(singleProjMember, "單一專案下鑽應找到張家豪於該專案之工時資料");
  assert.equal(singleProjMember.reported_work_hours, 214.6, "單一專案下鑽應顯示該員於專案 2127 之回報工時 214.6 hr");
  assert.equal(singleProjMember.project_worktime_breakdowns.length, 1);
});

test("12. [停滯歸因與 NoUI 查詢] parseNaturalLanguageQuery 應正確解析停滯原因、實質完工與淨化戰況等指令", () => {
  // 1. 測試「真落後」
  const qRealLag = PMOApi.parseNaturalLanguageQuery("進行中 團隊真落後");
  assert.equal(qRealLag.filter_blocked, "exclude_external");
  assert.equal(qRealLag.health_status, "RED");

  // 2. 測試「等待客戶系統」
  const qWaitCust = PMOApi.parseNaturalLanguageQuery("查詢等待客戶系統一併上線的專案");
  assert.equal(qWaitCust.filter_blocked, "only_external");
  assert.equal(qWaitCust.stall_reason, "wait_cust_system");

  // 3. 測試「商務爭議」
  const qDispute = PMOApi.parseNaturalLanguageQuery("商務爭議 Standard");
  assert.equal(qDispute.stall_reason, "commercial_dispute");
  assert.equal(qDispute.project_type, "1.Standard");

  // 4. 測試「實質完工」
  const qSubstantial = PMOApi.parseNaturalLanguageQuery("實質完工待驗收");
  assert.equal(qSubstantial.is_substantially_completed, "true");

  // 5. 測試「排除外部」或「淨化戰況」
  const qPurify = PMOApi.parseNaturalLanguageQuery("進行中 排除外部受阻 淨化戰況");
  assert.equal(qPurify.filter_blocked, "exclude_external");
});

test("13. [雙軌健康度與延遲校正] buildSummaryFromProjects 應正確輸出 operational_rag、stall_summary、實質完工與校正後延遲天數", () => {
  // 1. 全域分析
  const res = PMOApi.buildSummaryFromProjects(PMOApi.DEFAULT_MOCK_PROJECTS, { state: "ALL" });
  assert.equal(res.status, "success");
  assert.ok(res.operational_rag, "應輸出 operational_rag 物件");
  assert.ok(res.stall_summary, "應輸出 stall_summary 物件");

  // 驗證雙軌分流：合約 RED 共有 3 案 (2142, 2188, 2190)，但 2142 為外部受阻 (BLOCKED)，2190 為商務爭議 (BLOCKED)，因此 operational_rag.red_count 僅為 1 案 (2188 內部瓶頸)
  assert.equal(res.rag_status.red_count, 3, "整體合約排程落後應為 3 案");
  assert.equal(res.operational_rag.red_count, 1, "內部團隊真落後應分流為 1 案");
  assert.equal(res.operational_rag.blocked_count, 2, "外部受阻與商務爭議應計 2 案 (2142, 2190)");
  assert.equal(res.operational_rag.substantial_count, 1, "實質完工待收尾應計 1 案 (2175)");
  assert.equal(res.substantially_completed_count, 2, "實質完工標記專案總數應為 2 案 (2175, 2190)");

  // 2. 測試「排除外部受阻 (filter_blocked = exclude_external)」淨化數據過濾
  const resPurified = PMOApi.buildSummaryFromProjects(PMOApi.DEFAULT_MOCK_PROJECTS, {
    state: "ALL",
    filter_blocked: "exclude_external"
  });
  // 原始 9 案扣除 2142 (EXTERNAL)、2175 (EXTERNAL)、2190 (COMMERCIAL)，淨化後應剩 6 案
  assert.equal(resPurified.summary.total_projects, 6, "排除外部與商務受阻後應保留 6 案純團隊作戰資料");
  assert.equal(resPurified.rag_status.red_count, 1, "淨化後的紅燈案僅剩 2188 真正內部落後專案");
  assert.equal(resPurified.projects[0].proj_num !== 2142 && resPurified.projects.every(p => p.proj_num !== 2142), true, "2142 應被完全排除");

  // 3. 測試延遲天數校正 (AdjustedDelayDays)：外部受阻專案延遲天數校正為 0 天
  const proj2142 = res.projects.find(p => p.proj_num === 2142);
  assert.ok(proj2142);
  assert.equal(proj2142.adjusted_delay_days, 0, "外部受阻專案校正延遲應為 0 天");
  assert.equal(proj2142.delay_days, 15, "原始排程延遲仍保留 15 天");
});

test("14. [HTML 實體防重覆轉義] escapeHtml 應正確防止 &amp; 雙重轉義", () => {
  const safeName1 = PMOCharts.escapeHtml("強茂FMEA&amp;專案模組導入");
  assert.equal(safeName1, "強茂FMEA&amp;專案模組導入", "含有 &amp; 的專案名稱轉義後應維持標準 &amp; 而非 &amp;amp;");

  const safeName2 = PMOCharts.escapeHtml("聯電 & 台積電 <測試專案>");
  assert.equal(safeName2, "聯電 &amp; 台積電 &lt;測試專案&gt;", "一般 & 與角括號應正常轉義");
});

test("15. [單一專案下鑽頁籤] renderProjectDetailView 應渲染雙軌健康度分流標籤與停滯歸因徽章", () => {
  const mockDetailData = {
    project: {
      id: "PROJ_2345",
      proj_num: 2345,
      project_name: "強茂FMEA&amp;專案模組導入",
      pm_name: "吳怡潔 Joy",
      team_name: "TPS",
      territory: "TPS",
      customer_name: "強茂股份有限公司",
      sched_start: "2026-01-19",
      sched_due: "2026-06-26",
      actual_progress: 81.0,
      expected_progress: 100.0,
      progress_gap: 19.0,
      delay_days: 143,
      adjusted_delay_days: 0,
      health_status: "RED",
      operational_health: "BLOCKED",
      stall_reason: "cust_hold",
      stall_type: "EXTERNAL",
      stall_reason_label: "客戶端要求暫停",
      spi: 0.81,
      cpi: 1.80,
      cn_sv: -87,
      cn_cv: 174,
      planned_value: 456,
      earned_value: 369,
      actual_cost: 205,
      exp_mandays: 57,
      remainder_hours: 251,
      completed_tasks: 14,
      total_tasks: 19,
      in_progress_tasks: 5,
      not_started_tasks: 0,
      overdue_tasks: 5,
      phases: []
    },
    wbs_items: [],
    assignees: []
  };

  const html = PMODashboardApp.renderProjectDetailView(mockDetailData, [mockDetailData.project]);
  assert.ok(html.includes("detail-project-title"), "應包含專案標題");
  assert.ok(html.includes("badge-stall-external"), "應渲染外部停滯徽章");
  assert.ok(html.includes("客戶端要求暫停"), "應顯示停滯原因中文標籤");
  assert.ok(html.includes("op-health-blocked"), "應渲染內部健康度受阻樣式");
  assert.ok(html.includes("🛡️ 內部健康度: 外部受阻"), "應顯示雙軌健康度分流文字");
  assert.ok(html.includes("校正延遲: 0 天"), "KPI 區塊應顯示校正後延遲天數");
  assert.ok(html.includes("(143天)"), "KPI 區塊應以刪除線顯示原始排程延遲");
  assert.ok(!html.includes("&amp;amp;"), "不可出現二次轉義的 &amp;amp;");
});
