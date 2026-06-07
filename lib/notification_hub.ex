defmodule NotificationHub do
  @moduledoc """
  Notification Hub — send custom notifications to individual users or broadcast
  to all members. Provides an admin panel for managing reusable notification
  type templates, and injects send actions into the account dropdown and user
  card popover.
  """

  use Nexus.Extensions.Behaviour

  @impl true
  def migrations do
    [
      NotificationHub.Migrations.V1CreateTypes,
    ]
  end

  @impl true
  def routes do
    [{"/", NotificationHub.ApiRouter, []}]
  end
end
