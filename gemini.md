# PMO 專案進度狀態分析統計系統 (Aras Innovator 12 SP9) - 專案主指引 (`gemini.md`)

## 1. 專案背景與目標
本專案針對公司 BDM 系統 (`https://bco.openplm.com.tw/innovatorbw`，資料庫：`BWCS-CRM`，平台版本：**Aras Innovator 12 SP9**) 中之專案管理模組 (`Program Management`：`Project` / `WBS Element` / `Sub WBS` / `WBS Activity2` / `Activity2` / `Activity2 Assignment`)，打造獨立的**全域多專案進度分析總覽儀表板 (TOC View Dashboard)** 與單一專案下鑽分析功能。

本系統同時融合貴司 `Project` ItemType 客製化屬性（`cn_*` / `bcs_*` / `percent_compl_1~12` / `status_1~12`）與 `C:\TEST\pmomonthly` 之 RESTful API 設計理念，提供核心統計指標：
1. **專案整體完成率 (%)、EVM 指標 (`cn_spi` / `cn_cpi` / `cn_sv` / `cn_cv`) 與健康度燈號 (綠/黃/紅燈)**
2. **各階段 (Ph 1~12 里程碑燈號與 `WBS Element` 主階段) 的進度達成率與時程偏差分析**
3. **專案成員 (Assignee / `owned_by_id` / `managed_by_id` / `Activity2 Assignment`) 的任務負荷與完成狀態統計**

## 2. 專案目錄與領域劃分
本專案分為三大領域，各自維護獨立的領域規則與文件：
- `spec.md` / `README.md`：主專案規格書與說明文件。
- `backend/`：Aras C# Server Method 領域（負責專案資料聚合、客製化欄位整合、WBS 樹狀結構遍歷、時程偏差與成員負荷統計計算、RESTful 風格路由分發）。
  - `backend/gemini.md`：後端開發規範與 Aras Server Method 守則。
- `frontend/`：TOC Dashboard 前端 HTML5/CSS3/JS 領域（負責多專案總覽、健康度/類型/服務中心篩選、Ph 1~12 與 WBS 階段偏差圖表、成員負荷圖表、與 Aras `top.aras` / OData API 通訊）。
  - `frontend/gemini.md`：前端開發規範與 Aras 12 SP9 Client 守則。
- `aml/`：Aras AML Package 封裝領域（負責 Method、Form、TOC View 掛載與權限配置）。
- `tests/`：單元測試（C# / Node.js 雙驗證）與 E2E 瀏覽器測試腳本。

## 3. 開發與變更鐵則
1. **文件先行**：任何前後端程式碼修改前，必須先更新 `spec.md` 與 `README.md`（以及對應領域的 `gemini.md`）。
2. **規格確認**：撰寫程式碼前須與開發者確認規格理解無誤；若有不確定之處須主動詢問，切勿臆測。
3. **S.O.L.I.D 原則與中文註解**：所有程式碼皆須遵循 S.O.L.I.D 原則，並具備函式級別繁體中文註解，重要變數與物件亦須加上中文註解。
4. **測試驅動與驗證**：每個小任務完成前必須完成單元測試；前端完成後必須使用瀏覽器工具進行 E2E 測試驗證。
5. **版本控管**：第一版完成後使用 `gh` 建立 GitHub Repo 並上傳；每個任務完成後須執行 `git commit`，若功能異動較大則先建立分支，完成後詢問是否合併回主分支。
