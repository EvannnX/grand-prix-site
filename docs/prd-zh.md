# PRD:NYU Shanghai Grand Prix(AI Writathon 赛车游戏)

<!-- tab: PRD:NYU Shanghai Grand Prix(AI Writathon 赛车游戏) -->

# PRD:NYU Shanghai Grand Prix(AI Writathon 赛车游戏)

2026-10-21 · @someone

## 1. 项目概述

一个在浏览器里运行的 3D 联机小赛车游戏:玩家进房间后选车手 + 选车,10 秒投票选地图,然后开跑。车和车手全部由 GenAI 生成(Image 2 出 Q 版形象 → Tripo 转 3D),地图使用开源项目的赛道资产。暂定名 NYU Shanghai Grand Prix。

**与作业的对应关系**:属于作业 Part 1 的 Creative Coding Project。截止时间是 2026-10-28(周三)23:59,通过 Google Docs 提交,今天起还有 7 天。

| 作业交付物 | 本项目对应内容 |
| --- | --- |
| Part 1 提案(约 150 词) | 见第 10 节英文草稿 |
| Part 2 创作成品 | 可游玩的游戏链接 + 录屏 + 截图 |
| Part 2 过程记录 | prompt / 输出 / 修改日志(第 10 节模板) |
| Part 3 反思文章(约 1,000 词) | 基于过程日志写作 |

评分权重里 Reflection 占 50%、Collaboration 占 30%,成品本身只占 10% + 10%。所以这份 PRD 把“过程可记录”当成和“游戏能跑”同等重要的需求。

## 2. 目标与非目标

核心目标是 10-28 在课堂 Peer Review 时,同学用自己的电脑打开链接就能 2–4 人同场跑完一局。

**目标**

- 2–4 名玩家通过房间码进同一局
- 每局开始前可替换车手和车,自由组合
- 10 秒地图投票,票数相同则随机
- 3 圈制比赛,有排名和结算页,可再来一局
- 所有车与车手资产来自 GenAI 生成,并保留完整生成记录

**非目标(这 7 天不做)**

- 账号系统、匹配系统、排行榜持久化
- 防作弊、服务器权威物理
- 手机端触控适配
- 写实物理(只做街机手感)
- 超过 3 张地图、道具系统(列为 P2,有时间再加)

## 3. 用户流程

玩家只在第一次进房时输入房间码;之后每一局都从“选车手 + 选车”开始,所以替换角色和车是每局的固定环节。

[Embedded widget: 一局游戏流程 · 7 个阶段,1 个循环](node/97167bb4-6c60)

代码里对应 6 个阶段状态:LOBBY → SELECT → VOTE → COUNTDOWN → RACE → RESULTS。阶段切换和所有计时(10 秒投票、3 秒倒计时、冲线后 30 秒收尾)都由服务器统一触发,保证所有人同时进入下一阶段。

## 4. 功能需求与优先级

P0 是 10-26 课前必须能跑的最小闭环;P1 是提交前补齐;P2 只在有余力时做。

| ID | 模块 | 需求 | 优先级 |
| --- | --- | --- | --- |
| F1 | 房间 | 创建房间生成 4 位房间码,其他人输码加入,上限 4 人 | P0 |
| F2 | 大厅 | 显示玩家列表、昵称、准备状态;全员准备后房主可开始 | P0 |
| F3 | 选车手 | 横向卡片选 4–6 位 Q 版车手,带 3D 转台预览 | P0 |
| F4 | 选车 | 选 3–4 辆车,车手实时坐进所选车里预览组合 | P0 |
| F5 | 选择规则 | 同一车手可否被多人选择:默认允许,头顶显示玩家昵称区分 | P1 |
| F6 | 地图投票 | 10 秒倒计时,显示每张图实时票数;平票或无人投票则随机 | P0 |
| F7 | 发车 | 4 个发车位,3-2-1-GO 倒计时,倒计时内锁定输入 | P0 |
| F8 | 驾驶 | WASD / 方向键,街机手感,掉出赛道 2 秒后重置到最近检查点 | P0 |
| F9 | 圈数判定 | 按顺序经过检查点才算一圈,防止抄近路;3 圈 | P0 |
| F10 | 实时排名 | 按 圈数 → 检查点序号 → 到下一检查点距离 排序,HUD 显示名次与圈数 | P1 |
| F11 | 结算 | 第一名冲线后 30 秒强制结束,显示名次、用时、车手 + 车组合 | P0 |
| F12 | 再来一局 | 结算后回到选车手页,房间与玩家保留 | P1 |
| F13 | 断线处理 | 玩家掉线后其车辆消失,比赛继续;房主掉线则房主转移 | P1 |
| F14 | 音效 | 引擎声、倒计时、冲线音效 | P1 |
| F15 | 小地图 | 右下角俯视小地图显示各车位置 | P2 |
| F16 | 加速道具 | 赛道上的加速带或拾取道具 | P2 |
| F17 | AI 车 | 人数不足时补机器人车 | P2 |

