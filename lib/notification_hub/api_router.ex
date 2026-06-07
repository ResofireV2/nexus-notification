defmodule NotificationHub.ApiRouter do
  use Plug.Router

  import Plug.Conn
  import Ecto.Query

  alias NotificationHub.Type
  alias Nexus.Repo
  alias Nexus.Extensions.Permissions

  plug :match
  plug :dispatch

  # ---------------------------------------------------------------------------
  # GET /types — list all notification types
  # ---------------------------------------------------------------------------

  get "/types" do
    user = conn.assigns[:current_user]

    case Permissions.check("notification-hub", "can_send_individual", user) do
      :error ->
        conn
        |> put_status(403)
        |> put_resp_content_type("application/json")
        |> send_resp(403, Jason.encode!(%{error: "Forbidden"}))

      :ok ->
        types =
          Repo.all(from t in Type, order_by: [asc: t.sort_order, asc: t.id])

        conn
        |> put_resp_content_type("application/json")
        |> send_resp(200, Jason.encode!(%{types: Enum.map(types, &type_json/1)}))
    end
  end

  # ---------------------------------------------------------------------------
  # POST /types — create a notification type
  # ---------------------------------------------------------------------------

  post "/types" do
    user = conn.assigns[:current_user]

    case Permissions.check("notification-hub", "can_send_broadcast", user) do
      :error ->
        conn
        |> put_status(403)
        |> put_resp_content_type("application/json")
        |> send_resp(403, Jason.encode!(%{error: "Forbidden"}))

      :ok ->
        params = conn.body_params

        changeset = Type.changeset(%Type{}, %{
          name:            params["name"],
          description:     params["description"],
          default_icon:    params["default_icon"],
          default_message: params["default_message"],
          default_url:     params["default_url"],
          excerpt:         params["excerpt"],
          is_active:       Map.get(params, "is_active", true),
          sort_order:      Map.get(params, "sort_order", 0)
        })

        case Repo.insert(changeset) do
          {:ok, type} ->
            conn
            |> put_resp_content_type("application/json")
            |> send_resp(201, Jason.encode!(%{type: type_json(type)}))

          {:error, changeset} ->
            errors = format_errors(changeset)
            conn
            |> put_status(422)
            |> put_resp_content_type("application/json")
            |> send_resp(422, Jason.encode!(%{errors: errors}))
        end
    end
  end

  # ---------------------------------------------------------------------------
  # PATCH /types/:id — update a notification type
  # ---------------------------------------------------------------------------

  patch "/types/:id" do
    user = conn.assigns[:current_user]

    case Permissions.check("notification-hub", "can_send_broadcast", user) do
      :error ->
        conn
        |> put_status(403)
        |> put_resp_content_type("application/json")
        |> send_resp(403, Jason.encode!(%{error: "Forbidden"}))

      :ok ->
        case Repo.get(Type, conn.params["id"]) do
          nil ->
            conn
            |> put_status(404)
            |> put_resp_content_type("application/json")
            |> send_resp(404, Jason.encode!(%{error: "Not found"}))

          type ->
            params = conn.body_params

            changeset = Type.changeset(type, %{
              name:            params["name"] || type.name,
              description:     Map.get(params, "description", type.description),
              default_icon:    Map.get(params, "default_icon", type.default_icon),
              default_message: Map.get(params, "default_message", type.default_message),
              default_url:     Map.get(params, "default_url", type.default_url),
              excerpt:         Map.get(params, "excerpt", type.excerpt),
              is_active:       Map.get(params, "is_active", type.is_active),
              sort_order:      Map.get(params, "sort_order", type.sort_order)
            })

            case Repo.update(changeset) do
              {:ok, updated} ->
                conn
                |> put_resp_content_type("application/json")
                |> send_resp(200, Jason.encode!(%{type: type_json(updated)}))

              {:error, changeset} ->
                errors = format_errors(changeset)
                conn
                |> put_status(422)
                |> put_resp_content_type("application/json")
                |> send_resp(422, Jason.encode!(%{errors: errors}))
            end
        end
    end
  end

  # ---------------------------------------------------------------------------
  # DELETE /types/:id — delete a notification type
  # ---------------------------------------------------------------------------

  delete "/types/:id" do
    user = conn.assigns[:current_user]

    case Permissions.check("notification-hub", "can_send_broadcast", user) do
      :error ->
        conn
        |> put_status(403)
        |> put_resp_content_type("application/json")
        |> send_resp(403, Jason.encode!(%{error: "Forbidden"}))

      :ok ->
        case Repo.get(Type, conn.params["id"]) do
          nil ->
            conn
            |> put_status(404)
            |> put_resp_content_type("application/json")
            |> send_resp(404, Jason.encode!(%{error: "Not found"}))

          type ->
            Repo.delete!(type)

            conn
            |> put_resp_content_type("application/json")
            |> send_resp(200, Jason.encode!(%{ok: true}))
        end
    end
  end

  # ---------------------------------------------------------------------------
  # Catch-all
  # ---------------------------------------------------------------------------

  match _ do
    conn
    |> put_status(404)
    |> put_resp_content_type("application/json")
    |> send_resp(404, Jason.encode!(%{error: "Not found"}))
  end

  # ---------------------------------------------------------------------------
  # Private
  # ---------------------------------------------------------------------------

  defp type_json(t) do
    %{
      id:              t.id,
      name:            t.name,
      description:     t.description,
      default_icon:    t.default_icon,
      default_message: t.default_message,
      default_url:     t.default_url,
      excerpt:         t.excerpt,
      is_active:       t.is_active,
      sort_order:      t.sort_order,
      inserted_at:     t.inserted_at,
      updated_at:      t.updated_at
    }
  end

  defp format_errors(changeset) do
    Ecto.Changeset.traverse_errors(changeset, fn {msg, opts} ->
      Enum.reduce(opts, msg, fn {key, value}, acc ->
        String.replace(acc, "%{#{key}}", to_string(value))
      end)
    end)
  end
end
