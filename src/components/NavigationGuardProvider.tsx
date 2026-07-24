"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  type ReactNode,
} from "react";

interface NavigationGuardContextValue {
  register: (id: string, message: string) => () => void;
  confirmNavigation: () => boolean;
}

const NavigationGuardContext = createContext<NavigationGuardContextValue>({
  register: () => () => undefined,
  confirmNavigation: () => true,
});

export function useConfirmNavigation() {
  return useContext(NavigationGuardContext).confirmNavigation;
}

export function useNavigationGuard(active: boolean, message: string) {
  const id = useId();
  const { register } = useContext(NavigationGuardContext);

  useEffect(() => {
    if (!active) return;
    return register(id, message);
  }, [active, id, message, register]);
}

export default function NavigationGuardProvider({
  children,
}: {
  children: ReactNode;
}) {
  const guards = useRef(new Map<string, string>());

  const register = useCallback((id: string, message: string) => {
    guards.current.set(id, message);
    return () => {
      guards.current.delete(id);
    };
  }, []);

  const confirmNavigation = useCallback(() => {
    const message = guards.current.values().next().value as string | undefined;
    return !message || window.confirm(message);
  }, []);

  useEffect(() => {
    function onBeforeUnload(event: BeforeUnloadEvent) {
      if (guards.current.size === 0) return;
      event.preventDefault();
      event.returnValue = true;
    }

    function onDocumentClick(event: MouseEvent) {
      if (
        guards.current.size === 0 ||
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest<HTMLAnchorElement>("a[href]");
      if (
        !anchor ||
        anchor.hasAttribute("download") ||
        anchor.target === "_blank" ||
        anchor.dataset.bypassNavigationGuard === "true"
      ) {
        return;
      }

      const destination = new URL(anchor.href, window.location.href);
      if (
        destination.href === window.location.href ||
        (destination.pathname === window.location.pathname &&
          destination.search === window.location.search &&
          destination.hash)
      ) {
        return;
      }

      if (!confirmNavigation()) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    }

    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onDocumentClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onDocumentClick, true);
    };
  }, [confirmNavigation]);

  return (
    <NavigationGuardContext.Provider value={{ register, confirmNavigation }}>
      {children}
    </NavigationGuardContext.Provider>
  );
}