**车手 + 车的组合方式**:车手模型单独生成,运行时挂到车模型的 `seat` 锚点上(Q 版大头正好露在车外,形成“大头娃娃”效果)。这样 N 个车手 × M 辆车只需要 N + M 个模型,不需要 N × M 个。

## 5. AI 资产管线:Image 2 + Tripo

每个资产走同一条 6 步管线,每一步都写进过程日志——这条管线本身就是反思文章里“我是 author 还是 editor”的证据。

1. **定风格基准**:先用 Image 2 生成 1 张满意的 Q 版车手作为“风格锚”,之后每次生成都附上这张图 + 同一段风格 prompt(例:chibi, 2.5 head-to-body ratio, racing suit in NYU violet, front view, neutral background, seated pose)。
2. **生成车手 2D**:每位车手出 3–4 张候选,选 1 张。要求正面、无遮挡、纯色背景,方便 Tripo 识别。
3. **Tripo 转 3D**:车手用 image-to-3D;车用 text-to-3D 或先用 Image 2 出车的概念图再转。目标是低多边形卡通风格,和车手统一。
4. **Blender 清理**:统一比例(1 单位 = 1 米)、朝向(车头朝 −Z)、原点放在车底中心;减面到车 ≤ 20k 三角面、车手 ≤ 10k;在车上加名为 `seat` 的空物体作为车手挂点。
5. **导出压缩**:导出 GLB,用 gltf-transform 做 Draco / meshopt 压缩,单个文件尽量 < 2 MB,保证同学在校园网里加载不卡。
6. **登记清单**:写入 `assets/manifest.json`(id、显示名、文件路径、缩略图、生成工具与日期),游戏读这个清单渲染选择界面。

**数量目标**:车手 4–6 位、车 3–4 辆。生成失败(穿模、多手指、轮子变形)时记录原因并截图,失败案例对反思文章最有价值。

**待确认**:Tripo 当前套餐对生成模型的版权 / 商用条款是什么(免费档与付费档可能不同)。这直接回答作业里“Who owns the content”这个问题,建议截图保存条款页面。

## 6. 技术架构与联机方案

采用“客户端各自模拟、服务器只管规则”的轻量方案:7 天内做服务器权威物理不现实,课堂试玩也不需要防作弊。

[Embedded widget: 系统架构 · 客户端、房间服务器、静态资源](node/67a1dab0-a508)

每个客户端只算自己的车,以 20 Hz 发送位置、朝向、速度、圈数和检查点序号;其他人的车用约 100 ms 的缓冲做插值,避免抖动。

| 层 | 选型 | 备选 | 理由 |
| --- | --- | --- | --- |
| 渲染 | Three.js | React Three Fiber | GLB 支持成熟,AI 编程助手最熟悉 |
| 物理 | Rapier(自带车辆控制器) | cannon-es RaycastVehicle | 街机车辆开箱即用 |
| 联机 | Colyseus(Node.js) | Socket.IO | 自带房间与状态同步,房间码容易做 |
| 构建 | Vite | — | 热更新快 |
| 部署 | 服务器 + 前端同放一台云主机 | 校园网局域网开服 | 见下方风险 |

**部署风险**:试玩同学在上海,海外免费托管平台在国内可能访问慢或不稳定,WebSocket 尤其容易断。请在 10-25 实测;不行就用一台笔记本在教室局域网内开服,或租一台国内云服务器。

## 7. 地图来源与授权

首选 CC0 的模块化赛道套件,因为不需要署名、改动自由、导入最快;SuperTuxKart 赛道质量高但转换成本大,放在第三张图。以下授权信息凭经验列出,下载前请在各自页面核对 license 文件。

| 候选 | 来源 | 授权(待核对) | 需要的工作 | 建议 |
| --- | --- | --- | --- | --- |
| 模块化赛道 A | Kenney Racing Kit | CC0 | 用模块拼一条赛道,加检查点 | 第 1 张图 |
| 模块化赛道 B | Kenney 同套件另拼一条 | CC0 | 换布局、换配色 | 第 2 张图 |
| 完整赛道 | SuperTuxKart 官方赛道 | 多为 CC BY-SA / GPL,逐个核对 | 从 Blender 文件转 GLB,需要署名与相同方式共享 | 第 3 张图(P1) |
| 其他 | Sketchfab 上 CC BY 赛道 | CC BY | 署名,检查面数 | 备选 |

**每张地图必须具备**:可行驶的碰撞网格、4 个发车位、按顺序编号的检查点触发区、终点线、出界重置区、一张投票界面缩略图。

游戏的 Credits 页要列出所有地图来源与授权,这也能作为反思文章里“开源资产 vs AI 生成资产”对比的素材。

## 8. 肖像与伦理风险

