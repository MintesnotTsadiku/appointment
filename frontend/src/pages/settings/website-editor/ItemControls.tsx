import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";

import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/alert-dialog";
import { Button } from "@/components/button";
import { useTranslation } from "@/lib/i18n";
import { fill } from "@/pages/manage-booking/format";

interface Props {
  index: number;
  count: number;
  name: string;
  onMove: (to: number) => void;
  onRemove: () => void;
  qa?: string;
}

/** Move up, move down and remove (after a confirmation) for one list item. */
export function ItemControls({ index, count, name, onMove, onRemove, qa }: Props) {
  const { t } = useTranslation();
  return <div className="ml-auto flex shrink-0 items-center gap-1">
    <Button type="button" variant="ghost" size="icon" className="size-9" disabled={index === 0} data-qa={qa ? `${qa}-up` : undefined}
      aria-label={fill(t("staff.website.editor.moveUp"), name)} onClick={() => onMove(index - 1)}><ArrowUp /></Button>
    <Button type="button" variant="ghost" size="icon" className="size-9" disabled={index === count - 1} data-qa={qa ? `${qa}-down` : undefined}
      aria-label={fill(t("staff.website.editor.moveDown"), name)} onClick={() => onMove(index + 1)}><ArrowDown /></Button>
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="ghost" size="icon" className="size-9 text-destructive hover:text-destructive" data-qa={qa ? `${qa}-remove` : undefined}
          aria-label={fill(t("staff.website.editor.removeItem"), name)}><Trash2 /></Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{fill(t("staff.website.editor.removeTitle"), name)}</AlertDialogTitle>
          <AlertDialogDescription>{t("staff.website.editor.removeBody")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("staff.website.editor.keep")}</AlertDialogCancel>
          <AlertDialogAction data-qa="website-editor-confirm-remove" className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={onRemove}>{t("staff.website.editor.remove")}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>;
}
