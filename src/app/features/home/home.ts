import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LucideBadgeCheck,
  LucideChevronRight,
  LucideCloud,
  LucideFileArchive,
  LucideFileImage,
  LucideFileText,
  LucideFolder,
  LucideHardDrive,
  LucideLockKeyhole,
  LucideShare2,
  LucideSparkles,
  LucideUploadCloud,
  LucideUsers,
  LucideZap,
} from '@lucide/angular';

interface PromotionPlan {
  name: string;
  price: string;
  storage: string;
  highlight: string;
  features: string[];
  featured?: boolean;
}

@Component({
  selector: 'app-home',
  imports: [
    RouterLink,
    LucideBadgeCheck,
    LucideChevronRight,
    LucideCloud,
    LucideFileArchive,
    LucideFileImage,
    LucideFileText,
    LucideFolder,
    LucideHardDrive,
    LucideLockKeyhole,
    LucideShare2,
    LucideSparkles,
    LucideUploadCloud,
    LucideUsers,
    LucideZap,
  ],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  readonly plans: PromotionPlan[] = [
    {
      name: 'Starter',
      price: 'ฟรี',
      storage: '10 GB',
      highlight: 'เหมาะสำหรับเริ่มเก็บไฟล์ส่วนตัว',
      features: [
        'อัปโหลดไฟล์พื้นฐาน',
        'จัดการเอกสารและรูปภาพ',
        'ใช้งานบนอุปกรณ์ส่วนตัว',
      ],
    },
    {
      name: 'Pro Cloud',
      price: '฿99/เดือน',
      storage: '200 GB',
      highlight: 'โปรเปิดตัว ลด 30% สำหรับ 3 เดือนแรก',
      featured: true,
      features: [
        'พื้นที่เพิ่มสำหรับงานจริง',
        'แชร์ไฟล์ด้วยลิงก์ปลอดภัย',
        'ประวัติไฟล์และการเข้าถึงล่าสุด',
      ],
    },
    {
      name: 'Team',
      price: '฿299/เดือน',
      storage: '1 TB',
      highlight: 'สำหรับทีมที่ต้องแชร์งานทุกวัน',
      features: [
        'พื้นที่รวมสำหรับทีม',
        'จัดการสมาชิกและสิทธิ์เข้าถึง',
        'รองรับไฟล์โปรเจกต์ขนาดใหญ่',
      ],
    },
  ];
}
