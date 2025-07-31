const libphonenumber = require('google-libphonenumber');
const phoneUtil = libphonenumber.PhoneNumberUtil.getInstance();
const PNF = libphonenumber.PhoneNumberFormat;

function formatPhoneToArgentina(phoneInput) {
  if (!phoneInput) return '';
  try {
    let number = phoneUtil.parseAndKeepRawInput(phoneInput, 'AR');
    if (phoneUtil.isValidNumber(number)) {
      let nationalNumber = phoneUtil.getNationalSignificantNumber(number);
      if (nationalNumber.startsWith('9')) {
        nationalNumber = nationalNumber.replace(/^9(\d{2})(15)/, '9$1');
      } else {
        nationalNumber = '9' + nationalNumber.replace(/^(\d{2})(15)/, '$1');
      }
      number = phoneUtil.parseAndKeepRawInput(`+54${nationalNumber}`, 'AR');
      return phoneUtil.format(number, PNF.E164).replace('+', '');
    }
  } catch (e) {
    console.error('Error formateando el teléfono:', e);
  }
  return phoneInput;
}

module.exports = { formatPhoneToArgentina };
