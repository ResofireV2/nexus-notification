(function () {
  "use strict";

  const NE   = window.NexusExtensions;
  const SLUG = "notification-hub";
  const R    = window.React;
  const { useState, useEffect, useCallback, useRef } = R;
  const { toast, Av } = window.NexusComponents;

  // ---------------------------------------------------------------------------
  // API helpers — extension endpoints
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
  // SendModal — compose and send a notification to a single user
  //
  // Props:
  //   targetUser   — full user object (id, username, avatar_url, avatar_color)
  //   onClose      — called when the modal should be dismissed
  // ---------------------------------------------------------------------------

  function SendModal({ targetUser, onClose }) {
    const [types, setTypes]         = useState(null);   // null = loading
    const [selectedType, setSelectedType] = useState(null);
    const [message, setMessage]     = useState("");
    const [url, setUrl]             = useState("");
    const [sending, setSending]     = useState(false);

    // Load active notification types from our extension API
    useEffect(() => {
      apiGet("/types").then(d => {
        if (d.types) {
          const active = d.types.filter(t => t.is_active);
          setTypes(active);
          if (active.length > 0) {
            setSelectedType(active[0]);
            setMessage(active[0].default_message || "");
            setUrl(active[0].default_url || "");
          }
        } else {
          setTypes([]);
        }
      }).catch(() => setTypes([]));
    }, []);

    function handleTypeChange(typeId) {
      const t = (types || []).find(t => String(t.id) === String(typeId));
      if (!t) return;
      setSelectedType(t);
      setMessage(t.default_message || "");
      setUrl(t.default_url || "");
    }

    async function handleSend() {
      if (!message.trim()) {
        toast("Message is required", "err");
        return;
      }
      if (!url.trim()) {
        toast("URL is required", "err");
        return;
      }
      if (!selectedType) {
        toast("Select a notification type", "err");
        return;
      }

      setSending(true);
      try {
        const result = await apiPost("/send", {
          target_user_id: targetUser.id,
          message:        message.trim(),
          url:            url.trim(),
          icon:           selectedType.default_icon || "fa-bell",
          excerpt:        selectedType.excerpt || "",
        });

        if (result.ok) {
          toast(`Notification sent to ${targetUser.username}`);
          onClose();
        } else {
          toast(result.error || "Failed to send notification", "err");
        }
      } catch {
        toast("Request failed", "err");
      } finally {
        setSending(false);
      }
    }

    const overlayStyle = {
      position: "fixed", inset: 0,
      background: "rgba(0,0,0,0.65)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 8500, padding: 20,
    };

    const cardStyle = {
      width: "100%", maxWidth: 480,
      background: "var(--s2)",
      border: "0.5px solid var(--b2)",
      borderRadius: 16,
      padding: 28,
      position: "relative",
      maxHeight: "90vh",
      overflowY: "auto",
    };

    return R.createElement("div", {
      style: overlayStyle,
      onClick: e => e.target === e.currentTarget && onClose(),
    },
      R.createElement("div", { style: cardStyle },

        // Header
        R.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 } },
          R.createElement("div", { style: { fontSize: 16, fontWeight: 600, color: "var(--t1)" } }, "Send Notification"),
          R.createElement("button", {
            onClick: onClose,
            style: { background: "none", border: "none", color: "var(--t4)", fontSize: 18, cursor: "pointer", lineHeight: 1 },
          }, "✕")
        ),

        // Recipient
        R.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "var(--s3)", borderRadius: 10, marginBottom: 20 } },
          R.createElement(Av, { user: targetUser, size: 36 }),
          R.createElement("div", null,
            R.createElement("div", { style: { fontSize: 13, fontWeight: 500, color: "var(--t1)" } }, targetUser.username),
            R.createElement("div", { style: { fontSize: 11, color: "var(--t4)", marginTop: 2 } }, "Recipient")
          )
        ),

        // Notification type
        R.createElement("div", { className: "fg" },
          R.createElement("label", { className: "fl" }, "Notification type"),
          types === null
            ? R.createElement("div", { style: { padding: "10px 0", color: "var(--t5)", fontSize: 13 } },
                R.createElement("i", { className: "fa-solid fa-spinner fa-spin", style: { marginRight: 8 } }),
                "Loading types…"
              )
            : types.length === 0
            ? R.createElement("div", { style: { padding: "10px 0", color: "var(--red)", fontSize: 13 } },
                "No active notification types. Create one in the admin panel first."
              )
            : R.createElement(window.NexusComponents.Select, {
                value: selectedType ? String(selectedType.id) : "",
                onChange: handleTypeChange,
                options: types.map(t => ({ value: String(t.id), label: t.name })),
                disabled: sending,
              })
        ),

        // Message
        R.createElement("div", { className: "fg" },
          R.createElement("label", { className: "fl" }, "Message"),
          R.createElement("textarea", {
            className: "fi",
            value: message,
            onChange: e => setMessage(e.target.value),
            placeholder: "Notification message…",
            rows: 4,
            style: { resize: "vertical" },
            disabled: sending,
          })
        ),

        // URL
        R.createElement("div", { className: "fg" },
          R.createElement("label", { className: "fl" }, "Link"),
          R.createElement("input", {
            className: "fi",
            value: url,
            onChange: e => setUrl(e.target.value),
            placeholder: "https://",
            disabled: sending,
          }),
          R.createElement("div", { className: "f-hint" }, "Where the notification navigates when clicked")
        ),

        // Actions
        R.createElement("div", { style: { display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 } },
          R.createElement("button", { className: "btn-ghost", onClick: onClose, disabled: sending }, "Cancel"),
          R.createElement("button", {
            className: "btn-primary",
            onClick: handleSend,
            disabled: sending || types === null || types.length === 0,
          }, sending ? "Sending…" : "Send notification")
        )
      )
    );
  }

  // ---------------------------------------------------------------------------
  // ModalHost — mounts in a separate React root on document.body.
  // Provides showSendModal / hideSendModal to the rest of the bundle.
  // ---------------------------------------------------------------------------

  let _setModalState = null;

  function ModalHost() {
    const [modal, setModal] = useState(null); // null | { targetUser }

    useEffect(() => {
      _setModalState = setModal;
      return () => { _setModalState = null; };
    }, []);

    if (!modal) return null;

    return R.createElement(SendModal, {
      targetUser: modal.targetUser,
      onClose: () => setModal(null),
    });
  }

  function showSendModal(targetUser) {
    if (_setModalState) {
      _setModalState({ targetUser });
    }
  }

  // Mount the modal host into a dedicated div on body
  (function mountModalHost() {
    const container = document.createElement("div");
    container.id = "nh-modal-host";
    document.body.appendChild(container);
    window.ReactDOM.createRoot(container).render(R.createElement(ModalHost));
  })();

  // ---------------------------------------------------------------------------
  // TypeModal — create or edit a notification type (admin panel)
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
  // Admin panel
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
      if (!url) return;
      // Internal SPA paths (start with /) — resolve through the Nexus router.
      // External URLs — open in a new tab.
      if (url.startsWith("/")) {
        window.NexusExtensions.navigate(url);
      } else {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    },
  });

  // ---------------------------------------------------------------------------
  // User card action — "Send Notification" on another user's card
  // ---------------------------------------------------------------------------

  NE.registerUserAction({
    id:       "notification-hub-send",
    label:    "Send Notification",
    icon:     "fa-bell",
    authOnly: true,
    priority: 50,
    onClick({ user, currentUser, closeCard }) {
      // Don't send notifications to yourself
      if (currentUser && user.id === currentUser.id) {
        toast("You cannot send a notification to yourself", "warn");
        return;
      }
      closeCard();
      showSendModal(user);
    },
  });

  // ---------------------------------------------------------------------------
  // Admin panel registration
  // ---------------------------------------------------------------------------

  NE.registerAdminPanel(SLUG, {
    label:     "Notification Hub",
    icon:      "fa-bell",
    component: AdminPanel,
  });

})();
