require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const { exec } = require('child_process');
const util = require('util');
const Anthropic = require('@anthropic-ai/sdk');

const execPromise = util.promisify(exec);
const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));

// Helper function to read user configuration
async function getUserConfig() {
  try {
    const configPath = path.join(__dirname, 'user-config.json');
    const configData = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(configData);
  } catch (error) {
    console.error('Error reading user-config.json:', error);
    throw new Error('Failed to load user configuration. Please ensure user-config.json exists.');
  }
}

// Helper function to read CLAUDE.md instructions and replace variables
async function getSystemInstructions() {
  try {
    const claudeMd = await fs.readFile(path.join(__dirname, 'CLAUDE.md'), 'utf-8');
    const userConfig = await getUserConfig();

    // Replace variables in CLAUDE.md with user configuration
    let instructions = claudeMd
      .replace(/\{\{RESUME_CONTENT\}\}/g, userConfig.resumeContent)
      .replace(/\{\{CHINESE_NAME\}\}/g, userConfig.personalInfo.chineseName)
      .replace(/\{\{FULL_NAME\}\}/g, userConfig.personalInfo.fullName)
      .replace(/\{\{FIRST_NAME\}\}/g, userConfig.personalInfo.firstName)
      .replace(/\{\{PHONE\}\}/g, userConfig.personalInfo.phone)
      .replace(/\{\{EMAIL\}\}/g, userConfig.personalInfo.email);

    return { instructions, userConfig };
  } catch (error) {
    console.error('Error reading CLAUDE.md:', error);
    throw new Error('Failed to load system instructions');
  }
}

// Helper function to get current date in YYYY-MM-DD format
function getCurrentDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper function to format date for cover letter (DD Month YYYY)
function getFormattedDate() {
  const now = new Date();
  const day = now.getDate();
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  const month = monthNames[now.getMonth()];
  const year = now.getFullYear();
  return `${day} ${month} ${year}`;
}

