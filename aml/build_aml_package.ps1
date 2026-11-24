param(
    [ValidateSet("add", "edit")]
    [string]$Action = "add"
)

# PowerShell 腳本：將後端 PMO_ProjectAnalytics_API.cs、前端 TOC 設定、專案停滯原因清單 (List) 與 Project Property 封裝為標準 Aras AML Import Package
# 嚴格遵循 Aras PackageImportExportUtilities 規範：依據 ItemType 名稱建立子目錄
$ErrorActionPreference = "Stop"

$rootAmlDir = "c:\TEST\pmo_static\aml"
$importDir = Join-Path $rootAmlDir "PMO_Analytics\Import"
$methodDir = Join-Path $importDir "Method"
$itemTypeDir = Join-Path $importDir "ItemType"
$listDir = Join-Path $importDir "List"

# 1. 建立符合 Aras Package 規範之子目錄結構
New-Item -ItemType Directory -Force -Path $methodDir | Out-Null
New-Item -ItemType Directory -Force -Path $itemTypeDir | Out-Null
New-Item -ItemType Directory -Force -Path $listDir | Out-Null

# 清除舊版非標準單一 XML 檔案（若存在）
$legacyXml = Join-Path $importDir "PMO_ProjectAnalytics_Package.xml"
if (Test-Path $legacyXml) {
    Remove-Item -Force $legacyXml
    Write-Host '已移除舊版單一 XML 檔案: ' + $legacyXml
}

# 2. 讀取 C# 後端原始碼
$csPath = "c:\TEST\pmo_static\backend\PMO_ProjectAnalytics_API.cs"
$csContent = Get-Content -Raw -Encoding UTF8 $csPath

# 3. 輸出 Method AML: PMO_Analytics\Import\Method\PMO_ProjectAnalytics_API.xml
# 注意：Method 為 Versionable ItemType，每次進版皆會產生新 id，故 edit 模式下以 where="[Method].[name]='PMO_ProjectAnalytics_API'" 定位現有最新版
$methodIdOrWhere = if ($Action -eq "edit") { 'where="[Method].[name]=''PMO_ProjectAnalytics_API''"' } else { 'id="8A91B2C3D4E54F60817293A4B5C6D7E8"' }
$methodAml = @"
<AML>
  <!-- 後端 C# RESTful 專案進度狀態分析統計 API Method -->
  <Item type="Method" $methodIdOrWhere action="$Action">
    <execution_allowed_to keyed_name="World" type="Identity">A73B655731924CD0B027E4F4D5FCC0A9</execution_allowed_to>
    <method_code><![CDATA[$csContent]]></method_code>
    <method_type>C#</method_type>
    <name>PMO_ProjectAnalytics_API</name>
    <comments>BDM 系統專案進度狀態分析統計 RESTful API (整合 Project 客製欄位、Ph 1~12、WBS 階段偏差、成員負荷、雙軌健康度分流與延遲天數校正)</comments>
  </Item>
</AML>
"@
$methodFile = Join-Path $methodDir "PMO_ProjectAnalytics_API.xml"
Set-Content -Path $methodFile -Value $methodAml -Encoding UTF8
Write-Host "已產生 Method AML ($Action): $methodFile"

