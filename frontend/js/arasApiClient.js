// ============================================================================
// 檔案名稱：arasApiClient.js
// 專案名稱：BDM 系統專案進度狀態分析統計模組 (Aras Innovator 12 SP9)
// 職責說明：遵循 S.O.L.I.D 依賴反轉原則 (DIP) 與單一職責原則 (SRP)，
//           封裝對 Aras Server Method (PMO_ProjectAnalytics_API) 之呼叫，
//           支援 IOM (top.aras.applyMethod)、OData RESTful API 與開發測試 Mock 資料集。
// ============================================================================

(function (root) {
  "use strict";

  // 預設基準測試資料：涵蓋貴司 BDM Project ItemType 完整客製欄位 (cn_*, bcs_*, Ph 1~12)、WBS 階段與 Assignee 成員負荷
  var DEFAULT_MOCK_PROJECTS = [
    {
      id: "A101B202C303D404E505F60607080910",
      proj_num: 2127,
      project_name: "次世代 BDM 智慧製造整合專案",
      project_type: "1.Standard",
      classification: "1.Standard",
      territory: "台北服務中心",
      project_mode: "Turnkey",
      customer_name: "華通精密工業",
      po_number: "PO-2026-0891",
      state: "Active",
      pm_id: "PM_CHEN",
      pm_name: "陳建宏",
      manager_name: "林總監",
      team_id: "TPS",
      team_name: "TPS 顧問團隊",
      wbs_id: "WBS_ROOT_2127",
      percent_complete: 76.5,
      actual_progress: 76.5,
      expected_progress: 78.0,
      progress_gap: 1.5,
      health_status: "GREEN",
      rag_status: "Green",
      bcs_status_label: "On Track",
      bcs_status_color: "#10B981",
      compl_category: "70%~80%",
      delay_days: 0,
      pending_days: 0,
      spi: 1.02,
      cpi: 1.51,
      planned_value: 1280,
      earned_value: 1305.6,
      actual_cost: 864.6,
      cn_sv: 25.6,
      cn_cv: 441.0,
      exp_mandays: 160,
      rollup_work_est: 1280,
      remainder_hours: 300.8,
      budget_exec_rate: 67.5,
      total_tasks: 18,
      completed_tasks: 13,
      in_progress_tasks: 4,
      not_started_tasks: 1,
      overdue_tasks: 0,
      critical_task_count: 4,
      critical_overdue_count: 0,
      milestone_count: 4,
      milestone_completed_count: 3,
      sched_start: "2026-06-01",
      sched_due: "2026-12-31",
      init_plan_start: "2026-06-01",
      init_plan_finish: "2026-12-20",
      act_start: "2026-06-02",
      act_finish: "",
      phases: [
        { phase_no: 1, label: "Ph 1", percent_compl: 100, raw_color: "#00FF00", light: "GREEN", hex_color: "#10B981" },
        { phase_no: 2, label: "Ph 2", percent_compl: 100, raw_color: "#00FF00", light: "GREEN", hex_color: "#10B981" },
        { phase_no: 3, label: "Ph 3", percent_compl: 100, raw_color: "#00FF00", light: "GREEN", hex_color: "#10B981" },
        { phase_no: 4, label: "Ph 4", percent_compl: 100, raw_color: "#00FF00", light: "GREEN", hex_color: "#10B981" },
        { phase_no: 5, label: "Ph 5", percent_compl: 100, raw_color: "#00FF00", light: "GREEN", hex_color: "#10B981" },
        { phase_no: 6, label: "Ph 6", percent_compl: 100, raw_color: "#00FF00", light: "GREEN", hex_color: "#10B981" },
        { phase_no: 7, label: "Ph 7", percent_compl: 100, raw_color: "#00FF00", light: "GREEN", hex_color: "#10B981" },
        { phase_no: 8, label: "Ph 8", percent_compl: 90, raw_color: "#00FF00", light: "GREEN", hex_color: "#10B981" },
        { phase_no: 9, label: "Ph 9", percent_compl: 65, raw_color: "#00FF00", light: "GREEN", hex_color: "#10B981" },
        { phase_no: 10, label: "Ph 10", percent_compl: 20, raw_color: "#00FF00", light: "GREEN", hex_color: "#10B981" },
        { phase_no: 11, label: "Ph 11", percent_compl: 0, raw_color: "", light: "GRAY", hex_color: "#94A3B8" },
        { phase_no: 12, label: "Ph 12", percent_compl: 0, raw_color: "", light: "GRAY", hex_color: "#94A3B8" }
      ],
      wbs_items: [
        {
          wbs_id: "WBS_2127_1", parent_wbs_id: "WBS_ROOT_2127", wbs_code: "1.0",
          wbs_name: "Phase 1: 商業流程藍圖與需求確認", classification: "Phase", level: 1,
          completion: 100.0, expected_completion: 100.0, completion_variance: 0.0, schedule_variance_days: 0,
          sched_start: "2026-06-01", sched_due: "2026-07-15", act_start: "2026-06-02",
          ev: 320, pv: 320, ac: 240, spi: 1.0, cpi: 1.33, sv: 0, cv: 80,
          rollup_status: "Completed", rag_status: "Green", health_light: "GREEN",
          total_tasks: 5, completed_tasks: 5, in_progress_tasks: 0, not_started_tasks: 0, overdue_tasks: 0
        },
        {
          wbs_id: "WBS_2127_2", parent_wbs_id: "WBS_ROOT_2127", wbs_code: "2.0",
          wbs_name: "Phase 2: 系統架構設計與資料模型配置", classification: "Phase", level: 1,
          completion: 100.0, expected_completion: 100.0, completion_variance: 0.0, schedule_variance_days: 0,
          sched_start: "2026-07-16", sched_due: "2026-09-10", act_start: "2026-07-16",
          ev: 400, pv: 400, ac: 260, spi: 1.0, cpi: 1.54, sv: 0, cv: 140,
          rollup_status: "Completed", rag_status: "Green", health_light: "GREEN",
          total_tasks: 5, completed_tasks: 5, in_progress_tasks: 0, not_started_tasks: 0, overdue_tasks: 0
        },
        {
          wbs_id: "WBS_2127_3", parent_wbs_id: "WBS_ROOT_2127", wbs_code: "3.0",
          wbs_name: "Phase 3: 客製化 Server/Client Method 開發", classification: "Phase", level: 1,
          completion: 78.0, expected_completion: 75.0, completion_variance: 3.0, schedule_variance_days: 0,
          sched_start: "2026-09-11", sched_due: "2026-11-20", act_start: "2026-09-12",
          ev: 468, pv: 450, ac: 290, spi: 1.04, cpi: 1.61, sv: 18, cv: 178,
          rollup_status: "Active", rag_status: "Green", health_light: "GREEN",
          total_tasks: 5, completed_tasks: 3, in_progress_tasks: 2, not_started_tasks: 0, overdue_tasks: 0
        },
        {
          wbs_id: "WBS_2127_4", parent_wbs_id: "WBS_ROOT_2127", wbs_code: "4.0",
          wbs_name: "Phase 4: SIT/UAT 整合測試與上線驗收", classification: "Milestone", level: 1,
          completion: 25.0, expected_completion: 22.0, completion_variance: 3.0, schedule_variance_days: 0,
          sched_start: "2026-11-01", sched_due: "2026-12-31", act_start: "2026-11-01",
          ev: 117.6, pv: 110, ac: 74.6, spi: 1.07, cpi: 1.58, sv: 7.6, cv: 43,
          rollup_status: "Active", rag_status: "Green", health_light: "GREEN",
          total_tasks: 3, completed_tasks: 0, in_progress_tasks: 2, not_started_tasks: 1, overdue_tasks: 0
        }
      ],
      assignees: [
        {
          assignee_id: "USR_LIN", assignee_name: "林俊傑 (資深架構師)",
          total_tasks: 7, completed_tasks: 6, in_progress_tasks: 1, not_started_tasks: 0, overdue_tasks: 0,
          critical_tasks: 2, completion_rate: 85.7, overdue_rate: 0.0,
          total_est_hours: 520, total_actual_hours: 340, remaining_est_hours: 45, load_level: "NORMAL", project_count: 2
        },
        {
          assignee_id: "USR_WANG", assignee_name: "王雅婷 (PLM 顧問)",
          total_tasks: 6, completed_tasks: 5, in_progress_tasks: 1, not_started_tasks: 0, overdue_tasks: 0,
          critical_tasks: 1, completion_rate: 83.3, overdue_rate: 0.0,
          total_est_hours: 440, total_actual_hours: 310, remaining_est_hours: 60, load_level: "HIGH", project_count: 2
        },
        {
          assignee_id: "USR_CHANG", assignee_name: "張家豪 (全端工程師)",
          total_tasks: 5, completed_tasks: 2, in_progress_tasks: 2, not_started_tasks: 1, overdue_tasks: 0,
          critical_tasks: 1, completion_rate: 40.0, overdue_rate: 0.0,
          total_est_hours: 320, total_actual_hours: 214.6, remaining_est_hours: 195.8, load_level: "OVERLOAD", project_count: 3
        }
      ]
    },
    {
      id: "B202C303D404E505F60607080910A111",
      proj_num: 2135,
      project_name: "車用電子研發 BOM 與變更簽核導入案",
      project_type: "2.Professional",
      classification: "2.Professional",
      territory: "新竹服務中心",
      project_mode: "Agile",
      customer_name: "宏達車電科技",
      po_number: "PO-2026-0942",
      state: "Active",
      pm_id: "PM_LIU",
      pm_name: "劉雅雯",
      manager_name: "林總監",
      team_id: "ICS",
      team_name: "ICS 顧問團隊",
      wbs_id: "WBS_ROOT_2135",
      percent_complete: 58.0,
      actual_progress: 58.0,
      expected_progress: 72.0,
      progress_gap: 14.0,
      health_status: "YELLOW",
      rag_status: "Amber",
      bcs_status_label: "Caution",
      bcs_status_color: "#FFD800",
      compl_category: "50%~60%",
      delay_days: 6,
      pending_days: 2,
      spi: 0.88,
      cpi: 0.94,
      planned_value: 960,
      earned_value: 844.8,
      actual_cost: 898.7,
      cn_sv: -115.2,
      cn_cv: -53.9,
      exp_mandays: 120,
      rollup_work_est: 960,
      remainder_hours: 403.2,
      budget_exec_rate: 93.6,
      total_tasks: 15,
      completed_tasks: 8,
      in_progress_tasks: 5,
      not_started_tasks: 2,
      overdue_tasks: 2,
      critical_task_count: 3,
      critical_overdue_count: 0,
      milestone_count: 3,
      milestone_completed_count: 1,
      sched_start: "2026-07-01",
      sched_due: "2026-12-15",
      init_plan_start: "2026-07-01",
      init_plan_finish: "2026-12-01",
      act_start: "2026-07-03",
      act_finish: "",
      phases: [
        { phase_no: 1, label: "Ph 1", percent_compl: 100, raw_color: "#00FF00", light: "GREEN", hex_color: "#10B981" },
        { phase_no: 2, label: "Ph 2", percent_compl: 100, raw_color: "#00FF00", light: "GREEN", hex_color: "#10B981" },
        { phase_no: 3, label: "Ph 3", percent_compl: 100, raw_color: "#00FF00", light: "GREEN", hex_color: "#10B981" },
        { phase_no: 4, label: "Ph 4", percent_compl: 100, raw_color: "#00FF00", light: "GREEN", hex_color: "#10B981" },
        { phase_no: 5, label: "Ph 5", percent_compl: 80, raw_color: "#FFD800", light: "YELLOW", hex_color: "#F59E0B" },
        { phase_no: 6, label: "Ph 6", percent_compl: 50, raw_color: "#FFD800", light: "YELLOW", hex_color: "#F59E0B" },
        { phase_no: 7, label: "Ph 7", percent_compl: 25, raw_color: "#FFD800", light: "YELLOW", hex_color: "#F59E0B" },
        { phase_no: 8, label: "Ph 8", percent_compl: 0, raw_color: "", light: "GRAY", hex_color: "#94A3B8" },
        { phase_no: 9, label: "Ph 9", percent_compl: 0, raw_color: "", light: "GRAY", hex_color: "#94A3B8" },
        { phase_no: 10, label: "Ph 10", percent_compl: 0, raw_color: "", light: "GRAY", hex_color: "#94A3B8" },
        { phase_no: 11, label: "Ph 11", percent_compl: 0, raw_color: "", light: "GRAY", hex_color: "#94A3B8" },
        { phase_no: 12, label: "Ph 12", percent_compl: 0, raw_color: "", light: "GRAY", hex_color: "#94A3B8" }
      ],
      wbs_items: [
        {
          wbs_id: "WBS_2135_1", parent_wbs_id: "WBS_ROOT_2135", wbs_code: "1.0",
          wbs_name: "Phase 1: ISO 26262 研發流程盤點", classification: "Phase", level: 1,
          completion: 100.0, expected_completion: 100.0, completion_variance: 0.0, schedule_variance_days: 0,
          sched_start: "2026-07-01", sched_due: "2026-08-15", act_start: "2026-07-03",
          ev: 280, pv: 280, ac: 270, spi: 1.0, cpi: 1.04, sv: 0, cv: 10,
          rollup_status: "Completed", rag_status: "Green", health_light: "GREEN",
          total_tasks: 5, completed_tasks: 5, in_progress_tasks: 0, not_started_tasks: 0, overdue_tasks: 0
        },
        {
          wbs_id: "WBS_2135_2", parent_wbs_id: "WBS_ROOT_2135", wbs_code: "2.0",
          wbs_name: "Phase 2: EBOM/MBOM 自動拋轉介面開發", classification: "Phase", level: 1,
          completion: 62.0, expected_completion: 80.0, completion_variance: -18.0, schedule_variance_days: 6,
          sched_start: "2026-08-16", sched_due: "2026-10-29", act_start: "2026-08-18",
          ev: 420, pv: 500, ac: 475, spi: 0.84, cpi: 0.88, sv: -80, cv: -55,
          rollup_status: "Active", rag_status: "Amber", health_light: "YELLOW",
          total_tasks: 6, completed_tasks: 3, in_progress_tasks: 3, not_started_tasks: 0, overdue_tasks: 2
        },
        {
          wbs_id: "WBS_2135_3", parent_wbs_id: "WBS_ROOT_2135", wbs_code: "3.0",
          wbs_name: "Phase 3: ECR/ECN 簽核驗證與教育訓練", classification: "Phase", level: 1,
          completion: 20.0, expected_completion: 30.0, completion_variance: -10.0, schedule_variance_days: 0,
          sched_start: "2026-10-20", sched_due: "2026-12-15", act_start: "2026-10-22",
          ev: 144.8, pv: 180, ac: 153.7, spi: 0.80, cpi: 0.94, sv: -35.2, cv: -8.9,
          rollup_status: "Active", rag_status: "Amber", health_light: "YELLOW",
          total_tasks: 4, completed_tasks: 0, in_progress_tasks: 2, not_started_tasks: 2, overdue_tasks: 0
        }
      ],
      assignees: [
        {
          assignee_id: "USR_CHANG", assignee_name: "張家豪 (全端工程師)",
          total_tasks: 6, completed_tasks: 3, in_progress_tasks: 2, not_started_tasks: 1, overdue_tasks: 1,
          critical_tasks: 2, completion_rate: 50.0, overdue_rate: 16.7,
          total_est_hours: 380, total_actual_hours: 365, remaining_est_hours: 150, load_level: "OVERLOAD", project_count: 3
        },
        {
          assignee_id: "USR_HSU", assignee_name: "許志豪 (ERP 介面工程師)",
          total_tasks: 5, completed_tasks: 2, in_progress_tasks: 2, not_started_tasks: 1, overdue_tasks: 1,
          critical_tasks: 1, completion_rate: 40.0, overdue_rate: 20.0,
          total_est_hours: 340, total_actual_hours: 320, remaining_est_hours: 140, load_level: "HIGH", project_count: 1
        },
        {
          assignee_id: "USR_WANG", assignee_name: "王雅婷 (PLM 顧問)",
          total_tasks: 4, completed_tasks: 3, in_progress_tasks: 1, not_started_tasks: 0, overdue_tasks: 0,
          critical_tasks: 0, completion_rate: 75.0, overdue_rate: 0.0,
          total_est_hours: 240, total_actual_hours: 213.7, remaining_est_hours: 50, load_level: "NORMAL", project_count: 2
        }
      ]
    },
    {
      id: "C303D404E505F60607080910A111B222",
      proj_num: 2142,
      project_name: "全球供應鏈協同門戶與派工整合升級案",
      project_type: "1.Standard",
      classification: "3.Upgrade",
      territory: "台中服務中心",
      project_mode: "Turnkey",
      customer_name: "永豐機械工業",
      po_number: "PO-2026-1005",
      state: "Active",
      pm_id: "PM_CHEN",
      pm_name: "陳建宏",
      manager_name: "林總監",
      team_id: "PMO",
      team_name: "PMO 專案管理處",
      wbs_id: "WBS_ROOT_2142",
      percent_complete: 41.0,
      actual_progress: 41.0,
      expected_progress: 70.0,
      progress_gap: 29.0,
      health_status: "RED",
      rag_status: "Red",
      bcs_status_label: "Behind",
      bcs_status_color: "#FF0000",
      compl_category: "40%~50%",
      delay_days: 15,
      pending_days: 5,
      spi: 0.68,
      cpi: 0.76,
      planned_value: 1100,
      earned_value: 748,
      actual_cost: 984.2,
      cn_sv: -352.0,
      cn_cv: -236.2,
      exp_mandays: 140,
      rollup_work_est: 1120,
      remainder_hours: 660.8,
      budget_exec_rate: 89.5,
      total_tasks: 16,
      completed_tasks: 5,
      in_progress_tasks: 7,
      not_started_tasks: 4,
      overdue_tasks: 5,
      critical_task_count: 4,
      critical_overdue_count: 2,
      milestone_count: 4,
      milestone_completed_count: 1,
      sched_start: "2026-06-15",
      sched_due: "2026-11-30",
      init_plan_start: "2026-06-15",
      init_plan_finish: "2026-11-15",
      act_start: "2026-06-20",
      act_finish: "",
      phases: [
        { phase_no: 1, label: "Ph 1", percent_compl: 100, raw_color: "#00FF00", light: "GREEN", hex_color: "#10B981" },
        { phase_no: 2, label: "Ph 2", percent_compl: 100, raw_color: "#00FF00", light: "GREEN", hex_color: "#10B981" },
        { phase_no: 3, label: "Ph 3", percent_compl: 85, raw_color: "#FFD800", light: "YELLOW", hex_color: "#F59E0B" },
        { phase_no: 4, label: "Ph 4", percent_compl: 45, raw_color: "#FF0000", light: "RED", hex_color: "#EF4444" },
        { phase_no: 5, label: "Ph 5", percent_compl: 20, raw_color: "#FF0000", light: "RED", hex_color: "#EF4444" },
        { phase_no: 6, label: "Ph 6", percent_compl: 0, raw_color: "#FF0000", light: "RED", hex_color: "#EF4444" },
        { phase_no: 7, label: "Ph 7", percent_compl: 0, raw_color: "", light: "GRAY", hex_color: "#94A3B8" },
        { phase_no: 8, label: "Ph 8", percent_compl: 0, raw_color: "", light: "GRAY", hex_color: "#94A3B8" },
        { phase_no: 9, label: "Ph 9", percent_compl: 0, raw_color: "", light: "GRAY", hex_color: "#94A3B8" },
        { phase_no: 10, label: "Ph 10", percent_compl: 0, raw_color: "", light: "GRAY", hex_color: "#94A3B8" },
        { phase_no: 11, label: "Ph 11", percent_compl: 0, raw_color: "", light: "GRAY", hex_color: "#94A3B8" },
        { phase_no: 12, label: "Ph 12", percent_compl: 0, raw_color: "", light: "GRAY", hex_color: "#94A3B8" }
      ],
      wbs_items: [
        {
          wbs_id: "WBS_2142_1", parent_wbs_id: "WBS_ROOT_2142", wbs_code: "1.0",
          wbs_name: "Phase 1: 舊版資料庫 Schema 差異分析", classification: "Phase", level: 1,
          completion: 100.0, expected_completion: 100.0, completion_variance: 0.0, schedule_variance_days: 0,
          sched_start: "2026-06-15", sched_due: "2026-07-31", act_start: "2026-06-20",
          ev: 260, pv: 260, ac: 255, spi: 1.0, cpi: 1.02, sv: 0, cv: 5,
          rollup_status: "Completed", rag_status: "Green", health_light: "GREEN",
          total_tasks: 4, completed_tasks: 4, in_progress_tasks: 0, not_started_tasks: 0, overdue_tasks: 0
        },
        {
          wbs_id: "WBS_2142_2", parent_wbs_id: "WBS_ROOT_2142", wbs_code: "2.0",
          wbs_name: "Phase 2: 供應商外網安全認證與 SSO 改版", classification: "Milestone", level: 1,
          completion: 40.0, expected_completion: 90.0, completion_variance: -50.0, schedule_variance_days: 15,
          sched_start: "2026-08-01", sched_due: "2026-10-20", act_start: "2026-08-05",
          ev: 348, pv: 580, ac: 510.2, spi: 0.60, cpi: 0.68, sv: -232, cv: -162.2,
          rollup_status: "Active", rag_status: "Red", health_light: "RED",
          total_tasks: 7, completed_tasks: 1, in_progress_tasks: 5, not_started_tasks: 1, overdue_tasks: 4
        },
        {
          wbs_id: "WBS_2142_3", parent_wbs_id: "WBS_ROOT_2142", wbs_code: "3.0",
          wbs_name: "Phase 3: 派工單 (bcs_workorder) 自動對帳模組", classification: "Phase", level: 1,
          completion: 15.0, expected_completion: 45.0, completion_variance: -30.0, schedule_variance_days: 6,
          sched_start: "2026-09-25", sched_due: "2026-11-30", act_start: "2026-10-01",
          ev: 140, pv: 260, ac: 219, spi: 0.54, cpi: 0.64, sv: -120, cv: -79,
          rollup_status: "Active", rag_status: "Red", health_light: "RED",
          total_tasks: 5, completed_tasks: 0, in_progress_tasks: 2, not_started_tasks: 3, overdue_tasks: 1
        }
      ],
      assignees: [
        {
          assignee_id: "USR_CHANG", assignee_name: "張家豪 (全端工程師)",
          total_tasks: 7, completed_tasks: 1, in_progress_tasks: 4, not_started_tasks: 2, overdue_tasks: 3,
          critical_tasks: 2, completion_rate: 14.3, overdue_rate: 42.9,
          total_est_hours: 480, total_actual_hours: 495, remaining_est_hours: 310, load_level: "OVERLOAD", project_count: 3
        },
        {
          assignee_id: "USR_TSAI", assignee_name: "蔡宗翰 (資安與SSO顧問)",
          total_tasks: 5, completed_tasks: 2, in_progress_tasks: 2, not_started_tasks: 1, overdue_tasks: 2,
          critical_tasks: 2, completion_rate: 40.0, overdue_rate: 40.0,
          total_est_hours: 360, total_actual_hours: 310.2, remaining_est_hours: 185, load_level: "OVERLOAD", project_count: 1
        },
        {
          assignee_id: "USR_LIN", assignee_name: "林俊傑 (資深架構師)",
          total_tasks: 4, completed_tasks: 2, in_progress_tasks: 1, not_started_tasks: 1, overdue_tasks: 0,
          critical_tasks: 0, completion_rate: 50.0, overdue_rate: 0.0,
          total_est_hours: 280, total_actual_hours: 179, remaining_est_hours: 95, load_level: "HIGH", project_count: 2
        }
      ]
    },
    {
      id: "D404E505F60607080910A111B222C333",
      proj_num: 2110,
      project_name: "醫療器材 QMS 文件控管與合規驗證專案",
      project_type: "2.Professional",
      classification: "2.Professional",
      territory: "台南服務中心",
      project_mode: "Standard",
      customer_name: "瑞生醫電股份",
      po_number: "PO-2026-0512",
      state: "Active",
      pm_id: "PM_LIU",
      pm_name: "劉雅雯",
      manager_name: "林總監",
      team_id: "SUS",
      team_name: "SUS 永續服務處",
      wbs_id: "WBS_ROOT_2110",
      percent_complete: 100.0,
      actual_progress: 100.0,
      expected_progress: 100.0,
      progress_gap: 0.0,
      health_status: "GREEN",
      rag_status: "Green",
      bcs_status_label: "Completed",
      bcs_status_color: "#00FF00",
      compl_category: "100%",
      delay_days: 0,
      pending_days: 0,
      spi: 1.0,
      cpi: 1.12,
      planned_value: 800,
      earned_value: 800,
      actual_cost: 714.3,
      cn_sv: 0,
      cn_cv: 85.7,
      exp_mandays: 100,
      rollup_work_est: 800,
      remainder_hours: 0,
      budget_exec_rate: 89.3,
      total_tasks: 12,
      completed_tasks: 12,
      in_progress_tasks: 0,
      not_started_tasks: 0,
      overdue_tasks: 0,
      critical_task_count: 3,
      critical_overdue_count: 0,
      milestone_count: 3,
      milestone_completed_count: 3,
      sched_start: "2026-02-01",
      sched_due: "2026-08-31",
      init_plan_start: "2026-02-01",
      init_plan_finish: "2026-08-31",
      act_start: "2026-02-01",
      act_finish: "2026-08-28",
      phases: [
        { phase_no: 1, label: "Ph 1", percent_compl: 100, raw_color: "#00FF00", light: "GREEN", hex_color: "#10B981" },
        { phase_no: 2, label: "Ph 2", percent_compl: 100, raw_color: "#00FF00", light: "GREEN", hex_color: "#10B981" },
        { phase_no: 3, label: "Ph 3", percent_compl: 100, raw_color: "#00FF00", light: "GREEN", hex_color: "#10B981" },
        { phase_no: 4, label: "Ph 4", percent_compl: 100, raw_color: "#00FF00", light: "GREEN", hex_color: "#10B981" },
        { phase_no: 5, label: "Ph 5", percent_compl: 100, raw_color: "#00FF00", light: "GREEN", hex_color: "#10B981" },
        { phase_no: 6, label: "Ph 6", percent_compl: 100, raw_color: "#00FF00", light: "GREEN", hex_color: "#10B981" },
        { phase_no: 7, label: "Ph 7", percent_compl: 100, raw_color: "#00FF00", light: "GREEN", hex_color: "#10B981" },
        { phase_no: 8, label: "Ph 8", percent_compl: 100, raw_color: "#00FF00", light: "GREEN", hex_color: "#10B981" },
        { phase_no: 9, label: "Ph 9", percent_compl: 100, raw_color: "#00FF00", light: "GREEN", hex_color: "#10B981" },
        { phase_no: 10, label: "Ph 10", percent_compl: 100, raw_color: "#00FF00", light: "GREEN", hex_color: "#10B981" },
        { phase_no: 11, label: "Ph 11", percent_compl: 100, raw_color: "#00FF00", light: "GREEN", hex_color: "#10B981" },
        { phase_no: 12, label: "Ph 12", percent_compl: 100, raw_color: "#00FF00", light: "GREEN", hex_color: "#10B981" }
      ],
      wbs_items: [
        {
          wbs_id: "WBS_2110_1", parent_wbs_id: "WBS_ROOT_2110", wbs_code: "1.0",
          wbs_name: "Phase 1: FDA 21 CFR Part 11 合規設計與驗證", classification: "Phase", level: 1,
          completion: 100.0, expected_completion: 100.0, completion_variance: 0.0, schedule_variance_days: 0,
          sched_start: "2026-02-01", sched_due: "2026-08-31", act_start: "2026-02-01",
          ev: 800, pv: 800, ac: 714.3, spi: 1.0, cpi: 1.12, sv: 0, cv: 85.7,
          rollup_status: "Completed", rag_status: "Green", health_light: "GREEN",
          total_tasks: 12, completed_tasks: 12, in_progress_tasks: 0, not_started_tasks: 0, overdue_tasks: 0
        }
      ],
      assignees: [
        {
          assignee_id: "USR_WANG", assignee_name: "王雅婷 (PLM 顧問)",
          total_tasks: 12, completed_tasks: 12, in_progress_tasks: 0, not_started_tasks: 0, overdue_tasks: 0,
          critical_tasks: 3, completion_rate: 100.0, overdue_rate: 0.0,
          total_est_hours: 800, total_actual_hours: 714.3, remaining_est_hours: 0, load_level: "LOW", project_count: 2
        }
      ]
    },
    {
      id: "E505F60607080910A111B222C303D404",
      proj_num: 2155,
      project_name: "工廠節能與碳足跡追蹤數位化專案",
      project_type: "1.Standard",
      classification: "1.Standard",
      territory: "新竹服務中心",
      project_mode: "Turnkey",
      customer_name: "綠能智慧股份",
      po_number: "PO-2026-1130",
      state: "Active",
      pm_id: "PM_CHEN",
      pm_name: "陳建宏",
      manager_name: "林總監",
      team_id: "SHS",
      team_name: "SHS 顧問團隊",
      wbs_id: "WBS_ROOT_2155",
      percent_complete: 82.0,
      actual_progress: 82.0,
      expected_progress: 80.0,
      progress_gap: -2.0,
      health_status: "GREEN",
      rag_status: "Green",
      bcs_status_label: "On Track",
      bcs_status_color: "#10B981",
      compl_category: "80%~90%",
      delay_days: 0,
      pending_days: 0,
      spi: 1.05,
      cpi: 1.10,
      planned_value: 600,
      earned_value: 630,
      actual_cost: 572,
      cn_sv: 30,
      cn_cv: 58,
      exp_mandays: 75,
      rollup_work_est: 600,
      remainder_hours: 108,
      budget_exec_rate: 95.3,
      total_tasks: 8,
      completed_tasks: 6,
      in_progress_tasks: 2,
      not_started_tasks: 0,
      overdue_tasks: 0,
      critical_task_count: 2,
      critical_overdue_count: 0,
      milestone_count: 2,
      milestone_completed_count: 2,
      sched_start: "2026-05-01",
      sched_due: "2026-11-30",
      init_plan_start: "2026-05-01",
      init_plan_finish: "2026-11-30",
      act_start: "2026-05-01",
      act_finish: "",
      phases: [
        { phase_no: 1, label: "Ph 1", percent_compl: 100, raw_color: "#00FF00", light: "GREEN", hex_color: "#10B981" },
        { phase_no: 2, label: "Ph 2", percent_compl: 100, raw_color: "#00FF00", light: "GREEN", hex_color: "#10B981" },
        { phase_no: 3, label: "Ph 3", percent_compl: 80, raw_color: "#00FF00", light: "GREEN", hex_color: "#10B981" }
      ],
      wbs_items: [],
      assignees: []
    },
    {
      id: "F60607080910A111B222C303D404E505",
      proj_num: 2160,
      project_name: "跨域協同平台客製擴充試點案",
      project_type: "2.Professional",
      classification: "2.Professional",
      territory: "台北服務中心",
      project_mode: "Agile",
      customer_name: "大宇資訊科技",
      po_number: "PO-2026-1201",
      state: "Active",
      pm_id: "PM_LIU",
      pm_name: "劉雅雯",
      manager_name: "林總監",
      team_id: "Other",
      team_name: "其他團隊",
      wbs_id: "WBS_ROOT_2160",
      percent_complete: 65.0,
      actual_progress: 65.0,
      expected_progress: 65.0,
      progress_gap: 0.0,
      health_status: "GREEN",
      rag_status: "Green",
      bcs_status_label: "On Track",
      bcs_status_color: "#10B981",
      compl_category: "60%~70%",
      delay_days: 0,
      pending_days: 0,
      spi: 1.0,
      cpi: 1.0,
      planned_value: 400,
      earned_value: 400,
      actual_cost: 400,
      cn_sv: 0,
      cn_cv: 0,
      exp_mandays: 50,
      rollup_work_est: 400,
      remainder_hours: 140,
      budget_exec_rate: 100,
      total_tasks: 5,
      completed_tasks: 3,
      in_progress_tasks: 2,
      not_started_tasks: 0,
      overdue_tasks: 0,
      critical_task_count: 1,
      critical_overdue_count: 0,
      milestone_count: 1,
      milestone_completed_count: 1,
      sched_start: "2026-07-01",
      sched_due: "2026-12-15",
      init_plan_start: "2026-07-01",
      init_plan_finish: "2026-12-15",
      act_start: "2026-07-01",
      act_finish: "",
      phases: [],
      wbs_items: [],
      assignees: []
    }
  ];

  // 取得瀏覽器視窗中之 Aras Context 物件 (支援 TOC IFrame 階層查找)
  function detectArasObject(win = null) {
    var targetWin = win || (typeof window !== "undefined" ? window : null);
    if (!targetWin) return null;
    try {
      if (targetWin.aras) return targetWin.aras;
      if (targetWin.parent && targetWin.parent.aras) return targetWin.parent.aras;
      if (targetWin.top && targetWin.top.aras) return targetWin.top.aras;
    } catch (err) {
      // 跨域安全例外保護
      return null;
    }
    return null;
  }

  // 防注入轉義 XML 特殊字元，供組裝 AML 屬性使用
  function escapeXml(str = "") {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  // 安全數值正規化：防止產生 NaN 或 Infinity
  
  // 正規化團隊代碼 (與後端 NormalizeTeamCode 100% 對齊，支援 GUID 與 keyed_name)
  // 已知 BDM 專案管理處團隊 GUID 映射字典
  var KNOWN_TEAM_GUIDS = {
    "604F804DDA84451CA3B6CB54CD905BC9": "TPS",
    "0DE0880740CF41E68518D86891A9B83A": "ICS",
    "CDE4225D27224672B7CDDD497486C5AA": "PMO",
    "ABBACF8E3BEB4D87AFFE86D1608BA5E3": "SUS",
    "BF5B92B912DD4865966731F946091ABA": "SHS",
    "28835013218C4AFB811EDC39C85375FA": "WHS",
    "4826D4B55C834A048CAEAE77AAA6FFFA": "CDS"
  };

  // 正規化團隊代碼 (純代碼：TPS, ICS, PMO, SUS, SHS, Other，支援 GUID 與 keyed_name 雙向解析)
  function normalizeTeamCode(teamId = "", teamName = "") {
    var s1 = String(teamId || "").trim();
    var s2 = String(teamName || "").trim();
    if (KNOWN_TEAM_GUIDS[s1.toUpperCase()]) return KNOWN_TEAM_GUIDS[s1.toUpperCase()];
    if (KNOWN_TEAM_GUIDS[s2.toUpperCase()]) return KNOWN_TEAM_GUIDS[s2.toUpperCase()];
    var combined = (s1 + " " + s2).toUpperCase();
    if (combined.indexOf("TPS") >= 0) return "TPS";
    if (combined.indexOf("ICS") >= 0) return "ICS";
    if (combined.indexOf("PMO") >= 0) return "PMO";
    if (combined.indexOf("SUS") >= 0) return "SUS";
    if (combined.indexOf("SHS") >= 0) return "SHS";
    return "Other";
  }

  function safeNumber(val = 0, fallback = 0) {
    var num = Number(val);
    if (!Number.isFinite(num)) return fallback;
    return num;
  }

  // 正規化色碼或燈號名稱，防止 #FFD800 等色碼被直接顯示為文字
  function normalizeStatusColor(rawColor = "", percentCompl = 0) {
    var c = String(rawColor || "").trim().toUpperCase();
    var pct = safeNumber(percentCompl, 0);
    if (c.indexOf("FF0000") >= 0 || c.indexOf("F56C6C") >= 0 || c.indexOf("EF4444") >= 0 || c === "RED" || c === "紅" || c === "危險") {
      return { light: "RED", hex: "#EF4444", label: "紅燈 (延遲)" };
    }
    if (c.indexOf("FFD800") >= 0 || c.indexOf("FFFF00") >= 0 || c.indexOf("E6A23C") >= 0 || c.indexOf("F59E0B") >= 0 || c === "YELLOW" || c === "AMBER" || c === "黃" || c === "注意") {
      return { light: "YELLOW", hex: "#F59E0B", label: "黃燈 (警示)" };
    }
    if (c.indexOf("00FF00") >= 0 || c.indexOf("008000") >= 0 || c.indexOf("67C23A") >= 0 || c.indexOf("10B981") >= 0 || c === "GREEN" || c === "綠" || c === "正常") {
      return { light: "GREEN", hex: "#10B981", label: "綠燈 (正常)" };
    }
    if (pct >= 100) {
      return { light: "GREEN", hex: "#10B981", label: "綠燈 (完成)" };
    }
    if (pct > 0) {
      return { light: "GREEN", hex: "#3B82F6", label: "進行中" };
    }
    return { light: "GRAY", hex: "#94A3B8", label: "未開始" };
  }

  // 依據篩選參數於本地端過濾並聚合專案清單 (供 Mock 模式與前端即時二次篩選共用)
  function buildSummaryFromProjects(projects = [], filters = {}) {
    var stateFilter = String(filters.state || "ALL").trim();
    var typeFilter = String(filters.project_type || "ALL").trim();
    var territoryFilter = String(filters.territory || "ALL").trim();
    var teamFilter = String(filters.team_id || "ALL").trim();
    var pmFilter = String(filters.pm_id || "ALL").trim();
    var healthFilter = String(filters.health_status || "ALL").trim();
    var keyword = String(filters.keyword || "").trim().toLowerCase();

    var filtered = projects.filter(function (p) {
      if (stateFilter && stateFilter.toUpperCase() !== "ALL" && String(p.state || "").toLowerCase() !== stateFilter.toLowerCase()) {
        return false;
      }
      if (typeFilter && typeFilter !== "ALL") {
        var types = typeFilter.split(",").map(function (t) { return t.trim(); }).filter(Boolean);
        if (types.length > 0 && types.indexOf(p.project_type) < 0) {
          return false;
        }
      }
      if (territoryFilter && territoryFilter !== "ALL" && p.territory !== territoryFilter) {
        return false;
      }
      if (teamFilter && teamFilter !== "ALL") {
        var pTeam = normalizeTeamCode(p.team_id, p.team_name);
        if (teamFilter === "Other") {
          if (["TPS", "ICS", "PMO", "SUS", "SHS"].indexOf(pTeam) >= 0) {
            return false;
          }
        } else if (pTeam !== teamFilter) {
          return false;
        }
      }
      if (pmFilter && pmFilter !== "ALL" && p.pm_id !== pmFilter) {
        return false;
      }
      if (healthFilter && healthFilter !== "ALL" && p.health_status !== healthFilter) {
        return false;
      }
      if (keyword) {
        var matchNum = String(p.proj_num || "").indexOf(keyword) >= 0;
        var matchName = String(p.project_name || "").toLowerCase().indexOf(keyword) >= 0;
        var matchPm = String(p.pm_name || "").toLowerCase().indexOf(keyword) >= 0;
        var matchCust = String(p.customer_name || "").toLowerCase().indexOf(keyword) >= 0;
        if (!matchNum && !matchName && !matchPm && !matchCust) return false;
      }
      return true;
    });

    var greenCount = 0;
    var amberCount = 0;
    var redCount = 0;
    var activeCount = 0;
    var closedCount = 0;
    var pendingCount = 0;
    var totalOverdueTasks = 0;
    var progSum = 0;
    var spiSum = 0;
    var cpiSum = 0;
    var pvSum = 0;
    var evSum = 0;
    var acSum = 0;
    var svSum = 0;
    var cvSum = 0;

    var pmMap = {};
    var teamMap = {};

    filtered.forEach(function (p) {
      var st = String(p.state || "").toLowerCase();
      if (st === "active") activeCount++;
      else if (st === "closed" || st === "completed") closedCount++;
      else pendingCount++;

      if (p.health_status === "RED") redCount++;
      else if (p.health_status === "YELLOW") amberCount++;
      else greenCount++;

      totalOverdueTasks += safeNumber(p.overdue_tasks, 0);
      progSum += safeNumber(p.actual_progress, 0);
      spiSum += safeNumber(p.spi, 1);
      cpiSum += safeNumber(p.cpi, 1);
      pvSum += safeNumber(p.planned_value, 0);
      evSum += safeNumber(p.earned_value, 0);
      acSum += safeNumber(p.actual_cost, 0);
      svSum += safeNumber(p.cn_sv, 0);
      cvSum += safeNumber(p.cn_cv, 0);

      var tid = normalizeTeamCode(p.team_id, p.team_name);
      if (!teamMap[tid]) {
        teamMap[tid] = {
          team_id: tid,
          team_name: p.team_name || tid,
          project_count: 0,
          prog_sum: 0,
          spi_sum: 0,
          cpi_sum: 0,
          green_count: 0,
          amber_count: 0,
          red_count: 0
        };
      }
      teamMap[tid].project_count++;
      teamMap[tid].prog_sum += safeNumber(p.actual_progress, 0);
      teamMap[tid].spi_sum += safeNumber(p.spi, 1);
      teamMap[tid].cpi_sum += safeNumber(p.cpi, 1);
      if (p.health_status === "RED") teamMap[tid].red_count++;
      else if (p.health_status === "YELLOW") teamMap[tid].amber_count++;
      else teamMap[tid].green_count++;

      var pid = p.pm_id || "UNSPECIFIED";
      if (!pmMap[pid]) {
        pmMap[pid] = {
          pm_id: pid,
          pm_name: p.pm_name || pid,
          project_count: 0,
          prog_sum: 0,
          spi_sum: 0,
          cpi_sum: 0,
          green_count: 0,
          amber_count: 0,
          red_count: 0
        };
      }
      pmMap[pid].project_count++;
      pmMap[pid].prog_sum += safeNumber(p.actual_progress, 0);
      pmMap[pid].spi_sum += safeNumber(p.spi, 1);
      pmMap[pid].cpi_sum += safeNumber(p.cpi, 1);
      if (p.health_status === "RED") pmMap[pid].red_count++;
      else if (p.health_status === "YELLOW") pmMap[pid].amber_count++;
      else pmMap[pid].green_count++;
    });

    var count = filtered.length;
    var teamPerf = Object.keys(teamMap).map(function (k) {
      var t = teamMap[k];
      return {
        team_id: t.team_id,
        team_name: t.team_name,
        project_count: t.project_count,
        avg_progress: Number((t.prog_sum / t.project_count).toFixed(1)),
        avg_spi: Number((t.spi_sum / t.project_count).toFixed(2)),
        avg_cpi: Number((t.cpi_sum / t.project_count).toFixed(2)),
        green_count: t.green_count,
        amber_count: t.amber_count,
        red_count: t.red_count
      };
    });

    teamPerf.sort(function (a, b) { return b.project_count - a.project_count; });

    var pmPerf = Object.keys(pmMap).map(function (k) {
      var m = pmMap[k];
      return {
        pm_id: m.pm_id,
        pm_name: m.pm_name,
        project_count: m.project_count,
        avg_progress: Number((m.prog_sum / m.project_count).toFixed(1)),
        avg_spi: Number((m.spi_sum / m.project_count).toFixed(2)),
        avg_cpi: Number((m.cpi_sum / m.project_count).toFixed(2)),
        green_count: m.green_count,
        amber_count: m.amber_count,
        red_count: m.red_count
      };
    });
    pmPerf.sort(function (a, b) { return b.project_count - a.project_count; });

    return {
      status: "success",
      summary: {
        total_projects: count,
        active_projects: activeCount,
        closed_projects: closedCount,
        pending_projects: pendingCount,
        avg_progress: count > 0 ? Number((progSum / count).toFixed(1)) : 0,
        total_overdue_tasks: totalOverdueTasks,
        total_pm_count: pmPerf.length,
        total_team_count: teamPerf.length
      },
      rag_status: {
        green_count: greenCount,
        amber_count: amberCount,
        red_count: redCount,
        green_percent: count > 0 ? Number(((greenCount / count) * 100).toFixed(1)) : 0,
        amber_percent: count > 0 ? Number(((amberCount / count) * 100).toFixed(1)) : 0,
        red_percent: count > 0 ? Number(((redCount / count) * 100).toFixed(1)) : 0
      },
      evm_summary: {
        avg_spi: count > 0 ? Number((spiSum / count).toFixed(2)) : 0,
        avg_cpi: count > 0 ? Number((cpiSum / count).toFixed(2)) : 0,
        total_planned_value: Number(pvSum.toFixed(1)),
        total_earned_value: Number(evSum.toFixed(1)),
        total_actual_cost: Number(acSum.toFixed(1)),
        total_cn_sv: Number(svSum.toFixed(1)),
        total_cn_cv: Number(cvSum.toFixed(1))
      },
      team_performance: teamPerf,
      pm_performance: pmPerf,
      projects: filtered
    };
  }

  // 聚合跨專案或指定專案之成員任務負荷清單
  function aggregateCrossProjectAssignees(projects = [], filters = {}) {
    var targetProjNum = Number(filters.proj_num || 0);
    var map = {};

    projects.forEach(function (p) {
      if (targetProjNum > 0 && p.proj_num !== targetProjNum) return;
      if (filters.team_id && filters.team_id !== "ALL" && p.team_id !== filters.team_id) return;
      if (filters.state && filters.state !== "ALL" && String(p.state || "").toLowerCase() !== String(filters.state).toLowerCase()) return;

      var assignees = p.assignees || [];
      assignees.forEach(function (a) {
        var id = a.assignee_id || a.assignee_name;
        if (!map[id]) {
          map[id] = {
            assignee_id: id,
            assignee_name: a.assignee_name,
            total_tasks: 0,
            completed_tasks: 0,
            in_progress_tasks: 0,
            not_started_tasks: 0,
            overdue_tasks: 0,
            critical_tasks: 0,
            total_est_hours: 0,
            total_actual_hours: 0,
            remaining_est_hours: 0,
            project_nums: {}
          };
        }
        var acc = map[id];
        acc.total_tasks += safeNumber(a.total_tasks, 0);
        acc.completed_tasks += safeNumber(a.completed_tasks, 0);
        acc.in_progress_tasks += safeNumber(a.in_progress_tasks, 0);
        acc.not_started_tasks += safeNumber(a.not_started_tasks, 0);
        acc.overdue_tasks += safeNumber(a.overdue_tasks, 0);
        acc.critical_tasks += safeNumber(a.critical_tasks, 0);
        acc.total_est_hours += safeNumber(a.total_est_hours, 0);
        acc.total_actual_hours += safeNumber(a.total_actual_hours, 0);
        acc.remaining_est_hours += safeNumber(a.remaining_est_hours, 0);
        acc.project_nums[p.proj_num] = true;
      });
    });

    var list = Object.keys(map).map(function (id) {
      var item = map[id];
      var total = item.total_tasks;
      var complRate = total > 0 ? Number(((item.completed_tasks / total) * 100).toFixed(1)) : 0;
      var ovdRate = total > 0 ? Number(((item.overdue_tasks / total) * 100).toFixed(1)) : 0;
      var backlog = item.in_progress_tasks + item.not_started_tasks;
      var loadLevel = "LOW";
      if (item.overdue_tasks >= 3 || backlog >= 10 || item.remaining_est_hours >= 120) {
        loadLevel = "OVERLOAD";
      } else if (item.overdue_tasks >= 1 || backlog >= 6 || item.remaining_est_hours >= 60) {
        loadLevel = "HIGH";
      } else if (backlog >= 2 || item.remaining_est_hours >= 16) {
        loadLevel = "NORMAL";
      }
      return {
        assignee_id: item.assignee_id,
        assignee_name: item.assignee_name,
        total_tasks: item.total_tasks,
        completed_tasks: item.completed_tasks,
        in_progress_tasks: item.in_progress_tasks,
        not_started_tasks: item.not_started_tasks,
        overdue_tasks: item.overdue_tasks,
        critical_tasks: item.critical_tasks,
        completion_rate: complRate,
        overdue_rate: ovdRate,
        total_est_hours: Number(item.total_est_hours.toFixed(1)),
        total_actual_hours: Number(item.total_actual_hours.toFixed(1)),
        remaining_est_hours: Number(item.remaining_est_hours.toFixed(1)),
        load_level: loadLevel,
        project_count: Object.keys(item.project_nums).length
      };
    });

    list.sort(function (a, b) {
      if (b.overdue_tasks !== a.overdue_tasks) return b.overdue_tasks - a.overdue_tasks;
      return b.total_tasks - a.total_tasks;
    });

    return list;
  }

  // ArasApiClient 建構器：支援 IOM applyMethod 與 Mock Adapter 無縫切換
  function ArasApiClient(options = {}) {
    this.methodName = options.methodName || "PMO_ProjectAnalytics_API";
    this.mockProjects = options.mockProjects || DEFAULT_MOCK_PROJECTS;
    this.arasObj = options.arasObj || detectArasObject();
  }

  // 發送 RESTful 風格請求至 Aras Server Method 或回退至本地引擎
  ArasApiClient.prototype.request = async function (route = "/api/v1/dashboard/summary", params = {}) {
    if (this.arasObj && typeof this.arasObj.applyMethod === "function") {
      try {
        var amlBody = "<route>" + escapeXml(route) + "</route>";
        Object.keys(params).forEach(function (k) {
          if (params[k] !== undefined && params[k] !== null) {
            amlBody += "<" + k + ">" + escapeXml(String(params[k])) + "</" + k + ">";
          }
        });
        var rawXmlOrJson = this.arasObj.applyMethod(this.methodName, amlBody);
        if (rawXmlOrJson) {
          var jsonStr = String(rawXmlOrJson);
          var matchResult = jsonStr.match(/<Result>([\s\S]*?)<\/Result>/i);
          if (matchResult && matchResult[1]) {
            jsonStr = matchResult[1];
          }
          return JSON.parse(jsonStr);
        }
      } catch (err) {
        // 若處於離線預覽或無連線環境，安全回退至內建資料引擎
      }
    }

    // 使用本地端統計引擎計算回應 (與後端 C# 控制器輸出格式 100% 對齊)
    if (route.indexOf("/api/v1/dashboard/team-summary") === 0 || route === "GET_TEAM_SUMMARY") {
      var stateFilter = String(params.state || "Active").toLowerCase();
      var typeFilter = String(params.project_type || "1.Standard,2.Professional");
      var allowedTypes = typeFilter.split(",").map(function (s) { return s.trim(); }).filter(Boolean);

      var teamKeys = ["TPS", "ICS", "PMO", "SUS", "SHS", "Other"];
      var teamNames = ["TPS", "ICS", "PMO", "SUS", "SHS", "Other"];
      var teamColors = ["#2563eb", "#0ea5e9", "#8b5cf6", "#10b981", "#f59e0b", "#64748b"];
      var counts = { TPS: 0, ICS: 0, PMO: 0, SUS: 0, SHS: 0, Other: 0 };
      var totalActive = 0;

      this.mockProjects.forEach(function (p) {
        var pState = String(p.state || "").toLowerCase();
        if (stateFilter !== "all" && pState !== stateFilter) return;
        if (typeFilter !== "ALL" && allowedTypes.length > 0 && allowedTypes.indexOf(p.project_type) < 0) return;

        totalActive++;
        var tid = p.team_id || "";
        if (counts.hasOwnProperty(tid)) {
          counts[tid]++;
        } else {
          counts["Other"]++;
        }
      });

      var teams = teamKeys.map(function (key, idx) {
        return {
          team_id: key,
          team_name: teamNames[idx],
          active_count: counts[key] || 0,
          color: teamColors[idx]
        };
      });

      return {
        status: "success",
        route: "/api/v1/dashboard/team-summary",
        total_active_projects: totalActive,
        teams: teams
      };
    }

    if (route.indexOf("/api/v1/dashboard/project") === 0 || route === "GET_PROJECT_DETAIL") {
      var targetNum = Number(params.proj_num || 0);
      var found = this.mockProjects.find(function (p) { return p.proj_num === targetNum; }) || this.mockProjects[0];
      return {
        status: "success",
        project: found,
        wbs_items: found.wbs_items || [],
        assignees: found.assignees || []
      };
    }

    if (route.indexOf("/api/v1/dashboard/assignees") === 0 || route === "GET_ASSIGNEE_WORKLOAD") {
      return {
        status: "success",
        assignees: aggregateCrossProjectAssignees(this.mockProjects, params)
      };
    }

    return buildSummaryFromProjects(this.mockProjects, params);
  };

  var exported = {
    ArasApiClient: ArasApiClient,
    DEFAULT_MOCK_PROJECTS: DEFAULT_MOCK_PROJECTS,
    normalizeStatusColor: normalizeStatusColor,
    safeNumber: safeNumber,
    normalizeTeamCode: normalizeTeamCode,
    escapeXml: escapeXml,
    buildSummaryFromProjects: buildSummaryFromProjects,
    aggregateCrossProjectAssignees: aggregateCrossProjectAssignees
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = exported;
  }
  if (root) {
    root.PMOApi = exported;
  }
})(typeof window !== "undefined" ? window : globalThis);
