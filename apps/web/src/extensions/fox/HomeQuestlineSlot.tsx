/**
 * fox 首页首日上岗插槽（原 P0 内联实现的等价迁移，2026-09-19 随基座通道迁移）。
 *
 * 纪律与原来一致：
 *  - 关卡推进只认客户操作与**真实事实**（剧场 ticker 的 14 条真实事件、审批队列、欢迎仪式完成）；
 *  - 不产生任何“假完成”；等级/XP 以 roster 30 天投影为准，与团队页同源；
 *  - 受管 P0 只提供 `home.overlay` 挂载点，不再被行业改写（基座稳定通道因此可升级）。
 */
import { useEffect, useMemo, useState } from "react";
import { clientChineseText } from "@workloom/ui";
import { ensureDemoLogin, trpc } from "../../lib/trpc";
import { actionText } from "../../lib/display";
import { useNavigationAccess } from "../../shell/NavigationAccess";
import { QuestlineHud } from "./guide/QuestlineHud";
import { QuestlineOverlay } from "./guide/QuestlineOverlay";
import { EMPTY_FACTS, factsFromRecentActions, type QuestFacts } from "./onboarding/questline";
import { useQuestline } from "./onboarding/useQuestline";

interface TickerItem {
  action: string;
  who?: { id?: string; type?: string } | null;
}
interface TheaterTicker {
  ticker?: TickerItem[];
}
interface ChairmanItem {
  approval_id: string;
  event_id: string;
  snapshot: { action?: string; params?: Record<string, unknown>; ceo_rationale?: string; title?: string };
  payload: { decision: { action: string } };
}
interface WelcomeState {
  status: "not_started" | "in_progress" | "paused" | "completed";
  shouldShow: boolean;
}

const THEATER_POLL_MS = 10_000;
const XP_POLL_MS = 60_000;

export function HomeQuestlineSlot() {
  const { bundle, subject, canAction } = useNavigationAccess();
  const canDispatch = canAction("task.dispatch");
  const canApprove = canAction("approval.decide");
  const memberNo = subject?.memberNo ?? null;
  const bundleId = bundle?.bundleId ?? null;

  const [ticker, setTicker] = useState<TickerItem[]>([]);
  const [queue, setQueue] = useState<ChairmanItem[]>([]);
  const [welcomeDone, setWelcomeDone] = useState(false);
  const [welcomeVisible, setWelcomeVisible] = useState(false);
  const [questFacts, setQuestFacts] = useState<QuestFacts>(EMPTY_FACTS);
  const [serverXp, setServerXp] = useState<number | null>(null);

  /* 欢迎仪式进行期间让位：受管 P0 通过 `workloom:welcome` 事件广播可见性 */
  useEffect(() => {
    const onWelcome = (event: Event) => setWelcomeVisible(Boolean((event as CustomEvent<boolean>).detail));
    window.addEventListener("workloom:welcome", onWelcome);
    return () => window.removeEventListener("workloom:welcome", onWelcome);
  }, []);

  /* 真实事实来源：剧场 ticker（跨页面派活/拍板都会被认出来）+ 待审队列 + 欢迎仪式完成态 */
  useEffect(() => {
    let stopped = false;
    const load = async () => {
      try {
        await ensureDemoLogin();
        const [theater, status] = await Promise.all([
          trpc.captain.theater.query() as Promise<TheaterTicker>,
          trpc.onboarding.welcomeStatus.query() as Promise<WelcomeState>,
        ]);
        if (stopped) return;
        setTicker((theater?.ticker ?? []).slice(0, 14));
        setWelcomeDone(status?.status === "completed");
        if (canApprove) {
          const rows = await trpc.captain.chairmanQueue.query() as ChairmanItem[];
          if (!stopped) setQueue(rows ?? []);
        }
      } catch {
        /* 取不到就保持上一次已知事实，不伪造进度 */
      }
    };
    void load();
    const timer = window.setInterval(() => void load(), THEATER_POLL_MS);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [canApprove]);

  /* 等级/XP 与团队页同源（roster 30 天事件投影） */
  useEffect(() => {
    if (!welcomeDone || !memberNo) return;
    let stopped = false;
    const loadXp = async () => {
      try {
        await ensureDemoLogin();
        const roster = await trpc.roster.list.query() as { humans?: Array<{ memberNo: string; game?: { xp?: number } }> };
        if (stopped) return;
        const mine = (roster.humans ?? []).find((h) => h.memberNo === memberNo);
        if (mine?.game && typeof mine.game.xp === "number") setServerXp(mine.game.xp);
      } catch {
        /* 取不到就不显示累计口径，退回本次会话 XP */
      }
    };
    void loadXp();
    const timer = window.setInterval(() => void loadXp(), XP_POLL_MS);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [welcomeDone, memberNo]);

  const tickerFacts = useMemo(
    () => factsFromRecentActions(
      ticker.map((item) => ({ action: item.action, who: item.who?.id ?? item.who?.type ?? "" })),
      memberNo,
    ),
    [ticker, memberNo],
  );
  const questlineFacts = useMemo<QuestFacts>(
    () => ({
      ...questFacts,
      dispatched: questFacts.dispatched || tickerFacts.dispatched,
      decided: questFacts.decided || tickerFacts.decided,
      approvalsAvailable: queue.length > 0,
    }),
    [questFacts, tickerFacts, queue.length],
  );

  const questlineReady = welcomeDone && !welcomeVisible;
  const questline = useQuestline({ ready: questlineReady, facts: questlineFacts });
  const pendingApproval = useMemo(() => {
    const first = queue[0];
    if (!first) return null;
    const action = first.snapshot.action ?? first.payload.decision.action;
    return {
      approvalId: first.approval_id,
      title: clientChineseText(first.snapshot.title, actionText(action)),
      actionLabel: actionText(action),
      ...(first.snapshot.ceo_rationale
        ? { rationale: clientChineseText(first.snapshot.ceo_rationale, "负责人意见待确认") }
        : {}),
    };
  }, [queue]);
  const markQuestFact = (key: keyof QuestFacts, value: boolean) => {
    setQuestFacts((current) => (current[key] === value ? current : { ...current, [key]: value }));
  };

  /* 无行业装配（或装配未就绪）时不渲染任何行业 UI */
  if (!bundleId) return null;

  return (
    <>
      {!welcomeVisible && (
        <QuestlineHud
          summary={questline.summary}
          level={questline.level}
          xp={questline.xp}
          achievements={questline.state.achievements}
          serverXp={serverXp}
          completed={questline.state.status === "completed"}
          onOpen={questline.openQuestline}
        />
      )}
      <QuestlineOverlay
        open={questline.open && !welcomeVisible}
        state={questline.state}
        level={questline.level}
        xp={questline.xp}
        celebration={questline.celebration}
        canDispatch={canDispatch}
        canApprove={canApprove}
        pendingApproval={pendingApproval}
        onClose={questline.closeQuestline}
        onCompleteStage={questline.completeCurrent}
        onSkipStage={questline.skipCurrent}
        onLightCard={questline.markCard}
        onFact={markQuestFact}
        onXp={questline.noteXp}
        onThreadId={questline.setThreadId}
        onClearCelebration={questline.clearCelebration}
        onTrack={questline.track}
      />
    </>
  );
}
