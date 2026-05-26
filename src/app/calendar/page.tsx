"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import ScheduleCalendar from "@/components/ScheduleCalendar";
import TaskCalendar from "@/components/TaskCalendar";
import TaskList from "@/components/TaskList";
import AIInputPanel from "@/components/AIInputPanel";
import { Card } from "@/components/ui/card";

export default function CalendarPage() {
  const [view, setView] = useState<"schedule" | "task">("schedule");
  const [refresh, setRefresh] = useState(0);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <Tabs
          value={view}
          onValueChange={(v) => setView(v as "schedule" | "task")}
        >
          <TabsList>
            <TabsTrigger value="schedule">予定カレンダー</TabsTrigger>
            <TabsTrigger value="task">タスクカレンダー</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        <div>
          {view === "schedule" ? <ScheduleCalendar /> : <TaskCalendar key={refresh} />}
        </div>

        <div className="space-y-4">
          <Card className="p-4">
            <h3 className="font-semibold text-sm text-gray-700 mb-3 flex items-center gap-1">
              <span>AIタスク入力</span>
            </h3>
            <AIInputPanel onApproved={() => setRefresh((n) => n + 1)} />
          </Card>

          <TaskList key={refresh} />
        </div>
      </div>
    </div>
  );
}
