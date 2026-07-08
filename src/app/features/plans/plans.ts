import { HttpErrorResponse } from '@angular/common/http';
import { NgClass } from '@angular/common';
import {
  afterNextRender,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  LucideCheck,
  LucideCrown,
  LucideHardDrive,
  LucideLoaderCircle,
  LucideRefreshCw,
  LucideSparkles,
  LucideZap,
} from '@lucide/angular';
import { catchError, finalize, forkJoin, of } from 'rxjs';

import {
  BillingCycle,
  Plan,
  PlanService,
  UserStoragePlan,
} from '../../core/services/plan.service';
import { AppHeader } from '../../shared/components/app-header/app-header';
import { AppSidebar } from '../../shared/components/app-sidebar/app-sidebar';

@Component({
  selector: 'app-plans',
  imports: [
    AppHeader,
    AppSidebar,
    NgClass,
    LucideCheck,
    LucideCrown,
    LucideHardDrive,
    LucideLoaderCircle,
    LucideRefreshCw,
    LucideSparkles,
    LucideZap,
  ],
  templateUrl: './plans.html',
  styleUrl: './plans.scss',
})
export class Plans {
  private readonly planService = inject(PlanService);

  readonly plans = signal<Plan[]>([]);
  readonly currentPlan = signal<UserStoragePlan | null>(null);
  readonly loading = signal(false);
  readonly selectingPlanCode = signal<string | null>(null);
  readonly message = signal('');
  readonly errorMessage = signal('');

  readonly currentPlanCode = computed(() => this.currentPlan()?.userPlan.planCode ?? '');
  readonly usagePercent = computed(() => {
    const percent = this.currentPlan()?.storageUsagePercent ?? 0;

    return Math.min(100, Math.max(0, Math.round(percent)));
  });

  constructor() {
    afterNextRender(() => {
      window.setTimeout(() => this.loadPlans(), 0);
    });
  }

  loadPlans(): void {
    if (this.loading()) {
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    forkJoin({
      plans: this.planService.listPlans(),
      currentPlan: this.planService.currentPlan().pipe(catchError(() => of(null))),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ plans, currentPlan }) => {
          this.plans.set(plans);
          this.currentPlan.set(currentPlan);
        },
        error: () => {
          this.errorMessage.set('ไม่สามารถโหลดข้อมูลแพ็กเกจได้');
        },
      });
  }

  selectPlan(plan: Plan): void {
    if (this.selectingPlanCode() || this.isCurrentPlan(plan)) {
      return;
    }

    this.selectingPlanCode.set(plan.code);
    this.message.set('');
    this.errorMessage.set('');

    this.planService
      .selectPlan(plan.code, plan.billingCycle !== 'free')
      .pipe(finalize(() => this.selectingPlanCode.set(null)))
      .subscribe({
        next: (response) => {
          this.message.set(response.message || 'เปลี่ยนแพ็กเกจสำเร็จ');
          if (response.plan) {
            this.currentPlan.set(response.plan);
          } else {
            this.loadPlans();
          }
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(error.error?.message || 'ไม่สามารถเปลี่ยนแพ็กเกจได้');
        },
      });
  }

  isCurrentPlan(plan: Plan): boolean {
    return this.currentPlanCode() === plan.code;
  }

  formatBytes(bytes: number): string {
    if (!Number.isFinite(bytes) || bytes <= 0) {
      return '0 GB';
    }

    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let value = bytes;
    let unitIndex = 0;

    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex += 1;
    }

    return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
  }

  priceLabel(plan: Plan): string {
    if (plan.billingCycle === 'free') {
      return 'ฟรี';
    }

    const suffix = plan.billingCycle === 'yearly' ? '/ปี' : '/เดือน';

    return `฿${plan.price.toLocaleString('th-TH', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}${suffix}`;
  }

  billingLabel(cycle: BillingCycle): string {
    const labels: Record<BillingCycle, string> = {
      free: 'Free',
      monthly: 'รายเดือน',
      yearly: 'รายปี',
    };

    return labels[cycle];
  }

  limitLabel(value: number | null): string {
    return value === null ? 'ไม่จำกัด' : value.toLocaleString('th-TH');
  }
}
