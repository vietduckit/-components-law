const fs = require('fs');
const readline = require('readline');

async function processLineByLine() {
  const fileStream = fs.createReadStream('C:\\Users\\Viet\\.gemini\\antigravity-ide\\brain\\a0198867-c225-4cf5-b1c0-78b281330f33\\.system_generated\\logs\\transcript.jsonl');

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  const outputDir = 'C:\\Users\\Viet\\.gemini\\antigravity-ide\\brain\\a0198867-c225-4cf5-b1c0-78b281330f33\\scratch\\';
  for await (const line of rl) {
    if (line.includes('"step_index":261') || line.includes('"step_index":263') || line.includes('"step_index":365')) {
      try {
        const obj = JSON.parse(line);
        console.log(`=== Step ${obj.step_index} (${obj.type}) ===`);
        fs.writeFileSync(`${outputDir}step_${obj.step_index}.json`, JSON.stringify(obj, null, 2));
      } catch (err) {
        console.error('Error parsing line', err);
      }
    }
  }
  console.log("Steps extracted!");
}

processLineByLine();
