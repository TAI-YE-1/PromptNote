chrome.action.onClicked.addListener((tab) => {
  if (!tab.id) return

  void chrome.sidePanel.open({ tabId: tab.id })

  if (isWebPage(tab.url)) {
    void chrome.scripting
      .executeScript({ target: { tabId: tab.id }, files: ['content.js'] })
      .catch((error: unknown) => {
        console.debug('PromptNote page bridge prewarm skipped:', error)
      })
  }
})

function isWebPage(url?: string): boolean {
  if (!url) return false
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}
