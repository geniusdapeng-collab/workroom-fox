import { describe, expect, it } from "vitest";
import {
  CAMPAIGN_VERSION,
  COUNTER_FACT_KEYS,
  EMPTY_CAMPAIGN_FACTS,
  campaignSummary,
  bossView,
  createCampaignState,
  dailyProgressOf,
  dayKeyOf,
  factValue,
  meetsCondition,
  parseCampaignState,
  rolloverDaily,
  serializeCampaignState,
  shiftDayKey,
  tickCampaign,
  type CampaignFacts,
  type CampaignState,
} from "./campaign";
import { CAMPAIGN } from "./campaign.config";

const T0 = Date.UTC(2026, 8, 18, 1, 0, 0); // 2026-09-18 09:00 +08
const T1 = T0 + 86_400_000; // 2026-09-19 09:00 +08
const T2 = T1 + 86_400_000;
const T_SKIP = T2 + 86_400_000; // 跳过 09-20，直接到 09-21

function facts(patch: Partial<CampaignFacts> = {}): CampaignFacts {
  return { ...EMPTY_CAMPAIGN_FACTS, ...patch };
}

function fresh(patch: Partial<CampaignFacts> = {}, now = T0): CampaignState {
  return createCampaignState(CAMPAIGN, facts(patch), now);
}

function tick(state: CampaignState, patch: Partial<CampaignFacts>, now: number) {
  return tickCampaign(state, facts(patch), CAMPAIGN, now);
}

describe("经营日（Asia/Shanghai）", () => {
  it("UTC 边界：16:30Z 已属次日（+08）", () => {
    expect(dayKeyOf(Date.UTC(2026, 8, 18, 15, 59, 0))).toBe("2026-09-18");
    expect(dayKeyOf(Date.UTC(2026, 8, 18, 16, 30, 0))).toBe("2026-09-19");
  });

  it("shiftDayKey 跨月/跨年/回退", () => {
    expect(shiftDayKey("2026-08-31", 1)).toBe("2026-09-01");
    expect(shiftDayKey("2026-12-31", 1)).toBe("2027-01-01");
    expect(shiftDayKey("2026-03-01", -1)).toBe("2026-02-28");
    expect(shiftDayKey("bad-key", 1)).toBe("bad-key");
  });
});

describe("事实求值", () => {
  it("factValue：布尔按 1/0，非法数按 0（未知不推断）", () => {
    expect(factValue(facts({ goalConfirmed: true }), "goalConfirmed")).toBe(1);
    expect(factValue(facts({ goalConfirmed: false }), "goalConfirmed")).toBe(0);
    expect(factValue(facts({ revenueCny: 0 }), "revenueCny")).toBe(0);
  });

  it("meetsCondition：atLeast 含界 / atMost 不含界", () => {
    const f = facts({ openNegativeReviews: 3 });
    expect(meetsCondition(f, { key: "openNegativeReviews", atLeast: 3 })).toBe(true);
    expect(meetsCondition(f, { key: "openNegativeReviews", atLeast: 4 })).toBe(false);
    expect(meetsCondition(f, { key: "openNegativeReviews", atMost: 3 })).toBe(false);
    expect(meetsCondition(f, { key: "openNegativeReviews", atMost: 4 })).toBe(true);
  });

  it("未知（0）不会满足有下界的触发条件", () => {
    expect(meetsCondition(EMPTY_CAMPAIGN_FACTS, { key: "occupancyPct", atLeast: 1, atMost: 50 })).toBe(false);
  });
});

