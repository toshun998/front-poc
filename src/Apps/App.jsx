//React
import { useEffect, useMemo, useRef, useState } from "react";
//personaApi
import {
  // LOG / 個人保存
  getTeamUserStates,
  saveUserState,

  // Persona / AI
  getTargets,
  explainLineEval as explainLineEvalApi,
  checkLogBias,
  getNoise,
  arrangeBoard,
  evidenceQuest,

  // チーム情報（参照のみ）
  getTeamState,

  // 課金
  subscribePlan,
} from "../FrontServer/personaApi";

//Styles
import "./App.css";
//Img
import kobusiImg from "../Images/kobusi.png";
//App_Options
import LoginModal from "../App_Options/LoginModal";
//PDF
import { jsPDF } from "jspdf";
import "../Assets/NotoSansJP-Regular-normal";


/* ========== App ========== */
export default function App(){
//2秒ごと保存定義
const lastSavedRef = useRef("");

const SHOW_DEBUG_BUTTONS = true;
//Intro定義
const [view, setView] = useState("INTRO");
const [stage, setStage] = useState("intro");
  //Kv保存定義
const [topic,setTopic] = useState("");

const [teamName,setTeamName] = useState(()=>localStorage.getItem("teamName")||"T1");
//LoadingUI定義
const [gateLoading, setGateLoading] = useState(false);
const [showUserMenu, setShowUserMenu] = useState(false);
const [plan, setPlan] = useState("free");
//Login定義
const [showLogin, setShowLogin] = useState(false);
const [user, setUser] = useState(null); // ← ログイン中ユーザー
//ボタン機能定義
const [gateOpen,setGateOpen] = useState(false);
const [page, setPage] = useState(1);
const [aiMode, setAiMode] = useState(false);
const [targetList, setTargetList] = useState(defaultStakeholdersFor(topic));
const [headerOpen, setHeaderOpen] = useState(true);
const [loadingEval, setLoadingEval] = useState(false);
const [loadingTargets, setLoadingTargets] = useState(false);
const [compactView, setCompactView] = useState(false);
//音声入力定義
const { listening, startListening } = useSpeechInput((text) => {
    setTopic((prev) => (prev ? prev + " " + text : text));
  });
  const { listening: scenarioListening, startListening: startScenarioListening } =
  useSpeechInput((text) => {
    setScenarioDraft((prev) => (prev ? prev + " " + text : text));
  });
  const { listening: targetListening, startListening: startTargetListening } =
  useSpeechInput((text) => {
    const el = document.getElementById("freeTarget");
    if (el) el.value = text;
  });
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

      // ===== 助詞で文を判定 =====
      // ex: 「大谷がうんちを漏らした」
      const match = t.match(/(.+?)が(.+?)を(.+?)$|(.+?)が(.+?)した|(.+?)が(.+)/);

      if (match) {
        // パターン1: 「AがBをC」形式
        if (match[1] && match[2] && match[3]) {
          last.executor = match[1].trim();
          last.what = match[2].trim();
          last.how = match[3].trim();
        }
        // パターン2: 「AがBした」形式
        else if (match[4] && match[5]) {
          last.executor = match[4].trim();
          last.what = match[5].trim();
          last.how = "";
        }
        // パターン3: 「AがB」形式
        else if (match[6] && match[7]) {
          last.executor = match[6].trim();
          last.what = match[7].trim();
          last.how = "";
        }
      } else {
        // シンプル文（助詞がない場合）→空欄順に埋める
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
    setPlans((prev) => {
      const updated = [...prev];
      updated[updated.length - 1].good = text;
      return updated;
    });
  });
const { listening: badListening, startListening: startBadListening } =
  useSpeechInput((text) => {
    setPlans((prev) => {
      const updated = [...prev];
      updated[updated.length - 1].bad = text;
      return updated;
    });
  });
  const [plans, setPlans] = useState([
    { who: "", what: "", how: "", good: "", bad: "" },
  ]);
//設定内容のユーザー定義
  const [userList, setUserList] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("userList"));
      return Array.isArray(saved) && saved.length > 0 ? saved : [""];
    } catch {
      return [""];
    }
  });
  

// KV保存送信（userState 専用）
async function updatePlan(index, newPlan) {
  setPlans((prev) => {
    const updated = prev.map((p, i) => (i === index ? newPlan : p));

    // 🔽 非同期保存（userState）
    (async () => {
      try {
        // userId は人格なので一度決めたら固定
        let userId = localStorage.getItem("userId");
        if (!userId) {
          userId = "U" + crypto.randomUUID().slice(0, 8);
          localStorage.setItem("userId", userId);
        }

        await saveUserState({
          team: teamName,
          author: userId, // 表示用（LOG用）

          topic,
          target: selectedTarget,
          scenario,
          premise,
          trouble,
          otherPrem,
          cause,
          idea,
          plans: updated,
        });

        console.log(`💾 プラン${index + 1} 個人保存OK`, updated[index]);
      } catch (err) {
        console.error(`❌ プラン${index + 1} 個人保存失敗`, err);
      }
    })();

    return updated;
  });
}



  useEffect(()=>{localStorage.setItem("teamName",teamName);},[teamName]);
  const [portrait, setPortrait] = useState(() => window.innerHeight > window.innerWidth);
    useEffect(() => {
      const onResize = () => setPortrait(window.innerHeight > window.innerWidth);
      window.addEventListener("resize", onResize);
      window.addEventListener("orientationchange", onResize);
      return () => {
        window.removeEventListener("resize", onResize);
        window.removeEventListener("orientationchange", onResize);
      };
    }, []);


//A! INTROエフェクト
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
  // ①最初：拳＋タイトル中央表示 → 1秒後に上昇
  const t1 = setTimeout(() => setStage("moveUp"), 1000);
  // ②さらに1秒後：完全定位置（HOMEスタイル完成）
  const t2 = setTimeout(() => setStage("done"), 2000);
  return () => {
    clearTimeout(t1);
    clearTimeout(t2);
  };
}, []);
useEffect(() => {
  const url = new URL(window.location.href);
  const token = url.searchParams.get("token");

  if (token) {
    localStorage.setItem("shikoUserToken", token);

    // URL から完全に削除
    url.searchParams.delete("token");
    window.history.replaceState({}, "", url.toString());
  }
}, []);





//A!右上ログイン
const sendLogin = async () => {
  try {
    const res = await fetch("https://ms-engine-test.sinnosukeyamane.workers.dev/persona/loginRequest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ redirect: window.location.href }),
    });

    const data = await res.json();

    if (data.url) {
      // Googleログイン画面（OAuth）へ飛ぶ
      window.location.href = data.url;
    } else {
      alert("ログイン開始に失敗しました");
    }
  } catch (err) {
    console.error(err);
    alert("通信エラー");
  }
};
//A! 背景絵文字
function BrainShower() {
  const containerRef = useRef(null);
  const icons = ["🧠", "💡", "💭", "📘", "🎨", "🔎", "❓", "❗️", "👊"];
  const intervalRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 🧠 定期的に新しいアイコンを生成して落とす
    const createBrain = () => {
      const span = document.createElement("span");
      const icon = icons[Math.floor(Math.random() * icons.length)];
      const hue = Math.floor(Math.random() * 360);

      span.textContent = icon;
      span.style.position = "absolute";
      span.style.left = `${Math.random() * 100}%`;
      span.style.top = "-10%";
      span.style.fontSize = `${18 + Math.random() * 24}px`;
      span.style.opacity = 0.6 + Math.random() * 0.4;
      span.style.filter = `drop-shadow(0 0 3px hsl(${hue}, 80%, 70%))`;
      span.style.animation = `fallBrain ${8 + Math.random() * 8}s linear`;
      span.style.transform = `rotate(${Math.random() * 360}deg)`;
      span.style.pointerEvents = "none";

      // 💫 アニメーション終了後に削除
      span.addEventListener("animationend", () => span.remove());

      container.appendChild(span);
    };

    // 🌧 継続して降らせる（0.3秒ごと）
    intervalRef.current = setInterval(createBrain, 300);

    return () => {
      clearInterval(intervalRef.current);
    };
  }, []);

  return <div ref={containerRef} className="brain-shower" />;
}
//A! 右上サブスク関数
function SubscribeButton({ user }) {
  const [loading, setLoading] = useState(false);

  async function handleSubscribe() {
    setLoading(true);
    try {
      await subscribePlan(user);
    } catch (err) {
      alert("通信エラー: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button className="btnDark" onClick={handleSubscribe} disabled={loading}>
      {loading ? "接続中..." : "🪙サブスク"}
    </button>
  );
}


//A! 難易度関連
const OOTB_MODE = ["easy","standard","hard"];
const isNovelAgainst = (prev, now, thr=0.45)=> jaccard(prev||"", now||"") < thr;
function detectPositiveOutlier(note, topic, previousNotes){
  const txt = [note.otherPrem, note.idea, note.cause].filter(Boolean).join(" ");
  const T   = (topic||"") + " " + txt;
  const frameShift = /(過程|プロセス|履歴|透明性|再現|公平|代替手段|抽選|スポットチェック|口頭|録音|ランダム|申告)/.test(T);
  const conditional = /(ただし|条件|場合|上限|下限|境界|分けて|とき|なら|条件付き)/.test(T);
  const microTrial  = /(小さく|試(す|行)|即興|ミニ|タイムラプス|一部で|抽出|対照|パイロット|検証)/.test(T) || (note.who && note.what && note.how);
  const hitKinds = []; if(frameShift) hitKinds.push("frame"); if(conditional) hitKinds.push("cond"); if(microTrial) hitKinds.push("trial");
  const prev = (previousNotes||[]).slice(0,6).map(n=> n.a || n.idea || n.cause || "");
  const novel = prev.every(p => isNovelAgainst(p, txt, 0.45));
  return { isHit: novel && (hitKinds.length >= 2), hitKinds };
}
function judgeOOTB(teamNotes, mode="standard"){
  const userNotes = teamNotes.filter(n=>n.author!=="noise");
  let sim=0,cmp=0;
  for(let i=1;i<userNotes.length;i++){ cmp++; if(jaccard(userNotes[i-1].a, userNotes[i].a)>0.75) sim++; }
  const diversity = cmp ? (1 - sim/cmp) : 0;
  let hitCount=0; const byAuthor=new Set();
  for(let i=0;i<userNotes.length;i++){
    const n=userNotes[i]; const prev=userNotes.slice(Math.max(0,i-6), i);
    const { isHit } = detectPositiveOutlier(n, n.q||"", prev);
    if(isHit){ hitCount++; byAuthor.add(n.author||""); }
  }
  const hasOtherPrem = userNotes.some(n=> (n.otherPrem||"").trim());
  if(mode==="easy")    return (hitCount>=1) && (diversity>=0.20);
  if(mode==="hard")    return (byAuthor.size>=2) && (hitCount>=2) && (diversity>=0.50) && hasOtherPrem;
  return (hitCount>=1) && (diversity>=0.40);
}
//A! 難易度 
const [ootbMode,setOotbMode] = useState(()=>localStorage.getItem("ootbMode")||"standard");
useEffect(()=>{ localStorage.setItem("ootbMode",ootbMode); },[ootbMode]);

  //B! 音声入力関数
function useSpeechInput(onResult) {
  const recognitionRef = useRef(null);
  const [listening, setListening] = useState(false);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("このブラウザは音声認識に対応していません");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "ja-JP";
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript;
      onResult(text);
      setListening(false);
    };

    recognition.onend = () => setListening(false);
    recognition.onerror = (err) => {
      console.error("SpeechRecognition error:", err);
      setListening(false);
    };

    recognitionRef.current = recognition;
  }, [onResult]);

  const startListening = () => {
    if (!recognitionRef.current) {
      alert("このブラウザは音声入力に対応していません");
      return;
    }
    setListening(true);
    recognitionRef.current.start();
  };

  return { listening, startListening };
}

//B! 不明
function unbox(r){
  if (r==null) return r;
  if (Array.isArray(r)) return r[0] ?? null;
  if (r && Array.isArray(r.data)) return r.data[0] ?? null;
  return r;
}
const toTaigen = s => String(s||"").trim().replace(/[?？。]+$/,"").replace(/(とは|はなぜ.*|について.*)$/,"") || "この議題";
const hasCausalCue = s => /だから|ため|ので|ゆえ|せい|結果|影響|原因|引き起こ/.test(String(s||""));
const clamp = (x,min=0,max=1)=> Math.max(min,Math.min(max,x));
const jaccard = (a,b)=>{ const A=new Set(String(a||"").toLowerCase().split(/\s+/).filter(Boolean)); const B=new Set(String(b||"").toLowerCase().split(/\s+/).filter(Boolean)); const inter=[...A].filter(x=>B.has(x)).length; const uni=new Set([...A,...B]).size||1; return inter/uni; };

