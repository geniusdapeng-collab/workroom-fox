/**
 * useCampaign · 实景商业游戏「经营主线」浏览器侧状态容器
 *
 * 职责：
 *  1. 进度持久化（localStorage；生产化与服务端 onboarding_progress 同路数迁到 `campaign_progress`）；
 *  2. 把真实经营事实喂给 `tickCampaign`，产出当轮事件（里程碑/每日任务/Boss/连续经营）；
 *  3. 本地可复盘埋点（`campaign.*`）。
 *
 * 纪律：与本仓 questline 一致——只认真实事实，不编造完成；不授予权限；不做随机奖励。
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CAMPAIGN_STORAGE_KEY,
  campaignSummary,
  createCampaignState,
  parseCampaignState,
  serializeCampaignState,
  tickCampaign,
  type CampaignEvent,
  type CampaignFacts,
  type CampaignState,
  type CampaignSummary,
} from "./campaign";
import { CAMPAIGN } from "./campaign.config";

const EVENT_KEY = "wl-fox-campaign-events-v1";
const EVENT_LIMIT = 300;

export interface CampaignEventLog {
  name: string;
  at: number;
  payload?: Record<string, string | number | boolean>;
}

function readEventLog(): CampaignEventLog[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(EVENT_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is CampaignEventLog => (
      typeof item === "object" && item !== null
      && typeof (item as CampaignEventLog).name === "string"
      && typeof (item as CampaignEventLog).at === "number"
    ));
  } catch {
    return [];
  }
}

function appendEventLog(event: CampaignEventLog): CampaignEventLog[] {
  const next = [...readEventLog(), event].slice(-EVENT_LIMIT);
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(EVENT_KEY, JSON.stringify(next));
    } catch {
      /* 隐私模式/配额满：埋点失败不影响经营 */
    }
  }
  return next;
}

export interface CampaignApi {
  state: CampaignState;
  summary: CampaignSummary;
  /** 本轮新发生的事件（供动效/字幕消费，消费后调用 clearEvents） */
  events: CampaignEvent[];
  clearEvents: () => void;
  track: (name: string, payload?: CampaignEventLog["payload"]) => void;
  reset: () => void;
}

export interface UseCampaignOptions {
  /** 欢迎仪式结束、进入经营主页后才开始记账（避免把逛展厅算成经营） */
  ready: boolean;
  facts: CampaignFacts;
}

export function useCampaign({ ready, facts }: UseCampaignOptions): CampaignApi {
  const [state, setState] = useState<CampaignState>(() => (
    typeof localStorage === "undefined"
      ? createCampaignState(CAMPAIGN)
      : parseCampaignState(localStorage.getItem(CAMPAIGN_STORAGE_KEY), CAMPAIGN)
  ));
  const [events, setEvents] = useState<CampaignEvent[]>([]);
  const factsRef = useRef(facts);
  factsRef.current = facts;
  const factsKey = useMemo(() => [
    facts.goalConfirmed ? "g" : "-",
    facts.dispatched, facts.decided, facts.delivered, facts.settled,
    facts.nightRuns, facts.handledNegativeReviews, facts.revenueCny,
    facts.openNegativeReviews, facts.occupancyPct,
  ].join(","), [
    facts.goalConfirmed, facts.dispatched, facts.decided, facts.delivered, facts.settled,
    facts.nightRuns, facts.handledNegativeReviews, facts.revenueCny,
    facts.openNegativeReviews, facts.occupancyPct,
  ]);

  const track = useCallback<CampaignApi["track"]>((name, payload) => {
    appendEventLog({ name, at: Date.now(), ...(payload ? { payload } : {}) });
  }, []);

  /* ---------- 持久化 ---------- */
  useEffect(() => {
    if (typeof localStorage === "undefined") return;
    try {
      localStorage.setItem(CAMPAIGN_STORAGE_KEY, serializeCampaignState(state));
    } catch {
      /* 配额错误：内存态仍可用 */
    }
  }, [state]);

  /* ---------- 事实驱动推进 ---------- */
  useEffect(() => {
    if (!ready) return;
    setState((current) => {
      const tick = tickCampaign(current, factsRef.current, CAMPAIGN);
      if (tick.state === current) return current;
      for (const event of tick.events) {
        track(`campaign.${event.kind}`, { id: event.id, label: event.label });
      }
      if (tick.events.length > 0) setEvents((prev) => [...prev, ...tick.events].slice(-6));
      return tick.state;
    });
    // factsKey 是 facts 的稳定指纹；此处只按事实变化触发，不依赖 ready 之外的其它状态
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, factsKey]);

  const reset = useCallback(() => {
    setState(createCampaignState(CAMPAIGN, factsRef.current));
    setEvents([]);
    track("campaign.reset");
  }, [track]);

  const summary = useMemo(() => campaignSummary(state, facts, CAMPAIGN), [state, facts]);

  return {
    state,
    summary,
    events,
    clearEvents: useCallback(() => setEvents([]), []),
    track,
    reset,
  };
}
