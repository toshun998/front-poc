// ========== 盲点（AIヒント）モーダル ==========
import Spinner from "../components/Spinner";

/**
 * AIからのヒント（盲点）モーダル
 */
export default function NoiseHintModal({
    noiseOpen,
    setNoiseOpen,
    noiseLoading,
    noiseData,
    noiseMeta,
}) {
    if (!noiseOpen) return null;

    return (
        <div
            className="gate"
            onClick={(e) => {
                if (noiseLoading) return;
                if (e.target.classList.contains("gate")) setNoiseOpen(false);
            }}
        >
            <div
                className="panel"
                style={{ maxWidth: 720, position: "relative" }}
            >
                {/* ヘッダー */}
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
                            if (!noiseLoading) setNoiseOpen(false);
                        }}
                        style={{
                            opacity: noiseLoading ? 0.5 : 1,
                            pointerEvents: noiseLoading ? "none" : "auto",
                        }}
                    >
                        閉じる
                    </button>
                </div>

                {/* コンテンツ */}
                {noiseLoading ? (
                    <Spinner style={{ cursor: "not-allowed" }} />
                ) : (
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
                            <li
                                className="hint"
                                style={{ textAlign: "center", padding: 16 }}
                            >
                                （提案はありません）
                            </li>
                        )}
                    </ul>
                )}
            </div>
        </div>
    );
}
