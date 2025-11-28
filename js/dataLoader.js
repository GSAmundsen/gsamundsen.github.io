
// Is called by initCanvas() in controller
// Loads a JSON document based on passed filepath
async function loadScenarioJSON(filepath) {
    try {
        // console.log('Fetching file:', filepath);
        const response = await fetch(filepath);

        if (!response.ok) {
            throw new Error(`Failed to load: ${response.status}`);
        }

        const jsonData = await response.json();

        // console.log('JSON parsed successfully!');
        return jsonData

    } catch(error) {
        console.error('Error loading JSON:', error);
        return null;

    }
}