"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import TaskPanel from "@/components/TaskPanel";

const DayPlanner = dynamic(() => import("@/components/DayPlanner"), { ssr: false });

export default function TasksPage() {
  const [refresh, setRefresh] = useState(0);

  return (
    <div className="flex flex-col md:flex-row gap-4 p-4 md:h-[calc(100vh-3.5rem)]">
      {/* 左: 日別タイムライン（モバイルは高さ確保、デスクトップは伸縮） */}
      <div className="min-w-0 h-[65vh] md:flex-1 md:h-auto">
        <DayPlanner refresh={refresh} onSubtaskToggled={() => setRefresh((n) => n + 1)} />
      </div>

      {/* 右: タスク一覧 + 詳細 */}
      <div className="w-full md:w-80 xl:w-96 shrink-0 flex flex-col h-[65vh] md:h-full">
        <TaskPanel refresh={refresh} onTaskChange={() => setRefresh((n) => n + 1)} />
      </div>
    </div>
  );
}
