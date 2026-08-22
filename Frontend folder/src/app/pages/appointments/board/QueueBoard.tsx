import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import { Card, CardContent } from "../../../components/ui/card";
import { Pagination } from "../../../components/shared/Pagination";
import { TabsContent } from "../../../components/ui/tabs";
import { ArrowLeft, Bell, MessageSquare, X } from "lucide-react";
import { statusColors, type QueueItem } from "./boardTypes";

export type QueueBoardProps = {
  paginatedQueue: QueueItem[];
  queuePagination: {
    page: number;
    pageSize: number;
    setPage: (page: number) => void;
    setPageSize: (size: number) => void;
  };
  queue: QueueItem[];
  setActiveTab: (tab: string) => void;
  setFilterTypeAndUrl: (value: string) => void;
  setQueue: React.Dispatch<React.SetStateAction<QueueItem[]>>;
  openNotify: (name: string, phone: string) => void;
};

export function QueueBoard({
  paginatedQueue,
  queuePagination,
  queue,
  setActiveTab,
  setFilterTypeAndUrl,
  setQueue,
  openNotify,
}: QueueBoardProps) {
  return (
    <TabsContent value="queue" className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden data-[state=inactive]:hidden">
      <div className="flex shrink-0 items-center gap-3">
        <Button variant="outline" size="sm" className="rounded-xl border-[#d4af37]/40 hover:bg-amber-50" onClick={() => { setActiveTab("timeline"); setFilterTypeAndUrl("walk-in"); }}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <div className="flex-1 flex justify-between items-center">
          <h2 className="text-lg font-semibold">Booking Queue</h2>
          <div className="flex gap-2">
            <Badge className="bg-purple-100 text-purple-700">VIP Priority</Badge>
            <Badge className="bg-orange-100 text-orange-700">Walk-ins</Badge>
          </div>
        </div>
      </div>
      {/* Queue table */}
      <Card className="mt-3 flex min-h-0 flex-1 flex-col overflow-hidden shadow-lg">
        <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
          <div className="min-h-0 flex-1 overflow-auto overscroll-contain">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-[#FAF8F2]">
                  <th className="text-left p-3 font-semibold text-[#3d3d3d]">#</th>
                  <th className="text-left p-3 font-semibold text-[#3d3d3d]">Token</th>
                  <th className="text-left p-3 font-semibold text-[#3d3d3d]">Customer</th>
                  <th className="text-left p-3 font-semibold text-[#3d3d3d]">Phone</th>
                  <th className="text-left p-3 font-semibold text-[#3d3d3d]">Service</th>
                  <th className="text-left p-3 font-semibold text-[#3d3d3d]">Type</th>
                  <th className="text-left p-3 font-semibold text-[#3d3d3d]">Priority</th>
                  <th className="text-left p-3 font-semibold text-[#3d3d3d]">Wait</th>
                  <th className="text-left p-3 font-semibold text-[#3d3d3d]">Status</th>
                  <th className="text-left p-3 font-semibold text-[#3d3d3d]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedQueue.map((q, idx) => (
                  <tr key={q.id} className={`border-b transition-colors hover:bg-amber-50/50 ${idx % 2 === 0 ? "bg-white" : "bg-[#FAFAFA]"}`}>
                    <td className="p-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d] text-white font-bold text-sm">
                        {idx + 1}
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="font-mono bg-[#1a1a1a] text-white text-xs px-2 py-0.5 rounded-md">{q.token}</span>
                    </td>
                    <td className="p-3 font-semibold text-[#1a1a1a]">{q.customer}</td>
                    <td className="p-3 text-muted-foreground text-xs">{q.phone}</td>
                    <td className="p-3 font-medium">{q.service}</td>
                    <td className="p-3"><Badge variant="outline" className="text-xs capitalize">{q.type}</Badge></td>
                    <td className="p-3">
                      {q.priority === "vip"
                        ? <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs">VIP</Badge>
                        : <Badge variant="outline" className="text-xs">Normal</Badge>}
                    </td>
                    <td className="p-3">
                      {q.waitMins > 0 ? <span className="text-orange-600 font-semibold">{q.waitMins}m</span> : <span className="text-green-600">—</span>}
                    </td>
                    <td className="p-3">
                      <Badge className={`${statusColors[q.status]} border text-xs`}>{q.status}</Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        {q.status === "waiting" && (
                          <Button size="sm" className="h-7 text-xs rounded-lg bg-purple-600 hover:bg-purple-700" onClick={() => setQueue(prev => prev.map(x => x.id === q.id ? { ...x, status: "called" as const } : x))}>
                            <Bell className="h-3 w-3 mr-0.5" />Call
                          </Button>
                        )}
                        {q.status === "called" && (
                          <Button size="sm" className="h-7 text-xs rounded-lg bg-blue-600 hover:bg-blue-700" onClick={() => setQueue(prev => prev.map(x => x.id === q.id ? { ...x, status: "in-service" as const, waitMins: 0 } : x))}>
                            Seat
                          </Button>
                        )}
                        <Button size="sm" variant="outline" className="h-7 w-7 p-0 rounded-lg" onClick={() => openNotify(q.customer, q.phone)}><MessageSquare className="h-3 w-3" /></Button>
                        <Button size="sm" variant="outline" className="h-7 w-7 p-0 rounded-lg text-red-500 hover:bg-red-50" onClick={() => setQueue(prev => prev.filter(x => x.id !== q.id))}><X className="h-3 w-3" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="shrink-0 border-t border-black/[0.06] bg-white">
          <Pagination
            page={queuePagination.page}
            pageSize={queuePagination.pageSize}
            totalRecords={queue.length}
            onPageChange={queuePagination.setPage}
            onPageSizeChange={queuePagination.setPageSize}
          />
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  );
}
