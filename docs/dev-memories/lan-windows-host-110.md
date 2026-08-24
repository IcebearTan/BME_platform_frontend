---
name: lan-windows-host-110
description: "局域网 192.168.1.110 是 Windows 机器,SSH 须用 Administrator 账户免密登录"
metadata: 
  node_type: memory
  type: reference
  originSessionId: 43eba8b8-5706-4d60-97ba-83b4f51f16fb
  modified: 2026-07-30T04:40:33.053Z
---

局域网主机 `192.168.1.110` = **Windows 10 22H2 家庭中文版** 机器,主机名 `DESKTOP-4L8VEVM`。系统 ACP/OEMCP 仍是 936(GBK),但已做 UTF-8 输出适配(见下),SSH 中文输出正常。

- SSH 服务:OpenSSH for Windows 7.7(版本偏老),端口 22
- **登录用户名必须用 `Administrator`**,不是本机默认的 `icebear`。公钥已写入全机共享的 `C:\ProgramData\ssh\administrators_authorized_keys`,本机 `~/.ssh/id_ed25519`(指纹 SHA256:CKa9drHKjRIvpg66yIEUSAsb+ibdz6ZyfpBuIwcSENI)已授权,免密。
- **默认 shell 已改成 PowerShell**(原 cmd.exe)。改动:注册表 `HKLM\SOFTWARE\OpenSSH` 下 `DefaultShell=C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe`、`DefaultShellCommandOption=-Command`;并写了 `C:\Users\Administrator\Documents\WindowsPowerShell\Microsoft.PowerShell_profile.ps1`,内容三行:`chcp 65001 > $null` / `[Console]::OutputEncoding = [System.Text.Encoding]::UTF8` / `$OutputEncoding = [System.Text.Encoding]::UTF8`。**无需重启**,新会话即时生效。中文输出(PS 原生 / CIM / systeminfo 等外部 .exe)均正常 UTF-8。
- 命令语法按 PowerShell:多条用 `;` 分隔(不是 cmd 的 `&`)。**注意边角**:把中文字面量写进远程命令串当输入(如 `Select-String -Pattern "名称"`)会因入站解码失真,匹配不到 —— 尽量避免在命令里写中文,或改用 CIM/正则。
- **回退到 cmd.exe**:删除上面两个注册表值(`reg delete "HKLM\SOFTWARE\OpenSSH" /v DefaultShell /f` 等),或把 profile 文件删掉。

连接命令:
`ssh -i ~/.ssh/id_ed25519 Administrator@192.168.1.110`
