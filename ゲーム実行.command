#!/bin/bash

cd "$(dirname "$0")" || exit 1

if ! command -v python3 >/dev/null 2>&1; then
  open "dist/index.html"
  osascript -e 'display dialog "Python 3が見つからないため、ゲームを直接開きました。記録が正しく保存されない場合はREADME.mdの手動実行方法をご確認ください。" buttons {"確認"} default button "確認"'
  exit 0
fi

PORT=$(python3 - <<'PY'
import socket
s = socket.socket()
s.bind(('127.0.0.1', 0))
print(s.getsockname()[1])
s.close()
PY
)

python3 -m http.server "$PORT" --bind 127.0.0.1 --directory dist > /tmp/family-games.log 2>&1 &
SERVER_PID=$!

cleanup() {
  kill "$SERVER_PID" 2>/dev/null
}

trap cleanup EXIT INT TERM
sleep 1
open "http://127.0.0.1:${PORT}"

echo ""
echo "Family Games バージョン10を実行しています。"
echo "終了するには、この画面で Control + C を押してください。"
echo ""

wait "$SERVER_PID"
