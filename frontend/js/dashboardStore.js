// ============================================================================
// 檔案名稱：dashboardStore.js
// 專案名稱：BDM 系統專案進度狀態分析統計模組 (Aras Innovator 12 SP9)
// 職責說明：遵循 S.O.L.I.D 單一職責原則 (SRP)，集中管理全域篩選條件、當前選中檢視頁籤、
//           下鑽專案編號與回呼通知機制。
// ============================================================================

(function (root) {
  "use strict";

  var PMOApi = root.PMOApi || (typeof require !== "undefined" ? require("./arasApiClient.js") : {});

  // 狀態儲存中心建構器
  function DashboardStateStore(apiClient = null) {
    this.apiClient = apiClient;
    // 當前分頁模式：SUMMARY (全域多專案總覽) | PROJECT_DETAIL (單一專案階段與偏差分析) | ASSIGNEES (成員任務負荷與工時回報分析)
    this.activeTab = "SUMMARY";
    // 當前選中下鑽之專案編號
    this.selectedProjNum = 2127;
    // 首頁是否已展開詳細分析 (依使用者需求：首頁預設只極速載入長條圖，點擊色塊才展開詳細明細)
    this.isDetailExpanded = false;
    // 點擊色塊所選中展開之執行團隊代碼 (null 或 "ALL", "TPS", "ICS" 等)
    this.selectedTeamForDrill = null;
    // 當前登入使用者權限預讀上下文 (user.team_id.keyed_name 與 user.value_score)
    this.userContext = null;
    // 是否已完成使用者上下文預讀初始化
    this.userContextLoaded = false;
    // 自然語言輸入原句 (NoUI 輸入框內容)
    this.naturalQuery = "";
    // 當受限使用者嘗試跨團隊查詢時之提示訊息
    this.restrictionNotice = "";
    // 當前點選開啟工時回報下鑽 Modal 之成員物件
    this.selectedMemberForWorkTimeModal = null;
    // 篩選條件 (預設 state: Active, cn_project_type 複選預設: 1.Standard,2.Professional)
    this.filters = {
      state: "Active",
      project_type: "1.Standard,2.Professional",
      territory: "ALL",
      team_id: "ALL",
      pm_id: "ALL",
      health_status: "ALL",
      filter_blocked: "all",
      stall_reason: "ALL",
      is_substantially_completed: "",
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

  // 預讀當前登入使用者 (user.team_id.keyed_name 與 user.value_score) 並初始化預設團隊篩選與權限限制 (需求 2)
  DashboardStateStore.prototype.initUserContext = async function (overrideUserContext = null) {
    if (overrideUserContext && typeof PMOApi.buildUserContext === "function") {
      this.userContext = PMOApi.buildUserContext(overrideUserContext);
      this.userContextLoaded = true;
    } else if (!this.userContextLoaded && this.apiClient) {
      var res = await this.apiClient.request("/api/v1/dashboard/user-context", {});
      if (res && res.user_context && typeof PMOApi.buildUserContext === "function") {
        this.userContext = PMOApi.buildUserContext(res.user_context);
      } else if (res && res.user_context) {
        this.userContext = res.user_context;
      }
      this.userContextLoaded = true;
    }

    if (this.userContext && this.userContext.is_managed_exec_team && this.userContext.team_code) {
      if (this.userContext.is_team_restricted || this.filters.team_id === "ALL") {
        this.filters.team_id = this.userContext.team_code;
      }
    }
    return this.userContext;
  };

  // 以自然語言輸入字串更新篩選條件並重新載入資料 (需求 1 & 需求 2)
  DashboardStateStore.prototype.applyNaturalLanguageQuery = async function (rawInput = "") {
    if (!this.userContextLoaded) {
      await this.initUserContext();
    }
    this.naturalQuery = String(rawInput || "");
    var parsed = typeof PMOApi.parseNaturalLanguageQuery === "function"
      ? PMOApi.parseNaturalLanguageQuery(this.naturalQuery, this.userContext)
      : {
          state: "Active",
          project_type: "1.Standard,2.Professional",
          territory: "ALL",
          team_id: (this.userContext && this.userContext.default_team_filter) || "ALL",
          pm_id: "ALL",
          health_status: "ALL",
          keyword: this.naturalQuery.trim(),
          blocked_cross_team_attempt: false
        };

    this.filters.state = parsed.state;
    this.filters.project_type = parsed.project_type;
    this.filters.territory = parsed.territory;
    this.filters.team_id = parsed.team_id;
    this.filters.pm_id = parsed.pm_id || "ALL";
    this.filters.health_status = parsed.health_status;
    this.filters.filter_blocked = parsed.filter_blocked || "all";
    this.filters.stall_reason = parsed.stall_reason || "ALL";
    this.filters.is_substantially_completed = parsed.is_substantially_completed || "";
    this.filters.keyword = parsed.keyword;

    if (parsed.blocked_cross_team_attempt && this.userContext) {
      this.restrictionNotice = "權限提示：您所屬執行團隊為 " + this.userContext.team_code + " (value_score: " + (this.userContext.value_score || "未設定") + "，非 V9/V10)，系統已限制僅查詢 " + this.userContext.team_code + " 團隊專案。";
    } else {
      this.restrictionNotice = "";
    }

    if (this.isDetailExpanded) {
      this.selectedTeamForDrill = this.filters.team_id;
    }

    await this.refreshActiveView();
  };

  // 更新篩選條件並重新載入資料 (自動遵守使用者團隊權限限制)
  DashboardStateStore.prototype.updateFilters = async function (partialFilters = {}) {
    if (!this.userContextLoaded) {
      await this.initUserContext();
    }
    var self = this;
    Object.keys(partialFilters).forEach(function (k) {
      self.filters[k] = partialFilters[k];
    });
    if (this.userContext && this.userContext.is_team_restricted && this.userContext.team_code) {
      if (this.filters.team_id && this.filters.team_id.toUpperCase() !== this.userContext.team_code.toUpperCase()) {
        this.restrictionNotice = "權限提示：您所屬執行團隊為 " + this.userContext.team_code + " (非 V9/V10)，已鎖定僅查詢 " + this.userContext.team_code + " 團隊專案。";
      }
      this.filters.team_id = this.userContext.team_code;
    }
    await this.refreshActiveView();
  };

  // 重置所有篩選條件至標準預設 (保留 project_type 為 1.Standard,2.Professional 且依使用者團隊帶入預設 team_id)
  DashboardStateStore.prototype.resetFilters = async function () {
    if (!this.userContextLoaded) {
      await this.initUserContext();
    }
    this.isDetailExpanded = false;
    this.selectedTeamForDrill = null;
    this.naturalQuery = "";
    this.restrictionNotice = "";
    var defaultTeam = (this.userContext && this.userContext.is_managed_exec_team && this.userContext.team_code)
      ? this.userContext.team_code
      : "ALL";
    this.filters = {
      state: "Active",
      project_type: "1.Standard,2.Professional",
      territory: "ALL",
      team_id: defaultTeam,
      pm_id: "ALL",
      health_status: "ALL",
      filter_blocked: "all",
      stall_reason: "ALL",
      is_substantially_completed: "",
      keyword: ""
    };
    await this.refreshActiveView();
  };

  // 點擊團隊長條圖色塊以展開該團隊之多專案進度詳細明細 (若使用者受限於自身團隊則攔截跨團隊展開)
  DashboardStateStore.prototype.expandTeamDetail = async function (teamId = "ALL") {
    if (!this.userContextLoaded) {
      await this.initUserContext();
    }
    var targetTeam = teamId || "ALL";
    if (this.userContext && this.userContext.is_team_restricted && this.userContext.team_code) {
      if (targetTeam.toUpperCase() !== this.userContext.team_code.toUpperCase()) {
        this.restrictionNotice = "權限提示：您所屬執行團隊為 " + this.userContext.team_code + " (value_score: " + (this.userContext.value_score || "未設定") + "，非 V9/V10)，無法跨團隊查詢 " + targetTeam + "。";
      } else {
        this.restrictionNotice = "";
      }
      targetTeam = this.userContext.team_code;
    } else {
      this.restrictionNotice = "";
    }
    this.isDetailExpanded = true;
    this.selectedTeamForDrill = targetTeam;
    this.filters.team_id = targetTeam;
    await this.refreshActiveView();
  };

  // 開啟指定專案成員之跨專案工時回報明細浮層 Modal (需求 3)
  DashboardStateStore.prototype.openMemberWorkTimeModal = function (assigneeId = "") {
    var primaryList = this.activeTab === "PROJECT_DETAIL"
      ? ((this.projectDetailData && this.projectDetailData.assignees) || [])
      : ((this.assigneeWorkloadData && this.assigneeWorkloadData.assignees) || []);
    var fallbackList = this.activeTab === "PROJECT_DETAIL"
      ? ((this.assigneeWorkloadData && this.assigneeWorkloadData.assignees) || [])
      : ((this.projectDetailData && this.projectDetailData.assignees) || []);
    var found = null;
    var i = 0;
    for (i = 0; i < primaryList.length; i++) {
      if (String(primaryList[i].assignee_id) === String(assigneeId) || String(primaryList[i].assignee_name) === String(assigneeId)) {
        found = primaryList[i];
        break;
      }
    }
    if (!found) {
      for (i = 0; i < fallbackList.length; i++) {
        if (String(fallbackList[i].assignee_id) === String(assigneeId) || String(fallbackList[i].assignee_name) === String(assigneeId)) {
          found = fallbackList[i];
          break;
        }
      }
    }
    this.selectedMemberForWorkTimeModal = found;
    this.notify();
    return found;
  };

  // 關閉成員跨專案工時回報明細浮層 Modal
  DashboardStateStore.prototype.closeMemberWorkTimeModal = function () {
    this.selectedMemberForWorkTimeModal = null;
    this.notify();
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
    if (!this.userContextLoaded) {
      await this.initUserContext();
    }

    if (this.activeTab === "SUMMARY") {
      // 1. 極速取得執行團隊專案統計長條圖資料
      this.teamSummaryData = await this.apiClient.request("/api/v1/dashboard/team-summary", {
        state: this.filters.state,
        project_type: this.filters.project_type,
        territory: this.filters.territory,
        team_id: this.filters.team_id,
        keyword: this.filters.keyword
      });
      if (this.teamSummaryData && this.teamSummaryData.user_context && typeof PMOApi.buildUserContext === "function") {
        this.userContext = PMOApi.buildUserContext(this.teamSummaryData.user_context);
        if (this.userContext.is_team_restricted && this.userContext.team_code) {
          this.filters.team_id = this.userContext.team_code;
        }
      }

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
