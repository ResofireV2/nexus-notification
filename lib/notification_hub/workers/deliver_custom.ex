defmodule NotificationHub.Workers.DeliverCustom do
  @moduledoc """
  Delivers a single custom notification to one user.

  Called directly from our API router rather than routing through Nexus core's
  DeliverNotification worker. DeliverNotification deduplicates on
  (user_id, actor_id, type, post_id, reply_id) with no read-state filter,
  which means a second custom notification from the same sender to the same
  recipient is silently dropped. By owning delivery ourselves we avoid that
  trap while still writing into the same notifications table and broadcasting
  on the same PubSub topic, so the recipient's bell updates in real time.
  """

  use Oban.Worker, queue: :extensions, max_attempts: 3

  alias Nexus.Notifications
  alias Nexus.Repo

  @impl Oban.Worker
  def perform(%Oban.Job{args: args}) do
    user_id  = args["user_id"]
    actor_id = args["actor_id"]
    message  = args["message"]
    url      = args["url"]
    icon     = args["icon"] || "fa-bell"
    excerpt  = args["excerpt"] || ""

    attrs = %{
      type:     "extension",
      user_id:  user_id,
      actor_id: actor_id,
      data: %{
        "ext_type"  => "notification_hub_custom",
        "ext_slug"  => "notification-hub",
        "message"   => message,
        "url"       => url,
        "icon"      => icon,
        "excerpt"   => excerpt,
      }
    }

    case Notifications.create_notification(attrs) do
      {:ok, notification} ->
        notification = Repo.preload(notification, [:actor])
        broadcast(notification)
        :ok

      {:error, changeset} ->
        {:error, "Failed to create notification: #{inspect(changeset.errors)}"}
    end
  end

  defp broadcast(notification) do
    payload = %{
      id:           notification.id,
      type:         notification.type,
      read:         notification.read,
      data:         notification.data,
      group_count:  1,
      group_actors: [],
      inserted_at:  notification.inserted_at,
      actor:        actor_json(notification.actor),
      post_id:      nil,
      reply_id:     nil,
      message_id:   nil
    }

    Phoenix.PubSub.broadcast(
      Nexus.PubSub,
      "notifications:#{notification.user_id}",
      {:new_notification, payload}
    )

    count = Notifications.unread_count(notification.user_id)
    Phoenix.PubSub.broadcast(
      Nexus.PubSub,
      "notifications:#{notification.user_id}",
      {:unread_count, count}
    )
  end

  defp actor_json(nil), do: nil
  defp actor_json(u),   do: %{id: u.id, username: u.username, avatar_url: u.avatar_url}
end
