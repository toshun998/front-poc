// ========== マイクボタンコンポーネント ==========

/**
 * 音声入力ボタン
 * @param {object} props
 * @param {boolean} props.listening - 現在録音中か
 * @param {function} props.onClick - クリック時のハンドラ
 * @param {number} [props.size] - ボタンサイズ (px)
 * @param {object} [props.style] - 追加スタイル
 */
export default function MicButton({
    listening,
    onClick,
    size = 30,
    style = {},
}) {
    return (
        <button
            onClick={onClick}
            style={{
                width: size + 6,
                height: size,
                background: listening ? "#f87171" : "#e5e7eb",
                color: listening ? "#fff" : "#111",
                fontSize: "1.05rem",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                transition: "all 0.25s ease",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                ...style,
            }}
            title="音声で入力"
        >
            {listening ? "🎙️" : "🎤"}
        </button>
    );
}
