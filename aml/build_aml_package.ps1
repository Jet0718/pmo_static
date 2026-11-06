param(
    [ValidateSet("add", "edit")]
    [string]$Action = "edit"
)

# PowerShell 腳本：將後端 PMO_ProjectAnalytics_API.cs 與前端 TOC 設定封裝為標準 Aras AML Import Package
# 嚴格遵循 Aras PackageImportExportUtilities 規範：依據 ItemType 名稱建立子目錄
$ErrorActionPreference = "Stop"

$rootAmlDir = "c:\TEST\pmo_static\aml"
$importDir = Join-Path $rootAmlDir "PMO_Analytics\Import"
$methodDir = Join-Path $importDir "Method"
$itemTypeDir = Join-Path $importDir "ItemType"

# 1. 建立符合 Aras Package 規範之子目錄結構
New-Item -ItemType Directory -Force -Path $methodDir | Out-Null
New-Item -ItemType Directory -Force -Path $itemTypeDir | Out-Null

# 清除舊版非標準單一 XML 檔案（若存在）
$legacyXml = Join-Path $importDir "PMO_ProjectAnalytics_Package.xml"
if (Test-Path $legacyXml) {
    Remove-Item -Force $legacyXml
    Write-Host "已移除舊版單一 XML 檔案: $legacyXml"
}

# 2. 讀取 C# 後端原始碼
$csPath = "c:\TEST\pmo_static\backend\PMO_ProjectAnalytics_API.cs"
$csContent = Get-Content -Raw -Encoding UTF8 $csPath

# 3. 輸出 Method AML: PMO_Analytics\Import\Method\PMO_ProjectAnalytics_API.xml
$methodAml = @"
<AML>
  <!-- 後端 C# RESTful 專案進度狀態分析統計 API Method -->
  <Item type="Method" id="8A91B2C3D4E54F60817293A4B5C6D7E8" action="$Action">
    <execution_allowed_to keyed_name="World" type="Identity">A73B655731924CD0B027E4F4D5FCC0A9</execution_allowed_to>
    <method_code><![CDATA[$csContent]]></method_code>
    <method_type>C#</method_type>
    <name>PMO_ProjectAnalytics_API</name>
    <comments>BDM 系統專案進度狀態分析統計 RESTful API (整合 Project 客製欄位、Ph 1~12、WBS 階段偏差與成員負荷)</comments>
  </Item>
</AML>
"@
$methodFile = Join-Path $methodDir "PMO_ProjectAnalytics_API.xml"
Set-Content -Path $methodFile -Value $methodAml -Encoding UTF8
Write-Host "已產生 Method AML ($Action): $methodFile"

# 4. 輸出 ItemType AML: PMO_Analytics\Import\ItemType\PMO_Progress_Analytics.xml
$itemTypeAml = @"
<AML>
  <!-- 全域多專案進度統計儀表板 TOC View 掛載 ItemType -->
  <Item type="ItemType" id="9B82C3D4E5F64A719283A4B5C6D7E8F9" action="$Action">
    <auto_search>0</auto_search>
    <enforce_keeping_history>0</enforce_keeping_history>
    <hide_where_used>0</hide_where_used>
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
      <!-- TOC Access：掛載於 Portfolio 分類下供 World 與全員檢視 -->
      <Item type="TOC Access" id="7C61D2E3F4A54B828394A5B6C7D8E9F0" action="$Action">
        <category>Portfolio</category>
        <related_id keyed_name="World" type="Identity">A73B655731924CD0B027E4F4D5FCC0A9</related_id>
        <sort_order>128</sort_order>
      </Item>
      <!-- TOC View：點擊後直接於主工作區載入全域多專案進度統計儀表板 HTML5 -->
      <Item type="TOC View" id="6D52E3F4A5B64C939405B6C7D8E9F0A1" action="$Action">
        <related_id keyed_name="World" type="Identity">A73B655731924CD0B027E4F4D5FCC0A9</related_id>
        <sort_order>128</sort_order>
        <start_page>../customer/pmo_static/index.html</start_page>
      </Item>
      <!-- Allowed Permission：標準預設存取權限 (BWCS-CRM 實體 GUID: 9122CD065CF04141B8EFE263FC80BEA4) -->
      <Item type="Allowed Permission" id="5E43F4A5B6C74D048516C7D8E9F0A1B2" action="$Action">
        <is_default>1</is_default>
        <related_id keyed_name="Default Access" type="Permission">9122CD065CF04141B8EFE263FC80BEA4</related_id>
        <sort_order>128</sort_order>
      </Item>
      <!-- Can Add：系統管理員具備新增權限 -->
      <Item type="Can Add" id="4F34A5B6C7D84E159627D8E9F0A1B2C3" action="$Action">
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

# 5. 輸出 Manifest 清單檔
$manifestXml = @"
<imports>
  <package name="com.bdm.pmo.analytics" path="PMO_Analytics\Import" />
</imports>
"@
$manifestFile = Join-Path $rootAmlDir "imports.mf"
Set-Content -Path $manifestFile -Value $manifestXml -Encoding UTF8
Write-Host "已產生 Manifest 清單檔: $manifestFile"

Write-Host "Aras AML Package 生成完畢，完全符合 PackageImportExportUtilities 規範。"
