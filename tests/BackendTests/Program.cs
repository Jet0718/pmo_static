// ============================================================================
// 檔案名稱：Program.cs
// 用途：針對 PMO_ProjectAnalytics_API.cs 的所有核心類別執行完整單元測試
// ============================================================================

public class FakeProjectRepository : IProjectRepository
{
    public UserContextDto CurrentUser = new UserContextDto();
    public System.Collections.Generic.List<ProjectRecord> Projects = new System.Collections.Generic.List<ProjectRecord>();
    public System.Collections.Generic.List<WbsRecord> WbsList = new System.Collections.Generic.List<WbsRecord>();
    public System.Collections.Generic.List<ActivityRecord> Activities = new System.Collections.Generic.List<ActivityRecord>();
    public System.Collections.Generic.List<WorkTimeRecordEntry> WorkTimeRecords = new System.Collections.Generic.List<WorkTimeRecordEntry>();

    public UserContextDto GetCurrentUserContext()
    {
        return this.CurrentUser ?? new UserContextDto();
    }

    public System.Collections.Generic.List<WorkTimeRecordEntry> GetWorkTimeRecords(
        System.Collections.Generic.List<ProjectRecord> projects
    )
    {
        System.Collections.Generic.List<WorkTimeRecordEntry> res = new System.Collections.Generic.List<WorkTimeRecordEntry>();
        if (projects == null || projects.Count == 0) return res;
        System.Collections.Generic.HashSet<int> pNums = new System.Collections.Generic.HashSet<int>();
        System.Collections.Generic.HashSet<string> pIds = new System.Collections.Generic.HashSet<string>(System.StringComparer.OrdinalIgnoreCase);
        for (int i = 0; i < projects.Count; i++)
        {
            if (projects[i].ProjNum > 0) pNums.Add(projects[i].ProjNum);
            if (!string.IsNullOrEmpty(projects[i].Id)) pIds.Add(projects[i].Id);
        }
        for (int i = 0; i < this.WorkTimeRecords.Count; i++)
        {
            WorkTimeRecordEntry w = this.WorkTimeRecords[i];
            if ((w.ProjNum > 0 && pNums.Contains(w.ProjNum)) || (!string.IsNullOrEmpty(w.ProjectId) && pIds.Contains(w.ProjectId)))
            {
                res.Add(w);
            }
        }
        return res;
    }

    public System.Collections.Generic.List<ProjectRecord> GetProjects(AnalyticsQueryDto query)
    {
        System.Collections.Generic.List<ProjectRecord> filtered = new System.Collections.Generic.List<ProjectRecord>();
        for (int i = 0; i < this.Projects.Count; i++)
        {
            ProjectRecord p = this.Projects[i];
            if (query != null)
            {
                if (!string.IsNullOrEmpty(query.StateFilter) &&
                    !string.Equals(query.StateFilter, "ALL", System.StringComparison.OrdinalIgnoreCase) &&
                    !string.Equals(p.State, query.StateFilter, System.StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }
                if (!string.IsNullOrEmpty(query.ProjectTypeFilter) &&
                    !string.Equals(query.ProjectTypeFilter, "ALL", System.StringComparison.OrdinalIgnoreCase))
                {
                    string[] types = query.ProjectTypeFilter.Split(new char[] { ',' }, System.StringSplitOptions.RemoveEmptyEntries);
                    bool matchType = false;
                    for (int t = 0; t < types.Length; t++)
                    {
                        if (string.Equals(p.ProjectType, types[t].Trim(), System.StringComparison.OrdinalIgnoreCase))
                        {
                            matchType = true;
                            break;
                        }
                    }
                    if (!matchType) continue;
                }
                if (!string.IsNullOrEmpty(query.TeamId) &&
                    !string.Equals(query.TeamId, "ALL", System.StringComparison.OrdinalIgnoreCase))
                {
                    string normTeam = ArasProjectRepository.NormalizeTeamCode(p.TeamName, p.TeamId);
                    if (!string.Equals(normTeam, query.TeamId, System.StringComparison.OrdinalIgnoreCase))
                    {
                        continue;
                    }
                }
                if (!string.IsNullOrEmpty(query.PmId) &&
                    !string.Equals(query.PmId, "ALL", System.StringComparison.OrdinalIgnoreCase) &&
                    p.PmId != query.PmId)
                {
                    continue;
                }
            }
            filtered.Add(p);
        }
        return filtered;
    }

    public ProjectRecord GetProjectByNumber(int projNum)
    {
        for (int i = 0; i < this.Projects.Count; i++)
        {
            if (this.Projects[i].ProjNum == projNum) return this.Projects[i];
        }
        return null;
    }

    public System.Collections.Generic.List<WbsRecord> GetWbsHierarchy(
        System.Collections.Generic.List<int> projNums,
        System.Collections.Generic.List<string> rootWbsIds
    )
    {
        System.Collections.Generic.List<WbsRecord> res = new System.Collections.Generic.List<WbsRecord>();
        for (int i = 0; i < this.WbsList.Count; i++)
        {
            if (projNums.Contains(this.WbsList[i].ProjNum))
            {
                res.Add(this.WbsList[i]);
            }
        }
        return res;
    }

    public System.Collections.Generic.List<ActivityRecord> GetActivitiesWithAssignments(
        System.Collections.Generic.List<int> projNums
    )
    {
        System.Collections.Generic.List<ActivityRecord> res = new System.Collections.Generic.List<ActivityRecord>();
        for (int i = 0; i < this.Activities.Count; i++)
        {
            if (projNums.Contains(this.Activities[i].ProjNum))
            {
                res.Add(this.Activities[i]);
            }
        }
        return res;
    }
}

public class Program
{
    private static int _passed = 0;
    private static int _failed = 0;

    private static void AssertTrue(bool condition, string testName)
    {
        if (condition)
        {
            _passed++;
            System.Console.WriteLine("[PASS] " + testName);
        }
        else
        {
            _failed++;
            System.Console.WriteLine("[FAIL] " + testName);
        }
    }

    public static int Main(string[] args)
    {
        System.Console.WriteLine("=== 開始執行 PMO_ProjectAnalytics_API 後端單元測試 ===");

        TestHealthLightRules();
        TestPhase1To12ColorNormalization();
        TestWbsStageHierarchyAndVariance();
        TestAssigneeWorkloadAggregation();
        TestRestfulControllerRoutesAndSqlSanitization();
        TestUserTeamValueScorePolicyAndWorkTimeReporting();

        System.Console.WriteLine("======================================================");
        System.Console.WriteLine("測試總結: 通過 " + _passed + " 項, 失敗 " + _failed + " 項");
        return _failed == 0 ? 0 : 1;
    }

