export const formatDate = (d: Date): string => {
  const day = d.getUTCDate().toString().padStart(2, '0');
  const month = (d.getUTCMonth() + 1).toString().padStart(2, '0');
  const year = d.getUTCFullYear().toString();
  return `${day}/${month}/${year}`;
};
