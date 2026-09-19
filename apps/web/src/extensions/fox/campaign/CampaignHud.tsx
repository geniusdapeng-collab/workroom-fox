/**
 * CampaignHud · 实景商业游戏「经营主线」常驻面板
 *
 * 与 QuestlineHud（首日上岗，左下）成对：本面板常驻右下，展示
 * 赛季进度 / 当前章节 / 今日任务 / 连续经营 / Boss 攻坚。
 *
 * 诚实边界（与 campaign.ts 同口径）：
 *  - 未接入的事实（如营收）不显示假数字，只显示「未接入」并在下一里程碑上标灰；
 *  - Boss 卡只在真实异常信号出现时出现，不做假事件；
 *  - 本面板不承载任何权限动作，只做展示与跳转。
 */
import { useState } from "react";
import { achievementName } from "./campaign.config";
import type { CampaignFacts, CampaignSummary } from "./campaign";

export interface CampaignHudProps {
  summary: CampaignSummary;
  facts: CampaignFacts;
  /** 点击「去处理」时跳转到对应页面（由宿主页面决定） */
  onOpen?: () => void;
}

export function CampaignHud({ summary, facts, onOpen }: CampaignHudProps) {
  const [collapsed, setCollapsed] = useState(false);
  const revenueUnknown = facts.revenueCny <= 0;
  const boss = summary.activeBosses.find((item) => item.status === "active") ?? null;

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        className="pointer-events-auto fixed bottom-24 right-4 z-30 hidden min-h-10 rounded-full border border-gline/60 bg-card/95 px-3 text-body font-bold text-gold shadow-xl backdrop-blur sm:block"
        data-campaign-hud="collapsed"
      >
        🏆 {summary.seasonProgressPct}% · 第 {summary.chapterIndex + 1} 章
      </button>
    );
  }

  return (
    <div
      className="pointer-events-none fixed bottom-24 right-4 z-30 hidden w-[19rem] sm:block"
      data-campaign-hud="true"
      data-campaign-season={summary.seasonId}
      data-campaign-completed={summary.seasonCompleted ? "true" : "false"}
    >
      <div className="pointer-events-auto rounded-2xl border border-gline/60 bg-card/95 p-3 shadow-xl backdrop-blur">
        <div className="flex min-w-0 items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="break-words text-body font-bold text-goldhi">{summary.seasonTitle}</div>
            <div className="mt-0.5 break-words text-body text-ink2">{summary.chapterTitle}</div>
          </div>
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            className="min-h-7 min-w-7 rounded-lg border border-gline/60 text-body text-ink3 hover:text-ink2"
            aria-label="收起赛季面板"
          >
            –
          </button>
        </div>

        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gline/40">
          <div className="h-full rounded-full bg-gold" style={{ width: `${summary.seasonProgressPct}%` }} />
        </div>
        <div className="mt-1 flex items-center justify-between text-body text-ink3">
          <span>赛季 {summary.seasonProgressPct}% · {summary.totalDone}/{summary.totalMilestones}</span>
          <span>🔥 连续经营 {summary.streak.current} 天（最佳 {summary.streak.best}）</span>
        </div>

        {summary.nextUp ? (
          <div className="mt-2 rounded-xl border border-gline/50 bg-bg800/60 px-2 py-1.5" data-campaign-nextup={summary.nextUp.id}>
            <div className="flex items-center justify-between gap-2">
              <span className="break-words text-body font-bold text-ink2">下一件：{summary.nextUp.title}</span>
              <span className="font-mono text-body text-ink3">
                {revenueUnknown && summary.nextUp.id === "c3-m1" ? "未接入" : `${summary.nextUp.progress}/${summary.nextUp.target}`}
              </span>
            </div>
            <div className="mt-0.5 break-words text-body text-ink3">{summary.nextUp.why}</div>
          </div>
        ) : (
          <div className="mt-2 rounded-xl border border-gold/40 bg-gold/10 px-2 py-1.5 text-body text-gold">
            本季主线已通关——可以开始下一季或复制到其他门店
          </div>
        )}

        <div className="mt-2 flex flex-wrap gap-1">
          {summary.daily.map((item) => (
            <span
              key={item.id}
              data-campaign-daily={item.id}
              data-daily-done={item.done ? "true" : "false"}
              className={`rounded-full border px-2 py-0.5 text-body ${
                item.done ? "border-gold/50 bg-gold/15 text-gold" : "border-gline/50 text-ink3"
              }`}
            >
              {item.done ? "✓" : "·"} {item.title} {item.progress}/{item.target}
            </span>
          ))}
        </div>

        {boss ? (
          <div className="mt-2 rounded-xl border border-alert/50 bg-alert/10 px-2 py-1.5" data-campaign-boss={boss.id}>
            <div className="flex items-center justify-between gap-2">
              <span className="break-words text-body font-bold text-alert">👹 {boss.name} · {boss.stage}</span>
              <span className="font-mono text-body text-ink3">{boss.progressPct}%</span>
            </div>
            <div className="mt-0.5 break-words text-body text-ink2">{boss.subtitle}</div>
          </div>
        ) : null}

        <div className="mt-2 flex items-center justify-between text-body text-ink3">
          <span>🏅 {summary.achievements.length} 成就</span>
          <span>本季奖励 {summary.campaignXp} XP（等级以团队页为准）</span>
        </div>
        {summary.achievements.length > 0 ? (
          <div className="mt-1 break-words text-body text-ink3">
            最近解锁：{summary.achievements.slice(-3).map(achievementName).join("、")}
          </div>
        ) : null}
        {onOpen ? (
          <button
            type="button"
            onClick={onOpen}
            className="mt-2 min-h-8 w-full rounded-lg border border-gline bg-gold/15 px-3 text-body font-bold text-gold hover:bg-gold/25"
          >
            看赛季地图
          </button>
        ) : null}
        {revenueUnknown ? (
          <div className="mt-1 break-words text-body text-ink3">
            营收里程碑等你接入真实数据后自动点亮（当前显示「未接入」，不编数字）
          </div>
        ) : null}
      </div>
    </div>
  );
}
