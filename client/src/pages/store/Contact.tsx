import { useQuery } from '@tanstack/react-query';
import { MapPin, Phone, Clock, Instagram, Facebook } from 'lucide-react';
import { api } from '../../lib/api';

interface Contact {
  storeName: string;
  address?: string;
  phones: string[];
  whatsapp?: string;
  instagram?: string;
  facebook?: string;
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
              <a href={data.instagram} className="rounded-xl border border-line p-3 hover:bg-surface" aria-label="إنستغرام">
                <Instagram size={20} />
              </a>
            )}
            {data?.facebook && (
              <a href={data.facebook} className="rounded-xl border border-line p-3 hover:bg-surface" aria-label="فيسبوك">
                <Facebook size={20} />
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