//B! 不明
const keyPlain = s => String(s||"").replace(/\s+/g,"").replace(/[『』「」【】（）()［］\[\]、。・,.!?！？]/g,"").toLowerCase();
function isTooClose(name, topic){
  const a=keyPlain(name), b=keyPlain(toTaigen(topic));
  if(!a||!b||a.length<=2) return false;
  if (b.includes(a) || a.includes(b)) return true;
  const A=new Set(a.split("")); const B=new Set(b.split(""));
  const inter=[...A].filter(x=>B.has(x)).length; const uni=new Set([...A,...B]).size||1;
  return inter/uni > 0.6;
}
function normalizeStakeholders(topic, names){
  const base = defaultStakeholdersFor(topic);
  const out=[]; for(const n of [...names,...base]){ const s=String(n||"").trim(); if(!s) continue; if(isTooClose(s, topic)) continue; if(!out.includes(s)) out.push(s); }
  return out.slice(0,12);
}
//B! 議題から当事者自動選定
function defaultStakeholdersFor(topic) {
  const t = String(topic || "").toLowerCase();
  const unique = new Set();

  // --- カテゴリ辞書 ---
  const categories = [
    { key: /性犯罪|暴力|虐待|誹謗|犯罪|治安/, list: ["被害当事者","加害当事者","警察","支援団体","地域住民","自治体関係者","報道関係者","法律専門家"] },
    { key: /教育|学生|授業|大学|学校|研究|教師|学習|課題/, list: ["学生","教員","保護者","教育委員会","学校運営者","研究者","同級生","教育政策担当"] },
    { key: /医療|病院|健康|看護|福祉|介護|ワクチン|感染/, list: ["患者","医療従事者","家族","保健所","製薬会社","自治体関係者","倫理委員会","報道関係者"] },
    { key: /経済|企業|雇用|ビジネス|投資|景気|物価|副業/, list: ["社員","経営者","顧客","投資家","取引先","政府関係者","労働組合","地域住民"] },
    { key: /政治|政府|政策|法律|選挙|行政|国会|制度|外交/, list: ["国民","政治家","行政職員","専門家","市民団体","報道関係者","法曹関係者","NPO関係者"] },
    { key: /環境|自然|気候|エネルギー|原発|災害|防災|再生可能/, list: ["地域住民","専門家","政府関係者","企業","研究者","環境団体","ボランティア","教育者"] },
    { key: /ai|人工知能|テクノロジー|機械|プログラム|開発|データ|セキュリティ/, list: ["開発者","利用者","研究者","倫理専門家","法曹関係者","企業","行政関係者","教育者"] },
    { key: /sns|ネット|動画|投稿|炎上|フォロワー|コミュニティ|インターネット/, list: ["ユーザー","プラットフォーム運営","視聴者","広告主","報道関係者","インフルエンサー","モデレーター","被害者"] },
    { key: /文化|芸術|音楽|映画|ゲーム|アニメ|創作|発表|表現/, list: ["制作者","観客","ファン","出版社","報道関係者","批評家","スポンサー","教育機関"] },
    { key: /宗教|哲学|倫理|信仰|死生観|価値観|思想|信念/, list: ["信者","指導者","哲学者","研究者","宗教団体","教育者","一般市民","報道関係者"] },
    { key: /恋愛|結婚|家族|友人|人間関係|子育て|離婚|孤独/, list: ["本人","恋人","配偶者","家族","友人","カウンセラー","SNSフォロワー","教育者"] },
    { key: /科学|宇宙|未来|技術革新|バイオ|遺伝子|ロボット|量子/, list: ["科学者","技術者","企業","政府関係者","倫理委員会","研究機関","一般市民","学生"] },
    { key: /国際|戦争|平和|外交|難民|条約|貿易|多文化|移民/, list: ["政府関係者","国際機関","外国人住民","市民団体","報道関係者","研究者","支援者","一般市民"] },
    { key: /都市|交通|住宅|再開発|地域|観光|景観|まちづくり/, list: ["住民","観光客","事業者","建設業者","設計者","自治体関係者","地域団体","環境専門家"] },
    { key: /生活|消費|食|家計|物価|サブスク|通販|電気|水道/, list: ["消費者","販売者","製造者","流通業者","金融機関","政府関係者","NPO","地域住民"] },
    { key: /心理|メンタル|ストレス|幸福|自己肯定感|カウンセリング/, list: ["本人","家族","カウンセラー","心理学者","友人","教育者","医師","支援者"] },
    { key: /働き方|チーム|リーダー|上司|部下|会議|評価|モチベーション/, list: ["上司","部下","人事担当","経営者","チームメンバー","コーチ","組織心理士","教育担当"] },
    { key: /倫理|モラル|自由|規制|言論|著作権|人権|差別/, list: ["表現者","読者","規制当局","法曹関係者","報道関係者","哲学者","市民","教育者"] },
    { key: /夢|希望|恐怖|怒り|悲しみ|未来|現実|自由|幸せ|孤独|人生|愛|死|存在|意味|心/, list: ["本人","家族","友人","心理学者","哲学者","作家","教育者","一般市民"] },
  ];

  // --- マルチマッチング ---
  for (const c of categories) {
    if (c.key.test(t)) {
      c.list.forEach(x => unique.add(x));
    }
  }

  // --- 何も該当しなかった場合のフォールバック ---
  if (unique.size === 0) {
    ["当事者","関係者","専門家","行政関係者","研究者","支援者","一般市民"]
      .forEach(x => unique.add(x));
  }

  return Array.from(unique);
}


//B! LOG_AI確認
  const [aiOK,setAiOK] = useState(null); // null=未確認, true=OK, false=NG
  async function checkAI(){
    const base = (import.meta.env.VITE_PERSONA_API_BASE || "").replace(/\/$/,"");
    if(!base){ setAiOK(false); return; }
    try{ const r = await fetch(`${base}/health`, { method:"GET" }); setAiOK(r.ok); }
    catch{ setAiOK(false); }
  }
  useEffect(()=>{ checkAI(); },[]);

//B!1 当事者AI選定
  const [selectedTarget,setSelectedTarget] = useState("");
  useEffect(()=>{ (async ()=>{
    try{
      const res = unbox(await getTargets?.(topic));
      const ai = [
        ...(Array.isArray(res?.fixed) ? res.fixed.map(x=>x.name) : []),
        ...(Array.isArray(res?.ai)    ? res.ai.map(x=>x.name)    : []),
      ];
      setTargetList(normalizeStakeholders(topic, ai));
    }catch{ setTargetList(normalizeStakeholders(topic, [])); }
    setSelectedTarget(""); setScenario(""); setScenarioDraft(""); setScenarioFixed(false);
  })(); },[topic]);

//B!1 シナリオ内容
  const [scenario,setScenario] = useState("");
  const [scenarioDraft,setScenarioDraft] = useState("");
  const [scenarioFixed,setScenarioFixed] = useState(false);
  useEffect(()=>{ (async ()=>{
    if(!selectedTarget) return;
    const s = `${toTaigen(topic)}について考えよう。\nその件で、${selectedTarget}が困っていることがあります。\n困っている${selectedTarget}を助けよう。`;
    try{ await getRescueIncident?.(topic, selectedTarget, []); }catch{}
    setScenario(s); setScenarioDraft(s); setScenarioFixed(false);
  })(); },[selectedTarget]);

//B!2 計画内容
  const [premise,setPremise] = useState("");
  const [trouble,setTrouble] = useState("");
  const [otherPrem,setOtherPrem] = useState("");
  const [cause,setCause] = useState("");
  const [idea,setIdea] = useState("");
  const [who,setWho] = useState(""); const [what,setWhat] = useState(""); const [how,setHow] = useState("");
  const [good,setGood] = useState(""); const [bad,setBad] = useState("");


//不明
  const [notes,setNotes] = useState([]);
  const currentTeam = teamName;
  const visibleNotes = useMemo(()=>notes.filter(n=>(n.team||teamName)===currentTeam),[notes,currentTeam,teamName]);
  const histRef = useRef([]);
  const teamStats = useMemo(()=>{ const U=visibleNotes.filter(n=>n.author!=="noise"); const H=U.filter(n=>n.aiTag==="H").length; const E=U.filter(n=>n.aiTag==="E").length; return {H,E}; },[visibleNotes]);


  
//C! 偏り表示
const OUTLIER = {
  "断定": {
    icon: "❗",
    code: "断定",
    label: "断定",
    color: "#ef4444",
    desc: "断定してるかも。条件を付けよう。",
  },
  "因果が粗い": {
    icon: "🔄",
    code: "因果",
    label: "因果",
    color: "#4aa5faff",
    desc: "因果関係が曖昧かも。根拠をはっきりさせよう。",
  },
  "権威に依存": {
    icon: "👑",
    code: "権威",
    label: "権威",
    color: "#8b5cf6",
    desc: "肩書や伝聞は本当に真実なのかな。",
  },
  "仮説過多(H≫E)": {
    icon: "💭",
    code: "仮説",
    label: "仮説",
    color: "#0ea5e9",
    desc: "仮説が多いかも。事実が欲しいね。",
  },
  "倫理リスク": {
    icon: "🚫",
    code: "倫理",
    label: "倫理",
    color: "#f97316",
    desc: "人権・倫理に反するかも。安全な代替を。",
  },
  "主観": {
    icon: "👀",
    code: "主観",
    label: "主観",
    color: "#10b981",
    desc: "主観が強いかも。客観も足そう。",
  },
  "矛盾": {
    icon: "🗡️🛡️",
    code: "矛盾",
    label: "矛盾",
    color: "#e11d48",
    desc: "条件を分けて整理しよう。",
  },
  "均衡": {
    icon: "⚖️",
    code: "均衡",
    label: "均衡",
    color: "#84331F",
    desc: "バランス良し。良いね！",
  },
  "不明": {
    icon: "❓",
    code: "不明",
    label: "不明",
    color: "#9ca3af",
    desc: "意味が取りづらいかも。判断要素を増やそう。",
  },
};
//C! 偏り説明
function OutlierBadges({ flags=[] }){
  if(!Array.isArray(flags)||flags.length===0) return null;
  return (
    <div style={{display:"flex",flexDirection:"column",gap:6,marginTop:4}}>
      {flags.map((f,i)=>{ 
        const m = OUTLIER[f] || {icon:"🙂",code:"",color:"#94a3b8",desc:String(f)};
        return (
          <div key={`${f}-${i}`} style={{display:"flex",alignItems:"center",gap:8}}>
            {/* 丸いアイコン */}
            <span style={{
              display:"inline-flex",
              alignItems:"center",
              justifyContent:"center",
              width:22,height:22,
              borderRadius:"50%",
              background:m.color,
              color:"#fff",
              fontSize:13,
              flexShrink:0
            }}>{m.icon}</span>
            {/* コードと説明を横並び */}
            <span style={{fontWeight:"bold",marginRight:4}}>{m.code}</span>
            <span style={{fontSize:13,color:"#374151"}}>{m.desc}</span>
          </div>
        );
      })}
    </div>
  );
}
//C! 偏り表示関数
function filterOutlierFlags(list, field, rawText){
    if(!Array.isArray(list)) return [];
    const txt = String(rawText||"");
    return list.filter(f=>{
      if(f==="仮説過多(H≫E)"){
        const {H,E}=teamStats; const strict = (E===0 && H>=3) || (H >= 3*E + 2);
        return strict;
      }
      if(field==="trouble" && f==="因果が粗い") return false;
      if(field==="premise" && f==="因果が粗い") return false;
      if(field==="idea"    && f==="因果が粗い" && !hasCausalCue(txt)) return false;
      return true;
    });
  }
