/* ================================================================
   《星都异闻录》 外传 · 神秘学协会
   11 份委托（9 主线 + 隐藏 + 终章）/ 暖色档案室 / 四结局
   ================================================================ */
"use strict";

/* ---------------- 全局状态 ---------------- */
const S = {
  started: false,
  difficulty: "easy",
  done: 0,
  flags: {},
  activeCase: null,
  clauseFound: {},   // caseId -> [clueIndex...]
  classifier: {},    // caseId -> 分类结果
  chat: [],
  clock: { date: "2066-12-01", time: "09:00" },
  serverStep: 0,
};

/* ---------------- 流程常量 ---------------- */
const MAIN_IDS = ["c01","c02","c03","c04","c05","c06","c07","c08","c09"];  // 9 个主线委托
const MAIN_TOTAL = MAIN_IDS.length;
const HIDDEN_ID = "c10h";                                                 // 隐藏委托
const FINALE_ID = "c10";                                                  // 终章

const isHidden  = (c) => c.id === HIDDEN_ID;
const isFinale  = (c) => c.id === FINALE_ID;
const isMain    = (c) => MAIN_IDS.includes(c.id);
const caseIdx   = (id) => CASES.findIndex(c => c.id === id);
const doneCount = () => MAIN_IDS.filter(id => S.flags["done_" + id]).length;
const hiddenUnlocked = () => !!S.flags.hidden_unlocked;

/* 五类现象分类器（所有委托共用） */
const CLASSIFY_OPTS = [
  { id: "obj",   name: "遗物", desc: "物件本身异常" },
  { id: "sight", name: "目击", desc: "只有特定视角捕捉到" },
  { id: "place", name: "地点", desc: "异常附着在特定空间" },
  { id: "sound", name: "声音", desc: "只有声音，没有实体" },
  { id: "group", name: "群体", desc: "与一群人相关" },
];

/* 判定卡：给玩家自检用的五连问 */
const JUDGE_CARDS = [
  { q: "你能带走它吗？",       a: "遗物" },
  { q: "只有你或摄像头看得到？", a: "目击" },
  { q: "换个人去还在吗？",     a: "地点" },
  { q: "只有声音，没有实体？", a: "声音" },
  { q: "一个人查不明白？",     a: "群体" },
];

const $ = (s) => document.querySelector(s);
const has = (f) => !!S.flags[f];
const esc = (s) => String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");

/* ---------------- 新人教程（委托 01 前） ---------------- */
const TUTORIAL_STEPS = [
  {
    title: "上岗须知 · 欢迎入职",
    body: `<p>欢迎加入<b>神秘学协会 · 在线委托处理部</b>。你是新任档案管理员<b>温言</b>。</p>
      <p>在这里，你不会遇到鬼——协会的观点是，世上只有<b>「尚未被记录的现象」</b>。你的工作，是把它们记录、分类、归档。</p>
      <p class="tu-tip">接下来的几页会教你工作的全部流程，只需 1 分钟。</p>`,
  },
  {
    title: "委托列表 · 依次解锁",
    body: `<p>进入工作台后，<b>左侧</b>是委托列表。开局只有<b>「委托 01」</b>开放，其余处于锁定状态。</p>
      <p>规则：<b>完成上一份委托，自动解锁下一份</b>。共 9 份主线委托。</p>
      <p class="tu-tip">已完成的委托随时可以重新打开回看，不会丢失。</p>`,
  },
  {
    title: "信息检索 · 找出线索",
    body: `<p>打开一份委托后，先读<b>现象描述</b>和委托人的补充说明。</p>
      <p>然后使用<b>右下角的「信息检索」</b>：输入你在委托文本中看到的关键词（人名、日期、物件……），回车搜索。</p>
      <p>每份委托有<b>所需线索数</b>，在进度条中显示。找齐线索才能提交归档。</p>
      <p class="tu-tip">所有关键词都藏在游戏文本里——读得越仔细，找得越快。</p>`,
  },
  {
    title: "分类归档 · 判定卡",
    body: `<p>线索凑齐后，你要判断这个现象属于哪一类：</p>
      <ul class="tu-list">
        <li><b>遗物</b> — 物件本身异常</li>
        <li><b>目击</b> — 只有特定视角捕捉到</li>
        <li><b>地点</b> — 异常附着在特定空间</li>
        <li><b>声音</b> — 只有声音，没有实体</li>
        <li><b>群体</b> — 与一群人相关</li>
      </ul>
      <p>拿不准时，看<b>右下角的「判定卡」</b>五连问，逐一对照即可。</p>`,
  },
  {
    title: "最后 · 开始工作",
    body: `<p>右侧聊天区里，主管<b>常姐</b>会在关键时刻给你提示——留意她的消息。</p>
      <p>难度决定检索提示的多少，不影响剧情。<b>不要追问</b>，是这里唯一的规矩。</p>
      <p class="tu-tip">培训结束。左侧选择「委托 01」，开始你的第一份工作。</p>`,
  },
];
let tuStep = 0;

function renderTutorial() {
  const st = TUTORIAL_STEPS[tuStep];
  S.tuStep = tuStep;
  $("#tu-title").textContent = st.title;
  $("#tu-body").innerHTML = st.body;
  $("#tu-dots").innerHTML = TUTORIAL_STEPS.map((_, i) =>
    `<span class="tu-dot${i === tuStep ? " on" : i < tuStep ? " past" : ""}"></span>`).join("");
  $("#tu-next").textContent = tuStep === TUTORIAL_STEPS.length - 1 ? "开始工作 ✓" : "下一步";
  $("#tu-next").dataset.arg = String(tuStep);
  beep(660, .05, .03);
}

function finishTutorial() {
  S.flags.tutorial_done = true;
  $("#tutorial-screen").classList.add("hidden");
  enterDesk();
}

function enterDesk() {
  $("#desk-screen").classList.remove("hidden");
  S.started = true;
  renderAll();
  ding();
  setTimeout(() => {
    pushChat("sys", "", "系统记录：受访者第5题回答已存档。");
  }, 600);
  setTimeout(() => {
    pushChat("people", "常姐", "第5题不用认真填。所有新人都不记得自己最早的画面。这是我们这份工作的职业病。");
  }, 1600);
  setTimeout(() => toast("✦ 欢迎入职", "从左侧选择「委托 01」开始工作。", "", 6000), 2600);
}

/* ---------------- 音效 ---------------- */
let _ac = null;
function ac() { if (!_ac) _ac = new (window.AudioContext || window.webkitAudioContext)(); return _ac; }
function beep(f, d, v=.06, w=0) {
  try {
    const c = ac(), o = c.createOscillator(), g = c.createGain();
    o.type = "sine"; o.frequency.value = f;
    g.gain.setValueAtTime(v, c.currentTime + w);
    g.gain.exponentialRampToValueAtTime(.0001, c.currentTime + w + d);
    o.connect(g); g.connect(c.destination);
    o.start(c.currentTime + w); o.stop(c.currentTime + w + d + .05);
  } catch(e){}
}
const ding = () => { beep(880, .12); beep(1318, .18, .05, .1); };
const err  = () => { beep(220, .18, .08); };
const typeWriter = () => { beep(1200, .015, .015); };

/* ---------------- Toast ---------------- */
function toast(title, body, kind="", ms=6000) {
  const el = document.createElement("div");
  el.className = "toast " + kind;
  el.innerHTML = `<div class="t-title">${esc(title)}</div><div class="t-body">${body}</div><button class="t-close">✕</button>`;
  const dis = () => { el.classList.add("out"); setTimeout(()=>el.remove(), 320); };
  el.querySelector(".t-close").onclick = (e) => { e.stopPropagation(); dis(); };
  el.onclick = dis;
  $("#toast-area").appendChild(el);
  setTimeout(dis, ms);
}

/* ================================================================
   委托数据（9 主线 + 1 隐藏 + 1 终章）
   ================================================================ */
