// ========== 汎用ユーティリティ ==========

/** API結果のアンラップ */
export function unbox(r) {
    if (r == null) return r;
    if (Array.isArray(r)) return r[0] ?? null;
    if (r && Array.isArray(r.data)) return r.data[0] ?? null;
    return r;
}

/** 議題から体言形に変換 */
export const toTaigen = (s) =>
    String(s || "")
        .trim()
        .replace(/[?？。]+$/, "")
        .replace(/(とは|はなぜ.*|について.*)$/, "") || "この議題";

/** 因果キューの有無 */
export const hasCausalCue = (s) =>
    /だから|ため|ので|ゆえ|せい|結果|影響|原因|引き起こ/.test(String(s || ""));

/** 数値クランプ */
export const clamp = (x, min = 0, max = 1) => Math.max(min, Math.min(max, x));

/** Jaccard類似度 */
export const jaccard = (a, b) => {
    const A = new Set(
        String(a || "")
            .toLowerCase()
            .split(/\s+/)
            .filter(Boolean)
    );
    const B = new Set(
        String(b || "")
            .toLowerCase()
            .split(/\s+/)
            .filter(Boolean)
    );
    const inter = [...A].filter((x) => B.has(x)).length;
    const uni = new Set([...A, ...B]).size || 1;
    return inter / uni;
};

/** キー正規化（空白・記号除去） */
export const keyPlain = (s) =>
    String(s || "")
        .replace(/\s+/g, "")
        .replace(/[『』「」【】（）()［］\[\]、。・,.!?！？]/g, "")
        .toLowerCase();

/** 議題と当事者名が近すぎるか判定 */
export function isTooClose(name, topic) {
    const a = keyPlain(name),
        b = keyPlain(toTaigen(topic));
    if (!a || !b || a.length <= 2) return false;
    if (b.includes(a) || a.includes(b)) return true;
    const A = new Set(a.split(""));
    const B = new Set(b.split(""));
    const inter = [...A].filter((x) => B.has(x)).length;
    const uni = new Set([...A, ...B]).size || 1;
    return inter / uni > 0.6;
}

/** 当事者リストの正規化 */
export function normalizeStakeholders(topic, names) {
    const base = defaultStakeholdersFor(topic);
    const out = [];
    for (const n of [...names, ...base]) {
        const s = String(n || "").trim();
        if (!s) continue;
        if (isTooClose(s, topic)) continue;
        if (!out.includes(s)) out.push(s);
    }
    return out.slice(0, 12);
}

