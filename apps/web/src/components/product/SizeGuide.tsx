const APPAREL = [
  { size: 'XS', uk: '6', us: '2', eu: '34', chest: '80–84', waist: '62–66', hip: '86–90' },
  { size: 'S', uk: '8', us: '4', eu: '36', chest: '85–89', waist: '67–71', hip: '91–95' },
  { size: 'M', uk: '10–12', us: '6–8', eu: '38–40', chest: '90–95', waist: '72–77', hip: '96–101' },
  { size: 'L', uk: '14', us: '10', eu: '42', chest: '96–101', waist: '78–83', hip: '102–107' },
  { size: 'XL', uk: '16', us: '12', eu: '44', chest: '102–108', waist: '84–90', hip: '108–114' },
];

const WAIST = [
  { size: '28', waist: '71', hip: '89' },
  { size: '30', waist: '76', hip: '94' },
  { size: '32', waist: '81', hip: '99' },
  { size: '34', waist: '86', hip: '104' },
  { size: '36', waist: '91', hip: '109' },
];

const SHOES = [
  { eu: '36', uk: '3', us: '5.5' },
  { eu: '38', uk: '5', us: '7.5' },
  { eu: '40', uk: '6.5', us: '9' },
  { eu: '42', uk: '8', us: '10.5' },
  { eu: '44', uk: '9.5', us: '12' },
];

function Table({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-ink">
            {head.map((h) => (
              <th key={h} scope="col" className="py-3 pr-4 text-[0.66rem] font-medium tracking-[0.14em] uppercase">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-stone-200">
              {r.map((c, j) => (
                <td key={j} className="py-3 pr-4 tabular-nums">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SizeGuide({ sizes }: { sizes: string[] }) {
  const isWaist = sizes.every((s) => /^\d{2}$/.test(s)) && sizes.some((s) => Number(s) < 36);
  const isShoe = sizes.every((s) => /^\d{2}$/.test(s)) && !isWaist;
  return (
    <div>
      <p className="eyebrow mb-3 text-stone-500">Size guide</p>
      <h2 className="font-display text-4xl font-light">Find your fit</h2>
      <p className="mt-4 text-sm text-stone-600">Body measurements in centimetres. If you are between sizes, we recommend sizing up for outerwear and down for knitwear.</p>
      <div className="mt-8">
        {isWaist ? (
          <Table head={['Waist size', 'Waist (cm)', 'Hip (cm)']} rows={WAIST.map((r) => [r.size, r.waist, r.hip])} />
        ) : isShoe ? (
          <Table head={['EU', 'UK', 'US']} rows={SHOES.map((r) => [r.eu, r.uk, r.us])} />
        ) : (
          <Table head={['Size', 'UK', 'US', 'EU', 'Chest', 'Waist', 'Hip']} rows={APPAREL.map((r) => [r.size, r.uk, r.us, r.eu, r.chest, r.waist, r.hip])} />
        )}
      </div>
      <p className="mt-6 text-xs text-stone-500">Need help? Our client advisors can recommend a size — contact us any day, 9am to 7pm CET.</p>
    </div>
  );
}
