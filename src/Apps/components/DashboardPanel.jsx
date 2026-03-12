import { useEffect, useState } from "react";

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
} from "../shad_components/ui/table";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

export default function DashboardPanel({ companyCode }) {
  const [data, setData] = useState(null);
const [error, setError] = useState("");

useEffect(() => {
  async function load() {
    try {
      setError("");

      const url = `https://ms-engine-test.s-yamane.workers.dev/dashboard/summary?companyCode=${companyCode}`;
      console.log("dashboard fetch url:", url);

      const res = await fetch(url);
      console.log("dashboard status:", res.status);

      const json = await res.json();
      console.log("dashboard json:", json);

      if (!res.ok) {
        throw new Error(json?.error || "dashboard fetch failed");
      }

      setData(json);
    } catch (e) {
      console.error("dashboard fetch error:", e);
      setError(String(e));
    }
  }

  load();

  const id = setInterval(load, 300000); // 5分
  return () => clearInterval(id);
}, [companyCode]);

if (error) {
  return <div style={{ padding: 16, color: "red" }}>取得失敗: {error}</div>;
}

if (!data) {
  return <div style={{ padding: 16 }}>読み込み中...</div>;
}

  const teamData = Object.entries(data.teamStats || {}).map(([k, v]) => ({
    name: k,
    value: v,
  }));

  const userData = Object.entries(data.userStats || {}).map(([k, v]) => ({
    name: k,
    value: v,
  }));

  const biasData = Object.entries(data.biasStats || {}).map(([k, v]) => ({
    name: k,
    value: v,
  }));

  return (
    <div className="grid grid-cols-3 gap-6 p-6">

      {/* チーム発言量 */}
      <Card>
        <CardHeader>
          <CardTitle>チーム発言量</CardTitle>
        </CardHeader>
        <CardContent style={{ height: 300 }}>
          <ResponsiveContainer>
            <BarChart data={teamData}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* 個人発言量 */}
      <Card>
        <CardHeader>
          <CardTitle>個人発言量</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ユーザー</TableHead>
                <TableHead>文字数</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {userData.map((u) => (
                <TableRow key={u.name}>
                  <TableCell>{u.name}</TableCell>
                  <TableCell>{u.value}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* バイアス分布 */}
      <Card>
        <CardHeader>
          <CardTitle>バイアス分布</CardTitle>
        </CardHeader>
        <CardContent style={{ height: 300 }}>
          <ResponsiveContainer>
            <BarChart data={biasData}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

    </div>
  );
}