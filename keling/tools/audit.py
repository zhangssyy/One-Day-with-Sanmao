# -*- coding: utf-8 -*-
"""把全部引文在多种屏幕尺寸上各排一遍，检查有没有字掉出列外。

竖排的列高由卡片高度决定，而中文避头尾会让浏览器宁可让标点溢出列底，
也不肯把它挪到下一列——所以"列数够"从来不等于"排得下"，只能一条条
实测。顺带统计落到横排兜底的条数和用到的字号。

排版入口在 app.js 的 IIFE 里，外面拿不到；但 setType 同时挂在 window
的 resize 上，所以改完 #quote 的文本派发一次 resize，走的就是和真实
抽签完全相同的那条路径，产品代码里不必留调试开关。

    python3 tools/audit.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from shot import BASE, Chrome  # noqa: E402

SIZES = [(390, 844), (320, 568), (414, 896), (280, 500), (768, 1024), (844, 390)]

CHECK = r"""
(function () {
  var mark = document.querySelector('.mark');
  var quote = document.getElementById('quote');
  var work = document.getElementById('work');
  var panels = document.querySelector('.panels');
  var list = window.KELING_QUOTES || [];
  var out = { n: 0, flat: 0, fs: {}, minH: 1e9, broken: [] };

  for (var i = 0; i < list.length; i += 1) {
    quote.textContent = list[i].quote.replace(/——/g, '⸺');
    work.textContent = '《' + list[i].work + '》';
    window.dispatchEvent(new Event('resize'));
    out.n += 1;

    if (mark.dataset.flat !== undefined) { out.flat += 1; continue; }

    var fs = getComputedStyle(quote).fontSize;
    out.fs[fs] = (out.fs[fs] || 0) + 1;

    var box = quote.getBoundingClientRect();
    out.minH = Math.min(out.minH, Math.round(box.height));

    var range = document.createRange();
    range.selectNodeContents(quote);
    var rects = range.getClientRects();
    // 只比正文框不够：iOS 上正文框本身会比卡片宽，字照样在框里，
    // 却跑出了卡片。所以左右两边都要和卡片的内框比。
    var face = mark.querySelector('.face').getBoundingClientRect();
    var spill = 0, wide = 0;
    for (var j = 0; j < rects.length; j += 1) {
      if (!rects[j].width || !rects[j].height) continue;
      spill = Math.max(spill, rects[j].bottom - box.bottom);
      wide = Math.max(wide, box.left - rects[j].left,
                      face.left - rects[j].left, rects[j].right - face.right);
    }

    // 卡片被挤出面板，说明装饰吃掉了正文该有的地方。
    var card = mark.getBoundingClientRect();
    var pan = panels.getBoundingClientRect();
    var over = Math.max(card.bottom - pan.bottom, pan.top - card.top);
    if (spill > 1 || wide > 1 || over > 1) {
      out.broken.push({ i: i, spill: Math.round(spill),
                        wide: Math.round(wide), over: Math.round(over) });
    }
  }
  return JSON.stringify(out);
})()
"""


def main():
    c = Chrome()
    bad = []
    try:
        for w, h in SIZES:
            c.send("Emulation.setDeviceMetricsOverride", width=w, height=h,
                   deviceScaleFactor=1, mobile=True)
            c.send("Page.navigate", url=BASE + "?again")
            for _ in range(200):
                if c.js("document.readyState === 'complete' && !!window.KELING_QUOTES"):
                    break
            c.js("document.getElementById('draw').click()")
            for _ in range(200):
                if c.js("document.getElementById('app').dataset.state === 'shown'"):
                    break
            for _ in range(200):
                if c.js("document.fonts.status === 'loaded'"):
                    break
            res = c.js(CHECK)
            print("%-11s %s" % ("%dx%d" % (w, h), res))
            if '"broken":[]' not in res:
                bad.append("%dx%d" % (w, h))
    finally:
        c.close()
    print("不合格的尺寸：" + (", ".join(bad) if bad else "无"))
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
