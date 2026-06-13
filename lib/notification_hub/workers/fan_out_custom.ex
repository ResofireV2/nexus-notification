defmodule NotificationHub.Workers.FanOutCustom do
  @moduledoc """
  Fans out a custom notification to all active members or to all members
  of a specific group, in cursor-based batches of 200.

  Enqueued once by the broadcast API endpoint. Each batch enqueues one
  DeliverCustom job per user, then re-enqueues itself with the next cursor
  until all recipients have been covered.

  args:
    actor_id  — integer, the sending user's id
    message   — string
    url       — string
    icon      — string (FA class)
    excerpt   — string
    mode      — "all" | "group"
    group_id  — integer | nil (required when mode is "group")
    after_id  — integer cursor, defaults to 0
  """

  use Oban.Worker, queue: :extensions, max_attempts: 3

  import Ecto.Query

  alias Nexus.Repo
  alias Nexus.Accounts.User
  alias Nexus.Groups.GroupMembership

  @batch_size 200

  @impl Oban.Worker
  def perform(%Oban.Job{args: args}) do
    actor_id = args["actor_id"]
    message  = args["message"]
    url      = args["url"]
    icon     = args["icon"] || "fa-bell"
    excerpt  = args["excerpt"] || ""
    mode     = args["mode"]
    group_id = args["group_id"]
    role     = args["role"]
    after_id = args["after_id"] || 0

    user_ids = fetch_batch(mode, group_id, role, actor_id, after_id)

    Enum.each(user_ids, fn user_id ->
      %{
        user_id:  user_id,
        actor_id: actor_id,
        message:  message,
        url:      url,
        icon:     icon,
        excerpt:  excerpt
      }
      |> NotificationHub.Workers.DeliverCustom.new()
      |> Oban.insert()
    end)

    if length(user_ids) == @batch_size do
      args
      |> Map.put("after_id", List.last(user_ids))
      |> __MODULE__.new()
      |> Oban.insert()
    end

    :ok
  end

  defp fetch_batch("all", _group_id, _role, actor_id, after_id) do
    Repo.all(
      from u in User,
        where: u.id != ^actor_id
           and u.status == "active"
           and u.id > ^after_id,
        order_by: [asc: u.id],
        select: u.id,
        limit: @batch_size
    )
  end

  defp fetch_batch("group", group_id, _role, actor_id, after_id) do
    Repo.all(
      from u in User,
        join: m in GroupMembership, on: m.user_id == u.id,
        where: m.group_id == ^group_id
           and u.id != ^actor_id
           and u.status == "active"
           and u.id > ^after_id,
        order_by: [asc: u.id],
        select: u.id,
        limit: @batch_size
    )
  end

  defp fetch_batch("role", _group_id, role, actor_id, after_id) do
    Repo.all(
      from u in User,
        where: u.role == ^role
           and u.id != ^actor_id
           and u.status == "active"
           and u.id > ^after_id,
        order_by: [asc: u.id],
        select: u.id,
        limit: @batch_size
    )
  end
end
