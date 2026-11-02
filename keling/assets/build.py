#!/usr/bin/env python3
"""把 assets/raw/ 里生成的原图加工成页面能直接用的带 alpha 的 WebP。

线稿（故居立面、梧桐）和实色物件（花砖、朱印）的抠底方式不一样：
线稿只要形状，所以统一染成主色，透明度取墨的深浅；花砖和朱印本身的
颜色就是内容，所以保留原色，再把边缘像素按 alpha 从白底里解算回来，
不然缩小后一圈发白。
"""

import os

from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, "raw")


def load(name):
    return Image.open(os.path.join(RAW, name + ".png")).convert("RGB")


def lum(im):
    return im.convert("L")


def bbox_of_content(mask, pad=0):
    """mask 是 L 模式，越亮越是内容。"""
    box = mask.point(lambda v: 255 if v > 12 else 0).getbbox()
    if box is None:
        return None
    x0, y0, x1, y1 = box
    w, h = mask.size
    return (max(0, x0 - pad), max(0, y0 - pad), min(w, x1 + pad), min(h, y1 + pad))


def stretch(im, lo, hi):
    """把 [lo, hi] 线性拉到 [0, 255]，两头截断。"""
    span = max(1, hi - lo)
    return im.point(lambda v: max(0, min(255, round((v - lo) * 255 / span))))


def ink_alpha(im, lo=0, hi=235):
    """线稿：白底 -> 透明，墨色 -> 不透明。"""
    return stretch(lum(im).point(lambda v: 255 - v), lo, hi)


def tint(size, rgb):
    return Image.new("RGB", size, rgb)


def save(im, name, quality=80, alpha_quality=100):
    # 线稿的 RGB 是一块纯色，全部信息都在 alpha 里，所以 alpha_quality
    # 才是决定体积的那个旋钮，quality 怎么调都没用。
    path = os.path.join(HERE, name + ".webp")
    im.save(path, "WEBP", quality=quality, alpha_quality=alpha_quality, method=6)
    return path


def seamless(im, size, feather=56):
    """偏移加羽化，做成真正无缝的方块。

    不用镜像拼：镜像虽然接缝为零，但纸纹里那些纤维结块和尘点会成对出现，
    在大屏上平铺开能一眼看出对称。这里改成把越过下边界／右边界的那一条
    原图内容羽化叠回上边／左边，于是上下左右自然接得上，又没有对称。
    """
    s = size + feather
    w, h = im.size
    x, y = (w - s) // 2, (h - s) // 2
    r = im.crop((x, y, x + s, y + s))
    out = r.crop((0, 0, size, size)).copy()

    # 255 -> 0 的渐变：紧贴接缝处完全用"越界的那段"，往里逐渐回到原内容。
    ramp = Image.linear_gradient("L").transpose(Image.FLIP_TOP_BOTTOM)

    over_v = r.crop((0, size, size, s))
    mask_v = ramp.resize((size, feather))
    out.paste(Image.composite(over_v, out.crop((0, 0, size, feather)), mask_v), (0, 0))

    over_h = r.crop((size, 0, s, size))
    # 沿主对角线转置，把"上边 255 下边 0"变成"左边 255 右边 0"。
    mask_h = ramp.transpose(Image.TRANSPOSE).resize((feather, size))
    out.paste(Image.composite(over_h, out.crop((0, 0, feather, size)), mask_h), (0, 0))
    return out


def build_grain():
    """纸纹。只留纤维的起伏，不留纸本身的底色——底色交给 CSS，
    这样同一个文件深浅两套配色都能用（深色模式 filter: invert 翻一下）。"""
    l = lum(load("paper"))
    # 减掉一张模糊版，只剩高频的纤维。半径取小一点，不然留下的是
    # 大块明暗，平铺起来像一团脏斑而不是纸。
    base = l.filter(ImageFilter.GaussianBlur(6))
    detail = Image.new("L", l.size)
    detail.putdata([max(0, min(255, 128 + (b - v) * 2)) for v, b in zip(l.getdata(), base.getdata())])
    alpha = detail.point(lambda v: max(0, min(255, round((v - 130) * 2.2))))
    alpha = seamless(alpha, 512)
    out = tint(alpha.size, (24, 26, 20)).convert("RGBA")
    out.putalpha(alpha)
    return save(out, "grain", quality=62)


def build_lines(name, color, width, lo=0, hi=235, quality=60, alpha_quality=60):
    im = load(name)
    alpha = ink_alpha(im, lo, hi)
    box = bbox_of_content(alpha, pad=2)
    if box:
        alpha = alpha.crop(box)
    h = round(alpha.size[1] * width / alpha.size[0])
    alpha = alpha.resize((width, h), Image.LANCZOS)
    out = tint(alpha.size, color).convert("RGBA")
    out.putalpha(alpha)
    return save(out, name, quality, alpha_quality)


