// ── Setup checklist steps per hardware type ───────────────────────────────────
// Each step: { id, labelKey, descKey, actionTab, isManual }
// actionTab: which admin tab to navigate to when the action link is clicked
// isManual: true = no auto-detection, show "Mark done" button

export const SETUP_STEPS = {
  qr_phone: [
    {
      id: 'change_pin',
      labelKey: 'onboarding.step.change_pin.label',
      descKey: 'onboarding.step.change_pin.desc',
      actionTab: 'settings',
      isManual: false,
    },
    {
      id: 'configure_packages',
      labelKey: 'onboarding.step.configure_packages.label',
      descKey: 'onboarding.step.configure_packages.desc',
      actionTab: 'packages',
      isManual: false,
    },
    {
      id: 'add_members',
      labelKey: 'onboarding.step.add_members.label',
      descKey: 'onboarding.step.add_members.desc',
      actionTab: 'members',
      isManual: false,
    },
    {
      id: 'generate_qr',
      labelKey: 'onboarding.step.generate_qr.label',
      descKey: 'onboarding.step.generate_qr.desc',
      actionTab: 'members',
      isManual: true,
    },
    {
      id: 'test_scan',
      labelKey: 'onboarding.step.test_scan.label',
      descKey: 'onboarding.step.test_scan.desc',
      actionTab: null,
      isManual: true,
    },
  ],

  tablet_kiosk: [
    {
      id: 'change_pin',
      labelKey: 'onboarding.step.change_pin.label',
      descKey: 'onboarding.step.change_pin.desc',
      actionTab: 'settings',
      isManual: false,
    },
    {
      id: 'set_gym_code',
      labelKey: 'onboarding.step.set_gym_code.label',
      descKey: 'onboarding.step.set_gym_code.desc',
      actionTab: 'settings',
      isManual: false,
    },
    {
      id: 'configure_packages',
      labelKey: 'onboarding.step.configure_packages.label',
      descKey: 'onboarding.step.configure_packages.desc',
      actionTab: 'packages',
      isManual: false,
    },
    {
      id: 'add_members',
      labelKey: 'onboarding.step.add_members.label',
      descKey: 'onboarding.step.add_members.desc',
      actionTab: 'members',
      isManual: false,
    },
    {
      id: 'test_kiosk',
      labelKey: 'onboarding.step.test_kiosk.label',
      descKey: 'onboarding.step.test_kiosk.desc',
      actionTab: null,
      isManual: true,
    },
  ],

  pc_webcam: [
    {
      id: 'change_pin',
      labelKey: 'onboarding.step.change_pin.label',
      descKey: 'onboarding.step.change_pin.desc',
      actionTab: 'settings',
      isManual: false,
    },
    {
      id: 'configure_packages',
      labelKey: 'onboarding.step.configure_packages.label',
      descKey: 'onboarding.step.configure_packages.desc',
      actionTab: 'packages',
      isManual: false,
    },
    {
      id: 'add_staff',
      labelKey: 'onboarding.step.add_staff.label',
      descKey: 'onboarding.step.add_staff.desc',
      actionTab: 'staff',
      isManual: false,
    },
    {
      id: 'add_members',
      labelKey: 'onboarding.step.add_members.label',
      descKey: 'onboarding.step.add_members.desc',
      actionTab: 'members',
      isManual: false,
    },
    {
      id: 'test_scan',
      labelKey: 'onboarding.step.test_scan.label',
      descKey: 'onboarding.step.test_scan.desc',
      actionTab: null,
      isManual: true,
    },
  ],
};

// ── Page tour steps ───────────────────────────────────────────────────────────
// Each step: { targetId, titleKey, bodyKey, placement }
// targetId: DOM id added to the target element
// placement: 'top' | 'bottom' | 'left' | 'right' — tooltip direction preference

export const PAGE_TOURS = {
  scan_page: [
    {
      targetId: 'scan-scanner-area',
      titleKey: 'onboarding.tour.scan_page.0.title',
      bodyKey: 'onboarding.tour.scan_page.0.body',
      placement: 'bottom',
    },
    {
      targetId: 'scan-register-btn',
      titleKey: 'onboarding.tour.scan_page.1.title',
      bodyKey: 'onboarding.tour.scan_page.1.body',
      placement: 'bottom',
    },
    {
      targetId: 'scan-admin-btn',
      titleKey: 'onboarding.tour.scan_page.2.title',
      bodyKey: 'onboarding.tour.scan_page.2.body',
      placement: 'bottom',
    },
  ],

  attendance_tab: [
    {
      targetId: 'attendance-list',
      titleKey: 'onboarding.tour.attendance_tab.0.title',
      bodyKey: 'onboarding.tour.attendance_tab.0.body',
      placement: 'top',
    },
    {
      targetId: 'attendance-date-picker',
      titleKey: 'onboarding.tour.attendance_tab.1.title',
      bodyKey: 'onboarding.tour.attendance_tab.1.body',
      placement: 'bottom',
    },
    {
      targetId: 'attendance-filter-toggle',
      titleKey: 'onboarding.tour.attendance_tab.2.title',
      bodyKey: 'onboarding.tour.attendance_tab.2.body',
      placement: 'bottom',
    },
  ],

  members_tab: [
    {
      targetId: 'members-search',
      titleKey: 'onboarding.tour.members_tab.0.title',
      bodyKey: 'onboarding.tour.members_tab.0.body',
      placement: 'bottom',
    },
    {
      targetId: 'members-actions-toolbar',
      titleKey: 'onboarding.tour.members_tab.1.title',
      bodyKey: 'onboarding.tour.members_tab.1.body',
      placement: 'bottom',
    },
    {
      targetId: 'members-qr-col',
      titleKey: 'onboarding.tour.members_tab.2.title',
      bodyKey: 'onboarding.tour.members_tab.2.body',
      placement: 'left',
    },
    {
      targetId: 'members-groups-section',
      titleKey: 'onboarding.tour.members_tab.3.title',
      bodyKey: 'onboarding.tour.members_tab.3.body',
      placement: 'bottom',
    },
  ],

  packages_tab: [
    {
      targetId: 'packages-list',
      titleKey: 'onboarding.tour.packages_tab.0.title',
      bodyKey: 'onboarding.tour.packages_tab.0.body',
      placement: 'top',
    },
    {
      targetId: 'packages-default-star',
      titleKey: 'onboarding.tour.packages_tab.1.title',
      bodyKey: 'onboarding.tour.packages_tab.1.body',
      placement: 'right',
    },
    {
      targetId: 'packages-reg-fee-toggle',
      titleKey: 'onboarding.tour.packages_tab.2.title',
      bodyKey: 'onboarding.tour.packages_tab.2.body',
      placement: 'top',
    },
  ],

  staff_tab: [
    {
      targetId: 'staff-list',
      titleKey: 'onboarding.tour.staff_tab.0.title',
      bodyKey: 'onboarding.tour.staff_tab.0.body',
      placement: 'top',
    },
    {
      targetId: 'staff-add-btn',
      titleKey: 'onboarding.tour.staff_tab.1.title',
      bodyKey: 'onboarding.tour.staff_tab.1.body',
      placement: 'left',
    },
  ],
};

// Tours available to staff (subset — no packages or business)
export const STAFF_VISIBLE_TOURS = new Set([
  'scan_page',
  'attendance_tab',
  'members_tab',
]);
