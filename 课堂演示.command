#!/bin/bash
# 双击运行：按当前网络地址生成扫码卡片，并在本机起一个局域网可访问的服务。
cd "$(dirname "$0")" || exit 1

PORT=8787
while nc -z 127.0.0.1 "$PORT" 2>/dev/null; do PORT=$((PORT + 1)); done

IP=""
for IFACE in $(ifconfig -l); do
  CANDIDATE=$(ipconfig getifaddr "$IFACE" 2>/dev/null)
  if [ -n "$CANDIDATE" ]; then IP="$CANDIDATE"; break; fi
done

if [ -z "$IP" ]; then
  echo "没有取到内网地址，请先连上 WiFi 再运行。"
  read -r -p "按回车关闭…" _
  exit 1
fi

python3 -c "import segno" 2>/dev/null || python3 -m pip install --quiet --user segno || {
  echo "二维码库安装失败，请手动运行：python3 -m pip install --user segno"
  read -r -p "按回车关闭…" _
  exit 1
}

URL="http://$IP:$PORT/"
python3 qr-card.py "$URL" || exit 1
open 扫码访问.png

echo
echo "  三毛虚拟博物馆 · 课堂演示"
echo "  地址：$URL"
echo "  手机连同一个 WiFi 后扫「扫码访问.png」即可。"
echo "  若 macOS 弹出防火墙询问，请选择「允许」。"
echo "  演示结束按 Control-C 停止。"
echo
python3 -m http.server "$PORT" --directory dist
