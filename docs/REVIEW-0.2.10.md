# 0.2.10 修正说明（复审记录）

本版处理独立审核报告 `2026-10-30-dsh-029` 指出的 3 项行为遗漏，并把粒子漂移动到 CSS 合成层。范围仍只覆盖滑杆插件本身；原生 GUI/性能基线不在本轮结论内。

## 审核发现与处理

| 优先级 | 审核发现 | 0.2.9 行为 | 0.2.10 处理 |
| --- | --- | --- | --- |
| P1 | 回合中切换模型，排队结束后停留在旧模型 | 队列只保存 `next.reasoningEffort`，轮询再用旧闭包的 `chooseEffort` 拼旧模型 → 提交「旧模型 + 新模型默认档」 | 队列保存完整选择 `{ provider, model, reasoningEffort }`；轮询直接 `commit(target)`，提交该选择 |
| P2 | reset 写入失败时界面已关、Host Fast 仍开 | `catch(() => {})` 吞错，本地已 `setFast(false)` | 失败回滚 `setFast(previousFast)` 并 `setError(t('failed'))`（`role="alert"`）；Fast 开关同样回滚，并用写入序号丢弃过期回复 |
| P2 | 挂起档位预览立刻跳回旧档 | `commit` 排队后 `finally` 清掉 preview | 排队时保留 preview（`queued` 标志），提交成功/失败/取消/卸载/切会话才清 |

附带：排队入口统一为 `commit(next)` + `scheduleDeferredCommit()`；卸载和切换会话会清定时器与队列；挂起期间切换模型或档位以最新意图覆盖。

## 粒子卡顿（同版修复）

- 0.2.9 及以前：每帧在 canvas 上重绘 20 个点并用 rAF 推进漂移。任务运行时主线程忙于流式渲染，rAF 节奏被打乱，表现为卡顿。
- 0.2.10：白点位图只绘制一次（两个 canvas 平铺），漂移交给 CSS `transform` 跑马灯（合成线程），时长由档位速度换算
  （`2.75s ÷ 速度系数`：Low `0.18×` → 约 15.3s，High `0.45×` → 约 6.1s，Ultra `0.65×` → 约 4.2s，Ultra+Fast `1.0×` → 2.75s）；
  Ultra 爆发仍由 canvas 绘制（短时事件）。
- 这是实现层优化，本轮未做前后帧率/长跑基准，不承诺具体数值。

## 验证

- `node scripts/build-client.mjs` → `client.js` 51,534 字节，连续两次构建同哈希（`56b5af75…34ed57`）。
- 测试：host 8 + bundle 14 + behavior 9 + ModuleLoader 1 = **32 通过，0 失败**。
- 新增的 9 项行为测试来自独立审核夹具（注册真实组件、hook 调度、VM 内运行下载的 bundle），覆盖：
  空闲切档、reset 成功/已是默认档、reset 失败回滚+报错、回合中排队与补交、挂起预览、最新意图覆盖、
  卸载清定时器、回合中切模型保留目标 model/provider/effort。
- 未做：真机重启/安装 DSH 的界面验收、性能前后对比、真实 Host 状态写入。

## 边界与许可

- 只支持 DSH `>=0.2.0-rc.1 <0.3.0-0`；Fast 是提示词层，不改变解码速度或计费；注入不是给模型加额度。
- UI 基座来自 bakabaicai/DSH-Codex-reasoning-effort-slider（Nachoneko_miao，MIT）；Host 注入骨架参考 lizilong1993/dsh-unlimited-effort（MIT）后重写；许可全文见 `LICENSES/`，署名见 `NOTICE.md`。
