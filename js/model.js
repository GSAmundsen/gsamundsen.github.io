// Stores settings and scenario information
let model = {

    // Static settings

    // Used by controller.js - initCanvas()
    // Canvas settings
    canvasProperties: {
        width: window.screen.width*0.80,
        height: window.screen.height*0.6,
        backgroundColor: 'white'
    },

    // Used by drawFunctions.js
    // Colour settings used for drawing on canvas 
    settings:{
        selectedBoxColor: 'rgba(171, 224, 224, 0.70)',
        standardBoxColor: 'rgba(255, 255, 255, 1)',
        laneBorderColor: 'rgba(99, 99, 99, 1)'
    },

    // Used by controller.js - scaleCoordinate()
    // Referance coordinates for scaling coordinates of elements that are inputed with existing coordinates
    referanceCanvas: {
        width: 1200,
        height: 800
        },



    // Dynamic settings

    // Used by userInput.js - mouseDown(), mouseMove(), mouseUp()
    // Referances for node movement
    nodeRef: {
        draggingBox: null,
        offsetX: 0,
        offsetY: 0,
        // Also used by drawFunctions.js - drawNodes() 
        currentSelectedBox: null,
    },

    // Used by userInput.js - mouseDown(), mouseMove(), mouseUp() && drawFunctions.js - drawTemporaryArrow

    // Referances for connectors
    connectorRef: {
        connecting: false,
        startNode: null,
        tempLineEnd: { x: 0, y: 0 },
        connectorCounter: 1,
    },

    // Used by controller.js - processNodes()
    // Keeps track of menu size
    menuRef: {
        menuCells: [],
    },



    // Inputted and manipulated game data

    // Used by controller.js - multiple functions
    // Stores the raw JSON data
    loadedScenarioData: null,
    
    // Used by controller.js - multiple functions
    // Stores meta information about the current campaign
    game: {
        currentScenario: 0,
        numberOfScenarios: 0,
        moduleTitle: null,
        moduleDescription: null,
        endScreenText: null,
        // Starts as default filepath for starting campaigns
        campaignFilepath: 'scenarioData/scenario.json'
    },

    // Used by controller.js - multiple functions
    // Stores element information for the current scenario
    currentScenario: {
        tokens: [],
        pools: [],
        lanes: [],
        nodes: [],
        connectors: []
    }
    
}