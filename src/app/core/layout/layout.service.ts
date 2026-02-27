import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class LayoutService {
  readonly isSidebarVisible = signal(false);
  readonly isSidebarCollapsed = signal(false);

  toggleSidebar(): void {
    this.isSidebarVisible.update((value) => !value);
  }

  hideSidebar(): void {
    this.isSidebarVisible.set(false);
  }

  toggleSidebarCollapse(): void {
    this.isSidebarCollapsed.update((value) => !value);
  }

  expandSidebar(): void {
    this.isSidebarCollapsed.set(false);
  }
}
