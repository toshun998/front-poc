// ========== ダウンロード形式選択モーダル ==========
import { downloadAllLogsAsPDF, downloadAllLogsAsCSV } from "../utils/pdfExport";

/**
 * ダウンロード形式選択モーダル
 */
export default function DownloadSelectModal({
    dlSelectOpen,
    setDlSelectOpen,
    logsForDownload,
    teamName,
}) {
    if (!dlSelectOpen) return null;

    return (
        <div
            className="gate"
            onClick={(e) => {
                if (e.target.classList.contains("gate")) {
                    setDlSelectOpen(false);
                }
            }}
        >
            <div
                className="panel"
                style={{
                    maxWidth: 360,
                    padding: 20,
                    textAlign: "center",
                }}
            >
                <h3 style={{ marginBottom: 16 }}>
                    どちらの形式で出力しますか？
                </h3>

                <div
                    style={{
                        display: "flex",
                        gap: 12,
                        justifyContent: "center",
                        marginBottom: 16,
                    }}
                >
                    {/* CSV */}
                    <button
                        className="btn"
                        style={{ background: "#16a34a", color: "#fff" }}
                        onClick={() => {
                            if (!logsForDownload || logsForDownload.length === 0) {
                                alert(
                                    "出力できるログがありません。名簿を保存してください。"
                                );
                                return;
                            }

                            downloadAllLogsAsCSV(logsForDownload, teamName);
                            setDlSelectOpen(false);
                        }}
                    >
                        CSVでDL
                    </button>

                    {/* PDF */}
                    <button
                        className="btn"
                        style={{ background: "#ca1919ff", color: "#fff" }}
                        onClick={() => {
                            if (!logsForDownload || logsForDownload.length === 0) {
                                alert(
                                    "出力できるログがありません。名簿を保存してください。"
                                );
                                return;
                            }

                            downloadAllLogsAsPDF(logsForDownload, teamName);
                            setDlSelectOpen(false);
                        }}
                    >
                        PDFでDL
                    </button>
                </div>

                {/* 閉じる */}
                <div style={{ textAlign: "right" }}>
                    <button
                        className="btn"
                        onClick={() => setDlSelectOpen(false)}
                    >
                        閉じる
                    </button>
                </div>
            </div>
        </div>
    );
}
