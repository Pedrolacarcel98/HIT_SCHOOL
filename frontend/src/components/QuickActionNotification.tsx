import React from 'react';

export interface DashboardNotifications {
  hasNewGrades: boolean;
  hasNewTasks: boolean;
  unreadChatCount: number;
}

const QuickActionNotification: React.FC<{ label: string }> = ({ label }) => (
  <span className="quick-action-notification" role="status" aria-label={label}>Nuevo</span>
);

export const ChatUnreadBadge: React.FC<{ count: number }> = ({ count }) => (
  <span className="quick-action-chat-count" role="status" aria-label={`${count} ${count === 1 ? 'mensaje sin leer' : 'mensajes sin leer'}`}>
    {count}
  </span>
);

export default QuickActionNotification;
