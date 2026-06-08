![Notification Hub](priv/static/banner.webp)

# Notification Hub

A Nexus extension for sending custom notifications to individual users or broadcasting to all members and groups.

## Features

- **Individual send** — send a notification to any user via their card popover or profile page
- **Broadcast** — fan-out a notification to all active members or a specific group
- **Notification type templates** — reusable types with a default icon, message, URL, and excerpt, managed from the admin panel
- **Real-time delivery** — notifications appear in the recipient's bell immediately via PubSub broadcast

## Permissions

| Permission | Default | Description |
|---|---|---|
| `can_send_individual` | Moderator | Send a notification to a single user |
| `can_send_broadcast` | Admin | Send to all members or a group |

## Usage

### Sending to an individual user

Click any user's avatar to open their card — a **Send Notification** button appears in the action row. You can also use the **Send Notification** button that appears above the tabs on any user's profile page.

### Sending a broadcast

Open your account menu (top-right avatar) and click **Send Broadcast**. Choose between all active members or a specific group, fill in the message and link, and send. Delivery is queued and processed asynchronously — the toast confirms how many recipients were targeted.

### Managing notification types

Go to **Admin → Extensions → Notification Hub**. Create reusable notification type templates with a name, default icon, default message, default URL, and excerpt. Active types appear in the send modal dropdown. Inactive types are hidden from senders but remain in the database.

## Notes

- All custom notifications use the `fa-bell` icon in the notification bell — per-type icons are a planned Nexus core enhancement
- Broadcast delivery is cursor-batched in pages of 200 via Oban workers on the `extensions` queue; very large forums may take a few minutes for full delivery
- Clicking a notification navigates to the configured link — internal forum paths (`/post/123`) use SPA navigation, external URLs open in the same tab
