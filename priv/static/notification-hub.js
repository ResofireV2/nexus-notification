(function () {
  "use strict";

  const NE   = window.NexusExtensions;
  const SLUG = "notification-hub";
  const R    = window.React;
  const { useState, useEffect, useCallback } = R;
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
  // Shared: load active notification types
  // ---------------------------------------------------------------------------

  function useTypes() {
    const [types, setTypes] = useState(null);

    useEffect(() => {
      apiGet("/types").then(d => {
        if (d.types) {
          setTypes(d.types.filter(t => t.is_active));
        } else {
          setTypes([]);
        }
      }).catch(() => setTypes([]));
    }, []);

    return types;
  }

  // ---------------------------------------------------------------------------
  // Shared: type + message + url form fields (used in both modals)
  // ---------------------------------------------------------------------------

  function NotificationFields({ types, selectedType, onTypeChange, message, onMessage, url, onUrl, disabled }) {
    if (types === null) {
      return R.createElement("div", { style: { padding: "16px 0", color: "var(--t5)", fontSize: 13 } },
        R.createElement("i", { className: "fa-solid fa-spinner fa-spin", style: { marginRight: 8 } }),
        "Loading types…"
      );
    }

    if (types.length === 0) {
      return R.createElement("div", { style: { padding: "10px 0", color: "var(--red)", fontSize: 13 } },
        "No active notification types. Create one in the admin panel first."
      );
    }

    return R.createElement(R.Fragment, null,
      // Type
      R.createElement("div", { className: "fg" },
        R.createElement("label", { className: "fl" }, "Notification type"),
        R.createElement(window.NexusComponents.Select, {
          value: selectedType ? String(selectedType.id) : "",
          onChange: onTypeChange,
          options: types.map(t => ({ value: String(t.id), label: t.name })),
          disabled,
        })
      ),

      // Message
      R.createElement("div", { className: "fg" },
        R.createElement("label", { className: "fl" }, "Message"),
        R.createElement("textarea", {
          className: "fi",
          value: message,
          onChange: e => onMessage(e.target.value),
          placeholder: "Notification message…",
          rows: 4,
          style: { resize: "vertical" },
          disabled,
        })
      ),

      // URL
      R.createElement("div", { className: "fg" },
        R.createElement("label", { className: "fl" }, "Link"),
        R.createElement("input", {
          className: "fi",
          value: url,
          onChange: e => onUrl(e.target.value),
          placeholder: "https:// or /path",
          disabled,
        }),
        R.createElement("div", { className: "f-hint" }, "Where the notification navigates when clicked")
      )
    );
  }

  // ---------------------------------------------------------------------------
  // SendModal — individual notification to one user (from user card action)
  // ---------------------------------------------------------------------------

  function SendModal({ targetUser, onClose }) {
    const types                         = useTypes();
    const [selectedType, setSelectedType] = useState(null);
    const [message, setMessage]         = useState("");
    const [url, setUrl]                 = useState("");
    const [sending, setSending]         = useState(false);

    // Pre-fill from first type once loaded
    useEffect(() => {
      if (types && types.length > 0 && !selectedType) {
        setSelectedType(types[0]);
        setMessage(types[0].default_message || "");
        setUrl(types[0].default_url || "");
      }
    }, [types]);

    function handleTypeChange(typeId) {
      const t = (types || []).find(t => String(t.id) === String(typeId));
      if (!t) return;
      setSelectedType(t);
      setMessage(t.default_message || "");
      setUrl(t.default_url || "");
    }

    async function handleSend() {
      if (!message.trim()) { toast("Message is required", "err"); return; }
      if (!url.trim())     { toast("Link is required", "err");    return; }
      if (!selectedType)   { toast("Select a notification type", "err"); return; }

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

    return R.createElement(ModalOverlay, { onClose },
      R.createElement("div", { style: { fontSize: 16, fontWeight: 600, color: "var(--t1)", marginBottom: 22 } }, "Send Notification"),

      // Recipient
      R.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "var(--s3)", borderRadius: 10, marginBottom: 20 } },
        R.createElement(Av, { user: targetUser, size: 36 }),
        R.createElement("div", null,
          R.createElement("div", { style: { fontSize: 13, fontWeight: 500, color: "var(--t1)" } }, targetUser.username),
          R.createElement("div", { style: { fontSize: 11, color: "var(--t4)", marginTop: 2 } }, "Recipient")
        )
      ),

      R.createElement(NotificationFields, {
        types, selectedType, onTypeChange: handleTypeChange,
        message, onMessage: setMessage,
        url, onUrl: setUrl,
        disabled: sending,
      }),

      R.createElement(ModalActions, { onClose, onSend: handleSend, sending,
        canSend: !!(selectedType && types && types.length > 0) })
    );
  }

  // ---------------------------------------------------------------------------
  // BroadcastModal — fan-out to all members or a group (from account action)
  // ---------------------------------------------------------------------------

  function BroadcastModal({ onClose }) {
    const types                           = useTypes();
    const [selectedType, setSelectedType] = useState(null);
    const [message, setMessage]           = useState("");
    const [url, setUrl]                   = useState("");
    const [mode, setMode]                 = useState("all"); // "all" | "group" | "role"
    const [groups, setGroups]             = useState(null);
    const [selectedGroupId, setSelectedGroupId] = useState(null);
    const [selectedRole, setSelectedRole] = useState("member");
    const [sending, setSending]           = useState(false);

    // Pre-fill from first type once loaded
    useEffect(() => {
      if (types && types.length > 0 && !selectedType) {
        setSelectedType(types[0]);
        setMessage(types[0].default_message || "");
        setUrl(types[0].default_url || "");
      }
    }, [types]);

    // Load groups for the group picker
    useEffect(() => {
      apiGet("/groups").then(d => {
        if (d.groups) {
          setGroups(d.groups);
          if (d.groups.length > 0) setSelectedGroupId(d.groups[0].id);
        } else {
          setGroups([]);
        }
      }).catch(() => setGroups([]));
    }, []);

    function handleTypeChange(typeId) {
      const t = (types || []).find(t => String(t.id) === String(typeId));
      if (!t) return;
      setSelectedType(t);
      setMessage(t.default_message || "");
      setUrl(t.default_url || "");
    }

    const selectedGroup = (groups || []).find(g => g.id === selectedGroupId);
    const estimatedLabel = mode === "all"
      ? "all active members"
      : mode === "role"
        ? `all active ${selectedRole}s`
        : selectedGroup
          ? `${selectedGroup.member_count} member${selectedGroup.member_count !== 1 ? "s" : ""} in ${selectedGroup.name}`
          : "group members";

    async function handleSend() {
      if (!message.trim()) { toast("Message is required", "err"); return; }
      if (!url.trim())     { toast("Link is required", "err");    return; }
      if (!selectedType)   { toast("Select a notification type", "err"); return; }
      if (mode === "group" && !selectedGroupId) { toast("Select a group", "err"); return; }
      if (mode === "role"  && !selectedRole)    { toast("Select a role",  "err"); return; }

      setSending(true);
      try {
        const result = await apiPost("/broadcast", {
          mode:     mode,
          group_id: mode === "group" ? selectedGroupId : null,
          role:     mode === "role"  ? selectedRole    : null,
          message:  message.trim(),
          url:      url.trim(),
          icon:     selectedType.default_icon || "fa-bell",
          excerpt:  selectedType.excerpt || "",
        });

        if (result.ok) {
          const count = result.estimated_count;
          toast(`Sending to ${count} recipient${count !== 1 ? "s" : ""}…`);
          onClose();
        } else {
          toast(result.error || "Failed to send broadcast", "err");
        }
      } catch {
        toast("Request failed", "err");
      } finally {
        setSending(false);
      }
    }

    return R.createElement(ModalOverlay, { onClose },
      R.createElement("div", { style: { fontSize: 16, fontWeight: 600, color: "var(--t1)", marginBottom: 22 } }, "Send Broadcast"),

      // Target selector
      R.createElement("div", { className: "fg" },
        R.createElement("label", { className: "fl" }, "Recipients"),
        R.createElement("div", { style: { display: "flex", gap: 8, marginBottom: 10 } },
          R.createElement("button", {
            className: mode === "all" ? "btn-primary" : "btn-ghost",
            style: { fontSize: 13, padding: "6px 16px" },
            onClick: () => setMode("all"),
            disabled: sending,
          }, "All members"),
          R.createElement("button", {
            className: mode === "group" ? "btn-primary" : "btn-ghost",
            style: { fontSize: 13, padding: "6px 16px" },
            onClick: () => setMode("group"),
            disabled: sending,
          }, "Specific group"),
          R.createElement("button", {
            className: mode === "role" ? "btn-primary" : "btn-ghost",
            style: { fontSize: 13, padding: "6px 16px" },
            onClick: () => setMode("role"),
            disabled: sending,
          }, "Specific role")
        ),

        // Role picker — shown only when mode is "role"
        mode === "role" && (
          R.createElement("div", { style: { display: "flex", gap: 8, marginBottom: 10 } },
            ["member", "moderator", "admin"].map(role =>
              R.createElement("button", {
                key: role,
                className: selectedRole === role ? "btn-primary" : "btn-ghost",
                style: { fontSize: 12, padding: "5px 14px", textTransform: "capitalize" },
                onClick: () => setSelectedRole(role),
                disabled: sending,
              }, role.charAt(0).toUpperCase() + role.slice(1) + "s")
            )
          )
        ),

        // Group picker — shown only when mode is "group"
        mode === "group" && (
          groups === null
            ? R.createElement("div", { style: { color: "var(--t5)", fontSize: 13, padding: "6px 0" } },
                R.createElement("i", { className: "fa-solid fa-spinner fa-spin", style: { marginRight: 8 } }),
                "Loading groups…"
              )
            : groups.length === 0
            ? R.createElement("div", { style: { color: "var(--t5)", fontSize: 13, padding: "6px 0" } },
                "No groups found."
              )
            : R.createElement(window.NexusComponents.Select, {
                value: selectedGroupId ? String(selectedGroupId) : "",
                onChange: val => setSelectedGroupId(parseInt(val, 10)),
                options: groups.map(g => ({
                  value: String(g.id),
                  label: `${g.name} (${g.member_count})`,
                })),
                disabled: sending,
              })
        ),

        // Estimated recipients note
        R.createElement("div", { className: "f-hint", style: { marginTop: 6 } },
          `This will send to ${estimatedLabel}`
        )
      ),

      R.createElement(NotificationFields, {
        types, selectedType, onTypeChange: handleTypeChange,
        message, onMessage: setMessage,
        url, onUrl: setUrl,
        disabled: sending,
      }),

      R.createElement(ModalActions, { onClose, onSend: handleSend, sending,
        sendLabel: "Send broadcast",
        canSend: !!(selectedType && types && types.length > 0 && (mode === "all" || mode === "role" || selectedGroupId)) })
    );
  }

  // ---------------------------------------------------------------------------
  // Shared modal chrome
  // ---------------------------------------------------------------------------

  function ModalOverlay({ onClose, children }) {
    return R.createElement("div", {
      style: {
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.65)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 8500, padding: 20,
      },
      onClick: e => e.target === e.currentTarget && onClose(),
    },
      R.createElement("div", {
        style: {
          width: "100%", maxWidth: 480,
          background: "var(--s2)",
          border: "0.5px solid var(--b2)",
          borderRadius: 16,
          padding: 28,
          maxHeight: "90vh",
          overflowY: "auto",
          position: "relative",
        },
      },
        R.createElement("button", {
          onClick: onClose,
          style: { position: "absolute", top: 16, right: 18, background: "none", border: "none", color: "var(--t4)", fontSize: 18, cursor: "pointer", lineHeight: 1 },
        }, "✕"),
        ...children
      )
    );
  }

  function ModalActions({ onClose, onSend, sending, sendLabel = "Send notification", canSend }) {
    return R.createElement("div", { style: { display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 } },
      R.createElement("button", { className: "btn-ghost", onClick: onClose, disabled: sending }, "Cancel"),
      R.createElement("button", {
        className: "btn-primary",
        onClick: onSend,
        disabled: sending || !canSend,
      }, sending ? "Sending…" : sendLabel)
    );
  }

  // ---------------------------------------------------------------------------
  // ModalHost — single React root on body that handles both modal types
  // ---------------------------------------------------------------------------

  let _setModalState = null;

  function ModalHost() {
    const [modal, setModal] = useState(null);
    // modal: null | { kind: "send", targetUser } | { kind: "broadcast" }

    useEffect(() => {
      _setModalState = setModal;
      return () => { _setModalState = null; };
    }, []);

    if (!modal) return null;

    if (modal.kind === "send") {
      return R.createElement(SendModal, {
        targetUser: modal.targetUser,
        onClose: () => setModal(null),
      });
    }

    if (modal.kind === "broadcast") {
      return R.createElement(BroadcastModal, {
        onClose: () => setModal(null),
      });
    }

    return null;
  }

  function showSendModal(targetUser) {
    if (_setModalState) _setModalState({ kind: "send", targetUser });
  }

  function showBroadcastModal() {
    if (_setModalState) _setModalState({ kind: "broadcast" });
  }

  // Mount the modal host
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
      if (!form.name.trim()) { toast("Name is required", "err"); return; }
      setSaving(true);
      try {
        const result = isEdit
          ? await apiPatch(`/types/${existing.id}`, form)
          : await apiPost("/types", form);

        if (result.type) {
          toast(isEdit ? "Notification type updated" : "Notification type created");
          onSaved(result.type);
          onClose();
        } else {
          toast(result.errors?.name?.[0] || result.error || "Save failed", "err");
        }
      } catch {
        toast("Request failed", "err");
      } finally {
        setSaving(false);
      }
    }

    return R.createElement("div", {
      style: {
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 600, padding: 20,
      },
      onClick: e => e.target === e.currentTarget && onClose(),
    },
      R.createElement("div", {
        style: {
          width: "100%", maxWidth: 520,
          background: "var(--s2)", border: "0.5px solid var(--b2)",
          borderRadius: 16, padding: 28,
          maxHeight: "90vh", overflowY: "auto",
        },
      },
        R.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 } },
          R.createElement("div", { style: { fontSize: 16, fontWeight: 600, color: "var(--t1)" } },
            isEdit ? "Edit Notification Type" : "Add Notification Type"
          ),
          R.createElement("button", { onClick: onClose, style: { background: "none", border: "none", color: "var(--t4)", fontSize: 18, cursor: "pointer", lineHeight: 1 } }, "✕")
        ),

        R.createElement("div", { className: "fg" },
          R.createElement("label", { className: "fl" }, "Name"),
          R.createElement("input", { className: "fi", value: form.name, onChange: e => setField("name", e.target.value), placeholder: "e.g. Announcement, Warning", disabled: saving })
        ),
        R.createElement("div", { className: "fg" },
          R.createElement("label", { className: "fl" }, "Description"),
          R.createElement("input", { className: "fi", value: form.description, onChange: e => setField("description", e.target.value), placeholder: "Short description of when this type is used", disabled: saving })
        ),
        R.createElement("div", { className: "fg" },
          R.createElement("label", { className: "fl" }, "Default icon"),
          R.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10 } },
            R.createElement("input", { className: "fi", value: form.default_icon, onChange: e => setField("default_icon", e.target.value), placeholder: "fa-bell", disabled: saving, style: { flex: 1 } }),
            R.createElement("i", { className: `fa-solid ${form.default_icon || "fa-bell"}`, style: { fontSize: 18, color: "var(--ac)", flexShrink: 0 } })
          ),
          R.createElement("div", { className: "f-hint" }, "Font Awesome solid icon class, e.g. fa-bell, fa-megaphone")
        ),
        R.createElement("div", { className: "fg" },
          R.createElement("label", { className: "fl" }, "Default message"),
          R.createElement("textarea", { className: "fi", value: form.default_message, onChange: e => setField("default_message", e.target.value), placeholder: "Pre-filled message when this type is selected", disabled: saving, rows: 3, style: { resize: "vertical" } })
        ),
        R.createElement("div", { className: "fg" },
          R.createElement("label", { className: "fl" }, "Default URL"),
          R.createElement("input", { className: "fi", value: form.default_url, onChange: e => setField("default_url", e.target.value), placeholder: "https://", disabled: saving })
        ),
        R.createElement("div", { className: "fg" },
          R.createElement("label", { className: "fl" }, "Excerpt"),
          R.createElement("input", { className: "fi", value: form.excerpt, onChange: e => setField("excerpt", e.target.value), placeholder: "Short text shown below the notification title", disabled: saving })
        ),
        R.createElement("div", { className: "fg" },
          R.createElement("label", { className: "fl" }, "Sort order"),
          R.createElement("input", { className: "fi", type: "number", value: form.sort_order, onChange: e => setField("sort_order", parseInt(e.target.value, 10) || 0), disabled: saving, style: { width: 100 } }),
          R.createElement("div", { className: "f-hint" }, "Lower numbers appear first in the send modal dropdown")
        ),
        R.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "0.5px solid var(--b1)", marginBottom: 22 } },
          R.createElement("div", null,
            R.createElement("div", { style: { fontSize: 13, color: "var(--t2)", fontWeight: 500 } }, "Active"),
            R.createElement("div", { style: { fontSize: 12, color: "var(--t4)", marginTop: 2 } }, "Inactive types are hidden from the send modal")
          ),
          R.createElement(window.NexusComponents.Toggle, { value: form.is_active, onChange: v => setField("is_active", v) })
        ),
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
  // TypesTable — admin panel type management
  // ---------------------------------------------------------------------------

  function TypesTable() {
    const [types, setTypes]       = useState(null);
    const [modal, setModal]       = useState(null);
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

    if (types === null) return R.createElement("div", { style: { padding: "48px 0", textAlign: "center", color: "var(--t5)", fontSize: 13 } }, R.createElement("i", { className: "fa-solid fa-spinner fa-spin" }));
    if (types === "forbidden") return R.createElement("div", { style: { padding: "48px 0", textAlign: "center", color: "var(--t5)", fontSize: 13 } }, "You don't have permission to manage notification types.");
    if (types === "error") return R.createElement("div", { style: { padding: "48px 0", textAlign: "center", color: "var(--red)", fontSize: 13 } }, "Failed to load notification types.");

    return R.createElement("div", null,
      R.createElement("div", { style: { display: "flex", justifyContent: "flex-end", marginBottom: 16 } },
        R.createElement("button", { className: "btn-primary", onClick: () => setModal("create") },
          R.createElement("i", { className: "fa-solid fa-plus", style: { marginRight: 7 } }),
          "Add type"
        )
      ),

      types.length === 0
        ? R.createElement("div", { style: { padding: "48px 0", textAlign: "center", color: "var(--t5)", fontSize: 13, border: "0.5px solid var(--b1)", borderRadius: 12 } }, "No notification types yet. Add one to get started.")
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
                    R.createElement("td", null, R.createElement("i", { className: `fa-solid ${type.default_icon || "fa-bell"}`, style: { color: "var(--ac)" } })),
                    R.createElement("td", null,
                      R.createElement("span", {
                        className: "sp-tag",
                        style: { color: type.is_active ? "var(--green)" : "var(--t5)", border: `0.5px solid ${type.is_active ? "var(--green)" : "var(--b2)"}` },
                      }, type.is_active ? "Active" : "Inactive")
                    ),
                    R.createElement("td", { style: { color: "var(--t4)", fontSize: 12 } }, type.sort_order),
                    R.createElement("td", null,
                      R.createElement("div", { style: { display: "flex", gap: 8 } },
                        R.createElement("button", { className: "btn-ghost", style: { fontSize: 12, padding: "4px 12px" }, onClick: () => setModal({ type }) }, "Edit"),
                        R.createElement("button", { className: "btn-ghost", style: { fontSize: 12, padding: "4px 12px", color: "var(--red)", borderColor: "var(--red)" }, onClick: () => handleDelete(type), disabled: deleting === type.id }, deleting === type.id ? "…" : "Delete")
                      )
                    )
                  )
                )
              )
            )
          ),

      modal === "create" && R.createElement(TypeModal, { existing: null, onClose: () => setModal(null), onSaved: handleSaved }),
      modal?.type && R.createElement(TypeModal, { existing: modal.type, onClose: () => setModal(null), onSaved: handleSaved })
    );
  }

  // ---------------------------------------------------------------------------
  // Admin panel
  // ---------------------------------------------------------------------------

  function AdminPanel() {
    const { TabbedPanel } = window.NexusExtensionTemplates;
    return R.createElement(TabbedPanel, {
      tabs: [{
        key:    "types",
        label:  "Notification Types",
        icon:   "fa-list",
        render: () => R.createElement(TypesTable),
      }],
    });
  }

  // ---------------------------------------------------------------------------
  // Notification type renderer
  // ---------------------------------------------------------------------------

  NE.registerNotificationType("notification_hub_custom", {
    renderBody(n) {
      return R.createElement("span", { style: { color: "var(--t2)" } },
        n.data?.message || "You have a new notification"
      );
    },
    onClick({ n }) {
      const url = n.data?.url;
      if (!url) return;

      let resolved = url;
      try {
        const parsed = new URL(url);
        if (parsed.origin === window.location.origin) {
          resolved = parsed.pathname + parsed.search + parsed.hash;
        }
      } catch {
        // already a relative path
      }

      if (resolved.startsWith("/")) {
        window.NexusExtensions.navigate(resolved);
      } else {
        window.location.href = resolved;
      }
    },
  });

  // ---------------------------------------------------------------------------
  // Profile sidebar slot — "Send Notification" button on profile pages
  // ---------------------------------------------------------------------------

  function ProfileSendButton({ username, current_user }) {
    const [loading, setLoading] = useState(false);

    // Don't render for guests, own profile, or plain members
    if (!current_user) return null;
    if (current_user.username === username) return null;
    if (current_user.role === "member") return null;

    async function handleClick() {
      if (loading) return;
      setLoading(true);
      try {
        const d = await window._nexusApi.get(`/users/${encodeURIComponent(username)}`);
        if (d.user) {
          showSendModal(d.user);
        } else {
          toast("Could not load user", "err");
        }
      } catch {
        toast("Request failed", "err");
      } finally {
        setLoading(false);
      }
    }

    return R.createElement("div", { style: { marginBottom: 12 } },
      R.createElement("button", {
        className: "btn-ghost",
        style: { fontSize: 13, padding: "6px 14px", display: "flex", alignItems: "center", gap: 7 },
        onClick: handleClick,
        disabled: loading,
      },
        R.createElement("i", {
          className: loading ? "fa-solid fa-spinner fa-spin" : "fa-solid fa-bell",
          style: { fontSize: 12 },
        }),
        loading ? "Loading…" : "Send Notification"
      )
    );
  }

  NE.registerSlot({
    slug:      SLUG,
    slot:      "profile_sidebar",
    component: ProfileSendButton,
    priority:  50,
  });

  // ---------------------------------------------------------------------------
  // User card action — individual send
  // ---------------------------------------------------------------------------

  NE.registerUserAction({
    id:       "notification-hub-send",
    label:    "Send Notification",
    icon:     "fa-bell",
    authOnly: true,
    priority: 50,
    onClick({ user, currentUser, closeCard }) {
      if (currentUser && user.id === currentUser.id) {
        toast("You cannot send a notification to yourself", "warn");
        return;
      }
      closeCard();
      showSendModal(user);
    },
  });

  // ---------------------------------------------------------------------------
  // Account action — broadcast send
  // ---------------------------------------------------------------------------

  NE.registerAccountAction({
    id:       "notification-hub-broadcast",
    label:    "Send Broadcast",
    icon:     "fa-bullhorn",
    priority: 50,
    onClick({ close }) {
      close();
      showBroadcastModal();
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
