#!/usr/bin/env python3
"""把 dist/ 打包成单个可直接双击打开的 HTML。

file:// 下浏览器会把本地图片视为跨源，canvas 被污染后 WebGL 贴图会抛 SecurityError，
全景因此无法渲染；改用 data: URL 后图像与页面同源，离线打开才能正常显示。
"""
import base64
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent
DIST = ROOT / "dist"
OUT = ROOT / "三毛虚拟博物馆-离线版.html"

MIME = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
        ".gif": "image/gif", ".svg": "image/svg+xml"}


def data_url(path: pathlib.Path) -> str:
    mime = MIME.get(path.suffix.lower())
    if mime is None:
        raise SystemExit(f"未知素材类型：{path}")
    return f"data:{mime};base64," + base64.b64encode(path.read_bytes()).decode("ascii")


def inline_script(text: str) -> str:
    # </script> 出现在 JS 文本里会提前闭合标签
    if "</script" in text:
        raise SystemExit("脚本内容包含 </script，需要手动转义")
    return f"<script>\n{text}\n</script>"


def main() -> None:
    assets = {}
    for path in sorted(DIST.glob("assets/**/*")):
        if path.is_file() and path.suffix.lower() in MIME:
            assets[path.relative_to(DIST).as_posix()] = data_url(path)

    html = (DIST / "index.html").read_text(encoding="utf-8")

    def need(old: str, new: str, source: str) -> None:
        nonlocal html
        if old not in source:
            raise SystemExit(f"未找到待替换内容：{old[:60]}")

    # 样式与图标
    need('<link rel="stylesheet" href="style.css">', "", html)
    html = html.replace(
        '<link rel="stylesheet" href="style.css">',
        "<style>\n" + (DIST / "style.css").read_text(encoding="utf-8") + "\n</style>")
    html = html.replace('href="assets/favicon.svg"', f'href="{assets["assets/favicon.svg"]}"')
    html = html.replace('src="assets/sanmao.png"', f'src="{assets["assets/sanmao.png"]}"')

    # 缩略图路径是模板字符串拼出来的，只能在取值处转成 data URL
    app = (DIST / "app.js").read_text(encoding="utf-8")
    patched = app.replace('`<img src="assets/thumbs/${id}.jpg"',
                          '`<img src="${ASSET(`assets/thumbs/${id}.jpg`)}"')
    patched = patched.replace('fallback.src=`assets/thumbs/${next.id}.jpg`',
                              'fallback.src=ASSET(`assets/thumbs/${next.id}.jpg`)')
    if patched.count("ASSET(") != 2:
        raise SystemExit("app.js 中缩略图引用的改写数量不符，请检查源码是否变动")

    resolver = (
        "const MUSEUM_ASSETS=" + json.dumps(assets, ensure_ascii=False) + ";\n"
        "const ASSET=p=>MUSEUM_ASSETS[p]||p;\n")

    # 数据文件里的路径统一在加载后就地替换，调用处无需改动
    normalize = (
        "for(const w of window.MUSEUM_ARTWORKS)w.image=ASSET(w.image);\n"
        "for(const o of window.MUSEUM_EXPERIENCES.observations)o.image=ASSET(o.image);\n"
        "for(const s of window.MUSEUM_SCENES)for(const k in s.faces)"
        "for(const t of s.faces[k])t.url=ASSET(t.url);\n")

    data_js = "\n".join((DIST / name).read_text(encoding="utf-8")
                        for name in ("scenes.js", "artworks.js", "experiences.js"))

    bundle = "".join(inline_script(part) for part in (
        (DIST / "assets/three.min.js").read_text(encoding="utf-8"),
        resolver,
        data_js,
        normalize,
        (DIST / "journey.js").read_text(encoding="utf-8"),
        patched,
    ))

    tags = ('<script src="assets/three.min.js"></script><script src="scenes.js"></script>'
            '<script src="artworks.js"></script><script src="experiences.js"></script>'
            '<script src="journey.js"></script><script src="app.js"></script>')
    need(tags, "", html)
    html = html.replace(tags, bundle)

    # 脚本里保留着 assets/ 路径作为映射键，只检查标记部分有没有漏掉的相对引用
    markup = re.sub(r"<(script|style)\b.*?</\1>", "", html, flags=re.S)
    if "assets/" in markup:
        raise SystemExit("标记中仍有未内联的 assets/ 引用：" +
                         str(re.findall(r'[^"\']*assets/[^"\']*', markup)[:3]))

    OUT.write_text(html, encoding="utf-8")
    print(f"已生成 {OUT.name}：{len(assets)} 个素材，{OUT.stat().st_size / 1048576:.1f} MB")


if __name__ == "__main__":
    sys.exit(main())
