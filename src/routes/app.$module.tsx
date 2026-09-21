import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { ModulePage } from "@/components/crud/module-page";

import { RollNumberPage } from "@/components/roll-number/roll-number-page";
import { LeavingCertificatePage } from "@/components/leaving-certificate/leaving-certificate-page";
import { CasteReportPage } from "@/components/caste-report/caste-report-page";
import { MinorityReportPage } from "@/components/minority-report/minority-report-page";
import { StudentReportsPage } from "@/components/student-reports/student-reports-page";
import { OutgoingStudentsPage } from "@/components/outgoing-students/outgoing-students-page";
import { DispatchRegisterPage } from "@/components/dispatch-register/dispatch-register-page";
import { BonafideCertificatePage } from "@/components/bonafide-certificate/bonafide-certificate-page";

import { MarkAttendancePage } from "@/components/attendance/mark-attendance-page";
import { AttendanceRegisterPage } from "@/components/attendance-register/attendance-register-page";

import { StudentRegisterPage } from "@/components/student-register/student-register-page";

import { MarksEntryPage } from "@/components/marks-entry/marks-entry-page";
import { ProgressReportPage } from "@/components/progress-report/progress-report-page";
import { ConsolidatedResultsPage } from "@/components/consolidated-results/consolidated-results-page";
import { SubjectWiseResultsPage } from "@/components/subject-wise-results/subject-wise-results-page";
import { GradeWiseResultsPage } from "@/components/grade-wise-results/grade-wise-results-page";
import { ExamDailyRegisterPage } from "@/components/exam-daily-register/exam-daily-register-page";

import { Grade58ResultsPage } from "@/components/grade-5-8-results/grade-5-8-results-page";

import { SscResultsPage } from "@/components/ssc-results/ssc-results-page";
import { HscResultsPage } from "@/components/hsc-results/hsc-results-page";

import { ViewReportsPage } from "@/components/view-reports/view-reports-page";
import { StudentPromotionPage } from "@/components/student-promotion/student-promotion-page";

/* ICSE */
import { IcseMarksEntryPage } from "@/components/icse-marks-entry/icse-marks-entry-page";
import { IcseSubjectWiseResultsPage } from "@/components/icse-subject-wise-results/icse-subject-wise-results-page";
import { IcseProgressReportPage } from "@/components/icse-progress-report/icse-progress-report-page";
import { IcseGradeWiseResultsPage } from "@/components/icse-grade-wise-results/icse-grade-wise-results-page";
import { IcsePreliminaryProgressPage } from "@/components/icse-preliminary-progress/icse-preliminary-progress-page";
import { IcseViewReportsPage } from "@/components/icse-view-reports/icse-view-reports-page";
import { IcseStudentPromotionPage } from "@/components/icse-student-promotion/icse-student-promotion-page";

/* CBSE */
import { CbseStudentPromotionPage } from "@/components/cbse-student-promotion/cbse-student-promotion-page";
import { CbseMarksEntryPage } from "@/components/cbse-marks-entry/cbse-marks-entry-page";
import { CbseHighSchoolResultsPage } from "@/components/cbse-high-school-results/cbse-high-school-results-page";
import { CbsePrimaryResultsPage } from "@/components/cbse-primary-results/cbse-primary-results-page";
import { CbsePrePrimaryResultsPage } from "@/components/cbse-pre-primary-results/cbse-pre-primary-results-page";
import { CbseSubjectWiseResultsPage } from "@/components/cbse-subject-wise-results/cbse-subject-wise-results-page";

/* Admission */
import { AdmissionFormPage } from "@/components/admission-form/admission-form-page";
import { AddItemPage } from "@/components/add-item/add-item-page";
import { StockInPage } from "@/components/stock-in/stock-in-page.tsx";
import { SupplierManagementPage } from "@/components/supplier-management/supplier-management-page";
import { InventoryReportPage } from "@/components/inventory-report/inventory-report-page";
import { AddStaffPage } from "@/components/add-staff/add-staff-page";
import { StaffPayrollPage } from "@/components/staff-payroll/staff-payroll-page";
import { StaffIDCardPage } from "@/components/staff-id-card/StaffIDCardPage";
import { TimetablePage } from "@/components/timetable/timetable-page";
import { StudyMaterialPage } from "@/components/study-material/study-material-page";
import { getModule } from "@/lib/modules/registry";
import { StudentResultsPage } from "@/components/student-results/student-results-page";
import { TakeTestPage } from "@/components/take-test/take-test-page";

/* Accountant */
import { AccountantDashboard } from "@/components/accountant/accountant-dashboard";
import { FeeCollectionPage } from "@/components/fee-collection/fee-collection-page";
import { ReceiptsPage } from "@/components/accountant/receipts-page";
import { PendingFeesPage } from "@/components/accountant/pending-fees-page";
import { DefaultersPage } from "@/components/accountant/defaulters-page";

