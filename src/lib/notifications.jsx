// Create this as a separate component: components/Notifications.js
import React, { useState, useEffect } from "react";
import { Dropdown, Badge, Spinner, ListGroup, Button } from "react-bootstrap";
import { supabase } from "../lib/supabaseClient";
import { BsBell, BsBellFill } from "react-icons/bs";

const Notifications = ({ userId }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("notifications")
        .select(
          `
          *,
          actor:profiles!notifications_actor_id_fkey(first_name, last_name),
          project:projects(name)
        `
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;

      setNotifications(data || []);
      setUnreadCount(data?.filter((n) => !n.is_read).length || 0);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId);

      if (error) throw error;

      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  // Add real-time subscription for new notifications
  useEffect(() => {
    if (!userId) return;

    fetchNotifications();

    const subscription = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setNotifications((prev) => [payload.new, ...prev]);
          setUnreadCount((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [userId]);

  return (
    <Dropdown align="end">
      <Dropdown.Toggle variant="outline-primary" className="position-relative">
        {unreadCount > 0 ? <BsBellFill className="text-warning" /> : <BsBell />}
        {unreadCount > 0 && (
          <Badge
            bg="danger"
            pill
            className="position-absolute top-0 start-100 translate-middle"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </Badge>
        )}
      </Dropdown.Toggle>

      <Dropdown.Menu
        style={{ width: "350px", maxHeight: "400px", overflowY: "auto" }}
      >
        <Dropdown.Header>
          <div className="d-flex justify-content-between align-items-center">
            <span>Notifications</span>
            {unreadCount > 0 && (
              <Badge bg="primary" pill>
                {unreadCount} unread
              </Badge>
            )}
          </div>
        </Dropdown.Header>

        {loading ? (
          <Dropdown.ItemText>
            <div className="text-center py-2">
              <Spinner animation="border" size="sm" />
              <span className="ms-2">Loading...</span>
            </div>
          </Dropdown.ItemText>
        ) : notifications.length === 0 ? (
          <Dropdown.ItemText className="text-muted text-center py-3">
            No notifications
          </Dropdown.ItemText>
        ) : (
          notifications.map((notification) => (
            <Dropdown.Item
              key={notification.id}
              className="py-2 border-bottom"
              onClick={() => markAsRead(notification.id)}
            >
              <div className="d-flex align-items-start">
                <div className="flex-grow-1">
                  <div className="small text-muted">
                    {new Date(notification.created_at).toLocaleDateString()} at{" "}
                    {new Date(notification.created_at).toLocaleTimeString()}
                  </div>
                  <div className="mt-1 small">{notification.message}</div>
                  {notification.project && (
                    <Badge bg="light" text="dark" className="mt-1">
                      Project: {notification.project.name}
                    </Badge>
                  )}
                </div>
                {!notification.is_read && (
                  <div className="ms-2">
                    <div
                      className="bg-primary rounded-circle"
                      style={{ width: "8px", height: "8px" }}
                    ></div>
                  </div>
                )}
              </div>
            </Dropdown.Item>
          ))
        )}

        {notifications.length > 0 && <Dropdown.Divider />}

        <Dropdown.Item
          as="button"
          className="text-center text-primary"
          onClick={fetchNotifications}
        >
          Refresh Notifications
        </Dropdown.Item>
      </Dropdown.Menu>
    </Dropdown>
  );
};

export default Notifications;
