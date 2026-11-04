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
    // 篩選條件
    this.filters = {
      state: "ALL",
      project_type: "ALL",
      territory: "ALL",
      team_id: "ALL",
      pm_id: "ALL",
      health_status: "ALL",
      keyword: ""
    };
    // 最新載入之統計資料快取
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

  // 重置所有篩選條件
  DashboardStateStore.prototype.resetFilters = async function () {
    this.filters = {
      state: "ALL",
      project_type: "ALL",
      territory: "ALL",
      team_id: "ALL",
      pm_id: "ALL",
      health_status: "ALL",
      keyword: ""
    };
    await this.refreshActiveView();
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

    this.summaryData = await this.apiClient.request("/api/v1/dashboard/summary", this.filters);

    if (this.activeTab === "PROJECT_DETAIL") {
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
