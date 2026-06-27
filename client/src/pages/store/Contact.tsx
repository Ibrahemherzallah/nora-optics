import { useQuery } from '@tanstack/react-query';
import { MapPin, Phone, Clock, Instagram, Facebook } from 'lucide-react';
import { api } from '@/lib/api.ts';

interface Contact {
  storeName: string;
  address?: string;
  phones: string[];
  whatsapp?: string;
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  mapEmbedUrl?: string;
  workingHours?: string;
}

export function Contact() {
  const { data } = useQuery({
    queryKey: ['contact'],
    queryFn: async () => (await api.get<Contact>('/settings/contact')).data,
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">تواصل معنا</h1>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          {data?.address && (
            <Info icon={<MapPin size={20} />} title="العنوان" value={data.address} />
          )}
          {!!data?.phones?.length && (
            <Info icon={<Phone size={20} />} title="الهاتف" value={<span className="nums">{data.phones.join(' / ')}</span>} />
          )}
          {data?.workingHours && (
            <Info icon={<Clock size={20} />} title="ساعات العمل" value={data.workingHours} />
          )}
          <div className="flex gap-3 pt-2">
            {data?.instagram && (
                <a href={data.instagram} target="_blank" rel="noopener noreferrer" className="rounded-xl border border-line p-3 hover:bg-surface" aria-label="إنستغرام">
                  <Instagram size={20} />
                </a>
            )}
            {data?.facebook && (
                <a href={data.facebook} target="_blank" rel="noopener noreferrer" className="rounded-xl border border-line p-3 hover:bg-surface" aria-label="فيسبوك">
                  <Facebook size={20} />
                </a>
            )}
            {data?.tiktok && (
                <a href={data.tiktok} target="_blank" rel="noopener noreferrer" className="rounded-xl border border-line p-3 hover:bg-surface" aria-label="تيك توك">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.19 8.19 0 0 0 4.79 1.53V6.75a4.85 4.85 0 0 1-1.02-.06z"/>
                  </svg>
                </a>
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-line bg-surface">
          {data?.mapEmbedUrl ? (
            <iframe src={data.mapEmbedUrl} title="الخريطة" className="h-full min-h-[260px] w-full" loading="lazy" />
          ) : (
            <div className="flex h-full min-h-[260px] items-center justify-center text-muted">الخريطة غير متوفرة</div>
          )}
        </div>
      </div>
    </div>
  );
}

function Info({ icon, title, value }: { icon: React.ReactNode; title: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-line bg-white p-4">
      <div className="rounded-xl bg-lime/15 p-2.5 text-lime-hover">{icon}</div>
      <div>
        <div className="text-sm text-muted">{title}</div>
        <div className="font-medium">{value}</div>
      </div>
    </div>
  );
}
