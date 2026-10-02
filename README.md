# 懂汇报的狐狸先生 · workroom-fox

> **AI Native 智能经营系统（酒店行业版）——一支"看得见、听得到、派得动活"的数字职业经理人团队。**
> 开源协议：Apache License 2.0 · 基于 WorkLoom 体系（同源 workloom-hotel）深度演进

<!-- WORKLOOM-AUTONOMOUS-OPERATIONS:BEGIN -->
## 🧭 理论纲领 · AI 自主经营模式

> **客户购买的不是工具，而是一家正在运行的公司。**
> 本仓是 WorkLoom「AI 自主经营」体系的一部分；完整纲领《AI 自主经营纲领——论一个新经营范式的诞生》见 **[AI-AUTONOMOUS-OPERATIONS.md](AI-AUTONOMOUS-OPERATIONS.md)**。

- **成本结构翻转**：人类公司的管理动作，是为"人不可靠"支付的三种对冲税（激励 / 层级 / 监督）；AI 自治退掉这笔税，转而为 **边界定义 + 持续评测** 付费。
- **三个翻转**：管理对象从动机 → **边界**；经营动作从传递信息 → **分配注意力**；行业 knowhow 从"人在经验在" → **可计量资产**。
- **责任不可自动化**：AI 不能坐牢、不能赔钱。围栏 / 人审 / 汇报 / 事件账本构成的治理层，是自治的**对价**，不是限制器。
- **终态判据**：没有客户操作，这件事还会不会发生？"开箱即用"不够——终态是 **没开箱就在运营**：首次登录看到的是已经跑出来的业务进展与第一份汇报。
- **自治权是挣来的**：观察 → 请示后执行 → 汇报后执行 → 全权自治，按决策域用回测证据升降档；汇报透明是自治的价格标签。
- **度量即货币**：自治率、客户干预率、回测命中率三条曲线决定自治权扩张；模拟成功不计入自治率。
<!-- WORKLOOM-AUTONOMOUS-OPERATIONS:END -->

<!-- CAPABILITIES:BEGIN -->
<!-- 本区块由 scripts/generate-capabilities.mjs 自动生成（2026-10-02），请勿手改；重跑 pnpm capabilities 更新 -->

## 🧩 系统能力速览（自动生成 · 与代码同步）

> 以下为源码目录与入口清单；实际调用及结果状态见能力导览的独立证据字段，未验证项不能作交付承诺。

- 🖥 **三端应用入口**：PC 端 · B 端工作台 · 移动端 · B 端高保真 · 移动端 · C 端 AI 服务前台
- 🏨 **行业 Bundle（垂直能力包）**：bundles/hotel/
- 🧑‍💼 **数字员工与数字人（本仓自带）**：数字员工中心（`/agents`） · 织伴数字人（Live2D 常驻浮层） · 语音与口型引擎 · Live2D 渲染后端与资产
- 🖐 **操作电脑能力（本仓自带 · 可装生产工作站）**：computer-use 三层感知入口 · HTTP 远程驱动 + MCP server
- 🤖 **AI 自动化引擎（系统内置能力）**：围栏 DSL 引擎 · 技能保鲜环（下行分发） · L2 编排（ASK/QUEST） · 夜班自动运行 · 模型路由 · 五元事件 + RLS 隔离 等 10 项
- ✅ **验证与质量（工程纪律）**：一键安装（bootstrap） · 主测试套件 · 发布门禁 · 五元事件验链 · Agent 能力巡游 · 环境自检
- 🎁 **演示与交付资产**：高保真演示页 ×6 · 官网静态站 · 自带技能 ×5 · 能力导览 PPT · Mock 数据体系

> 📖 完整能力导览（含截图与体验路径）：[docs/capabilities.auto.md](docs/capabilities.auto.md) ｜ 🤖 AI Agent 入口：[AGENTS.md](AGENTS.md) ｜ 🎯 首启必跑：`pnpm preview:all`
<!-- CAPABILITIES:END -->

---

## 它是什么

「懂汇报的狐狸先生」是一套 **AI Native 人机协作经营系统**：一支由 AI 职业经理人组成的数字员工团队，7×24 小时替你经营酒店——市场侦察、内容营销、收益定价、财务对账、品质巡检、口碑公关、前台接待，全部自动运行、全程留痕、高危永远人审。

与所有经营软件不同的是它的**关系界面**：

- **3D 数字职场**：真人风骨骼动画角色在 3D 办公室里实时走位——谁在作业、谁遇阻、谁拿着事项等你拍板，一眼可见；拖任务卡到人身上就派活；
- **3D 汇报舞台**：每天开工前，团队在环形剧场列队向董事长（你）报到，CEO 语音晨报、字幕条同步；
- **视听觉醒（M1 新特性）**：三层环境音效、仪式语音播报、导演运镜（请示/熔断/捷报自动给你镜头）、注视感知（你盯着谁看，谁就抬头向你点头）。

