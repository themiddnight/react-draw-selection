// แปลงอาร์เรย์ของ Boolean เป็นเลขฐานสิบ
export function booleanArrayToDecimal(booleanArray: boolean[]): number {
  if (booleanArray.length !== 22) {
    throw new Error("อาร์เรย์ต้องมีขนาด 22 บิต");
  }

  let decimal = 0;
  for (let i = 0; i < 22; i++) {
    if (booleanArray[i]) {
      decimal += Math.pow(2, 21 - i);
    }
  }
  return decimal;
}

// แปลงเลขฐานสิบเป็นอาร์เรย์ของ Boolean ขนาด 22 บิต
export function decimalToBooleanArray(decimal: number): boolean[] {
  if (decimal < 0 || decimal >= Math.pow(2, 22)) {
    throw new Error("เลขฐานสิบต้องอยู่ในช่วง 0 ถึง 4194303");
  }

  const booleanArray = [];
  for (let i = 21; i >= 0; i--) {
    if (decimal >= Math.pow(2, i)) {
      booleanArray.push(true);
      decimal -= Math.pow(2, i);
    } else {
      booleanArray.push(false);
    }
  }
  return booleanArray;
}