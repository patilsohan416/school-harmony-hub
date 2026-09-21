import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { 
  IdCard, Printer, Search, Eye, Users, RefreshCw, 
  CheckCircle, XCircle, User, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api/client";

interface IDCardData {
  id: string;
  employeeId: string;
  name: string;
  designation: string;
  department: string;
  phone: string;
  email: string;
  profileImage: string | null;
  isActive: boolean;
  cardNumber: string;
  issueDate: string;
  expiryDate: string;
}

export function StaffIDCardPage() {
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [selectedCard, setSelectedCard] = useState<IDCardData | null>(null);
  const [showModal, setShowModal] = useState(false);

  const { data: cards, isLoading, refetch } = useQuery({
    queryKey: ["staff-id-cards"],
    queryFn: async () => {
      console.log("🔄 Fetching staff ID cards...");
      const response = await apiFetch<{ data: IDCardData[] }>(
        "/staff-id-card"
      );
      console.log("✅ Staff ID cards fetched:", response.data?.length || 0);
      return response.data || [];
    },
  });

  const handleSearch = async () => {
    if (!searchInput.trim()) {
      toast.error("Please enter a search term");
      return;
    }

    try {
      const response = await apiFetch<{ data: IDCardData[] }>(
        `/staff-id-card/search?q=${encodeURIComponent(searchInput.trim())}`
      );
      
      if (response.data && response.data.length > 0) {
        setSearch(searchInput.trim());
        toast.success(`Found ${response.data.length} staff members`);
      } else {
        toast.info("No staff members found matching your search");
        setSearch("");
      }
    } catch (error: any) {
      toast.error(error?.message || "Search failed");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const clearSearch = () => {
    setSearchInput("");
    setSearch("");
    refetch();
  };

  // ✅ FIXED: window.open(url) is a plain browser navigation — it can't
  // send an Authorization header, which is why the old code smuggled
  // the token into the URL as `?token=...` and had the backend re-decode
  // it (fragile: wrong localStorage key, invalid token, tenant mismatch
  // all silently broke individual employees' print buttons).
  //
  // Now: fetch the HTML with a normal authenticated request first (same
  // header every other call on this page already uses), THEN open the
  // window and write the already-fetched HTML into it.
  const handlePrint = async (staffId: string) => {
    try {
      const token = localStorage.getItem("access_token");
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

      const response = await fetch(`${apiUrl}/staff-id-card/print/${staffId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        toast.error(body?.message || "Failed to load ID card for printing");
        return;
      }

      const html = await response.text();

      const printWindow = window.open("", "_blank", "width=420,height=650");
      if (!printWindow) {
        toast.error("Please allow pop-ups for this site to print the ID card");
        return;
      }

      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
    } catch (error: any) {
      toast.error(error?.message || "Failed to print ID card");
    }
  };

  const handleView = (card: IDCardData) => {
    setSelectedCard(card);
    setShowModal(true);
  };

  const handleRefresh = () => {
    refetch();
    toast.success("Data refreshed");
  };

  const filteredCards = cards?.filter((card) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      card.employeeId.toLowerCase().includes(searchLower) ||
      card.name.toLowerCase().includes(searchLower) ||
      card.designation.toLowerCase().includes(searchLower) ||
      card.department?.toLowerCase().includes(searchLower)
    );
  }) || [];

  const totalCards = cards?.length || 0;
  const activeCards = cards?.filter(c => c.isActive).length || 0;
  const inactiveCards = cards?.filter(c => !c.isActive).length || 0;

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <IdCard className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Staff ID Card</h1>
            <p className="text-sm text-muted-foreground">
              Manage Staff ID Card records for your school.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border bg-card p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Staff</p>
              <p className="text-2xl font-bold">{totalCards}</p>
            </div>
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Users className="h-5 w-5 text-blue-500" />
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Active</p>
              <p className="text-2xl font-bold text-green-500">{activeCards}</p>
            </div>
            <div className="p-2 rounded-lg bg-green-500/10">
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Inactive</p>
              <p className="text-2xl font-bold text-yellow-500">{inactiveCards}</p>
            </div>
            <div className="p-2 rounded-lg bg-yellow-500/10">
              <XCircle className="h-5 w-5 text-yellow-500" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-4 rounded-lg border p-4">
        <div className="flex-1 min-w-[200px]">
          <Label>Search by name</Label>
          <div className="flex gap-2 mt-1">
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search by employee ID, name, role..."
              className="flex-1"
            />
            <Button variant="secondary" onClick={handleSearch}>
              <Search className="h-4 w-4" />
            </Button>
            {search && (
              <Button variant="ghost" onClick={clearSearch}>
                Clear
              </Button>
            )}
          </div>
        </div>
        <Button onClick={handleRefresh} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : filteredCards.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center rounded-lg border">
          <IdCard className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="text-sm text-muted-foreground">No records yet</p>
          <p className="text-xs text-muted-foreground mt-1">Add staff members to see their ID cards here.</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr>
                <th className="text-left font-medium px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">Employee ID</th>
                <th className="text-left font-medium px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">Name</th>
                <th className="text-left font-medium px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">Role</th>
                <th className="text-left font-medium px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">Issue Date</th>
                <th className="text-right font-medium px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCards.map((card) => (
                <tr key={card.id} className="border-t hover:bg-muted/5 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs">{card.employeeId}</td>
                  <td className="px-4 py-3 font-medium">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                        {card.profileImage ? (
                          <img
                            src={card.profileImage}
                            alt={card.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <User className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      {card.name}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex px-2 py-0.5 rounded-full bg-primary/10 text-xs">
                      {card.designation}
                    </span>
                  </td>
                  <td className="px-4 py-3">{card.issueDate || '-'}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleView(card)}
                        className="h-8 w-8 p-0 hover:bg-blue-50"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4 text-blue-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePrint(card.id)}
                        className="h-8 w-8 p-0 hover:bg-amber-50"
                        title="Print ID Card"
                      >
                        <Printer className="h-4 w-4 text-amber-500" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && selectedCard && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b bg-muted/20">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <IdCard className="h-5 w-5 text-primary" />
                ID Card Details
              </h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowModal(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="p-6 space-y-3">
              <div className="flex justify-center mb-2">
                <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border">
                  {selectedCard.profileImage ? (
                    <img
                      src={selectedCard.profileImage}
                      alt={selectedCard.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <User className="h-8 w-8 text-primary" />
                  )}
                </div>
              </div>

              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Employee ID</span>
                <span className="font-mono text-sm font-medium">{selectedCard.employeeId}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Name</span>
                <span className="font-medium">{selectedCard.name}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Role</span>
                <span className="font-medium">{selectedCard.designation}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Department</span>
                <span className="font-medium">{selectedCard.department || '-'}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Phone</span>
                <span className="font-medium">{selectedCard.phone}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Email</span>
                <span className="font-medium">{selectedCard.email}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Card Number</span>
                <span className="font-mono text-sm">{selectedCard.cardNumber}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Issue Date</span>
                <span className="font-medium">{selectedCard.issueDate}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Expiry Date</span>
                <span className="font-medium">{selectedCard.expiryDate}</span>
              </div>
              <div className="flex justify-between pb-2">
                <span className="text-muted-foreground">Status</span>
                <span className={`font-medium ${
                  selectedCard.isActive ? 'text-green-600' : 'text-yellow-600'
                }`}>
                  {selectedCard.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            <div className="p-6 border-t bg-muted/20 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowModal(false)}>
                Close
              </Button>
              <Button 
                onClick={() => handlePrint(selectedCard.id)} 
                className="gap-2"
              >
                <Printer className="h-4 w-4" /> Print ID Card
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}