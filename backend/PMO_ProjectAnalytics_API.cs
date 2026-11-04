// ============================================================================
// 檔案名稱：PMO_ProjectAnalytics_API.cs
// 專案名稱：BDM 系統專案進度狀態分析統計模組 (Aras Innovator 12 SP9)
// 目標站台：https://bco.openplm.com.tw/innovatorbw (資料庫：BWCS-CRM)
// 設計原則：遵循 S.O.L.I.D 原則、Aras Server Method Wrapper 規範、防注入與全路徑回傳
// ============================================================================

// Aras Server Method 進入點 (由 ItemMethod.methodCode() 包裝執行)
Innovator inn = this.getInnovator();
try
{
    // 建立資料存取層與各領域分析服務實例 (符合依賴反轉原則 DIP)
    IProjectRepository repository = new ArasProjectRepository(inn);
    IProjectHealthCalculator healthCalculator = new ProjectHealthCalculator();
    IWbsStageAnalyzer stageAnalyzer = new WbsStageAnalyzer(healthCalculator);
    IWorkloadAggregator workloadAggregator = new WorkloadAggregator();

    // 建立 RESTful 風格控制器並處理請求
    ProjectAnalyticsController controller = new ProjectAnalyticsController(
        repository,
        healthCalculator,
        stageAnalyzer,
        workloadAggregator
    );

    string jsonResponse = controller.HandleItemRequest(this, System.DateTime.Today);
    Item resultItem = inn.newResult(jsonResponse);
    return resultItem;
}
catch (System.Exception ex)
{
    // 全路徑回傳保證：捕捉未預期例外並回傳標準 Aras Error Item
    return inn.newError("PMO_ProjectAnalytics_API 執行異常: " + ex.Message);
}

// ============================================================================
// 以下為 S.O.L.I.D 領域模型、介面與服務類別定義 (結束 methodCode 與外層 Wrapper 後宣告)
// ============================================================================
}
}

/// <summary>
/// 專案進度分析查詢參數傳輸物件 (Query DTO)
/// </summary>
public class AnalyticsQueryDto
{
    // RESTful 路由路徑或 Action 名稱
    public string Route { get; set; }
    // 專案生命週期狀態篩選 (Active / closed / pending / All)
    public string StateFilter { get; set; }
    // 專案類型篩選 (1.Standard / 2.Professional / ALL)
    public string ProjectTypeFilter { get; set; }
    // 服務中心篩選 (territory)
    public string TerritoryFilter { get; set; }
    // 執行團隊 ID 篩選 (team_id)
    public string TeamId { get; set; }
    // 專案經理 ID 篩選 (owned_by_id)
    public string PmId { get; set; }
    // 健康度燈號篩選 (GREEN / YELLOW / RED / ALL)
    public string HealthFilter { get; set; }
    // 關鍵字搜尋 (比對專案編號或專案名稱)
    public string Keyword { get; set; }
    // 指定查詢之專案編號 (project_number)
    public int ProjNum { get; set; }

    /// <summary>
    /// 建構函式：初始化預設查詢條件
    /// </summary>
    public AnalyticsQueryDto()
    {
        this.Route = "/api/v1/dashboard/summary";
        this.StateFilter = "Active";
        this.ProjectTypeFilter = "ALL";
        this.TerritoryFilter = "ALL";
        this.TeamId = "ALL";
        this.PmId = "ALL";
        this.HealthFilter = "ALL";
        this.Keyword = "";
        this.ProjNum = 0;
    }
}

/// <summary>
/// 專案主檔實體模型 (對應 Aras Project ItemType 含客製化欄位 cn_* / bcs_* / Ph 1~12)
/// </summary>
public class ProjectRecord
{
    // Aras 32碼 GUID
    public string Id { get; set; }
    // 專案編號 (project_number)
    public int ProjNum { get; set; }
    // 專案名稱 (name)
    public string Name { get; set; }
    // 生命週期狀態 (state: Active / closed / pending)
    public string State { get; set; }
    // 專案類型 (cn_project_type: 1.Standard / 2.Professional 等)
    public string ProjectType { get; set; }
    // 專案分類 (classification)
    public string Classification { get; set; }
    // 服務中心 (territory)
    public string Territory { get; set; }
    // 專案模式 (cn_pj_mode)
    public string ProjectMode { get; set; }
    // 客戶名稱 (cn_customer keyed_name)
    public string CustomerName { get; set; }
    // 訂單編號 (bcs_po_no)
    public string PoNumber { get; set; }
    // 專案經理 ID (owned_by_id)
    public string PmId { get; set; }
    // 專案經理名稱 (owned_by_id keyed_name)
    public string PmName { get; set; }
    // 專案主管 ID (managed_by_id)
    public string ManagerId { get; set; }
    // 專案主管名稱 (managed_by_id keyed_name)
    public string ManagerName { get; set; }
    // 執行團隊 ID (team_id)
    public string TeamId { get; set; }
    // 執行團隊名稱 (team_id keyed_name)
    public string TeamName { get; set; }
    // 根節點 WBS Element ID (wbs_id)
    public string WbsId { get; set; }
    // 排程開始日期 (date_start_sched)
    public System.DateTime? SchedStart { get; set; }
    // 排程完成日期 (date_due_sched)
    public System.DateTime? SchedDue { get; set; }
    // 目標起始日期 (date_start_target)
    public System.DateTime? TargetStart { get; set; }
    // 目標完成時間 (date_due_target)
    public System.DateTime? TargetDue { get; set; }
    // 實際開始日期 (date_start_act)
    public System.DateTime? ActStart { get; set; }
    // 實際完成日期 (date_due_act)
    public System.DateTime? ActFinish { get; set; }
    // 原訂計畫啟始日 (cn_init_plan_start)
    public System.DateTime? InitPlanStart { get; set; }
    // 原訂上線驗收日 (cn_init_plan_finish)
    public System.DateTime? InitPlanFinish { get; set; }
    // 原訂系統驗收日 (cn_initial_comp)
    public System.DateTime? InitialCompDate { get; set; }
    // 結案日 (cn_closed_date)
    public System.DateTime? ClosedDate { get; set; }
    // 系統滾算完成率 (rollup_percent_compl / bcs_rollup_percent_compl / cn_wbs_compl)
    public double? RollupPercentCompl { get; set; }
    // 計劃進度百分比 (cn_plan_compl)
    public double? PlanCompl { get; set; }
    // 系統原生狀態標籤 (bcs_project_status_label)
    public string BcsStatusLabel { get; set; }
    // 系統原生狀態色碼 (bcs_project_status)
    public string BcsStatusColor { get; set; }
    // 進度區間 (bcs_project_compl_cate)
    public string ComplCategory { get; set; }
    // 延遲天數 (cn_delay_days)
    public int DelayDays { get; set; }
    // 暫停天數 (cn_pending_days)
    public int PendingDays { get; set; }
    // PV 計畫值 (cn_pv)
    public double PlannedValue { get; set; }
    // EV 實獲值 (cn_ev)
    public double EarnedValue { get; set; }
    // AC 實際成本/工時 (bcs_total_workingtime_record / cn_ac / bcs_total_work_time)
    public double ActualCost { get; set; }
    // SV 時程變異 (cn_sv)
    public double ScheduleVariance { get; set; }
    // CV 成本變異 (cn_cv)
    public double CostVariance { get; set; }
    // SPI 進度績效指標 (cn_spi)
    public double? Spi { get; set; }
    // CPI 成本績效指標 (cn_cpi)
    public double? Cpi { get; set; }
    // 原始規劃人天 (cn_exp_mandays)
    public double ExpMandays { get; set; }
    // 規劃預計工時 (cn_wbs_rolwrkest)
    public double RollupWorkEst { get; set; }
    // 剩餘工時 (cn_remainder)
    public double RemainderHours { get; set; }
    // 預算執行率 (cn_bug_imp_rate)
    public double BudgetExecRate { get; set; }
    // Ph 1 ~ Ph 12 階段完成率陣列 (長度 12，索引 0~11 對應 Ph 1~12)
    public int[] PhasePercentCompl { get; set; }
    // Ph 1 ~ Ph 12 階段色碼狀態陣列 (長度 12，索引 0~11 對應 status_1~12)
    public string[] PhaseStatusColor { get; set; }

    /// <summary>
    /// 建構函式：初始化陣列與預設屬性
    /// </summary>
    public ProjectRecord()
    {
        this.PhasePercentCompl = new int[12];
        this.PhaseStatusColor = new string[12];
        for (int i = 0; i < 12; i++)
        {
            this.PhasePercentCompl[i] = 0;
            this.PhaseStatusColor[i] = "";
        }
    }
}

/// <summary>
/// WBS Element 階段工作分解結構實體模型
/// </summary>
public class WbsRecord
{
    // WBS Element GUID
    public string Id { get; set; }
    // 所屬專案編號 (proj_num)
    public int ProjNum { get; set; }
    // WBS 編碼索引 (wbs_index)
    public string WbsIndex { get; set; }
    // 階段名稱 (name)
    public string Name { get; set; }
    // 是否為頂層節點 (is_top)
    public bool IsTop { get; set; }
    // 分類 (Phase / Milestone / Task)
    public string Classification { get; set; }
    // 父階 WBS ID (由 Sub WBS Relationship 解析注入)
    public string ParentWbsId { get; set; }
    // 階段滾算狀態 (rollup_status)
    public string RollupStatus { get; set; }
    // 階段滾算完成度 (rollup_percent_compl)
    public double RollupPercentCompl { get; set; }
    // 預計開始日 (rollup_date_sched_start)
    public System.DateTime? SchedStart { get; set; }
    // 預計完成日 (rollup_date_sched_due)
    public System.DateTime? SchedDue { get; set; }
    // 實際開始日 (rollup_date_start_act)
    public System.DateTime? ActStart { get; set; }
    // 實獲值 EV (rollup_earned_value)
    public double EarnedValue { get; set; }
    // 計畫值 PV (rollup_planned_value)
    public double PlannedValue { get; set; }
    // 預計工時 (rollup_work_est)
    public double WorkEst { get; set; }
    // 實際工時 AC (rollup_actual_work)
    public double ActualWork { get; set; }
    // 階段 SPI
    public double? Spi { get; set; }
    // 階段 CPI
    public double? Cpi { get; set; }
    // 階段時程變異 (cn_sv)
    public double ScheduleVariance { get; set; }
    // 階段成本變異 (cn_cv)
    public double CostVariance { get; set; }
}

/// <summary>
/// Activity2 工作任務與指派明細實體模型
/// </summary>
public class ActivityRecord
{
    // Activity2 GUID
    public string Id { get; set; }
    // 所屬專案編號 (proj_num)
    public int ProjNum { get; set; }
    // 所屬父階 WBS Element ID (由 WBS Activity2 關聯注入)
    public string ParentWbsId { get; set; }
    // 任務名稱 (name)
    public string Name { get; set; }
    // 生命週期狀態 (state: Pending / Active / Complete)
    public string State { get; set; }
    // 執行狀態 (status: not_started / in_progress / completed)
    public string Status { get; set; }
    // 是否為里程碑 (is_milestone)
    public bool IsMilestone { get; set; }
    // 是否為要徑任務 (is_critical)
    public bool IsCritical { get; set; }
    // 完成百分比 (percent_compl: 0~100)
    public double PercentCompl { get; set; }
    // 排程開始日 (date_start_sched)
    public System.DateTime? SchedStart { get; set; }
    // 排程完成日 (date_due_sched)
    public System.DateTime? SchedDue { get; set; }
    // 實際開始日 (date_start_act)
    public System.DateTime? ActStart { get; set; }
    // 實際完成日 (date_due_act)
    public System.DateTime? ActFinish { get; set; }
    // 剩餘天數 (days_remaining)
    public int? DaysRemaining { get; set; }
    // 預估工時 (work_est)
    public double WorkEst { get; set; }
    // 實際工時 (actual_work)
    public double ActualWork { get; set; }
    // 實獲值 EV (earned_value)
    public double EarnedValue { get; set; }
    // 計畫值 PV (planned_value)
    public double PlannedValue { get; set; }
    // 負責人/指派成員 ID (優先取 Activity2 Assignment related_id，回退取 owned_by_id)
    public string AssigneeId { get; set; }
    // 負責人/指派成員姓名
    public string AssigneeName { get; set; }
    // 所屬團隊 ID (team_id)
    public string TeamId { get; set; }
}

/// <summary>
/// 單一專案計算後之進度與健康度統計 DTO
/// </summary>
public class ProjectSummaryDto
{
    public string Id { get; set; }
    public int ProjNum { get; set; }
    public string ProjectName { get; set; }
    public string ProjectType { get; set; }
    public string Classification { get; set; }
    public string Territory { get; set; }
    public string ProjectMode { get; set; }
    public string CustomerName { get; set; }
    public string PoNumber { get; set; }
    public string State { get; set; }
    public string PmId { get; set; }
    public string PmName { get; set; }
    public string ManagerName { get; set; }
    public string TeamId { get; set; }
    public string TeamName { get; set; }
    public string WbsId { get; set; }
    // 整體實際完成率 (0~100)
    public double ActualProgress { get; set; }
    // 應有計劃進度 (0~100)
    public double ExpectedProgress { get; set; }
    // 進度落差 (Expected - Actual，正值代表落後)
    public double ProgressGap { get; set; }
    // 統一健康度燈號 (GREEN / YELLOW / RED)
    public string HealthStatus { get; set; }
    // 相容 pmomonthly 之 rag_status (Green / Amber / Red)
    public string RagStatus { get; set; }
    // 專案自帶狀態標籤與色碼
    public string BcsStatusLabel { get; set; }
    public string BcsStatusColor { get; set; }
    public string ComplCategory { get; set; }
    // 延遲與暫停天數
    public int DelayDays { get; set; }
    public int PendingDays { get; set; }
    // EVM 與工時指標
    public double Spi { get; set; }
    public double Cpi { get; set; }
    public double PlannedValue { get; set; }
    public double EarnedValue { get; set; }
    public double ActualCost { get; set; }
    public double ScheduleVariance { get; set; }
    public double CostVariance { get; set; }
    public double ExpMandays { get; set; }
    public double RollupWorkEst { get; set; }
    public double RemainderHours { get; set; }
    public double BudgetExecRate { get; set; }
    // 任務狀態計數統計
    public int TotalTasks { get; set; }
    public int CompletedTasks { get; set; }
    public int InProgressTasks { get; set; }
    public int NotStartedTasks { get; set; }
    public int OverdueTasks { get; set; }
    public int CriticalTaskCount { get; set; }
    public int CriticalOverdueCount { get; set; }
    public int MilestoneCount { get; set; }
    public int MilestoneCompletedCount { get; set; }
    // 關鍵日期字串 (yyyy-MM-dd)
    public string SchedStart { get; set; }
    public string SchedDue { get; set; }
    public string InitPlanStart { get; set; }
    public string InitPlanFinish { get; set; }
    public string ActStart { get; set; }
    public string ActFinish { get; set; }
    // Ph 1 ~ Ph 12 階段摘要列表
    public System.Collections.Generic.List<PhaseIndicatorDto> Phases { get; set; }

