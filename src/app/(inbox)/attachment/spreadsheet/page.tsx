import MobileBackButton from "@/components/MobileBackButton";
import SpreadsheetViewer from "@/components/SpreadsheetViewer";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{
    blobId?: string;
    name?: string;
    type?: string;
    size?: string;
  }>;
}

export default async function SpreadsheetAttachmentPage({ searchParams }: Props) {
  const { blobId, name, type, size } = await searchParams;

  if (!blobId) return notFound();

  const attachmentName = name ?? "spreadsheet.xlsx";
  const attachmentType =
    type ?? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  const attachmentSize = Number(size ?? "0");
  const encodedName = encodeURIComponent(attachmentName);
  const encodedType = encodeURIComponent(attachmentType);
  const encodedBlobId = encodeURIComponent(blobId);
  const downloadHref = `/api/download?blobId=${encodedBlobId}&name=${encodedName}&type=${encodedType}`;
  const previewHref = `${downloadHref}&inline=true`;

  return (
    <div className="overflow-y-auto h-full bg-stone-50 dark:bg-stone-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8 h-full min-h-0 flex flex-col">
        <MobileBackButton label="Back" />
        <div className="flex-1 min-h-0 rounded-xl overflow-hidden border border-stone-200 dark:border-stone-700 shadow-sm">
          <SpreadsheetViewer
            attachmentName={attachmentName}
            attachmentSize={Number.isFinite(attachmentSize) ? attachmentSize : 0}
            downloadHref={downloadHref}
            previewHref={previewHref}
            chrome="page"
          />
        </div>
      </div>
    </div>
  );
}
