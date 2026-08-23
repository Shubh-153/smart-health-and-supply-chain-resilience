const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error('Error: GEMINI_API_KEY environment variable is not set.');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });

const localesDir = path.join(__dirname, '../src/locales');
const languages = {
  pt: 'Portuguese (Brazil)',
  ru: 'Russian',
  hi: 'Hindi',
  zh: 'Simplified Chinese',
  ar: 'Arabic',
  am: 'Amharic',
  fa: 'Persian/Farsi',
  id: 'Bahasa Indonesia'
};

async function translateFile() {
  const enPath = path.join(localesDir, 'en/translation.json');
  const enData = JSON.parse(fs.readFileSync(enPath, 'utf-8'));
  const enString = JSON.stringify(enData, null, 2);

  for (const [code, langName] of Object.entries(languages)) {
    console.log(`Translating to ${langName} (${code})...`);
    
    const prompt = `
You are a professional translator for a healthcare web application.
Translate the following JSON file from English to ${langName}.
Maintain the exact JSON structure and keys. Only translate the values.
Keep interpolation variables like {{query}} or {{scope}} exactly as they are.
Respond ONLY with valid JSON. Do not include markdown code blocks.

English JSON:
${enString}
`;
    
    try {
      const result = await model.generateContent(prompt);
      let text = result.response.text();
      
      // Cleanup potential markdown formatting
      if (text.startsWith('\`\`\`json')) {
        text = text.replace(/^\`\`\`json\n/, '').replace(/\n\`\`\`$/, '');
      } else if (text.startsWith('\`\`\`')) {
        text = text.replace(/^\`\`\`\n/, '').replace(/\n\`\`\`$/, '');
      }

      // Validate JSON
      const parsed = JSON.parse(text);
      
      const targetPath = path.join(localesDir, `${code}/translation.json`);
      fs.writeFileSync(targetPath, JSON.stringify(parsed, null, 2));
      console.log(`Successfully wrote ${targetPath}`);
      
      // Sleep slightly to avoid rate limits
      await new Promise(r => setTimeout(r, 2000));
    } catch (err) {
      console.error(`Failed to translate for ${code}:`, err);
    }
  }
}

translateFile();