    public ProjectSummaryDto()
    {
        this.Phases = new System.Collections.Generic.List<PhaseIndicatorDto>();
    }
}

/// <summary>
/// Ph 1 ~ Ph 12 專案主檔階段進度與色塊指標 DTO
/// </summary>
public class PhaseIndicatorDto
{
    // 階段序號 (1 ~ 12)
    public int PhaseNumber { get; set; }
    // 階段標籤 (Ph 1 ~ Ph 12)
    public string PhaseLabel { get; set; }
    // 完成百分比 (0 ~ 100)
    public int PercentCompl { get; set; }
    // 原始狀態色碼或文字 (status_1 ~ 12)
    public string RawStatusColor { get; set; }
    // 正規化健康度燈號 (GREEN / YELLOW / RED / GRAY)
    public string NormalizedLight { get; set; }
    // 轉譯後之標準 CSS 色碼
    public string DisplayHexColor { get; set; }
}

/// <summary>
/// WBS 階段進度達成率與時程偏差分析 DTO
/// </summary>
public class WbsStageAnalyticsDto
{
    public string WbsId { get; set; }
    public string ParentWbsId { get; set; }
    public string WbsCode { get; set; }
    public string StageName { get; set; }
    public string Classification { get; set; }
    public int Level { get; set; }
    // 階段實際完成度 (0~100)
    public double ActualCompletion { get; set; }
    // 階段應有進度基準 (0~100)
    public double ExpectedCompletion { get; set; }
    // 階段進度偏差 (Actual - Expected，負值表示進度落後)
    public double CompletionVariance { get; set; }
    // 階段時程偏差天數 (正值表示延遲天數，負值或 0 表示提前/準時)
    public int ScheduleVarianceDays { get; set; }
    public string SchedStart { get; set; }
    public string SchedDue { get; set; }
    public string ActStart { get; set; }
    public double Ev { get; set; }
    public double Pv { get; set; }
    public double Ac { get; set; }
    public double Spi { get; set; }
    public double Cpi { get; set; }
    public double Sv { get; set; }
    public double Cv { get; set; }
    public string RollupStatus { get; set; }
    public string RagStatus { get; set; }
    public string HealthLight { get; set; }
    // 下轄任務統計
    public int TotalTasks { get; set; }
    public int CompletedTasks { get; set; }
    public int InProgressTasks { get; set; }
    public int NotStartedTasks { get; set; }
    public int OverdueTasks { get; set; }
    public System.Collections.Generic.List<WbsStageAnalyticsDto> Children { get; set; }

    public WbsStageAnalyticsDto()
    {
        this.Children = new System.Collections.Generic.List<WbsStageAnalyticsDto>();
    }
}

/// <summary>
/// 專案成員 (Assignee) 任務負荷與完成狀態統計 DTO
/// </summary>
public class AssigneeWorkloadDto
{
    // 成員 Identity ID
    public string AssigneeId { get; set; }
    // 成員姓名
    public string AssigneeName { get; set; }
    // 總指派任務數
    public int TotalTasks { get; set; }
    // 已完成任務數
    public int CompletedTasks { get; set; }
    // 進行中正常任務數
    public int InProgressTasks { get; set; }
    // 未開始正常任務數
    public int NotStartedTasks { get; set; }
    // 已逾期未完成任務數
    public int OverdueTasks { get; set; }
    // 負責之要徑任務數
    public int CriticalTasks { get; set; }
    // 個人任務完成率 (%)
    public double CompletionRate { get; set; }
    // 個人逾期率 (%)
    public double OverdueRate { get; set; }
    // 總預估工時 (hr)
    public double TotalEstHours { get; set; }
    // 總實際投入工時 (hr)
    public double TotalActualHours { get; set; }
    // 剩餘未完成預估工時 (hr)
    public double RemainingEstHours { get; set; }
    // 負荷狀態等級 (OVERLOAD / HIGH / NORMAL / LOW)
    public string LoadLevel { get; set; }
    // 參與之專案數量
    public int ProjectCount { get; set; }
}

// ============================================================================
// 介面定義 (遵循介面隔離原則 ISP 與依賴反轉原則 DIP)
// ============================================================================

/// <summary>
/// 專案資料存取儲存庫介面
/// </summary>
public interface IProjectRepository
{
    System.Collections.Generic.List<ProjectRecord> GetProjects(AnalyticsQueryDto query);
    ProjectRecord GetProjectByNumber(int projNum);
    System.Collections.Generic.List<WbsRecord> GetWbsHierarchy(System.Collections.Generic.List<int> projNums, System.Collections.Generic.List<string> rootWbsIds);
    System.Collections.Generic.List<ActivityRecord> GetActivitiesWithAssignments(System.Collections.Generic.List<int> projNums);
}

/// <summary>
/// 專案健康度與完成率計算引擎介面
/// </summary>
public interface IProjectHealthCalculator
{
    ProjectSummaryDto ComputeProjectSummary(
        ProjectRecord proj,
        WbsRecord rootWbs,
        System.Collections.Generic.List<ActivityRecord> activities,
        System.DateTime asOfDate
    );
    string DetermineHealthLight(
        int totalTasks,
        int overdueTasks,
        int criticalOverdueCount,
        int upcomingCriticalCount,
        double progressGap,
        double spi,
        int projectDelayDays
    );
    PhaseIndicatorDto NormalizePhaseIndicator(int phaseNumber, int percentCompl, string rawColor);
}

/// <summary>
/// WBS 階段進度達成率與時程偏差分析器介面
/// </summary>
public interface IWbsStageAnalyzer
{
    System.Collections.Generic.List<PhaseIndicatorDto> ExtractPhases1To12(ProjectRecord proj);
    System.Collections.Generic.List<WbsStageAnalyticsDto> AnalyzeMainStages(
        string rootWbsId,
        System.Collections.Generic.List<WbsRecord> allWbs,
        System.Collections.Generic.List<ActivityRecord> activities,
        System.DateTime asOfDate
    );
    System.Collections.Generic.List<WbsStageAnalyticsDto> BuildWbsTree(
        string rootWbsId,
        System.Collections.Generic.List<WbsRecord> allWbs,
        System.Collections.Generic.List<ActivityRecord> activities,
        System.DateTime asOfDate
    );
}

/// <summary>
/// 專案成員工作負荷統計器介面
/// </summary>
public interface IWorkloadAggregator
{
    System.Collections.Generic.List<AssigneeWorkloadDto> AggregateByAssignee(
        System.Collections.Generic.List<ActivityRecord> activities,
        System.DateTime asOfDate
    );
}

// ============================================================================
// 核心領域服務實作 (遵循單一職責原則 SRP 與開放封閉原則 OCP)
// ============================================================================

/// <summary>
/// 專案健康度、整體完成率、EVM 與 Ph 1~12 燈號計算引擎
/// </summary>
public class ProjectHealthCalculator : IProjectHealthCalculator
{
    /// <summary>
    /// 計算單一專案之完整進度指標、任務狀態分佈與健康度燈號
    /// </summary>
    public ProjectSummaryDto ComputeProjectSummary(
        ProjectRecord proj,
        WbsRecord rootWbs,
        System.Collections.Generic.List<ActivityRecord> activities,
        System.DateTime asOfDate
    )
    {
        ProjectSummaryDto dto = new ProjectSummaryDto();
        if (proj == null)
        {
            return dto;
        }

        // 1. 基本識別與客製化欄位複製
        dto.Id = proj.Id ?? "";
        dto.ProjNum = proj.ProjNum;
        dto.ProjectName = proj.Name ?? "";
        dto.ProjectType = proj.ProjectType ?? "";
        dto.Classification = proj.Classification ?? "";
        dto.Territory = proj.Territory ?? "";
        dto.ProjectMode = proj.ProjectMode ?? "";
        dto.CustomerName = proj.CustomerName ?? "";
        dto.PoNumber = proj.PoNumber ?? "";
        dto.State = proj.State ?? "Active";
        dto.PmId = proj.PmId ?? "";
        dto.PmName = string.IsNullOrEmpty(proj.PmName) ? "未指定" : proj.PmName;
        dto.ManagerName = proj.ManagerName ?? "";
        dto.TeamId = proj.TeamId ?? "";
        dto.TeamName = string.IsNullOrEmpty(proj.TeamName) ? "未指定團隊" : proj.TeamName;
        dto.WbsId = proj.WbsId ?? "";
        dto.BcsStatusLabel = proj.BcsStatusLabel ?? "";
        dto.BcsStatusColor = proj.BcsStatusColor ?? "";
        dto.ComplCategory = proj.ComplCategory ?? "";
        dto.DelayDays = proj.DelayDays;
        dto.PendingDays = proj.PendingDays;
        dto.ExpMandays = proj.ExpMandays;
        dto.RemainderHours = proj.RemainderHours;
        dto.BudgetExecRate = System.Math.Round(proj.BudgetExecRate, 1);

        dto.SchedStart = FormatDate(proj.SchedStart ?? (rootWbs != null ? rootWbs.SchedStart : null));
        dto.SchedDue = FormatDate(proj.SchedDue ?? (rootWbs != null ? rootWbs.SchedDue : null));
        dto.InitPlanStart = FormatDate(proj.InitPlanStart);
        dto.InitPlanFinish = FormatDate(proj.InitPlanFinish);
        dto.ActStart = FormatDate(proj.ActStart ?? (rootWbs != null ? rootWbs.ActStart : null));
        dto.ActFinish = FormatDate(proj.ActFinish);

        // 2. 統計 Activity2 各狀態數量與工時加權進度
        int totalTasks = 0;
        int completedTasks = 0;
        int inProgressTasks = 0;
        int notStartedTasks = 0;
        int overdueTasks = 0;
        int criticalTasks = 0;
        int criticalOverdue = 0;
        int upcomingCritical = 0;
        int milestoneCount = 0;
        int milestoneCompleted = 0;
        int maxTaskDelayDays = proj.DelayDays;

        double weightedComplSum = 0.0;
        double weightSum = 0.0;
        double simpleComplSum = 0.0;
        double actEvSum = 0.0;
        double actPvSum = 0.0;
        double actWorkEstSum = 0.0;
        double actActualWorkSum = 0.0;

        if (activities != null)
        {
            for (int i = 0; i < activities.Count; i++)
            {
                ActivityRecord act = activities[i];
                if (act == null) continue;

                totalTasks++;
                bool isDone = IsActivityCompleted(act);
                bool isOverdue = !isDone && IsActivityOverdue(act, asOfDate);

                if (act.IsMilestone)
                {
                    milestoneCount++;
                    if (isDone) milestoneCompleted++;
                }

                if (act.IsCritical)
                {
                    criticalTasks++;
                }

                if (isDone)
                {
                    completedTasks++;
                }
                else if (isOverdue)
                {
                    overdueTasks++;
                    // 若為逾期任務，同時依是否已啟動計入進行中或未開始，並更新最大延遲天數
                    if (act.PercentCompl > 0 || IsStatusInProgress(act))
                    {
                        inProgressTasks++;
                    }
                    else
                    {
                        notStartedTasks++;
                    }

                    if (act.SchedDue.HasValue)
                    {
                        int delay = (int)(asOfDate.Date - act.SchedDue.Value.Date).TotalDays;
                        if (delay > maxTaskDelayDays) maxTaskDelayDays = delay;
                    }

                    if (act.IsCritical || act.IsMilestone)
                    {
                        criticalOverdue++;
                    }
                }
                else
                {
                    // 未完成且未逾期：檢查是否為 3 日內即將到期之要徑任務
                    if (act.IsCritical && act.SchedDue.HasValue)
                    {
                        int daysLeft = (int)(act.SchedDue.Value.Date - asOfDate.Date).TotalDays;
                        if (daysLeft >= 0 && daysLeft <= 3)
                        {
                            upcomingCritical++;
                        }
                    }

                    if (act.PercentCompl > 0 || IsStatusInProgress(act))
                    {
                        inProgressTasks++;
                    }
                    else
                    {
                        notStartedTasks++;
                    }
                }

                double pct = ClampPercent(isDone ? 100.0 : act.PercentCompl);
                simpleComplSum += pct;
                if (act.WorkEst > 0)
                {
                    weightedComplSum += pct * act.WorkEst;
                    weightSum += act.WorkEst;
                }

                actEvSum += act.EarnedValue;
                actPvSum += act.PlannedValue;
                actWorkEstSum += act.WorkEst;
                actActualWorkSum += act.ActualWork;
            }
        }

        dto.TotalTasks = totalTasks;
        dto.CompletedTasks = completedTasks;
        dto.InProgressTasks = inProgressTasks;
        dto.NotStartedTasks = notStartedTasks;
        dto.OverdueTasks = overdueTasks;
        dto.CriticalTaskCount = criticalTasks;
        dto.CriticalOverdueCount = criticalOverdue;
        dto.MilestoneCount = milestoneCount;
        dto.MilestoneCompletedCount = milestoneCompleted;
        if (maxTaskDelayDays > dto.DelayDays)
        {
            dto.DelayDays = maxTaskDelayDays;
        }

        // 3. 決定專案整體實際完成率 ActualProgress (%)
        double actualProgress = 0.0;
        if (proj.RollupPercentCompl.HasValue && proj.RollupPercentCompl.Value > 0)
        {
            actualProgress = ClampPercent(proj.RollupPercentCompl.Value);
        }
        else if (rootWbs != null && rootWbs.RollupPercentCompl > 0)
        {
            actualProgress = ClampPercent(rootWbs.RollupPercentCompl);
        }
        else if (weightSum > 0)
        {
            actualProgress = ClampPercent(weightedComplSum / weightSum);
        }
        else if (totalTasks > 0)
        {
            actualProgress = ClampPercent(simpleComplSum / totalTasks);
        }
        else if (proj.RollupPercentCompl.HasValue)
        {
            actualProgress = ClampPercent(proj.RollupPercentCompl.Value);
        }
        dto.ActualProgress = System.Math.Round(actualProgress, 1);

        // 4. 決定應有計劃進度 ExpectedProgress (%) 與進度落差 ProgressGap
        double expectedProgress = 0.0;
        if (proj.PlanCompl.HasValue && proj.PlanCompl.Value > 0)
        {
            expectedProgress = ClampPercent(proj.PlanCompl.Value);
        }
        else
        {
            System.DateTime? startDt = proj.SchedStart ?? (rootWbs != null ? rootWbs.SchedStart : null);
            System.DateTime? dueDt = proj.SchedDue ?? (rootWbs != null ? rootWbs.SchedDue : null);
            expectedProgress = ComputeLinearExpectedProgress(startDt, dueDt, asOfDate, dto.ActualProgress, dto.State);
        }
        dto.ExpectedProgress = System.Math.Round(expectedProgress, 1);
        dto.ProgressGap = System.Math.Round(dto.ExpectedProgress - dto.ActualProgress, 1);

        // 5. 整合 EVM 指標 (優先取 Project foreign / Root WBS，若無則由 Activity2 彙總回退)
        dto.PlannedValue = System.Math.Round(
            proj.PlannedValue > 0 ? proj.PlannedValue : (rootWbs != null && rootWbs.PlannedValue > 0 ? rootWbs.PlannedValue : actPvSum),
            2
        );
        dto.EarnedValue = System.Math.Round(
            proj.EarnedValue > 0 ? proj.EarnedValue : (rootWbs != null && rootWbs.EarnedValue > 0 ? rootWbs.EarnedValue : actEvSum),
            2
        );
        dto.ActualCost = System.Math.Round(
            proj.ActualCost > 0 ? proj.ActualCost : (rootWbs != null && rootWbs.ActualWork > 0 ? rootWbs.ActualWork : actActualWorkSum),
            2
        );
        dto.RollupWorkEst = System.Math.Round(
            proj.RollupWorkEst > 0 ? proj.RollupWorkEst : (rootWbs != null && rootWbs.WorkEst > 0 ? rootWbs.WorkEst : actWorkEstSum),
            2
        );
        dto.ScheduleVariance = System.Math.Round(
            proj.ScheduleVariance != 0 ? proj.ScheduleVariance : (rootWbs != null && rootWbs.ScheduleVariance != 0 ? rootWbs.ScheduleVariance : (dto.EarnedValue - dto.PlannedValue)),
            2
        );
        dto.CostVariance = System.Math.Round(
            proj.CostVariance != 0 ? proj.CostVariance : (rootWbs != null && rootWbs.CostVariance != 0 ? rootWbs.CostVariance : (dto.EarnedValue - dto.ActualCost)),
            2
        );

        double spi = 1.0;
        if (proj.Spi.HasValue && proj.Spi.Value > 0)
        {
            spi = proj.Spi.Value;
        }
        else if (rootWbs != null && rootWbs.Spi.HasValue && rootWbs.Spi.Value > 0)
        {
            spi = rootWbs.Spi.Value;
        }
        else if (dto.PlannedValue > 0)
        {
            spi = dto.EarnedValue / dto.PlannedValue;
        }
        else if (dto.ExpectedProgress > 0)
        {
            spi = dto.ActualProgress / dto.ExpectedProgress;
        }
        dto.Spi = System.Math.Round(SanitizeDouble(spi, 1.0), 2);

        double cpi = 1.0;
        if (proj.Cpi.HasValue && proj.Cpi.Value > 0)
        {
            cpi = proj.Cpi.Value;
        }
        else if (rootWbs != null && rootWbs.Cpi.HasValue && rootWbs.Cpi.Value > 0)
        {
            cpi = rootWbs.Cpi.Value;
        }
        else if (dto.ActualCost > 0 && dto.EarnedValue > 0)
        {
            cpi = dto.EarnedValue / dto.ActualCost;
        }
        dto.Cpi = System.Math.Round(SanitizeDouble(cpi, 1.0), 2);

        // 6. 轉換 Ph 1 ~ Ph 12 階段指標
        for (int pIdx = 0; pIdx < 12; pIdx++)
        {
            int pPct = (proj.PhasePercentCompl != null && pIdx < proj.PhasePercentCompl.Length) ? proj.PhasePercentCompl[pIdx] : 0;
            string pCol = (proj.PhaseStatusColor != null && pIdx < proj.PhaseStatusColor.Length) ? proj.PhaseStatusColor[pIdx] : "";
            dto.Phases.Add(NormalizePhaseIndicator(pIdx + 1, pPct, pCol));
        }

        // 7. 判定健康度燈號 (GREEN / YELLOW / RED)
        if (string.Equals(dto.State, "closed", System.StringComparison.OrdinalIgnoreCase) ||
            string.Equals(dto.State, "Completed", System.StringComparison.OrdinalIgnoreCase))
        {
            dto.HealthStatus = "GREEN";
        }
        else
        {
            dto.HealthStatus = DetermineHealthLight(
                dto.TotalTasks,
                dto.OverdueTasks,
                dto.CriticalOverdueCount,
                upcomingCritical,
                dto.ProgressGap,
                dto.Spi,
                dto.DelayDays
            );
        }

        dto.RagStatus = MapHealthToRagStatus(dto.HealthStatus);
        return dto;
    }

