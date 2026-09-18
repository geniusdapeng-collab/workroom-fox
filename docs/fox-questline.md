# 首日上岗（Day-1 Questline）· 狐狸先生带玩

> 试验田范围：`workroom-fox` ｜ 首版：2026-09-18 ｜ 定位：把"新客户开箱后不知道下一步"变成一场 8 分钟的游戏

## 1. 为什么做

欢迎仪式（织伴开场 + 3D 团队列队 + 剪彩）解决的是"看见一支团队"，但它结束时客户拿到的是
「进入系统，先逛逛 →」，落回经营主页后没有下一步。首日上岗补的就是这一段：
**由引导 NPC「狐狸先生」带着董事长走完五关，每关都有可点的事、可见的结果、可拿的成就。**

## 2. 五关主线

| 关卡 | 客户做什么 | 完成判定（只认事实或客户操作） |
|---|---|---|
| 1 认人 | 点亮 3 张员工卡（收益定价官 / 口碑公关官 / 财务司库官），可换一批或跳过 | 三张卡点亮或主动跳过 |
| 2 定目标 | 三选一目标模板，或自己说一句 | 客户确认 |
| 3 派活 | 把一张任务卡派给数字员工（真实 `threads.dispatch`） | 线程创建成功 |
| 4 拍板 | 对真实审批做一次批准/修改/驳回（真实 `approvals.decide`） | 手势写回成功 |
| 5 验收 | 看交付与成绩单，选下一步（开夜班 / 接真实数据 / 定制行业版） | 客户确认 + 事实成就 |

全程可"稍后再来"，进度落 `localStorage`（`wl-fox-questline-v1`），下次从同一关继续。

## 3. 引导 NPC：狐狸先生

- **形象**：纯 SVG + CSS 绘制（零图片、零 Live2D 新资产），延续本仓"零音频资产"的纪律；
- **六态**：idle 待命 / listen 在听 / talk 汇报（口型开合）/ think 跟进中 / celebrate 庆祝 / alert 需要您拍板；
- **声音**：`VoiceEngine` role=`fox-guide`，音色 pitch 0.92 / rate 0.98，与织伴（1.04/0.94）区分；
  字幕走 `SubtitleBar`，TTS 不可用时自动只走字幕；
- **台词**：每关三句（进场 / 停留 9 秒的提示 / 过关），单句 ≤42 字；
- **降级**：`prefers-reduced-motion` 下关闭跳动与摆尾；任何动画失败不影响业务按钮。

## 4. 实现位置

```
apps/web/src/onboarding/
  questline.ts            纯逻辑：状态机 / 事实推进 / XP / 成就 / 持久化解析（22 条单测）
  questline.config.ts     行业内容：NPC 台词 / 员工卡 / 目标 / 任务卡 / 成就 / 下一步
  useQuestline.ts         React 容器：持久化 + 事实驱动 + 本地漏斗埋点
apps/web/src/components/fox-guide/
  FoxGuide.tsx            NPC 本体（SVG + CSS，六态）
  FoxGuideBubble.tsx      打字机气泡 + 语音
  QuestlineOverlay.tsx    五关引导壳（真实派活/审批接线）
  QuestlineHud.tsx        常驻入口（狐狸先生待命位）
```

P0（`apps/web/src/pages/p0/P0.tsx`）只做三件事：挂载 HUD、挂载引导壳、把真实事实
（目标/派活/拍板/交付/待审数）汇总成 `QuestFacts` 传给 `useQuestline`。

## 5. 诚实边界（不可越线）

1. 没有回执的事不说"已完成"；任务完成与否只认服务端线程状态；
2. 没有待审事项时，第 4 关如实显示"暂无待拍板"并允许跳过——**不编造审批**；
3. 派活与审批都走真实接口，失败时明确"任务没有被创建"/"什么都不会改变"；
4. 演示数据在员工卡里标注「〔演示样例〕」；
5. 游戏不给权限：XP、成就、收集都不影响围栏与审批。

XP 口径与团队页 `roster` 完全一致：裁决×3 + 派遣×2 + 沉淀×5；等级阶梯 xp ≥ 8·LV²。

## 6. 生产化待办（本版未做）

