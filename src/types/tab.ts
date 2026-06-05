export interface Tab {
  id: string;
  title: string;
  connectionId?: string;
  createdAt: Date;
}

export interface TabState {
  tabs: Map<string, Tab>;
  activeTabId: string | null;
}

export interface TabManagerActions {
  addTab: (title?: string) => string;
  removeTab: (id: string) => void;
  switchTab: (id: string) => void;
  updateTab: (id: string, updates: Partial<Tab>) => void;
  getActiveTab: () => Tab | null;
  getTab: (id: string) => Tab | undefined;
}
