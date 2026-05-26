"use client";

import { useEffect, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { toast } from "sonner";
import type { EventData } from "@/types";
import EventModal from "./EventModal";

export default function ScheduleCalendar() {
  const [events, setEvents] = useState<EventData[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventData | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [defaultStart, setDefaultStart] = useState<string | undefined>();
  const calendarRef = useRef<FullCalendar>(null);

  async function fetchEvents() {
    const res = await fetch("/api/events");
    if (res.ok) setEvents(await res.json());
  }

  useEffect(() => {
    fetchEvents();
  }, []);

  const calendarEvents = events.map((e) => ({
    id: e.id,
    title: e.title,
    start: e.start,
    end: e.end,
    backgroundColor: e.color,
    borderColor: e.color,
    extendedProps: e,
  }));

  return (
    <div className="p-4 bg-white rounded-xl shadow">
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        timeZone="Asia/Tokyo"
        locale="ja"
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay",
        }}
        buttonText={{ today: "今日", month: "月", week: "週", day: "日" }}
        events={calendarEvents}
        selectable
        editable
        select={(info) => {
          setSelectedEvent(null);
          setDefaultStart(info.startStr);
          setModalOpen(true);
        }}
        eventClick={(info) => {
          setSelectedEvent(info.event.extendedProps as EventData);
          setModalOpen(true);
        }}
        eventDrop={async (info) => {
          const ev = info.event;
          const res = await fetch(`/api/events/${ev.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              start: ev.start?.toISOString(),
              end: ev.end?.toISOString(),
            }),
          });
          if (!res.ok) {
            info.revert();
            toast.error("予定の更新に失敗しました");
          } else {
            fetchEvents();
          }
        }}
        eventResize={async (info) => {
          const ev = info.event;
          const res = await fetch(`/api/events/${ev.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              start: ev.start?.toISOString(),
              end: ev.end?.toISOString(),
            }),
          });
          if (!res.ok) {
            info.revert();
            toast.error("予定の更新に失敗しました");
          } else {
            fetchEvents();
          }
        }}
        height="auto"
      />
      <EventModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        event={selectedEvent}
        defaultStart={defaultStart}
        onSaved={() => {
          setModalOpen(false);
          fetchEvents();
        }}
      />
    </div>
  );
}
