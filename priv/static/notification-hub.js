(function () {
  "use strict";

  const NE   = window.NexusExtensions;
  const SLUG = "notification-hub";
  const R    = window.React;
  const { useState, useEffect, useCallback } = R;
  const { toast } = window.NexusComponents;

  // ---------------------------------------------------------------------------
  // API helpers
  // ---------------------------------------------------------------------------

  function apiGet(path) {
    const token = localStorage.getItem("nexus_token");
    return fetch(`/ext/${SLUG}/api${path}`, {
      headers: token ? { authorization: `Bearer ${token}` } : {},
    }).then(r => r.json());
  }

  function apiPost(path, body) {
    const token = localStorage.getItem("nexus_token");
    return fetch(`/ext/${SLUG}/api${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    }).then(r => r.json());
  }

  function apiPatch(path, body) {
    const token = localStorage.getItem("nexus_token");
    return fetch(`/ext/${SLUG}/api${path}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    }).then(r => r.json());
  }

  function apiDelete(path) {
    const token = localStorage.getItem("nexus_token");
    return fetch(`/ext/${SLUG}/api${path}`, {
      method: "DELETE",
      headers: token ? { authorization: `Bearer ${token}` } : {},
    }).then(r => r.json());
  }

  // ---------------------------------------------------------------------------
  // TypeModal — create or edit a notification type
  // ---------------------------------------------------------------------------

  function TypeModal({ existing, onClose, onSaved }) {
    const isEdit = !!existing;

    const [form, setForm] = useState({
      name:            existing?.name            || "",
      description:     existing?.description     || "",
      default_icon:    existing?.default_icon    || "fa-bell",
      default_message: existing?.default_message || "",
      default_url:     existing?.default_url     || "",
      excerpt:         existing?.excerpt         || "",
      is_active:       existing != null ? existing.is_active : true,
      sort_order:      existing?.sort_order      ?? 0,
    });

    const [saving, setSaving] = useState(false);

    function setField(key, value) {
      setForm(prev => ({ ...prev, [key]: value }));
    }

    async function handleSave() {
      if (!form.name.trim()) {
        toast("Name is required", "err");
        return;
      }
      setSaving(true);
      try {
        let result;
        if (isEdit) {
          result = await apiPatch(`/types/${existing.id}`, form);
        } else {
          result = await apiPost("/types", form);
        }
        if (result.type) {
          toast(isEdit ? "Notification type updated" : "Notification type created");
          onSaved(result.type);
          onClose();
        } else {
          const msg = result.errors?.name?.[0] || result.error || "Save failed";
          toast(msg, "err");
        }
      } catch {
        toast("Request failed", "err");
      } finally {
        setSaving(false);
      }
    }

    const overlayStyle = {
      position: "fixed", inset: 0,
      background: "rgba(0,0,0,0.6)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 600, padding: 20,
    };
    const cardStyle = {
      width: "100%", maxWidth: 520,
      background: "var(--s2)",
      border: "0.5px solid var(--b2)",
      borderRadius: 16,
      padding: 28,
      position: "relative",
      maxHeight: "90vh",
      overflowY: "auto",
    };

    return R.createElement("div", { style: overlayStyle, onClick: e => e.target === e.currentTarget && onClose() },
      R.createElement("div", { style: cardStyle },

        // Header
        R.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 } },
          R.createElement("div", { style: { fontSize: 16, fontWeight: 600, color: "var(--t1)" } },
            isEdit ? "Edit Notification Type" : "Add Notification Type"
          ),
          R.createElement("button", {
            onClick: onClose,
            style: { background: "none", border: "none", color: "var(--t4)", fontSize: 18, cursor: "pointer", lineHeight: 1 },
          }, "✕")
        ),

        // Name
        R.createElement("div", { className: "fg" },
          R.createElement("label", { className: "fl" }, "Name"),
          R.createElement("input", {
            className: "fi",
            value: form.name,
            onChange: e => setField("name", e.target.value),
            placeholder: "e.g. Announcement, Warning",
            disabled: saving,
          })
        ),

        // Description
        R.createElement("div", { className: "fg" },
          R.createElement("label", { className: "fl" }, "Description"),
          R.createElement("input", {
            className: "fi",
            value: form.description,
            onChange: e => setField("description", e.target.value),
            placeholder: "Short description of when this type is used",
            disabled: saving,
          })
        ),

        // Default icon
        R.createElement("div", { className: "fg" },
          R.createElement("label", { className: "fl" }, "Default icon"),
          R.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10 } },
            R.createElement("input", {
              className: "fi",
              value: form.default_icon,
              onChange: e => setField("default_icon", e.target.value),
              placeholder: "fa-bell",
              disabled: saving,
              style: { flex: 1 },
            }),
            R.createElement("i", {
              className: `fa-solid ${form.default_icon || "fa-bell"}`,
              style: { fontSize: 18, color: "var(--ac)", flexShrink: 0 },
            })
          ),
          R.createElement("div", { className: "f-hint" }, "Font Awesome solid icon class, e.g. fa-bell, fa-megaphone")
        ),

        // Default message
        R.createElement("div", { className: "fg" },
          R.createElement("label", { className: "fl" }, "Default message"),
          R.createElement("textarea", {
            className: "fi",
            value: form.default_message,
            onChange: e => setField("default_message", e.target.value),
            placeholder: "Pre-filled message when this type is selected",
            disabled: saving,
            rows: 3,
            style: { resize: "vertical" },
          })
        ),

        // Default URL
        R.createElement("div", { className: "fg" },
          R.createElement("label", { className: "fl" }, "Default URL"),
          R.createElement("input", {
            className: "fi",
            value: form.default_url,
            onChange: e => setField("default_url", e.target.value),
            placeholder: "https://",
            disabled: saving,
          })
        ),

        // Excerpt
        R.createElement("div", { className: "fg" },
          R.createElement("label", { className: "fl" }, "Excerpt"),
          R.createElement("input", {
            className: "fi",
            value: form.excerpt,
            onChange: e => setField("excerpt", e.target.value),
            placeholder: "Short text shown below the notification title",
            disabled: saving,
          })
        ),

        // Sort order
        R.createElement("div", { className: "fg" },
          R.createElement("label", { className: "fl" }, "Sort order"),
          R.createElement("input", {
            className: "fi",
            type: "number",
            value: form.sort_order,
            onChange: e => setField("sort_order", parseInt(e.target.value, 10) || 0),
            disabled: saving,
            style: { width: 100 },
          }),
          R.createElement("div", { className: "f-hint" }, "Lower numbers appear first in the send modal dropdown")
        ),

        // Active toggle
        R.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "0.5px solid var(--b1)", marginBottom: 22 } },
          R.createElement("div", null,
            R.createElement("div", { style: { fontSize: 13, color: "var(--t2)", fontWeight: 500 } }, "Active"),
            R.createElement("div", { style: { fontSize: 12, color: "var(--t4)", marginTop: 2 } }, "Inactive types are hidden from the send modal")
          ),
          R.createElement(window.NexusComponents.Toggle, {
            value: form.is_active,
            onChange: v => setField("is_active", v),
          })
        ),

        // Actions
        R.createElement("div", { style: { display: "flex", gap: 10, justifyContent: "flex-end" } },
          R.createElement("button", { className: "btn-ghost", onClick: onClose, disabled: saving }, "Cancel"),
          R.createElement("button", { className: "btn-primary", onClick: handleSave, disabled: saving },
            saving ? "Saving…" : (isEdit ? "Save changes" : "Create type")
          )
        )
      )
    );
  }

  // ---------------------------------------------------------------------------
  // TypesTable — lists all notification types with edit/delete actions
  // ---------------------------------------------------------------------------

  function TypesTable() {
    const [types, setTypes]       = useState(null);
    const [modal, setModal]       = useState(null); // null | "create" | { type }
    const [deleting, setDeleting] = useState(null);

    const load = useCallback(() => {
      apiGet("/types").then(d => {
        if (d.types) setTypes(d.types);
        else if (d.error === "Forbidden") setTypes("forbidden");
      }).catch(() => setTypes("error"));
    }, []);

    useEffect(() => { load(); }, [load]);

    async function handleDelete(type) {
      if (!window.confirm(`Delete "${type.name}"? This cannot be undone.`)) return;
      setDeleting(type.id);
      try {
        const result = await apiDelete(`/types/${type.id}`);
        if (result.ok) {
          setTypes(prev => Array.isArray(prev) ? prev.filter(t => t.id !== type.id) : prev);
          toast("Notification type deleted");
        } else {
          toast(result.error || "Delete failed", "err");
        }
      } catch {
        toast("Request failed", "err");
      } finally {
        setDeleting(null);
      }
    }

    function handleSaved(savedType) {
      setTypes(prev => {
        if (!Array.isArray(prev)) return [savedType];
        const exists = prev.find(t => t.id === savedType.id);
        if (exists) return prev.map(t => t.id === savedType.id ? savedType : t);
        return [...prev, savedType].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
      });
    }

    if (types === null) {
      return R.createElement("div", { style: { padding: "48px 0", textAlign: "center", color: "var(--t5)", fontSize: 13 } },
        R.createElement("i", { className: "fa-solid fa-spinner fa-spin" })
      );
    }

    if (types === "forbidden") {
      return R.createElement("div", { style: { padding: "48px 0", textAlign: "center", color: "var(--t5)", fontSize: 13 } },
        "You don't have permission to manage notification types."
      );
    }

    if (types === "error") {
      return R.createElement("div", { style: { padding: "48px 0", textAlign: "center", color: "var(--red)", fontSize: 13 } },
        "Failed to load notification types."
      );
    }

    return R.createElement("div", null,

      // Toolbar
      R.createElement("div", { style: { display: "flex", justifyContent: "flex-end", marginBottom: 16 } },
        R.createElement("button", { className: "btn-primary", onClick: () => setModal("create") },
          R.createElement("i", { className: "fa-solid fa-plus", style: { marginRight: 7 } }),
          "Add type"
        )
      ),

      // Empty state
      types.length === 0
        ? R.createElement("div", { style: { padding: "48px 0", textAlign: "center", color: "var(--t5)", fontSize: 13, border: "0.5px solid var(--b1)", borderRadius: 12 } },
            "No notification types yet. Add one to get started."
          )
        : R.createElement("div", { className: "atbl-wrap" },
            R.createElement("table", { className: "atbl", style: { width: "100%" } },
              R.createElement("thead", null,
                R.createElement("tr", null,
                  R.createElement("th", null, "Name"),
                  R.createElement("th", null, "Icon"),
                  R.createElement("th", null, "Status"),
                  R.createElement("th", null, "Order"),
                  R.createElement("th", null, "Actions"),
                )
              ),
              R.createElement("tbody", null,
                types.map(type =>
                  R.createElement("tr", { key: type.id },
                    R.createElement("td", null,
                      R.createElement("div", { style: { fontWeight: 500, color: "var(--t1)", fontSize: 13 } }, type.name),
                      type.description && R.createElement("div", { style: { fontSize: 11, color: "var(--t4)", marginTop: 2 } }, type.description)
                    ),
                    R.createElement("td", null,
                      R.createElement("i", { className: `fa-solid ${type.default_icon || "fa-bell"}`, style: { color: "var(--ac)" } })
                    ),
                    R.createElement("td", null,
                      R.createElement("span", {
                        className: "sp-tag",
                        style: {
                          color: type.is_active ? "var(--green)" : "var(--t5)",
                          border: `0.5px solid ${type.is_active ? "var(--green)" : "var(--b2)"}`,
                        },
                      }, type.is_active ? "Active" : "Inactive")
                    ),
                    R.createElement("td", { style: { color: "var(--t4)", fontSize: 12 } }, type.sort_order),
                    R.createElement("td", null,
                      R.createElement("div", { style: { display: "flex", gap: 8 } },
                        R.createElement("button", {
                          className: "btn-ghost",
                          style: { fontSize: 12, padding: "4px 12px" },
                          onClick: () => setModal({ type }),
                        }, "Edit"),
                        R.createElement("button", {
                          className: "btn-ghost",
                          style: { fontSize: 12, padding: "4px 12px", color: "var(--red)", borderColor: "var(--red)" },
                          onClick: () => handleDelete(type),
                          disabled: deleting === type.id,
                        }, deleting === type.id ? "…" : "Delete")
                      )
                    )
                  )
                )
              )
            )
          ),

      // Modal
      modal === "create" && R.createElement(TypeModal, {
        existing: null,
        onClose: () => setModal(null),
        onSaved: handleSaved,
      }),
      modal?.type && R.createElement(TypeModal, {
        existing: modal.type,
        onClose: () => setModal(null),
        onSaved: handleSaved,
      })
    );
  }

  // ---------------------------------------------------------------------------
  // Admin panel — TabbedPanel with a Types tab (more tabs coming in later stages)
  // ---------------------------------------------------------------------------

  function AdminPanel() {
    const { TabbedPanel } = window.NexusExtensionTemplates;

    return R.createElement(TabbedPanel, {
      tabs: [
        {
          key:    "types",
          label:  "Notification Types",
          icon:   "fa-list",
          render: () => R.createElement(TypesTable),
        },
      ],
    });
  }

  // ---------------------------------------------------------------------------
  // Notification type renderer
  // ---------------------------------------------------------------------------

  NE.registerNotificationType("notification_hub_custom", {
    icon:      "fa-bell",
    iconColor: "var(--ac)",
    renderBody(n) {
      return R.createElement("span", { style: { color: "var(--t2)" } },
        n.data?.message || "You have a new notification"
      );
    },
    onClick({ n }) {
      const url = n.data?.url;
      if (url) window.NexusExtensions.navigate(url);
    },
  });

  // ---------------------------------------------------------------------------
  // Register admin panel
  // ---------------------------------------------------------------------------

  NE.registerAdminPanel(SLUG, {
    label:     "Notification Hub",
    icon:      "fa-bell",
    component: AdminPanel,
  });

})();
