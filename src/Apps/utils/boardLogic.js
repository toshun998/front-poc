// ========== Boardロジック ==========
import { clamp } from "./helpers";

/** Board軸ラベルの取得 */
export function matrixLabels(spec) {
    switch (spec) {
        case "impact-feasibility":
            return [
                { k: "yH", t: "効果（高）", s: { left: "52%", top: "6%" } },
                { k: "yL", t: "効果（低）", s: { left: "52%", bottom: "6%" } },
                { k: "xL", t: "実現可能性（低）", s: { left: "8%", bottom: "50.2%" } },
                { k: "xH", t: "実現可能性（高）", s: { right: "8%", bottom: "50.2%" } },
            ];
        case "importance-urgency":
            return [
                { k: "yH", t: "重要度（高）", s: { left: "52%", top: "6%" } },
                { k: "yL", t: "重要度（低）", s: { left: "52%", bottom: "6%" } },
                { k: "xL", t: "緊急度（低）", s: { left: "8%", bottom: "50.2%" } },
                { k: "xH", t: "緊急度（高）", s: { right: "8%", bottom: "50.2%" } },
            ];
        default:
            return [
                { k: "yH", t: "客観的（高）", s: { left: "52%", top: "6%" } },
                { k: "yL", t: "客観的（低）", s: { left: "52%", bottom: "6%" } },
                { k: "xL", t: "主観的（低）", s: { left: "8%", bottom: "50.2%" } },
                { k: "xH", t: "主観的（高）", s: { right: "8%", bottom: "50.2%" } },
            ];
    }
}

/** ノートリストをBoardアイテムにフラット化 */
export function flattenToBoardItems(list) {
    const items = [];
    list.forEach((n) => {
        const base = {
            author: n.author,
            time: n.createdAt,
            id: n.id,
            note: n,
        };

        if (Array.isArray(n.plans) && n.plans.length > 0) {
            n.plans.forEach((p, i) => {
                const whoName =
                    p.who?.trim() || p.executor?.trim() || n.author || "匿名";
                const planLines = [];

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
        } else {
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

/** AI配置失敗時のフォールバック位置 */
export function computeMatrixFallback() {
    return { xP: 45 + Math.random() * 10, yP: 45 + Math.random() * 10 };
}

/** Board用ドラッグ操作ヘルパー */
export function handlePointerDown(e, key, editMatrix, matrixRef, dragRef, matrixPos) {
    if (!editMatrix) return;
    const r = matrixRef.current.getBoundingClientRect();
    const xP = ((e.clientX - r.left) / r.width) * 100;
    const yP = ((e.clientY - r.top) / r.height) * 100;
    dragRef.current = {
        key,
        dx: xP - (matrixPos[key]?.xP ?? 50),
        dy: yP - (matrixPos[key]?.yP ?? 50),
    };
}

export function handlePointerMove(e, key, editMatrix, matrixRef, dragRef, setMatrixPos) {
    if (!editMatrix || !dragRef.current || dragRef.current.key !== key) return;
    const r = matrixRef.current.getBoundingClientRect();
    let xP = ((e.clientX - r.left) / r.width) * 100 - dragRef.current.dx;
    let yP = ((e.clientY - r.top) / r.height) * 100 - dragRef.current.dy;
    xP = clamp(xP, 5, 95);
    yP = clamp(yP, 5, 95);
    setMatrixPos((p) => ({ ...p, [key]: { xP, yP } }));
}

/** チームカラー決定 */
export function colorForTeam(name) {
    const colors = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#14b8a6"];
    const idx =
        Math.abs([...(name || "team")].reduce((a, c) => a + c.charCodeAt(0), 0)) %
        colors.length;
    return colors[idx];
}
