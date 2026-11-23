# 後端領域開發規範 (`backend/gemini.md`)

## 1. 領域職責
負責 Aras Innovator 12 SP9 伺服器端資料檢索、Project 客製化欄位 (`cn_*`, `bcs_*`, `percent_compl_1~12`, `status_1~12`) 提取、WBS 階層遞迴統計、健康度燈號判定與成員工作負荷彙整。
同時參考 `C:\TEST\pmomonthly` 之 RESTful API 路由結構，以 Aras Server Method (`PMO_ProjectAnalytics_API`) 實作統一 Controller，支援前端透過 `aras.applyMethod` 或 OData RESTful Endpoint (`POST /server/odata/method.PMO_ProjectAnalytics_API`) 呼叫。

## 2. Project 客製化欄位整合規則
根據 BDM 系統 `Project` ItemType 定義，後端必須提取並運用以下客製化欄位：
1. **基礎與分類資訊**：
   - `project_number` (integer, 專案編號)、`name` (名稱)、`state` (狀態：`Active`, `closed`, `pending`)
   - `cn_project_type` (類型：`1.Standard`, `2.Professional` 等)、`classification` (專案類別)
   - `territory` (服務中心)、`cn_pj_mode` (專案模式)、`cn_customer` (客戶)、`bcs_po_no` (訂單編號)
   - `owned_by_id` (專案經理 PM)、`managed_by_id` (專案主管)、`team_id` (執行團隊)、`wbs_id` (Root WBS Element)
2. **階段進度與狀態色塊 (`Ph 1 ~ Ph 12`)**：
   - `percent_compl_1` ~ `percent_compl_12` (integer, 各階段完成百分比)
   - `status_1` ~ `status_12` (color list, 各階段狀態色碼，如綠/黃/紅)
3. **進度與完成率指標**：
   - `rollup_percent_compl` / `bcs_rollup_percent_compl` / `cn_wbs_compl` (整體實際完成率 %)
   - `cn_plan_compl` (計劃進度 %, 可直接作為應有進度基準 Expected Progress，若無則依排程起訖日動態計算)
   - `bcs_project_status` (Status Color)、`bcs_project_status_label` (Status Label)、`bcs_project_compl_cate` (進度區間)
4. **時程與延遲天數指標**：
   - `date_start_sched` / `date_due_sched` (排程開始/完成日期)
   - `date_start_target` / `date_due_target` (目標起始/完成日期)
   - `date_start_act` / `date_due_act` (實際開始/完成日期)
   - `cn_init_plan_start` (原訂計畫啟始日)、`cn_init_plan_finish` (原訂上線驗收日)、`cn_initial_comp` (原訂系統驗收日)、`cn_closed_date` (結案日)
   - `cn_delay_days` (Delay Days 延遲天數)、`cn_pending_days` (Pending Days 暫停天數)
5. **EVM 實獲值與工時指標**：
   - `cn_pv` (PV計畫值)、`cn_ev` (EV實獲值)、`cn_ac` / `bcs_total_work_time` / `bcs_total_workingtime_record` (AC實報總工時)
   - `cn_sv` (SV時程變異)、`cn_cv` (CV成本變異)、`cn_spi` (SPI 進度績效)、`cn_cpi` (CPI 成本績效)
   - `cn_exp_mandays` (原始規劃人天)、`cn_wbs_rolwrkest` (規劃預計工時)、`cn_remainder` (剩餘工時)、`cn_bug_imp_rate` (預算執行率)

## 3. WBS Element 與 Activity2 關聯注意事項 (吸取 `pmomonthly` 實戰經驗)
- `WBS Element` 本身**無** `parent_wbs_id` 實體欄位，必須透過 `Sub WBS` Relationship (`source_id` -> `related_id`) 建立父子階層。
- `WBS Element` 與 `Activity2` 透過 `WBS Activity2` Relationship (`source_id` -> `related_id`) 連結，或透過 `Activity2.proj_num == Project.project_number` 批次檢索。
- 任務成員負荷統計同時支援 `Activity2 Assignment` (`related_id` Identity) 與 `Activity2.owned_by_id` (負責人) / `managed_by_id`。

## 4. Aras C# Server Method 嚴格規範
1. **Method Wrapper 規範**：禁止在頂層撰寫 `using` 或 `namespace`，所有 .NET 型別帶完整命名空間（如 `System.Collections.Generic.List<T>`）。
2. **全路徑回傳保證**：所有分支（含 `catch`）必須回傳 `Item`。
3. **防注入安全轉義**：所有外部輸入組裝 AML/SQL 前必須執行 `Replace("'", "''")`。
4. **S.O.L.I.D 設計與中文註解**：各職責拆分為獨立服務類別並加上完整繁體中文函式與變數註解。

