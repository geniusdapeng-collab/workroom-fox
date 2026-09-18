/**
 * useQuestline · 首日上岗的浏览器侧状态容器
 *
 * 职责：
 *  1. 进度持久化（本次为 localStorage；生产化迁到服务端 onboarding_progress 同构表）；
 *  2. 按真实事实自动推进（`autoAdvance`）与成就解锁；
 *  3. 本地漏斗埋点（`questline.*`），离线部署也能复盘"客户卡在哪一关"。
 *
 * 纪律：这里不产生任何"假完成"——只有客户操作或系统事实能让关卡前进。
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  QUEST_STORAGE_KEY,
  autoAdvance,
  bumpXp,
  completeStage,
  computeXp,
  createQuestState,
  levelOf,
  lightCard,
  parseQuestState,
  progressSummary,
  serializeQuestState,
  skipStage,
  startQuestline,
  unlockAchievements,
  type QuestFacts,
  type QuestLevel,
  type QuestProgressSummary,
  type QuestStageId,
  type QuestState,
  type XpKind,
} from "./questline";
import { QUESTLINE } from "./questline.config";

const EVENT_KEY = "wl-fox-questline-events-v1";
const EVENT_LIMIT = 200;

export interface QuestEvent {
  name: string;
  at: number;
  payload?: Record<string, string | number | boolean>;
}

function readEvents(): QuestEvent[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(EVENT_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is QuestEvent => (
      typeof item === "object" && item !== null
      && typeof (item as QuestEvent).name === "string"
      && typeof (item as QuestEvent).at === "number"
    ));
  } catch {
    return [];
  }
}

function appendEvent(event: QuestEvent): QuestEvent[] {
  const next = [...readEvents(), event].slice(-EVENT_LIMIT);
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(EVENT_KEY, JSON.stringify(next));
    } catch {
      /* 隐私模式/配额满：埋点失败不影响业务 */
    }
  }
  return next;
}

export interface QuestCelebration {
  achievements: string[];
  stage: QuestStageId | null;
}

export interface QuestlineApi {
  state: QuestState;
  summary: QuestProgressSummary;
  level: QuestLevel;
  xp: number;
  open: boolean;
  celebration: QuestCelebration;
  openQuestline: () => void;
  closeQuestline: () => void;
  completeCurrent: () => void;
  skipCurrent: () => void;
  markCard: (cardId: string) => void;
  noteXp: (kind: XpKind, times?: number) => void;
  clearCelebration: () => void;
  reset: () => void;
  track: (name: string, payload?: QuestEvent["payload"]) => void;
  events: () => QuestEvent[];
}

export interface UseQuestlineOptions {
  /** 欢迎仪式已结束（首日上岗的起跑线） */
  ready: boolean;
  /** 真实事实信号 */
  facts: QuestFacts;
}

