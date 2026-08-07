import type { ContentRequest, ContentResponse } from './messages'

chrome.action.onClicked.addListener((tab) => {
  if (!tab.id) return

  void chrome.sidePanel.open({ tabId: tab.id })
  if (isWebPage(tab.url)) void preparePageBridge(tab.id, tab.url)
})

async function preparePageBridge(tabId: number, url?: string): Promise<void> {
  const origin = permissionPattern(url)
  if (origin) {
    try {
      // The action click is an explicit user gesture. Request only this site's
      // optional host permission so future insertions do not depend on an
      // ephemeral activeTab grant.
      await chrome.permissions.request({ origins: [origin] })
    } catch (error) {
      // A denied optional permission still leaves the current action's
      // activeTab grant available, so keep the one-shot insertion path alive.
      console.debug('PromptNote site access not persisted:', error)
    }
  }

  await ensurePageBridge(tabId)
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

function permissionPattern(url?: string): string | null {
  if (!url) return null
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
    return `${parsed.origin}/*`
  } catch {
    return null
  }
}

function isWebPage(url?: string): boolean {
  return permissionPattern(url) !== null
}