    /// <summary>
    /// 依據規格閾值判定專案健康度燈號 (GREEN / YELLOW / RED)
    /// </summary>
    public string DetermineHealthLight(
        int totalTasks,
        int overdueTasks,
        int criticalOverdueCount,
        int upcomingCriticalCount,
        double progressGap,
        double spi,
        int projectDelayDays
    )
    {
        double overdueRatio = totalTasks > 0 ? ((double)overdueTasks / (double)totalTasks) * 100.0 : 0.0;

        // 紅燈條件：
        // 1. 存在逾期之里程碑或要徑任務 (criticalOverdueCount > 0)
        // 2. 逾期任務佔比 > 20%
        // 3. 整體實際進度落後應有進度 > 20% (progressGap > 20.0)
        // 4. SPI > 0 且 SPI < 0.80
        if (criticalOverdueCount > 0 ||
            overdueRatio > 20.0 ||
            progressGap > 20.0 ||
            (spi > 0.0 && spi < 0.80))
        {
            return "RED";
        }

        // 黃燈條件：
        // 1. 存在逾期任務 (overdueTasks > 0) 或專案延遲天數 > 0
        // 2. 整體進度落差介於 10% ~ 20%
        // 3. 3 日內有即將到期之未完成要徑任務
        // 4. SPI 介於 0.80 ~ 0.95
        if (overdueTasks > 0 ||
            projectDelayDays > 0 ||
            progressGap >= 10.0 ||
            upcomingCriticalCount > 0 ||
            (spi > 0.0 && spi < 0.95))
        {
            return "YELLOW";
        }

        return "GREEN";
    }

    /// <summary>
    /// 正規化 Ph 1 ~ Ph 12 的完成度與狀態色碼 (防止色碼直接顯示為亂碼文字)
    /// </summary>
    public PhaseIndicatorDto NormalizePhaseIndicator(int phaseNumber, int percentCompl, string rawColor)
    {
        PhaseIndicatorDto indicator = new PhaseIndicatorDto();
        indicator.PhaseNumber = phaseNumber;
        indicator.PhaseLabel = "Ph " + phaseNumber.ToString();
        indicator.PercentCompl = (int)ClampPercent(percentCompl);
        indicator.RawStatusColor = rawColor ?? "";

        string c = (rawColor ?? "").Trim().ToUpperInvariant();
        if (c.Contains("FF0000") || c.Contains("F56C6C") || c.Contains("DC2626") || c.Contains("E53935") || c == "RED" || c == "紅" || c == "危險" || c == "DELAYED")
        {
            indicator.NormalizedLight = "RED";
            indicator.DisplayHexColor = "#EF4444";
        }
        else if (c.Contains("FFD800") || c.Contains("FFFF00") || c.Contains("E6A23C") || c.Contains("F59E0B") || c.Contains("FFA500") || c == "YELLOW" || c == "AMBER" || c == "黃" || c == "注意")
        {
            indicator.NormalizedLight = "YELLOW";
            indicator.DisplayHexColor = "#F59E0B";
        }
        else if (c.Contains("00FF00") || c.Contains("008000") || c.Contains("67C23A") || c.Contains("10B981") || c.Contains("22C55E") || c == "GREEN" || c == "綠" || c == "正常")
        {
            indicator.NormalizedLight = "GREEN";
            indicator.DisplayHexColor = "#10B981";
        }
        else if (indicator.PercentCompl >= 100)
        {
            indicator.NormalizedLight = "GREEN";
            indicator.DisplayHexColor = "#10B981";
        }
        else if (indicator.PercentCompl > 0)
        {
            // 若有色碼為合法 Hex 但未命中上述特定色，保留原色碼並標為 GREEN
            if (c.StartsWith("#") && (c.Length == 7 || c.Length == 4))
            {
                indicator.NormalizedLight = "GREEN";
                indicator.DisplayHexColor = c;
            }
            else
            {
                indicator.NormalizedLight = "GREEN";
                indicator.DisplayHexColor = "#3B82F6";
            }
        }
        else
        {
            indicator.NormalizedLight = "GRAY";
            indicator.DisplayHexColor = "#94A3B8";
        }

        return indicator;
    }

    /// <summary>
    /// 判斷任務是否已完成
    /// </summary>
    public static bool IsActivityCompleted(ActivityRecord act)
    {
        if (act == null) return false;
        if (act.PercentCompl >= 100.0) return true;
        string st = (act.State ?? "").Trim().ToLowerInvariant();
        string status = (act.Status ?? "").Trim().ToLowerInvariant();
        return st == "complete" || st == "completed" || st == "closed" ||
               status == "complete" || status == "completed" || status == "closed";
    }

    /// <summary>
    /// 判斷任務是否進行中
    /// </summary>
    public static bool IsStatusInProgress(ActivityRecord act)
    {
        if (act == null) return false;
        string st = (act.State ?? "").Trim().ToLowerInvariant();
        string status = (act.Status ?? "").Trim().ToLowerInvariant();
        return st == "active" || st == "in progress" || status == "in_progress" || status == "active";
    }

    /// <summary>
    /// 判斷未完成任務是否已逾期
    /// </summary>
    public static bool IsActivityOverdue(ActivityRecord act, System.DateTime asOfDate)
    {
        if (act == null) return false;
        if (act.SchedDue.HasValue && act.SchedDue.Value.Date < asOfDate.Date)
        {
            return true;
        }
        if (act.DaysRemaining.HasValue && act.DaysRemaining.Value < 0)
        {
            return true;
        }
        return false;
    }

    /// <summary>
    /// 根據排程起訖日線性計算時間軸應有進度基準 (%)
    /// </summary>
    public static double ComputeLinearExpectedProgress(
        System.DateTime? schedStart,
        System.DateTime? schedDue,
        System.DateTime asOfDate,
        double fallbackActual,
        string state
    )
    {
        if (string.Equals(state, "closed", System.StringComparison.OrdinalIgnoreCase) ||
            string.Equals(state, "Completed", System.StringComparison.OrdinalIgnoreCase))
        {
            return 100.0;
        }
        if (!schedStart.HasValue || !schedDue.HasValue)
        {
            return fallbackActual;
        }
        if (asOfDate.Date <= schedStart.Value.Date)
        {
            return 0.0;
        }
        if (asOfDate.Date >= schedDue.Value.Date)
        {
            return 100.0;
        }
        double totalDays = (schedDue.Value.Date - schedStart.Value.Date).TotalDays;
        if (totalDays <= 0)
        {
            return 100.0;
        }
        double elapsedDays = (asOfDate.Date - schedStart.Value.Date).TotalDays;
        return ClampPercent((elapsedDays / totalDays) * 100.0);
    }

    public static double ClampPercent(double val)
    {
        if (double.IsNaN(val) || double.IsInfinity(val)) return 0.0;
        if (val < 0.0) return 0.0;
        if (val > 100.0) return 100.0;
        return val;
    }

    public static double SanitizeDouble(double val, double fallback)
    {
        if (double.IsNaN(val) || double.IsInfinity(val)) return fallback;
        return val;
    }

    public static string MapHealthToRagStatus(string healthStatus)
    {
        if (healthStatus == "RED") return "Red";
        if (healthStatus == "YELLOW") return "Amber";
        return "Green";
    }

    public static string FormatDate(System.DateTime? dt)
    {
        if (!dt.HasValue) return "";
        return dt.Value.ToString("yyyy-MM-dd");
    }
}

/// <summary>
/// WBS 階段進度達成率、樹狀結構與時程偏差分析服務
/// </summary>
public class WbsStageAnalyzer : IWbsStageAnalyzer
{
    private readonly IProjectHealthCalculator _healthCalculator;

    public WbsStageAnalyzer(IProjectHealthCalculator healthCalculator)
    {
        this._healthCalculator = healthCalculator;
    }

    /// <summary>
    /// 提取 Project 主檔上之 Ph 1 ~ Ph 12 階段進度與狀態燈號
    /// </summary>
    public System.Collections.Generic.List<PhaseIndicatorDto> ExtractPhases1To12(ProjectRecord proj)
    {
        System.Collections.Generic.List<PhaseIndicatorDto> list = new System.Collections.Generic.List<PhaseIndicatorDto>();
        if (proj == null) return list;

        for (int i = 0; i < 12; i++)
        {
            int pct = (proj.PhasePercentCompl != null && i < proj.PhasePercentCompl.Length) ? proj.PhasePercentCompl[i] : 0;
            string col = (proj.PhaseStatusColor != null && i < proj.PhaseStatusColor.Length) ? proj.PhaseStatusColor[i] : "";
            list.Add(this._healthCalculator.NormalizePhaseIndicator(i + 1, pct, col));
        }
        return list;
    }

    /// <summary>
    /// 分析專案第一階主階段 (Main Stages: parent_wbs_id == rootWbsId) 之達成率與時程偏差
    /// </summary>
    public System.Collections.Generic.List<WbsStageAnalyticsDto> AnalyzeMainStages(
        string rootWbsId,
        System.Collections.Generic.List<WbsRecord> allWbs,
        System.Collections.Generic.List<ActivityRecord> activities,
        System.DateTime asOfDate
    )
    {
        System.Collections.Generic.List<WbsStageAnalyticsDto> fullTree = BuildWbsTree(rootWbsId, allWbs, activities, asOfDate);
        // 若 fullTree 只有一個 Root WBS 節點且包含子節點，回傳其第一層主階段子節點
        if (fullTree.Count == 1 && fullTree[0].Children != null && fullTree[0].Children.Count > 0)
        {
            return fullTree[0].Children;
        }
        return fullTree;
    }

