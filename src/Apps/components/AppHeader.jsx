// ========== アプリヘッダーコンポーネント ==========
import { exportLogPdf } from "../utils/pdfExport";

/**
 * アプリケーションの固定ヘッダー（トグル、チーム情報、ログPDF、ナビゲーション等）
 */
export default function AppHeader({
    // 表示制御
    headerOpen,
    setHeaderOpen,
    view,
    setView,
    // チーム情報
    teamName,
    currentUserName,
    // ログPDF
    logPayload,
    // ヘッダー内のアクション
    setStage,
    setFinalOpen,
    runExplainLineEval,
    // LOGを見る
    setLogOpen,
    getTeamUserStates,
    setUserLogs,
    setSelectedUserId,
    logOpen,
    setSelectedLog,
    setLogSearch,
    // 参加設定
    setGateOpen,
    setStep,
    setGateLoading,
    setUserList,
    getTeamMembers,
    // AI接続
    aiOK,
    checkAI,
    // children (LogViewerModal, DownloadSelectModal は HeaderのJSX内に描画される)
    children,
}) {
    return (
        <>
            {/* トグルボタン（≡ / ≪） */}
            <button
                className="headerToggleBtn"
                onClick={() => setHeaderOpen((o) => !o)}
                title={headerOpen ? "閉じる" : "開く"}
                style={{
                    position: "fixed",
                    top: "16px",
                    left: "16px",
                    zIndex: 9999,
                    width: "56px",
                    height: "56px",
                    borderRadius: "12px",
                    background: "#333",
                    border: "none",
                    color: "#fff",
                    fontSize: 28,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    transition: "all 0.25s ease",
                    userSelect: "none",
                }}
                onMouseOver={(e) => {
                    e.currentTarget.style.background = "#444";
                    e.currentTarget.style.transform = "scale(1.08)";
                }}
                onMouseOut={(e) => {
                    e.currentTarget.style.background = "#333";
                    e.currentTarget.style.transform = "scale(1)";
                }}
                onMouseDown={(e) => e.preventDefault()}
            >
                {headerOpen ? "≪" : "≡"}
            </button>

            {/* 👤 左上：チーム × ユーザー */}
            <div
                style={{
                    position: "fixed",
                    top: "16px",
                    left: "88px",
                    zIndex: 9999,
                    background: "#fff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "12px",
                    padding: "10px 16px",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    fontWeight: 700,
                }}
            >
                <span style={{ fontSize: "18px" }}>{teamName || "—"}</span>
                <span style={{ color: "#64748b" }}>{currentUserName || "—"}</span>
            </div>

            {/* 🔒 右上ボタンコンテナ */}
            <div
                style={{
                    position: "fixed",
                    top: "16px",
                    right: "16px",
                    zIndex: 9999,
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                }}
            >
                <button
                    onClick={() => exportLogPdf(logPayload)}
                    style={{
                        padding: "10px 18px",
                        background: "#333",
                        color: "#fff",
                        border: "none",
                        borderRadius: "10px",
                        fontSize: "15px",
                        cursor: "pointer",
                    }}
                >
                    🧾 ログPDF
                </button>
            </div>

            {/* ヘッダー（ページ内：空のtopicHead） */}
            <div
                className="topicHead"
                style={{
                    background: "#fff",
                    borderBottom: "1px solid #e5e7eb",
                    boxShadow: headerOpen ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                    transition: "max-height 0.4s ease, opacity 0.4s ease",
                    overflow: "hidden",
                    maxHeight: headerOpen ? "220px" : "0",
                    opacity: headerOpen ? 1 : 0,
                }}
            />

            {/* ヘッダー（ページ内：ナビゲーション） */}
            <div
                className="topicHead"
                style={{
                    background: "#fff",
                    borderBottom: "1px solid #e5e7eb",
                    boxShadow: headerOpen ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                    transition: "max-height 0.4s ease, opacity 0.4s ease",
                    overflow: "hidden",
                    maxHeight: headerOpen ? "220px" : "0",
                    opacity: headerOpen ? 1 : 0,
                }}
            >
                <div
                    className="container"
                    style={{ padding: headerOpen ? "12px 16px" : "0 16px" }}
                >
                    <div
                        className="headRow"
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 10,
                            flexWrap: "wrap",
                        }}
                    >
                        <button
                            className="btn"
                            onClick={() => {
                                setView("INTRO");
                                setStage("intro");
                                setTimeout(() => setStage("moveUp"), 1000);
                                setTimeout(() => setStage("done"), 2300);
                            }}
                        >
                            表紙へ
                        </button>
                        <button
                            className="btn"
                            onClick={() => {
                                setFinalOpen(true);
                                setTimeout(runExplainLineEval, 10);
                            }}
                        >
                            議論終結
                        </button>

                        <button
                            className="btn"
                            onClick={async () => {
                                setLogOpen(true);
                                const res = await getTeamUserStates(teamName);
                                setUserLogs(res.users || []);
                                setSelectedUserId(null);
                            }}
                        >
                            LOGを見る
                        </button>

                        <button 
                            className="btn"
                            onClick={() => setView("DASHBOARD")}
                        >
                            Dashboard
                        </button>

                        {/* LogViewerModal / DownloadSelectModal は children で渡される */}
                        {children}

                        {/* 参加設定/設定変更ボタン */}
                        <button
                            className="btn"
                            onClick={async () => {
                                const savedTeam = localStorage.getItem("teamName");

                                if (!savedTeam) {
                                    setStep("join");
                                    setGateOpen(true);
                                    return;
                                }

                                setGateOpen(true);
                                setGateLoading(true);

                                try {
                                    const savedMembers = await getTeamMembers(savedTeam);

                                    if (
                                        Array.isArray(savedMembers) &&
                                        savedMembers.length > 0
                                    ) {
                                        setUserList(
                                            savedMembers.map((name) => ({ name, removed: false }))
                                        );
                                        setStep("roster");
                                    } else {
                                        setStep("join");
                                    }
                                } catch (err) {
                                    console.error("KV名簿取得エラー:", err);
                                    setStep("join");
                                } finally {
                                    setGateLoading(false);
                                }
                            }}
                        >
                            設定変更
                        </button>



                        

                        {/* AI接続 */}
                        <div
                            className="hint"
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                marginLeft: 8,
                            }}
                        >
                            AI: {aiOK == null ? "…" : aiOK ? "OK" : "NG"}
                            <button
                                className="btn"
                                onClick={checkAI}
                                style={{ padding: "4px 8px" }}
                            >
                                再検
                            </button>
                        </div>

                        {/* ナビ */}
                        <div
                            className="navTabs"
                            style={{ display: "flex", gap: 6, alignItems: "center" }}
                        >
                            <button
                                className={view === "FRONT" ? "on" : ""}
                                onClick={() => setView("FRONT")}
                            >
                                Front
                            </button>
                            <button
                                className={view === "LOG" ? "on" : ""}
                                onClick={() => setView("LOG")}
                            >
                                Log
                            </button>
                            <button
                                className={view === "BOARD" ? "on" : ""}
                                onClick={() => setView("BOARD")}
                            >
                                Board
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
