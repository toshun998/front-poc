// ========== PDF/CSVエクスポート ==========
import { jsPDF } from "jspdf";
import "../../Assets/NotoSansJP-Regular-normal";

const MARGIN_X = 8;
const VALUE_X = 20;
const PAGE_BOTTOM = 285;

/** PDF用行書き出し */
export function writeLine(pdf, text, yRef, size = 11, x = MARGIN_X) {
    const content = String(text ?? "");
    pdf.setFontSize(size);
    pdf.setFont("NotoSansJP-Regular", "normal");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const availableTextWidth = pageWidth - x - MARGIN_X;
    const lines = pdf.splitTextToSize(content, availableTextWidth);

    for (const line of lines) {
        if (yRef.y + size > PAGE_BOTTOM) {
            pdf.addPage();
            yRef.y = 15;
        }
        pdf.text(line, x, yRef.y);
        yRef.y += size;
    }
}

/** キャンバスのテキスト折り返し */
export function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(/(\\s+|。|、|，|,)/);
    let line = "";
    for (let n = 0; n < words.length; n++) {
        const test = line + words[n],
            metrics = ctx.measureText(test);
        if (metrics.width > maxWidth && n > 0) {
            ctx.fillText(line, x, y);
            line = words[n];
            y += lineHeight;
        } else line = test;
    }
    ctx.fillText(line, x, y);
    return y;
}