# 4. 輸出 List AML: PMO_Analytics\Import\List\cn_project_stall_reason.xml
$listAction = if ($Action -eq "edit") { "edit" } else { "add" }
$listAml = @"
<AML>
  <!-- 專案停滯/阻礙原因下拉清單 (List) -->
  <Item type="List" id="3A4B5C6D7E8F40129384B5C6D7E8F9A0" action="$listAction">
    <name>cn_project_stall_reason</name>
    <label xml:lang="en">Project Stall Reason</label>
    <label xml:lang="zc">專案停滯/阻礙原因</label>
    <description>專案進度停滯原因歸類清單 (區分外部受阻、商務爭議與內部瓶頸，防數據污染)</description>
    <Relationships>
      <Item type="Value" id="1A11B22C33D44E55F66A77B88C99D0E1" action="merge">
        <value>wait_cust_system</value>
        <label xml:lang="en">Waiting for Customer System</label>
        <label xml:lang="zc">等待客戶系統一併上線</label>
        <sort_order>10</sort_order>
      </Item>
      <Item type="Value" id="2A22B33C44D55E66F77A88B99C00D1E2" action="merge">
        <value>commercial_dispute</value>
        <label xml:lang="en">Commercial Dispute</label>
        <label xml:lang="zc">商務/合約追加款爭議</label>
        <sort_order>20</sort_order>
      </Item>
      <Item type="Value" id="3A33B44C55D66E77F88A99B00C11D2E3" action="merge">
        <value>cust_hold</value>
        <label xml:lang="en">Customer Hold / Delay</label>
        <label xml:lang="zc">客戶端專案暫停/延期</label>
        <sort_order>30</sort_order>
      </Item>
      <Item type="Value" id="4A44B55C66D77E88F99A00B11C22D3E4" action="merge">
        <value>cust_scope_change</value>
        <label xml:lang="en">Customer Scope Change</label>
        <label xml:lang="zc">客戶需求重大變更</label>
        <sort_order>40</sort_order>
      </Item>
      <Item type="Value" id="5A55B66C77D88E99F00A11B22C33D4E5" action="merge">
        <value>internal_bottleneck</value>
        <label xml:lang="en">Internal Bottleneck</label>
        <label xml:lang="zc">內部團隊技術/資源瓶頸</label>
        <sort_order>50</sort_order>
      </Item>
      <Item type="Value" id="6A66B77C88D99E00F11A22B33C44D5E6" action="merge">
        <value>none</value>
        <label xml:lang="en">None (Normal)</label>
        <label xml:lang="zc">無停滯/正常執行</label>
        <sort_order>60</sort_order>
      </Item>
    </Relationships>
  </Item>
</AML>
"@
$listFile = Join-Path $listDir "cn_project_stall_reason.xml"
Set-Content -Path $listFile -Value $listAml -Encoding UTF8
Write-Host "已產生 List AML ($listAction): $listFile"

# 5. 輸出 ItemType AML: PMO_Analytics\Import\ItemType\PMO_Progress_Analytics.xml
$itemTypeAml = @"
<AML>
  <!-- 全域多專案進度統計儀表板 TOC View 掛載 ItemType -->
  <Item type="ItemType" id="99C2CCD2BC6C477B83EF901273C45592" action="$Action">
    <auto_search>0</auto_search>
    <enforce_keeping_history>0</enforce_keeping_history>
    <hide_where_used>0</hide_where_used>
    <is_relationship>0</is_relationship>
    <is_versionable>0</is_versionable>
    <label xml:lang="en">PMO Analytics</label>
    <label xml:lang="zc">PMO 專案進度統計儀表板</label>
    <label_plural xml:lang="en">PMO Analytics</label_plural>
    <label_plural xml:lang="zc">PMO 專案進度統計儀表板</label_plural>
    <large_icon>../images/Project.svg</large_icon>
    <open_icon>../images/Project.svg</open_icon>
    <name>PMO_Progress_Analytics</name>
    <show_parameters_tab>0</show_parameters_tab>
    <structure_view>tabs off</structure_view>
    <unlock_on_logout>0</unlock_on_logout>
    <use_src_access>0</use_src_access>
    <Relationships>
      <!-- 顯式指定關聯至既有之 Global Presentation Configuration，避免 Aras 核心自動生成 CUI 引發主鍵衝突 -->
      <Item type="ITPresentationConfiguration" id="E871251F1A47436D8FA3491DCC550351" action="$Action">
        <client>js</client>
        <related_id keyed_name="Global" type="PresentationConfiguration">
          <Item type="PresentationConfiguration" action="get" select="id">
            <name>Global</name>
          </Item>
        </related_id>
        <sort_order>128</sort_order>
      </Item>
      <!-- TOC Access：掛載於 Portfolio 分類下供 World 與全員檢視 -->
      <Item type="TOC Access" id="43E51019F1654148957E0391A9DC04EF" action="$Action">
        <category>Portfolio</category>
        <related_id keyed_name="World" type="Identity">A73B655731924CD0B027E4F4D5FCC0A9</related_id>
        <sort_order>128</sort_order>
      </Item>
      <!-- TOC View：點擊後直接於主工作區載入全域多專案進度統計儀表板 HTML5 -->
      <Item type="TOC View" id="270971C4611F47FB8F9F5160AD51AFEF" action="$Action">
        <related_id keyed_name="World" type="Identity">A73B655731924CD0B027E4F4D5FCC0A9</related_id>
        <sort_order>128</sort_order>
        <start_page>../customer/pmo_static/index.html</start_page>
      </Item>
      <!-- Allowed Permission：標準預設存取權限 (BWCS-CRM 實體 GUID: 9122CD065CF04141B8EFE263FC80BEA4) -->
      <Item type="Allowed Permission" id="4219039360C941C69750ACC22EFA2410" action="$Action">
        <is_default>1</is_default>
        <related_id keyed_name="Default Access" type="Permission">9122CD065CF04141B8EFE263FC80BEA4</related_id>
        <sort_order>128</sort_order>
      </Item>
      <!-- Can Add：系統管理員具備新增權限 -->
      <Item type="Can Add" id="A99AFE0CB9874A638D92BE07C932F530" action="$Action">
        <can_add>1</can_add>
        <related_id keyed_name="Administrators" type="Identity">2618D6F5A90949BAA7E920D1B04C7EE1</related_id>
        <sort_order>128</sort_order>
      </Item>
    </Relationships>
  </Item>
