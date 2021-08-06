var dictionary = {
  "å": "a",
  "ċ": "ch",
  "ɕ": "ch",
  "x": "kh",
  "ȡ": "d",
  "ځ": "z",
  "ɬ": "r",
  "ġ": "gh",
  "ĥ": "h",
  "ŝ": "sh",
  "ʂ": "s",
  "ș": "s",
  "š": "s",
  "ţ": "t",
  "ȶ": "t",
  "ʐ": "z",
  "ƶ": "z",
  "ż": "z",
  "ž": "z",
  "ʑ": "z",
  "'": "",
  "^": ""
}

var keyString = Object.keys(dictionary).join(",");

dataset.forEach(item => {
  item.latin = item.lexeme
    .replace(new RegExp(`[${keyString}]`, "gi"), m => dictionary[m]);
});