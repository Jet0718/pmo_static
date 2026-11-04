# PowerShell 腳本：將後端 PMO_ProjectAnalytics_API.cs 與前端 TOC 設定封裝為標準 Aras AML Import Package
$ErrorActionPreference = "Stop"

$csPath = "c:\TEST\pmo_static\backend\PMO_ProjectAnalytics_API.cs"
$csContent = Get-Content -Raw -Encoding UTF8 $csPath

$amlDir = "c:\TEST\pmo_static\aml\PMO_Analytics\Import"
New-Item -ItemType Directory -Force -Path $amlDir | Out-Null

$methodAml = @"
<AML>
  <!-- 1. 後端 C# RESTful 專案進度狀態分析統計 API Method -->
  <Item type="Method" id="8A91B2C3D4E54F60817293A4B5C6D7E8" action="merge">
    <name>PMO_ProjectAnalytics_API</name>
    <method_type>C#</method_type>
    <execution_allowed_to keyed_name="World" type="Identity">A73B655731924CD0B027E4F4D5FCC0A9</execution_allowed_to>
    <comments>BDM 系統專案進度狀態分析統計 RESTful API (整合 Project 客製欄位、Ph 1~12、WBS 階段偏差與成員負荷)</comments>
    <method_code><![CDATA[$csContent]]></method_code>
  </Item>

  <!-- 2. 全域多專案進度統計儀表板 TOC View 掛載 ItemType (Poly / 無額外資料表負擔) -->
  <Item type="ItemType" id="9B82C3D4E5F64A719283A4B5C6D7E8F9" action="merge">
    <name>PMO_Progress_Analytics</name>
    <label xml:lang="zc">PMO 專案進度統計儀表板</label>
    <label_plural xml:lang="zc">PMO 專案進度統計儀表板</label_plural>
    <implementation_type>table</implementation_type>
    <is_relationship>0</is_relationship>
    <is_versionable>0</is_versionable>
    <revisions keyed_name="Default" type="Revision">7FE395DD8B9F4E1090756A34B733D75E</revisions>
    <show_parameters_tab>0</show_parameters_tab>
    <Relationships>
      <!-- TOC Access：預設掛載於 Portfolio 類別下供 All Employees 與 World 檢視 -->
      <Item type="TOC Access" id="7C61D2E3F4A54B828394A5B6C7D8E9F0" action="merge">
        <related_id keyed_name="World" type="Identity">A73B655731924CD0B027E4F4D5FCC0A9</related_id>
        <category>Portfolio</category>
        <sort_order>128</sort_order>
      </Item>
      <!-- TOC View：點擊後直接於主工作區載入全域多專案進度統計儀表板 -->
      <Item type="TOC View" id="6D52E3F4A5B64C939405B6C7D8E9F0A1" action="merge">
        <related_id keyed_name="World" type="Identity">A73B655731924CD0B027E4F4D5FCC0A9</related_id>
        <start_page>../customer/pmo_static/index.html</start_page>
        <sort_order>128</sort_order>
      </Item>
      <!-- Allowed Permission：標準預設權限 -->
      <Item type="Allowed Permission" id="5E43F4A5B6C74D048516C7D8E9F0A1B2" action="merge">
        <is_default>1</is_default>
        <related_id keyed_name="Project" type="Permission">95475AE006E7415794BDC93808DC04D2</related_id>
        <sort_order>128</sort_order>
      </Item>
      <!-- Can Add：標準新增權限 -->
      <Item type="Can Add" id="4F34A5B6C7D84E159627D8E9F0A1B2C3" action="merge">
        <can_add>1</can_add>
        <related_id keyed_name="Project Management" type="Identity">E17902956C434B1D80D2B819092857C3</related_id>
        <sort_order>128</sort_order>
      </Item>
    </Relationships>
  </Item>
</AML>
"@

Set-Content -Path "$amlDir\PMO_ProjectAnalytics_Package.xml" -Value $methodAml -Encoding UTF8

$manifestXml = @"
<imports>
  <package name="com.bdm.pmo.analytics" path="PMO_Analytics\Import" />
</imports>
"@

Set-Content -Path "c:\TEST\pmo_static\aml\imports.mf" -Value $manifestXml -Encoding UTF8
Write-Host "AML Package generated successfully."