</AML>
"@
$itemTypeFile = Join-Path $itemTypeDir "PMO_Progress_Analytics.xml"
Set-Content -Path $itemTypeFile -Value $itemTypeAml -Encoding UTF8
Write-Host "已產生 ItemType AML ($Action): $itemTypeFile"

# 6. 輸出 Project 擴充 Property AML: PMO_Analytics\Import\ItemType\Project.xml
$projectPropAml = @"
<AML>
  <!-- 擴充既有 Project ItemType 之停滯/阻礙原因屬性 (cn_stall_reason) -->
  <Item type="ItemType" id="02184EDAA80D499CB6EC94B159966DBE" action="edit">
    <name>Project</name>
    <Relationships>
      <Item type="Property" id="8E7D6C5B4A3F40129384B5C6D7E8F9A1" action="merge">
        <name>cn_stall_reason</name>
        <label xml:lang="en">Stall Reason</label>
        <label xml:lang="zc">專案停滯/阻礙原因</label>
        <data_type>list</data_type>
        <data_source keyed_name="cn_project_stall_reason" type="List">3A4B5C6D7E8F40129384B5C6D7E8F9A0</data_source>
        <default_value>none</default_value>
        <is_required>0</is_required>
        <is_indexed>0</is_indexed>
        <is_hidden>0</is_hidden>
        <is_hidden2>0</is_hidden2>
        <stored_length>64</stored_length>
        <sort_order>9999</sort_order>
        <help_tooltip xml:lang="zc">停滯阻礙歸因：區分外部受阻、商務爭議與內部瓶頸，防數據污染</help_tooltip>
      </Item>
    </Relationships>
  </Item>
</AML>
"@
$projectPropFile = Join-Path $itemTypeDir "Project.xml"
Set-Content -Path $projectPropFile -Value $projectPropAml -Encoding UTF8
Write-Host "已產生 Project Property AML (merge): $projectPropFile"

# 7. 輸出 Manifest 清單檔
$manifestXml = @"
<imports>
  <package name="com.bdm.pmo.analytics" path="PMO_Analytics\Import" />
</imports>
"@
$manifestFile = Join-Path $rootAmlDir "imports.mf"
Set-Content -Path $manifestFile -Value $manifestXml -Encoding UTF8
Write-Host "已產生 Manifest 清單檔: $manifestFile"

Write-Host 'Aras AML Package 生成完畢，完全符合 PackageImportExportUtilities 規範。 '
