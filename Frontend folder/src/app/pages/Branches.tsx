import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { useNavigate } from "react-router";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  Building2, Plus, TrendingUp, Users, IndianRupee, MapPin,
  Phone, Clock, Star, Calendar, BarChart3, CheckCircle
} from "lucide-react";
import { Pagination } from "../components/shared/Pagination";
import { useTablePagination } from "../hooks/useTablePagination";
import { SEGMENTED_PILL_LIST, SEGMENTED_PILL_TRIGGER } from "../components/layout/segmented-nav";

interface Branch {
  id: number;
  name: string;
  location: string;
  phone: string;
  manager: string;
  staff: number;
  chairs: number;
  status: string;
  revenue: string;
  revNum: number;
  appointments: number;
  rating: number;
  growth: string;
  hours: string;
  color: string;
  services: number;
  topService: string;
}

const branches: Branch[] = [];


const colorMap: Record<string, string> = {
  purple: "from-purple-500 to-purple-800",
  blue: "from-blue-500 to-blue-800",
  green: "from-green-500 to-green-700",
  yellow: "from-yellow-500 to-yellow-700",
  pink: "from-pink-500 to-pink-700",
};


export function Branches() {
  const navigate = useNavigate();
  const { page, setPage, pageSize, setPageSize, paginate } = useTablePagination(branches.length);
  const paginatedBranches = useMemo(() => paginate(branches), [paginate]);
  const [selected, setSelected] = useState<number | null>(null);

  const totalRevenue = branches.reduce((s, b) => s + b.revNum, 0);
  const totalStaff = branches.reduce((s, b) => s + b.staff, 0);
  const totalAppts = branches.reduce((s, b) => s + b.appointments, 0);
  const avgRating = (branches.reduce((s, b) => s + b.rating, 0) / branches.length).toFixed(1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[#8b5cf6] to-[#10b981] bg-clip-text text-transparent">
            Branch Management
          </h1>
          <p className="text-muted-foreground mt-1">Multi-location business overview & performance comparison</p>
        </div>
        <Button className="bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] shadow-lg shadow-purple-500/30" onClick={() => navigate('/branches/new')}>
          <Plus className="h-4 w-4 mr-2" />
          Add Branch
        </Button>
      </div>

      {/* Network KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Total Branches", value: "5", sub: "4 active, 1 closed today", icon: Building2, card: "border-purple-200 bg-gradient-to-br from-purple-50 to-white", val: "text-[#8b5cf6]" },
          { label: "Network Revenue", value: `₹${(totalRevenue / 100000).toFixed(1)}L`, sub: "This month", icon: IndianRupee, card: "border-green-200 bg-gradient-to-br from-green-50 to-white", val: "text-green-600" },
          { label: "Total Staff", value: String(totalStaff), sub: "Across all branches", icon: Users, card: "border-blue-200 bg-gradient-to-br from-blue-50 to-white", val: "text-blue-600" },
          { label: "Network Avg Rating", value: `${avgRating}★`, sub: "Exceptional quality", icon: Star, card: "border-yellow-200 bg-gradient-to-br from-yellow-50 to-white", val: "text-[#d4af37]" },
        ].map(s => (
          <Card key={s.label} className={`border-2 ${s.card}`}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                  <p className={`text-2xl font-bold ${s.val}`}>{s.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{s.sub}</p>
                </div>
                <s.icon className={`h-10 w-10 opacity-20 ${s.val}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="overview">
        <TabsList className={SEGMENTED_PILL_LIST}>
          <TabsTrigger value="overview" className={SEGMENTED_PILL_TRIGGER}>Branch Overview</TabsTrigger>
          <TabsTrigger value="compare" className={SEGMENTED_PILL_TRIGGER}>Comparison</TabsTrigger>
          <TabsTrigger value="details" className={SEGMENTED_PILL_TRIGGER}>Detailed View</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {branches.map((branch, index) => (
              <Card
                key={branch.id}
                onClick={() => setSelected(selected === branch.id ? null : branch.id)}
                className={`shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer border-2 ${selected === branch.id ? "border-[#8b5cf6] ring-2 ring-[#8b5cf6]/20" : "border-border hover:border-purple-200"}`}
              >
                <CardContent className="pt-6">
                  {/* Branch Header */}
                  <div className="flex items-start gap-3 mb-4">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${colorMap[branch.color]} text-white text-lg font-bold flex-shrink-0 shadow-lg`}>
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-base truncate">{branch.name}</h3>
                        {index === 0 && (
                          <Badge className="bg-[#d4af37] text-white text-xs hover:bg-[#d4af37]">Top Branch</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <MapPin className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{branch.location}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className={`text-xs flex items-center gap-1 ${branch.status === "open" ? "text-green-600" : "text-red-500"}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${branch.status === "open" ? "bg-green-500" : "bg-red-500"}`} />
                          {branch.status === "open" ? "Open Now" : "Closed"}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {branch.hours}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="text-center bg-muted/30 rounded-lg p-2">
                      <p className="font-bold text-sm text-[#8b5cf6]">{branch.revenue}</p>
                      <p className="text-xs text-muted-foreground">Revenue</p>
                    </div>
                    <div className="text-center bg-muted/30 rounded-lg p-2">
                      <p className="font-bold text-sm">{branch.appointments}</p>
                      <p className="text-xs text-muted-foreground">Appointments</p>
                    </div>
                    <div className="text-center bg-muted/30 rounded-lg p-2">
                      <p className="font-bold text-sm text-[#d4af37]">{branch.rating}★</p>
                      <p className="text-xs text-muted-foreground">Rating</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm text-muted-foreground pb-3 border-b border-border">
                    <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {branch.staff} staff</span>
                    <span className="flex items-center gap-1"><Scissors className="h-3.5 w-3.5" /> {branch.services} services</span>
                    <span className={`flex items-center gap-1 font-semibold ${branch.growth.startsWith("+") ? "text-green-600" : "text-red-500"}`}>
                      <TrendingUp className="h-3.5 w-3.5" /> {branch.growth}
                    </span>
                  </div>

                  <div className="flex gap-2 mt-3">
                    <Button size="sm" variant="outline" className="flex-1 text-xs border-[#8b5cf6] text-[#8b5cf6] hover:bg-[#8b5cf6] hover:text-white" onClick={() => navigate('/reports')}>
                      <BarChart3 className="h-3 w-3 mr-1" /> Reports
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => navigate('/employees')}>
                      <Users className="h-3 w-3 mr-1" /> Staff
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Add Branch Card */}
            <Card className="shadow-md border-2 border-dashed border-purple-200 hover:border-[#8b5cf6] transition-colors cursor-pointer bg-gradient-to-br from-purple-50 to-white">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center h-full py-8 gap-3 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl border-2 border-dashed border-[#8b5cf6] text-[#8b5cf6]">
                    <Plus className="h-7 w-7" />
                  </div>
                  <div>
                    <p className="font-semibold text-[#8b5cf6]">Open New Branch</p>
                    <p className="text-sm text-muted-foreground mt-1">Expand your business to a new location</p>
                  </div>
                  <Button size="sm" className="bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] mt-2" onClick={() => navigate('/branches/new')}>
                    Get Started
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Comparison Tab */}
        <TabsContent value="compare" className="mt-4 space-y-4">
          {/* Branch Rankings */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-base">Branch Rankings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {branches
                  .sort((a, b) => b.revNum - a.revNum)
                  .map((branch, index) => (
                    <div key={branch.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted/30 transition-colors">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-xl font-bold text-white text-sm flex-shrink-0 bg-gradient-to-br ${colorMap[branch.color]}`}>
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-semibold text-sm truncate">{branch.name}</p>
                          <p className="font-bold text-green-600 text-sm ml-2">{branch.revenue}</p>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div
                            className="h-2 rounded-full bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed]"
                            style={{ width: `${(branch.revNum / 892400) * 100}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-[#d4af37] font-semibold text-sm">{branch.rating}★</p>
                        <p className="text-green-600 text-xs">{branch.growth}</p>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Detailed View Tab */}
        <TabsContent value="details" className="mt-4">
          <Card className="shadow-lg">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Branch</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Manager</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-muted-foreground">Staff</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-muted-foreground">Appts</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-muted-foreground">Revenue</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-muted-foreground">Rating</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-muted-foreground">Growth</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedBranches.map(branch => (
                      <tr key={branch.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className={`h-2.5 w-2.5 rounded-full bg-gradient-to-br ${colorMap[branch.color]}`} />
                            <div>
                              <p className="font-semibold text-sm">{branch.name}</p>
                              <p className="text-xs text-muted-foreground">{branch.location}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm">{branch.manager}</td>
                        <td className="py-3 px-4 text-center text-sm">{branch.staff}</td>
                        <td className="py-3 px-4 text-center text-sm">{branch.appointments}</td>
                        <td className="py-3 px-4 text-right font-semibold text-sm text-green-600">{branch.revenue}</td>
                        <td className="py-3 px-4 text-center text-[#d4af37] font-semibold text-sm">{branch.rating}★</td>
                        <td className="py-3 px-4 text-center text-green-600 font-semibold text-sm">{branch.growth}</td>
                        <td className="py-3 px-4 text-center">
                          <Badge className={branch.status === "open" ? "bg-green-100 text-green-700 hover:bg-green-100" : "bg-gray-100 text-gray-600"}>
                            {branch.status === "open" ? "Open" : "Closed"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                page={page}
                pageSize={pageSize}
                totalRecords={branches.length}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Missing import
function Scissors({ className }: { className?: string }) {
  return <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>;
}