//C! 偏り説明関数
function RenderFlags({ flagsForField, rawText, field, advice }) {
  if (!rawText || rawText.trim().length === 0) return null;

  const filtered = filterOutlierFlags(flagsForField, field, rawText);
  const [open, setOpen] = useState(false);

  return (
    <div style={{ marginTop: 4 }}>
      {/* === バッジとボタンを横並び === */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <OutlierBadges flags={filtered} />

        {advice && (
          <button
            onClick={() => setOpen(!open)}
            style={{
              background: "none",
              border: "none",
              color: "#0ea5e9",
              cursor: "pointer",
              fontSize: ".8rem",
              padding: 0,
            }}
          >
            {open ? "▲ アドバイスを閉じる" : "▼ アドバイスを見る"}
          </button>
        )}
      </div>

      {/* === 折りたたみ内容 === */}
      {open && advice && (
        <div
          className="hint"
          style={{
            background: "#f8fafc",
            borderRadius: 6,
            padding: "6px 8px",
            border: "1px solid #e2e8f0",
            lineHeight: 1.5,
            marginTop: 4,
          }}
        >
          💡 {advice}
        </div>
      )}
    </div>
  );
}
//C! LOG盲点表示
const [noiseOpen,setNoiseOpen] = useState(false);
const [noiseData,setNoiseData] = useState([]);     // [{tag,text}]
const [noiseLoading,setNoiseLoading] = useState(false);
const [noiseMeta,setNoiseMeta] = useState({ source:"", noteId:"", ts:0 }); // "ai"|"templateish"|"fallback"
function topicSnippets(topic, note){
    const s=(topic+" "+note.premise+" "+note.idea+" "+note.cause).toLowerCase();
    if(/レポート|ai|評価|採点|学生|教員/.test(s)){
      return [
        `教員向け：口頭はランダム抽出10–20%のみ。録音保存＋2名採点＋簡易ルーブリックを公開。`,
        `学生向け：AI使用は申告＋プロンプト履歴提出を必須（未提出は減点／再評価）。`,
        `配慮：口頭が不利な学生に動画説明や追試など同等の代替手段を規定。`,
        `運用：オンラインは画面共有＋手元カメラを要件化（裏参照対策）。`,
        `検証：同テーマの即興ミニ課題を本試験に1題混ぜ、理解の再現性を確認。`,
      ];
    }
    if(/ひまわり|向日葵|sunflower/.test(s)){
      return [
        `観察：芽→蕾→開花の3段階で方位と角度を朝/昼/夕で記録。`,
        `映像：蕾期の日周運動と開花後の固定をタイムラプスで確認。`,
        `出題：『いつ動く？なぜ？』に分け、2択（動く/動かない）のみを避ける。`,
        `言い換え：『向日性＝蕾の性質』と板書、誤解語『花が太陽を追う』を消す。`,
      ];
    }
    return [
      `条件分岐：うまくいく時/いかない時の違いを1行で書く。`,
      `反対仮説：原因が逆だった場合の説明を1行で。`,
      `検証：『誰・何・どうやって』の最小セットを1つ書いて小さく試す。`,
    ];
  }
function buildConcreteProposals(n){
    const list = topicSnippets(topic, n).map(t=>({tag:"盲点", text:t}));
    if(!(n.trouble||"").trim()) list.push({tag:"例", text:"困っている具体例を1行（誰が/いつ/どこで）。"});
    if(!(n.who&&n.what&&n.how)) list.push({tag:"検証", text:"『誰・何・どうやって』を1セット書いて小さく試す。"});
    return list;
  }
async function openNoise(note){
    setNoiseOpen(true); 
    setNoiseLoading(true); 
    setNoiseData([]);
    const openedAt = Date.now();
    setNoiseMeta({ source:"", noteId:note.id, ts:openedAt });
    try {
      const base = [note.idea, note.cause, note.premise, note.trouble]
        .filter(Boolean).join(" / ");
  
      // noise API 呼び出し
      const r = await getNoise(topic, base);
  
      // 正規化
      const views = Array.isArray(r?.perspectives?.views)
        ? r.perspectives.views
        : Array.isArray(r?.perspectives)
          ? r.perspectives
          : [];
  
      const arr = views.map(v => ({
        tag: v.view || "盲点",
        blindspot: v.blindspot || "",
        advice: v.advice || ""
      }));
  
      const fallback = buildConcreteProposals(note);
      if (arr.length === 0) {
        setNoiseData(fallback);
        setNoiseMeta({ source:"fallback", noteId:note.id, ts:openedAt });
      } else {
        setNoiseData(arr);
        setNoiseMeta({ source:"ai", noteId:note.id, ts:openedAt });
      }
    } catch(e) {
      console.error("noise error:", e);
      setNoiseData(buildConcreteProposals(note));
      setNoiseMeta({ source:"fallback", noteId:note.id, ts:openedAt });
    } finally {
      setNoiseLoading(false);
    }
  }
  



//D! Board定義
const [matrixSpec, setMatrixSpec] = useState("impact-feasibility");
const [matrixPos, setMatrixPos] = useState({});
const [editMatrix, setEditMatrix] = useState(false);
const [arranging, setArranging] = useState(false); // AI配置中フラグ
const matrixRef = useRef(null), dragRef = useRef(null);
//D! Boardドラッグ関数
function mDown(e, key) {
    if (!editMatrix) return;
    const r = matrixRef.current.getBoundingClientRect();
    const xP = ((e.clientX - r.left) / r.width) * 100;
    const yP = ((e.clientY - r.top) / r.height) * 100;
    dragRef.current = {
      key,
      dx: xP - (matrixPos[key]?.xP ?? 50),
      dy: yP - (matrixPos[key]?.yP ?? 50)
    };
  }
function mMove(e, key) {
    if (!editMatrix || !dragRef.current || dragRef.current.key !== key) return;
    const r = matrixRef.current.getBoundingClientRect();
    let xP = ((e.clientX - r.left) / r.width) * 100 - dragRef.current.dx;
    let yP = ((e.clientY - r.top) / r.height) * 100 - dragRef.current.dy;
    xP = clamp(xP, 5, 95);
    yP = clamp(yP, 5, 95);
    setMatrixPos(p => ({ ...p, [key]: { xP, yP } }));
  }
const mUp = () => { dragRef.current = null; };
//D! BoardUI関数(軸)
function matrixLabels(spec) {
    switch (spec) {
      case "impact-feasibility": return [
        { k: "yH", t: "効果（高）", s: { left: "52%", top: "6%" } },
        { k: "yL", t: "効果（低）", s: { left: "52%", bottom: "6%" } },
        { k: "xL", t: "実現可能性（低）", s: { left: "8%", bottom: "50.2%" } },
        { k: "xH", t: "実現可能性（高）", s: { right: "8%", bottom: "50.2%" } }
      ];
      case "importance-urgency": return [
        { k: "yH", t: "重要度（高）", s: { left: "52%", top: "6%" } },
        { k: "yL", t: "重要度（低）", s: { left: "52%", bottom: "6%" } },
        { k: "xL", t: "緊急度（低）", s: { left: "8%", bottom: "50.2%" } },
        { k: "xH", t: "緊急度（高）", s: { right: "8%", bottom: "50.2%" } }
      ];
      default: return [
        { k: "yH", t: "客観的（高）", s: { left: "52%", top: "6%" } },
        { k: "yL", t: "客観的（低）", s: { left: "52%", bottom: "6%" } },
        { k: "xL", t: "主観的（低）", s: { left: "8%", bottom: "50.2%" } },
        { k: "xH", t: "主観的（高）", s: { right: "8%", bottom: "50.2%" } }
      ];
    }
  }
//D! BoardUI関数(計画内容)
function flattenToBoardItems(list) {
    const items = [];
    list.forEach(n => {
      const base = { 
        author: n.author, 
        time: n.createdAt, 
        id: n.id, 
        note: n 
      };
  
      // === 複数plan対応 ===
      if (Array.isArray(n.plans) && n.plans.length > 0) {
        n.plans.forEach((p, i) => {
          const whoName = p.who?.trim() || p.executor?.trim() || n.author || "匿名";
          const planLines = [];
      
          // ✅ executor も拾う
          const whoText = p.executor?.trim() || "";
          if (whoText) planLines.push(`誰：${whoText}`);
          if (p.what) planLines.push(`何：${p.what}`);
          if (p.how) planLines.push(`どうやって：${p.how}`);
          if (p.good) planLines.push(`良い予想：${p.good}`);
          if (p.bad) planLines.push(`良くない予想：${p.bad}`);
      
          items.push({
            ...base,
            key: `${n.id}:PLAN${i}`,
            title: `計画と実行 (${i + 1})`,
            author: whoName,
            lines: planLines,
          });
        });
      }
      
      // === planなしでも旧形式を維持 ===
      else {
        const plan = [];
        if (n.idea) plan.push(`アイデア：${n.idea}`);
        if (n.who) plan.push(`誰：${n.who}`);
        if (n.what) plan.push(`何：${n.what}`);
        if (n.how) plan.push(`どうやって：${n.how}`);
        if (n.good) plan.push(`良い予想：${n.good}`);
        if (n.bad) plan.push(`良くない予想：${n.bad}`);
  
        if (plan.length) {
          items.push({
            ...base,
            key: `${n.id}:PLAN`,
            title: "対策（計画と実行）",
            lines: plan,
          });
        }
      }
    });
  
    return items;
  }
//D! BoardUI関数(リセット)
  function resetMatrixCenter() {
    const items = flattenToBoardItems(visibleNotes);
    const center = {};
    items.forEach(it => {
      center[it.key] = { xP: 50, yP: 50 };
    });
    setMatrixPos(center);
  }
//D! Board_Ai配置
async function aiArrange() {
  if (arranging) return;
  setArranging(true);

  try {
    // === flatten済みノートで送信 ===
    const items = flattenToBoardItems(visibleNotes);
    const payload = {
      topic,
      spec: matrixSpec,
      notes: items.map(it => ({
        id: it.key,  // ← ★ここを it.key に（:PLAN含む）
        title: it.title || "無題",
        lines: it.lines || [],
        author: it.author || "unknown",
      })),
    };

    console.log("📤 sending payload:", payload);

    const r = await arrangeBoard(payload);
    console.log("📥 arrangeBoard response:", r);

    const positions = r?.results?.[0]?.positions || [];
    const mm = {};

    if (!positions.length) {
      console.warn("⚠️ AI配置: positionsが空です（fallbackへ）");
      items.forEach(it => {
        mm[it.key] = computeMatrixFallback();
      });
      setMatrixPos(mm);
      return;
    }

    positions.forEach((p, i) => {
      const it = items[i];
      if (it) {
        mm[it.key] = {
          xP: Math.min(95, Math.max(5, p.xP ?? 50)),
          yP: Math.min(95, Math.max(5, p.yP ?? 50)),
        };
      }
    });

    console.log("🧭 merged positions:", mm);
    setMatrixPos(mm);

  } catch (err) {
    console.error("❌ aiArrange failed:", err);
    alert("AI配置中にエラーが発生しました");
  } finally {
    setArranging(false);
  }
}
//D! Board_Ai配置失敗対策
function computeMatrixFallback() {
  return { xP: 45 + Math.random() * 10, yP: 45 + Math.random() * 10 };
}
//D! Board初回中央表示
  useEffect(() => {
    if (view === "BOARD") {
      resetMatrixCenter();
    }
  }, [view]);
  


//A! 議論終結
const [finalOpen,setFinalOpen] = useState(false); 
const cvsRef = useRef(null);
const sanitizeAdvice = t => String(t||"")
  .replace(/粒度/g,"具体性")
  .replace(/実行と観測のサイクルを短く回しましょう。?/g,"『だれが・何を・どうやって』まで書けると伝わる。")
  .replace(/PDCA|サイクル/g,"手順");
function wrapText(ctx,text,x,y,maxWidth,lineHeight){ 
  const words=text.split(/(\s+|。|、|，|,)/); let line=""; 
  for(let n=0;n<words.length;n++){ 
    const test=line+words[n], metrics=ctx.measureText(test); 
    if(metrics.width>maxWidth && n>0){ ctx.fillText(line,x,y); line=words[n]; y+=lineHeight; } 
    else line=test; 
  } 
  ctx.fillText(line,x,y); return y; 
}
//A! 議論終結(バッジ評価)
async function runExplainLineEval(){
  setLoadingEval(true);
  const cvs=cvsRef.current, ctx=cvs.getContext("2d"), W=cvs.width=920, H=cvs.height=520;
  ctx.fillStyle="#fff"; ctx.fillRect(0,0,W,H);
  const grd=ctx.createLinearGradient(0,0,W,H);
  grd.addColorStop(0,"#eef2ff");
  grd.addColorStop(1,"#f0fdf4");
  ctx.fillStyle=grd;
  ctx.fillRect(0,0,W,H);
  ctx.fillStyle="#111";
  ctx.font="bold 24px system-ui";
  ctx.fillText("思考アスレチック® - 気づいて、協働し、調べる -",24,40);
  ctx.font="16px system-ui";
  ctx.fillText( `チーム:${teamName} / ユーザー:${currentUser} / 日付:${new Date().toLocaleDateString("ja-JP")}`,24,68);


  const T=visibleNotes, out=judgeOOTB(T, ootbMode);

//A! 議論終結(バッジ)関数
  function drawBadge(cx, cy, mark, color) {
    ctx.save();
    ctx.translate(cx, cy);
    // 円形背景
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, 0, 95, 0, Math.PI * 2);
    ctx.fill();
    // 星マーク
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    const spikes = 5, outerRadius = 60, innerRadius = 25, yOffset = -5;
    for (let i = 0; i < spikes * 2; i++) {
      const r = (Math.PI / spikes) * i - Math.PI / 2;
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const x = Math.cos(r) * radius;
      const y = Math.sin(r) * radius + yOffset;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    // ★ バッジの下に文字
    ctx.font = "bold 20px system-ui";
    ctx.fillStyle = "#333";
    ctx.textAlign = "center";
    ctx.fillText("評価バッジ", 0, 120);
    ctx.restore();
  }
  // === デフォルト ===
  let badge = { mark:"—", color:"#9ca3af" }, strengths=[], improvement="", advice="";
  try { 
    const text=T.filter(n=>n.author!=="noise").slice(0,12)
      .map(n=>`P:${n.premise}\nA:${n.a}\nFlags:${(n.allFlags||[]).join("/")}`).join("\n---\n"); 
    
    const r=await explainLineEvalApi(topic,text); 
    console.log("API result:",r);

    strengths = r?.strengths || [];
    improvement = r?.improvement || "";
    advice = sanitizeAdvice(r?.summary || r?.text || r?.advice || "");
    // ★ AI評価でバッジ決定
    if(r?.rank){ 
      const colors={ "秀":"#10b981","優":"#3b82f6","良":"#f59e0b","可":"#9ca3af","不可":"#ef4444","—":"#9ca3af" };
      badge={ mark:r.rank, color:colors[r.rank]||"#9ca3af" };
    }
  } catch(err) { 
    console.error("explainLineEval error:",err); 
  }
  // === バッジ描画 ===
  drawBadge(W/2, H/2 - 80, badge.mark, badge.color);
  if(out){
    const img=new Image();
    img.onload=()=>ctx.drawImage(img,450,110,420,300);
    img.src="/hero-ootb.jpg";
  }
  // === 総評描画 ===
  ctx.fillStyle="#111";
  ctx.font="bold 18px system-ui";
  ctx.fillText("AI総評",24,300);
  ctx.font="14px system-ui";
  let y=330, maxWidth=860, lineHeight=20;

  if(badge.mark){
    y = wrapText(ctx,`【評価ランク】 ${badge.mark}`,24,y,maxWidth,lineHeight)+lineHeight;
  }
  if(strengths.length){
    y = wrapText(ctx,"【強み】",24,y,maxWidth,lineHeight)+lineHeight;
    strengths.forEach(s=>{ y=wrapText(ctx,"・"+s,24,y,maxWidth,lineHeight)+lineHeight; });
  }
  if(improvement){
    y = wrapText(ctx,"【改善点】",24,y,maxWidth,lineHeight)+lineHeight;
    y = wrapText(ctx,"・"+improvement,24,y,maxWidth,lineHeight)+lineHeight;
  }
  // === スピナーOFF ===
  setLoadingEval(false);
}
const colors = {
  "秀": "#10b981",   // 緑
  "優": "#3b82f6",   // 青
  "良": "#f59e0b",   // オレンジ
  "可": "#9ca3af",   // グレー
  "不可": "#ef4444", // 赤
  "—": "#9ca3af"
};
//A! エビデンスクエスト定義
const [loading, setLoading] = useState(false);
const [evidenceHints, setEvidenceHints] = useState([]);
const [evidenceOpen, setEvidenceOpen] = useState(false);


 //A! 送信ボタン
  const [sending,setSending] = useState(false);
  async function send() {
    const any = [premise, trouble, otherPrem, cause, idea, who, what, how, good, bad, ...plans.flatMap(p => Object.values(p))]
      .some(v => String(v || "").trim());
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
        const r = await checkLogBias(topic, fields);
        for (const [key, obj] of Object.entries(r.results || {})) {
          flagsDetail[key] = obj.flags || [];
          flagsDetail[`${key}_advice`] = obj.advice || "";
          allFlags = allFlags.concat(obj.flags || []);
        }
      } catch (e) {
        console.error("checkLogBias error:", e);
      }
  
      //B!D ノート生成→すべてに統一？
      const note = {
        id: crypto.randomUUID(),
        team: teamName,
        q: topic || "（無題）",
        stakeholder: selectedTarget || "（未選択）",
        scenario: scenarioFixed ? scenario : "(未決定)",
        premise,
        trouble,
        otherPrem,
        cause,
        idea,
        who,
        what,
        how,
        good,
        bad,
        plans, 
        createdAt: new Date().toISOString(),
        author: currentUser,
        flagsDetail,
        allFlags,
        a: idea || cause || premise || "(入力あり)",
      };
      setNotes((n) => [note, ...n]);
      setView("LOG");
    } catch (err) {
      console.error("send error:", err);
      alert("送信中にエラーが発生しました");
    } finally {
      setSending(false);
    }
  }

//ユーザー名定義
const currentUser = userList?.[0] || "—";

