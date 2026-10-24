"use client";
import { useState, useEffect } from "react";
import { Bell } from "lucide-react";

export function NotificationBell() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch("/api/notifications").then(r => r.json()).then(data => {
      if(Array.isArray(data)) setNotifications(data);
    });
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markRead = async () => {
    const unreadIds = notifications.filter(n => !n.isRead).map(n => n._id);
    if(unreadIds.length === 0) return;
    await fetch("/api/notifications", { method: "PUT", body: JSON.stringify({ action: "mark_read", ids: unreadIds }) });
    setNotifications(notifications.map(n => ({...n, isRead: true})));
  };

  const handleToggle = () => {
    if (open) {
      // Clear notifications from UI once the dropdown is closed (they have been seen and marked as read)
      setNotifications(notifications.filter(n => !n.isRead));
    } else {
      // Mark as read when opening
      markRead();
    }
    setOpen(!open);
  };

  return (
    <div className="relative">
      <button onClick={handleToggle} className="relative p-2 text-slate-600 hover:text-slate-900">
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full"></span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white border shadow-xl z-50 rounded text-sm max-h-96 overflow-y-auto">
          <div className="p-3 bg-slate-50 border-b font-semibold">Notifications</div>
          {notifications.length === 0 ? <div className="p-4 text-slate-500 text-center">No alerts</div> : 
           notifications.map((n, i) => (
            <div key={i} className={`p-3 border-b ${n.isRead ? 'opacity-70' : 'bg-blue-50/30'}`}>
              <div className="font-semibold">{n.title}</div>
              <div className="text-slate-600 text-xs mt-1">{n.message}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
