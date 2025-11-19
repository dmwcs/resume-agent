#!/usr/bin/env node

const { mdToPdf } = require('md-to-pdf');
const path = require('path');

async function generatePdf(inputPath, outputPath) {
  try {
    const pdf = await mdToPdf(
      { path: inputPath },
      {
        dest: outputPath,
        pdf_options: {
          format: 'A4',
          margin: {
            top: '20mm',
            right: '20mm',
            bottom: '20mm',
            left: '20mm'
          }
        }
      }
    );

    if (pdf) {
      console.log(`✅ PDF generated successfully: ${outputPath}`);
    }
  } catch (error) {
    console.error(`❌ Error generating PDF: ${error.message}`);
    process.exit(1);
  }
}

// Get command line arguments
const args = process.argv.slice(2);

if (args.length !== 2) {
  console.error('Usage: node generate-pdf.js <input.md> <output.pdf>');
  process.exit(1);
}

const [inputPath, outputPath] = args;

generatePdf(inputPath, outputPath);