//A! 右上個別LOGPDF関数
function exportLogPdf(payload = {}) {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  pdf.setFont("NotoSansJP-Regular", "normal");

  const yRef = { y: 15 };
  const { meta = {}, state = {} } = payload;

  // タイトル
  writeLine(pdf, "思考アスレチック 実行ログ", yRef, 16);
  yRef.y += 3;

  // 基本情報
  writeLine(pdf, "【基本情報】", yRef, 12);
  writeLine(pdf, `チーム：${meta.team ?? "—"}`, yRef, 11, VALUE_X);

  writeLine(pdf, `ユーザー：${meta.user ?? "—"}`, yRef, 11, VALUE_X);
  writeLine(pdf, `日時：${meta.date ?? "—"}`, yRef, 11, VALUE_X);
  yRef.y += 3;

  // 議題
  writeLine(pdf, "【議題】", yRef, 12);
  writeLine(pdf, state.topic ?? "—", yRef, 11, VALUE_X);
  yRef.y += 3;

  // 設定
  writeLine(pdf, "【設定】", yRef, 12);
  writeLine(pdf, `ターゲット：${state.target ?? "—"}`, yRef, 11, VALUE_X);
  writeLine(pdf, `シナリオ：${state.scenario ?? "—"}`, yRef, 11, VALUE_X);
  yRef.y += 3;

  // 思考整理
  writeLine(pdf, "【思考整理】", yRef, 12);
  writeLine(pdf, `前提：${state.premise ?? "—"}`, yRef, 11, VALUE_X);
  writeLine(pdf, `困りごと：${state.trouble ?? "—"}`, yRef, 11, VALUE_X);
  writeLine(pdf, `他の前提：${state.otherPrem ?? "—"}`, yRef, 11, VALUE_X);
  writeLine(pdf, `原因：${state.cause ?? "—"}`, yRef, 11, VALUE_X);
  writeLine(pdf, `対策：${state.idea ?? "—"}`, yRef, 11, VALUE_X);

  // === 計画は次ページ ===
  pdf.addPage();
  yRef.y = 15;

  writeLine(pdf, "【計画】", yRef, 14);
  yRef.y += 4;

  const PLAN_BODY_X = MARGIN_X + 10;
  const COL_EXEC = PLAN_BODY_X;
  const COL_WHAT = PLAN_BODY_X + 32;
  const COL_HOW  = PLAN_BODY_X + 80;

  (state.plans || []).forEach((p = {}, i) => {
    pdf.setFontSize(12);
    pdf.text(`(${i + 1}) ${p.who || "—"}`, PLAN_BODY_X, yRef.y);
    yRef.y += 6;

    pdf.setFontSize(11);
    pdf.text(`実行者：${p.executor || "—"}`, COL_EXEC, yRef.y);
    pdf.text(`目的：${p.what || "—"}`, COL_WHAT, yRef.y);
    pdf.text(`方法：${p.how || "—"}`, COL_HOW, yRef.y);
    yRef.y += 6;

    if (p.good) {
      pdf.text(`良い予想：${p.good}`, PLAN_BODY_X, yRef.y);
      yRef.y += 5;
    }
    if (p.bad) {
      pdf.text(`悪い予想：${p.bad}`, PLAN_BODY_X, yRef.y);
      yRef.y += 5;
    }

    yRef.y += 4;
  });

  // === 🔽 ファイル名生成（安全対策込み） ===
  const safe = (s) => String(s || "").replace(/[\\/:*?"<>|]/g, "_").trim();
  const team = safe(meta.team) || "team";
  const user = safe(meta.user) || "user";
  const date = safe(meta.date)?.replace(/[^\d]/g, "") || "";

  const filename = date
    ? `${team}_${user}_${date}.pdf`
    : `${team}_${user}.pdf`;

  pdf.save(filename);
}

//A! 全員分LOGPDF関数
function downloadAllLogsAsCSV(userLogs, teamName) {
  if (!userLogs || userLogs.length === 0) {
    alert("ログがありません");
    return;
  }

  // ユーザー名一覧
  const users = userLogs.map(l => l.author || "未記入");

  // 最大計画数を取得
  const maxPlans = Math.max(
    ...userLogs.map(l => Array.isArray(l.plans) ? l.plans.length : 0),
    0
  );

  const rows = [];

  // === ヘッダー行 ===
  rows.push(["ユーザー名", ...users]);

  // === 基本項目 ===
  const baseFields = [
    ["議題", "topic"],
    ["ターゲット", "target"],
    ["シナリオ", "scenario"],
    ["前提", "premise"],
    ["困りごと", "trouble"],
    ["他の前提", "otherPrem"],
    ["原因", "cause"],
    ["対策", "idea"],
  ];

  baseFields.forEach(([label, key]) => {
    rows.push([
      label,
      ...userLogs.map(l => l[key] || "—")
    ]);
  });

  // === 計画（横展開）===
  for (let i = 0; i < maxPlans; i++) {
    rows.push([
      `計画${i + 1}_考案者`,
      ...userLogs.map(l => l.plans?.[i]?.who || "—")
    ]);
    rows.push([
      `計画${i + 1}_実行者`,
      ...userLogs.map(l => l.plans?.[i]?.executor || "—")
    ]);
    rows.push([
      `計画${i + 1}_何を`,
      ...userLogs.map(l => l.plans?.[i]?.what || "—")
    ]);
    rows.push([
      `計画${i + 1}_どうやって`,
      ...userLogs.map(l => l.plans?.[i]?.how || "—")
    ]);
    rows.push([
      `計画${i + 1}_良い予想`,
      ...userLogs.map(l => l.plans?.[i]?.good || "—")
    ]);
    rows.push([
      `計画${i + 1}_悪い予想`,
      ...userLogs.map(l => l.plans?.[i]?.bad || "—")
    ]);
  }

  // === CSV生成（BOM付き）===
  const csvBody = rows
    .map(r =>
      r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")
    )
    .join("\n");

  const bom = "\uFEFF";
  const blob = new Blob([bom + csvBody], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `logs_${teamName}_matrix.csv`;
  a.click();
  URL.revokeObjectURL(url);
}


//A! 全員分LOGCSV関数
function downloadAllLogsAsPDF(userLogs, teamName) {
  if (!userLogs || userLogs.length === 0) {
    alert("ログがありません");
    return;
  }

  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  pdf.setFont("NotoSansJP-Regular", "normal");

  let y = 15;

  pdf.setFontSize(16);
  pdf.text(`個人ログ一覧（${teamName}）`, 15, y);
  y += 10;

  userLogs.forEach((log, i) => {
    if (y > 260) {
      pdf.addPage();
      y = 15;
    }

    pdf.setFontSize(13);
    pdf.text(`■ ${log.author || "未記入"}`, 15, y);
    y += 6;

    pdf.setFontSize(11);

    const lines = [
      `議題：${log.topic || "—"}`,
      `ターゲット：${log.target || "—"}`,
      `シナリオ：${log.scenario || "—"}`,
      `前提：${log.premise || "—"}`,
      `困りごと：${log.trouble || "—"}`,
      `原因：${log.cause || "—"}`,
      `対策：${log.idea || "—"}`,
    ];

    lines.forEach((line) => {
      if (y > 280) {
        pdf.addPage();
        y = 15;
      }
      pdf.text(line, 20, y);
      y += 5;
    });

    y += 6;
  });

  pdf.save(`logs_${teamName}.pdf`);
}






//A! LOGを見る更新ボタン関数
async function refreshLogs() {
  if (isRefreshing) return;

  setIsRefreshing(true);
  setRefreshDone(false);

  try {
    const res = await getTeamUserStates(teamName);
    setUserLogs(res.users || []);
    
    // ✔ 表示
    setRefreshDone(true);

    // ✔ を1秒だけ表示
    setTimeout(() => {
      setRefreshDone(false);
    }, 1000);

  } finally {
    setIsRefreshing(false);
  }
}





//A! 右上ログ出力形式定義
const MARGIN_X = 8;
const VALUE_X = 20; // ← 中身用（右寄せ）
const PAGE_BOTTOM = 285;

const writeLine = (pdf, text, yRef, size = 11, x = MARGIN_X) => {
  if (yRef.y > PAGE_BOTTOM) {
    pdf.addPage();
    yRef.y = 15;
  }
  pdf.setFontSize(size);
  pdf.setFont("NotoSansJP-Regular", "normal");
  pdf.text([String(text ?? "")], x, yRef.y);
  yRef.y += size + 1;
};
//A! 右上ログ定義
const logPayload = {
  meta: {
    team: teamName,

    user: currentUser, 
    date: new Date().toLocaleString("ja-JP"),
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
    plans,
  },
};

//A! LOGを見る定義
const [logOpen, setLogOpen] = useState(false);
const [userLogs, setUserLogs] = useState([]);
const [selectedUserId, setSelectedUserId] = useState(null);
const [selectedLog, setSelectedLog] = useState(null);
const [logSearch, setLogSearch] = useState("");
const [dlSelectOpen, setDlSelectOpen] = useState(false);


//A! LOGを見る更新定義
const [isRefreshing, setIsRefreshing] = useState(false);
const [refreshDone, setRefreshDone] = useState(false);




//A! 参加設定定義
const [currentUserId, setCurrentUserId] = useState(null);
const [currentUserName, setCurrentUserName] = useState(null);


//A! 参加設定エフェクト
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const team = params.get("team");
  const userId = params.get("user"); // ★ team を含まない

  if (!team || !userId) return;

  setTeamName(team);
  setCurrentUserId(userId);
  setCurrentUserName(userId);

  localStorage.setItem("teamName", team);
  localStorage.setItem("currentUserId", userId);
  localStorage.setItem("currentUserName", userId);


  console.log("👤 個人ページ初期化:", { team, userId });

  (async () => {
    const res = await getTeamUserStates(team);
    const my = res.users.find((u) => u.userId === userId);
    if (!my) return;

    setTopic(my.topic || "");
    setSelectedTarget(my.target || "");
    setScenario(my.scenario || "");
    setPremise(my.premise || "");
    setTrouble(my.trouble || "");
    setOtherPrem(my.otherPrem || "");
    setCause(my.cause || "");
    setIdea(my.idea || "");
    setPlans(Array.isArray(my.plans) ? my.plans : []);
  })();
}, []);



//A! LOGを見る2秒後保存エフェクト
useEffect(() => {
  const interval = setInterval(() => {
    // 🔒 必須情報が揃うまで保存しない
    if (!teamName || !currentUserId || !currentUserName) return;

    const snapshot = JSON.stringify({
      topic,
      selectedTarget,
      scenario,
      premise,
      trouble,
      otherPrem,
      cause,
      idea,
      plans,
    });

    if (snapshot === lastSavedRef.current) return;

    console.log("⏱ autosave");

    saveUserState({
      team: teamName,
      userId: currentUserId,
      author: currentUserName,
      topic,
      target: selectedTarget,
      scenario,
      premise,
      trouble,
      otherPrem,
      cause,
      idea,
      plans,
    });

    lastSavedRef.current = snapshot;
  }, 2000);

  return () => clearInterval(interval);
}, [
  teamName,
  currentUserId,
  currentUserName,
  topic,
  selectedTarget,
  scenario,
  premise,
  trouble,
  otherPrem,
  cause,
  idea,
  plans,
]);


  /*UI関連*/
  return (
    <>
{/* INTRO + HOME 表紙 */}
  {view === "INTRO" && (
  <div className={`introWrap ${stage}`}>
    {/* 🧠 シャワーはイントロ完了後に出す */}
    {stage === "done" && <BrainShower />}

    <div className="introRow">
    <img src={kobusiImg} alt="拳" className="punchAnim" />
      <h1 className="introTitle">知性の壁をぶち破れ！</h1>
    </div>

    <div className="homeContent">
      <h1 className="mainTitle">
        思考アスレチック<span className="tm">®</span>
      </h1>
      <h2 className="subTitle seq">
        <span className="word delay1">気づいて、</span>
        <span className="word delay2">協働し、</span>
        <span className="word delay3">調べる</span>
      </h2>

      <div className="buttonGroup">
        <button className="btnPrimary" onClick={() => setView("FRONT")}>
          スタート
        </button>
        <button
          className="btnSecondary"
          onClick={() => {
            setView("FRONT");
            setGateOpen(true);
          }}
        >
          設定から始める
        </button>
      </div>
    </div>
  </div>
)}
{/* Header */}
{view !== "HOME" && view !== "INTRO" && (
  <>
    {/* トグルボタン（≡ / ≪） */}
    <button className="headerToggleBtn"
      onClick={() => setHeaderOpen(o => !o)}
      title={headerOpen ? "閉じる" : "開く"}
      style={{
        position: "fixed",
        top: "16px",
        left: "16px",
        zIndex: 9999,
        width: "56px",
        height: "56px",
        borderRadius: "12px",
        background: "#333",
        border: "none",
        color: "#fff",
        fontSize: 28,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        transition: "all 0.25s ease",
        userSelect: "none",
      }}
      onMouseOver={e => {
        e.currentTarget.style.background = "#444";
        e.currentTarget.style.transform = "scale(1.08)";
      }}
      onMouseOut={e => {
        e.currentTarget.style.background = "#333";
        e.currentTarget.style.transform = "scale(1)";
      }}
      onMouseDown={e => e.preventDefault()}
    >
      {headerOpen ? "≪" : "≡"}
    </button>
    
{/* 🔒 右上ボタンコンテナ */}
{SHOW_DEBUG_BUTTONS && (
  <div
    style={{
      position: "fixed",
      top: "16px",
      right: "16px",
      zIndex: 9999,
      display: "flex",
      alignItems: "center",
      gap: "12px",
    }}
  >
    {/* 📄 ログPDF */}
<button
  onClick={() => exportLogPdf(logPayload)}
  style={{
    padding: "10px 18px",
    background: "#333",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    fontSize: "15px",
    cursor: "pointer",
  }}
>
  🧾 ログPDF
</button>


    {/* 🪙 サブスク */}
<SubscribeButton user={currentUser} />


    {/* 🔑 ログイン */}
    <button
      onClick={() => {}}
      style={{
        padding: "10px 18px",
        background: "#333",
        color: "#fff",
        border: "none",
        borderRadius: "10px",
        fontSize: "15px",
        cursor: "pointer",
      }}
    >
      🔑 ログイン
    </button>
  </div>
)}

{/* ▼ ユーザーメニュー（ログイン中のみ） */}
{user && showUserMenu && (
  <div
    style={{
      position: "fixed",
      top: "70px",
      right: "16px",
      padding: "12px",
      background: "#222",
      color: "#fff",
      borderRadius: "12px",
      boxShadow: "0 5px 15px rgba(0,0,0,0.3)",
      zIndex: 9999,
      minWidth: "180px",
      animation: "fadeIn 0.15s ease",
    }}
  >
    {/* プロフィール表示 */}
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        marginBottom: "12px",
      }}
    >
      <img
        src={user.picture}
        alt="icon"
        style={{
          width: 32,
          height: 32,
          borderRadius: "50%",
          objectFit: "cover",
        }}
      />
      <div style={{ fontSize: "14px", fontWeight: 600 }}>
        {user.name}
      </div>
    </div>

    {/* 閉じるボタン */}
    <button
      style={{
        width: "100%",
        padding: "8px 0",
        background: "#555",
        color: "#fff",
        border: "none",
        borderRadius: "8px",
        cursor: "pointer",
        fontSize: "14px",
        marginBottom: "10px",
      }}
      onClick={() => setShowUserMenu(false)}
    >
      閉じる
    </button>

    {/* ログアウトボタン */}
    <button
      style={{
        width: "100%",
        padding: "8px 0",
        background: "#c0392b",
        color: "#fff",
        border: "none",
        borderRadius: "8px",
        cursor: "pointer",
        fontSize: "14px",
      }}
      onClick={() => {
        localStorage.removeItem("loginToken");
        setUser(null);
        setShowUserMenu(false);
      }}
    >
      ログアウト
    </button>
  </div>
)}
    {/* ヘッダー（ページ内） */}
    <div
      className="topicHead"
      style={{
        background: "#fff",
        borderBottom: "1px solid #e5e7eb",
        boxShadow: headerOpen ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
        transition: "max-height 0.4s ease, opacity 0.4s ease",
        overflow: "hidden",
        maxHeight: headerOpen ? "220px" : "0",
        opacity: headerOpen ? 1 : 0,
      }}
    >
    </div>
  </>
)}
{showLogin && (
  <LoginModal onClose={() => setShowLogin(false)} />
)}
{view !== "HOME" && view !== "INTRO" && (
  <>
    {/* ヘッダー（ページ内） */}
    <div
      className="topicHead"
      style={{
        background: "#fff",
        borderBottom: "1px solid #e5e7eb",
        boxShadow: headerOpen ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
        transition: "max-height 0.4s ease, opacity 0.4s ease",
        overflow: "hidden",
        maxHeight: headerOpen ? "220px" : "0",
        opacity: headerOpen ? 1 : 0,
      }}
    >
      <div className="container" style={{ padding: headerOpen ? "12px 16px" : "0 16px" }}>
        <div
          className="headRow"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <button className="btn" onClick={() => { setView("INTRO"); setStage("intro"); setTimeout(() => setStage("moveUp"), 1000);setTimeout(() => setStage("done"), 2300) }}>表紙へ</button>
          <button className="btn" onClick={() => { setFinalOpen(true); setTimeout(runExplainLineEval, 10); }}>議論終結</button>

<button
  className="btn"
  onClick={async () => {
    setLogOpen(true);
    const res = await getTeamUserStates(teamName);
    setUserLogs(res.users || []);
    setSelectedUserId(null);
  }}
>
  LOGを見る
</button>

{logOpen && (
  <div
    className="gate"
    onClick={(e) => {
      if (e.target.classList.contains("gate")) {
        setLogOpen(false);
        setSelectedLog(null);
        setLogSearch("");
      }
    }}
  >
    <div
      className="panel"
      style={{
        maxWidth: 800,
        maxHeight: "80vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* ===== ヘッダー ===== */}
      <div style={{ marginBottom: 8 }}>
        <h3 style={{ margin: 0 }}>個人ログ（{teamName}）</h3>
      </div>

      {/* ===== 一覧状態 ===== */}
      {!selectedLog && (
        <>
          {/* 🔍 検索 + 更新 + DL */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 10,
            }}
          >
            <input
              type="text"
              placeholder="名前で検索"
              value={logSearch}
              onChange={(e) => setLogSearch(e.target.value)}
              style={{
                flex: 1,
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid #ccc",
                fontSize: 14,
              }}
            />

            {/* 🔄 最新取得 */}
            <button
              className="btn"
              title="最新のログを取得"
              style={{
                padding: "8px 10px",
                borderRadius: 8,
                background: "#f3f4f6",
                fontSize: 16,
                opacity: isRefreshing ? 0.6 : 1,
                pointerEvents: isRefreshing ? "none" : "auto",
              }}
              onClick={refreshLogs}
            >
              <span
                style={{
                  display: "inline-block",
                  animation:
                    isRefreshing && !refreshDone
                      ? "spin 1s linear infinite"
                      : "none",
                  color: refreshDone ? "#16a34a" : "inherit",
                }}
              >
                {refreshDone ? "✔" : "⟳"}
              </span>
            </button>

            {/* 📥 全員分DL */}
            <button
              className="btn"
              style={{
                background: "#2563eb",
                color: "#fff",
                whiteSpace: "nowrap",
                padding: "8px 12px",
              }}
              onClick={() => setDlSelectOpen(true)}
            >
              全員分DL
            </button>
          </div>

          {/* 👤 ユーザー一覧 */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {userList
              .filter((name) => name.includes(logSearch))
              .map((name) => (
                <button
                  key={name}
                  className="btn"
                  style={{
                    background: "#e5e7eb",
                    color: "#111",
                    textAlign: "center",
                  }}
                  onClick={() => {
                    const hit =
                      userLogs.find((l) => l.author === name) || null;
                    setSelectedLog(
                      hit ? hit : { author: name, __empty: true }
                    );
                  }}
                >
                  {name}
                </button>
              ))}

            {userList.filter((name) => name.includes(logSearch)).length === 0 && (
              <div className="hint">該当する名前がありません</div>
            )}
          </div>
        </>
      )}

      {/* ===== 詳細表示 ===== */}
      {selectedLog && (
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            fontSize: 13,
            lineHeight: 1.7,
            paddingRight: 6,
          }}
        >
          {/* 👤 誰のログか */}
          <div
            style={{
              fontWeight: "bold",
              fontSize: 14,
              marginBottom: 6,
            }}
          >
            {selectedLog.author} のログ
          </div>

          {selectedLog.__empty ? (
            <div className="hint">
              このユーザーのログはまだ作成されていません
            </div>
          ) : (
            <>
              <div className="hint" style={{ marginBottom: 6 }}>
                最終更新：
                {selectedLog.updatedAt
                  ? new Date(selectedLog.updatedAt).toLocaleString("ja-JP")
                  : "—"}
              </div>

              <hr />

              <div><b>議題：</b>{selectedLog.topic || "—"}</div>
              <div><b>ターゲット：</b>{selectedLog.target || "—"}</div>
              <div><b>シナリオ：</b>{selectedLog.scenario || "—"}</div>

              <hr />

              <div><b>前提</b><br />{selectedLog.premise || "—"}</div>
              <div><b>困りごと</b><br />{selectedLog.trouble || "—"}</div>
              <div><b>他の前提</b><br />{selectedLog.otherPrem || "—"}</div>
              <div><b>原因</b><br />{selectedLog.cause || "—"}</div>
              <div><b>対策</b><br />{selectedLog.idea || "—"}</div>

              <hr />

              <b>計画</b>
              {Array.isArray(selectedLog.plans) &&
              selectedLog.plans.length > 0 ? (
                selectedLog.plans.map((p, i) => (
                  <div
                    key={i}
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: 6,
                      padding: 8,
                      marginTop: 8,
                      background: "#fafafa",
                    }}
                  >
                    <div><b>考案者：</b>{p.who || "—"}</div>
                    <div><b>実行者：</b>{p.executor || "—"}</div>
                    <div><b>何を：</b>{p.what || "—"}</div>
                    <div><b>どうやって：</b>{p.how || "—"}</div>
                    <div><b>良い予想：</b>{p.good || "—"}</div>
                    <div><b>悪い予想：</b>{p.bad || "—"}</div>
                  </div>
                ))
              ) : (
                <div className="hint">計画はありません</div>
              )}
            </>
          )}
        </div>
      )}

      {/* ===== フッター ===== */}
      <div style={{ marginTop: 12, textAlign: "right" }}>
        <button
          className="btn"
          onClick={() => {
            if (selectedLog) {
              setSelectedLog(null);
            } else {
              setLogOpen(false);
              setLogSearch("");
            }
          }}
        >
          {selectedLog ? "戻る" : "閉じる"}
        </button>
      </div>
    </div>
  </div>
)}
{dlSelectOpen && (
  <div
    className="gate"
    onClick={(e) => {
      if (e.target.classList.contains("gate")) {
        setDlSelectOpen(false);
      }
    }}
  >
    <div
      className="panel"
      style={{
        maxWidth: 360,
        padding: 20,
        textAlign: "center",
      }}
    >
      <h3 style={{ marginBottom: 16 }}>
        どちらの形式で出力しますか？
      </h3>

      <div
        style={{
          display: "flex",
          gap: 12,
          justifyContent: "center",
          marginBottom: 16,
        }}
      >
        <button
          className="btn"
          style={{ background: "#16a34a", color: "#fff" }}
          onClick={() => {
            downloadAllLogsAsCSV(userLogs, teamName);
            setDlSelectOpen(false);
          }}
        >
          CSVでDL
        </button>

        <button
          className="btn"
          style={{ background: "#ca1919ff", color: "#fff" }}
          onClick={() => {
            downloadAllLogsAsPDF(userLogs, teamName);
            setDlSelectOpen(false);
          }}
        >
          PDFでDL
        </button>
      </div>

      {/* 🔽 閉じるボタン */}
      <div style={{ textAlign: "right" }}>
        <button
          className="btn"
          onClick={() => setDlSelectOpen(false)}
        >
          閉じる
        </button>
      </div>
    </div>
  </div>
)}










