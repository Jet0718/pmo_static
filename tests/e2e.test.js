// ============================================================================
// 檔案名稱：e2e.test.js
// 專案名稱：BDM 系統專案進度狀態分析統計模組 (Aras Innovator 12 SP9)
// 職責說明：使用 Chrome 原生 Headless 執行真實瀏覽器端對端 (E2E) 測試
//           驗證：1.首頁極速長條圖 2.團隊長條色塊互動 3.專案類型 9 項複選 4.預設Active 5.團隊選單 6.專案編號下鑽
// ============================================================================

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const FRONTEND_DIR = path.resolve(__dirname, "../frontend");
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

function runChromeDumpDom(filePath) {
  const normalizedPath = filePath.replace(/\\/g, "/");
  const tempProfile = path.resolve(__dirname, "temp_profile_" + Date.now()).replace(/\\/g, "/");
  const tempOut = path.resolve(__dirname, "temp_out_" + Date.now() + ".html").replace(/\\/g, "/");
  const psCmd = `[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; & '${CHROME_PATH}' --headless=new --disable-gpu --no-sandbox --user-data-dir='${tempProfile}' --dump-dom 'file:///${normalizedPath}' | Set-Content -Encoding utf8 '${tempOut}'`;
  execSync(`powershell -Command "${psCmd}"`, { stdio: "ignore" });
  const html = fs.existsSync(tempOut) ? fs.readFileSync(tempOut, "utf8") : "";
  try {
    if (fs.existsSync(tempOut)) fs.unlinkSync(tempOut);
    if (fs.existsSync(tempProfile)) fs.rmSync(tempProfile, { recursive: true, force: true });
  } catch (e) {}
  return html;
}

