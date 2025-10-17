let model = {

    // Raw JSON data
    loadedScenarioData: null,

    // Other static properties
    staticProperties: {
        canvasBackgroundColor: 'white',
    },
    
    // Information about the current game
    game: {
        currentScenario: null,
        finishedScenarios: [],
        numberOfScenarios: 0,
        mainTitle: null,
        moduleDescription: null,
        sequential: null,
        building: null,
        canvasWidth: 0,
        canvasHeight: 0,
    },
    
    // Information about the current scenario
    currentScenario: {
        scenarioTitle: null,
        scenarioDescription: null,
        tutorialImage: null,
        failureImage: null,
        pools: [],
        lanes: [],
        staticNodes: [],
        staticConnectors: [],
        dynamicNodesInMenu: [],
        dynamicNodesOnCanvas: [],
        dynamicConnectors: [],
        tokens: [],
    }
}