    /// <summary>
    /// 測試 1：驗證紅黃綠燈判定邏輯與完成率、應有進度計算
    /// </summary>
    private static void TestHealthLightRules()
    {
        ProjectHealthCalculator calc = new ProjectHealthCalculator();
        System.DateTime today = new System.DateTime(2026, 11, 4);

        // 綠燈測試：無逾期、進度落差 < 10%、SPI >= 0.95
        string lightGreen = calc.DetermineHealthLight(10, 0, 0, 0, 4.5, 1.02, 0);
        AssertTrue(lightGreen == "GREEN", "綠燈判定：無逾期且落差 4.5%、SPI 1.02 應為 GREEN");

        // 黃燈測試：有 1 筆一般逾期 (1/10 = 10% <= 20%)
        string lightYellow1 = calc.DetermineHealthLight(10, 1, 0, 0, 5.0, 0.98, 2);
        AssertTrue(lightYellow1 == "YELLOW", "黃燈判定：一般任務逾期佔比 10% 應為 YELLOW");

        // 黃燈測試：無逾期但進度落差 15% (介於 10%~20%)
        string lightYellow2 = calc.DetermineHealthLight(10, 0, 0, 0, 15.0, 0.96, 0);
        AssertTrue(lightYellow2 == "YELLOW", "黃燈判定：進度落差 15% 應為 YELLOW");

        // 紅燈測試：有要徑/里程碑逾期 (criticalOverdueCount > 0)
        string lightRed1 = calc.DetermineHealthLight(10, 1, 1, 0, 5.0, 0.96, 1);
        AssertTrue(lightRed1 == "RED", "紅燈判定：存在要徑或里程碑逾期應為 RED");

        // 紅燈測試：逾期任務佔比 > 20% (3/10 = 30%)
        string lightRed2 = calc.DetermineHealthLight(10, 3, 0, 0, 8.0, 0.92, 3);
        AssertTrue(lightRed2 == "RED", "紅燈判定：逾期任務佔比 30% (>20%) 應為 RED");

        // 紅燈測試：SPI < 0.80
        string lightRed3 = calc.DetermineHealthLight(10, 0, 0, 0, 5.0, 0.75, 0);
        AssertTrue(lightRed3 == "RED", "紅燈判定：SPI=0.75 (<0.80) 應為 RED");

        // 完整專案物件計算測試
        ProjectRecord proj = new ProjectRecord
        {
            Id = "PRJ001",
            ProjNum = 2127,
            Name = "BDM 智慧製造升級專案",
            State = "Active",
            ProjectType = "1.Standard",
            Territory = "台北服務中心",
            PmId = "PM01",
            PmName = "陳建宏",
            TeamId = "TM01",
            TeamName = "PLM 顧問一部",
            RollupPercentCompl = 68.0,
            PlanCompl = 82.0,
            DelayDays = 5,
            Spi = 0.88,
            Cpi = 1.15,
            PlannedValue = 1200,
            EarnedValue = 1056,
            ActualCost = 918
        };
        proj.PhasePercentCompl[0] = 100;
        proj.PhaseStatusColor[0] = "#67C23A";
        proj.PhasePercentCompl[1] = 70;
        proj.PhaseStatusColor[1] = "#FFD800";

        System.Collections.Generic.List<ActivityRecord> acts = new System.Collections.Generic.List<ActivityRecord>
        {
            new ActivityRecord { Id = "A1", ProjNum = 2127, Name = "需求規格確認", State = "Complete", PercentCompl = 100, WorkEst = 40 },
            new ActivityRecord { Id = "A2", ProjNum = 2127, Name = "架構設計", State = "Complete", PercentCompl = 100, WorkEst = 40 },
            new ActivityRecord { Id = "A3", ProjNum = 2127, Name = "資料庫設計", State = "Complete", PercentCompl = 100, WorkEst = 40 },
            new ActivityRecord { Id = "A4", ProjNum = 2127, Name = "前端開發", State = "Active", PercentCompl = 60, SchedDue = today.AddDays(10), WorkEst = 40 },
            new ActivityRecord { Id = "A5", ProjNum = 2127, Name = "系統開發", State = "Active", PercentCompl = 50, SchedDue = today.AddDays(-3), WorkEst = 80 }
        };

        ProjectSummaryDto summary = calc.ComputeProjectSummary(proj, null, acts, today);
        AssertTrue(summary.ActualProgress == 68.0 && summary.ExpectedProgress == 82.0 && summary.ProgressGap == 14.0,
            "專案進度計算：Actual=68%, Expected=82%, Gap=14%");
        AssertTrue(summary.HealthStatus == "YELLOW" && summary.RagStatus == "Amber",
            "專案健康度綜合判定：Gap=14% 且 SPI=0.88、1筆一般逾期應為 YELLOW (Amber)");

        // 測試 1-B：驗證「各專案任務狀態中的計劃皆不計 is_milestone 任務，延遲天數只記錄該專案任務中延遲迄今最多的任務天數而不是累加」
        System.Collections.Generic.List<ActivityRecord> actsWithMilestoneAndMultipleDelays = new System.Collections.Generic.List<ActivityRecord>
        {
            new ActivityRecord { Id = "T1", ProjNum = 2127, Name = "工作任務1 (已完成)", State = "Complete", PercentCompl = 100, WorkEst = 20, IsMilestone = false },
            new ActivityRecord { Id = "T2", ProjNum = 2127, Name = "工作任務2 (已完成)", State = "Complete", PercentCompl = 100, WorkEst = 20, IsMilestone = false },
            new ActivityRecord { Id = "T3", ProjNum = 2127, Name = "工作任務3 (進行中逾期 5 天)", State = "Active", PercentCompl = 40, SchedDue = today.AddDays(-5), WorkEst = 30, IsMilestone = false },
            new ActivityRecord { Id = "T4", ProjNum = 2127, Name = "工作任務4 (未開始逾期 12 天)", State = "Active", PercentCompl = 0, SchedDue = today.AddDays(-12), WorkEst = 40, IsMilestone = false },
            new ActivityRecord { Id = "T5", ProjNum = 2127, Name = "工作任務5 (未到期進行中)", State = "Active", PercentCompl = 50, SchedDue = today.AddDays(15), WorkEst = 30, IsMilestone = false },
            // 里程碑任務：即使已逾期或完成，皆不應計入工作任務狀態 (Total/Completed/Overdue)
            new ActivityRecord { Id = "M1", ProjNum = 2127, Name = "里程碑節點1 (已完成)", State = "Complete", PercentCompl = 100, WorkEst = 0, IsMilestone = true },
            new ActivityRecord { Id = "M2", ProjNum = 2127, Name = "里程碑節點2 (逾期 20 天)", State = "Active", PercentCompl = 0, SchedDue = today.AddDays(-20), WorkEst = 0, IsMilestone = true }
        };

        ProjectRecord projWithOldDelay = new ProjectRecord
        {
            Id = "PRJ002",
            ProjNum = 2127,
            Name = "延遲天數與里程碑測試專案",
            State = "Active",
            DelayDays = 999 // 模擬資料庫舊的累加值 999 天
        };

        ProjectSummaryDto summaryNew = calc.ComputeProjectSummary(projWithOldDelay, null, actsWithMilestoneAndMultipleDelays, today);

        // 驗證 1：工作任務狀態總數與完成數皆扣除里程碑任務 (總數=5, 完成=2, 逾期=2，不計 M1 與 M2)
        AssertTrue(summaryNew.TotalTasks == 5, "工作任務狀態：總數應扣除 is_milestone 任務 (5 項非里程碑任務)");
        AssertTrue(summaryNew.CompletedTasks == 2, "工作任務狀態：完成數應扣除 is_milestone 任務 (2 項完成)");
        AssertTrue(summaryNew.OverdueTasks == 2, "工作任務狀態：逾期數應扣除 is_milestone 任務 (2 項逾期，不計 M2)");
        AssertTrue(summaryNew.MilestoneCount == 2 && summaryNew.MilestoneCompletedCount == 1,
            "里程碑統計：單獨正確記錄里程碑總數 (2) 與完成數 (1)");

        // 驗證 2：延遲天數只記錄延遲最多的任務天數 (以工作日計算)，而非累加值，亦非資料庫舊值 999 天
        AssertTrue(summaryNew.DelayDays == 8, "專案延遲天數：以工作日計算應為逾期任務最大延遲工作天數 (8 工作天，扣除週末)，而非累加值或舊欄位 (999)");

        // 測試 1-C：驗證「延遲天數請以工作日為計算,而不是算日曆天, 以BDM-CRM系統的 [2357] 芯北PLM系统项目為驗證對象, 其延遲任務有一項, 其計劃結束日為2026/9/9 , 迄今延遲應該是49天, 而不是75天, 計算的方式應該如同method: cn_Project_ScheduleUpdated 的作法相同」
        System.DateTime baseDate2357 = new System.DateTime(2026, 11, 23); // 2026/11/23
        System.DateTime schedDue2357 = new System.DateTime(2026, 9, 9);   // 2026/9/9

        // 模擬 BDM-CRM [innovator].[BUSINESS_CALENDAR] 中 2026/09/09 至 2026/11/23 期間 DAY_NUMBER < 0 的 26 天休假日 (含週末與中秋國慶連假)
        System.Collections.Generic.List<string> bdmHolidays = new System.Collections.Generic.List<string>
        {
            "2026-09-12", "2026-09-13", "2026-09-19", "2026-09-20", "2026-09-25", "2026-09-26", "2026-09-27",
            "2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04", "2026-10-05", "2026-10-10", "2026-10-11",
            "2026-10-17", "2026-10-18", "2026-10-24", "2026-10-25", "2026-10-31", "2026-11-01", "2026-11-07",
            "2026-11-08", "2026-11-14", "2026-11-15", "2026-11-21", "2026-11-22"
        };
        IBusinessCalendarService calendarService2357 = new ArasBusinessCalendarService(bdmHolidays);
        ProjectHealthCalculator calcWithCalendar = new ProjectHealthCalculator(calendarService2357);

        ProjectRecord proj2357 = new ProjectRecord
        {
            Id = "PRJ_2357",
            ProjNum = 2357,
            Name = "芯北PLM系统项目",
            State = "Active",
            PendingDays = 0
        };

        System.Collections.Generic.List<ActivityRecord> acts2357 = new System.Collections.Generic.List<ActivityRecord>
        {
            new ActivityRecord
            {
                Id = "ACT_5030",
                ProjNum = 2357,
                Name = "5030 上線技轉培訓",
                State = "Active",
                PercentCompl = 0,
                SchedDue = schedDue2357,
                IsMilestone = false
            },
            new ActivityRecord
            {
                Id = "ACT_6010",
                ProjNum = 2357,
                Name = "6010 系統維運",
                State = "Active",
                PercentCompl = 0,
                SchedDue = new System.DateTime(2026, 11, 24),
                IsMilestone = false
            }
        };

        ProjectSummaryDto summary2357 = calcWithCalendar.ComputeProjectSummary(proj2357, null, acts2357, baseDate2357);

        // 驗證延遲天數以工作日計算為 49 天 (日曆天 75 天 - 休假日 26 天 = 49 工作天)
        AssertTrue(summary2357.DelayDays == 49,
            "專案 [2357] 芯北PLM系统项目 延遲天數：依照 cn_Project_ScheduleUpdated 商業日曆工作日計算，迄今延遲精確為 49 天 (而非日曆天 75 天)");
    }