1. 进度从 `localStorage` 迁到服务端（`onboarding_progress` 同构表，`journey_key=day-1-questline`），支持跨设备续播；
2. `questline.config.ts` 的内容迁到行业包 `bundles/<industry>/onboarding/*.yml`，
   由 `industry-contract` 增加 `onboarding?: BundleAssetPath`（契约 2.0.0 → 2.1.0）；
3. 本地漏斗埋点改为写入五元事件账本，供平台侧看板消费。

## 7. 2026-09-18 深度审计与修复

审计发现的 17 项问题已修复并复验（详见 `outputs/FOX-数字人-首日上岗深度审计报告.md`）：

| 编号 | 问题 | 修复 |
|---|---|---|
| B1 | 欢迎仪式永久卡在 `dance`（继承基座）：进入 entrance 时挂的 3 个定时器，phase 一变就被 cleanup 清掉 | 改为"每段只挂下一跳"（1.6s/7.0s/8.4s 节奏不变）+ 函数式 setPhase 防回拨 |
| S1 | 已完成仍每次进首页自动弹引导层 | 完成态不再自动弹；HUD 提供"重播" |
| S2 | <640px 无引导入口 | HUD 全尺寸可见（窄屏紧凑形态） |
| S3 | "事实驱动"只认引导层内动作 | P0 从 `captain.theater().ticker`（近 14 条真实事件）推导本人 `thread.dispatch`/`approval.gesture`；并修掉服务端 ticker 的 `NULL NOT LIKE` 丢行缺陷 |
| S4 | 线程号不持久化 + 第 5 关成绩单被事实短路 | 新增 `lastThreadId` 持久化 + 无线程时从 `threads.list` 认领；`review` 关改为必须客户确认（成绩单/成就墙必现） |
| M1 | 引导 XP 与服务端 roster 双账本 | HUD 以服务端 roster XP 为主（"累计 N XP"），本次会话 XP 作副标 |
| M2 | StrictMode 下埋点重复（1 次动作记 2 条） | 副作用移出 `setState` updater，改为状态差异 effect 统一记账 |
| M3 | 无障碍：无初始焦点/Esc 不关闭/无焦点陷阱/背景可交互 | 接入基座 `useManagedSurface`（dialog + modal + Esc + 焦点圈定与恢复 + 背景 inert） |
| M4 | 派活未校验路由模式 | 要求 `mode === "quest"`，否则给出人话说明且不推进 |
| M5 | 任务预告数字无来源且未标注 | 标注"（预估）"并加"以任务线程模型计量为准"的说明 |
| M6 | 差评口径 2h vs 24h 并存 | 引导目标改用行业包 R19 口径（24 小时） |
| m1 | 埋点事件数声明 9 实际 16 | 本文件与方案文档更新为实际清单（hook 8 + 组件 6 = 14 个事件名，另含 opened/closed） |
| m2 | 完成面板仍留"稍后再来"、字幕残留上一关 | 完成态按钮改"关闭"；完成面板补狐狸成功台词气泡（字幕随之刷新） |
| m3 | "负责人意见：负责人意见待确认"重复 | 无真实意见时不渲染该行 |
| m4 | 引导层与织伴浮层互相遮挡 | 引导期通过 `workloom:loommate-visibility` 让织伴让位，关闭后恢复用户原偏好 |
| m5 | 狐狸口型是固定 CSS 循环，未接 TTS | 订阅 `VoiceEngine.onLipSync`（start/end 驱动说话态），估算时长仅作无语音兜底 |
| m6 | 游客跑到 L3 卡权限、无身份出口 | 权限提示内直接给"切换到店主/店长身份 →"入口 |

### 语音可用性（真机 Electron 实测）

`VoiceEngine` 新增 `DEGRADED_VOICE_RE` / `selectVoice`：macOS 的 Eddy/Reed/Flo/Sandy/Shelley/Rocko/Grandma/Grandpa
在 zh-CN 下**能出声但不发 `onboundary`**（同一句：它们 0 次，婷婷 15 次、Li-Mu 13 次），
而基座口型同步依赖 boundary。修复后：**狐狸先生 → Li-Mu（男声，13 次 boundary）／织伴 → 婷婷（15 次）**，
两人音色与织伴挂件（sweet → 婷婷 + pitch 1.25）不再互相糊在一起。
试听样本：`outputs/voice-samples/{fox-l1,fox-l4,fox-done,mate-intro}.m4a`。
