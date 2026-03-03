// ==============================
// 1. API 基本設定
// ==============================
const BASE = "https://ms-engine-test.s-yamane.workers.dev";
if (!BASE) throw new Error("API BASE is missing");

const headers = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};


// ==============================
// companyCode 共通取得
// ==============================
const getCompanyCode = () => {
  const code = localStorage.getItem("companyCode");
  if (!code) {
    throw new Error("companyCode is missing (not logged in)");
  }
  return code;
};

const salt = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

// ==============================
// 2. 共通 POST ヘルパー
// ==============================
async function post(path, body = {}) {
  const companyCode = getCompanyCode();

  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { ...headers, "x-otb-salt": salt() },
    body: JSON.stringify({
      companyCode,
      ...body,
    }),
  });

  if (!res.ok) {
    throw new Error(`API ${path} ${res.status}`);
  }
  return res.json();
}

// ==============================
// 3. Persona（AI）関連
// ==============================
export const analyzeLine = (text, options = {}) =>
  post("/persona/analyze", { text, ...options });

export const explainLine = (text, options = {}) =>
  post("/persona/explain", { text, ...options });

export const explainLineEval = (topic, text) =>
  post("/persona/explainLine", { topic, text });

export const checkLogBias = (topic, fields) =>
  post("/persona/logBias", { topic, fields });

/**
 * チェックリスト方式でバイアス判定を行う
 * 各バイアスタイプごとに「この発言は"X"に該当するか？yes/no」で判定
 * @param {string} topic - 議題
 * @param {object} fields - 各フィールド（premise, trouble, otherPrem, cause, idea）
 * @param {string[]} biasTypes - 判定するバイアスタイプの配列（OUTLIER_ORDERから取得）
 * @returns {Promise<object>} - 各フィールドごとのバイアス判定結果
 */
export const checkLogBiasChecklist = (topic, fields, biasTypes) =>
  post("/persona/logBias", { 
    topic, 
    fields, 
    biasTypes,
    mode: "checklist"  // チェックリスト方式であることを明示
  });

export const getNoise = (topic, note) =>
  post("/persona/noise", { topic, note });

export const getTargets = (topic) =>
  post("/persona/targets", { topic });

// ==============================
// 4. Board / Evidence
// ==============================
export const arrangeBoard = (arg1, spec, notes) => {
  if (Array.isArray(arg1)) {
    return post("/persona/arrangeBoard", { boards: arg1 });
  }
  if (typeof arg1 === "object" && arg1.topic) {
    return post("/persona/arrangeBoard", arg1);
  }
  return post("/persona/arrangeBoard", { topic: arg1, spec, notes });
};

export const evidenceQuest = (topic, teamName, notes = []) =>
  post("/persona/evidenceQuest", { topic, teamName, notes });

// ==============================
// 5. TeamState（チーム共有メタ情報）
// ==============================

/**
 * チームの共有情報のみ取得
 * （参加者・役割など）
 */
export const getTeamState = async (teamName) => {
  const companyCode = getCompanyCode();

  const res = await fetch(
    `${BASE}/persona/teamState?companyCode=${encodeURIComponent(companyCode)}&team=${encodeURIComponent(teamName)}`,
    { headers }
  );
  if (!res.ok) throw new Error("teamState fetch failed");
  return res.json();
};


/**
 * チーム共有情報のみ保存
 * ※ 個人入力は絶対に含めない


// ==========
// ====================
// 6. UserState（個人入力・思考データ）
// ==============================



/**
 * 個人入力を保存
 * team + userId 単位で KV に保存される
 */
export const saveUserState = async (payload) => {
  const companyCode = getCompanyCode();

  const res = await fetch(`${BASE}/persona/userState`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      companyCode,   // ← ★ 追加
      ...payload,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("userState error response:", text);
    throw new Error("userState save failed");
  }

  return res.json();
};


export const updateTeamMembers = async ({ team, members }) => {
  if (!team || !Array.isArray(members)) {
    throw new Error("invalid updateTeamMembers args");
  }

  return post("/team/updateMembers", {
    team,
    members, // string[]（確定名簿）
  });
};
// ==============================
// 7. 個人ログ一覧（LOG画面用）
// ==============================

/**
 * チーム内の全 userState を取得
 */
export const getTeamUserStates = async (teamName) => {
  const companyCode = getCompanyCode();

  const res = await fetch(
    `${BASE}/persona/teamUserStates?companyCode=${encodeURIComponent(companyCode)}&team=${encodeURIComponent(teamName)}`,
    { headers }
  );
  if (!res.ok) throw new Error("teamUserStates fetch failed");
  return res.json();
};

/**
 * チームメンバー（名簿）を取得
 * getTeamStateから users 配列を抽出する便利関数
 */
export const getTeamMembers = async (teamName) => {
  const state = await getTeamState(teamName);
  return state.users || [];
};