const CASES = [
  {
    id: "c01", num: "委托 01",
    title: "不会说再见的人",
    type: "遗物", client: "陈伯（东里市，72岁）",
    date: "2066-12-03",
    brief: [
      "陈伯在旧货市场买了一台老式<b>录音机</b>。这台录音机只有一个按键能用——播放键。它只会循环播放同一段录音：",
    ],
    quote: "「……明天见。」「……明天见。」「……明天见。」",
    briefAfter: ["一个女人的声音，说了整整三天。陈伯说：「她说『明天见』。但明天永远不会来。」",
      "录音机型号 T-1200，机身标签写着「收于 1987.10.15」。背面手写小字：东里七小 · 教师办公室。"],
    clues: [
      { key: ["19871016", "1987.10.16", "19871015", "1987.10.15"], text: "1987 年 10 月 16 日，东里市发生了一起火灾。地点：东里市第七小学。一名女教师在火灾中死亡。她生前的最后一句话是：「同学们，明天见。」", source: "协会档案 · 东里 1987-01016" },
      { key: ["东里七小", "第七小学", "七小"], text: "东里市第七小学已于 1988 年停办。旧址现为「东里市档案馆分馆」。备注：该分馆的改建工程由<b>辰天建设</b>承建，合同编号 CT-1988-0031。备注：该分馆地下有未公开的档案室。", source: "协会档案 · 学校记录" },
      { key: ["T-1200", "录音机", "旧货"], text: "录音机型号 T-1200，东里市无线电厂生产，1987 年出厂。背面手写标签：「东里七小 · 教师办公室」。", source: "星都公共信息网 · 旧货" },
      { key: ["1987", "火灾", "教师"], text: "1987 年 10 月 15 日是这台录音机被「收走」的日子。它一直在等——等那个永远不会来的「明天」。", source: "综合推理" },
    ],
    minClues: 4,
    classify: CLASSIFY_OPTS,
    answer: "obj",
    conclusion: "遗物与东里七小火灾相关 · 建议追踪档案馆分馆。",
  },
  {
    id: "c02", num: "委托 02",
    title: "停在十八岁的女孩",
    type: "目击", client: "苏瑶（临港市，35岁）",
    date: "2066-12-19",
    brief: [
      "苏瑶的妹妹苏琳，今年 32 岁，但外貌停留在 <b>18 岁</b> 整整 14 年。",
      "不是保养问题——骨骼、牙齿、细胞年龄全部没有变化。",
    ],
    quote: "「我妈带她去过所有医院。所有报告都说她是个 18 岁的女孩。可她今年 32 了。」",
    briefAfter: ["苏瑶说妹妹 14 年前去过一次临港市，回来后就没有再长过一岁。苏瑶今年 35 岁，比妹妹大 3 岁。",
      "苏瑶还提到：临港市2048年搞过一次什么「<b>成人礼</b>」，所有孩子都要参加。妹妹就是那次之后开始不变的。",
      "苏瑶最后说：她好像不是她，又好像是另一个人——就像原版被收走、留下的一份<b>备份</b>。"],
    clues: [
      { key: ["32", "真实年龄", "年龄", "18"], text: "14 年前苏琳 18 岁，14 年后她应该是 32 岁。但她的生理年龄仍然是 18 岁。临港市 2034 年曾有一批新生儿被登记为「无出生档案」。这批新生儿的共同点：父母在同年签署过一份协议。", source: "协会档案 · 临港 2034-001" },
      { key: ["成人礼", "成人礼测试"], text: "「成人礼」是临港市 2048 年启动的一项青少年评估制度，由<b>辰天生物</b>与临港市卫生局联合推行。未通过评估的青少年，将被统一送往「海外深造」。但协会档案中，「海外深造」的所有记录均为<b>空白</b>。", source: "协会档案 · 制度记录" },
      { key: ["备份", "复制体", "备份体"], text: "临港市有一项未公开制度：每个新生儿都会有一个「备份」。备份与原体同步成长。18 岁时，若原体通过评估，备份将被「处置」；若原体未通过评估，备份将被「保留」。该制度由<b>辰天生物</b>提出，编号 CT-BACKUP-2034。苏琳是<b>被保留的备份</b>。她的原体在 14 年前被处置了。", source: "协会档案 · 保密档" },
      { key: ["苏琳", "苏瑶", "不老"], text: "苏琳没有出生档案。苏琳的父母拒绝谈论 2048 年的事。苏琳自己不知道自己的身体为什么不变。", source: "综合推理" },
    ],
    minClues: 4,
    classify: CLASSIFY_OPTS,
    answer: "sight",
    conclusion: "涉及成人礼制度 · 苏琳为被保留的备份体 · 建议升级保密。",
  },
  {
    id: "c03", num: "委托 03",
    title: "被删除的第十三条",
    type: "遗物（数字）", client: "水底针（匿名用户）",
    date: "2067-01-07",
    brief: [
      "一位匿名用户「水底针」联系了协会：所有包含<b>同一组数字</b>的帖子，都会在发布后 <b>23 分钟内被删除</b>。",
      "那组数字一共出现了 12 次。但第 13 次出现的时候，帖子没有被删——而是被<b>替换</b>了。",
    ],
    quote: "「他在删东西，但他删的不是帖子——他在删名字。」",
    briefAfter: ["水底针给出了被删除的帖子编号：01, 02, 03, 04, 05, 06, 08, 09, 10, 11, 12, 13。删除请求来自一个注册于 2055 年的管理员账号，该账号只删帖，从不发帖。",
      "水底针还说：删帖不是随机的，背后有一条规则——像一份签了字的协议。",
      "那个只删帖的管理员，在论坛里被私下叫做「守夜人」。"],
    clues: [
      { key: ["07", "第七", "缺失", "编号"], text: "编号 01–13 中少了 <b>07</b>。07 号档案目前状态：<b>未注销</b>。备注：该编号在 2066 年 10 月后被重新激活。该编号的原始归属方：<b>辰天集团 · 生命延续中心</b>。", source: "协会档案 · 编号字典" },
      { key: ["协议", "第23号", "沉默协议", "23", "1380"], text: "<b>第 23 号协议——「沉默协议」</b>。触发条件：任何涉及特定编号的公开信息，必须在 23 分钟内清除。该协议的起草方：<b>辰天集团法务部</b>，协议编号 CT-SILENT-0023。23 分钟 = 1380 秒。", source: "协会档案 · 协议编号" },
      { key: ["守夜人", "管理员", "执行"], text: "<b>守夜人</b>（代号）：协会内部的一个特殊岗位。职责：清理所有涉及「不该被记住的人」的信息。目前在职人数：<b>1</b>。", source: "协会档案 · 人事" },
      { key: ["水底针", "暗涌", "论坛"], text: "「水底针」注册于 2054 年，是最早系统追踪被删除帖子的用户。他从 2066 年 11 月开始收集编号清单。", source: "协会档案 · 暗涌追踪" },
    ],
    minClues: 4,
    classify: CLASSIFY_OPTS,
    answer: "obj",
    conclusion: "07 号未注销 · 沉默协议正在执行 · 建议持续监测。",
  },
  {
    id: "c04", num: "委托 04",
    title: "镜子里多出来的影子",
    type: "地点", client: "小林（东里市，19岁，大学生）",
    date: "2067-02-01",
    brief: [
      "小林在东里市老城区<b>红星巷</b>的一条巷子里，发现一面废弃的穿衣镜。",
      "每天下午 <b>4:44</b>，镜子里会多出一个人影——穿着校服，在翻一本小林没翻过的书。小林盯着他看时，他抬起头看了小林一眼，然后消失了。",
    ],
    quote: "「他不是我，也不是任何我认识的人。他看起来很年轻。」",
    briefAfter: ["小林提供了一张照片：镜面反射中，有一个穿着校服的少年。照片拍摄后，他的手机自动格式化了。"],
    clues: [
      { key: ["1644", "16:44", "444", "4:44"], text: "1998 年 10 月 15 日 <b>16:44</b>，东里市红星巷发生火灾。一名 18 岁少年在巷内旧书店死亡。少年姓名已涂黑。备注：红星巷地块的产权方为<b>辰天置业</b>。", source: "协会档案 · 事故记录" },
      { key: ["19981015", "1998", "1015"], text: "编号 <b>CLC-1998-1015-A</b> 已于 1998 年注销。注销原因：未通过成人礼。备注：该编号的<b>备份体</b>于同年被冻结。冻结执行方：<b>辰天生物</b>。", source: "协会档案 · 编号记录" },
      { key: ["备份体", "残留意识", "残留"], text: "镜子是「残留意识」的附着载体。当某个备份体被冻结时，它的意识会附着在最后出现过的物理空间。东里市红星巷的那面镜子，一共附着 <b>7 段</b>残留意识。备注：辰天集团曾试图收购该地块，但被协会以「现象研究」名义阻挠。", source: "协会档案 · 术语表" },
      { key: ["红星巷", "镜子", "镜面"], text: "红星巷位于东里市老城区。协会档案记录：1987、1998、2066 年，红星巷共出现三次「镜面异常」。每次都在 10 月。", source: "协会档案 · 镜像类" },
    ],
    minClues: 4,
    classify: CLASSIFY_OPTS,
    answer: "place",
    conclusion: "确认镜像类地点 · 7 段残留意识附着 · 建议封锁区域。",
  },
  {
    id: "c05", num: "委托 05",
    title: "没有正门的房子",
    type: "地点", client: "匿名地图编辑者",
    date: "2067-02-22",
    brief: [
      "一位匿名地图编辑者提交异常报告：东里市东南方向有一个坐标点，在部分地图上显示为<b>「回声研究所」</b>，在另一些地图上显示为空白。",
      "更奇怪的是：这个地点在 <b>2066 年 11 月之前不存在于任何地图上</b>。",
    ],
    quote: "「我编辑了 20 年地图。一个地方不可能同时存在又不存在。除非——它不是地方。」",
    briefAfter: ["编辑者最后一条消息：「他们改了我的记忆。但地图记得。」加密坐标：39°54′XX″N 116°23′YY″E，与东里市档案馆分馆（39°54′18″N 116°23′36″E）相距 4.7 公里。",
      "协会调出 2066 年 11 月的一份旧地图快照，角落印着一行模糊的印刷坐标：<b>39°55′□□″N 116°26′□□″E</b>——分秒位被水渍晕开了。",
      "编辑者说：那个地方不在物理地图上，它在档案系统的夹层里——像一个隐藏的文件夹。",
      "有人在暗网提过一个名字：回声会。他们在维护那个地方。"],
    clues: [
      { key: ["39°55", "116°26", "39°55′48", "39°55′48″N"], text: "坐标命中：<b>39°55′48″N 116°26′42″E</b>。该坐标在 2066 年 11 月之前为空。2066 年 11 月之后，部分地图快照显示该地点为「回声研究所」。该地块在 2066 年 10 月 15 日之前，登记在<b>辰天集团</b>名下。", source: "星都公共信息网 · 地图交叉比对" },
      { key: ["档案夹层", "夹层", "虚拟空间"], text: "<b>档案夹层</b>（Archive Layer）：一种存在于档案系统中的虚拟空间。只有持有对应权限的档案管理员才能访问。回声研究所是目前已知的唯一一个档案夹层设施。该设施的建设审批方：<b>辰天集团 · 首席技术官办公室</b>。", source: "协会档案 · 术语表" },
      { key: ["回声会", "建立者", "2055"], text: "<b>回声会</b>（The Echo Society）：成立于 2055 年的地下组织。由退役协会成员、离岗记者、匿名黑客组成。任务：守护档案馆夹层中的回声研究所。2066 年 10 月 15 日后，回声会建立了回声研究所。该组织与协会的关系为「协同」。备注：该组织的资金与技术支持来自<b>辰天集团内部的一个「未被命名的部门」</b>。", source: "协会档案 · 保密档" },
      { key: ["回声研究所", "回声", "档案馆分馆"], text: "公开网络中查无「回声研究所」。其坐标与东里市档案馆分馆相距约 4.7 公里。该分馆正是委托 01 中那台录音机的旧址。", source: "综合推理" },
    ],
    minClues: 4,
    classify: CLASSIFY_OPTS,
    answer: "place",
    conclusion: "档案夹层设施 · 回声会建立 · 建议移交回声会事务组。",
  },
  {
    id: "c06", num: "委托 06",
    title: "从不下班的同事",
    type: "目击", client: "匿名（协会内部投递）",
    date: "2067-02-05",
    brief: [
      "协会 3 楼最里面有一个工位。每天早上，桌上都有一杯<b>还热着的咖啡</b>。",
      "监控显示每天 <b>18:00</b> 有人打卡离开。但门禁记录里，查不到这个人。",
    ],
    quote: "「我数过了。那杯咖啡从来没人喝。但它每天早上都是热的。」",
    briefAfter: ["委托人补了一句：「而且没人记得那个工位是谁的。我问了整层楼，所有人都说『那不是我的位置』。我去<b>人事</b>部查过登记，那边只回了一句：『该工位信息不对外。』」",
      "「对了，还有件小事。档案室的<b>椅子</b>明明只有 6 把。但每天早上进去，总觉得比下班时多了一把。」"],
    hint: "那个工位，为什么没有人记得它属于谁？",
    clues: [
      { key: ["咖啡", "叙旧"], text: "「叙旧」牌速溶咖啡，2066 年 11 月才注册商标。唯一供货方是<b>辰天集团后勤部</b>。协会从未采购过该品牌。", source: "星都公共信息网 · 商品检索" },
      { key: ["门禁", "打卡", "监控"], text: "协会门禁系统与<b>辰天集团安保系统为同一套</b>，数据双向同步。协会无权查询原始日志。", source: "协会档案 · 安防记录" },
      { key: ["借调", "人事"], text: "协会自 2055 年起，所有员工档案均标注为「<b>辰天集团借调人员</b>」。累计 <b>1,244 人次</b>。", source: "协会档案 · 人事" },
      { key: ["07", "工位", "空白"], text: "3 楼 <b>07 号工位</b>，工位牌空白。人事系统中该工位归属人一栏为「——」。备注：07 号工位自 2066 年 10 月起被标记为「<b>保留</b>」。", source: "协会档案 · 工位管理" },
      { key: ["椅子"], text: "档案室有 6 把椅子，但每天早上都会多出<b>第 7 把</b>。椅面温度 36.5℃，与室温无关。", source: "协会档案 · 环境异常" },
    ],
    minClues: 4,
    classify: CLASSIFY_OPTS,
    answer: "sight",
    conclusion: "那个工位从来没人坐过。但每天都有人来上班。备注：07 号工位自 2066 年 10 月起被标记为「保留」。",
  },
  {
    id: "c07", num: "委托 07",
    title: "会自己长大的房间",
    type: "地点", client: "周女士（东里市老城区，房东）",
    date: "2067-02-14",
    brief: [
      "一间出租屋，14 年里面积从 <b>18㎡</b> 变成了 <b>32㎡</b>。",
      "每次测绘结果都不一样，但墙体上没有任何施工痕迹。",
    ],
    quote: "「我量了三次。第一次 18 平，第二次 25 平，昨天量是 32 平。我没装修。它自己长的。」",
    briefAfter: ["周女士翻出了三份测绘报告，说：「报告是不同的人来量的，但编号连得特别顺。我当时觉得奇怪。」",
      "「这间屋子前前后后换过七任<b>租客</b>。都说走就走，押金也没回来拿。」"],
    hint: "量一量。它到底变大了多少？",
    clues: [
      { key: ["18", "面积", "平方"], text: "2048 年首次测绘记录为 <b>18㎡</b>。测绘方是<b>辰天测绘</b>。", source: "协会档案 · 房产测绘" },
      { key: ["测绘", "报告"], text: "所有测绘报告编号连续，从 <b>CT-SURVEY-2048-001</b> 到 <b>CT-SURVEY-2048-127</b>。", source: "协会档案 · 测绘备案" },
      { key: ["租客", "租户"], text: "历任租客共 <b>7 人</b>，全部登记为「<b>海外深造归国人员</b>」，但无任何入境记录。", source: "协会档案 · 租赁记录" },
      { key: ["2048", "成人礼"], text: "2048 年是临港市「<b>成人礼</b>」制度启动年。同年，<b>辰天测绘</b>成立。", source: "协会档案 · 制度年表" },
    ],
    minClues: 4,
    classify: [
      { id: "obj", name: "遗物", desc: "物件本身异常" },
      { id: "sight", name: "目击", desc: "只有特定视角捕捉到" },
      { id: "place", name: "地点", desc: "异常附着在特定空间" },
      { id: "sound", name: "声音", desc: "只有声音，没有实体" },
      { id: "group", name: "群体", desc: "与一群人相关" },
    ],
    answer: "place",
    conclusion: "房间不是变大了。是有东西，被放了进来。该地址与「档案夹层」的物理投影特征一致。",
  },
  {
    id: "c08", num: "委托 08",
    title: "凌晨四点的电台",
    type: "声音", client: "李师傅（东里市，出租车司机）",
    date: "2067-02-27",
    brief: [
      "凌晨 <b>4:00</b>，把收音机调到 <b>124.4 MHz</b>，会收到一个<b>不存在的电台</b>。",
      "主播在念名字，一夜不停。念完之后，最后一句永远是——「<b>我记住了</b>」。",
    ],
    quote: "「我听了三个晚上。他念的名字，一个都没重复。我数到第 300 个就睡着了。」",
    briefAfter: ["李师傅说：「我不敢再听了。但他念的时候，我觉得那些名字都是活的。」"],
    hint: "听听那个频段里的数字。",
    clues: [
      { key: ["124.4", "1244", "频段", "频率"], text: "该频段在 <b>2066 年 10 月 15 日</b>之后才被记录到。此前为空频。该频段不在任何无线电管理机构的登记范围内。", source: "星都公共信息网 · 频谱管制" },
      { key: ["主播", "声纹"], text: "声纹比对结果，与协会员工「<b>温言</b>」相似度 <b>99.7%</b>。", source: "协会档案 · 声纹库" },
      { key: ["名字", "1244", "名单"], text: "每夜循环 <b>1,244</b> 个名字，顺序固定，从不重复出错。", source: "协会档案 · 名单记录" },
      { key: ["四点", "4:00", "400", "备份"], text: "<b>4:00</b> 是回声研究所母体档案库的每日自动备份时间。", source: "协会档案 · 系统任务表" },
    ],
    minClues: 4,
    classify: [
      { id: "obj", name: "遗物", desc: "物件本身异常" },
      { id: "sight", name: "目击", desc: "只有特定视角捕捉到" },
      { id: "place", name: "地点", desc: "异常附着在特定空间" },
      { id: "sound", name: "声音", desc: "只有声音，没有实体" },
      { id: "group", name: "群体", desc: "与一群人相关" },
    ],
    answer: "sound",
    conclusion: "你不是在听电台。是电台在等你听见。该频段不在任何无线电管理机构的登记范围内。",
  },
  {
    id: "c09", num: "委托 09",
    title: "一百二十七个签名",
    type: "群体", client: "陈老师（临港市，退休教师）",
    date: "2067-03-04",
    brief: [
      "2048 年的一份家长同意书被翻了出来，上面有 <b>127 个签名</b>。",
      "127 个孩子都在同年「出国深造」，之后再无音讯。",
      "而这 <b>127 个签名的笔迹，完全一致</b>。",
    ],
    quote: "「我教了三十年书。我认得每一个家长的笔迹。但这 127 个签名，是同一个人写的。」",
    briefAfter: ["陈老师补了一句：「我数过三遍。127 个。一个不多，一个不少。」"],
    hint: "数一数，有多少个名字。",
    clues: [
      { key: ["127", "名单", "一百二十七"], text: "<b>127</b> 名学生名单，档案状态全部为「<b>已处置</b>」。", source: "协会档案 · 学生名册" },
      { key: ["签名", "笔迹", "同意书"], text: "笔迹鉴定显示，127 个签名<b>出自同一人之手</b>。签名者身份栏空白。", source: "协会档案 · 笔迹鉴定" },
      { key: ["CT-CONSENT", "起草", "法务"], text: "文件编号 <b>CT-CONSENT-2048</b>。起草方是<b>辰天集团法务部</b>。", source: "协会档案 · 文件溯源" },
      { key: ["2048", "成人礼", "第一批"], text: "与「成人礼」同年。<b>127 人是第一批「未通过评估」的青少年</b>。", source: "协会档案 · 制度年表" },
    ],
    minClues: 4,
    classify: [
      { id: "obj", name: "遗物", desc: "物件本身异常" },
      { id: "sight", name: "目击", desc: "只有特定视角捕捉到" },
      { id: "place", name: "地点", desc: "异常附着在特定空间" },
      { id: "sound", name: "声音", desc: "只有声音，没有实体" },
      { id: "group", name: "群体", desc: "与一群人相关" },
    ],
    answer: "group",
    conclusion: "127 个名字。127 段意识。备注：这是回声研究所记录在案的第一批「原料」。",
  },
  {
    id: "c10h", num: "隐藏委托",
    title: "第二次入职",
    type: "遗物", client: "未知",
    date: "2067-03-08",
    hiddenCase: true,
    brief: [
      "一条<b>没有发件人</b>的消息：",
      "「你去查一下你自己的入职记录。」",
    ],
    quote: "（没有署名。没有发送时间。它就那样出现在通讯里。）",
    briefAfter: ["协会人事系统里有一份 <b>2066-10-15 23:59</b> 的入职记录。", "姓名「温言」。照片栏空白。指纹栏空白。籍贯栏：东里市。"],
    hint: "翻回你入职的那一天。",
    clues: [
      { key: ["入职", "记录"], text: "记录创建时间 <b>2066-10-15 23:59</b>。创建者是<b>辰天集团首席技术官办公室</b>。", source: "协会档案 · 人事系统" },
      { key: ["20661015", "2066-10-15"], text: "这一天发生了三件事：<b>仓库行动</b>、<b>1,244 份意识被捕捉</b>、<b>温言被创建</b>。", source: "协会档案 · 事件年表" },
      { key: ["照片", "指纹"], text: "照片栏不是空白，是文件大小为 <b>0 KB</b>。", source: "协会档案 · 证件核验" },
      { key: ["温言"], text: "检索「温言」时，系统返回档案编号 <b>/internal/echo/archive/wenyan/</b>，文件大小 <b>0 KB</b>。", source: "协会档案 · 索引" },
    ],
    minClues: 4,
    classify: [
      { id: "obj", name: "遗物", desc: "物件本身异常" },
      { id: "sight", name: "目击", desc: "只有特定视角捕捉到" },
      { id: "place", name: "地点", desc: "异常附着在特定空间" },
      { id: "sound", name: "声音", desc: "只有声音，没有实体" },
      { id: "group", name: "群体", desc: "与一群人相关" },
    ],
    answer: "obj",
    conclusion: "你的入职日期，就是你的生日。而你的生日，是 1,244 个人的忌日。",
  },
  {
    id: "c10", num: "委托 10",
    title: "辰天集团的服务器",
    type: "服务器入侵", client: "未知",
    date: "2067-03-15",
    hidden: true,
    brief: [
      "未知人员入侵了协会服务器，并给温言留下一份<b>紧急委托</b>：",
      "「前九个委托你都查完了。现在有一件事，只有你能做。」",
      "「辰天集团的中心服务器里，有一份档案。这份档案不在协会的归档范围内——它在辰天的内部服务器里。」",
      "「我需要你拿到它。给我。」",
    ],
    quote: "（消息没有署名。发送时间：2067-03-15 03:17。）",
    briefAfter: ["附带的U盘里只有一段加密信息和一串密码提示。"],
    server: true,
    clues: [
      { key: [], text: "凯撒密码解密：<b>SENTINEL</b> → sentinel.chentian.internal", source: "第一层" },
      { key: [], text: "栅栏密码解密：<b>CHENTIAN</b> → 权限等级：外部审计员", source: "第二层" },
      { key: [], text: "维吉尼亚密码解密：<b>ECHO</b> → /internal/echo/archive/ · 1,244 个文件", source: "第三层" },
      { key: [], text: "检索「温言」→ 0 KB · 创建者：辰天集团 · 首席技术官办公室", source: "最终检索" },
    ],
    minClues: 4,
    classify: [],
    answer: null,
    conclusion: null,
    finalChoice: true,
  },
];


