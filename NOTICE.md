# NOTICE

`dsh-effort-slider` 是多个社区轮子的组合，按 MIT 许可保留原始版权声明（全文见 `LICENSES/`）。

## 1. Codex 1:1 推理滑杆 UI（本插件的浏览器半大部分代码）

- 项目：`bakabaicai/DSH-Codex-reasoning-effort-slider`
  （https://github.com/bakabaicai/DSH-Codex-reasoning-effort-slider）
- 作者：Nachoneko_miao
- 许可：MIT，Copyright (c) 2026 Nachoneko_miao
- 使用方式：`scripts/build-client.mjs` 从 `vendor/codex-reasoning-effort-slider-client.js`
  读取其单文件 bundle，替换模块 id、补上 `/effort-slider/state` 的 Host 同步、
  以 `priority: -1` 显式 shadow 原生模型位，生成 `client.js`。UI 结构、CSS、粒子/流光动画、
  模型切换面板均来自该项目。
- 有意偏离上游的几处（详见 README「相对上游的改动」）：
  1. 滑轨几何：手柄 26px 与滑轨同高并完全落在轨内；填充填到手柄右缘；填充两端始终 16px 圆角；
  2. 手柄改为显式白色渐变实体（不用可能半透明的主题 token），悬停改用光环而非放大；
  3. 档位圆点改成实心白点；
  4. 拖动改为连续跟手、松手才吸附最近档；
  5. `Fast` 从纯装饰改为真实注入「快速模式」提示词（上游 README 明确它无实际作用）；
  6. 模块 id 与 Host 状态同步为本插件服务。
- `Fast` 的语义改动是本仓库自己的选择，不是上游作者的主张。

## 2. Host 注入骨架

- 项目：`lizilong1993/dsh-unlimited-effort`（MIT）
- 复用了它的：composer slot 注册方式、`ctx.modelDirectories` 读取推理强度、每会话状态文件的
  原子写入与上限策略、loopback 状态路由、`systemPrompt.section` 按会话/档位动态注入的 gate 结构。
  本仓库 `lib/state.js`、`lib/route.js`、`lib/gate.js` 是在其上的重写：改为记录「最右档 id」，
  并且只在请求实际处于该档时注入。

## 3. 其它

- `RorschachXR/dsh-full-throttle`（仓库未声明许可证）：未复制其代码，仅参考了单文件对
  `window.__ModuleLoader__` 的打包形态与主题兼容 CSS 的写法（本插件已换用上面的 Codex 复刻实现）。
- DeepSeek Harness 的插件 API、slot 体系、`systemPrompt` 与 `webServer` 服务均为其公开接口。
- 注入文本灵感来自 DSH 仓库 `docs/testing.zh.md` 的公开测试策略一节。

## 0.2.3发布说明

另含Fast/重置工具提示的不透明菜单面、边框和阴影patch。MIT全文及原作者版权行原样保留；当前采用的vendor字节身份记录在包内package-manifest.json中，不把上游当前main冒充原始采用提交。代码许可不构成OpenAI/DeepSeek名称、商标或官方合作授权。效果图为提供的局部插件界面，未含账号、聊天或个人媒体。
