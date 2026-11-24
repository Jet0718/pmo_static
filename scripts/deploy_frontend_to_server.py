# ============================================================================
# 檔案名稱：deploy_frontend_to_server.py
# 用途：將 c:\TEST\pmo_static\frontend\ 目錄下的前端靜態資源透過 Aras Server Method
#       一鍵同步部署至遠端 Aras Innovator 伺服器之 Client\customer\pmo_static\ 目錄
# ============================================================================

import os
import base64
import requests as req

FRONTEND_DIR = r"C:\TEST\pmo_static\frontend"

# 目標檔案清單 (相對路徑)
TARGET_FILES = [
    "index.html",
    os.path.join("css", "dashboard.css"),
    os.path.join("js", "arasApiClient.js"),
    os.path.join("js", "dashboardApp.js"),
    os.path.join("js", "dashboardStore.js"),
    os.path.join("js", "svgChartEngine.js"),
]

def main():
    print("=== 1. 取得 BDM-Test OAuth Token ===")
    token_url = "https://bco.openplm.com.tw/innovatorbw/oauthserver/connect/token"
    auth_data = {
        "grant_type": "password",
        "scope": "Innovator",
        "client_id": "IOMApp",
        "username": "jet.lo",
        "password": "607d54f1548e53ab47d15837a0423dfe",
        "database": "BDM-Test"
    }
    res = req.post(token_url, data=auth_data)
    if res.status_code != 200:
        print("取得 Token 失敗:", res.text)
        return False
    auth_token = res.json()["access_token"]
    print("Token 取得成功.")

    soap_url = "https://bco.openplm.com.tw/innovatorbw/Server/InnovatorServer.aspx"
    headers_aml = {
        "SOAPAction": "ApplyAML",
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "text/xml; charset=utf-8"
    }
    headers_method = {
        "SOAPAction": "ApplyMethod",
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "text/xml; charset=utf-8"
    }

    print("\n=== 2. 建立伺服器同步專用 Method PMO_Deploy_Frontend ===")
    deploy_method_code = r"""
Innovator inn = this.getInnovator();
try
{
    string baseDir = System.AppDomain.CurrentDomain.BaseDirectory;
    string targetRoot = System.IO.Path.GetFullPath(System.IO.Path.Combine(baseDir, @"..\Client\customer\pmo_static"));
    if (!System.IO.Directory.Exists(targetRoot))
    {
        System.IO.Directory.CreateDirectory(targetRoot);
    }

    string relPath = this.getProperty("rel_path", "");
    string b64Content = this.getProperty("b64_content", "");

    if (string.IsNullOrEmpty(relPath) || string.IsNullOrEmpty(b64Content))
    {
        return inn.newError("rel_path 與 b64_content 不得為空");
    }

    string fullPath = System.IO.Path.Combine(targetRoot, relPath);
    string subDir = System.IO.Path.GetDirectoryName(fullPath);
    if (!System.IO.Directory.Exists(subDir))
    {
        System.IO.Directory.CreateDirectory(subDir);
    }

    byte[] bytes = System.Convert.FromBase64String(b64Content);
    System.IO.File.WriteAllBytes(fullPath, bytes);

    return inn.newResult("OK: " + relPath + " (" + bytes.Length + " bytes)");
}
catch (System.Exception ex)
{
    return inn.newError("部署失敗: " + ex.Message);
}
"""

    create_method_aml = f"""
<Item type="Method" action="merge" where="[Method].[name]='PMO_Deploy_Frontend'">
  <name>PMO_Deploy_Frontend</name>
  <method_type>C#</method_type>
  <execution_allowed_to keyed_name="World" type="Identity">A73B655731924CD0B027E4F4D5FCC0A9</execution_allowed_to>
  <comments>PMO 儀表板前端靜態資源同步部署專用 Method</comments>
  <method_code><![CDATA[{deploy_method_code}]]></method_code>
</Item>
"""
    soap_body = f"""<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/">
  <SOAP-ENV:Body>
    <ApplyAML>
      <AML>
        {create_method_aml}
      </AML>
    </ApplyAML>
  </SOAP-ENV:Body>
</SOAP-ENV:Envelope>"""
    r_create = req.post(soap_url, headers=headers_aml, data=soap_body.encode("utf-8"))
    if r_create.status_code != 200 or "Fault" in r_create.text:
        print("建立 Method 失敗:", r_create.text)
        return False
    print("Method PMO_Deploy_Frontend 建立成功。")

    print("\n=== 3. 逐檔同步靜態資源至伺服器 ===")
    for rel_path in TARGET_FILES:
        local_path = os.path.join(FRONTEND_DIR, rel_path)
        if not os.path.isfile(local_path):
            print(f"找不到本地檔案: {local_path}，跳過")
            continue
        with open(local_path, "rb") as f:
            b64_str = base64.b64encode(f.read()).decode("ascii")

        # 統一使用正斜線或路徑傳遞
        clean_rel_path = rel_path.replace("/", "\\")
        method_call_xml = f"""<Item type="Method" action="PMO_Deploy_Frontend">
  <rel_path>{clean_rel_path}</rel_path>
  <b64_content>{b64_str}</b64_content>
</Item>"""
        call_body = f"""<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/">
  <SOAP-ENV:Body>
    {method_call_xml}
  </SOAP-ENV:Body>
</SOAP-ENV:Envelope>"""
        r_file = req.post(soap_url, headers=headers_method, data=call_body.encode("utf-8"))
        if r_file.status_code == 200 and "<Result>OK:" in r_file.text:
            print(f"  [PASS] 同步成功: {clean_rel_path}")
        else:
            print(f"  [FAIL] 同步失敗: {clean_rel_path} -> {r_file.text}")

    print("\n=== 4. 清理臨時部署 Method PMO_Deploy_Frontend ===")
    cleanup_aml = """<Item type="Method" action="delete" where="[Method].[name]='PMO_Deploy_Frontend'" />"""
    clean_body = f"""<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/">
  <SOAP-ENV:Body>
    <ApplyAML>
      <AML>
        {cleanup_aml}
      </AML>
    </ApplyAML>
  </SOAP-ENV:Body>
</SOAP-ENV:Envelope>"""
    r_del = req.post(soap_url, headers=headers_aml, data=clean_body.encode("utf-8"))
    print("清理完成，狀態:", r_del.status_code)

    print("\n=== 5. 驗證遠端伺服器上的 dashboardApp.js 是否為最新版本 ===")
    check_url = "https://bco.openplm.com.tw/innovatorbw/Client/customer/pmo_static/js/dashboardApp.js"
    res_check = req.get(check_url)
    remote_js = res_check.text
    has_stall_badges = "renderProjectStallBadges" in remote_js
    has_stall_reason = "stall_reason" in remote_js
    print(f"遠端 dashboardApp.js 大小: {len(remote_js)} 字元")
    print(f"包含 renderProjectStallBadges: {has_stall_badges}")
    print(f"包含 stall_reason: {has_stall_reason}")

    if has_stall_badges and has_stall_reason:
        print("\n>>> 部署成功！遠端伺服器靜態資源已完全同步為最新版本！<<<")
        return True
    else:
        print("\n>>> 驗證失敗：遠端檔案內容未更新！<<<")
        return False

if __name__ == "__main__":
    main()
