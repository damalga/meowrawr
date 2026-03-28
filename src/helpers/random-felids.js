export default function(felids, count) {
  if (!felids || !Array.isArray(felids)) return [];

  const shuffled = [...felids].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count || 9);
}
