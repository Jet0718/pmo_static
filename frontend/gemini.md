# 前端領域開發規範 (`frontend/gemini.md`)

## 1. 領域職責
負責在 Aras Innovator 12 SP9 的 TOC View (Table of Contents) 中呈現「PMO 專案進度狀態分析統計儀表板 (Dashboard)」，並對齊 `C:\TEST\pmomonthly` 的視覺化風格與資料結構，提供：
1. **全域多專案總覽 (`/api/v1/dashboard/summary` & `/api/v1/dashboard/team-summary`)**：
   - **首頁極速概覽與篩選聯動**：載入時先呼叫 `/api/v1/dashboard/team-summary`，動態展示「各執行團隊專案數量長條統計圖」，長條圖統計結果即時聯動篩選條件（非寫死為 Active），標題與計數徽章動態依目前狀態更新。
   - **統計圖色塊互動展開**：長條圖色塊具備點擊互動，使用者點擊特定團隊色塊（如 TPS, ICS, PMO, SUS, SHS, Other）時，漸進向下展開該團隊詳細分析與多專案明細列表。
   - **多維度篩選器規格**：
     - 專案狀態 (`state`)：預設為 `Active`，支援 `ALL`、`closed`、`pending`。
     - 專案類型 (`cn_project_type`)：採用下拉複選元件提供 9 大類型 (`1.Standard`, `2.Professional`, `3.Upgrade`, `4.Customize`, `5.Product`, `6.Technical`, `7.Marketing`, `8.EmployeeTraining`, `F.Misc`)，預設選中 `1.Standard` 與 `2.Professional`。
     - 執行團隊 (`team_id`)：選單更新為 `ALL`、`TPS`、`ICS`、`PMO`、`SUS`、`SHS`、`Other`。
   - **多專案進度明細列表**：取消獨立「下鑽操作」欄位，將該欄之「階段與成員分析」下鑽連結直接整併至第一欄「專案編號」，點擊專案編號即可切換至該專案下鑽視圖。
2. **單一專案下鑽分析 (`/api/v1/dashboard/project/{proj_num}` & `/api/v1/dashboard/wbs/{proj_num}`)**:
   - **Ph 1 ~ Ph 12 階段進度與色碼狀態橫向時間軸**（直接呈現 `Project` 上的 `percent_compl_1~12` 與 `status_1~12`）。
   - **WBS 各階段 (Stage / Milestone) 進度達成率與時程偏差分析圖表**（排程起訖日、實際完成率、應有進度、SV 時程變異與偏差天數）。
3. **專案成員任務負荷分析 (`/api/v1/dashboard/assignees`)**:
   - 呈現專案內（或跨專案）每位成員 (`Assignee` / `owned_by_id`) 的任務負荷堆疊橫條圖與明細表（總任務數、已完成、進行中、未開始、已逾期、預估工時 `work_est`、實際工時 `actual_work`、個人完成率 %）。

## 2. Aras Client / JavaScript 嚴格規範
1. **零隱式型別與 Linter 防護**：
   - 所有 JS 函式參數必須具備明確預設值（如 `function renderPhases(phases = [])`）。
   - 禁止在純 JS 中撰寫 TypeScript `: Type` 語法或 JSDoc `{Type}`，統一採用繁體中文行註解。
   - 禁止宣告未使用的區域變數。
2. **UI 防護（吸取 `pmomonthly` 實戰修正經驗）**：
   - **色碼防呆**：針對 `status_1~12`、`bcs_project_status` 或 `rollup_status`，若值為 Hex 色碼（如 `#FFD800`、`#FF0000`、`#00FF00`）則自動渲染為對應顏色圓點/標籤，避免將色碼當成純文字顯示。
   - **數值防呆**：針對完成率、SPI、CPI 執行 `isFinite` 與 `NaN` 防護，避免出現 `NaN%` 或 `[object Object]`。
   - **浮層防裁切**：Modal 與 Tooltip 統一掛載於 `document.body`，設定 `position: fixed; z-index: 999999`。

## 4. 執行團隊 (team_id) 下拉選單與圖表文字規範
- `#filter-team` 篩選下拉選單與長條圖標籤一律使用純淨代碼：`TPS`、`ICS`、`PMO`、`SUS`、`SHS`、`Other`，嚴禁附加「XX團隊」等冗餘中文。
- 團隊長條圖各長條色塊標籤、提示文字及右側統計徽章，均依據當前篩選條件動態聯動計算。

## 5. WBS 階段自然排序、PM 績效對比與成員負荷展示
- **PM 績效統計對比**：多專案總覽之「各執行團隊 (Team) 與專案經理 (PM) 績效對比」卡片必須渲染 `data.pm_performance`（按 `pm_name` 分組），依不同專案經理作績效統計。
- **WBS 階段自然排序**：`renderProjectDetailView` 與 `renderWbsStageDeviationChart` 必須對 `wbs_items` 依名稱進行自然升冪排序（如 `10 啟動階段` &rarr; `20 需求分析`）。
- **成員負荷扣除里程碑並呈現所有指派成員**：單一專案成員負荷與全域成員負荷圖表均正確渲染 `Activity2.managed_by_id` 統計之所有指派成員，且扣除 `is_milestone == '1'` 里程碑任務。