describe("赛季状态", () => {
  it("初始状态：第一章、无里程碑、无 Boss、连续经营 0", () => {
    const s = fresh();
    expect(s.version).toBe(CAMPAIGN_VERSION);
    expect(s.seasonId).toBe(CAMPAIGN.seasonId);
    expect(s.chapterIndex).toBe(0);
    expect(s.completedMilestones).toEqual([]);
    expect(s.bosses).toEqual({});
    expect(s.streak.current).toBe(0);
    expect(s.daily.dayKey).toBe("2026-09-18");
  });

  it("空事实推进：不发生任何完成（不编造进度）", () => {
    const { state, events } = tick(fresh(), {}, T0);
    expect(state.completedMilestones).toEqual([]);
    expect(state.streak.current).toBe(0);
    expect(events).toEqual([]);
  });
});

describe("章节与里程碑", () => {
  it("事实达标即完成里程碑并派发事件", () => {
    const step1 = tick(fresh(), { goalConfirmed: true }, T0).state;
    const step2 = tick(step1, { goalConfirmed: true, dispatched: 1 }, T0);
    expect(step2.state.completedMilestones).toContain("c1-m1");
    expect(step2.state.completedMilestones).toContain("c1-m2");
    expect(step2.events.map((e) => e.id)).toContain("c1-m2");
  });

  it("四件开张事齐 → 通关第一章进入第二章", () => {
    const done = tick(fresh(), { goalConfirmed: true, dispatched: 1, decided: 1, delivered: 1 }, T0);
    expect(done.state.completedMilestones).toEqual(expect.arrayContaining(["c1-m1", "c1-m2", "c1-m3", "c1-m4"]));
    expect(done.state.chapterIndex).toBe(1);
    expect(done.events.some((e) => e.kind === "chapter" && e.id === "c1-open")).toBe(true);
  });

  it("不跳章：第二章里程碑达标但第一章未完成时仍停在第一章", () => {
    const s = tick(fresh(), { settled: 99, nightRuns: 99, handledNegativeReviews: 99 }, T0).state;
    expect(s.chapterIndex).toBe(0);
  });

  it("成就随奖励解锁且去重", () => {
    const s = tick(fresh(), { goalConfirmed: true }, T0).state;
    expect(s.achievements).toContain("ach-open-goal");
    const again = tick(s, { goalConfirmed: true }, T0).state;
    expect(again.achievements.filter((a) => a === "ach-open-goal")).toHaveLength(1);
  });
});

describe("每日任务", () => {
  it("进度按当日差值计算，完成发奖且幂等", () => {
    // 先把"派出第一件活"里程碑标记为已完成，隔离出每日任务奖励口径
    const base = { ...fresh({ dispatched: 10 }, T0), completedMilestones: ["c1-m2"] };
    const first = tick(base, { dispatched: 11 }, T0);
    const daily = first.state.daily;
    expect(daily.progress["daily-dispatch"]).toBe(1);
    expect(daily.completed).toContain("daily-dispatch");
    const xpAfterFirst = first.state.campaignXp;
    expect(xpAfterFirst).toBe(2);
    const second = tick(first.state, { dispatched: 11 }, T0);
    expect(second.state.campaignXp).toBe(xpAfterFirst);
    expect(second.state.daily.completed.filter((id) => id === "daily-dispatch")).toHaveLength(1);
  });

  it("历史累计不计入当日任务（基线口径）", () => {
    const s = fresh({ dispatched: 50 }, T0);
    expect(dailyProgressOf(s, facts({ dispatched: 50 }), CAMPAIGN.dailyOps[1]!)).toBe(0);
  });

  it("换日重置进度并保留历史观测（app 关闭期间的动作不丢）", () => {
    const day1 = tick(fresh(), { dispatched: 1 }, T0).state;
    const day2 = tick(day1, { dispatched: 2 }, T1);
    expect(day2.state.daily.dayKey).toBe("2026-09-19");
    expect(day2.state.daily.progress["daily-dispatch"]).toBe(1);
    expect(day2.state.streak.current).toBe(2);
  });

  it("rolloverDaily 同一天调用幂等", () => {
    const s = fresh({ dispatched: 1 }, T0);
    expect(rolloverDaily(s, facts({ dispatched: 5 }), T0)).toBe(s);
  });
});

