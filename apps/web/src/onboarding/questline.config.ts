/**
 * questline.config · 「懂汇报的狐狸先生」首日上岗内容包（FOX 试验田版）
 *
 * 结构上刻意与行业包对齐：NPC 人设 / 员工卡 / 目标模板 / 首单任务卡 / 成就 / 价值口径 / 下一步。
 * 生产化方向（本次不做）：迁到 `bundles/<industry>/onboarding/*.yml`，由
 * `industry-contract` 的 Bundle 投影提供，基座只保留 `questline.ts` 的机制。
 *
 * 内容纪律：
 *  - 员工卡里的岗位、职责、航道（围栏）必须与 `bundles/hotel/presets/*.yml` 一致，不自造岗位；
 *  - 任何"示例数字"必须带 `sample: true` 标注，界面按演示数据处理；
 *  - 台词每关至少 3 句（进场/等待/过关），单句控制在 42 字以内（"三句话汇报"节奏）。
 */
import type { VoiceProfile } from "../voice/VoiceEngine";
import type { QuestStageId } from "./questline";

export interface QuestScript {
  enter: string;
  hint: string;
  success: string;
}

export interface QuestStageDef {
  id: QuestStageId;
  badge: string;
  title: string;
  objective: string;
  primaryLabel: string;
  script: QuestScript;
}

export interface EmployeeCardDef {
  id: string;
  presetKey: string;
  title: string;
  duty: string;
  /** 航道许可（围栏）——直接引用行业包规则名 */
  fences: string[];
  tasks: string[];
  /** 示例产出（演示数据，界面必须标注） */
  sample: string;
  sampleIsDemo: boolean;
}

export interface GoalTemplateDef {
  id: string;
  title: string;
  metric: string;
  ownerPresetKey: string;
  ownerTitle: string;
  artifact: string;
  steps: number;
  approvals: number;
}

export interface TaskCardDef {
  id: string;
  title: string;
  ownerPresetKey: string;
  ownerTitle: string;
  steps: number;
  eta: string;
  artifact: string;
  approvals: number;
  credits: number;
  /** 派单时给数字员工的指令原文（走真实 threads.dispatch 通道） */
  dispatchTitle: string;
}

export interface AchievementDef {
  id: string;
  title: string;
  hint: string;
  icon: "rocket" | "team" | "tasks" | "approval" | "celebrate";
  /** 解锁来源关卡，便于 HUD 展示"在哪一关拿到" */
  stage: QuestStageId;
}

export interface ValueMetricDef {
  id: string;
  label: string;
  unit: string;
  /** 数据来源说明（禁止编数） */
  source: string;
}

export interface NextStepDef {
  id: "night_shift" | "real_data" | "customize";
  title: string;
  desc: string;
  to: string;
}

export interface QuestlineConfig {
  journeyName: string;
  mateName: string;
  mateRole: string;
  ownerTitle: string;
  mateVoice: VoiceProfile;
  stages: QuestStageDef[];
  employees: EmployeeCardDef[];
  goals: GoalTemplateDef[];
  tasks: TaskCardDef[];
  achievements: AchievementDef[];
  values: ValueMetricDef[];
  nextSteps: NextStepDef[];
}

/** 狐狸先生音色：沉稳、比织伴略低略慢，避免两个角色在字幕条上被认成同一个人 */
export const FOX_MATE_VOICE: VoiceProfile = {
  pitch: 0.92,
  rate: 0.98,
  preferredNames: ["Eddy", "Reed", "Yunxi", "Yunjian", "云希", "云健", "李沐"],
};

