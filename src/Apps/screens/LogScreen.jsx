// ========== LOG画面 ==========
import { toText } from "../utils/helpers";
import { RenderFlags } from "../components/OutlierBadges";

/**
 * LOG画面 - ノート一覧表示
 */
export default function LogScreen({
    currentTeam,
    visibleNotes,
    teamStats,
    openNoise,
}) {
    return (
        <main
            className="container"
            style={{
                paddingBottom: 32,
                display: "flex",
                justifyContent: "center",
            }}
        >
            <section
                className="card"
                style={{
                    background: "#f8fafc",
                    maxWidth: 720,
                    width: "100%",
                    position: "relative",
                }}
            >
                <div
                    style={{
                        fontWeight: 700,
                        marginBottom: 12,
                        fontSize: "1.1rem",
                        textAlign: "center",
                    }}
                >
                    Log（{toText(currentTeam)}）
                </div>

                <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                    {visibleNotes.map((n) => (
                        <li
                            key={n.id}
                            style={{
                                background: "#fff",
                                border: "1px solid #e2e8f0",
                                borderRadius: 12,
                                padding: "20px 28px",
                                marginBottom: 20,
                                lineHeight: 1.7,
                                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                            }}
                        >
                            {/* 🕒 ヘッダー */}
                            <div
                                className="hint"
                                style={{
                                    marginBottom: 6,
                                    fontSize: ".9rem",
                                    color: "#64748b",
                                    textAlign: "center",
                                }}
                            >
                                🕒 {new Date(n.createdAt).toLocaleTimeString()} ｜{" "}
                                {toText(n.team)} / {toText(n.author)}
                            </div>

                            {/* 💬 質問 */}
                            <div style={{ marginBottom: 10 }}>
                                <b style={{ color: "#1e3a8a" }}>Q:</b> {toText(n.q)}
                                <div
                                    className="hint"
                                    style={{ marginTop: 2, color: "#475569" }}
                                >
                                    S: {toText(n.scenario)}
                                </div>
                            </div>

                            {/* 🧩 各セクション */}
                            {[
                                ["困っている具体例", n.trouble, "trouble"],
                                ["前提の確認", n.premise, "premise"],
                                ["他の前提", n.otherPrem, "otherPrem"],
                                ["原因さがし", n.cause, "cause"],
                                ["対策のアイデア", n.idea, "idea"],
                            ].map(([label, value, key]) =>
                                value ? (
                                    <div
                                        key={key}
                                        style={{
                                            marginBottom: 14,
                                            padding: "10px 12px",
                                            background: "#f9fafb",
                                            borderRadius: 8,
                                            border: "1px solid #e5e7eb",
                                        }}
                                    >
                                        <div style={{ marginBottom: 6 }}>
                                            <b style={{ color: "#0f172a" }}>{label}:</b>{" "}
                                            <span style={{ color: "#111827" }}>
                                                {toText(value)}
                                            </span>
                                        </div>

                                        <div style={{ marginTop: 4 }}>
                                            <RenderFlags
                                                flagsForField={n.flagsDetail?.[key]}
                                                rawText={toText(value)}
                                                field={key}
                                                advice={toText(n.flagsDetail?.[`${key}_advice`])}
                                                teamStats={teamStats}
                                            />
                                        </div>
                                    </div>
                                ) : null
                            )}

                            {/* 📘 計画と実行 */}
                            {Array.isArray(n.plans) && n.plans.length > 0 ? (
                                <div
                                    style={{
                                        background: "#f1f5f9",
                                        borderRadius: 8,
                                        padding: "10px 12px",
                                        marginTop: 12,
                                        marginBottom: 8,
                                        fontSize: ".9rem",
                                        color: "#334155",
                                    }}
                                >
                                    <b>計画と実行</b>
                                    {n.plans.map((p, i) => (
                                        <div
                                            key={i}
                                            style={{
                                                background: "#fff",
                                                borderRadius: 6,
                                                padding: "8px 10px",
                                                marginTop: 6,
                                                border: "1px solid #e2e8f0",
                                            }}
                                        >
                                            <div style={{ fontWeight: 600, marginBottom: 4 }}>
                                                ({i + 1}){" "}
                                                {p.who
                                                    ? `${toText(p.who)}が考えた対策`
                                                    : "（誰が考えたか未入力）"}
                                            </div>
                                            <div>
                                                誰が実行: {toText(p.executor) || "—"} ／ 何:{" "}
                                                {toText(p.what) || "—"} ／ どうやって:{" "}
                                                {toText(p.how) || "—"}
                                            </div>
                                            <div>
                                                良い結果の予想: {toText(p.good) || "—"} ／
                                                良くない結果の予想: {toText(p.bad) || "—"}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div
                                    style={{
                                        background: "#f1f5f9",
                                        borderRadius: 8,
                                        padding: "10px 12px",
                                        marginTop: 12,
                                        marginBottom: 8,
                                        fontSize: ".9rem",
                                        color: "#334155",
                                    }}
                                >
                                    <div>
                                        <b>計画と実行:</b> 誰={toText(n.who) || "—"} ／ 何=
                                        {toText(n.what) || "—"} ／ どうやって=
                                        {toText(n.how) || "—"}
                                    </div>
                                    <div>
                                        結果（良い予想）: {toText(n.good) || "—"} ／
                                        結果（良くない予想）: {toText(n.bad) || "—"}
                                    </div>
                                </div>
                            )}

                            {/* 🎯 ボタン行 */}
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "flex-end",
                                    marginTop: 10,
                                }}
                            >
                                <button
                                    className="btn"
                                    onClick={() => openNoise(n)}
                                    style={{
                                        background: "#bfe5ff",
                                        color: "#0369a1",
                                        fontWeight: 600,
                                        padding: "15px 15px",
                                        boxShadow: "0 4px 10px rgba(0,0,0,0.3)",
                                    }}
                                >
                                    AIからのヒント
                                </button>
                            </div>
                        </li>
                    ))}

                    {!visibleNotes.length && (
                        <li
                            className="hint"
                            style={{
                                textAlign: "center",
                                color: "#94a3b8",
                                padding: 20,
                                background: "#fff",
                                borderRadius: 8,
                            }}
                        >
                            （{toText(currentTeam)} のログはまだありません）
                        </li>
                    )}
                </ul>
            </section>
        </main>
    );
}
