// ========== 企業認証フック ==========
import { useEffect, useState } from "react";

const AUTH_URL = "https://ms-engine-test.s-yamane.workers.dev/auth/companyPing";

export function useCompanyAuth() {
    const [companyReady, setCompanyReady] = useState(false);
    const [checkingCompany, setCheckingCompany] = useState(true);

    // 初回認証
    useEffect(() => {
        const boot = async () => {
            const companyCode = localStorage.getItem("companyCode");
            if (!companyCode) {
                setCheckingCompany(false);
                return;
            }

            try {
                const res = await fetch(AUTH_URL, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ companyCode }),
                });

                const data = await res.json();

                if (data.ok) {
                    setCompanyReady(true);
                } else {
                    localStorage.removeItem("companyCode");
                }
            } catch {
                localStorage.removeItem("companyCode");
            } finally {
                setCheckingCompany(false);
            }
        };

        boot();
    }, []);

    // URLトークン取得
    useEffect(() => {
        const url = new URL(window.location.href);
        const token = url.searchParams.get("token");

        if (token) {
            localStorage.setItem("shikoUserToken", token);
            url.searchParams.delete("token");
            window.history.replaceState({}, "", url.toString());
        }
    }, []);

    // 定期確認（5分間隔）
    useEffect(() => {
        if (!companyReady) return;

        const interval = setInterval(async () => {
            const companyCode = localStorage.getItem("companyCode");
            if (!companyCode) return;

            try {
                const res = await fetch(AUTH_URL, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ companyCode }),
                });

                const data = await res.json();

                if (!data.ok) {
                    localStorage.removeItem("companyCode");
                    localStorage.removeItem("companySessionExpiresAt");
                    location.reload();
                }
            } catch {
                // ネットワークエラー時は即ログアウトしない（UX配慮）
            }
        }, 1000 * 60 * 5);

        return () => clearInterval(interval);
    }, [companyReady]);

    return { companyReady, setCompanyReady, checkingCompany };
}
