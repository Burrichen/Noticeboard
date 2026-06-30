export const DEFAULT_SETTINGS = {
  mode: "manual",
  kurovianFlavour: false,
  interfaceMode: "cli"
};

export const appState = {
  data: null,
  settings: { ...DEFAULT_SETTINGS },
  stage: "home",
  board: newBoard(),
  activeChoice: null,
  selectedChoiceIndex: 0,
  typedNumber: "",
  typedNumberTimer: null,
  exportMessage: null
};

export function newBoard() {
  return {
    quality: null,
    size: null,
    noticeCount: null,
    currentNoticeNumber: 1,
    notices: [],
    pendingNotice: null,
    pendingLegitimate: null,
    pendingIllegitimate: null
  };
}
