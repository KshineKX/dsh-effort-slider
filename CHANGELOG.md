# CHANGELOG

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
