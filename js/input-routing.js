(function (root) {
  function classifyKey(key) {
    if (key === " ") return "space";
    if (key.length === 1) return "character";
    if (key === "Backspace") return "backspace";
    return "ignore";
  }

  function shouldStartFromTab(key, isBoardTarget, running) {
    return key === "Tab" && !running && isBoardTarget;
  }

  function recordSkippedCharacters(typedWord, wordLength, keyEvents, now) {
    let added = 0;
    while (typedWord.chars.length < wordLength) {
      typedWord.chars.push({ c: "", wrong: true });
      typedWord.errors++;
      keyEvents.push({ t: now(), correct: false, skipped: true });
      added++;
    }
    return added;
  }

  function shouldFinishWordsMode(mode, currentWord, wordCount, typedLength, wordLength) {
    return mode === "words" && currentWord === wordCount - 1 && typedLength >= wordLength;
  }

  root.LajuKetikInput = {
    classifyKey,
    shouldStartFromTab,
    recordSkippedCharacters,
    shouldFinishWordsMode
  };
})(typeof window === "undefined" ? globalThis : window);
