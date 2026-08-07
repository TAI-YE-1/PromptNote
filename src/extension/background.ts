chrome.action.onClicked.addListener((tab) => {
  if (!tab.id) return
  void chrome.sidePanel.open({ tabId: tab.id })
})
