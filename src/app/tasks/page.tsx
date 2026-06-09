"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import TaskPanel from "@/components/TaskPanel";

const DayPlanner = dynamic(() => import("@/components/DayPlanner"), { ssr: false });

export default function TasksPage() {
  const [refresh, setRefresh] = useState(0);

  return (
    <div
      className="flex gap-4 p-4"
      style={{ height: "calc(100vh - 3.5rem)" }}
    >
      {/* 左: 日別タイムライン */}
      <div className="flex-1 min-w-0">
        <DayPlanner refresh={refresh} onSubtaskToggled={() => setRefresh((n) => n + 1)} />
      </div>

      {/* 右: タスク一覧 + 詳細 */}
      <div className="w-80 xl:w-96 shrink-0 flex flex-col" style={{ height: "100%" }}>
        <TaskPanel refresh={refresh} onTaskChange={() => setRefresh((n) => n + 1)} />
      </div>
    </div>
  );
}
