"use client";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import jaLocale from "@fullcalendar/core/locales/ja";
import type { EventSourceFuncArg } from "@fullcalendar/core";

async function fetchEvents(info: EventSourceFuncArg) {
  try {
    const res = await fetch(`/api/events?from=${info.startStr}&to=${info.endStr}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.map((e: { id: string; title: string; start: string; end: string; color: string }) => ({
      id: e.id,
      title: e.title,
      start: e.start,
      end: e.end,
      backgroundColor: e.color,
      borderColor: e.color,
    }));
  } catch {
    return [];
  }
}

export default function MiniCalendar() {
  return (
    <FullCalendar
      plugins={[dayGridPlugin]}
      initialView="dayGridMonth"
      locale={jaLocale}
      events={fetchEvents}
      headerToolbar={{
        left: "prev",
        center: "title",
        right: "next today",
      }}
      height="auto"
      eventDisplay="block"
      dayMaxEvents={3}
    />
  );
}