    /// <summary>
    /// 建構完整 WBS 遞迴樹狀分析結構，計算每個階段之達成率、應有進度、時程偏差天數與下轄任務狀態
    /// </summary>
    public System.Collections.Generic.List<WbsStageAnalyticsDto> BuildWbsTree(
        string rootWbsId,
        System.Collections.Generic.List<WbsRecord> allWbs,
        System.Collections.Generic.List<ActivityRecord> activities,
        System.DateTime asOfDate
    )
    {
        System.Collections.Generic.List<WbsStageAnalyticsDto> roots = new System.Collections.Generic.List<WbsStageAnalyticsDto>();
        if (allWbs == null || allWbs.Count == 0)
        {
            return roots;
        }

        // 建立 WBS ID 映射表與父子關係表
        System.Collections.Generic.Dictionary<string, WbsStageAnalyticsDto> nodeMap =
            new System.Collections.Generic.Dictionary<string, WbsStageAnalyticsDto>();
        System.Collections.Generic.Dictionary<string, WbsRecord> rawMap =
            new System.Collections.Generic.Dictionary<string, WbsRecord>();

        for (int i = 0; i < allWbs.Count; i++)
        {
            WbsRecord w = allWbs[i];
            if (w == null || string.IsNullOrEmpty(w.Id)) continue;
            rawMap[w.Id] = w;
            nodeMap[w.Id] = CreateStageNode(w, asOfDate);
        }

        // 組裝父子樹狀階層
        System.Collections.Generic.HashSet<string> childAttached = new System.Collections.Generic.HashSet<string>();
        for (int i = 0; i < allWbs.Count; i++)
        {
            WbsRecord w = allWbs[i];
            if (w == null || string.IsNullOrEmpty(w.Id)) continue;
            WbsStageAnalyticsDto current = nodeMap[w.Id];

            if (!string.IsNullOrEmpty(w.ParentWbsId) && nodeMap.ContainsKey(w.ParentWbsId) && w.ParentWbsId != w.Id)
            {
                nodeMap[w.ParentWbsId].Children.Add(current);
                childAttached.Add(w.Id);
            }
        }

        // 找出根節點
        if (!string.IsNullOrEmpty(rootWbsId) && nodeMap.ContainsKey(rootWbsId))
        {
            roots.Add(nodeMap[rootWbsId]);
        }
        else
        {
            for (int i = 0; i < allWbs.Count; i++)
            {
                WbsRecord w = allWbs[i];
                if (w != null && !string.IsNullOrEmpty(w.Id) && !childAttached.Contains(w.Id))
                {
                    roots.Add(nodeMap[w.Id]);
                }
            }
        }

        // 將 Activity2 掛載統計至所屬 WBS 節點，並由下而上彙總任務計數
        System.Collections.Generic.Dictionary<string, System.Collections.Generic.List<ActivityRecord>> actsByWbs =
            new System.Collections.Generic.Dictionary<string, System.Collections.Generic.List<ActivityRecord>>();

        if (activities != null)
        {
            for (int i = 0; i < activities.Count; i++)
            {
                ActivityRecord act = activities[i];
                if (act == null) continue;
                string targetWbsId = !string.IsNullOrEmpty(act.ParentWbsId) && nodeMap.ContainsKey(act.ParentWbsId)
                    ? act.ParentWbsId
                    : (roots.Count > 0 ? roots[0].WbsId : "");

                if (!string.IsNullOrEmpty(targetWbsId))
                {
                    if (!actsByWbs.ContainsKey(targetWbsId))
                    {
                        actsByWbs[targetWbsId] = new System.Collections.Generic.List<ActivityRecord>();
                    }
                    actsByWbs[targetWbsId].Add(act);
                }
            }
        }

        // 遞迴計算層級、任務統計與健康度燈號
        for (int i = 0; i < roots.Count; i++)
        {
            RollupStageMetricsRecursive(roots[i], 0, actsByWbs, asOfDate);
        }

        return roots;
    }

    private WbsStageAnalyticsDto CreateStageNode(WbsRecord w, System.DateTime asOfDate)
    {
        WbsStageAnalyticsDto dto = new WbsStageAnalyticsDto();
        dto.WbsId = w.Id ?? "";
        dto.ParentWbsId = w.ParentWbsId ?? "";
        dto.WbsCode = w.WbsIndex ?? "";
        dto.StageName = w.Name ?? "";
        dto.Classification = string.IsNullOrEmpty(w.Classification) ? "Phase" : w.Classification;
        dto.ActualCompletion = System.Math.Round(ProjectHealthCalculator.ClampPercent(w.RollupPercentCompl), 1);
        dto.ExpectedCompletion = System.Math.Round(
            ProjectHealthCalculator.ComputeLinearExpectedProgress(
                w.SchedStart,
                w.SchedDue,
                asOfDate,
                dto.ActualCompletion,
                w.RollupStatus
            ),
            1
        );
        dto.CompletionVariance = System.Math.Round(dto.ActualCompletion - dto.ExpectedCompletion, 1);

        // 計算階段時程偏差天數 (ScheduleVarianceDays)
        int varDays = 0;
        if (w.SchedDue.HasValue)
        {
            if (dto.ActualCompletion < 100.0 && asOfDate.Date > w.SchedDue.Value.Date)
            {
                varDays = (int)(asOfDate.Date - w.SchedDue.Value.Date).TotalDays;
            }
        }
        dto.ScheduleVarianceDays = varDays;

        dto.SchedStart = ProjectHealthCalculator.FormatDate(w.SchedStart);
        dto.SchedDue = ProjectHealthCalculator.FormatDate(w.SchedDue);
        dto.ActStart = ProjectHealthCalculator.FormatDate(w.ActStart);
        dto.Ev = System.Math.Round(w.EarnedValue, 2);
        dto.Pv = System.Math.Round(w.PlannedValue, 2);
        dto.Ac = System.Math.Round(w.ActualWork, 2);
        dto.Sv = System.Math.Round(w.ScheduleVariance != 0 ? w.ScheduleVariance : (dto.Ev - dto.Pv), 2);
        dto.Cv = System.Math.Round(w.CostVariance != 0 ? w.CostVariance : (dto.Ev - dto.Ac), 2);

        double spi = w.Spi.HasValue && w.Spi.Value > 0
            ? w.Spi.Value
            : (dto.Pv > 0 ? dto.Ev / dto.Pv : (dto.ExpectedCompletion > 0 ? dto.ActualCompletion / dto.ExpectedCompletion : 1.0));
        double cpi = w.Cpi.HasValue && w.Cpi.Value > 0
            ? w.Cpi.Value
            : (dto.Ac > 0 && dto.Ev > 0 ? dto.Ev / dto.Ac : 1.0);

        dto.Spi = System.Math.Round(ProjectHealthCalculator.SanitizeDouble(spi, 1.0), 2);
        dto.Cpi = System.Math.Round(ProjectHealthCalculator.SanitizeDouble(cpi, 1.0), 2);
        dto.RollupStatus = string.IsNullOrEmpty(w.RollupStatus)
            ? (dto.ActualCompletion >= 100.0 ? "Completed" : (dto.ActualCompletion > 0 ? "Active" : "Pending"))
            : w.RollupStatus;

        return dto;
    }

    private void RollupStageMetricsRecursive(
        WbsStageAnalyticsDto node,
        int level,
        System.Collections.Generic.Dictionary<string, System.Collections.Generic.List<ActivityRecord>> actsByWbs,
        System.DateTime asOfDate
    )
    {
        node.Level = level;
        int total = 0;
        int completed = 0;
        int inProg = 0;
        int notStarted = 0;
        int overdue = 0;
        int critOverdue = 0;

        // 1. 直接掛載於此 WBS 的任務
        if (actsByWbs.ContainsKey(node.WbsId))
        {
            System.Collections.Generic.List<ActivityRecord> directActs = actsByWbs[node.WbsId];
            for (int i = 0; i < directActs.Count; i++)
            {
                ActivityRecord act = directActs[i];
                total++;
                bool isDone = ProjectHealthCalculator.IsActivityCompleted(act);
                bool isOvd = !isDone && ProjectHealthCalculator.IsActivityOverdue(act, asOfDate);

                if (isDone)
                {
                    completed++;
                }
                else
                {
                    if (isOvd)
                    {
                        overdue++;
                        if (act.IsCritical || act.IsMilestone) critOverdue++;
                    }
                    if (act.PercentCompl > 0 || ProjectHealthCalculator.IsStatusInProgress(act))
                    {
                        inProg++;
                    }
                    else
                    {
                        notStarted++;
                    }
                }
            }
        }

        // 2. 子 WBS 節點遞迴累加
        for (int i = 0; i < node.Children.Count; i++)
        {
            WbsStageAnalyticsDto child = node.Children[i];
            RollupStageMetricsRecursive(child, level + 1, actsByWbs, asOfDate);
            total += child.TotalTasks;
            completed += child.CompletedTasks;
            inProg += child.InProgressTasks;
            notStarted += child.NotStartedTasks;
            overdue += child.OverdueTasks;
            if (child.ScheduleVarianceDays > node.ScheduleVarianceDays)
            {
                node.ScheduleVarianceDays = child.ScheduleVarianceDays;
            }
        }

        node.TotalTasks = total;
        node.CompletedTasks = completed;
        node.InProgressTasks = inProg;
        node.NotStartedTasks = notStarted;
        node.OverdueTasks = overdue;

        double gap = node.ExpectedCompletion - node.ActualCompletion;
        node.HealthLight = this._healthCalculator.DetermineHealthLight(
            node.TotalTasks,
            node.OverdueTasks,
            critOverdue,
            0,
            gap,
            node.Spi,
            node.ScheduleVarianceDays
        );
        node.RagStatus = ProjectHealthCalculator.MapHealthToRagStatus(node.HealthLight);
    }
}

/// <summary>
/// 專案成員 (Assignee) 任務負荷與完成狀態彙總服務
/// </summary>
public class WorkloadAggregator : IWorkloadAggregator
{
    /// <summary>
    /// 依指派成員 (Assignee) 分組統計各狀態任務數、完成率、逾期率與預估/實際工時負荷
    /// </summary>
    public System.Collections.Generic.List<AssigneeWorkloadDto> AggregateByAssignee(
        System.Collections.Generic.List<ActivityRecord> activities,
        System.DateTime asOfDate
    )
    {
        System.Collections.Generic.List<AssigneeWorkloadDto> result =
            new System.Collections.Generic.List<AssigneeWorkloadDto>();
        if (activities == null || activities.Count == 0)
        {
            return result;
        }

        System.Collections.Generic.Dictionary<string, AssigneeWorkloadDto> map =
            new System.Collections.Generic.Dictionary<string, AssigneeWorkloadDto>();
        System.Collections.Generic.Dictionary<string, System.Collections.Generic.HashSet<int>> projSetMap =
            new System.Collections.Generic.Dictionary<string, System.Collections.Generic.HashSet<int>>();

        for (int i = 0; i < activities.Count; i++)
        {
            ActivityRecord act = activities[i];
            if (act == null) continue;

            string assigneeId = string.IsNullOrEmpty(act.AssigneeId) ? "UNASSIGNED" : act.AssigneeId;
            string assigneeName = string.IsNullOrEmpty(act.AssigneeName)
                ? (assigneeId == "UNASSIGNED" ? "未指派成員" : assigneeId)
                : act.AssigneeName;

            if (!map.ContainsKey(assigneeId))
            {
                AssigneeWorkloadDto item = new AssigneeWorkloadDto();
                item.AssigneeId = assigneeId;
                item.AssigneeName = assigneeName;
                map[assigneeId] = item;
                projSetMap[assigneeId] = new System.Collections.Generic.HashSet<int>();
            }

            AssigneeWorkloadDto dto = map[assigneeId];
            if (act.ProjNum > 0)
            {
                projSetMap[assigneeId].Add(act.ProjNum);
            }

            dto.TotalTasks++;
            if (act.IsCritical)
            {
                dto.CriticalTasks++;
            }

            bool isDone = ProjectHealthCalculator.IsActivityCompleted(act);
            bool isOverdue = !isDone && ProjectHealthCalculator.IsActivityOverdue(act, asOfDate);

            if (isDone)
            {
                dto.CompletedTasks++;
            }
            else
            {
                if (isOverdue)
                {
                    dto.OverdueTasks++;
                }
                if (act.PercentCompl > 0 || ProjectHealthCalculator.IsStatusInProgress(act))
                {
                    dto.InProgressTasks++;
                }
                else
                {
                    dto.NotStartedTasks++;
                }
            }

            dto.TotalEstHours += act.WorkEst;
            dto.TotalActualHours += act.ActualWork;
            if (!isDone && act.WorkEst > 0)
            {
                double remainRatio = (100.0 - ProjectHealthCalculator.ClampPercent(act.PercentCompl)) / 100.0;
                dto.RemainingEstHours += act.WorkEst * remainRatio;
            }
        }

        foreach (System.Collections.Generic.KeyValuePair<string, AssigneeWorkloadDto> kv in map)
        {
            AssigneeWorkloadDto dto = kv.Value;
            dto.ProjectCount = projSetMap[kv.Key].Count;
            dto.TotalEstHours = System.Math.Round(dto.TotalEstHours, 1);
            dto.TotalActualHours = System.Math.Round(dto.TotalActualHours, 1);
            dto.RemainingEstHours = System.Math.Round(dto.RemainingEstHours, 1);
            dto.CompletionRate = dto.TotalTasks > 0
                ? System.Math.Round(((double)dto.CompletedTasks / (double)dto.TotalTasks) * 100.0, 1)
                : 0.0;
            dto.OverdueRate = dto.TotalTasks > 0
                ? System.Math.Round(((double)dto.OverdueTasks / (double)dto.TotalTasks) * 100.0, 1)
                : 0.0;

            int activeBacklog = dto.InProgressTasks + dto.NotStartedTasks;
            if (dto.OverdueTasks >= 3 || activeBacklog >= 10 || dto.RemainingEstHours >= 120.0)
            {
                dto.LoadLevel = "OVERLOAD";
            }
            else if (dto.OverdueTasks >= 1 || activeBacklog >= 6 || dto.RemainingEstHours >= 60.0)
            {
                dto.LoadLevel = "HIGH";
            }
            else if (activeBacklog >= 2 || dto.RemainingEstHours >= 16.0)
            {
                dto.LoadLevel = "NORMAL";
            }
            else
            {
                dto.LoadLevel = "LOW";
            }

            result.Add(dto);
        }

        // 依逾期任務數降冪、總任務數降冪排序
        result.Sort(delegate(AssigneeWorkloadDto a, AssigneeWorkloadDto b)
        {
            int cmp = b.OverdueTasks.CompareTo(a.OverdueTasks);
            if (cmp != 0) return cmp;
            return b.TotalTasks.CompareTo(a.TotalTasks);
        });

        return result;
    }
}

