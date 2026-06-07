defmodule NotificationHub.Migrations.V1CreateTypes do
  use Ecto.Migration

  def change do
    create_if_not_exists table(:notification_hub_types) do
      add :name,            :string,  null: false
      add :description,     :text
      add :default_icon,    :string
      add :default_message, :text
      add :default_url,     :string
      add :excerpt,         :string
      add :is_active,       :boolean, null: false, default: true
      add :sort_order,      :integer, null: false, default: 0

      timestamps(type: :utc_datetime)
    end
  end
end
