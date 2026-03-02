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

/** OUTLIER表示順序（index.tsのORDERと同期） */
export const OUTLIER_ORDER = [
    "短絡",
    "速断",
    "循環",
    "二択",
    "歪曲",
    "飛躍",
    "類推",
    "偶然",
    "曖昧",
    "分割",
    "中傷",
    "同調",
    "権威",
    "巻添",
    "転嫁",
    "慣習",
    "恐怖",
    "憤怒",
    "同情",
    "嘲笑",
    "楽観",
    "幻想",
    "矮小",
    "不明",
];

/** フラグをORDER順にソート */
export const sortOutlierFlags = (flags) => {
    if (!Array.isArray(flags)) return [];
    return [...flags].sort(
        (a, b) => OUTLIER_ORDER.indexOf(a) - OUTLIER_ORDER.indexOf(b)
    );
};

export const OUTLIER = {
    "短絡": {
        icon: "⏭️",
        code: "短絡",
        label: "短絡",
        color: "#ef4444",
        desc: [
            "それだけが理由？",
            "他にも原因、ない？",
            "本当にそれのせい？"
        ],
    },
    "速断": {
        icon: "⚡",
        code: "速断",
        label: "速断",
        color: "#f59e0b",
        desc: [
            "みんなそうなの？",
            "たった一つで決めつけてない？",
            "それ、全部に言える？"
        ],
    },
    "循環": {
        icon: "🔄",
        code: "循環",
        label: "循環",
        color: "#10b981",
        desc: [
            "同じことを繰り返してない？",
            "それって、理由になってる？",
            "堂々巡りじゃない？"
        ],
    },
    "二択": {
        icon: "🆚",
        code: "二択",
        label: "二択",
        color: "#3b82f6",
        desc: [
            "どっちかしかないのかな？",
            "本当に二択？",
            "第3の道はない？"
        ],
    },
    "歪曲": {
        icon: "🌀",
        code: "歪曲",
        label: "歪曲",
        color: "#a855f7",
        desc: [
            "相手は本当にそう言った？",
            "論点をすり替えてない？",
            "それ、誰と戦ってるの？"
        ],
    },
    "飛躍": {
        icon: "🚀",
        code: "飛躍",
        label: "飛躍",
        color: "#f43f5e",
        desc: [
            "必ずそうなる？",
            "ちょっと考えすぎじゃない？",
            "本当に、止められない？"
        ],
    },
    "類推": {
        icon: "🧠",
        code: "類推",
        label: "類推",
        color: "#14b8a6",
        desc: [
            "その例え、合ってる？",
            "似てるけど、同じじゃないよね？",
            "もっと良い例え、ない？"
        ],
    },
    "偶然": {
        icon: "🎲",
        code: "偶然",
        label: "偶然",
        color: "#6366f1",
        desc: [
            "たまたまじゃない？",
            "前後が逆じゃない？",
            "本当に関係ある？"
        ],
    },
    "曖昧": {
        icon: "🫧",
        code: "曖昧",
        label: "曖昧",
        color: "#84cc16",
        desc: [
            "その言葉、どういう意味？",
            "さっきと意味が違ってない？",
            "言葉の定義をそろえよう。"
        ],
    },
    "分割": {
        icon: "✂️",
        code: "分割",
        label: "分割",
        color: "#f97316",
        desc: [
            "全体がそうでも、部分もそう？",
            "みんながそうでも、一人一人もそう？",
            "分けて考えても同じ？"
        ],
    },
    "中傷": {
        icon: "💥",
        code: "中傷",
        label: "中傷",
        color: "#dc2626",
        desc: [
            "それ、意見じゃなくて悪口かも。",
            "人と意見は、別じゃない？",
            "内容で判断しよう。"
        ],
    },
    "同調": {
        icon: "👥",
        code: "同調",
        label: "同調",
        color: "#0ea5e9",
        desc: [
            "みんなって、誰？",
            "みんながやってるから、正しいの？",
            "自分の意見はどこ？"
        ],
    },
    "権威": {
        icon: "👑",
        code: "権威",
        label: "権威",
        color: "#8b5cf6",
        desc: [
            "あの人が言うから正しいの？",
            "その人、本当に専門家？",
            "違う専門家はなんて言ってる？"
        ],
    },
    "巻添": {
        icon: "🧲",
        code: "巻添",
        label: "巻添",
        color: "#ec4899",
        desc: [
            "その人と、その仲間は別じゃない？",
            "レッテル貼りになってない？",
            "個人として見てみたら？"
        ],
    },
    "転嫁": {
        icon: "🔀",
        code: "転嫁",
        label: "転嫁",
        color: "#22c55e",
        desc: [
            "人のせいにしてない？",
            "話をそらしてない？",
            "まずは自分のことからじゃない？"
        ],
    },
    "慣習": {
        icon: "📜",
        code: "慣習",
        label: "慣習",
        color: "#eab308",
        desc: [
            "昔からだから、正しいの？",
            "もっと良いやり方、ない？",
            "なんでそれが続いてるんだろう？"
        ],
    },
    "恐怖": {
        icon: "😨",
        code: "恐怖",
        label: "恐怖",
        color: "#7c3aed",
        desc: [
            "本当に起きそう？",
            "怖がらせたいだけじゃない？",
            "事実と感情を分けてみよう。"
        ],
    },
    "憤怒": {
        icon: "🔥",
        code: "憤怒",
        label: "憤怒",
        color: "#b91c1c",
        desc: [
            "怒りで判断してない？",
            "怒りの矛先、合ってる？",
            "冷静になろう。"
        ],
    },
    "同情": {
        icon: "🤲",
        code: "同情",
        label: "同情",
        color: "#06b6d4",
        desc: [
            "かわいそうだから、正しいの？",
            "同情と事実は別じゃない？",
            "みんなに同じこと、できる？"
        ],
    },
    "嘲笑": {
        icon: "😏",
        code: "嘲笑",
        label: "嘲笑",
        color: "#4b5563",
        desc: [
            "笑い話で終わらせていいの？",
            "真面目に聞いてみたら？",
            "馬鹿にしてない？"
        ],
    },
    "楽観": {
        icon: "🌤️",
        code: "楽観",
        label: "楽観",
        color: "#16a34a",
        desc: [
            "希望的観測じゃない？",
            "うまくいく前提で話してない？",
            "最悪のケースは？"
        ],
    },
    "幻想": {
        icon: "🌿",
        code: "幻想",
        label: "幻想",
        color: "#059669",
        desc: [
            "自然だから、いいの？",
            "「自然」って、どういうこと？",
            "人工のものは、全部ダメ？"
        ],
    },
    "矮小": {
        icon: "🔍",
        code: "矮小",
        label: "矮小",
        color: "#334155",
        desc: [
            "問題をすり替えてない？",
            "比べる意味、ある？",
            "小さな問題は、無視していいの？"
        ],
    },
    "不明": {
        icon: "❓", 
        code: "不明", 
        label: "不明", 
        color: "#9ca3af", 
        desc: [
            "意味が取りづらいかも。",
            "判断要素を増やそう。",
            "説明を詳しく書こう"
        ], 
    },
};
