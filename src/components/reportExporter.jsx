import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Shared helpers
const mm = {
  page: { width: 210, height: 297 },
  margin: { left: 12, right: 12, top: 14, bottom: 14 },
};

const formatPercent = (num, decimals = 1) => `${(num * 100).toFixed(decimals)}%`;
const formatDate = (d) => new Date(d).toLocaleString();

function addHeader(doc, title, subtitle) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(title, mm.margin.left, mm.margin.top);
  doc.setDrawColor(30, 64, 175);
  doc.setLineWidth(0.8);
  doc.line(mm.margin.left, mm.margin.top + 2, mm.page.width - mm.margin.right, mm.margin.top + 2);

  if (subtitle) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text(subtitle, mm.page.width - mm.margin.right, mm.margin.top - 1, { align: "right" });
    doc.setTextColor(0);
  }
}

function addFooter(doc, showGeneratedOn = true) {
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Page ${i} of ${pageCount}`, mm.page.width / 2, mm.page.height - 6, { align: "center" });
    if (showGeneratedOn && i === 1) {
      doc.text(`Generated on ${formatDate(new Date())}`, mm.page.width - mm.margin.right, mm.margin.top + 6, { align: "right" });
    }
  }
}

function addSectionTitle(doc, text, yOffset) {
  const y = yOffset ?? (doc.lastAutoTable ? doc.lastAutoTable.finalY + 8 : 28);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(text, mm.margin.left, y);
  return y + 3;
}

function addSummaryRow(doc, entries, startY) {
  const head = [entries.map((e) => e.label)];
  const body = [entries.map((e) => e.value)];
  autoTable(doc, {
    head,
    body,
    startY,
    styles: { fontSize: 10, cellPadding: 3 },
    headStyles: { fillColor: [241, 245, 249], textColor: 30 },
    theme: "grid",
    margin: { left: mm.margin.left, right: mm.margin.right },
  });
}

function trimText(text, max = 40) {
  if (!text) return "";
  return text.length <= max ? text : `${text.slice(0, max - 3)}...`;
}

function nextY(doc, offset = 8) {
  return doc.lastAutoTable ? doc.lastAutoTable.finalY + offset : 28;
}

// ---------------------------
// PROJECT PORTFOLIO REPORT
// ---------------------------
export function exportProjectPortfolioReport(processedData, options = {}) {
  const { timeFrameLabel = "All Time", teamLabel = "All Teams", projects = [], fileName } = options;
  const doc = new jsPDF("p", "mm", "a4");
  doc.setProperties({ title: fileName || `Project Portfolio Report - ${new Date().toISOString().slice(0, 10)}` });

  addHeader(doc, "Project Portfolio Report", `${timeFrameLabel} • ${teamLabel}`);

  // Summary
  addSummaryRow(doc, [
    { label: "Total", value: processedData.totalProjects },
    { label: "Completed", value: processedData.completedProjects },
    { label: "In Progress", value: processedData.inProgressProjects },
    { label: "Overdue", value: processedData.overdueProjects },
  ], addSectionTitle(doc, "Summary", 28));

  // Status Distribution
  const total = processedData.totalProjects || 1;
  autoTable(doc, {
    head: [["Status", "Count", "%"]],
    body: (processedData.statusDistribution || [])
      .slice()
      .filter((s) => s.value > 0)
      .map((s) => [s.name, s.value, ((s.value / total) * 100).toFixed(1) + "%"]),
    startY: addSectionTitle(doc, "Status Distribution", nextY(doc)),
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [243, 244, 246], textColor: 30 },
    theme: "grid",
    margin: { left: mm.margin.left, right: mm.margin.right },
  });

  // Projects by Team
  autoTable(doc, {
    head: [["Team", "Projects", "Completed", "Completion %"]],
    body: (processedData.teamDistribution || [])
      .slice()
      .sort((a, b) => b.projects - a.projects)
      .slice(0, 12)
      .map((t) => [t.name, t.projects, t.completed, t.projects > 0 ? ((t.completed / t.projects) * 100).toFixed(1) + "%" : "0%"]),
    startY: addSectionTitle(doc, "Projects by Team", nextY(doc)),
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [243, 244, 246], textColor: 30 },
    theme: "grid",
    margin: { left: mm.margin.left, right: mm.margin.right },
  });

  // Top Projects by Completion
  const topProjects = (processedData.projectTaskMetrics || [])
    .slice()
    .sort((a, b) => (b.completionRate || 0) - (a.completionRate || 0))
    .slice(0, 18);

  autoTable(doc, {
    head: [["Project", "Completed/Total", "Completion %"]],
    body: topProjects.map((p) => [
      trimText(p.name, 48),
      `${p.completedTasks}/${p.totalTasks}`,
      formatPercent(p.completionRate || 0),
    ]),
    startY: addSectionTitle(doc, "Top Projects by Completion", nextY(doc)),
    styles: { fontSize: 9, cellPadding: 2 },
    columnStyles: { 0: { cellWidth: 110 } },
    headStyles: { fillColor: [243, 244, 246], textColor: 30 },
    theme: "grid",
    margin: { left: mm.margin.left, right: mm.margin.right },
  });

  // Overdue Projects
  const overdue = projects
    .slice()
    .filter((p) => p.due_date && p.status?.toLowerCase() !== "completed" && new Date(p.due_date) < new Date())
    .slice(0, 18);

  if (overdue.length > 0) {
    autoTable(doc, {
      head: [["Project", "Due", "Team", "Status"]],
      body: overdue.map((p) => [
        trimText(p.name, 48),
        new Date(p.due_date).toLocaleDateString(),
        p.team?.name || "-",
        p.status?.replaceAll("_", " ") || "-",
      ]),
      startY: addSectionTitle(doc, "Overdue Projects", nextY(doc)),
      styles: { fontSize: 9, cellPadding: 2 },
      columnStyles: { 0: { cellWidth: 90 } },
      headStyles: { fillColor: [254, 242, 242], textColor: [153, 27, 27] },
      theme: "grid",
      margin: { left: mm.margin.left, right: mm.margin.right },
    });
  }

  addFooter(doc);
  doc.save(fileName || `Project-Portfolio-Report-${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ---------------------------
// WEEKLY REPORT
// ---------------------------
export function exportWeeklyReport(reportData, options = {}) {
  const { dateLabel = "This Week", teamLabel = "All Teams", projectLabel = "All Projects", fileName } = options;
  const doc = new jsPDF("p", "mm", "a4");
  doc.setProperties({ title: fileName || `Weekly Report - ${new Date().toISOString().slice(0, 10)}` });

  addHeader(doc, "Weekly Report", `${dateLabel} • ${teamLabel} • ${projectLabel}`);

  const totalTasks = reportData.tasks?.length || 0;
  const completed = (reportData.statusDistribution || []).find((s) => s.name === "Completed")?.value || 0;
  const inProgress = (reportData.statusDistribution || []).find((s) => s.name === "In Progress")?.value || 0;
  const onHold = (reportData.statusDistribution || []).find((s) => s.name === "On Hold")?.value || 0;

  addSummaryRow(doc, [
    { label: "Total Tasks", value: totalTasks },
    { label: "Completed", value: completed },
    { label: "In Progress", value: inProgress },
    { label: "On Hold", value: onHold },
  ], addSectionTitle(doc, "Summary", 28));

  // Status distribution table
  autoTable(doc, {
    head: [["Status", "Count"]],
    body: (reportData.statusDistribution || []).filter((s) => s.value > 0).map((s) => [s.name, s.value]),
    startY: addSectionTitle(doc, "Status Distribution", nextY(doc)),
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [243, 244, 246], textColor: 30 },
    theme: "grid",
    margin: { left: mm.margin.left, right: mm.margin.right },
  });

  // Priority distribution
  autoTable(doc, {
    head: [["Priority", "Count"]],
    body: (reportData.priorityDistribution || []).filter((p) => p.value > 0).map((p) => [p.name, p.value]),
    startY: addSectionTitle(doc, "Priority Distribution", nextY(doc)),
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [243, 244, 246], textColor: 30 },
    theme: "grid",
    margin: { left: mm.margin.left, right: mm.margin.right },
  });

  // Top project progress
  const topProj = (reportData.projectProgress || []).slice().sort((a, b) => b.progress - a.progress).slice(0, 15);
  autoTable(doc, {
    head: [["Project", "Completed/Total", "Progress %"]],
    body: topProj.map((p) => [trimText(p.name, 60), `${p.completed}/${p.total}`, formatPercent(p.progress)]),
    startY: addSectionTitle(doc, "Top Project Progress", nextY(doc)),
    styles: { fontSize: 9, cellPadding: 2 },
    columnStyles: { 0: { cellWidth: 110 } },
    headStyles: { fillColor: [243, 244, 246], textColor: 30 },
    theme: "grid",
    margin: { left: mm.margin.left, right: mm.margin.right },
  });

  addFooter(doc);
  doc.save(fileName || `Weekly-Report-${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ---------------------------
// TASK ANALYTICS REPORT
// ---------------------------
export function exportTaskAnalyticsReport(taskStats, reportData, options = {}) {
  const { fileName = `Task-Analytics-Report-${new Date().toISOString().slice(0, 10)}.pdf` } = options;
  const doc = new jsPDF("p", "mm", "a4");
  doc.setProperties({ title: fileName });
  addHeader(doc, "Task Analytics Report", "Compact export");

  addSummaryRow(doc, [
    { label: "Total", value: taskStats.total },
    { label: "Completed", value: taskStats.completed },
    { label: "Overdue", value: taskStats.overdue },
    { label: "Due This Week", value: taskStats.dueThisWeek },
  ], addSectionTitle(doc, "Summary", 28));

  // Status distribution
  autoTable(doc, {
    head: [["Status", "Count"]],
    body: (taskStats.statusDistribution || []).filter((s) => s.value > 0).map((s) => [s.name, s.value]),
    startY: addSectionTitle(doc, "Status Distribution", nextY(doc)),
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [243, 244, 246], textColor: 30 },
    theme: "grid",
    margin: { left: mm.margin.left, right: mm.margin.right },
  });

  // Project performance
  autoTable(doc, {
    head: [["Project", "Completed/Total", "Completion %"]],
    body: (taskStats.projectPerformance || []).slice(0, 18).map((p) => [
      trimText(p.name, 60),
      `${p.completed}/${p.total}`,
      formatPercent(p.completionRate || 0),
    ]),
    startY: addSectionTitle(doc, "Project Performance", nextY(doc)),
    styles: { fontSize: 9, cellPadding: 2 },
    columnStyles: { 0: { cellWidth: 110 } },
    headStyles: { fillColor: [243, 244, 246], textColor: 30 },
    theme: "grid",
    margin: { left: mm.margin.left, right: mm.margin.right },
  });

  // Overdue tasks
  const overdueTasks = (reportData || [])
    .slice()
    .filter((t) => t.due_date && new Date(t.due_date) < new Date() && !["completed", "cancelled"].includes(t.status?.toLowerCase()))
    .slice(0, 20);

  if (overdueTasks.length > 0) {
    autoTable(doc, {
      head: [["Task", "Project", "Priority", "Due"]],
      body: overdueTasks.map((t) => [
        trimText(t.title, 60),
        trimText(t.project?.name || "-", 40),
        String(t.priority ?? "-"),
        new Date(t.due_date).toLocaleDateString(),
      ]),
      startY: addSectionTitle(doc, "Overdue Tasks", nextY(doc)),
      styles: { fontSize: 9, cellPadding: 2 },
      columnStyles: { 0: { cellWidth: 90 } },
      headStyles: { fillColor: [254, 242, 242], textColor: [153, 27, 27] },
      theme: "grid",
      margin: { left: mm.margin.left, right: mm.margin.right },
    });
  }

  addFooter(doc);
  doc.save(fileName);
}

// ---------------------------
// EMPLOYEE ANALYTICS REPORT
// ---------------------------
export function exportEmployeeAnalyticsReport(analyticsData, options = {}) {
  const { timeFrameLabel = "This Month", fileName } = options;
  const doc = new jsPDF("p", "mm", "a4");
  doc.setProperties({ title: fileName || `Employee Analytics Report - ${new Date().toISOString().slice(0, 10)}` });
  addHeader(doc, "Employee Analytics Report", timeFrameLabel);

  addSummaryRow(doc, [
    { label: "Employees", value: analyticsData.totalEmployees },
    { label: "Active", value: analyticsData.activeEmployees },
    { label: "Inactive", value: analyticsData.inactiveEmployees },
    { label: "Tasks Completed", value: analyticsData.completedTasks },
  ], addSectionTitle(doc, "Summary", 28));

  // Role distribution
  autoTable(doc, {
    head: [["Role", "Count"]],
    body: (analyticsData.roleDistributionChart || []).map((r) => [r.name, r.value]),
    startY: addSectionTitle(doc, "Role Distribution", nextY(doc)),
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [243, 244, 246], textColor: 30 },
    theme: "grid",
    margin: { left: mm.margin.left, right: mm.margin.right },
  });

  // Top performers
  autoTable(doc, {
    head: [["Employee", "Completed", "Completion %"]],
    body: (analyticsData.topPerformers || []).slice(0, 18).map((e) => [
      trimText(`${e.first_name} ${e.last_name}`, 60),
      String(e.completedTasks),
      formatPercent(e.completionRate || 0),
    ]),
    startY: addSectionTitle(doc, "Top Performers", nextY(doc)),
    styles: { fontSize: 9, cellPadding: 2 },
    columnStyles: { 0: { cellWidth: 110 } },
    headStyles: { fillColor: [243, 244, 246], textColor: 30 },
    theme: "grid",
    margin: { left: mm.margin.left, right: mm.margin.right },
  });

  // Most overdue
  autoTable(doc, {
    head: [["Employee", "Overdue Tasks"]],
    body: (analyticsData.mostOverdue || []).slice(0, 18).map((e) => [
      trimText(`${e.first_name} ${e.last_name}`, 60),
      String(e.overdueTasks),
    ]),
    startY: addSectionTitle(doc, "Most Overdue", nextY(doc)),
    styles: { fontSize: 9, cellPadding: 2 },
    columnStyles: { 0: { cellWidth: 120 } },
    headStyles: { fillColor: [254, 242, 242], textColor: [153, 27, 27] },
    theme: "grid",
    margin: { left: mm.margin.left, right: mm.margin.right },
  });

  addFooter(doc);
  doc.save(fileName || `Employee-Analytics-Report-${new Date().toISOString().slice(0, 10)}.pdf`);
}
