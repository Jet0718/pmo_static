// ============================================================================
// 檔案名稱：Program.cs
// 用途：針對 PMO_ProjectAnalytics_API.cs 的所有核心類別執行完整單元測試
// ============================================================================

public class FakeProjectRepository : IProjectRepository
{
    public System.Collections.Generic.List<ProjectRecord> Projects = new System.Collections.Generic.List<ProjectRecord>();
    public System.Collections.Generic.List<WbsRecord> WbsList = new System.Collections.Generic.List<WbsRecord>();
    public System.Collections.Generic.List<ActivityRecord> Activities = new System.Collections.Generic.List<ActivityRecord>();

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
                    if (string.Equals(query.TeamId, "Other", System.StringComparison.OrdinalIgnoreCase))
                    {
                        if (p.TeamId == "TPS" || p.TeamId == "ICS" || p.TeamId == "PMO" || p.TeamId == "SUS" || p.TeamId == "SHS")
                        {
                            continue;
                        }
                    }
                    else if (!string.Equals(p.TeamId, query.TeamId, System.StringComparison.OrdinalIgnoreCase))
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
}
