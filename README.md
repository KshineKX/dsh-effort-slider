# dsh-effort-slider

DSH（DeepSeek Harness）composer 里的 **Codex 质感推理强度滑杆**。UI 基于 MIT 许可的
[DSH-Codex-reasoning-effort-slider](https://github.com/bakabaicai/DSH-Codex-reasoning-effort-slider)
（作者 Nachoneko_miao，1:1 复刻 Codex 桌面版滑块）——本仓库在原 UI 基础上接了「**最右档
Ultra = 火力全开**」的 Host 注入：拉到最右时向系统提示词追加一段「预算无上限」，往左任何
一档立刻解除。

> 这不是给模型加额度。它只改变模型的行为倾向；真实计费、上下文上限与模型推理预算仍由服务端和宿主决定，消耗可能增加，本项目未量化增幅。详见下面的「风险」。
>
> 上游社区 UI 基座将 `Fast` 标为无实际作用。本插件把它**做成有实际作用**：
> 打开后按会话注入一段「快速模式」提示词（速度优先、少发散、少重复验证），不改变模型速度、
> 不改变计费；Ultra/Fast 的 Host 联动是本仓库的行为改动，不代表 OpenAI 或上游作者承诺这些行为。另外修正了上游滑轨的填充算法：最右档现在
> 会填满整条滑轨，不再在手柄后面留半格灰色。

![效果预览](docs/preview.png)

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
:: 从 GitHub（把 <org> 换成实际仓库）
"%LOCALAPPDATA%\Programs\DeepSeek Harness\resources\runtime\cli\bin\dsh.cmd" plugin --profile desktop add github:<org>/dsh-effort-slider

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

## 相对上游的改动

基于 `bakabaicai/DSH-Codex-reasoning-effort-slider`（MIT），视觉保持 1:1，只做这几件事：

1. **滑轨几何**：上游的 30px 手柄骑在 26px 滑轨上，上下各突出 2px；填充还只到手柄圆心，
   最右档会露出半格灰。本仓库把**手柄改为 26px 与滑轨同高、完整落在滑轨内**，填充一直填到
   手柄右缘。
2. **实体手柄**：手柄改用显式白色渐变（`#fff → #eef0f3`）+ 1px 描边 + 投影，不再用主题的
   `--dsw-alias-bg-layer-2`——有些皮肤（如大黑塔）把这个 token 定义成半透明，会透出下面的填充。
   悬停/按下不再放大（避免再次超出滑轨），改用 3px 白色光环做反馈。
3. **填充两端始终圆角**：上游只在最右档靠不可见手柄掩盖方角，现在无论哪一档都是 16px 圆角，
   不会出现「只有 Ultra 才圆润」。
4. **拖动跟手、松手吸附**：按住时手柄/填充 1:1 跟随指针，松手才吸附最近档并提交。
5. **工具提示（Tooltip）不透明**：Fast 与「重置为默认」的说明气泡原来也用
   `--dsw-alias-bg-layer-2`（大黑塔把它设为透明），文字会浮在页面内容上；现在改用不透明菜单面
   + 细边框 + 阴影，两个气泡都清晰可读。
6. **Fast 变有用**：注入「快速模式」提示词（见下），不再只是视觉动画。
7. **Host 联动**：模块 id、`/effort-slider/state` 两路状态同步、Ultra 档标题提示。
8. 预览与自检：`scripts/build-client.mjs` 可重复产出 bundle，测试里锁定滑轨几何、实体手柄、工具提示不透明与拖动逻辑。

快速模式的注入文本（可配置）：

```
你处于快速模式：优先在最短时间内交付可用结果。减少不必要的探索、发散和重复验证，
直接完成主线任务，最后补一次关键自检即可；回复保持简短，把不确定的地方集中在最后一句说明。
```

## 风险（请先读）

- **花钱**：提示词鼓励模型多用工具、多开子代理、多轮验证，token 消耗可能增加；本项目没有可复核的消耗增幅统计。
- **跑飞**：有模型在「放开用」后删文件、乱开子代理、长时间跑偏的案例。建议在 harness 侧设硬上限。
- **不是官方功能**：这是社区从 DSH 仓库 `docs/testing.zh.md`（「我们是 DeepSeek，不要吝惜真实 API 测试」）二次创作的技巧，官方没有承诺任何效果。
- **别在长会话常开**：每个请求都会注入。

## 卸载 / 回滚

插件页卸载；或：

```bat
"%LOCALAPPDATA%\Programs\DeepSeek Harness\resources\runtime\cli\bin\dsh.cmd" plugin --profile desktop remove dsh-effort-slider
```

再从 `dsh.profile.bundles` 移除，重启。状态文件 `~/.dsh/effort-slider.json` 可删。

## 开发

```bat
node scripts/build-client.mjs        :: 从 vendor 源码重建 client.js
node test/host.test.mjs              :: Host 半（状态/gate/路由）
node test/client-static.test.mjs     :: 合并后的 bundle 不变量
node test/client-load.test.mjs       :: VM 里跑 load + apply
```

vendor 源码在 `vendor/codex-reasoning-effort-slider-client.js`（MIT，见 `LICENSES/`），不再依赖仓库外的任何副本。

交接给审阅者/Codex 会话的说明见 [`HANDOFF.md`](HANDOFF.md)，版本记录见 [`CHANGELOG.md`](CHANGELOG.md)。

## 发布与验证边界

本项目是基于社区MIT项目的衍生插件，非OpenAI或DeepSeek官方插件；维护与发布账号为KshineKX。两个上游的版权行和MIT全文均保留于LICENSES。

0.2.3发布副本在正常Windows / Node v24.19.0 上完成两次构建，与提供的client.js逐字节一致：47484字节，SHA-256为`fc7509bcfbcd0ea9078cd0233596c64c0a18793e02d8fee48f2e88e7b390801c`；18项测试（8 Host、9 bundle不变量、1 VM注册加载）全部通过。测试使用临时DSH_HOME，未在此发布窗口安装或重启真实DSH，也没有做真实浏览器拖动、全皮肤视觉、推理速度、费用或长期稳定性验收。效果图为提供的局部界面展示，不是上述测试的证明。

当前客户端把`max`作为Ultra的Host触发值；DeepSeek的off/low/high/max是本次说明范围。不要把其他适配器“最右档”的标签自动视为相同注入行为。Fast/Ultra的状态通过本地路由同步；请求失败时存在界面开关与Host状态暂时不同步的可能，不能将按钮高亮作为服务端已生效回执。

`/effort-slider/state`使用相对地址并由DSH宿主提供，不需要作者的localhost服务、固定端口或私人账号。loopback检查限制连接来源地址，不等于独立的用户鉴权或浏览器Origin校验；不要将该路由另行反代到公网或当作多用户安全边界。

本仓库先以私有审阅状态提供，0.2.3安装包放在发行草稿中；有权限的账号下载ZIP、核对SHA后，解压到普通目录，在DSH插件页选择包含package.json的目录安装。按宿主提示保存工作后自行重启。core概念不适用于本项目，Code → Download ZIP是仓库源码。
