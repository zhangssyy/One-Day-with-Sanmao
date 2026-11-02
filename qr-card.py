#!/usr/bin/env python3
"""把一个访问地址画成黄蓝配色的扫码卡片。

用法: python3 qr-card.py [url] [输出文件]
不给地址时用线上固定地址，任何网络都能扫。
演示脚本会传入当前内网地址——那种地址换个网络就会变，所以每次开场重新生成。
"""
import io
import ipaddress
import pathlib
import sys
from urllib.parse import urlsplit

try:
    import segno
except ImportError:
    sys.exit('缺少 segno，请先运行：python3 -m pip install --user segno')
from PIL import Image, ImageDraw, ImageFont

ROOT = pathlib.Path(__file__).resolve().parent

CREAM, YELLOW, BLUE, INK, MUTED = '#FFFCF2', '#F5D977', '#245BCB', '#203D72', '#788399'
W, H = 1000, 1400
QUIET = 4  # 二维码静默区宽度（模块数），规范下限
SITE = 'https://zhangssyy.github.io/One-Day-with-Sanmao/'

FONT_FILE = next((p for p in ['/System/Library/Fonts/Hiragino Sans GB.ttc',
                              '/System/Library/Fonts/STHeiti Medium.ttc']
                  if pathlib.Path(p).exists()), None)
if not FONT_FILE:
    sys.exit('找不到可用的中文字体')
BOLD_INDEX = 2 if 'Hiragino' in FONT_FILE else 1
BOOK_INDEX = 0 if 'Hiragino' in FONT_FILE else 1


def font(size, bold=False):
    return ImageFont.truetype(FONT_FILE, size, index=BOLD_INDEX if bold else BOOK_INDEX)


def is_lan(url: str) -> bool:
    host = urlsplit(url).hostname or ''
    try:
        return ipaddress.ip_address(host).is_private or ipaddress.ip_address(host).is_loopback
    except ValueError:
        return host in ('localhost', '')


def build(url: str, out: pathlib.Path) -> None:
    card = Image.new('RGB', (W, H), CREAM)
    d = ImageDraw.Draw(card)

    # 纸面：留白的卡片压在米色底上，和网站的卡片语言一致
    d.rounded_rectangle((34, 34, W - 34, H - 34), radius=44, fill='#FFFFFF',
                        outline='#ECE7D8', width=2)

    kicker = '张乐平旧居 · 线上虚拟博物馆'
    d.text((92, 104), kicker, font=font(27), fill=MUTED)

    head_a, head_b, head_c = '扫码，走进', '三毛家', '。'
    f_head = font(72, bold=True)
    x, y = 92, 160
    wa = d.textlength(head_a, font=f_head)
    wb = d.textlength(head_b, font=f_head)
    # 关键词下压一条黄色高亮，沿用网站标题的做法
    d.rounded_rectangle((x + wa - 4, y + 60, x + wa + wb + 4, y + 88), radius=6, fill=YELLOW)
    d.text((x, y), head_a, font=f_head, fill=INK)
    d.text((x + wa, y), head_b, font=f_head, fill=INK)
    d.text((x + wa + wb, y), head_c, font=f_head, fill=INK)

    qr = segno.make(url, error='h')
    # 规范要求四个模块宽的白色静默区；少了它手机相机常常认不出来。
    # 同时按整数倍放大，缩放插值会糊掉模块边缘。
    scale = max(1, round(560 / qr.symbol_size(border=QUIET)[0]))
    buf = io.BytesIO()
    qr.save(buf, kind='png', scale=scale, border=QUIET, dark=INK, light='#FFFFFF')
    buf.seek(0)
    code = Image.open(buf).convert('RGB')

    # 底板用纯白，避免米色渗进静默区削弱对比
    pad = 34
    panel = (W // 2 - code.width // 2 - pad, 330,
             W // 2 + code.width // 2 + pad, 330 + code.height + pad * 2)
    d.rounded_rectangle(panel, radius=30, fill='#FFFFFF', outline='#E8E2D0', width=2)
    card.paste(code, (W // 2 - code.width // 2, 330 + pad))

    below = panel[3] + 36
    if is_lan(url):
        lines = [('连上同一个 WiFi，用手机扫一扫', 32, '#52627c', 54),
                 (url, 25, BLUE, 48),
                 ('演示电脑需保持开机、服务不要关闭', 22, '#A8AEBB', 0)]
    else:
        # 固定地址不依赖现场网络，省掉那两句限制条件；地址去掉 https:// 更好读也更好手输
        lines = [('用手机相机扫一扫', 32, '#52627c', 54),
                 (url.split('://', 1)[-1].rstrip('/'), 25, BLUE, 48),
                 ('任何网络都能打开', 22, '#A8AEBB', 0)]
    for text, size, colour, gap in lines:
        f = font(size)
        d.text(((W - d.textlength(text, font=f)) / 2, below), text, font=f, fill=colour)
        below += gap

    sanmao = ROOT / 'dist/assets/sanmao.png'
    if sanmao.exists():
        im = Image.open(sanmao).convert('RGBA')
        h = 210
        im = im.resize((round(im.width * h / im.height), h), Image.LANCZOS)
        card.paste(im, (W - im.width - 86, H - h - 92), im)

    d.text((92, H - 150), '三根头发，', font=font(30, bold=True), fill=INK)
    d.text((92, H - 108), '好多故事。', font=font(30, bold=True), fill=INK)

    card.save(out)
    print(f'已生成 {out.name}  →  {url}')


if __name__ == '__main__':
    build(sys.argv[1] if len(sys.argv) > 1 else SITE,
          pathlib.Path(sys.argv[2] if len(sys.argv) > 2 else ROOT / '扫码访问.png'))
