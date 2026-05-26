"use client";

import { useState } from "react";
import TaskCalendar from "@/components/TaskCalendar";
import TaskList from "@/components/TaskList";
import AIInputPanel from "@/components/AIInputPanel";
import { Card } from "@/components/ui/card";

export default function TasksPage() {
  const [refresh, setRefresh] = useState(0);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
      <h1 className="text-xl font-bold text-gray-800">タスクカレンダー</h1>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        <TaskCalendar key={refresh} />

        <div className="space-y-4">
          <Card className="p-4">
            <h3 className="font-semibold text-sm text-gray-700 mb-3">
              AIタスク入力
            </h3>
            <AIInputPanel onApproved={() => setRefresh((n) => n + 1)} />
          </Card>

          <TaskList key={`list-${refresh}`} />
        </div>
      </div>
    </div>
  );
}