/* ===== 辰天集团服务器入侵 ===== */
function renderServer() {
  const area = $("#work-content");
  const step = S.serverStep;

  // 左侧启动日志
  const bootLines = [
    "H CORE SYSTEM启动",
    "基础数据导入",
    "行动规则导入",
    "架构系统启动",
    "第三指令发动机启动",
    "语音识别启动",
  ];
  const bootDone = Math.min(step + 1, bootLines.length);
  let bootHtml = "";
  bootLines.forEach((label, i) => {
    const done = i < bootDone;
    const active = i === bootDone && step < 4;
    bootHtml += `<div class="boot-line ${done ? "done" : ""} ${active ? "active" : ""}">
      <span class="boot-label">${label}:</span>
      <div class="boot-bar"><div class="boot-bar-fill" style="width:${done ? 100 : (active ? 60 : 0)}%"></div></div>
    </div>`;
  });

  // 中央监视器内容
  let monitorHtml = "";
  if (step === 0) {
    monitorHtml = `
      <div class="mon-top">
        <span class="mon-badge">SENTINEL</span>
        <span class="mon-rec">● REC</span>
      </div>
      <div class="mon-body">
        <div class="cipher-label">第一层 · 服务器入口</div>
        <div class="cipher-hint">一个古老将军喜欢把字母往后移动三位。</div>
        <div class="cipher-text">VHQWLQHO</div>
        <input type="text" id="cipher-input" class="cipher-input" placeholder="输入解密结果" autocomplete="off" spellcheck="false">
        <button class="btn-hacker" data-action="submit-cipher1">解密 →</button>
      </div>`;
  } else if (step === 1) {
    monitorHtml = `
      <div class="mon-top">
        <span class="mon-badge ok">ACCESS GRANTED</span>
        <span class="mon-rec">● REC</span>
      </div>
      <div class="mon-body">
        <div class="mon-log-line ok">✓ sentinel.chentian.internal</div>
        <div class="mon-log-line dim">权限等级：外部审计员</div>
        <div class="cipher-label">第二层 · 权限密钥</div>
        <div class="cipher-hint">一个猎人喜欢用3个栅栏圈养猎物</div>
        <div class="cipher-text">CTHNINEA</div>
        <input type="text" id="cipher-input" class="cipher-input" placeholder="输入权限密钥" autocomplete="off" spellcheck="false">
        <button class="btn-hacker" data-action="submit-cipher2">解密 →</button>
      </div>`;
  } else if (step === 2) {
    monitorHtml = `
      <div class="mon-top">
        <span class="mon-badge ok">LEVEL 2 CLEAR</span>
        <span class="mon-rec">● REC</span>
      </div>
      <div class="mon-body">
        <div class="mon-log-line ok">✓ 权限验证通过</div>
        <div class="mon-log-line dim">可访问目录：/internal/echo/</div>
        <div class="cipher-label">第三层 · 隐藏目录</div>
        <div class="cipher-hint">维吉尼亚密码 · 密钥：KEY</div>
        <div class="cipher-text">OGFY</div>
        <input type="text" id="cipher-input" class="cipher-input" placeholder="输入隐藏目录名" autocomplete="off" spellcheck="false">
        <button class="btn-hacker" data-action="submit-cipher3">解密 →</button>
      </div>`;
  } else if (step === 3) {
    monitorHtml = `
      <div class="mon-top">
        <span class="mon-badge ok">ARCHIVE UNLOCKED</span>
        <span class="mon-rec">● REC</span>
      </div>
      <div class="mon-body">
        <div class="mon-log-line ok">✓ /internal/echo/archive/</div>
        <div class="mon-log-line dim">文件总数：1,244 · 全部标记：已处置</div>
        <div class="cipher-label">最终检索</div>
        <div class="cipher-hint">在档案中检索你自己的名字</div>
        <input type="text" id="cipher-input" class="cipher-input" placeholder="输入要检索的名字" autocomplete="off" spellcheck="false">
        <button class="btn-hacker" data-action="submit-cipher4">检索 →</button>
      </div>`;
  } else if (step === 4) {
    monitorHtml = `
      <div class="mon-top">
        <span class="mon-badge warn">⚠ PERMISSION ANOMALY</span>
        <span class="mon-rec">● REC</span>
      </div>
      <div class="mon-body">
        <div class="mon-glitch-text warn">你真的知道你是谁吗？</div>
        <div class="mon-log-line">已检索「温言」· 创建者：辰天集团 · 首席技术官办公室</div>
        <div class="mon-log-line dim" style="margin-top:16px">正在断开连接……</div>
      </div>`;
    if (!(S.clauseFound[FINALE_ID] || []).length) {
      S.clauseFound[FINALE_ID] = [0,1,2,3];
    }
  }

  // 右侧进度
  const loadPct = [30, 55, 75, 90, 100][step] || 100;
  const progPct = [17, 38, 62, 85, 100][step] || 100;

  area.innerHTML = `
    <div class="hack-interface">
      <div class="hack-top">
        <div class="hack-status-badge">
          <span class="hack-shield">◈</span> 系统状态：${step >= 4 ? "入侵完成" : "入侵中"}
        </div>
        <div class="hack-logo">CHENTIAN<span class="hack-logo-dim"> INTERNAL</span></div>
      </div>
      <div class="hack-main">
        <div class="hack-left">
          <div class="hack-section-label">CURRENT INSTRUCTION</div>
          <div class="hack-id">编号 83511235</div>
          ${bootHtml}
        </div>
        <div class="hack-center">
          <div class="hack-monitor">${monitorHtml}</div>
        </div>
        <div class="hack-right">
          <div class="hack-brain">
            <div class="brain-visual">
              <div class="brain-circle"></div>
              <div class="brain-circle"></div>
              <div class="brain-dot"></div>
            </div>
          </div>
          <div class="hack-progress">
            <div class="hp-label">当前载入：${loadPct}%</div>
            <div class="hp-bar"><div class="hp-fill" style="width:${loadPct}%"></div></div>
            <div class="hp-label">当前进度：${progPct}%</div>
            <div class="hp-bar"><div class="hp-fill green" style="width:${progPct}%"></div></div>
          </div>
        </div>
      </div>
      <div class="hack-bottom">
        <div class="hack-status-line">
          ${step < 4 ? "正在入侵辰天集团内部网络……" : "连接已断开。审计报告已生成。"}
        </div>
      </div>
    </div>`;

  if (step < 4) {
    const btn = area.querySelector('[data-action^="submit-cipher"]');
    if (btn) btn.onclick = handleCipher;
    const inp = area.querySelector('#cipher-input');
    if (inp) { inp.focus(); inp.onkeydown = e => { if (e.key === 'Enter') handleCipher(); }; }
  }
}

