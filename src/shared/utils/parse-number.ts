export const parseNumber = (value: string): number => {
  return parseInt(value.trim().replaceAll(',', ''));
};
