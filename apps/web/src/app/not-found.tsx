import { StoreShell } from '@/components/layout/StoreShell';
import { ButtonLink } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <StoreShell>
    <section className="container-site flex min-h-[70vh] flex-col items-center justify-center py-24 text-center">
      <p className="eyebrow mb-6 text-stone-500">Error 404</p>
      <h1 className="font-display text-display font-light">This page has moved on</h1>
      <p className="mt-6 max-w-md text-stone-600">The piece or page you are looking for may have sold out, moved, or never existed. Let us guide you somewhere beautiful instead.</p>
      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <ButtonLink href="/">Return home</ButtonLink>
        <ButtonLink href="/shop?isNew=true" variant="outline">
          New arrivals
        </ButtonLink>
      </div>
    </section>
    </StoreShell>
  );
}
