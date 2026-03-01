// ========== BOARD画面 ==========
import { useRef } from "react";
import {
    matrixLabels,
    flattenToBoardItems,
    computeMatrixFallback,
    handlePointerDown,
    handlePointerMove,
    colorForTeam,
} from "../utils/boardLogic";
import { OverlaySpinner } from "../components/Spinner";
import { arrangeBoard } from "../../FrontServer/personaApi";

/**
 * Board画面 - マトリクス配置
 */
export default function BoardScreen({
    currentTeam,
    visibleNotes,
    // Board状態
    matrixSpec,
    setMatrixSpec,
    matrixPos,
    setMatrixPos,
    editMatrix,
    setEditMatrix,
    arranging,
    setArranging,
    compactView,
    setCompactView,
    portrait,
    topic,
    setNotes,
}) {
    const matrixRef = useRef(null);
    const dragRef = useRef(null);

    const mDown = (e, key) =>
        handlePointerDown(e, key, editMatrix, matrixRef, dragRef, matrixPos);
    const mMove = (e, key) =>
        handlePointerMove(e, key, editMatrix, matrixRef, dragRef, setMatrixPos);
    const mUp = () => {
        dragRef.current = null;
    };

    const resetMatrixCenter = () => {
        const items = flattenToBoardItems(visibleNotes);
        const center = {};
        items.forEach((it) => {
            center[it.key] = { xP: 50, yP: 50 };
        });
        setMatrixPos(center);
    };

    const aiArrange = async () => {
        if (arranging) return;
        setArranging(true);

        try {
            const items = flattenToBoardItems(visibleNotes);
            const payload = {
                topic,
                spec: matrixSpec,
                notes: items.map((it) => ({
                    id: it.key,
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
                items.forEach((it) => {
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
    };

    return (
        <main
            className="containerWide"
            style={{ paddingBottom: 32, position: "relative" }}
        >
            {portrait && (
                <div className="card">
                    Board は横画面推奨です（横向きにしてください）
                </div>
            )}

            <section className="card" style={{ position: "relative" }}>
                {/* 上部ツールバー */}
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

                    <span className="hint" style={{ marginLeft: 6 }}>
                        指標：
                    </span>
                    <select
                        value={matrixSpec}
                        onChange={(e) => setMatrixSpec(e.target.value)}
                        style={{ marginRight: 12, padding: "4px 8px" }}
                    >
                        <option value="impact-feasibility">効果 × 実現可能性</option>
                        <option value="importance-urgency">重要度 × 緊急度</option>
                        <option value="individual-collective">客観的 × 主観的</option>
                    </select>

                    <button
                        className={`btn ${editMatrix ? "btnDark" : ""}`}
                        onClick={() => setEditMatrix((m) => !m)}
                        title="ドラッグで位置を調整"
                    >
                        {editMatrix ? "ドラッグで移動可" : "自分で配置"}
                    </button>

                    <button
                        className="btn"
                        onClick={aiArrange}
                        disabled={arranging}
                    >
                        {arranging ? "分析中..." : "AIで位置分析"}
                    </button>

                    <button className="btn" onClick={resetMatrixCenter}>
                        配置リセット
                    </button>

                    <button
                        className={`btn ${compactView ? "btnDark" : ""}`}
                        onClick={() => setCompactView((v) => !v)}
                        title="点表示と詳細表示の切り替え"
                    >
                        {compactView ? "詳細を表示" : "点表示にする"}
                    </button>
                </div>

                {/* Board Canvas */}
                <div
                    className="matrixCanvas"
                    ref={matrixRef}
                    onPointerUp={mUp}
                    style={{ position: "relative" }}
                >
                    <div className="axisX axisArrow xLeft" />
                    <div className="axisX axisArrow xRight" />
                    <div className="axisY axisArrow yTop" />
                    <div className="axisY axisArrow yBottom" />

                    {matrixLabels(matrixSpec).map((l) => (
                        <div key={l.k} className="axisLbl" style={l.s}>
                            {l.t}
                        </div>
                    ))}

                    {!visibleNotes?.length && (
                        <p className="matrixEmptyMsg">
                            表示できるノートがありません
                        </p>
                    )}

                    {/* 各ノート描画 */}
                    {Array.isArray(visibleNotes) &&
                        flattenToBoardItems(visibleNotes).map((it) => {
                            const key = it.key;
                            const pos = matrixPos[key];
                            if (!pos) return null;

                            const lines = it.lines || [];
                            const who =
                                lines
                                    .find((l) => l.startsWith("誰："))
                                    ?.replace("誰：", "")
                                    .trim() || "";
                            const what =
                                lines
                                    .find((l) => l.startsWith("何："))
                                    ?.replace("何：", "")
                                    .trim() || "";
                            const how =
                                lines
                                    .find((l) => l.startsWith("どうやって："))
                                    ?.replace("どうやって：", "")
                                    .trim() || "";
                            const good =
                                lines
                                    .find((l) => l.startsWith("良い予想："))
                                    ?.replace("良い予想：", "")
                                    .trim() || "";
                            const bad =
                                lines
                                    .find((l) => l.startsWith("良くない予想："))
                                    ?.replace("良くない予想：", "")
                                    .trim() || "";
                            const mainLine = [who, what, how]
                                .filter(Boolean)
                                .join(" ")
                                .replace(/\s+/g, " ");

                            const dotColor =
                                matrixPos[key]?.color ||
                                colorForTeam(it.author || currentTeam);

                            // === 点表示モード ===
                            if (compactView) {
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
                                            alert(
                                                `${it.title} — ${it.author}\n${mainLine}`
                                            );
                                        }}
                                    >
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
                                            onClick={() => {
                                                if (editMatrix) return;
                                                alert(
                                                    `${it.title} — ${it.author}\n${mainLine}`
                                                );
                                            }}
                                        />

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
                                            onMouseEnter={(e) =>
                                                (e.currentTarget.style.opacity = 1)
                                            }
                                            onMouseLeave={(e) =>
                                                (e.currentTarget.style.opacity = 0.4)
                                            }
                                        />
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
                                    onPointerDown={(e) => mDown(e, key)}
                                    onPointerMove={(e) => mMove(e, key)}
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
                                                    setNotes((prev) =>
                                                        prev.filter((n) => n.id !== it.id)
                                                    );
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
                                            onMouseEnter={(e) =>
                                                (e.currentTarget.style.opacity = 1)
                                            }
                                            onMouseLeave={(e) =>
                                                (e.currentTarget.style.opacity = 0.7)
                                            }
                                        >
                                            🗑️
                                        </button>
                                    </div>

                                    <div
                                        style={{
                                            fontSize: "13.5px",
                                            color: "#1f2937",
                                            marginBottom: "6px",
                                        }}
                                    >
                                        {mainLine || "(内容なし)"}
                                    </div>

                                    {good && (
                                        <div
                                            style={{
                                                fontSize: "13px",
                                                color: "#16a34a",
                                                marginTop: "4px",
                                            }}
                                        >
                                            良い予想：{good}
                                        </div>
                                    )}
                                    {bad && (
                                        <div
                                            style={{
                                                fontSize: "13px",
                                                color: "#dc2626",
                                                marginTop: "2px",
                                            }}
                                        >
                                            良くない予想：{bad}
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                    {arranging && <OverlaySpinner />}
                </div>
            </section>
        </main>
    );
}
