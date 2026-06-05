import { useState, useCallback, useRef } from 'react';
import type { Tab, TabState, TabManagerActions } from '../types/tab';

export function useTabManager(initialTabs: Tab[] = []): TabState & TabManagerActions {
  const tabIdCounterRef = useRef(0);

  const generateTabId = useCallback((): string => {
    tabIdCounterRef.current += 1;
    return `tab-${tabIdCounterRef.current}`;
  }, []);

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
    const id = generateTabId();

    setTabs((prev) => {
      // Calculate title inside functional update to avoid duplicates
      let finalTitle: string;
      if (title) {
        finalTitle = title;
      } else {
        const existingNumbers = new Set<number>();
        prev.forEach((tab) => {
          const match = tab.title.match(/^Terminal (\d+)$/);
          if (match) existingNumbers.add(parseInt(match[1], 10));
        });
        let num = 1;
        while (existingNumbers.has(num)) num++;
        finalTitle = `Terminal ${num}`;
      }

      const newTab: Tab = {
        id,
        title: finalTitle,
        createdAt: new Date(),
      };

      const newMap = new Map(prev);
      newMap.set(newTab.id, newTab);
      return newMap;
    });
    setActiveTabId(id);
    return id;
  }, [generateTabId]);

  const removeTab = useCallback((id: string): void => {
    setTabs((prev) => {
      const newMap = new Map(prev);
      newMap.delete(id);

      // Also update activeTabId based on the latest tabs
      setActiveTabId((prevActiveId) => {
        if (prevActiveId === id) {
          const remainingIds = Array.from(newMap.keys());
          return remainingIds[remainingIds.length - 1] || null;
        }
        return prevActiveId;
      });

      return newMap;
    });
  }, []);

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
