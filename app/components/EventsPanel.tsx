"use client";

import { useState, useEffect } from "react";

export interface GameEvent {
  id: string;
  type: string;
  message: string;
  timestamp: number;
  animalId?: string;
}

interface EventsPanelProps {
  events: GameEvent[];
}

function getEventColor(type: string): string {
  switch (type) {
    case "birth":
      return "text-green-600";
    case "death":
      return "text-red-600";
    case "combat":
      return "text-orange-600";
    case "environment":
      return "text-blue-600";
    case "breeding":
      return "text-pink-600";
    case "system":
      return "text-purple-600";
    default:
      return "text-gray-600";
  }
}

function getEventIcon(type: string): string {
  switch (type) {
    case "birth":
      return "🐣";
    case "death":
      return "💀";
    case "combat":
      return "⚔️";
    case "environment":
      return "🌤️";
    case "breeding":
      return "💕";
    case "system":
      return "⚙️";
    default:
      return "📝";
  }
}

function formatDuration(ms: number): string {
  const seconds = Math.floor((Date.now() - ms) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

export default function EventsPanel({ events }: EventsPanelProps) {
  const [filter, setFilter] = useState<string>("all");

  const filteredEvents = events
    .filter((event) => {
      return filter === "all" || event.type === filter;
    })
    .slice(0, 8); // Show only the 8 most recent events

  return (
    <div className="fixed bottom-4 left-4 w-72 h-80 bg-white/95 backdrop-blur-sm border border-gray-300 rounded-lg shadow-lg flex flex-col z-40">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-gray-50 rounded-t-lg">
        <h3 className="font-semibold text-gray-900">Recent Events</h3>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="text-xs px-2 py-1 border rounded"
        >
          <option value="all">All</option>
          <option value="birth">Birth</option>
          <option value="death">Death</option>
          <option value="combat">Combat</option>
          <option value="environment">Environment</option>
          <option value="breeding">Breeding</option>
          <option value="system">System</option>
        </select>
      </div>

      {/* Event entries */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {filteredEvents.length === 0 ? (
          <div className="text-center text-gray-500 py-4 text-sm">
            No recent events
          </div>
        ) : (
          filteredEvents.map((event) => {
            return (
              <div
                key={event.id}
                className="border rounded p-2 text-xs bg-white border-gray-200 hover:bg-gray-50"
              >
                {/* Header row */}
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1">
                    <span className="text-sm">
                      {getEventIcon(event.type)}
                    </span>
                    <span
                      className={`px-1 py-0.5 rounded text-xs font-medium ${getEventColor(
                        event.type
                      )} bg-gray-100`}
                    >
                      {event.type}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {formatDuration(event.timestamp)}
                  </span>
                </div>

                {/* Message */}
                <div className="text-xs text-gray-700 leading-relaxed">
                  {event.message}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t bg-gray-50 text-xs text-gray-600 rounded-b-lg">
        {filteredEvents.length} of {events.length} events
      </div>
    </div>
  );
}