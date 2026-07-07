import { Component, input } from '@angular/core';
import {
  RouterLink,
  RouterLinkActive,
} from '@angular/router';
import {
  LucideClock,
  LucideFolder,
  LucideHardDrive,
  LucideHome,
  LucideShare2,
  LucideStar,
  LucideTrash2,
  LucideUpload,
  LucideUser,
} from '@lucide/angular';

@Component({
  selector: 'app-sidebar',
  imports: [
    RouterLink,
    RouterLinkActive,
    LucideClock,
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
  // The dashboard owns the actual file input; the sidebar only points its label at that input.
  readonly uploadTargetId = input('dashboardFileUpload');
  readonly uploadText = input('อัปโหลดไฟล์');
  readonly uploadBusy = input(false);
  readonly showUpload = input(true);
}
