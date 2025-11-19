# Resume Agent - AI-Powered Resume Customization Tool

A web application that uses Claude AI to automatically generate customized resumes and cover letters based on job descriptions.

## Features

- 🤖 **AI-Powered Customization**: Uses Claude Sonnet 4.5 to analyze job descriptions and tailor resumes
- 📝 **Automatic Document Generation**: Creates both Markdown and PDF versions of resumes and cover letters
- 🎯 **EasyApply Support**: Option to generate only resume (no cover letter) for EasyApply positions
- 🎨 **Modern Web Interface**: Clean, responsive UI for easy interaction
- 📦 **File Management**: Organizes generated documents in dated folders
- 💾 **Download & Preview**: View generated documents in browser or download them

## Prerequisites

- Node.js (v14 or higher)
- Anthropic API Key ([Get one here](https://console.anthropic.com/))

## Installation

1. Clone or navigate to the repository:
```bash
cd resume-agent
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
# Copy the example env file
cp .env.example .env

# Edit .env and add your Anthropic API key
# ANTHROPIC_API_KEY=your_api_key_here
```

4. **Configure your personal information**:
```bash
# Copy the example config file
cp user-config.example.json user-config.json

# Edit user-config.json with your personal information
```

Open `user-config.json` and update:
- `personalInfo`: Your name, phone, email, LinkedIn, portfolio
- `resumeContent`: Your complete resume in Markdown format

**Example:**
```json
{
  "personalInfo": {
    "fullName": "John Doe",
    "chineseName": "John Doe",
    "firstName": "John",
    "phone": "1234567890",
    "email": "john@example.com",
    "linkedin": "https://linkedin.com/in/johndoe",
    "portfolio": "https://johndoe.com"
  },
  "resumeContent": "# John Doe\n\n📞 1234567890 | ✉️ john@example.com\n\n## SUMMARY\n..."
}
```

## Usage

### Starting the Server

```bash
npm start
```

The server will start on `http://localhost:3000`

### Using the Web Interface

1. Open your browser and navigate to `http://localhost:3000`
2. Fill in the form:
   - **Company Name**: The company you're applying to
   - **Job Description**: Paste the full job description
   - **EasyApply** (optional): Check if this is an EasyApply position (only generates resume)
3. Click **Generate Resume**
4. Wait for the AI to process (typically 10-30 seconds)
5. Download your customized documents

### Generated Files

Files are saved in the `applications/` directory with the following structure:

```
applications/
└── CompanyName_YYYY-MM-DD/
    ├── CV_[YourFirstName]_YYYY-MM-DD.md
    ├── CV_[YourFirstName]_YYYY-MM-DD.pdf
    ├── CoverLetter_[YourFirstName]_YYYY-MM-DD.md  (if not EasyApply)
    └── CoverLetter_[YourFirstName]_YYYY-MM-DD.pdf  (if not EasyApply)
```

**Note:** `[YourFirstName]` will be replaced with the `firstName` from your `user-config.json`

## API Endpoints

### POST `/api/generate-resume`

Generate a customized resume and cover letter.

**Request Body:**
```json
{
  "companyName": "Google",
  "jobDescription": "Full job description text...",
  "isEasyApply": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Resume generated successfully",
  "folder": "Google_2025-11-19",
  "files": {
    "cv": {
      "md": "/files/Google_2025-11-19/CV_Shelton_2025-11-19.md",
      "pdf": "/files/Google_2025-11-19/CV_Shelton_2025-11-19.pdf",
      "content": "markdown content..."
    },
    "coverLetter": {
      "md": "/files/Google_2025-11-19/CoverLetter_Shelton_2025-11-19.md",
      "pdf": "/files/Google_2025-11-19/CoverLetter_Shelton_2025-11-19.pdf",
      "content": "markdown content..."
    }
  }
}
```

### GET `/api/health`

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "message": "Resume Agent API is running"
}
```

## Project Structure

```
resume-agent/
├── server.js                   # Express backend server
├── public/                     # Frontend static files
│   ├── index.html              # Main page
│   ├── style.css               # Styles
│   └── app.js                  # Frontend JavaScript
├── generate-pdf.js             # PDF generation script
├── CLAUDE.md                   # AI instructions for resume generation
├── user-config.json            # User personal information (create from example)
├── user-config.example.json    # User config template
├── applications/               # Generated resumes
├── .env                        # Environment variables (create from .env.example)
├── .env.example                # Environment variables template
├── .gitignore                  # Git ignore file
├── package.json                # Dependencies
└── README.md                   # This file
```

## Customization

### Updating Your Personal Information

Your personal information is stored in `user-config.json`. To update:

1. Open `user-config.json`
2. Update the `personalInfo` section with your details
3. Update the `resumeContent` with your complete resume in Markdown format
4. Restart the server for changes to take effect

**Tips:**
- Keep your resume in Markdown format for best results
- The system will use your `firstName` for file naming
- `chineseName` is used for cover letter signatures
- Make sure to escape special characters in JSON strings

### Modifying Resume Template

The AI instructions are stored in [CLAUDE.md](CLAUDE.md). The system automatically replaces placeholders like `{{RESUME_CONTENT}}` with your actual information from `user-config.json`.

You can edit CLAUDE.md to:
- Change the resume format
- Adjust the writing style
- Add/remove sections
- Modify the cover letter template

### Changing AI Model

To use a different Claude model, edit the model parameter in [server.js:69](server.js#L69):

```javascript
const message = await anthropic.messages.create({
  model: 'claude-sonnet-4-5-20250929', // Change this
  // ...
});
```

Available models:
- `claude-sonnet-4-5-20250929` (recommended)
- `claude-opus-4-20250514`
- `claude-3-5-sonnet-20241022`

## Troubleshooting

### API Key Issues
- Make sure your `.env` file exists and contains a valid API key
- Check that the API key has the correct format (starts with `sk-`)

### PDF Generation Fails
- Ensure the `generate-pdf.js` script is executable
- Check that the `applications/` directory exists and is writable

### Port Already in Use
Change the port in `.env`:
```
PORT=3001
```

## Security Notes

- **Never commit your `.env` file** - it's already in `.gitignore`
- The API key is only used server-side and never exposed to the frontend
- Generated resumes may contain personal information - be careful when sharing the `applications/` folder

## Cost Estimation

Using Claude Sonnet 4.5:
- Average cost per resume generation: $0.10 - $0.30 USD
- Depends on job description length and complexity
- Check current pricing at [Anthropic Pricing](https://www.anthropic.com/pricing)

## License

ISC

## Author

Shelton Cui

---

**Need help?** Open an issue or contact [cui.shelton@gmail.com](mailto:cui.shelton@gmail.com)
