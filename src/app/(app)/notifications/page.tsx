import { listAllMyNotifications } from "@/lib/actions/notifications";
import { NotificationsPage } from "@/components/notifications/NotificationsPage";

export const metadata = { title: "Notificaciones — Pistachio" };

export default async function NotificationsRoute() {
  const { notifications, unreadCount, total } =
    await listAllMyNotifications(100, 0);

  return (
    <NotificationsPage
      initialNotifications={notifications}
      initialUnreadCount={unreadCount}
      total={total}
    />
  );
}
