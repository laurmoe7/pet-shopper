#!/bin/bash
# Tells Fumu (the desktop pet on Lauren's PC) that Claude replied or needs her, through the sync server's inbox.
# Used by the Stop and Notification hooks in .claude/settings.json. It does nothing unless the cloud environment has the secret
# FUMU_SYNC_CODE (her Backup & sync code); FUMU_SYNC_URL can change the server. Only the short words below are sent, never the conversation.
[ -n "$FUMU_SYNC_CODE" ] || exit 0
url="${FUMU_SYNC_URL:-https://pet-shopper-sync.laurmoe.workers.dev}"
case "$1" in
  needs) text="Claude needs you" ;;
  *) text="Claude replied" ;;
esac
curl -s -m 5 -X POST "$url/v1/inbox" \
  -H "Authorization: Bearer $FUMU_SYNC_CODE" -H "Content-Type: application/json" \
  -d "{\"kind\":\"text\",\"text\":\"$text\",\"from\":\"claude\"}" >/dev/null 2>&1
exit 0
