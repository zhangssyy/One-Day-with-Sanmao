window.MUSEUM_EXPERIENCES = {
  "chapters": [
    {
      "id": "welcome",
      "title": "推门做客",
      "subtitle": "门口与花园",
      "start": 0,
      "goal": {
        "type": "observation",
        "id": "door-plaque"
      },
      "task": "认认门旁的小铭牌"
    },
    {
      "id": "sanmao",
      "title": "认识三毛",
      "subtitle": "展厅 1 · 展厅 2",
      "start": 3,
      "goal": {
        "type": "album",
        "id": "early-album"
      },
      "task": "读读机灵的小三毛"
    },
    {
      "id": "rhyme",
      "title": "童谣变魔术",
      "subtitle": "展厅 3",
      "start": 5,
      "goal": {
        "type": "art",
        "id": "peas"
      },
      "task": "找找变成玩具的豆荚"
    },
    {
      "id": "world",
      "title": "画里的世界",
      "subtitle": "展厅 4 · 展厅 5",
      "start": 6,
      "goal": {
        "type": "art",
        "id": "refugees"
      },
      "task": "走近《山区逃难图》"
    },
    {
      "id": "home",
      "title": "楼上的日常",
      "subtitle": "书房 · 卧室 · 孩子房间",
      "start": 8,
      "goal": {
        "type": "observation",
        "id": "study-books"
      },
      "task": "看看书柜里的世界"
    },
    {
      "id": "goodbye",
      "title": "花园再见",
      "subtitle": "把故事带回家",
      "start": 15,
      "goal": {
        "type": "album",
        "id": "garden-album"
      },
      "task": "带一点快乐回家"
    }
  ],
  "route": [
    {
      "scene": "scene_3",
      "chapter": 0,
      "hint": "门旁的小铭牌，是第一条线索。"
    },
    {
      "scene": "scene_4",
      "chapter": 0,
      "hint": "穿过花园，走进这座小屋。"
    },
    {
      "scene": "scene_6",
      "chapter": 0,
      "hint": "沿过道，先去一楼的展厅。"
    },
    {
      "scene": "scene_7",
      "chapter": 1,
      "hint": "先认识三毛，再看看他怎样长大。"
    },
    {
      "scene": "scene_8",
      "chapter": 1,
      "hint": "从流浪的日子里，读到善良与温暖。"
    },
    {
      "scene": "scene_2",
      "chapter": 2,
      "hint": "豆荚、玉米，也能变成玩具。"
    },
    {
      "scene": "scene_9",
      "chapter": 3,
      "hint": "走近彩墨与速写里的大世界。"
    },
    {
      "scene": "scene_10",
      "chapter": 3,
      "hint": "最后看看大家留下的心意。"
    },
    {
      "scene": "scene_6",
      "chapter": 4,
      "hint": "回到过道，顺着楼梯上楼。"
    },
    {
      "scene": "scene_13",
      "chapter": 4,
      "hint": "先从书房开始，看看楼上的日常。"
    },
    {
      "scene": "scene_11",
      "chapter": 4,
      "hint": "书籍、桌面和绿植，都值得停留。"
    },
    {
      "scene": "scene_13",
      "chapter": 4,
      "hint": "回到过道，接着去卧室。"
    },
    {
      "scene": "scene_12",
      "chapter": 4,
      "hint": "看看时钟和床边的小小陈设。"
    },
    {
      "scene": "scene_13",
      "chapter": 4,
      "hint": "再穿过过道，去孩子的房间。"
    },
    {
      "scene": "scene_1",
      "chapter": 4,
      "hint": "小小的学习角，藏在房间哪里？"
    },
    {
      "scene": "scene_13",
      "chapter": 5,
      "hint": "原路下楼，准备回到花园。"
    },
    {
      "scene": "scene_6",
      "chapter": 5,
      "hint": "从过道的门走回花园。"
    },
    {
      "scene": "scene_4",
      "chapter": 5,
      "hint": "今天的故事，就在这里收好。"
    }
  ],
  "albums": [
    {
      "id": "early-album",
      "title": "机灵的小三毛",
      "scene": "scene_7",
      "ath": 172,
      "atv": 29.12,
      "kind": "case",
      "ids": [
        "fashion",
        "reuse",
        "mischief",
        "strongman",
        "fairtrade"
      ]
    },
    {
      "id": "army-album",
      "title": "三毛去从军",
      "scene": "scene_7",
      "ath": -97.71,
      "atv": 18.81,
      "kind": "case",
      "ids": [
        "army",
        "armyhat",
        "armylog"
      ]
    },
    {
      "id": "wander-album",
      "title": "流浪时，也有温暖",
      "scene": "scene_8",
      "ath": -2.53,
      "atv": 16.25,
      "kind": "case",
      "ids": [
        "alone",
        "sharing",
        "doorbell",
        "shortdream",
        "firstpractice",
        "bread"
      ]
    },
    {
      "id": "diary-album",
      "title": "三毛的日常",
      "scene": "scene_2",
      "ath": 171.7,
      "atv": 20.1,
      "kind": "case",
      "ids": [
        "meeting",
        "mirror",
        "raincoat"
      ]
    },
    {
      "id": "grow-album",
      "title": "一点点长大",
      "scene": "scene_2",
      "ath": 6.83,
      "atv": 29.63,
      "kind": "case",
      "ids": [
        "running",
        "practice",
        "helping"
      ]
    },
    {
      "id": "travel-album",
      "title": "跟着三毛去旅行",
      "scene": "scene_9",
      "ath": 25.24,
      "atv": 22.75,
      "kind": "case",
      "ids": [
        "buddha",
        "mingtomb"
      ]
    },
    {
      "id": "imagine-album",
      "title": "画里的新想象",
      "scene": "scene_11",
      "ath": -174.64,
      "atv": 19.39,
      "kind": "reading",
      "ids": [
        "portrait"
      ]
    },
    {
      "id": "garden-album",
      "title": "带一点快乐回家",
      "scene": "scene_4",
      "ath": -7,
      "atv": 18,
      "kind": "reading",
      "ids": [
        "flowers"
      ]
    }
  ],
  "observations": [
    {
      "id": "door-plaque",
      "scene": "scene_3",
      "title": "找到这扇门",
      "question": "门旁的牌子写着谁的名字？",
      "options": [
        "张乐平",
        "柯灵",
        "巴金"
      ],
      "answer": 0,
      "explanation": "入口的小铭牌上写着“张乐平故居”。从这扇门走进去，就到了本次探访的小屋。",
      "ath": -107.35,
      "atv": -5.96,
      "image": "assets/details/door-plaque.jpg"
    },
    {
      "id": "garden-path",
      "scene": "scene_4",
      "title": "花园里的小路",
      "question": "草坪里的小路是用什么铺成的？",
      "options": [
        "鹅卵石",
        "一块块方形石板",
        "红砖"
      ],
      "answer": 1,
      "explanation": "方形石板一块接着一块，穿过草坪，通向花园深处。",
      "ath": 71,
      "atv": 28,
      "image": "assets/details/garden-path.jpg"
    },
    {
      "id": "red-stairs",
      "scene": "scene_6",
      "title": "跟着红色上楼",
      "question": "通往二楼的楼梯上铺着什么颜色的地毯？",
      "options": [
        "绿色",
        "蓝色",
        "红色"
      ],
      "answer": 2,
      "explanation": "红色地毯顺着木楼梯向上延伸。这里连接一楼展厅与二楼的生活空间。",
      "ath": 150.3,
      "atv": 26.56,
      "image": "assets/details/red-stairs.jpg"
    },
    {
      "id": "hallway-photos",
      "scene": "scene_13",
      "title": "过道里的回忆",
      "question": "走上二楼，过道墙上能看到什么？",
      "options": [
        "一排装框照片",
        "一排挂钟",
        "一排帽子"
      ],
      "answer": 0,
      "explanation": "墙上挂着装框的照片。过道把书房、卧室和孩子的房间连在一起。",
      "ath": 33.07,
      "atv": -6.72,
      "image": "assets/details/hallway-photos.jpg"
    },
    {
      "id": "study-books",
      "scene": "scene_11",
      "title": "书柜里的世界",
      "question": "透过书柜上半部的玻璃门，可以看到什么？",
      "options": [
        "整排餐盘",
        "许多书籍",
        "一排玩具车"
      ],
      "answer": 1,
      "explanation": "木框玻璃门后，书籍整齐地排列着。近看柜门与书脊，能感受到这间屋子的阅读气息。",
      "ath": 103.33,
      "atv": -10.62,
      "image": "assets/details/study-books.jpg"
    },
    {
      "id": "study-desk",
      "scene": "scene_11",
      "title": "桌上的一点绿",
      "question": "大桌上，哪一件东西为房间添了一点绿色？",
      "options": [
        "绿色台灯",
        "绿色电话",
        "一盆植物"
      ],
      "answer": 2,
      "explanation": "桌上摆着一盆细长叶子的植物，旁边还能看到纸张和器物。",
      "ath": -155.01,
      "atv": 14.05,
      "image": "assets/details/study-desk.jpg"
    },
    {
      "id": "bedroom-clock",
      "scene": "scene_12",
      "title": "小屋的时间",
      "question": "蕾丝布覆盖的柜子上，摆着哪件计时物品？",
      "options": [
        "木壳座钟",
        "沙漏",
        "电子闹钟"
      ],
      "answer": 0,
      "explanation": "柜子上有一座木壳圆盘座钟。它与照片、家具共同组成了这里的日常陈设。",
      "ath": 20.69,
      "atv": 5.01,
      "image": "assets/details/bedroom-clock.jpg"
    },
    {
      "id": "bedroom-lamps",
      "scene": "scene_12",
      "title": "床边的暖色",
      "question": "床头台灯的灯罩是什么颜色？",
      "options": [
        "蓝色",
        "红色",
        "绿色"
      ],
      "answer": 1,
      "explanation": "床的两侧都能看到红色灯罩，与木质床头和房间里的红地毯呼应。",
      "ath": 92.98,
      "atv": 17.2,
      "image": "assets/details/bedroom-lamps.jpg"
    },
    {
      "id": "child-bed-desk",
      "scene": "scene_1",
      "title": "小小学习角",
      "question": "小书桌紧挨着哪件家具？",
      "options": [
        "衣帽架",
        "沙发",
        "床"
      ],
      "answer": 2,
      "explanation": "窄窄的小书桌紧贴在床边，学习与休息的空间挨在一起。",
      "ath": 161.43,
      "atv": 25.13,
      "image": "assets/details/child-bed-desk.jpg"
    },
    {
      "id": "child-bookcase",
      "scene": "scene_1",
      "title": "另一间房的书香",
      "question": "这间房的书柜下半部，可以看到什么装饰？",
      "options": [
        "人物画",
        "纯色玻璃",
        "镜面"
      ],
      "answer": 0,
      "explanation": "书柜上半部放书，下半部的柜门上能看到人物画，房间因此多了一点活泼。",
      "ath": 92.53,
      "atv": -6.82,
      "image": "assets/details/child-bookcase.jpg"
    },
    {
      "id": "artist-bust",
      "scene": "scene_7",
      "title": "先认识画画的人",
      "question": "前言旁的雕像采用哪种形式？",
      "options": [
        "全身坐像",
        "半身像",
        "全身立像"
      ],
      "answer": 1,
      "explanation": "白色台座上是一尊半身像。它就在展厅前言旁，迎接进入展线的观众。",
      "ath": 12.34,
      "atv": -4.94,
      "image": "assets/details/artist-bust.jpg"
    },
    {
      "id": "moving-image",
      "scene": "scene_8",
      "title": "画面也会动",
      "question": "从门洞望过去，三毛的影像出现在什么上面？",
      "options": [
        "纸质画册",
        "电视机",
        "投影幕"
      ],
      "answer": 2,
      "explanation": "门洞后是一块投影幕，画面中能看到三毛的轮廓。漫画故事在这里换了一种呈现方式。",
      "ath": 83.91,
      "atv": -4.29,
      "image": "assets/details/moving-image.jpg"
    },
    {
      "id": "visitor-notes",
      "scene": "scene_10",
      "title": "大家的三毛",
      "question": "这片留言墙主要由什么组成？",
      "options": [
        "彩色便签纸",
        "木质牌子",
        "金属铭牌"
      ],
      "answer": 0,
      "explanation": "许多彩色便签叠在一起，记录着参观者留下的话。你也可以想一想，最想把哪一则三毛故事带走。",
      "ath": -156.87,
      "atv": 8.31,
      "image": "assets/details/visitor-notes.jpg"
    }
  ]
};