## 5. 極速統計與過濾優化規範 (Performance & Filter Rules)
1. **首頁極速端點 (`/api/v1/dashboard/team-summary`)**：
   - 首頁載入專用，僅透過 AML 檢索 `Project` ItemType 基礎欄位，嚴禁載入 WBS 與任務。
   - **篩選條件動態聯動**：完整套用 `state` (若為 ALL 則統計全部狀態)、`project_type`、`territory`、`keyword`，非寫死為 Active。
2. **團隊真實代碼識別 (Keyed Name 解析)**：
   - 在 Aras 中 `Project.team_id` 儲存為 32 碼 GUID，真實團隊代碼存於 `item.getPropertyAttribute("team_id", "keyed_name")`。
   - 後端必須以 `NormalizeTeamCode` 優先比對 `TeamName`（若無則回退 `TeamId`），正確歸納至 `TPS`、`ICS`、`PMO`、`SUS`、`SHS`，其餘團隊方歸入 `Other`。
3. **專案類型 9 項複選 (OR) 支援**：
   - 完整支援 9 大專案類型：`1.Standard`, `2.Professional`, `3.Upgrade`, `4.Customize`, `5.Product`, `6.Technical`, `7.Marketing`, `8.EmployeeTraining`, `F.Misc`。
   - 傳遞多值以逗號分隔，組裝 AML 時轉譯為 `<cn_project_type condition="in">'1.Standard','2.Professional'</cn_project_type>`。

## 4. 執行團隊 (team_id) 解析與命名規範
- 執行團隊名稱必須純淨採用代碼：`TPS`、`ICS`、`PMO`、`SUS`、`SHS`、`Other`，不得自作主張附加「XX團隊」、「XX處」等中文字串。
- Aras IOM 查詢 Project 時，若 `getPropertyAttribute("team_id", "keyed_name")` 未回傳或回傳空，後端必須透過 Team 快取字典（包含預載之 BDM Team GUID 映射表與 `Team` ItemType 查詢）反查真實團隊代碼，避免所有專案誤入 Other。
- `NormalizeTeamCode(teamName, teamId)` 必須兼容雙參數無序傳入，同時比對兩者與 GUID 字典。

## 5. Activity2 任務指派人、里程碑扣除、工時回報聚合與 WBS 排序規範
- **指派人取得 (`Activity2.managed_by_id` 優先)**：`GetActivitiesWithAssignments` 中，首要讀取 `managed_by_id`（及其 `keyed_name` 屬性或 `Identity` 反查）作為 `AssigneeId` / `AssigneeName`；僅當 `managed_by_id` 為空時，才參考 `Activity2 Assignment` 或回退至 `owned_by_id`，嚴禁覆蓋已存在之 `managed_by_id`。
- **任務實報工時提取**：`Activity2.actual_work` 於 BDM 常為空值，實際滾算工時存於 `Activity2.rollup_actual_work`，因此讀取 `ActualWork` 時必須優先取 `rollup_actual_work`（若 `> 0`），否則才取 `actual_work`。
- **工作任務狀態皆不計里程碑任務 (`is_milestone == '1'`)**：
  - `ProjectHealthCalculator.ComputeProjectSummary` 統計專案工作任務狀態（`TotalTasks`、`CompletedTasks`、`InProgressTasks`、`NotStartedTasks`、`OverdueTasks`、`CriticalTaskCount`、`CriticalOverdueCount`）時，必須將 `act.IsMilestone == true` 的里程碑任務扣除忽略不計；里程碑任務僅單獨記錄於 `MilestoneCount` 與 `MilestoneCompletedCount`。
  - WBS 樹狀階段統計 `RollupStageMetricsRecursive` 與成員負荷統計 `WorkloadAggregator.AggregateByAssignee` 亦同步扣除里程碑任務。
