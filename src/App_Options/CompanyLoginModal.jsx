import { useState } from "react";

const BASE = "https://ms-engine-test.s-yamane.workers.dev";

export default function CompanyLoginModal({ onSuccess }) {
  const [companyCode, setCompanyCode] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!companyCode || !password) {
      setError("企業コードとパスワードを入力してください");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${BASE}/auth/companyLogin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyCode, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "ログインに失敗しました");
      }

      // ✅ 成功：companyCode 保存
      localStorage.setItem("companyCode", companyCode);
      localStorage.setItem("companyName", data.companyName || "");

      onSuccess?.(data);
    } catch (e) {
      setError(e.message || "ログイン失敗");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="gate">
      <div className="panel" style={{ width: 360 }}>
        <h3 style={{ marginTop: 0 }}>企業ログイン</h3>

        <div className="row">
          <input
            placeholder="企業コード"
            value={companyCode}
            onChange={(e) => setCompanyCode(e.target.value)}
          />
        </div>

        <div className="row">
          <input
            type="password"
            placeholder="パスワード"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && (
          <p style={{ color: "red", fontSize: 13 }}>{error}</p>
        )}

        <button
          className="btn"
          disabled={loading}
          onClick={submit}
          style={{ width: "100%", marginTop: 8 }}
        >
          {loading ? "確認中…" : "ログイン"}
        </button>
      </div>
    </div>
  );
}
