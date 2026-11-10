# BDM 系統專案進度狀態分析統計模組 (`pmo_static`)

本專案為針對公司 BDM 系統 (`https://bco.openplm.com.tw/innovatorbw`，平台版本：**Aras Innovator 12 SP9**，資料庫：`BWCS-CRM`) 所打造的**全域多專案進度狀態分析統計系統**。

系統完整結合貴司 `Project` ItemType 的客製化欄位（`cn_*`、`bcs_*`、`Ph 1 ~ Ph 12` 階段進度與色碼）以及 `C:\TEST\pmomonthly` 的 RESTful API 路由與視覺化設計。

---

## 1. 核心統計與分析功能

1. **全域多專案健康度總覽與極速概覽 (`/api/v1/dashboard/summary` & `/api/v1/dashboard/team-summary`)**
   - **首頁極速加載**：首頁載入時優先呼叫極速輕量端點 `/api/v1/dashboard/team-summary`，僅檢索 Project 主檔並統計「各執行團隊 (`team_id`) 專案數量長條圖」，統計結果完全聯動篩選條件（支援全部狀態、已結案、進行中等），並以 `team_id/@keyed_name` 精準識別團隊代碼，毫秒級極速開屏。
   - **統計圖色塊互動展開**：點擊長條圖中之各團隊色塊（`TPS`、`ICS`、`PMO`、`SUS`、`SHS`、`Other`）時，向下展開該團隊之健康度燈號分佈、EVM 與多專案進度明細列表。
   - **進階多維度過濾**：
     - 專案狀態 (`state`)：預設為 `Active`，支援 `ALL`、`closed`、`pending`。
     - 專案類型 (`cn_project_type`)：支援 9 大完整類型複選 (OR 比對：`1.Standard`, `2.Professional`, `3.Upgrade`, `4.Customize`, `5.Product`, `6.Technical`, `7.Marketing`, `8.EmployeeTraining`, `F.Misc`)，預設選中 `1.Standard` 與 `2.Professional`。
     - 執行團隊 (`team_id`)：選單支援 `ALL`、`TPS`、`ICS`、`PMO`、`SUS`、`SHS`、`Other`。
   - **多專案進度明細列表**：取消獨立之「下鑽操作」欄位，直接將下鑽連結整合至第一欄「專案編號」，點擊專案編號即可切換至該專案之階段達成率與成員負荷分析。
2. **各階段 (`Ph 1~12` & `WBS Element` / `Milestone`) 進度達成率與時程偏差分析 (`/api/v1/dashboard/project/{proj_num}` & `/api/v1/dashboard/wbs/{proj_num}`)**
   - **Ph 1 ~ Ph 12 階段燈號矩陣**：直接讀取並視覺化 `Project` 上的 `percent_compl_1~12` 與 `status_1~12` 顏色狀態（含 Hex 色碼自動轉譯圓點標籤）。
   - **WBS 樹狀階段與時程偏差分析**：透過 `Sub WBS` 與 `WBS Activity2` 遞迴剖析各主階段與里程碑之完成度 (%)、應有進度、時程變異 (`cn_sv`)、**時程偏差天數 (Schedule Variance Days)** 與任務狀態分佈（已完成 / 進行中 / 未開始 / 逾期）。
3. **專案成員 (`Assignee`) 任務負荷與完成狀態統計 (`/api/v1/dashboard/assignees`)**
   - 以 `Activity2.managed_by_id` 為任務指派對象（若為空才回退至 `Activity2 Assignment` 或 `owned_by_id`），並**自動扣除里程碑任務 (`is_milestone == '1'`) 忽略不計**，精準統計每位專案成員之指派工作任務總數、已完成數、進行中數、未開始數、逾期任務數、要徑任務數、預估工時 (`work_est`)、實際工時 (`actual_work`) 與個人完成率 (%)。

---

## 2. 專案目錄結構

