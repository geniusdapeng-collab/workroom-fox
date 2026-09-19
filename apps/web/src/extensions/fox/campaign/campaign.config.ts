/**
 * campaign.config · 实景商业游戏「第一赛季」内容（行业内容层）
 *
 * 与 questline.config 同纪律：文案与阈值是**内容**，逻辑在 campaign.ts；
 * 行业版可整包替换本文件（后续迁到 bundles/<industry>/campaign/*.yml）。
 *
 * 赛季主题：把一家门店的一年，做成一场"从开张到飞轮"的经营长线。
 * 所有里程碑只认真实经营事实（派活/拍板/交付/沉淀/夜班/差评处置/营收），
 * 没有事实来源的指标一律不设里程碑——宁可少一条，不编一条。
 */
import type { CampaignConfig } from "./campaign";

export const CAMPAIGN: CampaignConfig = {
  seasonId: "fox-season-1",
  seasonTitle: "第一赛季 · 从开张到飞轮",
  seasonGoal: "让门店自己转起来：三个月内跑出可复制的经营节奏",

  chapters: [
    {
      id: "c1-open",
      title: "第一章 · 开张",
      subtitle: "把班底立起来，把第一件活派出去",
      milestones: [
        {
          id: "c1-m1", title: "定下赛季目标", why: "目标确认后，数字员工才知道为谁干活",
          factKey: "goalConfirmed", target: 1, reward: { xp: 5, achievement: "ach-open-goal" },
        },
        {
          id: "c1-m2", title: "派出第一件活", why: "第一件活派出去，团队才算真的开工",
          factKey: "dispatched", target: 1, reward: { xp: 5, achievement: "ach-open-dispatch" },
        },
        {
          id: "c1-m3", title: "完成第一次拍板", why: "你会拍板，团队才敢往前走",
          factKey: "decided", target: 1, reward: { xp: 8, achievement: "ach-open-decide" },
        },
        {
          id: "c1-m4", title: "拿到第一份交付", why: "有交付才有验收，有验收才有复利",
          factKey: "delivered", target: 1, reward: { xp: 10, achievement: "ach-open-deliver" },
        },
      ],
    },
    {
      id: "c2-steady",
      title: "第二章 · 稳住基本盘",
      subtitle: "夜班跑起来，差评压下去",
      milestones: [
        {
          id: "c2-m1", title: "沉淀 5 条经验", why: "经验不沉淀，团队每天都在重新学一遍",
          factKey: "settled", target: 5, reward: { xp: 15, achievement: "ach-steady-settle5" },
        },
        {
          id: "c2-m2", title: "夜班跑满 3 轮", why: "夜班是这台机器的第二个引擎",
          factKey: "nightRuns", target: 3, reward: { xp: 15, achievement: "ach-steady-night3" },
        },
        {
          id: "c2-m3", title: "处理 3 条差评", why: "口碑是复购的入口，差评是免费的需求清单",
          factKey: "handledNegativeReviews", target: 3, reward: { xp: 15, achievement: "ach-steady-review3" },
        },
        {
          id: "c2-m4", title: "累计交付 5 件", why: "稳定交付是「能挣钱」的最低门槛",
          factKey: "delivered", target: 5, reward: { xp: 20, achievement: "ach-steady-deliver5" },
        },
      ],
    },
    {
      id: "c3-grow",
      title: "第三章 · 起量",
      subtitle: "把节奏换成营收",
      milestones: [
        {
          id: "c3-m1", title: "赛季营收 ¥5,000", why: "第一笔看得见的钱，证明这套班子能挣钱",
          factKey: "revenueCny", target: 5000, reward: { xp: 30, achievement: "ach-grow-revenue5k" },
        },
        {
          id: "c3-m2", title: "累计拍板 10 次", why: "拍板密度决定经营速度",
          factKey: "decided", target: 10, reward: { xp: 20, achievement: "ach-grow-decide10" },
        },
        {
          id: "c3-m3", title: "累计交付 15 件", why: "交付量是产能，不是忙",
          factKey: "delivered", target: 15, reward: { xp: 25, achievement: "ach-grow-deliver15" },
        },
      ],
    },
    {
      id: "c4-flywheel",
      title: "第四章 · 飞轮",
      subtitle: "让团队自己发现问题、自己修",
      milestones: [
        {
          id: "c4-m1", title: "沉淀 20 条经验", why: "组织记忆是唯一越用越厚的资产",
          factKey: "settled", target: 20, reward: { xp: 40, achievement: "ach-flywheel-settle20" },
        },
        {
          id: "c4-m2", title: "夜班跑满 10 轮", why: "连续夜班 = 连续复利",
          factKey: "nightRuns", target: 10, reward: { xp: 40, achievement: "ach-flywheel-night10" },
        },
        {
          id: "c4-m3", title: "赛季营收 ¥20,000", why: "这是「租金覆盖」的门槛，也是本季的通关线",
          factKey: "revenueCny", target: 20000, reward: { xp: 60, achievement: "ach-flywheel-revenue20k" },
        },
      ],
    },
  ],

  dailyOps: [
    {
      id: "daily-decide", title: "今天拍一次板", factKey: "decided", target: 1,
      reward: { xp: 3 },
    },
    {
      id: "daily-dispatch", title: "今天派一件活", factKey: "dispatched", target: 1,
      reward: { xp: 2 },
    },
    {
      id: "daily-settle", title: "今天沉淀一条经验", factKey: "settled", target: 1,
      reward: { xp: 5 },
    },
    {
      id: "daily-review", title: "今天处理一条差评", factKey: "handledNegativeReviews", target: 1,
      reward: { xp: 5 },
    },
  ],

  bosses: [
    {
      id: "boss-review-storm",
      name: "差评风暴",
      subtitle: "待处理差评 ≥3：口碑正在掉血，先救口碑再谈增长",
      // 未知（0）不会触发；只有真实待处理差评达阈值才出现
      trigger: { key: "openNegativeReviews", atLeast: 3 },
      // atMost 为不含界：<2 即「0 或 1 条待处理」
      resolve: { key: "openNegativeReviews", atMost: 2 },
      reward: { xp: 25, achievement: "ach-boss-review-storm" },
    },
    {
      id: "boss-empty-rooms",
      name: "空房危机",
      subtitle: "出租率 <50%：房间在空转，需要一次价格与渠道的反击",
      // occupancyPct 未知时填 0，两个条件同时要求 ≥1 与 <50 → 未知不触发
      trigger: { key: "occupancyPct", atLeast: 1, atMost: 50 },
      resolve: { key: "occupancyPct", atLeast: 65 },
      reward: { xp: 30, achievement: "ach-boss-empty-rooms" },
    },
  ],
};

