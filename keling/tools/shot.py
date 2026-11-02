# -*- coding: utf-8 -*-
"""按真机尺寸给页面出图。

IDE 自带的截图受预览窗实际大小限制（那个窗只有 220 宽，一进去就掉到
矮屏那档样式里），所以这里自己起一个无头 Chrome、自己指定视口。抽签
这类状态靠 CDP 执行脚本来触发，页面里不留任何调试开关。

    python3 tools/shot.py                  # 默认几组尺寸，浅深两套各出图
    python3 tools/shot.py 390x844 dark

页面要先跑在 BASE 上（python3 -m http.server）。
"""
import base64
import json
import os
import socket
import subprocess
import sys
import tempfile
import time
import urllib.request

import websocket

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
BASE = os.environ.get("BASE", "http://127.0.0.1:8761/index.html")
OUT = os.environ.get("OUT", "/tmp/shots")
SIZES = [(390, 844), (320, 568), (414, 896), (844, 390)]


def free_port():
    s = socket.socket()
    s.bind(("127.0.0.1", 0))
    port = s.getsockname()[1]
    s.close()
    return port


class Chrome(object):
    def __init__(self):
        self.port = free_port()
        self.profile = tempfile.mkdtemp(prefix="shot-")
        self.proc = subprocess.Popen(
            [
                CHROME,
                "--headless=new",
                "--disable-gpu",
                "--hide-scrollbars",
                "--no-first-run",
                "--remote-debugging-port=%d" % self.port,
                "--user-data-dir=" + self.profile,
                "about:blank",
            ],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        self.ws = websocket.create_connection(self._target(), timeout=30)
        self.n = 0

    def _target(self):
        url = "http://127.0.0.1:%d/json/list" % self.port
        for _ in range(100):
            try:
                tabs = json.load(urllib.request.urlopen(url, timeout=1))
                for t in tabs:
                    if t.get("type") == "page":
                        return t["webSocketDebuggerUrl"]
            except Exception:
                pass
            time.sleep(0.1)
        raise RuntimeError("连不上无头 Chrome")

    def send(self, method, **params):
        self.n += 1
        self.ws.send(json.dumps({"id": self.n, "method": method, "params": params}))
        while True:
            msg = json.loads(self.ws.recv())
            if msg.get("id") == self.n:
                if "error" in msg:
                    raise RuntimeError("%s: %s" % (method, msg["error"]))
                return msg.get("result", {})

    def js(self, expr):
        r = self.send("Runtime.evaluate", expression=expr, returnByValue=True, awaitPromise=True)
        return r.get("result", {}).get("value")

    def close(self):
        try:
            self.ws.close()
        finally:
            self.proc.terminate()


def capture(c, size, scheme, state, path):
    w, h = size
    c.send(
        "Emulation.setDeviceMetricsOverride",
        width=w, height=h, deviceScaleFactor=2, mobile=True,
    )
    c.send("Emulation.setEmulatedMedia", features=[{"name": "prefers-color-scheme", "value": scheme}])
    c.send("Page.navigate", url=BASE + "?again")
    # 等页面把自己画完：app.js 排完版才会给 #quote 定下宽度。
    for _ in range(80):
        if c.js("document.readyState === 'complete'"):
            break
        time.sleep(0.05)
    if state == "shown":
        c.js("document.getElementById('draw').click()")
        for _ in range(80):
            if c.js("document.getElementById('app').dataset.state === 'shown'"):
                break
            time.sleep(0.05)
        # 抽签有动画，让它走完。
        time.sleep(1.6)
    else:
        time.sleep(0.4)
    data = c.send("Page.captureScreenshot", format="png")["data"]
    with open(path, "wb") as f:
        f.write(base64.b64decode(data))
    return c.js(
        "JSON.stringify((function(){var q=document.getElementById('quote');"
        "var b=q.getBoundingClientRect();return {w:Math.round(b.width),"
        "h:Math.round(b.height),fs:getComputedStyle(q).fontSize};})())"
    )


if __name__ == "__main__":
    sizes = SIZES
    schemes = ["light", "dark"]
    if len(sys.argv) > 1:
        sizes = [tuple(int(v) for v in sys.argv[1].split("x"))]
    if len(sys.argv) > 2:
        schemes = [sys.argv[2]]

    try:
        urllib.request.urlopen(BASE, timeout=3)
    except Exception as e:
        sys.exit("页面没在 %s 上跑：%s" % (BASE, e))

    os.makedirs(OUT, exist_ok=True)
    c = Chrome()
    try:
        for size in sizes:
            for scheme in schemes:
                for state in ("idle", "shown"):
                    name = "%dx%d-%s-%s.png" % (size[0], size[1], scheme, state)
                    info = capture(c, size, scheme, state, os.path.join(OUT, name))
                    print("%-28s %s" % (name, info))
    finally:
        c.close()
    print("输出目录 " + OUT)
