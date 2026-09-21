import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch, FILE_BASE_URL } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  FileText,
  Download,
  Trash2,
  Plus,
  BookOpen,
} from "lucide-react";

interface ClassOption {
  id: string;
  name: string;
  sections: { id: string; name: string }[];
}

interface SubjectOption {
  id: string;
  name: string;
  code?: string;
}

interface StudyMaterialItem {
  id: string;
  title: string;
  description?: string | null;
  fileUrl: string;
  fileName: string;
  createdAt: string;
  class?: { id: string; name: string } | null;
  section?: { id: string; name: string } | null;
  subject?: { id: string; name: string } | null;
  uploadedBy?: { id: string; firstName: string; lastName: string } | null;
}

const EMPTY_FORM = {
  title: "",
  description: "",
  classId: "",
  sectionId: "",
  subjectId: "",
};

const ALL_SUBJECTS = "__all__";

// The shared Subject table also holds exam-bookkeeping entries like
// "Art & Craft — Term Exam", "Art & Craft — Unit Test", or
// "Biology — Practical" (auto-created elsewhere, e.g. Marks Entry).
// Study Material only cares about the plain subject name, so filter
// out anything with a " - " / " — " separator in it.
function isPlainSubject(name: string) {
  return !/\s[-—]\s/.test(name);
}

export function StudyMaterialPage() {
  const queryClient = useQueryClient();
  const user = useAuth((s) => s.user);
  const canUpload =
    user?.role === "teacher" ||
    user?.role === "class_teacher" ||
    user?.role === "principal" ||
    user?.role === "vice_principal" ||
    user?.role === "super_admin";

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [file, setFile] = useState<File | null>(null);
  const [subjectFilter, setSubjectFilter] = useState<string>(ALL_SUBJECTS);

  const { data: classes } = useQuery({
    queryKey: ["study-material-classes"],
    queryFn: async () => {
      const res = await apiFetch<{ data: ClassOption[] }>("/timetable/classes");
      return res.data;
    },
  });

  const { data: subjects } = useQuery({
    queryKey: ["study-material-subjects"],
    queryFn: async () => {
      const res = await apiFetch<{ data: SubjectOption[] }>("/timetable/subjects");
      return (res.data || []).filter((s) => isPlainSubject(s.name));
    },
  });

  const { data: materials, isLoading } = useQuery({
    queryKey: ["study-material"],
    queryFn: async () => {
      const res = await apiFetch<{ data: StudyMaterialItem[] }>("/study-material");
      return res.data;
    },
  });

  const selectedClass = classes?.find((c) => c.id === form.classId);

  // Subject-wise filtering: only show materials tagged with the chosen
  // subject, or everything when "All Subjects" is selected.
  const filteredMaterials =
    subjectFilter === ALL_SUBJECTS
      ? materials
      : materials?.filter((item) => item.subject?.id === subjectFilter);

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Please choose a file");
      if (!form.title.trim()) throw new Error("Title is required");

      const body = new FormData();
      body.append("title", form.title);
      if (form.description) body.append("description", form.description);
      if (form.classId) body.append("classId", form.classId);
      if (form.sectionId) body.append("sectionId", form.sectionId);
      if (form.subjectId) body.append("subjectId", form.subjectId);
      body.append("file", file);

      return apiFetch("/study-material", { method: "POST", body });
    },
    onSuccess: () => {
      toast.success("Study material uploaded");
      queryClient.invalidateQueries({ queryKey: ["study-material"] });
      setOpen(false);
      setForm(EMPTY_FORM);
      setFile(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Upload failed");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) =>
      apiFetch(`/study-material/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Deleted");
      queryClient.invalidateQueries({ queryKey: ["study-material"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Delete failed");
    },
  });

  function openFile(fileUrl: string) {
    window.open(`${FILE_BASE_URL}${fileUrl}`, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <BookOpen className="h-6 w-6" />
            Study Material
          </h1>
          <p className="text-sm text-muted-foreground">
            Notes, assignments, and resources shared with students.
          </p>
        </div>
        {canUpload && (
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Upload Material
          </Button>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Label className="text-sm text-muted-foreground whitespace-nowrap">
          Filter by subject
        </Label>
        <Select value={subjectFilter} onValueChange={setSubjectFilter}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="All Subjects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_SUBJECTS}>All Subjects</SelectItem>
            {subjects?.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading && (
          <p className="text-sm text-muted-foreground">Loading...</p>
        )}
        {!isLoading && filteredMaterials?.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {subjectFilter === ALL_SUBJECTS
              ? "No study material uploaded yet."
              : "No study material uploaded for this subject yet."}
          </p>
        )}
        {filteredMaterials?.map((item) => (
          <Card key={item.id}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-start gap-2 text-base">
                <FileText className="h-5 w-5 mt-0.5 shrink-0 text-primary" />
                <span>{item.title}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {item.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {item.description}
                </p>
              )}
              <div className="flex flex-wrap gap-1 text-xs text-muted-foreground">
                {item.class && <span>Class {item.class.name}</span>}
                {item.section && <span>· {item.section.name}</span>}
                {item.subject && <span>· {item.subject.name}</span>}
              </div>
              {item.uploadedBy && (
                <p className="text-xs text-muted-foreground">
                  By {item.uploadedBy.firstName} {item.uploadedBy.lastName}
                </p>
              )}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => openFile(item.fileUrl)}
                  className="flex items-center gap-1.5 text-sm text-primary hover:underline"
                >
                  <Download className="h-4 w-4" />
                  {item.fileName}
                </button>
                {canUpload && (
                  <button
                    type="button"
                    onClick={() => deleteMutation.mutate(item.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Study Material</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Chapter 4 Notes - Photosynthesis"
              />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Brief description of this material"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Class (optional)</Label>
                <Select
                  value={form.classId}
                  onValueChange={(v) =>
                    setForm({ ...form, classId: v, sectionId: "" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Section (optional)</Label>
                <Select
                  value={form.sectionId}
                  onValueChange={(v) => setForm({ ...form, sectionId: v })}
                  disabled={!selectedClass}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select section" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedClass?.sections.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Subject (optional)</Label>
              <Select
                value={form.subjectId}
                onValueChange={(v) => setForm({ ...form, subjectId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects?.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>File</Label>
              <Input
                type="file"
                accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                PDF, Word, PowerPoint, JPG or PNG — up to 15 MB.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => uploadMutation.mutate()}
              disabled={uploadMutation.isPending}
            >
              {uploadMutation.isPending ? "Uploading..." : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}