{/* 設定変更ボタン */}
<button
  className="btn"
  onClick={() => {
    // 💡 userList 再読込
    try {
      const saved = JSON.parse(localStorage.getItem("userList"));
      if (Array.isArray(saved) && saved.length > 0) {
        setUserList(saved);

        // ✅ activeUser 未設定なら先頭を編集対象にする
        if (!activeUserId) {
          const firstName = saved[0];
          const uid = `U_${firstName}`; // ← 例（userId体系に合わせてOK）

          setActiveUserId(uid);
          setActiveUserName(firstName);

          localStorage.setItem("activeUserId", uid);
          localStorage.setItem("activeUserName", firstName);
        }
      }
    } catch {}

    setGateOpen(true);
  }}
>
  設定変更
</button>

          {/* 難易度 */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span className="hint">難易度</span>
            <select value={ootbMode} onChange={e => setOotbMode(e.target.value)}>
              <option value="easy">Easy</option>
              <option value="standard">Standard</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          {/* AI接続 */}
          <div className="hint" style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: 8 }}>
            AI: {aiOK == null ? "…" : aiOK ? "OK" : "NG"}
            <button className="btn" onClick={checkAI} style={{ padding: "4px 8px" }}>再検</button>
          </div>

          {/* ナビ */}
          <div className="navTabs" style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <button className={view === "FRONT" ? "on" : ""} onClick={() => setView("FRONT")}>Front</button>
            <button className={view === "LOG" ? "on" : ""} onClick={() => setView("LOG")}>Log</button>
            <button className={view === "BOARD" ? "on" : ""} onClick={() => setView("BOARD")}>Board</button>
          </div>
        </div>
      </div>
    </div>
  </>
)}



{/* 参加設定モーダル */}
{gateOpen && (
  gateLoading ? (

    // 🌀 ローディング中
    <div className="gate">
      <div className="panel">
        <p>読み込み中です…</p>
      </div>
    </div>

  ) : (

    <div
      className="gate"
      onClick={(e) => {
        if (e.target.classList.contains("gate")) setGateOpen(false);
      }}
    >
      <div
        className="panel"
        style={{
          maxHeight: "80vh",          // ★ 画面内に収める
          display: "flex",
          flexDirection: "column",
        }}
      >
        <h3>参加設定</h3>

        {/* ===== ここからスクロール領域 ===== */}
        <div
          style={{
            flex: 1,                 // ★ 残り高さを使う
            overflowY: "auto",       // ★ 中だけスクロール
            paddingRight: 6,
          }}
        >


          {/* === チーム名 === */}
          <div className="row">
            <span className="hint" style={{ width: 90 }}>チーム名</span>
            <input
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="例：T1 / 1組 / A班"
            />
          </div>

          {/* === ユーザー名一覧 === */}
          <div className="row" style={{ alignItems: "flex-start" }}>
            <span className="hint" style={{ width: 90 }}>ユーザー名</span>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                flex: 1,
              }}
            >
              {userList.map((u, i) => (
                <div
                  key={i}
                  style={{ display: "flex", gap: 6, alignItems: "center" }}
                >
                  <input
                    value={u}
                    onChange={(e) => {
                      const list = [...userList];
                      list[i] = e.target.value;
                      setUserList(list);
                    }}
                    placeholder={`名前${i + 1}`}
                    style={{ flex: 1 }}
                  />

                  {/* 👤 この人で入る */}
                  <button
                    className="btnDark"
                    onClick={() => {
                      if (!u.trim()) {
                        alert("名前を入力してください");
                        return;
                      }

                      const uid = u;
                      localStorage.setItem("currentUserName", u);
                      localStorage.setItem("currentUserId", uid);
                      localStorage.setItem("teamName", teamName);

                      const url =
                        `${window.location.origin}` +
                        `/?team=${encodeURIComponent(teamName)}` +
                        `&user=${encodeURIComponent(uid)}`;

                      window.open(url, "_blank");
                      setGateOpen(false);
                    }}
                  >
                    入る
                  </button>

                  {/* 追加 / 削除 */}
                  {i === 0 ? (
                    <button
                      className="btn"
                      onClick={() => setUserList([...userList, ""])}
                      style={{
                        width: 36,
                        height: 36,
                        fontSize: "1rem",
                        borderRadius: 8,
                        background: "#e5e7eb",
                        color: "#2563eb",
                      }}
                    >
                      ＋
                    </button>
                  ) : (
                    <button
                      className="btn"
                      onClick={() => {
                        const list = userList.filter((_, idx) => idx !== i);
                        setUserList(list);
                      }}
                      style={{
                        width: 36,
                        height: 36,
                        fontSize: "1rem",
                        borderRadius: 8,
                        border: "1.5px solid #b91c1c",
                        background: "#fee2e2",
                        color: "#b91c1c",
                      }}
                    >
                      −
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* ===== スクロール領域ここまで ===== */}

        {/* === 名簿保存 === */}
        <div className="row" style={{ justifyContent: "flex-end" }}>
          <button
            className="btn"
            style={{ marginTop: 12 }}
            onClick={() => {
              const cleaned = userList.map((u) => u.trim());
              setUserList(cleaned);
              localStorage.setItem("userList", JSON.stringify(cleaned));
              localStorage.setItem("teamName", teamName);

              setGateOpen(false);
            }}
          >
            名簿を保存
          </button>
        </div>
      </div>
    </div>
  )
)}



{/* 終結モーダル */}
{finalOpen && (
  <div
    className="gate"
    onClick={(e) => {
      // 🔒 スピナー中は閉じる処理を無効化
      if (loadingEval) return;
      if (e.target.classList.contains("gate")) setFinalOpen(false);
    }}
  >
    <div className="panel" style={{ position: "relative" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 6,
        }}
      >
        <h3>議論終結（{teamName}）</h3>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="btn"
            style={{
              background: "#2563eb",
              color: "#fff",
              opacity: loadingEval ? 0.5 : 1,
              pointerEvents: loadingEval ? "none" : "auto", // ← スピナー中は無効化
            }}
            onClick={async () => {
              if (loadingEval) return;
              setEvidenceHints({});
              setEvidenceOpen(true);
              setLoading(true);

              try {
                const res = await evidenceQuest(topic, teamName, visibleNotes);

                console.log("📦 AI返却:", res);

                // 🎯 そのまま setEvidenceHints に格納
                setEvidenceHints(res);
              } catch (e) {
                console.error(e);
                setEvidenceHints({ error: "エラーが発生しました。" });
              }

              setLoading(false);
            }}
          >
            Evidence Quest
          </button>

          <button
            className="btn"
            onClick={() => {
              if (!loadingEval) setFinalOpen(false); // ← スピナー中は閉じれない
            }}
            style={{
              opacity: loadingEval ? 0.5 : 1,
              pointerEvents: loadingEval ? "none" : "auto",
            }}
          >
            閉じる
          </button>
        </div>
      </div>

      {/* === スピナー付き Canvas === */}
      <div style={{ position: "relative" }}>
        <canvas
          ref={cvsRef}
          width="920"
          height="520"
          style={{
            width: "100%",
            border: "1px solid #e2e8f0",
            borderRadius: 12,
            display: "block",
          }}
        />

        {/* 🔵 スピナー */}
        {loadingEval && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(255,255,255,0.7)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 10,
              cursor: "not-allowed", // ← 押せない感
            }}
          >
            <div
              style={{
                width: "100px",
                height: "100px",
                border: "10px solid #d1d5db",
                borderTop: "10px solid #3b82f6",
                borderRadius: "50%",
                animation: "spin 0.9s linear infinite",
              }}
            />
          </div>
        )}
      </div>
    </div>
  </div>
)}



