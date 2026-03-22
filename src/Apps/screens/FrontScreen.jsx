// ========== FRONT画面 ==========
import { BrainShower } from "./BrainShower";
import MicButton from "../components/MicButton";
import Spinner from "../components/Spinner";
import { defaultStakeholdersFor } from "../utils/helpers";
import { getTargets } from "../../FrontServer/personaApi";
import { useState } from "react";
/**
 * FRONT画面 - メインの入力フォーム（page1 + page2）
 */
export default function FrontScreen({
    // ページ制御
    page,
    setPage,
    // 議題
    topic,
    setTopic,
    listening,
    startListening,
    // 当事者選定
    targetList,
    setTargetList,
    selectedTarget,
    setSelectedTarget,
    targetListening,
    startTargetListening,
    loadingTargets,
    setLoadingTargets,
    aiMode,
    setAiMode,
    // シナリオ
    scenario,
    setScenario,
    scenarioDraft,
    setScenarioDraft,
    scenarioFixed,
    setScenarioFixed,
    scenarioListening,
    startScenarioListening,
    // 対策入力
    premise,
    setPremise,
    trouble,
    setTrouble,
    otherPrem,
    setOtherPrem,
    cause,
    setCause,
    idea,
    setIdea,
    freeNote,
    setFreeNote,
    // 音声入力（各フィールド）
    premiseListening,
    startPremiseListening,
    troubleListening,
    startTroubleListening,
    otherPremListening,
    startOtherPremListening,
    causeListening,
    startCauseListening,
    ideaListening,
    startIdeaListening,
    // 計画
    plans,
    setPlans,
    listeningPlan,
    startPlanListening,
    goodListening,
    startGoodListening,
    badListening,
    startBadListening,
    userList,
    // 送信
    send,
    sending,

    
}) {
        // 自由記述

    const [freeNoteListening, setFreeNoteListening] = useState(false);
    const startFreeNoteListening = () => {
    try {
        const SpeechRecognition =
            window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            alert("このブラウザは音声入力に対応していません");
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = "ja-JP";
        recognition.interimResults = false;

        setFreeNoteListening(true);

        recognition.start();

        recognition.onresult = (event) => {
            const text = event.results[0][0].transcript;
            setFreeNote((prev) => prev + text); // ←追記型🔥
        };

        recognition.onend = () => {
            setFreeNoteListening(false);
        };

        recognition.onerror = () => {
            setFreeNoteListening(false);
        };
    } catch (e) {
        console.error(e);
        setFreeNoteListening(false);
    }
};
    // --- Page1 リセット ---
const resetPage1 = () => {
    const ok = window.confirm("Page1の入力内容をすべてリセットしますか？");
    if (!ok) return;

    setTopic("");
    setSelectedTarget("");
    setTargetList(defaultStakeholdersFor("")); // 初期状態に戻す
    setAiMode(false);

    setScenario("");
    setScenarioDraft("");
    setScenarioFixed(false);
};

// --- Page2 リセット ---
const resetPage2 = () => {
    const ok = window.confirm("Page2の入力内容をすべてリセットしますか？");
    if (!ok) return;

    setTrouble("");
    setPremise("");
    setOtherPrem("");
    setCause("");
    setIdea("");
    setFreeNote(""); // ← これ追加🔥

    setPlans([
        { who: "", executor: "", what: "", how: "", good: "", bad: "" },
    ]);
};
    return (
        <main
            className="container"
            style={{
                paddingBottom: 40,
                position: "relative",
                overflow: "hidden",
            }}
        >
            {/* 🧠 背景アニメーション */}
            <div
                style={{
                    position: "fixed",
                    inset: 0,
                    zIndex: 0,
                    pointerEvents: "none",
                    overflow: "hidden",
                }}
            >
                <BrainShower />
            </div>

            <section
                style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 20,
                    position: "relative",
                    zIndex: 1,
                }}

                
            >

                
                {page === 1 && (
                    <>
                        {/* Step 1: 議題 */}
                        <div className="card" id="card1">
                            <h3 style={{ marginBottom: 8 }}>① 議題を決めよう</h3>

                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <div style={{ fontWeight: 700 }}>議題</div>

                                <input
                                    value={topic}
                                    onChange={(e) => setTopic(e.target.value)}
                                    placeholder="話し合いたいテーマを書こう"
                                    style={{
                                        flex: "1",
                                        padding: "6px 8px",
                                        borderRadius: "6px",
                                        border: "1px solid #d1d5db",
                                        background: "#fff",
                                    }}
                                />

                                <MicButton
                                    listening={listening}
                                    onClick={startListening}
                                    size={32}
                                    style={{ width: "42px" }}
                                />
                            </div>
                        </div>

                        {/* Step 2: 助ける対象 */}
                        <div className="card" id="card2">
                            <h3 style={{ marginBottom: 8 }}>② 助けたい人を選ぼう</h3>

                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                {targetList.map((n) => (
                                    <button
                                        key={n}
                                        className={selectedTarget === n ? "btnDark" : "btn"}
                                        onClick={() => setSelectedTarget(n)}
                                    >
                                        {n}
                                    </button>
                                ))}
                            </div>

                            <div
                                style={{
                                    display: "flex",
                                    gap: 6,
                                    marginTop: 8,
                                    alignItems: "center",
                                }}
                            >
                                <input
                                    id="freeTarget"
                                    placeholder="自由に追加"
                                    style={{
                                        width: "240px",
                                        padding: "10px 12px",
                                        fontSize: "1rem",
                                        border: "1px solid #cbd5e1",
                                        borderRadius: "10px",
                                    }}
                                />

                                <MicButton
                                    listening={targetListening}
                                    onClick={startTargetListening}
                                    size={42}
                                />

                                <button
                                    className="btn"
                                    onClick={() => {
                                        const el = document.getElementById("freeTarget");
                                        const v = String(el.value || "").trim();
                                        if (!v) return;
                                        setSelectedTarget(v);
                                        el.value = "";
                                    }}
                                >
                                    追加
                                </button>

                                <div
                                    style={{
                                        display: "flex",
                                        gap: 6,
                                        alignItems: "center",
                                        marginLeft: 6,
                                    }}
                                >
                                    <button
                                        className={`btn ${loadingTargets ? "btnDark" : ""}`}
                                        disabled={loadingTargets}
                                        onClick={async () => {
                                            if (!topic || topic.trim() === "") {
                                                alert("議題を入力してください。");
                                                return;
                                            }

                                            setLoadingTargets(true);
                                            try {
                                                const res = await getTargets(topic);
                                                if (res?.targets?.length) {
                                                    setTargetList(res.targets);
                                                    setAiMode(true);
                                                }
                                            } catch (err) {
                                                console.error(err);
                                                alert("AI生成に失敗しました。");
                                            } finally {
                                                setLoadingTargets(false);
                                            }
                                        }}
                                        title="AIが議題に応じた候補を生成"
                                        style={{
                                            fontWeight: 600,
                                            letterSpacing: "0.02em",
                                            marginLeft: "-6px",
                                        }}
                                    >
                                        {loadingTargets ? "生成中..." : "AIで生成"}
                                    </button>

                                    {aiMode && (
                                        <button
                                            className="btn"
                                            onClick={() => {
                                                const restored = defaultStakeholdersFor(topic);
                                                setTargetList(restored);
                                                setAiMode(false);
                                            }}
                                            title="元の候補に戻す"
                                        >
                                            候補を戻す
                                        </button>
                                    )}

                                    {loadingTargets && (
                                        <div
                                            style={{
                                                width: 22,
                                                height: 22,
                                                border: "3px solid #d1d5db",
                                                borderTopColor: "#3b82f6",
                                                borderRadius: "50%",
                                                animation: "spin 0.9s linear infinite",
                                            }}
                                        />
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Step 3: シナリオ */}
                        <div className="card" id="card3">
                            <h3 style={{ marginBottom: 8 }}>③ シナリオを考えよう</h3>

                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 8,
                                    marginBottom: 6,
                                    flexWrap: "wrap",
                                }}
                            >
                                <div style={{ fontWeight: 700 }}>
                                    救助シナリオ {scenarioFixed ? "" : "（未決定）"}
                                </div>

                                <MicButton
                                    listening={scenarioListening}
                                    onClick={startScenarioListening}
                                />

                                {selectedTarget &&
                                    (scenarioFixed ? (
                                        <button
                                            className="btn"
                                            onClick={() => setScenarioFixed(false)}
                                        >
                                            修正する
                                        </button>
                                    ) : (
                                        <>
                                            <button
                                                className="btn"
                                                onClick={() => setScenarioDraft(scenario)}
                                            >
                                                原案に戻す
                                            </button>
                                            <button
                                                className="btnDark"
                                                onClick={() => {
                                                    setScenario(scenarioDraft);
                                                    setScenarioFixed(true);
                                                }}
                                            >
                                                決定
                                            </button>
                                        </>
                                    ))}
                            </div>

                            {scenarioFixed ? (
                                <pre
                                    style={{
                                        whiteSpace: "pre-wrap",
                                        background: "#f8fafc",
                                        border: "1px solid #e2e8f0",
                                        borderRadius: 6,
                                        padding: 8,
                                    }}
                                >
                                    {scenario}
                                </pre>
                            ) : (
                                <textarea
                                    rows={3}
                                    value={scenarioDraft}
                                    onChange={(e) => setScenarioDraft(e.target.value)}
                                    placeholder="どんな状況で、どんなふうに助けるのか書いてみよう"
                                    style={{
                                        width: "100%",
                                        fontSize: "0.9rem",
                                        padding: "6px",
                                        borderRadius: "6px",
                                        border: "1px solid #d1d5db",
                                    }}
                                />
                            )}
                        </div>

<div style={{ display: "flex", justifyContent: "space-between" }}>
    <button
        className="btn"
        onClick={resetPage1}
        style={{ background: "#fee2e2", color: "#b91c1c" }}
    >
        Page1リセット
    </button>

<button className="btnDark" onClick={() => {
    if (!scenarioFixed) {
        alert("シナリオを決定してください。");
        return;
    }
    setPage(2);
}}>
    次へ
</button>
</div>
                    </>
                )}

                {page === 2 && (
                    <>
                        {/* Step 4: 対策・計画 */}
                        <div className="card">
                            <h3 style={{ marginBottom: 8 }}>④ 対策を考えよう</h3>

                            {/* テキストエリアセクション（共通パターン） */}
                            {[
                                {
                                    label: "困っている内容の具体例",
                                    value: trouble,
                                    setValue: setTrouble,
                                    mic: { listening: troubleListening, start: startTroubleListening },
                                    placeholder: "どんなことで困っているのかな？",
                                },
                                {
                                    label: "前提の確認（今の状況を掘り起こす）",
                                    value: premise,
                                    setValue: setPremise,
                                    mic: { listening: premiseListening, start: startPremiseListening },
                                    placeholder: "みんなが『当たり前』と思っていることは何かな？",
                                },
                                {
                                    label: "他の前提（別の見方があるとしたら）",
                                    value: otherPrem,
                                    setValue: setOtherPrem,
                                    mic: { listening: otherPremListening, start: startOtherPremListening },
                                    placeholder: "他にどんな見方があるかな？",
                                },
                                {
                                    label: "原因さがし（なぜ、その困りごとが起こるのかな？）",
                                    value: cause,
                                    setValue: setCause,
                                    mic: { listening: causeListening, start: startCauseListening },
                                    placeholder: "どうしてそうなっているのかな？",
                                },
                                {
                                    label: "対策のアイデア（どうすれば解決できるかな？）",
                                    value: idea,
                                    setValue: setIdea,
                                    mic: { listening: ideaListening, start: startIdeaListening },
                                    placeholder: "解決のためにできることは？",
                                },
                                
                                    
   {
    label: "自由記述（その他気づいたこと・補足など）",
    value: freeNote,
    setValue: setFreeNote,
    mic: { listening: freeNoteListening, start: startFreeNoteListening },
    placeholder: "なんでも自由に書いてOK",
},


                            ].map(({ label, value, setValue, mic, placeholder }) => (
                                <div key={label}>
                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 8,
                                            marginTop: 8,
                                        }}
                                    >
                                        <label style={{ fontWeight: 700 }}>{label}</label>
                                        <MicButton
                                            listening={mic.listening}
                                            onClick={mic.start}
                                            style={{ transform: "translateY(-2px)" }}
                                        />
                                    </div>
                                    <textarea
                                        value={value}
                                        onChange={(e) => setValue(e.target.value)}
                                        rows={1}
                                        placeholder={placeholder}
                                        style={{
                                            width: "100%",
                                            fontSize: "0.9rem",
                                            padding: "6px",
                                            textAlign: value ? "left" : "right",
                                            color: value ? "#111" : "#9ca3af",
                                        }}
                                    />
                                </div>
                            ))}

                            {/* ⑤ 計画と実行 */}
                            <h3
                                style={{
                                    margin: "12px 0 6px",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                }}
                            >
                                ⑤ 計画と実行
                                <button
                                    className="btn"
                                    onClick={() =>
                                        setPlans((prev) => [
                                            ...prev,
                                            { who: "", executor: "", what: "", how: "", good: "", bad: "" },
                                        ])
                                    }
                                    style={{
                                        marginLeft: "4px",
                                        padding: "4px 8px",
                                        fontSize: "0.8rem",
                                        background: "#e5e7eb",
                                        borderRadius: 7,
                                        color: "#2563eb",
                                    }}
                                >
                                    ＋
                                </button>

                                {plans.length > 1 && (
                                    <button
                                        className="btn"
                                        onClick={() => setPlans((prev) => prev.slice(0, -1))}
                                        style={{
                                            marginLeft: 4,
                                            padding: "4px 8px",
                                            fontSize: "1rem",
                                            width: "29px",
                                            height: "25px",
                                            background: "#fee2e2",
                                            color: "#b91c1c",
                                            borderRadius: 7,
                                        }}
                                    >
                                        −
                                    </button>
                                )}
                            </h3>

                            {plans.map((plan, i) => (
                                <div
                                    key={i}
                                    style={{
                                        border: "1px solid #e5e7eb",
                                        borderRadius: 8,
                                        padding: 10,
                                        marginBottom: 10,
                                        background: "#f9fafb",
                                    }}
                                >
                                    {/* 見出し行 */}
                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 8,
                                            marginBottom: 6,
                                        }}
                                    >
                                        <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>
                                            ({i + 1})
                                        </div>

                                        <div style={{ position: "relative" }}>
                                            <input
                                                list={`user-options-${i}`}
                                                placeholder="誰が考えた？"
                                                value={String(plan.who || "")}
                                                onChange={(e) =>
                                                    setPlans((prev) =>
                                                        prev.map((p, idx) =>
                                                            idx === i ? { ...p, who: e.target.value } : p
                                                        )
                                                    )
                                                }
                                                style={{
                                                    width: 150,
                                                    padding: "4px 6px",
                                                    fontSize: "0.9rem",
                                                    border: "1px solid #d1d5db",
                                                    borderRadius: 6,
                                                }}
                                            />
                                            <datalist id={`user-options-${i}`}>
                                                {(userList || [])
                                                    .filter((u) => u && !u.removed)
                                                    .map((u, idx) => (
                                                        <option key={idx} value={String(u.name)} />
                                                    ))}
                                            </datalist>
                                        </div>

                                        <span style={{ fontSize: "0.9rem", color: "#374151" }}>
                                            が考えた対策
                                        </span>
                                    </div>

                                    {/* 実行内容 */}
                                    <div
                                        style={{
                                            position: "relative",
                                            display: "flex",
                                            alignItems: "center",
                                            marginTop: 8,
                                            background: "#f3f4f6",
                                            borderRadius: "6px",
                                            paddingLeft: "38px",
                                        }}
                                    >
                                        <MicButton
                                            listening={listeningPlan}
                                            onClick={startPlanListening}
                                            style={{
                                                position: "absolute",
                                                left: "0px",
                                                top: "50%",
                                                transform: "translateY(-50%)",
                                            }}
                                        />

                                        <div
                                            style={{
                                                display: "grid",
                                                gap: 6,
                                                gridTemplateColumns: "repeat(3, 1fr)",
                                                width: "100%",
                                            }}
                                        >
                                            <input
                                                placeholder="誰が"
                                                value={String(plan.executor || "")}
                                                onChange={(e) =>
                                                    setPlans((prev) =>
                                                        prev.map((p, idx) =>
                                                            idx === i
                                                                ? { ...p, executor: e.target.value }
                                                                : p
                                                        )
                                                    )
                                                }
                                            />
                                            <input
                                                placeholder="何を"
                                                value={String(plan.what || "")}
                                                onChange={(e) =>
                                                    setPlans((prev) =>
                                                        prev.map((p, idx) =>
                                                            idx === i ? { ...p, what: e.target.value } : p
                                                        )
                                                    )
                                                }
                                            />
                                            <input
                                                placeholder="どうやって"
                                                value={String(plan.how || "")}
                                                onChange={(e) =>
                                                    setPlans((prev) =>
                                                        prev.map((p, idx) =>
                                                            idx === i ? { ...p, how: e.target.value } : p
                                                        )
                                                    )
                                                }
                                            />
                                        </div>
                                    </div>

                                    {/* 良い結果 */}
                                    <div
                                        style={{
                                            position: "relative",
                                            display: "flex",
                                            alignItems: "center",
                                            marginTop: 8,
                                            background: "#f3f4f6",
                                            borderRadius: "6px",
                                            paddingLeft: "38px",
                                        }}
                                    >
                                        <MicButton
                                            listening={goodListening}
                                            onClick={startGoodListening}
                                            style={{
                                                position: "absolute",
                                                left: "0px",
                                                top: "50%",
                                                transform: "translateY(-50%)",
                                            }}
                                        />
                                        <input
                                            placeholder="良い結果の予想"
                                            value={String(plan.good || "")}
                                            onChange={(e) =>
                                                setPlans((prev) =>
                                                    prev.map((p, idx) =>
                                                        idx === i ? { ...p, good: e.target.value } : p
                                                    )
                                                )
                                            }
                                            style={{
                                                width: "100%",
                                                padding: "6px",
                                                fontSize: "0.9rem",
                                                border: "1px solid #d1d5db",
                                                borderRadius: "6px",
                                            }}
                                        />
                                    </div>

                                    {/* 悪い結果 */}
                                    <div
                                        style={{
                                            position: "relative",
                                            display: "flex",
                                            alignItems: "center",
                                            marginTop: 8,
                                            background: "#f3f4f6",
                                            borderRadius: "6px",
                                            paddingLeft: "38px",
                                        }}
                                    >
                                        <MicButton
                                            listening={badListening}
                                            onClick={startBadListening}
                                            style={{
                                                position: "absolute",
                                                left: "0px",
                                                top: "50%",
                                                transform: "translateY(-50%)",
                                            }}
                                        />
                                        <input
                                            placeholder="良くない結果の予想"
                                            value={String(plan.bad || "")}
                                            onChange={(e) =>
                                                setPlans((prev) =>
                                                    prev.map((p, idx) =>
                                                        idx === i ? { ...p, bad: e.target.value } : p
                                                    )
                                                )
                                            }
                                            style={{
                                                width: "100%",
                                                padding: "6px",
                                                fontSize: "0.9rem",
                                                border: "1px solid #d1d5db",
                                                borderRadius: "6px",
                                            }}
                                        />
                                    </div>
                                </div>
                            ))}

<div
    style={{
        display: "flex",
        justifyContent: "space-between",
        marginTop: 10,
    }}
>
    {/* 左：戻る＋リセット */}
    <div style={{ display: "flex", gap: 8 }}>
        <button
            className="btn"
            onClick={() => setPage(1)}
            disabled={sending}
        >
            戻る
        </button>

        <button
            className="btn"
            onClick={resetPage2}
            style={{ background: "#fee2e2", color: "#b91c1c" }}
            disabled={sending}
        >
            Page2リセット
        </button>
    </div>

    {/* 右：送信 */}
    <button
        className="btnDark"
        onClick={send}
        disabled={sending}
    >
        {sending ? "送信中..." : "送信"}
    </button>
</div>
                        </div>

                        {sending && <Spinner fullScreen size={180} />}
                    </>
                )}
            </section>
        </main>
    );
}
