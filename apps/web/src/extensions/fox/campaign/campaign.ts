/**
 * campaign · 实景商业游戏「经营主线」纯逻辑层（Season Campaign）
 *
 * 定位：把日常经营（派活、拍板、交付、夜班、差评处置、营收）变成一条可续播、
 * 可验收、有章节与 Boss 的赛季主线，让客户"一边玩着游戏，一边把钱挣了"。
 *
 * 纪律（与基座/questline 同口径）：
 *  - 进度只来自真实事实：里程碑与每日任务只认 `CampaignFacts`（服务端聚合/真实回执推导），
 *    前端不编造、不猜测、不把"打开页面"当成经营动作；
 *  - 未知即未知：未接入的事实按 0/未知处理，绝不触发 Boss 或通关（requireKnown 语义）；
 *  - 不做第二账本：本层的 campaignXp 只统计主线/每日任务发放的奖励经验，等级与总 XP 仍以
 *    server roster / questline 为唯一事实源；本层不授予任何权限、不影响围栏与审批；
 *  - 不做赌博机制：奖励全部确定性、可预期，无随机箱、无可变比率强化、无付费加速；
 *  - 本文件不依赖 DOM / React / 网络，可在 node 环境直接单测。
 */

/** 赛季结构版本：结构变更时递增，旧版本进度按新赛季重新开始（不脏读旧字段） */
export const CAMPAIGN_VERSION = 1;
export const CAMPAIGN_STORAGE_KEY = "wl-fox-campaign-v1";
/** 经营日以 Asia/Shanghai 计（与定时任务、夜班口径一致） */
export const CAMPAIGN_TZ_OFFSET_MINUTES = 480;

/* ================= 事实 ================= */

export type CounterFactKey =
  | "dispatched"
  | "decided"
  | "delivered"
  | "settled"
  | "nightRuns"
  | "handledNegativeReviews"
  | "revenueCny";

export type CampaignFactKey =
  | "goalConfirmed"
  | CounterFactKey
  | "openNegativeReviews"
  | "occupancyPct";

/** 累计计数（可做 delta，用于每日任务与"今天有没有经营动作"判定） */
export const COUNTER_FACT_KEYS: readonly CounterFactKey[] = [
  "dispatched",
  "decided",
  "delivered",
  "settled",
  "nightRuns",
  "handledNegativeReviews",
  "revenueCny",
];

/**
 * 来自系统真实事实的经营快照。
 * - 计数型字段为"赛季累计"；缺失/未接入一律填 0（不得填推测值）；
 * - openNegativeReviews / occupancyPct 是"当前值"（gauge），未知填 0，Boss 只会在有真实信号时触发。
 */
export interface CampaignFacts {
  goalConfirmed: boolean;
  dispatched: number;
  decided: number;
  delivered: number;
  settled: number;
  nightRuns: number;
  handledNegativeReviews: number;
  revenueCny: number;
  openNegativeReviews: number;
  occupancyPct: number;
}

export const EMPTY_CAMPAIGN_FACTS: CampaignFacts = {
  goalConfirmed: false,
  dispatched: 0,
  decided: 0,
  delivered: 0,
  settled: 0,
  nightRuns: 0,
  handledNegativeReviews: 0,
  revenueCny: 0,
  openNegativeReviews: 0,
  occupancyPct: 0,
};

function num(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;
}

/** 读取事实数值（布尔按 1/0 计），用于阈值比较 */
export function factValue(facts: CampaignFacts, key: CampaignFactKey): number {
  if (key === "goalConfirmed") return facts.goalConfirmed ? 1 : 0;
  return num(facts[key]);
}

/* ================= 配置类型 ================= */

export interface CampaignReward {
  /** 奖励经验（仅本赛季展示口径；等级仍以 roster/questline 为准） */
  xp?: number;
  /** 解锁成就 id（去重，幂等） */
  achievement?: string;
}

export interface CampaignMilestone {
  id: string;
  title: string;
  /** 给客户看的一句人话：为什么这件事值得做 */
  why: string;
  factKey: CampaignFactKey;
  target: number;
  reward: CampaignReward;
}