用真实的 NYU Shanghai 领导照片做 Q 版车手是这个项目最有趣的点,也是最需要提前处理的风险;建议在 10-24 生成车手之前定下方案。

| 风险 | 说明 | 处理方式 |
| --- | --- | --- |
| 肖像同意 | 被做成游戏角色的人可能不知情,也可能不喜欢 | 发邮件说明用途(课程作业、仅课堂展示)并征求同意;未同意的人不放进游戏 |
| 照片上传第三方 | 照片会上传到 Image 2 和 Tripo 的服务器 | 课程大纲禁止向 GenAI 提交个人信息和受版权保护的材料;官网头像可能属于学校版权,建议先问 Prof. Fedtke 是否可以 |
| 内容尊严 | 撞车、垫底等情境可能被看成调侃 | 不加嘲讽性台词或丑化造型;结算页文案保持中性 |
| 传播范围 | 链接被转发到课堂以外 | 房间需房间码才能进入;作业结束后下线或换成原创角色 |

**备用方案**:准备 4–6 位纯文字描述生成的原创 Q 版车手(不参照任何真人)。同意情况不明时直接用备用方案,管线和代码完全不变,只换资产。

无论最后用哪种方案,这个决策过程都可以直接写进反思文章的 Ethical Considerations 部分:AI 让“把任何人做成角色”的成本降到几分钟,同意和尊严的问题就从技术问题变成了作者的责任。

**待确认**:是否已联系相关领导或其办公室?是否已问过教授?

## 9. 7 天排期与验收标准

10-26(周一)上课前要有能联机跑完一局的 P0 版本,周一课上直接拉同学试玩;最后两天留给反思文章。

**每日任务**

- [ ] 10-21 周三:定稿 PRD 与英文提案;建仓库;开始过程日志
- [ ] 10-22 周四:单人驾驶原型——Kenney 赛道、街机车辆、追尾相机、出界重置
- [ ] 10-23 周五:联机——房间码、大厅、位置同步,两个浏览器窗口能同场跑
- [ ] 10-24 周六:资产——确定肖像方案;Image 2 + Tripo 生成车手和车;Blender 清理;选择界面
- [ ] 10-25 周日:流程——10 秒投票、3-2-1 发车、检查点与圈数、结算页;第 2 张地图
- [ ] 10-26 周一:部署 + 课上试玩;收集同学反馈;修 bug;录屏与截图
- [ ] 10-27 周二:写约 1,000 词反思;整理日志与截图
- [ ] 10-28 周三:课上 Peer Review;按反馈修改;23:59 前在 Google Docs 提交全部材料

**落后时的砍功能顺序**:先砍 P2 → 地图减到 2 张 → 车手 / 车减到各 3 个 → 部署失败就用局域网演示 + 录屏。反思文章永远不砍。

**验收标准(提交前逐条打勾)**

- [ ] 4 台不同电脑在校园网下能用房间码进入同一局
- [ ] 从大厅到结算全流程无需刷新页面,可连续再来一局
- [ ] 投票 10 秒到时自动进入发车,平票时随机
- [ ] 抄近路不计圈,名次显示正确
- [ ] 至少 4 位车手 × 3 辆车可自由组合,车手正确坐在座位上
- [ ] 首次加载 ≤ 15 秒(校园网)
- [ ] Credits 页列出全部地图与工具来源
- [ ] 过程日志 ≥ 15 条记录,含至少 3 个失败案例截图

## 10. 英文提案草稿与过程记录

**Part 1 Proposal(约 150 词,可直接修改后提交)**

For the AI Writathon, I will build a small browser-based 3D multiplayer racing game. Classmates join a room with a code, choose a driver and a car, vote on a track within ten seconds, and race three laps. Almost every visual asset will be machine-made: I will use Image 2 to create chibi-style driver portraits and Tripo AI to turn those portraits and text prompts into 3D drivers and cars. Tracks will come from open-source asset kits, and I will work with an AI coding assistant on the game logic and networking. My strategy is to treat the AI tools as fast but unreliable production partners. I set the style rules, choose and reject outputs, repair models by hand, and log every prompt, failure, and manual edit. This record will let me analyze where authorship sits in a project whose assets are generated by machines but whose design decisions are mine.

(若最终使用真人领导形象,可在第三句后补一句:Some drivers will be caricatures of NYU Shanghai leaders, used only with their permission.)

**过程日志模板**(每次生成或手动修改都记一行)

| 日期 | 工具 | 输入 / Prompt | 输出概述 | 结果 | 我做的修改 | 截图 |
| --- | --- | --- | --- | --- | --- | --- |
| 10-24 | Image 2 |  |  | 采用 / 修改后采用 / 弃用 |  |  |
|  | Tripo |  |  |  |  |  |
|  | 编程助手 |  |  |  |  |  |

“结果”和“我做的修改”两列最重要:它们直接对应反思文章里的 collaborator / editor / author / supervisor 角色问题。

