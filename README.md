# Notification Hub

A Nexus extension for sending custom notifications to individual users or broadcasting to all members.

## Features

- Admin panel for managing reusable notification type templates
- Send notifications from the account dropdown (broadcast) or user card popover (individual)
- Notification type templates with default icon, message, URL, and excerpt

## Stages

- **v0.1.0** — Notification type CRUD in admin panel, notification type registered
- **v0.2.0** — Individual user send (account action + user action)
- **v0.3.0** — Broadcast send (all members / groups)
- **v0.4.0** — Polish, profile page button, error states

## Permissions

| Permission | Default | Description |
|---|---|---|
| `can_send_individual` | Moderator | Send to a single user |
| `can_send_broadcast` | Admin | Send to all members or a group |