/** 議題から当事者自動選定 */
export function defaultStakeholdersFor(topic) {
    const t = String(topic || "").toLowerCase();
    const unique = new Set();

    const categories = [
        { key: /性犯罪|暴力|虐待|誹謗|犯罪|治安/, list: ["被害当事者", "加害当事者", "警察", "支援団体", "地域住民", "自治体関係者", "報道関係者", "法律専門家"] },
        { key: /教育|学生|授業|大学|学校|研究|教師|学習|課題/, list: ["学生", "教員", "保護者", "教育委員会", "学校運営者", "研究者", "同級生", "教育政策担当"] },
        { key: /医療|病院|健康|看護|福祉|介護|ワクチン|感染/, list: ["患者", "医療従事者", "家族", "保健所", "製薬会社", "自治体関係者", "倫理委員会", "報道関係者"] },
        { key: /経済|企業|雇用|ビジネス|投資|景気|物価|副業/, list: ["社員", "経営者", "顧客", "投資家", "取引先", "政府関係者", "労働組合", "地域住民"] },
        { key: /政治|政府|政策|法律|選挙|行政|国会|制度|外交/, list: ["国民", "政治家", "行政職員", "専門家", "市民団体", "報道関係者", "法曹関係者", "NPO関係者"] },
        { key: /環境|自然|気候|エネルギー|原発|災害|防災|再生可能/, list: ["地域住民", "専門家", "政府関係者", "企業", "研究者", "環境団体", "ボランティア", "教育者"] },
        { key: /ai|人工知能|テクノロジー|機械|プログラム|開発|データ|セキュリティ/, list: ["開発者", "利用者", "研究者", "倫理専門家", "法曹関係者", "企業", "行政関係者", "教育者"] },
        { key: /sns|ネット|動画|投稿|炎上|フォロワー|コミュニティ|インターネット/, list: ["ユーザー", "プラットフォーム運営", "視聴者", "広告主", "報道関係者", "インフルエンサー", "モデレーター", "被害者"] },
        { key: /文化|芸術|音楽|映画|ゲーム|アニメ|創作|発表|表現/, list: ["制作者", "観客", "ファン", "出版社", "報道関係者", "批評家", "スポンサー", "教育機関"] },
        { key: /宗教|哲学|倫理|信仰|死生観|価値観|思想|信念/, list: ["信者", "指導者", "哲学者", "研究者", "宗教団体", "教育者", "一般市民", "報道関係者"] },
        { key: /恋愛|結婚|家族|友人|人間関係|子育て|離婚|孤独/, list: ["本人", "恋人", "配偶者", "家族", "友人", "カウンセラー", "SNSフォロワー", "教育者"] },
        { key: /科学|宇宙|未来|技術革新|バイオ|遺伝子|ロボット|量子/, list: ["科学者", "技術者", "企業", "政府関係者", "倫理委員会", "研究機関", "一般市民", "学生"] },
        { key: /国際|戦争|平和|外交|難民|条約|貿易|多文化|移民/, list: ["政府関係者", "国際機関", "外国人住民", "市民団体", "報道関係者", "研究者", "支援者", "一般市民"] },
        { key: /都市|交通|住宅|再開発|地域|観光|景観|まちづくり/, list: ["住民", "観光客", "事業者", "建設業者", "設計者", "自治体関係者", "地域団体", "環境専門家"] },
        { key: /生活|消費|食|家計|物価|サブスク|通販|電気|水道/, list: ["消費者", "販売者", "製造者", "流通業者", "金融機関", "政府関係者", "NPO", "地域住民"] },
        { key: /心理|メンタル|ストレス|幸福|自己肯定感|カウンセリング/, list: ["本人", "家族", "カウンセラー", "心理学者", "友人", "教育者", "医師", "支援者"] },
        { key: /働き方|チーム|リーダー|上司|部下|会議|評価|モチベーション/, list: ["上司", "部下", "人事担当", "経営者", "チームメンバー", "コーチ", "組織心理士", "教育担当"] },
        { key: /倫理|モラル|自由|規制|言論|著作権|人権|差別/, list: ["表現者", "読者", "規制当局", "法曹関係者", "報道関係者", "哲学者", "市民", "教育者"] },
        { key: /夢|希望|恐怖|怒り|悲しみ|未来|現実|自由|幸せ|孤独|人生|愛|死|存在|意味|心/, list: ["本人", "家族", "友人", "心理学者", "哲学者", "作家", "教育者", "一般市民"] },
    ];

    for (const c of categories) {
        if (c.key.test(t)) {
            c.list.forEach((x) => unique.add(x));
        }
    }

    if (unique.size === 0) {
        ["当事者", "関係者", "専門家", "行政関係者", "研究者", "支援者", "一般市民"].forEach(
            (x) => unique.add(x)
        );
    }

    return Array.from(unique);
}

/** どんな値でも安全に文字列へ */
export const toText = (v) => {
    if (v === null || v === undefined) return "";
    if (typeof v === "string" || typeof v === "number") return String(v);
    if (typeof v === "object") {
        if ("name" in v) return String(v.name);
        return JSON.stringify(v);
    }
    return String(v);
};

/** アドバイス文のサニタイズ */
export const sanitizeAdvice = (t) =>
    String(t || "")
        .replace(/粒度/g, "具体性")
        .replace(/実行と観測のサイクルを短く回しましょう。?/g, "『だれが・何を・どうやって』まで書けると伝わる。")
        .replace(/PDCA|サイクル/g, "手順");

// ========== 偏り(OUTLIER)定数 ==========
export const OUTLIER = {
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