    /// <summary>
    /// 測試 2：驗證 Ph 1 ~ Ph 12 色碼轉譯防呆 (防止 #FFD800 等色碼被當成亂碼文字)
    /// </summary>
    private static void TestPhase1To12ColorNormalization()
    {
        ProjectHealthCalculator calc = new ProjectHealthCalculator();

        PhaseIndicatorDto pGreen = calc.NormalizePhaseIndicator(1, 100, "#00FF00");
        AssertTrue(pGreen.NormalizedLight == "GREEN" && pGreen.DisplayHexColor == "#10B981",
            "Ph 1 色碼轉譯：#00FF00 轉譯為 GREEN (#10B981)");

        PhaseIndicatorDto pYellow = calc.NormalizePhaseIndicator(2, 65, "#FFD800");
        AssertTrue(pYellow.NormalizedLight == "YELLOW" && pYellow.DisplayHexColor == "#F59E0B",
            "Ph 2 色碼轉譯：#FFD800 轉譯為 YELLOW (#F59E0B)");

        PhaseIndicatorDto pRed = calc.NormalizePhaseIndicator(3, 30, "#FF0000");
        AssertTrue(pRed.NormalizedLight == "RED" && pRed.DisplayHexColor == "#EF4444",
            "Ph 3 色碼轉譯：#FF0000 轉譯為 RED (#EF4444)");

        PhaseIndicatorDto pGray = calc.NormalizePhaseIndicator(4, 0, "");
        AssertTrue(pGray.NormalizedLight == "GRAY" && pGray.DisplayHexColor == "#94A3B8",
            "Ph 4 未啟動轉譯：0% 且無色碼轉譯為 GRAY (#94A3B8)");
    }

    /// <summary>
    /// 測試 3：驗證 WBS 樹狀結構與階段時程偏差天數計算
    /// </summary>
    private static void TestWbsStageHierarchyAndVariance()
    {
        ProjectHealthCalculator healthCalc = new ProjectHealthCalculator();
        WbsStageAnalyzer analyzer = new WbsStageAnalyzer(healthCalc);
        System.DateTime today = new System.DateTime(2026, 11, 4);

        System.Collections.Generic.List<WbsRecord> wbsList = new System.Collections.Generic.List<WbsRecord>
        {
            new WbsRecord
            {
                Id = "WBS_ROOT", ProjNum = 2127, WbsIndex = "0", Name = "Root WBS", IsTop = true,
                RollupPercentCompl = 60, SchedStart = today.AddDays(-30), SchedDue = today.AddDays(30)
            },
            new WbsRecord
            {
                Id = "WBS_PH1", ProjNum = 2127, ParentWbsId = "WBS_ROOT", WbsIndex = "1", Name = "Phase 1: 需求與設計",
                Classification = "Phase", RollupPercentCompl = 100, SchedStart = today.AddDays(-30), SchedDue = today.AddDays(-10),
                EarnedValue = 400, PlannedValue = 400, ActualWork = 380, Spi = 1.0, Cpi = 1.05
            },
            new WbsRecord
            {
                Id = "WBS_PH2", ProjNum = 2127, ParentWbsId = "WBS_ROOT", WbsIndex = "2", Name = "Phase 2: 核心模組開發",
                Classification = "Phase", RollupPercentCompl = 45, SchedStart = today.AddDays(-20), SchedDue = today.AddDays(-5),
                EarnedValue = 360, PlannedValue = 500, ActualWork = 450, Spi = 0.72, Cpi = 0.80
            }
        };

        System.Collections.Generic.List<ActivityRecord> acts = new System.Collections.Generic.List<ActivityRecord>
        {
            new ActivityRecord { Id = "ACT1", ProjNum = 2127, ParentWbsId = "WBS_PH1", Name = "訪談", State = "Complete", PercentCompl = 100 },
            new ActivityRecord { Id = "ACT2", ProjNum = 2127, ParentWbsId = "WBS_PH2", Name = "後端API", State = "Active", PercentCompl = 45, SchedDue = today.AddDays(-5), IsCritical = true }
        };

        System.Collections.Generic.List<WbsStageAnalyticsDto> mainStages =
            analyzer.AnalyzeMainStages("WBS_ROOT", wbsList, acts, today);

        AssertTrue(mainStages.Count == 2, "WBS 主階段解析：應提取出 2 個第一階主階段 (Phase 1 & Phase 2)");
        AssertTrue(mainStages[0].ScheduleVarianceDays == 0 && mainStages[0].HealthLight == "GREEN",
            "WBS Phase 1 分析：100% 完成且無延遲，偏差天數=0，燈號=GREEN");
        AssertTrue(mainStages[1].ScheduleVarianceDays == 5 && mainStages[1].HealthLight == "RED",
            "WBS Phase 2 分析：未完成且預計完成日已過 5 天，時程偏差天數=5 天，燈號=RED");
    }