```text
c:\TEST\pmo_static\
├── gemini.md                # 專案主領域開發規則
├── spec.md                  # 完整系統規格書 (含 11 項架構、Project 客製欄位映射、RESTful 路由與 Mermaid 圖表)
├── README.md                # 專案說明與詳細安裝部署手冊
├── backend/                 # 後端領域 (Aras C# Server Method 與 S.O.L.I.D 統計核心)
│   ├── gemini.md            # 後端開發規範
│   └── PMO_ProjectAnalytics_API.cs  # Aras Server Method 主程式與領域服務類別
├── frontend/                # 前端領域 (TOC View Dashboard HTML5/CSS3/ES6)
│   ├── gemini.md            # 前端開發規範
│   ├── index.html           # TOC View 儀表板主頁面
│   ├── css/
│   │   └── dashboard.css    # 響應式儀表板樣式表
│   └── js/
│       ├── arasApiClient.js # Aras IOM / OData / Mock 雙模配接器
│       ├── dashboardStore.js# 篩選狀態與快取管理中心
│       ├── svgChartEngine.js# 純 SVG 圖表引擎 (Donut / Bar / Stage Deviation / Workload)
│       └── dashboardApp.js  # 主視圖渲染器與事件控制中心
├── aml/                     # Aras AML 匯入封裝檔 (Import Package)
│   ├── build_aml_package.ps1# 自動打包 AML 腳本
│   ├── imports.mf           # Aras Import 工具入口設定檔
│   └── PMO_Analytics/
│       └── Import/
│           ├── Method/      # 後端 Server Method AML
│           │   └── PMO_ProjectAnalytics_API.xml
│           └── ItemType/    # TOC View 掛載 ItemType AML
│               └── PMO_Progress_Analytics.xml
└── tests/                   # 單元測試套件
    ├── frontend.test.js     # 前端 Node.js 單元測試
    └── BackendTests/        # 後端 C# .NET 單元測試與 Aras Wrapper 模擬器
```

---

## 3. 詳細安裝與部署手冊 (Aras Innovator 12 SP9)

本系統採用 **Aras 原生內嵌架構**，無須額外架設外部應用程式伺服器或額外資料庫，僅需將「前端靜態檔案」放置於 Aras IIS 目錄，並將「後端 C# Method 與 TOC 設定」匯入 Aras 即可完成部署。

### 3.1 環境與權限前置需求
1. **目標環境**：Aras Innovator 12 SP9 伺服器（例如 `https://bco.openplm.com.tw/innovatorbw`）。
2. **資料庫名稱**：`BWCS-CRM`（或測試庫）。
3. **操作權限**：
   - 具備 Aras Web Server (IIS) 檔案系統之寫入權限（用於放置 `frontend/` 靜態網頁檔案）。
   - 具備 Aras `admin` 或 `Administrators` 群組權限（用於匯入 AML Package 或建立 Method / ItemType）。

---

### 3.2 步驟一：部署前端 TOC 儀表板靜態檔案至 Aras IIS 伺服器

Aras 預設會從安裝目錄下的 `Innovator\Client\customer\` 讀取客製化 TOC View 頁面。

1. 遠端登入您的 **Aras Innovator Web Server (IIS 主機)**。
2. 找到 Aras 安裝路徑下的 `Client\customer` 資料夾（常見預設路徑如下）：
   ```text
   C:\Program Files (x86)\Aras\Innovator\Innovator\Client\customer\
   ```
   *(若貴司安裝於 `D:\Aras\Innovator\...`，請依實際安裝磁碟調整)*
3. 在 `customer` 資料夾底下建立一個名為 `pmo_static` 的子資料夾，並將本專案 `c:\TEST\pmo_static\frontend\` 內的所有檔案與子目錄複製過去。
   - 您可以在伺服器上開啟 PowerShell 執行以下指令快速部署：
     ```powershell
     # 請將 $arasClientCustomerPath 替換為貴司 Aras 伺服器實際的 Client\customer 路徑
     $arasClientCustomerPath = "C:\Program Files (x86)\Aras\Innovator\Innovator\Client\customer"
     $targetDir = Join-Path $arasClientCustomerPath "pmo_static"

     New-Item -ItemType Directory -Force -Path $targetDir | Out-Null
     Copy-Item -Path "c:\TEST\pmo_static\frontend\*" -Destination $targetDir -Recurse -Force
     ```
4. 部署完成後，請確認伺服器上的目錄結構如下：
   ```text
   ...\Innovator\Client\customer\pmo_static\
   ├── index.html
   ├── css\
   │   └── dashboard.css
   └── js\
       ├── arasApiClient.js
       ├── dashboardApp.js
       ├── dashboardStore.js
       └── svgChartEngine.js
   ```

---

### 3.3 步驟二：部署後端 C# Server Method 與 TOC View 設定

您可以選擇 **「方式 A：使用 Aras Package Import 工具一鍵匯入（推薦）」** 或 **「方式 B：透過 Aras 介面手動建立」**。

#### 方式 A：使用 Aras Package Import Export Utilities 一鍵匯入（推薦）
1. 確保最新 AML Package 已產生（包含分門別類的 `Method/` 與 `ItemType/` 目錄結構）：
   ```powershell
   powershell -ExecutionPolicy Bypass -File c:\TEST\pmo_static\aml\build_aml_package.ps1
   ```
2. 開啟 Aras 官方匯入工具 **`PackageImportExportUtilities`**（路徑如 `c:\utils\PackageImportExportUtilities_15.0.4\Import\Import.exe`）。
3. 在連線設定填入：
   - **Server URL**：`https://bco.openplm.com.tw/innovatorbw`
   - **Database**：`BWCS-CRM`
   - **Login**：`admin`（與對應密碼）
   - 點擊 **Login**（或 Test Connection）確認連線成功。