export const QUESTLINE: QuestlineConfig = {
  journeyName: "首日上岗",
  mateName: "狐狸先生",
  mateRole: "汇报官 · 带玩向导",
  ownerTitle: "董事长",
  mateVoice: FOX_MATE_VOICE,

  stages: [
    {
      id: "meet",
      badge: "认人",
      title: "第 1 关 · 认识三位当家人",
      objective: "知道谁在替您管房价、口碑和账目，以及他们什么时候必须来问您。",
      primaryLabel: "都认识了",
      script: {
        enter: "董事长，三句话向您汇报：您有 11 个人在岗，今天就能干活，但先认识三位当家人。",
        hint: "点一下卡片就算认识了。也可以换一批，或者先跳过。",
        success: "认全了。以后有事，您直接找他们三个就行。",
      },
    },
    {
      id: "goal",
      badge: "定目标",
      title: "第 2 关 · 今天最想解决的一件事",
      objective: "给团队一个明确方向；系统会告诉您谁负责、几步做完、什么时候来问您。",
      primaryLabel: "就按这个来",
      script: {
        enter: "团队干活得先知道您要什么。选一个，或者直接跟我说一句。",
        hint: "三个选项都是酒店最常操心的：差评、房价、账目。",
        success: "收到。我把它拆成任务，派给该负责的人。",
      },
    },
    {
      id: "dispatch",
      badge: "派活",
      title: "第 3 关 · 把第一件活交出去",
      objective: "亲手派一单，看着它被执行——这是您第一次当「甩手掌柜」。",
      primaryLabel: "派给他",
      script: {
        enter: "光看不算数，得派一单试试。看中哪张卡，拖到人身上也行。",
        hint: "每张卡都写清了：谁做、几步、多久、产出什么、要您拍板几次。",
        success: "活已经派出去了，进度我帮您盯着。",
      },
    },
    {
      id: "approve",
      badge: "拍板",
      title: "第 4 关 · 第一次行使董事长权力",
      objective: "在高风险动作上做一次真实决策——AI 永远不替您拍板。",
      primaryLabel: "就这样定",
      script: {
        enter: "这事按您定的航道必须您拍板。改前改后和依据都在这儿。",
        hint: "批准、修改、驳回都行；驳回想写原因就写一句。",
        success: "记下了，全链留痕。以后这种事只找您一次。",
      },
    },
    {
      id: "review",
      badge: "验收",
      title: "第 5 关 · 看看今天赚了什么",
      objective: "验收产出、看到价值计数，并决定下一步往哪走。",
      primaryLabel: "我看到了",
      script: {
        enter: "活干完了。您花了几分钟，团队替您跑了这些事——我念给您听。",
        hint: "没有回执的事我不会说「已完成」，这几项都是账本里查得到的。",
        success: "首日上岗完成。从今晚开始，夜班也能交给他们。",
      },
    },
  ],

  employees: [
    {
      id: "pricing",
      presetKey: "pricing-agent",
      title: "收益定价官",
      duty: "盯着竞对、房态和历史曲线，给出该涨该降的建议，并在授权范围内直接改价。",
      fences: ["R1 · 涨幅 ≤8% 自动执行", "R2 · 不低于保底价 ¥380"],
      tasks: ["复核今日房价建议", "盘点今日订单", "查看房态异常"],
      sample: "今天竞对三家的均价、您的房态缺口、建议调整的三个房型",
      sampleIsDemo: true,
    },
    {
      id: "review",
      presetKey: "review-agent",
      title: "口碑公关官",
      duty: "值守各渠道新评价，差评先写回复草稿，外发前一定请您过目。",
      fences: ["3 分以下差评必审挂起", "对外回复未经批准不外发"],
      tasks: ["处理今日住客诉求", "回复差评草稿", "复盘口碑走势"],
      sample: "今天 2 条差评的回复草稿 + 命中原因（卫生、噪音）",
      sampleIsDemo: true,
    },
    {
      id: "reconcile",
      presetKey: "reconcile-agent",
      title: "财务司库官",
      duty: "夜里把订单、结算、担保逐笔核对；大额退款和异常账单一定请您拍板。",
      fences: ["大额退款必审", "担保异常必须人工介入"],
      tasks: ["检查夜班交接", "复核订单对账", "查看异常账单"],
      sample: "昨夜 3 笔差异订单 + 建议处置方式（补登、退款、挂账）",
      sampleIsDemo: true,
    },
    {
      id: "inspection",
      presetKey: "inspection-agent",
      title: "品质巡检官",
      duty: "每天 07:00 只读巡检：价格、房态、评价、违规；异常分级推送，一键派单。",
      fences: ["只读巡检，不改任何渠道数据", "异常只推送与派单"],
      tasks: ["查看今日房态异常", "检查渠道价格", "复查评价违规"],
      sample: "今晨巡检发现的 2 处价格倒挂、1 处超售风险",
      sampleIsDemo: true,
    },
    {
      id: "frontdesk",
      presetKey: "frontdesk-agent",
      title: "前台接待官",
      duty: "入住退房辅助、订单处理、电话呼入记录与交接班清单，夜审协同。",
      fences: ["订单改价需审批", "住客隐私不外发"],
      tasks: ["处理今日住客诉求", "生成交接班清单", "跟进待入住订单"],
      sample: "今日 12 张待入住订单 + 3 条住客特殊需求",
      sampleIsDemo: true,
    },
  ],

  goals: [
    {
      id: "review-fast",
      title: "差评不过夜",
      metric: "差评 2 小时内响应率 100%",
      ownerPresetKey: "review-agent",
      ownerTitle: "口碑公关官",
      artifact: "今日差评处置清单（含回复草稿）",
      steps: 3,
      approvals: 1,
    },
    {
      id: "price-safe",
      title: "房价不踏空",
      metric: "未来 7 天不空房、也不跌破保底价",
      ownerPresetKey: "pricing-agent",
      ownerTitle: "收益定价官",
      artifact: "未来 7 天价格建议表",
      steps: 4,
      approvals: 2,
    },
    {
      id: "books-clear",
      title: "账目不过夜",
      metric: "昨日订单 100% 对平",
      ownerPresetKey: "reconcile-agent",
      ownerTitle: "财务司库官",
      artifact: "昨日对账差异单",
      steps: 3,
      approvals: 1,
    },
  ],

  tasks: [
    {
      id: "inspect-today",
      title: "查一遍今天的房态与价格异常",
      ownerPresetKey: "inspection-agent",
      ownerTitle: "品质巡检官",
      steps: 3,
      eta: "约 2 分钟",
      artifact: "异常清单（价格倒挂 / 超售 / 渠道违规）",
      approvals: 0,
      credits: 12,
      dispatchTitle: "巡检今天的房态与渠道价格，产出异常清单与处置建议",
    },
    {
      id: "guest-request",
      title: "处理今天住客的诉求",
      ownerPresetKey: "frontdesk-agent",
      ownerTitle: "前台接待官",
      steps: 3,
      eta: "约 3 分钟",
      artifact: "诉求处置记录 + 需要您拍板的补偿方案",
      approvals: 1,
      credits: 18,
      dispatchTitle: "处理今天住客的诉求，输出处置记录与需要董事长拍板的方案",
    },
    {
      id: "price-review",
      title: "复核今天的房价建议",
      ownerPresetKey: "pricing-agent",
      ownerTitle: "收益定价官",
      steps: 4,
      eta: "约 4 分钟",
      artifact: "调价建议表（含依据与保底价校验）",
      approvals: 1,
      credits: 24,
      dispatchTitle: "复核今天的房价建议，给出调价依据与保底价校验，越线部分提请审批",
    },
  ],

  achievements: [
    { id: "aboard", title: "首航就绪", hint: "完成首次欢迎仪式", icon: "rocket", stage: "meet" },
    { id: "three-keepers", title: "三位当家人", hint: "认识房价、口碑、账目的负责人", icon: "team", stage: "meet" },
    { id: "first-dispatch", title: "第一次派活", hint: "把第一件活交给数字员工", icon: "tasks", stage: "dispatch" },
    { id: "first-decision", title: "第一次拍板", hint: "完成一次真实审批", icon: "approval", stage: "approve" },
    { id: "first-close", title: "首次闭环", hint: "首单产出被验收", icon: "celebrate", stage: "review" },
  ],

  values: [
    { id: "auto-work", label: "已自主完成", unit: "项作业", source: "工作区事件账本（真实计数）" },
    { id: "pending", label: "待您拍板", unit: "项", source: "审批队列（真实计数）" },
    { id: "on-duty", label: "团队在岗", unit: "人", source: "当前 Bundle 编制（真实计数）" },
  ],

  nextSteps: [
    { id: "night_shift", title: "开启夜班", desc: "您睡觉的时候，他们接着干；明早 8:30 给您战报。", to: "/executive" },
    { id: "real_data", title: "接入真实数据与大模型", desc: "把演示数据换成您自己的订单、房价和评价。", to: "/onboarding" },
    { id: "customize", title: "定制我的行业版", desc: "隔离编制 + 上岗考，换一批适合您业态的人。", to: "/onboarding?mode=customize" },
  ],
};

export function stageDef(stage: QuestStageId): QuestStageDef {
  const found = QUESTLINE.stages.find((item) => item.id === stage);
  if (found) return found;
  const first = QUESTLINE.stages[0];
  if (!first) throw new Error("questline 配置缺少关卡定义");
  return first;
}

export function employeeCardOf(presetKey: string): EmployeeCardDef | null {
  return QUESTLINE.employees.find((item) => item.presetKey === presetKey) ?? null;
}
