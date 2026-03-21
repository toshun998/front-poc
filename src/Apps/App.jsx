// ========== App.jsx（リファクタリング後） ==========
import { useEffect, useMemo, useRef, useState } from "react";

// --- API ---
import {
  getTeamUserStates,
  saveUserState,
  getTargets,
  explainLineEval as explainLineEvalApi,
  checkLogBias,  checkLogBiasChecklist,  getNoise,
  arrangeBoard,
  evidenceQuest,
  getTeamState,
  updateTeamMembers,
  getTeamMembers,
  logMessageEvent,
} from "../FrontServer/personaApi";

// --- CSS ---
import "./App.css";

// --- 既存コンポーネント ---
import CompanyLoginModal from "../App_Options/CompanyLoginModal";

// --- 抽出ユーティリティ ---
import {
  unbox,
  toTaigen,
  jaccard,
  defaultStakeholdersFor,
  normalizeStakeholders,
  toText,
  sanitizeAdvice,
  OUTLIER_ORDER,
} from "./utils/helpers";
import {
  judgeOOTB,
  buildConcreteProposals,
} from "./utils/outlierLogic";
import { wrapText } from "./utils/pdfExport";

// --- カスタムフック ---
import { useSpeechInput } from "./hooks/useSpeechInput";
import { useCompanyAuth } from "./hooks/useCompanyAuth";
import { useRosterSync } from "./hooks/useRosterSync";

// --- 画面コンポーネント ---
import IntroScreen from "./screens/IntroScreen";
import FrontScreen from "./screens/FrontScreen";
import LogScreen from "./screens/LogScreen";
import BoardScreen from "./screens/BoardScreen";
import DashboardPanel from "./components/DashboardPanel";

// --- モーダルコンポーネント ---
import SettingsModal from "./modals/SettingsModal";
import LogViewerModal from "./modals/LogViewerModal";
import FinalEvalModal from "./modals/FinalEvalModal";
import EvidenceQuestModal from "./modals/EvidenceQuestModal";
import NoiseHintModal from "./modals/NoiseHintModal";
import DownloadSelectModal from "./modals/DownloadSelectModal";

// --- 共通UI ---
import AppHeader from "./components/AppHeader";

/* ================================================================
   App
   ================================================================ */
