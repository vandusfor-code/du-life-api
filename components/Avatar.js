const GRADIENTS = [
  ['#F9A8D4', '#EC4899'],
  ['#93C5FD', '#3B82F6'],
  ['#FCD34D', '#F59E0B'],
  ['#6EE7B7', '#10B981'],
  ['#C4B5FD', '#8B5CF6'],
  ['#FCA5A5', '#EF4444'],
  ['#5EEAD4', '#14B8A6'],
  ['#FFB18B', '#E8927C'],
];

function hashName(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h << 5) - h + name.charCodeAt(i);
  return Math.abs(h);
}

const SIZES = {
  sm: { box: 'w-9 h-9', text: 'text-[14px]' },
  md: { box: 'w-10 h-10', text: 'text-[15px]' },
  lg: { box: 'w-[42px] h-[42px]', text: 'text-[16px]' },
  xl: { box: 'w-14 h-14', text: 'text-[21px]' },
};

export default function Avatar({ name = '', size = 'md' }) {
  const [from, to] = GRADIENTS[hashName(name) % GRADIENTS.length];
  const initials = name.split(' ').slice(0, 2).map(w => w[0] || '').join('').toUpperCase() || '?';
  const s = SIZES[size];

  return (
    <div
      className={`${s.box} ${s.text} rounded-full flex items-center justify-center text-white font-bold flex-shrink-0`}
      style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
    >
      {initials}
    </div>
  );
}