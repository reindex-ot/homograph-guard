(() => {
  const params = new URLSearchParams(window.location.search);
  const targetUrl = params.get('url') || '不明なURL';
  const reason = params.get('reason') || 'ホモグラフ攻撃の疑いがあります';
  const details = params.get('details') || '';

  document.getElementById('target-url').textContent = targetUrl;
  document.getElementById('target-reason').textContent = `判定理由: ${reason}`;
  if (details) {
    document.getElementById('target-details').textContent = details;
  }

  document.getElementById('btn-back').addEventListener('click', () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.close();
    }
  });

  document.getElementById('btn-bypass').addEventListener('click', async () => {
    if (confirm('警告: 偽装されたサイトの場合、パスワードや個人情報が窃取される恐れがあります。本当に開きますか？')) {
      chrome.runtime.sendMessage({ action: 'bypassUrl', url: targetUrl }, () => {
        window.location.href = targetUrl;
      });
    }
  });
})();
