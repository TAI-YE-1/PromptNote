import { chatGptAdapter } from '../adapters/chatgpt'
import { genericWebAdapter } from '../adapters/generic'
import { insertIntoEditable, startEditableTracking } from '../adapters/editable'
import type { WebPromptAdapter } from '../adapters/types'
import type { ContentRequest, ContentResponse } from './messages'

const adapters: WebPromptAdapter[] = [chatGptAdapter, genericWebAdapter]

startEditableTracking()
chrome.runtime.onMessage.addListener(handleMessage)

function handleMessage(
  request: ContentRequest,
  _sender: chrome.runtime.MessageSender,
  sendResponse: (response: ContentResponse) => void,
): false {
  try {
    if (request.type === 'PROMPTNOTE_BRIDGE_PING') {
      sendResponse({ ok: true, bridge: true })
      return false
    }

    if (request.type !== 'PROMPTNOTE_INSERT_AT_CARET') {
      sendResponse({ ok: false, error: '未知 Content Script 请求。' })
      return false
    }

    const adapter = currentAdapter()
    if (!adapter) {
      sendResponse({ ok: false, error: '当前网页不支持文本插入。' })
      return false
    }

    const composer = adapter.findComposer()
    if (!composer) {
      sendResponse({
        ok: false,
        error: '未找到当前编辑位置。请先点击网页中的文本输入框，再点“插入”。',
      })
      return false
    }

    const placement = insertIntoEditable(composer, request.text)
    sendResponse({ ok: true, placement })
  } catch (error) {
    sendResponse({ ok: false, error: error instanceof Error ? error.message : '插入失败。' })
  }
  return false
}

function currentAdapter(): WebPromptAdapter | null {
  const url = new URL(window.location.href)
  return adapters.find((adapter) => adapter.canHandle(url)) ?? null
}
