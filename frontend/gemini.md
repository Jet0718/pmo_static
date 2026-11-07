# 前端領域開發規範 (`frontend/gemini.md`)

## 1. 領域職責
負責在 Aras Innovator 12 SP9 的 TOC View (Table of Contents) 中呈現「PMO 專案進度狀態分析統計儀表板 (Dashboard)」，並對齊 `C:\TEST\pmomonthly` 的視覺化風格與資料結構，提供：
1. **全域多專案總覽 (`/api/v1/dashboard/summary` & `/api/v1/dashboard/team-summary`)**：
   - **首頁極速概覽**：載入時先呼叫 `/api/v1/dashboard/team-summary`，快速展示「執行團隊 (team_id) Active 專案數量長條統計圖」與首頁摘要，避免大數據造成白屏卡頓。
   - **統計圖色塊互動展開**：長條圖色塊具備點擊互動，使用者點擊特定團隊色塊（如 TPS, ICS, PMO, SUS, SHS, Other）時，漸進向下展開該團隊詳細分析與多專案明細列表。
   - **多維度篩選器規格**：
     - 專案狀態 (`state`)：預設為 `Active`。
     - 專案類型 (`cn_project_type`)：支援複選 (OR 比對)，預設選中 `1.Standard` 與 `2.Professional`。
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
