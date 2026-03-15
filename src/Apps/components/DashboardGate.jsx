import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../shad_components/ui/card";
import { Button } from "../shad_components/ui/button";
import { Input } from "../shad_components/ui/input";

export default function DashboardGate({
  companyCode,
  dashboardUrlBase,
  onUnlock,
  onBack,
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleUnlock() {
    try {
      setLoading(true);
      setError("");

      const res = await fetch(
        `${dashboardUrlBase}/dashboard/summary?companyCode=${encodeURIComponent(companyCode)}`,
        {
          headers: {
            Authorization: `Bearer ${password}`,
          },
        }
      );

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || "forbidden");
      }

      localStorage.setItem("facilitatorKey", password);
      onUnlock();
    } catch (e) {
      console.error("dashboard auth error:", e);
      setError("認証に失敗しました。キーを確認してください。");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && password && !loading) {
      handleUnlock();
    }
  }

  return (
    <div className="flex min-h-[65vh] items-center justify-center px-4">
      <Card className="w-full max-w-md border-sky-100 bg-white shadow-lg">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl text-slate-800">
            ファシリテーター認証
          </CardTitle>
          <CardDescription className="text-slate-500">
            ダッシュボードの閲覧には認証キーが必要です。
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">
              認証キー
            </label>
            <Input
              type="password"
              placeholder="認証キーを入力"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>

          {error && (
            <p className="text-sm font-medium text-rose-600">{error}</p>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleUnlock}
              disabled={loading || !password}
              className="flex-1"
            >
              {loading ? "認証中..." : "認証して入る"}
            </Button>

            {onBack && (
              <Button
                type="button"
                variant="outline"
                onClick={onBack}
                className="border-slate-200"
              >
                戻る
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}