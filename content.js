(() => {

  let toastContainer = null;
  function getToastContainer() {
    if (!toastContainer || !document.contains(toastContainer)) {
      toastContainer = document.createElement('div');
      toastContainer.className = 'hg-toast-container';
      document.body.appendChild(toastContainer);
    }
    return toastContainer;
  }

  function showToast(title, message, duration = 5000) {
    const container = getToastContainer();
    const toast = document.createElement('div');
    toast.className = 'hg-toast';
    toast.innerHTML = `
      <div class="hg-toast-title">⚠️ ${title}</div>
      <div>${message}</div>
    `;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.transition = 'opacity 0.3s, transform 0.3s';
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  function checkTextForHomograph(text) {
    if (!text || typeof text !== 'string') return null;

    const urlPattern = /(https?:\/\/[^\s/$.?#].[^\s]*|[a-zA-Z0-9\u0400-\u04FF\u0370-\u03FF-]+\.[a-zA-Z0-9\u0400-\u04FF\u0370-\u03FF.-]+)/g;
    const matches = text.match(urlPattern);
    if (!matches) return null;

    for (const match of matches) {
      try {
        let hostname = match;
        if (match.startsWith('http://') || match.startsWith('https://')) {
          hostname = new URL(match).hostname;
        } else {
          hostname = match.split('/')[0].split(':')[0];
        }
        const result = detectHomograph(hostname);
        if (result.suspicious) {
          return { match, result };
        }
      } catch (e) {

      }
    }
    return null;
  }

  function inspectLink(link) {
    if (!link.href || link.dataset.hgChecked === 'true') return;
    link.dataset.hgChecked = 'true';

    try {
      const url = new URL(link.href, window.location.origin);

      if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

      const check = detectHomograph(url.hostname);
      if (check.suspicious) {
        link.classList.add('hg-suspicious-link');
        link.title = `[ホモグラフ攻撃の疑い] ${check.reason}\n実際のドメイン: ${check.hostname}`;

        const badge = document.createElement('span');
        badge.className = 'hg-warning-badge';
        badge.textContent = '⚠️偽装されたURL';
        link.appendChild(badge);
      }
    } catch (e) {

    }
  }

  function scanAllLinks() {
    const links = document.querySelectorAll('a[href]');
    links.forEach(inspectLink);
  }

  scanAllLinks();

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          if (node.tagName === 'A') {
            inspectLink(node);
          } else if (node.querySelectorAll) {
            node.querySelectorAll('a[href]').forEach(inspectLink);
          }
        }
      });
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  document.addEventListener('click', (event) => {
    const link = event.target.closest('a');
    if (!link || !link.href) return;

    try {
      const url = new URL(link.href, window.location.origin);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

      const check = detectHomograph(url.hostname);
      if (check.suspicious) {

        event.preventDefault();
        event.stopPropagation();

        showWarningModal(url.href, check, link.target);
      }
    } catch (e) {

    }
  }, true);

  function showWarningModal(targetUrl, check, targetAttr) {

    const existing = document.querySelector('.hg-modal-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'hg-modal-overlay';
    overlay.innerHTML = `
      <div class="hg-modal-box">
        <div class="hg-modal-header">
          <span class="hg-modal-icon">🚨</span>
          <h2 class="hg-modal-title">ホモグラフ攻撃の疑いがあるリンクです</h2>
        </div>
        <p class="hg-modal-desc">
          クリックしたリンクのドメイン名に、英数字に酷似したキリル文字などの異種文字またはPunycodeが含まれています。有名な企業や正規サービスを装ったフィッシングサイトの可能性があります。
        </p>
        <div class="hg-modal-detail-box">
          <div><strong>見かけのURL:</strong></div>
          <div class="hg-modal-url-display">${escapeHtml(targetUrl)}</div>
          <div><strong>警告理由:</strong> ${escapeHtml(check.reason)}</div>
          <div style="margin-top:4px; font-size:12px; color:#666;">${escapeHtml(check.details || '')}</div>
        </div>
        <div class="hg-modal-actions">
          <button class="hg-btn hg-btn-danger" id="hg-btn-proceed">リスクを承知で移動</button>
          <button class="hg-btn hg-btn-safe" id="hg-btn-cancel">戻る (推奨)</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector('#hg-btn-cancel').addEventListener('click', () => {
      overlay.remove();
    });

    overlay.querySelector('#hg-btn-proceed').addEventListener('click', () => {
      overlay.remove();

      if (targetAttr === '_blank') {
        window.open(targetUrl, '_blank', 'noopener,noreferrer');
      } else {
        window.location.href = targetUrl;
      }
    });
  }

  function escapeHtml(str) {
    return str.replace(/[&<>'"]/g, 
      tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
  }

  document.addEventListener('copy', () => {
    const selection = window.getSelection().toString();
    const detected = checkTextForHomograph(selection);
    if (detected) {
      showToast(
        '偽装されたURLのコピーを検知しました',
        `コピーしたテキスト内に、ホモグラフ攻撃の疑いがあるURLが含まれています。<br><strong>${escapeHtml(detected.match)}</strong>`
      );
    }
  });

  document.addEventListener('paste', (event) => {
    const pastedText = (event.clipboardData || window.clipboardData)?.getData('text');
    const detected = checkTextForHomograph(pastedText);
    if (detected) {
      showToast(
        '偽装されたURLの貼り付けを検知しました',
        `貼り付けられたテキスト内に、紛らわしい文字が含まれるURLが検出されました。<br><strong>${escapeHtml(detected.match)}</strong>`
      );
    }
  });

})();