4. 在匯入包裹設定選擇：
   - **Manifest File (`imports.mf`)**：點擊 Browse 瀏覽並選取 `c:\TEST\pmo_static\aml\imports.mf`。
   - **Available for Import**：勾選 `com.bdm.pmo.analytics`。
   - **Type**：選擇 **`Merge`**（已存在項目就地更新，不存在則新增）。
   - **Mode**：選擇 **`Thorough Mode`**（完整校驗依賴）。
5. 點擊 **Import** 執行匯入。工具將依序建立：
   - C# Server Method：`PMO_ProjectAnalytics_API`（位於 `Method/PMO_ProjectAnalytics_API.xml`）
   - TOC 掛載節點 ItemType：`PMO_Progress_Analytics`（位於 `ItemType/PMO_Progress_Analytics.xml`，中文名稱：**PMO 專案進度統計儀表板**，掛載於 `Portfolio` 分類下，具備 `TOC Access`、`TOC View`、`Allowed Permission` 與 `Can Add` 權限關聯）

> **注意事項與常見問題排查**：
> 1. **目錄結構要求**：Aras Package Import 工具內部採用嚴格的 ItemType 子目錄尋訪機制 (`Directory.GetDirectories`) 與 `build.xsl` 相依性排序規則。若將 XML 單檔平鋪在 `Import\` 根目錄或使用非標準 action，匯入工具將無法匹配任何項目。本專案腳本已自動依照 Aras 標準架構拆分子目錄 (`Method/`、`ItemType/`)。
> 2. **Permission GUID 相依校驗**：目標資料庫 (`BWCS-CRM` 與 `BDM-Test`) 之 `Default Access` Permission GUID 均為 `9122CD065CF04141B8EFE263FC80BEA4`。若 Permission GUID 不匹配，`Import.exe` 會在 Thorough Mode 剝離該關聯，造成 Aras 核心 CUI `PresentationConfiguration` 在生成時引發 Primary Key 衝突例外。本專案 AML 已精準校準為該實體 GUID。
> 3. **CUI 物件殘留與建立衝突排查**：若先前匯入因其他原因（如權限或路徑錯誤）中途 rollback，Aras 內部事件可能已先插入了部分 CUI 項目（如 `CommandBarSection`：`PMO_Progress_Analytics_TOC_Content`）。此時重新執行 `action="add"` 會因該 CUI 項目已存在而噴出主鍵衝突。目前已於測試資料庫 `BDM-Test` 徹底清除孤立殘留 CUI 並驗證成功建立；若在其他全新資料庫執行全新安裝，使用預設 `action="add"` 即可順暢完成。若資料庫中該 ItemType 已存在，則可指定參數 `.\build_aml_package.ps1 -Action edit` 進行更新。

> **提示**：若您日後修改了 `backend/PMO_ProjectAnalytics_API.cs`，只需再次執行以下指令即可重新打包最新 AML：
> ```powershell
> powershell -ExecutionPolicy Bypass -File c:\TEST\pmo_static\aml\build_aml_package.ps1
> ```

---

#### 方式 B：透過 Aras Innovator Web Client 手動建立（不需匯入工具）
若不方便在伺服器執行 `Import.exe`，可直接以 `admin` 登入 Aras 網頁介面依序建立：

1. **建立後端 C# Server Method**：
   - 前往左側 TOC：**Administration -> Methods -> Create New Method**。
   - **Name**：輸入 `PMO_ProjectAnalytics_API`（請確保大小寫完全一致）。
   - **Method Type**：選擇 `C#`。
   - **Execution Allowed To**：選擇 `World`（或 `All Employees`）。
   - **Method Code**：將 `c:\TEST\pmo_static\backend\PMO_ProjectAnalytics_API.cs` 的全部內容完整貼入程式碼編輯區。
   - 點擊 **Save / Done**，並可點擊工具列 **Actions -> Check Syntax** 驗證編譯無誤。

