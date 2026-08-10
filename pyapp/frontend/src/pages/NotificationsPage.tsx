import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationAPI } from "../services/api";
import { Icon } from "../components/Icon";
import { usePlatforms } from "../constants/platforms";
import { useAuth } from "../contexts/AuthContext";
import { usePermissions } from "../hooks/usePermissions";

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  data?: { platform_id?: string };
};

export default function NotificationsPage() {
  const { user } = useAuth();
  const { checkPermission } = usePermissions();
  const { data: platforms, isLoading: platformsLoading } = usePlatforms();
  const queryClient = useQueryClient();

  // Check if user has permission to view notifications
  const canViewNotifications = user && checkPermission('notifications:read');

  if (!canViewNotifications) {
    return <div className="text-error">You don't have permission to view notifications</div>;
  }

  const { data: notifications, isLoading, error } = useQuery<NotificationItem[]>({
    queryKey: ["notifications"],
    queryFn: async () => {
      const response = await notificationAPI.getNotifications({ userOnly: true });
      return response.data?.items || [];
    },
  });

  const markRead = useMutation({
    mutationFn: (id: string) => notificationAPI.markAsRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      if (notifications) {
        // Mark each unread notification as read
        await Promise.all(
          notifications
            .filter((n) => !n.is_read)
            .map((n) => notificationAPI.markAsRead(n.id))
        );
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  if (isLoading || platformsLoading) return null;
  if (error) return <div className="text-error">Failed to load notifications</div>;

  return (
    <div className="card bg-base-100 border border-base-300">
      <div className="card-body">
        <div className="flex justify-between items-center mb-4">
          <h2 className="card-title mb-0">Notifications</h2>
          {notifications && notifications.some(n => !n.is_read) && (
            <button
              onClick={() => markAllRead.mutate()}
              className="btn btn-outline btn-sm"
              disabled={markAllRead.isPending}
            >
              {markAllRead.isPending ? (
                <span className="loading loading-spinner loading-sm" />
              ) : (
                <><Icon name="check" className="w-4 h-4 mr-1" /> Mark All as Read</>
              )}
            </button>
          )}
        </div>
        {notifications?.length ? (
          <ul className="space-y-2">
            {notifications.map((n: NotificationItem) => (
              <li
                key={n.id}
                className={`p-3 rounded-lg border ${n.is_read ? "border-base-300 bg-base-200/50" : "border-primary/30 bg-primary/5"}`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{n.title}</p>
                    {n.data?.platform_id && (
                      <p className="text-sm text-base-content/60">
                        Platform: {platforms?.find((p: { id?: string; displayName?: string }) => p.id === n.data?.platform_id)?.displayName || "Unknown"}
                      </p>
                    )}
                    <p className="text-sm text-base-content/60">{n.message}</p>
                  </div>
                  {!n.is_read && (
                    <button onClick={() => markRead.mutate(n.id)} className="btn btn-xs btn-ghost">
                      <Icon name="close" className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-base-content/50 py-8 text-center">No notifications yet.</p>
        )}
      </div>
    </div>
  );
}

