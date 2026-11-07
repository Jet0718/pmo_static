// ============================================================================
// 檔案名稱：dashboardStore.js
// 專案名稱：BDM 系統專案進度狀態分析統計模組 (Aras Innovator 12 SP9)
// 職責說明：遵循 S.O.L.I.D 單一職責原則 (SRP)，集中管理全域篩選條件、當前選中檢視頁籤、
//           下鑽專案編號與回呼通知機制。
// ============================================================================

(function (root) {
  "use strict";

  // 狀態儲存中心建構器
  function DashboardStateStore(apiClient = null) {
    this.apiClient = apiClient;
    // 當前分頁模式：SUMMARY (全域多專案總覽) | PROJECT_DETAIL (單一專案階段與偏差分析) | ASSIGNEES (成員任務負荷分析)
    this.activeTab = "SUMMARY";
    // 當前選中下鑽之專案編號
    this.selectedProjNum = 2127;
    // 首頁是否已展開詳細分析 (依使用者需求：首頁預設只極速載入長條圖，點擊色塊才展開詳細明細)
    this.isDetailExpanded = false;
    // 點擊色塊所選中展開之執行團隊代碼 (null 或 "ALL", "TPS", "ICS" 等)
    this.selectedTeamForDrill = null;
    // 篩選條件 (預設 state: Active, cn_project_type 複選預設: 1.Standard,2.Professional)
    this.filters = {
      state: "Active",
      project_type: "1.Standard,2.Professional",
      territory: "ALL",
      team_id: "ALL",
      pm_id: "ALL",
      health_status: "ALL",
      keyword: ""
    };
    // 最新載入之統計資料快取
    this.teamSummaryData = null;
    this.summaryData = null;
    this.projectDetailData = null;
    this.assigneeWorkloadData = null;
    this.listeners = [];
  }

  // 訂閱狀態變更通知
  DashboardStateStore.prototype.subscribe = function (listenerFn = null) {
    if (typeof listenerFn === "function") {
      this.listeners.push(listenerFn);
    }
  };

  // 觸發所有訂閱者更新畫面
  DashboardStateStore.prototype.notify = function () {
    var self = this;
    this.listeners.forEach(function (fn) {
      fn(self);
    });
  };

  // 更新篩選條件並重新載入資料
  DashboardStateStore.prototype.updateFilters = async function (partialFilters = {}) {
    var self = this;
    Object.keys(partialFilters).forEach(function (k) {
      self.filters[k] = partialFilters[k];
    });
    await this.refreshActiveView();
  };

  // 重置所有篩選條件至標準預設
  DashboardStateStore.prototype.resetFilters = async function () {
    this.isDetailExpanded = false;
    this.selectedTeamForDrill = null;
    this.filters = {
      state: "Active",
      project_type: "1.Standard,2.Professional",
      territory: "ALL",
      team_id: "ALL",
      pm_id: "ALL",
      health_status: "ALL",
      keyword: ""
    };
    await this.refreshActiveView();
  };

  // 點擊團隊長條圖色塊以展開該團隊之多專案進度詳細明細 (或切換已展開之團隊)
  DashboardStateStore.prototype.expandTeamDetail = async function (teamId = "ALL") {
    this.isDetailExpanded = true;
    this.selectedTeamForDrill = teamId;
    this.filters.team_id = teamId;
    await this.refreshActiveView();
  };

  // 收合詳細分析區域
  DashboardStateStore.prototype.collapseDetail = function () {
    this.isDetailExpanded = false;
    this.notify();
  };

  // 切換主導航分頁
  DashboardStateStore.prototype.setActiveTab = async function (tabName = "SUMMARY", projNum = 0) {
    this.activeTab = tabName;
    if (projNum > 0) {
      this.selectedProjNum = Number(projNum);
    }
    await this.refreshActiveView();
  };

  // 依據當前頁籤向後端或本地引擎請求最新資料
  DashboardStateStore.prototype.refreshActiveView = async function () {
    if (!this.apiClient) return;

    if (this.activeTab === "SUMMARY") {
      // 1. 極速取得執行團隊 Active 專案統計長條圖資料
      this.teamSummaryData = await this.apiClient.request("/api/v1/dashboard/team-summary", {
        state: this.filters.state,
        project_type: this.filters.project_type,
        territory: this.filters.territory,
        keyword: this.filters.keyword
      });

      // 2. 若使用者已點選色塊展開詳細分析，才載入計算耗時的全域/團隊明細分析
      if (this.isDetailExpanded) {
        var queryParams = Object.assign({}, this.filters);
        if (this.selectedTeamForDrill && this.selectedTeamForDrill !== "ALL") {
          queryParams.team_id = this.selectedTeamForDrill;
        }
        this.summaryData = await this.apiClient.request("/api/v1/dashboard/summary", queryParams);
      }
    } else if (this.activeTab === "PROJECT_DETAIL") {
      this.projectDetailData = await this.apiClient.request("/api/v1/dashboard/project", {
        proj_num: this.selectedProjNum
      });
    } else if (this.activeTab === "ASSIGNEES") {
      this.assigneeWorkloadData = await this.apiClient.request("/api/v1/dashboard/assignees", this.filters);
    }

    this.notify();
  };

  var exported = {
    DashboardStateStore: DashboardStateStore
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = exported;
  }
  if (root) {
    root.PMOStore = exported;
  }
})(typeof window !== "undefined" ? window : globalThis);