def build_object(name, width, sat_floor=18, quality=82, shift=None):
    """实色物件：保留原色，边缘像素从白底里解算回真实颜色。"""
    im = load(name)
    px = list(im.getdata())
    alpha = Image.new("L", im.size)
    data = []
    for r, g, b in px:
        mx, mn = max(r, g, b), min(r, g, b)
        # 离白色有多远：要么够暗，要么够艳。白底两样都不满足。
        a = max((255 - mx) / 255.0, (mx - mn) / 255.0 if mx - mn > sat_floor else 0.0)
        data.append(max(0, min(255, round(a * 1.35 * 255))))
    alpha.putdata(data)
    box = bbox_of_content(alpha, pad=2)
    if box:
        im, alpha = im.crop(box), alpha.crop(box)
    # 解算：观测色 = 真色*a + 白*(1-a)
    out = []
    for (r, g, b), a in zip(im.getdata(), alpha.getdata()):
        if a < 8:
            out.append((255, 255, 255))
            continue
        f = a / 255.0
        out.append(tuple(max(0, min(255, round((c - 255 * (1 - f)) / f))) for c in (r, g, b)))
    if shift:
        out = [tuple(max(0, min(255, c + d)) for c, d in zip(px, shift)) for px in out]
    solid = Image.new("RGB", im.size)
    solid.putdata(out)
    h = round(solid.size[1] * width / solid.size[0])
    solid = solid.resize((width, h), Image.LANCZOS)
    alpha = alpha.resize((width, h), Image.LANCZOS)
    res = solid.convert("RGBA")
    res.putalpha(alpha)
    # 朱印那圈参差的边缘就是它的全部味道，alpha 不能压太狠。
    return save(res, name, quality, alpha_quality=92)


