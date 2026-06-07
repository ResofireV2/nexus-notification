defmodule NotificationHub.Type do
  use Ecto.Schema
  import Ecto.Changeset

  schema "notification_hub_types" do
    field :name,            :string
    field :description,     :string
    field :default_icon,    :string
    field :default_message, :string
    field :default_url,     :string
    field :excerpt,         :string
    field :is_active,       :boolean, default: true
    field :sort_order,      :integer, default: 0

    timestamps(type: :utc_datetime)
  end

  def changeset(type, attrs) do
    type
    |> cast(attrs, [:name, :description, :default_icon, :default_message, :default_url, :excerpt, :is_active, :sort_order])
    |> validate_required([:name])
    |> validate_length(:name, max: 100)
  end
end
