// ========== スピナーコンポーネント ==========
// UIを簡単に調整できるよう、style propsで上書き可能

/**
 * スピナー（ローディング表示）
 * @param {object} props
 * @param {boolean} [props.fullScreen] - 全画面オーバーレイ表示
 * @param {number} [props.size] - スピナーサイズ (px)
 * @param {string} [props.color] - スピナーの色
 * @param {object} [props.style] - 追加のスタイル
 */
export default function Spinner({
    fullScreen = false,
    size = 100,
    color = "#3b82f6",
    style = {},
}) {
    const spinnerStyle = {
        width: size,
        height: size,
        border: `${Math.max(3, size / 10)}px solid #d1d5db`,
        borderTop: `${Math.max(3, size / 10)}px solid ${color}`,
        borderRadius: "50%",
        animation: "spin 0.9s linear infinite",
    };

    if (fullScreen) {
        return (
            <div
                style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    width: "100vw",
                    height: "100vh",
                    background: "rgba(255,255,255,0.6)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 9999,
                    backdropFilter: "blur(2px)",
                    pointerEvents: "auto",
                    ...style,
                }}
            >
                <div style={spinnerStyle} />
            </div>
        );
    }

    return (
        <div
            style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                padding: "24px 0",
                pointerEvents: "none",
                userSelect: "none",
                ...style,
            }}
        >
            <div style={spinnerStyle} />
        </div>
    );
}

/**
 * オーバーレイスピナー（親要素に対する相対配置）
 * @param {object} props
 * @param {number} [props.size] - スピナーサイズ (px)
 * @param {string} [props.color] - スピナーの色
 */
export function OverlaySpinner({ size = 100, color = "#3b82f6" }) {
    return (
        <div
            style={{
                position: "absolute",
                inset: 0,
                background: "rgba(255,255,255,0.7)",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                zIndex: 10,
                cursor: "not-allowed",
            }}
        >
            <div
                style={{
                    width: size,
                    height: size,
                    border: `${Math.max(3, size / 10)}px solid #d1d5db`,
                    borderTop: `${Math.max(3, size / 10)}px solid ${color}`,
                    borderRadius: "50%",
                    animation: "spin 0.9s linear infinite",
                }}
            />
        </div>
    );
}
