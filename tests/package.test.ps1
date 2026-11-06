# Aras AML Package 自動化驗證測試
$ErrorActionPreference = "Stop"

Write-Host "=== 開始 Aras AML Package 規範驗證測試 ==="

# 1. 驗證 imports.mf
$mfPath = "c:\TEST\pmo_static\aml\imports.mf"
if (-not (Test-Path $mfPath)) { throw "imports.mf 不存在！" }
[xml]$mfXml = Get-Content $mfPath
$pkgNode = $mfXml.SelectSingleNode("/imports/package")
if ($null -eq $pkgNode -or $pkgNode.name -ne "com.bdm.pmo.analytics") {
    throw "imports.mf 包裹名稱設定不正確！"
}
Write-Host " [PASS] 1. imports.mf 清單檔解析成功: $($pkgNode.name) -> $($pkgNode.path)"

# 2. 驗證目錄與檔案結構
$methodXmlPath = "c:\TEST\pmo_static\aml\PMO_Analytics\Import\Method\PMO_ProjectAnalytics_API.xml"
$itemTypeXmlPath = "c:\TEST\pmo_static\aml\PMO_Analytics\Import\ItemType\PMO_Progress_Analytics.xml"
if (-not (Test-Path $methodXmlPath)) { throw "Method AML 檔案不存在: $methodXmlPath" }
if (-not (Test-Path $itemTypeXmlPath)) { throw "ItemType AML 檔案不存在: $itemTypeXmlPath" }
Write-Host " [PASS] 2. 子目錄架構 (Method/ 與 ItemType/) 存在且符合規範"

# 3. 驗證 Method 與 ItemType 格式
[xml]$mXml = Get-Content $methodXmlPath
$mItem = $mXml.SelectSingleNode("/AML/Item[@type='Method']")
if ($null -eq $mItem -or $mItem.action -ne "add" -or $mItem.name -ne "PMO_ProjectAnalytics_API") {
    throw "Method AML 格式不合規！"
}
Write-Host " [PASS] 3. Method AML 驗證通過: $($mItem.name), Action=$($mItem.action)"

[xml]$itXml = Get-Content $itemTypeXmlPath
$itItem = $itXml.SelectSingleNode("/AML/Item[@type='ItemType']")
if ($null -eq $itItem -or $itItem.action -ne "add" -or $itItem.name -ne "PMO_Progress_Analytics") {
    throw "ItemType AML 格式不合規！"
}
$permRel = $itItem.SelectSingleNode("Relationships/Item[@type='Allowed Permission']/related_id")
if ($null -eq $permRel -or $permRel.InnerText -ne "9122CD065CF04141B8EFE263FC80BEA4") {
    throw "Allowed Permission GUID 不相容！預期 9122CD065CF04141B8EFE263FC80BEA4"
}
$tocView = $itItem.SelectSingleNode("Relationships/Item[@type='TOC View']")
if ($null -eq $tocView -or $tocView.start_page -ne "../customer/pmo_static/index.html") {
    throw "TOC View 設定不正確！"
}
Write-Host " [PASS] 4. ItemType AML 驗證通過: $($itItem.name), TOC View=$($tocView.start_page)"

# 4. 載入 Aras 官方 Libs.dll 中的 build.xsl 執行轉換模擬
$dllPath = "C:\utils\PackageImportExportUtilities_15.0.4\Import\Libs.dll"
if (Test-Path $dllPath) {
    $asm = [System.Reflection.Assembly]::LoadFrom($dllPath)
    $stream = $asm.GetManifestResourceStream("Aras.Tools.SolutionUpgrade.build.xsl")
    $reader = New-Object System.IO.StreamReader($stream)
    $xslContent = $reader.ReadToEnd()

    $combinedXml = "<AML><AML>" + $mItem.OuterXml + $itItem.OuterXml + "</AML></AML>"
    $xslDoc = New-Object System.Xml.XmlDocument
    $xslDoc.LoadXml($xslContent)

    $xslt = New-Object System.Xml.Xsl.XslCompiledTransform
    $xslt.Load($xslDoc)

    $inDoc = New-Object System.Xml.XmlDocument
    $inDoc.LoadXml($combinedXml)

    $sw = New-Object System.IO.StringWriter
    $xslt.Transform($inDoc, $null, $sw)
    $resDoc = New-Object System.Xml.XmlDocument
    $resDoc.LoadXml($sw.ToString())

    $transformedItems = $resDoc.SelectNodes("AML/Item")
    if ($transformedItems.Count -ne 2) {
        throw "Aras build.xsl 轉換後項目數量不符，預期 2，實際 $($transformedItems.Count)"
    }
    Write-Host " [PASS] 5. Aras 官方 PackageImportExportUtilities (build.xsl) 模擬轉換成功！轉換項目數: $($transformedItems.Count)"
} else {
    Write-Host " [SKIP] 5. 未找到 Libs.dll，略過 build.xsl 模擬"
}

Write-Host "=== 所有 AML Package 驗證測試全部通過 ==="
