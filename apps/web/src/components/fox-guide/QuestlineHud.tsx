/**
 * QuestlineHud · 首日上岗常驻入口（狐狸先生待命位）
 *
 * 从欢迎仪式结束到五关走完，狐狸先生一直待在经营主页左下角：
 *  - 未开始/进行中：显示"还差 N 关"，点一下继续；
 *  - 已完成：缩成小徽章，可重播，避免长期占屏。
 */
import type { QuestLevel, QuestProgressSummary } from "../../onboarding/questline";
import { QUESTLINE } from "../../onboarding/questline.config";
import { FoxGuide } from "./FoxGuide";

export interface QuestlineHudProps {
  summary: QuestProgressSummary;
  level: QuestLevel;
  xp: number;
  achievements: string[];
  onOpen: () => void;
}

export function QuestlineHud({ summary, level, xp, achievements, onOpen }: QuestlineHudProps) {
  const completed = summary.done >= summary.total;
  return (
    <div
      className="pointer-events-none fixed bottom-24 left-4 z-30 hidden sm:block"
      data-questline-hud="true"
      data-questline-complete={completed ? "true" : "false"}
    >
      <div className="pointer-events-auto flex min-w-0 items-end gap-2">
        <FoxGuide size={72} mood={completed ? "celebrate" : "listen"} />
        <div className="min-w-0 max-w-[15rem] rounded-2xl border border-gline/60 bg-panel/90 px-3 py-2 shadow-xl backdrop-blur">
          <div className="flex min-w-0 items-center gap-2">
            <span className="break-words text-body font-bold text-goldhi">{QUESTLINE.mateName}</span>
            <span className="text-body text-ink3">Lv.{level.level} {level.rank}</span>
          </div>
          <div className="mt-0.5 break-words text-body leading-relaxed text-ink2">
            {completed ? "首日上岗已完成，可以重播" : summary.label}
          </div>
          <div className="mt-1.5 flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={onOpen}
              className="min-h-8 rounded-lg border border-gline bg-gold/15 px-3 text-body font-bold text-gold hover:bg-gold/25"
            >
              {completed ? "重播首日上岗" : summary.done === 0 ? "开始首日上岗" : "继续首日上岗"}
            </button>
            <span className="font-mono text-body text-ink3">{xp} XP</span>
            <span className="text-body text-ink3">🏅{achievements.length}/{QUESTLINE.achievements.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