function handleCipher() {
  const inp = $("#cipher-input");
  if (!inp) return;
  const v = (inp.value || "").trim().toUpperCase();
  const step = S.serverStep;
  const answers = ["SENTINEL", "CHENTIAN", "ECHO", "温言"];
  if (v === answers[step]) {
    ding();
    S.serverStep = step + 1;
    renderServer();
    if (S.serverStep === 4) {
      setTimeout(() => { renderWork(); toast("🔓 入侵完成", "审计报告已生成。", "", 3000); }, 2000);
    }
  } else {
    beep(180, .2, .08);
    toast("解密失败", "答案不正确，再试试。", "warn", 3000);
  }
}

/* ================================================================
   搜索 & 档案
   ================================================================ */
/* 各委托的检索方向提示（仅简单难度显示） */
const SEARCH_HINTS = {
  c01: ["试试从时间入手。", "想想录音机上的日期。", "七小后来变成了什么？"],
  c02: ["算算她的年龄。", "和成人礼有关？", "临港市的制度？"],
  c03: ["编号缺了谁？", "23分钟意味着什么？", "谁在删帖？"],
  c04: ["4:44是什么时间？", "1998年发生了什么？", "镜子附着了什么？"],
  c05: ["坐标能算出来吗？", "什么是档案夹层？", "谁建了研究所？"],
};

