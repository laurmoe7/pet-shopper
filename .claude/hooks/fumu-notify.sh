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
# the same words twice within a few seconds (both hooks firing, or two copies of the settings) are one alert
lock="${TMPDIR:-/tmp}/fumu-notify-$(printf %s "$text" | tr -c 'a-z' _)"
now=$(date +%s)
if [ -f "$lock" ] && [ $((now - $(cat "$lock" 2>/dev/null || echo 0))) -lt 8 ]; then exit 0; fi
echo "$now" > "$lock" 2>/dev/null
auth=()
[ -n "$FUMU_SYNC_CODE" ] && auth=(-H "Authorization: Bearer $FUMU_SYNC_CODE")
curl -s -m 5 -X POST "$url/v1/inbox" "${auth[@]}" -H "Content-Type: application/json" \
  -d "{\"kind\":\"text\",\"text\":\"$text\",\"from\":\"claude\"}" >/dev/null 2>&1
exit 0
