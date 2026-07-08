import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Observable, map, tap } from 'rxjs';

import { environment } from '../../../environments/environment';

export type BillingCycle = 'free' | 'monthly' | 'yearly';

interface ApiPlan {
  id: number;
  plan_name: string;
  plan_code: string;
  description?: string | null;
  storage_limit_bytes: number;
  max_file_size_bytes: number;
  max_files?: number | null;
  max_share_users_per_file?: number | null;
  price: string;
  billing_cycle: BillingCycle;
  is_active: boolean;
}

interface ApiCurrentUserPlan {
  user_plan_id: number;
  user_id: number;
  plan_id: number;
  status: string;
  started_at: string;
  expires_at?: string | null;
  auto_renew: boolean;
  plan_name: string;
  plan_code: string;
  description?: string | null;
  storage_limit_bytes: number;
  max_file_size_bytes: number;
  max_files?: number | null;
  max_share_users_per_file?: number | null;
  price: string;
  billing_cycle: BillingCycle;
}

interface ApiPlansResponse {
  message: string;
  plans: ApiPlan[];
  total: number;
}

interface ApiCurrentPlanResponse {
  message: string;
  plan: {
    user_plan: ApiCurrentUserPlan;
    used_storage_bytes: number;
    remaining_storage_bytes: number;
    storage_usage_percent: number;
  };
}

export interface Plan {
  id: number;
  name: string;
  code: string;
  description: string;
  storageLimitBytes: number;
  maxFileSizeBytes: number;
  maxFiles: number | null;
  maxShareUsersPerFile: number | null;
  price: number;
  billingCycle: BillingCycle;
  active: boolean;
}

export interface CurrentUserPlan {
  userPlanId: number;
  userId: number;
  planId: number;
  status: string;
  startedAt: string;
  expiresAt: string | null;
  autoRenew: boolean;
  planName: string;
  planCode: string;
  description: string;
  storageLimitBytes: number;
  maxFileSizeBytes: number;
  maxFiles: number | null;
  maxShareUsersPerFile: number | null;
  price: number;
  billingCycle: BillingCycle;
}

export interface UserStoragePlan {
  userPlan: CurrentUserPlan;
  usedStorageBytes: number;
  remainingStorageBytes: number;
  storageUsagePercent: number;
}

export interface SelectPlanResponse {
  message: string;
  plan?: UserStoragePlan;
}

@Injectable({
  providedIn: 'root',
})
export class PlanService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;
  readonly currentStoragePlan = signal<UserStoragePlan | null>(null);

  listPlans(): Observable<Plan[]> {
    return this.http
      .get<ApiPlansResponse>(`${this.apiUrl}/plans`, { withCredentials: true })
      .pipe(map((response) => response.plans.map((plan) => this.normalizePlan(plan))));
  }

  currentPlan(): Observable<UserStoragePlan> {
    return this.http
      .get<ApiCurrentPlanResponse>(`${this.apiUrl}/me/plan`, { withCredentials: true })
      .pipe(
        map((response) => this.normalizeStoragePlan(response.plan)),
        tap((plan) => this.currentStoragePlan.set(plan)),
      );
  }

  selectPlan(planCode: string, autoRenew: boolean): Observable<SelectPlanResponse> {
    return this.http
      .post<ApiCurrentPlanResponse>(
        `${this.apiUrl}/me/plan`,
        {
          plan_code: planCode,
          auto_renew: autoRenew,
        },
        { withCredentials: true },
      )
      .pipe(
        map((response) => ({
          message: response.message,
          plan: this.normalizeStoragePlan(response.plan),
        })),
        tap((response) => {
          if (response.plan) {
            this.currentStoragePlan.set(response.plan);
          }
        }),
      );
  }

  private normalizePlan(plan: ApiPlan): Plan {
    return {
      id: plan.id,
      name: plan.plan_name,
      code: plan.plan_code,
      description: plan.description ?? '',
      storageLimitBytes: plan.storage_limit_bytes,
      maxFileSizeBytes: plan.max_file_size_bytes,
      maxFiles: plan.max_files ?? null,
      maxShareUsersPerFile: plan.max_share_users_per_file ?? null,
      price: Number(plan.price),
      billingCycle: plan.billing_cycle,
      active: plan.is_active,
    };
  }

  private normalizeCurrentPlan(plan: ApiCurrentUserPlan): CurrentUserPlan {
    return {
      userPlanId: plan.user_plan_id,
      userId: plan.user_id,
      planId: plan.plan_id,
      status: plan.status,
      startedAt: plan.started_at,
      expiresAt: plan.expires_at ?? null,
      autoRenew: plan.auto_renew,
      planName: plan.plan_name,
      planCode: plan.plan_code,
      description: plan.description ?? '',
      storageLimitBytes: plan.storage_limit_bytes,
      maxFileSizeBytes: plan.max_file_size_bytes,
      maxFiles: plan.max_files ?? null,
      maxShareUsersPerFile: plan.max_share_users_per_file ?? null,
      price: Number(plan.price),
      billingCycle: plan.billing_cycle,
    };
  }

  private normalizeStoragePlan(plan: ApiCurrentPlanResponse['plan']): UserStoragePlan {
    return {
      userPlan: this.normalizeCurrentPlan(plan.user_plan),
      usedStorageBytes: plan.used_storage_bytes,
      remainingStorageBytes: plan.remaining_storage_bytes,
      storageUsagePercent: plan.storage_usage_percent,
    };
  }
}
