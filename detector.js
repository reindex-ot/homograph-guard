const CONFUSABLE_MAP = {
  '\u0430': { latin: 'a', script: 'キリル文字' }, 
  '\u0410': { latin: 'A', script: 'キリル文字' },
  '\u0441': { latin: 'c', script: 'キリル文字' }, 
  '\u0421': { latin: 'C', script: 'キリル文字' },
  '\u0435': { latin: 'e', script: 'キリル文字' }, 
  '\u0415': { latin: 'E', script: 'キリル文字' },
  '\u043E': { latin: 'o', script: 'キリル文字' }, 
  '\u041E': { latin: 'O', script: 'キリル文字' },
  '\u0440': { latin: 'p', script: 'キリル文字' }, 
  '\u0420': { latin: 'P', script: 'キリル文字' },
  '\u0455': { latin: 's', script: 'キリル文字' }, 
  '\u0405': { latin: 'S', script: 'キリル文字' },
  '\u0445': { latin: 'x', script: 'キリル文字' }, 
  '\u0425': { latin: 'X', script: 'キリル文字' },
  '\u0443': { latin: 'y', script: 'キリル文字' }, 
  '\u0423': { latin: 'Y', script: 'キリル文字' },
  '\u0456': { latin: 'i', script: 'キリル文字' }, 
  '\u0406': { latin: 'I', script: 'キリル文字' },
  '\u0458': { latin: 'j', script: 'キリル文字' }, 
  '\u0408': { latin: 'J', script: 'キリル文字' },
  '\u0501': { latin: 'd', script: 'キリル文字' },
  '\u051B': { latin: 'q', script: 'キリル文字' }, 
  '\u051D': { latin: 'w', script: 'キリル文字' },
  '\u03BF': { latin: 'o', script: 'ギリシャ文字' }, 
  '\u039F': { latin: 'O', script: 'ギリシャ文字' },
  '\u03C1': { latin: 'p', script: 'ギリシャ文字' }, 
  '\u03BD': { latin: 'v', script: 'ギリシャ文字' },
  '\u03B1': { latin: 'a', script: 'ギリシャ文字' },
  '\u03B5': { latin: 'e', script: 'ギリシャ文字' },
  '\u03B9': { latin: 'i', script: 'ギリシャ文字' },
  '\u03BA': { latin: 'k', script: 'ギリシャ文字' } 
};

function detectHomograph(rawHostname) {
  if (!rawHostname) return { suspicious: false };

  const hostname = rawHostname.split(':')[0].toLowerCase();

  if (hostname.includes('xn--')) {
    return {
      suspicious: true,
      type: 'punycode',
      reason: 'Punycode (国際化ドメイン名) が含まれています。ブラウザ上で偽装されている可能性があります。',
      details: `検出ドメイン: ${hostname}`,
      hostname: hostname
    };
  }

  const labels = hostname.split('.');
  const detectedChars = [];
  let hasLatin = false;
  let hasNonLatinConfusable = false;

  for (const char of hostname) {
    if (/[a-z0-9\-]/.test(char)) {
      hasLatin = true;
    } else if (CONFUSABLE_MAP[char]) {
      hasNonLatinConfusable = true;
      detectedChars.push({
        char: char,
        code: `U+${char.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')}`,
        looksLike: CONFUSABLE_MAP[char].latin,
        script: CONFUSABLE_MAP[char].script
      });
    } else if (/[\u0400-\u04FF\u0370-\u03FF]/.test(char)) {

      hasNonLatinConfusable = true;
      detectedChars.push({
        char: char,
        code: `U+${char.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')}`,
        looksLike: '?',
        script: /[\u0400-\u04FF]/.test(char) ? 'キリル文字' : 'ギリシャ文字'
      });
    }
  }

  if (hasNonLatinConfusable) {
    const charSummary = detectedChars.map(c => `'${c.char}' (${c.code}, 見かけ: '${c.looksLike}', ${c.script})`).join(', ');
    return {
      suspicious: true,
      type: 'confusable_char',
      reason: '英字 (ラテン文字) に酷似したキリル文字やギリシャ文字が使用されています。',
      details: `偽装疑い文字: ${charSummary}`,
      detectedChars: detectedChars,
      hostname: hostname
    };
  }

  return { suspicious: false };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { detectHomograph, CONFUSABLE_MAP };
}