def build_parts(color=(31, 74, 56)):
    """把四格构件图切成四张独立素材。

    四个构件是在同一张图里生成的，就为了线宽一致——分四次生成，粗细
    必然对不上，那就不是一套符号了。这里只负责切开、抠底、各自裁到
    自己的内容边界。
    """
    im = load("parts")
    alpha = ink_alpha(im, 0, 225)
    w, h = alpha.size
    cells = {
        "arch": (0, 0, w // 2, h // 2),
        "railing": (0, h // 2, w // 2, h),
        "eaves": (w // 2, h // 2, w, h),
    }
    widths = {"arch": 720, "railing": 560, "eaves": 520}
    # 栅栏得靠多间才成一条带，裁短了就变成近方形的徽记，不能当分隔线用，
    # 所以整条留着，可读性靠在 CSS 里给足宽度来保证。
    keep = {}
    made = []
    for name, box in cells.items():
        a = alpha.crop(box)
        inner = bbox_of_content(a, pad=2)
        if inner:
            a = a.crop(inner)
        if name in keep:
            x0, x1 = keep[name]
            cw = a.size[0]
            a = a.crop((round(cw * x0), 0, round(cw * x1), a.size[1]))
        target = widths[name]
        a = a.resize((target, max(1, round(a.size[1] * target / a.size[0]))), Image.LANCZOS)
        out = tint(a.size, color).convert("RGBA")
        out.putalpha(a)
        made.append(save(out, name, quality=60, alpha_quality=70))
    return made


def build_band(gap=2.6):
    """页眉横带。花砖在立面上是疏着排的，CSS 的 repeat-x 没法加间距，
    所以把间距直接做进图里：一枚花砖居中，两侧留透明。"""
    tile = Image.open(os.path.join(HERE, "tile.webp")).convert("RGBA")
    s = 128
    tile = tile.resize((s, s), Image.LANCZOS)
    out = Image.new("RGBA", (round(s * gap), s), (0, 0, 0, 0))
    out.paste(tile, ((out.size[0] - s) // 2, 0), tile)
    return save(out, "band", quality=82, alpha_quality=92)


def flood_matte(im, white=232, band=2):
    """彩色插画：只有和图边连通的白才算背景。

    签筒里的书签是米白的，按"离白多远"算 alpha 会把它们一起抠穿；
    从四边泛洪就只吃外面那圈底，里面的白保持不透明。描边是深墨，
    边缘那一两像素的过渡再按灰度单独解算，免得一圈白毛。
    """
    w, h = im.size
    px = im.load()
    bg = bytearray(w * h)
    stack = []
    for x in range(w):
        stack += [(x, 0), (x, h - 1)]
    for y in range(h):
        stack += [(0, y), (w - 1, y)]
    while stack:
        x, y = stack.pop()
        i = y * w + x
        if bg[i] or min(px[x, y]) < white:
            continue
        bg[i] = 1
        if x > 0: stack.append((x - 1, y))
        if x < w - 1: stack.append((x + 1, y))
        if y > 0: stack.append((x, y - 1))
        if y < h - 1: stack.append((x, y + 1))

    core = Image.frombytes("L", (w, h), bytes(v * 255 for v in bg))
    near = core.filter(ImageFilter.MaxFilter(band * 2 + 1))
    alpha = Image.new("L", (w, h))
    rgb = []
    a_out = []
    for (r, g, b), c, n in zip(im.getdata(), core.getdata(), near.getdata()):
        if c:
            a_out.append(0)
            rgb.append((255, 255, 255))
        elif n:
            a = max(0, min(255, round((255 - min(r, g, b)) * 255 / 215)))
            a_out.append(a)
            f = a / 255.0 or 1
            rgb.append(tuple(max(0, min(255, round((v - 255 * (1 - f)) / f))) for v in (r, g, b)))
        else:
            a_out.append(255)
            rgb.append((r, g, b))
    alpha.putdata(a_out)
    out = Image.new("RGB", (w, h))
    out.putdata(rgb)
    out = out.convert("RGBA")
    out.putalpha(alpha)
    return out


def fit(im, width):
    box = im.getchannel("A").getbbox()
    if box:
        im = im.crop(box)
    return im.resize((width, round(im.size[1] * width / im.size[0])), Image.LANCZOS)


def build_tube():
    return save(fit(flood_matte(load("tube")), 560), "tube", quality=86, alpha_quality=90)


def build_stickers():
    """四枚贴纸在一张图里生成，圆角和粗细才一致；这里切开。"""
    im = flood_matte(load("stickers"))
    w, h = im.size
    cells = {"st-leaf": (0, 0, w // 2, h // 2), "st-pen": (w // 2, 0, w, h // 2),
             "st-film": (0, h // 2, w // 2, h), "st-book": (w // 2, h // 2, w, h)}
    return [save(fit(im.crop(box), 168), name, quality=84, alpha_quality=90)
            for name, box in cells.items()]


# 海报上的二维码指向 GitHub Pages 上的固定地址：海报会被转发出去，
# 指向临时隧道的码过几天就扫不开了。
SHARE_URL = "https://zhangssyy.github.io/One-Day-with-Sanmao/keling/"


def build_qr():
    """海报角上的二维码。静默区只留 2 个模块：码外面本来就套着一圈白框，
    规范要求的 4 个模块由白框补足；留满 4 个，64px 的框里码就缩得太小。"""
    import segno

    path = os.path.join(HERE, "qr.png")
    segno.make(SHARE_URL, error="m").save(path, scale=8, border=2)
    return path


FONT_URL = "https://github.com/notofonts/noto-cjk/raw/main/Serif/SubsetOTF/SC/NotoSerifSC-%s.otf"


def page_text():
    """页面上写死的字：index.html 的正文，加 app.js 里会换上去的那些提示语。"""
    import re

    root = os.path.join(HERE, "..")
    with open(os.path.join(root, "index.html"), encoding="utf-8") as f:
        text = re.sub(r"<[^>]+>", "", f.read())
    with open(os.path.join(root, "app.js"), encoding="utf-8") as f:
        text += "".join(re.findall(r'"([^"\n]*)"', f.read()))
    return text + "0123456789No./ ·—"


def build_font(weight, name, quotes):
    """自带宋体子集。

    iOS 和微信内置浏览器里没有宋体（Songti SC 要单独下载），会退成苹方
    黑体；安卓更是各家不同。海报要在谁手机上截出来都一样，就只能自带。
    整套思源宋体 11 MB，这里只留真正出现过的字，压成 WOFF2：正文那一份
    要装下全部签文，标题那一份只要页面上的字，很小。
    """
    import json

    from fontTools import subset

    src_path = os.path.join(RAW, "NotoSerifSC-%s.otf" % weight)
    if not os.path.exists(src_path):
        raise SystemExit("缺字体原稿，先下载到 %s：\n  %s" % (src_path, FONT_URL % weight))

    text = page_text()
    if quotes:
        with open(os.path.join(HERE, "..", "quotes.js"), encoding="utf-8") as f:
            src = f.read()
        rows = json.loads(src[src.index("["): src.rindex("]") + 1])
        text += "".join(r["quote"] + r["work"] + r.get("year", "") for r in rows)
        text += "柯灵《》「」『』“”‘’——⸺…·、，。！？；：（）"

    out = os.path.join(HERE, name)
    opts = subset.Options()
    opts.flavor = "woff2"
    opts.layout_features = ["vert", "vrt2", "vkrn", "vpal", "kern", "palt"]
    opts.name_IDs = []
    opts.hinting = False
    font = subset.load_font(src_path, opts)
    sub = subset.Subsetter(opts)
    sub.populate(text=text)
    sub.subset(font)
    subset.save_font(font, out, opts)
    return out


if __name__ == "__main__":
    made = [
        build_font("SemiBold", "serif.woff2", quotes=True),
        build_font("Black", "title.woff2", quotes=False),
        build_qr(),
        build_tube(),
    ] + build_stickers() + [
        build_grain(),
        # 这两张都只做极淡的水印，压缩痕迹看不出来，质量可以压很低。
        build_lines("house", (31, 74, 56), 1040, hi=215),
        build_lines("leaf", (31, 74, 56), 620, hi=225),
        # 生成的印泥偏橙，往项目那支朱砂（#a8392a）压一点。
        build_object("tile", 220),
        build_object("seal", 192, shift=(-16, -4, 4)),
        build_band(),
    ] + build_parts()
    total = 0
    for p in made:
        n = os.path.getsize(p)
        total += n
        dim = "" if p.endswith(".woff2") else Image.open(p).size
        print("%-28s %6.1f KB  %s" % (os.path.basename(p), n / 1024, dim))
    print("%-28s %6.1f KB" % ("合计", total / 1024))