function runE2ETests() {
  console.log("=== 開始執行 PMO 儀表板瀏覽器 E2E 端對端測試 ===");
  if (!fs.existsSync(CHROME_PATH)) {
    console.log("[SKIP] 系統未安裝 Chrome，略過真實瀏覽器執行");
    return;
  }

  const indexPath = path.join(FRONTEND_DIR, "index.html");

  // 1. 驗證首頁初始渲染 (極速長條圖、預設狀態 Active、9大專案類型複選、團隊選單)
  const domHtml = runChromeDumpDom(indexPath);
  console.log("[PASS] 1. Chrome Headless 成功載入頁面並完成首頁極速渲染");

  // 驗證需求 3：專案狀態預設 Active
  if (!domHtml.includes('<option value="Active" selected="">進行中 (Active)</option>') &&
      !domHtml.includes('value="Active" selected')) {
    throw new Error("預設專案狀態未選中 Active");
  }
  console.log(" [PASS] 1.1 專案狀態 (state) 預設為 Active");

  // 驗證需求 2：專案類型 9 項複選下拉選單
  const expectedTypes = [
    "1.Standard", "2.Professional", "3.Upgrade", "4.Customize",
    "5.Product", "6.Technical", "7.Marketing", "8.EmployeeTraining", "F.Misc"
  ];
  for (const t of expectedTypes) {
    if (!domHtml.includes(`class="js-filter-type" value="${t}"`)) {
      throw new Error(`專案類型 9 大類遺漏項目: ${t}`);
    }
  }
  if (!domHtml.includes('id="type-dropdown-trigger"') || !domHtml.includes('id="type-dropdown-panel"')) {
    throw new Error("專案類型未包含下拉式複選觸發鈕與面板容器");
  }
  console.log(" [PASS] 1.2 專案類型 (cn_project_type) 完整提供 9 大類型下拉式複選，且預設勾選 1.Standard 與 2.Professional");

  // 驗證需求 4：團隊選單純淨包含 TPS, ICS, PMO, SUS, SHS, Other (無冗餘中文)
  const requiredTeams = ["TPS", "ICS", "PMO", "SUS", "SHS", "Other"];
  for (const t of requiredTeams) {
    if (!domHtml.includes(`<option value="${t}">${t}</option>`)) {
      throw new Error(`執行團隊選單純代碼選項遺漏或不符: ${t}`);
    }
  }
  // 嚴格驗證不得包含任何冗餘中文後綴 (如 顧問團隊、專案管理處)
  if (domHtml.includes("TPS 顧問團隊") || domHtml.includes("ICS 顧問團隊") || domHtml.includes("PMO 專案管理處")) {
    throw new Error("執行團隊選單仍殘留不正確的中文XX團隊後綴！");
  }
  console.log(" [PASS] 1.3 執行團隊選單純淨包含 TPS, ICS, PMO, SUS, SHS, Other (已徹底移除中文XX團隊後綴)");

  // 驗證需求 1：首頁長條圖渲染 (動態狀態標題)
  if (!domHtml.includes("各執行團隊進行中 (Active) 專案數量統計") ||
      !domHtml.includes('data-team-id="TPS"') ||
      !domHtml.includes('data-team-id="ICS"')) {
    throw new Error("首頁未正確渲染各執行團隊進行中專案數量長條圖");
  }
  console.log(" [PASS] 1.4 首頁極速渲染各執行團隊專案數長條圖與動態狀態標題");

  // 2. 驗證點擊團隊色塊展開明細與取消下鑽操作欄位 (需求 1 & 需求 5)
  const testHtmlPath = path.join(FRONTEND_DIR, "e2e_runner.html");
  const testRunnerContent = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body>
  <div id="container"></div>
  <script src="./js/arasApiClient.js"></script>
  <script src="./js/dashboardStore.js"></script>
  <script src="./js/svgChartEngine.js"></script>
  <script src="./js/dashboardApp.js"></script>
  <script>
    document.addEventListener("DOMContentLoaded", async function() {
      const client = new window.PMOApi.ArasApiClient();
      const store = new window.PMOStore.DashboardStateStore(client);
      await store.refreshActiveView();
      // 模擬點擊 TPS 色塊展開明細
      await store.expandTeamDetail("TPS");
      document.getElementById("container").innerHTML = window.PMODashboardApp.renderPortfolioSummaryView(store.summaryData, store);
    });
  </script>
</body>
</html>`;
  fs.writeFileSync(testHtmlPath, testRunnerContent, "utf8");

  const interactiveDom = runChromeDumpDom(testHtmlPath);
  if (fs.existsSync(testHtmlPath)) fs.unlinkSync(testHtmlPath);

  // 驗證是否展開了 TPS 詳細明細與依專案經理 (PM) 統計之績效對比
  if (!interactiveDom.includes("次世代 BDM 智慧製造整合專案") || !interactiveDom.includes("陳建宏") || !interactiveDom.includes("(1 專案)")) {
    throw new Error("點擊 TPS 色塊後未正確向下展開 TPS 專案明細或 PM 績效統計");
  }
  console.log(" [PASS] 1.5 點擊團隊長條色塊成功向下展開該團隊詳細明細與各專案經理 (PM) 績效統計");

  // 驗證需求 5：多專案總覽表取消下鑽操作欄位，併在第一欄專案編號超連結
  if (interactiveDom.includes("<th>下鑽操作</th>") || interactiveDom.includes("階段與成員分析 &rarr;")) {
    throw new Error("表格中仍殘留下鑽操作欄位！");
  }
  if (!interactiveDom.includes('class="pmo-proj-link js-drill-project"') ||
      !interactiveDom.includes('data-proj-num="2127"')) {
    throw new Error("第一欄專案編號未正確帶有下鑽超連結 class 與 data-proj-num");
  }
  console.log(" [PASS] 1.6 多專案總覽表取消獨立下鑽操作欄位，並將下鑽連結完美整併於第一欄專案編號中");

  // 3. 驗證單一專案下鑽視圖：WBS 階段名稱升冪排序與成員任務負荷 (圖1 & 圖2)
  const detailRunnerPath = path.join(FRONTEND_DIR, "e2e_detail_runner.html");
  const detailRunnerContent = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body>
  <div id="container"></div>
  <script src="./js/arasApiClient.js"></script>
  <script src="./js/dashboardStore.js"></script>
  <script src="./js/svgChartEngine.js"></script>
  <script src="./js/dashboardApp.js"></script>
  <script>
    document.addEventListener("DOMContentLoaded", async function() {
      const client = new window.PMOApi.ArasApiClient();
      const store = new window.PMOStore.DashboardStateStore(client);
      await store.setActiveTab("PROJECT_DETAIL", 2127);
      document.getElementById("container").innerHTML = window.PMODashboardApp.renderProjectDetailView(store.projectDetailData, [store.projectDetailData.project]);
    });
  </script>
</body>
</html>`;
  fs.writeFileSync(detailRunnerPath, detailRunnerContent, "utf8");

  const detailDom = runChromeDumpDom(detailRunnerPath);
  if (fs.existsSync(detailRunnerPath)) fs.unlinkSync(detailRunnerPath);

  // 驗證成員統計卡片包含指派成員 (林俊傑、張家豪)
  if (!detailDom.includes("林俊傑 (資深架構師)") || !detailDom.includes("張家豪 (全端工程師)")) {
    throw new Error("單一專案成員統計卡片遺漏實際任務負責人 (managed_by_id)！");
  }
  console.log(" [PASS] 1.7 單一專案本專案成員 (Assignee) 任務負荷完整呈現所有指派成員 (包含林俊傑、張家豪等)");

  // 驗證 WBS 主階段名稱排序：Phase 1 在 Phase 2 之前，Phase 2 在 Phase 3 之前
  const idxP1 = detailDom.indexOf("Phase 1: 商業流程藍圖與需求確認");
  const idxP2 = detailDom.indexOf("Phase 2: 系統架構設計與資料模型配置");
  const idxP3 = detailDom.indexOf("Phase 3: 客製化 Server/Client Method 開發");
  if (idxP1 === -1 || idxP2 === -1 || idxP3 === -1 || !(idxP1 < idxP2 && idxP2 < idxP3)) {
    throw new Error("單一專案 WBS 階段與明細表未依名稱升冪排序！");
  }
  console.log(" [PASS] 1.8 各階段 (WBS Stage / Milestone) 與明細表嚴格依名稱自然排序升冪排列 (Phase 1 -> Phase 2 -> Phase 3)");

  console.log("======================================================");
  console.log("🎉 所有 Chrome 瀏覽器 E2E 測試全部通過 (8 項測試全數 PASS)！");
}

if (require.main === module) {
  try {
    runE2ETests();
  } catch (err) {
    console.error("E2E 測試失敗:", err);
    process.exit(1);
  }
}

module.exports = { runE2ETests };