export default function App() {
  // ── 企業認証 ──
  const { companyReady, setCompanyReady, checkingCompany } = useCompanyAuth();

  // ── ビュー / ステージ ──
  const [view, setView] = useState("INTRO");
  const [stage, setStage] = useState("intro");

  // ── 入力フォーム ──
  const [topic, setTopic] = useState("");
  const [teamName, setTeamName] = useState(() => localStorage.getItem("teamName") || "");
  const [page, setPage] = useState(1);
  const [aiMode, setAiMode] = useState(false);
  const [targetList, setTargetList] = useState(defaultStakeholdersFor(""));
  const [selectedTarget, setSelectedTarget] = useState("");
  const [scenario, setScenario] = useState("");
  const [scenarioDraft, setScenarioDraft] = useState("");
  const [scenarioFixed, setScenarioFixed] = useState(false);
  const [premise, setPremise] = useState("");
  const [trouble, setTrouble] = useState("");
  const [otherPrem, setOtherPrem] = useState("");
  const [cause, setCause] = useState("");
  const [idea, setIdea] = useState("");
  const [who, setWho] = useState("");
  const [what, setWhat] = useState("");
  const [how, setHow] = useState("");
  const [good, setGood] = useState("");
  const [bad, setBad] = useState("");
  const [plans, setPlans] = useState([
    { who: "", what: "", how: "", good: "", bad: "" },
  ]);
const [freeNote, setFreeNote] = useState("");
const [freeNoteListening, setFreeNoteListening] = useState(false);
  // ── UI制御 ──
  const [headerOpen, setHeaderOpen] = useState(true);
  const [gateOpen, setGateOpen] = useState(false);
  const [gateLoading, setGateLoading] = useState(false);
  const [loadingEval, setLoadingEval] = useState(false);
  const [loadingTargets, setLoadingTargets] = useState(false);
  const [compactView, setCompactView] = useState(false);
  const [sending, setSending] = useState(false);

  // ── 難易度 ──
  const [ootbMode, setOotbMode] = useState(
    () => localStorage.getItem("ootbMode") || "standard"
  );
  useEffect(() => { localStorage.setItem("ootbMode", ootbMode); }, [ootbMode]);

  // ── AI接続 ──
  const [aiOK, setAiOK] = useState(null);
  async function checkAI() {
    const base = (import.meta.env.VITE_PERSONA_API_BASE || "").replace(/\/$/, "");
    if (!base) { setAiOK(false); return; }
    try {
      const r = await fetch(`${base}/health`, { method: "GET" });
      setAiOK(r.ok);
    } catch { setAiOK(false); }
  }
  useEffect(() => { checkAI(); }, []);

  // ── 音声入力 ──
  const { listening, startListening } = useSpeechInput((text) =>
    setTopic((prev) => (prev ? prev + " " + text : text))
  );
  const { listening: scenarioListening, startListening: startScenarioListening } =
    useSpeechInput((text) => setScenarioDraft((prev) => (prev ? prev + " " + text : text)));
  const { listening: targetListening, startListening: startTargetListening } =
    useSpeechInput((text) => { const el = document.getElementById("freeTarget"); if (el) el.value = text; });
  const { listening: premiseListening, startListening: startPremiseListening } =
    useSpeechInput((text) => setPremise((prev) => (prev ? prev + " " + text : text)));
  const { listening: troubleListening, startListening: startTroubleListening } =
    useSpeechInput((text) => setTrouble((prev) => (prev ? prev + " " + text : text)));
  const { listening: otherPremListening, startListening: startOtherPremListening } =
    useSpeechInput((text) => setOtherPrem((prev) => (prev ? prev + " " + text : text)));
  const { listening: causeListening, startListening: startCauseListening } =
    useSpeechInput((text) => setCause((prev) => (prev ? prev + " " + text : text)));
  const { listening: ideaListening, startListening: startIdeaListening } =
    useSpeechInput((text) => setIdea((prev) => (prev ? prev + " " + text : text)));
  const { listening: listeningPlan, startListening: startPlanListening } =
    useSpeechInput((text) => {
      setPlans((prev) => {
        const updated = [...prev];
        const last = { ...updated[updated.length - 1] };
        const t = text.trim();
        const match = t.match(/(.+?)が(.+?)を(.+?)$|(.+?)が(.+?)した|(.+?)が(.+)/);
        if (match) {
          if (match[1] && match[2] && match[3]) { last.executor = match[1].trim(); last.what = match[2].trim(); last.how = match[3].trim(); }
          else if (match[4] && match[5]) { last.executor = match[4].trim(); last.what = match[5].trim(); last.how = ""; }
          else if (match[6] && match[7]) { last.executor = match[6].trim(); last.what = match[7].trim(); last.how = ""; }
        } else {
          if (!last.executor) last.executor = t;
          else if (!last.what) last.what = t;
          else last.how = (last.how ? last.how + " " : "") + t;
        }
        updated[updated.length - 1] = last;
        return updated;
      });
    });
  const { listening: goodListening, startListening: startGoodListening } =
    useSpeechInput((text) => {
      setPlans((prev) => { const u = [...prev]; u[u.length - 1].good = text; return u; });
    });
  const { listening: badListening, startListening: startBadListening } =
    useSpeechInput((text) => {
      setPlans((prev) => { const u = [...prev]; u[u.length - 1].bad = text; return u; });
    });

  // ── ノート / チーム ──
  const [notes, setNotes] = useState([]);
  const currentTeam = teamName;
  const visibleNotes = useMemo(
    () => notes.filter((n) => (n.team || teamName) === currentTeam),
    [notes, currentTeam, teamName]
  );
  const histRef = useRef([]);
  const teamStats = useMemo(() => {
    const U = visibleNotes.filter((n) => n.author !== "noise");
    const H = U.filter((n) => n.aiTag === "H").length;
    const E = U.filter((n) => n.aiTag === "E").length;
    return { H, E };
  }, [visibleNotes]);

// ── ユーザー / 参加設定 ──
const [userList, setUserList] = useState(() => {
  try {
    const saved = JSON.parse(localStorage.getItem("userList"));
    if (Array.isArray(saved) && saved.length > 0) {
      return saved.map((u) =>
        typeof u === "string"
          ? { userId: u, name: u, removed: false }
          : {
              userId: u.userId || u.name || "",
              name: u.name || u.userId || "",
              removed: !!u.removed,
            }
      );
    }
    return [{ userId: "", name: "", removed: false }];
  } catch {
    return [{ userId: "", name: "", removed: false }];
  }
});

const [currentUserId, setCurrentUserId] = useState(
  () => localStorage.getItem("currentUserId") || null
);
const [currentUserName, setCurrentUserName] = useState(
  () => localStorage.getItem("currentUserName") || null
);

const [step, setStep] = useState(() => {
  const savedUserId = localStorage.getItem("currentUserId");
  const savedTeamName = localStorage.getItem("teamName");
  return savedUserId && savedTeamName ? "front" : "join";
});
const currentCompanyCode = localStorage.getItem("companyCode") || "";
  // ── step / 参加状態デバッグ ──
  useEffect(() => {
    console.log("[debug:step/state]", {
      step,
      teamName,
      currentUserId,
      currentUserName,
      view,
    });
  }, [step, teamName, currentUserId, currentUserName, view]);
  // ── 名簿同期フック ──
  useRosterSync({
    teamName, currentUserId, gateOpen, step, userList,
    setUserList, setStep, setTeamName,
    topic, selectedTarget, scenario, scenarioFixed,
    premise, trouble, otherPrem, cause, idea, plans,
    setTopic, setSelectedTarget, setScenario, setPremise,
    setTrouble, setOtherPrem, setCause, setIdea, setPlans,
    setCurrentUserId, setCurrentUserName, setNotes,
  });

  // ── LOGを見る ──
  const [logOpen, setLogOpen] = useState(false);
  const [userLogs, setUserLogs] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedLog, setSelectedLog] = useState(null);
  const [logSearch, setLogSearch] = useState("");
  const [dlSelectOpen, setDlSelectOpen] = useState(false);
  const [logsForDownload, setLogsForDownload] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshDone, setRefreshDone] = useState(false);

  // ── 盲点(Noise) ──
  const [noiseOpen, setNoiseOpen] = useState(false);
  const [noiseData, setNoiseData] = useState([]);
  const [noiseLoading, setNoiseLoading] = useState(false);
  const [noiseMeta, setNoiseMeta] = useState({ source: "", noteId: "", ts: 0 });

  // ── 議論終結 ──
  const [finalOpen, setFinalOpen] = useState(false);
  const cvsRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [evidenceHints, setEvidenceHints] = useState([]);
  const [evidenceOpen, setEvidenceOpen] = useState(false);

  // ── Board ──
  const [matrixSpec, setMatrixSpec] = useState("impact-feasibility");
  const [matrixPos, setMatrixPos] = useState({});
  const [editMatrix, setEditMatrix] = useState(false);
  const [arranging, setArranging] = useState(false);

  // ── 横画面検知 ──
  const [portrait, setPortrait] = useState(() => window.innerHeight > window.innerWidth);
  useEffect(() => {
    const onResize = () => setPortrait(window.innerHeight > window.innerWidth);
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => { window.removeEventListener("resize", onResize); window.removeEventListener("orientationchange", onResize); };
  }, []);

  // ── localStorage同期 ──
  useEffect(() => {
    if (teamName) {
      localStorage.setItem("teamName", teamName);
    } else {
      localStorage.removeItem("teamName");
    }
  }, [teamName]);

  useEffect(() => {
    if (currentUserId) {
      localStorage.setItem("currentUserId", currentUserId);
    } else {
      localStorage.removeItem("currentUserId");
    }
  }, [currentUserId]);

  useEffect(() => {
    if (currentUserName) {
      localStorage.setItem("currentUserName", currentUserName);
    } else {
      localStorage.removeItem("currentUserName");
    }
  }, [currentUserName]);

  // ── イントロアニメーション ──
  useEffect(() => {
    if (view === "INTRO" && stage === "intro") {
      const t1 = setTimeout(() => setStage("moveUp"), 1000);
      const t2 = setTimeout(() => setStage("done"), 2300);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [view, stage]);
  useEffect(() => {
    if (stage === "intro") {
      const t1 = setTimeout(() => setStage("moveUp"), 1000);
      const t2 = setTimeout(() => setStage("done"), 2300);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [stage]);
  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.style.height = "100%";
    document.body.style.height = "100%";
    document.body.style.overflow = view === "INTRO" ? "hidden" : "auto";
  }, [view]);
  useEffect(() => {
    const t1 = setTimeout(() => setStage("moveUp"), 1000);
    const t2 = setTimeout(() => setStage("done"), 2000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  // ── 当事者AI選定 ──
  useEffect(() => {
    (async () => {
      try {
        const res = unbox(await getTargets?.(topic));
        const ai = [
          ...(Array.isArray(res?.fixed) ? res.fixed.map((x) => x.name) : []),
          ...(Array.isArray(res?.ai) ? res.ai.map((x) => x.name) : []),
        ];
        setTargetList(normalizeStakeholders(topic, ai));
      } catch { setTargetList(normalizeStakeholders(topic, [])); }
      setSelectedTarget(""); setScenario(""); setScenarioDraft(""); setScenarioFixed(false);
    })();
  }, [topic]);

  // ── シナリオ生成 ──
  useEffect(() => {
    if (!selectedTarget) return;
    const s = `${toTaigen(topic)}について考えよう。\nその件で、${selectedTarget}が困っていることがあります。\n困っている${selectedTarget}を助けよう。`;
    setScenario(s); setScenarioDraft(s); setScenarioFixed(false);
  }, [selectedTarget]);

  // ── Board初回中央表示 ──
  useEffect(() => {
    if (view === "BOARD") {
      // BoardScreenが内部でresetMatrixCenterを呼ぶ
    }
  }, [view]);

  /* ================================================================
     コア関数
     ================================================================ */

// ── 送信ボタン ──
async function send() {
  const any = [
    premise, trouble, otherPrem, cause, idea,
    freeNote, // ←追加🔥（入力チェック）
    who, what, how, good, bad,
    ...plans.flatMap((p) => Object.values(p)),
  ].some((v) => String(v || "").trim());

  if (!any) { 
    alert("どれか1つでいいので入力してください"); 
    return; 
  }
  if (sending) return;
  setSending(true);

  try {
    const signature = (idea || cause || premise || trouble || otherPrem || "").trim();
    if (signature) histRef.current.push(signature);

    const h = histRef.current;
    if (h.length >= 3) {
      const s1 = jaccard(h[h.length - 1], h[h.length - 2]);
      const s2 = jaccard(h[h.length - 2], h[h.length - 3]);
      if (s1 > 0.75 && s2 > 0.75) {
        alert("これは外れ値だが：同じ調子が続いています。視点を1つ足して条件を変えてみよう。");
      }
    }

    const fields = { premise, trouble, otherPrem, cause, idea };
    const flagsDetail = {};
    let allFlags = [];

    try {
      const biasTypesToCheck = OUTLIER_ORDER.filter((b) => b !== "不明");
      const r = await checkLogBiasChecklist(topic, fields, biasTypesToCheck);

      for (const [key, obj] of Object.entries(r.results || {})) {
        flagsDetail[key] = obj.flags || [];
        flagsDetail[`${key}_advice`] = obj.advice || "";
        allFlags = allFlags.concat(obj.flags || []);
      }
    } catch (e) {
      console.error("checkLogBiasChecklist error:", e);
    }

    const note = {
      id: crypto.randomUUID(),
      team: teamName,
      userId: currentUserId,
      q: topic || "（無題）",
      stakeholder: selectedTarget || "（未選択）",
      scenario: scenarioFixed ? scenario : "(未決定)",
      premise,
      trouble,
      otherPrem,
      cause,
      idea,
      freeNote, // ←追加🔥（保存）
      plans,
      createdAt: new Date().toISOString(),
      flagsDetail,
      allFlags,
    };

    const textForCount = [
      premise, trouble, otherPrem, cause, idea,
      freeNote, // ←追加🔥（文字数）
      who, what, how, good, bad,
      ...plans.flatMap((p) => Object.values(p)),
    ]
      .filter((v) => v != null && String(v).trim() !== "")
      .join("\n");

    const charCount = textForCount.length;

    await saveUserState({
      team: teamName,
      userId: currentUserId,
      topic,
      target: selectedTarget,
      scenario: scenarioFixed ? scenario : null,
      premise,
      trouble,
      otherPrem,
      cause,
      idea,
      freeNote, // ←追加🔥（KV保存）
      plans,
      flagsDetail,
      allFlags,
      updatedAt: note.createdAt,
    });

    try {
      await logMessageEvent({
        discussionId: topic || "default",
        team: teamName,
        userId: currentUserId,
        createdAt: note.createdAt,
        charCount,
        allFlags,
        meta: {
          topic: topic || "（無題）",
          target: selectedTarget || "（未選択）",
          scenario: scenarioFixed ? scenario : "(未決定)",
        },
      });
    } catch (e) {
      console.error("logMessageEvent error:", e);
    }

    setNotes((n) => [note, ...n]);
    setView("LOG");
  } catch (err) {
    console.error("send error:", err);
    alert("送信中にエラーが発生しました");
  } finally {
    setSending(false);
  }
}

  // ── 盲点(Noise)を開く ──
  async function openNoise(note) {
    setNoiseOpen(true);
    setNoiseLoading(true);
    setNoiseData([]);
    const openedAt = Date.now();
    setNoiseMeta({ source: "", noteId: note.id, ts: openedAt });
    try {
      const base = [note.idea, note.cause, note.premise, note.trouble].filter(Boolean).join(" / ");
      const r = await getNoise(topic, base);
      const views = Array.isArray(r?.perspectives?.views)
        ? r.perspectives.views
        : Array.isArray(r?.perspectives) ? r.perspectives : [];
      const arr = views.map((v) => ({
        tag: v.view || "盲点",
        blindspot: v.blindspot || "",
        advice: v.advice || "",
      }));
      const fallback = buildConcreteProposals(topic, note);
      if (arr.length === 0) {
        setNoiseData(fallback);
        setNoiseMeta({ source: "fallback", noteId: note.id, ts: openedAt });
      } else {
        setNoiseData(arr);
        setNoiseMeta({ source: "ai", noteId: note.id, ts: openedAt });
      }
    } catch (e) {
      console.error("noise error:", e);
      setNoiseData(buildConcreteProposals(topic, note));
      setNoiseMeta({ source: "fallback", noteId: note.id, ts: openedAt });
    } finally { setNoiseLoading(false); }
  }

  // ── 議論終結(バッジ評価) ──
  const currentUser = userList?.[0] || "—";
  async function runExplainLineEval() {
    setLoadingEval(true);
    const cvs = cvsRef.current, ctx = cvs.getContext("2d"), W = cvs.width = 920, H = cvs.height = 520;
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H);
    const grd = ctx.createLinearGradient(0, 0, W, H);
    grd.addColorStop(0, "#eef2ff"); grd.addColorStop(1, "#f0fdf4");
    ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#111"; ctx.font = "bold 24px system-ui";
    ctx.fillText("思考アスレチック® - 気づいて、協働し、調べる -", 24, 40);
    ctx.font = "16px system-ui";
    ctx.fillText(`チーム:${teamName} / ユーザー:${currentUser} / 日付:${new Date().toLocaleDateString("ja-JP")}`, 24, 68);

    const T = visibleNotes, out = judgeOOTB(T, ootbMode);

    function drawBadge(cx, cy, mark, color) {
      ctx.save(); ctx.translate(cx, cy);
      ctx.fillStyle = color; ctx.beginPath(); ctx.arc(0, 0, 95, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.beginPath();
      const spikes = 5, outerRadius = 60, innerRadius = 25, yOffset = -5;
      for (let i = 0; i < spikes * 2; i++) {
        const r = (Math.PI / spikes) * i - Math.PI / 2;
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const x = Math.cos(r) * radius;
        const y = Math.sin(r) * radius + yOffset;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath(); ctx.fill();
      ctx.font = "bold 20px system-ui"; ctx.fillStyle = "#333"; ctx.textAlign = "center";
      ctx.fillText("評価バッジ", 0, 120); ctx.restore();
    }

    let badge = { mark: "—", color: "#9ca3af" }, strengths = [], improvement = "", advice = "";
    try {
      const text = T.filter((n) => n.author !== "noise").slice(0, 12)
        .map((n) => `P:${n.premise}\nA:${n.a}\nFlags:${(n.allFlags || []).join("/")}`).join("\n---\n");
      const r = await explainLineEvalApi(topic, text);
      strengths = r?.strengths || [];
      improvement = r?.improvement || "";
      advice = sanitizeAdvice(r?.summary || r?.text || r?.advice || "");
      if (r?.rank) {
        const colorMap = { "秀": "#10b981", "優": "#3b82f6", "良": "#f59e0b", "可": "#9ca3af", "不可": "#ef4444", "—": "#9ca3af" };
        badge = { mark: r.rank, color: colorMap[r.rank] || "#9ca3af" };
      }
    } catch (err) { console.error("explainLineEval error:", err); }

    drawBadge(W / 2, H / 2 - 80, badge.mark, badge.color);
    if (out) { const img = new Image(); img.onload = () => ctx.drawImage(img, 450, 110, 420, 300); img.src = "/hero-ootb.jpg"; }
    ctx.fillStyle = "#111"; ctx.font = "bold 18px system-ui"; ctx.fillText("AI総評", 24, 300);
    ctx.font = "14px system-ui";
    let y = 330, maxWidth = 860, lineHeight = 20;
    if (badge.mark) { y = wrapText(ctx, `【評価ランク】 ${badge.mark}`, 24, y, maxWidth, lineHeight) + lineHeight; }
    if (strengths.length) {
      y = wrapText(ctx, "【強み】", 24, y, maxWidth, lineHeight) + lineHeight;
      strengths.forEach((s) => { y = wrapText(ctx, "・" + s, 24, y, maxWidth, lineHeight) + lineHeight; });
    }
    if (improvement) {
      y = wrapText(ctx, "【改善点】", 24, y, maxWidth, lineHeight) + lineHeight;
      y = wrapText(ctx, "・" + improvement, 24, y, maxWidth, lineHeight) + lineHeight;
    }
    setLoadingEval(false);
  }

  // ── チーム削除 ──
  async function deleteTeam() {
    if (!teamName) return alert("チーム名が未設定です");
    if (!window.confirm(`⚠ チーム「${teamName}」の記録をすべて削除しますか？`)) return;
    if (!window.confirm("最終確認です。完全に削除されます。")) return;
    try {
      const companyCode = localStorage.getItem("companyCode");
      const res = await fetch(
        `https://ms-engine-test.s-yamane.workers.dev/persona/teamState?companyCode=${encodeURIComponent(companyCode)}&team=${encodeURIComponent(teamName)}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("delete failed");
      const json = await res.json();
      alert(`チーム ${teamName} を削除しました（${json.deleted}件）`);
      setUserLogs([]); setSelectedLog(null); setLogOpen(false);
      setTeamName("");
      setCurrentUserId(null);
      setCurrentUserName(null);
      setStep("join");
      localStorage.removeItem("teamName");
      localStorage.removeItem("currentUserId");
      localStorage.removeItem("currentUserName");
    } catch (e) { console.error(e); alert("削除に失敗しました"); }
  }

  // ── ログ取得 ──
  async function refreshLogs() {
    if (isRefreshing) return;
    setIsRefreshing(true); setRefreshDone(false);
    try {
      const res = await getTeamUserStates(teamName);
      const normalized = (res.users || [])
        .filter((u) => u && u.userId)
        .map((u) => ({ ...u, author: typeof u.author === "string" ? u.author : u.userId }))
        .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
      setUserLogs(normalized);
      setRefreshDone(true);
      setTimeout(() => setRefreshDone(false), 1000);
    } finally { setIsRefreshing(false); }
  }

  // ── ログ表示用 ──
  function createEmptyLog(userId) {
    return {
      userId, author: userId,
      topic: "", target: "", scenario: "", premise: "", trouble: "",
      otherPrem: "", cause: "", idea: "",
      plans: [{ who: "", executor: "", what: "", how: "", good: "", bad: "" }],
      updatedAt: null, __empty: true,
    };
  }
  const logMap = new Map(userLogs.map((l) => [l.userId, l]));
  const displayUsers = userList
    .filter((u) => !u.removed && (u.userId || u.name))
    .map((u) => {
      const uid = u.userId || u.name;
      const log = logMap.get(uid);
      return log ?? createEmptyLog(uid, u.name || uid);
    });
  function buildAllLogsForDownload(userList, userLogs) {
    const lm = new Map(userLogs.map((l) => [l.userId, l]));
    return userList
      .filter((u) => !u.removed && u.name)
      .map((u) => { const log = lm.get(u.name); return log ?? createEmptyLog(u.name); });
  }

  // ── ログPDF用ペイロード ──
  const displayName = currentUserName || "—";
const logPayload = {
  meta: { 
    team: teamName, 
    user: displayName, 
    date: new Date().toLocaleString("ja-JP") 
  },
  state: { 
    topic, 
    target: selectedTarget, 
    scenario, 
    premise, 
    trouble, 
    otherPrem, 
    cause, 
    idea,
    freeNote, // ←追加🔥
    plans 
  },
};

  /* ================================================================
     レンダー
     ================================================================ */
  if (checkingCompany) return null;
  if (!companyReady) return <CompanyLoginModal onSuccess={() => setCompanyReady(true)} />;

  return (
    <>
      {/* === debug: step表示 === */}
      <div
        style={{
          position: "fixed",
          top: 10,
          right: 10,
          zIndex: 9999,
          padding: "6px 10px",
          borderRadius: 8,
          background: "rgba(255,255,255,0.92)",
          border: "1px solid #cbd5e1",
          fontSize: 12,
          color: "#0f172a",
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        }}
      >
        step: {step} / team: {teamName || "—"} / user: {currentUserName || "—"}
      </div>

      {/* === INTRO === */}
      {view === "INTRO" && (
        <IntroScreen stage={stage} setView={setView} setGateOpen={setGateOpen} />
      )}

      {/* === ヘッダー（INTRO以外） === */}
      {view !== "INTRO" && view !== "HOME" && (
        <AppHeader
          headerOpen={headerOpen} setHeaderOpen={setHeaderOpen}
          view={view} setView={setView}
          teamName={teamName} currentUserName={currentUserName}
          logPayload={logPayload}
          setStage={setStage} setFinalOpen={setFinalOpen}
          runExplainLineEval={runExplainLineEval}
          setLogOpen={setLogOpen} getTeamUserStates={getTeamUserStates}
          setUserLogs={setUserLogs} setSelectedUserId={setSelectedUserId}
          logOpen={logOpen} setSelectedLog={setSelectedLog}
          setLogSearch={setLogSearch}
          setGateOpen={setGateOpen} setStep={setStep}
          setGateLoading={setGateLoading} setUserList={setUserList}
          getTeamMembers={getTeamMembers}
          ootbMode={ootbMode} setOotbMode={setOotbMode}
          aiOK={aiOK} checkAI={checkAI}
        />
      )}

      {/* === 参加設定モーダル === */}
      <SettingsModal
        gateOpen={gateOpen} setGateOpen={setGateOpen}
        gateLoading={gateLoading}
        step={step} setStep={setStep}
        teamName={teamName} setTeamName={setTeamName}
        userList={userList} setUserList={setUserList}
        currentCompanyCode={currentCompanyCode}
        currentUserId={currentUserId}
        setCurrentUserId={setCurrentUserId}
        currentUserName={currentUserName}
        setCurrentUserName={setCurrentUserName}
      />

      {/* === LOGを見るモーダル === */}
      <LogViewerModal
        logOpen={logOpen} setLogOpen={setLogOpen}
        teamName={teamName}
        selectedLog={selectedLog} setSelectedLog={setSelectedLog}
        logSearch={logSearch} setLogSearch={setLogSearch}
        displayUsers={displayUsers}
        isRefreshing={isRefreshing} refreshDone={refreshDone}
        refreshLogs={refreshLogs}
        userList={userList} userLogs={userLogs}
        buildAllLogsForDownload={buildAllLogsForDownload}
        setLogsForDownload={setLogsForDownload}
        setDlSelectOpen={setDlSelectOpen}
        deleteTeam={deleteTeam}
      />

      {/* === ダウンロード形式選択 === */}
      <DownloadSelectModal
        dlSelectOpen={dlSelectOpen} setDlSelectOpen={setDlSelectOpen}
        logsForDownload={logsForDownload} teamName={teamName}
      />

      {/* === 議論終結モーダル === */}
      <FinalEvalModal
        finalOpen={finalOpen} setFinalOpen={setFinalOpen}
        loadingEval={loadingEval} cvsRef={cvsRef}
        teamName={teamName}
        setEvidenceHints={setEvidenceHints} setEvidenceOpen={setEvidenceOpen}
        loading={loading} setLoading={setLoading}
        evidenceQuest={evidenceQuest}
        topic={topic} visibleNotes={visibleNotes}
      />

      {/* === Evidence Questモーダル === */}
      <EvidenceQuestModal
        evidenceOpen={evidenceOpen} setEvidenceOpen={setEvidenceOpen}
        loading={loading} evidenceHints={evidenceHints}
      />

      {/* === 盲点モーダル === */}
      <NoiseHintModal
        noiseOpen={noiseOpen} setNoiseOpen={setNoiseOpen}
        noiseLoading={noiseLoading}
        noiseData={noiseData} noiseMeta={noiseMeta}
      />

      {/* === FRONT === */}
{view === "FRONT" && (
  <FrontScreen
    page={page} setPage={setPage}
    topic={topic} setTopic={setTopic}
    listening={listening} startListening={startListening}
    targetList={targetList} setTargetList={setTargetList}
    selectedTarget={selectedTarget} setSelectedTarget={setSelectedTarget}
    targetListening={targetListening} startTargetListening={startTargetListening}
    loadingTargets={loadingTargets} setLoadingTargets={setLoadingTargets}
    aiMode={aiMode} setAiMode={setAiMode}
    scenario={scenario} setScenario={setScenario}
    scenarioDraft={scenarioDraft} setScenarioDraft={setScenarioDraft}
    scenarioFixed={scenarioFixed} setScenarioFixed={setScenarioFixed}
    scenarioListening={scenarioListening} startScenarioListening={startScenarioListening}
    premise={premise} setPremise={setPremise}
    trouble={trouble} setTrouble={setTrouble}
    otherPrem={otherPrem} setOtherPrem={setOtherPrem}
    cause={cause} setCause={setCause}
    idea={idea} setIdea={setIdea}
    premiseListening={premiseListening} startPremiseListening={startPremiseListening}
    troubleListening={troubleListening} startTroubleListening={startTroubleListening}
    otherPremListening={otherPremListening} startOtherPremListening={startOtherPremListening}
    causeListening={causeListening} startCauseListening={startCauseListening}
    ideaListening={ideaListening} startIdeaListening={startIdeaListening}
    plans={plans} setPlans={setPlans}
    listeningPlan={listeningPlan} startPlanListening={startPlanListening}
    goodListening={goodListening} startGoodListening={startGoodListening}
    badListening={badListening} startBadListening={startBadListening}
    userList={userList}
    send={send} sending={sending}

    // 👇ここ追加🔥
    freeNote={freeNote}
    setFreeNote={setFreeNote}
    freeNoteListening={freeNoteListening}
    setFreeNoteListening={setFreeNoteListening}
  />
)}

      {/* === LOG === */}
      {view === "LOG" && (
        <LogScreen
          currentTeam={currentTeam}
          visibleNotes={visibleNotes}
          teamStats={teamStats}
          openNoise={openNoise}
        />
      )}

      {/* === Dashboard === */}
      {view === "DASHBOARD" && (
        <DashboardPanel
          key={currentCompanyCode}
          companyCode={currentCompanyCode}
        />
      )}
      

      {/* === BOARD === */}
      {view === "BOARD" && (
        <BoardScreen
          currentTeam={currentTeam}
          visibleNotes={visibleNotes}
          matrixSpec={matrixSpec} setMatrixSpec={setMatrixSpec}
          matrixPos={matrixPos} setMatrixPos={setMatrixPos}
          editMatrix={editMatrix} setEditMatrix={setEditMatrix}
          arranging={arranging} setArranging={setArranging}
          compactView={compactView} setCompactView={setCompactView}
          portrait={portrait}
          topic={topic}
          setNotes={setNotes}
        />
      )}
    </>
  );
}