export function useQuestline({ ready, facts }: UseQuestlineOptions): QuestlineApi {
  const [state, setState] = useState<QuestState>(() => (
    typeof localStorage === "undefined"
      ? createQuestState()
      : parseQuestState(localStorage.getItem(QUEST_STORAGE_KEY))
  ));
  const [open, setOpen] = useState(false);
  const [celebration, setCelebration] = useState<QuestCelebration>({ achievements: [], stage: null });
  const factsRef = useRef(facts);
  factsRef.current = facts;
  const factsKey = useMemo(() => [
    facts.goalConfirmed ? "g" : "-",
    facts.dispatched ? "d" : "-",
    facts.decided ? "a" : "-",
    facts.delivered ? "v" : "-",
    facts.approvalsAvailable ? "p" : "-",
  ].join(""), [facts.goalConfirmed, facts.dispatched, facts.decided, facts.delivered, facts.approvalsAvailable]);

  const track = useCallback<QuestlineApi["track"]>((name, payload) => {
    appendEvent({ name, at: Date.now(), ...(payload ? { payload } : {}) });
  }, []);

  /* ---------- 持久化 ---------- */
  useEffect(() => {
    if (typeof localStorage === "undefined") return;
    try {
      localStorage.setItem(QUEST_STORAGE_KEY, serializeQuestState(state));
    } catch {
      /* 忽略配额错误：内存态仍可用 */
    }
  }, [state]);

  /* ---------- 起跑：欢迎仪式结束后自动开始 ---------- */
  useEffect(() => {
    if (!ready) return;
    setState((current) => {
      if (current.status !== "idle") return current;
      track("questline.started", { journey_version: current.version, from: "welcome" });
      return startQuestline(current);
    });
    setOpen(true);
    // 仅以 ready 是否到位的边沿触发，避免重复埋点
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  /* ---------- 事实驱动推进 ---------- */
  useEffect(() => {
    setState((current) => {
      const before = current.stage;
      const next = autoAdvance(current, factsRef.current);
      if (next !== current && next.stage !== before) {
        track("questline.stage.auto_advanced", { from: before, to: next.stage });
        setCelebration((prev) => ({ ...prev, stage: before }));
      }
      return next;
    });
    // factsKey 是 facts 的稳定指纹；用字符串依赖避免每帧重算
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [factsKey]);

  /* ---------- 成就解锁（只认事实与客户操作） ---------- */
  useEffect(() => {
    const desired: string[] = [];
    if (ready) desired.push("aboard");
    const coreIds = ["pricing", "review", "reconcile"];
    if (coreIds.every((id) => state.litCards.includes(id))) desired.push("three-keepers");
    if (facts.dispatched || state.stageDone.includes("dispatch")) desired.push("first-dispatch");
    if (facts.decided || state.stageDone.includes("approve")) desired.push("first-decision");
    if (facts.delivered || state.stageDone.includes("review")) desired.push("first-close");

    setState((current) => {
      const { state: next, unlocked } = unlockAchievements(current, desired);
      if (unlocked.length === 0) return current;
      for (const id of unlocked) track("questline.achievement.unlocked", { achievement_id: id });
      setCelebration((prev) => ({ ...prev, achievements: [...prev.achievements, ...unlocked] }));
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, factsKey, state.litCards, state.stageDone]);

  /* ---------- 客户操作 ---------- */
  const completeCurrent = useCallback(() => {
    setState((current) => {
      const stage = current.stage;
      const next = completeStage(current, stage);
      track("questline.step.completed", { stage, next: next.stage, status: next.status });
      setCelebration((prev) => ({ ...prev, stage }));
      if (next.status === "completed") track("questline.completed", { skipped: next.skipped.length });
      return next;
    });
  }, [track]);

  const skipCurrent = useCallback(() => {
    setState((current) => {
      const stage = current.stage;
      const next = skipStage(current, stage);
      track("questline.step.skipped", { stage, next: next.stage });
      return next;
    });
  }, [track]);

  const markCard = useCallback((cardId: string) => {
    setState((current) => {
      const next = lightCard(current, cardId);
      if (next !== current) track("questline.card.lit", { card_id: cardId, total: next.litCards.length });
      return next;
    });
  }, [track]);

  const noteXp = useCallback((kind: XpKind, times = 1) => {
    setState((current) => bumpXp(current, kind, times));
  }, []);

  const reset = useCallback(() => {
    const fresh = createQuestState();
    setState(fresh);
    setCelebration({ achievements: [], stage: null });
    track("questline.reset");
  }, [track]);

  const xp = computeXp(state.xp);
  const level = useMemo(() => levelOf(xp), [xp]);
  const summary = useMemo(() => progressSummary(state), [state]);

  return {
    state,
    summary,
    level,
    xp,
    open,
    celebration,
    openQuestline: useCallback(() => {
      setOpen(true);
      // 手动打开也要正式起跑：否则 HUD 会一直显示"还没开始"
      setState((current) => startQuestline(current));
      track("questline.opened", { stage: state.stage });
    }, [state.stage, track]),
    closeQuestline: useCallback(() => {
      setOpen(false);
      track("questline.closed", { stage: state.stage });
    }, [state.stage, track]),
    completeCurrent,
    skipCurrent,
    markCard,
    noteXp,
    clearCelebration: useCallback(() => setCelebration({ achievements: [], stage: null }), []),
    reset,
    track,
    events: readEvents,
  };
}

/** 供界面直接引用的关卡/成就元数据（避免多处重复查找） */
export const QUESTLINE_META = QUESTLINE;
