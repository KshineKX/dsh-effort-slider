# CHANGELOG

## 0.2.9

- 修复“重置为默认”只关闭UI Fast却未关闭Host提示词的问题；Fast写入串行化，失败显示错误并回退确认状态。
- 修复忙碌回合排队不启动轮询、只保存effort丢失模型身份的问题；跨会话/模型/实际选择变化取消旧意图，探测失败不自动放行，提交失败不无限重试。
- 特殊会话ID按自有数据键持久化，避免__proto__等键改变对象原型或丢记录。
- 日志工具按解码器消费字节处理完整多帧，保留跨帧UTF-8，损坏或缺少zstd显式失败；不再以magic扫描和静默跳过作为完整验证。
- 38项隔离回归，校正提示词、日志证据和兼容范围文案；原0.2.8视觉、vendor和许可证保留。

## 0.2.8

- 拉大 High 与 Low 的粒子流速差：Low `0.18×`、High `0.45×`（约 2.5 倍），解决上一版
  `0.26/0.34` 差 30% 肉眼几乎感觉不到的问题；Ultra 单独 `0.65×`、Ultra+Fast `1.0×` 不变。

## 0.2.7

- Fast 模式的粒子漂移按档位微调：Low `0.26×`、High `0.34×`（比 Low 快约 30%），
  Ultra 单独 `0.65×`、Ultra+Fast `1.0×`。
- 回归测试同步锁定这三档速度系数。

## 0.2.6

- Fast 模式下的白点粒子会向左缓慢漂移：Fast-only 约 0.3 倍速，Ultra 单独 0.65 倍速，
  Ultra+Fast 1 倍速（慢于 Ultra 的流动速度）。
- 补充粒子流动的回归测试。

## 0.2.5

- 档位配色：Low 绿色、High 蓝色、Ultra 保持紫色（填充 / 标题 / 触发器档位文字都由 `data-effort` 驱动）。
- README 说明：新会话默认档位来自 DSH profile 的 `agent-default-model.reasoningEffort`，不由插件决定。

## 0.2.4

- 新增 `tools/inspect-session.mjs`：从 DSH 会话日志的 `system/message` 事件里读出每个请求实际
  渲染的 system prompt，列出哪些请求带了 Ultra / Fast 注入（seq + 时间），用于核对「注入是否真的
  到达模型」（CoT 里不会出现注入文本，这是正常的）。
- README 增加「验证注入是否真的生效」一节（会话日志 / Host 状态接口 / 行为探针三种方式）。

## 0.2.3

- 修复 Fast（闪电）与「重置为默认」两个工具提示：背景不再使用大黑塔皮肤下为透明的主题 token，
  改为不透明菜单面 + 细边框 + 阴影，文字不再浮在页面内容上。
- 补充工具提示不透明度的回归测试。

## 0.2.2

- 手柄改为不透明白色渐变实体（不再使用可能半透明的主题 token），悬停/按下改为光环反馈，不再放大越界。
- 填充与粒子两端始终 16px 圆角（不再出现「只有 Ultra 才圆润」）。
- 档位点改为实心白点（5px + 描边/投影）。
- 拖动改为连续跟手，松手才吸附最近档并提交。
- 插件自包含：上游 UI 源码移入 `vendor/`，构建不再依赖仓库外副本。
- 补充 `HANDOFF.md`、测试与许可文件。

## 0.2.1

- 修正滑轨几何：26px 手柄与滑轨同高、填充填到手柄右缘。
- 修正上一版在 `Fast` 与 Ultra 叠加时的状态同步。

## 0.2.0

- 浏览器层切换为 Codex 1:1 复刻（fork 自 bakabaicai/DSH-Codex-reasoning-effort-slider，MIT）。
- 以 `priority: -1` 替换原生 composer 模型位。
- Host 层：每会话 `{ throttle, topEffortId, fast }` 状态 + `/effort-slider/state` + 两个 system prompt 段。
- Ultra = 火力全开；Fast 从装饰改为真实注入。
- lib/state、gate、route 基于 lizilong1993/dsh-unlimited-effort（MIT）重写。

## 0.1.0

- 初版：composer 右侧「思考强度」芯片 + GPT 风格滑杆，最右档启停火力全开。
