const model = {

  settings: {
    selectedBoxColor: 'rgba(171, 224, 224, 0.70)',
    standardBoxColor: 'rgba(255, 255, 255, 1)',
    laneBorderColor: 'rgba(99, 99, 99, 1)'
  },

  referanceCanvas: {
    width: 1200,
    height: 800
  },

  canvasProperties: {
    width: 1300,
    height: 800,
    backgroundColor: '#ffffff'
  },

  loadedScenarioData: null,

  game: {
    currentScenario: 0,
    numberOfScenarios: 0,
    moduleTitle: null,
    moduleDescription: null,
    endScreenText: null
  },

  currentScenario: {
    nodes: [],
    connectors: [],
    pools: [],
    lanes: [],
    tokens: [],
    failureDescriptions: {}
  }
};