export interface CampaignChapter {
  id: string;
  /** 章节名（章节卡标题） */
  title: string;
  /** 叙事副标题（世界观一句话） */
  subtitle: string;
  milestones: CampaignMilestone[];
}

export interface DailyOpTemplate {
  id: string;
  title: string;
  factKey: CounterFactKey;
  target: number;
  reward: CampaignReward;
}

export interface BossCondition {
  key: CampaignFactKey;
  /** 触发/解除下界（含） */
  atLeast?: number;
  /** 触发/解除上界（不含） */
  atMost?: number;
}

export interface BossTemplate {
  id: string;
  name: string;
  subtitle: string;
  /** 出现条件（P0 异常：差评风暴 / 空房危机） */
  trigger: BossCondition;
  /** 击破条件（恢复常态） */
  resolve: BossCondition;
  /** 击破奖励 */
  reward: CampaignReward;
}

export interface CampaignConfig {
  seasonId: string;
  seasonTitle: string;
  /** 赛季目标一句话（HUD 顶部） */
  seasonGoal: string;
  chapters: CampaignChapter[];
  dailyOps: DailyOpTemplate[];
  bosses: BossTemplate[];
}

/* ================= 状态 ================= */

export type BossStatus = "active" | "resolved";

export interface BossState {
  status: BossStatus;
  /** 触发时的实事值（用于进度展示；不再随时间重算，避免历史被改写） */
  activatedValue: number;
  activatedAt: number;
  resolvedAt: number | null;
}

export interface DailyState {
  /** 经营日 key（Asia/Shanghai 的 YYYY-MM-DD） */
  dayKey: string;
  /** 当日 0 点时的计数快照：每日任务进度 = 当前值 - 快照值 */
  baseline: Record<string, number>;
  progress: Record<string, number>;
  completed: string[];
}

export interface CampaignStreak {
  current: number;
  best: number;
  /** 最近一个"有真实经营动作"的经营日 */
  lastActiveDayKey: string | null;
}

export interface CampaignState {
  version: number;
  seasonId: string;
  chapterIndex: number;
  completedMilestones: string[];
  achievements: string[];
  /** 只统计本层发放的奖励经验（非等级事实源） */
  campaignXp: number;
  streak: CampaignStreak;
  /**
   * 最近一次观测到的累计计数。
   * 换日基线取这里而不是"本次传入的事实"：否则客户当天没打开页面、动作先发生，
   * 换日时会把已发生的经营动作记成"没发生"（丢连续经营判定）。
   */
  observed: Record<string, number>;
  daily: DailyState;
  bosses: Record<string, BossState>;
  /** 累计有经营动作的天数（口径与 streak 一致） */
  daysActive: number;
  updatedAt: number;
}

export type CampaignEventKind = "milestone" | "chapter" | "daily" | "boss" | "boss_resolved" | "streak";

export interface CampaignEvent {
  kind: CampaignEventKind;
  id: string;
  label: string;
}

/* ================= 时间工具（经营日） ================= */

