let currentFiles = null;

document.getElementById('resumeForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const companyName = document.getElementById('companyName').value.trim();
    const jobDescription = document.getElementById('jobDescription').value.trim();
    const isEasyApply = document.getElementById('isEasyApply').checked;

    if (!companyName || !jobDescription) {
        alert('Please fill in all required fields');
        return;
    }

    // Show output section and reset
    const outputSection = document.getElementById('outputSection');
    const resultsContainer = document.getElementById('resultsContainer');
    const statusContainer = document.getElementById('statusContainer');
    const generateBtn = document.getElementById('generateBtn');

    outputSection.style.display = 'block';
    resultsContainer.style.display = 'none';
    statusContainer.innerHTML = '';

    // Disable form
    generateBtn.disabled = true;
    document.querySelector('.btn-text').style.display = 'none';
    document.querySelector('.btn-loader').style.display = 'inline-block';

    // Add status updates
    const statuses = [
        { icon: '🔍', text: 'Analyzing job description...' },
        { icon: '📝', text: 'Generating customized CV...' },
    ];

    if (!isEasyApply) {
        statuses.push({ icon: '📧', text: 'Writing cover letter...' });
    }

    statuses.push(
        { icon: '📄', text: 'Creating PDF files...' },
        { icon: '✅', text: 'Finalizing...' }
    );

    // Show status updates progressively
    for (let i = 0; i < statuses.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 500));
        addStatus(statuses[i].icon, statuses[i].text, 'processing');
    }

    try {
        // Call API
        const response = await fetch('/api/generate-resume', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                companyName,
                jobDescription,
                isEasyApply
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to generate resume');
        }

        // Update all statuses to success
        const statusItems = document.querySelectorAll('.status-item');
        statusItems.forEach(item => {
            item.classList.remove('processing');
            item.classList.add('success');
            item.querySelector('.status-icon').textContent = '✅';
        });

        // Store files data
        currentFiles = data.files;

        // Show results
        displayResults(data.files, isEasyApply);

    } catch (error) {
        console.error('Error:', error);
        statusContainer.innerHTML = `
            <div class="status-item" style="background: #fee; color: #c00;">
                <span class="status-icon">❌</span>
                <span class="status-text">Error: ${error.message}</span>
            </div>
        `;
    } finally {
        // Re-enable form
        generateBtn.disabled = false;
        document.querySelector('.btn-text').style.display = 'inline';
        document.querySelector('.btn-loader').style.display = 'none';
    }
});

function addStatus(icon, text, type = 'processing') {
    const statusContainer = document.getElementById('statusContainer');
    const statusItem = document.createElement('div');
    statusItem.className = `status-item ${type}`;
    statusItem.innerHTML = `
        <span class="status-icon">${icon}</span>
        <span class="status-text">${text}</span>
    `;
    statusContainer.appendChild(statusItem);

    // Scroll to bottom
    statusContainer.scrollTop = statusContainer.scrollHeight;
}

function displayResults(files, isEasyApply) {
    const resultsContainer = document.getElementById('resultsContainer');

    // Set CV links
    document.getElementById('cvMdLink').href = files.cv.md;
    document.getElementById('cvPdfLink').href = files.cv.pdf;

    // Show/hide cover letter card
    const coverLetterCard = document.getElementById('coverLetterCard');
    if (!isEasyApply && files.coverLetter) {
        coverLetterCard.style.display = 'block';
        document.getElementById('clMdLink').href = files.coverLetter.md;
        document.getElementById('clPdfLink').href = files.coverLetter.pdf;
    } else {
        coverLetterCard.style.display = 'none';
    }

    resultsContainer.style.display = 'block';

    // Scroll to results
    resultsContainer.scrollIntoView({ behavior: 'smooth' });
}

function showPreview(type) {
    const previewContainer = document.getElementById('previewContainer');
    const previewTitle = document.getElementById('previewTitle');
    const previewContent = document.getElementById('previewContent');

    if (!currentFiles) return;

    let content = '';
    let title = '';

    if (type === 'cv' && currentFiles.cv) {
        content = currentFiles.cv.content;
        title = 'Resume (CV) Preview';
    } else if (type === 'coverLetter' && currentFiles.coverLetter) {
        content = currentFiles.coverLetter.content;
        title = 'Cover Letter Preview';
    }

    if (!content) return;

    previewTitle.textContent = title;

    // Convert markdown to HTML (basic conversion)
    const htmlContent = markdownToHtml(content);
    previewContent.innerHTML = htmlContent;

    previewContainer.style.display = 'block';
    previewContainer.scrollIntoView({ behavior: 'smooth' });
}

function closePreview() {
    document.getElementById('previewContainer').style.display = 'none';
}

function markdownToHtml(markdown) {
    let html = markdown;

    // Headers
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // Bold
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // Italic
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');

    // Line breaks
    html = html.replace(/\n\n/g, '</p><p>');
    html = html.replace(/\n/g, '<br>');

    // Unordered lists
    html = html.replace(/^\- (.+)$/gim, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

    // Wrap in paragraphs
    html = '<p>' + html + '</p>';

    // Clean up extra p tags
    html = html.replace(/<p><\/p>/g, '');
    html = html.replace(/<p><h/g, '<h');
    html = html.replace(/<\/h1><\/p>/g, '</h1>');
    html = html.replace(/<\/h2><\/p>/g, '</h2>');
    html = html.replace(/<\/h3><\/p>/g, '</h3>');
    html = html.replace(/<p><ul>/g, '<ul>');
    html = html.replace(/<\/ul><\/p>/g, '</ul>');

    return html;
}

// Auto-resize textarea
const textarea = document.getElementById('jobDescription');
textarea.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
});
