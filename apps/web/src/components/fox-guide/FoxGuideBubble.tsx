/**
 * FoxGuideBubble · 狐狸先生的对话气泡
 *
 * - 打字机呈现，点击气泡可立即显示全文（客户永远能"跳过废话"）；
 * - 同步走 VoiceEngine（role=fox-guide + 专属音色），语音不可用时自动只走字幕条；
 * - 气泡只负责"说话"，不做任何业务判断。
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { VoiceEngine, type VoicePriority } from "../../voice/VoiceEngine";
import { FOX_MATE_VOICE, QUESTLINE } from "../../onboarding/questline.config";

const CHAR_MS = 22;

export interface FoxGuideBubbleProps {
  text: string;
  voice?: boolean;
  priority?: VoicePriority;
  /** 视觉强调：默认/金色（过关）/警示（需人审） */
  tone?: "default" | "gold" | "warn";
  className?: string;
  /** 气泡下方的操作区（按钮等） */
  children?: ReactNode;
}

const TONE: Record<NonNullable<FoxGuideBubbleProps["tone"]>, string> = {
  default: "border-line bg-card",
  gold: "border-gold/60 bg-gold/10",
  warn: "border-amber-400/60 bg-amber-400/10",
};

export function FoxGuideBubble({
  text,
  voice = true,
  priority = "ceremony",
  tone = "default",
  className,
  children,
}: FoxGuideBubbleProps) {
  const [shown, setShown] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const saidRef = useRef("");

  /* 打字机 */
  useEffect(() => {
    setShown(0);
    if (!text) return;
    const timer = window.setInterval(() => {
      setShown((n) => {
        if (n >= text.length) {
          window.clearInterval(timer);
          return n;
        }
        return n + 1;
      });
    }, CHAR_MS);
    return () => window.clearInterval(timer);
  }, [text]);

  /* 语音：同一句只播一次（防止 React 重渲染重复开口） */
  useEffect(() => {
    if (!voice || !text.trim()) return;
    if (saidRef.current === text) return;
    saidRef.current = text;
    setSpeaking(true);
    const timer = window.setTimeout(() => setSpeaking(false), Math.max(1600, text.length * 190));
    try {
      VoiceEngine.speak({
        role: "fox-guide",
        persona: `${QUESTLINE.mateName} · ${QUESTLINE.mateRole}`,
        text,
        priority,
        voiceOverride: FOX_MATE_VOICE,
      });
    } catch {
      /* 语音失败只影响"听"，不影响"看" */
    }
    return () => window.clearTimeout(timer);
  }, [text, voice, priority]);

  const done = shown >= text.length;

  return (
    <div className={`relative min-w-0 ${className ?? ""}`}>
      {/* 指向狐狸的小尖角 */}
      <span
        aria-hidden="true"
        className={`absolute -top-2 right-8 h-3 w-3 rotate-45 border-l border-t ${TONE[tone]}`}
      />
      <div
        className={`min-w-0 rounded-2xl border px-4 py-3 shadow-lg backdrop-blur ${TONE[tone]}`}
        onClick={() => setShown(text.length)}
        data-fox-bubble="true"
        data-fox-speaking={speaking ? "true" : "false"}
      >
        <div className="mb-1 flex items-center gap-2 text-body text-ink3">
          <span className="font-bold text-goldhi">{QUESTLINE.mateName}</span>
          <span className="text-ink3">{QUESTLINE.mateRole}</span>
          {!done && <span className="ml-auto text-ink3">点击可跳过</span>}
        </div>
        <p className="min-w-0 whitespace-pre-wrap break-words text-sm leading-relaxed text-ink">
          {text.slice(0, shown)}
          {!done && <span className="ml-0.5 animate-pulse text-gold">▌</span>}
        </p>
        {children && <div className="mt-3 min-w-0">{children}</div>}
      </div>
    </div>
  );
}
