// 1. API 基本設定
const BASE = "https://ms-engine-test.s-yamane.workers.dev";
if (!BASE) throw new Error("API BASE is missing");
const headers = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};
const salt = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

// 2. 共通 POST ヘルパー
async function post(path, body = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { ...headers, "x-otb-salt": salt() },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API ${path} ${res.status}`);
  return res.json();
}

// 3. Persona（AI）関連
export const analyzeLine = (text, options = {}) =>
  post("/persona/analyze", { text, ...options });

export const explainLine = (text, options = {}) =>
  post("/persona/explain", { text, ...options });

export const explainLineEval = (topic, text) =>
  post("/persona/explainLine", { topic, text });

export const checkLogBias = (topic, fields) =>
  post("/persona/logBias", { topic, fields });

export const getNoise = (topic, note) =>
  post("/persona/noise", { topic, note });

export const getTargets = (topic) =>
  post("/persona/targets", { topic });

// 4. Board / Evidence
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

// 5. TeamState（KV）
export const getTeamState = async (teamName, userId) => {
  const teamUrl = `${BASE}/persona/teamState?team=${encodeURIComponent(teamName)}`;
  const teamRes = await fetch(teamUrl, { headers });
  if (!teamRes.ok) throw new Error("teamState fetch failed");
  const teamData = await teamRes.json();

  if (!userId) return teamData;

  const userKey = `${teamName}_user_${userId}`;
  const userUrl = `${BASE}/persona/teamState?team=${encodeURIComponent(userKey)}`;
  const userRes = await fetch(userUrl, { headers });

  if (userRes.ok) {
    const userData = await userRes.json();
    Object.assign(
      teamData,
      Object.fromEntries(
        Object.entries(userData).filter(([_, v]) => v !== "" && v != null)
      )
    );
  }

  return teamData;
};
export const getTeamLogs = async (teamName) => {
  const res = await fetch(
    `${BASE}/persona/teamLogs?team=${encodeURIComponent(teamName)}`,
    { method: "GET", headers }
  );

  if (!res.ok) {
    throw new Error(`teamLogs fetch failed: ${res.status}`);
  }

  return res.json();
};

export const updateTeamState = async (teamData) => {
  const { role, team, userId } = teamData;

  if (role === "guide") {
    console.log("🔒 guide は保存不可");
    return { skipped: true };
  }

  let saveKey = team;
  if (role === "user" && userId) {
    saveKey = `${team}_user_${userId}`;
  }

  const payload = Object.fromEntries(
    Object.entries({ ...teamData, team: saveKey }).filter(
      ([_, v]) => v !== undefined
    )
  );

  const res = await fetch(`${BASE}/persona/teamState`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error("teamState save failed");
  return res.json();
};

// 6. Subscription
export const subscribePlan = async (user) => {
  const res = await fetch(`${BASE}/persona/subscribe`, {
    method: "POST",
    headers,
    body: JSON.stringify({ user }),
  });

  if (!res.ok) throw new Error("subscribe failed");

  const data = await res.json();

  if (data.admin) {
    alert("👑 管理者なので即プレミアム有効");
  } else if (data.url) {
    window.location.href = data.url;
  } else {
    alert("⚠️ サブスク登録エラー");
  }

  return data;
};
