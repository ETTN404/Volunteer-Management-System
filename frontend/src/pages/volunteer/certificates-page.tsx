import { Copy, Download, ExternalLink, Lock } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { formatDate } from '@/shared/lib/time';
import { formatHours } from '@/shared/lib/format';
import { CERTIFICATE_MILESTONES } from '@/shared/lib/skills';
import { env } from '@/shared/config/env';
import { errorMessage } from '@/shared/api/http';
import { Button, Card, ErrorState, PageHeader, SkeletonCard, Tooltip, notify } from '@/shared/ui';
import { Stagger, StaggerItem } from '@/shared/motion';
import { useImpact, useMyCertificates, volunteerApi } from '@/features/volunteer/api';
import { certificateNumber } from '@/features/public/api';
import { CertificateSeal } from '@/features/certificates/certificate-seal';
import { useSession } from '@/features/auth/use-session';
import type { Certificate } from '@/shared/types/api';

function CertificateCard({ c }: { c: Certificate }) {
  const { user } = useSession();
  const [downloading, setDownloading] = useState(false);
  const number = certificateNumber(c.id);
  const link = `${env.appUrl}/verify/${number}`;

  const download = async () => {
    setDownloading(true);
    try {
      const blob = await volunteerApi.downloadCertificate(c.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${number}.${blob.type.includes('svg') ? 'svg' : 'pdf'}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      notify.error(e, 'The certificate file isn’t ready yet.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Card className="group relative overflow-hidden">
      {/* Certificate face */}
      <div className="relative border-b border-line bg-[linear-gradient(135deg,var(--accent-soft),transparent_60%)] p-6">
        <div className="pointer-events-none absolute -right-10 -top-10 size-44 rounded-full border border-dashed border-accent/30" />
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="type-eyebrow-sm">Certificate of service</p>
            <h3 className="type-headline mt-2 text-2xl text-text">{formatHours(c.milestone_hours)}</h3>
            <p className="mt-1 text-[13px] text-muted">{user?.full_name}</p>
          </div>
          <CertificateSeal hours={c.milestone_hours} size={88} className="transition-transform duration-700 group-hover:rotate-[24deg]" />
        </div>
        <div className="mt-6 flex items-end justify-between gap-4">
          <div className="text-[12.5px] text-muted">
            Issued {formatDate(c.issued_date)}
            <div className="type-data mt-1 text-[11px] text-faint">{number}</div>
          </div>
          <div className="rounded-md bg-white p-1.5">
            <QRCodeSVG value={link} size={56} level="M" fgColor="#0c2426" title={`QR code for ${number} verification page`} />
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 p-3">
        <Button size="sm" variant="secondary" onClick={download} loading={downloading} className="flex-1">
          <Download /> Download
        </Button>
        <Tooltip content="Copy public verification link">
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="Copy verification link"
            onClick={() =>
              navigator.clipboard.writeText(link).then(
                () => notify.success('Verification link copied', link),
                (e) => notify.error(errorMessage(e)),
              )
            }
          >
            <Copy />
          </Button>
        </Tooltip>
        <Tooltip content="Open the public verification page">
          <Button asChild size="icon-sm" variant="ghost" aria-label="Open verification page">
            <Link to={`/verify/${number}`} target="_blank">
              <ExternalLink />
            </Link>
          </Button>
        </Tooltip>
      </div>
    </Card>
  );
}

export default function CertificatesPage() {
  const certs = useMyCertificates();
  const impact = useImpact();
  useEffect(() => {
    document.title = 'Certificates · VolunTrack';
  }, []);
  const earned = new Set((certs.data ?? []).map((c) => c.milestone_hours));
  const locked = CERTIFICATE_MILESTONES.filter((m) => !earned.has(m));
  const hours = impact.data?.total_hours ?? 0;

  return (
    <>
      <PageHeader eyebrow="Certificates" title="Proof of every milestone" description="Each certificate has a public link and QR code so anyone can confirm it — no phone calls needed." />
      {certs.isLoading ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <SkeletonCard key={i} className="h-72" />
          ))}
        </div>
      ) : certs.error ? (
        <ErrorState error={certs.error} onRetry={() => certs.refetch()} />
      ) : (
        <>
          <Stagger className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {certs.data?.map((c) => (
              <StaggerItem key={c.id}>
                <CertificateCard c={c} />
              </StaggerItem>
            ))}
          </Stagger>
          {certs.data?.length === 0 && <p className="mb-6 text-sm text-muted">Your first certificate unlocks at 10 verified hours.</p>}

          <h2 className="type-title mb-4 mt-12 text-lg text-text">Still to earn</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {locked.map((m) => (
              <Card key={m} tone="sunken" className="flex flex-col items-center gap-3 p-5 text-center">
                <CertificateSeal hours={m} size={72} muted />
                <div className="flex items-center gap-1.5 text-[12.5px] text-faint">
                  <Lock className="size-3" /> {formatHours(Math.max(0, m - hours))} to go
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </>
  );
}
