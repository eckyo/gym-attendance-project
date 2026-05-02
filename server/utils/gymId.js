export const generateGymMemberId = (counter, packageCode = null) => {
  if (packageCode) {
    return packageCode.toUpperCase() + String(counter).padStart(4, '0');
  }
  const letterIndex = Math.floor((counter - 1) / 9999);
  const number = ((counter - 1) % 9999) + 1;
  return String.fromCharCode(65 + letterIndex) + String(number).padStart(4, '0');
};

export const generateVisitorId = (counter) => 'V' + String(counter).padStart(4, '0');
