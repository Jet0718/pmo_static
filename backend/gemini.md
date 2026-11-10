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

## 5. Activity2 任務指派人、里程碑扣除與 WBS 排序規範
- **指派人取得 (`Activity2.managed_by_id` 優先)**：`GetActivitiesWithAssignments` 中，首要讀取 `managed_by_id`（及其 `keyed_name` 屬性或 `Identity` 反查）作為 `AssigneeId` / `AssigneeName`；僅當 `managed_by_id` 為空時，才參考 `Activity2 Assignment` 或回退至 `owned_by_id`，嚴禁覆蓋已存在之 `managed_by_id`。
- **扣除里程碑任務 (`is_milestone == '1'`)**：`WorkloadAggregator.AggregateByAssignee` 統計成員負荷時，必須將 `act.IsMilestone == true` 的里程碑任務扣除忽略不計。
- **PM 績效排序**：`BuildGroupPerformanceJson` 依專案數量 (`project_count`) 降冪排序。
- **WBS 階段排序**：`AnalyzeMainStages` 回傳之主階段清單必須依據 `StageName` 進行自然升冪排序。
