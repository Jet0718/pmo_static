const fs = require('fs');
const content = fs.readFileSync('backend/PMO_ProjectAnalytics_API.cs', 'utf8');
const prefix = 'public class ArasMethodWrapper : Item\n{\n    public Item methodCode()\n{\n';
const suffix = '\n    }\n}\n';
fs.writeFileSync('tests/BackendTests/MethodWrapperLoader.cs', prefix + content + suffix, 'utf8');
console.log('MethodWrapperLoader updated successfully');
