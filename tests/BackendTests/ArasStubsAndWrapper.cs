// ============================================================================
// 檔案名稱：ArasStubsAndWrapper.cs
// 用途：模擬 Aras.IOM (Innovator / Item) 與 ItemMethod.methodCode() 外殼，
//       以便直接編譯並對 backend/PMO_ProjectAnalytics_API.cs 進行單元測試。
// ============================================================================

/// <summary>
/// 模擬 Aras IOM Innovator 類別
/// </summary>
public class Innovator
{
    public Item newItem(string typeName, string action)
    {
        return new Item(typeName, action);
    }

    public Item newResult(string text)
    {
        Item res = new Item("Result", "");
        res.ResultText = text;
        return res;
    }

    public Item newError(string errorMessage)
    {
        Item err = new Item("Error", "");
        err.IsErrorFlag = true;
        err.ErrorMessage = errorMessage;
        return err;
    }
}

/// <summary>
/// 模擬 Aras IOM Item 類別
/// </summary>
public class Item
{
    private readonly System.Collections.Generic.Dictionary<string, string> _props =
        new System.Collections.Generic.Dictionary<string, string>();
    private readonly System.Collections.Generic.Dictionary<string, string> _attrs =
        new System.Collections.Generic.Dictionary<string, string>();
    private readonly System.Collections.Generic.Dictionary<string, string> _propAttrs =
        new System.Collections.Generic.Dictionary<string, string>();
    private readonly Innovator _inn = new Innovator();

    public string TypeName { get; set; }
    public string ActionName { get; set; }
    public string IdValue { get; set; }
    public bool IsErrorFlag { get; set; }
    public string ErrorMessage { get; set; }
    public string ResultText { get; set; }

    public Item() : this("Item", "") { }

    public Item(string typeName, string action)
    {
        this.TypeName = typeName;
        this.ActionName = action;
        this.IdValue = "";
    }

    public Innovator getInnovator()
    {
        return this._inn;
    }

    public string getID()
    {
        return this.IdValue;
    }

    public void setAttribute(string name, string value)
    {
        this._attrs[name] = value;
    }

    public void setProperty(string name, string value)
    {
        this._props[name] = value;
    }

    public string getProperty(string name, string defaultValue)
    {
        if (this._props.ContainsKey(name) && this._props[name] != null)
        {
            return this._props[name];
        }
        return defaultValue;
    }

    public void setPropertyAttribute(string propName, string attrName, string value)
    {
        this._propAttrs[propName + "@" + attrName] = value;
    }

    public string getPropertyAttribute(string propName, string attrName, string defaultValue)
    {
        string key = propName + "@" + attrName;
        if (this._propAttrs.ContainsKey(key) && this._propAttrs[key] != null)
        {
            return this._propAttrs[key];
        }
        return defaultValue;
    }

    public Item apply()
    {
        return this;
    }

    public bool isError()
    {
        return this.IsErrorFlag;
    }

    public int getItemCount()
    {
        return 0;
    }

    public Item getItemByIndex(int index)
    {
        return this;
    }
}
