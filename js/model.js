let model = {

    // Raw JSON data
    loadedScenarioData: null,

    // Other static properties
    staticProperties: {
        canvasBackgroundColor: 'white',
        selectedBoxColor: 'rgba(171, 224, 224, 1)',
        normalBoxFill: 'white',
    },

    operationalVariables: {
        buidlingNodes: [],
    },
    
    // Information about the current game
    campaign: {
        currentScenario: null,
        finishedScenarios: [],
        numberOfScenarios: 0,
        mainTitle: null,
        campaignDescription: null,
        sequential: null,
        building: null,
        canvasWidth: 0,
        canvasHeight: 0,
        followUpCampaign: null,
        endScreenText: null,
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