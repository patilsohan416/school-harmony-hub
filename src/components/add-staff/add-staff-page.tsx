import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { 
  Loader2, Pencil, Trash2, X, UserPlus, Search, 
  Camera, User, Copy, CheckCircle2
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api/client";

const GENDER_OPTIONS = ["MALE", "FEMALE", "OTHER"];
const DESIGNATION_OPTIONS = [
  "Principal",
  "Vice Principal",
  "Head Teacher",
  "Senior Teacher",
  "Teacher",
  "Assistant Teacher",
  "Subject Teacher",
  "Computer Teacher",
  "Sports Teacher",
  "Librarian",
  "Lab Assistant",
  "Accountant",
  "Clerk",
  "Receptionist",
  "Office Superintendent",
  "Peon",
  "Other",
];

interface StaffMember {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  email: string;
  phone: string;
  joiningDate: string;
  designation: string;
  department?: string;
  isActive: boolean;
  profileImage?: string | null;
  credentials?: { email: string; tempPassword: string };
}

interface FormState {
  firstName: string;
  lastName: string;
  employeeId: string;
  designation: string;
  department: string;
  phone: string;
  email: string;
  password: string;
  dateOfBirth: string;
  gender: string;
  joiningDate: string;
  profileImage: File | null;
  profileImagePreview: string | null;
}

const EMPTY_FORM: FormState = {
  firstName: "",
  lastName: "",
  employeeId: "",
  designation: "",
  department: "",
  phone: "",
  email: "",
  password: "",
  dateOfBirth: "",
  gender: "",
  joiningDate: "",
  profileImage: null,
  profileImagePreview: null,
};

// Common keys different parts of an app might use to store the auth token.
// We check all of them so a mismatch between login code and this component
// doesn't silently produce a 401.
const TOKEN_KEYS = ["token", "accessToken", "authToken", "auth_token", "access_token"];

function getStoredToken(): string | null {
  for (const key of TOKEN_KEYS) {
    const value = localStorage.getItem(key);
    if (value && value.trim() && value !== "undefined" && value !== "null") {
      return value;
    }
  }
  return null;
}

function calculateAge(dateOfBirth: string): number {
  const dob = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

export function AddStaffPage() {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<StaffMember | null>(null);
  const [search, setSearch] = useState("");
  const [newCredentials, setNewCredentials] = useState<{ email: string; tempPassword: string; name: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["staff-list"],
    queryFn: async () => {
      try {
        const response = await apiFetch<{ data: StaffMember[]; pagination?: any }>(
          "/staff?limit=100&sortBy=createdAt&sortOrder=desc"
        );
        return response.data || [];
      } catch (error) {
        console.warn("⚠️ Backend not available:", error);
        return [];
      }
    },
  });

  const staff = data || [];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleGenderChange = (value: string) => {
    setFormData({ ...formData, gender: value });
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload a valid image file');
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Image size must be less than 2MB');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({
          ...formData,
          profileImage: file,
          profileImagePreview: reader.result as string,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    setFormData({
      ...formData,
      profileImage: null,
      profileImagePreview: null,
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const resetForm = () => {
    setFormData(EMPTY_FORM);
    setEditingId(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const startEdit = (member: StaffMember) => {
    setEditingId(member.id);
    setFormData({
      firstName: member.firstName || "",
      lastName: member.lastName || "",
      employeeId: member.employeeId || "",
      designation: member.designation || "",
      department: member.department || "",
      phone: member.phone || "",
      email: member.email || "",
      password: "",
      dateOfBirth: member.dateOfBirth ? member.dateOfBirth.slice(0, 10) : "",
      gender: member.gender || "",
      joiningDate: member.joiningDate ? member.joiningDate.slice(0, 10) : "",
      profileImage: null,
      profileImagePreview: member.profileImage || null,
    });
  };

  const validate = (): boolean => {
    if (!formData.firstName.trim()) {
      toast.error("First name is required");
      return false;
    }
    if (!formData.lastName.trim()) {
      toast.error("Last name is required");
      return false;
    }
    if (!formData.designation.trim()) {
      toast.error("Designation is required");
      return false;
    }
    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast.error("A valid email is required");
      return false;
    }
    if (!formData.phone.trim() || !/^[0-9]{10}$/.test(formData.phone)) {
      toast.error("Phone must be 10 digits");
      return false;
    }
    if (!formData.dateOfBirth) {
      toast.error("Date of birth is required");
      return false;
    }
    if (!formData.gender) {
      toast.error("Gender is required");
      return false;
    }
    if (!formData.joiningDate) {
      toast.error("Joining date is required");
      return false;
    }

    const age = calculateAge(formData.dateOfBirth);
    if (age < 18) {
      toast.error(`Staff must be at least 18 years old. Current age: ${age}`);
      return false;
    }
    if (age > 65) {
      toast.error(`Staff age exceeds maximum allowed (65 years). Current age: ${age}`);
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setSaving(true);
    try {
      const token = getStoredToken();

      if (!token) {
        toast.error("Your session has expired. Please log in again.");
        setSaving(false);
        // Adjust this route to match your actual login page.
        window.location.href = "/login";
        return;
      }

      const formDataToSend = new FormData();
      formDataToSend.append('firstName', formData.firstName);
      formDataToSend.append('lastName', formData.lastName);
      if (formData.employeeId) formDataToSend.append('employeeId', formData.employeeId);
      formDataToSend.append('designation', formData.designation);
      if (formData.department) formDataToSend.append('department', formData.department);
      formDataToSend.append('phone', formData.phone);
      formDataToSend.append('email', formData.email);
      if (formData.password.trim()) {
        formDataToSend.append('password', formData.password.trim());
      }
      formDataToSend.append('dateOfBirth', formData.dateOfBirth);
      formDataToSend.append('gender', formData.gender);
      formDataToSend.append('joiningDate', formData.joiningDate);
      if (formData.profileImage) {
        formDataToSend.append('profileImage', formData.profileImage);
      }

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
      const url = editingId ? `${apiUrl}/staff/${editingId}` : `${apiUrl}/staff`;
      const method = editingId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          // Do NOT set Content-Type here — the browser sets the correct
          // multipart/form-data boundary automatically for FormData bodies.
        },
        body: formDataToSend,
      });

      if (response.status === 401) {
        toast.error("Your session has expired. Please log in again.");
        for (const key of TOKEN_KEYS) localStorage.removeItem(key);
        setSaving(false);
        window.location.href = "/login";
        return;
      }

      if (!response.ok) {
        let message = "Failed to save staff member";
        try {
          const errorData = await response.json();
          message = errorData.message || message;
        } catch {
          // response wasn't JSON — keep default message
        }
        throw new Error(message);
      }

      const saved = await response.json();

      toast.success(editingId ? "Staff member updated successfully" : "Staff member added successfully");

      const credentials = saved?.data?.credentials;
      if (!editingId && credentials?.tempPassword) {
        setNewCredentials({
          email: credentials.email,
          tempPassword: credentials.tempPassword,
          name: `${formData.firstName} ${formData.lastName}`.trim(),
        });
      }

      await refetch();
      resetForm();
    } catch (err: any) {
      console.error("❌ Error:", err);
      toast.error(err?.message || "Failed to save staff member");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await apiFetch(`/staff/${deleting.id}`, { method: "DELETE" });
      toast.success("Staff member deleted successfully");
      await refetch();
      setDeleting(null);
      if (editingId === deleting.id) resetForm();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete staff member");
    }
  };

  const filteredStaff = staff.filter((member) =>
    member.firstName.toLowerCase().includes(search.toLowerCase()) ||
    member.lastName.toLowerCase().includes(search.toLowerCase()) ||
    (member.employeeId || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">
            {editingId ? "Edit Staff" : "Add Staff"}
          </h1>
          {editingId && (
            <Button variant="ghost" size="sm" onClick={resetForm} className="gap-1">
              <X className="h-4 w-4" /> Cancel edit
            </Button>
          )}
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-lg border bg-card p-6 space-y-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label>Profile Photo</Label>
              <div className="mt-2 flex items-center gap-4">
                <div className="relative">
                  {formData.profileImagePreview ? (
                    <div className="relative">
                      <img
                        src={formData.profileImagePreview}
                        alt="Profile"
                        className="w-24 h-24 rounded-full object-cover border-2 border-primary/20"
                      />
                      <button
                        type="button"
                        onClick={removePhoto}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center border-2 border-dashed border-muted-foreground/30">
                      <User className="h-10 w-10 text-muted-foreground/50" />
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                    id="photo-upload"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="gap-2"
                  >
                    <Camera className="h-4 w-4" />
                    {formData.profileImagePreview ? "Change Photo" : "Upload Photo"}
                  </Button>
                  {formData.profileImagePreview && (
                    <span className="text-xs text-muted-foreground">
                      Click on the X to remove photo
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    JPG, PNG, WEBP (Max 2MB)
                  </span>
                </div>
              </div>
            </div>

            <div>
              <Label>First Name *</Label>
              <Input
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                className="mt-2"
                required
              />
            </div>

            <div>
              <Label>Last Name *</Label>
              <Input
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                className="mt-2"
                required
              />
            </div>

            <div>
              <Label>Employee ID</Label>
              <Input
                name="employeeId"
                value={formData.employeeId}
                onChange={handleChange}
                className="mt-2"
                placeholder="Auto-generated if empty"
              />
            </div>

            <div>
              <Label>Designation *</Label>
              <Select
                value={formData.designation}
                onValueChange={(value) =>
                  setFormData({ ...formData, designation: value })
                }
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select designation" />
                </SelectTrigger>
                <SelectContent>
                  {DESIGNATION_OPTIONS.map((designation) => (
                    <SelectItem key={designation} value={designation}>
                      {designation}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Department</Label>
              <Input
                name="department"
                value={formData.department}
                onChange={handleChange}
                className="mt-2"
                placeholder="e.g. Science, Math"
              />
            </div>

            <div>
              <Label>Phone *</Label>
              <Input
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="mt-2"
                placeholder="10 digit phone number"
                maxLength={10}
                required
              />
            </div>

            <div>
              <Label>Date of Birth *</Label>
              <Input
                type="date"
                name="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={handleChange}
                className="mt-2"
                required
              />
            </div>

            <div>
              <Label>Gender *</Label>
              <Select value={formData.gender} onValueChange={handleGenderChange}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  {GENDER_OPTIONS.map((g) => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Joining Date *</Label>
              <Input
                type="date"
                name="joiningDate"
                value={formData.joiningDate}
                onChange={handleChange}
                className="mt-2"
                required
              />
            </div>

            <div className="md:col-span-2">
              <Label>Email *</Label>
              <Input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="mt-2"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                This is also their login email for the school dashboard (they'll sign in with the "{formData.designation || "role"}" option).
              </p>
            </div>

            {!editingId && (
              <div className="md:col-span-2">
                <Label>Login Password</Label>
                <Input
                  type="text"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="mt-2"
                  placeholder="Leave blank to use the default password (123456)"
                  autoComplete="off"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Optional — if left blank, the default password "123456" is used, and shown once after saving so you can share it with them.
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            {editingId && (
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancel
              </Button>
            )}
            <Button 
              type="submit" 
              disabled={saving} 
              className="gap-2"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              {saving ? "Saving…" : editingId ? "Update Staff" : "Add Staff"}
            </Button>
          </div>
        </form>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Staff</h2>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search staff..."
                className="pl-9"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="text-left font-medium px-3 py-2">Photo</th>
                    <th className="text-left font-medium px-3 py-2">Employee ID</th>
                    <th className="text-left font-medium px-3 py-2">Name</th>
                    <th className="text-left font-medium px-3 py-2">Designation</th>
                    <th className="text-left font-medium px-3 py-2">Department</th>
                    <th className="text-left font-medium px-3 py-2">Phone</th>
                    <th className="text-left font-medium px-3 py-2">Email</th>
                    <th className="text-right font-medium px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStaff.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-muted-foreground">
                        {search ? "No staff found matching your search" : "No staff members found"}
                      </td>
                    </tr>
                  ) : (
                    filteredStaff.map((member: StaffMember) => (
                      <tr key={member.id} className="border-t hover:bg-muted/20">
                        <td className="px-3 py-2">
                          {member.profileImage ? (
                            <img
                              src={member.profileImage}
                              alt={member.firstName}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                              <User className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs">{member.employeeId || "-"}</td>
                        <td className="px-3 py-2 font-medium">
                          {member.firstName} {member.lastName}
                        </td>
                        <td className="px-3 py-2">{member.designation || "-"}</td>
                        <td className="px-3 py-2">{member.department || "-"}</td>
                        <td className="px-3 py-2">{member.phone || "-"}</td>
                        <td className="px-3 py-2">{member.email || "-"}</td>
                        <td className="px-3 py-2 text-right space-x-1">
                          <Button variant="ghost" size="sm" onClick={() => startEdit(member)}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => setDeleting(member)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this staff member?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes {deleting?.firstName} {deleting?.lastName} from the staff records.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!newCredentials} onOpenChange={(o) => !o && setNewCredentials(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-success" />
              Login created for {newCredentials?.name}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Share these one-time credentials with them so they can sign in to the
              dashboard. This password won't be shown again — reset it from their
              profile if it's lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Email</p>
              <p className="font-mono text-sm">{newCredentials?.email}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Password</p>
              <p className="font-mono text-sm">{newCredentials?.tempPassword}</p>
            </div>
          </div>
          <AlertDialogFooter>
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={() => {
                if (newCredentials) {
                  navigator.clipboard.writeText(
                    `Email: ${newCredentials.email}\nPassword: ${newCredentials.tempPassword}`
                  );
                  toast.success("Credentials copied to clipboard");
                }
              }}
            >
              <Copy className="h-4 w-4" /> Copy
            </Button>
            <AlertDialogAction onClick={() => setNewCredentials(null)}>Done</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default AddStaffPage;