/** 個別ログPDF出力 */
export function exportLogPdf(payload = {}) {
    const pdf = new jsPDF({ unit: "mm", format: "a4" });
    pdf.setFont("NotoSansJP-Regular", "normal");

    const yRef = { y: 15 };
    const { meta = {}, state = {} } = payload;

    writeLine(pdf, "思考アスレチック 実行ログ", yRef, 16);
    yRef.y += 3;

    writeLine(pdf, "【基本情報】", yRef, 12);
    writeLine(pdf, `チーム：${meta.team ?? "—"}`, yRef, 11, VALUE_X);
    writeLine(pdf, `ユーザー：${meta.user ?? "—"}`, yRef, 11, VALUE_X);
    writeLine(pdf, `日時：${meta.date ?? "—"}`, yRef, 11, VALUE_X);
    yRef.y += 3;

    writeLine(pdf, "【議題】", yRef, 12);
    writeLine(pdf, state.topic ?? "—", yRef, 11, VALUE_X);
    yRef.y += 3;

    writeLine(pdf, "【設定】", yRef, 12);
    writeLine(pdf, `ターゲット：${state.target ?? "—"}`, yRef, 11, VALUE_X);
    writeLine(pdf, `シナリオ：${state.scenario ?? "—"}`, yRef, 11, VALUE_X);
    yRef.y += 3;

    writeLine(pdf, "【思考整理】", yRef, 12);
    writeLine(pdf, `困りごと：${state.trouble ?? "—"}`, yRef, 11, VALUE_X);
    writeLine(pdf, `前提：${state.premise ?? "—"}`, yRef, 11, VALUE_X);
    writeLine(pdf, `他の前提：${state.otherPrem ?? "—"}`, yRef, 11, VALUE_X);
    writeLine(pdf, `原因：${state.cause ?? "—"}`, yRef, 11, VALUE_X);
    writeLine(pdf, `対策：${state.idea ?? "—"}`, yRef, 11, VALUE_X);

    // 👇ここを変更🔥（見出しじゃなく1行形式）
    writeLine(pdf, `自由記述：${state.freeNote ?? "—"}`, yRef, 11, VALUE_X);

    pdf.addPage();
    yRef.y = 15;

    writeLine(pdf, "【計画】", yRef, 14);
    yRef.y += 4;

    const PLAN_BODY_X = MARGIN_X + 10;
    const COL_EXEC = PLAN_BODY_X;
    const COL_WHAT = PLAN_BODY_X + 32;
    const COL_HOW = PLAN_BODY_X + 80;

    (state.plans || []).forEach((p = {}, i) => {
        pdf.setFontSize(12);
        pdf.text(`(${i + 1}) ${p.who || "—"}`, PLAN_BODY_X, yRef.y);
        yRef.y += 6;

        pdf.setFontSize(11);
        pdf.text(`実行者：${p.executor || "—"}`, COL_EXEC, yRef.y);
        pdf.text(`目的：${p.what || "—"}`, COL_WHAT, yRef.y);
        pdf.text(`方法：${p.how || "—"}`, COL_HOW, yRef.y);
        yRef.y += 6;

        if (p.good) {
            pdf.text(`良い予想：${p.good}`, PLAN_BODY_X, yRef.y);
            yRef.y += 5;
        }
        if (p.bad) {
            pdf.text(`悪い予想：${p.bad}`, PLAN_BODY_X, yRef.y);
            yRef.y += 5;
        }

        yRef.y += 4;
    });

    const safe = (s) => String(s || "").replace(/[\\/:*?"<>|]/g, "_").trim();
    const team = safe(meta.team) || "team";
    const user = safe(meta.user) || "user";
    const date = safe(meta.date)?.replace(/[^\d]/g, "") || "";

    const filename = date ? `${team}_${user}_${date}.pdf` : `${team}_${user}.pdf`;

    pdf.save(filename);
}

/** 全員分LOG PDF */
export function downloadAllLogsAsPDF(userLogs, teamName) {
    if (!userLogs?.length) {
        alert("ログがありません");
        return;
    }

    const pdf = new jsPDF({ unit: "mm", format: "a4" });
    const yRef = { y: 15 };

    writeLine(pdf, `個人ログ一覧（${teamName}）`, yRef, 16, 15);
    yRef.y += 4;

    userLogs.forEach((log) => {
        const name = log.author || log.userId || "未入力";

        writeLine(pdf, `■ ${name}`, yRef, 13, 15);

        const baseFields = [
            ["議題", log.topic],
            ["ターゲット", log.target],
            ["シナリオ", log.scenario],
            ["前提", log.premise],
            ["困りごと", log.trouble],
            ["他の前提", log.otherPrem],
            ["原因", log.cause],
            ["対策", log.idea],
            ["自由記述", log.freeNote], // ←追加🔥
        ];

        baseFields.forEach(([label, value]) => {
            writeLine(pdf, `${label}：${value || "—"}`, yRef, 11, 20);
        });

        if (Array.isArray(log.plans) && log.plans.length > 0) {
            log.plans.forEach((p, i) => {
                yRef.y += 3;
                writeLine(pdf, `【計画${i + 1}】`, yRef, 11, 20);

                [
                    ["考案者", p.who],
                    ["実行者", p.executor],
                    ["何を", p.what],
                    ["どうやって", p.how],
                    ["良い予想", p.good],
                    ["悪い予想", p.bad],
                ].forEach(([label, value]) => {
                    writeLine(pdf, `${label}：${value || "—"}`, yRef, 11, 25);
                });
            });
        } else {
            yRef.y += 3;
            writeLine(pdf, "【計画】—", yRef, 11, 20);
        }

        yRef.y += 5;
    });

    pdf.save(`logs_${teamName}.pdf`);
}

/** 全員分LOG CSV */
export function downloadAllLogsAsCSV(userLogs, teamName) {
    if (!userLogs?.length) {
        alert("ログがありません");
        return;
    }

    const users = userLogs.map((l) => l.author || l.userId || "未入力");

    const maxPlans = Math.max(
        ...userLogs.map((l) => (Array.isArray(l.plans) ? l.plans.length : 0)),
        0
    );

    const rows = [];
    rows.push(["ユーザー名", ...users]);

    const baseFields = [
        ["議題", "topic"],
        ["ターゲット", "target"],
        ["シナリオ", "scenario"],
        ["前提", "premise"],
        ["困りごと", "trouble"],
        ["他の前提", "otherPrem"],
        ["原因", "cause"],
        ["対策", "idea"],
        ["自由記述", "freeNote"], // ←追加🔥
    ];

    baseFields.forEach(([label, key]) => {
        rows.push([label, ...userLogs.map((l) => l[key] || "—")]);
    });

    for (let i = 0; i < maxPlans; i++) {
        [
            ["考案者", "who"],
            ["実行者", "executor"],
            ["何を", "what"],
            ["どうやって", "how"],
            ["良い予想", "good"],
            ["悪い予想", "bad"],
        ].forEach(([label, key]) => {
            rows.push([
                `計画${i + 1}_${label}`,
                ...userLogs.map((l) => l.plans?.[i]?.[key] || "—"),
            ]);
        });
    }

    const csv = rows
        .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
        .join("\n");

    const blob = new Blob(["\uFEFF" + csv], {
        type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `logs_${teamName}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}