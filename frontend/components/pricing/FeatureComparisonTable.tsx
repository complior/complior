import { Fragment } from 'react';
import { Check, Minus } from 'lucide-react';

const planNames = ['Free', 'Starter', 'Growth', 'Scale', 'Enterprise'];

interface FeatureRow {
  label: string;
  values: (boolean | string)[];
}

const categories: { title: string; rows: FeatureRow[] }[] = [
  {
    title: 'Core Features',
    rows: [
      { label: 'AI tools tracked', values: ['1', '5', '20', 'Unlimited', 'Unlimited'] },
      { label: 'Team members', values: ['1', '2', '10', 'Unlimited', 'Unlimited'] },
      { label: 'Quick Check', values: [true, true, true, true, true] },
      { label: 'Risk classification', values: ['Basic', 'Full', 'Full', 'Full', 'Full'] },
      { label: 'Compliance timeline', values: [false, true, true, true, true] },
    ],
  },
  {
    title: 'Compliance Tools',
    rows: [
      { label: 'AI Literacy tracking', values: [false, true, true, true, true] },
      { label: 'FRIA (Fundamental Rights Impact Assessment)', values: [false, false, true, true, true] },
      { label: 'Gap analysis', values: [false, false, true, true, true] },
      { label: 'Eva AI assistant queries/mo', values: ['0', '200', '1,000', 'Unlimited', 'Unlimited'] },
      { label: 'Compliance documents', values: [false, false, 'Full', 'Full', 'Full'] },
      { label: 'Compliance badge', values: [false, false, true, true, true] },
    ],
  },
  {
    title: 'Data & Integration',
    rows: [
      { label: 'CSV import', values: [false, 'Basic', 'Full', 'Full', 'Full'] },
      { label: 'CSV tool export', values: [false, false, true, true, true] },
      { label: 'API access', values: [false, false, false, true, true] },
      { label: 'Auto-discovery', values: [false, false, false, true, true] },
      { label: 'Real-time monitoring', values: [false, false, false, true, true] },
    ],
  },
  {
    title: 'Enterprise',
    rows: [
      { label: 'Employee self-registration', values: [false, false, true, true, true] },
      { label: 'On-premise deployment', values: [false, false, false, false, true] },
      { label: 'SLA guarantee', values: [false, false, false, false, true] },
      { label: 'White-label', values: [false, false, false, false, true] },
    ],
  },
];

function CellValue({ value }: { value: boolean | string }) {
  if (typeof value === 'string') {
    return <span className="text-sm text-slate-700">{value}</span>;
  }
  return value ? (
    <Check className="mx-auto h-5 w-5 text-green-600" />
  ) : (
    <Minus className="mx-auto h-5 w-5 text-slate-300" />
  );
}

export function FeatureComparisonTable() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="py-4 pr-4 text-sm font-medium text-slate-500 w-1/3">Feature</th>
            {planNames.map((name) => (
              <th key={name} className="px-2 py-4 text-center text-sm font-semibold text-slate-900">
                {name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {categories.map((cat) => (
            <Fragment key={cat.title}>
              <tr>
                <td
                  colSpan={6}
                  className="pt-6 pb-2 text-sm font-semibold text-slate-900 border-b border-slate-100"
                >
                  {cat.title}
                </td>
              </tr>
              {cat.rows.map((row) => (
                <tr key={row.label} className="border-b border-slate-50">
                  <td className="py-3 pr-4 text-sm text-slate-600">{row.label}</td>
                  {row.values.map((val, i) => (
                    <td key={i} className="px-2 py-3 text-center">
                      <CellValue value={val} />
                    </td>
                  ))}
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