    /// <summary>
    /// 測試 4：驗證專案成員 (Assignee) 任務負荷與完成狀態彙總
    /// </summary>
    private static void TestAssigneeWorkloadAggregation()
    {
        WorkloadAggregator aggregator = new WorkloadAggregator();
        System.DateTime today = new System.DateTime(2026, 11, 4);

        System.Collections.Generic.List<ActivityRecord> acts = new System.Collections.Generic.List<ActivityRecord>
        {
            new ActivityRecord { Id = "T1", ProjNum = 2127, AssigneeId = "U1", AssigneeName = "張工程師", State = "Complete", PercentCompl = 100, WorkEst = 24, ActualWork = 22 },
            new ActivityRecord { Id = "T2", ProjNum = 2127, AssigneeId = "U1", AssigneeName = "張工程師", State = "Active", PercentCompl = 50, SchedDue = today.AddDays(-2), IsCritical = true, WorkEst = 40, ActualWork = 25 },
            new ActivityRecord { Id = "T3", ProjNum = 2127, AssigneeId = "U1", AssigneeName = "張工程師", State = "Pending", PercentCompl = 0, SchedDue = today.AddDays(10), WorkEst = 16, ActualWork = 0 },
            new ActivityRecord { Id = "T4", ProjNum = 2128, AssigneeId = "U2", AssigneeName = "林設計師", State = "Complete", PercentCompl = 100, WorkEst = 16, ActualWork = 15 }
        };

        System.Collections.Generic.List<AssigneeWorkloadDto> list = aggregator.AggregateByAssignee(acts, today);
        AssertTrue(list.Count == 2, "成員負荷統計：應彙總出 2 位不重複成員");

        AssigneeWorkloadDto u1 = list[0]; // 張工程師有逾期任務排第一
        AssertTrue(u1.AssigneeName == "張工程師" && u1.TotalTasks == 3 && u1.CompletedTasks == 1 && u1.InProgressTasks == 1 && u1.NotStartedTasks == 1 && u1.OverdueTasks == 1,
            "成員任務狀態計數：張工程師 總數=3, 完成=1, 進行中=1, 未開始=1, 逾期=1");
        AssertTrue(u1.TotalEstHours == 80.0 && u1.TotalActualHours == 47.0 && u1.RemainingEstHours == 36.0 && u1.LoadLevel == "HIGH",
            "成員工時與負荷等級：預估=80h, 實報=47h, 剩餘=36h, 負荷等級=HIGH");
    }