- **專案延遲天數以工作日計算（比照 `cn_Project_ScheduleUpdated` 規則）且只記錄最大值（非累加）**：
  - 延遲天數嚴格以「工作日 (Working Days)」計算，而非日曆天。
  - 後端實作 `IBusinessCalendarService` / `ArasBusinessCalendarService`，比照 Aras 原生 Method `cn_Project_ScheduleUpdated` 執行 `SELECT ((DATEDIFF(DAY,'{0}','{1}')) - (SELECT count(*) FROM [innovator].[BUSINESS_CALENDAR] where (day_date>='{0}' and day_date<='{1}') and DAY_NUMBER<0))` 排除休假日與週末，並支援快取加速。
  - 專案 `DelayDays` 取該專案所有未完成非里程碑工作任務中工作日最大延遲天數，扣除暫停天數 (`cn_pending_days`)：$\max(\max_{act}(\text{WorkdaysDelay}) - \text{PendingDays}, 0)$。
  - 以 BDM-CRM 系統之 `[2357] 芯北PLM系统项目` 為驗證基準，任務結束日 `2026/9/9` 到今日 `2026/11/23` 精確計算為 49 天。若無逾期任務則為 0 天。
- **扣除里程碑任務 (`is_milestone == '1'`)**：`WorkloadAggregator.AggregateByAssignee` 統計成員負荷時，必須將 `act.IsMilestone == true` 的里程碑任務扣除忽略不計。
- **專案成員工時回報統計 (`workingtime_record` 與母表 `WorkingTime` 工時卡)**：
  - 針對當前篩選條件下之專案 ID 集合 (`project IN (...)`)，查詢 `workingtime_record` ItemType（提取 `project`、`source_id`、`cn_act2`、`work_hour`、`work_date`、`owned_by_id`、`created_by_id`）。
  - **回報人員識別順序**：優先取 `workingtime_record.owned_by_id`（Identity）；若為空，則由母表 `WorkingTime` (`source_id`) 反查 `owned_by_id` / `owner_name`；若仍為空才取 `created_by_id`（並支援 `Identity` 與 `User` 雙表反查 `keyed_name` 顯示姓名）。
  - 依回報成員聚合計算每位成員在當前篩選專案下的「工時回報總值 (`ReportedWorkHours`)」、「換算總工天 (`ReportedWorkDays = ReportedWorkHours / 8.0`)」以及「各專案工時回報明細清單 (`ProjectWorkTimeBreakdownDto`)」。
  - **防重複與回退原則**：若某專案已有 `workingtime_record` 紀錄（例如 `[2364]` 共 10 筆合計 49 hr：羅仁 45 hr、張智堯 4 hr），該專案下所有成員之工時回報嚴格以 `workingtime_record` 實際回報為準（未回報工時之指派成員如周樹榮於該專案之回報工時為 0 hr，不會誤把其他人回報在該任務上的 `rollup_actual_work` 冠給未報工的任務指派人）；僅當某專案完全無 `workingtime_record` 明細時，才回退採用 `Activity2.rollup_actual_work` / `actual_work`。
- **PM 績效排序**：`BuildGroupPerformanceJson` 依專案數量 (`project_count`) 降冪排序。
- **WBS 階段排序**：`AnalyzeMainStages` 回傳之主階段清單必須依據 `StageName` 進行自然升冪排序。

## 6. 當前登入使用者預讀與執行團隊權限控管 (`UserContextDto`)
- **預讀欄位**：後端透過 `this._inn.getUserID()` 查詢 `User` ItemType 的 `id,login_name,keyed_name,team_id,value_score`（並解析 `team_id/@keyed_name` 或透過 `NormalizeTeamCode` 反查團隊代碼）。
- **受管執行團隊自動帶入**：若 `user.team_id.keyed_name` 為 `TPS`、`SUS`、`SHS` 或 `ICS` 四大執行團隊之一：
  - 預設查詢自動將 `TeamId` 設定為該使用者所屬之執行團隊。
- **跨團隊查詢限制 (`value_score` 判斷)**：
  - 若該使用者屬於 `TPS`、`SUS`、`SHS` 或 `ICS`，且其 `user.value_score` **不等於 `V9` 且不等於 `V10`**（忽略大小寫）：
    - 設定 `IsTeamRestricted = true`，後端在所有查詢端點 (`team-summary`、`summary`、`assignees` 等) 強制覆寫 `query.TeamId = userContext.TeamCode`，嚴格禁止查詢其他執行團隊資料。
  - 若 `user.value_score` 為 `V9` 或 `V10`（或使用者不屬於 `TPS/SUS/SHS/ICS`，如 `PMO`），則 `IsTeamRestricted = false`，允許透過自然語言篩選或點擊長條圖查詢全部或其他執行團隊。
- **使用者上下文端點與回傳**：提供 `GET /api/v1/dashboard/user-context`（並在 `team-summary` 與 `summary` 一併附帶 `user_context` JSON 節點），讓前端可即時呈現當前使用者身份、所屬團隊、職等 (`value_score`) 與權限鎖定狀態。
