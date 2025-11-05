
// Loads in JSON file
async function loadScenarioJSON(filepath) {
    try {
        console.log('Fetching file:', filepath);
        const response = await fetch(filepath);

        if (!response.ok) {
            throw new Error(`Failed to load: ${response.status}`);
        }

        const jsonData = await response.json();

        console.log('JSON parsed successfully!');
        // Future 1: Add verificaiton
        return jsonData

    } catch(error) {
        console.error('Error loading JSON:', error);
        return null;

    }
}