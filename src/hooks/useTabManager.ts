import { useState, useCallback } from 'react';
import type { Tab, TabState, TabManagerActions } from '../types/tab';

let tabIdCounter = 0;

function generateTabId(): string {
  return `tab-${++tabIdCounter}`;
}

export function useTabManager(initialTabs: Tab[] = []): TabState & TabManagerActions {
  const [tabs, setTabs] = useState<Map<string, Tab>>(() => {
    const map = new Map<string, Tab>();
    if (initialTabs.length === 0) {
      // Create a default tab
      const defaultTab: Tab = {
        id: generateTabId(),
        title: 'Terminal',
        createdAt: new Date(),
      };
      map.set(defaultTab.id, defaultTab);
    } else {
      initialTabs.forEach((tab) => map.set(tab.id, tab));
    }
    return map;
  });

  const [activeTabId, setActiveTabId] = useState<string | null>(() => {
    if (initialTabs.length > 0) {
      return initialTabs[0].id;
    }
    // Return the default tab's id
    const ids = Array.from(tabs.keys());
    return ids[0] || null;
  });

  const addTab = useCallback((title?: string): string => {
    const newTab: Tab = {
      id: generateTabId(),
      title: title || `Terminal ${tabs.size + 1}`,
      createdAt: new Date(),
    };
    setTabs((prev) => {
      const newMap = new Map(prev);
      newMap.set(newTab.id, newTab);
      return newMap;
    });
    setActiveTabId(newTab.id);
    return newTab.id;
  }, [tabs.size]);

  const removeTab = useCallback((id: string): void => {
    setTabs((prev) => {
      const newMap = new Map(prev);
      newMap.delete(id);
      return newMap;
    });
    setActiveTabId((prevActiveId) => {
      if (prevActiveId === id) {
        // Switch to another tab
        const remainingIds = Array.from(tabs.keys()).filter((tid) => tid !== id);
        return remainingIds[remainingIds.length - 1] || null;
      }
      return prevActiveId;
    });
  }, [tabs]);

  const switchTab = useCallback((id: string): void => {
    if (tabs.has(id)) {
      setActiveTabId(id);
    }
  }, [tabs]);

  const updateTab = useCallback((id: string, updates: Partial<Tab>): void => {
    setTabs((prev) => {
      const tab = prev.get(id);
      if (!tab) return prev;
      const newMap = new Map(prev);
      newMap.set(id, { ...tab, ...updates });
      return newMap;
    });
  }, []);

  const getActiveTab = useCallback((): Tab | null => {
    if (!activeTabId) return null;
    return tabs.get(activeTabId) || null;
  }, [activeTabId, tabs]);

  const getTab = useCallback((id: string): Tab | undefined => {
    return tabs.get(id);
  }, [tabs]);

  return {
    tabs,
    activeTabId,
    addTab,
    removeTab,
    switchTab,
    updateTab,
    getActiveTab,
    getTab,
  };
}