## M1 · 视听觉醒（本仓核心演进）

| 特性 | 说明 |
|---|---|
| **三层音效系统** | 环境层（办公白噪/夜班雨声/清晨鸟鸣）+ 反馈层（审批盖章/派活/捷报）+ 仪式层（晨会号角/熔断警报）——全部 WebAudio 程序化合成，**零音频资产、零版权风险** |
| **语音播报** | 端侧 speechSynthesis（不联网、零密钥），7+1 角色固定音色参数，优先级队列（熔断强制打断），三档开关（仅仪式与熔断/全语音/仅字幕） |
| **新闻台字幕条** | 所有语音的字幕等价物，TTS 不可用时自动降级为纯字幕——可及性保底 |
| **导演运镜** | 事件驱动镜头：新请示轻推中景、熔断红色急推、捷报特写；**日频次熔断 ≤6 次**，用户输入立即接管，可全局关闭 |
| **视线感知** | 镜头注视某员工 1.5 秒，他抬头向你点头示意，并浮出一句话状态（hover 0.5s 同样可唤起） |

> 技术方案详见 [`docs/tech-design-m1.md`](docs/tech-design-m1.md)。

## 首日上岗 · 狐狸先生带玩（本仓新增）

欢迎仪式之后不再"看完就散"：引导 NPC **狐狸先生**会带着董事长走完五关——
**认人 → 定目标 → 派活 → 拍板 → 验收**，全程约 8 分钟。

| 关卡 | 客户做什么 | 拿到什么 |
|---|---|---|
| 1 认人 | 点亮收益定价官 / 口碑公关官 / 财务司库官 | 知道谁管什么、什么时候必须来问您 |
| 2 定目标 | 三选一目标模板或自己说一句 | 目标卡：负责人 / 产出 / 几步 / 要您拍板几次 |
| 3 派活 | 把任务卡派给数字员工（真实任务通道） | 一条真实任务线程 + 进度，看得见谁在干 |
| 4 拍板 | 批准 / 修改 / 驳回一次真实审批 | 全链留痕 + 董事长 XP |
| 5 验收 | 看交付与成绩单 | 5 枚成就 + 下一步（开夜班 / 接真实数据 / 定制行业版） |

纪律：**没有回执不说"已完成"、没有待审事项不编造审批、游戏不发放任何权限**；进度可暂停续播，
随时"稍后再来"。技术说明见 [`docs/fox-questline.md`](docs/fox-questline.md)。

## 实机运行截图（真实运行态实拍 · 非设计稿）

截图来自本仓真实运行态（`pnpm setup && pnpm app`，云栖酒店演示数据）。3D 职场/舞台为实时渲染，非录制视频。

| 3D 数字职场 · 经营首页（`/`） | 首日上岗 · 狐狸先生带玩（五关） |
|---|---|
| ![3D 数字职场](docs/images/shots/pc-home.png) | ![首日上岗](docs/images/shots/pc-questline.png) |

| 数字员工 · 人机混编通讯录（`/agents`） | 织伴数字人 · 首装开场 |
|---|---|
| ![数字员工](docs/images/shots/pc-agents.png) | ![织伴开场](docs/images/shots/pc-mate-welcome.png) |

| 统一待办（`/inbox`） | 审批中心（`/approvals`） |
|---|---|
| ![统一待办](docs/images/shots/pc-inbox.png) | ![审批中心](docs/images/shots/pc-approval.png) |

| 经营报告 · 晨报（`/reports`） | 经营驾驶舱 · 数字CEO（`/executive`） |
|---|---|
| ![经营报告](docs/images/shots/pc-reports.png) | ![经营驾驶舱](docs/images/shots/pc-chairman.png) |

| 夜班中心（`/night`） | 技能中心（`/skills`） |
|---|---|
| ![夜班中心](docs/images/shots/pc-night.png) | ![技能中心](docs/images/shots/pc-skills.png) |

| 围栏规则（`/guardrails`） | 事件账本（`/events`） |
|---|---|
| ![围栏规则](docs/images/shots/pc-rules.png) | ![事件账本](docs/images/shots/pc-events.png) |

| 组织记忆（`/memory`） | 服务前台（`/service`） |
|---|---|
| ![组织记忆](docs/images/shots/pc-memory.png) | ![服务前台](docs/images/shots/pc-service.png) |

| 移动 B 端 · 经营主页 | 移动 B 端 · 数字员工 | C 端 · 住客对话 | C 端 · 服务大厅 |
|---|---|---|---|
| ![移动B端](docs/images/shots/mb-owner.png) | ![移动端数字员工](docs/images/shots/mb-agents.png) | ![C端对话](docs/images/shots/mc-chat.png) | ![服务大厅](docs/images/shots/mc-service.png) |

