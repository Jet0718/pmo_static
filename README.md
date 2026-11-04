# BDM 系統專案進度狀態分析統計模組 (`pmo_static`)

本專案為針對公司 BDM 系統 (`https://bco.openplm.com.tw/innovatorbw`，平台版本：**Aras Innovator 12 SP9**，資料庫：`BWCS-CRM`) 所打造的**全域多專案進度狀態分析統計系統**。

系統完整結合貴司 `Project` ItemType 的客製化欄位（`cn_*`、`bcs_*`、`Ph 1 ~ Ph 12` 階段進度與色碼）以及 `C:\TEST\pmomonthly` 的 RESTful API 路由與視覺化設計。

## 1. 核心統計與分析功能
1. **全域多專案健康度總覽 (`/api/v1/dashboard/summary`)**
   - 即時彙算所有專案之**整體實際完成率 (`rollup_percent_compl`)**、**計劃進度基準 (`cn_plan_compl`)**、**延遲天數 (`cn_delay_days`)**、**EVM 績效 (`cn_spi` / `cn_cpi` / `cn_sv` / `cn_cv`)** 與**健康度燈號 (綠燈正常 / 黃燈警示 / 紅燈嚴重延遲)**。
   - 支援依專案狀態 (`Active`/`closed`/`pending`)、專案類型 (`1.Standard`/`2.Professional`)、服務中心 (`territory`)、執行團隊 (`team_id`)、專案經理 (`owned_by_id`) 與健康度燈號篩選。
   - 內建各執行團隊 (`Team`) 與各專案經理 (`PM`) 之進度達成率與 SPI/CPI 橫向比較圖表。
2. **各階段 (`Ph 1~12` & `WBS Element` / `Milestone`) 進度達成率與時程偏差分析 (`/api/v1/dashboard/project/{proj_num}` & `/api/v1/dashboard/wbs/{proj_num}`)**
   - **Ph 1 ~ Ph 12 階段燈號矩陣**：直接讀取並視覺化 `Project` 上的 `percent_compl_1~12` 與 `status_1~12` 顏色狀態（含 Hex 色碼自動轉譯圓點標籤）。
   - **WBS 樹狀階段與時程偏差分析**：透過 `Sub WBS` 與 `WBS Activity2` 遞迴剖析各主階段與里程碑之完成度 (%)、應有進度、時程變異 (`cn_sv`)、**時程偏差天數 (Schedule Variance Days)** 與任務狀態分佈（已完成 / 進行中 / 未開始 / 逾期）。
3. **專案成員 (`Assignee`) 任務負荷與完成狀態統計 (`/api/v1/dashboard/assignees`)**
   - 聚合 `Activity2 Assignment` 與 `Activity2.owned_by_id`，統計每位專案成員之指派任務總數、已完成數、進行中數、未開始數、逾期任務數、要徑任務數、預估工時 (`work_est`)、實際工時 (`actual_work`) 與個人完成率 (%)。

## 2. 專案結構
```text
c:\TEST\pmo_static\
├── gemini.md                # 專案主領域開發規則
├── spec.md                  # 完整系統規格書 (含 11 項架構、Project 客製欄位映射、RESTful 路由與 Mermaid 圖表)
├── README.md                # 專案說明與部署指南
├── backend/                 # 後端領域 (Aras C# Server Method 與 S.O.L.I.D 統計核心)
│   ├── gemini.md            # 後端開發規範
│   └── PMO_ProjectAnalytics_API.cs  # Aras Server Method 主程式與領域服務類別
├── frontend/                # 前端領域 (TOC View Dashboard HTML5/CSS3/ES6)
│   ├── gemini.md            # 前端開發規範
│   ├── index.html           # TOC View 儀表板主頁面
│   ├── css/                 # 響應式儀表板樣式表
│   └── js/                  # S.O.L.I.D 模組化前端程式碼 (API Client, Store, Renderers, SVG Chart Engine)
├── aml/                     # Aras AML 匯入封裝檔 (Import Package)
└── tests/                   # 單元測試與 E2E 瀏覽器自動化測試
```
