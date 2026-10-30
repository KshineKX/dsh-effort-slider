# HANDOFF · dsh-effort-slider 0.2.15

给 Codex / 审阅者的交接说明。先读这份，再按「验证」跑一遍，最后按「Review 重点」看代码。

## 1. 这是什么

DeepSeek Harness（DSH）桌面版 composer 的一个插件：

- 把原生「模型选择」位替换成 **Codex 桌面版同款思考强度滑块**（模型名 + 档位 + 闪电 Fast + 重置 + 圆点滑轨 + 粒子/流光/Ultra 爆发）。
- 档位来自模型适配器公布的 `reasoning.efforts`（DeepSeek：`off/low/high/max`），最右档显示为 **Ultra**。
- **Ultra = 火力全开**：拉到最右档时，按会话向系统提示词注入一段「预算无上限」；离开 Ultra 自动解除。
- **Fast 开关是真实功能**：打开后注入一段「快速模式」提示词（速度优先、少发散、少重复验证），可与任意档位组合；它不改变模型速度、不改变计费，README/ tooltip 都写明了。
- 支持拖动连续跟手、松手吸附最近档；档位点是实心白点；手柄是与滑轨同高的不透明白色圆钮；填充两端始终圆角。

## 2. 来源与许可（必读）

本仓库是**衍生作品**，不是从零实现：