    /// <summary>
    /// 測試 5：驗證 RESTful Controller 所有路由與防注入安全轉義
    /// </summary>
    private static void TestRestfulControllerRoutesAndSqlSanitization()
    {
        string dirty = "Active'; DROP TABLE [PROJECT]; --";
        string clean = ArasProjectRepository.SanitizeInput(dirty);
        AssertTrue(!clean.Contains("';") || clean.Contains("''"), "SQL 防注入轉義：單引號必須被轉義為雙單引號");

        FakeProjectRepository repo = new FakeProjectRepository();
        System.DateTime today = new System.DateTime(2026, 11, 4);

        ProjectRecord p1 = new ProjectRecord
        {
            Id = "P1", ProjNum = 2127, Name = "BDM 企業專案 A", State = "Active",
            ProjectType = "1.Standard", Territory = "North", PmId = "PM1", PmName = "王大明",
            TeamId = "TM1", TeamName = "研發一處", WbsId = "W1",
            RollupPercentCompl = 85.0, PlanCompl = 85.0, Spi = 1.0, Cpi = 1.05
        };
        repo.Projects.Add(p1);
        repo.WbsList.Add(new WbsRecord
        {
            Id = "W1", ProjNum = 2127, Name = "Root", IsTop = true, RollupPercentCompl = 85.0
        });
        repo.Activities.Add(new ActivityRecord
        {
            Id = "A1", ProjNum = 2127, ParentWbsId = "W1", Name = "單元測試", State = "Complete", PercentCompl = 100, AssigneeId = "U1", AssigneeName = "李小華", WorkEst = 16
        });

        ProjectHealthCalculator healthCalc = new ProjectHealthCalculator();
        WbsStageAnalyzer stageAnalyzer = new WbsStageAnalyzer(healthCalc);
        WorkloadAggregator workloadAgg = new WorkloadAggregator();
        ProjectAnalyticsController ctrl = new ProjectAnalyticsController(repo, healthCalc, stageAnalyzer, workloadAgg);

        Item reqSum = new Item("Method", "PMO_ProjectAnalytics_API");
        reqSum.setProperty("route", "/api/v1/dashboard/summary");
        reqSum.setProperty("state", "Active");
        string jsonSum = ctrl.HandleItemRequest(reqSum, today);
        AssertTrue(jsonSum.Contains("\"status\":\"success\"") && jsonSum.Contains("\"total_projects\":1") && jsonSum.Contains("BDM 企業專案 A"),
            "RESTful 路由測試：/api/v1/dashboard/summary 回傳正確 JSON");

        Item reqProj = new Item("Method", "PMO_ProjectAnalytics_API");
        reqProj.setProperty("route", "/api/v1/dashboard/project");
        reqProj.setProperty("proj_num", "2127");
        string jsonProj = ctrl.HandleItemRequest(reqProj, today);
        AssertTrue(jsonProj.Contains("\"wbs_items\":") && jsonProj.Contains("\"assignees\":") && jsonProj.Contains("李小華"),
            "RESTful 路由測試：/api/v1/dashboard/project 回傳專案、WBS階段與成員負荷 JSON");

        Item reqAsgn = new Item("Method", "PMO_ProjectAnalytics_API");
        reqAsgn.setProperty("route", "/api/v1/dashboard/assignees");
        string jsonAsgn = ctrl.HandleItemRequest(reqAsgn, today);
        AssertTrue(jsonAsgn.Contains("\"assignees\":") && jsonAsgn.Contains("\"completion_rate\":100"),
            "RESTful 路由測試：/api/v1/dashboard/assignees 回傳成員負荷統計 JSON");

        // 新增：首頁極速執行團隊 Active 專案統計測試 (/api/v1/dashboard/team-summary)
        Item reqTeamSum = new Item("Method", "PMO_ProjectAnalytics_API");
        reqTeamSum.setProperty("route", "/api/v1/dashboard/team-summary");
        reqTeamSum.setProperty("state", "Active");
        string jsonTeamSum = ctrl.HandleItemRequest(reqTeamSum, today);
        AssertTrue(jsonTeamSum.Contains("\"total_active_projects\":1") &&
                   jsonTeamSum.Contains("\"team_id\":\"TPS\"") &&
                   jsonTeamSum.Contains("\"team_id\":\"ICS\"") &&
                   jsonTeamSum.Contains("\"team_id\":\"PMO\"") &&
                   jsonTeamSum.Contains("\"team_id\":\"SUS\"") &&
                   jsonTeamSum.Contains("\"team_id\":\"SHS\"") &&
                   jsonTeamSum.Contains("\"team_id\":\"Other\""),
            "RESTful 路由測試：/api/v1/dashboard/team-summary 回傳六大團隊極速長條統計 JSON");

        // 新增：專案類型 9 大類複選 (OR) 測試
        Item reqMultiType = new Item("Method", "PMO_ProjectAnalytics_API");
        reqMultiType.setProperty("route", "/api/v1/dashboard/team-summary");
        reqMultiType.setProperty("project_type", "1.Standard,2.Professional,3.Upgrade,4.Customize,5.Product,6.Technical,7.Marketing,8.EmployeeTraining,F.Misc");
        string jsonMultiType = ctrl.HandleItemRequest(reqMultiType, today);
        AssertTrue(jsonMultiType.Contains("\"total_active_projects\":1"),
            "專案類型 9 大類複選測試：應成功匹配專案");

        // 新增：NormalizeTeamCode 團隊代碼解析測試
        AssertTrue(ArasProjectRepository.NormalizeTeamCode("32_CHAR_GUID_TPS", "TPS 顧問團隊") == "TPS", "NormalizeTeamCode：keyed_name 包含 TPS 應歸類為 TPS");
        AssertTrue(ArasProjectRepository.NormalizeTeamCode("32_CHAR_GUID_ICS", "ICS 顧問團隊") == "ICS", "NormalizeTeamCode：keyed_name 包含 ICS 應歸類為 ICS");
        AssertTrue(ArasProjectRepository.NormalizeTeamCode("32_CHAR_GUID_PMO", "PMO 專案管理處") == "PMO", "NormalizeTeamCode：keyed_name 包含 PMO 應歸類為 PMO");
        AssertTrue(ArasProjectRepository.NormalizeTeamCode("32_CHAR_GUID_SUS", "SUS 永續服務處") == "SUS", "NormalizeTeamCode：keyed_name 包含 SUS 應歸類為 SUS");
        AssertTrue(ArasProjectRepository.NormalizeTeamCode("32_CHAR_GUID_SHS", "SHS 顧問團隊") == "SHS", "NormalizeTeamCode：keyed_name 包含 SHS 應歸類為 SHS");
        AssertTrue(ArasProjectRepository.NormalizeTeamCode("32_CHAR_GUID_OTHER", "CDS 產品處") == "Other", "NormalizeTeamCode：非五大團隊應歸類為 Other");

        // 新增：動態狀態 (state) 篩選聯動測試
        Item reqAllState = new Item("Method", "PMO_ProjectAnalytics_API");
        reqAllState.setProperty("route", "/api/v1/dashboard/team-summary");
        reqAllState.setProperty("state", "ALL");
        string jsonAllState = ctrl.HandleItemRequest(reqAllState, today);
                AssertTrue(jsonAllState.Contains("\"status\":\"success\"") && jsonAllState.Contains("\"total_projects\":1"),
            "動態狀態篩選測試：state=ALL 應正確統計專案數量");

        // 新增測試：WBS Stage 名稱自然排序升冪驗證 (10 啟動階段 -> 20 需求分析 -> ... -> 60 系統上線)
        AssertTrue(WbsStageAnalyzer.CompareStageNamesNatural("10 啟動階段", "20 需求分析") < 0, "自然排序：10 啟動階段 應排在 20 需求分析 之前");
        AssertTrue(WbsStageAnalyzer.CompareStageNamesNatural("50 上線準備", "40 測試驗證") > 0, "自然排序：50 上線準備 應排在 40 測試驗證 之後");
        AssertTrue(WbsStageAnalyzer.CompareStageNamesNatural("10 啟動階段", "60 系統上線") < 0, "自然排序：10 啟動階段 應排在 60 系統上線 之前");

        // 測試 AnalyzeMainStages 自然排序
        System.Collections.Generic.List<WbsRecord> unorderedWbs = new System.Collections.Generic.List<WbsRecord>
        {
            new WbsRecord { Id = "ROOT", ProjNum = 999, Name = "Root", IsTop = true },
            new WbsRecord { Id = "W50", ProjNum = 999, ParentWbsId = "ROOT", Name = "50 上線準備" },
            new WbsRecord { Id = "W20", ProjNum = 999, ParentWbsId = "ROOT", Name = "20 需求分析" },
            new WbsRecord { Id = "W10", ProjNum = 999, ParentWbsId = "ROOT", Name = "10 啟動階段" },
            new WbsRecord { Id = "W60", ProjNum = 999, ParentWbsId = "ROOT", Name = "60 系統上線" }
        };
        System.Collections.Generic.List<WbsStageAnalyticsDto> sortedStages = stageAnalyzer.AnalyzeMainStages("ROOT", unorderedWbs, new System.Collections.Generic.List<ActivityRecord>(), today);
        AssertTrue(sortedStages.Count == 4 && sortedStages[0].StageName == "10 啟動階段" && sortedStages[1].StageName == "20 需求分析" && sortedStages[3].StageName == "60 系統上線",
            "WBS 主階段排序：輸入亂序時應自動按名稱升冪排列 (10 -> 20 -> 50 -> 60)");

        // 新增測試：Activity2 Assignee 優先取 managed_by_id (任務負責人) 而非 owned_by_id (專案經理)
        FakeProjectRepository fakeRepo = new FakeProjectRepository();
        ActivityRecord actWithBoth = new ActivityRecord
        {
            Id = "ACT_TEST",
            ProjNum = 999,
            Name = "系統架構細設",
            AssigneeId = "USR_DEV_ALLEN",
            AssigneeName = "張國倫 Allen.chang"
        };
        System.Collections.Generic.List<AssigneeWorkloadDto> aggList = workloadAgg.AggregateByAssignee(new System.Collections.Generic.List<ActivityRecord> { actWithBoth }, today);
        AssertTrue(aggList.Count == 1 && aggList[0].AssigneeName == "張國倫 Allen.chang",
            "Assignee 負荷統計：應以任務實際負責人 (managed_by_id) 作為統計對象");

        // 新增測試：模擬 2348 上海栎智科技PLM项目 (5位成員，扣除 Milestone 任務羅仁後應計為 4 位：武軍、袁浩、練馨璐、胡彬)
        System.Collections.Generic.List<ActivityRecord> proj2348Acts = new System.Collections.Generic.List<ActivityRecord>
        {
            new ActivityRecord { Id = "2348_1", ProjNum = 2348, Name = "專案啟動與藍圖", AssigneeId = "U_WU", AssigneeName = "武軍 Jun Wu", IsMilestone = false, State = "Complete", PercentCompl = 100 },
            new ActivityRecord { Id = "2348_2", ProjNum = 2348, Name = "BOM模組導入", AssigneeId = "U_YUAN", AssigneeName = "袁浩", IsMilestone = false, State = "Active", PercentCompl = 60 },
            new ActivityRecord { Id = "2348_3", ProjNum = 2348, Name = "變更流程設定", AssigneeId = "U_LIAN", AssigneeName = "練馨璐", IsMilestone = false, State = "Active", PercentCompl = 50 },
            new ActivityRecord { Id = "2348_4", ProjNum = 2348, Name = "ERP介面開發", AssigneeId = "U_HU", AssigneeName = "胡彬", IsMilestone = false, State = "Active", PercentCompl = 40 },
            new ActivityRecord { Id = "2348_MS", ProjNum = 2348, Name = "階段里程碑審查", AssigneeId = "U_LUO", AssigneeName = "羅仁 Jet", IsMilestone = true, State = "Active", PercentCompl = 0 }
        };
        System.Collections.Generic.List<AssigneeWorkloadDto> agg2348 = workloadAgg.AggregateByAssignee(proj2348Acts, today);
        bool hasLuo = false;
        for (int i = 0; i < agg2348.Count; i++)
        {
            if (agg2348[i].AssigneeName.Contains("羅仁")) hasLuo = true;
        }
        AssertTrue(agg2348.Count == 4 && !hasLuo,
            "專案 2348 成員負荷統計：扣除 Milestone 任務 (羅仁) 忽略不計後，應精確計為 4 位成員 (武軍、袁浩、練馨璐、胡彬)");
    }

