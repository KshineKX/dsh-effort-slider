# 0.2.9 修正说明（复审记录）

本版由本地开发者交付构建，替代此前的审阅候选，作为 0.2.9 的最终内容。范围只覆盖滑杆插件本身；不扩大 DSH 兼容结论。

## 两项 Host 联动修正

| 问题 | 0.2.8 行为 | 0.2.9 处理 |
| --- | --- | --- |
| 「重置为默认」只关界面 | reset 只 `setFast(false)`，没有写 Host，`effort-slider.json` 里仍是 `fast: true`，Host 继续注入「快速模式」 | reset 先 `POST /effort-slider/state { fast: false }`，用 Host 返回值回填本地状态，再切回默认档 |
| 回合进行中的档位不进队列 | `sessionBusy()` 探测的 `sessions.turnOf / state / get / isRunning / running` 在 DSH 0.2.x 的 `ISessions` 里都不存在，恒为 `false`，档位立即提交 | 改读 `sessions.binding(id).session.getSnapshot().running`；挂起档位由独立定时器轮询，回合结束后补交，不再依赖 `disabled` 变化触发 |

补充：`deferTimerRef` 在卸载时清理；reset 与闪电开关使用同一 Host 写入通道。

## 验证

- `node scripts/build-client.mjs` → `client.js` 50,299 字节、SHA-256 `f2b616c063d5f652cfee487925635287c1e8de03cf0245e356f2fa97908efad7`，连续两次构建一致。
- 测试：host 8 + bundle 14 + ModuleLoader 1 = **23 通过，0 失败**（每文件直接执行，不依赖测试运行器子进程）。
- 新增 3 条回归测试：reset 必须清 Host Fast、busy 探测必须读会话快照、回合中的档位必须排队补交。
- 本轮没有在本机重启/安装真实 DSH 做界面验收；原生 GUI、长跑、速度与费用对比不在本轮结论内。

## 边界与许可

- 只支持 DSH `>=0.2.0-rc.1 <0.3.0-0`；`Fast` 是提示词层速度模式，不改变解码速度或计费；注入不是给模型加额度。
- UI 基座来自 bakabaicai/DSH-Codex-reasoning-effort-slider（Nachoneko_miao，MIT），Host 注入骨架参考 lizilong1993/dsh-unlimited-effort（MIT）后重写；两份许可全文见 `LICENSES/`，署名见 `NOTICE.md`。