/** 成就展示名（HUD 只展示人话，不展示 id） */
export const ACHIEVEMENT_NAMES: Record<string, string> = {
  "ach-open-goal": "开门第一件事",
  "ach-open-dispatch": "开工大吉",
  "ach-open-decide": "第一次拍板",
  "ach-open-deliver": "真交付",
  "ach-steady-settle5": "经验簿",
  "ach-steady-night3": "夜班三连",
  "ach-steady-review3": "口碑修复师",
  "ach-steady-deliver5": "稳定输出",
  "ach-grow-revenue5k": "第一桶金",
  "ach-grow-decide10": "拍板十次",
  "ach-grow-deliver15": "产能上线",
  "ach-flywheel-settle20": "组织记忆",
  "ach-flywheel-night10": "夜班老手",
  "ach-flywheel-revenue20k": "租金覆盖",
  "ach-boss-review-storm": "风暴平息",
  "ach-boss-empty-rooms": "满房反击",
};

export function achievementName(id: string): string {
  return ACHIEVEMENT_NAMES[id] ?? id;
}

export function milestoneTitle(id: string): string {
  for (const chapter of CAMPAIGN.chapters) {
    const hit = chapter.milestones.find((m) => m.id === id);
    if (hit) return hit.title;
  }
  return id;
}