// ============================================================================
// 資料存取儲存庫實作 (Aras IOM / AML 資料查詢與 SQL 防注入保護)
// ============================================================================

/// <summary>
/// Aras Innovator 12 SP9 專案資料存取儲存庫
/// </summary>
public class ArasProjectRepository : IProjectRepository
{
    private readonly Innovator _inn;

    public ArasProjectRepository(Innovator inn)
    {
        this._inn = inn;
    }

    /// <summary>
    /// 防注入安全轉義函式：將單引號轉義為雙單引號
    /// </summary>
    public static string SanitizeInput(string input)
    {
        if (string.IsNullOrEmpty(input)) return "";
        return input.Replace("'", "''").Trim();
    }

    /// <summary>
    /// 依據篩選條件查詢 Project 清單 (包含 cn_* / bcs_* / Ph 1~12 客製屬性)
    /// </summary>
    public System.Collections.Generic.List<ProjectRecord> GetProjects(AnalyticsQueryDto query)
    {
        System.Collections.Generic.List<ProjectRecord> list = new System.Collections.Generic.List<ProjectRecord>();
        if (this._inn == null) return list;

        Item qry = this._inn.newItem("Project", "get");
        qry.setAttribute("select",
            "id,project_number,name,state,cn_project_type,classification,territory,cn_pj_mode,cn_customer,bcs_po_no," +
            "owned_by_id,managed_by_id,team_id,wbs_id," +
            "date_start_sched,date_due_sched,date_start_target,date_due_target,date_start_act,date_due_act," +
            "cn_init_plan_start,cn_init_plan_finish,cn_initial_comp,cn_closed_date," +
            "rollup_percent_compl,bcs_rollup_percent_compl,cn_wbs_compl,cn_plan_compl," +
            "bcs_project_status_label,bcs_project_status,bcs_project_compl_cate," +
            "cn_delay_days,cn_pending_days,cn_pv,cn_ev,cn_ac,bcs_total_work_time,bcs_total_workingtime_record," +
            "cn_sv,cn_cv,cn_spi,cn_cpi,cn_exp_mandays,cn_wbs_rolwrkest,cn_remainder,cn_bug_imp_rate," +
            "percent_compl_1,status_1,percent_compl_2,status_2,percent_compl_3,status_3,percent_compl_4,status_4," +
            "percent_compl_5,status_5,percent_compl_6,status_6,percent_compl_7,status_7,percent_compl_8,status_8," +
            "percent_compl_9,status_9,percent_compl_10,status_10,percent_compl_11,status_11,percent_compl_12,status_12"
        );
        qry.setAttribute("orderBy", "project_number DESC");

        if (query != null)
        {
            if (!string.IsNullOrEmpty(query.StateFilter) &&
                !string.Equals(query.StateFilter, "ALL", System.StringComparison.OrdinalIgnoreCase))
            {
                qry.setProperty("state", SanitizeInput(query.StateFilter));
            }
            if (!string.IsNullOrEmpty(query.ProjectTypeFilter) &&
                !string.Equals(query.ProjectTypeFilter, "ALL", System.StringComparison.OrdinalIgnoreCase))
            {
                qry.setProperty("cn_project_type", SanitizeInput(query.ProjectTypeFilter));
            }
            if (!string.IsNullOrEmpty(query.TerritoryFilter) &&
                !string.Equals(query.TerritoryFilter, "ALL", System.StringComparison.OrdinalIgnoreCase))
            {
                qry.setProperty("territory", SanitizeInput(query.TerritoryFilter));
            }
            if (!string.IsNullOrEmpty(query.TeamId) &&
                !string.Equals(query.TeamId, "ALL", System.StringComparison.OrdinalIgnoreCase))
            {
                qry.setProperty("team_id", SanitizeInput(query.TeamId));
            }
            if (!string.IsNullOrEmpty(query.PmId) &&
                !string.Equals(query.PmId, "ALL", System.StringComparison.OrdinalIgnoreCase))
            {
                qry.setProperty("owned_by_id", SanitizeInput(query.PmId));
            }
            if (query.ProjNum > 0)
            {
                qry.setProperty("project_number", query.ProjNum.ToString());
            }
        }

        Item res = qry.apply();
        if (res.isError())
        {
            return list;
        }

        int count = res.getItemCount();
        for (int i = 0; i < count; i++)
        {
            ProjectRecord rec = MapItemToProjectRecord(res.getItemByIndex(i));
            if (query != null && !string.IsNullOrEmpty(query.Keyword))
            {
                string kw = query.Keyword.Trim().ToLowerInvariant();
                bool matchNum = rec.ProjNum.ToString().Contains(kw);
                bool matchName = (rec.Name ?? "").ToLowerInvariant().Contains(kw);
                bool matchPm = (rec.PmName ?? "").ToLowerInvariant().Contains(kw);
                if (!matchNum && !matchName && !matchPm)
                {
                    continue;
                }
            }
            list.Add(rec);
        }
        return list;
    }

    /// <summary>
    /// 依據專案編號查詢單一 Project
    /// </summary>
    public ProjectRecord GetProjectByNumber(int projNum)
    {
        AnalyticsQueryDto q = new AnalyticsQueryDto();
        q.StateFilter = "ALL";
        q.ProjNum = projNum;
        System.Collections.Generic.List<ProjectRecord> list = GetProjects(q);
        return list.Count > 0 ? list[0] : null;
    }

    /// <summary>
    /// 查詢指定專案集合之 WBS Element 與 Sub WBS 父子關聯階層
    /// </summary>
    public System.Collections.Generic.List<WbsRecord> GetWbsHierarchy(
        System.Collections.Generic.List<int> projNums,
        System.Collections.Generic.List<string> rootWbsIds
    )
    {
        System.Collections.Generic.List<WbsRecord> wbsList = new System.Collections.Generic.List<WbsRecord>();
        if (this._inn == null || projNums == null || projNums.Count == 0)
        {
            return wbsList;
        }

        // 1. 依 proj_num 批次查詢 WBS Element
        System.Text.StringBuilder sbNums = new System.Text.StringBuilder();
        for (int i = 0; i < projNums.Count; i++)
        {
            if (i > 0) sbNums.Append(",");
            sbNums.Append("'").Append(projNums[i].ToString()).Append("'");
        }

        Item wbsQry = this._inn.newItem("WBS Element", "get");
        wbsQry.setAttribute("select",
            "id,proj_num,wbs_index,name,is_top,classification,rollup_status,rollup_percent_compl," +
            "rollup_date_sched_start,rollup_date_sched_due,rollup_date_start_act," +
            "rollup_earned_value,rollup_planned_value,rollup_work_est,rollup_actual_work,spi,cpi,cn_sv,cn_cv"
        );
        wbsQry.setAttribute("where", "[WBS_ELEMENT].proj_num IN (" + sbNums.ToString() + ")");
        Item wbsRes = wbsQry.apply();
        if (wbsRes.isError())
        {
            return wbsList;
        }

        System.Collections.Generic.List<string> allWbsIds = new System.Collections.Generic.List<string>();
        int count = wbsRes.getItemCount();
        for (int i = 0; i < count; i++)
        {
            Item item = wbsRes.getItemByIndex(i);
            WbsRecord rec = new WbsRecord();
            rec.Id = item.getID();
            rec.ProjNum = ParseInt(item.getProperty("proj_num", "0"), 0);
            rec.WbsIndex = item.getProperty("wbs_index", "");
            rec.Name = item.getProperty("name", "");
            rec.IsTop = item.getProperty("is_top", "0") == "1";
            rec.Classification = item.getProperty("classification", "");
            rec.RollupStatus = item.getProperty("rollup_status", "");
            rec.RollupPercentCompl = ParseDouble(item.getProperty("rollup_percent_compl", "0"), 0.0);
            rec.SchedStart = ParseDate(item.getProperty("rollup_date_sched_start", ""));
            rec.SchedDue = ParseDate(item.getProperty("rollup_date_sched_due", ""));
            rec.ActStart = ParseDate(item.getProperty("rollup_date_start_act", ""));
            rec.EarnedValue = ParseDouble(item.getProperty("rollup_earned_value", "0"), 0.0);
            rec.PlannedValue = ParseDouble(item.getProperty("rollup_planned_value", "0"), 0.0);
            rec.WorkEst = ParseDouble(item.getProperty("rollup_work_est", "0"), 0.0);
            rec.ActualWork = ParseDouble(item.getProperty("rollup_actual_work", "0"), 0.0);
            rec.Spi = ParseNullableDouble(item.getProperty("spi", ""));
            rec.Cpi = ParseNullableDouble(item.getProperty("cpi", ""));
            rec.ScheduleVariance = ParseDouble(item.getProperty("cn_sv", "0"), 0.0);
            rec.CostVariance = ParseDouble(item.getProperty("cn_cv", "0"), 0.0);

            wbsList.Add(rec);
            if (!string.IsNullOrEmpty(rec.Id))
            {
                allWbsIds.Add("'" + SanitizeInput(rec.Id) + "'");
            }
        }

        // 2. 查詢 Sub WBS Relationship 以注入 ParentWbsId (因為 WBS Element 無 parent_wbs_id 屬性)
        if (allWbsIds.Count > 0)
        {
            Item subQry = this._inn.newItem("Sub WBS", "get");
            subQry.setAttribute("select", "source_id,related_id");
            subQry.setAttribute("where", "[SUB_WBS].source_id IN (" + string.Join(",", allWbsIds.ToArray()) + ")");
            Item subRes = subQry.apply();
            if (!subRes.isError())
            {
                System.Collections.Generic.Dictionary<string, string> parentMap =
                    new System.Collections.Generic.Dictionary<string, string>();
                int relCount = subRes.getItemCount();
                for (int r = 0; r < relCount; r++)
                {
                    Item rel = subRes.getItemByIndex(r);
                    string sid = rel.getProperty("source_id", "");
                    string rid = rel.getProperty("related_id", "");
                    if (!string.IsNullOrEmpty(sid) && !string.IsNullOrEmpty(rid))
                    {
                        parentMap[rid] = sid;
                    }
                }
                for (int i = 0; i < wbsList.Count; i++)
                {
                    if (parentMap.ContainsKey(wbsList[i].Id))
                    {
                        wbsList[i].ParentWbsId = parentMap[wbsList[i].Id];
                    }
                }
            }
        }

        return wbsList;
    }

    /// <summary>
    /// 查詢指定專案集合之 Activity2 任務、所屬 WBS 關聯與 Activity2 Assignment 指派成員
    /// </summary>
    public System.Collections.Generic.List<ActivityRecord> GetActivitiesWithAssignments(
        System.Collections.Generic.List<int> projNums
    )
    {
        System.Collections.Generic.List<ActivityRecord> actList = new System.Collections.Generic.List<ActivityRecord>();
        if (this._inn == null || projNums == null || projNums.Count == 0)
        {
            return actList;
        }

        System.Text.StringBuilder sbNums = new System.Text.StringBuilder();
        for (int i = 0; i < projNums.Count; i++)
        {
            if (i > 0) sbNums.Append(",");
            sbNums.Append("'").Append(projNums[i].ToString()).Append("'");
        }

        Item actQry = this._inn.newItem("Activity2", "get");
        actQry.setAttribute("select",
            "id,proj_num,name,state,status,is_milestone,is_critical,percent_compl," +
            "date_start_sched,date_due_sched,date_start_act,date_due_act,days_remaining," +
            "work_est,actual_work,earned_value,planned_value,owned_by_id,managed_by_id,team_id"
        );
        actQry.setAttribute("where", "[ACTIVITY2].proj_num IN (" + sbNums.ToString() + ")");
        Item actRes = actQry.apply();
        if (actRes.isError())
        {
            return actList;
        }

        System.Collections.Generic.List<string> actIds = new System.Collections.Generic.List<string>();
        int count = actRes.getItemCount();
        for (int i = 0; i < count; i++)
        {
            Item item = actRes.getItemByIndex(i);
            ActivityRecord rec = new ActivityRecord();
            rec.Id = item.getID();
            rec.ProjNum = ParseInt(item.getProperty("proj_num", "0"), 0);
            rec.Name = item.getProperty("name", "");
            rec.State = item.getProperty("state", "");
            rec.Status = item.getProperty("status", "");
            rec.IsMilestone = item.getProperty("is_milestone", "0") == "1";
            rec.IsCritical = item.getProperty("is_critical", "0") == "1";
            rec.PercentCompl = ParseDouble(item.getProperty("percent_compl", "0"), 0.0);
            rec.SchedStart = ParseDate(item.getProperty("date_start_sched", ""));
            rec.SchedDue = ParseDate(item.getProperty("date_due_sched", ""));
            rec.ActStart = ParseDate(item.getProperty("date_start_act", ""));
            rec.ActFinish = ParseDate(item.getProperty("date_due_act", ""));
            rec.DaysRemaining = ParseNullableInt(item.getProperty("days_remaining", ""));
            rec.WorkEst = ParseDouble(item.getProperty("work_est", "0"), 0.0);
            rec.ActualWork = ParseDouble(item.getProperty("actual_work", "0"), 0.0);
            rec.EarnedValue = ParseDouble(item.getProperty("earned_value", "0"), 0.0);
            rec.PlannedValue = ParseDouble(item.getProperty("planned_value", "0"), 0.0);

            string ownerId = item.getProperty("owned_by_id", "");
            string ownerName = item.getPropertyAttribute("owned_by_id", "keyed_name", "");
            if (string.IsNullOrEmpty(ownerId))
            {
                ownerId = item.getProperty("managed_by_id", "");
                ownerName = item.getPropertyAttribute("managed_by_id", "keyed_name", "");
            }
            rec.AssigneeId = ownerId;
            rec.AssigneeName = ownerName;
            rec.TeamId = item.getProperty("team_id", "");

            actList.Add(rec);
            if (!string.IsNullOrEmpty(rec.Id))
            {
                actIds.Add("'" + SanitizeInput(rec.Id) + "'");
            }
        }

        if (actIds.Count > 0)
        {
            string idClause = string.Join(",", actIds.ToArray());

            // 查詢 WBS Activity2 以映射每個 Activity2 的所屬父 WBS
            Item wbsActQry = this._inn.newItem("WBS Activity2", "get");
            wbsActQry.setAttribute("select", "source_id,related_id");
            wbsActQry.setAttribute("where", "[WBS_ACTIVITY2].related_id IN (" + idClause + ")");
            Item wbsActRes = wbsActQry.apply();
            if (!wbsActRes.isError())
            {
                System.Collections.Generic.Dictionary<string, string> actParentWbsMap =
                    new System.Collections.Generic.Dictionary<string, string>();
                int waCount = wbsActRes.getItemCount();
                for (int w = 0; w < waCount; w++)
                {
                    Item wa = wbsActRes.getItemByIndex(w);
                    string sid = wa.getProperty("source_id", "");
                    string rid = wa.getProperty("related_id", "");
                    if (!string.IsNullOrEmpty(sid) && !string.IsNullOrEmpty(rid))
                    {
                        actParentWbsMap[rid] = sid;
                    }
                }
                for (int i = 0; i < actList.Count; i++)
                {
                    if (actParentWbsMap.ContainsKey(actList[i].Id))
                    {
                        actList[i].ParentWbsId = actParentWbsMap[actList[i].Id];
                    }
                }
            }

            // 查詢 Activity2 Assignment 覆蓋或補充指派成員
            Item asgnQry = this._inn.newItem("Activity2 Assignment", "get");
            asgnQry.setAttribute("select", "source_id,related_id,work_est,percent_compl");
            asgnQry.setAttribute("where", "[ACTIVITY2_ASSIGNMENT].source_id IN (" + idClause + ")");
            Item asgnRes = asgnQry.apply();
            if (!asgnRes.isError())
            {
                System.Collections.Generic.Dictionary<string, string> asgnIdMap =
                    new System.Collections.Generic.Dictionary<string, string>();
                System.Collections.Generic.Dictionary<string, string> asgnNameMap =
                    new System.Collections.Generic.Dictionary<string, string>();

                int aCount = asgnRes.getItemCount();
                for (int a = 0; a < aCount; a++)
                {
                    Item asgn = asgnRes.getItemByIndex(a);
                    string sid = asgn.getProperty("source_id", "");
                    string rid = asgn.getProperty("related_id", "");
                    string rName = asgn.getPropertyAttribute("related_id", "keyed_name", "");
                    if (!string.IsNullOrEmpty(sid) && !string.IsNullOrEmpty(rid) && !asgnIdMap.ContainsKey(sid))
                    {
                        asgnIdMap[sid] = rid;
                        asgnNameMap[sid] = rName;
                    }
                }
                for (int i = 0; i < actList.Count; i++)
                {
                    if (asgnIdMap.ContainsKey(actList[i].Id))
                    {
                        actList[i].AssigneeId = asgnIdMap[actList[i].Id];
                        actList[i].AssigneeName = asgnNameMap[actList[i].Id];
                    }
                }
            }
        }

        return actList;
    }

