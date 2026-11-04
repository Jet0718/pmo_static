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

test("2. buildSummaryFromProjects 應正確計算多專案 KPI、RAG 分佈與團隊/PM 比較數據", () => {
  const resAll = PMOApi.buildSummaryFromProjects(PMOApi.DEFAULT_MOCK_PROJECTS, { state: "ALL" });
  assert.equal(resAll.status, "success");
  assert.equal(resAll.summary.total_projects, 4);
  assert.equal(resAll.summary.active_projects, 3);
  assert.equal(resAll.summary.closed_projects, 1);
  assert.equal(resAll.rag_status.green_count, 2);
  assert.equal(resAll.rag_status.amber_count, 1);
  assert.equal(resAll.rag_status.red_count, 1);

  // 測試健康度燈號篩選 RED
  const resRed = PMOApi.buildSummaryFromProjects(PMOApi.DEFAULT_MOCK_PROJECTS, { health_status: "RED" });
  assert.equal(resRed.summary.total_projects, 1);
  assert.equal(resRed.projects[0].proj_num, 2142);

  // 測試服務中心篩選
  const resHsinchu = PMOApi.buildSummaryFromProjects(PMOApi.DEFAULT_MOCK_PROJECTS, { territory: "新竹服務中心" });
  assert.equal(resHsinchu.summary.total_projects, 1);
  assert.equal(resHsinchu.projects[0].proj_num, 2135);
});

test("3. aggregateCrossProjectAssignees 應正確統計跨專案成員任務負荷與逾期排序", () => {
  const assignees = PMOApi.aggregateCrossProjectAssignees(PMOApi.DEFAULT_MOCK_PROJECTS, {});
  assert.ok(assignees.length >= 4);
  // 張家豪跨 3 個專案且逾期任務最多，應排在第一位
  assert.equal(assignees[0].assignee_id, "USR_CHANG");
  assert.equal(assignees[0].project_count, 3);
  assert.equal(assignees[0].overdue_tasks, 4);
  assert.equal(assignees[0].load_level, "OVERLOAD");
});

test("4. ArasApiClient 支援 IOM applyMethod 注入與 RESTful 路由分發", async () => {
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

test("5. DashboardStateStore 與 SVG 圖表/視圖渲染器應輸出零 NaN 且結構完整的 HTML", async () => {
  const client = new PMOApi.ArasApiClient();
  const store = new PMOStore.DashboardStateStore(client);

  await store.refreshActiveView();
  const summaryHtml = PMODashboardApp.renderPortfolioSummaryView(store.summaryData);
  assert.ok(summaryHtml.includes("次世代 BDM 智慧製造整合專案"));
  assert.ok(!summaryHtml.includes("NaN"));
  assert.ok(!summaryHtml.includes("[object Object]"));

  await store.setActiveTab("PROJECT_DETAIL", 2135);
  const detailHtml = PMODashboardApp.renderProjectDetailView(store.projectDetailData, store.summaryData.projects);
  assert.ok(detailHtml.includes("車用電子研發 BOM 與變更簽核導入案"));
  assert.ok(detailHtml.includes("Phase 2: EBOM/MBOM 自動拋轉介面開發"));
  assert.ok(detailHtml.includes("+6 天延遲"));
  assert.ok(!detailHtml.includes("NaN"));

  await store.setActiveTab("ASSIGNEES");
  const assigneeHtml = PMODashboardApp.renderAssigneeWorkloadView(store.assigneeWorkloadData);
  assert.ok(assigneeHtml.includes("張家豪 (全端工程師)"));
  assert.ok(assigneeHtml.includes("OVERLOAD"));
  assert.ok(!assigneeHtml.includes("NaN"));
});