// API endpoint to generate resume
app.post('/api/generate-resume', async (req, res) => {
  try {
    const { companyName, jobDescription, isEasyApply } = req.body;

    if (!companyName || !jobDescription) {
      return res.status(400).json({ error: 'Company name and job description are required' });
    }

    // Get system instructions from CLAUDE.md and user config
    const { instructions: systemInstructions, userConfig } = await getSystemInstructions();

    // Prepare user message
    const currentDate = getCurrentDate();
    const formattedDate = getFormattedDate();
    const easyApplyNote = isEasyApply ? '\n\n⚠️ 注意：这是一个 EasyApply 职位，只需要生成简历（CV），不需要生成 Cover Letter。' : '';

    const userMessage = `我想申请 ${companyName} 的职位，这是职位描述：

${jobDescription}${easyApplyNote}

请按照 CLAUDE.md 中的指令生成定制化的简历${isEasyApply ? '' : '和求职信'}。

今天的日期是：${formattedDate}
文件命名使用的日期格式：${currentDate}

⚠️ 重要输出格式要求：
1. 不要输出任何分析、说明、或额外的文字
2. 不要使用 markdown 代码块（不要用 \`\`\`markdown）
3. 只输出以下格式的纯内容：

===CV_START===
[简历的完整 Markdown 内容，直接从 # ${userConfig.personalInfo.fullName} 开始]
===CV_END===

${!isEasyApply ? `===COVER_LETTER_START===
[求职信的完整 Markdown 内容，直接从 ${userConfig.personalInfo.chineseName} 开始]
===COVER_LETTER_END===` : ''}

不要在分隔符前后添加任何解释或说明文字。`;

    console.log('Sending request to Claude API...');

    // Call Claude API
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 8192,
      temperature: 1,
      system: systemInstructions,
      messages: [
        {
          role: 'user',
          content: userMessage
        }
      ]
    });

    console.log('Received response from Claude API');

    // Extract the response
    const responseText = message.content[0].text;

    // Create directory for outputs
    const folderName = `${companyName}_${currentDate}`;
    const outputDir = path.join(__dirname, 'applications', folderName);
    await fs.mkdir(outputDir, { recursive: true });

    // Extract markdown content from response using delimiters
    let cvContent = '';
    let coverLetterContent = '';

    // Extract CV content
    const cvStartMarker = '===CV_START===';
    const cvEndMarker = '===CV_END===';
    const cvStartIdx = responseText.indexOf(cvStartMarker);
    const cvEndIdx = responseText.indexOf(cvEndMarker);

    if (cvStartIdx !== -1 && cvEndIdx !== -1) {
      cvContent = responseText.substring(cvStartIdx + cvStartMarker.length, cvEndIdx).trim();
    } else {
      // Fallback: try to extract from markdown code blocks
      const cvMatch = responseText.match(/```markdown\n([\s\S]*?)```/);
      if (cvMatch) {
        cvContent = cvMatch[1];
      } else {
        // Last resort: try to find by heading (use user's full name)
        const cvStart = responseText.indexOf(`# ${userConfig.personalInfo.fullName}`);
        if (cvStart !== -1) {
          const clMarker = `${userConfig.personalInfo.chineseName}\n\n${userConfig.personalInfo.phone}`;
          const cvEnd = !isEasyApply ? responseText.indexOf(clMarker) : responseText.length;
          cvContent = responseText.substring(cvStart, cvEnd > cvStart ? cvEnd : responseText.length).trim();
        }
      }
    }

    // Extract Cover Letter content
    if (!isEasyApply) {
      const clStartMarker = '===COVER_LETTER_START===';
      const clEndMarker = '===COVER_LETTER_END===';
      const clStartIdx = responseText.indexOf(clStartMarker);
      const clEndIdx = responseText.indexOf(clEndMarker);

      if (clStartIdx !== -1 && clEndIdx !== -1) {
        coverLetterContent = responseText.substring(clStartIdx + clStartMarker.length, clEndIdx).trim();
      } else {
        // Fallback: try to find by heading (use user's info)
        const clMarker = `${userConfig.personalInfo.chineseName}\n\n${userConfig.personalInfo.phone}`;
        const clStart = responseText.indexOf(clMarker);
        if (clStart !== -1) {
          coverLetterContent = responseText.substring(clStart).trim();
        }
      }
    }

    // Validate content
    if (!cvContent) {
      throw new Error('Failed to extract CV content from AI response');
    }
    if (!isEasyApply && !coverLetterContent) {
      console.warn('Warning: Failed to extract Cover Letter content');
    }

    // Save markdown files (use user's first name)
    const firstName = userConfig.personalInfo.firstName;
    const cvMdPath = path.join(outputDir, `CV_${firstName}_${currentDate}.md`);
    const cvPdfPath = path.join(outputDir, `CV_${firstName}_${currentDate}.pdf`);

    await fs.writeFile(cvMdPath, cvContent);
    console.log(`Saved CV markdown: ${cvMdPath}`);

    let coverLetterMdPath, coverLetterPdfPath;
    if (!isEasyApply && coverLetterContent) {
      coverLetterMdPath = path.join(outputDir, `CoverLetter_${firstName}_${currentDate}.md`);
      coverLetterPdfPath = path.join(outputDir, `CoverLetter_${firstName}_${currentDate}.pdf`);
      await fs.writeFile(coverLetterMdPath, coverLetterContent);
      console.log(`Saved Cover Letter markdown: ${coverLetterMdPath}`);
    }

    // Generate PDFs
    console.log('Generating CV PDF...');
    await execPromise(`node generate-pdf.js "${cvMdPath}" "${cvPdfPath}"`);

    if (!isEasyApply && coverLetterMdPath) {
      console.log('Generating Cover Letter PDF...');
      await execPromise(`node generate-pdf.js "${coverLetterMdPath}" "${coverLetterPdfPath}"`);
    }

    // Prepare response
    const files = {
      cv: {
        md: `/files/${folderName}/CV_${firstName}_${currentDate}.md`,
        pdf: `/files/${folderName}/CV_${firstName}_${currentDate}.pdf`,
        content: cvContent
      }
    };

    if (!isEasyApply && coverLetterContent) {
      files.coverLetter = {
        md: `/files/${folderName}/CoverLetter_${firstName}_${currentDate}.md`,
        pdf: `/files/${folderName}/CoverLetter_${firstName}_${currentDate}.pdf`,
        content: coverLetterContent
      };
    }

    res.json({
      success: true,
      message: 'Resume generated successfully',
      folder: folderName,
      files,
      rawResponse: responseText
    });

  } catch (error) {
    console.error('Error generating resume:', error);
    res.status(500).json({
      error: 'Failed to generate resume',
      details: error.message
    });
  }
});

// Serve generated files
app.use('/files', express.static(path.join(__dirname, 'applications')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Resume Agent API is running' });
});

app.listen(PORT, () => {
  console.log(`🚀 Resume Agent server running on http://localhost:${PORT}`);
  console.log(`📝 Open your browser and navigate to http://localhost:${PORT}`);
});