describe("连续经营（streak）", () => {
  it("首次真实动作 → 1 天；同日重复动作不叠加", () => {
    const once = tick(fresh(), { decided: 1 }, T0).state;
    expect(once.streak.current).toBe(1);
    const twice = tick(once, { decided: 2 }, T0).state;
    expect(twice.streak.current).toBe(1);
  });

  it("连续两天有动作 → 2 天，best 随之更新", () => {
    const d1 = tick(fresh(), { decided: 1 }, T0).state;
    const d2 = tick(d1, { decided: 2 }, T1).state;
    expect(d2.streak.current).toBe(2);
    expect(d2.streak.best).toBe(2);
    expect(d2.daysActive).toBe(2);
  });

  it("断一天后重新计数，best 保留", () => {
    const d1 = tick(fresh(), { decided: 1 }, T0).state;
    const d2 = tick(d1, { decided: 2 }, T1).state;
    const d4 = tick(d2, { decided: 3 }, T_SKIP).state;
    expect(d4.streak.current).toBe(1);
    expect(d4.streak.best).toBe(2);
  });

  it("只有营收增长也算经营动作", () => {
    const s = tick(fresh(), { revenueCny: 300 }, T0).state;
    expect(s.streak.current).toBe(1);
  });
});

describe("Boss 战（异常攻坚）", () => {
  it("未知信号不触发 Boss", () => {
    const { state, events } = tick(fresh(), { openNegativeReviews: 0, occupancyPct: 0 }, T0);
    expect(state.bosses["boss-review-storm"]).toBeUndefined();
    expect(events.some((e) => e.kind === "boss")).toBe(false);
  });

  it("待处理差评 ≥3 触发，降到 ≤1 击破并发奖", () => {
    const storm = tick(fresh(), { openNegativeReviews: 3 }, T0);
    expect(storm.state.bosses["boss-review-storm"]!.status).toBe("active");
    expect(storm.events.some((e) => e.kind === "boss" && e.id === "boss-review-storm")).toBe(true);
    const resolved = tick(storm.state, { openNegativeReviews: 1 }, T0 + 60_000);
    expect(resolved.state.bosses["boss-review-storm"]!.status).toBe("resolved");
    expect(resolved.state.achievements).toContain("ach-boss-review-storm");
    const xp = resolved.state.campaignXp;
    const again = tick(resolved.state, { openNegativeReviews: 0 }, T0 + 120_000);
    expect(again.state.campaignXp).toBe(xp);
  });

  it("空房危机：出租率 40% 触发，65% 击破", () => {
    const active = tick(fresh(), { occupancyPct: 40 }, T0).state;
    expect(active.bosses["boss-empty-rooms"]!.status).toBe("active");
    const resolved = tick(active, { occupancyPct: 65 }, T0 + 60_000).state;
    expect(resolved.bosses["boss-empty-rooms"]!.status).toBe("resolved");
  });

  it("bossView：来袭 → 反击 → 击破（进度只增不减）", () => {
    const boss = CAMPAIGN.bosses[0]!;
    const active = tick(fresh(), { openNegativeReviews: 4 }, T0).state;
    const state = active.bosses[boss.id]!;
    expect(bossView(boss, state, facts({ openNegativeReviews: 4 })).stage).toBe("来袭");
    expect(bossView(boss, state, facts({ openNegativeReviews: 2 })).stage).toBe("反击");
    const resolved = tick(active, { openNegativeReviews: 1 }, T0 + 60_000).state;
    const view = bossView(boss, resolved.bosses[boss.id]!, facts({ openNegativeReviews: 1 }));
    expect(view.stage).toBe("击破");
    expect(view.progressPct).toBe(100);
  });
});

