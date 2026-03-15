import { useState } from "react";

const BASE = "https://ms-engine-test.s-yamane.workers.dev";

export default function CompanyLoginModal({ onSuccess }) {
  const [companyCode, setCompanyCode] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
    <>
      <style>{`
        .gate{
          position:fixed;
          inset:0;
          background:rgba(0,0,0,0.35);
          display:flex;
          align-items:center;
          justify-content:center;
          font-family:sans-serif;
        }

        .panel{
          width:360px;
          background:#fff;
          padding:24px;
          border-radius:16px;
          box-shadow:0 10px 30px rgba(0,0,0,0.15);
        }

        .row{
          margin-bottom:12px;
          position:relative;
        }

        .input{
          width:100%;
          height:42px;
          padding:0 42px 0 12px;
          border-radius:10px;
          border:1px solid #d0d5dd;
          font-size:14px;
          box-sizing:border-box;
        }

        .input:focus{
          outline:none;
          border-color:#6b8cff;
          box-shadow:0 0 0 2px rgba(107,140,255,0.15);
        }

        .eyeButton{
          position:absolute;
          right:10px;
          top:50%;
          transform:translateY(-50%);
          background:none;
          border:none;
          cursor:pointer;
          color:#666;
        }

        .eyeButton:hover{
          color:#000;
        }

        .btn{
          width:100%;
          height:44px;
          border:none;
          border-radius:12px;
          background:#e5e7eb;
          font-weight:600;
          cursor:pointer;
        }

        .btn:hover{
          background:#d1d5db;
        }
      `}</style>

      <div className="gate">
        <div className="panel">
          <h3 style={{ marginTop: 0 }}>企業ログイン</h3>

          <div className="row">
            <input
              className="input"
              placeholder="企業コード"
              value={companyCode}
              onChange={(e) => setCompanyCode(e.target.value)}
            />
          </div>

          <div className="row">
            <input
              className="input"
              type={showPassword ? "text" : "password"}
              placeholder="パスワード"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <button
              type="button"
              className="eyeButton"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M3 3L21 21" stroke="currentColor" strokeWidth="2"/>
                  <path d="M9.88 5.08A10.94 10.94 0 0112 5c7 0 11 7 11 7a21.84 21.84 0 01-5.17 5.94" stroke="currentColor" strokeWidth="2"/>
                  <path d="M6.61 6.61A21.87 21.87 0 001 12s4 7 11 7a10.94 10.94 0 005.12-1.17" stroke="currentColor" strokeWidth="2"/>
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" stroke="currentColor" strokeWidth="2"/>
                  <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                </svg>
              )}
            </button>
          </div>

          {error && (
            <p style={{ color: "red", fontSize: 13 }}>{error}</p>
          )}

          <button
            className="btn"
            disabled={loading}
            onClick={submit}
            style={{ marginTop: 8 }}
          >
            {loading ? "確認中…" : "ログイン"}
          </button>
        </div>
      </div>
    </>
  );
}