    private static ProjectRecord MapItemToProjectRecord(Item item)
    {
        ProjectRecord rec = new ProjectRecord();
        rec.Id = item.getID();
        rec.ProjNum = ParseInt(item.getProperty("project_number", "0"), 0);
        rec.Name = item.getProperty("name", "");
        rec.State = item.getProperty("state", "Active");
        rec.ProjectType = item.getProperty("cn_project_type", "");
        rec.Classification = item.getProperty("classification", "");
        rec.Territory = item.getProperty("territory", "");
        rec.ProjectMode = item.getProperty("cn_pj_mode", "");
        rec.CustomerName = item.getPropertyAttribute("cn_customer", "keyed_name", item.getProperty("cn_customer", ""));
        rec.PoNumber = item.getProperty("bcs_po_no", "");

        rec.PmId = item.getProperty("owned_by_id", "");
        rec.PmName = item.getPropertyAttribute("owned_by_id", "keyed_name", rec.PmId);
        rec.ManagerId = item.getProperty("managed_by_id", "");
        rec.ManagerName = item.getPropertyAttribute("managed_by_id", "keyed_name", rec.ManagerId);
        rec.TeamId = item.getProperty("team_id", "");
        rec.TeamName = item.getPropertyAttribute("team_id", "keyed_name", rec.TeamId);
        rec.WbsId = item.getProperty("wbs_id", "");

        rec.SchedStart = ParseDate(item.getProperty("date_start_sched", ""));
        rec.SchedDue = ParseDate(item.getProperty("date_due_sched", ""));
        rec.TargetStart = ParseDate(item.getProperty("date_start_target", ""));
        rec.TargetDue = ParseDate(item.getProperty("date_due_target", ""));
        rec.ActStart = ParseDate(item.getProperty("date_start_act", ""));
        rec.ActFinish = ParseDate(item.getProperty("date_due_act", ""));
        rec.InitPlanStart = ParseDate(item.getProperty("cn_init_plan_start", ""));
        rec.InitPlanFinish = ParseDate(item.getProperty("cn_init_plan_finish", ""));
        rec.InitialCompDate = ParseDate(item.getProperty("cn_initial_comp", ""));
        rec.ClosedDate = ParseDate(item.getProperty("cn_closed_date", ""));

        double? oaCompl = ParseNullableDouble(item.getProperty("rollup_percent_compl", ""));
        if (!oaCompl.HasValue) oaCompl = ParseNullableDouble(item.getProperty("bcs_rollup_percent_compl", ""));
        if (!oaCompl.HasValue) oaCompl = ParseNullableDouble(item.getProperty("cn_wbs_compl", ""));
        rec.RollupPercentCompl = oaCompl;
        rec.PlanCompl = ParseNullableDouble(item.getProperty("cn_plan_compl", ""));

        rec.BcsStatusLabel = item.getProperty("bcs_project_status_label", "");
        rec.BcsStatusColor = item.getProperty("bcs_project_status", "");
        rec.ComplCategory = item.getProperty("bcs_project_compl_cate", "");

        rec.DelayDays = ParseInt(item.getProperty("cn_delay_days", "0"), 0);
        rec.PendingDays = ParseInt(item.getProperty("cn_pending_days", "0"), 0);
        rec.PlannedValue = ParseDouble(item.getProperty("cn_pv", "0"), 0.0);
        rec.EarnedValue = ParseDouble(item.getProperty("cn_ev", "0"), 0.0);

        double ac = ParseDouble(item.getProperty("bcs_total_workingtime_record", "0"), 0.0);
        if (ac <= 0) ac = ParseDouble(item.getProperty("cn_ac", "0"), 0.0);
        if (ac <= 0) ac = ParseDouble(item.getProperty("bcs_total_work_time", "0"), 0.0);
        rec.ActualCost = ac;

        rec.ScheduleVariance = ParseDouble(item.getProperty("cn_sv", "0"), 0.0);
        rec.CostVariance = ParseDouble(item.getProperty("cn_cv", "0"), 0.0);
        rec.Spi = ParseNullableDouble(item.getProperty("cn_spi", ""));
        rec.Cpi = ParseNullableDouble(item.getProperty("cn_cpi", ""));
        rec.ExpMandays = ParseDouble(item.getProperty("cn_exp_mandays", "0"), 0.0);
        rec.RollupWorkEst = ParseDouble(item.getProperty("cn_wbs_rolwrkest", "0"), 0.0);
        rec.RemainderHours = ParseDouble(item.getProperty("cn_remainder", "0"), 0.0);
        rec.BudgetExecRate = ParseDouble(item.getProperty("cn_bug_imp_rate", "0"), 0.0);

        for (int p = 1; p <= 12; p++)
        {
            rec.PhasePercentCompl[p - 1] = ParseInt(item.getProperty("percent_compl_" + p.ToString(), "0"), 0);
            rec.PhaseStatusColor[p - 1] = item.getProperty("status_" + p.ToString(), "");
        }

        return rec;
    }

    public static int ParseInt(string raw, int fallback)
    {
        if (string.IsNullOrEmpty(raw)) return fallback;
        int val;
        if (int.TryParse(raw, out val)) return val;
        double dVal;
        if (double.TryParse(raw, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out dVal))
        {
            return (int)System.Math.Round(dVal);
        }
        return fallback;
    }

    public static int? ParseNullableInt(string raw)
    {
        if (string.IsNullOrEmpty(raw)) return null;
        int val;
        if (int.TryParse(raw, out val)) return val;
        return null;
    }

    public static double ParseDouble(string raw, double fallback)
    {
        if (string.IsNullOrEmpty(raw)) return fallback;
        double val;
        if (double.TryParse(raw, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out val))
        {
            if (double.IsNaN(val) || double.IsInfinity(val)) return fallback;
            return val;
        }
        return fallback;
    }

    public static double? ParseNullableDouble(string raw)
    {
        if (string.IsNullOrEmpty(raw)) return null;
        double val;
        if (double.TryParse(raw, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out val))
        {
            if (double.IsNaN(val) || double.IsInfinity(val)) return null;
            return val;
        }
        return null;
    }

    public static System.DateTime? ParseDate(string raw)
    {
        if (string.IsNullOrEmpty(raw)) return null;
        System.DateTime dt;
        if (System.DateTime.TryParse(raw, System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out dt))
        {
            return dt;
        }
        return null;
    }
}

// ============================================================================
// RESTful 風格控制器 (ProjectAnalyticsController - 對齊 pmomonthly 路由設計)
// ============================================================================

/// <summary>
/// PMO 專案進度狀態分析統計 RESTful 控制器
/// </summary>
public class ProjectAnalyticsController
{
    private readonly IProjectRepository _repo;
    private readonly IProjectHealthCalculator _healthCalc;
    private readonly IWbsStageAnalyzer _stageAnalyzer;
    private readonly IWorkloadAggregator _workloadAggregator;

    public ProjectAnalyticsController(
        IProjectRepository repo,
        IProjectHealthCalculator healthCalc,
        IWbsStageAnalyzer stageAnalyzer,
        IWorkloadAggregator workloadAggregator
    )
    {
        this._repo = repo;
        this._healthCalc = healthCalc;
        this._stageAnalyzer = stageAnalyzer;
        this._workloadAggregator = workloadAggregator;
    }

    /// <summary>
    /// 解析 Aras Request Item 並分發至對應 RESTful 路由處理函式
    /// </summary>
    public string HandleItemRequest(Item requestItem, System.DateTime asOfDate)
    {
        AnalyticsQueryDto query = new AnalyticsQueryDto();
        if (requestItem != null)
        {
            string route = requestItem.getProperty("route", "");
            if (string.IsNullOrEmpty(route))
            {
                route = requestItem.getProperty("action", "/api/v1/dashboard/summary");
            }
            query.Route = route;
            query.StateFilter = requestItem.getProperty("state", "Active");
            query.ProjectTypeFilter = requestItem.getProperty("project_type", "ALL");
            query.TerritoryFilter = requestItem.getProperty("territory", "ALL");
            query.TeamId = requestItem.getProperty("team_id", "ALL");
            query.PmId = requestItem.getProperty("pm_id", "ALL");
            query.HealthFilter = requestItem.getProperty("health_status", "ALL");
            query.Keyword = requestItem.getProperty("keyword", "");
            query.ProjNum = ArasProjectRepository.ParseInt(requestItem.getProperty("proj_num", "0"), 0);
        }

        return ExecuteRoute(query, asOfDate);
    }

    /// <summary>
    /// 依據 AnalyticsQueryDto 執行 RESTful 路由分發並回傳 JSON 字串
    /// </summary>
    public string ExecuteRoute(AnalyticsQueryDto query, System.DateTime asOfDate)
    {
        string route = (query.Route ?? "/api/v1/dashboard/summary").Trim();

        if (route.Equals("/api/v1/health", System.StringComparison.OrdinalIgnoreCase) ||
            route.Equals("HEALTH_CHECK", System.StringComparison.OrdinalIgnoreCase))
        {
            return "{\"status\":\"healthy\",\"version\":\"1.0.0\",\"system\":\"PMO_ProjectAnalytics_API\"}";
        }

        if (route.StartsWith("/api/v1/dashboard/project", System.StringComparison.OrdinalIgnoreCase) ||
            route.Equals("GET_PROJECT_DETAIL", System.StringComparison.OrdinalIgnoreCase))
        {
            return GetProjectDetailJson(query.ProjNum, asOfDate);
        }

        if (route.StartsWith("/api/v1/dashboard/wbs", System.StringComparison.OrdinalIgnoreCase) ||
            route.Equals("GET_WBS_ANALYSIS", System.StringComparison.OrdinalIgnoreCase))
        {
            return GetWbsAnalysisJson(query.ProjNum, asOfDate);
        }

        if (route.StartsWith("/api/v1/dashboard/assignees", System.StringComparison.OrdinalIgnoreCase) ||
            route.Equals("GET_ASSIGNEE_WORKLOAD", System.StringComparison.OrdinalIgnoreCase))
        {
            return GetAssigneeWorkloadJson(query, asOfDate);
        }

        if (route.StartsWith("/api/v1/dashboard/team", System.StringComparison.OrdinalIgnoreCase) ||
            route.Equals("GET_TEAM_ANALYSIS", System.StringComparison.OrdinalIgnoreCase))
        {
            return GetPortfolioSummaryJson(query, asOfDate);
        }

        if (route.StartsWith("/api/v1/dashboard/pm", System.StringComparison.OrdinalIgnoreCase) ||
            route.Equals("GET_PM_ANALYSIS", System.StringComparison.OrdinalIgnoreCase))
        {
            return GetPortfolioSummaryJson(query, asOfDate);
        }

        // 預設路由：/api/v1/dashboard/summary (GET_PORTFOLIO_SUMMARY)
        return GetPortfolioSummaryJson(query, asOfDate);
    }

