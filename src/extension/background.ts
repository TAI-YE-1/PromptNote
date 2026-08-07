import type { ContentRequest, ContentResponse } from './messages'

chrome.action.onClicked.addListener((tab) => {
  if (!tab.id) return
  void openPromptNote(tab.id, tab.url)
})

async function openPromptNote(tabId: number, url?: string): Promise<void> {
  if (isWebPage(url)) await ensurePageBridge(tabId)
  await chrome.sidePanel.open({ tabId })
}

async function ensurePageBridge(tabId: number): Promise<void> {
  const ping: ContentRequest = { type: 'PROMPTNOTE_BRIDGE_PING' }

  try {
    const response = (await chrome.tabs.sendMessage(tabId, ping)) as ContentResponse
    if (response.ok && 'bridge' in response && response.bridge) return
  } catch {
    // Missing/stale receiver: inject the current bridge below.
  }

  try {
    await chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] })
  } catch (error) {
    console.debug('PromptNote page bridge prewarm skipped:', error)
  }
}

function isWebPage(url?: string): boolean {
  if (!url) return false
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}
