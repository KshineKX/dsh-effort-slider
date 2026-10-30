# 来源与许可记录

核对日期：2026-10-31。GitHub上的独立仓库不改变代码的衍生关系；本项目不是官方Codex或DeepSeek产品。

## UI 基座

上游：https://github.com/bakabaicai/DSH-Codex-reasoning-effort-slider

作者：Nachoneko_miao。采用内容：vendor中的单文件浏览器UI构建，以及基于它打补丁生成的client.js。许可：MIT；Copyright (c) 2026 Nachoneko_miao。历史导入未记录可复核的上游提交，现以实际随包副本哈希固定身份，不把上游当前HEAD冒充采用版本。

- vendor/codex-reasoning-effort-slider-client.js SHA-256：`8bb2446ab6bc63c987bcdd63ac55402767c8f5d8b78992d41da1109a5ce6efb8`
- LICENSES/Nachoneko_miao-dsh-codex-reasoning-effort-slider-MIT.txt SHA-256：`896920496e34dcb373881d64b4172539321fa94072512ce69fe95530fbd5da69`

## Host 参考

上游：https://github.com/lizilong1993/dsh-unlimited-effort

作者：lizilong1993。采用方式：Host注入、状态文件与路由骨架的参考和重写，具体范围见NOTICE；不是把此仓库整个随包分发。保留上游MIT全文及Copyright (c) 2026 lizilong1993。历史交接未记录准确上游提交；以下哈希固定现有许可副本和本项目实际Host实现，不将其称作上游原始版本。

- 上游许可副本 SHA-256：`a884ff688b1681d04dd59f1680308ee77dbc284467f82d24994cdb3f99fadf99`
- index.js SHA-256：`8117196225073184a79fd80013e84529b4d043c2868c47f87f6d630566624e03`
- lib/gate.js SHA-256：`ba0e7cd8bc26f045dc45656972bfa88ad844b8046adc619805f5b8435a5ddd82`
- lib/state.js SHA-256：`fcfe0aa7941477080bd4969e388fffd98319a5464493df1425d800ac87ce911e`
- lib/route.js SHA-256：`262dfe45ebfed1b99663eac934115b344cb95444715a02a00ed7444e1d532077`

## 其他内容与边界

RorschachXR/dsh-full-throttle仅作历史参考，交接声明未复制其无明确许可证的代码；本次未重新做逐行来源鉴定，不把该项目列为已获许可依赖。

根LICENSE为MIT，版权行为dsh-effort-slider contributors；第三方版权行仍分别保留。docs/preview.png是滑杆效果预览，非角色皮肤资源包；本仓库不随包复制Herta、米哈游角色图片、字体、音效或另装的额度挂件。DeepSeek Harness是外部宿主，需要用户独立安装。

本记录随主分支文档更新；既有v0.2.18标签与ZIP不被替换，其中已包含LICENSE、NOTICE及两份上游MIT许可全文。