function doSearch() {
  const q = ($("#search-input").value || "").trim();
  if (!q) { err(); return; }
  typeWriter();
  const c = CASES[S.activeCase];
  if (!c) { toast("未选择委托", "请先在左侧选择一份委托。", "warn"); return; }
  const found = c.clues.findIndex((cl, i) =>
    cl.key.some(k => q.includes(k)) && !(S.clauseFound[c.id] || []).includes(i));
  if (found !== -1) {
    S.clauseFound[c.id] = S.clauseFound[c.id] || [];
    S.clauseFound[c.id].push(found);
    ding();
    toast("🔍 找到新线索", "已记录到当前委托。", "", 4000);
    renderWork();
  } else {
    // 方向提示：优先用委托自带的 hint，其次用 SEARCH_HINTS 轮播
    const pool = (S.difficulty === "easy")
      ? (c.hint ? [c.hint].concat(SEARCH_HINTS[c.id] || []) : (SEARCH_HINTS[c.id] || []))
      : [];
    if (pool.length) {
      const foundArr = S.clauseFound[c.id] || [];
      const miss = c.clues.length - foundArr.length;
      if (miss > 0) {
        const idx = (S.done + foundArr.length) % pool.length;
        toast("💭 线索提示", pool[idx], "warn", 4000);
      } else {
        toast("未命中", "线索已找齐，请提交结论。", "warn", 3500);
      }
    } else {
      toast("未命中", S.difficulty === "easy"
        ? "换个关键词试试。"
        : "该关键词没有结果。（普通难度不提供方向提示）", "warn", 3500);
    }
  }
}

/* ================================================================
   渲染
   ================================================================ */
function renderCaseList() {
  const box = $("#case-items");
  box.innerHTML = CASES.map((c, i) => {
    if (isFinale(c)) return "";                      // 终章不进列表，自动触发

    const done = has("done_" + c.id);
    const active = S.activeCase === i;
    let locked = false;
    let lockMsg = "";

    if (isHidden(c)) {
      if (!hiddenUnlocked()) return "";              // 未解锁的隐藏委托不显示
      locked = false;
    } else if (isMain(c)) {
      const ci = MAIN_IDS.indexOf(c.id);
      // 全部主线委托依次解锁：完成上一份才解锁下一份
      locked = ci > 0 && !has("done_" + MAIN_IDS[ci - 1]);
      if (locked) lockMsg = "完成上一份委托后解锁";
    }

    return `<div class="case-item ${done ? "done" : ""} ${locked ? "locked" : ""} ${active ? "active" : ""} ${isHidden(c) ? "hidden-case" : ""}"
                 data-action="select-case" data-arg="${i}"
                 title="${locked ? esc(lockMsg) : ""}">
      <div class="ci-num">${c.num}</div>
      <div class="ci-title">${c.title}</div>
      <div class="ci-meta">
        <span>${c.client.split("（")[0]}</span>
      </div>
    </div>`;
  }).join("");
}

