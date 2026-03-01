// ========== Evidence Questモーダル ==========
import Spinner from "../components/Spinner";

/**
 * Evidence Questモーダル
 */
export default function EvidenceQuestModal({
    evidenceOpen,
    setEvidenceOpen,
    loading,
    evidenceHints,
}) {
    if (!evidenceOpen) return null;

    return (
        <div
            className="gate"
            style={{ zIndex: 9999 }}
            onClick={(e) => {
                if (loading) return;
                if (e.target.classList.contains("gate")) setEvidenceOpen(false);
            }}
        >
            <div
                className="panel"
                style={{ maxWidth: 700, position: "relative" }}
            >
                {/* ヘッダー */}
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

                {/* コンテンツ */}
                {loading ? (
                    <Spinner style={{ cursor: "not-allowed" }} />
                ) : evidenceHints && Object.keys(evidenceHints).length > 0 ? (
                    (() => {
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
                                        <div style={{ marginTop: 3 }}>
                                            {String(value)}
                                        </div>
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
    );
}