    /// <summary>
    /// 路由 1：GET /api/v1/dashboard/summary — 全域多專案進度統計與健康度總覽
    /// </summary>
    public string GetPortfolioSummaryJson(AnalyticsQueryDto query, System.DateTime asOfDate)
    {
        System.Collections.Generic.List<ProjectRecord> projects = this._repo.GetProjects(query);
        System.Collections.Generic.List<int> projNums = new System.Collections.Generic.List<int>();
        System.Collections.Generic.List<string> rootWbsIds = new System.Collections.Generic.List<string>();

        for (int i = 0; i < projects.Count; i++)
        {
            if (projects[i].ProjNum > 0) projNums.Add(projects[i].ProjNum);
            if (!string.IsNullOrEmpty(projects[i].WbsId)) rootWbsIds.Add(projects[i].WbsId);
        }

        System.Collections.Generic.List<WbsRecord> allWbs = this._repo.GetWbsHierarchy(projNums, rootWbsIds);
        System.Collections.Generic.List<ActivityRecord> allActs = this._repo.GetActivitiesWithAssignments(projNums);

        System.Collections.Generic.Dictionary<int, WbsRecord> rootWbsByProj =
            new System.Collections.Generic.Dictionary<int, WbsRecord>();
        for (int i = 0; i < allWbs.Count; i++)
        {
            if (allWbs[i].IsTop && !rootWbsByProj.ContainsKey(allWbs[i].ProjNum))
            {
                rootWbsByProj[allWbs[i].ProjNum] = allWbs[i];
            }
        }

        System.Collections.Generic.Dictionary<int, System.Collections.Generic.List<ActivityRecord>> actsByProj =
            new System.Collections.Generic.Dictionary<int, System.Collections.Generic.List<ActivityRecord>>();
        for (int i = 0; i < allActs.Count; i++)
        {
            int pNum = allActs[i].ProjNum;
            if (!actsByProj.ContainsKey(pNum))
            {
                actsByProj[pNum] = new System.Collections.Generic.List<ActivityRecord>();
            }
            actsByProj[pNum].Add(allActs[i]);
        }

        System.Collections.Generic.List<ProjectSummaryDto> summaries =
            new System.Collections.Generic.List<ProjectSummaryDto>();

        int greenCount = 0;
        int yellowCount = 0;
        int redCount = 0;
        int activeCount = 0;
        int closedCount = 0;
        int pendingCount = 0;
        int totalOverdueTasks = 0;

        double sumProgress = 0.0;
        double sumSpi = 0.0;
        double sumCpi = 0.0;
        double sumPv = 0.0;
        double sumEv = 0.0;
        double sumAc = 0.0;
        double sumSv = 0.0;
        double sumCv = 0.0;

        System.Collections.Generic.HashSet<string> pmSet = new System.Collections.Generic.HashSet<string>();
        System.Collections.Generic.HashSet<string> teamSet = new System.Collections.Generic.HashSet<string>();

        for (int i = 0; i < projects.Count; i++)
        {
            ProjectRecord p = projects[i];
            WbsRecord rWbs = rootWbsByProj.ContainsKey(p.ProjNum) ? rootWbsByProj[p.ProjNum] : null;
            System.Collections.Generic.List<ActivityRecord> pActs = actsByProj.ContainsKey(p.ProjNum)
                ? actsByProj[p.ProjNum]
                : new System.Collections.Generic.List<ActivityRecord>();

            ProjectSummaryDto dto = this._healthCalc.ComputeProjectSummary(p, rWbs, pActs, asOfDate);

            // 若有指定健康度燈號篩選，於此處過濾
            if (query != null &&
                !string.IsNullOrEmpty(query.HealthFilter) &&
                !string.Equals(query.HealthFilter, "ALL", System.StringComparison.OrdinalIgnoreCase) &&
                !string.Equals(dto.HealthStatus, query.HealthFilter, System.StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            summaries.Add(dto);
            if (!string.IsNullOrEmpty(dto.PmId)) pmSet.Add(dto.PmId);
            if (!string.IsNullOrEmpty(dto.TeamId)) teamSet.Add(dto.TeamId);

            string stLower = (dto.State ?? "").ToLowerInvariant();
            if (stLower == "active") activeCount++;
            else if (stLower == "closed" || stLower == "completed") closedCount++;
            else pendingCount++;

            if (dto.HealthStatus == "RED") redCount++;
            else if (dto.HealthStatus == "YELLOW") yellowCount++;
            else greenCount++;

            totalOverdueTasks += dto.OverdueTasks;
            sumProgress += dto.ActualProgress;
            sumSpi += dto.Spi;
            sumCpi += dto.Cpi;
            sumPv += dto.PlannedValue;
            sumEv += dto.EarnedValue;
            sumAc += dto.ActualCost;
            sumSv += dto.ScheduleVariance;
            sumCv += dto.CostVariance;
        }

        int totalProj = summaries.Count;
        double avgProgress = totalProj > 0 ? System.Math.Round(sumProgress / totalProj, 1) : 0.0;
        double avgSpi = totalProj > 0 ? System.Math.Round(sumSpi / totalProj, 2) : 0.0;
        double avgCpi = totalProj > 0 ? System.Math.Round(sumCpi / totalProj, 2) : 0.0;
        double greenPct = totalProj > 0 ? System.Math.Round((double)greenCount / totalProj * 100.0, 1) : 0.0;
        double yellowPct = totalProj > 0 ? System.Math.Round((double)yellowCount / totalProj * 100.0, 1) : 0.0;
        double redPct = totalProj > 0 ? System.Math.Round((double)redCount / totalProj * 100.0, 1) : 0.0;

        System.Text.StringBuilder sb = new System.Text.StringBuilder();
        sb.Append("{");
        sb.Append("\"status\":\"success\",");
        sb.Append("\"summary\":{");
        sb.Append("\"total_projects\":").Append(totalProj).Append(",");
        sb.Append("\"active_projects\":").Append(activeCount).Append(",");
        sb.Append("\"closed_projects\":").Append(closedCount).Append(",");
        sb.Append("\"pending_projects\":").Append(pendingCount).Append(",");
        sb.Append("\"avg_progress\":").Append(FormatNum(avgProgress)).Append(",");
        sb.Append("\"total_overdue_tasks\":").Append(totalOverdueTasks).Append(",");
        sb.Append("\"total_pm_count\":").Append(pmSet.Count).Append(",");
        sb.Append("\"total_team_count\":").Append(teamSet.Count);
        sb.Append("},");

        sb.Append("\"rag_status\":{");
        sb.Append("\"green_count\":").Append(greenCount).Append(",");
        sb.Append("\"amber_count\":").Append(yellowCount).Append(",");
        sb.Append("\"red_count\":").Append(redCount).Append(",");
        sb.Append("\"green_percent\":").Append(FormatNum(greenPct)).Append(",");
        sb.Append("\"amber_percent\":").Append(FormatNum(yellowPct)).Append(",");
        sb.Append("\"red_percent\":").Append(FormatNum(redPct));
        sb.Append("},");

        sb.Append("\"evm_summary\":{");
        sb.Append("\"avg_spi\":").Append(FormatNum(avgSpi)).Append(",");
        sb.Append("\"avg_cpi\":").Append(FormatNum(avgCpi)).Append(",");
        sb.Append("\"total_planned_value\":").Append(FormatNum(System.Math.Round(sumPv, 2))).Append(",");
        sb.Append("\"total_earned_value\":").Append(FormatNum(System.Math.Round(sumEv, 2))).Append(",");
        sb.Append("\"total_actual_cost\":").Append(FormatNum(System.Math.Round(sumAc, 2))).Append(",");
        sb.Append("\"total_cn_sv\":").Append(FormatNum(System.Math.Round(sumSv, 2))).Append(",");
        sb.Append("\"total_cn_cv\":").Append(FormatNum(System.Math.Round(sumCv, 2)));
        sb.Append("},");

        sb.Append("\"team_performance\":").Append(BuildGroupPerformanceJson(summaries, true)).Append(",");
        sb.Append("\"pm_performance\":").Append(BuildGroupPerformanceJson(summaries, false)).Append(",");

        sb.Append("\"projects\":[");
        for (int i = 0; i < summaries.Count; i++)
        {
            if (i > 0) sb.Append(",");
            sb.Append(SerializeProjectSummary(summaries[i]));
        }
        sb.Append("]");
        sb.Append("}");
        return sb.ToString();
    }

    /// <summary>
    /// 路由 2：GET /api/v1/dashboard/project/{proj_num} — 單一專案深度進度分析 (含 Ph1~12、WBS階段偏差、成員負荷)
    /// </summary>
    public string GetProjectDetailJson(int projNum, System.DateTime asOfDate)
    {
        ProjectRecord proj = this._repo.GetProjectByNumber(projNum);
        if (proj == null)
        {
            return "{\"status\":\"error\",\"message\":\"找不到專案編號 " + projNum.ToString() + "\"}";
        }

        System.Collections.Generic.List<int> nums = new System.Collections.Generic.List<int> { proj.ProjNum };
        System.Collections.Generic.List<string> wbsIds = new System.Collections.Generic.List<string>();
        if (!string.IsNullOrEmpty(proj.WbsId)) wbsIds.Add(proj.WbsId);

        System.Collections.Generic.List<WbsRecord> allWbs = this._repo.GetWbsHierarchy(nums, wbsIds);
        System.Collections.Generic.List<ActivityRecord> acts = this._repo.GetActivitiesWithAssignments(nums);

        WbsRecord rootWbs = null;
        for (int i = 0; i < allWbs.Count; i++)
        {
            if (allWbs[i].IsTop || allWbs[i].Id == proj.WbsId)
            {
                rootWbs = allWbs[i];
                break;
            }
        }

        ProjectSummaryDto projSummary = this._healthCalc.ComputeProjectSummary(proj, rootWbs, acts, asOfDate);
        System.Collections.Generic.List<WbsStageAnalyticsDto> mainStages =
            this._stageAnalyzer.AnalyzeMainStages(proj.WbsId, allWbs, acts, asOfDate);
        System.Collections.Generic.List<AssigneeWorkloadDto> assignees =
            this._workloadAggregator.AggregateByAssignee(acts, asOfDate);

        System.Text.StringBuilder sb = new System.Text.StringBuilder();
        sb.Append("{");
        sb.Append("\"status\":\"success\",");
        sb.Append("\"project\":").Append(SerializeProjectSummary(projSummary)).Append(",");
        sb.Append("\"wbs_items\":[");
        for (int i = 0; i < mainStages.Count; i++)
        {
            if (i > 0) sb.Append(",");
            sb.Append(SerializeWbsStageNode(mainStages[i], false));
        }
        sb.Append("],");
        sb.Append("\"assignees\":[");
        for (int i = 0; i < assignees.Count; i++)
        {
            if (i > 0) sb.Append(",");
            sb.Append(SerializeAssignee(assignees[i]));
        }
        sb.Append("]");
        sb.Append("}");
        return sb.ToString();
    }

    /// <summary>
    /// 路由 3：GET /api/v1/dashboard/wbs/{proj_num} — 單一專案完整 WBS 樹狀結構與各階段時程偏差分析
    /// </summary>
    public string GetWbsAnalysisJson(int projNum, System.DateTime asOfDate)
    {
        ProjectRecord proj = this._repo.GetProjectByNumber(projNum);
        if (proj == null)
        {
            return "{\"status\":\"error\",\"message\":\"找不到專案編號 " + projNum.ToString() + "\"}";
        }

        System.Collections.Generic.List<int> nums = new System.Collections.Generic.List<int> { proj.ProjNum };
        System.Collections.Generic.List<string> wbsIds = new System.Collections.Generic.List<string>();
        if (!string.IsNullOrEmpty(proj.WbsId)) wbsIds.Add(proj.WbsId);

        System.Collections.Generic.List<WbsRecord> allWbs = this._repo.GetWbsHierarchy(nums, wbsIds);
        System.Collections.Generic.List<ActivityRecord> acts = this._repo.GetActivitiesWithAssignments(nums);

        System.Collections.Generic.List<WbsStageAnalyticsDto> tree =
            this._stageAnalyzer.BuildWbsTree(proj.WbsId, allWbs, acts, asOfDate);

        System.Text.StringBuilder sb = new System.Text.StringBuilder();
        sb.Append("{");
        sb.Append("\"status\":\"success\",");
        sb.Append("\"proj_num\":").Append(proj.ProjNum).Append(",");
        sb.Append("\"project_name\":\"").Append(EscapeJson(proj.Name)).Append("\",");
        sb.Append("\"wbs_tree\":[");
        for (int i = 0; i < tree.Count; i++)
        {
            if (i > 0) sb.Append(",");
            sb.Append(SerializeWbsStageNode(tree[i], true));
        }
        sb.Append("]");
        sb.Append("}");
        return sb.ToString();
    }

    /// <summary>
    /// 路由 4：GET /api/v1/dashboard/assignees — 跨專案或單一專案成員任務負荷統計
    /// </summary>
    public string GetAssigneeWorkloadJson(AnalyticsQueryDto query, System.DateTime asOfDate)
    {
        System.Collections.Generic.List<int> projNums = new System.Collections.Generic.List<int>();
        if (query != null && query.ProjNum > 0)
        {
            projNums.Add(query.ProjNum);
        }
        else
        {
            System.Collections.Generic.List<ProjectRecord> projs = this._repo.GetProjects(query);
            for (int i = 0; i < projs.Count; i++)
            {
                if (projs[i].ProjNum > 0) projNums.Add(projs[i].ProjNum);
            }
        }

        System.Collections.Generic.List<ActivityRecord> acts = this._repo.GetActivitiesWithAssignments(projNums);
        System.Collections.Generic.List<AssigneeWorkloadDto> assignees =
            this._workloadAggregator.AggregateByAssignee(acts, asOfDate);

        System.Text.StringBuilder sb = new System.Text.StringBuilder();
        sb.Append("{\"status\":\"success\",\"assignees\":[");
        for (int i = 0; i < assignees.Count; i++)
        {
            if (i > 0) sb.Append(",");
            sb.Append(SerializeAssignee(assignees[i]));
        }
        sb.Append("]}");
        return sb.ToString();
    }

    private static string BuildGroupPerformanceJson(
        System.Collections.Generic.List<ProjectSummaryDto> projects,
        bool groupByTeam
    )
    {
        System.Collections.Generic.Dictionary<string, System.Collections.Generic.List<ProjectSummaryDto>> groups =
            new System.Collections.Generic.Dictionary<string, System.Collections.Generic.List<ProjectSummaryDto>>();

        for (int i = 0; i < projects.Count; i++)
        {
            ProjectSummaryDto p = projects[i];
            string key = groupByTeam
                ? (string.IsNullOrEmpty(p.TeamId) ? "UNSPECIFIED" : p.TeamId)
                : (string.IsNullOrEmpty(p.PmId) ? "UNSPECIFIED" : p.PmId);

            if (!groups.ContainsKey(key))
            {
                groups[key] = new System.Collections.Generic.List<ProjectSummaryDto>();
            }
            groups[key].Add(p);
        }

        System.Text.StringBuilder sb = new System.Text.StringBuilder();
        sb.Append("[");
        bool first = true;
        foreach (System.Collections.Generic.KeyValuePair<string, System.Collections.Generic.List<ProjectSummaryDto>> kv in groups)
        {
            if (!first) sb.Append(",");
            first = false;

            System.Collections.Generic.List<ProjectSummaryDto> list = kv.Value;
            string name = groupByTeam ? list[0].TeamName : list[0].PmName;
            double spiSum = 0.0;
            double cpiSum = 0.0;
            double progSum = 0.0;
            int g = 0, y = 0, r = 0;

            for (int i = 0; i < list.Count; i++)
            {
                spiSum += list[i].Spi;
                cpiSum += list[i].Cpi;
                progSum += list[i].ActualProgress;
                if (list[i].HealthStatus == "RED") r++;
                else if (list[i].HealthStatus == "YELLOW") y++;
                else g++;
            }

            int cnt = list.Count;
            sb.Append("{");
            if (groupByTeam)
            {
                sb.Append("\"team_id\":\"").Append(EscapeJson(kv.Key)).Append("\",");
                sb.Append("\"team_name\":\"").Append(EscapeJson(name)).Append("\",");
            }
            else
            {
                sb.Append("\"pm_id\":\"").Append(EscapeJson(kv.Key)).Append("\",");
                sb.Append("\"pm_name\":\"").Append(EscapeJson(name)).Append("\",");
            }
            sb.Append("\"project_count\":").Append(cnt).Append(",");
            sb.Append("\"avg_progress\":").Append(FormatNum(System.Math.Round(progSum / cnt, 1))).Append(",");
            sb.Append("\"avg_spi\":").Append(FormatNum(System.Math.Round(spiSum / cnt, 2))).Append(",");
            sb.Append("\"avg_cpi\":").Append(FormatNum(System.Math.Round(cpiSum / cnt, 2))).Append(",");
            sb.Append("\"green_count\":").Append(g).Append(",");
            sb.Append("\"amber_count\":").Append(y).Append(",");
            sb.Append("\"red_count\":").Append(r);
            sb.Append("}");
        }
        sb.Append("]");
        return sb.ToString();
    }

    private static string SerializeProjectSummary(ProjectSummaryDto p)
    {
        System.Text.StringBuilder sb = new System.Text.StringBuilder();
        sb.Append("{");
        sb.Append("\"id\":\"").Append(EscapeJson(p.Id)).Append("\",");
        sb.Append("\"proj_num\":").Append(p.ProjNum).Append(",");
        sb.Append("\"project_name\":\"").Append(EscapeJson(p.ProjectName)).Append("\",");
        sb.Append("\"project_type\":\"").Append(EscapeJson(p.ProjectType)).Append("\",");
        sb.Append("\"classification\":\"").Append(EscapeJson(p.Classification)).Append("\",");
        sb.Append("\"territory\":\"").Append(EscapeJson(p.Territory)).Append("\",");
        sb.Append("\"project_mode\":\"").Append(EscapeJson(p.ProjectMode)).Append("\",");
        sb.Append("\"customer_name\":\"").Append(EscapeJson(p.CustomerName)).Append("\",");
        sb.Append("\"po_number\":\"").Append(EscapeJson(p.PoNumber)).Append("\",");
        sb.Append("\"state\":\"").Append(EscapeJson(p.State)).Append("\",");
        sb.Append("\"pm_id\":\"").Append(EscapeJson(p.PmId)).Append("\",");
        sb.Append("\"pm_name\":\"").Append(EscapeJson(p.PmName)).Append("\",");
        sb.Append("\"manager_name\":\"").Append(EscapeJson(p.ManagerName)).Append("\",");
        sb.Append("\"team_id\":\"").Append(EscapeJson(p.TeamId)).Append("\",");
        sb.Append("\"team_name\":\"").Append(EscapeJson(p.TeamName)).Append("\",");
        sb.Append("\"wbs_id\":\"").Append(EscapeJson(p.WbsId)).Append("\",");
        sb.Append("\"percent_complete\":").Append(FormatNum(p.ActualProgress)).Append(",");
        sb.Append("\"actual_progress\":").Append(FormatNum(p.ActualProgress)).Append(",");
        sb.Append("\"expected_progress\":").Append(FormatNum(p.ExpectedProgress)).Append(",");
        sb.Append("\"progress_gap\":").Append(FormatNum(p.ProgressGap)).Append(",");
        sb.Append("\"health_status\":\"").Append(EscapeJson(p.HealthStatus)).Append("\",");
        sb.Append("\"rag_status\":\"").Append(EscapeJson(p.RagStatus)).Append("\",");
        sb.Append("\"bcs_status_label\":\"").Append(EscapeJson(p.BcsStatusLabel)).Append("\",");
        sb.Append("\"bcs_status_color\":\"").Append(EscapeJson(p.BcsStatusColor)).Append("\",");
        sb.Append("\"compl_category\":\"").Append(EscapeJson(p.ComplCategory)).Append("\",");
        sb.Append("\"delay_days\":").Append(p.DelayDays).Append(",");
        sb.Append("\"pending_days\":").Append(p.PendingDays).Append(",");
        sb.Append("\"spi\":").Append(FormatNum(p.Spi)).Append(",");
        sb.Append("\"cpi\":").Append(FormatNum(p.Cpi)).Append(",");
        sb.Append("\"planned_value\":").Append(FormatNum(p.PlannedValue)).Append(",");
        sb.Append("\"earned_value\":").Append(FormatNum(p.EarnedValue)).Append(",");
        sb.Append("\"actual_cost\":").Append(FormatNum(p.ActualCost)).Append(",");
        sb.Append("\"cn_sv\":").Append(FormatNum(p.ScheduleVariance)).Append(",");
        sb.Append("\"cn_cv\":").Append(FormatNum(p.CostVariance)).Append(",");
        sb.Append("\"exp_mandays\":").Append(FormatNum(p.ExpMandays)).Append(",");
        sb.Append("\"rollup_work_est\":").Append(FormatNum(p.RollupWorkEst)).Append(",");
        sb.Append("\"remainder_hours\":").Append(FormatNum(p.RemainderHours)).Append(",");
        sb.Append("\"budget_exec_rate\":").Append(FormatNum(p.BudgetExecRate)).Append(",");
        sb.Append("\"total_tasks\":").Append(p.TotalTasks).Append(",");
        sb.Append("\"completed_tasks\":").Append(p.CompletedTasks).Append(",");
        sb.Append("\"in_progress_tasks\":").Append(p.InProgressTasks).Append(",");
        sb.Append("\"not_started_tasks\":").Append(p.NotStartedTasks).Append(",");
        sb.Append("\"overdue_tasks\":").Append(p.OverdueTasks).Append(",");
        sb.Append("\"critical_task_count\":").Append(p.CriticalTaskCount).Append(",");
        sb.Append("\"critical_overdue_count\":").Append(p.CriticalOverdueCount).Append(",");
        sb.Append("\"milestone_count\":").Append(p.MilestoneCount).Append(",");
        sb.Append("\"milestone_completed_count\":").Append(p.MilestoneCompletedCount).Append(",");
        sb.Append("\"sched_start\":\"").Append(EscapeJson(p.SchedStart)).Append("\",");
        sb.Append("\"sched_due\":\"").Append(EscapeJson(p.SchedDue)).Append("\",");
        sb.Append("\"init_plan_start\":\"").Append(EscapeJson(p.InitPlanStart)).Append("\",");
        sb.Append("\"init_plan_finish\":\"").Append(EscapeJson(p.InitPlanFinish)).Append("\",");
        sb.Append("\"act_start\":\"").Append(EscapeJson(p.ActStart)).Append("\",");
        sb.Append("\"act_finish\":\"").Append(EscapeJson(p.ActFinish)).Append("\",");
        sb.Append("\"phases\":[");
        for (int i = 0; i < p.Phases.Count; i++)
        {
            if (i > 0) sb.Append(",");
            PhaseIndicatorDto ph = p.Phases[i];
            sb.Append("{");
            sb.Append("\"phase_no\":").Append(ph.PhaseNumber).Append(",");
            sb.Append("\"label\":\"").Append(EscapeJson(ph.PhaseLabel)).Append("\",");
            sb.Append("\"percent_compl\":").Append(ph.PercentCompl).Append(",");
            sb.Append("\"raw_color\":\"").Append(EscapeJson(ph.RawStatusColor)).Append("\",");
            sb.Append("\"light\":\"").Append(EscapeJson(ph.NormalizedLight)).Append("\",");
            sb.Append("\"hex_color\":\"").Append(EscapeJson(ph.DisplayHexColor)).Append("\"");
            sb.Append("}");
        }
        sb.Append("]");
        sb.Append("}");
        return sb.ToString();
    }

    private static string SerializeWbsStageNode(WbsStageAnalyticsDto w, bool includeChildren)
    {
        System.Text.StringBuilder sb = new System.Text.StringBuilder();
        sb.Append("{");
        sb.Append("\"wbs_id\":\"").Append(EscapeJson(w.WbsId)).Append("\",");
        sb.Append("\"parent_wbs_id\":\"").Append(EscapeJson(w.ParentWbsId)).Append("\",");
        sb.Append("\"wbs_code\":\"").Append(EscapeJson(w.WbsCode)).Append("\",");
        sb.Append("\"wbs_name\":\"").Append(EscapeJson(w.StageName)).Append("\",");
        sb.Append("\"classification\":\"").Append(EscapeJson(w.Classification)).Append("\",");
        sb.Append("\"level\":").Append(w.Level).Append(",");
        sb.Append("\"completion\":").Append(FormatNum(w.ActualCompletion)).Append(",");
        sb.Append("\"expected_completion\":").Append(FormatNum(w.ExpectedCompletion)).Append(",");
        sb.Append("\"completion_variance\":").Append(FormatNum(w.CompletionVariance)).Append(",");
        sb.Append("\"schedule_variance_days\":").Append(w.ScheduleVarianceDays).Append(",");
        sb.Append("\"sched_start\":\"").Append(EscapeJson(w.SchedStart)).Append("\",");
        sb.Append("\"sched_due\":\"").Append(EscapeJson(w.SchedDue)).Append("\",");
        sb.Append("\"act_start\":\"").Append(EscapeJson(w.ActStart)).Append("\",");
        sb.Append("\"ev\":").Append(FormatNum(w.Ev)).Append(",");
        sb.Append("\"pv\":").Append(FormatNum(w.Pv)).Append(",");
        sb.Append("\"ac\":").Append(FormatNum(w.Ac)).Append(",");
        sb.Append("\"spi\":").Append(FormatNum(w.Spi)).Append(",");
        sb.Append("\"cpi\":").Append(FormatNum(w.Cpi)).Append(",");
        sb.Append("\"sv\":").Append(FormatNum(w.Sv)).Append(",");
        sb.Append("\"cv\":").Append(FormatNum(w.Cv)).Append(",");
        sb.Append("\"rollup_status\":\"").Append(EscapeJson(w.RollupStatus)).Append("\",");
        sb.Append("\"rag_status\":\"").Append(EscapeJson(w.RagStatus)).Append("\",");
        sb.Append("\"health_light\":\"").Append(EscapeJson(w.HealthLight)).Append("\",");
        sb.Append("\"total_tasks\":").Append(w.TotalTasks).Append(",");
        sb.Append("\"completed_tasks\":").Append(w.CompletedTasks).Append(",");
        sb.Append("\"in_progress_tasks\":").Append(w.InProgressTasks).Append(",");
        sb.Append("\"not_started_tasks\":").Append(w.NotStartedTasks).Append(",");
        sb.Append("\"overdue_tasks\":").Append(w.OverdueTasks);

        if (includeChildren)
        {
            sb.Append(",\"children\":[");
            for (int i = 0; i < w.Children.Count; i++)
            {
                if (i > 0) sb.Append(",");
                sb.Append(SerializeWbsStageNode(w.Children[i], true));
            }
            sb.Append("]");
        }
        sb.Append("}");
        return sb.ToString();
    }

    private static string SerializeAssignee(AssigneeWorkloadDto a)
    {
        System.Text.StringBuilder sb = new System.Text.StringBuilder();
        sb.Append("{");
        sb.Append("\"assignee_id\":\"").Append(EscapeJson(a.AssigneeId)).Append("\",");
        sb.Append("\"assignee_name\":\"").Append(EscapeJson(a.AssigneeName)).Append("\",");
        sb.Append("\"total_tasks\":").Append(a.TotalTasks).Append(",");
        sb.Append("\"completed_tasks\":").Append(a.CompletedTasks).Append(",");
        sb.Append("\"in_progress_tasks\":").Append(a.InProgressTasks).Append(",");
        sb.Append("\"not_started_tasks\":").Append(a.NotStartedTasks).Append(",");
        sb.Append("\"overdue_tasks\":").Append(a.OverdueTasks).Append(",");
        sb.Append("\"critical_tasks\":").Append(a.CriticalTasks).Append(",");
        sb.Append("\"completion_rate\":").Append(FormatNum(a.CompletionRate)).Append(",");
        sb.Append("\"overdue_rate\":").Append(FormatNum(a.OverdueRate)).Append(",");
        sb.Append("\"total_est_hours\":").Append(FormatNum(a.TotalEstHours)).Append(",");
        sb.Append("\"total_actual_hours\":").Append(FormatNum(a.TotalActualHours)).Append(",");
        sb.Append("\"remaining_est_hours\":").Append(FormatNum(a.RemainingEstHours)).Append(",");
        sb.Append("\"load_level\":\"").Append(EscapeJson(a.LoadLevel)).Append("\",");
        sb.Append("\"project_count\":").Append(a.ProjectCount);
        sb.Append("}");
        return sb.ToString();
    }

    private static string EscapeJson(string s)
    {
        if (string.IsNullOrEmpty(s)) return "";
        return s.Replace("\\", "\\\\")
                .Replace("\"", "\\\"")
                .Replace("\r", "\\r")
                .Replace("\n", "\\n")
                .Replace("\t", "\\t");
    }

    private static string FormatNum(double val)
    {
        if (double.IsNaN(val) || double.IsInfinity(val)) return "0";
        return val.ToString(System.Globalization.CultureInfo.InvariantCulture);
    }
}

// 重新開啟類別與函式供 Aras Method Wrapper 結尾之雙大括號 "} }" 閉合
public class MethodFooterPlaceholder
{
    public void NoOp()
    {