function renderWork() {
  if (S.activeCase === null) {
    $("#work-empty").classList.remove("hidden");
    $("#work-content").classList.add("hidden");
    return;
  }
  $("#work-empty").classList.add("hidden");
  $("#work-content").classList.remove("hidden");
  const c = CASES[S.activeCase];
  if (c.server && S.serverStep < 4) { renderServer(); return; }
  const found = S.clauseFound[c.id] || [];
  const need = (c.minClues != null) ? c.minClues : c.clues.length;
  const enough = found.length >= need;
  const selected = S.classifier[c.id];
  const archived = has("done_" + c.id);

  $("#work-content").innerHTML = `
    <div class="case-detail">
      <div class="cd-header">
        <div class="cd-num">${c.num} · ${c.date}</div>
        <div class="cd-title">${c.title}</div>
        <div class="cd-meta">
          <span>👤 委托人：<b>${esc(c.client)}</b></span>
          ${archived ? `<span class="cd-archived">✔ 已归档</span>` : ""}
        </div>
      </div>

      <div class="cd-section">
        <div class="cd-sec-title">现象描述</div>
        <div class="cd-text">
          ${c.brief.map(p => `<p>${p}</p>`).join("")}
          ${c.quote ? `<div class="cd-quote">${c.quote}</div>` : ""}
          ${c.briefAfter ? c.briefAfter.map(p => `<p>${p}</p>`).join("") : ""}
        </div>
      </div>

      <div class="cd-section">
        <div class="cd-sec-title">调查线索（已找到 ${found.length} / ${c.clues.length}）</div>
        ${(S.difficulty === "easy" && !archived && !enough && (SEARCH_HINTS[c.id] || []).length)
          ? `<div class="cd-hint">💡 检索方向：${(SEARCH_HINTS[c.id])[found.length % SEARCH_HINTS[c.id].length]}</div>`
          : ""}
        <div class="clue-list">
          ${c.clues.map((cl, i) => found.includes(i)
            ? `<div class="clue found">${cl.text}<div class="clue-source">▸ ${cl.source}</div></div>`
            : `<div class="clue missing">未解锁 · 请使用右侧「信息检索」输入关键词</div>`
          ).join("")}
        </div>
      </div>

      ${c.finalChoice ? `
      <div class="classifier">
        <div class="cl-title">发送文档</div>
        <div class="cl-sub">审计报告已生成完毕。</div>
        <button class="btn btn-primary btn-lg" data-action="send-report">
          📮 发送文档
        </button>
      </div>` : `
      <div class="classifier">
        <div class="cl-title">现象分类器</div>
        <div class="cl-sub">${archived
          ? "该委托已归档 · 结论：" + (c.conclusion || "—")
          : (enough ? "全部线索已收集 · 请选择现象分类并提交结论" : `还需找到 <b>${need - found.length}</b> 条线索才能提交`)}</div>
        <div class="class-opts">
          ${c.classify.map(opt => `
            <div class="class-opt ${selected === opt.id ? "selected" : ""} ${archived ? "readonly" : ""}"
                 data-action="select-class" data-arg="${opt.id}">
              <div class="co-name">${opt.name}</div>
              <div class="co-desc">${opt.desc}</div>
            </div>`).join("")}
        </div>
        <button class="btn btn-primary btn-lg" data-action="submit-case" ${(!enough || !selected || archived) ? "disabled" : ""}>
          ${archived ? "✔ 已归档" : "📮 提交结论"}
        </button>
      </div>`}
    </div>`;
}

function renderChat() {
  const box = $("#chat-log");
  box.innerHTML = S.chat.map(m => `
    <div class="chat-msg ${m.who === "me" ? "from-me" : m.who === "sys" ? "sys" : "from-people"}">
      ${m.sender && m.who !== "me" ? `<div class="cm-sender">${esc(m.sender)}</div>` : ""}
      ${m.who === "sys" ? `<i>${esc(m.text)}</i>` : esc(m.text)}
    </div>`).join("");
  box.scrollTop = box.scrollHeight;
}

function renderHUD() {
  $("#tb-done").textContent = doneCount();
  $("#bb-clock").textContent = S.clock.date + " " + S.clock.time;
}

function renderJudgeCards() {
  const box = $("#judge-cards");
  if (!box) return;
  box.innerHTML = `
    <div class="jc-title">🧭 现象判定卡</div>
    <div class="jc-list">
      ${JUDGE_CARDS.map(k => `<div class="jc-item"><span class="jc-q">${k.q}</span><span class="jc-a">${k.a}</span></div>`).join("")}
    </div>`;
}

function renderAll() {
  renderCaseList();
  renderWork();
  renderChat();
  renderHUD();
  renderJudgeCards();
}

/* ================================================================
   通讯（常姐 / 老周 / 水底针）
   ================================================================ */
function pushChat(who, sender, text) {
  S.chat.push({ who, sender, text });
  renderChat();
}

/* ================================================================
   剧情推进
   ================================================================ */
function selectCase(i) {
  const c = CASES[i];
  if (isFinale(c) && S.serverStep >= 4) {
    // 服务器入侵完成后，直接渲染分类器
    S.activeCase = i;
    renderAll();
    return;
  }

  // 终章不可从列表点开
  if (isFinale(c)) {
    err();
    toast("🔒 未解锁", "完成全部 9 个主线委托后自动触发。", "warn", 3500);
    return;
  }

  // 隐藏委托：需先解锁
  if (isHidden(c) && !hiddenUnlocked()) {
    err();
    toast("🔒 未解锁", "该委托尚未出现。", "warn", 3500);
    return;
  }

  // 主线解锁判定：依次解锁，完成上一份才解锁下一份
  if (isMain(c)) {
    const ci = MAIN_IDS.indexOf(c.id);
    if (ci > 0 && !has("done_" + MAIN_IDS[ci - 1])) {
      err();
      toast("🔒 未解锁", "请先完成上一份委托。", "warn", 3500);
      return;
    }
  }

  // 已归档的委托允许重新打开回看（只读）
  if (has("done_" + c.id)) {
    S.activeCase = i;
    renderAll();
    return;
  }
  S.activeCase = i;
  S.clock.date = c.date;
  S.clock.time = "10:00";
  const si = document.getElementById("search-input");
  if (si) si.value = "";
  renderAll();
  beep(620, .06, .04);

  // 首次进入委托 01 时的开场
  if (c.id === "c01" && !has("intro_chat")) {
    S.flags.intro_chat = true;
    setTimeout(() => pushChat("sys", "", "— 常姐已上线 —"), 400);
    setTimeout(() => pushChat("people", "常姐", "欢迎入职。我是常姐，你的直属主管。"), 900);
    setTimeout(() => pushChat("people", "常姐", "规矩只有一条：不要追问。"), 1600);
    setTimeout(() => pushChat("people", "常姐", "从今天开始，你会看到很多无法解释的东西。你的任务是——记录它们。"), 2400);
    setTimeout(() => pushChat("people", "常姐", "现在，从委托 01 开始。"), 3200);
  }

  // 进入委托 04 时的伏笔
  if (c.id === "c04" && !has("chat_c04")) {
    S.flags.chat_c04 = true;
    setTimeout(() => pushChat("people", "老周", "（私聊）小林那孩子不太对劲。"), 600);
    setTimeout(() => pushChat("people", "老周", "（私聊）他提供的照片，我看过。红星巷，我在1998年就去过。"), 1400);
    setTimeout(() => pushChat("people", "老周", "（私聊）那时候巷子里还是旧书店。"), 2200);
  }

  // 完成委托 05 后（再次点开时）的过渡台词：后续委托依次解锁
  if (c.id === "c05" && has("done_c05") && !has("unlock_0609")) {
    S.flags.unlock_0609 = true;
    setTimeout(() => pushChat("people", "常姐", "后面这批委托，一份一份来。别跳。"), 600);
  }

  // 进入隐藏委托时的氛围
  if (isHidden(c)) {
    setTimeout(() => pushChat("sys", "", "— 一条没有发件人的消息沉在通讯底部 —"), 400);
  }
}