export function dayKeyOf(ts: number = Date.now(), offsetMinutes: number = CAMPAIGN_TZ_OFFSET_MINUTES): string {
  const shifted = new Date(ts + offsetMinutes * 60_000);
  const y = shifted.getUTCFullYear();
  const m = `${shifted.getUTCMonth() + 1}`.padStart(2, "0");
  const d = `${shifted.getUTCDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** 经营日加减（用于"昨天是否有经营动作"的连续判定） */
export function shiftDayKey(dayKey: string, days: number): string {
  const [y, m, d] = dayKey.split("-").map((part) => Number.parseInt(part, 10));
  if (!y || !m || !d) return dayKey;
  const base = Date.UTC(y, m - 1, d) + days * 86_400_000;
  const shifted = new Date(base);
  const yy = shifted.getUTCFullYear();
  const mm = `${shifted.getUTCMonth() + 1}`.padStart(2, "0");
  const dd = `${shifted.getUTCDate()}`.padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/* ================= 初始化 ================= */

function baselineOf(facts: CampaignFacts): Record<string, number> {
  const out: Record<string, number> = {};
  for (const key of COUNTER_FACT_KEYS) out[key] = num(facts[key]);
  return out;
}

export function createCampaignState(
  config: CampaignConfig,
  facts: CampaignFacts = EMPTY_CAMPAIGN_FACTS,
  now: number = Date.now(),
): CampaignState {
  return {
    version: CAMPAIGN_VERSION,
    seasonId: config.seasonId,
    chapterIndex: 0,
    completedMilestones: [],
    achievements: [],
    campaignXp: 0,
    streak: { current: 0, best: 0, lastActiveDayKey: null },
    observed: baselineOf(facts),
    daily: { dayKey: dayKeyOf(now), baseline: baselineOf(facts), progress: {}, completed: [] },
    bosses: {},
    daysActive: 0,
    updatedAt: now,
  };
}

/* ================= 条件求值 ================= */

export function meetsCondition(facts: CampaignFacts, condition: { key: CampaignFactKey; atLeast?: number; atMost?: number }): boolean {
  const value = factValue(facts, condition.key);
  if (condition.atLeast !== undefined && value < condition.atLeast) return false;
  if (condition.atMost !== undefined && value >= condition.atMost) return false;
  return true;
}

function unique<T extends string>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

/* ================= 每日任务 ================= */

/** 换日：重置当日进度并落新基线（累计计数只增，故用差值表达"今天做了多少"） */
export function rolloverDaily(state: CampaignState, facts: CampaignFacts, now: number = Date.now()): CampaignState {
  const dayKey = dayKeyOf(now);
  if (state.daily.dayKey === dayKey) return state;
  return {
    ...state,
    // 新的一天：以"上次观测值"为基线（见 CampaignState.observed 注释）
    daily: { dayKey, baseline: { ...baselineOf(facts), ...state.observed }, progress: {}, completed: [] },
    updatedAt: now,
  };
}

export function dailyProgressOf(state: CampaignState, facts: CampaignFacts, op: DailyOpTemplate): number {
  const base = state.daily.baseline[op.factKey] ?? 0;
  const value = num(facts[op.factKey]);
  return Math.max(0, Math.min(op.target, Math.floor(value - base)));
}

/* ================= 连续经营 ================= */

function hasActivity(state: CampaignState, facts: CampaignFacts): boolean {
  for (const key of COUNTER_FACT_KEYS) {
    const seen = state.observed[key] ?? 0;
    if (num(facts[key]) > seen) return true;
  }
  return false;
}

/** 合并观测值（累计计数只增；服务端回退时不把已观测值调低，避免重复计一次动作） */
function observeCounters(state: CampaignState, facts: CampaignFacts): CampaignState {
  const observed = { ...state.observed };
  for (const key of COUNTER_FACT_KEYS) {
    observed[key] = Math.max(observed[key] ?? 0, num(facts[key]));
  }
  return { ...state, observed };
}

function bumpStreak(state: CampaignState, dayKey: string, now: number): { state: CampaignState; event: CampaignEvent | null } {
  const { streak } = state;
  if (streak.lastActiveDayKey === dayKey) return { state, event: null };
  const continued = streak.lastActiveDayKey === shiftDayKey(dayKey, -1);
  const current = continued ? streak.current + 1 : 1;
  const next: CampaignState = {
    ...state,
    streak: { current, best: Math.max(streak.best, current), lastActiveDayKey: dayKey },
    daysActive: state.daysActive + 1,
    updatedAt: now,
  };
  return {
    state: next,
    event: { kind: "streak", id: `streak-${dayKey}`, label: `连续经营 ${current} 天` },
  };
}

/* ================= 主线推进 ================= */

function chapterMilestones(config: CampaignConfig, chapterIndex: number): CampaignMilestone[] {
  return config.chapters[chapterIndex]?.milestones ?? [];
}

function isChapterComplete(state: CampaignState, config: CampaignConfig, chapterIndex: number): boolean {
  const milestones = chapterMilestones(config, chapterIndex);
  return milestones.length > 0 && milestones.every((m) => state.completedMilestones.includes(m.id));
}

export interface CampaignTick {
  state: CampaignState;
  events: CampaignEvent[];
}

/**
 * 主入口：把真实事实喂进赛季，产出新状态与"刚刚发生"的事件（供动效/字幕/语音使用）。
 * 纯函数：不读时钟以外的时间源，不写存储，不触发网络。
 */
export function tickCampaign(
  state: CampaignState,
  facts: CampaignFacts,
  config: CampaignConfig,
  now: number = Date.now(),
): CampaignTick {
  const events: CampaignEvent[] = [];
  let current = rolloverDaily(state, facts, now);
  const dayKey = dayKeyOf(now);

  // 赛季/结构版本不一致：按新赛季重开，避免脏读
  if (current.version !== CAMPAIGN_VERSION || current.seasonId !== config.seasonId) {
    current = createCampaignState(config, facts, now);
  }

  // ① 连续经营（只认真实动作）
  if (hasActivity(current, facts)) {
    const bumped = bumpStreak(current, dayKey, now);
    current = bumped.state;
    if (bumped.event) events.push(bumped.event);
  }

  // ② 每日任务（差值口径）
  const completed = new Set(current.daily.completed);
  const progress: Record<string, number> = { ...current.daily.progress };
  for (const op of config.dailyOps) {
    const value = dailyProgressOf(current, facts, op);
    progress[op.id] = value;
    if (value >= op.target && !completed.has(op.id)) {
      completed.add(op.id);
      current = {
        ...current,
        campaignXp: current.campaignXp + (op.reward.xp ?? 0),
        achievements: op.reward.achievement
          ? unique([...current.achievements, op.reward.achievement])
          : current.achievements,
      };
      events.push({ kind: "daily", id: op.id, label: `每日任务完成：${op.title}` });
    }
  }
  current = { ...current, daily: { ...current.daily, progress, completed: [...completed] } };

  // ③ 章节里程碑（可连续推进多章；只认事实阈值）
  for (let guard = 0; guard < config.chapters.length + 1; guard += 1) {
    const chapter = config.chapters[current.chapterIndex];
    if (!chapter) break;
    let advancedInThisLoop = false;
    for (const milestone of chapter.milestones) {
      if (current.completedMilestones.includes(milestone.id)) continue;
      if (factValue(facts, milestone.factKey) < milestone.target) continue;
      current = {
        ...current,
        completedMilestones: [...current.completedMilestones, milestone.id],
        campaignXp: current.campaignXp + (milestone.reward.xp ?? 0),
        achievements: milestone.reward.achievement
          ? unique([...current.achievements, milestone.reward.achievement])
          : current.achievements,
        updatedAt: now,
      };
      events.push({ kind: "milestone", id: milestone.id, label: `里程碑达成：${milestone.title}` });
      advancedInThisLoop = true;
    }
    if (isChapterComplete(current, config, current.chapterIndex) && current.chapterIndex < config.chapters.length - 1) {
      const finished = chapter;
      current = { ...current, chapterIndex: current.chapterIndex + 1, updatedAt: now };
      events.push({ kind: "chapter", id: finished.id, label: `章节通关：${finished.title}` });
      continue;
    }
    if (!advancedInThisLoop) break;
  }

  // ④ Boss 战（异常攻坚）：出现与击破都只认事实；未知（0）不会触发有下界的条件
  let bosses = { ...current.bosses };
  for (const boss of config.bosses) {
    const existing = bosses[boss.id];
    if (!existing && meetsCondition(facts, boss.trigger)) {
      bosses = {
        ...bosses,
        [boss.id]: {
          status: "active",
          activatedValue: factValue(facts, boss.trigger.key),
          activatedAt: now,
          resolvedAt: null,
        },
      };
      events.push({ kind: "boss", id: boss.id, label: `攻坚目标出现：${boss.name}` });
      continue;
    }
    if (existing && existing.status === "active" && meetsCondition(facts, boss.resolve)) {
      bosses = {
        ...bosses,
        [boss.id]: { ...existing, status: "resolved", resolvedAt: now },
      };
      current = {
        ...current,
        campaignXp: current.campaignXp + (boss.reward.xp ?? 0),
        achievements: boss.reward.achievement
          ? unique([...current.achievements, boss.reward.achievement])
          : current.achievements,
      };
      events.push({ kind: "boss_resolved", id: boss.id, label: `攻坚目标击破：${boss.name}` });
    }
  }
  current = observeCounters({ ...current, bosses, updatedAt: now }, facts);

  return { state: current, events };
}

/* ================= 展示口径 ================= */

export interface BossView {
  id: string;
  name: string;
  subtitle: string;
  status: BossStatus;
  /** 0-100 的攻坚进度（按"离解除条件还有多远"折算） */
  progressPct: number;
  stage: "来袭" | "反击" | "击破";
}

export interface CampaignSummary {
  seasonId: string;
  seasonTitle: string;
  seasonGoal: string;
  chapterIndex: number;
  chapterTitle: string;
  chapterSubtitle: string;
  chapterDone: number;
  chapterTotal: number;
  totalDone: number;
  totalMilestones: number;
  seasonProgressPct: number;
  seasonCompleted: boolean;
  streak: CampaignStreak;
  dailyDone: number;
  dailyTotal: number;
  daily: Array<{ id: string; title: string; progress: number; target: number; done: boolean }>;
  activeBosses: BossView[];
  campaignXp: number;
  achievements: string[];
  /** 下一件值得做的事（已按章节顺序取第一个未完成里程碑） */
  nextUp: { id: string; title: string; why: string; progress: number; target: number } | null;
  label: string;
}

export function bossView(boss: BossTemplate, state: BossState, facts: CampaignFacts): BossView {
  const now = factValue(facts, boss.resolve.key);
  // "atMost" 语义：越小越好（如待处理差评 → 0 解除）
  let ratio = 0;
  if (boss.resolve.atMost !== undefined) {
    const target = boss.resolve.atMost;
    const start = Math.max(state.activatedValue, target + 1);
    ratio = (start - now) / (start - target);
  } else if (boss.resolve.atLeast !== undefined) {
    const target = boss.resolve.atLeast;
    const start = Math.min(state.activatedValue, target - 1);
    ratio = (now - start) / Math.max(1, target - start);
  }
  const progressPct = state.status === "resolved" ? 100 : Math.max(0, Math.min(99, Math.round(ratio * 100)));
  const stage: BossView["stage"] = state.status === "resolved" ? "击破" : progressPct >= 50 ? "反击" : "来袭";
  return { id: boss.id, name: boss.name, subtitle: boss.subtitle, status: state.status, progressPct, stage };
}

export function campaignSummary(state: CampaignState, facts: CampaignFacts, config: CampaignConfig): CampaignSummary {
  const chapter = config.chapters[state.chapterIndex] ?? config.chapters[0];
  const chapterList = chapter?.milestones ?? [];
  const chapterDone = chapterList.filter((m) => state.completedMilestones.includes(m.id)).length;
  const all = config.chapters.flatMap((c) => c.milestones);
  const totalDone = all.filter((m) => state.completedMilestones.includes(m.id)).length;
  const seasonCompleted = all.length > 0 && totalDone === all.length;
  const daily = config.dailyOps.map((op) => {
    const progress = state.daily.progress[op.id] ?? 0;
    return { id: op.id, title: op.title, progress, target: op.target, done: state.daily.completed.includes(op.id) };
  });
  const activeBosses = config.bosses
    .filter((boss) => state.bosses[boss.id])
    .map((boss) => bossView(boss, state.bosses[boss.id]!, facts));
  const nextMilestone = chapterList.find((m) => !state.completedMilestones.includes(m.id)) ?? null;
  const nextUp = nextMilestone
    ? {
        id: nextMilestone.id,
        title: nextMilestone.title,
        why: nextMilestone.why,
        progress: Math.min(factValue(facts, nextMilestone.factKey), nextMilestone.target),
        target: nextMilestone.target,
      }
    : null;
  const seasonProgressPct = all.length === 0 ? 0 : Math.round((totalDone / all.length) * 100);
  const label = seasonCompleted
    ? `赛季通关 · 连续经营 ${state.streak.current} 天`
    : nextUp
      ? `第 ${state.chapterIndex + 1} 章 · 还差「${nextUp.title}」`
      : `第 ${state.chapterIndex + 1} 章`;
  return {
    seasonId: config.seasonId,
    seasonTitle: config.seasonTitle,
    seasonGoal: config.seasonGoal,
    chapterIndex: state.chapterIndex,
    chapterTitle: chapter?.title ?? "",
    chapterSubtitle: chapter?.subtitle ?? "",
    chapterDone,
    chapterTotal: chapterList.length,
    totalDone,
    totalMilestones: all.length,
    seasonProgressPct,
    seasonCompleted,
    streak: state.streak,
    dailyDone: daily.filter((d) => d.done).length,
    dailyTotal: daily.length,
    daily,
    activeBosses,
    campaignXp: state.campaignXp,
    achievements: state.achievements,
    nextUp,
    label,
  };
}

/* ================= 持久化（防御式解析） ================= */

function positiveInt(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

function numberRecord(value: unknown): Record<string, number> {
  if (typeof value !== "object" || value === null) return {};
  const out: Record<string, number> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (typeof raw === "number" && Number.isFinite(raw) && raw >= 0) out[key] = Math.floor(raw);
  }
  return out;
}

export function parseCampaignState(
  raw: string | null | undefined,
  config: CampaignConfig,
  now: number = Date.now(),
): CampaignState {
  const fresh = createCampaignState(config, EMPTY_CAMPAIGN_FACTS, now);
  if (!raw) return fresh;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return fresh;
  }
  if (typeof parsed !== "object" || parsed === null) return fresh;
  const record = parsed as Record<string, unknown>;
  if (record.version !== CAMPAIGN_VERSION || record.seasonId !== config.seasonId) return fresh;
  const streakRaw = (typeof record.streak === "object" && record.streak !== null ? record.streak : {}) as Record<string, unknown>;
  const dailyRaw = (typeof record.daily === "object" && record.daily !== null ? record.daily : {}) as Record<string, unknown>;
  const bossesRaw = (typeof record.bosses === "object" && record.bosses !== null ? record.bosses : {}) as Record<string, unknown>;
  const bosses: Record<string, BossState> = {};
  for (const [id, value] of Object.entries(bossesRaw)) {
    if (typeof value !== "object" || value === null) continue;
    const boss = value as Record<string, unknown>;
    if (boss.status !== "active" && boss.status !== "resolved") continue;
    bosses[id] = {
      status: boss.status,
      activatedValue: positiveInt(boss.activatedValue),
      activatedAt: typeof boss.activatedAt === "number" ? boss.activatedAt : now,
      resolvedAt: typeof boss.resolvedAt === "number" ? boss.resolvedAt : null,
    };
  }
  const dayKey = typeof dailyRaw.dayKey === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dailyRaw.dayKey)
    ? dailyRaw.dayKey
    : fresh.daily.dayKey;
  const observedRaw = numberRecord(record.observed);
  return {
    version: CAMPAIGN_VERSION,
    seasonId: config.seasonId,
    chapterIndex: Math.max(0, Math.min(config.chapters.length - 1, positiveInt(record.chapterIndex))),
    completedMilestones: Array.isArray(record.completedMilestones)
      ? unique(record.completedMilestones.filter((v): v is string => typeof v === "string" && v.length > 0))
      : [],
    achievements: Array.isArray(record.achievements)
      ? unique(record.achievements.filter((v): v is string => typeof v === "string" && v.length > 0))
      : [],
    campaignXp: positiveInt(record.campaignXp),
    streak: {
      current: positiveInt(streakRaw.current),
      best: positiveInt(streakRaw.best),
      lastActiveDayKey:
        typeof streakRaw.lastActiveDayKey === "string" && /^\d{4}-\d{2}-\d{2}$/.test(streakRaw.lastActiveDayKey)
          ? streakRaw.lastActiveDayKey
          : null,
    },
    observed: { ...fresh.observed, ...observedRaw },
    daily: {
      dayKey,
      baseline: numberRecord(dailyRaw.baseline),
      progress: numberRecord(dailyRaw.progress),
      completed: Array.isArray(dailyRaw.completed)
        ? unique(dailyRaw.completed.filter((v): v is string => typeof v === "string" && v.length > 0))
        : [],
    },
    bosses,
    daysActive: positiveInt(record.daysActive),
    updatedAt: typeof record.updatedAt === "number" ? record.updatedAt : now,
  };
}

export function serializeCampaignState(state: CampaignState): string {
  return JSON.stringify(state);
}
