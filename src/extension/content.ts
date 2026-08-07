import { chatGptAdapter } from '../adapters/chatgpt'
import type { WebPromptAdapter } from '../adapters/types'
import type { ContentRequest, ContentResponse } from './messages'

const adapters: WebPromptAdapter[] = [chatGptAdapter]

function currentAdapter(): WebPromptAdapter | null {
  const url = new URL(window.location.href)
  return adapters.find((adapter) => adapter.canHandle(url)) ?? null
}

chrome.runtime.onMessage.addListener((request: ContentRequest, _sender, sendResponse) => {
  const respond = (response: ContentResponse) => sendResponse(response)
  try {
    const adapter = currentAdapter()
    if (!adapter) {
      respond({ ok: false, error: '当前网页尚未支持 PromptNote 插入。' })
      return false
    }
    if (request.type === 'PROMPTNOTE_GET_COMPOSER_STATE') {
      respond({ ok: true, state: adapter.readComposer() })
      return false
    }
    if (request.type === 'PROMPTNOTE_INSERT') {
      adapter.insert(request.text, request.mode)
      respond({ ok: true })
      return false
    }
    respond({ ok: false, error: '未知 Content Script 请求。' })
  } catch (error) {
    respond({ ok: false, error: error instanceof Error ? error.message : '插入失败。' })
  }
  return false
})