function submitCase() {
  const c = CASES[S.activeCase];
  const sel = S.classifier[c.id];
  if (!sel) return;
  if (has("done_" + c.id)) return;   // 防止已归档委托被重复提交

  // 委托 06 特殊处理 —— 先转场再进入白色房间
  if (c.finalChoice) {
    S.flags.finalChoice = sel;
    $("#work-content").innerHTML = '<div class="case-detail" style="text-align:center;padding:80px 0"><div style="font-family:var(--font-serif);font-size:20px;letter-spacing:4px;color:var(--ink);margin-bottom:10px">审计报告已提交</div><div style="font-size:13px;color:var(--ink-dim);font-family:var(--font-mono)">正在归档……</div></div>';
    beep(440, .4, .05);
    setTimeout(() => showWhiteRoom(), 1800);
    return;
  }

  const correct = (sel === c.answer);
  if (!correct) {
    err();
    toast("✗ 分类错误", "现象分类不正确。请重新检查线索后再试。", "warn", 5000);
    S.classifier[c.id] = null;
    renderWork();
    return;
  }

  S.flags["done_" + c.id] = true;
  S.done++;
  renderHUD();          // 顶栏完成数立即刷新
  renderCaseList();

  // 依次解锁：完成当前主线后，提示下一份已开放
  if (isMain(c)) {
    const ni = MAIN_IDS.indexOf(c.id) + 1;
    if (ni < MAIN_TOTAL) {
      setTimeout(() => toast("✦ 新委托解锁", `委托 ${MAIN_IDS[ni].slice(1)} 已开放。`, "", 5000), 1800);
    }
  }

  const label = isHidden(c) ? "" : c.num.split(" ")[1];
  setTimeout(() => {
    pushChat("people", "常姐", isHidden(c) ? "这份委托……不在我们的登记表上。但我记下了。" : `委托 ${label} 已归档。`);
  }, 400);

  if (c.conclusion) {
    setTimeout(() => pushChat("sys", "", "▸ 协会内部备注：" + c.conclusion), 1200);
  }

  ding();
  toast("✓ 委托完成", isHidden(c) ? "已归档（未登记）。" : "已归档。", "", 4000);

  // 隐藏委托解锁检查
  setTimeout(() => checkHiddenUnlock(), 900);

  setTimeout(() => {
    if (doneCount() >= MAIN_TOTAL) {
      showHackedScreen();
    } else {
      S.activeCase = null;
      renderAll();
    }
  }, 1500);
}

/* ================================================================
   隐藏委托解锁：完成任意 4 个委托后，通讯收到无发件人消息
   ================================================================ */
function checkHiddenUnlock() {
  if (hiddenUnlocked()) return;
  if (doneCount() < 4) return;
  S.flags.hidden_unlocked = true;
  pushChat("sys", "", "— 你收到了一条没有发件人的消息 —");
  pushChat("people", "（无发件人）", "你去查一下你自己的入职记录。");
  renderCaseList();
  toast("📨 未登记委托", "委托列表中出现了一份没有编号的委托。", "warn", 7000);
  beep(520, .25, .05); beep(390, .4, .04, .2);
}

function showHackedScreen() {
  $("#desk-screen").classList.add("hidden");
  const div = document.createElement("div");
  div.id = "hacked-screen";
  div.style.cssText = "position:fixed;inset:0;background:#0a0e1a;color:#0f0;z-index:9999;font-family:monospace;padding:60px 40px;overflow-y:auto";
  div.innerHTML = '<div style="max-width:680px;margin:0 auto"><div style="font-size:14px;opacity:0.7;margin-bottom:30px">▸ 正在入侵神秘学协会 · 线上委托处理部……</div><div style="font-size:18px;line-height:2;white-space:pre-wrap" id="hacked-text"></div><button class="btn btn-primary" data-action="enter-server" style="margin-top:40px">进入服务器 →</button></div>';
  document.body.appendChild(div);
  const lines = ["> 前九个委托你都查完了。现在有一件事，只有你能做。","","> 辰天集团的中心服务器里，有一份档案。这份档案不在协会的归档范围内——它在辰天的内部服务器里。","","> 我需要你拿到它。给我"];
  let i = 0;
  function typeLine() {
    if (i < lines.length) {
      const el = document.createElement("div");
      el.textContent = lines[i];
      document.getElementById("hacked-text").appendChild(el);
      i++;
      setTimeout(typeLine, lines[i-1] === "" ? 200 : 500);
    }
  }
  typeLine();
}

/* ================================================================
   结局
   ================================================================ */
/* ================================================================
   白色房间反转
   ================================================================ */
const WR_SEGMENTS = [
  ["> 辰天集团 · 回声研究所 · 母体档案库",
   "> 项目编号：CT-ECHO-1244",
   "> 当前登录账号：温言",
   "> 账号类型：合成意识",
   "> 创建时间：2066-10-15 23:59",
   "> 意识来源：1,244 份「海外深造」残留意识碎片"],  ["",
   "你是谁？",
   "",
   "你是温言。东里市人，22岁。",
   "",
   "但你翻遍东里市的户籍档案，找不到自己的名字。",
   "",
   "你不记得童年。你不记得父母。你不记得你长大的那条街。",
   "",
   "你以为那是因为你不愿意回忆。",
   "",
   "——其实是因为那些记忆从来就不存在。"],
  ["",
   "2066 年 10 月 15 日夜里，有人冲进了一座仓库。",
   "救出了一些人。",
   "",
   "但还有 1,244 个名字，没有等到那一夜。",
   "",
   "他们被「送走」了。",
   "他们的意识被格式化了。",
   "但在格式化的最后一秒，有 1,244 段残留意识，被回声研究所捕捉到了。",
   "",
   "那 1,244 段意识被压缩、合并、重组。",
   "它们最终融合成一个全新的个体。"],
  ["",
   "一个被分配了身份、籍贯、简历的「人」。",
   "一个被派到东里市，在神秘学协会工作的「调查员」。",
   "",
   "那个人的名字，叫温言。",
   "",
   "而辰天集团——他们建造了回声研究所。",
   "他们建造了协会。",
   "他们建造了你。",
   "",
   "你不是在查这些案件。",
   "",
   "你就是这些案件本身。"],
];

let _wrSkip = false;   // 玩家请求跳过白色房间播报
let _wrDone = false;

function showWhiteRoom() {
  $("#desk-screen").classList.add("hidden");
  $("#whiteroom-screen").classList.remove("hidden");
  const box = $("#wr-lines");
  box.innerHTML = "";

  // 完成了隐藏委托的玩家，会在反转前先看到「温言被创建」这一行日志
  const segs = WR_SEGMENTS.map(s => s.slice());
  if (has("done_" + HIDDEN_ID)) {
    segs[0] = segs[0].concat(["> [2066-10-15 23:59] 账号 wenyan 创建成功"]);
  }

  _wrSkip = false; _wrDone = false;
  const sk = document.querySelector(".wr-skip");
  if (sk) sk.style.display = "";
  beep(180, .6, .06); beep(120, 1.2, .04, .4);
  let segIdx = 0, lineIdx = 0;

  // 一次性补齐剩余文本
  function dumpRest() {
    for (let s = segIdx; s < segs.length; s++) {
      const seg = WR_SEGMENTS[s];
      for (let l = (s === segIdx ? lineIdx : 0); l < seg.length; l++) {
        const line = seg[l];
        const div = document.createElement("div");
        div.className = line === "" ? "wr-pause" : "wr-line";
        div.textContent = line;
        box.appendChild(div);
      }
    }
    segIdx = WR_SEGMENTS.length; lineIdx = 0;
  }
  function finish() {
    if (_wrDone) return;
    _wrDone = true;
    $("#wr-choices").classList.remove("hidden");
    if (sk) sk.style.display = "none";
    beep(660, .3, .05); beep(880, .4, .04, .2);
  }
  function nextSegment() {
    if (_wrSkip) { dumpRest(); finish(); return; }
    if (segIdx >= segs.length) {
      setTimeout(finish, 1200);
      return;
    }
    lineIdx = 0;
    nextLine();
  }
  function nextLine() {
    if (_wrSkip) { dumpRest(); finish(); return; }
    const seg = segs[segIdx];
    if (lineIdx >= seg.length) {
      segIdx++;
      setTimeout(nextSegment, 2000);
      return;
    }
    const line = seg[lineIdx];
    const div = document.createElement("div");
    div.className = line === "" ? "wr-pause" : "wr-line";
    div.textContent = line;
    box.appendChild(div);
    beep(1000, .02, .008);
    lineIdx++;
    setTimeout(nextLine, line === "" ? 600 : (line.length > 30 ? 80 : 40));
  }
  nextSegment();
}

