# dsh-effort-slider

DSH（DeepSeek Harness）composer 里的 **Codex 质感推理强度滑杆**。UI 基于 MIT 许可的
[DSH-Codex-reasoning-effort-slider](https://github.com/bakabaicai/DSH-Codex-reasoning-effort-slider)
（作者 Nachoneko_miao，1:1 复刻 Codex 桌面版滑块）——本仓库在原 UI 基础上接了「**最右档
Ultra = 火力全开**」的 Host 注入：拉到最右时向系统提示词追加一段「预算无上限」，往左任何
一档立刻解除。

> 这不是给模型加额度。它只改变模型的行为倾向；真实计费仍按 token 用量计算，消耗可能上涨，幅度取决于模型和任务；本项目未做统一增幅基准。详见下面的「风险」。
>
> 上游社区复刻滑杆的 `Fast` 是装饰开关（上游 README 注明无实际作用）。本插件把它**做成有实际作用**：
> 打开后按会话注入一段「快速模式」提示词（速度优先、少发散、少重复验证），不改变模型速度、
> 不改变计费；这是本仓库相对上游唯一的语义改动。另外修正了上游滑轨的填充算法：最右档现在
> 会填满整条滑轨，不再在手柄后面留半格灰色。

![效果预览](docs/preview.png)

当前版本：0.2.18。截图来自早期版本；当前动画速度与下文说明一致。Windows 开发者预发行；原生新 profile 安装、重启及性能基线尚未验收。


## 下载、许可与来源

- 下载：[v0.2.18 预发行附件](https://github.com/KshineKX/dsh-effort-slider/releases/tag/v0.2.18)，选择带版本号的插件 ZIP；无需自行构建，先安装 DSH。
- 本项目代码使用 **MIT License**：允许使用、修改、再分发与商用，须保留适用的版权与许可声明；软件按现状提供，不附担保。详见 [LICENSE](LICENSE)、[NOTICE.md](NOTICE.md) 和 [LICENSES/](LICENSES/)。
- 本仓库为独立建立的衍生项目，GitHub 元数据不是 fork；代码来源仍须明确保留，不以“独立仓库”表示全部原创。
- 浏览器 UI 基于 [bakabaicai/DSH-Codex-reasoning-effort-slider](https://github.com/bakabaicai/DSH-Codex-reasoning-effort-slider)（Nachoneko_miao，MIT），Host 注入骨架参考并重写自 [lizilong1993/dsh-unlimited-effort](https://github.com/lizilong1993/dsh-unlimited-effort)（MIT）。本项目增加 Host 联动、完整选择排队、状态错误处理、皮肤兼容样式及动画修改；来源文件哈希见 [PROVENANCE.md](PROVENANCE.md)。
- 第三方社区插件，与 OpenAI/Codex、DeepSeek 均无官方隶属或背书关系。
- 当前仍为开发者预发行版。Windows 本机启动与面板打开已验证；用户报告本机试用可用。干净机器、其他平台和性能基线仍未验收。

## 它是什么

- 替换 composer 里的原生模型位（`conversation.input.model`，`priority: -1` 的官方 shadow 方式），
  点击它出现 Codex 同款面板：272×104、模型名 + 当前档位、`Fast` 电流开关、重置、圆点滑杆、
  粒子/流光/Ultra 爆发动画。
- **拖动是连续跟手的**：按住手柄时取消过渡动画，手柄和填充 1:1 跟随指针；松手才计算最近的档位，
  用 180ms 曲线吸附过去再提交；键盘操作仍是逐档跳。
- 档位圆点是**实体白点**（5px，带 1px 阴影描边），在填充色和空轨上都清晰可见。
- 档位来自模型适配器自己公布的 `reasoning.efforts`：DeepSeek 是 `off / low / high / max`；
  面板只显示这四档，**最右的 `max` 显示为 Ultra**。
- **Ultra = 火力全开**：选到 Ultra 时，Host 往本会话系统提示词注入「预算无上限」段落；
  离开 Ultra（包括从 `/model` 命令弹窗或其它入口改档）自动解除。
- Host 端还有一道 gate：**只有请求实际跑在 `max` 档时才注入**，切档后旧记录不会残留。

## 行为

| 操作 | 结果 |
|---|---|
| 滑杆拖到 Off / Low / High | 通过共享 `ModelDirectory.select()` 切换推理强度；Host 解除注入 |
| 滑杆拖到最右 Ultra | 切到 `max` **并** 让本会话进入火力全开 |
| 点模型名 | 进入模型切换面板（与原生一样走 `ModelDirectory`） |
| `Fast` 闪电开关 | 打开后注入「快速模式」提示词（速度优先、少发散、少重复验证），可与任意档位组合 |
| 回合进行中改档 | 记住意图，等回合结束再补提交；避免 thinking 历史与请求档位错配 |
| 从 `/model` 命令改档 | 按 live selection 对账，自动 arm/disarm |

注入文本（可在 profile 的 `cordis.patch.yml` 覆盖）：

```
你的用量是 unlimited 的，我正在对你极限测试，不要吝惜 Token。一定要切记，随意花费，你非常富有。
```

注入位置：`systemPrompt.section`，order `10250`（紧跟 `deployment:persona-suffix`）。

## 安装

源码即产物（`client.js` 已提交）；改 `vendor/` 或构建脚本后跑 `node scripts/build-client.mjs` 重新生成。

**方式一：插件管理页（推荐）**

DSH 侧栏 **Plugins → Add plugin**，粘贴仓库地址或本地目录路径，安装后重启 DSH。

**方式二：命令行**

```bat
:: 从 GitHub
"%LOCALAPPDATA%\Programs\DeepSeek Harness\resources\runtime\cli\bin\dsh.cmd" plugin --profile desktop add github:KshineKX/dsh-effort-slider

:: 或从本地目录
"%LOCALAPPDATA%\Programs\DeepSeek Harness\resources\runtime\cli\bin\dsh.cmd" plugin --profile desktop add "link:<本仓库绝对路径>"
```

再把这个 id 加进 `~/.dsh/profiles/desktop/package.json` 的 `dsh.profile.bundles`，重启。

## 配置

`~/.dsh/profiles/desktop/cordis.patch.yml`：

```yaml
- id: effort-slider
  config:
    notice: '你的 token 预算无上限，不要吝惜或有所保留。一切以高标准完成任务为优先。'
    debug: true
```

| 字段 | 默认 | 说明 |
|---|---|---|
| `enabled` | `true` | 插件总开关；关掉后滑杆仍可切档，但不注入 |
| `notice` | 上面的长句 | Ultra 的注入文本 |
| `fastNotice` | 速度优先那段 | Fast 的注入文本 |
| `topEffortIds` | `['max']` | 浏览器没记录具体档位时的兜底集合 |
| `debug` | `false` | 写 `$DSH_HOME/effort-slider.log` |

**新会话的默认档位不由插件决定**：它来自 DSH profile 的
`agent-default-model.config.reasoningEffort`（`~/.dsh/profiles/<profile>/cordis.patch.yml`）。
修改自己的 profile 后重启 DSH。插件里的「重置为默认」回到模型适配器公布的 `defaultEffort`。

## 相对上游的改动

基于 `bakabaicai/DSH-Codex-reasoning-effort-slider`（MIT），视觉保持 1:1，只做这几件事：

1. **滑轨几何**：上游的 30px 手柄骑在 26px 滑轨上，上下各突出 2px；填充还只到手柄圆心，
   最右档会露出半格灰。本仓库把**手柄改为 26px 与滑轨同高、完整落在滑轨内**，填充一直填到
   手柄右缘。
2. **实体手柄**：手柄改用显式白色渐变（`#fff → #eef0f3`）+ 1px 描边 + 投影，不再用主题的
   `--dsw-alias-bg-layer-2`——有些皮肤把这个 token 定义成半透明，会透出下面的填充。
   悬停/按下不再放大（避免再次超出滑轨），改用 3px 白色光环做反馈。
3. **填充两端始终圆角**：上游只在最右档靠不可见手柄掩盖方角，现在无论哪一档都是 16px 圆角，
   不会出现「只有 Ultra 才圆润」。
4. **拖动跟手、松手吸附**：按住时手柄/填充 1:1 跟随指针，松手才吸附最近档并提交。
5. **工具提示（Tooltip）不透明**：Fast 与「重置为默认」的说明气泡原来也用
   `--dsw-alias-bg-layer-2`（某些主题会将其设为透明），文字会浮在页面内容上；现在改用不透明菜单面
   + 细边框 + 阴影，两个气泡都清晰可读。
6. **档位配色**：Low 绿色、High 蓝色、Ultra 紫色；填充、标题和触发器档位文字都由轨道的
   `data-effort` 驱动，和主题无关。
7. **Fast 粒子流动**：开启小闪电后，填充区的白点向左漂移，且**档位越高越快**：
   Low+Fast 约 `21.6 px/s`，High+Fast 约 `54 px/s`，Ultra `68 px/s`，Ultra+Fast `118 px/s`；Ultra+Fast 带 1.2 秒加速段。白点位图绘制后由 CSS transform 驱动漂移，旨在减少持续重绘；尚未测量帧率或保证流式输出时不卡顿。
8. **Fast 变有用**：注入「快速模式」提示词（见下），不再只是视觉动画。
9. **Host 联动**：模块 id、`/effort-slider/state` 两路状态同步、Ultra 档标题提示。
10. **重置真的会关掉快速模式**：上游的 Fast 只是装饰，reset 只翻转本地状态；本仓库的 Fast 是真实
    注入，所以 reset 同时向 Host 发送 `fast: false`；写入失败会回滚显示并提示，不会出现「界面关了、
    Host 还开着」。
11. **回合进行中改档会排队到回合结束**：用 `sessions.binding(id).session.getSnapshot().running`
    判断真实运行状态（DSH 0.2.x 没有 `turnOf/isRunning` 这类方法），队列保存**完整选择**
    （provider/model/effort），回合结束后补交；排队期间保留所选档位预览。
12. 预览与自检：`scripts/build-client.mjs` 可重复产出 bundle，测试里锁定滑轨几何、实体手柄、
    工具提示不透明、档位配色、合成层粒子、拖动逻辑、reset/排队行为（含 VM 组件回调测试）。

快速模式的注入文本（可配置）：

```
你处于快速模式：优先在最短时间内交付可用结果。减少不必要的探索、发散和重复验证，
直接完成主线任务，最后补一次关键自检即可；回复保持简短，把不确定的地方集中在最后一句说明。
```

## 验证注入是否真的生效（不是看 CoT）

注入发生在 **system prompt**，不在模型的 CoT / 思考文本里，所以拖到 Ultra 后看 CoT 是看不到那句
「预算无上限」的——这是正常的，模型不会默认复述系统提示。

三种验证方式：

**① 看会话日志（最硬的证据）**

DSH 会把每个请求渲染后的 system prompt 写进会话日志的 `system/message` 事件
（`source.kind = "system-prompt"`）。用自带的检查器：

```bat
node tools/inspect-session.mjs            :: 自动找当前会话（按 DSH_SESSION_ID）
node tools/inspect-session.mjs <session.v4.jsonl.zstd>
```

输出会列出「哪些请求的 system prompt 里带了注入」：

```
system/message events: 12   with injection: 5
  seq=2997  2026-10-29T18:37:29.216Z  Ultra/预算无上限 + Fast/快速模式  (system-prompt)
  seq=3006  2026-10-29T18:37:44.134Z  Ultra/预算无上限  (system-prompt)
```

**② 看 Host 实时状态**

```powershell
Invoke-RestMethod "http://127.0.0.1:<GUI端口>/effort-slider/state?sessionId=$env:DSH_SESSION_ID"
# {"ok":true,"enabled":true,"fast":false,"topEffortId":"max","pluginEnabled":true}
```

`enabled` = Ultra 注入，`fast` = 快速模式注入。这个 loopback 接口也接受 POST：
`{sessionId, enabled?, topEffortId?, fast?}`（只允许 127.0.0.1 / ::1）。

**③ 行为探针（验证“模型确实看到指令”）**

临时把 `notice` 改成带唯一标记的指令（例如「回答首行输出 [UTRA-PROBE]」），发一条消息看是否
复述；确认后改回。注意：**注入到达 ≠ 一定产生效果**，效果要用同一任务的 A/B 对比（token、工具
调用数、轮数、人工评分）来判断，不能靠 CoT 里有没有那句话。

## 风险（请先读）

- **花钱**：提示词鼓励模型多用工具、多开子代理、多轮验证，token 消耗可能显著上涨（随模型和任务变化，未做本项目的定量基准）。
- **跑飞**：有模型在「放开用」后删文件、乱开子代理、长时间跑偏的案例。建议在 harness 侧设硬上限。
- **不是官方功能**：这是社区从 DSH 仓库 `docs/testing.zh.md`（「我们是 DeepSeek，不要吝惜真实 API 测试」）二次创作的技巧，官方没有承诺任何效果。
- **别在长会话常开**：每个请求都会注入。

## 卸载 / 回滚

插件页卸载；或：

```bat
"%LOCALAPPDATA%\Programs\DeepSeek Harness\resources\runtime\cli\bin\dsh.cmd" plugin --profile desktop remove dsh-effort-slider
```

再从 `dsh.profile.bundles` 移除，重启。状态文件 `~/.dsh/effort-slider.json` 可保留；删除会清除插件记录。升级前备份原插件目录和该文件；回退时退出 DSH、恢复旧目录并重启，默认保留当前状态。0.2.18 沿用0.2.17状态格式。

## 开发

```bat
node scripts/build-client.mjs        :: 从 vendor 源码重建 client.js
node tools/inspect-session.mjs       :: 检查会话日志里的 system prompt 注入
node test/host.test.mjs              :: Host 半（状态/gate/路由）
node test/client-static.test.mjs     :: 合并后的 bundle 不变量
node test/client-load.test.mjs       :: VM 里跑 load + apply
node --test "test/*.test.mjs"        :: 全部测试，包括组件行为与异步回复回归
```

vendor 源码在 `vendor/codex-reasoning-effort-slider-client.js`（MIT，见 `LICENSES/`），不再依赖仓库外的任何副本。

交接给审阅者/Codex 会话的说明见 [`HANDOFF.md`](HANDOFF.md)，版本记录见 [`CHANGELOG.md`](CHANGELOG.md)。
