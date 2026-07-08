import {
  afterNextRender,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import {
  RouterLink,
  RouterLinkActive,
} from '@angular/router';
import {
  LucideClock,
  LucideCrown,
  LucideFolder,
  LucideHardDrive,
  LucideHome,
  LucideShare2,
  LucideStar,
  LucideTrash2,
  LucideUpload,
  LucideUser,
} from '@lucide/angular';

import { PlanService } from '../../../core/services/plan.service';

@Component({
  selector: 'app-sidebar',
  imports: [
    RouterLink,
    RouterLinkActive,
    LucideClock,
    LucideCrown,
    LucideFolder,
    LucideHardDrive,
    LucideHome,
    LucideShare2,
    LucideStar,
    LucideTrash2,
    LucideUpload,
    LucideUser,
  ],
  templateUrl: './app-sidebar.html',
})
export class AppSidebar {
  private readonly planService = inject(PlanService);

  // The page owns the actual file input; the sidebar only points its label at that input.
  readonly uploadTargetId = input('dashboardFileUpload');
  readonly uploadText = input('อัปโหลดไฟล์');
  readonly uploadBusy = input(false);
  readonly showUpload = input(true);
  readonly storagePlan = this.planService.currentStoragePlan;
  readonly storageUsagePercent = computed(() => {
    const percent = this.storagePlan()?.storageUsagePercent ?? 0;

    return Math.min(100, Math.max(0, Math.round(percent)));
  });

  constructor() {
    afterNextRender(() => {
      if (!this.storagePlan()) {
        this.planService.currentPlan().subscribe({
          error: () => this.planService.currentStoragePlan.set(null),
        });
      }
    });
  }

  formatFileSize(sizeBytes: number): string {
    if (!Number.isFinite(sizeBytes) || sizeBytes < 1024) {
      return `${Math.max(0, Math.round(sizeBytes || 0))} B`;
    }

    const units = ['KB', 'MB', 'GB', 'TB'];
    let size = sizeBytes / 1024;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex += 1;
    }

    return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[unitIndex]}`;
  }
}
