// Helper to extract text safely
function getText(selector) {
    const el = document.querySelector(selector);
    return el ? el.innerText.trim() : null;
}

// Helper to get meta content
function getMeta(name) {
    const meta = document.querySelector(`meta[name="${name}"]`);
    return meta ? meta.getAttribute('content') : null;
}

// Function to scrape problem data
function scrapeProblemData() {
    try {
        // Current UI selectors (December 2025) - Subject to change, hence try-catch blocks
        // Ideally we would want more robust selectors or even looking at the __NEXT_DATA__ script tag if available,
        // but simple DOM scraping is good for MVP.

        // Title usually in the format "1. Two Sum"
        const titleElement = document.querySelector('div.flex.items-start.gap-2 > div.flex.flex-col.gap-1 > div.flex.items-center.gap-2 > div.text-title-large') || document.querySelector('span.text-title-large');
        const title = titleElement ? titleElement.innerText : document.title.split('-')[0].trim();

        // Difficulty
        // It's usually a class like 'text-difficulty-easy', 'text-difficulty-medium', etc.
        // We can look for the text content directly or the class.
        const difficultyElement = document.querySelector('div.text-difficulty-easy') ||
            document.querySelector('div.text-difficulty-medium') ||
            document.querySelector('div.text-difficulty-hard') ||
            document.querySelector('div[class*="text-difficulty-"]');
        const difficulty = difficultyElement ? difficultyElement.innerText : 'Unknown';

        // Description is usually in a container. 
        // The class 'elfjS' was mentioned in the prompt, but these obfuscated classes change often.
        // A more reliable way might be to look for the extensive text content or a specific container.
        // We will try the prompt's suggestion and a few fallbacks.
        const descElement = document.querySelector('div[data-track-load="description_content"]') ||
            document.querySelector('div.elfjS') ||
            document.querySelector('div.problem-statement'); // classic UI

        const description = (descElement && descElement.innerText.trim()) ? descElement.innerText.trim() : 'Description not found. Please ensure you are on the Description tab.';

        const url = window.location.href;

        if (!title && !description) {
            throw new Error("Could not find problem data. Are you on a LeetCode problem page?");
        }

        return {
            title,
            difficulty,
            description,
            url,
            success: true
        };

    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "scrape_problem") {
        const data = scrapeProblemData();
        sendResponse(data);
    }
    return true; // Keep the message channel open for async response if needed
});
