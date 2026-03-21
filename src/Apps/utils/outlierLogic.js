// ========== 外れ値・難易度判定ロジック ==========
import { jaccard, hasCausalCue } from "./helpers";

export const isNovelAgainst = (prev, now, thr = 0.45) =>
    jaccard(prev || "", now || "") < thr;

export function detectPositiveOutlier(note, topic, previousNotes) {
    const txt = [note.otherPrem, note.idea, note.cause].filter(Boolean).join(" ");
    const T = (topic || "") + " " + txt;
    const frameShift =
        /(過程|プロセス|履歴|透明性|再現|公平|代替手段|抽選|スポットチェック|口頭|録音|ランダム|申告)/.test(T);
    const conditional =
        /(ただし|条件|場合|上限|下限|境界|分けて|とき|なら|条件付き)/.test(T);
    const microTrial =
        /(小さく|試(す|行)|即興|ミニ|タイムラプス|一部で|抽出|対照|パイロット|検証)/.test(T) ||
        (note.who && note.what && note.how);
    const hitKinds = [];
    if (frameShift) hitKinds.push("frame");
    if (conditional) hitKinds.push("cond");
    if (microTrial) hitKinds.push("trial");
    const prev = (previousNotes || [])
        .slice(0, 6)
        .map((n) => n.a || n.idea || n.cause || "");
    const novel = prev.every((p) => isNovelAgainst(p, txt, 0.45));
    return { isHit: novel && hitKinds.length >= 2, hitKinds };
}

export function judgeOOTB(teamNotes, mode = "standard") {
    const userNotes = teamNotes.filter((n) => n.author !== "noise");
    let sim = 0,
        cmp = 0;
    for (let i = 1; i < userNotes.length; i++) {
        cmp++;
        if (jaccard(userNotes[i - 1].a, userNotes[i].a) > 0.75) sim++;
    }
    const diversity = cmp ? 1 - sim / cmp : 0;
    let hitCount = 0;
    const byAuthor = new Set();
    for (let i = 0; i < userNotes.length; i++) {
        const n = userNotes[i];
        const prev = userNotes.slice(Math.max(0, i - 6), i);
        const { isHit } = detectPositiveOutlier(n, n.q || "", prev);
        if (isHit) {
            hitCount++;
            byAuthor.add(n.author || "");
        }
    }
    const hasOtherPrem = userNotes.some((n) => (n.otherPrem || "").trim());
    if (mode === "easy") return hitCount >= 1 && diversity >= 0.2;
    if (mode === "hard")
        return byAuthor.size >= 2 && hitCount >= 2 && diversity >= 0.5 && hasOtherPrem;
    return hitCount >= 1 && diversity >= 0.4;
}

/** 議題ベースのスニペット生成 */
export function topicSnippets(topic, note) {
    const s = (
        topic +
        " " +
        note.premise +
        " " +
        note.idea +
        " " +
        note.cause
    ).toLowerCase();
    if (/レポート|ai|評価|採点|学生|教員/.test(s)) {
        return [
            `教員向け：口頭はランダム抽出10–20%のみ。録音保存＋2名採点＋簡易ルーブリックを公開。`,
            `学生向け：AI使用は申告＋プロンプト履歴提出を必須（未提出は減点／再評価）。`,
            `配慮：口頭が不利な学生に動画説明や追試など同等の代替手段を規定。`,
            `運用：オンラインは画面共有＋手元カメラを要件化（裏参照対策）。`,
            `検証：同テーマの即興ミニ課題を本試験に1題混ぜ、理解の再現性を確認。`,
        ];
    }
    if (/ひまわり|向日葵|sunflower/.test(s)) {
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

/** ノートに対する提案生成 */
export function buildConcreteProposals(topic, n) {
    const list = topicSnippets(topic, n).map((t) => ({ tag: "盲点", text: t }));
    if (!(n.trouble || "").trim())
        list.push({ tag: "例", text: "困っている具体例を1行（誰が/いつ/どこで）。" });
    if (!(n.who && n.what && n.how))
        list.push({ tag: "検証", text: "『誰・何・どうやって』を1セット書いて小さく試す。" });
    return list;
}

/** 偏りフラグのフィルタリング */
export function filterOutlierFlags(list, field, rawText, teamStats) {
    if (!Array.isArray(list)) return [];
    return list; // 全部そのまま返す
}

