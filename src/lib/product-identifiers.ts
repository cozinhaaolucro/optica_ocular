export function validGtin(value: string) {
  if (!/^(?:\d{8}|\d{12}|\d{13}|\d{14})$/.test(value) || /^0+$/.test(value))
    return false;
  const digits = [...value].map(Number);
  const check = digits.pop()!;
  const sum = digits
    .reverse()
    .reduce((n, digit, i) => n + digit * (i % 2 ? 1 : 3), 0);
  return (10 - (sum % 10)) % 10 === check;
}
