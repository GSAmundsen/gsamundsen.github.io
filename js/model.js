let model = {

    settings:{
        selectedBoxColor: 'rgba(171, 224, 224, 0.70)',
        standardBoxColor: 'rgba(255, 255, 255, 1)',
        laneBorderColor: 'rgba(99, 99, 99, 1)'
    },

    referanceCanvas: {
        width: 1200,
        height: 800
        },

    canvasProperties: {
        width: window.screen.width*0.80,
        height: window.screen.height*0.6,
        backgroundColor: 'white'
    },

    // Raw JSON data
    loadedScenarioData: null,
    
    // Information about the current game
    game: {
        currentScenario: 0,
        numberOfScenarios: 0,
        moduleTitle: null,
        moduleDescription: null,
        endScreenText: null
    },

    currentScenario: {
        tokens: [],
        pools: [],
        lanes: [],
        nodes: [],
        connectors: []
    }
    
}