import { FileCheck2, FileImage, FileText, Trash2, UploadCloud } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useDropzone, type FileRejection } from 'react-dropzone';
import { cn } from '@/shared/lib/cn';
import { formatDate } from '@/shared/lib/time';
import { errorMessage } from '@/shared/api/http';
import { Badge, Button, Card, EmptyState, ErrorState, Field, FormError, Input, InlineAlert, PageHeader, Select, SkeletonCard, notify } from '@/shared/ui';
import { Stagger, StaggerItem } from '@/shared/motion';
import { DOCUMENT_LIMITS, DOCUMENT_TYPES, useDeleteDocument, useMyDocuments, useUploadDocument } from '@/features/documents/api';
import { useVolunteerProfile } from '@/features/volunteer/api';
import type { DocumentType, VolunteerDocument } from '@/shared/types/api';

const STATUS = {
  pending: { tone: 'warning', label: 'Waiting for review' },
  verified: { tone: 'success', label: 'Verified' },
  rejected: { tone: 'danger', label: 'Not accepted' },
} as const;

const kb = (b: number) => (b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.round(b / 1024)} KB`);

function rejectionText(r: FileRejection) {
  const code = r.errors[0]?.code;
  if (code === 'file-too-large') return `${r.file.name} is ${kb(r.file.size)} — the limit is 2 MB.`;
  if (code === 'file-invalid-type') return `${r.file.name} isn’t a PDF, PNG or JPEG.`;
  return r.errors[0]?.message ?? 'That file can’t be uploaded.';
}

function Uploader({ suggestedType }: { suggestedType?: DocumentType }) {
  const upload = useUploadDocument();
  const [file, setFile] = useState<File | null>(null);
  const [type, setType] = useState<DocumentType>(suggestedType ?? 'certification');
  const [title, setTitle] = useState('');
  const [reject, setReject] = useState<string | null>(null);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: DOCUMENT_LIMITS.accept,
    maxSize: DOCUMENT_LIMITS.maxBytes,
    multiple: false,
    onDrop: (ok, bad) => {
      setReject(bad[0] ? rejectionText(bad[0]) : null);
      if (ok[0]) {
        setFile(ok[0]);
        if (!title) setTitle(ok[0].name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '));
      }
    },
  });

  const submit = () => {
    if (!file) return;
    upload.mutate(
      { file, document_type: type, title: title.trim() || file.name },
      {
        onSuccess: () => {
          notify.success('Document uploaded', 'A coordinator will review it — you’ll get a notification.');
          setFile(null);
          setTitle('');
        },
      },
    );
  };

  return (
    <Card className="p-5 sm:p-6">
      <div
        {...getRootProps()}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors',
          isDragActive ? 'border-accent bg-accent-soft' : 'border-line-strong bg-sunken hover:border-accent/60',
        )}
      >
        <input {...getInputProps()} aria-label="Choose a file" />
        <UploadCloud className={cn('mb-3 size-8', isDragActive ? 'text-accent-text' : 'text-faint')} />
        <p className="text-[15px] font-medium text-text">{file ? file.name : isDragActive ? 'Drop it here' : 'Drag a file here, or click to choose'}</p>
        <p className="mt-1 text-[13px] text-faint">{file ? kb(file.size) : 'PDF, PNG or JPEG · up to 2 MB'}</p>
      </div>
      {reject && (
        <InlineAlert tone="danger" className="mt-4">
          {reject}
        </InlineAlert>
      )}
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field label="Type">
          <Select value={type} onValueChange={(v) => setType(v as DocumentType)} options={DOCUMENT_TYPES.map((t) => ({ value: t.value, label: t.label, hint: t.hint }))} />
        </Field>
        <Field label="Title" hint="So your coordinator knows what it is">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={150} placeholder="e.g. ERCS First Aid Certificate 2025" />
        </Field>
      </div>
      <FormError message={upload.error ? errorMessage(upload.error) : null} />
      <div className="mt-5 flex justify-end">
        <Button onClick={submit} disabled={!file} loading={upload.isPending}>
          <UploadCloud /> Upload document
        </Button>
      </div>
    </Card>
  );
}

function DocumentRow({ d }: { d: VolunteerDocument }) {
  const del = useDeleteDocument();
  const s = STATUS[d.verification_status];
  const Icon = d.mime_type.includes('pdf') ? FileText : FileImage;
  return (
    <Card className="flex items-start gap-4 p-4">
      <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-surface-2 text-muted">
        <Icon className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <a href={d.file_url} target="_blank" rel="noreferrer" className="truncate text-[14.5px] font-medium text-text hover:text-accent-text">
            {d.title}
          </a>
          <Badge tone={s.tone} size="sm" dot>
            {s.label}
          </Badge>
        </div>
        <p className="mt-1 text-[12.5px] text-faint">
          {DOCUMENT_TYPES.find((t) => t.value === d.document_type)?.label} · {kb(d.file_size_bytes)} · uploaded {formatDate(d.created_at)}
        </p>
        {d.coordinator_notes && <p className="mt-2 rounded-md bg-surface-2 px-3 py-2 text-[13px] text-muted">“{d.coordinator_notes}”</p>}
      </div>
      {d.verification_status !== 'verified' && (
        <Button variant="ghost" size="icon-sm" aria-label={`Delete ${d.title}`} loading={del.isPending} onClick={() => del.mutate(d.id, { onSuccess: () => notify.success('Document deleted') })}>
          <Trash2 />
        </Button>
      )}
    </Card>
  );
}

export default function DocumentsPage() {
  const docs = useMyDocuments();
  const profile = useVolunteerProfile();
  useEffect(() => {
    document.title = 'Documents · VolunTrack';
  }, []);
  const v = profile.data?.volunteer;
  const needsConsent = v?.is_minor && !v.parental_consent_verified && !docs.data?.some((d) => d.document_type === 'parental_consent' && d.verification_status !== 'rejected');

  return (
    <>
      <PageHeader eyebrow="Documents" title="Certificates & credentials" description="Upload proof of the skills on your profile. Verified documents unlock shifts that require them." />
      {needsConsent && (
        <InlineAlert tone="warning" className="mb-5" title="Upload your parental consent form">
          You’re under 18, so a signed consent form from a parent or guardian is needed before you can join shifts.
        </InlineAlert>
      )}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Uploader suggestedType={needsConsent ? 'parental_consent' : undefined} />
        <section aria-labelledby="docs-title">
          <h2 id="docs-title" className="type-title mb-4 text-lg text-text">
            Your documents
          </h2>
          {docs.isLoading ? (
            <SkeletonCard className="h-24" />
          ) : docs.error ? (
            <ErrorState error={docs.error} onRetry={() => docs.refetch()} />
          ) : docs.data?.length ? (
            <Stagger className="space-y-3">
              {docs.data.map((d) => (
                <StaggerItem key={d.id}>
                  <DocumentRow d={d} />
                </StaggerItem>
              ))}
            </Stagger>
          ) : (
            <EmptyState compact icon={<FileCheck2 />} title="No documents yet" description="Start with a certificate for your strongest skill." />
          )}
        </section>
      </div>
    </>
  );
}