    /// <summary>
    /// 測試 6：驗證使用者預讀 (user.team_id.keyed_name 與 user.value_score) 團隊權限控管與專案成員工時回報統計 (總工時/工天/各專案下鑽明細)
    /// </summary>
    private static void TestUserTeamValueScorePolicyAndWorkTimeReporting()
    {
        System.DateTime today = new System.DateTime(2026, 11, 20);

        // 1. 測試 UserContext 規則：TPS 且 V8 -> IsManagedExecTeam=true, DefaultTeamFilter=TPS, IsTeamRestricted=true (限制查詢其他團隊)
        UserContextDto ctxTpsV8 = ArasProjectRepository.BuildUserContextFromFields("U1", "allen.chang", "張國倫 Allen.chang", "604F804DDA84451CA3B6CB54CD905BC9", "TPS", "V8");
        AssertTrue(ctxTpsV8.IsManagedExecTeam && ctxTpsV8.DefaultTeamFilter == "TPS" && ctxTpsV8.IsTeamRestricted,
            "使用者權限預讀 (TPS + V8)：預設團隊為 TPS 且應限制查詢其他執行團隊 (IsTeamRestricted=true)");

        // 2. 測試 UserContext 規則：TPS 且 V9 -> IsManagedExecTeam=true, DefaultTeamFilter=TPS, IsTeamRestricted=false (允許跨團隊)
        UserContextDto ctxTpsV9 = ArasProjectRepository.BuildUserContextFromFields("U2", "tps.lead", "TPS主管", "604F804DDA84451CA3B6CB54CD905BC9", "TPS", "V9");
        AssertTrue(ctxTpsV9.IsManagedExecTeam && ctxTpsV9.DefaultTeamFilter == "TPS" && !ctxTpsV9.IsTeamRestricted,
            "使用者權限預讀 (TPS + V9)：預設團隊為 TPS 但允許查詢其他執行團隊 (IsTeamRestricted=false)");

        // 3. 測試 UserContext 規則：ICS 且 V10 -> IsManagedExecTeam=true, DefaultTeamFilter=ICS, IsTeamRestricted=false
        UserContextDto ctxIcsV10 = ArasProjectRepository.BuildUserContextFromFields("U3", "ics.dir", "ICS總監", "0DE0880740CF41E68518D86891A9B83A", "ICS", "V10");
        AssertTrue(ctxIcsV10.IsManagedExecTeam && ctxIcsV10.DefaultTeamFilter == "ICS" && !ctxIcsV10.IsTeamRestricted,
            "使用者權限預讀 (ICS + V10)：預設團隊為 ICS 但允許查詢其他執行團隊 (IsTeamRestricted=false)");

        // 4. 測試 UserContext 規則：SUS 無職等 (空字串) -> 限制查詢其他執行團隊
        UserContextDto ctxSusNone = ArasProjectRepository.BuildUserContextFromFields("U4", "sus.eng", "SUS工程師", "", "SUS", "");
        AssertTrue(ctxSusNone.IsManagedExecTeam && ctxSusNone.DefaultTeamFilter == "SUS" && ctxSusNone.IsTeamRestricted,
            "使用者權限預讀 (SUS + 無職等)：預設團隊為 SUS 且限制查詢其他執行團隊");

        // 5. 測試 UserContext 規則：PMO 且 V9 -> 非四大受限團隊，DefaultTeamFilter=ALL, IsTeamRestricted=false
        UserContextDto ctxPmoV9 = ArasProjectRepository.BuildUserContextFromFields("U5", "jet.lo", "羅仁 Jet", "CDE4225D27224672B7CDDD497486C5AA", "PMO", "V9");
        AssertTrue(!ctxPmoV9.IsManagedExecTeam && ctxPmoV9.DefaultTeamFilter == "ALL" && !ctxPmoV9.IsTeamRestricted,
            "使用者權限預讀 (PMO + V9)：預設查詢全部團隊 (ALL) 且不限制跨團隊查詢");

        // 6. 測試 Controller 強制鎖定非 V9/V10 成員跨團隊查詢
        FakeProjectRepository repo = new FakeProjectRepository();
        repo.CurrentUser = ctxTpsV8; // TPS + V8 (受限只能看 TPS)
        repo.Projects.Add(new ProjectRecord { Id = "P_TPS", ProjNum = 2127, Name = "TPS專案", State = "Active", ProjectType = "1.Standard", TeamId = "TPS", TeamName = "TPS" });
        repo.Projects.Add(new ProjectRecord { Id = "P_ICS", ProjNum = 2135, Name = "ICS專案", State = "Active", ProjectType = "2.Professional", TeamId = "ICS", TeamName = "ICS" });

        ProjectHealthCalculator healthCalc = new ProjectHealthCalculator();
        WbsStageAnalyzer stageAnalyzer = new WbsStageAnalyzer(healthCalc);
        WorkloadAggregator workloadAgg = new WorkloadAggregator();
        ProjectAnalyticsController ctrl = new ProjectAnalyticsController(repo, healthCalc, stageAnalyzer, workloadAgg);

        // 即使請求傳入 team_id = ICS 或 ALL，後端仍應強制鎖定為 TPS，只回傳 2127
        Item reqTryIcs = new Item("Method", "PMO_ProjectAnalytics_API");
        reqTryIcs.setProperty("route", "/api/v1/dashboard/summary");
        reqTryIcs.setProperty("team_id", "ICS");
        string jsonRestricted = ctrl.HandleItemRequest(reqTryIcs, today);
        AssertTrue(jsonRestricted.Contains("\"effective_team_filter\":\"TPS\"") &&
                   jsonRestricted.Contains("\"total_projects\":1") &&
                   jsonRestricted.Contains("TPS專案") &&
                   !jsonRestricted.Contains("ICS專案"),
            "跨團隊權限攔截驗證：TPS (V8) 使用者即使請求 team_id=ICS，後端仍強制鎖定僅回傳 TPS 專案");

        // 7. 測試專案成員工時回報統計 (workingtime_record 聚合 + 總工時/總工天 + 各專案下鑽明細)
        repo.CurrentUser = ctxPmoV9; // 切換為 PMO V9 檢視全域
        repo.Activities.Add(new ActivityRecord { Id = "A_2127_1", ProjNum = 2127, Name = "架構設計", AssigneeId = "USR_CHANG", AssigneeName = "張家豪 (全端工程師)", State = "Active", PercentCompl = 50, WorkEst = 80, ActualWork = 40 });
        repo.Activities.Add(new ActivityRecord { Id = "A_2135_1", ProjNum = 2135, Name = "介面開發", AssigneeId = "USR_CHANG", AssigneeName = "張家豪 (全端工程師)", State = "Complete", PercentCompl = 100, WorkEst = 60, ActualWork = 56 });

        repo.WorkTimeRecords.Add(new WorkTimeRecordEntry { Id = "WT1", ProjectId = "P_TPS", ProjNum = 2127, ProjectName = "TPS專案", MemberId = "USR_CHANG", MemberName = "張家豪 (全端工程師)", WorkHours = 24.0 });
        repo.WorkTimeRecords.Add(new WorkTimeRecordEntry { Id = "WT2", ProjectId = "P_TPS", ProjNum = 2127, ProjectName = "TPS專案", MemberId = "USR_CHANG", MemberName = "張家豪 (全端工程師)", WorkHours = 16.0 });
        repo.WorkTimeRecords.Add(new WorkTimeRecordEntry { Id = "WT3", ProjectId = "P_ICS", ProjNum = 2135, ProjectName = "ICS專案", MemberId = "USR_CHANG", MemberName = "張家豪 (全端工程師)", WorkHours = 56.0 });

        Item reqAsgnWt = new Item("Method", "PMO_ProjectAnalytics_API");
        reqAsgnWt.setProperty("route", "/api/v1/dashboard/assignees");
        reqAsgnWt.setProperty("state", "Active");
        string jsonAsgnWt = ctrl.HandleItemRequest(reqAsgnWt, today);

        // 張家豪總回報工時 = 24 + 16 + 56 = 96 小時 = 12 工天 (2127: 40hr / 5工天, 2135: 56hr / 7工天)
        AssertTrue(jsonAsgnWt.Contains("\"reported_work_hours\":96") &&
                   jsonAsgnWt.Contains("\"reported_work_days\":12") &&
                   jsonAsgnWt.Contains("\"project_worktime_breakdowns\":[") &&
                   jsonAsgnWt.Contains("\"reported_hours\":56") &&
                   jsonAsgnWt.Contains("\"reported_days\":7") &&
                   jsonAsgnWt.Contains("\"reported_hours\":40") &&
                   jsonAsgnWt.Contains("\"reported_days\":5"),
            "成員工時回報統計驗證：應正確聚合總回報工時 96 hr (12 工天) 與各專案工時/工天明細");

        // 8. 測試 BDM-Test [2364] 復盛應用科技PLM導入 實例 (12 + 17 + 16 + 4 = 49 hr，且避免 workingtime_record 與 Activity2.rollup_actual_work 跨人員重複計數)
        FakeProjectRepository repo2364 = new FakeProjectRepository();
        repo2364.CurrentUser = ctxPmoV9;
        repo2364.Projects.Add(new ProjectRecord
        {
            Id = "374A8813E7EF496EA5B5FC430CF6417F",
            ProjNum = 2364,
            Name = "復盛應用科技PLM導入",
            State = "Active",
            ProjectType = "1.Standard",
            TeamId = "TPS",
            TeamName = "TPS"
        });
        repo2364.Activities.Add(new ActivityRecord { Id = "ACT_1010", ProjNum = 2364, Name = "1010 啟動會議", AssigneeId = "USR_JET", AssigneeName = "羅仁 Jet", State = "Complete", PercentCompl = 100, WorkEst = 14, ActualWork = 12 });
        repo2364.Activities.Add(new ActivityRecord { Id = "ACT_2010", ProjNum = 2364, Name = "2010 需求訪談", AssigneeId = "USR_JET", AssigneeName = "羅仁 Jet", State = "Active", PercentCompl = 20, WorkEst = 80, ActualWork = 17 });
        repo2364.Activities.Add(new ActivityRecord { Id = "ACT_1040", ProjNum = 2364, Name = "1040 需求訪談計劃", AssigneeId = "USR_JET", AssigneeName = "羅仁 Jet", State = "Complete", PercentCompl = 100, WorkEst = 12, ActualWork = 16 });
        repo2364.Activities.Add(new ActivityRecord { Id = "ACT_2050", ProjNum = 2364, Name = "2050 系統設計規劃", AssigneeId = "USR_SCOTT", AssigneeName = "周樹榮 scott.chou", State = "Active", PercentCompl = 0, WorkEst = 32, ActualWork = 4 });
        repo2364.Activities.Add(new ActivityRecord { Id = "ACT_3010", ProjNum = 2364, Name = "3010 系統架構", AssigneeId = "USR_GAVIN", AssigneeName = "張智堯 Gavin.Chang", State = "Active", PercentCompl = 0, WorkEst = 40, ActualWork = 0 });

        repo2364.WorkTimeRecords.Add(new WorkTimeRecordEntry { Id = "W2364_1", ProjectId = "374A8813E7EF496EA5B5FC430CF6417F", ProjNum = 2364, ProjectName = "復盛應用科技PLM導入", MemberId = "USR_JET", MemberName = "羅仁 Jet", WorkHours = 12.0 });
        repo2364.WorkTimeRecords.Add(new WorkTimeRecordEntry { Id = "W2364_2", ProjectId = "374A8813E7EF496EA5B5FC430CF6417F", ProjNum = 2364, ProjectName = "復盛應用科技PLM導入", MemberId = "USR_JET", MemberName = "羅仁 Jet", WorkHours = 17.0 });
        repo2364.WorkTimeRecords.Add(new WorkTimeRecordEntry { Id = "W2364_3", ProjectId = "374A8813E7EF496EA5B5FC430CF6417F", ProjNum = 2364, ProjectName = "復盛應用科技PLM導入", MemberId = "USR_JET", MemberName = "羅仁 Jet", WorkHours = 16.0 });
        repo2364.WorkTimeRecords.Add(new WorkTimeRecordEntry { Id = "W2364_4", ProjectId = "374A8813E7EF496EA5B5FC430CF6417F", ProjNum = 2364, ProjectName = "復盛應用科技PLM導入", MemberId = "USR_GAVIN", MemberName = "張智堯 Gavin.Chang", WorkHours = 4.0 });

        ProjectAnalyticsController ctrl2364 = new ProjectAnalyticsController(repo2364, healthCalc, stageAnalyzer, workloadAgg);
        Item req2364 = new Item("Method", "PMO_ProjectAnalytics_API");
        req2364.setProperty("route", "/api/v1/dashboard/assignees");
        req2364.setProperty("state", "Active");
        string json2364 = ctrl2364.HandleItemRequest(req2364, today);

        AssertTrue(json2364.Contains("\"total_reported_hours\":49") &&
                   json2364.Contains("\"total_reported_days\":6.13") &&
                   json2364.Contains("\"reported_work_hours\":45") &&
                   json2364.Contains("\"reported_work_days\":5.63") &&
                   json2364.Contains("\"reported_work_hours\":4") &&
                   json2364.Contains("\"reported_work_days\":0.5"),
            "專案 2364 工時回報驗證：全案總回報工時應精確為 49 hr (6.13 工天)，羅仁 45 hr (5.63 工天)、張智堯 4 hr (0.5 工天)，且不重複計入周樹榮");

        // 9. 測試停滯阻礙歸因與責任分離判定 (EXTERNAL / COMMERCIAL / INTERNAL)
        ProjectRecord projCustSys = new ProjectRecord
        {
            ProjNum = 9001,
            Name = "客戶周邊系統等待案",
            RollupPercentCompl = 75,
            PlanCompl = 100,
            StallReason = "wait_cust_system",
            DelayDays = 45
        };
        ProjectSummaryDto sumCustSys = healthCalc.ComputeProjectSummary(projCustSys, null, null, today);
        AssertTrue(sumCustSys.StallType == "EXTERNAL", "停滯歸因驗證：wait_cust_system 應歸因為 EXTERNAL");
        AssertTrue(sumCustSys.OperationalHealth == "BLOCKED", "雙軌健康度驗證：外部受阻專案 OperationalHealth 應為 BLOCKED");
        AssertTrue(sumCustSys.AdjustedDelayDays == 0, "校正延遲天數驗證：外部受阻專案 AdjustedDelayDays 應校正為 0 天");
        AssertTrue(sumCustSys.HealthStatus == "RED", "整體健康度驗證：進度落後 20% 原生排程仍為 RED");

        ProjectRecord projCommercial = new ProjectRecord
        {
            ProjNum = 9002,
            Name = "合約追加爭議案",
            RollupPercentCompl = 70,
            PlanCompl = 95,
            StallReason = "commercial_dispute",
            DelayDays = 30
        };
        ProjectSummaryDto sumComm = healthCalc.ComputeProjectSummary(projCommercial, null, null, today);
        AssertTrue(sumComm.StallType == "COMMERCIAL", "停滯歸因驗證：commercial_dispute 應歸因為 COMMERCIAL");
        AssertTrue(sumComm.OperationalHealth == "BLOCKED", "雙軌健康度驗證：商務爭議專案 OperationalHealth 應為 BLOCKED");
        AssertTrue(sumComm.AdjustedDelayDays == 0, "校正延遲天數驗證：商務爭議專案 AdjustedDelayDays 應校正為 0 天");

        ProjectRecord projInternal = new ProjectRecord
        {
            ProjNum = 9003,
            Name = "內部架構卡關案",
            RollupPercentCompl = 60,
            PlanCompl = 90,
            StallReason = "internal_bottleneck",
            DelayDays = 25
        };
        ProjectSummaryDto sumInternal = healthCalc.ComputeProjectSummary(projInternal, null, null, today);
        AssertTrue(sumInternal.StallType == "INTERNAL", "停滯歸因驗證：internal_bottleneck 應歸因為 INTERNAL");
        AssertTrue(sumInternal.OperationalHealth == "RED", "雙軌健康度驗證：內部真落後專案 OperationalHealth 應為 RED (真落後)");
        AssertTrue(sumInternal.AdjustedDelayDays == 25, "校正延遲天數驗證：內部落後專案 AdjustedDelayDays 保持原始延遲天數");

        // 10. 測試實質完工待驗收判定 (完成率 >= 85% 且未完成任務 <= 2 且外部卡關)
        ProjectRecord projSubstantial = new ProjectRecord
        {
            ProjNum = 9004,
            Name = "已完成大部等待驗收上線案",
            RollupPercentCompl = 92,
            PlanCompl = 100,
            StallReason = "wait_cust_system",
            DelayDays = 60
        };
        System.Collections.Generic.List<ActivityRecord> subActs = new System.Collections.Generic.List<ActivityRecord>
        {
            new ActivityRecord { Id = "T1", State = "Complete", PercentCompl = 100 },
            new ActivityRecord { Id = "T2", State = "Complete", PercentCompl = 100 },
            new ActivityRecord { Id = "T3", State = "Complete", PercentCompl = 100 },
            new ActivityRecord { Id = "T4", State = "Complete", PercentCompl = 100 },
            new ActivityRecord { Id = "T5", State = "Active", PercentCompl = 50, SchedDue = today.AddDays(-10) } // 僅剩 1 項
        };
        ProjectSummaryDto sumSub = healthCalc.ComputeProjectSummary(projSubstantial, null, subActs, today);
        AssertTrue(sumSub.IsSubstantiallyCompleted, "實質完工驗證：完成率 92% 且剩餘任務 1 項應判定為 IsSubstantiallyCompleted = true");
        AssertTrue(sumSub.OperationalHealth == "SUBSTANTIAL", "雙軌健康度驗證：實質完工專案 OperationalHealth 應為 SUBSTANTIAL");

        // 11. 測試 /api/v1/dashboard/summary 之 filter_blocked 過濾與 operational_rag 統計
        FakeProjectRepository repoFilter = new FakeProjectRepository();
        repoFilter.CurrentUser = ctxPmoV9;
        repoFilter.Projects.Add(projCustSys); // EXTERNAL 受阻
        repoFilter.Projects.Add(projCommercial); // COMMERCIAL 受阻
        repoFilter.Projects.Add(projInternal); // INTERNAL 真落後
        repoFilter.Projects.Add(new ProjectRecord { ProjNum = 9005, Name = "正常執行中專案", RollupPercentCompl = 95, PlanCompl = 95, State = "Active", ProjectType = "1.Standard" });

        ProjectAnalyticsController ctrlFilter = new ProjectAnalyticsController(repoFilter, healthCalc, stageAnalyzer, workloadAgg);

        // 11.1 全部專案查詢
        Item reqAll = new Item("Method", "PMO_ProjectAnalytics_API");
        reqAll.setProperty("route", "/api/v1/dashboard/summary");
        reqAll.setProperty("state", "ALL");
        reqAll.setProperty("project_type", "ALL");
        string jsonAll = ctrlFilter.HandleItemRequest(reqAll, today);

        AssertTrue(jsonAll.Contains("\"operational_rag\":{") &&
                   jsonAll.Contains("\"blocked_count\":2") &&
                   jsonAll.Contains("\"stall_summary\":{") &&
                   jsonAll.Contains("\"wait_cust_system_count\":1") &&
                   jsonAll.Contains("\"commercial_dispute_count\":1"),
            "全域統計驗證：應正確輸出 operational_rag (blocked_count: 2) 與 stall_summary (wait_cust_system: 1, commercial_dispute: 1)");

        // 11.2 排除外部受阻專案 (filter_blocked = exclude_external，淨化團隊戰況)
        Item reqExcludeExt = new Item("Method", "PMO_ProjectAnalytics_API");
        reqExcludeExt.setProperty("route", "/api/v1/dashboard/summary");
        reqExcludeExt.setProperty("state", "ALL");
        reqExcludeExt.setProperty("project_type", "ALL");
        reqExcludeExt.setProperty("filter_blocked", "exclude_external");
        string jsonExcludeExt = ctrlFilter.HandleItemRequest(reqExcludeExt, today);

        AssertTrue(!jsonExcludeExt.Contains("客戶周邊系統等待案") &&
                   !jsonExcludeExt.Contains("合約追加爭議案") &&
                   jsonExcludeExt.Contains("內部架構卡關案") &&
                   jsonExcludeExt.Contains("正常執行中專案") &&
                   jsonExcludeExt.Contains("\"total_projects\":2"),
            "數據淨化驗證：filter_blocked = exclude_external 應成功剔除非團隊因素受阻專案，僅保留團隊自身專案 (2筆)");
    }
}