> **数字员工名册（`/agents`）**：人与数字员工同一本通讯录，每位都有档案（来源 Bundle / 围栏授权逐条对账 / 30 天战绩 / 段位 / 派遣）；夜班岗位 22:00–08:00 自动上线，只读岗位标绿无写工具。
> **数字人织伴（LoomMate）**：全页面常驻的 Live2D 小秘书——语音 + 口型播出晨报与告警，三态（小角落 / 大形象 / 屏保）可切，记忆透明面板可查可删。它是 Fox「视听觉醒」的常驻成员，与 3D 舞台、环境音效、导演运镜共同构成"看得见、听得到"的关系界面。

## 账号体系（基座自带 · 开箱即用）

狐狸版开箱自带完整账号体系（基座 `packages/base/accounts` 同步而来，无需配置）：

- **门店团队**：老板/店长/员工/查看四角色；手机验证码登录；前台三班倒共用电脑用**快切 PIN** 换班（操作记到具体人）；
- **一人多店**：民宿主/多店老板**统一待办**首页——跨店聚合审批/告警/工单，按店分组；
- **伙伴协作**：托管/代运营 agency 白名单授权（资金类永不开放，随时吊销，动作可见）；保洁维修外包用一次性工单通行证；
- **视听场景联动**：「看得见、听得到」的视听巡检产生的告警与工单，同样按角色进入对应成员的待办——谁在班上谁处理，换班不断线；
- **页面**：/login 登录 · /activate 自助开通 · /invite 接受邀请 · P28 统一待办 · P29 我的 · P30 成员管理 · P31 伙伴授权。

## 快速开始

```bash
# 环境：Node.js 22+ / pnpm 10+ / Docker（PostgreSQL 17）
pnpm install
pnpm setup        # 环境检查 → 依赖 → 数据库 → 迁移 + 演示数据种子
pnpm app          # 启动桌面客户端（Electron，固定比例画布，推荐）
# 或浏览器模式：pnpm dev（server:8787 + web:5173）
```

首次进入默认演示数据（云栖酒店 · 全模拟运行态），开箱即玩。

## 架构速览

<p align="center"><img src="docs/images/architecture.png" alt="狐狸先生系统架构（体验层 / 服务层 / hotel Bundle + 基座十域 / 运行时地基 / 数据层）" width="92%"/></p>

<p align="center"><img src="docs/images/business-loop.png" alt="狐狸先生的一天：晨会报到 → 职场作业 → 举手请示 → 夜班 → 视听播报 → 首日上岗" width="92%"/></p>

```
apps/
  web/        React 19 + Vite + Tailwind v4 + React Three Fiber（3D 双场景 + M1 视听层）
  server/     Hono + tRPC（经营 API / 审批路由 / 技能分发）
  webc/       C 端服务前台（住客问答）
  desktop/    Electron 客户端壳（固定比例画布 / 托盘 / 单实例）
packages/
  base/       治理内核（围栏瀑布 / 事件哈希链 / 五级审批）
  db/         迁移与 RLS（app.workspace_id GUC）
bundles/
  hotel/      行业包：角色 presets / 技能 / 围栏规则
```

关键设计纪律：

- **分级静默**：L0/L1 自动、L2 永远人审（董事长级审批）；
- **纯增强层**：音频/语音/运镜任何故障不影响业务功能；
- **命名规范**：数字员工 = 官衔·人名（财务司库官·秦清晏），界面永不出现"Agent"代号；
- **深空银辉主题**：深空灰底 + 亮银视觉元素的设计令牌体系。

## 开源说明

- 协议：**Apache License 2.0**（与上游 workloom-hotel 一致，上游说明见 [README-upstream.md](README-upstream.md)）；
- 3D 角色素材：KayKit Adventurers（**CC0**，见 `oss-components.json`）；
- 音效/语音：全部程序化生成或端侧合成，仓库不含任何第三方版权音频；
- 欢迎 Issue / PR——尤其欢迎：角色动画编排、中文 TTS 音色方案、行业包移植。

## 文档

- [`docs/tech-design-m1.md`](docs/tech-design-m1.md) —— M1 视听觉醒技术方案
- [`docs/agent-naming-spec.md`](docs/agent-naming-spec.md) —— 数字员工命名规范（F-NAME1）

## 桌面 Agent 接入（Codex / DeepSeek Harness）

本仓内置桌面 Agent 入口：`node scripts/workloom-agent.mjs list`（能力清单）与
`node scripts/workloom-agent-mcp.mjs`（stdio MCP）。接入步骤、本仓可用能力与安全边界见
[`docs/AGENT-CLIENTS.md`](docs/AGENT-CLIENTS.md)。
