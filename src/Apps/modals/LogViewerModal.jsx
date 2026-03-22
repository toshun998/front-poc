// ========== 個人ログ閲覧モーダル ==========
import { RenderFlags } from "../components/OutlierBadges";

/**
 * LOGを見るモーダル
 */
export default function LogViewerModal({
        isFacilitator, // ← 追加
    logOpen,
    setLogOpen,
    teamName,
    selectedLog,
    setSelectedLog,
    logSearch,
    setLogSearch,
    displayUsers,
    // 更新
    isRefreshing,
    refreshDone,
    refreshLogs,
    // ダウンロード
    userList,
    userLogs,
    buildAllLogsForDownload,
    setLogsForDownload,
    setDlSelectOpen,
    // 削除
    deleteTeam,
}) {
    if (!logOpen) return null;

    return (
        <div
            className="gate"
            onClick={(e) => {
                if (e.target.classList.contains("gate")) {
                    setLogOpen(false);
                    setSelectedLog(null);
                    setLogSearch("");
                }
            }}
        >
            <div
                className="panel"
                style={{
                    maxWidth: 800,
                    maxHeight: "80vh",
                    display: "flex",
                    flexDirection: "column",
                }}
            >
                {/* ヘッダー */}
                <div style={{ marginBottom: 8 }}>
                    <h3 style={{ margin: 0 }}>個人ログ（{teamName}）</h3>
                </div>

                {/* 一覧状態 */}
                {!selectedLog && (
                    <>
                        {/* 検索 + 更新 + DL + 削除 */}
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                marginBottom: 10,
                            }}
                        >
                            <input
                                type="text"
                                placeholder="名前で検索"
                                value={logSearch}
                                onChange={(e) => setLogSearch(e.target.value)}
                                style={{
                                    flex: 1,
                                    padding: "8px 10px",
                                    borderRadius: 8,
                                    border: "1px solid #ccc",
                                    fontSize: 14,
                                }}
                            />

                            {/* 🔄 最新取得 */}
                            <button
                                className="btn"
                                title="最新のログを取得"
                                style={{
                                    padding: "8px 10px",
                                    borderRadius: 8,
                                    background: "#f3f4f6",
                                    fontSize: 16,
                                    opacity: isRefreshing ? 0.6 : 1,
                                    pointerEvents: isRefreshing ? "none" : "auto",
                                }}
                                onClick={refreshLogs}
                            >
                                <span
                                    style={{
                                        display: "inline-block",
                                        animation:
                                            isRefreshing && !refreshDone
                                                ? "spin 1s linear infinite"
                                                : "none",
                                        color: refreshDone ? "#16a34a" : "inherit",
                                    }}
                                >
                                    {refreshDone ? "✔" : "⟳"}
                                </span>
                            </button>

{/* 📥 全員分DL - ファシリテーターのみ */}
{isFacilitator && (
    <button
        className="btn"
        style={{
            background: "#2563eb",
            color: "#fff",
            whiteSpace: "nowrap",
            padding: "8px 12px",
        }}
        onClick={() => {
            if (!userList || userList.length === 0) {
                alert("参加者がいません。");
                return;
            }
            const allLogs = buildAllLogsForDownload(userList, userLogs);
            setLogsForDownload(allLogs);
            setDlSelectOpen(true);
        }}
    >
        全員分DL
    </button>
)}

                            {/* 🗑 チーム記録を削除 */}
                            <button
                                className="btn"
                                style={{
                                    background: "#b91c1c",
                                    color: "#fff",
                                    whiteSpace: "nowrap",
                                    padding: "8px 12px",
                                }}
                                onClick={deleteTeam}
                            >
                                🗑 削除
                            </button>
                        </div>

                        {/* 👤 ユーザー一覧 */}
                        <div
                            style={{
                                flex: 1,
                                overflowY: "auto",
                                display: "flex",
                                flexDirection: "column",
                                gap: 8,
                            }}
                        >
                            {displayUsers
                                .filter((u) =>
                                    u.author
                                        .toLowerCase()
                                        .includes(logSearch.toLowerCase())
                                )
                                .map((u) => (
                                    <button
                                        key={u.userId}
                                        className="btn"
                                        style={{
                                            background: u.__empty ? "#f3f4f6" : "#e5e7eb",
                                            textAlign: "center",
                                        }}
                                        onClick={() => setSelectedLog({ ...u })}
                                    >
                                        {u.author}
                                        {u.__empty && "（未入力）"}
                                    </button>
                                ))}

                            {displayUsers.length === 0 && (
                                <div className="hint">参加者がいません</div>
                            )}
                        </div>
                    </>
                )}

                {/* 詳細表示 */}
                {selectedLog && (
                    <div
                        style={{
                            flex: 1,
                            overflowY: "auto",
                            fontSize: 13,
                            lineHeight: 1.7,
                            paddingRight: 6,
                        }}
                    >
                        <div
                            style={{
                                fontWeight: "bold",
                                fontSize: 14,
                                marginBottom: 6,
                            }}
                        >
                            {selectedLog.author} のログ
                        </div>

                        {selectedLog.__empty ? (
                            <div className="hint">
                                このユーザーのログはまだ作成されていません
                            </div>
) : (
                            <>
                                <div className="hint" style={{ marginBottom: 6 }}>
                                    最終更新：
                                    {selectedLog.updatedAt
                                        ? new Date(selectedLog.updatedAt).toLocaleString(
                                            "ja-JP"
                                        )
                                        : "—"}
                                </div>

                                <hr />

                                <div>
                                    <b>議題：</b>
                                    {selectedLog.topic || "—"}
                                </div>
                                <div>
                                    <b>ターゲット：</b>
                                    {selectedLog.target || "—"}
                                </div>
                                <div>
                                    <b>シナリオ：</b>
                                    {selectedLog.scenario || "—"}
                                </div>

                                <hr />

                                <div>
                                    <b>前提</b>
                                    <br />
                                    {selectedLog.premise || "—"}
                                    {selectedLog.flagsDetail?.premise && (
                                        <RenderFlags
                                            flagsForField={selectedLog.flagsDetail.premise}
                                            rawText={selectedLog.premise}
                                            field="premise"
                                            advice={selectedLog.flagsDetail.premise_advice}
                                            teamStats={{ H: 0, E: 0 }}
                                        />
                                    )}
                                </div>
                                <div>
                                    <b>困りごと</b>
                                    <br />
                                    {selectedLog.trouble || "—"}
                                    {selectedLog.flagsDetail?.trouble && (
                                        <RenderFlags
                                            flagsForField={selectedLog.flagsDetail.trouble}
                                            rawText={selectedLog.trouble}
                                            field="trouble"
                                            advice={selectedLog.flagsDetail.trouble_advice}
                                            teamStats={{ H: 0, E: 0 }}
                                        />
                                    )}
                                </div>
                                <div>
                                    <b>他の前提</b>
                                    <br />
                                    {selectedLog.otherPrem || "—"}
                                    {selectedLog.flagsDetail?.otherPrem && (
                                        <RenderFlags
                                            flagsForField={selectedLog.flagsDetail.otherPrem}
                                            rawText={selectedLog.otherPrem}
                                            field="otherPrem"
                                            advice={selectedLog.flagsDetail.otherPrem_advice}
                                            teamStats={{ H: 0, E: 0 }}
                                        />
                                    )}
                                </div>
                                <div>
                                    <b>原因</b>
                                    <br />
                                    {selectedLog.cause || "—"}
                                    {selectedLog.flagsDetail?.cause && (
                                        <RenderFlags
                                            flagsForField={selectedLog.flagsDetail.cause}
                                            rawText={selectedLog.cause}
                                            field="cause"
                                            advice={selectedLog.flagsDetail.cause_advice}
                                            teamStats={{ H: 0, E: 0 }}
                                        />
                                    )}
                                </div>
                                <div>
                                    <b>対策</b>
                                    <br />
                                    {selectedLog.idea || "—"}
                                    {selectedLog.flagsDetail?.idea && (
                                        <RenderFlags
                                            flagsForField={selectedLog.flagsDetail.idea}
                                            rawText={selectedLog.idea}
                                            field="idea"
                                            advice={selectedLog.flagsDetail.idea_advice}
                                            teamStats={{ H: 0, E: 0 }}
                                        />
                                    )}
                                </div>
                                <div>
                                    <b>自由記述</b>
                                    <br />
                                    {selectedLog.freeNote || "—"}
                                </div>

                                <hr />

                                <b>計画</b>
                                {Array.isArray(selectedLog.plans) &&
                                    selectedLog.plans.length > 0 ? (
                                    selectedLog.plans.map((p, i) => (
                                        <div
                                            key={i}
                                            style={{
                                                border: "1px solid #e5e7eb",
                                                borderRadius: 6,
                                                padding: 8,
                                                marginTop: 8,
                                                background: "#fafafa",
                                            }}
                                        >
                                            <div>
                                                <b>考案者：</b>
                                                {p.who || "—"}
                                            </div>
                                            <div>
                                                <b>実行者：</b>
                                                {p.executor || "—"}
                                            </div>
                                            <div>
                                                <b>何を：</b>
                                                {p.what || "—"}
                                            </div>
                                            <div>
                                                <b>どうやって：</b>
                                                {p.how || "—"}
                                            </div>
                                            <div>
                                                <b>良い予想：</b>
                                                {p.good || "—"}
                                            </div>
                                            <div>
                                                <b>悪い予想：</b>
                                                {p.bad || "—"}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="hint">計画はありません</div>
                                )}
                            </>
                        )}
                    </div>
                )}

                {/* フッター */}
                <div style={{ marginTop: 12, textAlign: "right" }}>
                    <button
                        className="btn"
                        onClick={() => {
                            if (selectedLog) {
                                setSelectedLog(null);
                            } else {
                                setLogOpen(false);
                                setLogSearch("");
                            }
                        }}
                    >
                        {selectedLog ? "戻る" : "閉じる"}
                    </button>
                </div>
            </div>
        </div>
    );
}
