#!/bin/bash
# Tells Fumu (the desktop pet on Lauren's PC) that Claude replied or needs her, through the sync server's inbox.
# Used by the Stop and Notification hooks in .claude/settings.json. Her Backup & sync code is a "secret" in the cloud environment's
# settings (name FUMU_SYNC_CODE, allowed website pet-shopper-sync.laurmoe.workers.dev, header Authorization: Bearer <code>): the
# environment's proxy adds that header to this request itself, so the code never has to be in this file. Without the secret the server
# just answers 401 and nothing happens. (If FUMU_SYNC_CODE is also set as a plain variable it is sent too.) Only the short words below
# are sent, never the conversation.
url="${FUMU_SYNC_URL:-https://pet-shopper-sync.laurmoe.workers.dev}"
case "$1" in
  needs) text="Claude needs you" ;;
  *) text="Claude replied" ;;
esac
auth=()
[ -n "$FUMU_SYNC_CODE" ] && auth=(-H "Authorization: Bearer $FUMU_SYNC_CODE")
curl -s -m 5 -X POST "$url/v1/inbox" "${auth[@]}" -H "Content-Type: application/json" \
  -d "{\"kind\":\"text\",\"text\":\"$text\",\"from\":\"claude\"}" >/dev/null 2>&1
exit 0
