export const defaultWindow = /* #__PURE__ */ (globalThis as any)?.window as
  | Window
  | undefined;

export const defaultDocument = /* #__PURE__ */ (globalThis as any)?.document as
  | Document
  | undefined;

export const defaultNavigator = /* #__PURE__ */ (globalThis as any)
  ?.navigator as Navigator | undefined;

export const defaultLocation = /* #__PURE__ */ (globalThis as any)?.window
  ?.location as Location | undefined;
