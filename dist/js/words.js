/**
 * TypeFlow — 词库数据
 * 内置多套词库：英文、中文、代码、数字，支持组合与自定义随机源。
 * 全部数据本地内置，无需任何网络请求。
 */
const WORDS = {
  english: [
    "the", "be", "to", "of", "and", "a", "in", "that", "have", "i",
    "it", "for", "not", "on", "with", "he", "as", "you", "do", "at",
    "this", "but", "his", "by", "from", "they", "we", "say", "her", "she",
    "or", "an", "will", "my", "one", "all", "would", "there", "their", "what",
    "so", "up", "out", "if", "about", "who", "get", "which", "go", "me",
    "when", "make", "can", "like", "time", "no", "just", "him", "know", "take",
    "people", "into", "year", "your", "good", "some", "could", "them", "see", "other",
    "than", "then", "now", "look", "only", "come", "its", "over", "think", "also",
    "back", "after", "use", "two", "how", "our", "work", "first", "well", "way",
    "even", "new", "want", "because", "any", "these", "give", "day", "most", "us",
    "light", "dark", "world", "house", "place", "water", "night", "dream", "cloud", "star",
    "river", "mountain", "forest", "ocean", "silence", "journey", "moment", "memory", "choice", "courage",
    "bright", "quiet", "gentle", "steady", "swift", "clear", "calm", "sharp", "warm", "fresh",
    "future", "simple", "clever", "power", "signal", "bridge", "canvas", "system", "engine", "logic",
    "create", "build", "design", "code", "craft", "shape", "spark", "bloom", "rise", "flow",
    "focus", "rhythm", "tempo", "pulse", "beat", "echo", "flame", "breeze", "tide", "dawn",
    "wonder", "question", "answer", "reason", "stream", "filter", "pattern", "vector", "matrix", "token",
    "grammar", "syntax", "semantic", "format", "render", "compile", "parse", "query", "cache", "index",
    "address", "balance", "channel", "client", "cluster", "context", "domain", "driver", "endpoint", "entity",
    "export", "extract", "gateway", "handler", "header", "instance", "interface", "kernel", "module", "payload",
    "plugin", "protocol", "registry", "schema", "search", "server", "socket", "thread", "timeout", "tokenize",
    "verify", "worker", "atomic", "binary", "coherent", "digital", "elegant", "fluent", "global", "hybrid",
    "modular", "optimize", "portable", "reliable", "robust", "scalable", "secure", "stable", "streamline", "transparent"
  ],
  chinese: [
    "时间", "梦想", "世界", "未来", "选择", "勇气", "坚持", "努力", "成长", "热爱",
    "生活", "希望", "温暖", "自由", "平静", "力量", "智慧", "温柔", "明亮", "清晰",
    "代码", "程序", "算法", "数据", "系统", "网络", "接口", "缓存", "搜索", "引擎",
    "设计", "体验", "创造", "思考", "创新", "探索", "发现", "学习", "专注", "流动",
    "河流", "山川", "森林", "海洋", "星空", "月光", "晨曦", "晚霞", "微风", "潮汐",
    "旅程", "瞬间", "记忆", "选择", "答案", "问题", "原因", "结果", "过程", "方向",
    "节奏", "旋律", "韵律", "脉搏", "回声", "火焰", "萌芽", "绽放", "崛起", "前行",
    "清晨", "午后", "黄昏", "深夜", "四季", "岁月", "时光", "永恒", "此刻", "远方",
    "简单", "优雅", "专注", "平衡", "沉淀", "觉醒", "突破", "超越", "蜕变", "绽放",
    "温暖", "治愈", "勇气", "信念", "梦想", "热爱", "初心", "使命", "价值", "意义",
    "软件开发", "前端", "后端", "全栈", "人工智能", "机器学习", "深度学习", "大数据", "云计算", "区块链",
    "开源", "共建", "协作", "创新", "效率", "性能", "优化", "调试", "测试", "部署",
    "安全", "加密", "认证", "授权", "日志", "监控", "告警", "恢复", "备份", "迁移",
    "自然", "善良", "真诚", "坚定", "从容", "坦荡", "清澈", "明亮", "辽阔", "深邃"
  ],
  code: [
    "function", "const", "let", "return", "import", "export", "async", "await", "class", "extends",
    "if", "else", "for", "while", "switch", "case", "break", "continue", "try", "catch",
    "throw", "new", "delete", "typeof", "instanceof", "this", "super", "null", "undefined", "true",
    "false", "void", "static", "get", "set", "of", "in", "yield", "debugger", "default",
    "loop", "array", "object", "string", "number", "boolean", "symbol", "bigint", "map", "set",
    "list", "queue", "stack", "heap", "tree", "graph", "node", "edge", "path", "depth",
    "fetch", "push", "pop", "shift", "unshift", "splice", "slice", "concat", "join", "split",
    "filter", "reduce", "map", "find", "some", "every", "sort", "reverse", "includes", "indexOf",
    "render", "mount", "update", "state", "props", "hook", "effect", "reducer", "context", "ref",
    "request", "response", "status", "header", "body", "method", "route", "handler", "middleware", "session",
    "connect", "listen", "close", "read", "write", "open", "create", "remove", "rename", "watch"
  ],
  numbers: null // 数字由程序动态生成
};

/** 数字词库：动态生成长度可配置的数字串 */
function generateNumbers(count, length) {
  const out = [];
  for (let i = 0; i < count; i++) {
    let s = "";
    for (let j = 0; j < length; j++) s += "0123456789"[Math.floor(Math.random() * 10)];
    out.push(s);
  }
  return out;
}

/** 根据配置生成一篇文章（单词序列） */
function generateWords(config) {
  const { language, punctuation, numbers, wordsCount } = config;
  const base = language === "numbers"
    ? generateNumbers(wordsCount, 4)
    : (WORDS[language] || WORDS.english);

  const list = [];
  for (let i = 0; i < wordsCount; i++) {
    let word = base[Math.floor(Math.random() * base.length)];
    if (punctuation && Math.random() < 0.12) {
      word += ".!?,"[Math.floor(Math.random() * 4)];
    }
    if (numbers && Math.random() < 0.1) {
      word += Math.floor(Math.random() * 100);
    }
    list.push(word);
  }
  return list;
}