{/* エビデンスクエストモーダル */}
{evidenceOpen && (
  <div
    className="gate"
    style={{ zIndex: 9999 }}
    onClick={(e) => {
      if (loading) return;
      if (e.target.classList.contains("gate")) setEvidenceOpen(false);
    }}
  >
    <div className="panel" style={{ maxWidth: 700, position: "relative" }}>
      {/* === ヘッダー === */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 6,
        }}
      >
        <h3 style={{ margin: 0 }}>Evidence Quest 🧩</h3>
        <button
          className="btn"
          onClick={() => {
            if (!loading) setEvidenceOpen(false);
          }}
          style={{
            opacity: loading ? 0.5 : 1,
            pointerEvents: loading ? "none" : "auto",
          }}
        >
          閉じる
        </button>
      </div>

      {/* === スピナー === */}
      {loading ? (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: "24px 0",
            pointerEvents: "none",
            userSelect: "none",
          }}
        >
          <div
            style={{
              width: "100px",
              height: "100px",
              border: "10px solid #d1d5db",
              borderTop: "10px solid #3b82f6",
              borderRadius: "50%",
              animation: "spin 0.9s linear infinite",
              cursor: "not-allowed",
            }}
          />
        </div>
      ) : evidenceHints && Object.keys(evidenceHints).length > 0 ? (
        (() => {
          // === result を除外 ===
          const displayEntries = Object.entries(evidenceHints).filter(
            ([key]) => key !== "result"
          );

          return (
            <div
              style={{
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                padding: 10,
                maxHeight: "70vh",
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <h4
                style={{
                  margin: "0 0 6px",
                  fontSize: "1rem",
                  fontWeight: 600,
                  color: "#1e293b",
                }}
              >
                💡調べ方のヒント
              </h4>

              {displayEntries.map(([key, value], i) => (
                <div
                  key={key}
                  style={{
                    background: "#fff",
                    border: "1px solid #e5e7eb",
                    borderRadius: 8,
                    padding: "10px 12px",
                    lineHeight: 1.6,
                    fontSize: ".92rem",
                    color: "#111827",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                  }}
                >
                  <b style={{ color: "#2563eb" }}>
                    {i + 1}. {key}
                  </b>
                  <div style={{ marginTop: 3 }}>{String(value)}</div>
                </div>
              ))}
            </div>
          );
        })()
      ) : (
        <p style={{ textAlign: "center", margin: "14px 0" }}>
          ヒントがありません。
        </p>
      )}
    </div>
  </div>
)}


{/* 盲点モーダル */}
{noiseOpen && (
  <div
    className="gate"
    onClick={(e) => {
      // 🔒 スピナー中は背景クリックを無効化
      if (noiseLoading) return;
      if (e.target.classList.contains("gate")) setNoiseOpen(false);
    }}
  >
    <div className="panel" style={{ maxWidth: 720, position: "relative" }}>
      {/* === ヘッダー === */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
          borderBottom: "2px solid #e5e7eb",
          paddingBottom: 8,
        }}
      >
        <h3 style={{ margin: 0 }}>AIからのヒント</h3>

        <div className="hint" style={{ fontSize: ".9rem" }}>
          生成元：
          {noiseMeta.source === "ai" ? (
            <b style={{ color: "#16a34a" }}>AI</b>
          ) : noiseMeta.source === "templateish" ? (
            <b style={{ color: "#d97706" }}>テンプレ寄り</b>
          ) : noiseMeta.source === "fallback" ? (
            <b style={{ color: "#ef4444" }}>フォールバック</b>
          ) : (
            "—"
          )}
        </div>

        <button
          className="btn"
          onClick={() => {
            if (!noiseLoading) setNoiseOpen(false); // 🔒 スピナー中は閉じれない
          }}
          style={{
            opacity: noiseLoading ? 0.5 : 1,
            pointerEvents: noiseLoading ? "none" : "auto",
          }}
        >
          閉じる
        </button>
      </div>

      {/* === スピナー === */}
      {noiseLoading ? (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: "24px 0",
            pointerEvents: "none", // ← 押せない
            userSelect: "none",
            cursor: "not-allowed",
          }}
        >
          <div
            style={{
              width: "100px",
              height: "100px",
              border: "10px solid #d1d5db",
              borderTop: "10px solid #3b82f6",
              borderRadius: "50%",
              animation: "spin 0.9s linear infinite",
            }}
          />
        </div>
      ) : (
        /* === データ表示 === */
        <ul
          style={{
            margin: 0,
            padding: 0,
            listStyle: "none",
            lineHeight: 1.8,
          }}
        >
          {noiseData.map((p, i) => (
            <li
              key={i}
              style={{
                background: "#f9fafb",
                padding: "12px 16px",
                borderRadius: 8,
                marginBottom: 12,
                border: "1px solid #e5e7eb",
              }}
            >
              <div
                style={{
                  fontWeight: "bold",
                  color: "#2563eb",
                  marginBottom: 6,
                }}
              >
                【{p.tag}】
              </div>

              {p.blindspot && (
                <div
                  style={{
                    marginLeft: 4,
                    marginTop: 4,
                    color: "#ef4444",
                    lineHeight: 1.6,
                  }}
                >
                  ⚠️ {p.blindspot}
                </div>
              )}

              {p.advice && (
                <div
                  style={{
                    marginLeft: 4,
                    marginTop: 6,
                    color: "#16a34a",
                    fontStyle: "italic",
                    lineHeight: 1.6,
                  }}
                >
                  💡 {p.advice}
                </div>
              )}
            </li>
          ))}

          {noiseData.length === 0 && (
            <li className="hint" style={{ textAlign: "center", padding: 16 }}>
              （提案はありません）
            </li>
          )}
        </ul>
      )}
    </div>
  </div>
)}

{/*FRONT*/}
{view === "FRONT" && (
  <main
    className="container"
    style={{
      paddingBottom: 40,
      position: "relative",
      overflow: "hidden",
    }}
  >
    {/* 🧠 背景アニメーション */}
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      <BrainShower />
    </div>

    <section
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 20,
        position: "relative",
        zIndex: 1,
      }}
    >
      {page === 1 && (
        <>
{/* Step 1: 議題 */}
<div className="card" id="card1">
  <h3 style={{ marginBottom: 8 }}>① 議題を決めよう</h3>

  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
    <div style={{ fontWeight: 700 }}>議題</div>

    <input
      value={topic}
      onChange={(e) => {
        setTopic(e.target.value);
      }}
      placeholder="話し合いたいテーマを書こう"
      style={{
        flex: "1",
        padding: "6px 8px",
        borderRadius: "6px",
        border: "1px solid #d1d5db",
        background: "#fff",
      }}
    />

    {/* 🎤 音声入力ボタン（そのままでOK） */}
    <button
      onClick={startListening}
      style={{
        height: "32px",
        width: "42px",
        borderRadius: "8px",
        background: listening ? "#f87171" : "#e5e7eb",
        color: listening ? "#fff" : "#111",
        fontSize: "1.1rem",
        fontWeight: 600,
        transition: "all 0.25s ease",
      }}
      title="音声で入力"
    >
      {listening ? "🎙️" : "🎤"}
    </button>

    {/* ✅ 明示保存 */}
    <button
      className="btn"
      style={{ height: "32px" }}
      onClick={async () => {
        try {
          let userId = localStorage.getItem("userId");
          if (!userId) {
            userId = "U" + crypto.randomUUID().slice(0, 8);
            localStorage.setItem("userId", userId);
          }
await saveUserState({
  team: teamName,

  userId: currentUserId,        // ← 保存キー用（必須）
  author: currentUserName,      // ← 表示名

  topic,
  target: selectedTarget,
  scenario,
  premise,
  trouble,
  otherPrem,
  cause,
  idea,
  plans,
});


          console.log("💾 topic 個人保存OK", topic);
        } catch (err) {
          console.error("❌ topic 個人保存失敗", err);
        }
      }}
    >
      OK
    </button>
  </div>
</div>




{/* Step 2: 助ける対象 */}
<div className="card" id="card2">
  <h3 style={{ marginBottom: 8 }}>② 助けたい人を選ぼう</h3>

  {/* === 候補ボタン群 === */}
  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
    {targetList.map((n) => (
      <button
        key={n}
        className={selectedTarget === n ? "btnDark" : "btn"}
        onClick={() => {
          setSelectedTarget(n);
        }}
      >
        {n}
      </button>
    ))}
  </div>

  {/* === 手動追加＋AI生成群 === */}
  <div style={{ display: "flex", gap: 6, marginTop: 8, alignItems: "center" }}>
    <input
      id="freeTarget"
      placeholder="自由に追加"
      style={{
        width: "240px",
        padding: "10px 12px",
        fontSize: "1rem",
        border: "1px solid #cbd5e1",
        borderRadius: "10px",
      }}
    />

    {/* 🎤 音声入力ボタン */}
    <button
      onClick={startTargetListening}
      style={{
        width: "42px",
        height: "42px",
        background: targetListening ? "#f87171" : "#e5e7eb",
        color: targetListening ? "#fff" : "#111",
        fontSize: "1.05rem",
        border: "none",
        cursor: "pointer",
        transition: "all 0.25s ease",
      }}
      title="音声で入力"
    >
      {targetListening ? "🎙️" : "🎤"}
    </button>

    {/* 🧩 自由追加ボタン */}
    <button
      className="btn"
      onClick={() => {
        const el = document.getElementById("freeTarget");
        const v = String(el.value || "").trim();
        if (!v) return;
        setSelectedTarget(v);
        el.value = "";
      }}
    >
      追加
    </button>

    {/* === AI生成 & 戻る === */}
    <div style={{ display: "flex", gap: 6, alignItems: "center", marginLeft: 6 }}>
      {/* 🤖 AIで生成 */}
      <button
        className={`btn ${loadingTargets ? "btnDark" : ""}`}
        disabled={loadingTargets}
        onClick={async () => {
          if (!topic || topic.trim() === "") {
            alert("議題を入力してください。");
            return;
          }

          setLoadingTargets(true);
          try {
            const res = await getTargets(topic);
            if (res?.targets?.length) {
              setTargetList(res.targets);
              setAiMode(true);
            }
          } catch (err) {
            console.error(err);
            alert("AI生成に失敗しました。");
          } finally {
            setLoadingTargets(false);
          }
        }}
        title="AIが議題に応じた候補を生成"
        style={{
          fontWeight: 600,
          letterSpacing: "0.02em",
          marginLeft: "-6px",
        }}
      >
        {loadingTargets ? "生成中..." : "AIで生成"}
      </button>

      {/* ↩️ 戻るボタン */}
      {aiMode && (
        <button
          className="btn"
          onClick={() => {
            const restored = defaultStakeholdersFor(topic);
            setTargetList(restored);
            setAiMode(false);
          }}
          title="元の候補に戻す"
        >
          候補を戻す
        </button>
      )}

      {/* 🔄 スピナー */}
      {loadingTargets && (
        <div
          style={{
            width: 22,
            height: 22,
            border: "3px solid #d1d5db",
            borderTopColor: "#3b82f6",
            borderRadius: "50%",
            animation: "spin 0.9s linear infinite",
          }}
        />
      )}
    </div>
  </div>

  {/* ✅ 明示保存 */}
  <div style={{ marginTop: 10 }}>
    <button
      className="btn"
      onClick={async () => {
        try {
          let userId = localStorage.getItem("userId");
          if (!userId) {
            userId = "U" + crypto.randomUUID().slice(0, 8);
            localStorage.setItem("userId", userId);
          }

await saveUserState({
  team: teamName,

  userId: currentUserId,        // ← 保存キー用（必須）
  author: currentUserName,      // ← 表示名

  topic,
  target: selectedTarget,
  scenario,
  premise,
  trouble,
  otherPrem,
  cause,
  idea,
  plans,
});


          console.log("💾 target 個人保存OK", selectedTarget);
        } catch (err) {
          console.error("❌ target 個人保存失敗", err);
        }
      }}
    >
      OK
    </button>
  </div>
</div>




{/* Step 3: シナリオ */}
<div className="card" id="card3">
  <h3 style={{ marginBottom: 8 }}>③ シナリオを考えよう</h3>

  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 8,
      marginBottom: 6,
      flexWrap: "wrap",
    }}
  >
    <div style={{ fontWeight: 700 }}>
      救助シナリオ {scenarioFixed ? "" : "（未決定）"}
    </div>

    {/* 🎤 マイクボタン */}
    <button
      onClick={startScenarioListening}
      style={{
        width: "30px",
        height: "30px",
        background: scenarioListening ? "#f87171" : "#e5e7eb",
        color: scenarioListening ? "#fff" : "#111",
        fontSize: "1.05rem",
        border: "none",
        borderRadius: "8px",
        cursor: "pointer",
        transition: "all 0.25s ease",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      title="音声で入力"
    >
      {scenarioListening ? "🎙️" : "🎤"}
    </button>

    {/* 原案・修正切替 */}
    {selectedTarget &&
      (scenarioFixed ? (
        <button className="btn" onClick={() => setScenarioFixed(false)}>
          修正する
        </button>
      ) : (
        <>
          <button
            className="btn"
            onClick={() => setScenarioDraft(scenario)}
          >
            原案に戻す
          </button>

          {/* ✅ 決定（state確定のみ） */}
          <button
            className="btnDark"
            onClick={() => {
              setScenario(scenarioDraft);
              setScenarioFixed(true);
            }}
          >
            決定
          </button>
        </>
      ))}
  </div>

  {/* 表示切替 */}
  {scenarioFixed ? (
    <pre
      style={{
        whiteSpace: "pre-wrap",
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
        borderRadius: 6,
        padding: 8,
      }}
    >
      {scenario}
    </pre>
  ) : (
    <textarea
      rows={3}
      value={scenarioDraft}
      onChange={(e) => setScenarioDraft(e.target.value)}
      placeholder="どんな状況で、どんなふうに助けるのか書いてみよう"
      style={{
        width: "100%",
        fontSize: "0.9rem",
        padding: "6px",
        borderRadius: "6px",
        border: "1px solid #d1d5db",
      }}
    />
  )}

</div>








          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button className="btnDark" onClick={() => setPage(2)}>
              次へ
            </button>
          </div>
        </>
      )}

