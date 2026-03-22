// ========== 名簿同期フック ==========
import { useEffect, useRef } from "react";
import {
    getTeamUserStates,
    saveUserState,
    getTeamMembers,
} from "../../FrontServer/personaApi";

/**
 * 名簿の初期化・ポーリング同期・リアルタイム進行保存を行うフック
 */
export function useRosterSync({
    teamName,
    currentUserId,
    gateOpen,
    step,
    userList,
    setUserList,
    setStep,
    setTeamName,
    // フォーム状態
    topic,
    selectedTarget,
    scenario,
    scenarioFixed,
    premise,
    trouble,
    otherPrem,
    cause,
    idea,
    plans,
    // 初期復元用
    setTopic,
    setSelectedTarget,
    setScenario,
    setPremise,
    setTrouble,
    setOtherPrem,
    setCause,
    setIdea,
    setPlans,
    setCurrentUserId,
    setCurrentUserName,
    // ノート同期用
    setNotes,
}) {
    const progressRef = useRef({});
    const saveTimeoutRef = useRef(null);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const team = params.get("team");
        const userId = params.get("user");

        if (!team || !userId) return;

        setTeamName(team);
        setCurrentUserId(userId);
        setCurrentUserName(userId);

        console.log("👤 個人ページ初期化:", { team, userId });

        (async () => {
            const res = await getTeamUserStates(team);
            const my = res.users.find((u) => u.userId === userId);
            if (!my) return;

            setTopic(my.topic || "");
            setSelectedTarget(my.target || "");
            setScenario(my.scenario || "");
            setPremise(my.premise || "");
            setTrouble(my.trouble || "");
            setOtherPrem(my.otherPrem || "");
            setCause(my.cause || "");
            setIdea(my.idea || "");
            setPlans(Array.isArray(my.plans) ? my.plans : []);
        })();
    }, []);

    // KVから名簿初期化
    useEffect(() => {
        const savedTeam = localStorage.getItem("teamName");
        const savedUserId = localStorage.getItem("currentUserId");
        const savedUserName = localStorage.getItem("currentUserName");

        if (!savedTeam) {
            setStep("join");
            return;
        }

        (async () => {
            try {
                const savedMembers = await getTeamMembers(savedTeam);

                if (Array.isArray(savedMembers) && savedMembers.length > 0) {
                    setTeamName(savedTeam);
                    setUserList(
                        savedMembers.map((name) => ({
                            userId: name,
                            name,
                            removed: false,
                        }))
                    );

                    if (savedUserId && savedUserName) {
                        setStep("front");
                    } else {
                        setStep("roster");
                    }
                } else {
                    setStep("join");
                }
            } catch (err) {
                console.error("KV初期化エラー:", err);
                setStep("join");
            }
        })();
    }, []);

    // 名簿ポーリング（5秒間隔）
    useEffect(() => {
        if (!gateOpen || step !== "roster" || !teamName) return;

        const intervalId = setInterval(async () => {
            try {
                const latestMembers = await getTeamMembers(teamName);
                if (Array.isArray(latestMembers) && latestMembers.length > 0) {
                    const currentNames = userList
                        .filter((u) => !u.removed && u.name)
                        .map((u) => u.name);
                    const newNames = latestMembers;

                    if (
                        JSON.stringify(currentNames.sort()) !==
                        JSON.stringify(newNames.sort())
                    ) {
                        console.log("🔄 名簿同期: 変更を検知しました");
                        setUserList(newNames.map((name) => ({ name, removed: false })));
                    }
                }
            } catch (err) {
                console.error("ポーリングエラー:", err);
            }
        }, 30000);

        return () => clearInterval(intervalId);
    }, [gateOpen, step, teamName, userList]);

    // リアルタイム同期: 進行状況のKV自動保存（debounce 2秒）
    useEffect(() => {
        if (!teamName || !currentUserId) return;

        const currentProgress = {
            topic,
            target: selectedTarget,
            scenario: scenarioFixed ? scenario : null,
            premise,
            trouble,
            otherPrem,
            cause,
            idea,
            plans,
        };

        const prevJson = JSON.stringify(progressRef.current);
        const currJson = JSON.stringify(currentProgress);
        if (prevJson === currJson) return;

        progressRef.current = currentProgress;

        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        saveTimeoutRef.current = setTimeout(async () => {
            try {
                await saveUserState({
                    team: teamName,
                    userId: currentUserId,
                    ...currentProgress,
                    updatedAt: new Date().toISOString(),
                });
                console.log("✅ 進行状況を自動保存しました");
            } catch (err) {
                console.error("自動保存エラー:", err);
            }
        }, 2000);

        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, [
        teamName,
        currentUserId,
        topic,
        selectedTarget,
        scenario,
        scenarioFixed,
        premise,
        trouble,
        otherPrem,
        cause,
        idea,
        plans,
    ]);

    // 他ユーザーの進行状況をポーリング取得（5秒）
    useEffect(() => {
        if (!teamName || !currentUserId) return;

        const intervalId = setInterval(async () => {
            try {
                const res = await getTeamUserStates(teamName);
                if (!res.users || !Array.isArray(res.users)) return;

                const otherUsers = res.users.filter(
                    (u) => u.userId !== currentUserId
                );

                if (otherUsers.length === 0) return;

                setNotes((prevNotes) => {
                    const updatedNotes = [...prevNotes];

                    for (const user of otherUsers) {
                        const existingIdx = updatedNotes.findIndex(
                            (n) => n.userId === user.userId && n.author !== "noise"
                        );

                        const newNote = {
                            id: user.id || `sync-${user.userId}-${Date.now()}`,
                            team: teamName,
                            userId: user.userId,
                            author: user.userId,
                            q: user.topic || "（無題）",
                            stakeholder: user.target || "（未選択）",
                            scenario: user.scenario || "(未決定)",
                            premise: user.premise || "",
                            trouble: user.trouble || "",
                            otherPrem: user.otherPrem || "",
                            cause: user.cause || "",
                            idea: user.idea || "",
                            plans: Array.isArray(user.plans) ? user.plans : [],
                            createdAt: user.updatedAt || new Date().toISOString(),
                            flagsDetail: user.flagsDetail || {},
                            allFlags: user.allFlags || [],
                            synced: true,
                        };

                        if (existingIdx >= 0) {
                            const existing = updatedNotes[existingIdx];
                            if (
                                new Date(newNote.createdAt) >
                                new Date(existing.createdAt || 0)
                            ) {
                                updatedNotes[existingIdx] = newNote;
                            }
                        } else {
                            if (user.topic || user.premise || user.idea) {
                                updatedNotes.unshift(newNote);
                            }
                        }
                    }

                    return updatedNotes;
                });

                console.log("🔄 他ユーザーの進行状況を同期しました");
            } catch (err) {
                console.error("進行状況同期エラー:", err);
            }
        }, 30000);

        return () => clearInterval(intervalId);
    }, [teamName, currentUserId]);
}