| 来源 | 用途 | 许可 | 处理 |
|---|---|---|---|
| [bakabaicai/DSH-Codex-reasoning-effort-slider](https://github.com/bakabaicai/DSH-Codex-reasoning-effort-slider)（Nachoneko_miao） | 浏览器层 UI 基座（结构/CSS/粒子/模型面板） | MIT | 原样放入 `vendor/codex-reasoning-effort-slider-client.js`，由 `scripts/build-client.mjs` 构建时打补丁；版权与许可全文见 `LICENSES/`、`NOTICE.md` |
| [lizilong1993/dsh-unlimited-effort](https://github.com/lizilong1993/dsh-unlimited-effort) | Host 注入骨架（slot 注册、每会话状态、loopback 路由、prompt section gate） | MIT | 思路参考后重写为 `lib/state.js`、`lib/gate.js`、`lib/route.js`；许可见 `LICENSES/` |
| RorschachXR/dsh-full-throttle | 仅早期参考 | 无 LICENSE | **未拷贝任何代码**，仓库中不包含其产物 |

- 自己的代码：`index.js`、`lib/*`、`scripts/build-client.mjs`、`test/*`、`vendor` 以外的全部内容，MIT（见 `LICENSE`）。
- 发布/宣传时请保留 `NOTICE.md` 与两个上游 MIT 许可文件；不要声称 UI 原画为原创。

## 3. 目录结构

```
index.js                     Host 半：两个 systemPrompt.section + /effort-slider/state 路由
lib/state.js                 每会话状态 { throttle, topEffortId, fast }，原子写、上限 256
lib/gate.js                  两个注入 predicate（throttle 需 effort==记录值；fast 独立）
lib/route.js                 loopback 判定 / JSON body 读取 / JSON 响应
client.js                    构建产物（不要手改；由 scripts/build-client.mjs 生成）
vendor/…-client.js           上游 MIT 单文件 bundle（UI 基座，构建输入）
scripts/build-client.mjs     确定性构建：vendor → 20+ 处 patch → client.js
test/*.mjs                   Host 测试 / bundle 不变量 / VM 加载测试
docs/preview.png             README 用的效果图
cordis.patch.yml             插件装配行
dsh.plugin.json             插件描述（client.main）
```

## 4. 运行与验证

要求：Node ≥ 20；DSH `0.2.x`（本机在 `0.2.1-rc.3` 实测）。

```bat
node scripts/build-client.mjs
:: expected: built .../client.js (53186 bytes)

node test/host.test.mjs             :: 8 pass
node test/client-static.test.mjs    :: 14 pass
node test/client-load.test.mjs      :: 1 pass
node test/client-behavior.test.mjs  :: 9 pass   (真实组件回调 + hook 调度夹具)

:: 验证注入真的进了 system prompt（读会话日志的 system/message 事件）
node tools/inspect-session.mjs
```

构建是确定性的：连续两次构建 `client.js` 的 SHA-256 应一致（本机 `C1B6BB6A…EBFEF2`）。测试不联网、不写真实 `~/.dsh`（Host 测试用临时 `DSH_HOME`）。

> 注意：注入发生在 system prompt，不在模型 CoT。`tools/inspect-session.mjs` 读的是 DSH 会话日志
> `~/.dsh/sessions/<cwd>/<session>/session.v4.jsonl.zstd` 里的 `system/message` 事件（source 为
> `system-prompt`），能列出哪些请求带了 Ultra/Fast 段；CoT 里看不到注入句属于正常现象。

安装（桌面版）：

```
Plugins → Add plugin → 本仓库地址 / 本地目录 → 重启 DSH
```

## 5. 数据流（为什么这么设计）

```
用户拖滑杆
  → ModelDirectory.select({ provider, model, reasoningEffort })   // 与原生模型菜单同一条路径
  → 共享目录的 live selection 更新
  → 客户端 effect 对账 → POST /effort-slider/state { sessionId, enabled?, topEffortId?, fast? }
  → Host 下一次组装请求时 gate：
       throttle：本会话 throttle=true 且当前 request effort == recorded topEffortId
       fast    ：本会话 fast=true（与 effort 无关）
  → 命中则注入对应 systemPrompt.section（order 10250 / 10240）
```

验证方式（重要）：注入只出现在 **system prompt**，不会出现在模型 CoT/思考文本里。
DSH 会话日志的 `system/message` 事件（`source.kind="system-prompt"`）保存了每个请求实际渲染的
system prompt；`tools/inspect-session.mjs` 会解压 `session.v4.jsonl.zstd` 并按 seq/时间列出
带注入的请求。也可以用 loopback 接口
`GET /effort-slider/state?sessionId=<id>` 看 `enabled` / `fast` / `topEffortId` 实时状态。

- 注入不是「真的给额度」，只是提示词；计费照旧按 token。
- Host 端 gate 是**双重保险**：即使客户端状态没清，effort 不在最右档也不会注入。
- 客户端有「回合进行中不提交档位」的保护（避免 thinking 历史与请求档位错配），松手时排队、回合结束补交。
  0.2.9 起用 `ctx.sessions.binding(id).session.getSnapshot().running` 判断运行状态，并独立轮询补交；
  0.2.8 及以前的 `turnOf/isRunning` 探测在 DSH 0.2.x 不存在，实际是立即提交。

## 6. 相对上游的改动（review 时重点）

全部集中在 `scripts/build-client.mjs` 的 patch 列表，按顺序读即可：

1. 模块 id 改为 `dsh-effort-slider`。
2. `conversation.input.model` 注册加 `priority: -1`（DSH single slot 的官方 shadow 方式，最低优先级渲染）。
3. 滑轨几何：手柄 30px→26px（与滑轨同高、完全在轨内）；填充填到手柄右缘。
4. 手柄：显式白色渐变（不再用可能半透明的主题 token `--dsw-alias-bg-layer-2`）；悬停/按下 `scale(1.08)`→`transform:none` + 3px 光环。
5. 填充/粒子：两端始终 `border-radius:16px`（上游只有最右档靠不可见手柄盖方角）。
6. 档位点：4px 半透明灰 → 5px 实心白点 + 描边/投影。
7. 拖动：按住时 `transition:none` + `ratioAt(event)` 连续驱动 `--pos`；松手才取最近档并恢复过渡（`dragPos` state）。
8. Fast：tooltip 文案从「1.5倍速/无实际作用」改为「快速模式」；点击时 POST `fast` 到 Host。
9. 工具提示（Fast / 重置为默认）：背景从 `--dsw-alias-bg-layer-2`（大黑塔皮肤下是 transparent）换成不透明菜单面 + 细边框 + 阴影，文字不再浮在页面内容上。
10. Host 状态同步：mount 读取 `/effort-slider/state`，按 live `savedEffort` 对账 arm/disarm；Ultra 档 model-link 加 tooltip。
11. 档位配色：Low 绿、High 蓝、Ultra 紫，由 rail/popup/trigger 的 `data-effort` 驱动填充、标题与触发器档位文字。
12. Fast 粒子流动：开启小闪电后白点向左漂移，Low `0.18×`、High `0.45×`（约 Low 的 2.5 倍）、Ultra 单独 `0.65×`、Ultra+Fast `1.0×`。
13. 模型名扩展（上游已有）保留：`conversation.input.model.label` 子 slot 的动态注入被我们的 shadow 覆盖，DeepSeek 品牌名等标签扩展不再生效（已知取舍）。
14. 重置（0.2.9）：reset 同时 `POST { fast: false }` 清 Host 的快速模式记录，不再「界面关了、注入还在」。
15. 回合内改档（0.2.9）：busy 探测改读 `SessionBinding.session` 快照的 `running`；挂起的档位由 `deferTimerRef`
    独立轮询，回合结束后补交（不再依赖 `disabled` 变化触发）。
16. 回归测试锁定上述两条：reset 必清 Host Fast、busy 探测必读快照、挂起档位必须排队补交。
17. 排队保存完整选择（0.2.10）：队列存 `{ provider, model, reasoningEffort }`，回合结束后提交完整目标选择；
    此前只存 effort，切模型时会提交成「旧模型 + 新模型默认档」。
18. Host 写入失败一致性（0.2.10）：reset 与 Fast 开关在写入失败时回滚显示并 `setError`；Fast 写入带序号，
    过期回复不覆盖新状态。
19. 挂起态预览（0.2.10）：排队期间保留所选档位预览，提交/失败/取消/卸载/切会话才清；不再立刻跳回旧档。
20. 粒子漂移改合成层（0.2.10）：白点位图只画一次，漂移由 CSS `transform` 跑马灯完成（`sparkdrift` keyframes，
    时长由档位决定），主线程忙于流式渲染时仍平滑；Ultra 爆发仍用 canvas。

## 7. Review 重点

- `scripts/build-client.mjs`：每个 patch 都有 anchor 断言，anchor 漂移会构建失败——这是「上游更新后仍可维护」的关键。
- `lib/gate.js`：gate 不得抛错（抛错会拖垮整段 prompt 组装）；当前全 try/catch。
- `index.js` 路由：loopback-only、body ≤ 8KB、`sessionId` 长度上限、状态文件原子写、记录上限 256。
- 状态兼容：`lib/state.js` 可读 v1 文件（旧版 `{topEffortId}` / `true`），不会因为升级把用户已有会话变成异常。
- 安全/伦理：注入文本可能让模型更敢花钱；README「风险」已写清，不要默认开启 Fast/Ultra 给不知道成本的用户。

## 8. 已知边界

- 只支持 DSH `>=0.2.0-rc.1 <0.3.0-0`；依赖的 slot/service 名称若在 0.3 变化，需要更新 patch 与 `package.json` 的 `dsh.client.inject`。
- `conversation.input.model.label` 子 slot 被覆盖：DeepSeek 官方模型名标签（如 `*-1017` 徽标）在这个插件下不显示。若需要，后续可复刻其标签渲染。
- `Fast` 是提示词层速度模式，不改变真实解码速度；文案已明确。
- 回合内改档：0.2.10 起排队会保存完整模型选择并保留预览；仍要等回合结束才提交，所以「思考中拖档/切模型」对当前回合不生效、对下一回合生效（这是有意的）。
- 粒子漂移用 CSS transform 动画，速度由动画时长换算（2.75s ÷ 速度系数）；`prefers-reduced-motion` 未单独处理，极端省电模式可能停帧。
- Herta 等第三方皮肤的 CSS 若用 `!important` 重写按钮，可能影响 trigger 观感；滑块本体（div）不受影响。
- Windows 实测通过；macOS/Linux 未验证（CSS/指针事件理论上通用）。

## 9. 发布前 checklist

- [ ] 保留 `LICENSE`、`NOTICE.md`、`LICENSES/` 两个上游 MIT 全文
- [ ] 不要把 `~/.dsh/effort-slider.json`、个人路径、profile 备份提交进仓库
- [ ] 不要提交 `node_modules/`、`.work/`、`dist/`、截图临时文件
- [ ] 版本号/CHANGELOG 更新（当前 0.2.15）
- [ ] 发布宣传时在简介写清「Fork / 基于 …」并 @ 上游作者（B站同类插件普遍这么做）
