import { states, districts, medicines, facilityTerms } from './dataDictionaries';

export function translateStateName(name, lang) {
  if (!name || lang === 'en') return name;
  const key = name.toLowerCase();
  return (states[key] && states[key][lang]) || name;
}

export function translateDistrictName(name, lang) {
  if (!name || lang === 'en') return name;
  const key = name.toLowerCase();
  return (districts[key] && districts[key][lang]) || name;
}

export function translateMedicineName(name, lang) {
  if (!name || lang === 'en') return name;
  const key = name.toLowerCase();
  return (medicines[key] && medicines[key][lang]) || name;
}

export function translateFacilityName(phc, lang) {
  if (!phc || !phc.name || lang === 'en') return phc.name;
  
  let translatedName = phc.name;
  
  // E.g., "Ludhiana Rural Health Centre", "Ludhiana North PHC-01"
  if (phc.district) {
    const districtKey = phc.district.toLowerCase();
    if (districts[districtKey] && districts[districtKey][lang]) {
      // Replace the district prefix
      const districtRegex = new RegExp(`^${phc.district}\\b`, 'i');
      translatedName = translatedName.replace(districtRegex, districts[districtKey][lang]);
    }
  }

  // Replace zone words
  for (const [zoneKey, zoneTranslations] of Object.entries(facilityTerms.zones)) {
    if (zoneTranslations[lang]) {
      const zoneRegex = new RegExp(`\\b${zoneKey}\\b`, 'i');
      translatedName = translatedName.replace(zoneRegex, zoneTranslations[lang]);
    }
  }

  // Replace types
  for (const [typeKey, typeTranslations] of Object.entries(facilityTerms.types)) {
    if (typeTranslations[lang]) {
      const typeRegex = new RegExp(`\\b${typeKey}\\b`, 'i');
      translatedName = translatedName.replace(typeRegex, typeTranslations[lang]);
    }
  }

  return translatedName;
}
