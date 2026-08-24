---
name: python-uv-toolchain
description: Python 项目用 uv 管理包(非 pip);requirements.txt 注释必须 ASCII
metadata: 
  node_type: memory
  type: feedback
  originSessionId: a08f9566-4c2d-47ab-ae75-f02a1efa61fd
---

用户偏好用 **uv** 管理 Python 包,不要默认用 pip。

**Why:** uv 比 pip 快得多(并行下载+缓存),用户机器已装 uv 0.11+。BambuPrinterGateway 也用 uv(uv.lock + pyproject.toml)。

**How to apply:** 建 venv 用 `uv venv`,装包用 `uv pip install -r requirements.txt --python <venvpython>`。坑:Windows 下 requirements.txt 含中文注释会让 pip/uv 报 `gbk codec can't decode byte`(auto_decode 用 locale 编码)——requirements.txt 注释一律用英文/ASCII。uv 会自动下载管理 Python(uv venv 在 3.11 系统上装了 3.12.11)。
