export function hrtimeToMS(hrtime: number[]) {
  return hrtime[0] * 1000 + hrtime[1] / 1000000;
}
