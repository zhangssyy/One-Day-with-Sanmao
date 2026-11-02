# 三毛来啦！｜张乐平旧居线上虚拟博物馆

跟着三毛走进上海五原路的张乐平旧居：在 12 个实拍全景位置间漫游，点开墙上与展柜里的漫画读故事，沿六章路线参观，或者自由逛。

线上地址：<https://zhangssyy.github.io/One-Day-with-Sanmao/>

## 怎么跑

纯静态站，没有构建步骤，也没有任何外部依赖。但**不能直接双击 `dist/index.html`**——`file://` 下浏览器把本地图片视为跨源，canvas 被污染后 WebGL 贴图会抛 `SecurityError`，全景无法渲染。本地预览请起一个服务：

```sh
python3 -m http.server 8787 --directory dist
```

需要一个能双击打开、不依赖服务器的版本时，把素材全部内联成 data URL：

```sh
python3 build-offline.py        # 生成「三毛虚拟博物馆-离线版.html」
```

课堂演示可以双击 `课堂演示.command`，它会按当前内网地址生成扫码卡片并起服务。

## 结构

| 路径 | 作用 |
| --- | --- |
| `dist/app.js` | three.js 立方体全景渲染、热点投影、场景切换 |
| `dist/journey.js` | 六章路线、进度存档、找找看问答 |
| `dist/experiences.js` | 章节 / 路线 / 画册 / 观察点数据 |
| `dist/scenes.js` | 12 个全景场景与房间连通关系 |
| `dist/artworks.js` | 32 件作品 |
| `dist/style.css` | 全部样式，含一屏式手机端布局 |
| `sources.json` | 素材溯源记录 |

## 素材来源

供同济大学人居环境设计课程作业使用，非商业用途。

- **空间影像**：上海「建筑可阅读」张乐平故居 VR（<https://wtscvr.xh.sh.cn/>）的本地镜像，保留 12 个实拍全景位置。
- **漫画作品**：三毛官方网站（<https://www.sanmao.com.cn/>）。作品著作权属张乐平先生及其继承人。
- **线上策展**：墙面作品的点击位置依据实景与官网图像比对配置；每件作品的原始页面地址记录在 `sources.json` 中。

如相关权利人认为本仓库的使用方式不妥，请提 issue，我会立即下架。
