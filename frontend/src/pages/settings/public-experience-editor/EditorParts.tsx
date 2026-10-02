import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/alert";
import { Label } from "@/components/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/select";
import { Bone } from "@/components/states";

export function StatusMessages({ error, message }: { error: string; message: string }) {
  return (
    <>
      {error ? (
        <Alert variant="destructive" data-status="error">
          <AlertTriangle />
          <AlertDescription className="break-words text-foreground">{error}</AlertDescription>
        </Alert>
      ) : null}
      {message ? (
        <Alert variant="success" role="status" data-status="ok">
          <CheckCircle2 />
          <AlertDescription className="break-words text-foreground">{message}</AlertDescription>
        </Alert>
      ) : null}
    </>
  );
}

export function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

export function ChoiceSelect({ id, value, onChange, options }: { id: string; value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }> }) {
  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger id={id}><SelectValue /></SelectTrigger>
      <SelectContent>
        {options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

export function EditorSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      {[0, 1].map((i) => (
        <div key={i} className="space-y-4 rounded-xl border bg-card p-5 shadow-card">
          <Bone className="h-5 w-48" />
          <Bone className="h-10 w-full max-w-xl" />
          <Bone className="h-32 w-full" />
        </div>
      ))}
    </div>
  );
}