export function ModuleRoute() {
  const { t } = useTranslation();
  const { module } = useParams<{ module: string }>();

  /* =========================
     STUDENT MODULES
  ========================= */

  if (module === "roll-number") {
    return <RollNumberPage />;
  }

  if (module === "leaving-certificate") {
    return <LeavingCertificatePage />;
  }

  if (module === "caste-report") {
    return <CasteReportPage />;
  }

  if (module === "minority-report") {
    return <MinorityReportPage />;
  }

  if (module === "student-reports") {
    return <StudentReportsPage />;
  }

  if (module === "outgoing-students") {
    return <OutgoingStudentsPage />;
  }

  if (module === "dispatch-register") {
    return <DispatchRegisterPage />;
  }

  if (module === "bonafide-certificate") {
    return <BonafideCertificatePage />;
  }

  if (module === "mark-attendance") {
    return <MarkAttendancePage />;
  }

  if (module === "attendance-register") {
    return <AttendanceRegisterPage />;
  }

  if (module === "student-register") {
    return <StudentRegisterPage />;
  }

  /* =========================
     STATE BOARD / GENERAL EXAMS
  ========================= */

  if (module === "marks-entry") {
    return <MarksEntryPage />;
  }

  if (module === "progress-report") {
    return <ProgressReportPage />;
  }

  if (module === "consolidated-results") {
    return <ConsolidatedResultsPage />;
  }

  if (module === "subject-wise-results") {
    return <SubjectWiseResultsPage />;
  }

  if (module === "grade-wise-results") {
    return <GradeWiseResultsPage />;
  }

  if (module === "exam-daily-register") {
    return <ExamDailyRegisterPage />;
  }

  if (module === "grade-5-8-results") {
    return <Grade58ResultsPage />;
  }

  if (module === "ssc-results") {
    return <SscResultsPage />;
  }

  if (module === "hsc-results") {
    return <HscResultsPage />;
  }

  if (module === "view-reports") {
    return <ViewReportsPage />;
  }

  if (module === "student-promotion") {
    return <StudentPromotionPage />;
  }

  /* =========================
     ICSE
  ========================= */

  if (module === "icse-marks-entry") {
    return <IcseMarksEntryPage />;
  }

  if (module === "icse-subject-wise-results") {
    return <IcseSubjectWiseResultsPage />;
  }

  if (module === "icse-progress-report") {
    return <IcseProgressReportPage />;
  }

  if (module === "icse-grade-wise-results") {
    return <IcseGradeWiseResultsPage />;
  }

  if (module === "icse-preliminary-progress") {
    return <IcsePreliminaryProgressPage />;
  }

  if (module === "icse-view-reports") {
    return <IcseViewReportsPage />;
  }

  if (module === "icse-student-promotion") {
    return <IcseStudentPromotionPage />;
  }

  /* =========================
     CBSE
  ========================= */

  if (module === "cbse-student-promotion") {
    return <CbseStudentPromotionPage />;
  }

  if (module === "cbse-marks-entry") {
    return <CbseMarksEntryPage />;
  }

  if (module === "cbse-high-school-results") {
    return <CbseHighSchoolResultsPage />;
  }

  if (module === "cbse-primary-results") {
    return <CbsePrimaryResultsPage />;
  }

  if (module === "cbse-pre-primary-results") {
    return <CbsePrePrimaryResultsPage />;
  }

  if (module === "cbse-subject-wise-results") {
    return <CbseSubjectWiseResultsPage />;
  }

  /* =========================
     ADMISSION
  ========================= */

  if (module === "admission-form") {
    return <AdmissionFormPage />;
  }

  if (module === "add-item") {
    return <AddItemPage />;
  }

  if (module === "stock-in") {
    return <StockInPage />;
  }

  if (module === "supplier-management") {
    return <SupplierManagementPage />;
  }

  if (module === "inventory-report") {
    return <InventoryReportPage />;
  }

  if (module === "add-staff") {
    return <AddStaffPage />;
  }

  if (module === "staff-payroll") {
    return <StaffPayrollPage />;
  }

  if (module === "staff-id-card") {
    return <StaffIDCardPage />;
  }

  if (module === "view-timetable") {
    return <TimetablePage />;
  }

  if (module === "study-material") {
    return <StudyMaterialPage />;
  }

  if (module === "my-results") {
    return <StudentResultsPage />;
  }

  if (module === "take-test") {
    return <TakeTestPage />;
  }

  /* =========================
     ACCOUNTANT
 /* =========================
   ACCOUNTANT
========================= */

if (module === "accountant-dashboard") {
  return <AccountantDashboard />;
}

if (module === "fee-collection") {
  return <FeeCollectionPage />;
}

if (module === "receipts") {
  return <ReceiptsPage />;
}

if (module === "pending-fees") {
  return <PendingFeesPage />;
}

// ✅ Match ALL possible slug variants
if (
  module === "defaulters" ||
  module === "accountant-defaulters" ||
  module === "accountant-modules-defaulters" ||
  (module && module.endsWith("-defaulters"))
) {
  return <DefaultersPage />;
}
  /* =========================
     GENERIC MODULE
  ========================= */

  const mod = getModule(module || "");

  if (!mod) {
    return (
      <div className="p-12 text-center">
        <h2 className="text-xl font-semibold">
          {t("app.moduleNotFound")}
        </h2>

        <p className="text-sm text-muted-foreground mt-1">
          {t("app.moduleNotFoundDesc")}
        </p>
      </div>
    );
  }

  return <ModulePage module={mod} />;
}