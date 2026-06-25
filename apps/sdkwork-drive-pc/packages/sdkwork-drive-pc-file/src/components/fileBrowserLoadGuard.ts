export interface LatestRequestGuard {
  begin(scope?: string): number;
  setCurrentScope(scope: string): void;
  isCurrent(requestId: number, scope?: string): boolean;
  isCurrentScope(scope: string): boolean;
}

export function createLatestRequestGuard(): LatestRequestGuard {
  let currentRequestId = 0;
  let currentScope: string | undefined;

  return {
    begin(scope) {
      currentRequestId += 1;
      if (scope !== undefined) {
        currentScope = scope;
      }
      return currentRequestId;
    },
    setCurrentScope(scope) {
      currentScope = scope;
    },
    isCurrent(requestId, scope) {
      return requestId === currentRequestId && (scope === undefined || scope === currentScope);
    },
    isCurrentScope(scope) {
      return scope === currentScope;
    },
  };
}
