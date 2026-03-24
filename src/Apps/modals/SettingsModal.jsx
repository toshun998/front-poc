// ========== 参加設定モーダル ==========
import { useState } from "react";
import { getTeamMembers, updateTeamMembers } from "../../FrontServer/personaApi";

/**
 * 参加設定モーダル（Step1: チーム参加、Step2: 名簿編集）
 */
export default function SettingsModal({
    gateOpen,
    setGateOpen,
    gateLoading,
    step,
    setStep,
    teamName,
    setTeamName,
    userList,
    setUserList,
    currentCompanyCode,
    currentUserId,
    setCurrentUserId,
    currentUserName,
    setCurrentUserName,
}) {

    // ===== 新規追加 state =====
    const [showConsent, setShowConsent] = useState(false);
    const [consentChecked, setConsentChecked] = useState(false);
    const [pendingUser, setPendingUser] = useState(null);
    const [confirmedMembers, setConfirmedMembers] = useState([]);

    // ===== 参加処理 =====
    const joinUser = (uid) => {
        localStorage.setItem("currentUserName", uid);
        localStorage.setItem("currentUserId", uid);
        localStorage.setItem("teamName", teamName);

        setCurrentUserId(uid);
        setCurrentUserName(uid);
        setStep("front"); // ← 実際の遷移先に合わせて変更

        const url =
            `${window.location.origin}` +
            `/?team=${encodeURIComponent(teamName)}` +
            `&user=${encodeURIComponent(uid)}`;

        window.open(url, "_blank");
        setGateOpen(false);
    };

    if (!gateOpen) return null;

    if (gateLoading) {
        return (
            <div className="gate">
                <div className="panel">
                    <p>読み込み中です…</p>
                </div>
            </div>
        );
    }

    return (
        <>
            <div
                className="gate"
                onClick={(e) => {
                    if (e.target.classList.contains("gate")) setGateOpen(false);
                }}
            >
                <div
                    className="panel"
                    style={{
                        maxHeight: "80vh",
                        display: "flex",
                        flexDirection: "column",
                    }}
                >

                    {/* STEP 1：チームに入る */}
                    {step === "join" && (
                        <>
                            <h3>チームに入る</h3>

                            <div className="row">
                                <span className="hint" style={{ width: 90 }}>
                                    チーム名
                                </span>
                                <input
                                    value={teamName}
                                    onChange={(e) => setTeamName(e.target.value)}
                                    placeholder="例：T1 / 1組 / A班"
                                />
                            </div>

                            <div className="row" style={{ justifyContent: "flex-end" }}>
                                <button
                                    className="btn"
                                    onClick={async () => {
                                        if (!teamName.trim()) {
                                            alert("チーム名を入力してください");
                                            return;
                                        }

                                        try {
                                            const savedMembers = await getTeamMembers(savedTeam);

                                            if (Array.isArray(savedMembers) && savedMembers.length > 0) {
                                                setTeamName(savedTeam);
                                                setConfirmedMembers(savedMembers);
                                                setUserList(
                                                savedMembers.map((name) => ({
                                                    userId: name,
                                                    name,
                                                    removed: false,
                                                }))
                                            );
                                                setStep(savedUserId && savedUserName ? "front" : "roster");
                                            } else {
                                                setUserList([{ name: "", removed: false }]);
                                            }
                                        } catch (err) {
                                            console.error("KV名簿取得エラー:", err);
                                            setUserList([{ name: "", removed: false }]);
                                        }

                                        localStorage.setItem("teamName", teamName);
                                        setStep("roster");
                                    }}
                                >
                                    チームに入る
                                </button>
                            </div>
                        </>
                    )}

                    {/* STEP 2：名簿編集 */}
                    {step === "roster" && (
                        <>
                            <h3>参加設定</h3>

                            <div
                                style={{
                                    flex: 1,
                                    overflowY: "auto",
                                    paddingRight: 6,
                                }}
                            >
                                {/* チーム名 */}
                                <div className="row">
                                    <span className="hint" style={{ width: 90 }}>
                                        チーム名
                                    </span>
                                    <input value={teamName} disabled />
                                </div>

                                {/* ユーザー名一覧 */}
                                {userList.map((u, i) => {
                                    const isMe = currentUserId && u.name && u.name === currentUserId;

                                    return (
                                        <div
                                            key={i}
                                            style={{
                                                display: "flex",
                                                gap: 6,
                                                alignItems: "center",
                                                opacity: u.removed ? 0.4 : 1,
                                            }}
                                        >
                                            <input
                                                value={u.name ?? ""}
                                                disabled={u.removed}
                                                onChange={(e) => {
                                                    const list = [...userList];
                                                    list[i] = { ...list[i], name: e.target.value };
                                                    setUserList(list);
                                                }}
                                                placeholder={`名前${i + 1}`}
                                                style={{ flex: 1 }}
                                            />

                                            {/* 👤 この人で入る */}
                                            {!u.removed && !isMe && (
                                                <button
                                                    className="btnDark"
                                                    onClick={() => {

                                                        if (!u.name.trim()) {
                                                            alert("名前を入力してください");
                                                            return;
                                                        }

                                                        const uid = u.name.trim();

                                                        const existsInRoster = confirmedMembers.includes(uid);

                                                        if (!existsInRoster) {
                                                            setPendingUser(uid);
                                                            setConsentChecked(false);
                                                            setShowConsent(true);
                                                            return;
                                                        }

                                                        joinUser(uid);
                                                    }}
                                                >
                                                    入る
                                                </button>
                                            )}

                                            {/* 👤 自分表示 */}
                                            {isMe && (
                                                <span
                                                    className="hint"
                                                    style={{ fontSize: "0.85rem" }}
                                                >
                                                    （あなた）
                                                </span>
                                            )}

                                            {/* ＋ / − */}
                                            {u.removed ? (
                                                <button
                                                    className="btn"
                                                    onClick={() => {
                                                        const list = [...userList];
                                                        list[i] = { ...list[i], removed: false };
                                                        setUserList(list);
                                                    }}
                                                    style={{ width: 36, height: 36 }}
                                                >
                                                    ＋
                                                </button>
                                            ) : i === 0 ? (
                                                <button
                                                    className="btn"
                                                    onClick={() =>
                                                        setUserList([
                                                        ...userList,
                                                        { userId: "", name: "", removed: false },
                                                        ])
                                                    }
                                                    style={{ width: 36, height: 36 }}
                                                >
                                                    ＋
                                                </button>
                                            ) : (
                                                <button
                                                    className="btn"
                                                    onClick={() => {
                                                        const list = [...userList];
                                                        list[i] = { ...list[i], removed: true };
                                                        setUserList(list);
                                                    }}
                                                    style={{
                                                        width: 36,
                                                        height: 36,
                                                        border: "1.5px solid #b91c1c",
                                                        background: "#fee2e2",
                                                        color: "#b91c1c",
                                                    }}
                                                >
                                                    −
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* 下部操作 */}
                            <div
                                className="row"
                                style={{ justifyContent: "space-between", marginTop: 12 }}
                            >
                                <button
                                    className="btn"
                                    onClick={() => {
                                        setCurrentUserId(null);
                                        setCurrentUserName(null);
                                        setTeamName("");
                                        setUserList([{ userId: "", name: "", removed: false }]);
                                        setStep("join");

                                        localStorage.removeItem("currentUserId");
                                        localStorage.removeItem("currentUserName");
                                        localStorage.removeItem("teamName");
                                    }}
                                >
                                    チームを抜ける
                                </button>

                                <button
                                    className="btn"
                                    onClick={async () => {

                                        const removedUsers = userList.filter((u) => u.removed);

                                        if (removedUsers.length > 0) {
                                            const ok = window.confirm(
                                                "本当に保存しますか？\n除籍した人のデータは削除され、元に戻せません。"
                                            );
                                            if (!ok) return;
                                        }

                                        try {

                                            const activeMembers = userList
                                                .filter((u) => !u.removed && u.name.trim())
                                                .map((u) => u.name.trim());

                                            await updateTeamMembers({
                                                companyCode: currentCompanyCode,
                                                team: teamName,
                                                members: activeMembers,
                                            });

                                            console.log("updateTeamMembers payload", {
                                                companyCode: currentCompanyCode,
                                                team: teamName,
                                                members: activeMembers,
                                            });

                                            setGateOpen(false);

                                        } catch (err) {
                                            console.error("KV名簿保存エラー:", err);
                                            alert(
                                                "名簿の保存に失敗しました。ネットワーク接続を確認してください。"
                                            );
                                        }
                                    }}
                                >
                                    名簿を保存
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* ===== 利用規約同意モーダル ===== */}

            {showConsent && (
                <div className="gate">
                    <div className="panel">

                        <h3>利用規約への同意</h3>

                        <p style={{ fontSize: "0.9rem", marginBottom: 10 }}>
                            サービスを利用するには以下への同意が必要です
                        </p>

                        <label style={{ display: "flex", gap: 8 }}>
                            <input
                                type="checkbox"
                                checked={consentChecked}
                                onChange={(e) => setConsentChecked(e.target.checked)}
                            />

                            <span>
                                <a href="https://shiko-athletic.studio.site/terms" target="_blank" rel="noopener noreferrer">
                                    利用規約
                                </a>
                                と
                                <a href="https://shiko-athletic.studio.site/privacy" target="_blank" rel="noopener noreferrer">
                                    プライバシーポリシー
                                </a>
                                に同意します
                            </span>
                        </label>

                        <p
                            className="hint"
                            style={{
                                fontSize: "0.8rem",
                                marginTop: 4,
                                marginBottom: 12,
                                lineHeight: 1.4,
                            }}
                        >
                            入力内容はAI処理に使用され、ファシリテーターと共有されます。
                        </p>

                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                            <button
                                className="btn"
                                onClick={() => setShowConsent(false)}
                            >
                                キャンセル
                            </button>

                            <button
                                className="btn"
                                disabled={!consentChecked}
                                onClick={async () => {

                                    const uid = pendingUser;

                                    const existingMembers = userList
                                        .filter((u) => !u.removed && u.name.trim())
                                        .map((u) => u.name.trim());

                                    const activeMembers = existingMembers.includes(uid)
                                        ? existingMembers
                                        : [...existingMembers, uid];

                                    try {
                                        console.log("activeMembers before save", activeMembers);
                                        console.log("teamName before save", teamName);
                                        console.log("currentCompanyCode before save", currentCompanyCode);

                                        await updateTeamMembers({
                                            companyCode: currentCompanyCode,
                                            team: teamName,
                                            members: activeMembers,
                                        });

                                        joinUser(uid);

                                        console.log("updateTeamMembers payload", {
                                            companyCode: currentCompanyCode,
                                            team: teamName,
                                            members: activeMembers,
                                        });

                                    } catch (err) {
                                        console.error(err);
                                        alert("登録に失敗しました");
                                    }
                                }}
                            >
                                同意して入る
                            </button>
                        </div>

                    </div>
                </div>
            )}
        </>
    );
}