describe("赛季总览", () => {
  it("nextUp 指向当前章第一个未完成里程碑", () => {
    const s = tick(fresh(), { goalConfirmed: true }, T0).state;
    const summary = campaignSummary(s, facts({ goalConfirmed: true }), CAMPAIGN);
    expect(summary.nextUp?.id).toBe("c1-m2");
    expect(summary.chapterTitle).toBe("第一章 · 开张");
    expect(summary.label).toContain("还差");
  });

  it("赛季进度 = 完成里程碑 / 总里程碑；全完成即通关", () => {
    const all: CampaignFacts = {
      goalConfirmed: true, dispatched: 10, decided: 20, delivered: 30,
      settled: 40, nightRuns: 20, handledNegativeReviews: 10, revenueCny: 50_000,
      openNegativeReviews: 0, occupancyPct: 80,
    };
    const { state } = tickCampaign(fresh(), all, CAMPAIGN, T0);
    const summary = campaignSummary(state, all, CAMPAIGN);
    expect(summary.totalDone).toBe(summary.totalMilestones);
    expect(summary.seasonCompleted).toBe(true);
    expect(summary.seasonProgressPct).toBe(100);
    expect(summary.label).toContain("赛季通关");
  });

  it("每日任务汇总与 Boss 视图进入总览", () => {
    const s = tick(fresh(), { decided: 1, openNegativeReviews: 5 }, T0).state;
    const summary = campaignSummary(s, facts({ decided: 1, openNegativeReviews: 5 }), CAMPAIGN);
    expect(summary.dailyTotal).toBe(CAMPAIGN.dailyOps.length);
    expect(summary.dailyDone).toBeGreaterThanOrEqual(1);
    expect(summary.activeBosses.some((b) => b.id === "boss-review-storm")).toBe(true);
  });

  it("所有计数型事实键都有观测快照（新增事实键不会静默丢失）", () => {
    const s = fresh({ revenueCny: 123 }, T0);
    for (const key of COUNTER_FACT_KEYS) expect(s.observed[key]).toBeDefined();
    expect(s.observed["revenueCny"]).toBe(123);
  });
});

describe("持久化", () => {
  it("序列化/解析往返保留关键字段", () => {
    const s = tick(fresh(), { goalConfirmed: true, dispatched: 2, openNegativeReviews: 4 }, T0).state;
    const parsed = parseCampaignState(serializeCampaignState(s), CAMPAIGN, T0);
    expect(parsed.chapterIndex).toBe(s.chapterIndex);
    expect(parsed.completedMilestones).toEqual(s.completedMilestones);
    expect(parsed.achievements).toEqual(s.achievements);
    expect(parsed.streak).toEqual(s.streak);
    expect(parsed.daily.dayKey).toBe(s.daily.dayKey);
    expect(Object.keys(parsed.bosses)).toEqual(Object.keys(s.bosses));
    expect(parsed.observed).toEqual(s.observed);
  });

  it("版本/赛季不一致 → 全新状态（不脏读旧进度）", () => {
    const s = futureVersionState();
    const parsed = parseCampaignState(serializeCampaignState(s), CAMPAIGN, T0);
    expect(parsed.completedMilestones).toEqual([]);
    expect(parsed.chapterIndex).toBe(0);
  });

  it("损坏 JSON / 非法字段 → 回落默认值而不抛错", () => {
    expect(parseCampaignState("{oops", CAMPAIGN, T0).chapterIndex).toBe(0);
    const weird = parseCampaignState(
      JSON.stringify({ version: CAMPAIGN_VERSION, seasonId: CAMPAIGN.seasonId, chapterIndex: 999, daily: { dayKey: "x" } }),
      CAMPAIGN,
      T0,
    );
    expect(weird.chapterIndex).toBe(CAMPAIGN.chapters.length - 1);
    expect(weird.daily.dayKey).toBe("2026-09-18");
  });
});

/** 造一份"结构版本领先"的数据：解析层必须拒绝并重开赛季，而不是脏读未知字段 */
function futureVersionState(): CampaignState {
  return { ...fresh(), version: CAMPAIGN_VERSION + 1 };
}
