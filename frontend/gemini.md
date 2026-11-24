# 前端領域開發規範 (`frontend/gemini.md`)

## 1. 領域職責
負責在 Aras Innovator 12 SP9 的 TOC View (Table of Contents) 中呈現「PMO 專案進度狀態分析統計儀表板 (Dashboard)」，並對齊 `C:\TEST\pmomonthly` 的視覺化風格與資料結構，提供：
1. **自然語言輸入的 NoUI 智慧篩選區塊 (`NaturalLanguageQueryParser`)**：
   - 移除傳統多欄位下拉選單，全面改為**單一自然語言輸入框 (NoUI Search Bar)** 搭配**常用條件提示標籤 (Prompt Chips)** 與**當前生效條件膠囊 (Active Filter Pills)**。
   - **預設篩選條件**：保留 `project_type = 1.Standard, 2.Professional` 且 `state = Active` 不變。
   - **自然語言解析規則**：可自動從使用者輸入的自然語言句子中識別專案狀態（進行中/已結案/暫停/全部狀態）、9 大專案類型（Standard/Professional/Upgrade/Customize/Product/Technical/Marketing/Training/Misc 或全部類型）、執行團隊（TPS/ICS/PMO/SUS/SHS/Other）、服務中心（台北/新竹/台中/台南）、健康度燈號（綠燈/黃燈/紅燈）以及專案編號/名稱/客戶/PM 關鍵字。
2. **當前使用者 (`user.team_id.keyed_name` 與 `user.value_score`) 預讀與執行團隊權限限制**：
   - 啟動時自動預讀當前登入使用者資訊 (`user_context`)。
   - 若 `user.team_id.keyed_name` 為 `TPS`、`SUS`、`SHS` 或 `ICS`，預設篩選條件自動帶入該執行團隊 (`team_id`)。
   - 若該使用者屬於上述四個執行團隊，且 `user.value_score` 不等於 `V9` 且不等於 `V10`，則前端與後端同步**限制查詢其他執行團隊**（鎖定團隊條件、在 UI 顯示權限鎖定提示徽章，且點擊其他團隊提示或長條圖時阻擋跨團隊切換）。
3. **全域多專案總覽與左側 Aras Item Icon 開啟專案畫面 (`/api/v1/dashboard/summary` & `/api/v1/dashboard/team-summary`)**：
   - 首頁載入時先呼叫 `/api/v1/dashboard/team-summary`，動態展示「各執行團隊專案數量長條統計圖」，點擊受權限允許之團隊色塊可向下展開詳細分析與多專案明細列表。
   - **專案清單左側 Item Icon**：在專案清單第一欄專案編號的**左側增加一個 Item Icon 按鈕 (`.js-open-aras-item`)**，點擊時呼叫 `top.aras.uiShowItem("Project", projectId)` 直接於 Aras Innovator 系統中開啟該專案 Item 畫面；點擊右側專案編號文字則維持下鑽至第 2 頁籤（階段達成率與成員分析）。
4. **單一專案下鑽分析 (`/api/v1/dashboard/project/{proj_num}` & `/api/v1/dashboard/wbs/{proj_num}`)**:
   - **Ph 1 ~ Ph 12 階段進度與色碼狀態橫向時間軸**。
   - **WBS 各階段 (Stage / Milestone) 進度達成率與時程偏差分析圖表**（依名稱自然升冪排序）。
5. **專案成員任務負荷統計與工時回報統計 (`/api/v1/dashboard/assignees`)**:
   - **專案成員工時回報統計**：針對當前篩選條件下，統計各成員回報任務的工時統計總值 (`reported_work_hours` / `reported_work_days`) 與視覺化排行圖表。
   - **成員任務負荷統計表整合工時回報下鑽連結**：在專案成員任務負荷統計表中增加「使用者工時回報總值」欄位並附上超連結 (`.js-drill-member-worktime`)，點擊後開啟防裁切浮層 Modal，深入檢視該員在當前篩選條件下**各專案的工時回報總工時 (`hr`) 與總工天 (`工時 / 8`) 明細表**（並支援點擊專案左側 Item Icon 開啟 Aras 專案畫面）。當使用者在「階段達成率與成員分析 (`PROJECT_DETAIL`)」頁籤點擊成員工時時，優先從當前專案 `projectDetailData.assignees` 取用該專案之工時明細；在「成員任務負荷與工時回報 (`ASSIGNEES`)」頁籤點擊時，則從 `assigneeWorkloadData.assignees` 取用跨專案工時明細。

## 2. Aras Client / JavaScript 嚴格規範
1. **零隱式型別與 Linter 防護**：
   - 所有 JS 函式參數必須具備明確預設值（如 `function renderPhases(phases = [])`）。
   - 禁止在純 JS 中撰寫 TypeScript `: Type` 語法或 JSDoc `{Type}`，統一採用繁體中文行註解。
   - 禁止宣告未使用的區域變數。
