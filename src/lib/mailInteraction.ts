export function shouldCaptureConversationPointer(pointerType: string): boolean {
  return pointerType !== "mouse";
}

export function nextConversationIndex(
  currentIndex: number,
  conversationCount: number,
  direction: 1 | -1,
): number {
  if (conversationCount <= 0) return -1;
  if (currentIndex < 0) {
    return direction === 1 ? 0 : conversationCount - 1;
  }
  return Math.max(
    0,
    Math.min(conversationCount - 1, currentIndex + direction),
  );
}
