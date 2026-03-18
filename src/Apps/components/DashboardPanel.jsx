import { useEffect, useMemo, useState } from "react";
import DashboardGate from "./DashboardGate";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../shad_components/ui/card";

import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "../shad_components/ui/table.jsx";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export default function DashboardPanel({ companyCode }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("");
  const [dashboardUnlocked, setDashboardUnlocked] = useState(false);
  const DASHBOARD_API_BASE = "https://ms-engine-test.s-yamane.workers.dev";

  useEffect(() => {
    const saved = localStorage.getItem("facilitatorKey");
    if (saved) {
      setDashboardUnlocked(true);
    }
  }, []);

  useEffect(() => {
    if (!companyCode || !dashboardUnlocked) return;

    let alive = true;

    async function load() {
      try {
        setError("");

        const facilitatorKey = localStorage.getItem("facilitatorKey") || "";

        const res = await fetch(
          `${DASHBOARD_API_BASE}/dashboard/summary?companyCode=${encodeURIComponent(companyCode)}`,
          {
            headers: {
              Authorization: `Bearer ${facilitatorKey}`,
            },
          }
        );

        const json = await res.json();

        if (!res.ok) {
          throw new Error(json?.error || "dashboard fetch failed");
        }

        if (alive) {
          console.log("dashboard json:", json);
          setData(json);
        }
      } catch (e) {
        console.error("dashboard fetch error:", e);
        if (alive) {
          setError(String(e));
          setData(null);
        }
      }
    }

    load();
    const timer = setInterval(load, 5000);

    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [companyCode, dashboardUnlocked]);

  const teamData = useMemo(() => {
    return Object.entries(data?.teamStats || {})
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [data]);

  const biasData = useMemo(() => {
    return Object.entries(data?.biasStats || {})
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [data]);

  useEffect(() => {
  if (teamData.length === 0) return;

  const exists = teamData.some((team) => team.name === selectedTeam);
  if (!selectedTeam || !exists) {
    setSelectedTeam(teamData[0].name);
  }
}, [teamData, selectedTeam]);

  const userData = useMemo(() => {
    return Object.entries(data?.userStatsByTeam?.[selectedTeam] || {})
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [data, selectedTeam]);

const globalUserData = useMemo(() => {
  return Object.entries(data?.overallUserStats || {})
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}, [data]);

  const totalChars = data?.totalCharCount ?? 0;
const totalUsers = data?.participantCount ?? 0;
const totalBias = useMemo(() => {
  return Object.values(data?.biasStats || {}).reduce((sum, v) => sum + v, 0);
}, [data]);

  if (!dashboardUnlocked) {
    return (
      <DashboardGate
        companyCode={companyCode}
        dashboardUrlBase={DASHBOARD_API_BASE}
        onUnlock={() => setDashboardUnlocked(true)}
      />
    );
  }

  if (error) {
    return <div className="p-6 text-red-500">取得失敗: {error}</div>;
  }

  if (!data) {
    return <div className="p-6 text-slate-500">ダッシュボードを読み込み中...</div>;
  }

  return (
    <div className="space-y-6 p-6 bg-slate-50 min-h-screen">
      <div className="flex items-center justify-between">
  <h2 className="text-2xl font-bold text-slate-800">
    ファシリテーターダッシュボード
  </h2>

  <button
    onClick={() => {
      localStorage.removeItem("facilitatorKey");
      setDashboardUnlocked(false);
      setData(null);
      setError("");
    }}
    className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm transition hover:bg-slate-50"
  >
    認証解除
  </button>
</div>
      {/* KPI */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-sky-100 bg-sky-50">
          <CardHeader>
            <CardTitle className="text-sky-800">総発言文字数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-sky-900">{totalChars}</div>
          </CardContent>
        </Card>

        <Card className="border-emerald-100 bg-emerald-50">
          <CardHeader>
            <CardTitle className="text-emerald-800">参加人数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-900">{totalUsers}</div>
          </CardContent>
        </Card>

        <Card className="border-cyan-100 bg-cyan-50">
          <CardHeader>
            <CardTitle className="text-cyan-800">検出バイアス総数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-cyan-900">{totalBias}</div>
          </CardContent>
        </Card>
      </div>

      {/* 上段 */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-slate-200 bg-white">
          <CardHeader>
            <CardTitle className="text-slate-800">チーム別発言量</CardTitle>
          </CardHeader>
          <CardContent style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={teamData}
                onClick={(state) => {
                  if (state?.activeLabel) {
                    setSelectedTeam(state.activeLabel);
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#60a5fa" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white">
          <CardHeader>
            <CardTitle className="text-slate-800">バイアス分布</CardTitle>
          </CardHeader>
          <CardContent style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={biasData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#34d399" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* 下段 */}
      <Card className="border-slate-200 bg-white text-[1.2rem]">
        <CardHeader>
          <CardTitle className="text-slate-800">
            個人発言量
            {selectedTeam ? `（${selectedTeam}）` : ""}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {teamData.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {teamData.map((team) => (
                <button
                  key={team.name}
                  onClick={() => setSelectedTeam(team.name)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    selectedTeam === team.name
                      ? "bg-sky-500 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {team.name}
                </button>
              ))}
            </div>

          
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>順位</TableHead>
                <TableHead>ユーザー</TableHead>
                <TableHead className="text-right">文字数</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {userData.map((u, i) => (
                <TableRow key={u.name}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell>{u.name}</TableCell>
                  <TableCell className="text-right">{u.value}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="border-slate-200 bg-white text-[1.2rem]">
  <CardHeader>
    <CardTitle className="text-slate-800">
      企業コード内全体の個人発言量ランキング
    </CardTitle>
  </CardHeader>
  <CardContent>
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>順位</TableHead>
          <TableHead>ユーザー</TableHead>
          <TableHead className="text-right">文字数</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {globalUserData.map((u, i) => (
          <TableRow key={u.name}>
            <TableCell>{i + 1}</TableCell>
            <TableCell>{u.name}</TableCell>
            <TableCell className="text-right">{u.value}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </CardContent>
</Card>
    </div>
  );
}