{page === 2 && (
  <>
    {/* Step 4: 対策・計画 */}
    <div className="card">
      <h3 style={{ marginBottom: 8 }}>④ 対策を考えよう</h3>

{/* === 前提 === */}
<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
  <label style={{ fontWeight: 700 }}>
    前提の確認（今の状況を掘り起こす）
  </label>

  {/* 🎤 音声入力ボタン */}
  <button
    onClick={startPremiseListening}
    style={{
      width: "36px",
      height: "30px",
      background: premiseListening ? "#f87171" : "#e5e7eb",
      color: premiseListening ? "#fff" : "#111",
      fontSize: "1.05rem",
      border: "none",
      cursor: "pointer",
      transition: "all 0.25s ease",
      transform: "translateY(-2px)",
    }}
    title="音声で入力"
  >
    {premiseListening ? "🎙️" : "🎤"}
  </button>
</div>

<textarea
  value={premise}
  onChange={(e) => setPremise(e.target.value)}
  rows={1}
  placeholder="みんなが『当たり前』と思っていることは何かな？"
  style={{
    width: "100%",
    fontSize: "0.9rem",
    padding: "6px",
    textAlign: premise ? "left" : "right",
    color: premise ? "#111" : "#9ca3af",
  }}
/>



{/* === 困っている内容 === */}
<div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
  <label style={{ fontWeight: 700 }}>
    困っている内容の具体例
  </label>

  {/* 🎤 音声入力ボタン */}
  <button
    onClick={startTroubleListening}
    style={{
      width: "36px",
      height: "30px",
      background: troubleListening ? "#f87171" : "#e5e7eb",
      color: troubleListening ? "#fff" : "#111",
      fontSize: "1.05rem",
      border: "none",
      cursor: "pointer",
      transition: "all 0.25s ease",
      transform: "translateY(-2px)",
    }}
    title="音声で入力"
  >
    {troubleListening ? "🎙️" : "🎤"}
  </button>
</div>

<textarea
  value={trouble}
  onChange={(e) => setTrouble(e.target.value)}
  rows={1}
  placeholder="どんなことで困っているのかな？"
  style={{
    width: "100%",
    fontSize: "0.9rem",
    padding: "6px",
    textAlign: trouble ? "left" : "right",
    color: trouble ? "#111" : "#9ca3af",
  }}
/>


{/* === 他の前提 === */}
<div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
  <label style={{ fontWeight: 700 }}>
    他の前提（別の見方があるとしたら）
  </label>

  {/* 🎤 音声入力ボタン */}
  <button
    onClick={startOtherPremListening}
    style={{
      width: "36px",
      height: "30px",
      background: otherPremListening ? "#f87171" : "#e5e7eb",
      color: otherPremListening ? "#fff" : "#111",
      fontSize: "1.05rem",
      border: "none",
      cursor: "pointer",
      transition: "all 0.25s ease",
      transform: "translateY(-2px)",
    }}
    title="音声で入力"
  >
    {otherPremListening ? "🎙️" : "🎤"}
  </button>
</div>

<textarea
  value={otherPrem}
  onChange={(e) => setOtherPrem(e.target.value)}
  rows={1}
  placeholder="他にどんな見方があるかな？"
  style={{
    width: "100%",
    fontSize: "0.9rem",
    padding: "6px",
    textAlign: otherPrem ? "left" : "right",
    color: otherPrem ? "#111" : "#9ca3af",
  }}
/>



{/* === 原因 === */}
<div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
  <label style={{ fontWeight: 700 }}>
    原因さがし（なぜ、その困りごとが起こるのかな？）
  </label>

  {/* 🎤 音声入力ボタン */}
  <button
    onClick={startCauseListening}
    style={{
      width: "36px",
      height: "30px",
      background: causeListening ? "#f87171" : "#e5e7eb",
      color: causeListening ? "#fff" : "#111",
      fontSize: "1.05rem",
      border: "none",
      cursor: "pointer",
      transition: "all 0.25s ease",
      transform: "translateY(-2px)",
    }}
    title="音声で入力"
  >
    {causeListening ? "🎙️" : "🎤"}
  </button>
</div>

<textarea
  value={cause}
  onChange={(e) => setCause(e.target.value)}
  rows={1}
  placeholder="どうしてそうなっているのかな？"
  style={{
    width: "100%",
    fontSize: "0.9rem",
    padding: "6px",
    textAlign: cause ? "left" : "right",
    color: cause ? "#111" : "#9ca3af",
  }}
/>


{/* === アイデア === */}
<div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
  <label style={{ fontWeight: 700 }}>
    対策のアイデア（どうすれば解決できるかな？）
  </label>

  {/* 🎤 音声入力ボタン */}
  <button
    onClick={startIdeaListening}
    style={{
      width: "36px",
      height: "30px",
      background: ideaListening ? "#f87171" : "#e5e7eb",
      color: ideaListening ? "#fff" : "#111",
      fontSize: "1.05rem",
      border: "none",
      cursor: "pointer",
      transition: "all 0.25s ease",
      transform: "translateY(-2px)",
    }}
    title="音声で入力"
  >
    {ideaListening ? "🎙️" : "🎤"}
  </button>
</div>

<textarea
  value={idea}
  onChange={(e) => setIdea(e.target.value)}
  rows={1}
  placeholder="解決のためにできることは？"
  style={{
    width: "100%",
    fontSize: "0.9rem",
    padding: "6px",
    textAlign: idea ? "left" : "right",
    color: idea ? "#111" : "#9ca3af",
  }}
/>




{/* === ⑤ 計画と実行 === */}
<h3
  style={{
    margin: "12px 0 6px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  }}
>
  ⑤ 計画と実行

  {/* ＋ボタン */}
  <button
    className="btn"
    onClick={() => {
      const newPlans = [
        ...plans,
        { who: "", executor: "", what: "", how: "", good: "", bad: "" },
      ];
      setPlans(newPlans);
    }}
    style={{
      marginLeft: "4px",
      padding: "4px 8px",
      fontSize: "0.8rem",
      background: "#e5e7eb",
      borderRadius: 7,
      color: "#2563eb",
    }}
  >
    ＋
  </button>

  {/* −ボタン */}
  {plans.length > 1 && (
    <button
      className="btn"
      onClick={() => {
        const newPlans = plans.slice(0, -1);
        setPlans(newPlans);
      }}
      style={{
        marginLeft: 4,
        padding: "4px 8px",
        fontSize: "1rem",
        width: "29px",
        height: "25px",
        background: "#fee2e2",
        color: "#b91c1c",
        borderRadius: 7,
      }}
    >
      −
    </button>
  )}
</h3>

{plans.map((plan, i) => (
  <div
    key={i}
    style={{
      border: "1px solid #e5e7eb",
      borderRadius: 8,
      padding: 10,
      marginBottom: 10,
      background: "#f9fafb",
    }}
  >
    {/* === 見出し行 === */}
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginBottom: 6,
      }}
    >
      <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>({i + 1})</div>

      <div style={{ position: "relative" }}>
        <input
          list={`user-options-${i}`}
          placeholder="誰が考えた？"
          value={plan.who || ""}
          onChange={(e) =>
            updatePlan(i, { ...plan, who: e.target.value })
          }
          style={{
            width: 150,
            padding: "4px 6px",
            fontSize: "0.9rem",
            border: "1px solid #d1d5db",
            borderRadius: 6,
          }}
        />
        <datalist id={`user-options-${i}`}>
          {(userList || []).map((u) => (
            <option key={u} value={u} />
          ))}
        </datalist>
      </div>

      <span style={{ fontSize: "0.9rem", color: "#374151" }}>
        が考えた対策
      </span>
    </div>

    {/* === 実行内容 === */}
    <div
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        marginTop: 8,
        background: "#f3f4f6",
        borderRadius: "6px",
        paddingLeft: "38px",
      }}
    >
      <button
        onClick={startPlanListening}
        style={{
          position: "absolute",
          left: "0px",
          top: "50%",
          transform: "translateY(-50%)",
          width: "30px",
          height: "30px",
          background: listeningPlan ? "#f87171" : "#e5e7eb",
          color: listeningPlan ? "#fff" : "#111",
          fontSize: "1.05rem",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
        }}
        title="音声で入力"
      >
        {listeningPlan ? "🎙️" : "🎤"}
      </button>

      <div
        style={{
          display: "grid",
          gap: 6,
          gridTemplateColumns: "repeat(3, 1fr)",
          width: "100%",
        }}
      >
        <input
          placeholder="誰が"
          value={plan.executor || ""}
          onChange={(e) =>
            updatePlan(i, { ...plan, executor: e.target.value })
          }
        />
        <input
          placeholder="何を"
          value={plan.what || ""}
          onChange={(e) =>
            updatePlan(i, { ...plan, what: e.target.value })
          }
        />
        <input
          placeholder="どうやって"
          value={plan.how || ""}
          onChange={(e) =>
            updatePlan(i, { ...plan, how: e.target.value })
          }
        />
      </div>
    </div>

    {/* 良い結果 */}
    <div
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        marginTop: 8,
        background: "#f3f4f6",
        borderRadius: "6px",
        paddingLeft: "38px",
      }}
    >
      <button
        onClick={startGoodListening}
        style={{
          position: "absolute",
          left: "0px",
          top: "50%",
          transform: "translateY(-50%)",
          width: "30px",
          height: "30px",
          background: goodListening ? "#f87171" : "#e5e7eb",
          color: goodListening ? "#fff" : "#111",
          border: "none",
          borderRadius: "8px",
        }}
      >
        {goodListening ? "🎙️" : "🎤"}
      </button>

      <input
        placeholder="良い結果の予想"
        value={plan.good || ""}
        onChange={(e) =>
          updatePlan(i, { ...plan, good: e.target.value })
        }
        style={{
          width: "100%",
          padding: "6px",
          fontSize: "0.9rem",
          border: "1px solid #d1d5db",
          borderRadius: "6px",
        }}
      />
    </div>

    {/* 悪い結果 */}
    <div
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        marginTop: 8,
        background: "#f3f4f6",
        borderRadius: "6px",
        paddingLeft: "38px",
      }}
    >
      <button
        onClick={startBadListening}
        style={{
          position: "absolute",
          left: "0px",
          top: "50%",
          transform: "translateY(-50%)",
          width: "30px",
          height: "30px",
          background: badListening ? "#f87171" : "#e5e7eb",
          color: badListening ? "#fff" : "#111",
          border: "none",
          borderRadius: "8px",
        }}
      >
        {badListening ? "🎙️" : "🎤"}
      </button>

      <input
        placeholder="良くない結果の予想"
        value={plan.bad || ""}
        onChange={(e) =>
          updatePlan(i, { ...plan, bad: e.target.value })
        }
        style={{
          width: "100%",
          padding: "6px",
          fontSize: "0.9rem",
          border: "1px solid #d1d5db",
          borderRadius: "6px",
        }}
      />
    </div>
  </div>
))}








      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 10,
        }}
      >
        <button className="btn" onClick={() => setPage(1)} disabled={sending}>
          戻る
        </button>
        <button className="btnDark" onClick={send} disabled={sending}>
          {sending ? "送信中..." : "送信"}
        </button>
      </div>
    </div>

    {/* === スピナー === */}
    {sending && (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          background: "rgba(255,255,255,0.6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          backdropFilter: "blur(2px)",
          pointerEvents: "auto",
        }}
      >
        <div
          style={{
            border: "16px solid #e2e8f0",
            borderTop: "16px solid #3b82f6",
            borderRadius: "50%",
            width: 180,
            height: 180,
            animation: "spin 1s linear infinite",
          }}
        />
      </div>
    )}
  </>
)}

    </section>
  </main>
)}
{/* LOG */}
{view === "LOG" && (
  <main
    className="container"
    style={{
      paddingBottom: 32,
      display: "flex",
      justifyContent: "center",
    }}
  >
    <section
      className="card"
      style={{
        background: "#f8fafc",
        maxWidth: 720,
        width: "100%",
        position: "relative",
      }}
    >
      <div
        style={{
          fontWeight: 700,
          marginBottom: 12,
          fontSize: "1.1rem",
          textAlign: "center",
        }}
      >
        Log（{currentTeam}）
      </div>

      <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
        {visibleNotes.map((n) => (
          <li
            key={n.id}
            style={{
              background: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: 12,
              padding: "20px 28px",
              marginBottom: 20,
              lineHeight: 1.7,
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}
          >
            {/* 🕒 ヘッダー */}
            <div
              className="hint"
              style={{
                marginBottom: 6,
                fontSize: ".9rem",
                color: "#64748b",
                textAlign: "center",
              }}
            >
              🕒 {new Date(n.createdAt).toLocaleTimeString()}　|　{n.team} /{" "}
              {n.author}
            </div>

            {/* 💬 質問 */}
            <div style={{ marginBottom: 10 }}>
              <b style={{ color: "#1e3a8a" }}>Q:</b> {n.q}
              <div className="hint" style={{ marginTop: 2, color: "#475569" }}>
                S: {n.scenario}
              </div>
            </div>

{/* 🧩 各セクション */}
{[
  ["前提", n.premise, "premise"],
  ["困っている具体例", n.trouble, "trouble"],
  ["他の前提", n.otherPrem, "otherPrem"],
  ["原因", n.cause, "cause"],
  ["対策アイデア", n.idea, "idea"],
].map(([label, value, key]) =>
  value ? (
    <div
      key={key}
      style={{
        marginBottom: 14,
        padding: "10px 12px",
        background: "#f9fafb",
        borderRadius: 8,
        border: "1px solid #e5e7eb",
      }}
    >
      {/* ラベル + 文章 */}
      <div style={{ marginBottom: 6 }}>
        <b style={{ color: "#0f172a" }}>{label}:</b>{" "}
        <span style={{ color: "#111827" }}>{value}</span>
      </div>

      {/* RenderFlags（左揃え・自然配置） */}
      <div style={{ marginTop: 4 }}>
        <RenderFlags
          flagsForField={n.flagsDetail?.[key]}
          rawText={value}
          field={key}
          advice={n.flagsDetail?.[`${key}_advice`]}
        />
      </div>
    </div>
  ) : null
)}


            {/* 📘 計画と実行 */}
            {Array.isArray(n.plans) && n.plans.length > 0 ? (
              <div
                style={{
                  background: "#f1f5f9",
                  borderRadius: 8,
                  padding: "10px 12px",
                  marginTop: 12,
                  marginBottom: 8,
                  fontSize: ".9rem",
                  color: "#334155",
                }}
              >
                <b>計画と実行</b>
                {n.plans.map((p, i) => (
                  <div
                    key={i}
                    style={{
                      background: "#fff",
                      borderRadius: 6,
                      padding: "8px 10px",
                      marginTop: 6,
                      border: "1px solid #e2e8f0",
                    }}
                  >
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>
                      ({i + 1}) {p.who ? `${p.who}が考えた対策` : "（誰が考えたか未入力）"}
                    </div>
                    <div>
                      誰が実行: {p.executor || "—"} ／ 何: {p.what || "—"} ／
                      どうやって: {p.how || "—"}
                    </div>
                    <div>
                      良い結果の予想: {p.good || "—"} ／ 良くない結果の予想:{" "}
                      {p.bad || "—"}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // 🧩 旧形式（後方互換）
              <div
                style={{
                  background: "#f1f5f9",
                  borderRadius: 8,
                  padding: "10px 12px",
                  marginTop: 12,
                  marginBottom: 8,
                  fontSize: ".9rem",
                  color: "#334155",
                }}
              >
                <div>
                  <b>計画と実行:</b> 誰={n.who || "—"} ／ 何={n.what || "—"} ／ どうやって=
                  {n.how || "—"}
                </div>
                <div>
                  結果（良い予想）: {n.good || "—"} ／ 結果（良くない予想）:{" "}
                  {n.bad || "—"}
                </div>
              </div>
            )}

            {/* 🎯 ボタン行 */}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginTop: 10,
              }}
            >
              <button
                className="btn"
                onClick={() => openNoise(n)}
                style={{
                  background: "#e0f2fe",
                  color: "#0369a1",
                  fontWeight: 600,
                }}
              >
                AIからのヒント
              </button>
            </div>
          </li>
        ))}

        {/* ログが空の場合 */}
        {!visibleNotes.length && (
          <li
            className="hint"
            style={{
              textAlign: "center",
              color: "#94a3b8",
              padding: 20,
              background: "#fff",
              borderRadius: 8,
            }}
          >
            （{currentTeam} のログはまだありません）
          </li>
        )}
      </ul>

      {/* === スピナー === */}
      {sending && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(255,255,255,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9998,
            backdropFilter: "blur(2px)",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              border: "4px solid #ddd",
              borderTop: "4px solid #3b82f6",
              borderRadius: "50%",
              width: 48,
              height: 48,
              animation: "spin 1s linear infinite",
              zIndex: 9999,
            }}
          />
        </div>
      )}


    </section>
  </main>
)}
{/* === Board === */}
{view === "BOARD" && (
  <main className="containerWide" style={{ paddingBottom: 32, position: "relative" }}>
    {portrait && (
      <div className="card">Board は横画面推奨です（横向きにしてください）</div>
    )}

    <section className="card" style={{ position: "relative" }}>
      {/* === 上部ツールバー === */}
      <div
        className="matrixTopBar"
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <div style={{ fontWeight: 700 }}>Board（{currentTeam}）</div>

        <span className="hint" style={{ marginLeft: 6 }}>指標：</span>
        <select
          value={matrixSpec}
          onChange={e => setMatrixSpec(e.target.value)}
          style={{ marginRight: 12, padding: "4px 8px" }}
        >
          <option value="impact-feasibility">効果 × 実現可能性</option>
          <option value="importance-urgency">重要度 × 緊急度</option>
          <option value="individual-collective">客観的 × 主観的</option>
        </select>

        <button
          className={`btn ${editMatrix ? "btnDark" : ""}`}
          onClick={() => setEditMatrix(m => !m)}
          title="ドラッグで位置を調整"
        >
          {editMatrix ? "ドラッグで移動可" : "自分で配置"}
        </button>

        <button className="btn" onClick={aiArrange} disabled={arranging}>
          {arranging ? "分析中..." : "AIで位置分析"}
        </button>

        <button className="btn" onClick={resetMatrixCenter}>
          配置リセット
        </button>

        {/* 🔍 拡大・縮小切り替えボタン */}
{/* 🔍 拡大・縮小切り替えボタン */}
<button
  className={`btn ${compactView ? "btnDark" : ""}`}
  onClick={() => setCompactView(v => !v)}
  title="点表示と詳細表示の切り替え"
>
  {compactView ? "詳細を表示" : "点表示にする"}
</button>

      </div>

      {/* === Board Canvas === */}
      <div className="matrixCanvas" ref={matrixRef} onPointerUp={mUp} style={{ position: "relative" }}>
        <div className="axisX axisArrow xLeft" />
        <div className="axisX axisArrow xRight" />
        <div className="axisY axisArrow yTop" />
        <div className="axisY axisArrow yBottom" />

        {matrixLabels(matrixSpec).map(l => (
          <div key={l.k} className="axisLbl" style={l.s}>{l.t}</div>
        ))}

        {!visibleNotes?.length && (
          <p className="matrixEmptyMsg">表示できるノートがありません</p>
        )}

        {/* === 各ノート描画 === */}
{/* === 各ノート描画 === */}
{Array.isArray(visibleNotes) &&
  flattenToBoardItems(visibleNotes).map(it => {
    const key = it.key;
    // ✅ 位置計算を固定。matrixPosに無ければ初回だけ計算。
    const pos = matrixPos[key];
    if (!pos) return null; // ← まだAIの位置が来ていないノートは描画しない
    
    const lines = it.lines || [];

    const who = lines.find(l => l.startsWith("誰："))?.replace("誰：", "").trim() || "";
    const what = lines.find(l => l.startsWith("何："))?.replace("何：", "").trim() || "";
    const how = lines.find(l => l.startsWith("どうやって："))?.replace("どうやって：", "").trim() || "";
    const good = lines.find(l => l.startsWith("良い予想："))?.replace("良い予想：", "").trim() || "";
    const bad = lines.find(l => l.startsWith("良くない予想："))?.replace("良くない予想：", "").trim() || "";
    const mainLine = [who, what, how].filter(Boolean).join(" ").replace(/\s+/g, " ");

    // ✅ チームカラー決定関数
    const colorForTeam = name => {
      const colors = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#14b8a6"];
      const idx = Math.abs(
        [...(name || "team")].reduce((a, c) => a + c.charCodeAt(0), 0)
      ) % colors.length;
      return colors[idx];
    };
    const dotColor = colorForTeam(it.author || currentTeam);

    // === 点表示モード ===
// === 点表示モード ===
if (compactView) {
  // 🎨 初期色：自動割り当て or 保存済み選択色
  const dotColor = matrixPos[key]?.color || colorForTeam(it.author || currentTeam);

  return (
    <div
      key={key}
      style={{
        position: "absolute",
        left: `${pos.xP}%`,
        top: `${pos.yP}%`,
        transform: "translate(-50%,-50%)",
        display: "flex",
        alignItems: "center",
        gap: 6,
      }}
      onPointerDown={(e) => mDown(e, key)}
      onPointerMove={(e) => mMove(e, key)}
      onContextMenu={(e) => {
        e.preventDefault();
        alert(`${it.title} — ${it.author}\n${mainLine}`);
      }}
    >
      {/* 丸い点 */}
      <div
        title={`${it.title} — ${it.author}`}
        style={{
          width: 22,
          height: 22,
          background: dotColor,
          borderRadius: "50%",
          border: "2px solid #fff",
          boxShadow: "0 0 3px rgba(0,0,0,0.3)",
          cursor: editMatrix ? "grab" : "pointer",
          transition: "transform 0.2s ease",
        }}
        onClick={(e) => {
          if (editMatrix) return;
          alert(`${it.title} — ${it.author}\n${mainLine}`);
        }}
      />

      {/* 🖌️ カラーピッカー */}
      <input
        type="color"
        value={dotColor}
        onChange={(ev) => {
          const newColor = ev.target.value;
          setMatrixPos((p) => ({
            ...p,
            [key]: { ...p[key], color: newColor },
          }));
        }}
        style={{
          width: 24,
          height: 24,
          border: "none",
          borderRadius: "50%",
          cursor: "pointer",
          opacity: 0.4,
          transition: "opacity 0.2s ease",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = 1)}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = 0.4)}
      />
    </div>
  );
}
if (compactView) {
  const dotColor = matrixPos[key]?.color || colorForTeam(it.author || currentTeam);

  return (
    <div
      key={key}
      style={{
        position: "absolute",
        left: `${pos.xP}%`,
        top: `${pos.yP}%`,
        transform: "translate(-50%,-50%)",
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}
      onPointerDown={(e) => mDown(e, key)}
      onPointerMove={(e) => mMove(e, key)}
      onContextMenu={(e) => {
        e.preventDefault();
        alert(`${it.title} — ${it.author}\n${mainLine}`);
      }}
    >
      {/* 丸い点 */}
      <div
        title={`${it.title} — ${it.author}`}
        style={{
          width: 26,
          height: 26,
          background: dotColor,
          borderRadius: "50%",
          border: "2px solid #fff",
          boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
          cursor: editMatrix ? "grab" : "pointer",
        }}
      />

      {/* 🎨 カラー変更ボタン */}
      <div
        title="色を変更"
        onClick={(e) => {
          e.stopPropagation();
          const input = document.createElement("input");
          input.type = "color";
          input.value = dotColor;
          input.style.position = "fixed";
          input.style.left = `${e.clientX}px`;
          input.style.top = `${e.clientY}px`;
          input.style.opacity = 0;
          input.style.zIndex = 99999;
          document.body.appendChild(input);

          input.addEventListener("change", (ev) => {
            const newColor = ev.target.value;
            setMatrixPos((p) => ({
              ...p,
              [key]: { ...p[key], color: newColor },
            }));
          });

          input.click();
          setTimeout(() => input.remove(), 800);
        }}
        style={{
          width: 24,
          height: 24,
          borderRadius: "50%",
          border: "1.5px solid #cbd5e1",
          background: "linear-gradient(135deg, #fff 40%, #dbeafe 60%)",
          boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
          position: "relative",
          cursor: "pointer",
          transition: "all 0.25s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.15)";
          e.currentTarget.style.background = "linear-gradient(135deg, #fff 30%, #93c5fd 70%)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
          e.currentTarget.style.background = "linear-gradient(135deg, #fff 40%, #dbeafe 60%)";
        }}
      >
        {/* 🖍️ アイコン風線 */}
        <div
          style={{
            position: "absolute",
            bottom: "5px",
            left: "4px",
            width: "16px",
            height: "3px",
            background: "#475569",
            transform: "rotate(-20deg)",
            borderRadius: "2px",
          }}
        />
      </div>
    </div>
  );
}


    // === 通常表示モード ===
    return (
      <div
        key={key}
        className="mNote"
        style={{
          left: `${pos.xP}%`,
          top: `${pos.yP}%`,
          transform: "translate(-50%,-50%)",
          cursor: editMatrix ? "grab" : "default",
          background: "#fff",
          borderRadius: "12px",
          padding: "14px 18px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
          maxWidth: "360px",
          lineHeight: "1.6",
          border: "1px solid #e5e7eb",
          position: "absolute",
        }}
        onPointerDown={e => mDown(e, key)}
        onPointerMove={e => mMove(e, key)}
        title={`${it.title}\n${mainLine}`}
      >
        {/* タイトル行 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "8px",
            borderBottom: "1px solid #e5e7eb",
            paddingBottom: "4px",
          }}
        >
          <div
            style={{
              fontWeight: 700,
              fontSize: "14px",
              color: "#111827",
              whiteSpace: "nowrap",
              transform: "scale(0.95)",
              transformOrigin: "left center",
            }}
          >
            {it.title} — {it.author}
          </div>

          <button
            onClick={() => {
              if (confirm("このノートを削除しますか？")) {
                setNotes(prev => prev.filter(n => n.id !== it.id));
              }
            }}
            title="削除"
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              width: 22,
              height: 28,
              fontSize: "18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: 0.7,
              transition: "0.15s ease",
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = 1)}
            onMouseLeave={e => (e.currentTarget.style.opacity = 0.7)}
          >
            🗑️
          </button>
        </div>

        <div style={{ fontSize: "13.5px", color: "#1f2937", marginBottom: "6px" }}>
          {mainLine || "(内容なし)"}
        </div>

        {good && (
          <div style={{ fontSize: "13px", color: "#16a34a", marginTop: "4px" }}>
            良い予想：{good}
          </div>
        )}
        {bad && (
          <div style={{ fontSize: "13px", color: "#dc2626", marginTop: "2px" }}>
            良くない予想：{bad}
          </div>
        )}
      </div>
    );
  })}


        {/* === 🔵 スピナー === */}
        {arranging && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(255,255,255,0.6)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 9999,
            }}
          >
            <div
              style={{
                width: "100px",
                height: "100px",
                border: "10px solid #d1d5db",
                borderTop: "10px solid #3b82f6",
                borderRadius: "50%",
                animation: "spin 0.9s linear infinite",
              }}
            />
          </div>
        )}
      </div>
    </section>
  </main>
)}
    </>
  );



  
}

