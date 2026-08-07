chrome.runtime.onInstalled.addListener(() => {
  void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
})

void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
