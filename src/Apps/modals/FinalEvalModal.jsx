// ========== 議論終結モーダル ==========
import { OverlaySpinner } from "../components/Spinner";

/**
 * 議論終結モーダル（Canvas描画）
 */
export default function FinalEvalModal({
    finalOpen,
    setFinalOpen,
    loadingEval,
    cvsRef,
    teamName,
    // Evidence Quest
    setEvidenceHints,
    setEvidenceOpen,
    loading,
    setLoading,
    evidenceQuest,
    topic,
    visibleNotes,
}) {
    if (!finalOpen) return null;

    return (
        <div
            className="gate"
            onClick={(e) => {
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
                                pointerEvents: loadingEval ? "none" : "auto",
                            }}
                            onClick={async () => {
                                if (loadingEval) return;
                                setEvidenceHints({});
                                setEvidenceOpen(true);
                                setLoading(true);

                                try {
                                    const res = await evidenceQuest(
                                        topic,
                                        teamName,
                                        visibleNotes
                                    );
                                    console.log("📦 AI返却:", res);
                                    setEvidenceHints(res);
                                } catch (e) {
                                    console.error(e);
                                    setEvidenceHints({
                                        error: "エラーが発生しました。",
                                    });
                                }

                                setLoading(false);
                            }}
                        >
                            Evidence Quest
                        </button>

                        <button
                            className="btn"
                            onClick={() => {
                                if (!loadingEval) setFinalOpen(false);
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

                {/* Canvas */}
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

                    {loadingEval && <OverlaySpinner />}
                </div>
            </div>
        </div>
    );
}