2. **建立左側 TOC 儀表板入口節點**：
   - 前往左側 TOC：**Administration -> ItemTypes -> Create New ItemType**。
   - **Name**：輸入 `PMO_Progress_Analytics`
   - **Singular Label / Plural Label**：輸入 `PMO 專案進度統計儀表板`
   - 切換至下方 **TOC Access** 頁籤：
     - 新增一列，`Identity` 選取 `World`（或 `All Employees` / `Project Management`），`Category` 選取 **`Portfolio`**（專案管理分類）。
   - 切換至下方 **TOC View** 頁籤：
     - 新增一列，`Identity` 選取 `World`。
     - **Start Page** 填入：`../customer/pmo_static/index.html`
   - 切換至下方 **Permissions** 頁籤：
     - 新增一列，`Permission` 選取 `Project`，勾選 `Is Default`。
   - 點擊 **Save / Unlock** 儲存。

---

### 3.4 步驟三：驗證安裝與啟用確認

1. **驗證 TOC 儀表板畫面**：
   - 重新整理 Aras Innovator 瀏覽器頁面（建議按 `Ctrl + F5` 清除快取）。
   - 展開左側目錄 (TOC) 的 **`Portfolio` (專案管理)** 分類，點擊 **「PMO 專案進度統計儀表板」**。
   - 畫面應立即載入「1. 全域多專案健康度總覽」、「2. 階段達成率與時程偏差分析 (Ph 1~12 & WBS)」與「3. 專案成員 (Assignee) 任務負荷統計」三個視圖。
2. **驗證後端 API 是否正常連線至資料庫**：
   - 在儀表板開啟瀏覽器開發者工具 (`F12` -> Console)，輸入以下指令測試後端健康檢查路由：
     ```javascript
     top.aras.applyMethod("PMO_ProjectAnalytics_API", "<route>/api/v1/health</route>");
     ```
   - 若回傳包含 `{"status":"healthy","version":"1.0.0","system":"PMO_ProjectAnalytics_API"}`，代表前後端與 Aras IOM 已 100% 串接成功。
3. **透過外部 OData RESTful API 呼叫（選用，供外部系統或 `pmomonthly` 串接）**：
   - 端點網址：`POST https://bco.openplm.com.tw/innovatorbw/server/odata/method.PMO_ProjectAnalytics_API`
   - Request Headers：`Authorization: Bearer <Aras_OAuth_Token>`、`Content-Type: application/json`
   - Request Body 範例：
     ```json
     {
       "route": "/api/v1/dashboard/summary",
       "state": "Active",
       "project_type": "ALL",
       "health_status": "ALL"
     }
     ```

---

## 4. 本地開發與自動化測試執行方式

本專案提供完整的雙向單元測試（無須連線至正式機即可於本地驗證所有演算法與渲染器）：

1. **執行後端 C# 單元測試 (22 項斷言測試)**：
   ```powershell
   dotnet run --project c:\TEST\pmo_static\tests\BackendTests\BackendTests.csproj
   ```
2. **執行前端 Node.js 單元測試 (5 大測試套件)**：
   ```powershell
   node --test c:\TEST\pmo_static\tests\frontend.test.js
   ```
3. **本地離線預覽前端儀表板**：
   - 直接以 Chrome / Edge 瀏覽器開啟 `c:\TEST\pmo_static\frontend\index.html`。当偵測不到 `window.top.aras` 時，`ArasApiClient` 會自動啟用內建的 BDM 模擬資料集供開發與展示使用。

---

## 5. 常見問題排除 (Troubleshooting)

| 現象 | 可能原因 | 解決作法 |
| :--- | :--- | :--- |
| 點擊 TOC 出現 `404 Not Found` | `Start Page` 路徑與 IIS 實體資料夾不一致 | 確認檔案位於 `...\Innovator\Client\customer\pmo_static\index.html`，且 `TOC View` 的 `Start Page` 設定為 `../customer/pmo_static/index.html`。 |
| 點擊後顯示預設範例專案而非真實專案 | 尚未匯入 `PMO_ProjectAnalytics_API` Server Method，或目前使用者無該 Method 執行權限 | 至 `Administration -> Methods` 搜尋 `PMO_ProjectAnalytics_API`，確認已存在且 `Execution Allowed To` 設為 `World`。 |
| 左側 TOC 沒有出現「PMO 專案進度統計儀表板」 | 使用者不在 `TOC Access` 指定的 Identity 群組內，或瀏覽器快取未更新 | 確認 `PMO_Progress_Analytics` ItemType 的 `TOC Access` 包含 `World`，並登出 Aras 重新登入。 |