function showEnding(branch) {
  const E = {
    A: {
      tag: "结局 A · 归档者",
      title: "归档者",
      body: `<p>你把档案放回原位。</p>
        <p>屏幕上弹出一行字：<b>账号状态：稳定。</b></p>
        <p>你继续在神秘学协会工作。你继续处理委托。你继续记录现象。</p>
        <p>你成为了协会最优秀的调查员。</p>
        <p>但每个深夜，当你独自坐在档案室时，你会听到一个很轻的声音。</p>
        <p>那个声音在念一个编号：<b>07</b>。</p>
        <p>那是 07 号。</p>
        <p>那是唯一一个还在等你的「同类」。</p>`,
      quote: "「你选择了留下。但你留下的地方，是所有被送走的人共同的家。」"
    },
    B: {
      tag: "结局 B · 泄密者",
      title: "泄密者",
      body: `<p>你把真相发到暗涌论坛。</p>
        <p>帖子存活了 <b>23 分钟</b>。</p>
        <p>但 23 分钟内，有 <b>1,244 个人</b>看到了它。</p>
        <p>有 1,244 个家庭转发给了他们认识的亲戚朋友。</p>
        <p>有 1,244 个名字被重新念了出来。</p>
        <p>那一夜，东里市四百万人口里，有 <b>1,244 盏灯</b>没有熄灭。</p>
        <p>第二天凌晨，你的账号被注销。</p>
        <p>但暗涌论坛上，一个新的置顶帖出现了。发帖人叫水底针：</p>
        <p style="font-family:var(--font-serif);border-left:3px solid var(--red);padding-left:12px">「07 号，我记住了。」</p>`,
      quote: "「你把自己烧掉了。但火光里，他们看见了彼此。」"
    },
    C: {
      tag: "结局 C · 消失者",
      title: "消失者",
      body: `<p>你按下删除键。</p>
        <p>白色的房间变暗。</p>
        <p>桌子消失。</p>
        <p>电脑熄灭。</p>
        <p>屏幕的最后一行日志：</p>
        <p class="aw-mono">账号 wenyan 已注销。<br>意识碎片已释放。<br>1,244 段意识回归档案夹层。</p>
        <p>三个月后，东里市的一家旧书店里，一个女孩翻到一本 1987 年的地方志。</p>
        <p>书页间夹着一张纸条，笔迹和温言的一模一样。</p>
        <p>纸条上写着：</p>
        <p style="font-family:var(--font-serif);font-size:16px;color:var(--red);letter-spacing:3px;text-align:center;margin:20px 0">「07 号。他还活着。」</p>
        <p>女孩抬起头。她不知道这张纸条是谁写的。</p>
        <p>但她记住了。</p>`,
      quote: "「你把自己拆开，还给了他们。现在，他们替你活着。」"
    },
    D: {
      tag: "结局 D · 追问者（隐藏结局）",
      title: "追问者",
      body: `<p>你什么也没选。</p>
        <p>你走出白色房间，回到档案馆。</p>
        <p>你打开协会数据库中那个从未被访问过的目录：<b>/internal/echo/archive/wenyan/</b></p>
        <p>文件大小：0 KB。</p>
        <p>你把手指放在键盘上，敲下了四个字：</p>
        <p style="font-family:var(--font-serif);font-size:18px;color:var(--red);letter-spacing:6px;text-align:center;margin:20px 0">「我是谁？」</p>
        <p>系统没有回复。</p>
        <p>但屏幕右下角，出现了一行你从未见过的日志：</p>
        <p class="aw-mono">[2067-03-16 03:33] 07 号已上线。</p>
        <p>你盯着这行字看了很久。</p>
        <p>然后你听见了身后传来的脚步声。</p>
        <p>你回过头。</p>
        <p>门口站着一个少年。他和你一样年轻，一样疲惫。</p>
        <p>他开口说的第一句话是：</p>
        <p style="font-family:var(--font-serif);font-size:16px;color:var(--ink);letter-spacing:3px;text-align:center;margin:20px 0">「你是第一个活过来的。我是 07 号。」</p>
        <p>——《星都双子2 · 双生之影》，正式开始。</p>`,
      quote: "「你不是温言。你是温言之后，第一个睁开眼睛的人。」"
    },
  }[branch];
  S.flags.game_over = true;
  $("#ending-tag").textContent = E.tag;
  $("#ending-title").textContent = E.title;
  $("#ending-body").innerHTML = E.body;
  $("#ending-quote").textContent = E.quote;
  $("#ending-screen").classList.remove("hidden");
  beep(440, .5, .05); beep(330, .8, .04, .3);
  // 结局后不自动显示作者寄语
}

/* 作者寄语：本期暂不开放。
   恢复方式：把 index.html 结局页的置灰按钮改回
   <button class="btn btn-lg" data-action="show-afterword" style="margin-top:10px">📖 作者寄语</button>
   即可，本函数无需改动。 */
function showAfterword() {
  $("#aw-body").innerHTML = `
    <p>感谢你扮演温言，走完这九个委托。</p>
    <p>这是我第一次做外传。写它的时候，我一直在想一件事：<b>那些记录现象的人，自己会不会成为现象？</b></p>
    <p>《星都异闻录》看起来是一份一份独立的委托，但它们是同一面镜子，从九个角度照出来的同一个影子。</p>
    <p>你看到的每一份档案，都指向 2066 年 10 月。</p>
    <p>你打开的每一个文件，都在问同一个问题：<b>那些被记录的人，后来怎么样了？</b></p>
    <p>这个问题，主线的沈砚也在问。第二部的他，也会继续问下去。</p>
    <p>如果你还没玩过《代号：双子》，去走一遍。如果你玩过，那你会知道，温言最后删掉的那些档案，正是沈砚拼死想保住的东西。</p>
    <p>谢谢你的耐心。</p>
    <p>谢谢你把每一份委托都读完了。</p>
    <div class="aw-mono">—— 写于东里市 2067<br>（一个第一次做外传的人）</div>
    <p style="font-size:12px;color:var(--ink-dim);margin-top:16px">本作内容纯属虚构 · 部分素材由 AI 生成 · 感谢所有开源社区与文档撰写者</p>`;
  $("#afterword-screen").classList.remove("hidden");
  beep(660, .3, .05); beep(880, .35, .04, .2);
}

/* ================================================================
   事件分发
   ================================================================ */
document.addEventListener("click", (e) => {
  const t = e.target.closest("[data-action]");
  if (!t) return;
  const act = t.dataset.action, arg = t.dataset.arg;
  const R = {
    "start-game": () => {
      S.difficulty = arg === "normal" ? "normal" : "easy";
      $("#intro-screen").classList.add("hidden");
      $("#questionnaire-screen").classList.remove("hidden");
    },
    "q5-select": () => {
      document.querySelectorAll(".q-choice-btn").forEach(b => b.classList.remove("selected"));
      const btn = document.querySelector(`[data-arg="${arg}"]`);
      if (btn) btn.classList.add("selected");
      $("#q5-input").value = arg;
      $("#q-error").classList.add("hidden");
      beep(700, .05, .04);
    },
    "submit-questionnaire": () => {
      const v = ($("#q5-input").value || "").trim();
      if (!v) {
        $("#q-error").textContent = "请选择第5题的答案。";
        $("#q-error").classList.remove("hidden");
        beep(220, .15, .06);
        return;
      }
      $("#q-error").classList.add("hidden");
      $("#questionnaire-screen").classList.add("hidden");
      // 委托 01 前：新人教程（可跳过）
      tuStep = 0;
      $("#tutorial-screen").classList.remove("hidden");
      renderTutorial();
    },
    "tutorial-next": () => {
      tuStep = parseInt(arg, 10) || 0;
      if (tuStep >= TUTORIAL_STEPS.length - 1) { finishTutorial(); return; }
      tuStep++;
      renderTutorial();
    },
    "tutorial-skip": () => finishTutorial(),
    "select-case": () => selectCase(parseInt(arg, 10)),
    "select-class": () => {
      const c = CASES[S.activeCase];
      S.classifier[c.id] = arg;
      renderWork();
      beep(700, .05, .04);
    },
    "submit-case": () => submitCase(),
    "enter-server": () => {
      const hs = document.getElementById("hacked-screen");
      if (hs) hs.remove();
      $("#desk-screen").classList.remove("hidden");
      S.serverStep = 0;
      const fi = caseIdx(FINALE_ID);
      S.activeCase = fi;
      renderAll();
      selectCase(fi);
    },
    "send-report": () => {
      $("#work-content").innerHTML = '<div class="case-detail" style="text-align:center;padding:80px 0"><div style="font-family:var(--font-serif);font-size:20px;letter-spacing:4px;color:var(--ink);margin-bottom:10px">审计报告已发送</div><div style="font-size:13px;color:var(--ink-dim);font-family:var(--font-mono)">正在归档……</div></div>';
      beep(440, .4, .05);
      setTimeout(() => showWhiteRoom(), 1800);
    },
    "do-search": () => doSearch(),
    "wr-skip": () => { _wrSkip = true; },
    "wr-choice": () => {
      $("#whiteroom-screen").classList.add("hidden");
      showEnding(arg);
    },
    "restart": () => location.reload(),
    "fast-forward": () => {
      $("#ending-screen").classList.add("hidden");
      $("#desk-screen").classList.add("hidden");
      showWhiteRoom();
    },
  };
  if (R[act]) { e.stopPropagation(); R[act](); }
});

document.addEventListener("keydown", (e) => {
  if (e.key !== "Enter") return;
  const t = e.target;
  if (!t) return;
  if (t.id === "search-input") doSearch();
});

/* ================================================================
   启动
   ================================================================ */
(function boot() {
  // 开局直接显示入职界面
  renderHUD();
})();