2. **UI 防護（吸取 `pmomonthly` 實戰修正經驗）**：
   - **色碼防呆**：針對 `status_1~12`、`bcs_project_status` 或 `rollup_status`，若值為 Hex 色碼（如 `#FFD800`、`#FF0000`、`#00FF00`）則自動渲染為對應顏色圓點/標籤，避免將色碼當成純文字顯示。
   - **HTML 實體防重覆轉義**：針對含有 `&amp;`、`&lt;`、`&gt;` 的專案名稱與文字（例如 `強茂FMEA&amp;專案模組導入`），`escapeHtml` 必須先執行實體解碼再轉義，防止頁面出現 `&amp;` 殘留。
   - **數值防呆**：針對完成率、SPI、CPI 執行 `isFinite` 與 `NaN` 防護，避免出現 `NaN%` 或 `[object Object]`。
   - **浮層防裁切**：Modal 與 Tooltip 統一掛載於 `document.body`，設定 `position: fixed; z-index: 999999`。

## 4. 執行團隊 (team_id) 下拉選單與圖表文字規範
- `#filter-team` 篩選下拉選單與長條圖標籤一律使用純淨代碼：`TPS`、`ICS`、`PMO`、`SUS`、`SHS`、`Other`，嚴禁附加「XX團隊」等冗餘中文。
- 團隊長條圖各長條色塊標籤、提示文字及右側統計徽章，均依據當前篩選條件動態聯動計算。

## 5. WBS 階段自然排序、PM 績效對比與成員負荷展示
- **PM 績效統計對比**：多專案總覽之「各執行團隊 (Team) 與專案經理 (PM) 績效對比」卡片必須渲染 `data.pm_performance`（按 `pm_name` 分組），依不同專案經理作績效統計。
- **WBS 階段自然排序**：`renderProjectDetailView` 與 `renderWbsStageDeviationChart` 必須對 `wbs_items` 依名稱進行自然升冪排序（如 `10 啟動階段` &rarr; `20 需求分析`）。
- **成員負荷扣除里程碑並呈現所有指派成員**：單一專案成員負荷與全域成員負荷圖表均正確渲染 `Activity2.managed_by_id` 統計之所有指派成員，且扣除 `is_milestone == '1'` 里程碑任務。
- **工作任務狀態不計里程碑與延遲天數以工作日計算只記錄最大天數**：多專案總覽列表最後一欄「工作任務狀態與延遲天數」之「完成 X / 總數 Y」與「逾期: Z 項」皆不計 `is_milestone` 任務；「延遲: W 天」以企業日曆工作日計算（比照 `cn_Project_ScheduleUpdated` 扣除週末與休假日），僅呈現該專案所有工作任務中延遲迄今最多的工作日天數扣除暫停天數（非累加）。

## 6. 停滯阻礙標籤、雙軌健康度分流視覺化與 NoUI 查詢擴充規範 (`Stall Attribution & NoUI Expansion`)
1. **自然語言 NoUI 關鍵字擴充 (`parseNaturalLanguageQuery`)**：
   - 識別「**真落後**」、「**內部落後**」&rarr; 設定 `health_status = RED` 且 `filter_blocked = exclude_external`（排除外部受阻，只看團隊內部問題）。
   - 識別「**等待客戶**」、「**等客戶系統**」&rarr; 設定 `stall_reason = wait_cust_system`。
   - 識別「**商務爭議**」、「**合約爭議**」&rarr; 設定 `stall_reason = commercial_dispute`。
   - 識別「**外部受阻**」、「**外部卡關**」&rarr; 設定 `filter_blocked = only_external`。
   - 識別「**實質完工**」、「**待驗收**」&rarr; 設定 `is_substantially_completed = true`。
   - 識別「**排除外部**」、「**排除受阻**」&rarr; 設定 `filter_blocked = exclude_external`。
2. **頂層 KPI 統計分流卡片**：
   - 保留全域健康度總覽，並新增兩個高價值指標：
     - **外部受阻專案 (Externally Blocked)**：顯示因等待客戶系統、商務爭議等受阻專案數與其佔比（紫色/橙色徽章）。
     - **實質完工待收尾 (Substantial Complete $\ge 85\%$)**：顯示已完成大部分工作、等待最終交付驗收之專案數。
   - 提供快捷按鈕/提示標籤，可一鍵切換「淨化團隊戰況（排除外部受阻）」或「查看外部受阻池」。
3. **專案列表與明細之阻礙徽章 (Badge)**：
   - 在專案清單之專案名稱旁渲染標籤膠囊：
     - `[等客戶系統]` (紫色標籤 `.badge-wait-system`)
     - `[商務爭議]` (橙色標籤 `.badge-dispute`)
     - `[實質完工 92%]` (藍色標籤 `.badge-substantial`)
   - 延遲天數欄位滑鼠懸停顯示 Tooltip：「工作日延遲 X 天（已校正扣除停滯 Y 天）」。
