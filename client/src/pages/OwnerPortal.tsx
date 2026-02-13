import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  IndianRupee,
  CalendarCheck,
  AlertTriangle,
  BarChart3,
  ArrowLeft,
  Menu,
  TrendingUp,
  TrendingDown,
  Clock,
  UserCheck,
  UserX,
  Activity,
  Bell,
  Filter,
  ChevronRight,
  Shield,
  Stethoscope,
  Briefcase,
  Plus,
  Pencil,
  Trash2,
  Package,
  Search,
  X,
  Check,
  Save,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

function formatINR(amount: number): string {
  if (amount === undefined || amount === null || isNaN(amount)) return "₹0";
  const isNegative = amount < 0;
  const abs = Math.abs(Math.round(amount));
  const str = abs.toString();
  if (str.length <= 3) return `${isNegative ? "-" : ""}₹${str}`;
  let result = str.slice(-3);
  let remaining = str.slice(0, -3);
  while (remaining.length > 2) {
    result = remaining.slice(-2) + "," + result;
    remaining = remaining.slice(0, -2);
  }
  if (remaining.length > 0) result = remaining + "," + result;
  return `${isNegative ? "-" : ""}₹${result}`;
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: "easeOut" as const },
  }),
};

export default function OwnerPortal() {
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("all");

  const today = new Date().toISOString().split("T")[0];
  const monthStart = `${today.slice(0, 7)}-01`;

  const dashboardQuery = useQuery<any>({
    queryKey: ["/api/owner/dashboard"],
  });
  const dashboard = dashboardQuery.data || {};

  const attendanceQuery = useQuery<any[]>({
    queryKey: ["/api/owner/attendance", monthStart, today],
    queryFn: async () => {
      const res = await fetch(`/api/owner/attendance?startDate=${monthStart}&endDate=${today}`);
      if (!res.ok) throw new Error("Failed to fetch attendance");
      return res.json();
    },
  });
  const attendance = attendanceQuery.data || [];

  const expensesQuery = useQuery<any[]>({
    queryKey: ["/api/owner/expenses", monthStart, today],
    queryFn: async () => {
      const res = await fetch(`/api/owner/expenses?startDate=${monthStart}&endDate=${today}`);
      if (!res.ok) throw new Error("Failed to fetch expenses");
      return res.json();
    },
  });
  const expenses = expensesQuery.data || [];

  const appointmentsQuery = useQuery<any[]>({
    queryKey: ["/api/appointments"],
  });
  const appointments = appointmentsQuery.data || [];

  const patientsQuery = useQuery<any[]>({
    queryKey: ["/api/patients"],
  });
  const patients = patientsQuery.data || [];

  const catalogQuery = useQuery<any[]>({ queryKey: ["/api/billing-catalog"] });
  const catalogItems = catalogQuery.data || [];

  const [editingItem, setEditingItem] = useState<any>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogCategoryFilter, setCatalogCategoryFilter] = useState("all");
  const [newItemTaxRate, setNewItemTaxRate] = useState("0");

  const queryClient = useQueryClient();

  const createCatalogItem = useMutation({
    mutationFn: async (item: any) => {
      const res = await fetch("/api/billing-catalog", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(item) });
      if (!res.ok) throw new Error("Failed to create");
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/billing-catalog"] }); setShowAddForm(false); },
  });

  const updateCatalogItem = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const res = await fetch(`/api/billing-catalog/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/billing-catalog"] }); setEditingItem(null); },
  });

  const deleteCatalogItem = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/billing-catalog/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/billing-catalog"] }),
  });

  const catalogCategories = useMemo(() => {
    const cats = new Set(catalogItems.map((c: any) => c.category));
    return Array.from(cats).sort();
  }, [catalogItems]);

  const filteredCatalog = useMemo(() => {
    let items = catalogItems;
    if (catalogCategoryFilter !== "all") items = items.filter((c: any) => c.category === catalogCategoryFilter);
    if (catalogSearch) items = items.filter((c: any) => c.name.toLowerCase().includes(catalogSearch.toLowerCase()) || (c.description || "").toLowerCase().includes(catalogSearch.toLowerCase()));
    return items;
  }, [catalogItems, catalogCategoryFilter, catalogSearch]);

  const todayAttendance = useMemo(() => {
    return attendance.filter((a: any) => a.date === today);
  }, [attendance, today]);

  const presentCount = todayAttendance.filter((a: any) => a.status === "present").length;
  const absentCount = todayAttendance.filter((a: any) => a.status === "absent").length;
  const leaveCount = todayAttendance.filter((a: any) => a.status === "leave").length;

  const expenseCategories = useMemo(() => {
    const cats: Record<string, number> = {};
    expenses.forEach((e: any) => {
      const cat = e.category || "Other";
      cats[cat] = (cats[cat] || 0) + (e.amount || 0);
    });
    return Object.entries(cats)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);
  }, [expenses]);

  const filteredExpenses = useMemo(() => {
    if (categoryFilter === "all") return expenses;
    return expenses.filter((e: any) => e.category === categoryFilter);
  }, [expenses, categoryFilter]);

  const totalExpenseAmount = expenses.reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
  const biggestCategory = expenseCategories[0];
  const daysInMonth = new Date().getDate();
  const avgDailyExpense = daysInMonth > 0 ? totalExpenseAmount / daysInMonth : 0;

  const appointmentsByProvider = useMemo(() => {
    const map: Record<string, { name: string; count: number }> = {};
    appointments.forEach((a: any) => {
      const name = a.providerName || a.doctor || `Provider #${a.providerId || "Unknown"}`;
      if (!map[name]) map[name] = { name, count: 0 };
      map[name].count++;
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [appointments]);

  const highRiskPatients = useMemo(() => {
    return patients.filter((p: any) => p.status === "High Risk" || p.riskLevel === "high");
  }, [patients]);

  const navItems = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "attendance", label: "Attendance", icon: UserCheck },
    { id: "finance", label: "Finance", icon: IndianRupee },
    { id: "alerts", label: "Alerts", icon: AlertTriangle },
    { id: "performance", label: "Performance", icon: BarChart3 },
    { id: "catalog", label: "Service Catalog", icon: Package },
  ];

  const statusBadge = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s === "present") return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200" data-testid={`badge-status-${s}`}>Present</Badge>;
    if (s === "absent") return <Badge className="bg-rose-100 text-rose-700 border-rose-200" data-testid={`badge-status-${s}`}>Absent</Badge>;
    if (s === "leave") return <Badge className="bg-amber-100 text-amber-700 border-amber-200" data-testid={`badge-status-${s}`}>Leave</Badge>;
    if (s === "half-day") return <Badge className="bg-blue-100 text-blue-700 border-blue-200" data-testid={`badge-status-${s}`}>Half-day</Badge>;
    return <Badge variant="outline" data-testid={`badge-status-${s}`}>{status}</Badge>;
  };

  const categoryColors: Record<string, string> = {
    "Rent": "bg-violet-100 text-violet-700",
    "Salaries": "bg-blue-100 text-blue-700",
    "Utilities": "bg-amber-100 text-amber-700",
    "Supplies": "bg-emerald-100 text-emerald-700",
    "Equipment": "bg-cyan-100 text-cyan-700",
    "Marketing": "bg-pink-100 text-pink-700",
    "Maintenance": "bg-orange-100 text-orange-700",
    "Insurance": "bg-indigo-100 text-indigo-700",
    "Other": "bg-slate-100 text-slate-700",
  };

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900 overflow-hidden">
      <aside className={`bg-white border-r border-slate-200 flex flex-col shrink-0 transition-all duration-300 ${sidebarOpen ? "w-64" : "w-20"}`}>
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          {sidebarOpen ? (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-serif font-bold">S</div>
              <span className="font-serif font-bold text-lg text-slate-800">Saivie</span>
            </div>
          ) : (
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-serif font-bold mx-auto">S</div>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400" onClick={() => setSidebarOpen(!sidebarOpen)} data-testid="btn-toggle-sidebar">
            <Menu className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-4 space-y-1">
          {navItems.map((item) => (
            <Button
              key={item.id}
              variant={activeView === item.id ? "secondary" : "ghost"}
              className={`w-full justify-start ${!sidebarOpen ? "px-2" : ""} ${activeView === item.id ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:text-slate-900"}`}
              onClick={() => setActiveView(item.id)}
              data-testid={`nav-${item.id}`}
            >
              <item.icon className={`w-4 h-4 ${sidebarOpen ? "mr-3" : ""}`} />
              {sidebarOpen && item.label}
            </Button>
          ))}
        </div>

        <div className="mt-auto p-4 border-t border-slate-100 space-y-2">
          <Link href="/">
            <Button variant="ghost" className={`w-full justify-start text-slate-500 hover:text-slate-900 ${!sidebarOpen ? "px-2" : ""}`} data-testid="btn-back-home">
              <ArrowLeft className={`w-4 h-4 ${sidebarOpen ? "mr-3" : ""}`} />
              {sidebarOpen && "Back to Home"}
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9 border border-slate-200">
              <AvatarFallback className="bg-gradient-to-br from-indigo-100 to-purple-100 text-indigo-700 font-bold">OW</AvatarFallback>
            </Avatar>
            {sidebarOpen && (
              <div className="overflow-hidden">
                <p className="text-sm font-medium text-slate-900 truncate">Clinic Owner</p>
                <p className="text-xs text-slate-400 truncate">Administrator</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50/50">
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 z-10">
          <div className="flex items-center gap-4">
            <div className="p-2 rounded-lg bg-indigo-50">
              <Briefcase className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900" data-testid="text-portal-title">Owner Portal</h1>
              <p className="text-xs text-slate-500" data-testid="text-welcome">Welcome, Owner</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" className="h-9 w-9 rounded-full border-slate-200 relative" data-testid="btn-notifications">
              <Bell className="w-4 h-4 text-slate-500" />
              {highRiskPatients.length > 0 && <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white" />}
            </Button>
          </div>
        </header>

        <ScrollArea className="flex-1">
          <div className="p-6 max-w-7xl mx-auto">

            {activeView === "overview" && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-slate-900 font-serif" data-testid="text-overview-title">Business Overview</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { title: "Total Patients", value: dashboard.totalPatients || patients.length || 0, icon: Users, color: "from-blue-500 to-indigo-600", bg: "bg-blue-50", textColor: "text-blue-600" },
                    { title: "Staff Present Today", value: dashboard.presentToday ?? presentCount, icon: UserCheck, color: "from-emerald-500 to-green-600", bg: "bg-emerald-50", textColor: "text-emerald-600", subtitle: `${dashboard.absentToday ?? absentCount} absent` },
                    { title: "Monthly Revenue", value: formatINR(dashboard.monthlyRevenue || 0), icon: TrendingUp, color: "from-violet-500 to-purple-600", bg: "bg-violet-50", textColor: "text-violet-600", isString: true },
                    { title: "Monthly Expenses", value: formatINR(dashboard.monthlyExpenses || totalExpenseAmount), icon: TrendingDown, color: "from-rose-500 to-pink-600", bg: "bg-rose-50", textColor: "text-rose-600", isString: true },
                    { title: "Net Profit", value: formatINR(dashboard.netProfit || (dashboard.monthlyRevenue || 0) - (dashboard.monthlyExpenses || totalExpenseAmount)), icon: IndianRupee, color: "from-amber-500 to-orange-600", bg: "bg-amber-50", textColor: "text-amber-600", isString: true },
                    { title: "Today's Appointments", value: dashboard.todayAppointments || 0, icon: CalendarCheck, color: "from-cyan-500 to-teal-600", bg: "bg-cyan-50", textColor: "text-cyan-600" },
                  ].map((kpi, i) => (
                    <motion.div key={kpi.title} custom={i} variants={cardVariants} initial="hidden" animate="visible">
                      <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow bg-white/80 backdrop-blur-sm" data-testid={`card-kpi-${i}`}>
                        <CardContent className="p-5">
                          <div className="flex items-start justify-between">
                            <div className="space-y-2">
                              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{kpi.title}</p>
                              <p className={`text-2xl font-bold ${kpi.textColor}`} data-testid={`value-kpi-${i}`}>
                                {kpi.isString ? kpi.value : kpi.value.toLocaleString()}
                              </p>
                              {kpi.subtitle && <p className="text-xs text-slate-400">{kpi.subtitle}</p>}
                            </div>
                            <div className={`p-2.5 rounded-xl bg-gradient-to-br ${kpi.color} shadow-sm`}>
                              <kpi.icon className="w-5 h-5 text-white" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <motion.div custom={6} variants={cardVariants} initial="hidden" animate="visible">
                    <Card className="border-slate-200 shadow-sm" data-testid="card-revenue-comparison">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                          <Activity className="w-4 h-4 text-indigo-500" />
                          Revenue vs Expenses
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-3">
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-slate-600">Revenue</span>
                              <span className="font-bold text-emerald-600">{formatINR(dashboard.monthlyRevenue || 0)}</span>
                            </div>
                            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all duration-700"
                                style={{ width: `${Math.min(100, ((dashboard.monthlyRevenue || 0) / Math.max(1, (dashboard.monthlyRevenue || 0) + (dashboard.monthlyExpenses || totalExpenseAmount))) * 100)}%` }}
                              />
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-slate-600">Expenses</span>
                              <span className="font-bold text-rose-600">{formatINR(dashboard.monthlyExpenses || totalExpenseAmount)}</span>
                            </div>
                            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-rose-400 to-rose-600 rounded-full transition-all duration-700"
                                style={{ width: `${Math.min(100, ((dashboard.monthlyExpenses || totalExpenseAmount) / Math.max(1, (dashboard.monthlyRevenue || 0) + (dashboard.monthlyExpenses || totalExpenseAmount))) * 100)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                        <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
                          <span className="text-sm text-slate-500">Net Profit</span>
                          <span className={`text-lg font-bold ${(dashboard.netProfit || 0) >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                            {formatINR(dashboard.netProfit || (dashboard.monthlyRevenue || 0) - (dashboard.monthlyExpenses || totalExpenseAmount))}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>

                  <motion.div custom={7} variants={cardVariants} initial="hidden" animate="visible">
                    <Card className="border-slate-200 shadow-sm" data-testid="card-quick-stats">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                          <BarChart3 className="w-4 h-4 text-indigo-500" />
                          Quick Stats
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                            <p className="text-xs text-slate-500">Total Staff</p>
                            <p className="text-xl font-bold text-slate-900" data-testid="value-total-staff">{dashboard.totalStaff || 0}</p>
                          </div>
                          <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                            <p className="text-xs text-slate-500">Total Appointments</p>
                            <p className="text-xl font-bold text-slate-900" data-testid="value-total-appointments">{dashboard.totalAppointments || appointments.length}</p>
                          </div>
                          <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                            <p className="text-xs text-slate-500">High Risk Patients</p>
                            <p className="text-xl font-bold text-rose-600" data-testid="value-high-risk">{highRiskPatients.length}</p>
                          </div>
                          <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                            <p className="text-xs text-slate-500">Expense Categories</p>
                            <p className="text-xl font-bold text-slate-900">{expenseCategories.length}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                </div>
              </div>
            )}

            {activeView === "attendance" && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-slate-900 font-serif" data-testid="text-attendance-title">Staff Attendance</h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { label: "Present Today", value: presentCount, icon: UserCheck, color: "text-emerald-600", bg: "bg-emerald-50" },
                    { label: "Absent Today", value: absentCount, icon: UserX, color: "text-rose-600", bg: "bg-rose-50" },
                    { label: "On Leave Today", value: leaveCount, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
                  ].map((stat, i) => (
                    <motion.div key={stat.label} custom={i} variants={cardVariants} initial="hidden" animate="visible">
                      <Card className="border-slate-200 shadow-sm" data-testid={`card-attendance-stat-${i}`}>
                        <CardContent className="p-4 flex items-center gap-4">
                          <div className={`p-2.5 rounded-xl ${stat.bg}`}>
                            <stat.icon className={`w-5 h-5 ${stat.color}`} />
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">{stat.label}</p>
                            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>

                <Card className="border-slate-200 shadow-sm" data-testid="card-attendance-table">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-bold text-slate-700 uppercase tracking-wider">Attendance Records</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-lg border border-slate-200 overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50">
                            <TableHead className="text-xs font-bold text-slate-500">Employee</TableHead>
                            <TableHead className="text-xs font-bold text-slate-500">Role</TableHead>
                            <TableHead className="text-xs font-bold text-slate-500">Date</TableHead>
                            <TableHead className="text-xs font-bold text-slate-500">Clock In</TableHead>
                            <TableHead className="text-xs font-bold text-slate-500">Clock Out</TableHead>
                            <TableHead className="text-xs font-bold text-slate-500">Hours</TableHead>
                            <TableHead className="text-xs font-bold text-slate-500">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {attendance.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={7} className="text-center py-8 text-slate-400">No attendance records found for this period.</TableCell>
                            </TableRow>
                          ) : (
                            attendance.map((record: any, idx: number) => (
                              <TableRow key={record.id || idx} className="hover:bg-slate-50/50" data-testid={`row-attendance-${idx}`}>
                                <TableCell className="font-medium text-slate-900 text-sm">{record.employeeName}</TableCell>
                                <TableCell className="text-sm text-slate-600">{record.role}</TableCell>
                                <TableCell className="text-sm text-slate-600">{record.date}</TableCell>
                                <TableCell className="text-sm text-slate-600">{record.clockIn || "—"}</TableCell>
                                <TableCell className="text-sm text-slate-600">{record.clockOut || "—"}</TableCell>
                                <TableCell className="text-sm text-slate-600">{record.hoursWorked ? `${record.hoursWorked}h` : "—"}</TableCell>
                                <TableCell>{statusBadge(record.status)}</TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeView === "finance" && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-slate-900 font-serif" data-testid="text-finance-title">Financial Overview</h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { label: "Total Spent This Month", value: formatINR(totalExpenseAmount), color: "text-rose-600", bg: "bg-rose-50", icon: IndianRupee },
                    { label: "Biggest Category", value: biggestCategory ? `${biggestCategory.name} (${formatINR(biggestCategory.total)})` : "N/A", color: "text-violet-600", bg: "bg-violet-50", icon: BarChart3, isString: true },
                    { label: "Avg. Daily Expense", value: formatINR(avgDailyExpense), color: "text-amber-600", bg: "bg-amber-50", icon: TrendingDown },
                  ].map((stat, i) => (
                    <motion.div key={stat.label} custom={i} variants={cardVariants} initial="hidden" animate="visible">
                      <Card className="border-slate-200 shadow-sm" data-testid={`card-finance-stat-${i}`}>
                        <CardContent className="p-4 flex items-center gap-4">
                          <div className={`p-2.5 rounded-xl ${stat.bg}`}>
                            <stat.icon className={`w-5 h-5 ${stat.color}`} />
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">{stat.label}</p>
                            <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  <Card className="border-slate-200 shadow-sm" data-testid="card-category-breakdown">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-bold text-slate-700 uppercase tracking-wider">Category Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {expenseCategories.length === 0 ? (
                        <p className="text-sm text-slate-400 py-4 text-center">No expenses recorded.</p>
                      ) : (
                        expenseCategories.map((cat) => (
                          <button
                            key={cat.name}
                            className={`w-full flex items-center justify-between p-2.5 rounded-lg border transition-colors ${categoryFilter === cat.name ? "border-indigo-300 bg-indigo-50" : "border-slate-100 hover:bg-slate-50"}`}
                            onClick={() => setCategoryFilter(categoryFilter === cat.name ? "all" : cat.name)}
                            data-testid={`btn-category-${cat.name}`}
                          >
                            <Badge className={categoryColors[cat.name] || categoryColors["Other"]}>{cat.name}</Badge>
                            <span className="text-sm font-bold text-slate-700">{formatINR(cat.total)}</span>
                          </button>
                        ))
                      )}
                      {categoryFilter !== "all" && (
                        <Button variant="ghost" size="sm" className="w-full text-xs text-slate-500" onClick={() => setCategoryFilter("all")} data-testid="btn-clear-filter">
                          <Filter className="w-3 h-3 mr-1" /> Clear Filter
                        </Button>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="border-slate-200 shadow-sm lg:col-span-3" data-testid="card-expenses-table">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                          Expenses {categoryFilter !== "all" && <Badge variant="outline" className="ml-2 text-xs">{categoryFilter}</Badge>}
                        </CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="rounded-lg border border-slate-200 overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-slate-50">
                              <TableHead className="text-xs font-bold text-slate-500">Date</TableHead>
                              <TableHead className="text-xs font-bold text-slate-500">Category</TableHead>
                              <TableHead className="text-xs font-bold text-slate-500">Description</TableHead>
                              <TableHead className="text-xs font-bold text-slate-500">Amount</TableHead>
                              <TableHead className="text-xs font-bold text-slate-500">Vendor</TableHead>
                              <TableHead className="text-xs font-bold text-slate-500">Payment</TableHead>
                              <TableHead className="text-xs font-bold text-slate-500">Approved By</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredExpenses.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={7} className="text-center py-8 text-slate-400">No expenses found.</TableCell>
                              </TableRow>
                            ) : (
                              filteredExpenses.map((exp: any, idx: number) => (
                                <TableRow key={exp.id || idx} className="hover:bg-slate-50/50" data-testid={`row-expense-${idx}`}>
                                  <TableCell className="text-sm text-slate-600">{exp.date}</TableCell>
                                  <TableCell><Badge className={categoryColors[exp.category] || categoryColors["Other"]}>{exp.category}</Badge></TableCell>
                                  <TableCell className="text-sm text-slate-900 max-w-[200px] truncate">{exp.description}</TableCell>
                                  <TableCell className="text-sm font-bold text-slate-900">{formatINR(exp.amount)}</TableCell>
                                  <TableCell className="text-sm text-slate-600">{exp.vendor || "—"}</TableCell>
                                  <TableCell className="text-sm text-slate-600">{exp.paymentMethod || "—"}</TableCell>
                                  <TableCell className="text-sm text-slate-600">{exp.approvedBy || "—"}</TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {activeView === "alerts" && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-slate-900 font-serif" data-testid="text-alerts-title">Alerts & Flags</h2>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <motion.div custom={0} variants={cardVariants} initial="hidden" animate="visible">
                    <Card className="border-slate-200 shadow-sm border-l-4 border-l-amber-400" data-testid="card-lab-alerts">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-500" />
                          Lab Report Alerts
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="p-6 bg-amber-50/50 rounded-lg border border-amber-100 text-center">
                          <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
                          <p className="text-sm font-medium text-amber-700" data-testid="text-lab-alert-placeholder">Blood report alerts will appear here</p>
                          <p className="text-xs text-amber-500 mt-1">Pending lab result data integration</p>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>

                  <motion.div custom={1} variants={cardVariants} initial="hidden" animate="visible">
                    <Card className="border-slate-200 shadow-sm border-l-4 border-l-rose-400" data-testid="card-risk-flags">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                          <Shield className="w-4 h-4 text-rose-500" />
                          Patient Risk Flags ({highRiskPatients.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {highRiskPatients.length === 0 ? (
                          <div className="p-6 bg-emerald-50/50 rounded-lg border border-emerald-100 text-center">
                            <p className="text-sm text-emerald-600">No high-risk patients flagged.</p>
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-80 overflow-y-auto">
                            {highRiskPatients.map((p: any, idx: number) => (
                              <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-rose-50/50 border border-rose-100" data-testid={`row-risk-patient-${idx}`}>
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-8 w-8">
                                    <AvatarFallback className="bg-rose-100 text-rose-700 text-xs font-bold">
                                      {(p.name || "?").split(" ").map((w: string) => w[0]).join("").slice(0, 2)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="text-sm font-medium text-slate-900">{p.name}</p>
                                    <p className="text-xs text-slate-500">{p.type || "Patient"} · {p.phone || "No phone"}</p>
                                  </div>
                                </div>
                                <Badge className="bg-rose-100 text-rose-700 border-rose-200">High Risk</Badge>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                </div>
              </div>
            )}

            {activeView === "performance" && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-slate-900 font-serif" data-testid="text-performance-title">Performance Metrics</h2>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <motion.div custom={0} variants={cardVariants} initial="hidden" animate="visible">
                    <Card className="border-slate-200 shadow-sm" data-testid="card-appointments-per-clinician">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                          <Stethoscope className="w-4 h-4 text-indigo-500" />
                          Appointments per Clinician
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {appointmentsByProvider.length === 0 ? (
                          <p className="text-sm text-slate-400 py-4 text-center">No appointment data available.</p>
                        ) : (
                          <div className="space-y-3">
                            {appointmentsByProvider.map((prov, idx) => {
                              const maxCount = appointmentsByProvider[0]?.count || 1;
                              return (
                                <div key={prov.name} className="space-y-1" data-testid={`row-provider-${idx}`}>
                                  <div className="flex justify-between text-sm">
                                    <span className="text-slate-700 font-medium truncate max-w-[200px]">{prov.name}</span>
                                    <span className="font-bold text-indigo-600">{prov.count}</span>
                                  </div>
                                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <motion.div
                                      className="h-full bg-gradient-to-r from-indigo-400 to-indigo-600 rounded-full"
                                      initial={{ width: 0 }}
                                      animate={{ width: `${(prov.count / maxCount) * 100}%` }}
                                      transition={{ duration: 0.6, delay: idx * 0.1 }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>

                  <motion.div custom={1} variants={cardVariants} initial="hidden" animate="visible">
                    <Card className="border-slate-200 shadow-sm" data-testid="card-patient-load">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                          <Users className="w-4 h-4 text-indigo-500" />
                          Patient Load Distribution
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {(() => {
                          const typeCounts: Record<string, number> = {};
                          patients.forEach((p: any) => {
                            const type = p.type || p.mode || "General";
                            typeCounts[type] = (typeCounts[type] || 0) + 1;
                          });
                          const entries = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);
                          const colors = ["bg-indigo-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500", "bg-cyan-500", "bg-violet-500", "bg-pink-500", "bg-teal-500"];
                          const total = patients.length || 1;

                          if (entries.length === 0) return <p className="text-sm text-slate-400 py-4 text-center">No patient data available.</p>;

                          return (
                            <div className="space-y-4">
                              <div className="h-4 rounded-full overflow-hidden flex bg-slate-100">
                                {entries.map(([type, count], i) => (
                                  <motion.div
                                    key={type}
                                    className={`h-full ${colors[i % colors.length]}`}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(count / total) * 100}%` }}
                                    transition={{ duration: 0.6, delay: i * 0.1 }}
                                    title={`${type}: ${count}`}
                                  />
                                ))}
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                {entries.map(([type, count], i) => (
                                  <div key={type} className="flex items-center gap-2 text-sm" data-testid={`legend-type-${i}`}>
                                    <div className={`w-3 h-3 rounded-full ${colors[i % colors.length]}`} />
                                    <span className="text-slate-600 truncate">{type}</span>
                                    <span className="font-bold text-slate-900 ml-auto">{count}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })()}
                      </CardContent>
                    </Card>
                  </motion.div>
                </div>

                <motion.div custom={2} variants={cardVariants} initial="hidden" animate="visible">
                  <Card className="border-slate-200 shadow-sm" data-testid="card-attendance-performance">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                        <Activity className="w-4 h-4 text-indigo-500" />
                        Attendance Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-100 text-center">
                          <p className="text-2xl font-bold text-emerald-600">{presentCount}</p>
                          <p className="text-xs text-emerald-700 mt-1">Present Today</p>
                        </div>
                        <div className="p-4 rounded-lg bg-rose-50 border border-rose-100 text-center">
                          <p className="text-2xl font-bold text-rose-600">{absentCount}</p>
                          <p className="text-xs text-rose-700 mt-1">Absent Today</p>
                        </div>
                        <div className="p-4 rounded-lg bg-amber-50 border border-amber-100 text-center">
                          <p className="text-2xl font-bold text-amber-600">{leaveCount}</p>
                          <p className="text-xs text-amber-700 mt-1">On Leave</p>
                        </div>
                        <div className="p-4 rounded-lg bg-blue-50 border border-blue-100 text-center">
                          <p className="text-2xl font-bold text-blue-600">{attendance.length}</p>
                          <p className="text-xs text-blue-700 mt-1">Total Records</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            )}

            {activeView === "catalog" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 font-serif" data-testid="text-catalog-title">Service Catalog</h2>
                    <p className="text-sm text-slate-500 mt-1">{catalogItems.length} total items in catalog</p>
                  </div>
                  <Button onClick={() => { setShowAddForm(true); }} className="bg-indigo-600 hover:bg-indigo-700" data-testid="btn-add-catalog-item">
                    <Plus className="w-4 h-4 mr-2" /> Add Item
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {[
                    { label: "Total Items", value: catalogItems.length, icon: Package, color: "text-indigo-600", bg: "bg-indigo-50" },
                    { label: "Categories", value: catalogCategories.length, icon: BarChart3, color: "text-violet-600", bg: "bg-violet-50" },
                    { label: "Average Price", value: formatINR(catalogItems.length > 0 ? catalogItems.reduce((s: number, c: any) => s + (c.price || 0), 0) / catalogItems.length : 0), icon: IndianRupee, color: "text-emerald-600", bg: "bg-emerald-50", isString: true },
                    { label: "Active Items", value: catalogItems.filter((c: any) => c.isActive !== false).length, icon: Check, color: "text-cyan-600", bg: "bg-cyan-50" },
                  ].map((stat, i) => (
                    <motion.div key={stat.label} custom={i} variants={cardVariants} initial="hidden" animate="visible">
                      <Card className="border-slate-200 shadow-sm" data-testid={`card-catalog-stat-${i}`}>
                        <CardContent className="p-4 flex items-center gap-4">
                          <div className={`p-2.5 rounded-xl ${stat.bg}`}>
                            <stat.icon className={`w-5 h-5 ${stat.color}`} />
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">{stat.label}</p>
                            <p className={`text-lg font-bold ${stat.color}`}>{stat.isString ? stat.value : stat.value}</p>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>

                <div className="flex items-center gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Search catalog items..."
                      value={catalogSearch}
                      onChange={(e) => setCatalogSearch(e.target.value)}
                      className="pl-10"
                      data-testid="input-catalog-search"
                    />
                  </div>
                  <Select value={catalogCategoryFilter} onValueChange={setCatalogCategoryFilter}>
                    <SelectTrigger className="w-48" data-testid="select-catalog-category-filter">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {catalogCategories.map((cat: any) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {showAddForm && (
                  <motion.div custom={0} variants={cardVariants} initial="hidden" animate="visible">
                    <Card className="border-slate-200 shadow-sm border-l-4 border-l-indigo-400" data-testid="card-add-catalog-item">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-bold text-slate-700 uppercase tracking-wider">Add New Item</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            const form = e.target as HTMLFormElement;
                            const formData = new FormData(form);
                            createCatalogItem.mutate({
                              name: formData.get("name") as string,
                              category: formData.get("category") as string,
                              price: parseFloat(formData.get("price") as string) || 0,
                              taxRate: parseFloat(newItemTaxRate) || 0,
                              hsnCode: formData.get("hsnCode") as string,
                              description: formData.get("description") as string,
                              isActive: true,
                            });
                            setNewItemTaxRate("0");
                          }}
                          className="space-y-4"
                        >
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="text-xs font-medium text-slate-500 mb-1 block">Name *</label>
                              <Input name="name" required placeholder="Service name" data-testid="input-catalog-name" />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-slate-500 mb-1 block">Category *</label>
                              <Input name="category" required placeholder="e.g. Consultation, Lab Test" list="catalog-categories" data-testid="input-catalog-category" />
                              <datalist id="catalog-categories">
                                {catalogCategories.map((cat: any) => (
                                  <option key={cat} value={cat} />
                                ))}
                              </datalist>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-slate-500 mb-1 block">Price (₹) *</label>
                              <Input name="price" type="number" step="0.01" required placeholder="0.00" data-testid="input-catalog-price" />
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="text-xs font-medium text-slate-500 mb-1 block">Tax Rate</label>
                              <Select value={newItemTaxRate} onValueChange={setNewItemTaxRate}>
                                <SelectTrigger data-testid="select-catalog-tax-rate">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="0">0%</SelectItem>
                                  <SelectItem value="5">5%</SelectItem>
                                  <SelectItem value="18">18%</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-slate-500 mb-1 block">HSN Code</label>
                              <Input name="hsnCode" placeholder="HSN/SAC Code" data-testid="input-catalog-hsn" />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-slate-500 mb-1 block">Description</label>
                              <Input name="description" placeholder="Brief description" data-testid="input-catalog-description" />
                            </div>
                          </div>
                          <div className="flex items-center gap-2 justify-end">
                            <Button type="button" variant="ghost" onClick={() => setShowAddForm(false)} data-testid="btn-cancel-add-catalog">
                              <X className="w-4 h-4 mr-1" /> Cancel
                            </Button>
                            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700" disabled={createCatalogItem.isPending} data-testid="btn-save-catalog-item">
                              <Save className="w-4 h-4 mr-1" /> Save
                            </Button>
                          </div>
                        </form>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                <Card className="border-slate-200 shadow-sm" data-testid="card-catalog-table">
                  <CardContent className="p-0">
                    <div className="rounded-lg border border-slate-200 overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50">
                            <TableHead className="text-xs font-bold text-slate-500">Name</TableHead>
                            <TableHead className="text-xs font-bold text-slate-500">Category</TableHead>
                            <TableHead className="text-xs font-bold text-slate-500">Price</TableHead>
                            <TableHead className="text-xs font-bold text-slate-500">Tax Rate</TableHead>
                            <TableHead className="text-xs font-bold text-slate-500">HSN Code</TableHead>
                            <TableHead className="text-xs font-bold text-slate-500">Active</TableHead>
                            <TableHead className="text-xs font-bold text-slate-500">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredCatalog.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={7} className="text-center py-8 text-slate-400">No catalog items found.</TableCell>
                            </TableRow>
                          ) : (
                            filteredCatalog.map((item: any, idx: number) => {
                              const isEditing = editingItem?.id === item.id;
                              const catalogCategoryColors: Record<string, string> = {
                                "Consultation": "bg-indigo-100 text-indigo-700",
                                "Imaging": "bg-cyan-100 text-cyan-700",
                                "Lab Test": "bg-emerald-100 text-emerald-700",
                                "Wellness": "bg-pink-100 text-pink-700",
                                "Procedure": "bg-violet-100 text-violet-700",
                              };
                              const taxBadgeColor = (rate: number) => {
                                if (rate === 0) return "bg-green-100 text-green-700";
                                if (rate === 5) return "bg-amber-100 text-amber-700";
                                if (rate === 18) return "bg-rose-100 text-rose-700";
                                return "bg-slate-100 text-slate-700";
                              };

                              if (isEditing) {
                                return (
                                  <TableRow key={item.id} className="bg-indigo-50/30" data-testid={`row-catalog-edit-${idx}`}>
                                    <TableCell>
                                      <Input
                                        value={editingItem.name}
                                        onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                                        className="h-8 text-sm"
                                        data-testid="input-edit-name"
                                      />
                                    </TableCell>
                                    <TableCell>
                                      <Input
                                        value={editingItem.category}
                                        onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
                                        className="h-8 text-sm"
                                        list="catalog-categories-edit"
                                        data-testid="input-edit-category"
                                      />
                                      <datalist id="catalog-categories-edit">
                                        {catalogCategories.map((cat: any) => (
                                          <option key={cat} value={cat} />
                                        ))}
                                      </datalist>
                                    </TableCell>
                                    <TableCell>
                                      <Input
                                        type="number"
                                        step="0.01"
                                        value={editingItem.price}
                                        onChange={(e) => setEditingItem({ ...editingItem, price: parseFloat(e.target.value) || 0 })}
                                        className="h-8 text-sm w-24"
                                        data-testid="input-edit-price"
                                      />
                                    </TableCell>
                                    <TableCell>
                                      <Select value={String(editingItem.taxRate || 0)} onValueChange={(v) => setEditingItem({ ...editingItem, taxRate: parseFloat(v) })}>
                                        <SelectTrigger className="h-8 text-sm w-20" data-testid="select-edit-tax-rate">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="0">0%</SelectItem>
                                          <SelectItem value="5">5%</SelectItem>
                                          <SelectItem value="18">18%</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </TableCell>
                                    <TableCell>
                                      <Input
                                        value={editingItem.hsnCode || ""}
                                        onChange={(e) => setEditingItem({ ...editingItem, hsnCode: e.target.value })}
                                        className="h-8 text-sm w-24"
                                        data-testid="input-edit-hsn"
                                      />
                                    </TableCell>
                                    <TableCell>
                                      <Badge className={editingItem.isActive !== false ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}>
                                        {editingItem.isActive !== false ? "Active" : "Inactive"}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex items-center gap-1">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7 text-emerald-600 hover:text-emerald-700"
                                          onClick={() => updateCatalogItem.mutate(editingItem)}
                                          disabled={updateCatalogItem.isPending}
                                          data-testid="btn-save-edit"
                                        >
                                          <Check className="w-4 h-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7 text-slate-400 hover:text-slate-600"
                                          onClick={() => setEditingItem(null)}
                                          data-testid="btn-cancel-edit"
                                        >
                                          <X className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                );
                              }

                              return (
                                <TableRow key={item.id} className="hover:bg-slate-50/50" data-testid={`row-catalog-${idx}`}>
                                  <TableCell>
                                    <div>
                                      <p className="text-sm font-medium text-slate-900">{item.name}</p>
                                      {item.description && <p className="text-xs text-slate-400 mt-0.5">{item.description}</p>}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Badge className={catalogCategoryColors[item.category] || "bg-slate-100 text-slate-700"}>{item.category}</Badge>
                                  </TableCell>
                                  <TableCell className="text-sm font-bold text-slate-900">{formatINR(item.price)}</TableCell>
                                  <TableCell>
                                    <Badge className={taxBadgeColor(item.taxRate || 0)}>{item.taxRate || 0}%</Badge>
                                  </TableCell>
                                  <TableCell className="text-sm text-slate-600">{item.hsnCode || "—"}</TableCell>
                                  <TableCell>
                                    <Badge className={item.isActive !== false ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}>
                                      {item.isActive !== false ? "Active" : "Inactive"}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-1">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-slate-400 hover:text-indigo-600"
                                        onClick={() => setEditingItem({ ...item })}
                                        data-testid={`btn-edit-catalog-${idx}`}
                                      >
                                        <Pencil className="w-3.5 h-3.5" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-slate-400 hover:text-rose-600"
                                        onClick={() => { if (confirm("Delete this item?")) deleteCatalogItem.mutate(item.id); }}
                                        data-testid={`btn-delete-catalog-${idx}`}
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

          </div>
        </ScrollArea>
      </main>
    </div>
  );
}
