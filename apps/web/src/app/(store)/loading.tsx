/** Elegant skeleton shown while a route's server data loads. */
export default function Loading() {
  return (
    <div className="container-site py-16" role="status" aria-busy="true" aria-label="Loading">
      <div className="skeleton mb-4 h-3 w-24" />
      <div className="skeleton mb-12 h-12 w-80 max-w-full" />
      <div className="grid grid-cols-2 gap-x-6 gap-y-12 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i}>
            <div className="skeleton aspect-[3/4] w-full" />
            <div className="skeleton mt-4 h-3 w-3/4" />
            <div className="skeleton mt-2 h-3 w-1/3" />
          </div>
        ))}
      </div>
    </div>
  );
}
