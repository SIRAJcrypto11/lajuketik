(function (root) {
  function classifyKey(key) {
    if (key === " ") return "space";
    if (key.length === 1) return "character";
    if (key === "Backspace") return "backspace";
    return "ignore";
  }

  root.LajuKetikInput = { classifyKey };
})(typeof window === "undefined" ? globalThis : window);
