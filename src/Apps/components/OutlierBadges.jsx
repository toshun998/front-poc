// ========== 偏りバッジ＆フラグ表示 ==========
import { useState } from "react";
import { OUTLIER, sortOutlierFlags } from "../utils/helpers";
import { filterOutlierFlags } from "../utils/outlierLogic";

/**
 * 偏りバッジ一覧
 * @param {object} props
 * @param {string[]} props.flags - フラグ文字列の配列
 */
export function OutlierBadges({ flags = [] }) {
    if (!Array.isArray(flags) || flags.length === 0) return null;
    // ソート済みのフラグを表示
    const sortedFlags = sortOutlierFlags(flags);
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
            {sortedFlags.map((f, i) => {
                const m = OUTLIER[f] || { icon: "🙂", code: "", color: "#94a3b8", desc: String(f) };

                const descText = Array.isArray(m.desc)
                    ? m.desc[Math.floor(Math.random() * m.desc.length)]
                    : m.desc;

                return (
                    <div key={`${f}-${i}`} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: 22,
                                height: 22,
                                borderRadius: "50%",
                                background: m.color,
                                color: "#fff",
                                fontSize: 13,
                                flexShrink: 0,
                            }}
                        >
                            {m.icon}
                        </span>
                        <span style={{ fontWeight: "bold", marginRight: 4 }}>{m.code}</span>
                        <span style={{ fontSize: 13, color: "#374151" }}>
                            {descText}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

/**
 * フラグ＋アドバイス表示
 * @param {object} props
 * @param {string[]} props.flagsForField - フィールドのフラグ
 * @param {string} props.rawText - 元テキスト
 * @param {string} props.field - フィールド名
 * @param {string} props.advice - アドバイステキスト
 * @param {object} props.teamStats - チーム統計 {H, E}
 */
export function RenderFlags({ flagsForField, rawText, field, advice, teamStats }) {
    if (!rawText || rawText.trim().length === 0) return null;

    const filtered = filterOutlierFlags(flagsForField, field, rawText, teamStats);
    const [open, setOpen] = useState(false);

    return (
        <div style={{ marginTop: 4 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <OutlierBadges flags={filtered} />

                {advice && (
                    <button
                        onClick={() => setOpen(!open)}
                        style={{
                            background: "none",
                            border: "none",
                            color: "#0ea5e9",
                            cursor: "pointer",
                            fontSize: ".8rem",
                            padding: 0,
                        }}
                    >
                        {open ? "▲ アドバイスを閉じる" : "▼ アドバイスを見る"}
                    </button>
                )}
            </div>

            {open && advice && (
                <div
                    className="hint"
                    style={{
                        background: "#f8fafc",
                        borderRadius: 6,
                        padding: "6px 8px",
                        border: "1px solid #e2e8f0",
                        lineHeight: 1.5,
                        marginTop: 4,
                    }}
                >
                    💡 {advice}
                </div>
            )}
        </div>
    );
}
